/**
 * AlarmsPanel — displays active alarms and allows acknowledgment.
 *
 * Props:
 *   alarms    — { active: Alarm[], recent: Alarm[] }
 *   onRefresh — function to re-fetch alarms after an action
 *
 * Each Alarm has: id, severity, message, metric, value, threshold,
 *                 timestamp, acknowledged, acknowledged_by, acknowledged_at
 *
 * Use acknowledgeAlarm(alarmId, operatorName) from api/client.js.
 * See docs/reference/frontend/src/components/AlarmsPanel.js for a reference implementation.
 */

import { useState } from "react";
import { Paper, Typography, Button, Divider } from "@mui/material";
import { acknowledgeAlarm } from "../api/client";

export default function AlarmsPanel({ alarms, onRefresh }) {
  const [loadingId, setLoadingId] = useState(null);

  const handleAck = async (id) => {
    setLoadingId(id);
    try {
      await acknowledgeAlarm(id, "Operator");
      onRefresh && onRefresh();
    } finally {
      setLoadingId(null);
    }
  };

  const renderAlarm = (a) => (
    <div key={a.id} style={{ marginTop: 12 }}>
      <Typography fontWeight="bold">
        {a.message} ({a.severity})
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Metric: {a.metric} — Value: {a.value} — Threshold: {a.threshold}
      </Typography>

      <Typography variant="caption" color="text.secondary">
        Triggered: {new Date(a.timestamp).toLocaleString()}
      </Typography>

      {!a.acknowledged ? (
        <Button
          variant="contained"
          size="small"
          sx={{ mt: 1 }}
          disabled={loadingId === a.id}
          onClick={() => handleAck(a.id)}
        >
          {loadingId === a.id ? "Acknowledging..." : "Acknowledge"}
        </Button>
      ) : (
        <Typography sx={{ mt: 1, color: "#4caf50" }}>
          Acknowledged by {a.acknowledged_by} at{" "}
          {new Date(a.acknowledged_at).toLocaleString()}
        </Typography>
      )}
    </div>
  );

  return (
    <Paper sx={{ p: 2, bgcolor: "#1a1a1a", color: "white" }}>
      <Typography variant="h6" gutterBottom>
        Active Alarms
      </Typography>

      {alarms?.active?.length === 0 && (
        <Typography color="text.secondary">No active alarms</Typography>
      )}

      {alarms?.active?.map(renderAlarm)}

      <Divider sx={{ my: 2, borderColor: "#333" }} />

      <Typography variant="h6" gutterBottom>
        Recent Alarms
      </Typography>

      {alarms?.recent?.length === 0 && (
        <Typography color="text.secondary">No recent alarms</Typography>
      )}

      {alarms?.recent?.map(renderAlarm)}
    </Paper>
  );
}
