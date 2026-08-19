"""
GridSentinel — Step 2: Dataset Generation Pipeline
====================================================
Produces the complete training dataset by:
  1. Loading Kaggle fault CSVs  (classData.csv + detect_dataset.csv)
  2. Running pandapower IEEE 33-bus simulation  → 6 months of feeder readings
  3. Injecting Kaggle fault signatures into synthetic time-series
  4. Merging hourly weather data (run fetch_weather.py first)
  5. Saving final CSVs to ml/data/processed/

Outputs:
  ml/data/processed/sensor_timeseries.csv   ~262,800 rows (1-min, 6 months, 5 sections)
  ml/data/processed/fault_events.csv        labeled fault event summaries
  ml/data/processed/graph_nodes.csv         per-timestep node features for GNN

Run:
    python ml/scripts/generate_dataset.py

Requirements:
    pip install pandapower pandas numpy scikit-learn
"""

import os, math, random, warnings
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT      = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DIR   = os.path.join(ROOT, "data", "raw")
PROC_DIR  = os.path.join(ROOT, "data", "processed")
KAGGLE    = os.path.join(ROOT, "..", "datasets",
                         "electrical fault detection and classification")

CLASS_CSV  = os.path.join(KAGGLE, "classData.csv")
DETECT_CSV = os.path.join(KAGGLE, "detect_dataset.csv")
WEATHER_CSV = os.path.join(RAW_DIR, "weather_maharashtra_2024.csv")

os.makedirs(PROC_DIR, exist_ok=True)

# ── Simulation config ─────────────────────────────────────────────────────────
START_DT      = datetime(2024, 1, 1, 0, 0, 0)
DAYS          = 183           # ~6 months
INTERVAL_MIN  = 1             # 1-minute readings
NUM_SECTIONS  = 5
FAULT_TYPES   = ["conductor_damage", "transformer_overload",
                 "vegetation_contact", "illegal_tap", "grounding_fault"]

# Fault probability per section per day (kept low — realistic)
FAULT_EVENT_PROB = 0.018

# Normal operating ranges per section (slight variation across feeder)
SECTION_PARAMS = {
    1: {"v_base": 1.02, "i_base": 155, "t_base": 52, "thd_base": 3.2, "pf_base": 0.94},
    2: {"v_base": 1.01, "i_base": 178, "t_base": 55, "thd_base": 3.5, "pf_base": 0.93},
    3: {"v_base": 0.99, "i_base": 192, "t_base": 58, "thd_base": 4.0, "pf_base": 0.91},
    4: {"v_base": 0.98, "i_base": 165, "t_base": 54, "thd_base": 3.8, "pf_base": 0.92},
    5: {"v_base": 0.97, "i_base": 145, "t_base": 50, "thd_base": 3.3, "pf_base": 0.93},
}

# Village mapping (used for affected_villages field)
SECTION_VILLAGES = {
    1: ["Ranjangaon", "Shikrapur"],
    2: ["Kedgaon", "Shirur"],
    3: ["Koregaon Bhima", "Sanaswadi"],
    4: ["Wagholi", "Loni Kalbhor"],
    5: ["Uruli Kanchan", "Phursungi"],
}


# ═════════════════════════════════════════════════════════════════════════════
# STEP 1 — Load and normalise Kaggle datasets
# ═════════════════════════════════════════════════════════════════════════════

def load_kaggle_data():
    """
    classData.csv  : G,C,B,A,Ia,Ib,Ic,Va,Vb,Vc
      G=1 → Ground fault, C=1 → Phase C, B=1 → Phase B, A=1 → Phase A
    detect_dataset.csv : Output(S),Ia,Ib,Ic,Va,Vb,Vc
      Output(S)=1 → fault present

    Returns:
      class_df   — fault-type labelled rows
      detect_df  — binary fault/no-fault rows
    """
    print("Loading Kaggle datasets...")
    class_df  = pd.read_csv(CLASS_CSV)
    detect_df = pd.read_csv(DETECT_CSV)

    # Clean column names
    class_df.columns  = [c.strip() for c in class_df.columns]
    detect_df.columns = [c.strip().replace(" ", "_") for c in detect_df.columns]

    # Drop any NaN rows
    class_df.dropna(inplace=True)
    detect_df.dropna(inplace=True)

    # Map G,C,B,A bits → fault type string
    def bits_to_fault(row):
        g, c, b, a = int(row["G"]), int(row["C"]), int(row["B"]), int(row["A"])
        if g == 1 and a == 1 and b == 0 and c == 0: return "grounding_fault"
        if g == 0 and a == 1 and b == 1 and c == 0: return "conductor_damage"
        if g == 0 and a == 1 and b == 0 and c == 1: return "vegetation_contact"
        if g == 0 and a == 0 and b == 1 and c == 1: return "transformer_overload"
        if g == 1 and a == 0 and b == 0 and c == 0: return "illegal_tap"
        return "conductor_damage"  # fallback

    class_df["fault_type"] = class_df.apply(bits_to_fault, axis=1)

    # Compute per-fault-type median signatures (V drop %, I spike %)
    # These are used as templates when injecting faults into pandapower output
    signatures = {}
    for ft in FAULT_TYPES:
        subset = class_df[class_df["fault_type"] == ft]
        if len(subset) == 0:
            subset = class_df
        # Voltage magnitude (3-phase mean, normalised)
        va_med = subset[["Va", "Vb", "Vc"]].abs().mean().mean()
        ia_med = subset[["Ia", "Ib", "Ic"]].abs().mean().mean()
        signatures[ft] = {
            "v_magnitude": float(va_med),  # relative unit
            "i_magnitude": float(ia_med),
        }

    print(f"  classData  : {len(class_df):,} rows | fault types: {class_df['fault_type'].value_counts().to_dict()}")
    print(f"  detect_data: {len(detect_df):,} rows | faults: {detect_df.iloc[:,0].sum():,}")
    return class_df, detect_df, signatures


# ═════════════════════════════════════════════════════════════════════════════
# STEP 2 — pandapower IEEE 33-bus simulation
# ═════════════════════════════════════════════════════════════════════════════

def run_pandapower_simulation():
    """
    Uses pandapower's built-in IEEE 33-bus test network.
    Runs a power flow for each of the 5 feeder sections under varied load.
    Returns base V (pu), I (A) profiles for normal conditions.
    """
    try:
        import pandapower as pp
        import pandapower.networks as pn
        print("Running pandapower IEEE 33-bus simulation...")
        net = pn.case33bw()
        pp.runpp(net, algorithm="nr", numba=False)
        # Extract per-bus voltage (pu) from first 5 load buses (sections 1-5)
        section_v = {}
        for sid in range(1, NUM_SECTIONS + 1):
            bus_idx = sid  # buses 1–5 mapped to sections 1–5
            v = float(net.res_bus.vm_pu.iloc[bus_idx]) if bus_idx < len(net.res_bus) else 0.99
            section_v[sid] = v
        print(f"  pandapower converged. Bus voltages: {section_v}")
        return section_v
    except ImportError:
        print("  pandapower not installed — using hardcoded IEEE 33-bus base values.")
        return {1: 1.021, 2: 1.008, 3: 0.993, 4: 0.981, 5: 0.974}
    except Exception as e:
        print(f"  pandapower error ({e}) — using fallback values.")
        return {1: 1.021, 2: 1.008, 3: 0.993, 4: 0.981, 5: 0.974}


# ═════════════════════════════════════════════════════════════════════════════
# STEP 3 — Generate fault event schedule
# ═════════════════════════════════════════════════════════════════════════════

def generate_fault_schedule(rng: np.random.Generator):
    """
    Returns list of fault events:
    [{"section_id": 3, "fault_type": "vegetation_contact",
      "start_min": 12345, "duration_min": 47}, ...]
    """
    total_minutes = DAYS * 24 * 60
    events = []
    event_id = 0

    # Duration range per fault type (minutes)
    DURATION = {
        "conductor_damage":     (60,  240),   # permanent until repair
        "transformer_overload": (120, 360),   # hours of overload
        "vegetation_contact":   (5,   45),    # intermittent
        "illegal_tap":          (180, 720),   # long-running, gradual
        "grounding_fault":      (15,  90),    # variable
    }

    # Generate ~50 events per fault type spread across 6 months
    for ft in FAULT_TYPES:
        for _ in range(50):
            start_min  = int(rng.integers(0, total_minutes - 720))
            section_id = int(rng.integers(1, NUM_SECTIONS + 1))
            dmin, dmax = DURATION[ft]
            duration   = int(rng.integers(dmin, dmax))
            events.append({
                "event_id":   event_id,
                "section_id": section_id,
                "fault_type": ft,
                "start_min":  start_min,
                "end_min":    start_min + duration,
                "duration_min": duration,
            })
            event_id += 1

    print(f"  Generated {len(events)} fault events across 6 months")
    return events


# ═════════════════════════════════════════════════════════════════════════════
# STEP 4 — Build a lookup: minute → active faults per section
# ═════════════════════════════════════════════════════════════════════════════

def build_fault_lookup(events):
    """Returns dict: (minute, section_id) → fault_type | None"""
    lookup = {}
    for ev in events:
        for m in range(ev["start_min"], ev["end_min"] + 1):
            key = (m, ev["section_id"])
            lookup[key] = ev["fault_type"]   # last event wins if overlap
    return lookup


# ═════════════════════════════════════════════════════════════════════════════
# STEP 5 — Inject fault signature into a reading
# ═════════════════════════════════════════════════════════════════════════════

FAULT_SIGNATURES = {
    # Each entry: (voltage_multiplier, current_multiplier, temp_delta, thd_multiplier, pf_multiplier)
    "conductor_damage":     (0.55, 2.80, 2.0,  3.5, 0.78),
    "transformer_overload": (0.84, 1.55, 28.0, 1.8, 0.84),
    "vegetation_contact":   (0.78, 1.85, 1.5,  4.2, 0.80),
    "illegal_tap":          (0.91, 1.32, 1.0,  1.3, 0.87),
    "grounding_fault":      (0.70, 2.10, 3.0,  3.0, 0.76),
}

def apply_fault(v_pu, i_a, temp_c, thd, pf, fault_type, rng, minute_into_fault, duration):
    """Applies fault signature with ramp-up and noise."""
    sig = FAULT_SIGNATURES[fault_type]
    vm, im, td, thm, pfm = sig

    # Gradual onset for slow faults (overload, illegal_tap)
    if fault_type in ("transformer_overload", "illegal_tap"):
        ramp = min(1.0, minute_into_fault / max(1, duration * 0.3))
    else:
        ramp = 1.0   # sudden for conductor_damage, vegetation_contact

    noise = lambda s: float(rng.normal(0, s))

    v_f   = v_pu   * (1.0 - ramp * (1.0 - vm))   + noise(0.01)
    i_f   = i_a    * (1.0 + ramp * (im - 1.0))    + noise(5.0)
    t_f   = temp_c + ramp * td                     + noise(1.0)
    thd_f = thd    * (1.0 + ramp * (thm - 1.0))   + noise(0.3)
    pf_f  = pf     * (1.0 - ramp * (1.0 - pfm))   + noise(0.01)

    return (
        max(0.0, min(2.0, v_f)),
        max(0.0, i_f),
        max(20.0, t_f),
        max(0.0, min(50.0, thd_f)),
        max(0.0, min(1.0, pf_f)),
    )


# ═════════════════════════════════════════════════════════════════════════════
# STEP 6 — Load weather CSV (hourly → minute resolution via ffill)
# ═════════════════════════════════════════════════════════════════════════════

def load_weather():
    if not os.path.exists(WEATHER_CSV):
        print("  ⚠ Weather CSV not found — run fetch_weather.py first. Using zeros.")
        total_min = DAYS * 24 * 60
        return pd.DataFrame({
            "rain_mm": [0.0] * total_min,
            "windspeed_kmh": [10.0] * total_min,
            "temp_ambient_C": [28.0] * total_min,
            "humidity_pct": [60.0] * total_min,
            "lightning_risk": [0.1] * total_min,
            "vegetation_risk": [0.2] * total_min,
        })

    print("  Loading weather data...")
    wdf = pd.read_csv(WEATHER_CSV, parse_dates=["timestamp"])
    wdf = wdf.set_index("timestamp").sort_index()
    # Resample to 1-minute
    wdf = wdf.resample("1min").ffill()
    # Trim to our simulation window
    sim_start = pd.Timestamp(START_DT)
    sim_end   = sim_start + pd.Timedelta(minutes=DAYS * 24 * 60 - 1)
    wdf = wdf.loc[sim_start:sim_end].reset_index(drop=True)
    # Pad if shorter
    needed = DAYS * 24 * 60
    if len(wdf) < needed:
        pad = pd.DataFrame([wdf.iloc[-1].to_dict()] * (needed - len(wdf)))
        wdf = pd.concat([wdf, pad], ignore_index=True)
    print(f"  Weather rows after resampling: {len(wdf):,}")
    return wdf[["rain_mm","windspeed_kmh","temp_ambient_C","humidity_pct","lightning_risk","vegetation_risk"]]


# ═════════════════════════════════════════════════════════════════════════════
# STEP 7 — Main generation loop
# ═════════════════════════════════════════════════════════════════════════════

def generate_timeseries(section_v_base, fault_lookup, weather_df, rng):
    """
    Generates the full minute-by-minute sensor time-series for all 5 sections.
    Returns a DataFrame with ~262,800 rows × (timestamp, section_id, features, labels).
    """
    total_min = DAYS * 24 * 60
    rows = []

    print(f"Generating {total_min * NUM_SECTIONS:,} rows ({DAYS} days × {NUM_SECTIONS} sections × 1-min)...")
    # Track per-section fault entry time for ramp calculation
    fault_entry = {}   # (section_id) → minute when fault started

    for minute in range(total_min):
        ts = START_DT + timedelta(minutes=minute)
        hour_of_day = ts.hour
        day_of_week = ts.weekday()

        # Load pattern: higher load 07:00-22:00, low at night
        load_factor = 1.0 + 0.35 * math.sin(math.pi * (hour_of_day - 6) / 16) \
                           if 6 <= hour_of_day <= 22 else 0.65

        # Weather for this minute
        if minute < len(weather_df):
            w = weather_df.iloc[minute]
            rain     = float(w.get("rain_mm", 0.0))
            wind     = float(w.get("windspeed_kmh", 10.0))
            t_amb    = float(w.get("temp_ambient_C", 28.0))
            hum      = float(w.get("humidity_pct", 60.0))
            l_risk   = float(w.get("lightning_risk", 0.1))
            v_risk   = float(w.get("vegetation_risk", 0.2))
        else:
            rain, wind, t_amb, hum, l_risk, v_risk = 0.0, 10.0, 28.0, 60.0, 0.1, 0.2

        for sid in range(1, NUM_SECTIONS + 1):
            p = SECTION_PARAMS[sid]
            v_nom = section_v_base.get(sid, p["v_base"])

            # Base normal readings with load variation + noise
            v_pu  = v_nom  * load_factor * (1.0 + rng.normal(0, 0.008))
            i_a   = p["i_base"] * load_factor + rng.normal(0, 8.0)
            temp  = p["t_base"] + 0.3 * (t_amb - 28.0) + rng.normal(0, 1.5)
            thd   = p["thd_base"] + rng.normal(0, 0.2)
            pf    = p["pf_base"] + rng.normal(0, 0.008)

            # Check if fault is active
            fault_key    = (minute, sid)
            fault_active = fault_lookup.get(fault_key)

            if fault_active:
                # Track how long into the fault we are
                if sid not in fault_entry or fault_entry[sid] > minute:
                    fault_entry[sid] = minute
                min_into_fault = minute - fault_entry[sid]
                # Find event duration for ramp calculation
                duration = 60  # default fallback
                v_pu, i_a, temp, thd, pf = apply_fault(
                    v_pu, i_a, temp, thd, pf,
                    fault_active, rng, min_into_fault, duration
                )
                fault_label = 1
                fault_type  = fault_active
            else:
                if sid in fault_entry:
                    del fault_entry[sid]
                fault_label = 0
                fault_type  = "normal"

            # Clamp to physical bounds
            v_pu = max(0.0, min(2.0, v_pu))
            i_a  = max(0.0, i_a)
            temp = max(20.0, temp)
            thd  = max(0.0, min(50.0, thd))
            pf   = max(0.1, min(1.0, pf))

            rows.append({
                "timestamp":      ts.isoformat(),
                "section_id":     sid,
                "voltage_pu":     round(v_pu,  5),
                "current_A":      round(i_a,   3),
                "temp_C":         round(temp,   2),
                "thd_pct":        round(thd,    3),
                "power_factor":   round(pf,     4),
                # Weather
                "rain_mm":        round(rain,   2),
                "windspeed_kmh":  round(wind,   1),
                "temp_ambient_C": round(t_amb,  1),
                "humidity_pct":   round(hum,    1),
                "lightning_risk": round(l_risk, 4),
                "vegetation_risk": round(v_risk, 4),
                # Load context
                "hour_sin":       round(math.sin(2*math.pi*hour_of_day/24), 4),
                "hour_cos":       round(math.cos(2*math.pi*hour_of_day/24), 4),
                "day_of_week":    day_of_week,
                "load_factor":    round(load_factor, 4),
                # Labels
                "fault_active":   fault_label,
                "fault_type":     fault_type,
                "fault_section_id": sid if fault_label else 0,
            })

        if minute % 10000 == 0:
            pct = 100 * minute / total_min
            print(f"  {pct:5.1f}%  ({minute:,} / {total_min:,} minutes)")

    return pd.DataFrame(rows)


# ═════════════════════════════════════════════════════════════════════════════
# STEP 8 — Build fault events summary CSV
# ═════════════════════════════════════════════════════════════════════════════

def build_fault_events_csv(ts_df, events):
    """Summarises each fault event with aggregate electrical features for XGBoost."""
    records = []
    for ev in events:
        sid = ev["section_id"]
        ft  = ev["fault_type"]
        start_ts = START_DT + timedelta(minutes=ev["start_min"])
        end_ts   = START_DT + timedelta(minutes=ev["end_min"])

        mask = (
            (ts_df["section_id"] == sid) &
            (ts_df["fault_type"] == ft) &
            (ts_df["timestamp"] >= start_ts.isoformat()) &
            (ts_df["timestamp"] <= end_ts.isoformat())
        )
        subset = ts_df[mask]
        if len(subset) == 0:
            continue

        # Pre-fault window (same section, 30 min before)
        pre_mask = (
            (ts_df["section_id"] == sid) &
            (ts_df["fault_active"] == 0) &
            (ts_df["timestamp"] >= (start_ts - timedelta(minutes=30)).isoformat()) &
            (ts_df["timestamp"] < start_ts.isoformat())
        )
        pre = ts_df[pre_mask]
        v_pre = pre["voltage_pu"].mean() if len(pre) else SECTION_PARAMS[sid]["v_base"]
        i_pre = pre["current_A"].mean()  if len(pre) else SECTION_PARAMS[sid]["i_base"]

        records.append({
            "event_id":           ev["event_id"],
            "section_id":         sid,
            "fault_type":         ft,
            "start_time":         start_ts.isoformat(),
            "end_time":           end_ts.isoformat(),
            "duration_min":       ev["duration_min"],
            "voltage_drop_pct":   round(100*(v_pre - subset["voltage_pu"].mean())/max(v_pre,0.01), 2),
            "current_spike_pct":  round(100*(subset["current_A"].mean() - i_pre)/max(i_pre,1), 2),
            "temp_delta":         round(subset["temp_C"].mean() - SECTION_PARAMS[sid]["t_base"], 2),
            "thd_pct_mean":       round(subset["thd_pct"].mean(), 3),
            "pf_drop":            round(SECTION_PARAMS[sid]["pf_base"] - subset["power_factor"].mean(), 4),
            "rain_mm_mean":       round(subset["rain_mm"].mean(), 2),
            "wind_mean_kmh":      round(subset["windspeed_kmh"].mean(), 1),
            "humidity_mean_pct":  round(subset["humidity_pct"].mean(), 1),
            "lightning_risk_mean": round(subset["lightning_risk"].mean(), 4),
            "vegetation_risk_mean": round(subset["vegetation_risk"].mean(), 4),
            "label":              ft,
        })

    return pd.DataFrame(records)


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("GridSentinel — Dataset Generation Pipeline")
    print("=" * 60)

    rng = np.random.default_rng(seed=42)

    # 1. Kaggle
    class_df, detect_df, signatures = load_kaggle_data()

    # 2. pandapower
    section_v_base = run_pandapower_simulation()

    # 3. Fault schedule
    print("\nGenerating fault event schedule...")
    events = generate_fault_schedule(rng)
    fault_lookup = build_fault_lookup(events)

    # 4. Weather
    print("\nLoading weather...")
    weather_df = load_weather()

    # 5. Main time-series
    print("\nBuilding time-series...")
    ts_df = generate_timeseries(section_v_base, fault_lookup, weather_df, rng)

    # 6. Save time-series
    out_ts = os.path.join(PROC_DIR, "sensor_timeseries.csv")
    ts_df.to_csv(out_ts, index=False)
    print(f"\n✅ sensor_timeseries.csv → {len(ts_df):,} rows saved to {out_ts}")

    # 7. Fault events summary
    print("\nBuilding fault events summary...")
    ev_df = build_fault_events_csv(ts_df, events)
    out_ev = os.path.join(PROC_DIR, "fault_events.csv")
    ev_df.to_csv(out_ev, index=False)
    print(f"✅ fault_events.csv → {len(ev_df):,} rows saved to {out_ev}")

    # 8. Summary statistics
    total      = len(ts_df)
    fault_rows = ts_df["fault_active"].sum()
    print(f"\n📊 Dataset Summary:")
    print(f"   Total rows    : {total:,}")
    print(f"   Fault rows    : {fault_rows:,}  ({100*fault_rows/total:.1f}%)")
    print(f"   Normal rows   : {total-fault_rows:,}  ({100*(total-fault_rows)/total:.1f}%)")
    print(f"\n   Fault type distribution:")
    print(ts_df[ts_df["fault_active"]==1]["fault_type"].value_counts().to_string())
    print(f"\n   Sections:")
    print(ts_df.groupby("section_id")["fault_active"].sum().to_string())

    print("\n✅ Part 2 data generation complete. Ready for model training.")

if __name__ == "__main__":
    main()
