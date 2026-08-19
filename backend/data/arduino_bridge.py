"""
GridSentinel — Arduino Serial Bridge
=====================================
Reads JSON lines from TFR and ERT Arduino units over USB serial.
Parses them and pushes to TimescaleDB via the FastAPI backend.

Usage:
    # Real hardware connected:
    python serial_bridge.py

    # Mock mode (no Arduino needed — for Dev A during development):
    ARDUINO_MOCK=true python serial_bridge.py

Environment variables (set in backend/.env):
    ARDUINO_PORT_TFR   = /dev/ttyUSB0    (TFR Arduino)
    ARDUINO_PORT_ERT   = /dev/ttyUSB1    (ERT Arduino)
    ARDUINO_BAUD       = 9600
    ARDUINO_MOCK       = false
    API_BASE_URL       = http://localhost:8000
"""

import os
import json
import time
import math
import random
import threading
import requests
import logging
from datetime import datetime, timezone
from typing import Optional

try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("serial_bridge")

# ── Config from environment ───────────────────────────────────────────────────
ARDUINO_PORT_TFR = os.getenv("ARDUINO_PORT_TFR", "/dev/ttyUSB0")
ARDUINO_PORT_ERT = os.getenv("ARDUINO_PORT_ERT", "/dev/ttyUSB1")
ARDUINO_BAUD     = int(os.getenv("ARDUINO_BAUD", "9600"))
ARDUINO_MOCK     = os.getenv("ARDUINO_MOCK", "true").lower() == "true"
API_BASE_URL     = os.getenv("API_BASE_URL", "http://localhost:8000")

# ── API endpoints the bridge POSTs to ────────────────────────────────────────
ENDPOINT_TFR = f"{API_BASE_URL}/api/terrashield/ingest/tfr"
ENDPOINT_ERT = f"{API_BASE_URL}/api/terrashield/ingest/ert"


# ═════════════════════════════════════════════════════════════════════════════
#  DATA VALIDATORS
#  Ensure data from Arduino is sane before sending upstream.
# ═════════════════════════════════════════════════════════════════════════════

def validate_tfr(payload: dict) -> bool:
    """Returns True if TFR JSON from Arduino is valid and in physical range."""
    required = {"device", "tower_id", "tfr_ohm", "status", "current_mA"}
    if not required.issubset(payload.keys()):
        log.warning("TFR packet missing fields: %s", payload)
        return False
    if not (0.0 <= payload["tfr_ohm"] <= 999.0):
        log.warning("TFR resistance out of range: %.2f Ω", payload["tfr_ohm"])
        return False
    if payload["status"] not in ("HEALTHY", "WARNING", "CRITICAL"):
        log.warning("TFR unknown status: %s", payload["status"])
        return False
    return True


def validate_ert(payload: dict) -> bool:
    """Returns True if ERT JSON from Arduino is valid."""
    required = {"device", "tower_id", "status", "depths", "current_mA"}
    if not required.issubset(payload.keys()):
        log.warning("ERT packet missing fields: %s", payload)
        return False
    if not isinstance(payload["depths"], list) or len(payload["depths"]) == 0:
        log.warning("ERT depths array empty")
        return False
    for depth in payload["depths"]:
        if "rho_ohm_m" not in depth or not (0.0 <= depth["rho_ohm_m"] <= 5000.0):
            log.warning("ERT rho out of range: %s", depth)
            return False
    return True


# ═════════════════════════════════════════════════════════════════════════════
#  PAYLOAD ENRICHMENT
#  Add server-side timestamp before sending to API.
# ═════════════════════════════════════════════════════════════════════════════

def enrich(payload: dict) -> dict:
    payload["received_at"] = datetime.now(timezone.utc).isoformat()
    return payload


# ═════════════════════════════════════════════════════════════════════════════
#  API PUSH
# ═════════════════════════════════════════════════════════════════════════════

def push_to_api(endpoint: str, payload: dict) -> bool:
    """POST enriched payload to the FastAPI backend. Returns True on success."""
    try:
        r = requests.post(endpoint, json=payload, timeout=3)
        if r.status_code == 200:
            log.info("✓ Pushed to %s — tower %s", endpoint.split("/")[-1], payload.get("tower_id"))
            return True
        else:
            log.error("API returned %d: %s", r.status_code, r.text[:100])
            return False
    except requests.exceptions.ConnectionError:
        log.warning("API not reachable at %s — will retry next cycle", API_BASE_URL)
        return False
    except Exception as e:
        log.error("Unexpected push error: %s", e)
        return False


# ═════════════════════════════════════════════════════════════════════════════
#  REAL HARDWARE READER
#  Runs in a thread. Reads one serial port, parses JSON lines.
# ═════════════════════════════════════════════════════════════════════════════

def read_serial_port(port: str, device_type: str, endpoint: str):
    """
    Continuously reads JSON lines from `port`.
    `device_type` is "TFR" or "ERT" — used only for logging.
    """
    if not SERIAL_AVAILABLE:
        log.error("pyserial not installed. Run: pip install pyserial")
        return

    validator = validate_tfr if device_type == "TFR" else validate_ert

    while True:
        try:
            log.info("Opening %s port: %s @ %d baud", device_type, port, ARDUINO_BAUD)
            with serial.Serial(port, ARDUINO_BAUD, timeout=5) as ser:
                log.info("%s connected on %s", device_type, port)
                while True:
                    raw_line = ser.readline().decode("utf-8", errors="ignore").strip()
                    if not raw_line or not raw_line.startswith("{"):
                        continue  # skip boot messages and blank lines

                    try:
                        payload = json.loads(raw_line)
                    except json.JSONDecodeError:
                        log.warning("Non-JSON line from %s: %s", device_type, raw_line[:80])
                        continue

                    log.debug("%s raw: %s", device_type, payload)

                    if validator(payload):
                        push_to_api(endpoint, enrich(payload))

        except serial.SerialException as e:
            log.error("%s serial error on %s: %s — retrying in 5s", device_type, port, e)
            time.sleep(5)
        except Exception as e:
            log.error("Unexpected error in %s reader: %s", device_type, e)
            time.sleep(5)


# ═════════════════════════════════════════════════════════════════════════════
#  MOCK SIMULATOR
#  Generates realistic TFR + ERT readings when ARDUINO_MOCK=true.
#  Simulates corrosion progression on tower T3 over time.
# ═════════════════════════════════════════════════════════════════════════════

class MockTerraShieldSimulator:
    """
    Produces synthetic TFR and ERT readings for all 10 towers.
    Tower T3 has a simulated corrosion progression (TFR drifts from 8Ω → 35Ω
    over 12 hours of runtime, and ERT ρ rises proportionally).
    This allows Dev A to demo the WARNING → CRITICAL escalation path.
    """

    # Tower coordinates (lat, lon) for GIS overlay
    TOWER_COORDS = {
        "T1":  (18.5020, 73.8010), "T2":  (18.5060, 73.8050),
        "T3":  (18.5100, 73.8090), "T4":  (18.5140, 73.8130),
        "T5":  (18.5180, 73.8170), "T6":  (18.5220, 73.8210),
        "T7":  (18.5260, 73.8250), "T8":  (18.5300, 73.8290),
        "T9":  (18.5340, 73.8330), "T10": (18.5380, 73.8370),
    }

    # Baseline TFR values (Ω) — T3 will drift upward
    BASELINE_TFR = {
        "T1": 6.1,  "T2": 8.4,  "T3": 8.0,  "T4": 5.2,  "T5": 7.3,
        "T6": 9.1,  "T7": 4.8,  "T8": 11.5, "T9": 6.7,  "T10": 7.9,
    }

    def __init__(self):
        self._start_time = time.time()
        # T8 starts in WARNING zone to show mixed states from the start
        self.BASELINE_TFR["T8"] = 13.5

    def _corrosion_factor(self) -> float:
        """Returns 0.0 (start) → 1.0 (fully corroded) over 12 simulated hours."""
        elapsed_sec = time.time() - self._start_time
        simulated_hours = elapsed_sec / 60.0  # 1 real minute = 1 simulated hour
        return min(1.0, simulated_hours / 12.0)

    def get_tfr(self, tower_id: str) -> dict:
        base = self.BASELINE_TFR.get(tower_id, 7.0)
        noise = random.gauss(0, 0.15)

        if tower_id == "T3":
            # Corrosion: drift from base (8Ω) to 35Ω
            extra = 27.0 * self._corrosion_factor()
            tfr = base + extra + noise
        else:
            tfr = base + noise

        tfr = max(0.1, tfr)

        if   tfr < 10.0:  status = "HEALTHY"
        elif tfr < 25.0:  status = "WARNING"
        else:              status = "CRITICAL"

        lat, lon = self.TOWER_COORDS.get(tower_id, (18.50, 73.80))

        return {
            "device":     "TFR",
            "tower_id":   tower_id,
            "tfr_ohm":    round(tfr, 3),
            "status":     status,
            "current_mA": 109.0,
            "lat":        lat,
            "lon":        lon,
        }

    def get_ert(self, tower_id: str) -> dict:
        """Generates a 3-depth ERT profile. Corrosion raises ρ on T3."""
        corr = self._corrosion_factor() if tower_id == "T3" else 0.0

        spacings = [0.20, 0.40, 0.60]
        depths = []
        for s in spacings:
            base_rho = 80.0 + random.gauss(0, 5)  # typical Indian clay soil
            rho = base_rho * (1.0 + corr * 2.5)   # T3: ρ rises 2.5× at full corrosion
            depths.append({
                "spacing_m": s,
                "depth_cm":  round(s * 0.5 * 100, 0),
                "rho_ohm_m": round(rho, 2),
            })

        primary_rho = depths[0]["rho_ohm_m"]
        if   primary_rho < 150: status = "NORMAL"
        elif primary_rho < 300: status = "ANOMALY"
        else:                    status = "CRITICAL"

        lat, lon = self.TOWER_COORDS.get(tower_id, (18.50, 73.80))

        return {
            "device":     "ERT",
            "tower_id":   tower_id,
            "status":     status,
            "depths":     depths,
            "current_mA": 109.0,
            "lat":        lat,
            "lon":        lon,
        }


def run_mock_simulator():
    """Runs the mock simulator, pushing readings for all 10 towers in rotation."""
    simulator = MockTerraShieldSimulator()
    towers = list(MockTerraShieldSimulator.TOWER_COORDS.keys())

    log.info("🟡 MOCK MODE — No Arduino needed. Simulating 10 towers.")
    log.info("   T3 corrosion progression: 8Ω → 35Ω over 12 minutes.")
    log.info("   T8 starts at WARNING (13.5Ω).")

    tower_index = 0

    while True:
        tower_id = towers[tower_index % len(towers)]

        # TFR reading
        tfr_payload = simulator.get_tfr(tower_id)
        if validate_tfr(tfr_payload):
            push_to_api(ENDPOINT_TFR, enrich(tfr_payload))

        time.sleep(0.5)

        # ERT reading (every other cycle to match slower real-hardware cadence)
        if tower_index % 2 == 0:
            ert_payload = simulator.get_ert(tower_id)
            if validate_ert(ert_payload):
                push_to_api(ENDPOINT_ERT, enrich(ert_payload))

        tower_index += 1
        time.sleep(1.5)   # 2s total per tower → full 10-tower cycle in ~20s


# ═════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log.info("GridSentinel Serial Bridge starting...")
    log.info("API target: %s", API_BASE_URL)
    log.info("Mock mode: %s", ARDUINO_MOCK)

    if ARDUINO_MOCK:
        # Single-threaded mock — no hardware needed
        run_mock_simulator()
    else:
        # Two threads: one per serial port
        tfr_thread = threading.Thread(
            target=read_serial_port,
            args=(ARDUINO_PORT_TFR, "TFR", ENDPOINT_TFR),
            daemon=True,
            name="TFR-reader",
        )
        ert_thread = threading.Thread(
            target=read_serial_port,
            args=(ARDUINO_PORT_ERT, "ERT", ENDPOINT_ERT),
            daemon=True,
            name="ERT-reader",
        )

        tfr_thread.start()
        ert_thread.start()

        log.info("Both reader threads started. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            log.info("Bridge stopped by user.")
