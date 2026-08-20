"""
GridSentinel — Sensor Simulator
=================================
Generates realistic 1-second sensor readings for all 5 feeder sections
when Arduino hardware is not connected (mock mode).

Used by:
  - backend/ml/inference.py → WebSocket live stream
  - backend/data/arduino_bridge.py → TerraShield mock
"""

import math
import random
import time
from datetime import datetime, timezone
from dataclasses import dataclass


@dataclass
class SensorReading:
    section_id:    int
    timestamp:     datetime
    voltage_pu:    float
    current_A:     float
    temp_C:        float
    thd_pct:       float
    power_factor:  float
    anomaly_score: float


# Normal operating parameters per section
_SECTION_PARAMS = {
    1: {"v": 1.021, "i": 155, "t": 52, "thd": 3.2, "pf": 0.94},
    2: {"v": 1.008, "i": 178, "t": 55, "thd": 3.5, "pf": 0.93},
    3: {"v": 0.993, "i": 192, "t": 58, "thd": 4.0, "pf": 0.91},
    4: {"v": 0.981, "i": 165, "t": 54, "thd": 3.8, "pf": 0.92},
    5: {"v": 0.974, "i": 145, "t": 50, "thd": 3.3, "pf": 0.93},
}

# Fault signatures: (v_mult, i_mult, t_add, thd_mult, pf_mult)
_FAULT_SIG = {
    "conductor_damage":     (0.55, 2.80, 2.0,  3.5, 0.78),
    "transformer_overload": (0.84, 1.55, 28.0, 1.8, 0.84),
    "vegetation_contact":   (0.78, 1.85, 1.5,  4.2, 0.80),
    "illegal_tap":          (0.91, 1.32, 1.0,  1.3, 0.87),
    "grounding_fault":      (0.70, 2.10, 3.0,  3.0, 0.76),
}

NORMAL_ANOMALY_SCORE = 0.30    # typical reconstruction error in normal state
FAULT_ANOMALY_SCORE  = 4.82    # typical score when fault active (> threshold)


class SensorSimulator:
    """
    Thread-safe sensor reading generator.
    Call set_fault(section_id, fault_type) to inject a demo fault.
    Call clear_fault(section_id) to restore normal operation.
    """

    def __init__(self):
        self._t            = 0
        self._fault_map: dict[int, str] = {}   # section_id → fault_type

    def set_fault(self, section_id: int, fault_type: str) -> None:
        self._fault_map[section_id] = fault_type

    def clear_fault(self, section_id: int) -> None:
        self._fault_map.pop(section_id, None)

    def clear_all(self) -> None:
        self._fault_map.clear()

    def get_reading(self, section_id: int) -> SensorReading:
        """
        Returns one synthetic reading for the given section.
        Execution time: < 1ms — safe to call at 1 Hz from WebSocket.
        """
        self._t += 1
        p         = _SECTION_PARAMS.get(section_id, _SECTION_PARAMS[3])
        hour      = datetime.now().hour
        load_f    = 1.0 + 0.35 * math.sin(math.pi * (hour - 6) / 16) if 6 <= hour <= 22 else 0.65
        fault     = self._fault_map.get(section_id)

        if fault and fault in _FAULT_SIG:
            vm, im, ta, thm, pfm = _FAULT_SIG[fault]
            v  = p["v"]   * vm  + random.gauss(0, 0.01)
            i  = p["i"]   * im  * load_f + random.gauss(0, 5)
            t  = p["t"]   + ta  + random.gauss(0, 1)
            th = p["thd"] * thm + random.gauss(0, 0.3)
            pf = p["pf"]  * pfm + random.gauss(0, 0.01)
            sc = FAULT_ANOMALY_SCORE + random.gauss(0, 0.2)
        else:
            drift = 0.005 * math.sin(self._t * 0.05)
            v  = p["v"]   * load_f + drift + random.gauss(0, 0.008)
            i  = p["i"]   * load_f         + random.gauss(0, 8)
            t  = p["t"]   + 0.3 * (28 - 28)+ random.gauss(0, 1.5)
            th = p["thd"]                  + random.gauss(0, 0.2)
            pf = p["pf"]                   + random.gauss(0, 0.008)
            sc = NORMAL_ANOMALY_SCORE      + random.gauss(0, 0.05)

        return SensorReading(
            section_id   = section_id,
            timestamp    = datetime.now(timezone.utc),
            voltage_pu   = round(max(0.0, min(2.0, v)),  5),
            current_A    = round(max(0.0, i),             3),
            temp_C       = round(max(20.0, t),            2),
            thd_pct      = round(max(0.0, min(50.0, th)), 3),
            power_factor = round(max(0.1, min(1.0, pf)),  4),
            anomaly_score= round(max(0.0, sc),            4),
        )
