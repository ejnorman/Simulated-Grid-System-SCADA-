"""
InfluxDB client — initialization, write helpers, and query helpers.

TODO (backend engineer):
  - Complete write_point() with real InfluxDB Point construction
  - Complete query_metric() with a real Flux query
  - Add downsampling / retention policy configuration if needed
"""

from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from ..config import INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, INFLUXDB_BUCKET

# Module-level client references — set by init(), cleared by close()
client: InfluxDBClient | None = None
write_api = None
query_api = None


def init():
    """Initialize the InfluxDB client. Called once at app startup."""
    global client, write_api, query_api
    client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)
    query_api = client.query_api()
    print(f"[InfluxDB] Connected → {INFLUXDB_URL}")


def close():
    """Close the InfluxDB client. Called once at app shutdown."""
    global client
    if client:
        client.close()
        print("[InfluxDB] Connection closed")


def write_point(measurement: str, tags: dict, fields: dict, timestamp: str):
    """
    Write a single data point to InfluxDB.

    TODO (backend engineer): Build the Point object and write it.

    Example:
        point = Point(measurement).time(timestamp, WritePrecision.SECONDS)
        for k, v in tags.items():
            point = point.tag(k, v)
        for k, v in fields.items():
            point = point.field(k, v)
        write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
    """
    pass


def query_metric(metric: str, start: str, end: str, interval: str | None = None) -> list[dict]:
    """
    Query a time-series metric from InfluxDB and return a list of data points.

    TODO (backend engineer): Build and execute a Flux query.

    Example Flux query:
        flux = f\'\'\'
            from(bucket: "{INFLUXDB_BUCKET}")
              |> range(start: {start}, stop: {end})
              |> filter(fn: (r) => r._measurement == "{metric}")
              |> aggregateWindow(every: {interval or "2s"}, fn: mean, createEmpty: false)
              |> yield(name: "mean")
        \'\'\'
        tables = query_api.query(flux, org=INFLUXDB_ORG)
        return [
            {{"timestamp": record.get_time().isoformat(), "value": record.get_value()}}
            for table in tables for record in table.records
        ]
    """
    return []
