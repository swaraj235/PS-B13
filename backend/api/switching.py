from fastapi import APIRouter, Request, Query
from backend.core.config import settings
from backend.shared.schemas import SwitchingGuideResponse

router = APIRouter(tags=["switching"])

SECTION_RESTORATION_PLANS = {
    1: {
        "fault_section_id": 1,
        "total_steps": 3,
        "steps": [
            {
                "step_number": 1,
                "action": "Open isolator S1-A at Kothrud substation bus",
                "switch_id": "S1-A",
                "safety_check": "Confirm no back-feed from DG set. Verify phase rotation on 11kV bus.",
                "restores": []
            },
            {
                "step_number": 2,
                "action": "Transfer Kothrud Central load via tie switch S1-B",
                "switch_id": "S1-B",
                "safety_check": "Check thermal rating of S1-B before energizing. Max load 140A.",
                "restores": ["Kothrud Central", "Erandwane"]
            },
            {
                "step_number": 3,
                "action": "Close feeder tie S2-T to restore Karve Nagar and Warje",
                "switch_id": "S2-T",
                "safety_check": "Ensure fault on S1 is cleared before closing S2-T. Check earth continuity.",
                "restores": ["Karve Nagar", "Warje Malwadi"]
            }
        ],
        "affected_villages": ["Kothrud Central", "Karve Nagar", "Warje Malwadi", "Erandwane"],
        "estimated_restore_time_min": 18
    },
    2: {
        "fault_section_id": 2,
        "total_steps": 3,
        "steps": [
            {
                "step_number": 1,
                "action": "Isolate section S2-A at Paud Road substation",
                "switch_id": "S2-A",
                "safety_check": "Verify zero voltage across vacuum circuit breaker S2-A.",
                "restores": []
            },
            {
                "step_number": 2,
                "action": "Close load-break tie S2-B to energize Paud Road & Ideal Colony",
                "switch_id": "S2-B",
                "safety_check": "Confirm voltage balance on feeder 2B.",
                "restores": ["Paud Road", "Ideal Colony"]
            },
            {
                "step_number": 3,
                "action": "Backfeed Bavdhan Khurd & Bhugaon via tie S3-T",
                "switch_id": "S3-T",
                "safety_check": "Inspect transformer ground connection prior to closing tie S3-T.",
                "restores": ["Bavdhan Khurd", "Bhugaon"]
            }
        ],
        "affected_villages": ["Paud Road", "Ideal Colony", "Bavdhan Khurd", "Bhugaon"],
        "estimated_restore_time_min": 22
    },
    3: {
        "fault_section_id": 3,
        "total_steps": 3,
        "steps": [
            {
                "step_number": 1,
                "action": "Open isolator S3-A at Kondhwa substation bus",
                "switch_id": "S3-A",
                "safety_check": "Confirm no back-feed from DG set. Verify phase rotation.",
                "restores": []
            },
            {
                "step_number": 2,
                "action": "Transfer Kondhwa Budruk load via tie switch S4-B",
                "switch_id": "S4-B",
                "safety_check": "Check thermal rating of S4-B before energizing. Max load 120A.",
                "restores": ["Kondhwa Budruk", "NIBM Rd"]
            },
            {
                "step_number": 3,
                "action": "Close feeder tie S5-T to restore Kondhwa Khurd and Undri",
                "switch_id": "S5-T",
                "safety_check": "Ensure fault on S3 is cleared before closing S5-T. Check earth continuity.",
                "restores": ["Kondhwa Khurd", "Undri", "Pisoli"]
            }
        ],
        "affected_villages": ["Kondhwa Budruk", "Kondhwa Khurd", "Undri", "Pisoli", "NIBM Rd"],
        "estimated_restore_time_min": 25
    },
    4: {
        "fault_section_id": 4,
        "total_steps": 3,
        "steps": [
            {
                "step_number": 1,
                "action": "Open breaker S4-A at Hadapsar Industrial Substation",
                "switch_id": "S4-A",
                "safety_check": "Lockout/Tagout industrial high-voltage feeder 4A.",
                "restores": []
            },
            {
                "step_number": 2,
                "action": "Reroute Magarpatta & Amanora load through tie switch S4-B",
                "switch_id": "S4-B",
                "safety_check": "Verify current transformer (CT) secondary is not open-circuited.",
                "restores": ["Magarpatta", "Amanora"]
            },
            {
                "step_number": 3,
                "action": "Energize Hadapsar & Mundhwa via tie S1-T",
                "switch_id": "S1-T",
                "safety_check": "Check line tension and conductor clearance on Mundhwa span.",
                "restores": ["Hadapsar", "Mundhwa Industrial"]
            }
        ],
        "affected_villages": ["Hadapsar", "Magarpatta", "Amanora", "Mundhwa Industrial"],
        "estimated_restore_time_min": 30
    },
    5: {
        "fault_section_id": 5,
        "total_steps": 3,
        "steps": [
            {
                "step_number": 1,
                "action": "Isolate Swargate Central feeder via switch S5-A",
                "switch_id": "S5-A",
                "safety_check": "Ensure Swargate bus coupler is in OPEN position.",
                "restores": []
            },
            {
                "step_number": 2,
                "action": "Transfer Bhavani Peth and Camp Market via tie switch S5-B",
                "switch_id": "S5-B",
                "safety_check": "Check underground cable insulation resistance (Megger test).",
                "restores": ["Bhavani Peth", "Camp Market"]
            },
            {
                "step_number": 3,
                "action": "Close tie S3-T to restore Parvati Hill & Swargate Terminal",
                "switch_id": "S3-T",
                "safety_check": "Verify automatic voltage regulator (AVR) tap position.",
                "restores": ["Parvati Hill", "Swargate Terminal"]
            }
        ],
        "affected_villages": ["Bhavani Peth", "Camp Market", "Parvati Hill", "Swargate Terminal"],
        "estimated_restore_time_min": 15
    }
}


@router.get("/switching/guide", response_model=SwitchingGuideResponse)
async def switching_guide(request: Request, section_id: int = Query(..., ge=1, le=5)):
    if settings.USE_MOCK_DATA:
        plan = SECTION_RESTORATION_PLANS.get(section_id, SECTION_RESTORATION_PLANS[3])
        return plan
    try:
        return request.app.state.inference.get_switching_guide(section_id)
    except Exception:
        plan = SECTION_RESTORATION_PLANS.get(section_id, SECTION_RESTORATION_PLANS[3])
        return plan
