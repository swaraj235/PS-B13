from fastapi import APIRouter, Request, Query
from backend.core.config import settings
from backend.mock_data import load_mock
from backend.shared.schemas import SwitchingGuideResponse

router = APIRouter(tags=["switching"])


@router.get("/switching/guide", response_model=SwitchingGuideResponse)
async def switching_guide(request: Request, section_id: int = Query(..., ge=1, le=5)):
    if settings.USE_MOCK_DATA:
        data = load_mock("switching.json")
        data["fault_section_id"] = section_id
        return data
    return request.app.state.inference.get_switching_guide(section_id)
