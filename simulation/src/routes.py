from fastapi import APIRouter
from datetime import datetime, timezone

from .schemas import ControlCommand, Disturbance
from . import grid

router = APIRouter()


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "simulation",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/telemetry")
def get_telemetry():
    """Return current grid state. Core logic lives in grid.build_telemetry()."""
    return grid.build_telemetry()


@router.post("/control")
def post_control(cmd: ControlCommand):
    """Execute a control command. Core logic lives in grid.apply_control()."""
    return grid.apply_control(cmd)


@router.post("/disturbance")
def post_disturbance(disturbance: Disturbance):
    """Inject a test disturbance. Core logic lives in grid.apply_disturbance()."""
    return grid.apply_disturbance(disturbance)
