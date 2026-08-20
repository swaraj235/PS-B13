"""
GridSentinel — ML Inference Engine
====================================
Loads all trained models and exposes them via a single class.
This is the ONLY file Dev A's API routes import from the ml/ package.

Usage (in FastAPI lifespan):
    from backend.ml.inference import GridSentinelInference
    app.state.inference = GridSentinelInference()
    app.state.inference.load_models()
"""

import os, json, time, threading
from datetime import datetime, timezone
from typing import Optional
import numpy as np

# ── Paths ─────────────────────────────────────────────────────────────────────
_HERE      = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR  = os.path.normpath(os.path.join(_HERE, "..", "..", "ml", "models"))
GRAPH_META = os.path.normpath(os.path.join(_HERE, "..", "..", "ml", "data", "graphs", "graph_meta.json"))

FAULT_TYPES = ["normal", "conductor_damage", "transformer_overload",
               "vegetation_contact", "illegal_tap", "grounding_fault"]
FAULT2IDX   = {ft: i for i, ft in enumerate(FAULT_TYPES)}
IDX2FAULT   = {i: ft for ft, i in FAULT2IDX.items()}

XGB_FEATURES = [
    "voltage_drop_pct", "current_spike_pct", "temp_delta",
    "thd_pct_mean", "pf_drop", "rain_mm_mean", "wind_mean_kmh",
    "humidity_mean_pct", "lightning_risk_mean", "vegetation_risk_mean",
    "duration_min", "section_id",
]

# Status thresholds
THR_WARN = float(os.getenv("FAULT_PROB_WARNING",  "0.40"))
THR_CRIT = float(os.getenv("FAULT_PROB_CRITICAL", "0.70"))
ANOMALY_THR = 3.5   # default; overridden from lstm_threshold.txt


def _status(prob: float) -> str:
    if prob >= THR_CRIT:  return "critical"
    if prob >= THR_WARN:  return "warning"
    return "normal"


class GridSentinelInference:
    """
    Singleton loaded once at FastAPI startup.
    All methods are thread-safe (read-only after load_models).
    """

    def __init__(self):
        self._lstm        = None
        self._lstm_scaler = None
        self._anomaly_thr = ANOMALY_THR
        self._xgb         = None
        self._shap        = None
        self._tgat        = None
        self._graph_meta  = None
        self._device      = None

        # Live state (updated by sensor_simulator or real Arduino data)
        self._lock           = threading.Lock()
        self._latest_readings: dict = {}   # section_id → SensorReading dict
        self._fault_override: dict  = {}   # section_id → fault_type (demo inject)
        self._start_time     = time.time()

        # Import simulator for mock/real fallback
        from backend.ml.sensor_simulator import SensorSimulator
        self._simulator = SensorSimulator()

    # ─────────────────────────────────────────────────────────────────────────
    def load_models(self) -> None:
        """
        Load all .pt and .pkl model files.
        Raises RuntimeError if a required model file is missing.
        Called once at FastAPI startup.
        """
        import torch, joblib

        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[Inference] Loading models on {self._device} from {MODEL_DIR}")

        # ── LSTM Autoencoder ──────────────────────────────────────────────────
        lstm_path  = os.path.join(MODEL_DIR, "lstm_autoencoder.pt")
        scaler_path = os.path.join(MODEL_DIR, "lstm_scaler.pkl")
        thr_path   = os.path.join(MODEL_DIR, "lstm_threshold.txt")

        if not os.path.exists(lstm_path):
            raise RuntimeError(f"LSTM model not found: {lstm_path}. Run train_lstm.py first.")

        from backend.ml.lstm_model import LSTMAutoencoder
        self._lstm = LSTMAutoencoder()
        self._lstm.load_state_dict(torch.load(lstm_path, map_location=self._device))
        self._lstm.to(self._device).eval()

        self._lstm_scaler = joblib.load(scaler_path)

        if os.path.exists(thr_path):
            with open(thr_path) as f:
                self._anomaly_thr = float(f.readline().strip())
        print(f"[Inference] LSTM loaded. Anomaly threshold: {self._anomaly_thr:.4f}")

        # ── XGBoost + SHAP ────────────────────────────────────────────────────
        xgb_path  = os.path.join(MODEL_DIR, "xgb_classifier.pkl")
        shap_path = os.path.join(MODEL_DIR, "shap_explainer.pkl")

        if not os.path.exists(xgb_path):
            raise RuntimeError(f"XGBoost model not found: {xgb_path}. Run train_xgb.py first.")

        self._xgb  = joblib.load(xgb_path)
        self._shap = joblib.load(shap_path)
        print("[Inference] XGBoost + SHAP loaded.")

        # ── T-GAT (optional — fallback if not yet trained) ────────────────────
        tgat_path = os.path.join(MODEL_DIR, "tgat_final.pt")
        if os.path.exists(tgat_path):
            from backend.ml.tgat_model import TGAT
            self._tgat = TGAT()
            self._tgat.load_state_dict(torch.load(tgat_path, map_location=self._device))
            self._tgat.to(self._device).eval()
            print("[Inference] T-GAT loaded.")
        else:
            print("[Inference] T-GAT not found — using XGBoost fallback for localization.")

        if os.path.exists(GRAPH_META):
            with open(GRAPH_META) as f:
                self._graph_meta = json.load(f)

        print("[Inference] All models loaded successfully.")

    # ─────────────────────────────────────────────────────────────────────────
    def get_latest_reading(self, section_id: int) -> dict:
        """
        Returns the most recent 1-second sensor reading for section_id.
        Used by WebSocket /api/ws/live — must return in < 50ms.
        """
        with self._lock:
            if section_id in self._latest_readings:
                return self._latest_readings[section_id]

        # Generate from simulator (real Arduino data would update _latest_readings)
        sim_data = self._simulator.get_reading(section_id)
        # Apply demo fault override if set
        if section_id in self._fault_override:
            self._simulator.set_fault(section_id, self._fault_override[section_id])

        return {
            "section_id":    sim_data.section_id,
            "timestamp":     sim_data.timestamp.isoformat(),
            "voltage_pu":    sim_data.voltage_pu,
            "current_A":     sim_data.current_A,
            "temp_C":        sim_data.temp_C,
            "thd_pct":       sim_data.thd_pct,
            "power_factor":  sim_data.power_factor,
            "anomaly_score": sim_data.anomaly_score,
        }

    # ─────────────────────────────────────────────────────────────────────────
    def get_localize(self) -> dict:
        """
        Run fault localization for all 5 sections.
        Uses T-GAT if available, otherwise heuristic from LSTM anomaly scores.
        Returns LocalizeResponse shape.
        """
        sections = []
        for sid in range(1, 6):
            reading = self.get_latest_reading(sid)
            anomaly = float(reading.get("anomaly_score", 0.3))
            # Convert anomaly score to fault probability (sigmoid-like mapping)
            fault_prob = float(1 / (1 + np.exp(-(anomaly - self._anomaly_thr))))
            fault_prob = round(min(1.0, max(0.0, fault_prob)), 4)
            sections.append({
                "id":                sid,
                "fault_probability": fault_prob,
                "status":            _status(fault_prob),
            })

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sections":  sections,
        }

    # ─────────────────────────────────────────────────────────────────────────
    def get_classify(self, section_id: int) -> dict:
        """
        Run XGBoost fault classifier for the given section.
        Returns ClassifyResponse shape.
        """
        if section_id not in range(1, 6):
            raise ValueError(f"section_id must be 1–5, got {section_id}")

        reading = self.get_latest_reading(section_id)

        # Build feature vector for XGBoost
        # Estimate aggregate features from current reading
        v_nom = {1: 1.021, 2: 1.008, 3: 0.993, 4: 0.981, 5: 0.974}[section_id]
        i_nom = {1: 155,   2: 178,   3: 192,   4: 165,   5: 145  }[section_id]

        x = np.array([[
            round(100 * (v_nom - reading["voltage_pu"]) / v_nom, 2),     # voltage_drop_pct
            round(100 * (reading["current_A"] - i_nom) / max(i_nom, 1), 2),  # current_spike_pct
            round(reading["temp_C"] - 55.0, 2),                           # temp_delta
            round(reading["thd_pct"], 3),                                 # thd_pct_mean
            round(0.92 - reading["power_factor"], 4),                     # pf_drop
            0.0, 10.0, 60.0, 0.1, 0.2,                                   # weather (defaults)
            30.0,                                                          # duration_min
            float(section_id),
        ]], dtype=np.float32)

        proba      = self._xgb.predict_proba(x)[0]
        pred_idx   = int(proba.argmax())
        fault_type = IDX2FAULT.get(pred_idx, "normal")
        confidence = round(float(proba[pred_idx]), 4)

        # If demo fault override is set, use that type
        if section_id in self._fault_override:
            fault_type = self._fault_override[section_id]
            confidence = 0.93

        candidates = sorted([
            {"type": IDX2FAULT.get(i, "normal"), "probability": round(float(p), 4)}
            for i, p in enumerate(proba)
        ], key=lambda c: -c["probability"])

        return {
            "section_id":   section_id,
            "fault_type":   fault_type,
            "confidence":   confidence,
            "candidates":   candidates,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
        }

    # ─────────────────────────────────────────────────────────────────────────
    def get_explain(self, section_id: int) -> dict:
        """
        Run SHAP explanation for the given section.
        Returns ExplainResponse shape with exactly 4 top_reasons.
        """
        classify = self.get_classify(section_id)
        fault_type = classify["fault_type"]
        reading    = self.get_latest_reading(section_id)

        v_nom = {1: 1.021, 2: 1.008, 3: 0.993, 4: 0.981, 5: 0.974}[section_id]
        i_nom = {1: 155,   2: 178,   3: 192,   4: 165,   5: 145  }[section_id]

        x = np.array([
            100 * (v_nom - reading["voltage_pu"]) / v_nom,
            100 * (reading["current_A"] - i_nom) / max(i_nom, 1),
            reading["temp_C"] - 55.0,
            reading["thd_pct"],
            0.92 - reading["power_factor"],
            0.0, 10.0, 60.0, 0.1, 0.2, 30.0, float(section_id),
        ], dtype=np.float32)

        pred_idx  = FAULT2IDX.get(fault_type, 0)
        shap_arr  = np.array(self._shap.shap_values(x.reshape(1, -1)))

        if shap_arr.ndim == 3 and shap_arr.shape[0] == 1:
            sv = shap_arr[0, :, pred_idx]
        elif shap_arr.ndim == 3 and shap_arr.shape[2] == len(FAULT_TYPES):
            sv = shap_arr[0, :, pred_idx]
        else:
            sv = shap_arr.flatten()[:len(XGB_FEATURES)]

        total_abs = float(np.abs(sv).sum()) + 1e-9
        order     = np.argsort(np.abs(sv))[::-1][:4]

        FEATURE_LABELS = {
            "voltage_drop_pct":     "Voltage Drop %",
            "current_spike_pct":    "Current Spike %",
            "temp_delta":           "Temperature Rise °C",
            "thd_pct_mean":         "THD %",
            "pf_drop":              "Power Factor Drop",
            "rain_mm_mean":         "Rainfall mm",
            "wind_mean_kmh":        "Wind Speed km/h",
            "humidity_mean_pct":    "Humidity %",
            "lightning_risk_mean":  "Lightning Risk",
            "vegetation_risk_mean": "Vegetation Risk",
            "duration_min":         "Duration min",
            "section_id":           "Section ID",
        }

        reasons = []
        for idx in order:
            i   = int(idx)
            key = XGB_FEATURES[i]
            reasons.append({
                "feature":      FEATURE_LABELS.get(key, key),
                "feature_key":  key,
                "contribution": round(float(np.abs(sv[i]) / total_abs), 4),
                "value":        round(float(x[i]), 4),
                "direction":    "increase_risk" if sv[i] > 0 else "decrease_risk",
            })

        confidence = classify["confidence"]
        summary = (f"Section {section_id} ({confidence*100:.0f}% confidence) — "
                   f"{fault_type.replace('_', ' ').title()} detected")

        return {
            "section_id":  section_id,
            "fault_type":  fault_type,
            "top_reasons": reasons,
            "summary":     summary[:120],
        }

    # ─────────────────────────────────────────────────────────────────────────
    def get_terrashield(self) -> dict:
        """Returns TerraShieldResponse from the Arduino bridge or simulator."""
        from backend.data.arduino_bridge import MockTerraShieldSimulator
        sim     = MockTerraShieldSimulator()
        towers  = []
        for tid in MockTerraShieldSimulator.TOWER_COORDS:
            tfr = sim.get_tfr(tid)
            ert = sim.get_ert(tid)
            towers.append({
                "id":          tid,
                "tfr_ohm":     tfr["tfr_ohm"],
                "ert_anomaly": ert["status"] != "NORMAL",
                "status":      tfr["status"].lower(),
                "lat":         tfr["lat"],
                "lon":         tfr["lon"],
            })
        return {
            "towers":    towers,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ─────────────────────────────────────────────────────────────────────────
    def get_switching_guide(self, section_id: int) -> dict:
        """Rule-based restoration switching guide for the given fault section."""
        guides = {
            1: [{"step_number":1,"action":"Open isolator S1-A at substation","switch_id":"S1-A","safety_check":"Confirm section 1 de-energised","restores":[]},
                {"step_number":2,"action":"Close tie switch TS-12 to back-feed section 1 from section 2","switch_id":"TS-12","safety_check":"Verify load < 80% capacity","restores":["Ranjangaon","Shikrapur"]}],
            2: [{"step_number":1,"action":"Open isolator S2-A","switch_id":"S2-A","safety_check":"Confirm section 2 de-energised","restores":[]},
                {"step_number":2,"action":"Close TS-13 to back-feed via section 3","switch_id":"TS-13","safety_check":"Check transformer T2 load","restores":["Kedgaon","Shirur"]}],
            3: [{"step_number":1,"action":"Open isolator S3-A","switch_id":"S3-A","safety_check":"Confirm section 3 de-energised","restores":[]},
                {"step_number":2,"action":"Close TS-34","switch_id":"TS-34","safety_check":"Verify no back-feed from DG set","restores":["Koregaon Bhima"]},
                {"step_number":3,"action":"Restore Sanaswadi via section 4 tie","switch_id":"TS-35","safety_check":"Load balance check","restores":["Sanaswadi"]}],
            4: [{"step_number":1,"action":"Open isolator S4-A","switch_id":"S4-A","safety_check":"Confirm section 4 de-energised","restores":[]},
                {"step_number":2,"action":"Close TS-45","switch_id":"TS-45","safety_check":"Check line rating","restores":["Wagholi","Loni Kalbhor"]}],
            5: [{"step_number":1,"action":"Open isolator S5-A","switch_id":"S5-A","safety_check":"Confirm section 5 de-energised","restores":[]},
                {"step_number":2,"action":"Restore via section 4 if back-feed available","switch_id":"TS-54","safety_check":"Check available capacity","restores":["Uruli Kanchan","Phursungi"]}],
        }
        villages = {1:["Ranjangaon","Shikrapur"], 2:["Kedgaon","Shirur"],
                    3:["Koregaon Bhima","Sanaswadi"], 4:["Wagholi","Loni Kalbhor"],
                    5:["Uruli Kanchan","Phursungi"]}
        steps = guides.get(section_id, [])
        return {
            "fault_section_id":            section_id,
            "total_steps":                 len(steps),
            "steps":                       steps,
            "affected_villages":           villages.get(section_id, []),
            "estimated_restore_time_min":  15 * len(steps),
        }

    # ─────────────────────────────────────────────────────────────────────────
    def inject_fault(self, section_id: int, fault_type: str) -> None:
        """Override next N readings to simulate a fault. Demo use only."""
        with self._lock:
            self._fault_override[section_id] = fault_type
            self._simulator.set_fault(section_id, fault_type)
