from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import asyncio

from .routes import metrics, alarms, control
from .services import polling
from .db import influx


@asynccontextmanager
async def lifespan(app: FastAPI):
    influx.init()
    task = asyncio.create_task(polling.polling_loop())
    yield
    task.cancel()
    influx.close()


app = FastAPI(
    title="EMS Backend Service",
    description="Data ingestion, alert logic, and control for the EMS",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics.router)
app.include_router(alarms.router)
app.include_router(control.router)


@app.get("/health", tags=["health"])
def health():
    return {
        "status": "healthy",
        "service": "backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": influx.client is not None,
    }


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=True)
