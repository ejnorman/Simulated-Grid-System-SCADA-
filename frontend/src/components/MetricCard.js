/**
 * MetricCard — Displays a single SCADA metric with optional alarm highlighting.
 *
 * Props:
 *   @param {string} label - Display name of the metric (e.g., "Frequency", "City B Load")
 *   @param {number|null} value - Current telemetry value, or null if data is missing
 *   @param {string} unit - Measurement unit (e.g., "Hz", "MW", "kV", "PSI")
 *   @param {boolean} inAlarm - If true, applies alarm styling and shows alarm icon
 *   @param {string} severity - Required when inAlarm=true. Options: "warning" | "critical"
 *
 * Visual Behavior:
 *   - Normal state: White background, no icon, shows value + unit
 *   - Warning alarm: Light yellow background, ⚠️ icon
 *   - Critical alarm: Light red background, 🔴 icon
 *   - Missing data: Shows "—" instead of value (alarm styling still applies if inAlarm=true)
 *   - Smooth transition (0.2s ease) when alarm state changes
 *
 * Usage Examples:
 *   <MetricCard label="Frequency" value={49.8} unit="Hz" />
 *   <MetricCard label="City B Load" value={0} unit="MW" inAlarm={true} severity="critical" />
 *   <MetricCard label="Bus Voltage" value={135.2} unit="kV" inAlarm={true} severity="warning" />
 *   <MetricCard label="Missing Sensor" value={null} unit="MW" />
 *
 * Dependencies:
 *   - @mui/material (Paper, Typography)
 *
 * Parent Components:
 *   - MetricsPanel (primary) - passes telemetry data
 *   - Can also be used standalone for testing
 *
 * Related Components:
 *   - AlarmsPanel - Lists active alarms with more detail
 *   - StatusChip - Shows categorical status (normal/advisory/warning/critical)
 */

import { Paper, Typography } from "@mui/material";

export default function MetricCard({
  label,
  value,
  unit,
  inAlarm = false,
  severity = "critical",
}) {
  const alarmStyles = inAlarm
    ? {
        critical: { bgcolor: "#ffebee", borderColor: "#f44336" },
        warning: { bgcolor: "#fffde7", borderColor: "#ff9800" },
      }[severity]
    : {};

  const AlarmIcon = inAlarm ? (
    <span aria-label={`${severity} alarm`} style={{ marginRight: 4 }}>
      {severity === "critical" ? "🔴" : "⚠️"}
    </span>
  ) : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        textAlign: "center",
        ...alarmStyles,
        transition: "background-color 0.2s ease",
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight="bold">
        {AlarmIcon}
        {value ?? "—"}{" "}
        <Typography component="span" variant="body2">
          {unit}
        </Typography>
      </Typography>
    </Paper>
  );
}
