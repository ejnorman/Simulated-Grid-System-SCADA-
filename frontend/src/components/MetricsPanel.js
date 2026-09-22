import { Box } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BoltIcon from '@mui/icons-material/Bolt';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MetricCard from './MetricCard';

function mwDelta(cur, prev) {
  if (prev == null || cur == null) return null;
  const d = cur - prev;
  if (Math.abs(d) < 0.05) return '→ Stable';
  return `${d > 0 ? '↑ +' : '↓ '}${d.toFixed(1)} MW`;
}

function freqDelta(cur, prev) {
  if (prev == null || cur == null) return null;
  const d = cur - prev;
  if (Math.abs(d) < 0.0005) return '→ Stable';
  return `${d > 0 ? '↑ +' : '↓ '}${d.toFixed(3)} Hz`;
}

export default function MetricsPanel({ metrics, prevMetrics }) {
  if (!metrics) return null;

  const freqAlarm =
    metrics.frequency_hz < 59.80 || metrics.frequency_hz > 60.20 ? 'critical' :
    metrics.frequency_hz < 59.90 || metrics.frequency_hz > 60.10 ? 'warning'  : null;

  const freqIconColor = freqAlarm === 'critical' ? '#f44336' : freqAlarm === 'warning' ? '#ff9800' : '#4caf50';

  return (
    // flexWrap stays 'nowrap' (the default) on purpose: MUI Grid's xs/sm/md
    // stacking looked like the right tool here too, but wrapping to a 2nd row
    // roughly doubles this panel's height and eats directly into the grid
    // row's space below it (flexShrink:0 in App.js means it never gives that
    // height back). Cards just get narrower instead, down to 0.
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
        <MetricCard
          label="Frequency"
          value={metrics.frequency_hz?.toFixed(3)}
          unit="Hz"
          inAlarm={!!freqAlarm}
          severity={freqAlarm ?? 'critical'}
          icon={<ShowChartIcon sx={{ color: freqIconColor }} />}
          subtitle={freqDelta(metrics.frequency_hz, prevMetrics?.frequency_hz)}
        />
      </Box>
      <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
        <MetricCard
          label="Total Generation"
          value={metrics.total_generation_mw?.toFixed(1)}
          unit="MW"
          icon={<BoltIcon sx={{ color: '#42a5f5' }} />}
          subtitle={mwDelta(metrics.total_generation_mw, prevMetrics?.total_generation_mw)}
        />
      </Box>
      <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
        <MetricCard
          label="Total Load"
          value={metrics.total_load_mw?.toFixed(1)}
          unit="MW"
          icon={<TrendingDownIcon sx={{ color: '#ffa726' }} />}
          subtitle={mwDelta(metrics.total_load_mw, prevMetrics?.total_load_mw)}
        />
      </Box>
      <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
        <MetricCard
          label="Losses"
          value={metrics.total_losses_mw?.toFixed(1)}
          unit="MW"
          icon={<WarningAmberIcon sx={{ color: '#ef5350' }} />}
          subtitle={mwDelta(metrics.total_losses_mw, prevMetrics?.total_losses_mw)}
        />
      </Box>
    </Box>
  );
}
