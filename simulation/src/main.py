from fastapi import FastAPI
from .routes import router
import uvicorn
import os

app = FastAPI(
    title="EMS Simulation Service",
    description="IEEE 14-bus power grid digital twin",
    version="0.1.0",
)

app.include_router(router)

if __name__ == "__main__":
    port = int(os.getenv("SIMULATION_PORT", "8000"))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=True)
