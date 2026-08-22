# 🎬 GRIDSENTINEL — DEMO VIDEO SCRIPT & PRESENTATION GUIDE

**Target Duration**: 4 to 5 Minutes  
**Cast**: 4 Presenters (Speaker 1: Team Lead / Systems Overview, Speaker 2: Deep Learning Architect, Speaker 3: Backend & Hardware Lead, Speaker 4: Operations & UX Specialist)  

---

## 📌 DEEP LEARNING FOCUS HIGHLIGHTS (Read First!)
> **Why DL is the Heart of GridSentinel**:
> Hackathon judges often penalize projects that treat AI as a "black box dropdown". In this script and presentation:
> 1. **LSTM Autoencoder** handles continuous 1 Hz time-series anomaly detection (unsupervised baseline).
> 2. **T-GAT (Temporal Graph Attention Network)** models feeder topology (IEEE 33-bus graph) to pinpoint section location.
> 3. **XGBoost Classifier** evaluates 6 fault causes with 94.2% accuracy.
> 4. **SHAP (SHapley Additive exPlanations)** renders feature importance in < 14ms so engineers trust the predictions.

---

## 🎭 4-PERSON VIDEO RECORDING SCRIPT

### 🎬 SCENE 1: INTRODUCTION & PROBLEM STATEMENT (0:00 - 0:45)
**Visual**: Split screen showing Speaker 1 next to a slide of a rural Indian power line grid and MSEDCL logo.

- **Speaker 1 (Team Lead)**:
  > *"Hello everyone! We are Team GridSentinel, presenting our solution for Problem Statement PS-B13: AI-Based Rural Electricity Fault Localization.*
  > *In rural electricity circles like MSEDCL Pune, distribution feeders stretch across 50 to 100 kilometers with almost zero mid-line sensors. When a tree strikes a line or grounding degrades, protection relays trip the entire feeder at the substation—plunging tens of thousands of homes, hospitals, and irrigation pumps into dark blackouts lasting 6 to 24 hours.*
  > *Why? Because maintenance crews spend 70% of their time just driving along 50 kilometers of line trying to FIND the fault section. GridSentinel changes that forever."*

---

### 🎬 SCENE 2: SYSTEM ARCHITECTURE & DEMO SETUP (0:45 - 1:30)
**Visual**: Screen recording switches to the live **GridSentinel Operator Dashboard**.

- **Speaker 3 (Backend & Hardware Lead)**:
  > *"To solve this, we built GridSentinel—a full-stack platform powered by FastAPI, WebSockets, React, and an IoT hardware bridge.*
  > *On screen right now, you are looking at our live MSEDCL Operator Portal connected via WebSocket streaming 1 Hz telemetry across 5 feeder sections covering Kondhwa, Kothrud, Hadapsar, and Swargate.*
  > *Underneath the ground, our TerraShield module—prototyped with Arduino, an AD620 amplifier, and ADS1115 ADC—monitors Tower Footing Resistance ($R$) and soil resistivity ($\rho$). If a tower grounding rod corrodes past 10 ohms, TerraShield flags a pre-fault risk before an outage even occurs!"*

---

### 🎬 SCENE 3: DEEP LEARNING ENGINE IN ACTION (1:30 - 2:45) ⭐ [CORE FOCUS]
**Visual**: Camera zooms into **`⚡ Inject Fault`** dropdown → Selects `Section 3 (Kondhwa)` → `Vegetation Contact` → Clicks `Inject Now`. Section 3 pulses 🔴 CRITICAL. SHAP chart populates.

- **Speaker 2 (Deep Learning Architect)**:
  > *"Now, let's look at the heart of GridSentinel: our Triple Deep Learning Engine.*
  > *Watch what happens when I inject a 'Vegetation Contact' fault on Section 3.*
  > *First, our **LSTM Autoencoder** continuously analyzes 30-second sliding windows of voltage, current, temperature, and THD. The moment tree branches touch the 11kV conductor, reconstruction error spikes past our F1-tuned threshold of 3.5, instantly triggering an anomaly alert.*
  > *Second, because rural lines are interconnected graphs, we deployed a **Temporal Graph Attention Network (T-GAT)** using PyTorch Geometric. T-GAT passes message-embeddings across the IEEE 33-bus topology, pinpointing Section 3 as the exact fault origin with high confidence.*
  > *Third, our **XGBoost Classifier**—trained on 15,000+ fault events—classifies the root cause as 'Vegetation Contact' with 94.2% accuracy.*
  > *Finally, operators hate black-box AI. That's why we integrated **SHAP TreeExplainer**. Right here in the UI, SHAP proves WHY the model made this call: showing a +82% contribution from Voltage Dip and +64% from Total Harmonic Distortion."*

---

### 🎬 SCENE 4: RESTORATION, CREW DISPATCH & CONSUMER PORTAL (2:45 - 3:45)
**Visual**: Screen switches to **Feeder Isolation Switching Guide** → clicks isolation steps → switches to **Lineman Operations Studio** → then opens **Consumer Portal**.

- **Speaker 4 (Operations & UX Specialist)**:
  > *"Finding the fault is only half the battle; restoring power is the goal.*
  > *GridSentinel instantly generates a step-by-step Feeder Isolation Switching Guide. Linemen follow Lockout/Tagout protocols—opening isolator IS3-A and closing tie-switch S4-B to re-route power to unaffected villages in under 5 minutes.*
  > *On our Lineman Studio, field crews access pre-work LOTO safety checklists and turn-by-turn GPS navigation straight to the substation.*
  > *Simultaneously, let's flip to our **Consumer Portal**. Pune residents receive active outage notifications. Instead of calling clogged helpdesks, residents can click 'I'm Also Affected (+1)' to crowdsource outage impact. When the crew completes repair, the 4-step progress stepper updates live to 'Restored'!"*

---

### 🎬 SCENE 5: IEEE 1366 ANALYTICS & AUDIT TRAIL (3:45 - 4:30)
**Visual**: Navigates to **Analytics Page** (showing SAIDI/SAIFI KPIs) → Clicks **Export PDF** → Navigates to **Immutable Audit Log**.

- **Speaker 1 (Team Lead)**:
  > *"For utility executive management, GridSentinel automatically computes standard **IEEE 1366 Grid Reliability KPIs**—including SAIDI, SAIFI, CAIDI, and ASAI—generating audit-ready PDF reports with a single click.*
  > *Every single event—from complaint submission to crew dispatch and power restoration—is written to an immutable SQLite audit trail.*
  > *GridSentinel reduces rural blackout durations from 24 hours to under 30 minutes, protecting crops, rural health centers, and DISCOM revenues.*
  > *Thank you!"*

---

## 📊 HOW TO PRESENT TO HACKATHON JUDGES

### Presentation Strategy & Mindset
1. **Lead with the Problem**: Start with the stark reality of rural feeders (50km long, no sensors, 24-hour blackouts).
2. **Show, Don't Tell**: Don't just show slides. Open the live app, trigger a fault, and show the WebSocket & SHAP chart reacting live.
3. **Emphasize DL Rigor**:
   - Explicitly mention model names: *PyTorch LSTM Autoencoder*, *PyTorch Geometric T-GAT*, *XGBoost*, *SHAP TreeExplainer*.
   - Mention datasets and metrics: *15,000 synthetic fault events, 94.2% test accuracy, 14ms SHAP latency*.
4. **Demonstrate Both Sides of the Platform**:
   - **Admin Portal**: For MSEDCL utility engineers (GIS Map, LOTO Switching, Analytics, Audit Trail).
   - **Consumer Portal**: For rural citizens (Outage reporting, photo evidence, ticket tracking, crowdsource endorsement).

### Key Credentials for Demo
- **Admin Portal**: `admin@msedcl.in` / `admin123`
- **Consumer Portal**: `consumer@pune.in` / `consumer123`
- **Live URL**: `http://localhost:5173`
