from fastapi import APIRouter, HTTPException
import httpx

from ..config import SIMULATION_URL

router = APIRouter(tags=["disturbance"])


@router.post("/disturbance")
async def post_disturbance(body: dict):
    """Proxy a test disturbance to the simulation service."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{SIMULATION_URL}/disturbance", json=body)
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, detail=resp.text)
    return resp.json()
