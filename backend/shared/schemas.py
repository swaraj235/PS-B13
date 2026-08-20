from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from backend.shared.constants import FaultType, SectionStatus, TowerStatus, WSMessageType


# ── Sensor Reading ──────────────────────────────────────────────────────────
class SensorReading(BaseModel):
    section_id:    int
    timestamp:     datetime
    voltage_pu:    float = Field(..., ge=0.0, le=2.0)
    current_A:     float = Field(..., ge=0.0)
    temp_C:        float
    thd_pct:       float = Field(..., ge=0.0, le=100.0)
    power_factor:  float = Field(..., ge=0.0, le=1.0)
    anomaly_score: float = Field(..., ge=0.0)


# ── Fault Localization ──────────────────────────────────────────────────────
class SectionResult(BaseModel):
    id:                int
    fault_probability: float = Field(..., ge=0.0, le=1.0)
    status:            SectionStatus


class LocalizeResponse(BaseModel):
    timestamp: datetime
    sections:  List[SectionResult]


# ── Fault Classification ────────────────────────────────────────────────────
class FaultCandidate(BaseModel):
    type:        FaultType
    probability: float = Field(..., ge=0.0, le=1.0)


class ClassifyResponse(BaseModel):
    section_id:   int
    fault_type:   FaultType
    confidence:   float = Field(..., ge=0.0, le=1.0)
    candidates:   List[FaultCandidate]
    triggered_at: datetime


# ── SHAP Explanation ────────────────────────────────────────────────────────
class SHAPReason(BaseModel):
    feature:      str
    feature_key:  str
    contribution: float
    value:        float
    direction:    str  # "increase_risk" or "decrease_risk"


class ExplainResponse(BaseModel):
    section_id:  int
    fault_type:  FaultType
    top_reasons: List[SHAPReason]  # exactly 4
    summary:     str


# ── TerraShield ────────────────────────────────────────────────────────────
class TowerReading(BaseModel):
    id:          str
    tfr_ohm:     float
    ert_anomaly: bool
    status:      TowerStatus
    lat:         float
    lon:         float


class TerraShieldResponse(BaseModel):
    towers:    List[TowerReading]
    timestamp: datetime


# ── GIS ────────────────────────────────────────────────────────────────────
class GISFeatureProperties(BaseModel):
    section_id:        int
    fault_probability: float
    status:            SectionStatus
    village_names:     List[str]


# ── Switching Guide ─────────────────────────────────────────────────────────
class SwitchStep(BaseModel):
    step_number:  int
    action:       str
    switch_id:    str
    safety_check: str
    restores:     List[str]


class SwitchingGuideResponse(BaseModel):
    fault_section_id:           int
    total_steps:                int
    steps:                      List[SwitchStep]
    affected_villages:          List[str]
    estimated_restore_time_min: int


# ── Complaints ──────────────────────────────────────────────────────────────
class ComplaintRequest(BaseModel):
    text:    str = Field(..., min_length=5, max_length=500)
    village: Optional[str] = None
    phone:   Optional[str] = None


class ComplaintResponse(BaseModel):
    id:           int
    section_id:   int
    village:      str
    submitted_at: datetime
    acknowledged: bool


# ── Fault Inject (Demo only) ────────────────────────────────────────────────
class FaultInjectRequest(BaseModel):
    section_id: int = Field(..., ge=1, le=5)
    fault_type: FaultType


class FaultInjectResponse(BaseModel):
    status:       str
    section_id:   int
    fault_type:   FaultType
    triggered_at: datetime


# ── Error Shape ─────────────────────────────────────────────────────────────
class ErrorResponse(BaseModel):
    error_code: str
    message:    str
    detail:     Optional[str] = None


# ── WebSocket Messages ──────────────────────────────────────────────────────
class WSMessage(BaseModel):
    type: WSMessageType


class WSSensorMessage(WSMessage):
    type: WSMessageType = WSMessageType.SENSOR_READING
    data: SensorReading


class WSAlertMessage(WSMessage):
    type: WSMessageType = WSMessageType.FAULT_ALERT
    data: ClassifyResponse


class WSHeartbeat(WSMessage):
    type:       WSMessageType = WSMessageType.HEARTBEAT
    uptime_sec: int
