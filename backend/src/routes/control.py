from fastapi import APIRouter, HTTPException
import httpx

from ..schemas import ControlCommand
from ..config import SIMULATION_URL

router = APIRouter(tags=["control"])


@router.post("/control")
async def post_control(cmd: ControlCommand):
    print(f"[control] Forwarding: {cmd.command_type} → {cmd.target}")
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{SIMULATION_URL}/control",
            json=cmd.model_dump(),
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, detail=resp.text)
    return resp.json()
