"""
GridSentinel — Part 3, Model 2: Temporal Graph Attention Network (T-GAT)
=========================================================================
Architecture:
  Step 1: Per-node 1D CNN → temporal embedding (32-dim)
  Step 2: Graph Attention Layer 1 — 8-head, edge features
  Step 3: Graph Attention Layer 2 — 4-head, residual
  Step 4: TerraShield feature fusion (tfr_risk concatenation)
  Step 5: Output heads — fault_prob (sigmoid) + fault_type (softmax)

Input  : ml/data/graphs/graph_dataset.pt   (from build_graph_dataset.py)
Output : ml/models/tgat_final.pt
         ml/models/tgat_meta.json

Run (after installing torch-geometric):
    pip install torch-geometric
    python ml/scripts/build_graph_dataset.py   # if not done yet
    python ml/scripts/train_tgat.py
"""

import os, json
import numpy as np
import warnings
warnings.filterwarnings("ignore")

ROOT      = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
GRAPH_DIR = os.path.join(ROOT, "data", "graphs")
MODEL_DIR = os.path.join(ROOT, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ── Hyperparameters ────────────────────────────────────────────────────────────
WINDOW_MIN      = 30      # timesteps per graph (must match build_graph_dataset.py)
NUM_NODES       = 5
NUM_NODE_FEAT   = 11      # features per node per timestep
NUM_EDGE_FEAT   = 3       # impedance, distance, age
NUM_FAULT_TYPES = 6       # normal + 5 fault types

TEMPORAL_DIM    = 32      # CNN output dim per node
GAT_HIDDEN      = 64
GAT_HEADS_1     = 8
GAT_HEADS_2     = 4
DROPOUT         = 0.3

BATCH_SIZE      = 32
EPOCHS          = 200
LR              = 3e-4
WEIGHT_DECAY    = 1e-4
GRAD_CLIP       = 1.0
LOSS_BCE_WEIGHT = 1.0     # weight for fault_prob BCE loss
LOSS_CE_WEIGHT  = 0.5     # weight for fault_type CE loss


# ═════════════════════════════════════════════════════════════════════════════
# MODEL
# ═════════════════════════════════════════════════════════════════════════════

def build_tgat_model():
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch_geometric.nn import GATConv

    class TemporalEncoder(nn.Module):
        """1D CNN per node — captures local temporal patterns."""
        def __init__(self, in_feat, out_dim):
            super().__init__()
            self.conv1 = nn.Conv1d(in_feat, 32, kernel_size=3, padding=1)
            self.conv2 = nn.Conv1d(32, out_dim, kernel_size=3, padding=1)
            self.norm  = nn.LayerNorm(out_dim)
            self.drop  = nn.Dropout(DROPOUT)

        def forward(self, x):
            # x: (B*N, T, F) → permute → (B*N, F, T)
            x = x.permute(0, 2, 1)
            x = F.relu(self.conv1(x))
            x = F.relu(self.conv2(x))
            x = x.mean(dim=2)          # global average pool over time → (B*N, out_dim)
            return self.drop(self.norm(x))

    class TGAT(nn.Module):
        def __init__(self):
            super().__init__()
            in_feat = NUM_NODE_FEAT * WINDOW_MIN   # flattened input

            self.temporal_enc = TemporalEncoder(NUM_NODE_FEAT, TEMPORAL_DIM)

            # GAT Layer 1: 8 heads × (GAT_HIDDEN/8) = GAT_HIDDEN out
            self.gat1 = GATConv(
                TEMPORAL_DIM, GAT_HIDDEN // GAT_HEADS_1,
                heads=GAT_HEADS_1, dropout=DROPOUT,
                edge_dim=NUM_EDGE_FEAT, concat=True,
            )   # out: GAT_HIDDEN

            # GAT Layer 2: 4 heads
            self.gat2 = GATConv(
                GAT_HIDDEN, GAT_HIDDEN // GAT_HEADS_2,
                heads=GAT_HEADS_2, dropout=DROPOUT,
                edge_dim=NUM_EDGE_FEAT, concat=True,
            )   # out: GAT_HIDDEN

            self.norm1 = nn.LayerNorm(GAT_HIDDEN)
            self.norm2 = nn.LayerNorm(GAT_HIDDEN)
            self.drop  = nn.Dropout(DROPOUT)

            # TerraShield fusion (+1 for tfr_risk_score, +1 for ert_anomaly_flag)
            self.fusion = nn.Linear(GAT_HIDDEN + 2, GAT_HIDDEN)

            # Output heads
            self.fault_prob_head = nn.Sequential(
                nn.Linear(GAT_HIDDEN, 16), nn.ReLU(),
                nn.Linear(16, 1)           # sigmoid applied at loss
            )
            self.fault_type_head = nn.Sequential(
                nn.Linear(GAT_HIDDEN, 16), nn.ReLU(),
                nn.Linear(16, NUM_FAULT_TYPES)   # softmax at loss
            )

        def forward(self, x, edge_index, edge_attr, tfr_risk=None, ert_flag=None, batch=None):
            """
            x          : (total_nodes, WINDOW_MIN*NUM_NODE_FEAT) — flattened
            edge_index : (2, E)
            edge_attr  : (E, 3)
            tfr_risk   : (total_nodes, 1)  — optional TerraShield feature
            ert_flag   : (total_nodes, 1)  — optional ERT anomaly flag
            """
            B_N = x.shape[0]

            # Temporal encoding: reshape to (B*N, T, F)
            x_seq = x.view(B_N, WINDOW_MIN, NUM_NODE_FEAT)
            t_emb = self.temporal_enc(x_seq)   # (B*N, TEMPORAL_DIM)

            # GAT Layer 1
            h1 = F.elu(self.gat1(t_emb, edge_index, edge_attr=edge_attr))
            h1 = self.norm1(h1)

            # GAT Layer 2 + residual
            h2 = F.elu(self.gat2(h1, edge_index, edge_attr=edge_attr))
            h2 = self.norm2(h2 + h1)   # residual from layer 1
            h2 = self.drop(h2)

            # TerraShield fusion
            if tfr_risk is not None and ert_flag is not None:
                ts = torch.cat([tfr_risk, ert_flag], dim=-1)   # (B*N, 2)
            else:
                ts = torch.zeros(B_N, 2, device=x.device)
            h3 = F.relu(self.fusion(torch.cat([h2, ts], dim=-1)))   # (B*N, GAT_HIDDEN)

            # Output
            fault_logit = self.fault_prob_head(h3).squeeze(-1)   # (B*N,)
            type_logit  = self.fault_type_head(h3)               # (B*N, 6)

            return fault_logit, type_logit

    return TGAT()


# ═════════════════════════════════════════════════════════════════════════════
# DATASET LOADING
# ═════════════════════════════════════════════════════════════════════════════

def load_graph_dataset():
    import torch
    pt_path  = os.path.join(GRAPH_DIR, "graph_dataset.pt")
    npz_path = os.path.join(GRAPH_DIR, "graph_dataset.npz")

    if os.path.exists(pt_path):
        print(f"Loading PyG dataset from {pt_path} ...")
        dataset = torch.load(pt_path, weights_only=False)
        print(f"  {len(dataset)} graphs loaded")
        return dataset, "pyg"
    elif os.path.exists(npz_path):
        print(f"Loading .npz dataset from {npz_path} ...")
        data    = np.load(npz_path, allow_pickle=True)
        return data, "npz"
    else:
        raise FileNotFoundError(
            f"No graph dataset found. Run build_graph_dataset.py first.\n"
            f"  Expected: {pt_path}"
        )


# ═════════════════════════════════════════════════════════════════════════════
# TRAINING
# ═════════════════════════════════════════════════════════════════════════════

def train_tgat():
    import torch
    import torch.nn as nn
    from torch_geometric.loader import DataLoader
    from torch_geometric.data import Data
    from sklearn.model_selection import train_test_split

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training T-GAT on: {device}")

    dataset, fmt = load_graph_dataset()

    if fmt == "npz":
        # Convert numpy arrays to PyG Data objects
        xs      = dataset["x"]          # (N_graphs, nodes, time, feat)
        yf      = dataset["y_fault"]    # (N_graphs, nodes)
        yt      = dataset["y_type"]     # (N_graphs, nodes)
        ei      = torch.tensor(dataset["edge_index"], dtype=torch.long)
        ea      = torch.tensor(dataset["edge_attr"],  dtype=torch.float)
        pyg_list = []
        for i in range(len(xs)):
            x_flat = torch.tensor(xs[i].reshape(NUM_NODES, -1), dtype=torch.float)
            pyg_list.append(Data(
                x=x_flat, edge_index=ei, edge_attr=ea,
                y_fault=torch.tensor(yf[i], dtype=torch.long),
                y_type =torch.tensor(yt[i], dtype=torch.long),
                num_nodes=NUM_NODES,
            ))
        dataset = pyg_list

    # Train/val split (80/20)
    n_val   = max(1, int(len(dataset) * 0.2))
    n_train = len(dataset) - n_val
    train_d = dataset[:n_train]
    val_d   = dataset[n_train:]

    train_loader = DataLoader(train_d, batch_size=BATCH_SIZE, shuffle=True)
    val_loader   = DataLoader(val_d,   batch_size=BATCH_SIZE, shuffle=False)

    model     = build_tgat_model().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
    bce       = nn.BCEWithLogitsLoss()
    ce        = nn.CrossEntropyLoss()

    best_val  = float("inf")
    best_path = os.path.join(MODEL_DIR, "tgat_final.pt")

    print(f"\n{'Epoch':>6} {'Train Loss':>12} {'Val Loss':>12} {'Val AUC':>10}")
    print("-" * 45)

    for epoch in range(1, EPOCHS + 1):
        # ── Train ──────────────────────────────────────────────────────────────
        model.train()
        t_loss = 0.0
        for batch in train_loader:
            batch = batch.to(device)
            y_f   = batch.y_fault.float()
            y_t   = batch.y_type

            logit_f, logit_t = model(batch.x, batch.edge_index, batch.edge_attr)

            loss = (LOSS_BCE_WEIGHT * bce(logit_f, y_f) +
                    LOSS_CE_WEIGHT  * ce(logit_t, y_t))

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), GRAD_CLIP)
            optimizer.step()
            t_loss += loss.item() * batch.num_graphs

        t_loss /= n_train

        # ── Validate ───────────────────────────────────────────────────────────
        model.eval()
        v_loss = 0.0
        all_pf, all_yf = [], []
        with torch.no_grad():
            for batch in val_loader:
                batch  = batch.to(device)
                y_f    = batch.y_fault.float()
                y_t    = batch.y_type
                lf, lt = model(batch.x, batch.edge_index, batch.edge_attr)
                v_loss += (LOSS_BCE_WEIGHT * bce(lf, y_f) +
                           LOSS_CE_WEIGHT  * ce(lt, y_t)).item() * batch.num_graphs
                all_pf.extend(torch.sigmoid(lf).cpu().numpy().tolist())
                all_yf.extend(y_f.cpu().numpy().tolist())
        v_loss /= n_val

        # AUC
        try:
            from sklearn.metrics import roc_auc_score
            auc = roc_auc_score(all_yf, all_pf)
        except Exception:
            auc = 0.0

        scheduler.step()

        if epoch % 20 == 0 or epoch == 1:
            print(f"{epoch:>6}  {t_loss:>12.6f}  {v_loss:>12.6f}  {auc:>10.4f}")

        if v_loss < best_val:
            best_val = v_loss
            torch.save(model.state_dict(), best_path)

    print(f"\nBest val loss: {best_val:.6f} → {best_path}")

    # Save metadata
    meta = {
        "num_nodes":       NUM_NODES,
        "window_minutes":  WINDOW_MIN,
        "num_node_feat":   NUM_NODE_FEAT,
        "num_edge_feat":   NUM_EDGE_FEAT,
        "num_fault_types": NUM_FAULT_TYPES,
        "gat_hidden":      GAT_HIDDEN,
        "temporal_dim":    TEMPORAL_DIM,
        "best_val_loss":   round(best_val, 6),
    }
    with open(os.path.join(MODEL_DIR, "tgat_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    return model, device, best_path


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("GridSentinel — T-GAT Training")
    print("=" * 60)

    try:
        import torch
        from torch_geometric.data import Data
    except ImportError as e:
        print(f"❌ {e}")
        print("Run: pip install torch torch-geometric")
        print("Then run: python ml/scripts/build_graph_dataset.py")
        return

    model, device, path = train_tgat()

    print(f"\n✅ T-GAT training complete.")
    print(f"   Model → {path}")
    print(f"\nNext: run backend/ml/inference.py to wire all models to the API.")


if __name__ == "__main__":
    main()
