import { useState } from 'react';
import {
  Paper, Typography, Divider, Box, Button, Alert,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { sendControlCommand, sendDisturbance } from '../api/client';
import { bpMd, bpSm, bpXs } from '../breakpoints';

const GENERATORS = [
  { value: 0, label: 'Gen 1 — Bus 1 (slack)' },
  { value: 1, label: 'Gen 2 — Bus 2' },
  { value: 2, label: 'Gen 3 — Bus 3' },
  { value: 3, label: 'Gen 6 — Bus 6' },
  { value: 4, label: 'Gen 8 — Bus 8' },
];

const LINE_LABELS = {
  0:'1→2', 1:'1→5', 2:'2→3', 3:'2→4', 4:'2→5', 5:'3→4', 6:'4→5', 7:'4→7',
  8:'4→9', 9:'5→6', 10:'6→11', 11:'6→12', 12:'6→13', 13:'7→8', 14:'7→9',
  15:'9→10', 16:'9→14', 17:'10→11', 18:'12→13', 19:'13→14',
};

const SECTION_LABEL = {
  textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.75rem',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
  [bpMd]: { fontSize: '10px' }, [bpSm]: { fontSize: '9px' }, [bpXs]: { fontSize: '8px' },
};
const SECTION_ICON_SX = {
  [bpMd]: { fontSize: '16px' }, [bpSm]: { fontSize: '14px' }, [bpXs]: { fontSize: '12px' },
};
// No forced height (unlike the original's fixed 32px hack): the Select's
// height comes from font-size + its own internal padding, so both need to
// shrink tier by tier — MUI's size="small" padding is a fixed px value, not
// relative to font-size, so it wouldn't shrink on its own and would leave a
// height floor even at the smallest tier.
const SELECT_SX = {
  '& .MuiInputBase-root, & .MuiInputLabel-root, & .MuiMenuItem-root': {
    [bpMd]: { fontSize: '12px' }, [bpSm]: { fontSize: '11px' }, [bpXs]: { fontSize: '10px' },
  },
  '& .MuiSelect-select': {
    [bpMd]: { paddingTop: '6px', paddingBottom: '6px' },
    [bpSm]: { paddingTop: '4px', paddingBottom: '4px' },
    [bpXs]: { paddingTop: '2px', paddingBottom: '2px' },
  },
};
const BUTTON_SX = {
  [bpMd]: { fontSize: '11px', py: '3px' }, [bpSm]: { fontSize: '10px', py: '1px' }, [bpXs]: { fontSize: '9px', py: '1px' },
};

export default function ControlPanel({ onGovernorChange, onPeakDemandChange, onMessage }) {
  const [genId,      setGenId]      = useState(1);
  const [lineId,     setLineId]     = useState(0);
  const [scenarioId, setScenarioId] = useState('generator_trip');

  const genLabel = GENERATORS.find(g => g.value === Number(genId))?.label.split(' — ')[0] ?? `Gen ${genId}`;

  const sendGen = async (delta) => {
    try {
      await sendControlCommand({
        command_type: 'adjust_generation',
        target: { generator_id: Number(genId), delta_mw: delta },
        timestamp: new Date().toISOString(),
      });
      onMessage?.({ category: 'Control', text: `${genLabel}: ${delta > 0 ? '+' : ''}${delta} MW applied` });
    } catch (err) {
      onMessage?.({ category: 'Error', text: err.response?.data?.detail ?? err.message });
    }
  };

  const sendBreaker = async (action) => {
    try {
      await sendControlCommand({
        command_type: action,
        target: { line_id: Number(lineId) },
        timestamp: new Date().toISOString(),
      });
      onMessage?.({ category: 'Control', text: `Line ${lineId}: ${action === 'trip_breaker' ? 'tripped' : 'closed'}` });
    } catch (err) {
      onMessage?.({ category: 'Error', text: err.response?.data?.detail ?? err.message });
    }
  };

  const restoreGen = async () => {
    try {
      await sendControlCommand({
        command_type: 'restore_generator',
        target: { generator_id: Number(genId) },
        timestamp: new Date().toISOString(),
      });
      onMessage?.({ category: 'Control', text: `${genLabel} restored — online at 0 MW. Use Generator Control to ramp up.` });
    } catch (err) {
      onMessage?.({ category: 'Error', text: err.response?.data?.detail ?? err.message });
    }
  };

  const SCENARIOS = [
    { value: 'generator_trip',    label: 'Generator Trip',    target: { generator_id: 1 } },
    { value: 'load_spike',        label: 'Load Spike',        target: { load_id: 0, percent_increase: 100 } },
    { value: 'line_outage',       label: 'Line Outage',       target: { line_id: 1 } },
    { value: 'generation_crisis', label: 'Generation Crisis', target: {} },
    { value: 'line_cascade',      label: 'N-1 Cascade',       target: {} },
  ];

  const SCENARIO_FEEDBACK = {
    generator_trip:    'Gen 2 tripped — frequency will drop. Ramp up Gen 3, 6, or 8 to compensate.',
    load_spike:        'Load at Bus 2 doubled — frequency will drop. Add MW on Gen 2, 3, 6, or 8 to compensate.',
    line_outage:       'Line 1 (1→5) is out. Line 0 (1→2) is now overloaded and will alarm. Trip Line 0 or close Line 1 to restore it.',
    generation_crisis: 'Gen 2 and Gen 8 both tripped — 80 MW lost. Ramp Gen 3 and Gen 6 first, then bring the tripped units back online.',
    line_cascade:      'Line 6 (4→5) tripped. Line 3 (2→4) is congesting. Hint: think about which generator is closest to Bus 4.',
  };

  const sendScenario = async () => {
    const scenario = SCENARIOS.find(s => s.value === scenarioId);
    if (!scenario) return;
    try {
      await sendDisturbance({ type: scenario.value, target: scenario.target });
      if (scenario.value === 'line_cascade') {
        onGovernorChange?.(true);
        onPeakDemandChange?.(true);
      }
      onMessage?.({ category: 'Scenario', text: SCENARIO_FEEDBACK[scenario.value] });
    } catch (err) {
      onMessage?.({ category: 'Error', text: err.response?.data?.detail ?? err.message });
    }
  };

  return (
    <Paper sx={{ p: 2, [bpMd]: { p: 1 }, [bpSm]: { p: 0.625 }, [bpXs]: { p: 0.5 } }}>
      <Typography variant="h6" sx={{
        mb: 1, [bpMd]: { fontSize: '14px' }, [bpSm]: { fontSize: '12px' }, [bpXs]: { fontSize: '10px' },
      }}>Control Panel</Typography>
      <Divider sx={{ mb: 2, borderColor: '#2a2a2a', [bpMd]: { mb: 1 }, [bpSm]: { mb: 0.5 }, [bpXs]: { mb: 0.25 } }} />

      {/* flexWrap stays 'nowrap' (the default): wrapping to a second row would
          roughly double this panel's height and eat directly into the grid
          row's space, same reasoning as MetricsPanel above. */}
      <Box sx={{ display: 'flex', gap: 3 }}>

        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, [bpMd]: { mb: 0.5 }, [bpSm]: { mb: 0.25 }, [bpXs]: { mb: 0.125 } }}>
            <BoltIcon fontSize="small" sx={{ color: '#4caf50', ...SECTION_ICON_SX }} />
            <Typography variant="subtitle2" sx={SECTION_LABEL}>Generator Control</Typography>
          </Box>
          <FormControl size="small" fullWidth sx={{ mb: 1.5, [bpMd]: { mb: 0.5 }, [bpSm]: { mb: 0.25 }, [bpXs]: { mb: 0.125 }, ...SELECT_SX }}>
            <InputLabel>Generator</InputLabel>
            <Select value={genId} label="Generator" onChange={(e) => setGenId(e.target.value)}>
              {GENERATORS.map(g => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
            </Select>
          </FormControl>

          {genId === 0 ? (
            <Alert severity="info" sx={{
              py: 0.5, fontSize: '0.75rem',
              [bpMd]: { fontSize: '10px', py: 0.25 }, [bpSm]: { fontSize: '9px', py: 0 }, [bpXs]: { fontSize: '8px', py: 0 },
            }}>
              Gen 1 is the <strong>slack bus</strong> — its output is set automatically
              by the simulator to balance generation and load. Use Gen 2, 3, 6, or 8 for manual control.
            </Alert>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" size="small" sx={{ flex: 1, bgcolor: '#7f1d1d', '&:hover': { bgcolor: '#991b1b' }, ...BUTTON_SX }}
                  onClick={() => sendGen(-10)}>-10</Button>
                <Button variant="contained" size="small" sx={{ flex: 1, bgcolor: '#7c2d12', '&:hover': { bgcolor: '#9a3412' }, ...BUTTON_SX }}
                  onClick={() => sendGen(-5)}>-5</Button>
                <Button variant="contained" size="small" sx={{ flex: 1, bgcolor: '#14532d', '&:hover': { bgcolor: '#166534' }, ...BUTTON_SX }}
                  onClick={() => sendGen(5)}>+5</Button>
                <Button variant="contained" size="small" sx={{ flex: 1, bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#1e40af' }, ...BUTTON_SX }}
                  onClick={() => sendGen(10)}>+10</Button>
              </Box>
              <Typography variant="caption" color="text.secondary"
                sx={{
                  display: 'block', mt: 0.5, textAlign: 'center',
                  [bpMd]: { fontSize: '10px', mt: 0.25 }, [bpSm]: { fontSize: '9px', mt: 0 }, [bpXs]: { fontSize: '8px', mt: 0 },
                }}>
                MW adjustment
              </Typography>
            </>
          )}
        </Box>

        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, [bpMd]: { mb: 0.5 }, [bpSm]: { mb: 0.25 }, [bpXs]: { mb: 0.125 } }}>
            <PowerOffIcon fontSize="small" sx={{ color: '#42a5f5', ...SECTION_ICON_SX }} />
            <Typography variant="subtitle2" sx={SECTION_LABEL}>Breaker Control</Typography>
          </Box>
          <FormControl size="small" fullWidth sx={{ mb: 1.5, [bpMd]: { mb: 0.5 }, [bpSm]: { mb: 0.25 }, [bpXs]: { mb: 0.125 }, ...SELECT_SX }}>
            <InputLabel>Line</InputLabel>
            <Select value={lineId} label="Line" onChange={(e) => setLineId(e.target.value)}>
              {Object.entries(LINE_LABELS).map(([id, buses]) => (
                <MenuItem key={id} value={Number(id)}>Line {id} — Bus {buses}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" color="error" fullWidth sx={BUTTON_SX}
              onClick={() => sendBreaker('trip_breaker')}>
              Trip
            </Button>
            <Button variant="contained" color="success" fullWidth sx={BUTTON_SX}
              onClick={() => sendBreaker('close_breaker')}>
              Close
            </Button>
          </Box>
        </Box>

        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, [bpMd]: { mb: 0.5 }, [bpSm]: { mb: 0.25 }, [bpXs]: { mb: 0.125 } }}>
            <WarningAmberIcon fontSize="small" sx={{ color: '#ffa726', ...SECTION_ICON_SX }} />
            <Typography variant="subtitle2" sx={SECTION_LABEL}>Test Scenarios</Typography>
          </Box>
          <FormControl size="small" fullWidth sx={{ mb: 1.5, [bpMd]: { mb: 0.5 }, [bpSm]: { mb: 0.25 }, [bpXs]: { mb: 0.125 }, ...SELECT_SX }}>
            <InputLabel>Scenario</InputLabel>
            <Select value={scenarioId} label="Scenario" onChange={(e) => setScenarioId(e.target.value)}>
              {SCENARIOS.map(s => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" fullWidth startIcon={<WarningAmberIcon />}
            onClick={sendScenario}
            sx={{ borderColor: '#ffa726', color: '#ffa726', '&:hover': { borderColor: '#ffb74d', color: '#ffb74d' }, ...BUTTON_SX }}>
            Trigger Scenario
          </Button>
        </Box>

      </Box>
    </Paper>
  );
}
