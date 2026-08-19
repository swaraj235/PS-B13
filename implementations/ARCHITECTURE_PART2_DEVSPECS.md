# GridSentinel — Detailed Architecture Part 2: Per-Developer Specs
## Read ARCHITECTURE_PART1_CONTRACTS.md first. This file details what each dev builds.

---

## DEV A SPECIFICATION — Frontend + Backend API Layer

### Complete file list Dev A creates (every file, every folder):

```
PS-B13/
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                        # Router setup, 3 pages
│       ├── lib/
│       │   ├── constants.ts               # COPY FROM PART1 §1B exactly
│       │   ├── api.ts                     # All fetch() wrappers
│       │   └── utils.ts                   # formatDate, statusToColor etc.
│       ├── types/
│       │   └── index.ts                   # TypeScript interfaces for all schemas
│       ├── store/
│       │   └── gridStore.ts               # Zustand store (shape from Part1 §8)
│       ├── hooks/
│       │   ├── useWebSocket.ts            # WS connection + message routing
│       │   ├── useFaultData.ts            # Poll /fault/localize every 10s
│       │   └── useTerraShield.ts          # Poll /terrashield/status every 30s
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Header.tsx
│       │   │   └── StatusBar.tsx          # WS connected indicator + uptime
│       │   ├── map/
│       │   │   ├── FeederMap.tsx          # Leaflet map, feeder line overlay
│       │   │   ├── FaultOverlay.tsx       # GeoJSON layer, colors by status
│       │   │   └── CrewRoute.tsx          # GeoJSON LineString to fault
│       │   ├── dashboard/
│       │   │   ├── AlertPanel.tsx         # Last 20 fault alerts
│       │   │   ├── SectionGrid.tsx        # 5 section cards with status
│       │   │   ├── SensorTimeSeries.tsx   # Recharts line chart (V, I, temp)
│       │   │   └── LiveIndicator.tsx      # Pulsing dot, "LIVE" badge
│       │   ├── terrashield/
│       │   │   ├── TerraShieldPanel.tsx   # Grid of 10 tower cards
│       │   │   └── TowerCard.tsx          # Single tower TFR/ERT reading
│       │   ├── analysis/
│       │   │   ├── SHAPChart.tsx          # Horizontal bar chart (Recharts)
│       │   │   └── FaultClassifyCard.tsx  # Fault type + confidence ring
│       │   ├── restoration/
│       │   │   ├── SwitchingGuide.tsx     # Animated step-by-step
│       │   │   ├── SwitchStep.tsx         # One step with checkmark animation
│       │   │   └── AffectedVillages.tsx   # Village list with icons
│       │   └── complaints/
│       │       ├── ComplaintsFeed.tsx     # Live feed of complaints
│       │       └── ComplaintForm.tsx      # Submit complaint (POST)
│       └── pages/
│           ├── Dashboard.tsx              # Main operator view
│           ├── Analytics.tsx              # Historical charts
│           └── CrewView.tsx               # Field crew mobile view
│
├── backend/
│   ├── main.py                            # FastAPI app, lifespan, routers
│   ├── core/
│   │   ├── config.py                      # Pydantic settings from .env
│   │   └── startup.py                     # load_models() on startup
│   ├── api/
│   │   ├── fault.py                       # /api/fault/* routes
│   │   ├── terrashield.py                 # /api/terrashield/* routes
│   │   ├── gis.py                         # /api/gis/* routes
│   │   ├── explain.py                     # /api/explain route
│   │   ├── complaints.py                  # /api/complaints route
│   │   ├── switching.py                   # /api/switching/* routes
│   │   └── ws.py                          # WebSocket /api/ws/live
│   ├── mock_data/
│   │   ├── __init__.py                    # load_mock(filename) helper
│   │   ├── localize.json
│   │   ├── classify.json
│   │   ├── explain.json
│   │   ├── terrashield.json
│   │   ├── fault_overlay.json
│   │   ├── crew_route.json
│   │   ├── switching.json
│   │   └── ws_stream.json
│   ├── db/
│   │   ├── connection.py                  # SQLAlchemy async engine
│   │   └── models.py                      # ORM table models
│   ├── shared/
│   │   ├── constants.py                   # COPY FROM PART1 §1A exactly
│   │   └── schemas.py                     # COPY FROM PART1 §2 exactly
│   └── ml/                                # Dev B owns this folder
│       └── inference.py                   # Dev B fills this
```

### `backend/main.py` exact structure Dev A writes:
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.core.startup import load_all_models
from backend.api import fault, terrashield, gis, explain, complaints, switching, ws

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if not settings.USE_MOCK_DATA:
        app.state.inference = load_all_models()
    yield
    # Shutdown — cleanup here if needed

app = FastAPI(title="GridSentinel API", version="1.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fault.router,       prefix="/api")
app.include_router(terrashield.router, prefix="/api")
app.include_router(gis.router,         prefix="/api")
app.include_router(explain.router,     prefix="/api")
app.include_router(complaints.router,  prefix="/api")
app.include_router(switching.router,   prefix="/api")
app.include_router(ws.router,          prefix="/api")

@app.get("/health")
async def health():
    loaded = hasattr(app.state, "inference") or settings.USE_MOCK_DATA
    return {"status": "ok", "models_loaded": loaded, "mock_mode": settings.USE_MOCK_DATA}
```

### `backend/core/startup.py` — how Dev A triggers Dev B's code:
```python
from backend.ml.inference import GridSentinelInference

def load_all_models() -> GridSentinelInference:
    inf = GridSentinelInference()
    inf.load_models()   # Dev B implements this method
    return inf
```

### TypeScript types Dev A must define in `frontend/src/types/index.ts`:
```typescript
// Mirror EVERY Pydantic schema from Part1 §2 as TypeScript interfaces

export interface SensorReading {
  section_id:    number;
  timestamp:     string;   // ISO string
  voltage_pu:    number;
  current_A:     number;
  temp_C:        number;
  thd_pct:       number;
  power_factor:  number;
  anomaly_score: number;
}

export interface SectionResult {
  id:                number;
  fault_probability: number;
  status:            "normal" | "warning" | "critical";
}

export interface LocalizeResponse {
  timestamp: string;
  sections:  SectionResult[];
}

export interface FaultCandidate {
  type:        string;
  probability: number;
}

export interface ClassifyResponse {
  section_id:   number;
  fault_type:   string;
  confidence:   number;
  candidates:   FaultCandidate[];
  triggered_at: string;
}

export interface SHAPReason {
  feature:      string;
  feature_key:  string;
  contribution: number;
  value:        number;
  direction:    "increase_risk" | "decrease_risk";
}

export interface ExplainResponse {
  section_id:  number;
  fault_type:  string;
  top_reasons: SHAPReason[];   // exactly 4
  summary:     string;
}

export interface TowerReading {
  id:          string;
  tfr_ohm:     number;
  ert_anomaly: boolean;
  status:      "normal" | "warning" | "critical";
  lat:         number;
  lon:         number;
}

export interface TerraShieldResponse {
  towers:    TowerReading[];
  timestamp: string;
}

export interface SwitchStep {
  step_number:  number;
  action:       string;
  switch_id:    string;
  safety_check: string;
  restores:     string[];
}

export interface SwitchingGuideResponse {
  fault_section_id:           number;
  total_steps:                number;
  steps:                      SwitchStep[];
  affected_villages:          string[];
  estimated_restore_time_min: number;
}

export interface ComplaintRequest {
  text:     string;
  village?: string;
  phone?:   string;
}

export interface ComplaintResponse {
  id:           number;
  section_id:   number;
  village:      string;
  submitted_at: string;
  acknowledged: boolean;
}

export interface WSMessage {
  type: "sensor_reading" | "fault_alert" | "heartbeat";
  data?: SensorReading | ClassifyResponse;
  uptime_sec?: number;
}
```

---

## DEV B SPECIFICATION — ML Models + Data Pipeline

### Complete file list Dev B creates:

```
PS-B13/
├── ml/
│   ├── requirements.txt
│   ├── notebooks/
│   │   ├── 01_data_generation.ipynb       # pandapower + Kaggle merge
│   │   ├── 02_lstm_training.ipynb         # LSTM Autoencoder
│   │   ├── 03_tgat_training.ipynb         # Temporal GAT
│   │   ├── 04_xgb_training.ipynb          # XGBoost + SHAP
│   │   └── 05_evaluation.ipynb            # Full metrics report
│   ├── scripts/
│   │   ├── fetch_weather.py               # Open-Meteo fetch + save
│   │   ├── generate_dataset.py            # CLI version of notebook 01
│   │   └── train_all.py                   # Run all training in sequence
│   ├── models/                            # Saved model files go here
│   │   ├── lstm_autoencoder.pt
│   │   ├── tgat_final.pt
│   │   ├── xgb_classifier.pkl
│   │   └── shap_explainer.pkl
│   └── data/                              # Generated datasets go here
│       ├── raw/                           # Downloaded Kaggle + weather CSVs
│       ├── processed/                     # Merged, cleaned training data
│       └── graphs/                        # PyTorch Geometric Data objects
│
└── backend/
    └── ml/                                # Dev B OWNS all files here
        ├── __init__.py
        ├── inference.py                   # THE interface (see Part1 §5)
        ├── lstm_model.py
        ├── tgat_model.py
        ├── xgb_model.py
        ├── shap_explainer.py
        ├── nlp_processor.py
        ├── restoration_planner.py
        └── sensor_simulator.py
```

### `ml/requirements.txt` — Dev B installs these:
```
torch==2.3.0
torch-geometric==2.5.3
pandapower==2.14.6
xgboost==2.0.3
shap==0.45.0
scikit-learn==1.4.2
pandas==2.2.2
numpy==1.26.4
matplotlib==3.9.0
seaborn==0.13.2
sentence-transformers==3.0.1
networkx==3.3
pyserial==3.5
requests==2.32.3
joblib==1.4.2
```

### Exact model file contracts (what Dev B saves, what Dev A loads):

| File | Saved with | Loaded with | Notes |
|------|-----------|-------------|-------|
| `lstm_autoencoder.pt` | `torch.save(model.state_dict(), path)` | `model.load_state_dict(torch.load(path))` | Also save `lstm_scaler.pkl` for normalization |
| `tgat_final.pt` | `torch.save(model.state_dict(), path)` | `model.load_state_dict(torch.load(path))` | Also save graph metadata JSON |
| `xgb_classifier.pkl` | `joblib.dump(model, path)` | `joblib.load(path)` | Save feature names list too |
| `shap_explainer.pkl` | `joblib.dump(explainer, path)` | `joblib.load(path)` | TreeExplainer instance |

### Data pipeline output schema — what notebooks must produce:

#### `ml/data/processed/sensor_timeseries.csv`
```
timestamp,section_id,voltage_pu,current_A,temp_C,thd_pct,power_factor,
rainfall_mm,wind_speed_kmh,humidity_pct,
fault_active,fault_type,fault_section
```
- `fault_active`: 0 or 1
- `fault_type`: one of the 5 FaultType enum values, or "normal"
- `fault_section`: int 1-5 or 0 if no fault

#### `ml/data/processed/fault_events.csv`
```
event_id,start_time,end_time,section_id,fault_type,
voltage_drop_pct,current_spike_pct,temp_delta,thd_pct,power_factor_drop,
rainfall_mm,wind_speed_kmh,complaint_count,
label
```

### `backend/ml/sensor_simulator.py` — critical for Dev A's mock WS stream:
```python
import math, random
from datetime import datetime, timezone
from backend.shared.schemas import SensorReading
from backend.shared.constants import SectionStatus

class SensorSimulator:
    """
    Generates realistic-looking sensor readings without hardware.
    Used when ARDUINO_MOCK=true or hardware not connected.
    Dev A's WebSocket depends on this during development.
    """

    def __init__(self):
        self._fault_section: int | None = None
        self._fault_type: str | None = None
        self._t = 0

    def set_fault(self, section_id: int, fault_type: str) -> None:
        """Called by inject_fault() in inference.py"""
        self._fault_section = section_id
        self._fault_type = fault_type

    def clear_fault(self) -> None:
        self._fault_section = None
        self._fault_type = None

    def get_reading(self, section_id: int) -> SensorReading:
        """
        Returns one reading for the given section.
        If section == self._fault_section, injects fault signatures.
        Must be callable every 1 second with < 5ms execution time.
        """
        self._t += 1
        is_fault = (section_id == self._fault_section)

        base_voltage = 0.61 if is_fault else (1.0 + 0.01 * math.sin(self._t * 0.1))
        noise = random.gauss(0, 0.005)

        return SensorReading(
            section_id=section_id,
            timestamp=datetime.now(timezone.utc),
            voltage_pu=max(0.0, base_voltage + noise),
            current_A=(387.0 + random.gauss(0, 5)) if is_fault else (180.0 + random.gauss(0, 10)),
            temp_C=(72.0 + random.gauss(0, 1)) if is_fault else (55.0 + random.gauss(0, 2)),
            thd_pct=(18.0 + random.gauss(0, 0.5)) if is_fault else (4.0 + random.gauss(0, 0.3)),
            power_factor=(0.71 + random.gauss(0, 0.01)) if is_fault else (0.92 + random.gauss(0, 0.01)),
            anomaly_score=(4.82 + random.gauss(0, 0.2)) if is_fault else (0.3 + random.gauss(0, 0.05)),
        )
```

---

## INTEGRATION CHECKPOINT CHECKLIST

### Checkpoint 1 — End of Week 1 (Dev A demos to Dev B)
```
[ ] curl http://localhost:8000/health → {"status":"ok","mock_mode":true}
[ ] curl http://localhost:8000/api/fault/localize → returns LocalizeResponse JSON
[ ] curl http://localhost:8000/api/fault/classify?section_id=3 → ClassifyResponse
[ ] curl http://localhost:8000/api/explain?section_id=3 → ExplainResponse
[ ] curl http://localhost:8000/api/terrashield/status → TerraShieldResponse
[ ] WebSocket ws://localhost:8000/api/ws/live → receives sensor_reading messages
[ ] Frontend dashboard loads on localhost:5173 with mock data
[ ] Section 3 shows red on FeederMap
```

### Checkpoint 2 — End of Week 2 (Dev B demos to Dev A)
```
[ ] ml/data/processed/sensor_timeseries.csv exists with > 100,000 rows
[ ] LSTM Autoencoder trains without NaN loss
[ ] Anomaly scores for fault windows are > 3x normal window scores
[ ] XGBoost classifier achieves > 80% accuracy on held-out test set
[ ] SHAP values are non-zero and sum to ~1.0
[ ] All model files saved in ml/models/ with correct names from §model-file-contracts
```

### Checkpoint 3 — End of Week 3 (Integration day — both devs together)
```
[ ] Set USE_MOCK_DATA=false in backend/.env
[ ] backend/ml/inference.py load_models() runs without error
[ ] curl http://localhost:8000/api/fault/localize → real T-GAT output (not mock JSON)
[ ] curl http://localhost:8000/api/explain?section_id=3 → real SHAP values
[ ] WebSocket stream shows real LSTM anomaly_scores
[ ] POST /api/fault/inject → frontend dashboard shows fault alert within 2 seconds
[ ] Full end-to-end: inject fault → alert appears → SHAP chart updates → switching guide shows
```

### Checkpoint 4 — Demo Day
```
[ ] Docker compose up → full stack starts in one command
[ ] Demo script rehearsed: "I will now inject a vegetation contact fault on Section 3"
[ ] Fault injection → dashboard updates in < 3 seconds
[ ] Judge can read SHAP explanation on screen without explanation from team
[ ] TerraShield panel shows at least 1 warning tower
```

---

## DATASET STRATEGY (Dev B executes)

### Recommended datasets — download in this order:

**1. Kaggle Electrical Fault Classification** ⭐ (primary training data)
- URL: `kaggle.com/datasets/esathyaprakash/electrical-fault-detection-and-classification`
- Contains: ~12,000 rows, Va/Vb/Vc/Ia/Ib/Ic, 6 fault type labels
- Use for: Pre-training XGBoost fault classifier

**2. IEEE 33-Bus Benchmark**
- URL: `ieee-dataport.org` → search "distribution system fault detection"
- Use for: Validating your pandapower simulation matches academic standard

**3. Open-Meteo API** (no download, call live)
- Free, no API key, historical weather anywhere in India
- Call: `https://archive-api.open-meteo.com/v1/archive?latitude=18.5&longitude=73.8&start_date=2024-01-01&end_date=2024-12-31&hourly=rain,windspeed_10m,temperature_2m,relativehumidity_2m`

**4. pandapower IEEE 33-Bus Simulation** (you generate this)
```python
import pandapower as pp
import pandapower.networks as pn
net = pn.case33bw()  # IEEE 33-bus test network
# Inject load variations over 6 months of 1-minute intervals
# Inject faults by modifying line impedances
```

### Final merged dataset column list (Dev B produces, for reference only — Dev A never reads CSVs):
```
timestamp, section_id,
voltage_pu, current_A, temp_C, thd_pct, power_factor,       # from pandapower
voltage_drop_pct, current_spike_pct, temp_delta,              # derived features
rainfall_mm, wind_speed_kmh, humidity_pct, temp_ambient_C,   # from Open-Meteo
tfr_risk_score, ert_anomaly_flag,                             # from TerraShield simulator
complaint_count, complaint_geo_match,                          # from NLP
fault_active, fault_type, fault_section_id                    # labels
```

---

## GIT BRANCH RULES (enforceable)

```bash
# Dev A creates these branches:
git checkout -b feature/frontend
git checkout -b feature/api-routes

# Dev B creates these branches:
git checkout -b feature/ml-models
git checkout -b feature/data-pipeline

# BOTH merge into:
git checkout develop

# Protected rules:
# - No direct push to main
# - No direct push to develop
# - feature/* → develop via PR only
# - At least one other dev reviews PR before merge

# Shared files that need coordination before editing:
#   backend/main.py
#   backend/core/config.py
#   backend/shared/constants.py   ← if enum needs adding
#   backend/shared/schemas.py     ← if schema changes (rare)
```

---

*GridSentinel | PS-B13 | Developer Specifications*
*Part 1: ARCHITECTURE_PART1_CONTRACTS.md | Part 2: This file*
