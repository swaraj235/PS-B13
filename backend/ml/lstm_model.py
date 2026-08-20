"""
GridSentinel — LSTM Autoencoder Model Class
============================================
Importable by both train_lstm.py (training) and inference.py (serving).
Must match the architecture used during training exactly.
"""

import torch
import torch.nn as nn

N_FEATURES  = 5    # voltage_pu, current_A, temp_C, thd_pct, power_factor
SEQ_LEN     = 60
HIDDEN_DIM  = 64
LATENT_DIM  = 16
DROPOUT     = 0.2


class LSTMAutoencoder(nn.Module):
    """
    Encoder: LSTM(64) → LSTM(32) → Dense(16) latent vector
    Decoder: expand → LSTM(32) → LSTM(64) → Dense(5) reconstruction

    Training: MSE on NORMAL data only.
    Inference: anomaly_score = rolling MSE(reconstruction, input)
               anomaly_score > threshold → fault alert
    """

    def __init__(self):
        super().__init__()

        # ── Encoder ───────────────────────────────────────────────────────────
        self.encoder = nn.LSTM(N_FEATURES,       HIDDEN_DIM,     batch_first=True)
        self.enc2    = nn.LSTM(HIDDEN_DIM,        HIDDEN_DIM // 2, batch_first=True)
        self.latent  = nn.Linear(HIDDEN_DIM // 2, LATENT_DIM)
        self.dropout = nn.Dropout(DROPOUT)

        # ── Decoder ───────────────────────────────────────────────────────────
        self.dec_expand = nn.Linear(LATENT_DIM,   HIDDEN_DIM // 2)
        self.decoder    = nn.LSTM(HIDDEN_DIM // 2, HIDDEN_DIM,    batch_first=True)
        self.dec2       = nn.LSTM(HIDDEN_DIM,       HIDDEN_DIM,    batch_first=True)
        self.output     = nn.Linear(HIDDEN_DIM, N_FEATURES)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x     : (batch, SEQ_LEN, N_FEATURES)
        return: (batch, SEQ_LEN, N_FEATURES) — reconstructed sequence
        """
        # Encode
        out, _ = self.encoder(x)
        out     = self.dropout(out)
        out, _ = self.enc2(out)
        z       = self.latent(out[:, -1, :])            # (B, LATENT_DIM)

        # Decode
        z_exp   = self.dec_expand(z).unsqueeze(1)       # (B, 1, H//2)
        z_rep   = z_exp.repeat(1, SEQ_LEN, 1)           # (B, T, H//2)
        out, _ = self.decoder(z_rep)
        out, _ = self.dec2(out)
        recon   = self.output(out)                      # (B, T, N_FEATURES)
        return recon

    def anomaly_score(self, x: torch.Tensor) -> torch.Tensor:
        """
        Convenience method for inference.
        x      : (batch, SEQ_LEN, N_FEATURES)
        returns: (batch,) — per-sample MSE reconstruction error
        """
        with torch.no_grad():
            recon = self.forward(x)
            score = ((recon - x) ** 2).mean(dim=[1, 2])
        return score
