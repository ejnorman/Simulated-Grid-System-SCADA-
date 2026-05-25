import { useState, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Box, Container, Grid, Alert } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';

import StatusChip from './components/StatusChip';
import MetricsPanel from './components/MetricsPanel';
import AlarmsPanel from './components/AlarmsPanel';
import ControlPanel from './components/ControlPanel';
import GridDiagram from './components/GridDiagram';
import usePolling from './hooks/usePolling';
import { fetchCurrentMetrics, fetchAlarms } from './api/client';

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
  const [metrics,     setMetrics]     = useState(null);
  const [prevMetrics, setPrevMetrics] = useState(null);
  const [alarms,      setAlarms]      = useState({ active: [], recent: [] });
  const [error,       setError]       = useState(null);

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
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        <AppBar position="static" elevation={0}
          sx={{ bgcolor: '#111', borderBottom: '1px solid #2a2a2a' }}>
          <Toolbar>
            <ShowChartIcon sx={{ mr: 1, color: '#4caf50' }} />
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 1 }}>
              SCADA Power Grid Monitor
            </Typography>
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
          <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert>
        )}

        <Container maxWidth="xl" sx={{ mt: 3, mb: 4, flexGrow: 1 }}>
          <Grid container spacing={3}>

            <Grid item xs={12}>
              <MetricsPanel metrics={metrics} prevMetrics={prevMetrics} />
            </Grid>

            <Grid item xs={12} md={7}>
              <GridDiagram metrics={metrics} alarms={alarms} />
            </Grid>

            <Grid item xs={12} md={5}>
              <AlarmsPanel alarms={alarms} onRefresh={fetchData} />
            </Grid>

            <Grid item xs={12}>
              <ControlPanel />
            </Grid>

          </Grid>
        </Container>

      </Box>
    </ThemeProvider>
  );
}
