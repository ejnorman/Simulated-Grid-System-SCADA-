"""
Automatic control loop — responds to critical alarm conditions.

See docs/reference/backend/src/services/control.py for a reference implementation.

Three scenarios to handle (per PROJECT_CONTEXT.md):
  1. Under-frequency (freq < 59.80 Hz) — auto-increase generation
  2. Line overload > 95%              — alert operator only, do NOT auto-trip
  3. Generator trip                   — redistribute lost MW across remaining generators
"""

import httpx
from datetime import datetime, timezone
from ..config import SIMULATION_URL

SCALING_FACTOR = 50  # MW per Hz of frequency deviation


def handle_critical_alarms():
    """
    Inspect the active alarm store and issue automatic control commands where required.
    Frequency auto-response is intentionally disabled — recovery is operator-driven
    (manual MW ramp) or governor-driven (UI toggle). Line overloads are alert-only.
    """
    from .alarms import alarms

    # Line overload: alert only, do NOT auto-trip (safety requirement)
    for alarm in alarms.values():
        if (alarm.get("metric") == "line_loading_pct"
                and alarm["severity"] == "critical"
                and not alarm.get("cleared_at")):
            print(f"[auto-control] Line overload alert (operator action required): {alarm['id']}")
