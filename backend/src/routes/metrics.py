from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..services import polling
from ..db import influx

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/current")
def get_metrics_current():
    """
    Return latest grid metrics derived from the most recently ingested telemetry.
    Fast in-memory response — no InfluxDB query required.
    """
    if polling.last_telemetry is None:
        raise HTTPException(503, detail="No telemetry available yet — simulation may not be reachable")

    data = polling.last_telemetry
    freq       = data["frequency_hz"]
    total_gen  = sum(g["output_mw"]  for g in data["generators"])
    total_load = sum(l["demand_mw"]  for l in data["loads"])

    if 59.95 <= freq <= 60.05:
        status = "normal"
    elif 59.80 <= freq <= 60.20:
        status = "warning"
    else:
        status = "critical"

    critical_buses   = [b["id"] for b in data["buses"] if b["voltage_pu"] < 0.93 or b["voltage_pu"] > 1.07]
    overloaded_lines = [l["id"] for l in data["lines"] if l["loading_percent"] > 95.0]

    return {
        "timestamp":           data["timestamp"],
        "frequency_hz":        freq,
        "total_generation_mw": round(total_gen, 2),
        "total_load_mw":       round(total_load, 2),
        "total_losses_mw":     round(total_gen - total_load, 2),
        "system_status":       status,
        "critical_buses":      critical_buses,
        "overloaded_lines":    overloaded_lines,
    }


@router.get("/history")
def get_metrics_history(
    metric:   str           = Query(...,  description="e.g. 'frequency', 'voltage_bus_1', 'line_loading_0'"),
    start:    str           = Query(...,  description="ISO 8601 start time"),
    end:      str           = Query(...,  description="ISO 8601 end time"),
    interval: Optional[str] = Query(None, description="Aggregation window, e.g. '1m', '5m'"),
):
    """
    Query historical telemetry from InfluxDB.
    Core query logic lives in db/influx.py:query_metric().
    """
    data_points = influx.query_metric(metric, start, end, interval)
    return {"metric": metric, "start": start, "end": end, "data_points": data_points}
