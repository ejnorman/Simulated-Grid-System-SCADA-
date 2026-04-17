"""
Central configuration — all environment variables read in one place.
Every other module imports from here instead of calling os.getenv() directly.
"""
import os

SIMULATION_URL  = os.getenv("SIMULATION_URL",  "http://localhost:8001")
INFLUXDB_URL    = os.getenv("INFLUXDB_URL",    "http://localhost:8086")
INFLUXDB_TOKEN  = os.getenv("INFLUXDB_TOKEN",  "my-super-secret-auth-token")
INFLUXDB_ORG    = os.getenv("INFLUXDB_ORG",    "capstone")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "telemetry")
UPDATE_INTERVAL = int(os.getenv("UPDATE_INTERVAL", "2"))
