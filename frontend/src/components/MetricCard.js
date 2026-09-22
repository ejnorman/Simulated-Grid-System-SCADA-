import { Paper, Typography, Box } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { bpMd, bpSm, bpXs } from '../breakpoints';

const ALARM_BORDER = { critical: '#f44336', warning: '#ff9800', advisory: '#3b82f6' };

export default function MetricCard({
  label,
  value,
  unit,
  inAlarm = false,
  severity = 'critical',
  icon = null,
  subtitle = null,
}) {
  const borderColor = inAlarm ? (ALARM_BORDER[severity] ?? '#f44336') : '#2e7d32';

  // fontSize: '1em' so this tracks the value text's own tiered size instead of
  // staying fixed while the number around it shrinks.
  const AlarmIcon = inAlarm
    ? { critical: <ErrorOutlineIcon color="error" sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '1em' }} />,
        warning:  <WarningAmberIcon  color="warning" sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '1em' }} />,
        advisory: <InfoOutlinedIcon  color="info"    sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '1em' }} />,
      }[severity]
    : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        padding: '16px',
        [bpMd]: { padding: '10px 14px' }, [bpSm]: { padding: '8px 12px' }, [bpXs]: { padding: '6px 10px' },
        bgcolor: '#1a1a1a',
        border: '1px solid #333',
        borderLeft: `4px solid ${borderColor}`,
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      {icon && (
        <Box sx={{
          position: 'absolute', top: 12, right: 12, opacity: 0.75,
          [bpMd]: { top: 10, right: 10, fontSize: '20px' },
          [bpSm]: { top: 8, right: 8, fontSize: '18px' },
          [bpXs]: { top: 6, right: 6, fontSize: '16px' },
        }}>
          {icon}
        </Box>
      )}

      {/* nowrap + ellipsis: cards can get narrow now that MetricsPanel never wraps
          to a 2nd row, and a label wrapping internally would grow this card (and,
          since flex siblings stretch, every card) taller — eating into the grid row. */}
      <Typography variant="caption" color="text.secondary" display="block"
        sx={{
          letterSpacing: 1, textTransform: 'uppercase', mb: 0.5,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          [bpMd]: { fontSize: '11px' }, [bpSm]: { fontSize: '10px' }, [bpXs]: { fontSize: '9px' },
        }}>
        {label}
      </Typography>

      <Typography variant="h4" fontWeight="bold"
        sx={{
          display: 'flex', alignItems: 'baseline', color: 'white',
          whiteSpace: 'nowrap', overflow: 'hidden',
          [bpMd]: { fontSize: '26px' }, [bpSm]: { fontSize: '20px' }, [bpXs]: { fontSize: '16px' },
        }}>
        {AlarmIcon}
        {value ?? '—'}
        <Typography component="span" variant="body1" color="text.secondary" sx={{
          ml: 0.75,
          [bpMd]: { fontSize: '13px' }, [bpSm]: { fontSize: '11px' }, [bpXs]: { fontSize: '9px' },
        }}>
          {unit}
        </Typography>
      </Typography>

      {subtitle && (
        <Typography variant="caption" color="text.secondary"
          sx={{
            mt: 0.5, display: 'block',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            [bpMd]: { fontSize: '11px' }, [bpSm]: { fontSize: '10px' }, [bpXs]: { display: 'none' },
          }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}
