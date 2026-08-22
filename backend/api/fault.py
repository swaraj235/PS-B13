from fastapi import APIRouter, Request, Query
from backend.core.config import settings
from backend.core.state import ACTIVE_FAULT
from backend.mock_data import load_mock
from backend.shared.schemas import LocalizeResponse, ClassifyResponse, FaultInjectRequest, FaultInjectResponse
from datetime import datetime, timezone

from backend.api.ws import _make_sensor, calculate_live_fault_probability

router = APIRouter(tags=["fault"])


@router.get("/fault/localize", response_model=LocalizeResponse)
async def localize(request: Request):
    if not settings.USE_MOCK_DATA and hasattr(request.app.state, "inference"):
        return request.app.state.inference.get_localize()

    sections = []
    t = int(datetime.now().timestamp())
    for sec_id in range(1, 6):
        reading = _make_sensor(sec_id, t)
        prob = calculate_live_fault_probability(reading)

        status = "normal"
        if prob >= 0.70:
            status = "critical"
        elif prob >= 0.35:
            status = "warning"

        sections.append({
            "id": sec_id,
            "fault_probability": prob,
            "status": status
        })

    return LocalizeResponse(
        timestamp=datetime.now(timezone.utc),
        sections=sections
    )


@router.get("/fault/classify", response_model=ClassifyResponse)
async def classify(request: Request, section_id: int = Query(..., ge=1, le=5)):
    if settings.USE_MOCK_DATA:
        data = load_mock("classify.json")
        data["section_id"] = section_id
        if section_id == ACTIVE_FAULT["section_id"] and ACTIVE_FAULT.get("active", True):
            data["fault_type"] = ACTIVE_FAULT["fault_type"]
            data["confidence"] = 0.942
        else:
            data["fault_type"] = "normal"
            data["confidence"] = 0.991
        return data
    return request.app.state.inference.get_classify(section_id)


@router.post("/fault/inject", response_model=FaultInjectResponse)
async def inject_fault(request: Request, body: FaultInjectRequest):
    ACTIVE_FAULT["section_id"] = body.section_id
    ACTIVE_FAULT["fault_type"] = body.fault_type
    ACTIVE_FAULT["active"] = True

    if not settings.USE_MOCK_DATA:
        request.app.state.inference.inject_fault(body.section_id, body.fault_type)

    return FaultInjectResponse(
        status="injected",
        section_id=body.section_id,
        fault_type=body.fault_type,
        triggered_at=datetime.now(timezone.utc),
    )


@router.post("/fault/reset")
async def reset_fault(request: Request):
    ACTIVE_FAULT["active"] = False
    ACTIVE_FAULT["section_id"] = 0
    ACTIVE_FAULT["fault_type"] = "normal"

    return {
        "status": "cleared",
        "timestamp": datetime.now(timezone.utc)
    }
