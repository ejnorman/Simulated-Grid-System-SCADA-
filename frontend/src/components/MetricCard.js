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
 *   - Normal state: Dark background (#1a1a1a), no icon, shows value + unit
 *   - Advisory alarm: Dark background with light blue border and info icon
 *   - Warning alarm: Dark background with light yellow border and warning icon
 *   - Critical alarm: Dark background with light red border and error icon
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
  // Base dark theme styling for the card
  const baseStyle = {
    bgcolor: "#1a1a1a",
    p: 2,
    textAlign: "center",
    transition: "all 0.2s ease",
  };

  // Alarm styling based on severity
  const alarmStyles = inAlarm
    ? {
        advisory: {
          border: "1px solid #3b82f6",
          borderLeft: `4px solid #3b82f6`,
        },
        warning: {
          border: "1px solid #ff9800",
          borderLeft: `4px solid #ff9800`,
        },
        critical: {
          border: "1px solid #f44336",
          borderLeft: `4px solid #f44336`,
        },
      }[severity]
    : { border: "1px solid #333", borderLeft: `4px solid #2e7d32` };

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
        ...baseStyle,
        ...alarmStyles,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography
        variant="h5"
        fontWeight="bold"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        {AlarmIcon}
        <span style={{ color: "white" }}>{value ?? "—"}</span>{" "}
        <Typography component="span" variant="body2" color="text.secondary">
          {unit}
        </Typography>
      </Typography>
    </Paper>
  );
}
