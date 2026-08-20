"""
GridSentinel — Part 3, Model 1: LSTM Autoencoder Training
===========================================================
Learns normal feeder behaviour. High reconstruction error = anomaly.
Trained on NORMAL data only — faults are never seen during training.

Input  : ml/data/processed/sensor_timeseries.csv
Output : ml/models/lstm_autoencoder.pt
         ml/models/lstm_scaler.pkl   (MinMaxScaler for inference)
         ml/models/lstm_threshold.txt (anomaly score threshold)

Run:
    python ml/scripts/train_lstm.py
"""

import os, json
import numpy as np
import pandas as pd
import joblib

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT      = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(ROOT, "data", "processed", "sensor_timeseries.csv")
MODEL_DIR = os.path.join(ROOT, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── Hyperparameters ────────────────────────────────────────────────────────────
SEQ_LEN       = 60      # 60-minute input window
INPUT_FEATURES = ["voltage_pu", "current_A", "temp_C", "thd_pct", "power_factor"]
N_FEATURES    = len(INPUT_FEATURES)   # 5
LATENT_DIM    = 16
HIDDEN_DIM    = 64
BATCH_SIZE    = 256
EPOCHS        = 50
LR            = 1e-3
DROPOUT_RATE  = 0.2
MASK_PROB     = 0.15   # MMI: randomly mask features during training (sparse sensor robustness)
ANOMALY_SIGMA = 2.5    # threshold = mean + 2.5 * std of train reconstruction errors
DEVICE_STR    = "cuda" if True else "cpu"


# ═════════════════════════════════════════════════════════════════════════════
# DATA PREPARATION
# ═════════════════════════════════════════════════════════════════════════════

def load_and_prepare():
    print("Loading sensor_timeseries.csv ...")
    df = pd.read_csv(DATA_PATH, usecols=["section_id", "fault_active"] + INPUT_FEATURES)

    # Train ONLY on normal (non-fault) rows
    normal = df[df["fault_active"] == 0].copy()
    print(f"  Total rows: {len(df):,}  |  Normal rows (training): {len(normal):,}")

    # Normalize per-feature to [0,1]
    from sklearn.preprocessing import MinMaxScaler
    scaler = MinMaxScaler()
    normal[INPUT_FEATURES] = scaler.fit_transform(normal[INPUT_FEATURES])
    joblib.dump(scaler, os.path.join(MODEL_DIR, "lstm_scaler.pkl"))
    print(f"  Scaler saved.")

    # Build sliding windows (per section to avoid cross-section leakage)
    windows = []
    for sid in sorted(normal["section_id"].unique()):
        sec = normal[normal["section_id"] == sid][INPUT_FEATURES].values
        for i in range(0, len(sec) - SEQ_LEN, 5):   # stride=5 → manageable count
            windows.append(sec[i: i + SEQ_LEN])

    windows = np.array(windows, dtype=np.float32)
    print(f"  Windows shape: {windows.shape}  ({len(windows):,} sequences × {SEQ_LEN} steps × {N_FEATURES} features)")
    return windows, scaler


def apply_mmi_mask(x, mask_prob, rng):
    """Mixture of Missing Inputs: randomly zero out features to train robustness."""
    mask = rng.random(x.shape) > mask_prob
    return x * mask.astype(np.float32)


# ═════════════════════════════════════════════════════════════════════════════
# MODEL DEFINITION
# ═════════════════════════════════════════════════════════════════════════════

def build_model():
    import torch
    import torch.nn as nn

    class LSTMAutoencoder(nn.Module):
        """
        Encoder: LSTM(64) → LSTM(32) → latent(16)
        Decoder: repeat → LSTM(32) → LSTM(64) → Dense(5)
        """
        def __init__(self):
            super().__init__()
            self.encoder = nn.LSTM(N_FEATURES, HIDDEN_DIM, batch_first=True)
            self.enc2    = nn.LSTM(HIDDEN_DIM, HIDDEN_DIM // 2, batch_first=True)
            self.latent  = nn.Linear(HIDDEN_DIM // 2, LATENT_DIM)
            self.dropout = nn.Dropout(DROPOUT_RATE)

            self.dec_expand = nn.Linear(LATENT_DIM, HIDDEN_DIM // 2)
            self.decoder    = nn.LSTM(HIDDEN_DIM // 2, HIDDEN_DIM, batch_first=True)
            self.dec2       = nn.LSTM(HIDDEN_DIM, HIDDEN_DIM, batch_first=True)
            self.output     = nn.Linear(HIDDEN_DIM, N_FEATURES)

        def forward(self, x):
            # Encode
            out, _ = self.encoder(x)
            out     = self.dropout(out)
            out, _ = self.enc2(out)
            z       = self.latent(out[:, -1, :])           # (B, LATENT_DIM)

            # Decode
            z_exp   = self.dec_expand(z).unsqueeze(1)      # (B, 1, H/2)
            z_rep   = z_exp.repeat(1, SEQ_LEN, 1)          # (B, T, H/2)
            out, _ = self.decoder(z_rep)
            out, _ = self.dec2(out)
            recon   = self.output(out)                     # (B, T, N_FEATURES)
            return recon

    return LSTMAutoencoder()


# ═════════════════════════════════════════════════════════════════════════════
# TRAINING LOOP
# ═════════════════════════════════════════════════════════════════════════════

def train(windows):
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset, random_split

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\nTraining on: {device}")

    rng = np.random.default_rng(42)

    # 90/10 train/val split
    n_val   = int(len(windows) * 0.1)
    n_train = len(windows) - n_val
    data    = torch.tensor(windows)
    train_d, val_d = random_split(data, [n_train, n_val])

    train_loader = DataLoader(TensorDataset(train_d.dataset[train_d.indices]),
                              batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader   = DataLoader(TensorDataset(val_d.dataset[val_d.indices]),
                              batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    model     = build_model().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
    criterion = nn.MSELoss()

    best_val  = float("inf")
    best_path = os.path.join(MODEL_DIR, "lstm_autoencoder.pt")

    print(f"{'Epoch':>6} {'Train Loss':>12} {'Val Loss':>12} {'LR':>10}")
    print("-" * 45)

    for epoch in range(1, EPOCHS + 1):
        # Train
        model.train()
        train_loss = 0.0
        for (xb,) in train_loader:
            xb     = xb.to(device)
            xb_mmi = torch.tensor(apply_mmi_mask(xb.cpu().numpy(), MASK_PROB, rng)).to(device)
            recon  = model(xb_mmi)
            loss   = criterion(recon, xb)   # reconstruct ORIGINAL (not masked)
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item() * len(xb)
        train_loss /= n_train

        # Validate
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for (xb,) in val_loader:
                xb    = xb.to(device)
                recon = model(xb)
                val_loss += criterion(recon, xb).item() * len(xb)
        val_loss /= n_val

        scheduler.step()
        lr_now = scheduler.get_last_lr()[0]

        if epoch % 5 == 0 or epoch == 1:
            print(f"{epoch:>6}  {train_loss:>12.6f}  {val_loss:>12.6f}  {lr_now:>10.6f}")

        if val_loss < best_val:
            best_val = val_loss
            torch.save(model.state_dict(), best_path)

    print(f"\nBest val loss: {best_val:.6f} → saved to {best_path}")
    return model, device, best_path


# ═════════════════════════════════════════════════════════════════════════════
# COMPUTE ANOMALY THRESHOLD
# ═════════════════════════════════════════════════════════════════════════════

def compute_threshold(model, windows, device):
    """
    Compute reconstruction error on training data.
    Threshold = mean + 2.5 * std (anything above = anomaly).
    """
    import torch
    import torch.nn as nn

    model.eval()
    criterion = nn.MSELoss(reduction="none")
    errors    = []

    with torch.no_grad():
        for i in range(0, len(windows), BATCH_SIZE):
            batch = torch.tensor(windows[i: i + BATCH_SIZE]).to(device)
            recon = model(batch)
            mse   = criterion(recon, batch).mean(dim=[1, 2])   # (B,)
            errors.extend(mse.cpu().numpy().tolist())

    errors    = np.array(errors)
    mean_err  = float(errors.mean())
    std_err   = float(errors.std())
    threshold = mean_err + ANOMALY_SIGMA * std_err

    thr_path = os.path.join(MODEL_DIR, "lstm_threshold.txt")
    with open(thr_path, "w") as f:
        f.write(f"{threshold:.8f}\n")
        f.write(f"mean={mean_err:.8f}\n")
        f.write(f"std={std_err:.8f}\n")
        f.write(f"sigma={ANOMALY_SIGMA}\n")

    print(f"\nAnomaly threshold: {threshold:.6f}  (mean={mean_err:.4f}, std={std_err:.4f})")
    print(f"Saved → {thr_path}")
    return threshold


# ═════════════════════════════════════════════════════════════════════════════
# EVALUATE ON FAULT DATA
# ═════════════════════════════════════════════════════════════════════════════

def evaluate_on_faults(model, scaler, threshold, device):
    """Quick sanity check: fault windows should score above threshold."""
    import torch
    import torch.nn as nn

    print("\nSanity check on fault windows...")
    df = pd.read_csv(DATA_PATH, usecols=["section_id", "fault_active", "fault_type"] + INPUT_FEATURES)
    fault = df[df["fault_active"] == 1].copy()

    fault[INPUT_FEATURES] = scaler.transform(fault[INPUT_FEATURES])
    criterion = nn.MSELoss(reduction="none")

    results = {}
    for ft in fault["fault_type"].unique():
        subset = fault[fault["fault_type"] == ft][INPUT_FEATURES].values
        if len(subset) < SEQ_LEN:
            continue
        w = torch.tensor(subset[:SEQ_LEN].reshape(1, SEQ_LEN, N_FEATURES), dtype=torch.float32).to(device)
        with torch.no_grad():
            recon = model(w)
            mse   = float(criterion(recon, w).mean().item())
        flag  = "✅ ANOMALY DETECTED" if mse > threshold else "❌ missed"
        results[ft] = {"mse": round(mse, 6), "threshold": round(threshold, 6), "detected": mse > threshold}
        print(f"  {ft:25s}: score={mse:.4f}  threshold={threshold:.4f}  {flag}")

    return results


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("GridSentinel — LSTM Autoencoder Training")
    print("=" * 60)

    try:
        import torch
    except ImportError:
        print("❌ PyTorch not installed. Run: pip install torch")
        return

    windows, scaler = load_and_prepare()
    model, device, model_path = train(windows)

    # Load best checkpoint for evaluation
    import torch
    model.load_state_dict(torch.load(model_path, map_location=device))
    threshold = compute_threshold(model, windows, device)
    evaluate_on_faults(model, scaler, threshold, device)

    print(f"\n✅ LSTM training complete.")
    print(f"   Model    → {model_path}")
    print(f"   Scaler   → {os.path.join(MODEL_DIR, 'lstm_scaler.pkl')}")
    print(f"   Threshold → {os.path.join(MODEL_DIR, 'lstm_threshold.txt')}")
    print(f"\nNext: run train_xgb.py")


if __name__ == "__main__":
    main()
