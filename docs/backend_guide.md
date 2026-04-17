# Backend Engineer Guide

## What you're building

You are building the brain of the EMS system. Your service sits between the simulation and the frontend: it polls the simulation every 2 seconds, evaluates the data against safety thresholds, manages an alarm store, and serves the frontend's API calls. It also writes time-series telemetry to InfluxDB so the frontend can show historical charts.

Your work is split across five files in `backend/src/`. The routes — the actual API endpoints — are already written for you. Your job is to implement the services and database layers that those routes depend on.

---

## Project structure (backend service)

```
backend/
├── src/
│   ├── main.py              # App entry point — do not edit
│   ├── config.py            # Environment variables — do not edit
│   ├── schemas.py           # Input data models — do not edit
│   ├── routes/
│   │   ├── metrics.py       # GET /metrics/current, GET /metrics/history — do not edit
│   │   ├── alarms.py        # GET /alarms, POST /alarms/{id}/acknowledge — do not edit
│   │   └── control.py       # POST /control — do not edit
│   ├── services/
│   │   ├── alarms.py        # YOUR FILE — alarm store
│   │   ├── thresholds.py    # YOUR FILE — threshold evaluation
│   │   ├── polling.py       # YOUR FILE — background polling loop
│   │   └── control.py       # YOUR FILE — automatic control responses
│   └── db/
│       └── influx.py        # YOUR FILE — InfluxDB persistence
├── requirements.txt
└── Dockerfile
```

Read the route files before you start so you understand what the frontend expects. Each route file imports directly from your service files, so the shapes you return matter.

---

## How to run the service

The backend requires the simulation to be running first. Start both with:

```bash
docker compose up simulation backend
```

Or run the backend alone locally (it will fail to poll but the API will start):

```bash
cd backend
pip install -r requirements.txt
python -m src.main
```

The service runs on port **8002** externally. Test it with:

```bash
curl http://localhost:8002/health
curl http://localhost:8002/metrics/current
curl http://localhost:8002/alarms
```

---

## Week 1 — Alarms, thresholds, and auto-control

The goal this week is to get alarms appearing and the threshold evaluation working. You do not need InfluxDB yet — the `GET /metrics/current` endpoint already works from in-memory data, and `GET /metrics/history` will just return an empty list until Week 2.

Work through the files in this order. Each step depends on the one before it.

---

### Step 1: Implement the alarm store (`services/alarms.py`)

Everything else in Week 1 depends on this file. The module-level `alarms` dict is already declared — it maps alarm IDs to alarm records and is shared across all routes.

Each alarm record is a plain dict with this shape (the routes read fields by name, so do not change them):

```python
{
    "id": "freq_out_of_range",
    "severity": "critical",           # "advisory", "warning", or "critical"
    "message": "Frequency critical: 59.75 Hz",
    "metric": "frequency_hz",
    "value": 59.75,
    "threshold": 59.80,
    "timestamp": "2024-01-01T00:00:00+00:00",
    "acknowledged": False,
    "acknowledged_by": None,
    "acknowledged_at": None,
}
```

**`create_alarm(alarm_id, severity, message, metric, value, threshold)`:** Check whether an alarm with that ID already exists in the `alarms` dict. If it does, do nothing and return the existing record. If it does not, build a new record using the shape above, store it in `alarms`, and return it. The `timestamp` should be the current UTC time.

The reason for the ID check is important: `create_alarm` will be called on every poll cycle (every 2 seconds) for as long as a fault condition persists. Without the check, the same fault would generate hundreds of duplicate alarms. Using a stable, predictable ID like `"freq_out_of_range"` or `"voltage_bus_5"` means a condition only ever produces one alarm entry.

**`clear_alarm(alarm_id)`:** Look up the alarm by ID. If it exists and does not already have a `"cleared_at"` key, add one with the current UTC timestamp. Do not delete the record — cleared alarms stay in the store so the frontend can show recent history.

**`acknowledge(alarm_id, operator)`:** Look up the alarm by ID. If it exists, set `acknowledged` to `True`, `acknowledged_by` to the operator string, and `acknowledged_at` to the current UTC timestamp.

**Verify:** There's no direct endpoint to call yet, but you can add a temporary `print(alarms)` inside `create_alarm` and call it from a quick test script to confirm the dict is being populated correctly.

---

### Step 2: Implement threshold evaluation (`services/thresholds.py`)

The `THRESHOLDS` dict is already defined in this file — read it carefully before implementing `check_thresholds`. It contains the safe operating bands for frequency, bus voltage, line loading, and generator capacity.

`check_thresholds(data)` receives a telemetry snapshot (the same shape the simulation returns) and must evaluate each metric against those bands, calling `create_alarm()` when a threshold is breached and `clear_alarm()` when the value returns to normal.

Work through the four metric types:

**Frequency:** Read `data["frequency_hz"]`. Compare it against the `"warning"` band in `THRESHOLDS["frequency"]` — if it's outside that band, call `create_alarm` with severity `"critical"`. If it's within warning but outside `"advisory"`, call `create_alarm` with severity `"warning"`. If it's within normal range, call `clear_alarm`. Use `"freq_out_of_range"` as the alarm ID.

**Bus voltage:** Loop over `data["buses"]`. For each bus, compare `voltage_pu` against `THRESHOLDS["voltage_pu"]`. Outside the `"warning"` band is critical, outside `"normal"` but inside `"warning"` is a warning, inside normal clears. Use a per-bus alarm ID like `f"voltage_bus_{bus['id']}"` so each bus gets its own independent alarm.

**Line loading:** Loop over `data["lines"]`. Skip lines where `in_service` is `False`. Compare `loading_percent` against `THRESHOLDS["line_loading_pct"]` — above the `"warning"` value is critical, above `"normal"` but below `"warning"` is a warning, below `"normal"` clears. Use `f"loading_line_{line['id']}"` as the alarm ID.

**Generator capacity:** Loop over `data["generators"]`. Skip generators where `in_service` is `False` or `capacity_mw` is zero. Calculate utilization as `output_mw / capacity_mw` and compare against `THRESHOLDS["generator_capacity_pct"]`. Use `f"gen_overload_{gen['id']}"` as the alarm ID.

At the very end of the function, call `handle_critical_alarms()` so any automatic responses are triggered immediately after evaluation.

---

### Step 3: Implement automatic control (`services/control.py`)

`handle_critical_alarms()` is called at the end of every threshold check. It inspects the alarm store and issues commands to the simulation when certain conditions require an automatic response.

The file docstring lists the three scenarios to handle. Because `handle_critical_alarms` lives in `control.py` and needs to read from `alarms.py`, import the `alarms` dict **inside the function body** (not at the top of the file) to avoid a circular import:

```python
def handle_critical_alarms():
    from .alarms import alarms
    ...
```

**Scenario 1 — Under-frequency:** Check whether a critical `"freq_out_of_range"` alarm exists and has not been cleared. If so, send a `POST /control` request to the simulation via `httpx` to increase generation on an available generator. Use the `SIMULATION_URL` from `config.py` for the URL. The control command shape is:

```python
{
    "command_type": "adjust_generation",
    "target": {"generator_id": <int>, "delta_mw": <float>},
    "timestamp": <current UTC time as ISO string>
}
```

**Scenario 2 — Line overload:** Find any critical line loading alarms. Per the project spec, you must **not** auto-trip the line — just log that the condition exists so the operator knows to take action.

**Scenario 3 — Generator trip:** Find any generator overload alarms that indicate a unit has gone offline. Redistribute the lost MW across remaining in-service generators by sending `adjust_generation` commands for each one.

---

### Step 4: Wire thresholds into the polling loop (`services/polling.py`)

The polling loop is already running — `ingest_telemetry()` fetches from the simulation and caches the result in `last_telemetry` every 2 seconds. Your job is to add two calls after the cache is updated.

First, import the thresholds module at the top of the file:
```python
from . import thresholds
```

Then, inside `ingest_telemetry()`, after `last_telemetry = data`, call `thresholds.check_thresholds(data)`. That's the only change needed in this file for Week 1.

**Integration check — verify the full alarm pipeline:**

Start all three services:
```bash
docker compose up simulation backend
```

Then inject a disturbance into the simulation:
```bash
curl -X POST http://localhost:8001/disturbance \
  -H "Content-Type: application/json" \
  -d '{"type": "generator_trip", "target": {"generator_id": 1}}'
```

Wait 3–4 seconds (one poll cycle), then check the alarm store:
```bash
curl http://localhost:8002/alarms
```

You should see a `"freq_out_of_range"` alarm with severity `"critical"` in the `active` list. If you do, the full pipeline — simulation → polling → threshold evaluation → alarm store → API — is working end to end.

---

## Week 2 — InfluxDB persistence

With alarms working, this week adds historical data storage so the frontend can show time-series charts.

### Step 5: Implement `write_point()` (`db/influx.py`)

The `init()` and `close()` functions are already implemented — they create the InfluxDB client at app startup and close it on shutdown. Your job is to implement the two stub functions.

`write_point(measurement, tags, fields, timestamp)` writes a single data point to InfluxDB. The `influxdb-client` library uses a builder pattern: create a `Point` object from the measurement name, chain `.tag()` calls for each tag, chain `.field()` calls for each field value, set the time, then write it using `write_api`.

The `Point` class and `write_api` are already imported and initialized — look at the top of the file to see what's available. The `INFLUXDB_BUCKET` and `INFLUXDB_ORG` constants from `config.py` are already imported too.

**Verify:** After implementing, add a test call in `ingest_telemetry()` for just the frequency metric, run the stack, then open the InfluxDB UI at `http://localhost:8086` (credentials in `.env.example` at the project root) and confirm a `frequency` measurement is appearing in the `telemetry` bucket.

---

### Step 6: Wire metric writes into the polling loop (`services/polling.py`)

Now that `write_point()` works, call it inside `ingest_telemetry()` for each metric in the telemetry snapshot. Import the influx module:

```python
from ..db import influx
```

Write one point per metric type on each poll cycle. Use the measurement name as a logical grouping, tags to identify which bus/line/generator the reading came from, and fields for the numeric values. For example, frequency has no sub-components so it just needs one call. Buses, lines, and generators each need a loop — one call per entry, using the component ID as a tag so you can query per-bus or per-line history later.

---

### Step 7: Implement `query_metric()` (`db/influx.py`)

`query_metric(metric, start, end, interval)` is called by the `GET /metrics/history` route when the frontend requests chart data. It should query InfluxDB using Flux — InfluxDB's query language — and return a list of `{"timestamp": str, "value": float}` dicts.

A Flux query filters by bucket, time range, and measurement name, then optionally aggregates values into time windows. The `query_api` object (already initialized in `init()`) has a `.query()` method that executes a Flux string and returns result tables. Each table contains records with `.get_time()` and `.get_value()` methods.

InfluxDB's documentation has Flux query examples. The `interval` parameter maps to Flux's `aggregateWindow(every: ...)` function — use it when provided, skip aggregation when it's `None`.

---

## Summary of what you own

| File | Your role |
|------|-----------|
| `backend/src/services/alarms.py` | Implement entirely |
| `backend/src/services/thresholds.py` | Implement `check_thresholds()` — `THRESHOLDS` dict is already provided |
| `backend/src/services/control.py` | Implement `handle_critical_alarms()` |
| `backend/src/services/polling.py` | Add InfluxDB writes and `check_thresholds` call to `ingest_telemetry()` |
| `backend/src/db/influx.py` | Implement `write_point()` and `query_metric()` — `init()` and `close()` are already done |
| `backend/src/routes/*` | Do not touch |
| `backend/src/main.py` | Do not touch |
| `backend/src/config.py` | Do not touch |

If you have questions about the data shapes coming from the simulation, ask the integration lead or read `simulation/src/constants.py` for the network topology.
