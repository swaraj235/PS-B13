"""
GridSentinel — T-GAT Model Class
==================================
Importable by both train_tgat.py (training) and inference.py (serving).
Architecture must match training script exactly.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

NUM_NODES       = 5
WINDOW_MIN      = 30
NUM_NODE_FEAT   = 11
NUM_EDGE_FEAT   = 3
NUM_FAULT_TYPES = 6
TEMPORAL_DIM    = 32
GAT_HIDDEN      = 64
GAT_HEADS_1     = 8
GAT_HEADS_2     = 4
DROPOUT         = 0.3


class TemporalEncoder(nn.Module):
    """Per-node 1D CNN that encodes a 30-step sequence into a 32-dim embedding."""

    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv1d(NUM_NODE_FEAT, 32,          kernel_size=3, padding=1)
        self.conv2 = nn.Conv1d(32,            TEMPORAL_DIM, kernel_size=3, padding=1)
        self.norm  = nn.LayerNorm(TEMPORAL_DIM)
        self.drop  = nn.Dropout(DROPOUT)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x   : (B*N, T, F)
        out : (B*N, TEMPORAL_DIM)
        """
        x = x.permute(0, 2, 1)                 # → (B*N, F, T)
        x = F.relu(self.conv1(x))
        x = F.relu(self.conv2(x))
        x = x.mean(dim=2)                      # global avg pool over time
        return self.drop(self.norm(x))


class TGAT(nn.Module):
    """
    Temporal Graph Attention Network for feeder fault localization.

    Input:
        x          : (total_nodes, WINDOW_MIN * NUM_NODE_FEAT)  — flattened
        edge_index : (2, E)
        edge_attr  : (E, 3)

    Output:
        fault_logit : (total_nodes,)       — sigmoid → P(fault)
        type_logit  : (total_nodes, 6)     — softmax → fault type probabilities
    """

    def __init__(self):
        super().__init__()

        try:
            from torch_geometric.nn import GATConv
        except ImportError:
            raise ImportError("torch-geometric required. Run: pip install torch-geometric")

        self.temporal_enc = TemporalEncoder()

        self.gat1 = GATConv(
            TEMPORAL_DIM, GAT_HIDDEN // GAT_HEADS_1,
            heads=GAT_HEADS_1, dropout=DROPOUT,
            edge_dim=NUM_EDGE_FEAT, concat=True,
        )

        self.gat2 = GATConv(
            GAT_HIDDEN, GAT_HIDDEN // GAT_HEADS_2,
            heads=GAT_HEADS_2, dropout=DROPOUT,
            edge_dim=NUM_EDGE_FEAT, concat=True,
        )

        self.norm1 = nn.LayerNorm(GAT_HIDDEN)
        self.norm2 = nn.LayerNorm(GAT_HIDDEN)
        self.drop  = nn.Dropout(DROPOUT)

        # +2 for TerraShield features (tfr_risk, ert_flag)
        self.fusion = nn.Linear(GAT_HIDDEN + 2, GAT_HIDDEN)

        self.fault_prob_head = nn.Sequential(
            nn.Linear(GAT_HIDDEN, 16), nn.ReLU(),
            nn.Linear(16, 1),
        )
        self.fault_type_head = nn.Sequential(
            nn.Linear(GAT_HIDDEN, 16), nn.ReLU(),
            nn.Linear(16, NUM_FAULT_TYPES),
        )

    def forward(self, x, edge_index, edge_attr,
                tfr_risk=None, ert_flag=None, batch=None):
        B_N = x.shape[0]

        x_seq = x.view(B_N, WINDOW_MIN, NUM_NODE_FEAT)
        t_emb = self.temporal_enc(x_seq)

        h1 = F.elu(self.gat1(t_emb, edge_index, edge_attr=edge_attr))
        h1 = self.norm1(h1)

        h2 = F.elu(self.gat2(h1, edge_index, edge_attr=edge_attr))
        h2 = self.norm2(h2 + h1)
        h2 = self.drop(h2)

        ts = (torch.cat([tfr_risk, ert_flag], dim=-1)
              if tfr_risk is not None and ert_flag is not None
              else torch.zeros(B_N, 2, device=x.device))

        h3           = F.relu(self.fusion(torch.cat([h2, ts], dim=-1)))
        fault_logit  = self.fault_prob_head(h3).squeeze(-1)
        type_logit   = self.fault_type_head(h3)

        return fault_logit, type_logit
