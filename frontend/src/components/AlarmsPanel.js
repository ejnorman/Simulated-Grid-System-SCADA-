import {
  Paper,
  Typography,
  Divider,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Tooltip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import StatusChip from "./StatusChip";
import { acknowledgeAlarm } from "../api/client";

const ACTION_GUIDE = {
  frequency_hz:
    "Not enough generation to meet demand. Add +MW to Gen 2, 3, 6, or 8.",
  voltage_pu:
    "Bus voltage out of range. Try closing lines shown as OPEN on the diagram.",
  line_loading_pct:
    "Line is overloaded. Trip it in Breaker Control — power will reroute. Watch for new overloads.",
  generator_capacity_pct:
    "Generator near its limit. Reduce output with -MW and shift that load to another unit.",
};

function StatusBadge({ alarm }) {
  if (alarm.cleared_at) {
    return (
      <Chip
        label="CLEARED"
        size="small"
        sx={{
          bgcolor: "#37474f",
          color: "#90a4ae",
          fontWeight: 700,
          fontSize: "0.72rem",
        }}
      />
    );
  }
  if (alarm.acknowledged) {
    return (
      <Chip
        label="ACKNOWLEDGED"
        size="small"
        sx={{
          bgcolor: "#1565c0",
          color: "#90caf9",
          fontWeight: 700,
          fontSize: "0.72rem",
        }}
      />
    );
  }
  return (
    <Chip
      label="ACTIVE"
      size="small"
      sx={{
        bgcolor: "#7f1d1d",
        color: "#fca5a5",
        fontWeight: 700,
        fontSize: "0.72rem",
      }}
    />
  );
}

const CELL = { borderColor: "#2a2a2a", py: 1 };
const MAX_RECENT = 5; // keep the cleared-alarm history short

export default function AlarmsPanel({ alarms, onRefresh }) {
  const active = alarms?.active ?? [];
  const recent = (alarms?.recent ?? [])
    .sort((a, b) => new Date(b.cleared_at) - new Date(a.cleared_at))
    .slice(0, MAX_RECENT);

  const all = [
    ...active.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    ...recent,
  ];

  const handleAcknowledge = async (alarmId) => {
    try {
      await acknowledgeAlarm(alarmId, "operator_1");
      onRefresh();
    } catch (err) {
      console.error("Acknowledge failed:", err);
    }
  };

  return (
    <Paper sx={{ p: { xs: 1, md: 2 }, height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <NotificationsIcon fontSize="small" sx={{ color: "#ffa726" }} />
          <Typography variant="h6" sx={{ '@media (max-height: 950px)': { fontSize: '0.75rem' } }}>Active Alarms</Typography>
        </Box>
        <Chip
          label={active.length}
          size="small"
          sx={{
            bgcolor: active.length > 0 ? "#7f1d1d" : "#333",
            color: active.length > 0 ? "#fca5a5" : "#aaa",
            fontWeight: 700,
          }}
        />
      </Box>
      <Divider sx={{ my: 1, borderColor: "#2a2a2a" }} />

      {all.length === 0 ? (
        <Typography color="text.secondary" variant="body2" sx={{ py: 1 }}>
          No alarms — system normal
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Time", "Severity", "Message", "Status", "Action"].map(
                  (h) => (
                    <TableCell
                      key={h}
                      sx={{
                        ...CELL,
                        color: "text.secondary",
                        fontWeight: 600,
                        ...(h === "Message" && { maxWidth: "220px" }),
                        ...(h === "Status" && { width: "120px", whiteSpace: "nowrap" }),
                        ...(h === "Action" && { width: "130px", whiteSpace: "nowrap" }),
                      }}
                    >
                      {h}
                    </TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {all.map((alarm) => (
                <TableRow
                  key={alarm.id + (alarm.timestamp ?? "")}
                  sx={{ opacity: alarm.cleared_at ? 0.5 : 1 }}
                >
                  <TableCell
                    sx={{ ...CELL, whiteSpace: "nowrap", fontSize: "0.85rem" }}
                  >
                    {new Date(alarm.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell sx={CELL}>
                    <StatusChip status={alarm.severity} />
                  </TableCell>
                  <TableCell sx={{ ...CELL, maxWidth: "220px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: "0.9rem" }}>
                        {alarm.message}
                      </Typography>
                      {!alarm.cleared_at && ACTION_GUIDE[alarm.metric] && (
                        <Tooltip title={ACTION_GUIDE[alarm.metric]} placement="top" arrow>
                          <InfoOutlinedIcon sx={{ fontSize: "0.9rem", color: "#64b5f6", cursor: "help", flexShrink: 0 }} />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ ...CELL, width: "120px", whiteSpace: "nowrap" }}>
                    <StatusBadge alarm={alarm} />
                  </TableCell>
                  <TableCell sx={{ ...CELL, width: "130px", whiteSpace: "nowrap" }}>
                    {!alarm.acknowledged && !alarm.cleared_at && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAcknowledge(alarm.id)}
                        sx={{
                          borderColor: "#42a5f5",
                          color: "#42a5f5",
                          fontSize: "0.7rem",
                          "&:hover": {
                            borderColor: "#90caf9",
                            color: "#90caf9",
                          },
                        }}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
