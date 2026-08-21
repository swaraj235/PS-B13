from fastapi import APIRouter, HTTPException
from backend.shared.schemas import ComplaintRequest, ComplaintResponse
from datetime import datetime, timezone

router = APIRouter(tags=["complaints"])

_complaint_id_counter = 0
_complaints_store: list[dict] = []

# Map common Pune area names -> feeder section
VILLAGE_SECTION_MAP = {
    # Section 1 — Kothrud / Warje feeder
    "kothrud": 1, "warje": 1, "karve nagar": 1, "erandwane": 1,
    # Section 2 — Paud / Bhugaon feeder
    "paud": 2, "bhugaon": 2, "bavdhan khurd": 2,
    # Section 3 — Vadgaon / Pirangut / Bavdhan feeder
    "vadgaon": 3, "pirangut": 3, "bavdhan": 3, "kondhwa": 3,
    "kondhwa budruk": 3, "kondhwa khurd": 3, "undri": 3, "pisoli": 3,
    # Section 4 — Mulshi feeder
    "mulshi": 4, "lavad": 4, "pabe": 4,
    # Section 5 — Tamhini / Donaje feeder
    "tamhini": 5, "donaje": 5, "velha": 5,
}


@router.post("/complaints", response_model=ComplaintResponse)
async def submit_complaint(body: ComplaintRequest):
    global _complaint_id_counter
    _complaint_id_counter += 1

    village = (body.village or "Unknown").strip()
    # Match section by village name (case-insensitive prefix match)
    section_id = 3  # default
    vl = village.lower()
    for key, sec in VILLAGE_SECTION_MAP.items():
        if key in vl or vl in key:
            section_id = sec
            break

    complaint = ComplaintResponse(
        id=_complaint_id_counter,
        section_id=section_id,
        village=village,
        submitted_at=datetime.now(timezone.utc),
        acknowledged=False,   # Always starts as Pending
    )
    _complaints_store.append(complaint.model_dump())
    return complaint


@router.patch("/complaints/{complaint_id}/acknowledge", response_model=ComplaintResponse)
async def acknowledge_complaint(complaint_id: int):
    for c in _complaints_store:
        if c["id"] == complaint_id:
            c["acknowledged"] = True
            return ComplaintResponse(**c)
    raise HTTPException(status_code=404, detail="Complaint not found")


@router.get("/complaints")
async def get_complaints():
    return {"complaints": list(reversed(_complaints_store))}
