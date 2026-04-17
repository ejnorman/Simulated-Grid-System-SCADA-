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

export default function AlarmsPanel({ alarms, onRefresh }) {
  return <div>AlarmsPanel — not yet implemented</div>;
}
