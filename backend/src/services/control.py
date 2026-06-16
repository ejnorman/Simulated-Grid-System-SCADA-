import httpx
from datetime import datetime, timezone
from ..config import SIMULATION_URL

def handle_critical_alarms():
    from .alarms import alarms

    # Line overloads are alert-only — do NOT auto-trip (safety requirement).
    for alarm in alarms.values():
        if (alarm.get("metric") == "line_loading_pct"
                and alarm["severity"] == "critical"
                and not alarm.get("cleared_at")):
            print(f"[auto-control] Line overload alert (operator action required): {alarm['id']}")
