import { useState, useCallback } from 'react';
import usePolling from './hooks/usePolling';
import { fetchCurrentMetrics, fetchAlarms } from './api/client';

// TODO: Import and render your components here

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [alarms, setAlarms]   = useState({ active: [], recent: [] });
  const [error, setError]     = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, alarmsRes] = await Promise.all([
        fetchCurrentMetrics(),
        fetchAlarms(),
      ]);
      setMetrics(metricsRes.data);
      setAlarms(alarmsRes.data);
      setError(null);
    } catch {
      setError('Cannot reach backend — check that all services are running.');
    }
  }, []);

  usePolling(fetchData);

  return (
    <div>
      <h1>EMS / SCADA Dashboard</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
      {/* TODO: Replace with your components */}
    </div>
  );
}
