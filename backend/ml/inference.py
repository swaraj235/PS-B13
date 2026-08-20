"""
backend/ml/inference.py
========================
THE interface Dev A calls. Dev B owns all implementations.

Dev A only imports GridSentinelInference from this module and calls:
  - load_models()
  - get_localize()
  - get_classify(section_id)
  - get_explain(section_id)
  - get_terrashield()
  - get_switching_guide(section_id)
  - get_latest_reading(section_id)
  - inject_fault(section_id, fault_type)
"""

from backend.shared.schemas import (
    LocalizeResponse, ClassifyResponse, ExplainResponse,
    TerraShieldResponse, SensorReading, SwitchingGuideResponse,
)


class GridSentinelInference:
    """
    Singleton loaded once at FastAPI startup via lifespan event.
    Dev A accesses it via: app.state.inference
    Dev B fills in all method bodies below.
    """

    def load_models(self) -> None:
        """Load all .pt and .pkl files from ml/models/. Raise RuntimeError if any missing."""
        raise NotImplementedError("Dev B: implement load_models()")

    def get_localize(self) -> LocalizeResponse:
        """
        Run T-GAT on latest 30-timestep window for all 5 sections.
        Returns fault probability per section.
        Never raises — returns last known state if model errors.
        """
        raise NotImplementedError("Dev B: implement get_localize()")

    def get_classify(self, section_id: int) -> ClassifyResponse:
        """
        Run XGBoost classifier for the given section.
        section_id must be in [1..5], else raise ValueError.
        """
        raise NotImplementedError("Dev B: implement get_classify()")

    def get_explain(self, section_id: int) -> ExplainResponse:
        """
        Run SHAP on XGBoost output for section_id.
        Returns exactly 4 SHAPReason items.
        """
        raise NotImplementedError("Dev B: implement get_explain()")

    def get_terrashield(self) -> TerraShieldResponse:
        """
        Return latest TFR/ERT readings for all 10 towers.
        Falls back to simulated data if Arduino not connected.
        """
        raise NotImplementedError("Dev B: implement get_terrashield()")

    def get_switching_guide(self, section_id: int) -> SwitchingGuideResponse:
        """
        Run Dijkstra restoration planner for the given fault section.
        """
        raise NotImplementedError("Dev B: implement get_switching_guide()")

    def get_latest_reading(self, section_id: int) -> SensorReading:
        """
        Return the most recent 1-second sensor reading for WebSocket stream.
        Must return in < 50ms.
        """
        raise NotImplementedError("Dev B: implement get_latest_reading()")

    def inject_fault(self, section_id: int, fault_type: str) -> None:
        """
        Override the next N readings to simulate a fault. Used for demo only.
        Does NOT persist to DB.
        """
        raise NotImplementedError("Dev B: implement inject_fault()")
