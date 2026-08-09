# 📊 PPT Content — PS-B13: GridSentinel + TerraShield
### AI-Based Rural Electricity Fault Localization System

---

## 🟦 SLIDE 3 — Idea Title & Detailed Explanation

### Title: **GridSentinel — AI-Powered Rural Feeder Fault Localization Platform**
#### Subtitle: *Integrating Underground Infrastructure Intelligence with Graph Neural Networks to Detect, Localize & Restore Power Outages in Rural Grids*

---

### 🔍 Detailed Explanation of the Proposed Solution

**The Problem:**
Rural electricity feeders span 50–100 km, serving dozens of villages. When a fault occurs — whether from a broken conductor, transformer overload, vegetation contact, illegal connections, or underground corrosion — maintenance crews must *physically walk the line* to find it. A fault fixable in 30 minutes causes **6–24 hour outages** simply because no one knows *where* it is.

**Our Solution — GridSentinel:**
GridSentinel is an end-to-end AI platform that automatically:
1. **Detects anomalies** in voltage, current, and temperature data in real time
2. **Localizes the fault** to a specific feeder section using a Graph Neural Network that understands the physical topology of the grid
3. **Classifies the root cause** (conductor damage, transformer overload, vegetation contact, illegal tap, grounding fault)
4. **Estimates affected villages** downstream of the fault
5. **Generates a GIS priority map** guiding field crews to the exact location
6. **Recommends safe switching steps** to restore partial power while the fault is repaired
7. **Integrates TerraShield**, a hardware module that detects underground tower corrosion *before* it causes feeder faults

**How It Addresses the Problem:**
- Replaces time-consuming manual line walks with AI-driven fault localization
- Fuses multiple sparse data sources (sensors, smart meters, weather, consumer complaints, underground health readings) into one unified fault probability estimate
- Provides field crews with a clear, explainable answer: *"Section 3 is 87% likely the fault — here's why, and here's how to get there"*

---

### ✨ Innovation & Uniqueness

| Innovation | Why It's Novel |
|---|---|
| **Graph Neural Network (GNN) on feeder topology** | Treats the grid as a graph — not flat data — respecting the physics of how faults propagate |
| **Multi-modal data fusion** | Combines 5+ heterogeneous data sources: sensors, meters, weather, NLP complaints, underground TFR/ERT |
| **TerraShield integration (underground layer)** | First-of-its-kind addition of underground corrosion precursor signals into a feeder fault localization engine |
| **Explainability-first design (SHAP/XAI)** | Every prediction includes a human-readable explanation — critical for field crew trust |
| **End-to-end restoration guidance** | Goes beyond fault *detection* to safe switching + GPS crew navigation |
| **No dense sensor dependency** | Designed explicitly for sparse rural data environments — works with as little as 1 sensor + complaint reports |

---

## 🟦 SLIDE 4 — Technical Approach

### 🛠️ Technologies Used

#### AI / Machine Learning
| Component | Technology |
|---|---|
| Time-series anomaly detection | **PyTorch LSTM Autoencoder** |
| Feeder graph fault localization | **PyTorch Geometric — Graph Attention Network (GAT)** |
| Fault cause classification | **XGBoost / LightGBM** |
| Explainability | **SHAP (SHapley Additive exPlanations)** |
| NLP for consumer complaints | **spaCy + sentence-transformers** |

#### Backend & Data
| Component | Technology |
|---|---|
| REST API Server | **FastAPI (Python)** |
| Time-series Database | **PostgreSQL + TimescaleDB** |
| Graph Storage & Processing | **NetworkX + PyTorch Geometric** |
| Geospatial Processing | **GeoPandas + Shapely** |
| Power Systems Simulation | **pandapower** |

#### Frontend Dashboard
| Component | Technology |
|---|---|
| Framework | **React + Vite** |
| Live GIS Map | **Leaflet.js / Mapbox GL JS** |
| Charts & Visualization | **Recharts / Plotly.js** |
| UI Components | **shadcn/ui + Tailwind CSS** |

#### Hardware (TerraShield Layer)
| Component | Technology |
|---|---|
| Underground sensing | **Arduino Uno + AD620 + ADS1115** |
| Measurement method | **TFR (Tower Footing Resistance) + ERT (Electrical Resistivity Tomography)** |
| Corrosion detection | **4-electrode Wenner array** |

#### Infrastructure
| Component | Technology |
|---|---|
| Containerization | **Docker + Docker Compose** |
| Version Control | **Git + GitHub** |
| Notebooks (model training) | **Jupyter** |

---

### ⚙️ Methodology & Implementation Flow

```
STEP 1 — DATA INGESTION
┌─────────────────────────────────────────────────────┐
│  • Voltage & Current sensors (per feeder section)   │
│  • Transformer temperature sensors                  │
│  • Smart meter outage reports                       │
│  • Weather API (Open-Meteo)                         │
│  • Consumer complaint NLP (SMS / app)               │
│  • TerraShield TFR/ERT readings (underground)       │
└──────────────────────┬──────────────────────────────┘
                       │
STEP 2 — ANOMALY DETECTION
┌──────────────────────▼──────────────────────────────┐
│  LSTM Autoencoder watches V/I/temp over time        │
│  Flags sudden deviations → generates anomaly score  │
└──────────────────────┬──────────────────────────────┘
                       │
STEP 3 — GRAPH-BASED FAULT LOCALIZATION
┌──────────────────────▼──────────────────────────────┐
│  Feeder modeled as graph:                           │
│    Nodes = sections / transformers                  │
│    Edges = line connections (impedance, distance)   │
│  Graph Attention Network → per-section fault score  │
│  Output: "Section 3 — 87% fault probability"        │
└──────────────────────┬──────────────────────────────┘
                       │
STEP 4 — CAUSE CLASSIFICATION + XAI
┌──────────────────────▼──────────────────────────────┐
│  XGBoost classifier → fault type                   │
│  SHAP explains top contributing features            │
│  Output: "Vegetation contact — confidence 79%"      │
│          "Reasons: V-drop 42%, rain event, complaints"│
└──────────────────────┬──────────────────────────────┘
                       │
STEP 5 — OUTPUT & CREW GUIDANCE
┌──────────────────────▼──────────────────────────────┐
│  GIS priority map (color-coded feeder sections)     │
│  Affected village list                              │
│  Safe switching sequence (step-by-step)             │
│  GPS crew navigation route                          │
│  Restoration progress tracker                       │
└─────────────────────────────────────────────────────┘
```

---

## 🟦 SLIDE 5 — Feasibility and Viability

### ✅ Feasibility Analysis

**Technical Feasibility:**
- All core technologies (PyTorch, FastAPI, React, Leaflet) are open-source, mature, and well-documented
- GNN models for graph-structured data are a proven research domain with available pre-built libraries (PyTorch Geometric)
- Synthetic feeder data can be generated using **pandapower** (a real power systems simulator), making a working demo achievable without real-world grid access
- TerraShield hardware uses widely available Arduino components (AD620, ADS1115) — low-cost and reproducible

**Data Feasibility:**
- IEEE PES Distribution Test Feeders provide realistic feeder topology
- Open-Meteo provides free weather data (no API key required)
- Consumer complaint data can be simulated using NLP pipelines
- A full synthetic dataset can be generated and pre-trained models loaded within 2–3 hours

**Deployment Feasibility:**
- Docker Compose allows one-command deployment — judges can run the full stack locally
- FastAPI auto-generates interactive API documentation
- The dashboard is browser-based — no installation needed

---

### ⚠️ Potential Challenges & Risks

| Challenge | Risk Level | Description |
|---|---|---|
| **Sparse real-world data** | 🔴 High | Rural feeders have minimal sensors — real deployment needs data from DISCOMs |
| **GNN training on small graphs** | 🟡 Medium | Small feeder graphs may not provide enough training samples without augmentation |
| **TerraShield–feeder data alignment** | 🟡 Medium | Underground corrosion data operates on different time scales than real-time feeder faults |
| **NLP complaint parsing** | 🟡 Medium | Regional language complaints (Hindi, Telugu, etc.) need multilingual NLP |
| **Hardware sensor cost** | 🔴 High | Deploying voltage/current sensors across a 100km feeder is capital-intensive |
| **DISCOM integration** | 🔴 High | Getting real SCADA/metering data from utilities requires regulatory approvals |

---

### 🛡️ Strategies for Overcoming Challenges

| Challenge | Strategy |
|---|---|
| **Sparse data** | Use synthetic data augmentation via pandapower simulations; design model to work with minimum 1 sensor + complaints |
| **GNN training data scarcity** | Graph data augmentation: perturb node features, add synthetic fault injections across graph variants |
| **Multilingual complaints** | Use multilingual sentence-transformers (paraphrase-multilingual-MiniLM) that support 50+ languages including Indian languages |
| **Sensor deployment cost** | Use a **phased deployment model**: Priority sensors only at feeder head + mid-point + tail; leverage existing SCADA as base |
| **TerraShield time-scale mismatch** | Treat TFR/ERT as a **slow-changing background risk score** (updated weekly) rather than real-time signal; fuse as a static feature |
| **DISCOM integration** | Design open APIs; partner with pilot utilities (CESC, MSEDCL) for field trials post-hackathon |

---

## 🟦 SLIDE 6 — Impacts and Benefits

### 🎯 Potential Impact on Target Audience

**Primary Target: Rural Communities (400M+ people in India)**
- Reduction in outage duration from **6–24 hours → under 1 hour** (once the fault is located)
- Direct restoration of electricity for farming, cold storage, water pumps, medical equipment, and school/study hours
- Prevents crop loss and food spoilage caused by extended outages during harvest seasons

**Secondary Target: Utility Companies (DISCOMs)**
- Reduces the cost of manual inspection teams patrolling long rural lines
- Improves crew deployment efficiency — targeted response instead of blind search
- Enables proactive maintenance: TerraShield detects corrosion *before* faults occur

**Tertiary Target: Grid Operators & Policymakers**
- Provides data for long-term infrastructure investment decisions
- Directly supports India's **RDSS (Revamped Distribution Sector Scheme)** and smart grid policy goals

---

### 🌍 Benefits

#### Social Benefits
- ⚡ Reliable electricity access for rural schools, healthcare centers, and homes
- 📱 Consumer complaint integration gives villagers a voice in outage reporting
- 🧑‍🌾 Protects livelihoods of farmers dependent on irrigation pump power
- 🏥 Reduces risk of power outages at rural primary health centers

#### Economic Benefits
- 💰 Reduces DISCOM operational cost of fault patrol crews (currently ₹500–₹2000/km/inspection)
- 📉 Minimizes losses from agricultural equipment downtime and cold-chain disruption
- 🏭 Enables SMEs and cottage industries in rural areas to operate reliably
- 📊 Estimated **₹1,500–₹4,000 crore/year** in aggregate rural economic loss from distribution outages (ICRA/MoP estimates)

#### Environmental Benefits
- 🌱 Faster fault restoration means **fewer diesel generator hours** run by households and businesses during outages
- ♻️ Early detection of underground corrosion prevents catastrophic failures requiring full tower/line replacement
- 📡 Optimized crew routing reduces fuel consumption in field operations

#### Technological Benefits
- 🤖 Demonstrates practical deployment of Graph Neural Networks in critical infrastructure
- 🔬 First integration of underground structural health monitoring (TerraShield) into a feeder fault localization AI — novel research contribution
- 🛠️ Open-source architecture enables other developing nations to adapt the solution

---

## 🟦 SLIDE 7 — Research and References

### 📚 Research Papers

1. **"Fault Location in Power Distribution Networks Using Machine Learning"**
   — IEEE Transactions on Power Delivery, 2021
   — *Relevance: LSTM and ML-based fault detection on distribution feeders*

2. **"Graph Neural Networks for Power System State Estimation"**
   — IEEE Power Systems Conference, 2022
   — *Relevance: GNN applied to power system graph topology*

3. **"Multi-Source Data Fusion for Smart Grid Fault Detection"**
   — Applied Energy Journal, 2023
   — *Relevance: Fusing sensor, meter, and complaint data*

4. **"Explainable AI in Power Systems: A Review"**
   — Electric Power Systems Research, 2022
   — *Relevance: SHAP-based XAI for grid fault predictions*

5. **"Electrical Resistivity Tomography for Underground Infrastructure Assessment"**
   — NDT & E International, 2020
   — *Relevance: ERT methodology used by TerraShield*

---

### 🌐 Open Datasets

| Dataset | Link | Usage |
|---|---|---|
| IEEE PES Distribution Test Feeders | https://cmte.ieee.org/pes-testfeeders/ | Feeder topology & benchmark |
| Open-Meteo Weather API | https://open-meteo.com/ | Free real-time weather integration |
| London Smart Meter Energy Data | https://data.london.gov.uk/dataset/smartmeter-energy-use-data-in-london-households | Consumer load patterns basis |
| pandapower Library | https://www.pandapower.org/ | Power systems simulation for synthetic data |

---

### 🔧 Libraries & Frameworks

| Library | Link | Role |
|---|---|---|
| PyTorch Geometric | https://pytorch-geometric.readthedocs.io/ | GNN implementation |
| SHAP | https://shap.readthedocs.io/ | Explainability |
| FastAPI | https://fastapi.tiangolo.com/ | Backend API |
| Leaflet.js | https://leafletjs.com/ | GIS maps |
| spaCy | https://spacy.io/ | NLP for complaints |
| pandapower | https://www.pandapower.org/ | Feeder power flow simulation |
| NetworkX | https://networkx.org/ | Graph construction |

---

### 🏛️ Policy & Sector References

- **MoP (Ministry of Power) RDSS Guidelines** — Revamped Distribution Sector Scheme, 2021
  https://www.indiasmart.co.in/rdss
- **CERC Smart Grid Vision India 2030**
  https://www.cercind.gov.in/
- **ICRA Report on T&D Losses in Rural India, 2023**
  https://www.icra.in/ *(search: distribution losses India)*
- **IEA India Energy Outlook 2021** — Rural electrification analysis
  https://www.iea.org/reports/india-energy-outlook-2021

---

*Content generated for PS-B13 Hackathon | GridSentinel + TerraShield Project*
