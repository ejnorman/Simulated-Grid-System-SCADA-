"""
Alarm store — creation, clearing, and retrieval of alarm records.

The alarm dict is module-level so all routes share the same instance.
See docs/reference/backend/src/services/alarms.py for a reference implementation.
"""

from datetime import datetime, timezone

# alarm_id → alarm dict
alarms: dict[str, dict] = {}

def _now():
    """Get current UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()

def create_alarm(
    alarm_id: str,
    severity: str,
    message: str,
    metric: str,
    value: float,
    threshold: float,
) -> dict:
    """
    Create a new alarm if one with this ID does not already exist.

    Use a stable alarm_id (e.g. "freq_low", "voltage_bus_5") so the same
    ongoing condition does not generate duplicate alarms on every poll cycle.
    """

    existing = alarms.get(alarm_id)

    # If alarm exists and is still active, return it (prevent duplicate)
    if existing and existing.get("cleared_at") is None:
        return alarms[alarm_id]

    alarm = {
        "id": alarm_id,
        "severity": severity,
        "message": message,
        "metric": metric,
        "value": value,
        "threshold": threshold,
        "timestamp": _now(),
        "cleared_at": None,
        "acknowledged": False,
        "acknowledged_by": None,
        "acknowledged_at": None,
    }


    alarms[alarm_id] = alarm
    return alarm


def clear_alarm(alarm_id: str):
    """Mark an alarm as resolved when the condition returns to normal."""
    alarm = alarms.get(alarm_id)

    # Can't clear alarm that doesn't exist
    if not alarm:
        return None

    # Only set timestamp for newly cleared alarms if not already set.
    if alarm["cleared_at"] is None:
        alarm["cleared_at"] = _now()

    return alarm


def acknowledge(alarm_id: str, operator: str):
    """
    Mark an alarm as acknowledged by an operator.
    
    This means it acknowledges there is an alarm 
    not that its resolved.
    """
    
    alarm = alarms.get(alarm_id)

    # Cannot acknowledge alarms that don't exist
    if not alarm:
        return None

    alarm["acknowledged"] = True
    alarm["acknowledged_by"] = operator
    alarm["acknowledged_at"] = _now() 

    return alarm
