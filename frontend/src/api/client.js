import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002';

const api = axios.create({ baseURL: BACKEND_URL });

export const fetchCurrentMetrics = () =>
  api.get('/metrics/current');

export const fetchAlarms = (params = {}) =>
  api.get('/alarms', { params });

export const acknowledgeAlarm = (alarmId, operatorName) =>
  api.post(`/alarms/${alarmId}/acknowledge`, { acknowledged_by: operatorName });

export const sendControlCommand = (command) =>
  api.post('/control', command);

export const sendDisturbance = (disturbance) =>
  api.post('/disturbance', disturbance);

export const sendReset = () =>
  api.post('/reset');

export const sendGovernorToggle = (enabled) =>
  api.post('/governor', { enabled });

export const sendPeakDemandToggle = (enabled) =>
  api.post('/peak-demand', { enabled });

export default api;
