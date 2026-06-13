"""
Grid Model — IEEE 14-Bus Power Grid

This module owns all grid state and the logic for reading and mutating it.

The three functions below define the API contract. Keep their signatures unchanged.
"""

import logging
import math
import random
from datetime import datetime, timezone

import pandapower as pp
import pandapower.networks as pn
from fastapi import HTTPException

from .constants import BUS_CONFIG, GENERATOR_CONFIG, LINE_CONFIG, LOAD_CONFIG
from .schemas import ControlCommand, Disturbance

logger = logging.getLogger(__name__)


# =============================================================================
# MODULE-LEVEL STATE
# =============================================================================
# net:           pandapower network — created once at startup, mutated by controls/disturbances.
# _frequency_hz: system frequency; updated via swing equation in apply_control/apply_disturbance.
# _last_res:     cached power flow results from the last successful pp.runpp() call.
#                Used as fallback when the current poll fails to converge.
# grid_state:    tracks generator/line in_service flags and load demand values.
# =============================================================================

def create_network():
    """
    Build the IEEE 14-bus pandapower network from our constants.
    Uses pn.case14() for correct line impedances, then overrides generator
    outputs and load values to match GENERATOR_CONFIG and LOAD_CONFIG.
    Called once at startup to initialize the module-level net object.
    """
    net = pn.case14()

    # Override non-slack generator outputs and capacities.
    # pandapower uses 0-indexed buses; our constants use 1-indexed.
    # Bus 1 (index 0) is the slack bus — modeled as ext_grid, not gen; skip it.
    # Bus 8 (index 7) is a synchronous condenser in case14() — no net.gen entry exists,
    # so we create a real generator there rather than silently skipping it.
    for gc in GENERATOR_CONFIG:
        if gc["bus"] == 1:
            continue
        bus_idx = gc["bus"] - 1
        mask = net.gen["bus"] == bus_idx
        if mask.any():
            net.gen.loc[mask, "p_mw"] = gc["base_output_mw"]
            net.gen.loc[mask, "max_p_mw"] = gc["capacity_mw"]
            net.gen.loc[mask, "min_p_mw"] = 0.0
        else:
            bc = next(b for b in BUS_CONFIG if b["id"] == gc["bus"])
            pp.create_gen(net, bus=bus_idx, p_mw=gc["base_output_mw"],
                          vm_pu=bc["base_voltage_pu"],
                          max_p_mw=gc["capacity_mw"], min_p_mw=0.0, in_service=True)

    # Override load values to match LOAD_CONFIG.
    for lc in LOAD_CONFIG:
        bus_idx = lc["bus"] - 1
        mask = net.load["bus"] == bus_idx
        net.load.loc[mask, "p_mw"] = lc["base_demand_mw"]
        net.load.loc[mask, "q_mvar"] = lc["base_demand_mvar"]

    # Set thermal ratings from LINE_CONFIG so loading_percent is meaningful.
    # case14() defaults leave max_i_ka as NaN on most lines, making loading_percent
    # always 0 regardless of actual power flow. We derive max_i_ka from rated_mw
    # using the bus voltage at the sending end: I = P / (sqrt(3) * V).
    for lc in LINE_CONFIG:
        fb, tb = lc["from_bus"] - 1, lc["to_bus"] - 1
        line_mask = (net.line["from_bus"] == fb) & (net.line["to_bus"] == tb)
        if line_mask.any():
            vn_kv = float(net.bus.at[fb, "vn_kv"])
            net.line.loc[line_mask, "max_i_ka"] = lc["rated_mw"] / (math.sqrt(3) * vn_kv)
        # Transformers: do NOT modify sn_mva — it sets the per-unit impedance base and
        # changing it while keeping vk_percent fixed alters the actual network impedance,
        # causing Newton-Raphson to diverge. Transformer loading_percent comes from
        # pandapower's own calculation using the original case14 ratings.

    return net


net = create_network()
_frequency_hz = 60.0
_GOVERNOR_ENABLED = False   # toggled via POST /governor; when on, frequency auto-recovers at 0.015/tick
_GOVERNOR_RATE_NOMINAL = 0.015
_PEAK_DEMAND = False        # toggled via POST /peak-demand; scales loads 1.5× and pre-dispatches gens
_last_res = None      # dict of copied result DataFrames from last successful runpp

grid_state = {
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


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _jitter(value: float, pct: float = 0.004) -> float:
    """Add ±0.4% random noise to simulate real sensor variance."""
    return round(value * (1 + random.uniform(-pct, pct)), 4)


def _set_line_in_service(line_id: int, in_service: bool):
    """
    Set a line's in_service flag in net.line or net.trafo (whichever holds it),
    matched by from/to bus pair. Also syncs grid_state for build_telemetry().
    """
    lc = next(l for l in LINE_CONFIG if l["id"] == line_id)
    fb, tb = lc["from_bus"] - 1, lc["to_bus"] - 1  # convert to 0-indexed

    line_mask = (net.line["from_bus"] == fb) & (net.line["to_bus"] == tb)
    if line_mask.any():
        net.line.loc[line_mask, "in_service"] = in_service
    else:
        trafo_mask = (net.trafo["hv_bus"] == fb) & (net.trafo["lv_bus"] == tb)
        net.trafo.loc[trafo_mask, "in_service"] = in_service

    grid_state["lines"][line_id]["in_service"] = in_service


def _run_power_flow() -> dict | None:
    """
    Attempt Newton-Raphson power flow with fallback initialization.
    'auto' reuses the previous solution — fast but fails after topology changes.
    'flat' starts from 1.0 pu everywhere — robust after line trips.
    Tolerance is relaxed to 1e-3 MVA (adequate for a monitoring dashboard).
    Returns a dict of result DataFrames on success, None on total failure.
    """
    for init in ("auto", "dc", "flat"):
        try:
            pp.runpp(net, verbose=False, init=init,
                     max_iteration=50, tolerance_mva=1e-3, numba=False)
            return {
                "bus":      net.res_bus.copy(),
                "line":     net.res_line.copy(),
                "trafo":    net.res_trafo.copy(),
                "gen":      net.res_gen.copy(),
                "ext_grid": net.res_ext_grid.copy(),
            }
        except Exception as e:
            logger.warning("Power flow failed (init=%s): %s", init, e)
    logger.warning("Power flow failed to converge")
    return None


def _swing_eq(p_imbalance_mw: float) -> float:
    """
    Estimate frequency deviation from a generation/load imbalance.
    Δf = P_imbalance / (2 × H × S_base), H=4s, S_base=100 MVA.
    Positive imbalance (more generation) → frequency rises.
    """
    return p_imbalance_mw / 200.0


# =============================================================================
# PUBLIC API - THREE CORE FUNCTIONS
# =============================================================================

def build_telemetry() -> dict:
    """
    Return the current grid state as a telemetry snapshot.
    Called by routes.get_telemetry() every time the backend polls (every 2 seconds).

    Runs pp.runpp(net) and caches the results. On convergence failure, serves
    the last cached results so the dashboard shows the last known-good state
    rather than stale startup constants. Falls back to constants only on the
    very first poll if that also fails.

    IMPORTANT: Response shape must match API contract exactly.
    Backend and frontend depend on these exact field names.
    """
    global _frequency_hz, _last_res
    if _GOVERNOR_ENABLED:
        _frequency_hz += (60.0 - _frequency_hz) * _GOVERNOR_RATE_NOMINAL

    timestamp = datetime.now(timezone.utc).isoformat()

    result = _run_power_flow()
    if result is not None:
        _last_res = result

    freq = _jitter(_frequency_hz, pct=0.0002)  # ±0.012 Hz — frequency is grid-wide, not sensor-noisy

    # --- Buses ---
    buses = []
    for b in BUS_CONFIG:
        bus_idx = b["id"] - 1
        vm_pu = (float(_last_res["bus"].at[bus_idx, "vm_pu"])
                 if _last_res else b["base_voltage_pu"])
        buses.append({
            "id": b["id"],
            "voltage_pu": _jitter(vm_pu),
            "voltage_kv": _jitter(vm_pu * b["nominal_kv"]),
            "type": b["type"]
        })

    # --- Lines ---
    # Build lookup: (from_bus_1indexed, to_bus_1indexed) → (power_mw, power_mvar, loading_percent)
    # pandapower case14() splits connections between net.line and net.trafo (transformers).
    _line_res = {}
    if _last_res:
        for idx in net.line.index:
            fb = int(net.line.at[idx, "from_bus"]) + 1
            tb = int(net.line.at[idx, "to_bus"]) + 1
            _line_res[(fb, tb)] = (
                float(_last_res["line"].at[idx, "p_from_mw"]),
                float(_last_res["line"].at[idx, "q_from_mvar"]),
                float(_last_res["line"].at[idx, "loading_percent"]),
            )
        for idx in net.trafo.index:
            fb = int(net.trafo.at[idx, "hv_bus"]) + 1
            tb = int(net.trafo.at[idx, "lv_bus"]) + 1
            _line_res[(fb, tb)] = (
                float(_last_res["trafo"].at[idx, "p_hv_mw"]),
                float(_last_res["trafo"].at[idx, "q_hv_mvar"]),
                float(_last_res["trafo"].at[idx, "loading_percent"]),
            )

    lines = []
    for l in LINE_CONFIG:
        in_service = grid_state["lines"][l["id"]]["in_service"]
        if not in_service:
            lines.append({
                "id": l["id"], "from_bus": l["from_bus"], "to_bus": l["to_bus"],
                "power_mw": 0.0, "power_mvar": 0.0, "loading_percent": 0.0, "in_service": False
            })
            continue
        res = _line_res.get((l["from_bus"], l["to_bus"])) or _line_res.get((l["to_bus"], l["from_bus"]))
        if res:
            pwr = _jitter(res[0])
            # case14() bus voltages are stored in a normalised form, making pandapower's
            # own loading_percent meaningless. Compute it directly from MW / rated_mw.
            loading = abs(res[0]) / l["rated_mw"] * 100
            lines.append({
                "id": l["id"], "from_bus": l["from_bus"], "to_bus": l["to_bus"],
                "power_mw": pwr, "power_mvar": _jitter(res[1]),
                "loading_percent": _jitter(loading), "in_service": True
            })
        else:
            # Fallback: connection not found in pandapower result (topology mismatch)
            pwr = _jitter(l["base_power_mw"])
            lines.append({
                "id": l["id"], "from_bus": l["from_bus"], "to_bus": l["to_bus"],
                "power_mw": pwr, "power_mvar": round(pwr * 0.23, 4),
                "loading_percent": _jitter(l["base_loading"]), "in_service": True
            })

    # --- Generators ---
    # Non-slack generators: cached res_gen, keyed by bus (1-indexed).
    # Slack bus (bus 1): cached res_ext_grid — absorbs whatever generation imbalance remains.
    _gen_res = {}
    if _last_res:
        for idx in net.gen.index:
            bus_1 = int(net.gen.at[idx, "bus"]) + 1
            _gen_res[bus_1] = (
                float(_last_res["gen"].at[idx, "p_mw"]),
                float(_last_res["gen"].at[idx, "q_mvar"]),
            )
        if not _last_res["ext_grid"].empty:
            _gen_res[1] = (
                float(_last_res["ext_grid"].at[0, "p_mw"]),
                float(_last_res["ext_grid"].at[0, "q_mvar"]),
            )

    generators = []
    for g in GENERATOR_CONFIG:
        gen_state = grid_state["generators"][g["id"]]
        if not gen_state["in_service"]:
            generators.append({
                "id": g["id"], "bus": g["bus"], "output_mw": 0.0, "output_mvar": 0.0,
                "capacity_mw": g["capacity_mw"], "in_service": False
            })
            continue
        res = _gen_res.get(g["bus"])
        if res:
            out = _jitter(res[0])
            generators.append({
                "id": g["id"], "bus": g["bus"], "output_mw": out,
                "output_mvar": _jitter(res[1]), "capacity_mw": g["capacity_mw"], "in_service": True
            })
        else:
            out = _jitter(gen_state["output_mw"])
            generators.append({
                "id": g["id"], "bus": g["bus"], "output_mw": out,
                "output_mvar": round(out * 0.072, 4), "capacity_mw": g["capacity_mw"], "in_service": True
            })

    # --- Loads ---
    loads = []
    for ld in LOAD_CONFIG:
        load_state = grid_state["loads"][ld["id"]]
        loads.append({
            "id": ld["id"], "bus": ld["bus"],
            "demand_mw": _jitter(load_state["demand_mw"]),
            "demand_mvar": _jitter(load_state["demand_mvar"])
        })

    return {
        "timestamp": timestamp,
        "frequency_hz": freq,
        "buses": buses,
        "lines": lines,
        "generators": generators,
        "loads": loads
    }


def apply_control(cmd: ControlCommand) -> dict:
    """
    Apply a control command to the grid.
    Called by routes.post_control() when frontend or backend sends a command.

    Four command types:
    - "adjust_generation": Change generator MW output
    - "trip_breaker": Open a line (set in_service=False)
    - "close_breaker": Close a line (set in_service=True)
    - "restore_generator": Bring a tripped generator back online at 0 MW
    """
    global _frequency_hz
    timestamp = datetime.now(timezone.utc).isoformat()

    if cmd.command_type == "adjust_generation":
        gen_id = cmd.target.generator_id
        delta_mw = cmd.target.delta_mw

        if gen_id is None or delta_mw is None:
            raise HTTPException(400, detail="Missing generator_id or delta_mw")
        if gen_id not in grid_state["generators"]:
            raise HTTPException(400, detail=f"Generator {gen_id} does not exist")

        gc = next(g for g in GENERATOR_CONFIG if g["id"] == gen_id)
        capacity = gc["capacity_mw"]

        gen_state = grid_state["generators"][gen_id]
        previous = gen_state["output_mw"]
        new_output = max(0.0, min(capacity, previous + delta_mw))
        gen_state["output_mw"] = new_output

        # Update net.gen for non-slack generators.
        # Slack bus (bus 1) is ext_grid — pandapower auto-balances it; skip.
        if gc["bus"] != 1:
            bus_idx = gc["bus"] - 1
            mask = net.gen["bus"] == bus_idx
            net.gen.loc[mask, "p_mw"] = new_output

        actual_delta = new_output - previous  # clamped, so may differ from requested delta_mw
        _frequency_hz += _swing_eq(actual_delta)
        _frequency_hz = max(59.5, min(60.5, _frequency_hz))

        return {
            "status": "success",
            "command_type": cmd.command_type,
            "executed_at": timestamp,
            "result": {
                "generator_id": gen_id,
                "previous_output_mw": previous,
                "new_output_mw": new_output
            }
        }

    elif cmd.command_type == "trip_breaker":
        line_id = cmd.target.line_id

        if line_id is None:
            raise HTTPException(400, detail="Missing line_id")
        if line_id not in grid_state["lines"]:
            raise HTTPException(400, detail=f"Line {line_id} does not exist")

        _set_line_in_service(line_id, False)

        return {
            "status": "success",
            "command_type": cmd.command_type,
            "executed_at": timestamp,
            "result": {"line_id": line_id, "in_service": False}
        }

    elif cmd.command_type == "close_breaker":
        line_id = cmd.target.line_id

        if line_id is None:
            raise HTTPException(400, detail="Missing line_id")
        if line_id not in grid_state["lines"]:
            raise HTTPException(400, detail=f"Line {line_id} does not exist")

        _set_line_in_service(line_id, True)

        return {
            "status": "success",
            "command_type": cmd.command_type,
            "executed_at": timestamp,
            "result": {"line_id": line_id, "in_service": True}
        }

    elif cmd.command_type == "restore_generator":
        gen_id = cmd.target.generator_id

        if gen_id is None:
            raise HTTPException(400, detail="Missing generator_id")
        if gen_id not in grid_state["generators"]:
            raise HTTPException(400, detail=f"Generator {gen_id} does not exist")

        gc = next(g for g in GENERATOR_CONFIG if g["id"] == gen_id)
        if gc["bus"] == 1:
            raise HTTPException(400, detail="Slack bus generator is always in service")

        gen_state = grid_state["generators"][gen_id]
        if gen_state["in_service"]:
            raise HTTPException(400, detail=f"Generator {gen_id} is already in service")

        gen_state["in_service"] = True
        gen_state["output_mw"] = 0.0

        bus_idx = gc["bus"] - 1
        mask = net.gen["bus"] == bus_idx
        if mask.any():
            net.gen.loc[mask, "in_service"] = True
            net.gen.loc[mask, "p_mw"] = 0.0

        return {
            "status": "success",
            "command_type": cmd.command_type,
            "executed_at": timestamp,
            "result": {
                "generator_id": gen_id,
                "in_service": True,
                "output_mw": 0.0
            }
        }

    else:
        raise HTTPException(400, detail=f"Unknown command_type: {cmd.command_type}")


def reset_grid() -> dict:
    """
    Restore the grid to its baseline state.
    Rebuilds the pandapower network and resets all state variables.
    Called by POST /reset for demo resets without a container restart.
    """
    global net, _frequency_hz, _last_res, grid_state, _GOVERNOR_ENABLED, _PEAK_DEMAND
    net = create_network()
    _frequency_hz = 60.0
    _last_res = None
    _GOVERNOR_ENABLED = False
    _PEAK_DEMAND = False
    grid_state = {
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
    timestamp = datetime.now(timezone.utc).isoformat()
    logger.info("Grid reset to baseline at %s", timestamp)
    return {"status": "reset", "timestamp": timestamp}


def set_governor(enabled: bool) -> dict:
    """Enable or disable governor auto-recovery. Called by POST /governor."""
    global _GOVERNOR_ENABLED
    _GOVERNOR_ENABLED = enabled
    return {"governor_enabled": enabled}


_PEAK_GEN_SETPOINTS    = {1: 75.0, 2: 55.0, 3: 50.0, 4: 50.0}
_PEAK_BUS4_MULTIPLIER  = 3.0  # Bus 4 is the congestion hot-spot — spike it hard
_PEAK_OTHER_MULTIPLIER = 1.4  # modest background increase across the rest of the network


def set_peak_demand(enabled: bool) -> dict:
    """
    Toggle peak demand mode. Called by POST /peak-demand.
    ON: spikes Bus 4 load 2.5× and raises all other loads 1.4×. Pre-dispatches
        Gen 1–4 at 75–83% capacity, leaving realistic spinning reserve.
        Bus 4's heavy load means a Line 6 trip naturally congests Line 3 (2→4).
    OFF: restores all loads and generator setpoints to base values.
    """
    global _PEAK_DEMAND
    _PEAK_DEMAND = enabled

    if enabled:
        for ld in LOAD_CONFIG:
            multiplier = _PEAK_BUS4_MULTIPLIER if ld["bus"] == 4 else _PEAK_OTHER_MULTIPLIER
            peak_mw   = round(ld["base_demand_mw"]   * multiplier, 2)
            peak_mvar = round(ld["base_demand_mvar"]  * multiplier, 2)
            grid_state["loads"][ld["id"]]["demand_mw"]   = peak_mw
            grid_state["loads"][ld["id"]]["demand_mvar"] = peak_mvar
            bus_idx = ld["bus"] - 1
            mask = net.load["bus"] == bus_idx
            net.load.loc[mask, "p_mw"]   = peak_mw
            net.load.loc[mask, "q_mvar"] = peak_mvar

        for gen_id, target_mw in _PEAK_GEN_SETPOINTS.items():
            gc = next(g for g in GENERATOR_CONFIG if g["id"] == gen_id)
            grid_state["generators"][gen_id]["output_mw"] = target_mw
            bus_idx = gc["bus"] - 1
            mask = net.gen["bus"] == bus_idx
            net.gen.loc[mask, "p_mw"] = target_mw
    else:
        for ld in LOAD_CONFIG:
            grid_state["loads"][ld["id"]]["demand_mw"]   = ld["base_demand_mw"]
            grid_state["loads"][ld["id"]]["demand_mvar"] = ld["base_demand_mvar"]
            bus_idx = ld["bus"] - 1
            mask = net.load["bus"] == bus_idx
            net.load.loc[mask, "p_mw"]   = ld["base_demand_mw"]
            net.load.loc[mask, "q_mvar"] = ld["base_demand_mvar"]

        for gc in GENERATOR_CONFIG:
            if gc["bus"] == 1:
                continue
            grid_state["generators"][gc["id"]]["output_mw"] = gc["base_output_mw"]
            bus_idx = gc["bus"] - 1
            mask = net.gen["bus"] == bus_idx
            net.gen.loc[mask, "p_mw"] = gc["base_output_mw"]

    return {"peak_demand": enabled}


def apply_disturbance(disturbance: Disturbance) -> dict:
    """
    Inject a test disturbance (fault) into the grid.
    Called by routes.post_disturbance() for testing/demo purposes.

    Three disturbance types:
    - "generator_trip": Take a generator offline
    - "load_spike": Suddenly increase load demand
    - "line_outage": Take a line out of service
    """
    global _frequency_hz, _GOVERNOR_ENABLED
    timestamp = datetime.now(timezone.utc).isoformat()

    if disturbance.type == "generator_trip":
        gen_id = disturbance.target.generator_id

        if gen_id is None:
            raise HTTPException(400, detail="Missing generator_id")
        if gen_id not in grid_state["generators"]:
            raise HTTPException(400, detail=f"Generator {gen_id} does not exist")

        gc = next(g for g in GENERATOR_CONFIG if g["id"] == gen_id)
        if gc["bus"] == 1:
            raise HTTPException(400, detail=(
                "Generator 0 (slack bus) cannot be tripped. "
                "It is the power flow reference machine and must remain in service."
            ))

        gen_state = grid_state["generators"][gen_id]
        lost_mw = gen_state["output_mw"]  # capture before zeroing

        gen_state["output_mw"] = 0.0
        gen_state["in_service"] = False

        bus_idx = gc["bus"] - 1
        mask = net.gen["bus"] == bus_idx
        if mask.any():
            net.gen.loc[mask, "in_service"] = False

        # Swing equation: lost generation → frequency drop
        _frequency_hz += _swing_eq(-lost_mw)
        _frequency_hz = max(59.5, _frequency_hz)

    elif disturbance.type == "load_spike":
        load_id = disturbance.target.load_id
        pct = disturbance.target.percent_increase

        if load_id is None or pct is None:
            raise HTTPException(400, detail="Missing load_id or percent_increase")
        if load_id not in grid_state["loads"]:
            raise HTTPException(400, detail=f"Load {load_id} does not exist")

        load_state = grid_state["loads"][load_id]
        prev_mw = load_state["demand_mw"]
        new_mw = round(prev_mw * (1 + pct / 100), 2)
        new_mvar = round(load_state["demand_mvar"] * (1 + pct / 100), 2)

        load_state["demand_mw"] = new_mw
        load_state["demand_mvar"] = new_mvar

        # Update net.load so the next power flow sees the new demand
        lc = next(l for l in LOAD_CONFIG if l["id"] == load_id)
        bus_idx = lc["bus"] - 1
        mask = net.load["bus"] == bus_idx
        net.load.loc[mask, "p_mw"] = new_mw
        net.load.loc[mask, "q_mvar"] = new_mvar

        # Swing equation: extra load → frequency drop
        _frequency_hz += _swing_eq(-(new_mw - prev_mw))
        _frequency_hz = max(59.5, _frequency_hz)

    elif disturbance.type == "line_outage":
        line_id = disturbance.target.line_id

        if line_id is None:
            raise HTTPException(400, detail="Missing line_id")
        if line_id not in grid_state["lines"]:
            raise HTTPException(400, detail=f"Line {line_id} does not exist")

        _set_line_in_service(line_id, False)

    elif disturbance.type == "generation_crisis":
        # Trip Gen 1 (Bus 2, 50 MW) and Gen 4 (Bus 8, 30 MW) simultaneously — 80 MW loss.
        for gen_id in [1, 4]:
            gc = next(g for g in GENERATOR_CONFIG if g["id"] == gen_id)
            gen_state = grid_state["generators"][gen_id]
            if not gen_state["in_service"]:
                continue
            lost_mw = gen_state["output_mw"]
            gen_state["output_mw"] = 0.0
            gen_state["in_service"] = False
            bus_idx = gc["bus"] - 1
            mask = net.gen["bus"] == bus_idx
            if mask.any():
                net.gen.loc[mask, "in_service"] = False
            _frequency_hz += _swing_eq(-lost_mw)
        _frequency_hz = max(59.5, _frequency_hz)

    elif disturbance.type == "line_cascade":
        # N-1 Cascade: auto-enable peak demand (if not already on) and the stabilizer,
        # then trip Line 6 (Bus 4→5). Bus 4 is pre-loaded 2.5× at peak, so losing the
        # 4→5 tie forces all Bus 4 supply through Line 3 (2→4) → congestion alarm.
        # Stabilizer keeps frequency neutral during the operator's Gen 2 redispatch fix.
        if not _PEAK_DEMAND:
            set_peak_demand(True)
        _GOVERNOR_ENABLED = True
        _set_line_in_service(6, False)

    else:
        raise HTTPException(400, detail=f"Unknown disturbance type: {disturbance.type}")

    return {
        "status": "triggered",
        "type": disturbance.type,
        "timestamp": timestamp
    }
