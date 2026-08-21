from fastapi import APIRouter, Request, Query
from backend.core.config import settings
from backend.core.state import ACTIVE_FAULT
from backend.mock_data import load_mock
from backend.shared.schemas import ExplainResponse

router = APIRouter(tags=["explain"])


@router.get("/explain", response_model=ExplainResponse)
async def explain(request: Request, section_id: int = Query(..., ge=1, le=5)):
    if settings.USE_MOCK_DATA:
        data = load_mock("explain.json")
        data["section_id"] = section_id
        if section_id == ACTIVE_FAULT["section_id"]:
            data["fault_type"] = ACTIVE_FAULT["fault_type"]
        return data
    return request.app.state.inference.get_explain(section_id)
