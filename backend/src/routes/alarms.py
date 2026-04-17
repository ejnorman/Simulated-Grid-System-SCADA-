from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from ..services.alarms import alarms, acknowledge
from ..schemas import AcknowledgeRequest

router = APIRouter(prefix="/alarms", tags=["alarms"])


@router.get("")
def get_alarms(
    severity:     Optional[str]  = Query(None, description="Filter: 'advisory', 'warning', 'critical'"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledgment status"),
    limit:        int            = Query(50,   description="Max results per category"),
):
    """Return active (uncleared) and recently cleared alarms."""
    all_alarms = list(alarms.values())
    active = [a for a in all_alarms if "cleared_at" not in a]
    recent = [a for a in all_alarms if "cleared_at" in a]

    if severity:
        active = [a for a in active if a["severity"] == severity.lower()]
        recent = [a for a in recent if a["severity"] == severity.lower()]
    if acknowledged is not None:
        active = [a for a in active if a["acknowledged"] == acknowledged]

    return {"active": active[:limit], "recent": recent[:limit]}


@router.post("/{alarm_id}/acknowledge")
def acknowledge_alarm(alarm_id: str, body: AcknowledgeRequest):
    if alarm_id not in alarms:
        raise HTTPException(404, detail=f"Alarm '{alarm_id}' not found")
    acknowledge(alarm_id, body.acknowledged_by)
    alarm = alarms[alarm_id]
    return {
        "id":              alarm_id,
        "acknowledged":    True,
        "acknowledged_by": alarm["acknowledged_by"],
        "acknowledged_at": alarm["acknowledged_at"],
    }
