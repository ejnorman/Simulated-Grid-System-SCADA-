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
    return grid.build_telemetry()


@router.post("/control")
def post_control(cmd: ControlCommand):
    return grid.apply_control(cmd)


@router.post("/disturbance")
def post_disturbance(disturbance: Disturbance):
    return grid.apply_disturbance(disturbance)


@router.post("/reset")
def post_reset():
    return grid.reset_grid()


@router.post("/governor")
def post_governor(body: dict):
    enabled = bool(body.get("enabled", False))
    return grid.set_governor(enabled)


@router.post("/peak-demand")
def post_peak_demand(body: dict):
    enabled = bool(body.get("enabled", False))
    return grid.set_peak_demand(enabled)
