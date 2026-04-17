"""
Alarm store — creation, clearing, and retrieval of alarm records.

The alarm dict is module-level so all routes share the same instance.
See docs/reference/backend/src/services/alarms.py for a reference implementation.
"""

from datetime import datetime, timezone

# alarm_id → alarm dict
alarms: dict[str, dict] = {}


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
    raise NotImplementedError


def clear_alarm(alarm_id: str):
    """Mark an alarm as resolved when the condition returns to normal."""
    raise NotImplementedError


def acknowledge(alarm_id: str, operator: str):
    """Mark an alarm as acknowledged by an operator."""
    raise NotImplementedError
