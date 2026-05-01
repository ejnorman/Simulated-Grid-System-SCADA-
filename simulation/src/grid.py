"""
Grid Model — IEEE 14-Bus Power Grid (MOCK IMPLEMENTATION)
 
This module owns all grid state and the logic for reading and mutating it.
 
CURRENT STATE: Mock implementation using in-memory dictionary.
ROLE 1 TODO: Replace with pandapower network object and real power flow calculations.
 
The three functions below define the API contract. Keep their signatures unchanged
when migrating to pandapower - only replace the internal logic.
"""
 
import random
from datetime import datetime, timezone
from fastapi import HTTPException
 
from .constants import BUS_CONFIG, GENERATOR_CONFIG, LINE_CONFIG, LOAD_CONFIG
from .schemas import ControlCommand, Disturbance
 
 
# =============================================================================
# MODULE-LEVEL STATE
# =============================================================================
# CURRENT: Simple dictionary tracking grid state
# ROLE 1 TODO: Replace with pandapower network object created via create_network()
#
# Example future state:
# import pandapower as pp
# import pandapower.networks as pn
# net = pn.case14()  # or create_network()
# =============================================================================
 
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
 
 
# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
 
def _jitter(value: float, pct: float = 0.004) -> float:
    """
    Add ±0.4% random noise to simulate real sensor variance.
    Makes dashboard look "live" instead of frozen.
    
    ROLE 1 NOTE: Keep this function - it's useful even with pandapower.
    Apply jitter to final telemetry values before returning.
    """
    return round(value * (1 + random.uniform(-pct, pct)), 4)
 
 
# =============================================================================
# PUBLIC API - THREE CORE FUNCTIONS
# =============================================================================
 
def build_telemetry() -> dict:
    """
    Return the current grid state as a telemetry snapshot.
    Called by routes.get_telemetry() every time the backend polls (every 2 seconds).
    
    CURRENT IMPLEMENTATION: Returns static values from constants with jitter.
    
    ROLE 1 TODO: Replace with pandapower implementation:
    1. Run power flow: pp.runpp(net)
    2. Extract results from net.res_bus, net.res_line, net.res_gen, net.res_load
    3. Format into same response shape below (DO NOT change field names)
    4. Handle bus indexing: pandapower uses 0-indexed (0-13), API uses 1-indexed (1-14)
    5. Calculate voltage_kv from voltage_pu * nominal_kv
    6. Calculate loading_percent from line flows vs rated capacity
    7. Apply _jitter() to make values look live
    
    IMPORTANT: Response shape must match API contract exactly.
    Backend and frontend depend on these exact field names.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    freq = _jitter(grid_state["frequency_hz"])
    
    # Build buses array - 14 entries
    buses = []
    for b in BUS_CONFIG:
        buses.append({
            "id": b["id"],
            "voltage_pu": _jitter(b["base_voltage_pu"]),
            "voltage_kv": _jitter(b["base_voltage_pu"] * b["nominal_kv"]),
            "type": b["type"]
        })
    
    # Build lines array - 20 entries
    # Check in_service status from grid_state, return zeros if out of service
    lines = []
    for l in LINE_CONFIG:
        in_service = grid_state["lines"][l["id"]]["in_service"]
        if in_service:
            pwr = _jitter(l["base_power_mw"])
            lines.append({
                "id": l["id"],
                "from_bus": l["from_bus"],
                "to_bus": l["to_bus"],
                "power_mw": pwr,
                "power_mvar": round(pwr * 0.23, 4),
                "loading_percent": _jitter(l["base_loading"]),
                "in_service": True
            })
        else:
            # Out of service line - all zeros
            lines.append({
                "id": l["id"],
                "from_bus": l["from_bus"],
                "to_bus": l["to_bus"],
                "power_mw": 0.0,
                "power_mvar": 0.0,
                "loading_percent": 0.0,
                "in_service": False
            })
    
    # Build generators array - 5 entries
    # Use actual output from grid_state (modified by controls)
    generators = []
    for g in GENERATOR_CONFIG:
        gen_state = grid_state["generators"][g["id"]]
        if gen_state["in_service"]:
            out = _jitter(gen_state["output_mw"])
            generators.append({
                "id": g["id"],
                "bus": g["bus"],
                "output_mw": out,
                "output_mvar": round(out * 0.072, 4),
                "capacity_mw": g["capacity_mw"],
                "in_service": True
            })
        else:
            # Offline generator - zero output
            generators.append({
                "id": g["id"],
                "bus": g["bus"],
                "output_mw": 0.0,
                "output_mvar": 0.0,
                "capacity_mw": g["capacity_mw"],
                "in_service": False
            })
    
    # Build loads array - 11 entries
    # Use actual demand from grid_state (modified by disturbances)
    loads = []
    for ld in LOAD_CONFIG:
        load_state = grid_state["loads"][ld["id"]]
        loads.append({
            "id": ld["id"],
            "bus": ld["bus"],
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
    
    Three command types:
    - "adjust_generation": Change generator MW output
    - "trip_breaker": Open a line (set in_service=False)
    - "close_breaker": Close a line (set in_service=True)
    
    CURRENT IMPLEMENTATION: Modifies grid_state dictionary.
    
    ROLE 1 TODO: Replace with pandapower implementation:
    1. Modify pandapower network DataFrames (net.gen, net.line)
    2. Re-run power flow: pp.runpp(net)
    3. Handle convergence failures gracefully (try/except, return last good state)
    4. Return same response shape below
    
    IMPORTANT: Always validate inputs before modifying network.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    
    if cmd.command_type == "adjust_generation":
        gen_id = cmd.target.generator_id
        delta_mw = cmd.target.delta_mw
        
        # Validate inputs
        if gen_id is None or delta_mw is None:
            raise HTTPException(400, detail="Missing generator_id or delta_mw")
        if gen_id not in grid_state["generators"]:
            raise HTTPException(400, detail=f"Generator {gen_id} does not exist")
        
        # Get capacity from constants
        capacity = next(g["capacity_mw"] for g in GENERATOR_CONFIG if g["id"] == gen_id)
        
        # Apply change with clamping [0, capacity]
        gen_state = grid_state["generators"][gen_id]
        previous = gen_state["output_mw"]
        new_output = max(0.0, min(capacity, previous + delta_mw))
        gen_state["output_mw"] = new_output
        
        # Simple frequency approximation (real implementation: swing equation)
        # Increasing generation → frequency increases slightly
        grid_state["frequency_hz"] += delta_mw * 0.001
        grid_state["frequency_hz"] = max(59.5, min(60.5, grid_state["frequency_hz"]))
        
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
        
        # Validate
        if line_id is None:
            raise HTTPException(400, detail="Missing line_id")
        if line_id not in grid_state["lines"]:
            raise HTTPException(400, detail=f"Line {line_id} does not exist")
        
        # Trip breaker (open line)
        grid_state["lines"][line_id]["in_service"] = False
        
        return {
            "status": "success",
            "command_type": cmd.command_type,
            "executed_at": timestamp,
            "result": {
                "line_id": line_id,
                "in_service": False
            }
        }

    elif cmd.command_type == "close_breaker":
        line_id = cmd.target.line_id

        # Validate
        if line_id is None:
            raise HTTPException(400, detail="Missing line_id")
        if line_id not in grid_state["lines"]:
            raise HTTPException(400, detail=f"Line {line_id} does not exist")

        # Close breaker
        grid_state["lines"][line_id]["in_service"] = True

        return {
            "status": "success",
            "command_type": cmd.command_type,
            "executed_at": timestamp,
            "result": {
                "line_id": line_id,
                "in_service": True
            }
        }
    
    else:
        raise HTTPException(400, detail=f"Unknown command_type: {cmd.command_type}")
 
 
def apply_disturbance(disturbance: Disturbance) -> dict:
    """
    Inject a test disturbance (fault) into the grid.
    Called by routes.post_disturbance() for testing/demo purposes.
    
    Three disturbance types:
    - "generator_trip": Take a generator offline
    - "load_spike": Suddenly increase load demand
    - "line_outage": Take a line out of service
    
    CURRENT IMPLEMENTATION: Modifies grid_state, approximates frequency drop.
    
    ROLE 1 TODO: Replace with pandapower implementation:
    1. Modify network state (set gen offline, increase load, etc.)
    2. Calculate proper frequency deviation using swing equation:
       delta_f = P_imbalance_mw / (2 × H × S_base)
       where H = 4s (inertia constant), S_base = 100 MVA
    3. Re-run power flow
    4. Return same response shape
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    
    if disturbance.type == "generator_trip":
        gen_id = disturbance.target.generator_id
        
        # Validate
        if gen_id is None:
            raise HTTPException(400, detail="Missing generator_id")
        if gen_id not in grid_state["generators"]:
            raise HTTPException(400, detail=f"Generator {gen_id} does not exist")
        
        # Trip generator (set output to 0, mark offline)
        grid_state["generators"][gen_id]["output_mw"] = 0.0
        grid_state["generators"][gen_id]["in_service"] = False
        
        # Frequency drops due to lost generation
        # TODO: Replace with swing equation calculation
        grid_state["frequency_hz"] -= 0.15
        grid_state["frequency_hz"] = max(59.5, grid_state["frequency_hz"])
        
    elif disturbance.type == "load_spike":
        load_id = disturbance.target.load_id
        pct = disturbance.target.percent_increase
        
        # Validate
        if load_id is None or pct is None:
            raise HTTPException(400, detail="Missing load_id or percent_increase")
        if load_id not in grid_state["loads"]:
            raise HTTPException(400, detail=f"Load {load_id} does not exist")
        
        # Increase load demand
        load_state = grid_state["loads"][load_id]
        load_state["demand_mw"] = round(load_state["demand_mw"] * (1 + pct / 100), 2)
        load_state["demand_mvar"] = round(load_state["demand_mvar"] * (1 + pct / 100), 2)
        
        # Frequency drops slightly (smaller than generator trip)
        # TODO: Replace with swing equation calculation
        grid_state["frequency_hz"] -= 0.05
        grid_state["frequency_hz"] = max(59.5, grid_state["frequency_hz"])
        
    elif disturbance.type == "line_outage":
        line_id = disturbance.target.line_id
        
        # Validate
        if line_id is None:
            raise HTTPException(400, detail="Missing line_id")
        if line_id not in grid_state["lines"]:
            raise HTTPException(400, detail=f"Line {line_id} does not exist")
        
        # Take line out of service
        grid_state["lines"][line_id]["in_service"] = False
        
        # No frequency change for line outage in mock
        # (In real system, depends on power flow redistribution)
        
    else:
        raise HTTPException(400, detail=f"Unknown disturbance type: {disturbance.type}")
    
    return {
        "status": "triggered",
        "type": disturbance.type,
        "timestamp": timestamp
    }
