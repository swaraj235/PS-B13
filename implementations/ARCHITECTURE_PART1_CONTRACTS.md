# GridSentinel — Detailed Architecture Part 1: Shared Contracts
## This document is the SOURCE OF TRUTH. Both devs must implement exactly what is written here.

---

## 1. SHARED ENUMS & CONSTANTS
### These values are used in BOTH frontend (TypeScript) and backend (Python). They must never diverge.

### 1A. Python side — `backend/shared/constants.py`
```python
from enum import Enum

class FaultType(str, Enum):
    CONDUCTOR_DAMAGE     = "conductor_damage"
    TRANSFORMER_OVERLOAD = "transformer_overload"
    VEGETATION_CONTACT   = "vegetation_contact"
    ILLEGAL_TAP          = "illegal_tap"
    GROUNDING_FAULT      = "grounding_fault"
    NORMAL               = "normal"

class SectionStatus(str, Enum):
    NORMAL   = "normal"    # fault_probability < 0.40
    WARNING  = "warning"   # 0.40 <= fault_probability < 0.70
    CRITICAL = "critical"  # fault_probability >= 0.70

class TowerStatus(str, Enum):
    NORMAL   = "normal"    # tfr_ohm < 10
    WARNING  = "warning"   # 10 <= tfr_ohm < 25
    CRITICAL = "critical"  # tfr_ohm >= 25

class WSMessageType(str, Enum):
    SENSOR_READING = "sensor_reading"
    FAULT_ALERT    = "fault_alert"
    HEARTBEAT      = "heartbeat"

SECTION_IDS = [1, 2, 3, 4, 5]

# Feeder GeoJSON coordinates (fixed — Dev A uses for map, Dev B uses for GIS output)
SECTION_COORDINATES = {
    1: [[73.800, 18.500], [73.820, 18.515]],
    2: [[73.820, 18.515], [73.840, 18.525]],
    3: [[73.840, 18.525], [73.860, 18.535]],
    4: [[73.860, 18.535], [73.880, 18.542]],
    5: [[73.880, 18.542], [73.900, 18.548]],
}

TOWER_IDS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"]
```

### 1B. TypeScript side — `frontend/src/lib/constants.ts`
```typescript
export const FAULT_TYPES = {
  conductor_damage:     "Conductor Damage",
  transformer_overload: "Transformer Overload",
  vegetation_contact:   "Vegetation Contact",
  illegal_tap:          "Illegal Tap",
  grounding_fault:      "Grounding Fault",
  normal:               "Normal",
} as const;

export type FaultTypeKey = keyof typeof FAULT_TYPES;

export const SECTION_STATUS = {
  normal:   "normal",
  warning:  "warning",
  critical: "critical",
} as const;

export type SectionStatus = keyof typeof SECTION_STATUS;

export const STATUS_COLORS: Record<SectionStatus, string> = {
  normal:   "#22C55E",
  warning:  "#F59E0B",
  critical: "#EF4444",
};

export const WS_MESSAGE_TYPES = {
  SENSOR_READING: "sensor_reading",
  FAULT_ALERT:    "fault_alert",
  HEARTBEAT:      "heartbeat",
} as const;

export const SECTION_COORDINATES: Record<number, [number, number][]> = {
  1: [[73.800, 18.500], [73.820, 18.515]],
  2: [[73.820, 18.515], [73.840, 18.525]],
  3: [[73.840, 18.525], [73.860, 18.535]],
  4: [[73.860, 18.535], [73.880, 18.542]],
  5: [[73.880, 18.542], [73.900, 18.548]],
};

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const WS_BASE  = import.meta.env.VITE_WS_URL  ?? "ws://localhost:8000";
```

---

## 2. FULL PYDANTIC SCHEMAS — `backend/shared/schemas.py`
### Dev A reads these to know exact response shape. Dev B implements these exactly.

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from backend.shared.constants import FaultType, SectionStatus, TowerStatus, WSMessageType

# ── Sensor Reading ──────────────────────────────────────────────────────────
class SensorReading(BaseModel):
    section_id:    int
    timestamp:     datetime
    voltage_pu:    float = Field(..., ge=0.0, le=2.0, description="Voltage in per-unit")
    current_A:     float = Field(..., ge=0.0, description="Line current in Amperes")
    temp_C:        float = Field(..., description="Transformer temperature Celsius")
    thd_pct:       float = Field(..., ge=0.0, le=100.0, description="Total Harmonic Distortion %")
    power_factor:  float = Field(..., ge=0.0, le=1.0)
    anomaly_score: float = Field(..., ge=0.0, description="LSTM reconstruction error, higher = more anomalous")

# ── Fault Localization ──────────────────────────────────────────────────────
class SectionResult(BaseModel):
    id:                int
    fault_probability: float = Field(..., ge=0.0, le=1.0)
    status:            SectionStatus

class LocalizeResponse(BaseModel):
    timestamp: datetime
    sections:  List[SectionResult]

# ── Fault Classification ────────────────────────────────────────────────────
class FaultCandidate(BaseModel):
    type:        FaultType
    probability: float = Field(..., ge=0.0, le=1.0)

class ClassifyResponse(BaseModel):
    section_id:   int
    fault_type:   FaultType
    confidence:   float = Field(..., ge=0.0, le=1.0)
    candidates:   List[FaultCandidate]   # sorted descending by probability, len==5
    triggered_at: datetime

# ── SHAP Explanation ────────────────────────────────────────────────────────
class SHAPReason(BaseModel):
    feature:      str   # human-readable name e.g. "Voltage Drop %"
    feature_key:  str   # machine key e.g. "voltage_drop_pct"
    contribution: float # 0..1, all contributions sum to ~1.0
    value:        float # actual sensor value that triggered this
    direction:    str   # "increase_risk" or "decrease_risk"

class ExplainResponse(BaseModel):
    section_id:  int
    fault_type:  FaultType
    top_reasons: List[SHAPReason]  # exactly 4 items, sorted by |contribution| desc
    summary:     str               # plain English, max 120 chars

# ── TerraShield ────────────────────────────────────────────────────────────
class TowerReading(BaseModel):
    id:          str    # "T1"..."T10"
    tfr_ohm:     float
    ert_anomaly: bool
    status:      TowerStatus
    lat:         float
    lon:         float

class TerraShieldResponse(BaseModel):
    towers:    List[TowerReading]
    timestamp: datetime

# ── GIS ────────────────────────────────────────────────────────────────────
class GISFeatureProperties(BaseModel):
    section_id:        int
    fault_probability: float
    status:            SectionStatus
    village_names:     List[str]   # villages served by this section

# GIS endpoint returns raw GeoJSON dict — schema documented here for reference:
# {
#   "type": "FeatureCollection",
#   "features": [{
#     "type": "Feature",
#     "geometry": { "type": "LineString", "coordinates": [[lon, lat], ...] },
#     "properties": GISFeatureProperties
#   }]
# }

# ── Switching Guide ─────────────────────────────────────────────────────────
class SwitchStep(BaseModel):
    step_number:  int
    action:       str   # e.g. "Open isolator S3-A"
    switch_id:    str   # e.g. "S3-A"
    safety_check: str   # e.g. "Confirm no back-feed from DG set"
    restores:     List[str]  # village names restored after this step

class SwitchingGuideResponse(BaseModel):
    fault_section_id: int
    total_steps:      int
    steps:            List[SwitchStep]
    affected_villages: List[str]
    estimated_restore_time_min: int

# ── Complaints ──────────────────────────────────────────────────────────────
class ComplaintRequest(BaseModel):
    text:    str = Field(..., min_length=5, max_length=500)
    village: Optional[str] = None
    phone:   Optional[str] = None

class ComplaintResponse(BaseModel):
    id:          int
    section_id:  int    # inferred from village name NLP
    village:     str
    submitted_at: datetime
    acknowledged: bool  # always True on success

# ── Fault Inject (Demo only) ────────────────────────────────────────────────
class FaultInjectRequest(BaseModel):
    section_id: int = Field(..., ge=1, le=5)
    fault_type: FaultType

class FaultInjectResponse(BaseModel):
    status:       str      # always "injected"
    section_id:   int
    fault_type:   FaultType
    triggered_at: datetime

# ── Error Shape (ALL endpoints use this on failure) ─────────────────────────
class ErrorResponse(BaseModel):
    error_code: str    # e.g. "MODEL_NOT_LOADED", "INVALID_SECTION_ID"
    message:    str    # human-readable
    detail:     Optional[str] = None

# ── WebSocket Messages ──────────────────────────────────────────────────────
class WSMessage(BaseModel):
    type: WSMessageType

class WSSensorMessage(WSMessage):
    type: WSMessageType = WSMessageType.SENSOR_READING
    data: SensorReading

class WSAlertMessage(WSMessage):
    type: WSMessageType = WSMessageType.FAULT_ALERT
    data: ClassifyResponse

class WSHeartbeat(WSMessage):
    type: WSMessageType = WSMessageType.HEARTBEAT
    uptime_sec: int
```

---

## 3. FULL API CONTRACT

### Base URL: `http://localhost:8000`
### All responses: `Content-Type: application/json`
### All timestamps: ISO 8601 UTC with Z suffix e.g. `"2026-08-19T18:00:00Z"`
### CORS: Allow `http://localhost:5173` (Vite dev server)

| Method | Endpoint | Request Body | Response Schema | Notes |
|--------|----------|-------------|-----------------|-------|
| GET | `/api/fault/localize` | — | `LocalizeResponse` | Returns current state of all 5 sections |
| GET | `/api/fault/classify?section_id=3` | — | `ClassifyResponse` | Query param `section_id` required |
| GET | `/api/explain?section_id=3` | — | `ExplainResponse` | Query param `section_id` required |
| GET | `/api/terrashield/status` | — | `TerraShieldResponse` | All 10 towers |
| GET | `/api/gis/feeder` | — | GeoJSON dict | Static feeder topology, no fault overlay |
| GET | `/api/gis/fault-overlay` | — | GeoJSON dict | Feeder + fault probabilities |
| GET | `/api/gis/crew-route?section_id=3` | — | GeoJSON dict | Optimal path to fault section |
| GET | `/api/switching/guide?section_id=3` | — | `SwitchingGuideResponse` | Safe switching steps |
| GET | `/api/villages/affected?section_id=3` | — | `{"villages": [...]}` | List of affected village names |
| POST | `/api/complaints` | `ComplaintRequest` | `ComplaintResponse` | Consumer complaint intake |
| POST | `/api/fault/inject` | `FaultInjectRequest` | `FaultInjectResponse` | Demo fault injection |
| POST | `/api/terrashield/mock` | `{"tower_id":"T2","tfr_ohm":27.5}` | `TowerReading` | Update one tower mock value |
| WS | `/api/ws/live` | — | `WSMessage` stream | See WebSocket spec below |
| GET | `/health` | — | `{"status":"ok","models_loaded":true}` | Health check |

### HTTP Status Codes
| Status | Meaning |
|--------|---------|
| 200 | Success |
| 422 | Validation error (wrong types/missing fields) — FastAPI auto-generates |
| 500 | Model not loaded / inference failure — returns `ErrorResponse` |
| 503 | Service unavailable (DB down) |

### Example Error Response (500):
```json
{
  "error_code": "MODEL_NOT_LOADED",
  "message": "T-GAT model failed to load from disk",
  "detail": "FileNotFoundError: ml/models/tgat_final.pt not found"
}
```

---

## 4. WEBSOCKET PROTOCOL — `/api/ws/live`

### Connection lifecycle:
```
Client connects → Server sends HEARTBEAT every 5s → Server sends SENSOR_READING every 1s per section
                                                   → Server sends FAULT_ALERT when anomaly_score > threshold
Client disconnects → Server cleans up, no error
```

### Message sequence (what Dev A's `useWebSocket.js` receives):
```
t=0s:  { "type": "heartbeat", "uptime_sec": 0 }
t=1s:  { "type": "sensor_reading", "data": { "section_id": 1, ... } }
t=2s:  { "type": "sensor_reading", "data": { "section_id": 2, ... } }
t=3s:  { "type": "sensor_reading", "data": { "section_id": 3, ... } }
t=4s:  { "type": "sensor_reading", "data": { "section_id": 4, ... } }
t=5s:  { "type": "sensor_reading", "data": { "section_id": 5, ... } }
        { "type": "heartbeat", "uptime_sec": 5 }
t=6s:  { "type": "fault_alert",   "data": { "section_id": 3, "fault_type": "...", ... } }  ← only when fault detected
```

### Dev A's WebSocket hook contract:
```typescript
// frontend/src/hooks/useWebSocket.ts
export function useWebSocket(): {
  sensorData:  Record<number, SensorReading>;  // keyed by section_id
  faultAlerts: ClassifyResponse[];             // append-only list
  connected:   boolean;
  uptime:      number;
}
```

### Dev B's WebSocket server contract:
```python
# backend/api/ws.py
# Must implement this coroutine:
async def live_feed(websocket: WebSocket):
    """
    - Accept connection
    - Every 1s: call ml_inference.get_latest_reading(section_id) for each section → send WSSensorMessage
    - Every 5s: send WSHeartbeat
    - On anomaly_score > 3.5: call ml_inference.classify(section_id) → send WSAlertMessage
    - On disconnect: graceful cleanup, no raise
    """
```

---

## 5. EXACT INTERFACE DEV B MUST EXPOSE IN `backend/ml/`

Dev A's route handlers call ONLY these functions. Dev B owns these implementations.

### `backend/ml/inference.py` — The single entry point Dev A calls
```python
from backend.shared.schemas import (
    LocalizeResponse, ClassifyResponse, ExplainResponse,
    TerraShieldResponse, SensorReading, SwitchingGuideResponse
)

class GridSentinelInference:
    """
    Singleton loaded once at FastAPI startup via lifespan event.
    Dev A accesses it via: app.state.inference
    """

    def load_models(self) -> None:
        """Load all .pt and .pkl files from ml/models/. Raise RuntimeError if any missing."""
        ...

    def get_localize(self) -> LocalizeResponse:
        """
        Run T-GAT on latest 30-timestep window for all 5 sections.
        Returns fault probability per section.
        Never raises — returns last known state if model errors.
        """
        ...

    def get_classify(self, section_id: int) -> ClassifyResponse:
        """
        Run XGBoost classifier for the given section.
        section_id must be in [1..5], else raise ValueError.
        """
        ...

    def get_explain(self, section_id: int) -> ExplainResponse:
        """
        Run SHAP on XGBoost output for section_id.
        Returns exactly 4 SHAPReason items.
        """
        ...

    def get_terrashield(self) -> TerraShieldResponse:
        """
        Return latest TFR/ERT readings for all 10 towers.
        Falls back to simulated data if Arduino not connected.
        """
        ...

    def get_switching_guide(self, section_id: int) -> SwitchingGuideResponse:
        """
        Run Dijkstra restoration planner for the given fault section.
        """
        ...

    def get_latest_reading(self, section_id: int) -> SensorReading:
        """
        Return the most recent 1-second sensor reading for WebSocket stream.
        Must return in < 50ms.
        """
        ...

    def inject_fault(self, section_id: int, fault_type: str) -> None:
        """
        Override the next N readings to simulate a fault. Used for demo only.
        Does NOT persist to DB.
        """
        ...
```

### `backend/ml/` file ownership map:
| File | Owner | Purpose |
|------|-------|---------|
| `inference.py` | Dev B | **THE interface** — Dev A only imports this |
| `lstm_model.py` | Dev B | LSTM Autoencoder load + anomaly scoring |
| `tgat_model.py` | Dev B | Temporal GAT load + fault localization |
| `xgb_model.py` | Dev B | XGBoost load + fault classification |
| `shap_explainer.py` | Dev B | SHAP values computation |
| `nlp_processor.py` | Dev B | Complaint → section_id mapping |
| `restoration_planner.py` | Dev B | Dijkstra switching optimizer |
| `sensor_simulator.py` | Dev B | Generates realistic mock readings when no hardware |

---

## 6. ENVIRONMENT VARIABLES

### `backend/.env` (Dev A creates the file structure, Dev B fills ML values)
```env
# ── Server ──────────────────────────────────────────────────
APP_HOST=0.0.0.0
APP_PORT=8000
CORS_ORIGIN=http://localhost:5173

# ── Database ─────────────────────────────────────────────────
DATABASE_URL=postgresql://griduser:gridpass@localhost:5432/gridsentinel

# ── Mock Mode ────────────────────────────────────────────────
# Set to "true" during Week 1-2 so backend serves mock JSON
# Dev B sets to "false" once models are trained and loaded
USE_MOCK_DATA=true

# ── ML Model Paths (Dev B sets these) ────────────────────────
LSTM_MODEL_PATH=ml/models/lstm_autoencoder.pt
TGAT_MODEL_PATH=ml/models/tgat_final.pt
XGB_MODEL_PATH=ml/models/xgb_classifier.pkl
SHAP_EXPLAINER_PATH=ml/models/shap_explainer.pkl

# ── Hardware ─────────────────────────────────────────────────
ARDUINO_PORT=/dev/ttyUSB0
ARDUINO_BAUD=9600
ARDUINO_MOCK=true   # true = use sensor_simulator.py

# ── Feature Flags ─────────────────────────────────────────────
ANOMALY_THRESHOLD=3.5       # LSTM anomaly_score > this triggers FAULT_ALERT
FAULT_PROB_WARNING=0.40     # section_probability > this = WARNING
FAULT_PROB_CRITICAL=0.70    # section_probability > this = CRITICAL
```

### `frontend/.env`
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DEMO_MODE=true    # shows demo fault inject button
```

---

## 7. MOCK DATA STRATEGY (Week 1-2)

### How it works:
- `USE_MOCK_DATA=true` in `.env`
- `backend/api/*.py` routes check `settings.USE_MOCK_DATA`
- If true → return JSON from `backend/mock_data/*.json`
- If false → call `app.state.inference.*` methods

### Mock files Dev A creates and maintains:
```
backend/mock_data/
├── localize.json       ← LocalizeResponse shape, section 3 = critical
├── classify.json       ← ClassifyResponse shape, vegetation_contact
├── explain.json        ← ExplainResponse shape, 4 reasons
├── terrashield.json    ← TerraShieldResponse shape, T2=warning, T3=critical
├── fault_overlay.json  ← GeoJSON, section 3 highlighted red
├── crew_route.json     ← GeoJSON LineString from substation to section 3
├── switching.json      ← SwitchingGuideResponse shape, 3 steps
└── ws_stream.json      ← Array of WSMessages replayed on loop in mock mode
```

### Route handler pattern Dev A uses for every endpoint:
```python
# backend/api/fault.py
from backend.core.config import settings
from backend.mock_data import load_mock
from backend.shared.schemas import LocalizeResponse

@router.get("/fault/localize", response_model=LocalizeResponse)
async def localize(request: Request):
    if settings.USE_MOCK_DATA:
        return load_mock("localize.json")          # Dev A's mock
    return request.app.state.inference.get_localize()  # Dev B's model
```

This pattern means Dev B only needs to implement `inference.py` — no route code.

---

## 8. FRONTEND COMPONENT → API MAPPING

Dev A builds each component knowing exactly which endpoint feeds it.

| Component | Endpoint(s) | Zustand slice | Update frequency |
|-----------|------------|---------------|-----------------|
| `FeederMap.jsx` | `GET /api/gis/fault-overlay` | `gridStore.geoJSON` | Every 10s poll |
| `AlertPanel.jsx` | WS `fault_alert` messages | `gridStore.alerts` | Real-time push |
| `SensorTimeSeries.jsx` | WS `sensor_reading` messages | `gridStore.sensorHistory` | Real-time push |
| `TerraShieldPanel.jsx` | `GET /api/terrashield/status` | `gridStore.towers` | Every 30s poll |
| `SHAPChart.jsx` | `GET /api/explain?section_id=X` | `gridStore.explanation` | On-demand (on alert click) |
| `SwitchingGuide.jsx` | `GET /api/switching/guide?section_id=X` | `gridStore.switchSteps` | On-demand |
| `ComplaintsFeed.jsx` | WS + `POST /api/complaints` | `gridStore.complaints` | Real-time push |
| `RestorationTracker.jsx` | `GET /api/villages/affected?section_id=X` | `gridStore.affectedVillages` | On fault detect |

### `frontend/src/store/gridStore.ts` shape:
```typescript
interface GridStore {
  // Live sensor data
  sensorHistory: Record<number, SensorReading[]>; // section_id → last 60 readings
  latestReadings: Record<number, SensorReading>;

  // Fault state
  sections:    SectionResult[];
  activeAlert: ClassifyResponse | null;
  alerts:      ClassifyResponse[];           // last 20 alerts

  // Explanation
  explanation: ExplainResponse | null;
  loadExplanation: (sectionId: number) => Promise<void>;

  // TerraShield
  towers: TowerReading[];

  // GIS
  geoJSON: GeoJSONFeatureCollection | null;

  // Switching
  switchSteps:      SwitchStep[];
  affectedVillages: string[];

  // Complaints
  complaints: ComplaintResponse[];
  submitComplaint: (req: ComplaintRequest) => Promise<void>;

  // WebSocket
  wsConnected: boolean;
  wsUptime:    number;

  // Demo
  injectFault: (sectionId: number, faultType: FaultTypeKey) => Promise<void>;
}
```

---

## 9. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                   │
│                                                                     │
│  Arduino (TFR/ERT) ──serial──► serial_bridge.py                    │
│                                      │                             │
│                                      ▼                             │
│  pandapower simulator ──────► TimescaleDB (sensor_readings)        │
│  Open-Meteo API ────────────►         │                            │
│  Kaggle fault data ─────────►         │                            │
│                                       ▼                            │
│                              inference.py (Dev B owns)             │
│                              ┌────────────────────┐               │
│                              │  LSTM Autoencoder  │ anomaly_score  │
│                              │  T-GAT             │ fault_prob     │
│                              │  XGBoost           │ fault_type     │
│                              │  SHAP              │ top_reasons    │
│                              └────────┬───────────┘               │
│                                       │                            │
│                              FastAPI routes (Dev A owns)           │
│                              ┌─────────────────────────────────┐  │
│                              │ GET /fault/localize              │  │
│                              │ GET /fault/classify              │  │
│                              │ GET /explain                     │  │
│                              │ WS  /ws/live                     │  │
│                              └──────────────┬──────────────────┘  │
│                                             │ HTTP / WebSocket     │
│                                             ▼                      │
│                              React Dashboard (Dev A owns)          │
│                              ┌─────────────────────────────────┐  │
│                              │ FeederMap   SensorTimeSeries     │  │
│                              │ AlertPanel  SHAPChart            │  │
│                              │ TerraShield SwitchingGuide       │  │
│                              └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

*See ARCHITECTURE_PART2_DEVSPECS.md for per-developer file specs, training pipeline, and integration checklist*
