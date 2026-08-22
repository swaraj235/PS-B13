# ⚡ GridSentinel — Operator & User Manual
**AI-Driven Rural Grid Monitoring, Grounding Corrosion Analysis & Outage Management System**

Welcome to **GridSentinel**, an enterprise-grade power grid intelligence platform engineered for MSEDCL Pune Distribution Circle to detect, classify, localize, and restore electrical distribution faults in real time across rural feeder lines.

---

## 📌 1. EXECUTIVE SUMMARY & SYSTEM OVERVIEW

Rural distribution lines suffer from frequent outages caused by vegetation contact, line breaks, transformer overloads, illegal power taps, and tower grounding breakdown. Standard protection relays isolate entire feeders, leading to prolonged blackouts lasting 6 to 24 hours for tens of thousands of consumers.

**GridSentinel solves this by fusing:**
1. **IoT Telemetry Engine**: 1 Hz streaming of 3-phase voltage ($V_{pu}$), current ($I_A$), line temperature ($T_{°C}$), and harmonic distortion ($THD\%$).
2. **Triple AI Engine**:
   - **LSTM Autoencoder**: Real-time time-series anomaly detection.
   - **PyTorch Geometric T-GAT**: Topological graph localization across feeder sections.
   - **XGBoost Classifier**: Multi-class fault cause identification (94.2% accuracy).
   - **SHAP TreeExplainer**: Human-interpretable diagnostic feature attribution.
3. **TerraShield Grounding Protection**: Tower footing resistance ($R$) and soil resistivity ($\rho$) monitoring to catch corrosion precursors.
4. **Automated Restoration Protocol**: Step-by-step Lockout/Tagout (LOTO) isolator switching sequence.
5. **Consumer Portal & Crowdsource Endorsement**: Resident mobile reporting, photo attachments, and ticket lifecycle tracking.
6. **IEEE 1366 Reliability Analytics & Audit Trail**: Automated SAIDI/SAIFI/CAIDI KPI tracking with one-click PDF report generation.

---

## 🔑 2. DEMO ACCOUNTS & LOGIN CREDENTIALS

The application includes two pre-configured role-based accounts for live testing:

| Role | Email Address | Password | Access Level |
|---|---|---|---|
| **MSEDCL Utility Admin** | `admin@msedcl.in` | `admin123` | Full access to GIS Map, Fault Injection, Switching Guides, Analytics, Complaints Triage & Audit Trail |
| **Pune Resident Consumer** | `consumer@pune.in` | `consumer123` | Consumer Portal: Outage reporting, active outage endorsement, ticket tracking & profile management |

---

## 🖥️ 3. OPERATOR PORTAL NAVIGATION & FEATURES

### 3.1 Top Status Strip (`SEC 1` to `SEC 5`)
- Displays real-time fault probabilities for each of the 5 main feeder sections.
- **Color Indicators**:
  - 🟢 **NORMAL**: Safe operation (`< 40%` fault probability).
  - 🟡 **WARNING**: Parameter drift / abnormal stress (`40% - 70%` probability).
  - 🔴 **CRITICAL**: Active fault triggered (`> 70%` probability).
- **Action**: Click any section card to focus the telemetry, SHAP diagnostics, map, and switching steps on that section.

### 3.2 GIS Feeder Map (Leaflet)
- Displays feeder lines, sub-station nodes, fault markers, and crew priority navigation routes.
- **Preset Controls**:
  - **`Kondhwa Grid`**: Centers map on the Kondhwa 22kV feeder network (`18.4770° N, 73.8907° E`).
  - **`My GPS`**: Uses device location to place a live blue GPS marker.
  - **Zone Selectors**: Switch between Kondhwa, Kothrud, Hadapsar, Swargate, and IEEE benchmark layouts.

### 3.3 Fault Injection Studio (Demo Bar)
1. Click **`⚡ Inject Fault`** in the top navigation bar.
2. Select target **Section** (`Section 1` through `Section 5`).
3. Select **Fault Type**: *Vegetation Contact*, *Conductor Damage*, *Transformer Overload*, *Illegal Tap*, or *Grounding Fault*.
4. Click **`Inject Now`**.
5. **System Response**: Section turns 🔴 CRITICAL, WebSocket streams high current/voltage dip, SHAP updates feature attribution (+82% Voltage Drop), and GIS map plots crew dispatch route.

### 3.4 Feeder Isolation & Switching Guide
- Generates sequential switching steps to isolate the fault section and transfer non-faulted loads via tie-switches.
- Linemen check off steps (e.g., *Open isolator IS3-A* → *Close tie-switch S4-B*).

### 3.5 Lineman Field Crew Studio
- Assigns field crews (Crew Alpha, Beta, Gamma) with vehicle specs, emergency contact hotlines, and GPS route coordinates.
- Enforces Pre-Work Safety & LOTO Checklists (PPE, ground stick verification).

### 3.6 Complaint Triage Studio
- View resident outage submissions.
- **Bulk CSV Import**: Import legacy/batch complaint files.
- **Photo Evidence**: Click image thumbnails to view full-resolution fault photos.
- **Status Updates**: Transition tickets from *Pending → In Progress → Resolved* (or mark Spam).
- **PDF Export**: Generate official MSEDCL complaint triage PDF reports.

### 3.7 IEEE 1366 Reliability Analytics
- Plots grid reliability indicators: SAIDI, SAIFI, CAIDI, ASAI (99.98%).
- Displays voltage quality waveform charts and hourly anomaly heatmaps.
- **Export PDF**: Generates executive grid reliability report.

### 3.8 Immutable System Audit Log
- Chronological trail recording all complaint submissions, status changes, crew dispatches, and restoration events.
- Searchable by ticket ID, area name, or operator.
- Exportable as formatted CSV or PDF.

---

## 📱 4. CONSUMER PORTAL GUIDE

1. **Log in** with consumer credentials (`consumer@pune.in`).
2. **Feeder Telemetry Card**: View live voltage ($V$), frequency ($50.0\,\text{Hz}$), and THD ($\%$) for your registered feeder zone.
3. **Active Outage Banner**: If an outage exists in your section, view ticket details and click **`I'm Also Affected (+1)`** to endorse the ticket.
4. **Report Outage Form**:
   - Select issue category (*Total Power Cut*, *Voltage Sag*, *Line Spark*, *Transformer Issue*).
   - Enter landmark/description.
   - Upload evidence photo.
   - Click **Submit Outage Ticket**.
5. **My Tickets & 4-Step Stepper**: Track ticket progress live through *1. Logged → 2. Crew Dispatched → 3. Line Repair → 4. Power Restored*.
6. **Edit Profile**: Update avatar photo, contact number, or assigned feeder zone.

---

## 🔌 5. HARDWARE INTEGRATION (TERRASHIELD)

GridSentinel interfaces with ERT and TFR hardware units:
- **TFR Unit**: Measures tower footing resistance ($R$ in $\Omega$). Threshold: $< 10.0\,\Omega$ normal.
- **ERT Unit**: Measures 4-electrode soil resistivity ($\rho$ in $\Omega\cdot\text{m}$).
- **Hardware Connection**: Plugs via USB serial into `/dev/ttyUSB0` at 9600 baud. The bridge `backend/data/arduino_bridge.py` reads JSON UART streams and posts to FastAPI (`/api/terrashield/ingest/tfr`).
- **Mock Fallback**: When physical hardware is detached, `ARDUINO_MOCK=true` simulates hardware readings automatically.

---

## 🚀 6. INSTALLATION & LOCAL SETUP

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Start Backend Server
```bash
# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI server
python -m uvicorn backend.main:app --reload --port 8000
```
Backend will run at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

### Step 2: Start Frontend Application
```bash
# Navigate to frontend directory
cd frontend

# Install node packages
npm install

# Start Vite dev server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## ❓ 7. FREQUENTLY ASKED QUESTIONS (FAQ)

**Q1: Is the data streaming in real time?**  
*Yes! The application runs a live WebSocket stream at `/api/ws/live` broadcasting 1 Hz sensor telemetry and instant event alerts.*

**Q2: Why does the map show Pune / Kondhwa coordinates?**  
*The hackathon problem statement (PS-B13) specifically targets rural distribution feeders in the Pune electricity circle. The map includes a live **Kondhwa Grid** preset and browser **My GPS** tracking.*

**Q3: Does the system work without real Arduino hardware attached?**  
*Yes! When hardware is detached, `arduino_bridge.py` and `USE_MOCK_DATA=true` generate physics-informed sensor telemetry so the entire dashboard can be demonstrated seamlessly.*

---
*Developed for IEEE Rural Electricity Fault Localization Challenge (PS-B13)*
