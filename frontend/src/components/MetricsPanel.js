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

export default function MetricsPanel({ metrics }) {
  return <div>MetricsPanel — not yet implemented</div>;
}
