"""
Automatic control loop — responds to critical alarm conditions.

See docs/reference/backend/src/services/control.py for a reference implementation.

Three scenarios to handle (per PROJECT_CONTEXT.md):
  1. Under-frequency (freq < 59.80 Hz) — auto-increase generation
  2. Line overload > 95%              — alert operator only, do NOT auto-trip
  3. Generator trip                   — redistribute lost MW across remaining generators
"""

import httpx
from ..config import SIMULATION_URL


def handle_critical_alarms():
    """
    Inspect the active alarm store and issue automatic control commands where required.
    Import alarms inside this function to avoid a circular import with alarms.py:
        from .alarms import alarms
    """
    raise NotImplementedError
