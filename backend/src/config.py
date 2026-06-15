import os

SIMULATION_URL  = os.getenv("SIMULATION_URL",  "http://localhost:8001")
UPDATE_INTERVAL = int(os.getenv("UPDATE_INTERVAL", "2"))
