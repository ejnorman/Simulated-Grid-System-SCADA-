"""
Alert threshold definitions and evaluation logic.

See docs/reference/backend/src/services/thresholds.py for a reference implementation.
"""

from .alarms import create_alarm, clear_alarm
from .control import handle_critical_alarms

THRESHOLDS = {
    "frequency": {
        # (low, high) per severity band
        "normal":   (59.95, 60.05),
        "advisory": (59.90, 60.10),
        "warning":  (59.80, 60.20),
    },
    "voltage_pu": {
        "normal":  (0.95, 1.05),
        "warning": (0.93, 1.07),
    },
    "line_loading_pct": {
        "normal":  80.0,   # below → normal
        "warning": 95.0,   # 80–95 → warning, above → critical
    },
    "generator_capacity_pct": {
        "normal":  0.90,   # below 90% capacity → normal
        "warning": 1.00,   # 90–100% → warning, above → overload
    },
}


def check_thresholds(data: dict):
    
    """
    Evaluate telemetry against THRESHOLDS and update the alarm store.
    Call create_alarm() when a threshold is exceeded, clear_alarm() when normal.
    Call handle_critical_alarms() at the end.

    Check: frequency_hz, each bus voltage_pu, each line loading_percent,
    each generator output_mw vs capacity_mw.
    """

    # Gets frequency from the simulation data; skips the frequency check if it is missing
    freq = data.get("frequency_hz")

    # Only check frequency if the simulation provided frequency data
    if freq is not None:
        # Pulls the configured frequency band from THRESHOLDS dictionary at the top
        freq_normal_low, freq_normal_high = THRESHOLDS["frequency"]["normal"]
        freq_advisory_low, freq_advisory_high = THRESHOLDS["frequency"]["advisory"]
        freq_warning_low, freq_warning_high = THRESHOLDS["frequency"]["warning"]

        # Creates a critical alarm if frequency is outside the warning band
        if freq < freq_warning_low or freq > freq_warning_high:
            create_alarm(
                "freq_out_of_range",
                "critical",
                f"Frequency critical: {freq:.2f} Hz",
                "frequency_hz",
                freq,
                freq_warning_low if freq < 60.0 else freq_warning_high
            )

        # Creates a warning alarm if frequency is outside the advisory band but its not critical
        elif freq < freq_advisory_low or freq > freq_advisory_high:
            create_alarm(
                "freq_out_of_range",
                "warning",
                f"Frequency warning: {freq:.2f} Hz",
                "frequency_hz",
                freq,
                freq_advisory_low if freq < 60.0 else freq_advisory_high
            )

        # Clears the frequency alarm once frequency returns to the normal band
        elif freq_normal_low <= freq <= freq_normal_high:
            clear_alarm("freq_out_of_range")

    # Loops through every bus in the sim data and checks its voltage
    for bus in data.get("buses", []):

        # Gets the bus voltage and bus ID from the simulation data
        voltage = bus.get("voltage_pu")
        bus_id = bus.get("id")

        # Skips this bus if required data is missing
        if voltage is None or bus_id is None:
            continue

        # Pulls the configured voltage band from THRESHOLDS dictionary
        voltage_normal_low, voltage_normal_high = THRESHOLDS["voltage_pu"]["normal"]
        voltage_warning_low, voltage_warning_high = THRESHOLDS["voltage_pu"]["warning"]

        # Creates a unique alarm ID for each bus so bus alarms do not overwrite each other
        alarm_id = f"voltage_bus_{bus_id}"

        # Creates a critical alarm if bus voltage is outside the warning band
        if voltage < voltage_warning_low or voltage > voltage_warning_high:
            create_alarm(
                alarm_id,
                "critical",
                f"Bus {bus_id} voltage critical: {voltage:.2f} pu",
                "voltage_pu",
                voltage,
                voltage_warning_low if voltage < 1.0 else voltage_warning_high
            )

        # Creates a warning alarm when bus voltage is outside normal band
        elif voltage < voltage_normal_low or voltage > voltage_normal_high:
            create_alarm(
                alarm_id,
                "warning",
                f"Bus {bus_id} voltage warning: {voltage:.2f} pu",
                "voltage_pu",
                voltage,
                voltage_normal_low if voltage < 1.0 else voltage_normal_high
            )

        # Clears this bus voltage alarm when voltage returns to normal
        else:
            clear_alarm(alarm_id)

    # Checks each line from the simulation data to see if it is overloaded
    for line in data.get("lines", []):

        # Skips lines that are out of service
        if not line.get("in_service", True):
            continue

        # Gets the line loading percentage and line ID
        loading = line.get("loading_percent")
        line_id = line.get("id")

        # Skips this line if required data is missing
        if loading is None or line_id is None:
            continue

        # Pulls the configured line loading limits from THRESHOLDS
        loading_normal = THRESHOLDS["line_loading_pct"]["normal"]
        loading_warning = THRESHOLDS["line_loading_pct"]["warning"]

        # Creates a unique alarm ID for each line
        alarm_id = f"loading_line_{line_id}"

        # Creates a critical alarm if line loading is above the warning limit
        if loading > loading_warning:
            create_alarm(
                alarm_id,
                "critical",
                f"Line {line_id} overload critical: {loading:.1f}%",
                "line_loading_pct",
                loading,
                loading_warning
            )

        # Creates a warning alarm if line loading is above normal but not critical
        elif loading > loading_normal:
            create_alarm(
                alarm_id,
                "warning",
                f"Line {line_id} loading warning: {loading:.1f}%",
                "line_loading_pct",
                loading,
                loading_normal
            )

        # Clears the line loading alarm when loading returns to normal
        else:
            clear_alarm(alarm_id)

    # Loops through every generator and checks output compared to capacity
    for gen in data.get("generators", []):

        # Skips generators that are not currently in service
        if not gen.get("in_service", True):
            continue

        # Gets generator output, capacity, and ID from the simulation data
        output = gen.get("output_mw")
        capacity = gen.get("capacity_mw")
        gen_id = gen.get("id")

        # Skips this generator if required data is missing
        if output is None or capacity is None or gen_id is None:
            continue

        # Skips generators with zero capacity to avoid dividing by zero
        if capacity == 0:
            continue

        # Calculates generator utilization as output divided by capacity
        utilization = output / capacity

        # Pulls the configured generator capacity limits from THRESHOLDS
        gen_normal = THRESHOLDS["generator_capacity_pct"]["normal"]
        gen_warning = THRESHOLDS["generator_capacity_pct"]["warning"]

        # Creates a unique alarm ID for each generator
        alarm_id = f"gen_overload_{gen_id}"

        # Creates a critical alarm when above 100% generator capacity
        if utilization > gen_warning:
            create_alarm(
                alarm_id,
                "critical",
                f"Generator {gen_id} overloaded: {utilization:.2%}",
                "generator_capacity_pct",
                utilization,
                gen_warning
            )

        # Creates a warning alarm at 90% generator capacity
        elif utilization > gen_normal:
            create_alarm(
                alarm_id,
                "warning",
                f"Generator {gen_id} near capacity: {utilization:.2%}",
                "generator_capacity_pct",
                utilization,
                gen_normal
            )

        # Clears this generator alarm when utilization returns back within normal limit
        else:
            clear_alarm(alarm_id)

    handle_critical_alarms()