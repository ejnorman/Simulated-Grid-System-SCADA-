/**
 * MetricsPanel — system-wide metrics at a glance.
 *
 * Props:
 *   metrics — { frequency_hz, total_generation_mw, total_load_mw, total_losses_mw,
 *               system_status, critical_buses: number[], overloaded_lines: number[] }
 *             null while waiting for first telemetry response
 *
 * See docs/reference/frontend/src/components/MetricsPanel.js for a reference implementation.
 */

import { Grid, Typography } from "@mui/material";
import MetricCard from "./MetricCard";

export default function MetricsPanel({ metrics }) {
  if (!metrics) {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="body1">Loading metrics...</Typography>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard label="Frequency" value={metrics.frequency_hz} unit="Hz" />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard
          label="Generation"
          value={metrics.total_generation_mw}
          unit="MW"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard label="Load" value={metrics.total_load_mw} unit="MW" />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <MetricCard label="Losses" value={metrics.total_losses_mw} unit="MW" />
      </Grid>
    </Grid>
  );
}
