from fastapi import APIRouter, Request, Query
from backend.core.config import settings
from backend.mock_data import load_mock

router = APIRouter(tags=["gis"])


@router.get("/gis/feeder")
async def gis_feeder():
    return load_mock("fault_overlay.json")


@router.get("/gis/fault-overlay")
async def gis_fault_overlay(request: Request):
    if settings.USE_MOCK_DATA:
        return load_mock("fault_overlay.json")
    # Real: build GeoJSON from inference output
    localize = request.app.state.inference.get_localize()
    return localize


@router.get("/gis/crew-route")
async def gis_crew_route(section_id: int = Query(..., ge=1, le=5)):
    return load_mock("crew_route.json")


@router.get("/villages/affected")
async def villages_affected(section_id: int = Query(..., ge=1, le=5)):
    overlay = load_mock("fault_overlay.json")
    for feature in overlay["features"]:
        if feature["properties"]["section_id"] == section_id:
            return {"villages": feature["properties"]["village_names"]}
    return {"villages": []}
