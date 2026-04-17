/**
 * API client — Axios instance and typed request functions.
 * All backend calls go through here so URL and request shape
 * changes only need to be made in one place.
 */

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

export const fetchMetricHistory = (metric, start, end, interval = null) =>
  api.get('/metrics/history', { params: { metric, start, end, interval } });

export default api;
