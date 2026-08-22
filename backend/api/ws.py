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
    """Generate a realistic live sensor reading for physics-informed inference."""
    target_sec = ACTIVE_FAULT["section_id"] if ACTIVE_FAULT.get("active", True) else 0
    is_fault = (section_id == target_sec)
    is_adjacent = (target_sec > 0 and section_id == (target_sec % 5) + 1)

    noise = random.gauss(0, 0.005)
    if is_fault:
        base_v = 0.61
        base_i = 387.0
        base_temp = 71.5
        base_thd = 18.2
        base_pf = 0.71
        base_anom = 4.82
    elif is_adjacent:
        base_v = 0.88 + 0.005 * math.sin(t * 0.1)
        base_i = 245.0
        base_temp = 62.0
        base_thd = 8.5
        base_pf = 0.84
        base_anom = 2.15
    else:
        base_v = 1.00 + 0.008 * math.sin(t * 0.1)
        base_i = 180.0
        base_temp = 55.0
        base_thd = 4.0
        base_pf = 0.92
        base_anom = 0.30

    return {
        "section_id":    section_id,
        "timestamp":     datetime.now(timezone.utc).isoformat(),
        "voltage_pu":    round(max(0.0, base_v + noise), 4),
        "current_A":     round(max(0.0, base_i + random.gauss(0, 4)), 2),
        "temp_C":        round(max(0.0, base_temp + random.gauss(0, 0.8)), 2),
        "thd_pct":       round(max(0.0, base_thd + random.gauss(0, 0.3)), 2),
        "power_factor":  round(min(1.0, max(0.0, base_pf + random.gauss(0, 0.008))), 3),
        "anomaly_score": round(max(0.0, base_anom + random.gauss(0, 0.05)), 3),
    }


def calculate_live_fault_probability(reading: dict) -> float:
    """
    Computes real-time fault risk probability directly from live physical sensor readings:
    - Voltage drop (pu sag from 1.0 pu)
    - Current surge (excess Amps above nominal ~180A)
    - THD (harmonic distortion % above nominal ~4.0%)
    - Temperature rise (°C above nominal ~55.0°C)
    """
    v_pu = reading.get("voltage_pu", 1.0)
    curr = reading.get("current_A", 180.0)
    thd = reading.get("thd_pct", 4.0)
    temp = reading.get("temp_C", 55.0)

    # 1. Voltage sag severity (0 to 1)
    v_sag = max(0.0, (1.0 - v_pu)) / 0.45

    # 2. Current surge severity (0 to 1)
    i_surge = max(0.0, (curr - 180.0)) / 220.0

    # 3. THD waveform distortion severity (0 to 1)
    thd_sev = max(0.0, (thd - 4.0)) / 16.0

    # 4. Thermal rise severity (0 to 1)
    t_rise = max(0.0, (temp - 55.0)) / 25.0

    # Combined physics score weighted by grid risk parameters
    raw_score = 0.40 * v_sag + 0.35 * i_surge + 0.15 * thd_sev + 0.10 * t_rise

    # Add realistic sensor jitter (+- 0.012)
    jitter = random.uniform(-0.012, 0.012)

    final_prob = raw_score + jitter
    return round(min(0.995, max(0.015, final_prob)), 3)


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
