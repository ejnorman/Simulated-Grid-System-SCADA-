import pytest
import httpx

from src.services.alarms import alarms, create_alarm, clear_alarm
from src.services.control import handle_critical_alarms, SCALING_FACTOR


@pytest.fixture(autouse=True)
def clear_alarms():
    alarms.clear()
    yield
    alarms.clear()


def _make_freq_alarm(severity="critical", freq=59.70):
    return create_alarm(
        "freq_out_of_range", severity,
        f"Frequency {severity}: {freq:.2f} Hz",
        "frequency_hz", freq, 59.80,
    )


def _make_line_alarm(line_id=3, severity="critical", loading=98.0):
    return create_alarm(
        f"loading_line_{line_id}", severity,
        f"Line {line_id} overload {severity}: {loading:.1f}%",
        "line_loading_pct", loading, 95.0,
    )


def test_under_frequency_posts_correct_command(monkeypatch):
    freq = 59.70
    _make_freq_alarm(severity="critical", freq=freq)

    posted = {}

    def fake_post(url, json=None, **kwargs):
        posted["url"] = url
        posted["body"] = json
        return httpx.Response(200)

    monkeypatch.setattr(httpx, "post", fake_post)

    handle_critical_alarms()

    expected_delta = (60.0 - freq) * SCALING_FACTOR

    assert posted["body"]["command_type"] == "adjust_generation"
    assert posted["body"]["target"]["generator_id"] == 0
    assert posted["body"]["target"]["delta_mw"] == pytest.approx(expected_delta)
    assert "timestamp" in posted["body"]


def test_under_frequency_delta_mw_scales_with_deviation(monkeypatch):
    deltas = []

    def fake_post(url, json=None, **kwargs):
        deltas.append(json["target"]["delta_mw"])
        return httpx.Response(200)

    monkeypatch.setattr(httpx, "post", fake_post)

    for freq in (59.70, 59.50):
        alarms.clear()
        _make_freq_alarm(freq=freq)
        handle_critical_alarms()

    assert deltas[1] == pytest.approx(deltas[0] * (60.0 - 59.50) / (60.0 - 59.70))


def test_under_frequency_prints_log(monkeypatch, capsys):
    freq = 59.70
    _make_freq_alarm(freq=freq)
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: httpx.Response(200))

    handle_critical_alarms()

    out = capsys.readouterr().out
    assert "Under-frequency" in out or "under-frequency" in out.lower()
    assert "generator 0" in out.lower() or "generator_id" in out.lower() or "+15.0" in out


def test_warning_frequency_alarm_does_not_trigger_control(monkeypatch):
    _make_freq_alarm(severity="warning", freq=59.85)

    posted = []
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: posted.append(True) or httpx.Response(200))

    handle_critical_alarms()

    assert posted == []


def test_cleared_frequency_alarm_does_not_trigger_control(monkeypatch):
    _make_freq_alarm(severity="critical", freq=59.70)
    clear_alarm("freq_out_of_range")

    posted = []
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: posted.append(True) or httpx.Response(200))

    handle_critical_alarms()

    assert posted == []


def test_no_frequency_alarm_does_not_trigger_control(monkeypatch):
    posted = []
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: posted.append(True) or httpx.Response(200))

    handle_critical_alarms()

    assert posted == []


def test_line_overload_prints_alert(capsys):
    _make_line_alarm(line_id=3, severity="critical")

    handle_critical_alarms()

    out = capsys.readouterr().out
    assert "loading_line_3" in out


def test_line_overload_does_not_post_control_command(monkeypatch):
    _make_line_alarm(line_id=3, severity="critical")

    posted = []
    monkeypatch.setattr(httpx, "post", lambda *a, **kw: posted.append(True) or httpx.Response(200))

    handle_critical_alarms()

    assert posted == []


def test_multiple_line_overloads_each_print_alert(capsys):
    _make_line_alarm(line_id=3, severity="critical")
    _make_line_alarm(line_id=7, severity="critical")

    handle_critical_alarms()

    out = capsys.readouterr().out
    assert "loading_line_3" in out
    assert "loading_line_7" in out


def test_warning_line_alarm_does_not_print_alert(capsys):
    _make_line_alarm(line_id=3, severity="warning", loading=85.0)

    handle_critical_alarms()

    out = capsys.readouterr().out
    assert "loading_line_3" not in out


def test_cleared_line_alarm_does_not_print_alert(capsys):
    _make_line_alarm(line_id=3, severity="critical")
    clear_alarm("loading_line_3")

    handle_critical_alarms()

    out = capsys.readouterr().out
    assert "loading_line_3" not in out


def test_frequency_and_line_alarm_both_handled(monkeypatch, capsys):
    _make_freq_alarm(freq=59.70)
    _make_line_alarm(line_id=3)

    posted = []

    def capturing_post(url, json=None, **kwargs):
        posted.append(json)
        return httpx.Response(200)

    monkeypatch.setattr(httpx, "post", capturing_post)

    handle_critical_alarms()

    assert len(posted) == 1
    assert posted[0]["command_type"] == "adjust_generation"

    out = capsys.readouterr().out
    assert "loading_line_3" in out