import pytest

from src.services.alarms import alarms, create_alarm
from src.services.thresholds import check_thresholds

# Helper functions to clear and supress the critial handler from going off during tests
# Normal data helper function allows tests to override the data (like changing warnings to critical tests)

@pytest.fixture(autouse=True)
def clear_alarms():
    alarms.clear()
    yield
    alarms.clear()

@pytest.fixture(autouse=True)
def suppress_critical_handler(monkeypatch):
    monkeypatch.setattr(
        "src.services.thresholds.handle_critical_alarms",
        lambda: None,
    )

def _normal_data(**overrides) -> dict:
    base = {
        "frequency_hz": 60.00,
        "buses": [],
        "lines": [],
        "generators": [],
    }
    base.update(overrides)
    return base


def test_frequency_critical_alarm_created():
    check_thresholds(_normal_data(frequency_hz=59.70))

    assert "freq_out_of_range" in alarms
    assert alarms["freq_out_of_range"]["severity"] == "critical"
    assert alarms["freq_out_of_range"]["metric"] == "frequency_hz"


def test_frequency_warning_alarm_created():
    check_thresholds(_normal_data(frequency_hz=59.85))

    assert "freq_out_of_range" in alarms
    assert alarms["freq_out_of_range"]["severity"] == "warning"


def test_frequency_alarm_clears_when_clearly_normal():
    create_alarm(
        "freq_out_of_range", "critical",
        "Frequency critical", "frequency_hz", 59.70, 59.80,
    )

    check_thresholds(_normal_data(frequency_hz=60.00))

    assert alarms["freq_out_of_range"]["cleared_at"] is not None


def test_frequency_alarm_not_cleared_in_deadband():
    create_alarm(
        "freq_out_of_range", "warning",
        "Frequency warning", "frequency_hz", 59.91, 59.90,
    )

    check_thresholds(_normal_data(frequency_hz=59.92))

    assert alarms["freq_out_of_range"]["cleared_at"] is None


def test_no_alarm_for_normal_frequency():
    check_thresholds(_normal_data(frequency_hz=60.00))

    assert "freq_out_of_range" not in alarms



def test_bus_voltage_critical_alarm_created():
    data = _normal_data(buses=[{"id": 2, "voltage_pu": 0.87}])
    check_thresholds(data)

    assert "voltage_bus_2" in alarms
    assert alarms["voltage_bus_2"]["severity"] == "critical"
    assert alarms["voltage_bus_2"]["metric"] == "voltage_pu"


def test_bus_voltage_warning_alarm_created():
    data = _normal_data(buses=[{"id": 2, "voltage_pu": 0.90}])
    check_thresholds(data)

    assert "voltage_bus_2" in alarms
    assert alarms["voltage_bus_2"]["severity"] == "warning"


def test_bus_voltage_alarm_clears_when_normal():
    create_alarm(
        "voltage_bus_2", "warning",
        "Voltage warning", "voltage_pu", 0.90, 0.92,
    )

    data = _normal_data(buses=[{"id": 2, "voltage_pu": 0.95}])
    check_thresholds(data)

    assert alarms["voltage_bus_2"]["cleared_at"] is not None


def test_bus_voltage_alarm_not_cleared_in_deadband():
    create_alarm(
        "voltage_bus_2", "warning",
        "Voltage warning", "voltage_pu", 0.91, 0.92,
    )

    data = _normal_data(buses=[{"id": 2, "voltage_pu": 0.925}])
    check_thresholds(data)

    assert alarms["voltage_bus_2"]["cleared_at"] is None


def test_generator_bus_voltage_is_skipped():
    data = _normal_data(buses=[{"id": 1, "voltage_pu": 0.80}])
    check_thresholds(data)

    assert "voltage_bus_1" not in alarms


def test_no_alarm_for_normal_bus_voltage():
    data = _normal_data(buses=[{"id": 2, "voltage_pu": 1.00}])
    check_thresholds(data)

    assert "voltage_bus_2" not in alarms



def test_line_loading_critical_alarm_created():
    data = _normal_data(lines=[{"id": 3, "loading_percent": 98.0, "in_service": True}])
    check_thresholds(data)

    assert "loading_line_3" in alarms
    assert alarms["loading_line_3"]["severity"] == "critical"
    assert alarms["loading_line_3"]["metric"] == "line_loading_pct"


def test_line_loading_warning_alarm_created():
    data = _normal_data(lines=[{"id": 3, "loading_percent": 85.0, "in_service": True}])
    check_thresholds(data)

    assert "loading_line_3" in alarms
    assert alarms["loading_line_3"]["severity"] == "warning"


def test_line_out_of_service_clears_alarm():

    create_alarm(
        "loading_line_3", "critical",
        "Line overload critical", "line_loading_pct", 98.0, 95.0,
    )

    data = _normal_data(lines=[{"id": 3, "loading_percent": 98.0, "in_service": False}])
    check_thresholds(data)

    assert alarms["loading_line_3"]["cleared_at"] is not None


def test_line_loading_alarm_clears_when_normal():
    create_alarm(
        "loading_line_3", "warning",
        "Line loading warning", "line_loading_pct", 85.0, 80.0,
    )

    data = _normal_data(lines=[{"id": 3, "loading_percent": 70.0, "in_service": True}])
    check_thresholds(data)

    assert alarms["loading_line_3"]["cleared_at"] is not None


def test_line_loading_alarm_not_cleared_in_deadband():
    create_alarm(
        "loading_line_3", "warning",
        "Line loading warning", "line_loading_pct", 85.0, 80.0,
    )

    data = _normal_data(lines=[{"id": 3, "loading_percent": 78.0, "in_service": True}])
    check_thresholds(data)

    assert alarms["loading_line_3"]["cleared_at"] is None


def test_no_alarm_for_normal_line_loading():
    data = _normal_data(lines=[{"id": 3, "loading_percent": 50.0, "in_service": True}])
    check_thresholds(data)

    assert "loading_line_3" not in alarms


def test_generator_overload_critical_alarm_created():
    data = _normal_data(generators=[
        {"id": 2, "output_mw": 110.0, "capacity_mw": 100.0, "in_service": True},
    ])
    check_thresholds(data)

    assert "gen_overload_2" in alarms
    assert alarms["gen_overload_2"]["severity"] == "critical"
    assert alarms["gen_overload_2"]["metric"] == "generator_capacity_pct"


def test_generator_capacity_warning_alarm_created():
    data = _normal_data(generators=[
        {"id": 2, "output_mw": 95.0, "capacity_mw": 100.0, "in_service": True},
    ])
    check_thresholds(data)

    assert "gen_overload_2" in alarms
    assert alarms["gen_overload_2"]["severity"] == "warning"


def test_generator_alarm_clears_when_normal():
    create_alarm(
        "gen_overload_2", "warning",
        "Generator near capacity", "generator_capacity_pct", 0.92, 0.90,
    )

    data = _normal_data(generators=[
        {"id": 2, "output_mw": 85.0, "capacity_mw": 100.0, "in_service": True},
    ])
    check_thresholds(data)

    assert alarms["gen_overload_2"]["cleared_at"] is not None


def test_generator_alarm_not_cleared_in_deadband():
    create_alarm(
        "gen_overload_2", "warning",
        "Generator near capacity", "generator_capacity_pct", 0.92, 0.90,
    )

    data = _normal_data(generators=[
        {"id": 2, "output_mw": 88.0, "capacity_mw": 100.0, "in_service": True},
    ])
    check_thresholds(data)

    assert alarms["gen_overload_2"]["cleared_at"] is None


def test_generator_out_of_service_does_not_create_alarm():
    data = _normal_data(generators=[
        {"id": 2, "output_mw": 110.0, "capacity_mw": 100.0, "in_service": False},
    ])
    check_thresholds(data)

    assert "gen_overload_2" not in alarms


def test_slack_generator_is_skipped():
    data = _normal_data(generators=[
        {"id": 0, "output_mw": 200.0, "capacity_mw": 100.0, "in_service": True},
    ])
    check_thresholds(data)

    assert "gen_overload_0" not in alarms


def test_no_alarm_for_normal_generator_output():
    data = _normal_data(generators=[
        {"id": 2, "output_mw": 70.0, "capacity_mw": 100.0, "in_service": True},
    ])
    check_thresholds(data)

    assert "gen_overload_2" not in alarms


def test_missing_data_does_not_create_alarms():
    check_thresholds({})

    assert alarms == {}


def test_multiple_simultaneous_alarms():
    data = {
        "frequency_hz": 59.70,
        "buses": [{"id": 2, "voltage_pu": 0.87}],
        "lines": [{"id": 3, "loading_percent": 98.0, "in_service": True}],
        "generators": [
            {"id": 2, "output_mw": 110.0, "capacity_mw": 100.0, "in_service": True},
        ],
    }

    check_thresholds(data)

    assert alarms["freq_out_of_range"]["severity"] == "critical"
    assert alarms["voltage_bus_2"]["severity"] == "critical"
    assert alarms["loading_line_3"]["severity"] == "critical"
    assert alarms["gen_overload_2"]["severity"] == "critical"