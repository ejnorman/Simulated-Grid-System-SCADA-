/**
 * MetricsPanel — system-wide metrics at a glance.
 *
 * Props:
 *   metrics — { frequency_hz, total_generation_mw, total_load_mw, total_losses_mw,
 *               system_status, critical_buses: number[], overloaded_lines: number[] }
 *             null while waiting for first telemetry response
 */

import {
  Grid,
  Typography,
  CircularProgress,
  Box,
  Alert,
  AlertTitle,
} from "@mui/material";
import MetricCard from "./MetricCard";
import StatusChip from "./StatusChip";

// Helper function to determine frequency status
const getFrequencyStatus = (freq) => {
  if (freq === null || freq === undefined) return "normal";
  if (freq >= 59.95 && freq <= 60.05) return "normal";
  if (freq >= 59.8 && freq <= 60.2) return "warning";
  return "critical";
};

// Helper function to determine alarm severity for other metrics
const getSeverity = (metricName, value) => {
  if (value === null || value === undefined) return null;

  switch (metricName) {
    case "frequency_hz":
      const status = getFrequencyStatus(value);
      return status === "critical"
        ? "critical"
        : status === "warning"
          ? "warning"
          : null;
    case "total_generation_mw":
    case "total_load_mw":
      if (value < 2500 || value > 4000) return "critical";
      if (value < 3000 || value > 3800) return "warning";
      return null;
    case "total_losses_mw":
      if (value > 150) return "critical";
      if (value > 100) return "warning";
      return null;
    default:
      return null;
  }
};

export default function MetricsPanel({ metrics }) {
  // Loading state
  if (!metrics) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading metrics...</Typography>
      </Box>
    );
  }

  // Check for critical conditions
  const hasCriticalConditions =
    metrics.critical_buses?.length > 0 || metrics.overloaded_lines?.length > 0;

  // Get system status
  const systemStatus = metrics.system_status || "normal";

  return (
    <Box>
      {/* Header with system status */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Key Metrics</Typography>
        <StatusChip status={systemStatus} />
      </Box>

      {/* Metric Cards Grid */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Frequency"
            value={metrics.frequency_hz}
            unit="Hz"
            inAlarm={getSeverity("frequency_hz", metrics.frequency_hz) !== null}
            severity={
              getSeverity("frequency_hz", metrics.frequency_hz) || "critical"
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Generation"
            value={metrics.total_generation_mw}
            unit="MW"
            inAlarm={
              getSeverity(
                "total_generation_mw",
                metrics.total_generation_mw,
              ) !== null
            }
            severity={
              getSeverity("total_generation_mw", metrics.total_generation_mw) ||
              "critical"
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Load"
            value={metrics.total_load_mw}
            unit="MW"
            inAlarm={
              getSeverity("total_load_mw", metrics.total_load_mw) !== null
            }
            severity={
              getSeverity("total_load_mw", metrics.total_load_mw) || "critical"
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Losses"
            value={metrics.total_losses_mw}
            unit="MW"
            inAlarm={
              getSeverity("total_losses_mw", metrics.total_losses_mw) !== null
            }
            severity={
              getSeverity("total_losses_mw", metrics.total_losses_mw) ||
              "critical"
            }
          />
        </Grid>
      </Grid>

      {/* Critical Conditions Alert */}
      {hasCriticalConditions && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <AlertTitle>Critical Conditions Detected</AlertTitle>
          {metrics.critical_buses?.length > 0 && (
            <Typography variant="body2">
              Critical Buses: {metrics.critical_buses.join(", ")}
            </Typography>
          )}
          {metrics.overloaded_lines?.length > 0 && (
            <Typography variant="body2">
              Overloaded Lines: {metrics.overloaded_lines.join(", ")}
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  );
}
