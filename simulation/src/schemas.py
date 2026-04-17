from pydantic import BaseModel
from typing import Optional


class ControlTarget(BaseModel):
    generator_id: Optional[int] = None
    delta_mw: Optional[float] = None
    line_id: Optional[int] = None


class ControlCommand(BaseModel):
    command_type: str   # "adjust_generation" | "trip_breaker" | "close_breaker"
    target: ControlTarget
    timestamp: Optional[str] = None


class DisturbanceTarget(BaseModel):
    generator_id: Optional[int] = None
    load_id: Optional[int] = None
    line_id: Optional[int] = None
    percent_increase: Optional[float] = None


class Disturbance(BaseModel):
    type: str           # "generator_trip" | "load_spike" | "line_outage"
    target: DisturbanceTarget
