# ⚡ GridSentinel — Operator & User Manual
**AI-Driven Rural Grid Monitoring & Fault Isolation System (IEEE 33-Bus Feeder)**

Welcome to **GridSentinel**, an enterprise-grade power grid monitoring platform designed to detect, classify, localize, and restore electrical distribution faults in real time across rural feeder lines.

---

## 📌 1. Executive Summary & Problem Statement

Rural distribution lines suffer from frequent outages caused by vegetation contact, line breaks, transformer overloads, illegal power taps, and grounding breakdown. Standard protection relays isolate entire feeders, leading to prolonged blackouts for thousands of consumers.

**GridSentinel solves this by fusing:**
1. **IoT Sensor Telemetry**: High-frequency voltage (`pu`), current (`A`), line temperature (`°C`), and harmonic distortion (`THD%`).
2. **Triple AI Engine**:
   - **LSTM Autoencoder**: Real-time anomaly detection.
   - **XGBoost Classifier**: Multi-class fault identification with 94.2% accuracy.
   - **T-GAT (Temporal Graph Attention Network)**: Precise section localization across the 33-bus topology.
   - **SHAP (SHapley Additive exPlanations)**: Human-interpretable diagnostic reasons for grid operators.
3. **TerraShield Grounding Protection**: Real-time tower grounding resistance (`Ω`) monitoring to prevent soil degradation failures.
4. **Automated Restoration Protocol**: Interactive step-by-step isolator switching to re-route power and minimize downtime.

---

## 🖥️ 2. Navigation & Interface Overview

The GridSentinel interface is divided into 5 core visual zones on the **Operator Dashboard**:

### 1️⃣ Top Status Strip (`SEC 1` to `SEC 5`)
- Displays real-time fault probabilities for each of the 5 main feeder sections.
- **Color Codes**:
  - 🟢 **NORMAL**: Safe operation (`< 40%` probability).
  - 🟡 **WARNING**: Impending stress / parameter drift (`40% - 70%` probability).
  - 🔴 **CRITICAL**: Active fault isolation triggered (`> 70%` probability).
- **Action**: Click any section card to focus the entire dashboard (telemetry, AI diagnostic, map, and restoration steps) on that section.

### 2️⃣ Feeder Map (IEEE 33-Bus Topology)
- Visualizes feeder lines, sub-area lines, critical fault markers, and crew dispatch routes.
- **Controls**:
  - **`Kondhwa Grid` Button**: Instantly centers and zooms the map on the Kondhwa Substation feeder network (`18.4770° N, 73.8907° E`).
  - **`My GPS` Button**: Uses your device browser location to place a live blue GPS marker on the map.
  - **Interactive Feeder Lines**: Click any feeder line or fault pin to inspect telemetry.

### 3️⃣ Fault Alerts & Consumer Complaints
- **Fault Alerts**: Real-time alert feed pushed via WebSockets. Click any alert item to select that section.
- **Consumer Complaints**: Displays consumer reports from impacted villages. Click **`+ New`** to log a new field outage report.

### 4️⃣ Live Sensor Data & AI Analysis (Right Panel)
- **Live Telemetry Chart**: Real-time streaming voltage, current, and temperature history.
- **AI Diagnostics (SHAP Explanation)**: Shows exact root cause factors (e.g. `+82% Voltage Drop`, `+64% THD`, `+41% Temp Delta`).
- **Restoration Plan**: Interactive step-by-step switching protocol (e.g., Open isolator `IS1-A`, Transfer load via tie-switch `S4-B`, Close tie `S5-T`).

### 5️⃣ TerraShield — Tower Status (Bottom Panel)
- Monitors grounding resistance across distribution towers (`T1` through `T10`).
- Flags high grounding resistance (`> 10.0 Ω`) or neutral drift (`> 25.0 Ω`).

---

## 🧪 3. How to Demo & Test Fault Injection

You can simulate real-world grid faults in real time:

1. Click the **`⚡ Inject Fault`** dropdown in the top navigation bar.
2. Select a target **Section** (`Section 1` through `Section 5`).
3. Select a **Fault Type**:
   - `Vegetation Contact` (Overhead tree contact causing voltage dip and THD spike)
   - `Conductor Damage` (Line snapping or phase imbalance)
   - `Transformer Overload` (Excess load causing thermal breakdown)
   - `Illegal Tap` (Power theft causing harmonic drift)
   - `Grounding Fault` (High neutral resistance on grounding tower)
4. Click **`Inject Now`**.

**What happens immediately:**
- The chosen section turns **🔴 CRITICAL** with a red pulse.
- Telemetry streams high current spike and voltage drop via WebSockets.
- SHAP diagnostic analysis updates with root-cause indicators.
- Feeder map highlights the fault pin and plots an optimal **Crew Dispatch Route**.
- The **Restoration Plan** populates step-by-step isolation instructions.

---

## 🛠️ 4. How Operators Execute Section Restoration

When a critical fault occurs:

1. Click on the affected section card or alert.
2. Review the **AI Analysis** to understand the cause (e.g., Vegetation contact on Section 1).
3. Under **Restoration Plan**, follow the sequential steps:
   - **Step 1**: Click the step card to mark **`IS1-A Isolator Opened`**.
   - **Step 2**: Click the step card to mark **`Load Transferred via S4-B`**.
   - **Step 3**: Click the step card to mark **`Tie Switch Closed`**.
4. When all steps are checked, the banner will flash **`✓ All switching steps complete! Section ready for energization.`**
5. Click **`Reset`** or inject another test fault.

---

## 🚀 5. How to Run the Application Locally

### Backend (FastAPI + WebSockets + PyTorch Inference)
```bash
# Terminal 1
source .venv/bin/activate
python -m uvicorn backend.main:app --reload --port 8000
```

### Frontend (Vite + React + Tailwind + Leaflet)
```bash
# Terminal 2
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## ❓ 6. Frequently Asked Questions (FAQ)

**Q1: Is the data streaming in real time?**  
*Yes! The application runs a full WebSocket stream at `/api/ws/live` broadcasting 1Hz sensor telemetry and instant event alerts.*

**Q2: Why does the map show Pune / Kondhwa coordinates?**  
*The hackathon problem statement (PS-B13) specifically targets rural distribution feeders in the Pune electricity circle. The map includes a live **Kondhwa Grid** preset and browser **My GPS** tracking.*

**Q3: Where is the database?**  
*The backend currently runs on an in-memory real-time state streamer with structured dataset schemas. A production MySQL server can be connected by updating `DATABASE_URL` in `backend/.env`.*

---
*Developed for IEEE Rural Electricity Fault Localization Challenge (PS-B13)*
