"""
GridSentinel — Step 3: Graph Dataset Builder
=============================================
Converts sensor_timeseries.csv into PyTorch Geometric Data objects
for training the Temporal GAT (T-GAT) model.

Each graph = one 30-minute window × 5 nodes (feeder sections)
Node features: [voltage_pu, current_A, temp_C, thd_pct, power_factor,
                rain_mm, lightning_risk, vegetation_risk, load_factor,
                hour_sin, hour_cos]  → 11 features per node per timestep
Edge features:  [impedance_ohm, distance_km, line_age_years]
Node label:     fault_active (0/1) + fault_type one-hot

Output:
    ml/data/graphs/graph_dataset.pt   (list of PyG Data objects)
    ml/data/graphs/graph_meta.json    (feature names, class mapping)

Run:
    python ml/scripts/build_graph_dataset.py
"""

import os, json
import numpy as np
import pandas as pd

PROC_DIR   = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "data", "processed"))
GRAPH_DIR  = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "data", "graphs"))
os.makedirs(GRAPH_DIR, exist_ok=True)

# ── Graph topology (fixed — 5 sections in a radial feeder) ───────────────────
# Edges: section 1→2→3→4→5 (radial), bidirectional
NUM_NODES = 5
EDGE_INDEX = [
    [0,1], [1,0],   # Section 1 ↔ 2
    [1,2], [2,1],   # Section 2 ↔ 3
    [2,3], [3,2],   # Section 3 ↔ 4
    [3,4], [4,3],   # Section 4 ↔ 5
]

# Edge attributes: [impedance_ohm, distance_km, line_age_years]
# Derived from a typical 11kV rural ACSR feeder in Maharashtra
EDGE_ATTRS = [
    [0.32, 2.1, 12.0], [0.32, 2.1, 12.0],  # S1–S2
    [0.41, 2.7, 15.0], [0.41, 2.7, 15.0],  # S2–S3
    [0.38, 2.4, 18.0], [0.38, 2.4, 18.0],  # S3–S4
    [0.45, 3.0, 22.0], [0.45, 3.0, 22.0],  # S4–S5
]

WINDOW_MIN  = 30    # 30-minute sliding window → input to T-GAT
STRIDE_MIN  = 5     # step between windows (overlap allowed)
MIN_FAULT_WINDOWS = 2000   # ensure enough fault-positive graphs via augmentation

NODE_FEATURES = [
    "voltage_pu", "current_A", "temp_C", "thd_pct", "power_factor",
    "rain_mm", "lightning_risk", "vegetation_risk", "load_factor",
    "hour_sin", "hour_cos",
]
NUM_NODE_FEATURES = len(NODE_FEATURES)  # 11

FAULT_TYPES = ["normal", "conductor_damage", "transformer_overload",
               "vegetation_contact", "illegal_tap", "grounding_fault"]
FAULT2IDX   = {ft: i for i, ft in enumerate(FAULT_TYPES)}


def load_timeseries() -> pd.DataFrame:
    path = os.path.join(PROC_DIR, "sensor_timeseries.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Run generate_dataset.py first. Expected: {path}"
        )
    print(f"Loading {path} ...")
    df = pd.read_csv(path, parse_dates=["timestamp"])
    df.sort_values(["timestamp", "section_id"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    print(f"  Loaded {len(df):,} rows")
    return df


def normalize_features(df: pd.DataFrame) -> pd.DataFrame:
    """Min-max normalize all node feature columns. Saves scaler stats to graph_meta.json."""
    stats = {}
    for col in NODE_FEATURES:
        mn, mx = df[col].min(), df[col].max()
        rng = mx - mn if mx != mn else 1.0
        df[col + "_norm"] = ((df[col] - mn) / rng).clip(0, 1)
        stats[col] = {"min": float(mn), "max": float(mx)}
    return df, stats


def extract_window(df_window: pd.DataFrame):
    """
    df_window: 30 rows × 5 sections = 150 rows, sorted by (timestamp, section_id)
    Returns:
        x         : np.array shape (5, 30, 11)   node × time × features
        y_fault   : np.array shape (5,)           binary per-node label
        y_type    : np.array shape (5,)           fault type class index
        has_fault : bool
    """
    x = np.zeros((NUM_NODES, WINDOW_MIN, NUM_NODE_FEATURES), dtype=np.float32)
    y_fault = np.zeros(NUM_NODES, dtype=np.long)
    y_type  = np.zeros(NUM_NODES, dtype=np.long)   # 0 = normal

    norm_cols = [c + "_norm" for c in NODE_FEATURES]

    for t_idx, ts in enumerate(sorted(df_window["timestamp"].unique())[:WINDOW_MIN]):
        ts_rows = df_window[df_window["timestamp"] == ts]
        for _, row in ts_rows.iterrows():
            node = int(row["section_id"]) - 1   # 0-indexed
            x[node, t_idx, :] = row[norm_cols].values.astype(np.float32)

    # Label = last timestep's fault state per section
    last_ts = sorted(df_window["timestamp"].unique())[-1]
    last    = df_window[df_window["timestamp"] == last_ts]
    for _, row in last.iterrows():
        node = int(row["section_id"]) - 1
        y_fault[node] = int(row["fault_active"])
        y_type[node]  = FAULT2IDX.get(row["fault_type"], 0)

    has_fault = bool(y_fault.any())
    return x, y_fault, y_type, has_fault


def augment_graph(x, y_fault, y_type, rng: np.random.Generator):
    """
    Data augmentation for GNN training:
    1. Gaussian noise on node features (σ=0.02)
    2. Random sensor dropout: zero out 1–2 random feature channels
    Returns augmented copy.
    """
    x_aug = x.copy()
    # 1. Gaussian noise
    x_aug += rng.normal(0, 0.02, x_aug.shape).astype(np.float32)
    x_aug = np.clip(x_aug, 0.0, 1.0)
    # 2. Random feature dropout (simulate sensor failure)
    n_drop = rng.integers(0, 3)   # drop 0–2 features
    drop_cols = rng.choice(NUM_NODE_FEATURES, size=n_drop, replace=False)
    x_aug[:, :, drop_cols] = 0.0
    return x_aug, y_fault.copy(), y_type.copy()


def build_graphs(df: pd.DataFrame, rng: np.random.Generator):
    """Sliding window over time → extract graphs → augment fault-positive ones."""
    timestamps = sorted(df["timestamp"].unique())
    total_ts   = len(timestamps)
    graphs     = []
    fault_graphs = []

    edge_index = np.array(EDGE_INDEX, dtype=np.long).T   # shape (2, 8)
    edge_attr  = np.array(EDGE_ATTRS, dtype=np.float32)  # shape (8, 3)

    print(f"\nExtracting graphs (window={WINDOW_MIN}min, stride={STRIDE_MIN}min) ...")
    wins = range(0, total_ts - WINDOW_MIN, STRIDE_MIN)
    for step, start in enumerate(wins):
        ts_window = timestamps[start: start + WINDOW_MIN]
        df_win    = df[df["timestamp"].isin(ts_window)]
        if len(df_win) < WINDOW_MIN * NUM_NODES * 0.8:
            continue   # skip sparse windows

        x, y_fault, y_type, has_fault = extract_window(df_win)

        g = {
            "x":          x,
            "y_fault":    y_fault,
            "y_type":     y_type,
            "edge_index": edge_index,
            "edge_attr":  edge_attr,
            "has_fault":  has_fault,
        }
        graphs.append(g)
        if has_fault:
            fault_graphs.append(g)

        if step % 500 == 0:
            print(f"  Step {step:,}/{len(wins):,}  graphs so far: {len(graphs):,}")

    # Augment fault graphs until we have at least MIN_FAULT_WINDOWS fault-positive graphs
    n_aug = max(0, MIN_FAULT_WINDOWS - len(fault_graphs))
    print(f"\nFault-positive graphs: {len(fault_graphs)}  |  Augmenting {n_aug} more...")
    for _ in range(n_aug):
        src = fault_graphs[rng.integers(0, len(fault_graphs))]
        x_aug, yf_aug, yt_aug = augment_graph(src["x"], src["y_fault"], src["y_type"], rng)
        graphs.append({
            "x": x_aug, "y_fault": yf_aug, "y_type": yt_aug,
            "edge_index": edge_index, "edge_attr": edge_attr,
            "has_fault": True,
        })

    rng.shuffle(graphs)
    print(f"Total graphs: {len(graphs):,}  "
          f"(fault: {sum(g['has_fault'] for g in graphs):,}  "
          f"normal: {sum(not g['has_fault'] for g in graphs):,})")
    return graphs


def save_graphs(graphs, scaler_stats):
    """Save as numpy .npz files + metadata JSON (avoids needing PyG at this stage)."""
    try:
        import torch
        from torch_geometric.data import Data

        pyg_list = []
        for g in graphs:
            # x shape: (nodes, timesteps, features) → flatten timesteps into features
            # T-GAT temporal encoding handles this internally
            x_flat = torch.tensor(g["x"].reshape(NUM_NODES, -1), dtype=torch.float)
            data = Data(
                x          = x_flat,
                edge_index = torch.tensor(g["edge_index"], dtype=torch.long),
                edge_attr  = torch.tensor(g["edge_attr"],  dtype=torch.float),
                y_fault    = torch.tensor(g["y_fault"],    dtype=torch.long),
                y_type     = torch.tensor(g["y_type"],     dtype=torch.long),
                num_nodes  = NUM_NODES,
            )
            pyg_list.append(data)

        out = os.path.join(GRAPH_DIR, "graph_dataset.pt")
        torch.save(pyg_list, out)
        print(f"\n✅ Saved {len(pyg_list)} PyG Data objects → {out}")

    except ImportError:
        # PyG not installed yet — save as numpy for now
        print("  PyTorch Geometric not installed — saving as .npz instead.")
        xs    = np.stack([g["x"] for g in graphs])           # (N, nodes, time, feat)
        yf    = np.stack([g["y_fault"] for g in graphs])     # (N, nodes)
        yt    = np.stack([g["y_type"]  for g in graphs])     # (N, nodes)
        out   = os.path.join(GRAPH_DIR, "graph_dataset.npz")
        np.savez_compressed(out, x=xs, y_fault=yf, y_type=yt,
                            edge_index=graphs[0]["edge_index"],
                            edge_attr=graphs[0]["edge_attr"])
        print(f"\n✅ Saved {len(graphs)} graphs as .npz → {out}")

    # Always save metadata
    meta = {
        "num_graphs":        len(graphs),
        "num_nodes":         NUM_NODES,
        "window_minutes":    WINDOW_MIN,
        "num_node_features": NUM_NODE_FEATURES,
        "node_feature_names": NODE_FEATURES,
        "edge_feature_names": ["impedance_ohm", "distance_km", "line_age_years"],
        "fault_type_classes": FAULT_TYPES,
        "fault2idx":         FAULT2IDX,
        "edge_index":        EDGE_INDEX,
        "edge_attr":         EDGE_ATTRS,
        "scaler_stats":      scaler_stats,
    }
    meta_path = os.path.join(GRAPH_DIR, "graph_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"✅ Metadata saved → {meta_path}")


def main():
    print("=" * 60)
    print("GridSentinel — Graph Dataset Builder")
    print("=" * 60)
    rng = np.random.default_rng(seed=42)

    df = load_timeseries()
    print("\nNormalizing features...")
    df, scaler_stats = normalize_features(df)
    graphs = build_graphs(df, rng)
    save_graphs(graphs, scaler_stats)
    print("\n✅ Graph dataset build complete. Run 03_tgat_training.py next.")


if __name__ == "__main__":
    main()
