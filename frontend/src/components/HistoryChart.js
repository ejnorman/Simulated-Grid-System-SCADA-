/**
 * HistoryChart — historical trend chart for a single metric.
 *
 * TODO (frontend engineer):
 *   1. On mount (and when metric/range changes), call fetchMetricHistory()
 *      from api/client.js to load data points
 *   2. Render a Recharts <LineChart> with the returned data
 *   3. Add a time-range selector: Last 5 min / 15 min / 1 hour
 *   4. Consider auto-refreshing on the same interval as the polling loop
 *
 * Props:
 *   metric  — metric name string, e.g. "frequency", "voltage_bus_1"
 *   label   — display label for the chart title
 */

import { Box, Typography } from '@mui/material';

export default function HistoryChart({ metric = 'frequency', label }) {
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: '#eeeeee', borderRadius: 1, textAlign: 'center' }}>
      <Typography color="text.secondary" variant="body2">
        [ {label ?? metric} history — implement with Recharts + GET /metrics/history ]
      </Typography>
    </Box>
  );
}
