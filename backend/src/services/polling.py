"""
Background polling loop — fetches telemetry from simulation every UPDATE_INTERVAL seconds.

See docs/reference/backend/src/services/polling.py for a reference implementation
that includes InfluxDB writes and threshold evaluation.
"""

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
    """
    Fetch telemetry from simulation and cache in last_telemetry.

    TODO:
      1. Write each metric to InfluxDB via db.influx.write_point()
      2. Call thresholds.check_thresholds(data) to evaluate alerts
    """
    global last_telemetry
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{SIMULATION_URL}/telemetry")
        resp.raise_for_status()
        data = resp.json()

    last_telemetry = data
    print(f"[{data['timestamp']}] freq={data['frequency_hz']:.3f} Hz  ingested")
