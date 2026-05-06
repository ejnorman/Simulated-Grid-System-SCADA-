/**
 * MetricCard — Displays a single SCADA metric with optional alarm highlighting.
 *
 * Props:
 *   @param {string} label - Display name of the metric (e.g., "Frequency", "City B Load")
 *   @param {number|null} value - Current telemetry value, or null if data is missing
 *   @param {string} unit - Measurement unit (e.g., "Hz", "MW", "kV", "PSI")
 *   @param {boolean} inAlarm - If true, applies alarm styling and shows alarm icon
 *   @param {string} severity - Required when inAlarm=true. Options: "advisory" | "warning" | "critical"
 *
 * Visual Behavior:
 *   - Normal state: White background, no icon, shows value + unit
 *   - Advisory alarm: Light blue background, info icon
 *   - Warning alarm: Light yellow background, warning icon
 *   - Critical alarm: Light red background, error icon
 *   - Missing data: Shows "—" instead of value (alarm styling still applies if inAlarm=true)
 *   - Smooth transition (0.2s ease) when alarm state changes
 *
 * Dependencies:
 *   - @mui/material (Paper, Typography)
 *   - @mui/icons-material (ErrorOutlineIcon, WarningAmberIcon, InfoOutlinedIcon)
 *
 * Parent Components:
 *   - MetricsPanel (primary) - passes telemetry data
 *
 * Related Components:
 *   - AlarmsPanel - Lists active alarms with more detail
 *   - StatusChip - Shows categorical status (normal/advisory/warning/critical)
 */

import { Paper, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function MetricCard({
  label,
  value,
  unit,
  inAlarm = false,
  severity = "critical",
}) {
  // Alarm styling based on severity
  const alarmStyles = inAlarm
    ? {
        advisory: { bgcolor: "#e3f2fd", borderColor: "#3b82f6" }, // Light blue
        warning: { bgcolor: "#fffde7", borderColor: "#ff9800" }, // Light yellow
        critical: { bgcolor: "#ffebee", borderColor: "#f44336" }, // Light red
      }[severity]
    : {};

  // Alarm icon based on severity
  const AlarmIcon = inAlarm ? (
    <span
      aria-label={`${severity} alarm`}
      style={{
        marginRight: 4,
        display: "inline-flex",
        verticalAlign: "middle",
      }}
    >
      {severity === "critical" && (
        <ErrorOutlineIcon fontSize="small" color="error" />
      )}
      {severity === "warning" && (
        <WarningAmberIcon fontSize="small" color="warning" />
      )}
      {severity === "advisory" && (
        <InfoOutlinedIcon fontSize="small" color="info" />
      )}
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
      <Typography
        variant="h5"
        fontWeight="bold"
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {AlarmIcon}
        {value ?? "—"}{" "}
        <Typography component="span" variant="body2">
          {unit}
        </Typography>
      </Typography>
    </Paper>
  );
}
