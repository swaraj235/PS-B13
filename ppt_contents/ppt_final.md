# 📊 PPT FINAL — PS-B13: GridSentinel
### AI-Based Rural Electricity Fault Localization
> ✅ All 6 slides | Bullet-points only | PPT-ready

---

## SLIDE 1 — TITLE

| Field | Value |
|---|---|
| **Team ID** | [ YOUR TEAM ID ] |
| **Team Name** | GridSentinel |
| **Team Leader** | [ LEADER NAME ] |
| **University** | [ COLLEGE / INSTITUTE NAME ] |
| **P.S Category** | Both (Software + Hardware) |
| **P.S ID** | PS-B13 |

---

## SLIDE 2 — TEAM DETAILS

| Role | Name | Department |
|---|---|---|
| Team Leader | [ NAME ] | [ DEPT ] |
| Member 2 | [ NAME ] | [ DEPT ] |
| Member 3 | [ NAME ] | [ DEPT ] |
| Member 4 | [ NAME ] | [ DEPT ] |

---

## SLIDE 3 — IDEA TITLE & SOLUTION

### 💡 GridSentinel
**AI-Powered Rural Feeder Fault Localization with Underground Infrastructure Intelligence**

---

### ❌ The Problem
- Rural feeders span **50–100 km** → almost **zero mid-point sensors**
- Fault location is **manual** → crews walk the entire line
- Result: **6–24 hour outages** for a fault fixable in 30 minutes
- Root causes: conductor damage, transformer overload, vegetation contact, illegal taps, **underground corrosion**

---

### ✅ Our Solution — What GridSentinel Does
- 🔍 **Detects** real-time anomalies in voltage, current & temperature
- 📍 **Localizes** fault to a specific section via **Graph Neural Network (GNN)**
- 🧠 **Classifies** root cause (5 fault types) with confidence %
- 🗺️ **Maps** affected villages + generates **GIS crew priority route**
- 🔌 **Guides** safe switching to restore partial power immediately
- 💬 **Integrates** consumer complaints as a crowdsource signal
- 📡 **TerraShield module** — detects underground tower corrosion *before* it causes faults

---

### 🌟 Innovation & Uniqueness

| Aspect | Existing Systems | GridSentinel |
|---|---|---|
| Data sources | 1–2 (sensors only) | 6+ (sensors + weather + complaints + underground) |
| Fault logic | Fixed threshold rules | Graph Neural Network (topology-aware) |
| Underground health | ❌ Not monitored | ✅ TFR/ERT via TerraShield |
| Explainability | ❌ Black box | ✅ SHAP — "Why Section 3?" |
| Sparse data support | ❌ Needs dense sensors | ✅ Works with 1 sensor + complaints |
| Restoration | Stops at detection | ✅ Switching guide + crew navigation |

---

## SLIDE 4 — TECHNICAL APPROACH

### 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Anomaly Detection** | PyTorch — LSTM Autoencoder |
| **Fault Localization** | PyTorch Geometric — Graph Attention Network (GAT) |
| **Cause Classification** | XGBoost / LightGBM |
| **Explainability (XAI)** | SHAP |
| **NLP (Complaints)** | spaCy + multilingual sentence-transformers |
| **Backend API** | FastAPI (Python) |
| **Database** | PostgreSQL + TimescaleDB |
| **GIS / Maps** | Leaflet.js |
| **Frontend** | React + Vite |
| **Power Simulation** | pandapower |
| **Hardware (TerraShield)** | Arduino Uno + AD620 + ADS1115 + 4-electrode ERT |
| **Deployment** | Docker + Docker Compose |

---

### ⚙️ System Flow

```
[Voltage/Current] [Temp] [Smart Meters] [Weather] [Complaints] [TerraShield TFR/ERT]
         │                │                │            │              │
         └────────────────┴────────────────┴────────────┴──────────────┘
                                           │
                              ┌────────────▼────────────┐
                              │  LSTM Anomaly Detection  │
                              │  → Anomaly score per     │
                              │    feeder section        │
                              └────────────┬────────────┘
                                           │
                              ┌────────────▼────────────┐
                              │  Graph Attention Network │
                              │  → Fault probability    │
                              │    per section (0–100%) │
                              └────────────┬────────────┘
                                           │
                         ┌─────────────────┼──────────────┐
                         ▼                 ▼              ▼
                   XGBoost             SHAP XAI       GIS Map
                 Cause Classifier    Explanation    + Crew Route
                 (5 fault types)    "Why Sec 3?"   + Switching Guide
```

---

## SLIDE 5 — FEASIBILITY & VIABILITY

### ✅ What Makes It Feasible

| Area | Evidence |
|---|---|
| **All open-source** | PyTorch, FastAPI, React, Leaflet — zero licensing cost |
| **No real grid needed** | pandapower simulates realistic feeders for demo |
| **Hardware ready** | TerraShield prototype already built (Arduino + AD620 + ADS1115) |
| **Free data sources** | IEEE PES Test Feeders + Open-Meteo API (no key needed) |
| **Easy deployment** | Docker Compose — one command, runs on a single laptop |

---

### ⚠️ Challenges & Mitigations

| Challenge | Risk | Mitigation |
|---|---|---|
| No real DISCOM sensor data | 🔴 High | pandapower synthetic data + IEEE feeder benchmarks |
| Small feeder graph → GNN training | 🟡 Medium | Data augmentation: fault injection at every node variant |
| Multilingual complaints | 🟡 Medium | multilingual-MiniLM supports 50+ languages incl. Hindi |
| Sensor deployment cost (real-world) | 🔴 High | Phased model: 3 priority sensors per feeder (head/mid/tail) |
| TerraShield time-scale mismatch | 🟡 Medium | Use TFR/ERT as slow-changing background risk score (weekly) |
| Live hardware demo risk | 🟡 Medium | Python serial mock fallback for Arduino simulation |

---

## SLIDE 6 — IMPACT & BENEFITS

### 📊 Operational Impact (Key Numbers)

| Metric | Before | After GridSentinel |
|---|---|---|
| Fault search time | 6–24 hours | **< 1 hour** |
| Inspection zone | 50–100 km | **3–5 km section** |
| Data sources used | 1–2 | **6+** |
| Outage prediction | ❌ Reactive | ✅ Predictive (TerraShield) |

---

### 🌱 Social Benefits
- ⚡ Faster power restoration for **schools, health centers, irrigation pumps**
- 🧑‍🌾 Prevents crop loss for farmers dependent on electric pump irrigation
- 💬 Gives rural consumers a voice via complaint integration

### 💰 Economic Benefits
- Reduces crew patrol cost (currently ₹500–₹2000/km/inspection)
- Addresses **₹1,500–₹4,000 crore/year** rural economic loss from outages
- Proactive maintenance → fewer emergency replacements

### ♻️ Environmental Benefits
- Fewer diesel generator hours during outages (less emissions)
- Extended infrastructure life via early corrosion detection

---

### 🏆 SDG Alignment

| SDG | How |
|---|---|
| **SDG 7** — Affordable & Clean Energy | Reliable rural electricity access |
| **SDG 9** — Innovation & Infrastructure | Smart grid AI for underserved areas |
| **SDG 11** — Sustainable Communities | Resilient power for rural villages |
| **SDG 13** — Climate Action | Reduces diesel backup + infrastructure waste |

---

### 📚 Key References (for footnote)
- IEEE PES Test Feeders: https://cmte.ieee.org/pes-testfeeders/
- pandapower: https://www.pandapower.org/
- SHAP (NeurIPS 2017): https://arxiv.org/abs/1705.07874
- Open-Meteo API: https://open-meteo.com/
- MoP RDSS Scheme 2021 | CERC Smart Grid Vision 2030

---

*PS-B13 | INNOVATE 4 IMPACT: AI4SDG Global Hackathon 2026*
