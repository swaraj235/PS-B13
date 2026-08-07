# 🔌 PS-B13 Deep Dive: AI-Based Rural Electricity Fault Localization
### + TerraShield Hybrid Integration Strategy

---

## 📖 Part 1: Understanding the Problem From Scratch

### What is a Rural Electricity Feeder?

Think of electricity delivery like a river system:
- **Substation** = the source (like a dam)
- **Feeder** = the main river channel carrying electricity from the substation into rural areas
- **Distribution lines** = smaller tributaries branching off to individual villages
- **Transformers** = waterfalls that step voltage down so homes can safely use the electricity
- **Consumers (homes/farms)** = the final destination

```
SUBSTATION
    │
    ├─── FEEDER LINE (11kV / 33kV) ──────────────────────────────►
    │         │              │              │              │
    │       SECTION 1     SECTION 2     SECTION 3     SECTION 4
    │         │              │              │              │
    │      [Transformer]  [Transformer]  [Transformer]  [Transformer]
    │         │              │              │              │
    │     Village A       Village B     Village C      Village D
```

### What is a "Fault"?

A fault is any abnormal condition that interrupts the flow of electricity. In rural feeders, this could be:

| Fault Type | What Happens | Analogy |
|---|---|---|
| **Conductor Damage** | The wire physically breaks or sags | A pipe bursting in a water system |
| **Transformer Overload** | Too much current, the transformer heats up and fails | A pump overheating from too much demand |
| **Vegetation Contact** | A tree branch touches a live wire | A short circuit |
| **Illegal Connections** | Unauthorized tapping drains power unevenly | Someone stealing water from a pipe |
| **Severe Weather** | Wind/rain damages infrastructure | Storm breaking pipes |

### Why is Fault Localization So Hard in Rural Areas?

1. **Feeders are LONG** — Rural feeders can span **50–100 km**, covering dozens of villages
2. **Sparse monitoring** — Urban areas have sensors every few hundred meters; rural feeders may have zero mid-point sensors
3. **Manual inspection** — Maintenance crews physically walk or drive along the line looking for the fault — like finding a single broken link in a 100km chain
4. **No real-time data** — Most rural meters are not "smart" — they don't report outages automatically
5. **Weather + terrain** — Crews work in difficult conditions, often at night, in forests or farmland

**The Result:** A fault that could be fixed in 30 minutes (once found) ends up causing **6–24 hour outages** simply because nobody knows *where* the fault is.

---

## 🎯 Part 2: What PS-B13 Specifically Asks For

The hackathon wants you to build a **smart platform** that does the following automatically:

```
INPUT DATA                    AI BRAIN                    OUTPUT / ACTION
─────────────                 ────────                    ───────────────
• Current/Voltage sensors  ──►                        ──► Which feeder SECTION has the fault?
• Transformer temperature  ──► ML + Graph Models      ──► Which villages are affected?
• Smart meter readings     ──►                        ──► Where should crews go FIRST?
• Weather data             ──►
• Consumer complaints      ──► Explainability Layer   ──► WHY does the system think so?
• Feeder map (topology)    ──►                        ──► What's the confidence level?
                                                      ──► Safe switching guidance
                                                      ──► GIS map with priority zones
```

### The 10 Expected Features Unpacked

| # | Feature | What it Means in Plain English |
|---|---|---|
| 1 | **Time-series anomaly detection** | Watch voltage/current over time; flag sudden drops or spikes |
| 2 | **Feeder-graph analysis** | Model the feeder as a graph (nodes = transformers/poles, edges = wires); propagate fault probability through the graph |
| 3 | **Fault-section probability scores** | "Section 3 is 87% likely to have the fault" |
| 4 | **Probable-cause classification** | "This looks like a vegetation contact fault" vs "transformer overload" |
| 5 | **Affected-village estimation** | Show which villages downstream of the fault are now dark |
| 6 | **GIS priority maps** | A map showing where crews should go, color-coded by priority |
| 7 | **Safe switching recommendations** | Tell the operator: "Open switch S4 to isolate the fault and restore power to Village B and C" |
| 8 | **Crew navigation** | GPS-guided route to the highest-priority inspection point |
| 9 | **Consumer-report integration** | "12 consumers in Village C have called to report outage" → fuse with sensor data |
| 10 | **Restoration tracking + model confidence** | Log restoration progress; show "why" the AI predicted this (explainability) |

---

## 🔬 Part 3: Current State & Research Gaps

### What Already Exists (State of the Art)

| Technology | Where It's Used | Limitation |
|---|---|---|
| SCADA systems | Urban/industrial grids | Too expensive for rural deployment |
| Impedance-based fault locators | High-voltage transmission | Not accurate for distribution feeders |
| FTU (Feeder Terminal Units) | Modern smart grids | Requires dense sensor deployment |
| Rule-based outage management | Utilities in developed nations | No AI; can't handle uncertainty |
| ML-based fault detection (papers) | Research labs | Not deployed at feeder-graph level in rural India/developing nations |

### 🔍 Key Research Gaps (This is your innovation space!)

> [!IMPORTANT]
> These gaps are what make your hackathon submission novel and competitive.

1. **Gap 1 — Sparse Data Fusion**
   - Most ML fault detection assumes dense sensor data. Rural India has almost *zero* mid-feeder sensors.
   - **Your innovation:** Fusing *heterogeneous sparse signals* (1 voltage sensor + weather API + 5 consumer SMS complaints) into a unified fault probability estimate.

2. **Gap 2 — Graph Neural Networks for Feeder Topology**
   - Feeders are *graphs*, not flat data tables. Traditional ML ignores the topology.
   - **Your innovation:** Using a **Graph Neural Network (GNN)** or graph-based belief propagation to model how faults propagate along the feeder network.

3. **Gap 3 — Explainability for Field Crews**
   - A "black box" prediction is useless for a lineman in the field. They need: *"Why does the system say Section 3?"*
   - **Your innovation:** SHAP/LIME-based explanations attached to every prediction.

4. **Gap 4 — Multi-modal Consumer Complaint Integration**
   - Complaint data (phone calls, SMS, app reports) is almost never fused with electrical sensor data.
   - **Your innovation:** NLP-based complaint processing + geographic clustering mapped onto feeder topology.

5. **Gap 5 — Underground Infrastructure Fault Detection** *(← This is where TerraShield fits!)*
   - Existing fault localization ignores underground degradation (tower grounding failure, conductor corrosion) as a *root cause* of feeder faults.
   - **Your innovation:** TerraShield's TFR/ERT signals as a **precursor feature** feeding into the fault localization model.

6. **Gap 6 — Integrated Restoration Guidance**
   - Most systems stop at fault *detection*. Nobody builds in *safe switching* and *crew navigation*.
   - **Your innovation:** Post-fault restoration planner as part of the same platform.

---

## 🔗 Part 4: TerraShield → How Does It Fit?

### TerraShield Recap (What Your Friend Built)

TerraShield detects underground corrosion of transmission tower legs using:
- **TFR** (Tower Footing Resistance) — measures if grounding resistance is abnormally high → sign of corrosion
- **ERT** (Electrical Resistivity Tomography) — maps soil resistivity around tower base → identifies where corrosion is happening
- **GPR** (simulated) — for precise corrosion localization
- Hardware: Arduino + AD620 + ADS1115 + electrodes

### The Connection to PS-B13

```
UNDERGROUND DEGRADATION LAYER (TerraShield)
         │
         │  Tower leg corrosion → Increased grounding resistance
         │  → Ground faults become more likely
         │  → Unusual current leakage patterns on the feeder
         ▼
FEEDER-LEVEL ANOMALY DETECTION (PS-B13 Core)
         │
         │  Voltage/current sensors detect anomalies
         │  GNN localizes the fault section
         │  Cause classifier says: "probable grounding fault"
         ▼
RESTORATION & CREW GUIDANCE (PS-B13 Output)
```

**TerraShield is a "root cause" detector that feeds into the PS-B13 fault localization engine.**

### Hybrid Integration Model: "TerraShield + GridSentinel"

> [!NOTE]
> Proposed combined system name: **GridSentinel** (the PS-B13 platform) with **TerraShield** as its underground health monitoring module.

```
┌─────────────────────────────────────────────────────────┐
│                    GRIDSENTINEL PLATFORM                 │
│                                                         │
│  ┌───────────────┐    ┌──────────────────────────────┐  │
│  │  TERRASHIELD  │    │     FEEDER MONITORING LAYER  │  │
│  │  (Underground)│    │                              │  │
│  │               │    │  • Voltage/Current sensors   │  │
│  │  TFR readings │───►│  • Smart meter interruptions │  │
│  │  ERT profiles │    │  • Transformer temperatures  │  │
│  │  Corrosion    │    │  • Weather API               │  │
│  │  risk scores  │    │  • Consumer complaints       │  │
│  └───────────────┘    └──────────────┬───────────────┘  │
│                                      │                  │
│                                      ▼                  │
│                         ┌────────────────────┐          │
│                         │  AI FUSION ENGINE  │          │
│                         │                   │          │
│                         │  • Time-series     │          │
│                         │    anomaly (LSTM)  │          │
│                         │  • Graph Neural    │          │
│                         │    Network (GNN)   │          │
│                         │  • Fault classifier│          │
│                         │  • XAI (SHAP)     │          │
│                         └────────┬───────────┘          │
│                                  │                      │
│                    ┌─────────────┼─────────────┐        │
│                    ▼             ▼             ▼        │
│             Fault Section  Affected       GIS Map       │
│             Probability    Villages       + Crew Nav    │
│             + Cause        Estimation     + Switching   │
│             Classification                Guidance      │
└─────────────────────────────────────────────────────────┘
```

### Is TerraShield Directly Relevant to PS-B13?

| Aspect | Alignment |
|---|---|
| Problem domain | ⚠️ Partial — PS-B13 is about *feeder-level* faults (overheads, transformers); TerraShield targets *underground tower* corrosion which is more relevant to *transmission* (high voltage) than *distribution* (rural feeders) |
| Fault detection concept | ✅ Strong — Both detect faults before they cause outages |
| Data types | ⚠️ Different — TerraShield uses TFR/ERT; PS-B13 uses V/I/temp/meters |
| Integration potential | ✅ High — TerraShield signals can be a *feature input* to the PS-B13 AI engine |
| Novelty value | ✅ High — Combining underground infrastructure health + feeder-level AI = unique angle |

> [!TIP]
> **Hackathon Strategy:** Present TerraShield as the "hardware sensing layer" for underground fault precursors, and GridSentinel as the AI platform that fuses *all* signals (including TerraShield's) to localize and classify faults. This makes your project uniquely multi-layered.

---

## 🏗️ Part 5: Full Implementation Plan

### Phase 1: Data Pipeline (Week 1)

```
SYNTHETIC DATA GENERATION
│
├── Feeder topology: Create a graph of 1 feeder with 5-10 sections
│   Each section: distance, line impedance, number of consumers
│
├── Sensor simulation:
│   ├── Normal operation: V ≈ 230V (±5%), I varies with load
│   ├── Fault injection: At section 3, V drops 40%, I spikes
│   └── Weather overlay: Rain events → vegetation contact faults
│
├── Smart meter data: 100 consumers, 80% normal, 20% interrupted
│
├── Consumer complaints: Synthetic SMS/app reports with village tags
│
└── TerraShield layer: Simulated TFR/ERT readings per tower
    ├── Normal: resistance < 10Ω
    └── Corroded: resistance 15-50Ω, resistivity anomaly
```

**Datasets to use:**
- [IEEE PES Distribution Test Feeders](https://cmte.ieee.org/pes-testfeeders/) — feeder topology
- [Open-Meteo API](https://open-meteo.com/) — free weather data
- [UKPN Smart Meter Data](https://data.london.gov.uk/dataset/smartmeter-energy-use-data-in-london-households) — synthetic basis

### Phase 2: AI Models (Week 2)

#### 2a. Time-Series Anomaly Detection
```python
# Model: LSTM Autoencoder
# Input: [V, I, temp] readings for past 1 hour (60 timesteps)
# Output: Reconstruction error → anomaly score
# Threshold: > 2σ from normal = anomaly
```

#### 2b. Feeder Graph Analysis + Fault Localization
```python
# Model: Graph Attention Network (GAT) or GraphSAGE
# Graph construction:
#   Nodes = sections/transformers (features: V, I, temp, smart meter loss %)
#   Edges = feeder connections (features: line impedance, distance)
# Output: Per-node fault probability score
```

#### 2c. Fault Cause Classification
```python
# Model: Random Forest or XGBoost
# Features: V_drop%, I_spike, temp, weather, time-of-day, TFR_delta
# Output: One of [conductor_damage, transformer_overload,
#                 vegetation_contact, illegal_tap, grounding_fault]
```

#### 2d. Explainability
```python
# Tool: SHAP (SHapley Additive exPlanations)
# Output: "Top 3 reasons: 1) Voltage drop at Section 3 (42%), 
#          2) 8 consumer complaints in Village C (31%), 
#          3) TFR anomaly at Tower T-47 (27%)"
```

### Phase 3: Backend API (Week 3)

```
FastAPI Backend
├── /api/fault/detect       → Trigger real-time fault analysis
├── /api/fault/localize     → Return section probabilities
├── /api/fault/classify     → Return probable causes
├── /api/villages/affected  → Return affected village list
├── /api/gis/map            → Return GeoJSON for map overlay
├── /api/switching/guide    → Return safe switching sequence
├── /api/terrashield/status → Return underground health scores
└── /api/explain            → Return SHAP explanations
```

### Phase 4: Frontend Dashboard (Week 4)

```
React Dashboard
├── Live Feeder Map (Leaflet.js / Mapbox)
│   ├── Feeder line with section coloring (green/yellow/red)
│   ├── Village markers with outage status
│   └── Crew navigation waypoints
│
├── Alert Panel
│   ├── Current fault probability scores per section
│   ├── Probable cause with confidence %
│   └── "Why?" button → SHAP explanation chart
│
├── Switching Guide
│   ├── Animated step-by-step switching sequence
│   └── Safety warnings
│
└── TerraShield Panel
    ├── Underground health heatmap
    └── Tower-by-tower corrosion risk score
```

---

## 🛠️ Part 6: Complete Tech Stack

### Core AI/ML
| Component | Technology | Why |
|---|---|---|
| Time-series anomaly | **PyTorch LSTM Autoencoder** | Best for sequential sensor data |
| Graph analysis | **PyTorch Geometric (GAT/GraphSAGE)** | Purpose-built for graph neural networks |
| Fault classifier | **XGBoost / LightGBM** | Fast, interpretable, handles tabular features well |
| Explainability | **SHAP** | Industry standard, works with all models |
| NLP (complaints) | **spaCy + sentence-transformers** | Lightweight NLP for complaint parsing |

### Data & Backend
| Component | Technology | Why |
|---|---|---|
| API server | **FastAPI (Python)** | Async, fast, auto-generates docs |
| Database | **PostgreSQL + TimescaleDB** | TimescaleDB is PostgreSQL extension for time-series data |
| Graph storage | **NetworkX** | Pure Python graph library for feeder topology |
| Streaming | **Apache Kafka** (optional) | Real-time sensor data ingestion |
| GIS | **GeoPandas + Shapely** | Geospatial operations in Python |

### Frontend
| Component | Technology | Why |
|---|---|---|
| Framework | **React + Vite** | Fast SPA development |
| Map | **Leaflet.js** (free) or **Mapbox GL JS** | Interactive GIS maps |
| Charts | **Recharts / Plotly.js** | Time-series and probability charts |
| UI Library | **shadcn/ui + Tailwind** | Modern, accessible components |
| State | **Zustand** | Lightweight state management |

### Simulation & Data
| Component | Technology | Why |
|---|---|---|
| Synthetic data gen | **Python + NumPy + Pandas** | Standard data science |
| Feeder simulation | **pandapower** (Python) | Actual power systems simulator! |
| Weather data | **Open-Meteo API** | Free, no key needed |
| TerraShield sim | **Python (Arduino serial mock)** | Simulate TFR/ERT readings |

### Infrastructure
| Component | Technology | Why |
|---|---|---|
| Containerization | **Docker + Docker Compose** | Easy deployment, judge-friendly |
| Notebooks | **Jupyter** | For model training and demos |
| Version control | **Git + GitHub** | Hackathon standard |

---

## ✅ Part 7: Feasibility Assessment

### Can You Build This in a Hackathon?

> [!IMPORTANT]
> Hackathon timeline assumed: 24–48 hours (sprint). Adjust scope accordingly.

#### 24-Hour Sprint — Minimum Viable Demo
- ✅ Synthetic feeder data generation
- ✅ LSTM anomaly detection (pre-trained offline)
- ✅ Simple GNN fault localization (2-3 sections)
- ✅ XGBoost fault classifier
- ✅ React dashboard with Leaflet map
- ✅ TerraShield panel (simulated readings)
- ✅ SHAP explanations

#### 48-Hour Sprint — Full Feature Set
- ✅ Everything above +
- ✅ Consumer complaint NLP integration
- ✅ Safe switching recommendation engine
- ✅ Crew navigation waypoints
- ✅ Restoration tracking
- ✅ Full Docker deployment

#### What Requires Pre-Hackathon Work
| Task | Time Needed | Priority |
|---|---|---|
| Pre-train LSTM on synthetic data | 2–3 hours | 🔴 High |
| Pre-train GNN on feeder graph | 2–3 hours | 🔴 High |
| Set up synthetic data pipeline | 1–2 hours | 🔴 High |
| Design feeder topology (JSON/GeoJSON) | 1 hour | 🔴 High |
| Bootstrap React + FastAPI project | 1 hour | 🟡 Medium |
| Integrate TerraShield simulation | 1 hour | 🟡 Medium |

---

## 🧠 Part 8: Unique Selling Points for the Hackathon

1. **Multi-modal fusion** — Combining 5+ data sources (sensors, weather, complaints, graph topology, underground health) is genuinely novel
2. **Graph-aware localization** — Using GNN instead of simple threshold rules respects the physical topology of feeders
3. **TerraShield integration** — Adding underground infrastructure health as a *precursor signal* is an idea that doesn't exist in current literature
4. **Explainability-first** — Every prediction comes with a human-readable explanation (critical for field crews who won't trust a black box)
5. **End-to-end pipeline** — From raw data ingestion to crew navigation in one platform
6. **Restoration guidance** — Most research stops at fault detection; you go all the way to *fixing* it

---

## 🗺️ Suggested Project Roadmap

```
Pre-Hackathon (Do NOW)
├── [x] Understand PS-B13 (this document ✓)
├── [ ] Generate synthetic feeder dataset
├── [ ] Pre-train LSTM anomaly model
├── [ ] Pre-train GNN localization model
├── [ ] Set up project repo structure
└── [ ] Design feeder topology (5 sections, 10 villages)

Hackathon Day 1
├── [ ] FastAPI backend skeleton
├── [ ] Connect pre-trained models to API
├── [ ] React dashboard shell + Leaflet map
├── [ ] Feeder visualization working
└── [ ] Fault injection demo working

Hackathon Day 2
├── [ ] SHAP explanations integrated
├── [ ] TerraShield panel
├── [ ] Consumer complaint panel
├── [ ] Switching guidance UI
├── [ ] Docker compose for easy demo
└── [ ] Demo video + presentation
```

---

## 💡 Final Recommendation

**Yes, integrate TerraShield — but position it correctly:**

- Don't present TerraShield as the *main* solution (it's focused on transmission towers, not rural distribution feeders)
- Present it as the **"Infrastructure Health Layer"** — a novel addition that detects underground root causes *before* they cause feeder faults
- This gives your project a unique hardware + AI + GIS multi-layer story that no other team will have

The combined narrative: *"GridSentinel doesn't just detect faults — it predicts them before they happen using underground corrosion intelligence from TerraShield, then localizes them using feeder graph AI, and guides crews to fix them — all in real time."*

---

*Document created: 2026-08-06 | PS-B13 Hackathon Brainstorm*
