"""
GridSentinel — Part 3, Model 3: XGBoost Fault Classifier + SHAP
================================================================
Classifies fault TYPE given aggregate electrical + weather features.
Uses fault_events.csv (249 labeled fault events).
SMOTE handles class imbalance. SHAP gives per-prediction explanations.

Input  : ml/data/processed/fault_events.csv
Output : ml/models/xgb_classifier.pkl
         ml/models/shap_explainer.pkl
         ml/models/xgb_feature_names.json
         ml/models/xgb_eval_report.json

Run:
    python ml/scripts/train_xgb.py
"""

import os, json
import numpy as np
import pandas as pd
import joblib
import warnings
warnings.filterwarnings("ignore")

ROOT      = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(ROOT, "data", "processed", "fault_events.csv")
MODEL_DIR = os.path.join(ROOT, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

FAULT_TYPES = ["conductor_damage", "transformer_overload",
               "vegetation_contact", "illegal_tap", "grounding_fault"]
FAULT2IDX   = {ft: i for i, ft in enumerate(FAULT_TYPES)}
IDX2FAULT   = {i: ft for ft, i in FAULT2IDX.items()}

FEATURE_COLS = [
    "voltage_drop_pct",
    "current_spike_pct",
    "temp_delta",
    "thd_pct_mean",
    "pf_drop",
    "rain_mm_mean",
    "wind_mean_kmh",
    "humidity_mean_pct",
    "lightning_risk_mean",
    "vegetation_risk_mean",
    "duration_min",
    "section_id",
]


# ═════════════════════════════════════════════════════════════════════════════
# DATA LOADING
# ═════════════════════════════════════════════════════════════════════════════

def load_data():
    print("Loading fault_events.csv ...")
    df = pd.read_csv(DATA_PATH)
    print(f"  Rows: {len(df)}  |  Columns: {list(df.columns)}")

    # Only keep rows with valid fault types
    df = df[df["label"].isin(FAULT_TYPES)].copy()
    df["target"] = df["label"].map(FAULT2IDX)

    # Keep only feature columns that exist
    available = [c for c in FEATURE_COLS if c in df.columns]
    missing   = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        print(f"  ⚠ Missing columns (will use 0): {missing}")
        for c in missing:
            df[c] = 0.0

    X = df[FEATURE_COLS].fillna(0.0).values.astype(np.float32)
    y = df["target"].values.astype(int)

    print(f"  X shape: {X.shape}  |  Classes: {df['label'].value_counts().to_dict()}")
    return X, y, available


# ═════════════════════════════════════════════════════════════════════════════
# SMOTE — oversample minority classes
# ═════════════════════════════════════════════════════════════════════════════

def apply_smote(X, y):
    try:
        from imblearn.over_sampling import SMOTE
        counts = np.bincount(y)
        # Only apply if we have enough samples per class
        min_count = int(counts.min())
        if min_count < 2:
            print("  Too few samples for SMOTE — skipping")
            return X, y
        k = min(5, min_count - 1)
        sm = SMOTE(random_state=42, k_neighbors=k)
        X_r, y_r = sm.fit_resample(X, y)
        print(f"  After SMOTE: {len(X_r)} samples  (was {len(X)})")
        return X_r, y_r
    except ImportError:
        print("  imbalanced-learn not installed — skipping SMOTE")
        return X, y


# ═════════════════════════════════════════════════════════════════════════════
# TRAIN
# ═════════════════════════════════════════════════════════════════════════════

def train_xgb(X_train, y_train, X_val, y_val):
    from xgboost import XGBClassifier
    from sklearn.metrics import classification_report, accuracy_score

    print("\nTraining XGBoost classifier ...")
    model = XGBClassifier(
        n_estimators      = 300,
        max_depth         = 5,
        learning_rate     = 0.05,
        subsample         = 0.8,
        colsample_bytree  = 0.8,
        gamma             = 0.1,
        min_child_weight  = 3,
        reg_alpha         = 0.1,
        reg_lambda        = 1.0,
        use_label_encoder = False,
        eval_metric       = "mlogloss",
        early_stopping_rounds = 30,
        random_state      = 42,
        device            = "cpu",   # XGBoost CPU is fast for this dataset size
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=50,
    )

    y_pred = model.predict(X_val)
    acc    = accuracy_score(y_val, y_pred)
    report = classification_report(y_val, y_pred,
                                   target_names=FAULT_TYPES,
                                   output_dict=True)

    print(f"\nValidation accuracy: {acc*100:.1f}%")
    print(classification_report(y_val, y_pred, target_names=FAULT_TYPES))
    return model, acc, report


# ═════════════════════════════════════════════════════════════════════════════
# SHAP EXPLAINER
# ═════════════════════════════════════════════════════════════════════════════

def build_shap_explainer(model, X_train):
    import shap
    print("\nBuilding SHAP TreeExplainer ...")
    explainer = shap.TreeExplainer(model)
    # Quick sanity: compute SHAP values for first 10 samples
    shap_vals = np.array(explainer.shap_values(X_train[:10]))
    print(f"  SHAP values shape: {shap_vals.shape}")
    # New SHAP 0.52+: shape (samples, features, classes)
    # Old SHAP: shape (classes, samples, features)
    if shap_vals.ndim == 3 and shap_vals.shape[0] == 10:
        top_feat_idx = np.abs(shap_vals[0, :, 0]).argmax()   # new API
    else:
        top_feat_idx = np.abs(shap_vals[0][0]).argmax()       # old API
    print(f"  Top feature for first sample: {FEATURE_COLS[top_feat_idx]}")
    return explainer


# ═════════════════════════════════════════════════════════════════════════════
# INFERENCE HELPER — used by backend/ml/inference.py
# ═════════════════════════════════════════════════════════════════════════════

def explain_prediction(model, explainer, x_row: np.ndarray, top_k=4):
    """
    Given a single feature vector (shape: (12,)), returns:
    {
      "fault_type": "vegetation_contact",
      "confidence": 0.87,
      "candidates": [...],
      "top_reasons": [
        {"feature": "Voltage Drop %", "feature_key": "voltage_drop_pct",
         "contribution": 0.38, "value": -42.1, "direction": "increase_risk"},
        ...
      ]
    }
    This is exactly the shape the API contract expects (ExplainResponse).
    """
    import shap

    proba     = model.predict_proba(x_row.reshape(1, -1))[0]
    pred_cls  = int(proba.argmax())
    fault_type = IDX2FAULT[pred_cls]
    confidence = float(proba[pred_cls])

    candidates = [
        {"type": IDX2FAULT[i], "probability": round(float(p), 4)}
        for i, p in sorted(enumerate(proba), key=lambda t: -t[1])
    ]

    # SHAP for the predicted class
    # SHAP 0.52+: returns (samples, features, classes)  → index [sample, :, class]
    # Old SHAP:   returns list of (samples, features)   → index [class][sample]
    shap_arr = np.array(explainer.shap_values(x_row.reshape(1, -1)))
    if shap_arr.ndim == 3 and shap_arr.shape[0] == 1:
        sv_class = shap_arr[0, :, pred_cls]          # new API: (1, 12, 5) → (12,)
    else:
        sv_class = shap_arr[pred_cls][0]             # old API: list → (12,)

    # Sort by absolute contribution
    order     = np.argsort(np.abs(sv_class))[::-1][:top_k]
    reasons   = []
    total_abs = np.abs(sv_class).sum() + 1e-9
    for idx in order:
        reasons.append({
            "feature":      FEATURE_COLS[idx].replace("_", " ").title(),
            "feature_key":  FEATURE_COLS[idx],
            "contribution": round(float(np.abs(sv_class[idx]) / total_abs), 4),
            "value":        round(float(x_row[idx]), 4),
            "direction":    "increase_risk" if sv_class[idx] > 0 else "decrease_risk",
        })

    return {
        "fault_type": fault_type,
        "confidence": round(confidence, 4),
        "candidates": candidates,
        "top_reasons": reasons,
    }


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("GridSentinel — XGBoost + SHAP Training")
    print("=" * 60)

    try:
        import xgboost, shap
    except ImportError as e:
        print(f"❌ Missing library: {e}. Run: pip install xgboost shap imbalanced-learn")
        return

    from sklearn.model_selection import train_test_split

    X, y, features = load_data()

    if len(X) < 10:
        print("❌ Not enough fault event rows. Re-run generate_dataset.py.")
        return

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    X_train, y_train = apply_smote(X_train, y_train)

    model, acc, report = train_xgb(X_train, y_train, X_val, y_val)
    explainer          = build_shap_explainer(model, X_train)

    # ── Save ──────────────────────────────────────────────────────────────────
    xgb_path   = os.path.join(MODEL_DIR, "xgb_classifier.pkl")
    shap_path  = os.path.join(MODEL_DIR, "shap_explainer.pkl")
    feat_path  = os.path.join(MODEL_DIR, "xgb_feature_names.json")
    eval_path  = os.path.join(MODEL_DIR, "xgb_eval_report.json")

    joblib.dump(model,     xgb_path)
    joblib.dump(explainer, shap_path)

    with open(feat_path, "w") as f:
        json.dump({"features": FEATURE_COLS, "fault_types": FAULT_TYPES,
                   "fault2idx": FAULT2IDX}, f, indent=2)

    eval_out = {"accuracy": round(acc, 4), "classification_report": report}
    with open(eval_path, "w") as f:
        json.dump(eval_out, f, indent=2)

    print(f"\n✅ XGBoost training complete.")
    print(f"   Model     → {xgb_path}")
    print(f"   SHAP      → {shap_path}")
    print(f"   Features  → {feat_path}")
    print(f"   Eval      → {eval_path}")

    # ── Demo explain ──────────────────────────────────────────────────────────
    print("\nDemo explanation for first validation sample:")
    result = explain_prediction(model, explainer, X_val[0])
    print(f"  Fault type : {result['fault_type']}")
    print(f"  Confidence : {result['confidence']}")
    print(f"  Top reason : {result['top_reasons'][0]}")

    print(f"\nNext: install torch + torch-geometric, then run train_tgat.py")


if __name__ == "__main__":
    main()
