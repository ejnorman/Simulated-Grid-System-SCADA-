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
    """
    from .alarms import alarms

    # Scenario 1 — Under-frequency: auto-increase generation on generator 0
    freq_alarm = alarms.get("freq_out_of_range")
    if freq_alarm and freq_alarm["severity"] == "critical" and not freq_alarm.get("cleared_at"):
        current_freq = freq_alarm["value"]
        deficit_mw = (60.0 - current_freq) * SCALING_FACTOR
        httpx.post(f"{SIMULATION_URL}/control", json={
            "command_type": "adjust_generation",
            "target": {"generator_id": 0, "delta_mw": deficit_mw},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        print(f"[auto-control] Under-frequency response: +{deficit_mw:.1f} MW to generator 0")

    # Scenario 2 — Line overload: alert only, do NOT auto-trip (safety requirement)
    for alarm in alarms.values():
        if (alarm.get("metric") == "line_loading_pct"
                and alarm["severity"] == "critical"
                and not alarm.get("cleared_at")):
            print(f"[auto-control] Line overload alert (operator action required): {alarm['id']}")
