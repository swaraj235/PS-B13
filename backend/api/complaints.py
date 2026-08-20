from fastapi import APIRouter
from backend.shared.schemas import ComplaintRequest, ComplaintResponse
from datetime import datetime, timezone

router = APIRouter(tags=["complaints"])

_complaint_id_counter = 0
_complaints_store: list[dict] = []

VILLAGE_SECTION_MAP = {
    "kothrud": 1, "warje": 1,
    "paud": 2, "bhugaon": 2,
    "vadgaon": 3, "pirangut": 3, "bavdhan": 3,
    "mulshi": 4, "lavad": 4,
    "tamhini": 5, "donaje": 5,
}


@router.post("/complaints", response_model=ComplaintResponse)
async def submit_complaint(body: ComplaintRequest):
    global _complaint_id_counter
    _complaint_id_counter += 1

    village = body.village or "Unknown"
    section_id = VILLAGE_SECTION_MAP.get(village.lower(), 3)

    response = ComplaintResponse(
        id=_complaint_id_counter,
        section_id=section_id,
        village=village,
        submitted_at=datetime.now(timezone.utc),
        acknowledged=True,
    )
    _complaints_store.append(response.model_dump())
    return response


@router.get("/complaints")
async def get_complaints():
    return {"complaints": _complaints_store}
