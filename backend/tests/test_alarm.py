import pytest

from src.services.alarms import alarms, create_alarm, clear_alarm, acknowledge

# First two def are helper functions to clear and create simple alarms for later tests

@pytest.fixture(autouse=True)
def clear_alarms():
    alarms.clear()
    yield
    alarms.clear()

def _make_alarm(alarm_id="freq_out_of_range", severity="critical"):
    return create_alarm(
        alarm_id,
        severity,
        "Frequency critical",
        "frequency_hz",
        59.7,
        59.8,
    )

def test_create_alarm_adds_alarm_to_store():
    alarm = create_alarm(
        "freq_out_of_range",
        "critical",
        "Frequency critical",
        "frequency_hz",
        59.7,
        59.8,
    )

    assert alarm["id"] == "freq_out_of_range"
    assert alarm["severity"] == "critical"
    assert alarm["message"] == "Frequency critical"
    assert alarm["metric"] == "frequency_hz"
    assert alarm["value"] == 59.7
    assert alarm["threshold"] == 59.8
    assert alarm["acknowledged"] is False
    assert alarm["acknowledged_by"] is None
    assert alarm["acknowledged_at"] is None
    assert alarm["cleared_at"] is None
    assert "timestamp" in alarm

    assert "freq_out_of_range" in alarms


def test_create_alarm_prevents_duplicate_active_alarm():
    first_alarm = create_alarm(
        "freq_out_of_range", "critical", "First message", "frequency_hz", 59.7, 59.8,
    )
    second_alarm = create_alarm(
        "freq_out_of_range", "critical", "Second message", "frequency_hz", 59.6, 59.8,
    )

    assert second_alarm is first_alarm
    assert alarms["freq_out_of_range"]["message"] == "First message"


def test_create_alarm_does_not_upgrade_severity_while_active():
    _make_alarm(severity="warning")
    create_alarm(
        "freq_out_of_range", "critical", "Now critical", "frequency_hz", 59.7, 59.8,
    )

    assert alarms["freq_out_of_range"]["severity"] == "warning"


def test_create_alarm_after_cleared_creates_fresh_alarm():
    _make_alarm()
    clear_alarm("freq_out_of_range")

    new_alarm = create_alarm(
        "freq_out_of_range", "warning", "Re-raised", "frequency_hz", 59.85, 59.90,
    )

    assert new_alarm["severity"] == "warning"
    assert new_alarm["message"] == "Re-raised"
    assert new_alarm["cleared_at"] is None
    assert alarms["freq_out_of_range"] is new_alarm

def test_clear_alarm_sets_cleared_at():
    _make_alarm()

    alarm = clear_alarm("freq_out_of_range")

    assert alarm is not None
    assert alarm["cleared_at"] is not None


def test_clear_alarm_is_idempotent():
    _make_alarm()
    first_result = clear_alarm("freq_out_of_range")
    first_timestamp = first_result["cleared_at"]

    second_result = clear_alarm("freq_out_of_range")

    assert second_result["cleared_at"] == first_timestamp


def test_clear_alarm_returns_none_if_alarm_does_not_exist():
    result = clear_alarm("missing_alarm")

    assert result is None

def test_acknowledge_updates_acknowledged_fields():
    _make_alarm()

    alarm = acknowledge("freq_out_of_range", "operator1")

    assert alarm["acknowledged"] is True
    assert alarm["acknowledged_by"] == "operator1"
    assert alarm["acknowledged_at"] is not None


def test_acknowledge_returns_none_if_alarm_does_not_exist():
    result = acknowledge("missing_alarm", "operator1")

    assert result is None


def test_acknowledge_cleared_alarm_is_allowed():
    _make_alarm()
    clear_alarm("freq_out_of_range")

    alarm = acknowledge("freq_out_of_range", "operator1")

    assert alarm is not None
    assert alarm["acknowledged"] is True
    assert alarm["cleared_at"] is not None