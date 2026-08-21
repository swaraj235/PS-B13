from enum import Enum


class FaultType(str, Enum):
    CONDUCTOR_DAMAGE     = "conductor_damage"
    TRANSFORMER_OVERLOAD = "transformer_overload"
    VEGETATION_CONTACT   = "vegetation_contact"
    ILLEGAL_TAP          = "illegal_tap"
    GROUNDING_FAULT      = "grounding_fault"
    NORMAL               = "normal"


class SectionStatus(str, Enum):
    NORMAL   = "normal"    # fault_probability < 0.40
    WARNING  = "warning"   # 0.40 <= fault_probability < 0.70
    CRITICAL = "critical"  # fault_probability >= 0.70


class TowerStatus(str, Enum):
    NORMAL   = "normal"    # tfr_ohm < 10
    WARNING  = "warning"   # 10 <= tfr_ohm < 25
    CRITICAL = "critical"  # tfr_ohm >= 25


class WSMessageType(str, Enum):
    SENSOR_READING = "sensor_reading"
    FAULT_ALERT    = "fault_alert"
    HEARTBEAT      = "heartbeat"


SECTION_IDS = [1, 2, 3, 4, 5]

# Feeder GeoJSON coordinates (fixed)
SECTION_COORDINATES = {
    1: [[73.800, 18.500], [73.820, 18.515]],
    2: [[73.820, 18.515], [73.840, 18.525]],
    3: [[73.840, 18.525], [73.860, 18.535]],
    4: [[73.860, 18.535], [73.880, 18.542]],
    5: [[73.880, 18.542], [73.900, 18.548]],
}

TOWER_IDS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"]
