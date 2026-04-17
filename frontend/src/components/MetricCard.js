import { Paper, Typography } from '@mui/material';

export default function MetricCard({ label, value, unit }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight="bold">
        {value ?? '—'}{' '}
        <Typography component="span" variant="body2">{unit}</Typography>
      </Typography>
    </Paper>
  );
}
