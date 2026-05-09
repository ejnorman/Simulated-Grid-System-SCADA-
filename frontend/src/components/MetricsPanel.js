/**
 * MetricsPanel — system-wide metrics at a glance.
 *
 * Props:
 *   metrics — { frequency_hz, total_generation_mw, total_load_mw, total_losses_mw }
 *             null while waiting for first telemetry response
 */

import MetricCard from "./MetricCard";

export default function MetricsPanel({ metrics }) {
  // Show nothing while loading
  if (!metrics) {
    return <div>Loading metrics...</div>;
  }

  return (
    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
      <MetricCard label="Frequency" value={metrics.frequency_hz} unit="Hz" />
      <MetricCard
        label="Generation"
        value={metrics.total_generation_mw}
        unit="MW"
      />
      <MetricCard label="Load" value={metrics.total_load_mw} unit="MW" />
      <MetricCard label="Losses" value={metrics.total_losses_mw} unit="MW" />
    </div>
  );
}
