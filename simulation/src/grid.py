"""
Grid Model — IEEE 14-Bus Power Grid

This module owns all grid state and the logic for reading and mutating it.
Implement the three functions below. See docs/reference/simulation/src/grid.py
for a working mock implementation you can use as a starting point.
"""

import random
from datetime import datetime, timezone
from fastapi import HTTPException

from .constants import BUS_CONFIG, GENERATOR_CONFIG, LINE_CONFIG, LOAD_CONFIG
from .schemas import ControlCommand, Disturbance


# Runtime grid state — replace with a pandapower network object when ready
grid_state = {
    "frequency_hz": 60.0,
    "generators": {
        g["id"]: {"output_mw": g["base_output_mw"], "in_service": True}
        for g in GENERATOR_CONFIG
    },
    "lines": {
        l["id"]: {"in_service": True}
        for l in LINE_CONFIG
    },
    "loads": {
        ld["id"]: {"demand_mw": ld["base_demand_mw"], "demand_mvar": ld["base_demand_mvar"]}
        for ld in LOAD_CONFIG
    },
}


def build_telemetry() -> dict:
    """
    Return the current grid state as a telemetry snapshot.

    Expected response shape:
    {
        "timestamp":  str (ISO 8601),
        "frequency_hz": float,
        "buses":      [{"id", "voltage_pu", "voltage_kv", "type"}, ...],           # 14 entries
        "lines":      [{"id", "from_bus", "to_bus", "power_mw", "power_mvar",
                        "loading_percent", "in_service"}, ...],                     # 20 entries
        "generators": [{"id", "bus", "output_mw", "output_mvar",
                        "capacity_mw", "in_service"}, ...],                         # 5 entries
        "loads":      [{"id", "bus", "demand_mw", "demand_mvar"}, ...],             # 11 entries
    }
    """
    raise NotImplementedError("build_telemetry() not yet implemented")


def apply_control(cmd: ControlCommand) -> dict:
    """
    Apply a control command and return a result dict.

    cmd.command_type options:
      "adjust_generation" — cmd.target.generator_id (int), cmd.target.delta_mw (float)
      "trip_breaker"      — cmd.target.line_id (int)
      "close_breaker"     — cmd.target.line_id (int)
    """
    raise NotImplementedError("apply_control() not yet implemented")


def apply_disturbance(disturbance: Disturbance) -> dict:
    """
    Inject a test disturbance and return confirmation.

    disturbance.type options:
      "generator_trip" — disturbance.target.generator_id (int)
      "load_spike"     — disturbance.target.load_id (int), disturbance.target.percent_increase (float)
      "line_outage"    — disturbance.target.line_id (int)
    """
    raise NotImplementedError("apply_disturbance() not yet implemented")
