from fastapi import APIRouter, Request, Query
from backend.core.config import settings
from backend.mock_data import load_mock
from backend.shared.schemas import LocalizeResponse, ClassifyResponse, FaultInjectRequest, FaultInjectResponse
from datetime import datetime, timezone

router = APIRouter(tags=["fault"])


@router.get("/fault/localize", response_model=LocalizeResponse)
async def localize(request: Request):
    if settings.USE_MOCK_DATA:
        return load_mock("localize.json")
    return request.app.state.inference.get_localize()


@router.get("/fault/classify", response_model=ClassifyResponse)
async def classify(request: Request, section_id: int = Query(..., ge=1, le=5)):
    if settings.USE_MOCK_DATA:
        data = load_mock("classify.json")
        data["section_id"] = section_id
        return data
    return request.app.state.inference.get_classify(section_id)


@router.post("/fault/inject", response_model=FaultInjectResponse)
async def inject_fault(request: Request, body: FaultInjectRequest):
    if not settings.USE_MOCK_DATA:
        request.app.state.inference.inject_fault(body.section_id, body.fault_type)
    return FaultInjectResponse(
        status="injected",
        section_id=body.section_id,
        fault_type=body.fault_type,
        triggered_at=datetime.now(timezone.utc),
    )
