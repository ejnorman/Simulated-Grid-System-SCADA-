from datetime import datetime, timezone

# alarm_id → alarm dict
alarms: dict[str, dict] = {}

def _now():
    return datetime.now(timezone.utc).isoformat()

def create_alarm(
    alarm_id: str,
    severity: str,
    message: str,
    metric: str,
    value: float,
    threshold: float,
) -> dict:
    existing = alarms.get(alarm_id)

    # Stable alarm_id means the same ongoing condition won't generate duplicates on every poll.
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
    alarm = alarms.get(alarm_id)

    if not alarm:
        return None

    # Only stamp cleared_at once — don't overwrite if already cleared.
    if alarm["cleared_at"] is None:
        alarm["cleared_at"] = _now()

    return alarm


def acknowledge(alarm_id: str, operator: str):
    alarm = alarms.get(alarm_id)

    if not alarm:
        return None

    alarm["acknowledged"] = True
    alarm["acknowledged_by"] = operator
    alarm["acknowledged_at"] = _now() 

    return alarm
