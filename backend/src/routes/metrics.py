from fastapi import APIRouter, HTTPException

from ..services import polling

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
        "lines": [
            {
                "id":               l["id"],
                "from_bus":         l["from_bus"],
                "to_bus":           l["to_bus"],
                "in_service":       l["in_service"],
                "loading_percent":  round(l["loading_percent"], 1),
            }
            for l in data.get("lines", [])
        ],
        "generators": [
            {
                "id":          g["id"],
                "bus":         g["bus"],
                "in_service":  g["in_service"],
                "output_mw":   round(g["output_mw"], 1),
                "capacity_mw": g["capacity_mw"],
            }
            for g in data.get("generators", [])
        ],
    }


