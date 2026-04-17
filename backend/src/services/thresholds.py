"""
Alert threshold definitions and evaluation logic.

See docs/reference/backend/src/services/thresholds.py for a reference implementation.
"""

from .alarms import create_alarm, clear_alarm
from .control import handle_critical_alarms

THRESHOLDS = {
    "frequency": {
        # (low, high) per severity band
        "normal":   (59.95, 60.05),
        "advisory": (59.90, 60.10),
        "warning":  (59.80, 60.20),
    },
    "voltage_pu": {
        "normal":  (0.95, 1.05),
        "warning": (0.93, 1.07),
    },
    "line_loading_pct": {
        "normal":  80.0,   # below → normal
        "warning": 95.0,   # 80–95 → warning, above → critical
    },
    "generator_capacity_pct": {
        "normal":  0.90,   # below 90% capacity → normal
        "warning": 1.00,   # 90–100% → warning, above → overload
    },
}


def check_thresholds(data: dict):
    """
    Evaluate telemetry against THRESHOLDS and update the alarm store.
    Call create_alarm() when a threshold is exceeded, clear_alarm() when normal.
    Call handle_critical_alarms() at the end.

    Check: frequency_hz, each bus voltage_pu, each line loading_percent,
    each generator output_mw vs capacity_mw.
    """
    raise NotImplementedError
