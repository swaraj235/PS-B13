"""
GridSentinel — Part 2 Runner
==============================
Runs the complete data pipeline in the correct order:
  Step 1: fetch_weather.py      → ml/data/raw/weather_maharashtra_2024.csv
  Step 2: generate_dataset.py   → ml/data/processed/sensor_timeseries.csv
                                   ml/data/processed/fault_events.csv
  Step 3: build_graph_dataset.py → ml/data/graphs/graph_dataset.pt

Run from project root:
    python ml/scripts/run_data_pipeline.py
"""

import subprocess, sys, os, time

SCRIPTS = os.path.dirname(os.path.abspath(__file__))

STEPS = [
    ("Fetching weather data",           os.path.join(SCRIPTS, "fetch_weather.py")),
    ("Generating sensor time-series",   os.path.join(SCRIPTS, "generate_dataset.py")),
    ("Building GNN graph dataset",      os.path.join(SCRIPTS, "build_graph_dataset.py")),
]

def run_step(label, script_path):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    t0  = time.time()
    ret = subprocess.run([sys.executable, script_path], check=False)
    elapsed = time.time() - t0
    if ret.returncode != 0:
        print(f"\n❌ FAILED: {script_path} (exit code {ret.returncode})")
        sys.exit(ret.returncode)
    print(f"\n  ✅ Done in {elapsed:.1f}s")

if __name__ == "__main__":
    print("GridSentinel — Part 2: Full Data Pipeline")
    total_start = time.time()
    for label, script in STEPS:
        run_step(label, script)
    total = time.time() - total_start
    print(f"\n{'='*60}")
    print(f"  All steps complete in {total/60:.1f} minutes")
    print(f"  Ready to train models (Part 3)")
    print(f"{'='*60}")
