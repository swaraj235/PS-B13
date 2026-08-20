from fastapi import APIRouter, Request
from backend.core.config import settings
from backend.mock_data import load_mock
from backend.shared.schemas import TerraShieldResponse, TowerReading

router = APIRouter(tags=["terrashield"])


@router.get("/terrashield/status", response_model=TerraShieldResponse)
async def terrashield_status(request: Request):
    if settings.USE_MOCK_DATA:
        return load_mock("terrashield.json")
    return request.app.state.inference.get_terrashield()


@router.post("/terrashield/mock", response_model=TowerReading)
async def terrashield_mock(body: dict):
    """Update one tower mock value for demo purposes."""
    mock = load_mock("terrashield.json")
    for tower in mock["towers"]:
        if tower["id"] == body.get("tower_id"):
            tower["tfr_ohm"] = body.get("tfr_ohm", tower["tfr_ohm"])
            tower["ert_anomaly"] = tower["tfr_ohm"] >= 10
            if tower["tfr_ohm"] < 10:
                tower["status"] = "normal"
            elif tower["tfr_ohm"] < 25:
                tower["status"] = "warning"
            else:
                tower["status"] = "critical"
            return tower
    return {"error": "Tower not found"}
