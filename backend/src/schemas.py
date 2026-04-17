from pydantic import BaseModel
from typing import Optional


class AcknowledgeRequest(BaseModel):
    acknowledged_by: str


class ControlTarget(BaseModel):
    generator_id: Optional[int] = None
    delta_mw: Optional[float] = None
    line_id: Optional[int] = None


class ControlCommand(BaseModel):
    command_type: str
    target: ControlTarget
    timestamp: Optional[str] = None
