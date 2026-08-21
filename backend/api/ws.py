import asyncio
import json
import math
import random
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.core.config import settings
from backend.core.state import ACTIVE_FAULT
from backend.mock_data import load_mock

router = APIRouter(tags=["websocket"])

_start_time = datetime.now(timezone.utc)


def _make_sensor(section_id: int, t: int) -> dict:
    """Generate a realistic live sensor reading."""
    is_fault = (section_id == ACTIVE_FAULT["section_id"]) and ACTIVE_FAULT.get("active", True)
    noise = random.gauss(0, 0.005)
    base_voltage = 0.61 if is_fault else (1.0 + 0.01 * math.sin(t * 0.1))
    return {
        "section_id":    section_id,
        "timestamp":     datetime.now(timezone.utc).isoformat(),
        "voltage_pu":    round(max(0.0, base_voltage + noise), 4),
        "current_A":     round((387.0 + random.gauss(0, 5)) if is_fault else (180.0 + random.gauss(0, 10)), 2),
        "temp_C":        round((72.0 + random.gauss(0, 1)) if is_fault else (55.0 + random.gauss(0, 2)), 2),
        "thd_pct":       round((18.0 + random.gauss(0, 0.5)) if is_fault else (4.0 + random.gauss(0, 0.3)), 2),
        "power_factor":  round((0.71 + random.gauss(0, 0.01)) if is_fault else (0.92 + random.gauss(0, 0.01)), 3),
        "anomaly_score": round((4.82 + random.gauss(0, 0.2)) if is_fault else (0.3 + random.gauss(0, 0.05)), 3),
    }


@router.websocket("/ws/live")
async def live_feed(websocket: WebSocket):
    await websocket.accept()
    t = 0
    uptime = 0

    try:
        while True:
            t += 1
            uptime += 1

            # Heartbeat every 5 seconds
            if uptime % 5 == 1:
                await websocket.send_text(json.dumps({
                    "type": "heartbeat",
                    "uptime_sec": uptime
                }))

            # Send sensor readings for all 5 sections
            for section_id in [1, 2, 3, 4, 5]:
                reading = _make_sensor(section_id, t)
                await websocket.send_text(json.dumps({
                    "type": "sensor_reading",
                    "data": reading,
                }))

                # Trigger fault alert when anomaly is high on active fault section
                if reading["anomaly_score"] > settings.ANOMALY_THRESHOLD and section_id == ACTIVE_FAULT["section_id"]:
                    alert_payload = {
                        "section_id": ACTIVE_FAULT["section_id"],
                        "fault_type": ACTIVE_FAULT["fault_type"],
                        "confidence": 0.942,
                        "triggered_at": datetime.now(timezone.utc).isoformat(),
                        "is_anomaly": True
                    }
                    await websocket.send_text(json.dumps({
                        "type": "fault_alert",
                        "data": alert_payload,
                    }))

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
