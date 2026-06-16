import { Paper, Typography, Box } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

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

  const AlarmIcon = inAlarm
    ? { critical: <ErrorOutlineIcon fontSize="small" color="error" sx={{ mr: 0.5, verticalAlign: 'middle' }} />,
        warning:  <WarningAmberIcon  fontSize="small" color="warning" sx={{ mr: 0.5, verticalAlign: 'middle' }} />,
        advisory: <InfoOutlinedIcon  fontSize="small" color="info"    sx={{ mr: 0.5, verticalAlign: 'middle' }} />,
      }[severity]
    : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        '@media (max-height: 950px)': { padding: '8px 14px' },
        bgcolor: '#1a1a1a',
        border: '1px solid #333',
        borderLeft: `4px solid ${borderColor}`,
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      {icon && (
        <Box sx={{ position: 'absolute', top: 12, right: 12, opacity: 0.75,
          '@media (max-height: 950px)': { top: 8, right: 8 }
        }}>
          {icon}
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" display="block"
        sx={{ letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
        {label}
      </Typography>

      <Typography variant="h4" fontWeight="bold"
        sx={{ display: 'flex', alignItems: 'baseline', color: 'white',
          '@media (max-height: 950px)': { fontSize: '1.35rem' }
        }}>
        {AlarmIcon}
        {value ?? '—'}
        <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 0.75 }}>
          {unit}
        </Typography>
      </Typography>

      {subtitle && (
        <Typography variant="caption" color="text.secondary"
          sx={{ mt: 0.5, display: 'block', '@media (max-height: 950px)': { display: 'none' } }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}
