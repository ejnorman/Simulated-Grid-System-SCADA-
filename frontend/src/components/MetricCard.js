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
        advisory: { bgcolor: "#e3f2fd", borderColor: "#3b82f6" },
        warning: { bgcolor: "#fffde7", borderColor: "#ff9800" },
        critical: { bgcolor: "#ffebee", borderColor: "#f44336" },
      }[severity]
    : {};

  // Alarm icon based on severity
  const AlarmIcon = inAlarm ? (
    <>
      {severity === "critical" && (
        <ErrorOutlineIcon
          fontSize="small"
          color="error"
          sx={{ mr: 0.5, verticalAlign: "middle" }}
          aria-label="critical alarm"
        />
      )}
      {severity === "warning" && (
        <WarningAmberIcon
          fontSize="small"
          color="warning"
          sx={{ mr: 0.5, verticalAlign: "middle" }}
          aria-label="warning alarm"
        />
      )}
      {severity === "advisory" && (
        <InfoOutlinedIcon
          fontSize="small"
          color="info"
          sx={{ mr: 0.5, verticalAlign: "middle" }}
          aria-label="advisory alarm"
        />
      )}
    </>
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
