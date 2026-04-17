# Simulation Engineer Guide

## What you're building

You are building the **digital twin** of an IEEE 14-bus power grid. Your service runs as a standalone FastAPI app. The backend polls your `/telemetry` endpoint every 2 seconds, and the frontend displays what the backend receives. Operators can also send commands (adjust generation, trip a breaker) and inject test faults — your service handles those too.

Your job lives almost entirely in one file: `simulation/src/grid.py`.

---

## Project structure (simulation service)

```
simulation/
├── src/
│   ├── main.py        # App entry point — do not edit
│   ├── routes.py      # API endpoints — do not edit
│   ├── schemas.py     # Input data models — do not edit
│   ├── constants.py   # IEEE 14-bus network data — do not edit
│   └── grid.py        # YOUR FILE — implement everything here
├── requirements.txt
└── Dockerfile
```

**Read `constants.py` before you start.** It defines the full network topology:
- 14 buses (ID 1–14, with type and base voltage)
- 5 generators (at buses 1, 2, 3, 6, 8)
- 20 transmission lines (with rated capacity and base loading)
- 11 load points (with base MW and MVAR demand)

These are your inputs. Your functions in `grid.py` read this data and `grid_state` to produce outputs.

---

## How to run the service

```bash
cd simulation
pip install -r requirements.txt
python -m src.main
```

Or with Docker Compose from the project root:
```bash
docker compose up simulation
```

The service runs on port **8001** by default. Test it with:
```bash
curl http://localhost:8001/health
curl http://localhost:8001/telemetry
```

---

## Week 1 — Get the service running with mock data

### Step 1: Understand `grid_state`

Open `grid.py`. At the top you'll find `grid_state` — a dictionary already initialized from `constants.py`. It tracks the live runtime state of the grid: the current frequency, whether each generator is online and at what output, whether each line is in service, and each load's current demand.

Your three functions read from and write to this dict. When you later add pandapower, you'll replace this dict with a pandapower network object.

---

### Step 2: Implement `build_telemetry()`

This is the most important function. It should read the current values from `grid_state` and the static topology from `constants.py`, combine them into a snapshot, and return it. The backend parses the response by field name, so **do not change the field names** in the return dict.

The return value must have this shape — use this as your contract:

```python
{
    "timestamp": str,          # current UTC time in ISO 8601 format
    "frequency_hz": float,
    "buses": [                 # 14 entries, one per bus
        {"id": int, "voltage_pu": float, "voltage_kv": float, "type": str}
    ],
    "lines": [                 # 20 entries, one per line
        {"id": int, "from_bus": int, "to_bus": int, "power_mw": float,
         "power_mvar": float, "loading_percent": float, "in_service": bool}
    ],
    "generators": [            # 5 entries, one per generator
        {"id": int, "bus": int, "output_mw": float, "output_mvar": float,
         "capacity_mw": float, "in_service": bool}
    ],
    "loads": [                 # 11 entries, one per load
        {"id": int, "bus": int, "demand_mw": float, "demand_mvar": float}
    ],
}
```

A few things to keep in mind as you build this:

- A line that is not in service should report `power_mw: 0`, `power_mvar: 0`, and `loading_percent: 0`.
- A generator that is offline or has zero output should report `output_mw: 0`.
- `voltage_kv` is calculated by multiplying `voltage_pu` by the bus's `nominal_kv` from `constants.py`.

To make the data look live rather than frozen on the dashboard, add a small helper that applies ±0.4% random noise to any value before returning it:

```python
import random

def _jitter(value: float, pct: float = 0.004) -> float:
    return round(value * (1 + random.uniform(-pct, pct)), 4)
```

Apply `_jitter()` to voltage, power, and loading values. Do not apply it to IDs, bus references, or boolean flags.

**Verify:** `curl http://localhost:8001/telemetry` should return a full JSON response with all four sections populated, and the values should change slightly on each call.

---

### Step 3: Implement `apply_control()`

This function receives a `ControlCommand` object (see `schemas.py`) and must mutate `grid_state` based on `cmd.command_type`. Use an `if/elif` block to handle the three command types.

Before doing anything, validate the inputs. If a required field is missing or the ID doesn't exist in `grid_state`, raise a `400` HTTP error using FastAPI's `HTTPException`. Every branch should end by returning a dict that confirms what changed.

**`adjust_generation`:** Read `cmd.target.generator_id` and `cmd.target.delta_mw`. Add `delta_mw` to the generator's current `output_mw` in `grid_state`. Clamp the result so it never goes below 0 or above the generator's `capacity_mw` (look that up from `GENERATOR_CONFIG` in `constants.py`). Return the previous and new output values.

**`trip_breaker`:** Read `cmd.target.line_id`. Set that line's `in_service` to `False` in `grid_state`. Return the line ID and new status.

**`close_breaker`:** Same as `trip_breaker` but set `in_service` to `True`.

**Verify:**
```bash
curl -X POST http://localhost:8001/control \
  -H "Content-Type: application/json" \
  -d '{"command_type": "adjust_generation", "target": {"generator_id": 0, "delta_mw": 10}}'
```
Then hit `/telemetry` and confirm generator 0's output increased. Try tripping line 0 with `"trip_breaker"` and confirm the line shows `in_service: false` and zero power in the next telemetry snapshot.

---

### Step 4: Implement `apply_disturbance()`

This function injects test faults so the team can verify that backend alarms and auto-control responses trigger correctly. It receives a `Disturbance` object (see `schemas.py`). Like `apply_control()`, use an `if/elif` block on `disturbance.type` and validate inputs before doing anything.

**`generator_trip`:** Read `disturbance.target.generator_id`. Set that generator's `output_mw` to `0.0` and `in_service` to `False` in `grid_state`. Then lower `grid_state["frequency_hz"]` by `0.15` Hz to simulate the imbalance caused by losing a generating unit — but clamp it to a minimum of `59.5` so the grid doesn't collapse past a realistic floor.

**`load_spike`:** Read `disturbance.target.load_id` and `disturbance.target.percent_increase`. Multiply that load's `demand_mw` and `demand_mvar` in `grid_state` by `(1 + percent_increase / 100)`. Then lower `grid_state["frequency_hz"]` by `0.05` Hz — a smaller drop than a generator trip because load spikes cause a gentler imbalance.

**`line_outage`:** Read `disturbance.target.line_id`. Set that line's `in_service` to `False` in `grid_state`. No frequency change needed — a line outage doesn't directly change the generation/load balance.

All three branches should return:
```python
{"status": "triggered", "type": disturbance.type, "timestamp": <current UTC time>}
```

**Verify each disturbance type:**
```bash
# Trip generator 1 — then check /telemetry: generator 1 should be offline, frequency below 60
curl -X POST http://localhost:8001/disturbance \
  -H "Content-Type: application/json" \
  -d '{"type": "generator_trip", "target": {"generator_id": 1}}'

# Spike load 0 by 20% — then check /telemetry: load 0 demand_mw should be ~26 (was 21.7)
curl -X POST http://localhost:8001/disturbance \
  -H "Content-Type: application/json" \
  -d '{"type": "load_spike", "target": {"load_id": 0, "percent_increase": 20}}'

# Take line 3 out — then check /telemetry: line 3 should show in_service: false, power_mw: 0
curl -X POST http://localhost:8001/disturbance \
  -H "Content-Type: application/json" \
  -d '{"type": "line_outage", "target": {"line_id": 3}}'
```

---

### Step 5: Integration check

Once all three functions are working, run both services together and confirm the backend is ingesting your data:

```bash
docker compose up simulation backend
```

Watch the backend logs — you should see a line every 2 seconds:
```
[2024-01-01T00:00:00+00:00] freq=60.001 Hz  ingested
```

If you see this, the integration is working and the backend engineer can start their work.

---

## Week 2 — Replace mock with pandapower

pandapower is already in `requirements.txt`. The goal this week is to replace the mock with real AC power flow calculations so that voltages, line flows, and loading are physically correct rather than approximated.

### Step 6: Build the pandapower network

Write a `create_network()` function in `grid.py` that builds a pandapower network from the data already in `constants.py`. Call it once at module level so the same network object is reused across all requests.

Use `pp.create_empty_network()` as the starting point, then add components using pandapower's `create_*` functions:
- `pp.create_bus()` for each entry in `BUS_CONFIG`
- `pp.create_ext_grid()` for the slack bus (bus 1), `pp.create_gen()` for PV buses (2, 3, 6, 8)
- `pp.create_line_from_parameters()` for each entry in `LINE_CONFIG`
- `pp.create_load()` for each entry in `LOAD_CONFIG`

pandapower's documentation (pandapower.readthedocs.io) has full examples for each function.

---

### Step 7: Replace `build_telemetry()` with a real power flow solve

Replace the mock implementation with a call to `pp.runpp()`, then read the results from pandapower's result DataFrames (`net.res_bus`, `net.res_line`, `net.res_gen`, `net.res_load`). Extract the values and map them into the same response shape from Step 2.

The field names in the returned dict must stay the same as in Step 2 — the backend depends on them.

---

### Step 8: Wire control and disturbance into the network

Instead of mutating `grid_state`, mutate the pandapower network object's DataFrames directly (e.g. `net.gen`, `net.line`), then call `pp.runpp(net)` after each change so the next telemetry snapshot reflects the physically correct result.

For the frequency deviation on generator trip, replace the hardcoded `0.15` drop with the swing equation:

```
delta_f = P_lost_mw / (2 × H × S_base)
```

Where `H` is the inertia constant (typically 3–6 seconds) and `S_base` is 100 MVA for the IEEE 14-bus system.

---

## Summary of what you own

| File | Your role |
|------|-----------|
| `simulation/src/grid.py` | Implement and own entirely |
| `simulation/src/constants.py` | Read only |
| `simulation/src/schemas.py` | Read only |
| `simulation/src/routes.py` | Do not touch |
| `simulation/src/main.py` | Do not touch |

If you need to add helper functions or a `create_network()` function, add them to `grid.py`. If the file gets large, ask the integration lead about splitting it.
