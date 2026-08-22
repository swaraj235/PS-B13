# ⚡ GridSentinel — Real-World Deployment Architecture, Hardware Blueprint & System Evaluation

---

## 📌 Executive Summary

GridSentinel is an end-to-end AI-powered Smart Power Grid Monitoring, Grounding Corrosion Analysis (TerraShield), and Real-Time Fault Localization platform. This document outlines the physical hardware integration model, real-world deployment workflow, current system limitations, and an actionable roadmap for industrial deployment across electrical distribution networks (e.g., MSEDCL Pune Circle).

---

## 1. 🔌 Real-World Hardware & Laptop Connection Blueprint

### Physical Hardware Components
GridSentinel interfaces with two primary hardware units deployed at electrical transmission towers and distribution substations:

| Device Unit | Method / Sensor | Microcontroller & ADC | Physical Output | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **ERT Unit** *(Electrical Resistivity Tomography)* | 4-Electrode Wenner Array | Arduino Uno + AD620 Amp + ADS1115 16-bit ADC | Soil Resistivity $\rho$ ($\Omega\cdot\text{m}$) at 3 depths | Detects subsurface soil moisture, voids, & grounding corrosion |
| **TFR Unit** *(Tower Footing Resistance)* | 3-Electrode Fall-of-Potential | Arduino Uno + AD620 Amp + ADS1115 + I2C LCD | Grounding Resistance $R$ ($\Omega$) | Detects tower grounding rod degradation (<10$\Omega$ normal) |

```
   [Physical Tower & Grounding Rods]
                 │
       (Analog Signals V & I)
                 ▼
  [AD620 Amp + ADS1115 16-bit ADC]
                 │
       (I2C / Differential)
                 ▼
     [Arduino Microcontroller] ──► (Local 16x2 LCD Display)
                 │
  (JSON UART @ 9600 Baud via USB Serial)
                 │
                 ▼
    [Laptop / Substation Edge PC]
                 │
     (backend/data/arduino_bridge.py)
                 │
       (HTTP POST Ingestion)
                 ▼
   [FastAPI ML Inference Engine] ──► (PyTorch T-GAT + XGBoost)
                 │
       (WebSocket Stream)
                 ▼
   [React Leaflet Operator Dashboard]
```

### How the Laptop / Edge PC Connects to Hardware:
1. **Physical Cable**: Micro-USB or FTDI RS485-to-USB converter plugs into the laptop USB port (`/dev/ttyUSB0` for TFR, `/dev/ttyUSB1` for ERT).
2. **Serial Reader**: The Python script `backend/data/arduino_bridge.py` listens to `/dev/ttyUSB0` and `/dev/ttyUSB1` at 9600 baud.
3. **Data Ingestion**: As the Arduino sends raw JSON strings (e.g. `{"device":"TFR","tfr_ohm":8.52,"status":"HEALTHY"}`), the bridge validates physical bounds, adds UTC timestamps, and posts to FastAPI (`/api/terrashield/ingest/tfr`).
4. **Wireless 4G/LoRa Option**: In remote field locations, the USB serial cable is replaced by a SIM7600 4G modem sending MQTT telemetry packets directly to the FastAPI server.

---

## 2. 🔍 Comprehensive System Audit & Feature Verification

| Feature / Module | Implementation Status | Functional Verification | Notes |
| :--- | :--- | :--- | :--- |
| **Multi-Substation GIS Map** | `FeederMap.tsx` | ✅ PASSED | Real-time map switching between Kondhwa 22kV, Kothrud 11kV, Hadapsar 22kV, Swargate 11kV, and IEEE Benchmark |
| **AI Fault Diagnostics** | `SHAPChart.tsx` | ✅ PASSED | Explains exact root causes (e.g. Voltage dip, Current surge, Grounding degradation) with SHAP impact factors |
| **Restoration & Impact Guide** | `SwitchingGuide.tsx` | ✅ PASSED | Lists affected sub-areas, villages, consumer numbers, critical hospital loads, and isolator switching protocols |
| **Consumer Complaints Feed** | `ComplaintsFeed.tsx` | ✅ PASSED | Auto-maps consumer locations (e.g., Kondhwa ➔ Section 3), manages pending acknowledgement state |
| **Telemetry Charting** | `SensorTimeSeries.tsx` | ✅ PASSED | Live plotting of 3-phase Voltage ($V$), Current ($A$), Frequency ($f$), and Harmonic Distortion ($THD\%$) |
| **Hardware Ingestion Bridge** | `arduino_bridge.py` | ✅ PASSED | Validates physical electrical range bounds, supports both live UART hardware and mock fallback |

---

## 3. ⚠️ Current Drawbacks, Demerits & System Limitations

While GridSentinel features a production-grade architecture, the following technical limitations exist in the current setup:

1. **Synthetic Feeder Lines vs Real GIS Layers**:
   - *Issue*: The current feeder polylines follow standard IEEE 33-Bus benchmark geometries overlayed on Pune.
   - *Impact*: To show true street-level pole locations in Pune, official MSEDCL GeoJSON shapefiles are required.

2. **Single-Process FastAPI Bottleneck**:
   - *Issue*: The backend runs as a single Uvicorn process.
   - *Impact*: Handling 100,000+ smart meters simultaneously requires scaling to a distributed MQTT broker (e.g., EMQX / Apache Kafka) + Celery workers.

3. **9600 Baud USB Serial Limit**:
   - *Issue*: Standard Arduino UART at 9600 baud transmits ~1 packet/sec.
   - *Impact*: For high-frequency transient fault recording (TFR 1000 Hz waveform sampling), an ESP32 micro-controller with High-Speed USB / Wi-Fi is required.

4. **Static Offline ML Model File**:
   - *Issue*: The PyTorch T-GAT and XGBoost models are trained offline on static datasets.
   - *Impact*: The model does not continuously update its weights online as seasonal weather patterns change in Pune.

---

## 4. 🚀 Actionable Roadmap for Industrial Utility Deployment

To transition GridSentinel into a commercial utility product deployed across MSEDCL / Tata Power:

### Phase 1: Hardware & Communication Upgrade
- Replace Arduino Uno with **ESP32-S3** microcontrollers (dual-core 240MHz) featuring built-in Wi-Fi & 4G LTE modules.
- Upgrade communication protocol from HTTP REST to **MQTT over TLS**, allowing 5,000+ tower nodes to publish telemetry concurrently.

### Phase 2: MSEDCL GIS Shapefile Integration
- Request official MSEDCL distribution feeder GeoJSON datasets.
- Import exact sub-station transformer coordinates, 11kV feeder lines, and LT distribution boxes directly into Leaflet `Polyline` and `GeoJSON` layers.

### Phase 3: Automated Field Crew Dispatch
- Integrate SMS / WhatsApp Business API (Twilio / Gupshup) into `backend/api/fault.py`.
- When a critical fault occurs, automatically dispatch an SMS alert with exact GPS coordinates and isolator switching instructions directly to the nearest field line worker's mobile device.

---

*Document Generated for GridSentinel System Evaluation & Technical Review.*
