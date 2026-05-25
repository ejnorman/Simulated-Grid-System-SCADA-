"""
Alert threshold definitions and evaluation logic.
"""

from .alarms import create_alarm, clear_alarm
from .control import handle_critical_alarms

THRESHOLDS = {
    "frequency": {
        "normal":   (59.95, 60.05),
        "advisory": (59.90, 60.10),
        "warning":  (59.80, 60.20),
    },
    # case14 load buses naturally operate at 1.02–1.07 pu at base case,
    # so the normal band must be wide enough not to alarm at steady state.
    # These thresholds only fire during genuine contingency conditions.
    "voltage_pu": {
        "normal":  (0.92, 1.10),
        "warning": (0.88, 1.14),
    },
    "line_loading_pct": {
        "normal":  80.0,
        "warning": 95.0,
    },
    "generator_capacity_pct": {
        "normal":  0.90,
        "warning": 1.00,
    },
}

# Generator buses in IEEE case14 have fixed voltage setpoints above 1.05 pu
# (Bus 1=1.06, Bus 6=1.07, Bus 8=1.09). These are controlled by AVR — exclude from voltage monitoring.
_GENERATOR_BUSES = {1, 6, 8}

# Gen 0 is the slack bus — its output is set automatically by the power flow solver to
# balance generation and load. The operator cannot control it, so monitoring its capacity
# would produce un-actionable alarms.
_SLACK_GEN_ID = 0

# Deadband margins for alarm clearing.
# An alarm only clears when the metric moves this far past the fire threshold.
# Without this, alarms that hover near a threshold fire and clear every few seconds.
_FREQ_CLEAR_MARGIN  = 0.03   # Hz  — advisory fires at 59.90, clears at 59.93
_VOLT_CLEAR_MARGIN  = 0.01   # pu  — normal fires at 0.95/1.05, clears at 0.96/1.04
_LINE_CLEAR_MARGIN  = 5.0    # %   — warning fires at 80%, clears below 75%
_GEN_CLEAR_MARGIN   = 0.03   # fraction


def check_thresholds(data: dict):
    """
    Evaluate telemetry against THRESHOLDS and update the alarm store.
    Includes deadband hysteresis so alarms do not flicker near thresholds.
    Excludes generator buses from voltage monitoring.
    """

    freq = data.get("frequency_hz")
    if freq is not None:
        t = THRESHOLDS["frequency"]
        freq_advisory_low, freq_advisory_high = t["advisory"]
        freq_warning_low, freq_warning_high   = t["warning"]

        if freq < freq_warning_low or freq > freq_warning_high:
            create_alarm(
                "freq_out_of_range", "critical",
                f"Frequency critical: {freq:.2f} Hz",
                "frequency_hz", freq,
                freq_warning_low if freq < 60.0 else freq_warning_high,
            )
        elif freq < freq_advisory_low or freq > freq_advisory_high:
            create_alarm(
                "freq_out_of_range", "warning",
                f"Frequency warning: {freq:.2f} Hz",
                "frequency_hz", freq,
                freq_advisory_low if freq < 60.0 else freq_advisory_high,
            )
        elif freq_advisory_low + _FREQ_CLEAR_MARGIN <= freq <= freq_advisory_high - _FREQ_CLEAR_MARGIN:
            # Only clear when freq is clearly inside the advisory band (59.93–60.07)
            clear_alarm("freq_out_of_range")
        # else: in the 59.90–59.93 or 60.07–60.10 deadband — leave alarm state unchanged

    for bus in data.get("buses", []):
        voltage = bus.get("voltage_pu")
        bus_id  = bus.get("id")
        if voltage is None or bus_id is None:
            continue
        if bus_id in _GENERATOR_BUSES:
            continue  # AVR-controlled — operator cannot adjust

        t = THRESHOLDS["voltage_pu"]
        voltage_normal_low, voltage_normal_high   = t["normal"]
        voltage_warning_low, voltage_warning_high = t["warning"]
        alarm_id = f"voltage_bus_{bus_id}"

        if voltage < voltage_warning_low or voltage > voltage_warning_high:
            create_alarm(
                alarm_id, "critical",
                f"Bus {bus_id} voltage critical: {voltage:.3f} pu",
                "voltage_pu", voltage,
                voltage_warning_low if voltage < 1.0 else voltage_warning_high,
            )
        elif voltage < voltage_normal_low or voltage > voltage_normal_high:
            create_alarm(
                alarm_id, "warning",
                f"Bus {bus_id} voltage warning: {voltage:.3f} pu",
                "voltage_pu", voltage,
                voltage_normal_low if voltage < 1.0 else voltage_normal_high,
            )
        elif voltage_normal_low + _VOLT_CLEAR_MARGIN <= voltage <= voltage_normal_high - _VOLT_CLEAR_MARGIN:
            clear_alarm(alarm_id)
        # else: in deadband — leave unchanged

    for line in data.get("lines", []):
        line_id = line.get("id")
        if line_id is None:
            continue
        if not line.get("in_service", True):
            clear_alarm(f"loading_line_{line_id}")  # tripped line cannot be overloaded
            continue
        loading = line.get("loading_percent")
        if loading is None or line_id is None:
            continue

        loading_normal  = THRESHOLDS["line_loading_pct"]["normal"]
        loading_warning = THRESHOLDS["line_loading_pct"]["warning"]
        alarm_id = f"loading_line_{line_id}"

        if loading > loading_warning:
            create_alarm(
                alarm_id, "critical",
                f"Line {line_id} overload critical: {loading:.1f}%",
                "line_loading_pct", loading, loading_warning,
            )
        elif loading > loading_normal:
            create_alarm(
                alarm_id, "warning",
                f"Line {line_id} loading warning: {loading:.1f}%",
                "line_loading_pct", loading, loading_normal,
            )
        elif loading < loading_normal - _LINE_CLEAR_MARGIN:
            clear_alarm(alarm_id)

    for gen in data.get("generators", []):
        if not gen.get("in_service", True):
            continue
        output   = gen.get("output_mw")
        capacity = gen.get("capacity_mw")
        gen_id   = gen.get("id")
        if gen_id == _SLACK_GEN_ID:
            continue  # slack bus output is auto-managed — operator cannot adjust it
        if output is None or capacity is None or gen_id is None or capacity == 0:
            continue

        utilization = output / capacity
        gen_normal  = THRESHOLDS["generator_capacity_pct"]["normal"]
        gen_warning = THRESHOLDS["generator_capacity_pct"]["warning"]
        alarm_id = f"gen_overload_{gen_id}"

        if utilization > gen_warning:
            create_alarm(
                alarm_id, "critical",
                f"Generator {gen_id} overloaded: {utilization:.0%}",
                "generator_capacity_pct", utilization, gen_warning,
            )
        elif utilization > gen_normal:
            create_alarm(
                alarm_id, "warning",
                f"Generator {gen_id} near capacity: {utilization:.0%}",
                "generator_capacity_pct", utilization, gen_normal,
            )
        elif utilization < gen_normal - _GEN_CLEAR_MARGIN:
            clear_alarm(alarm_id)

    handle_critical_alarms()
