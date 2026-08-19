# GridSentinel — PS-B13 Complete Architecture & Implementation Plan
## AI-Based Rural Electricity Fault Localization + TerraShield Underground Intelligence

---

## 🎯 Project Goal

Build **GridSentinel**, a production-grade, hackathon-winning AI platform that:
1. **Detects** anomalies in feeder voltage/current/temperature in real-time
2. **Localizes** the fault section with ~90% accuracy using a Temporal Graph Attention Network
3. **Classifies** the root cause (5 fault types) with confidence %
4. **Integrates TerraShield** ERT/TFR underground corrosion signals as a predictive precursor
5. **Delivers** a stunning real-time dashboard with GIS maps, SHAP explanations, and crew routing

---

## User Review Required

> [!IMPORTANT]
> **Both hardware `.c` files (ert.c, tfr.c) are currently empty.** I will write the full `tfr.c` Arduino code from scratch. I will NOT modify `ert.c` — you mentioned ERT code exists, but the file appears empty. Please confirm:
> - Is the ERT code stored elsewhere? Or should I write `ert.c` too?
> - Do you have a physical Arduino unit available for testing?
> - Is it Arduino Uno + AD620 + ADS1115 as mentioned in the PPT?

> [!WARNING]
> **Tech stack conflict:** The PPT says `React + Vite` (which is a web framework). Per my guidelines I use React+Vite only for complex web apps. This project clearly qualifies — I will use **React + Vite + TailwindCSS** (as specified in PPT/shadcn stack). Please confirm if Tailwind is fine.

> [!IMPORTANT]
> **Timeline:** This plan assumes you are building **before** the hackathon for demo readiness. Please tell me: how much time do you have? This affects what I pre-build vs stub.

---

## Open Questions

1. **Hardware**: Is there an actual Arduino + AD620 + ADS1115 circuit assembled? Will you physically demonstrate TerraShield at the venue?
2. **ERT Code**: The `ert.c` file is empty. Where is the existing ERT code? Should I also write it?
3. **Serial Port**: What port does the Arduino use? (e.g., `/dev/ttyUSB0`) — needed for Python serial bridge
4. **Team Info**: Do you want me to prefill team name, IDs in any config files?
5. **Dataset**: Confirm if you want purely synthetic data (pandapower) or if you have access to any real DISCOMs data?

---

## Part 1 — Hardware Architecture (TerraShield Layer)

### 1.1 ERT (Electrical Resistivity Tomography) — `ert.c`

**Hardware:** Arduino Uno + ADS1115 (16-bit I2C ADC) + 4 stainless steel electrodes (Wenner array)

**Wenner Array Configuration:**
```
A ──── M ──── N ──── B
|←  a  →|←  a  →|←  a  →|
Current injection: A → B
Voltage measurement: M → N
Apparent resistivity: ρ = 2πa × (V/I)
```

**What `ert.c` does:**
- Injects DC current pulses via electrodes A and B
- Measures differential voltage at M and N via ADS1115 (differential mode)
- AD620 amplifies the tiny mV signal (gain ~100x)
- Computes apparent resistivity ρ = 2πa(V/I)
- Outputs JSON over UART: `{"tower":"T1","rho":45.2,"depth_cm":30,"status":"ANOMALY"}`
- Repeats for multiple electrode spacings (multi-depth ERT profiling)

### 1.2 TFR (Tower Footing Resistance) — `tfr.c` **[MISSING — to be written]**

**Hardware:** Same Arduino Uno + AD620 + ADS1115

**What `tfr.c` does:**
- **Measurement method:** Fall-of-Potential (3-electrode method)
  - Current electrode C1 connected to tower grounding rod
  - Current electrode C2 at distance >10m (remote earth)
  - Potential electrode P at 62% of C1-C2 distance (Wenner rule)
- **Current injection:** Uses PWM + H-bridge OR direct DC injection
- **Voltage measurement:** V across tower leg → earth via ADS1115
- **Resistance calc:** R_tower = V/I
- **Normal:** < 10Ω, **Warning:** 10–25Ω, **Critical:** > 25Ω
- Outputs JSON: `{"tower":"T1","tfr_ohm":18.5,"status":"WARNING","timestamp":"2026-08-19T21:14:19"}`

### 1.3 Arduino Serial Bridge (Python side)
- `serial_bridge.py` reads JSON from both `/dev/ttyUSB0` and `/dev/ttyUSB1`
- Parses and pushes to TimescaleDB via FastAPI
- Mock mode: generates synthetic TFR/ERT data when hardware not connected

---

## Part 2 — Dataset Strategy (ML-Critical)

### 2.1 The Core Problem: No Real DISCOM Data Exists

We **generate** a physics-accurate synthetic dataset using **pandapower**.

### 2.2 Dataset Structure

#### A. Feeder Topology Dataset
- Based on **IEEE 33-Bus Distribution Test System** (standard benchmark)
- Mapped to a 5-section rural Indian feeder (11kV):

```
Substation (Bus 0)
  │
  ├─ Section 1 ── Transformer T1 ── Village 1, 2
  ├─ Section 2 ── Transformer T2 ── Village 3, 4
  ├─ Section 3 ── Transformer T3 ── Village 5, 6 ← fault injection point
  ├─ Section 4 ── Transformer T4 ── Village 7, 8
  └─ Section 5 ── Transformer T5 ── Village 9, 10
```

#### B. Time-Series Sensor Dataset (for LSTM)
| Feature | Description | Normal Range |
|---|---|---|
| `voltage_pu` | Voltage in per-unit | 0.95–1.05 |
| `current_A` | Line current (A) | 50–400 |
| `temp_C` | Transformer temperature | 40–85°C |
| `power_factor` | Load power factor | 0.75–0.98 |
| `thd_pct` | Total Harmonic Distortion | 2–8% |
| `smart_meter_loss_pct` | % consumers with outage | 0–5% normal |

**Fault Injection Signatures (what each fault looks like):**

| Fault Type | Voltage | Current | Temp | THD | Duration |
|---|---|---|---|---|---|
| `conductor_damage` | -40% sudden | +200% spike then 0 | Normal | High | Permanent |
| `transformer_overload` | -15% gradual | +50% sustained | +30°C | Moderate | Hours |
| `vegetation_contact` | -20% intermittent | +80% pulsing | Normal | Very High | Intermittent |
| `illegal_tap` | -10% gradual | +30% gradual | Normal | Low | Permanent |
| `grounding_fault` | Asymmetric drop | Ground current spike | Normal | High | Variable |

**Dataset size:** 
- 6 months of 1-min readings = 262,800 timesteps
- 5 sections × 5 fault types × 50 events = **1,250 labeled fault events**
- 80/20 train/test split + k-fold CV

#### C. Graph Dataset (for GNN)
- **Nodes:** 6 (substation + 5 sections), feature vector per node = [V, I, temp, THD, meter_loss%, tfr_risk_score]
- **Edges:** 5 connections, edge features = [impedance_ohm, distance_km, line_age_years]
- **Labels:** Per-node binary fault label + fault type (multi-class)
- **Augmentation:** 
  - Inject faults at every node permutation → 5! graph variants per fault event
  - Add Gaussian noise (σ=0.02) to node features
  - Randomly drop 20% of edges (simulating sensor failure)
  - **Total GNN training graphs:** ~10,000+

#### D. TerraShield Dataset
- Per tower (10 towers): weekly TFR readings + ERT profile
- Corrosion progression modeled: 3-month ramp from 8Ω → 35Ω with soil moisture correlation
- Labels: `{normal, early_corrosion, severe_corrosion}`
- Used as **static background feature** (fused into GNN node features)

#### E. Consumer Complaint Dataset (NLP)
- 500 synthetic complaint messages in English + Hindi + Marathi + Telugu
- Format: `"No light since 2 hours in village Ranjangaon area"` → extracted: `{village: "Ranjangaon", duration: "2h", complaint_type: "outage"}`
- Geocoded to feeder section

#### F. Weather Dataset
- Real data via Open-Meteo API (free, no key)
- Features: `rainfall_mm, wind_speed_kmh, temperature_C, humidity_pct, lightning_strikes`
- Correlated with fault events (vegetation contact → rain events)

---

## Part 3 — ML Architecture (The "Extraordinary" Part)

### 3.1 Model 1: LSTM Autoencoder for Anomaly Detection

**Why LSTM Autoencoder vs alternatives?**
- Learns normal behavior patterns → high reconstruction error = anomaly
- No need for labeled fault data during training
- Better than simple threshold rules (handles gradual drift)
- Better than Isolation Forest (sequential/temporal data)

**Architecture:**
```
Input: [V, I, temp, THD, pf] × 60 timesteps (1-hour window)

Encoder:
  LSTM(64) → LSTM(32) → Latent vector (16-dim)

Decoder:
  RepeatVector(60) → LSTM(32) → LSTM(64) → Dense(5)

Training: MSE reconstruction on NORMAL data only
Inference: anomaly_score = rolling_MSE(reconstruction)
Alert: anomaly_score > μ + 2.5σ (adaptive threshold)
```

**Innovation — Sparse Sensor Extension:**
- We add a **Mixture of Missing Inputs (MMI)** layer: randomly mask 1-2 input features during training to force robustness against sensor dropout
- Result: model works even with only 1 functioning sensor → rural deployment viable

**Expected Performance:** ~94% anomaly detection accuracy, F1 > 0.88

### 3.2 Model 2: Temporal Graph Attention Network (T-GAT) — The Core Innovation

> [!IMPORTANT]
> **This is the crown jewel.** Instead of a vanilla GAT, we use a **Temporal-GAT** that processes BOTH spatial graph structure AND temporal sequences simultaneously — this is state-of-the-art and novel for feeder fault localization.

**Why T-GAT over plain GAT?**
- Faults propagate through the feeder graph over TIME — pure spatial GNN misses temporal dynamics
- T-GAT combines GNN (spatial) + LSTM (temporal) in one unified architecture
- Inspired by STGCN (Spatio-Temporal Graph Convolutional Networks, AAAI 2018) but adapted for fault localization

**Architecture:**
```
Input per node: time-series of features × 30 timesteps

Step 1 — Temporal Encoding (per node):
  1D CNN layers → captures local temporal patterns (faster than LSTM for short sequences)
  Output: 32-dim temporal embedding per node

Step 2 — Graph Attention Layer 1:
  Multi-head attention (8 heads) over neighbor nodes
  Edge features (impedance, distance) incorporated via edge attention
  Output: 64-dim node embedding

Step 3 — Graph Attention Layer 2:
  4-head attention, residual connection from Step 2
  Dropout(0.3) for regularization
  Output: 32-dim node embedding

Step 4 — TerraShield Feature Fusion:
  Concatenate TFR risk score + ERT anomaly flag to node embedding
  Linear projection → 32-dim fused embedding

Step 5 — Output Heads:
  (a) Fault probability head: Dense(16) → Dense(1) → Sigmoid → per-node P(fault)
  (b) Classification head: Dense(16) → Dense(5) → Softmax → fault type

Training loss: BCE(fault_prob) + 0.5 × CE(fault_type) [multi-task learning]
```

**Framework:** PyTorch + PyTorch Geometric (CUDA accelerated — RTX 4060 will handle this fine)

**Training Config:**
```python
optimizer = AdamW(lr=3e-4, weight_decay=1e-4)
scheduler = CosineAnnealingLR(T_max=100)
epochs = 200
batch_size = 32  # graphs per batch
gradient_clipping = 1.0
```

**Expected Performance:** ~89% section-level fault localization accuracy, AUC > 0.94

### 3.3 Model 3: XGBoost Fault Cause Classifier

**Input features (35 features):**
```
Electrical: [V_drop_pct, I_spike_pct, I_asymmetry, temp_delta, thd_pct, power_factor_drop]
Temporal: [time_of_day_sin, time_of_day_cos, day_of_week, season]
Weather: [rainfall_mm, wind_speed, humidity, temp_C, lightning_flag]
TerraShield: [tfr_risk_score, ert_anomaly_count, corrosion_severity]
Context: [consumer_complaint_count, complaint_geo_match_flag, adjacent_section_healthy]
GNN output: [section_fault_prob, neighbor_fault_prob, graph_centrality]
```

**Target:** `{conductor_damage, transformer_overload, vegetation_contact, illegal_tap, grounding_fault}`

**Training:** Stratified k-fold (k=5), SMOTE for class imbalance, early stopping

**Expected Performance:** ~91% classification accuracy, Macro-F1 > 0.87

### 3.4 Model 4: SHAP Explainability Layer

```python
# Tree SHAP for XGBoost (fast, exact)
explainer = shap.TreeExplainer(xgb_model)
shap_values = explainer(X_test)

# GNN SHAP (GNNExplainer from PyTorch Geometric)
gnn_explainer = Explainer(model=gat_model, algorithm=GNNExplainer(epochs=200))
explanation = gnn_explainer(x, edge_index, target=0)

# Output format for field crew:
"⚠️ Section 3 fault (87% confidence) — Vegetation Contact
 Top reasons:
 1. Voltage drop: -42% [contribution: 38%]
 2. Rain event detected [contribution: 29%]
 3. 12 consumer complaints in Village Ranjangaon [contribution: 21%]
 4. High THD (18%) [contribution: 12%]"
```

### 3.5 Model 5: NLP Complaint Processor

**Model:** `paraphrase-multilingual-MiniLM-L12-v2` (50+ languages, 117MB)

**Pipeline:**
1. Complaint text → sentence embedding
2. Named entity extraction (village names, timestamps)
3. Clustering by geographic proximity to feeder sections
4. Output: complaint density map per section → fed as GNN node feature

### 3.6 Restoration Planner (Rule-Based + Graph Search)

**Algorithm:** Modified Dijkstra on the feeder graph
- Input: Fault section (from T-GAT) + feeder topology
- Output: Optimal switching sequence to isolate fault + restore downstream sections
- Safety check: Verify no parallel paths overload before recommending switch

---

## Part 4 — Backend Architecture

### 4.1 FastAPI Service Structure

```
backend/
├── main.py                    # App entry point
├── api/
│   ├── fault.py               # /api/fault/* endpoints
│   ├── terrashield.py         # /api/terrashield/* endpoints
│   ├── gis.py                 # /api/gis/* endpoints
│   └── explain.py             # /api/explain/* endpoints
├── ml/
│   ├── lstm_model.py          # LSTM Autoencoder
│   ├── tgat_model.py          # Temporal GAT
│   ├── xgb_model.py           # XGBoost classifier
│   ├── shap_explainer.py      # SHAP integration
│   ├── nlp_processor.py       # Complaint NLP
│   └── restoration_planner.py # Switching optimizer
├── data/
│   ├── generator.py           # Synthetic data generation
│   ├── feeder_graph.py        # NetworkX feeder topology
│   ├── arduino_bridge.py      # Serial TFR/ERT reader
│   └── weather_client.py      # Open-Meteo API client
├── db/
│   ├── timescale.py           # TimescaleDB connection
│   └── models.py              # SQLAlchemy ORM models
└── config.py                  # All config/secrets
```

### 4.2 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/fault/detect` | POST | Trigger anomaly detection on time-series |
| `/api/fault/localize` | GET | Return section fault probabilities |
| `/api/fault/classify` | GET | Return probable cause + confidence |
| `/api/fault/inject` | POST | Demo: inject synthetic fault event |
| `/api/explain` | GET | Return SHAP explanation for last prediction |
| `/api/terrashield/status` | GET | Return TFR/ERT readings per tower |
| `/api/terrashield/mock` | POST | Generate mock TerraShield readings |
| `/api/gis/feeder` | GET | Return feeder GeoJSON |
| `/api/gis/fault-overlay` | GET | Return fault probability GeoJSON |
| `/api/gis/crew-route` | GET | Return optimal crew routing GeoJSON |
| `/api/switching/guide` | GET | Return safe switching sequence |
| `/api/villages/affected` | GET | Return affected village list |
| `/api/complaints` | POST | Submit consumer complaint |
| `/api/ws/live` | WS | WebSocket for real-time sensor stream |

### 4.3 Database Schema (TimescaleDB)

```sql
-- Hypertable for time-series sensor data
CREATE TABLE sensor_readings (
    time        TIMESTAMPTZ NOT NULL,
    section_id  INT,
    voltage_pu  FLOAT,
    current_A   FLOAT,
    temp_C      FLOAT,
    thd_pct     FLOAT,
    pf          FLOAT,
    anomaly_score FLOAT
);
SELECT create_hypertable('sensor_readings', 'time');

-- Fault events
CREATE TABLE fault_events (
    id          SERIAL PRIMARY KEY,
    detected_at TIMESTAMPTZ,
    section_id  INT,
    fault_prob  FLOAT,
    fault_type  VARCHAR(50),
    confidence  FLOAT,
    resolved_at TIMESTAMPTZ
);

-- TerraShield readings
CREATE TABLE terrashield_readings (
    time        TIMESTAMPTZ NOT NULL,
    tower_id    VARCHAR(10),
    tfr_ohm     FLOAT,
    rho         FLOAT,
    status      VARCHAR(20)
);
SELECT create_hypertable('terrashield_readings', 'time');

-- Consumer complaints
CREATE TABLE complaints (
    id          SERIAL PRIMARY KEY,
    submitted_at TIMESTAMPTZ,
    village     VARCHAR(100),
    section_id  INT,
    text_raw    TEXT,
    embedding   VECTOR(384)  -- pgvector for NLP embeddings
);
```

---

## Part 5 — Frontend Architecture

### 5.1 React + Vite + Tailwind Dashboard

```
frontend/
├── src/
│   ├── components/
│   │   ├── FeederMap.jsx          # Leaflet GIS map (feeder + fault overlay)
│   │   ├── AlertPanel.jsx         # Real-time fault alerts
│   │   ├── SHAPChart.jsx          # SHAP explanation bar chart
│   │   ├── SensorTimeSeries.jsx   # Recharts voltage/current timeline
│   │   ├── TerraShieldPanel.jsx   # ERT/TFR heatmap per tower
│   │   ├── SwitchingGuide.jsx     # Step-by-step animated switching
│   │   ├── ComplaintsFeed.jsx     # Consumer reports feed
│   │   └── RestorationTracker.jsx # Restoration progress
│   ├── hooks/
│   │   ├── useWebSocket.js        # Live sensor stream
│   │   └── useFaultData.js        # API polling hooks
│   ├── store/
│   │   └── gridStore.js           # Zustand state management
│   ├── pages/
│   │   ├── Dashboard.jsx          # Main operator view
│   │   ├── Analytics.jsx          # Historical analysis
│   │   └── CrewView.jsx           # Field crew mobile view
│   └── App.jsx
```

### 5.2 UI Design System

**Color Palette:**
- Background: `#0F172A` (dark navy)
- Primary: `#38BDF8` (electric blue)  
- Danger: `#EF4444` (fault red)
- Warning: `#F59E0B` (amber)
- Success: `#22C55E` (green)
- Card surface: `#1E293B`

**Key Visual Features:**
- Animated feeder line with pulsing red section on fault
- SHAP waterfall chart with smooth transitions
- Real-time voltage/current waveform (WebSocket)
- TerraShield underground heatmap (Leaflet choropleth)
- Switching guide with step-by-step animations
- Dark glassmorphism cards with subtle glow on alerts

---

## Part 6 — Project Folder Structure

```
PS-B13/
├── arduino-code/
│   ├── ert.c                      # ERT measurement firmware (UNTOUCHED)
│   └── tfr.c                      # TFR measurement firmware [TO WRITE]
│
├── ml/
│   ├── notebooks/
│   │   ├── 01_data_generation.ipynb    # pandapower synthetic dataset
│   │   ├── 02_lstm_training.ipynb      # LSTM Autoencoder training
│   │   ├── 03_tgat_training.ipynb      # Temporal GAT training
│   │   ├── 04_xgb_training.ipynb       # XGBoost classifier training
│   │   └── 05_evaluation.ipynb         # Full evaluation + metrics
│   ├── models/                          # Saved .pt / .pkl files
│   └── data/                            # Generated datasets
│
├── backend/                         # FastAPI service
├── frontend/                        # React + Vite dashboard
│
├── docker-compose.yml               # One-command deployment
└── README.md
```

---

## Part 7 — Training Plan (RTX 4060 CUDA)

| Model | Dataset Size | Expected Training Time | GPU VRAM |
|---|---|---|---|
| LSTM Autoencoder | 260K samples, BS=256 | ~15 min | 2GB |
| Temporal GAT | 10K graphs, BS=32 | ~45 min | 4GB |
| XGBoost | 1250 fault events, 35 features | ~2 min | CPU |

**Total training time: ~1 hour** on RTX 4060 (very manageable)

**Pre-training strategy:**
- Train all models offline before hackathon
- Save models as `.pt` / `.pkl` files
- FastAPI loads from disk → instant serving

---

## Part 8 — Verification Plan

### Automated
- `pytest` for all FastAPI endpoints
- Model accuracy metrics printed in training notebooks
- SHAP sanity check: top feature must correlate with fault type

### Manual
- Demo fault injection via `/api/fault/inject` → verify dashboard responds
- Verify TerraShield panel updates with mock serial data
- Verify Leaflet map shows correct section colored red

---

## 📊 What Makes This "God-Tier" for a Hackathon

1. **Temporal Graph Attention Network** — Nobody else will be using this. Standard teams use LSTM or simple GNN — we use BOTH fused together.
2. **Sparse-sensor robustness** — Explicitly designed for the gap the PS identifies (rural India has almost zero sensors)
3. **Full end-to-end** — Data generation → training → serving → dashboard → crew navigation → restoration. Complete loop.
4. **Hardware + AI + GIS triple layer** — Hardware (TerraShield) feeds ML, which feeds GIS routing. Judges will see a complete stack.
5. **SHAP for every prediction** — No other team will have explainability integrated at this depth.
6. **Multi-modal fusion** — 6+ data sources fused into one prediction. This matches exactly what the PS asks for.

---

*Architecture by GridSentinel | PS-B13 | AI4SDG Hackathon 2026*
