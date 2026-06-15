from fastapi import APIRouter, HTTPException
import httpx

from ..config import SIMULATION_URL
from ..services.alarms import alarms

router = APIRouter(tags=["disturbance"])


@router.post("/disturbance")
async def post_disturbance(body: dict):
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{SIMULATION_URL}/disturbance", json=body)
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, detail=resp.text)
    return resp.json()


@router.post("/reset")
async def post_reset():
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{SIMULATION_URL}/reset")
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, detail=resp.text)
    alarms.clear()
    return resp.json()


@router.post("/governor")
async def post_governor(body: dict):
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{SIMULATION_URL}/governor", json=body)
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, detail=resp.text)
    return resp.json()


@router.post("/peak-demand")
async def post_peak_demand(body: dict):
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(f"{SIMULATION_URL}/peak-demand", json=body)
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, detail=resp.text)
    return resp.json()
