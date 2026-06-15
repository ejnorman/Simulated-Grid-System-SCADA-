import asyncio
import httpx

from ..config import SIMULATION_URL, UPDATE_INTERVAL

# Most recent telemetry snapshot — accessed by routes/metrics.py via module reference
last_telemetry: dict | None = None


async def polling_loop():
    """Main loop: poll simulation, store data, check thresholds."""
    while True:
        try:
            await ingest_telemetry()
        except Exception as e:
            print(f"[polling] Error: {e}")
        await asyncio.sleep(UPDATE_INTERVAL)


async def ingest_telemetry():
    """Fetch telemetry from simulation and cache in last_telemetry."""
    global last_telemetry
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{SIMULATION_URL}/telemetry")
        resp.raise_for_status()
        data = resp.json()

    last_telemetry = data
    print(f"[{data['timestamp']}] freq={data['frequency_hz']:.3f} Hz  ingested")

    from . import thresholds
    thresholds.check_thresholds(data)
