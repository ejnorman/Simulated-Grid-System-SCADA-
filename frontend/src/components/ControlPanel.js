import { useState } from 'react';
import {
  Paper, Typography, Divider, Box, Button, Alert, Grid,
  FormControl, InputLabel, Select, MenuItem, Tooltip,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { sendControlCommand, sendDisturbance } from '../api/client';

const GENERATORS = [
  { value: 0, label: 'Gen 0 — Bus 1 (slack)' },
  { value: 1, label: 'Gen 1 — Bus 2' },
  { value: 2, label: 'Gen 2 — Bus 3' },
  { value: 3, label: 'Gen 3 — Bus 6' },
  { value: 4, label: 'Gen 4 — Bus 8' },
];

const LINE_LABELS = {
  0:'1→2', 1:'1→5', 2:'2→3', 3:'2→4', 4:'2→5', 5:'3→4', 6:'4→5', 7:'4→7',
  8:'4→9', 9:'5→6', 10:'6→11', 11:'6→12', 12:'6→13', 13:'7→8', 14:'7→9',
  15:'9→10', 16:'9→14', 17:'10→11', 18:'12→13', 19:'13→14',
};

const SECTION_LABEL = { textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem' };

export default function ControlPanel() {
  const [genId,    setGenId]    = useState(1);
  const [lineId,   setLineId]   = useState(0);
  const [feedback, setFeedback] = useState(null);

  const sendGen = async (delta) => {
    try {
      await sendControlCommand({
        command_type: 'adjust_generation',
        target: { generator_id: Number(genId), delta_mw: delta },
        timestamp: new Date().toISOString(),
      });
      setFeedback({ type: 'success', text: `Gen ${genId}: ${delta > 0 ? '+' : ''}${delta} MW applied` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail ?? err.message });
    }
  };

  const sendBreaker = async (action) => {
    try {
      await sendControlCommand({
        command_type: action,
        target: { line_id: Number(lineId) },
        timestamp: new Date().toISOString(),
      });
      setFeedback({ type: 'success', text: `Line ${lineId}: ${action === 'trip_breaker' ? 'tripped' : 'closed'}` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail ?? err.message });
    }
  };

  const SCENARIO_FEEDBACK = {
    generator_trip: 'Gen 1 (Bus 2) tripped offline — generation lost. Frequency will drop. Use Generator Control (+MW on Gen 2–4) to respond.',
    load_spike:     'Load at Bus 2 doubled — demand increased. Frequency will drop. Use Generator Control (+MW on Gen 1–4) to respond.',
    line_outage:    'Line 1 (Bus 1→5) tripped — Bus 1 must now reroute all power through Line 0 (1→2), which was already near capacity. Line 0 will overload and alarm critical. Use Breaker Control to trip Line 0 or close Line 1 to restore it.',
  };

  const sendScenario = async (type, target) => {
    try {
      await sendDisturbance({ type, target });
      setFeedback({ type: 'warning', text: SCENARIO_FEEDBACK[type] ?? `Disturbance triggered: ${type}` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail ?? err.message });
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Control Panel</Typography>
      <Divider sx={{ mb: 2, borderColor: '#2a2a2a' }} />

      <Grid container spacing={3}>

        {/* Generator Control */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <BoltIcon fontSize="small" sx={{ color: '#4caf50' }} />
            <Typography variant="subtitle2" sx={SECTION_LABEL}>Generator Control</Typography>
          </Box>
          <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
            <InputLabel>Generator</InputLabel>
            <Select value={genId} label="Generator" onChange={(e) => setGenId(e.target.value)}>
              {GENERATORS.map(g => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
            </Select>
          </FormControl>

          {genId === 0 ? (
            <Alert severity="info" sx={{ py: 0.5, fontSize: '0.75rem' }}>
              Gen 0 is the <strong>slack bus</strong> — its output is set automatically
              by the simulator to balance generation and load. Use Gens 1–4 for manual control.
            </Alert>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" sx={{ flex: 1, bgcolor: '#7f1d1d', '&:hover': { bgcolor: '#991b1b' } }}
                  onClick={() => sendGen(-50)}>-50</Button>
                <Button variant="contained" size="small" sx={{ flex: 1, bgcolor: '#7c2d12', '&:hover': { bgcolor: '#9a3412' } }}
                  onClick={() => sendGen(-10)}>-10</Button>
                <Button variant="contained" size="small" sx={{ flex: 1, bgcolor: '#14532d', '&:hover': { bgcolor: '#166534' } }}
                  onClick={() => sendGen(10)}>+10</Button>
                <Button variant="contained" size="small" sx={{ flex: 1, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#1e40af' } }}
                  onClick={() => sendGen(50)}>+50</Button>
              </Box>
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'block', mt: 0.5, textAlign: 'center' }}>
                MW adjustment
              </Typography>
            </>
          )}
        </Grid>

        {/* Breaker Control */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <PowerOffIcon fontSize="small" sx={{ color: '#42a5f5' }} />
            <Typography variant="subtitle2" sx={SECTION_LABEL}>Breaker Control</Typography>
          </Box>
          <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
            <InputLabel>Line</InputLabel>
            <Select value={lineId} label="Line" onChange={(e) => setLineId(e.target.value)}>
              {Object.entries(LINE_LABELS).map(([id, buses]) => (
                <MenuItem key={id} value={Number(id)}>Line {id} — Bus {buses}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" color="error" fullWidth
              onClick={() => sendBreaker('trip_breaker')}>
              Trip
            </Button>
            <Button variant="contained" color="success" fullWidth
              onClick={() => sendBreaker('close_breaker')}>
              Close
            </Button>
          </Box>
        </Grid>

        {/* Test Scenarios */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <WarningAmberIcon fontSize="small" sx={{ color: '#ffa726' }} />
            <Typography variant="subtitle2" sx={SECTION_LABEL}>Test Scenarios</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button variant="outlined" fullWidth
              sx={{ borderColor: '#444', color: 'text.primary', justifyContent: 'flex-start' }}
              onClick={() => sendScenario('generator_trip', { generator_id: 1 })}>
              Generator Trip
            </Button>
            <Button variant="outlined" fullWidth
              sx={{ borderColor: '#444', color: 'text.primary', justifyContent: 'flex-start' }}
              onClick={() => sendScenario('load_spike', { load_id: 0, percent_increase: 100 })}>
              Load Spike
            </Button>
            <Button variant="outlined" fullWidth
              sx={{ borderColor: '#444', color: 'text.primary', justifyContent: 'flex-start' }}
              onClick={() => sendScenario('line_outage', { line_id: 1 })}>
              Line Outage
            </Button>
          </Box>
        </Grid>

      </Grid>

      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mt: 2 }}>
          {feedback.text}
        </Alert>
      )}
    </Paper>
  );
}
