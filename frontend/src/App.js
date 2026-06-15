import { useState, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Box, Alert, Button } from '@mui/material';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import StatusChip from './components/StatusChip';
import MetricsPanel from './components/MetricsPanel';
import AlarmsPanel from './components/AlarmsPanel';
import MessagesPanel from './components/MessagesPanel';
import ControlPanel from './components/ControlPanel';
import GridDiagram from './components/GridDiagram';
import usePolling from './hooks/usePolling';
import { fetchCurrentMetrics, fetchAlarms, sendReset, sendGovernorToggle, sendPeakDemandToggle } from './api/client';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0d0d0d', paper: '#1a1a1a' },
    primary: { main: '#4caf50' },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

export default function App() {
  const [metrics,          setMetrics]          = useState(null);
  const [prevMetrics,      setPrevMetrics]      = useState(null);
  const [alarms,           setAlarms]           = useState({ active: [], recent: [] });
  const [error,            setError]            = useState(null);
  const [governorEnabled,  setGovernorEnabled]  = useState(false);
  const [peakDemand,       setPeakDemand]       = useState(false);
  const [messages,         setMessages]         = useState([]);

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, ...msg }]);
  }, []);

  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, alarmsRes] = await Promise.all([
        fetchCurrentMetrics(),
        fetchAlarms(),
      ]);
      setMetrics(prev => {
        setPrevMetrics(prev);
        return metricsRes.data;
      });
      setAlarms(alarmsRes.data);
      setError(null);
    } catch {
      setError('Cannot reach backend — check that all services are running.');
    }
  }, []);

  usePolling(fetchData);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <AppBar position="static" elevation={0}
          sx={{ bgcolor: '#111', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
          <Toolbar>
            <ElectricBoltIcon sx={{ mr: 1, color: '#FFD700' }} />
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 1 }}>
              GridMaster
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                const next = !peakDemand;
                try { await sendPeakDemandToggle(next); setPeakDemand(next); } catch {}
              }}
              sx={{
                mr: 1,
                borderColor: peakDemand ? '#ff9800' : '#444',
                color:       peakDemand ? '#ff9800' : '#9e9e9e',
                '&:hover': { borderColor: peakDemand ? '#ffb74d' : '#888', color: peakDemand ? '#ffb74d' : '#ccc' },
              }}
            >
              Peak Demand {peakDemand ? 'ON' : 'OFF'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                const next = !governorEnabled;
                try { await sendGovernorToggle(next); setGovernorEnabled(next); } catch {}
              }}
              sx={{
                mr: 1,
                borderColor: governorEnabled ? '#4caf50' : '#444',
                color:       governorEnabled ? '#4caf50' : '#9e9e9e',
                '&:hover': { borderColor: governorEnabled ? '#66bb6a' : '#888', color: governorEnabled ? '#66bb6a' : '#ccc' },
              }}
            >
              Stabilizer {governorEnabled ? 'ON' : 'OFF'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={() => { sendReset().then(fetchData); setGovernorEnabled(false); setPeakDemand(false); setMessages([]); }}
              sx={{ mr: 2, borderColor: '#444', color: '#9e9e9e', '&:hover': { borderColor: '#888', color: '#ccc' } }}
            >
              Reset Grid
            </Button>
            {metrics && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.6, letterSpacing: 1 }}>
                  SYSTEM STATUS:
                </Typography>
                <StatusChip status={metrics.system_status} />
              </Box>
            )}
          </Toolbar>
        </AppBar>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 0, flexShrink: 0 }}>{error}</Alert>
        )}

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', px: 4, py: 2, gap: 2, '@media (max-height: 800px)': { py: 1, gap: 1 } }}>

          <Box sx={{ flexShrink: 0 }}>
            <MetricsPanel metrics={metrics} prevMetrics={prevMetrics} />
          </Box>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, minHeight: 0 }}>
            <Box sx={{ flex: 7, minWidth: 0, minHeight: 0 }}>
              <GridDiagram metrics={metrics} alarms={alarms} />
            </Box>
            <Box sx={{ flex: 5, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ flex: 11, minHeight: 0, overflow: 'auto' }}>
                <AlarmsPanel alarms={alarms} onRefresh={fetchData} />
              </Box>
              <Box sx={{ flex: 9, minHeight: 0, overflow: 'auto' }}>
                <MessagesPanel messages={messages} onDismiss={removeMessage} />
              </Box>
            </Box>
          </Box>

          <Box sx={{ flexShrink: 0 }}>
            <ControlPanel onGovernorChange={setGovernorEnabled} onPeakDemandChange={setPeakDemand} onMessage={addMessage} />
          </Box>

        </Box>

      </Box>
    </ThemeProvider>
  );
}
