/**
 * GridDiagram — IEEE 14-bus SVG one-line diagram.
 *
 * TODO (frontend engineer):
 *   1. Draw the 14-bus topology as an SVG using the connectivity below
 *   2. Color buses by voltage status (normal/warning/critical)
 *   3. Color lines by loading_percent (green < 80%, yellow 80–95%, red > 95%)
 *   4. Display voltage_pu values as labels on each bus node
 *   5. Make lines clickable to open a trip/close dialog
 *
 * Bus connectivity (from_bus → to_bus):
 *   1-2, 1-5, 2-3, 2-4, 2-5, 3-4, 4-5, 4-7, 4-9, 5-6,
 *   6-11, 6-12, 6-13, 7-8, 7-9, 9-10, 9-14, 10-11, 12-13, 13-14
 *
 * Generator buses: 1, 2, 3, 6, 8
 *
 * Props:
 *   telemetry — full telemetry object from GET /metrics/current (optional,
 *               used to color nodes/lines dynamically)
 */

import { Paper, Typography, Divider, Box } from '@mui/material';

export default function GridDiagram({ telemetry }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>One-Line Grid Diagram</Typography>
      <Divider sx={{ mb: 2 }} />
      <Box
        sx={{
          height: 340,
          bgcolor: '#eeeeee',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="text.secondary">
          [ IEEE 14-bus SVG diagram — implement as GridDiagram component ]
        </Typography>
      </Box>
    </Paper>
  );
}
