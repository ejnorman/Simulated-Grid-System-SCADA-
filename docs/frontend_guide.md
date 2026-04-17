# Frontend Engineer Guide

## What you're building

You are building the operator dashboard for the EMS system — a React app that polls the backend every 2 seconds and displays live grid telemetry, active alarms, and manual controls. The app uses Material UI for layout and components, Axios for API calls, and Recharts for historical charts.

---

## Project structure (frontend service)

```
frontend/src/
├── api/
│   └── client.js              # All backend API calls — already implemented, do not edit
├── hooks/
│   └── usePolling.js          # Polling hook — already implemented, do not edit
├── components/
│   ├── StatusChip.js          # Severity badge (normal/advisory/warning/critical) — done
│   ├── MetricCard.js          # Single metric display card — done
│   ├── MetricsPanel.js        # YOUR FILE — system-wide metrics panel
│   ├── AlarmsPanel.js         # YOUR FILE — active alarm list with acknowledgment
│   ├── ControlPanel.js        # YOUR FILE — manual operator control form
│   ├── HistoryChart.js        # YOUR FILE — historical trend chart (Recharts)
│   └── GridDiagram.js         # YOUR FILE — IEEE 14-bus one-line diagram (SVG)
└── App.js                     # YOUR FILE — top-level layout and data fetching
```

---

## How to run the frontend

```bash
docker compose up
```

Or locally (requires the backend running separately):
```bash
cd frontend
npm install
npm start
```

The app runs at `http://localhost:3000`.

---

## Hooks you'll encounter

The codebase uses React hooks throughout. If you haven't used them before, here's what you need to know for this project specifically — no more than that.

**`useState(initialValue)`** stores a value that, when changed, causes the component to re-render. It returns the current value and a setter function:
```javascript
const [feedback, setFeedback] = useState(null);
// Later: setFeedback('Command sent successfully')
```
You'll use this for form field values, loading states, and feedback messages inside your components.

**`useEffect(fn, [deps])`** runs a function after the component renders. The deps array controls when it re-runs — if a value in the array changes, the effect runs again. An empty array `[]` means it runs once on mount only:
```javascript
useEffect(() => {
  fetchMetricHistory(metric, start, end).then(res => setData(res.data));
}, [metric, start, end]);  // re-fetches whenever these change
```
You'll use this in `HistoryChart` to load data when the component mounts or the selected time range changes.

**`useCallback(fn, [deps])`** returns a stable reference to a function, preventing it from being recreated on every render. You'll see it used in `App.js` — you won't need to write it yourself, but you'll read it there.

**`usePolling`** is a custom hook already written in `hooks/usePolling.js`. It takes a callback and an interval, and calls the callback on a timer. It's already wired into `App.js` — you won't call it yourself in your components.

---

## What's already done

Before writing anything, read these files — they are complete and you will use them directly.

**`api/client.js`** exports five functions:
- `fetchCurrentMetrics()` — `GET /metrics/current`
- `fetchAlarms(params)` — `GET /alarms`
- `acknowledgeAlarm(alarmId, operatorName)` — `POST /alarms/{id}/acknowledge`
- `sendControlCommand(command)` — `POST /control`
- `fetchMetricHistory(metric, start, end, interval)` — `GET /metrics/history`

All five return Axios promises. The response data is at `.data` on the resolved value.

**`usePolling(callback, interval)`** runs the callback immediately on mount and then every `interval` milliseconds. The interval defaults to `REACT_APP_UPDATE_INTERVAL` from the environment (2000ms). It is already wired into `App.js` — you do not need to call it yourself in individual components.

**`StatusChip`** accepts a `status` prop (`"normal"`, `"advisory"`, `"warning"`, or `"critical"`) and renders a colored MUI Chip. Use it anywhere you need to display a severity level.

**`MetricCard`** accepts `label`, `value`, and `unit` props and renders a simple outlined card. Use it inside `MetricsPanel`.

---

## Data shapes

**`metrics`** — what `fetchCurrentMetrics()` returns at `.data`:
```json
{
  "timestamp": "2024-01-01T00:00:00+00:00",
  "frequency_hz": 60.001,
  "total_generation_mw": 272.4,
  "total_load_mw": 259.0,
  "total_losses_mw": 13.4,
  "system_status": "normal",
  "critical_buses": [],
  "overloaded_lines": []
}
```

**`alarms`** — what `fetchAlarms()` returns at `.data`:
```json
{
  "active": [
    {
      "id": "freq_out_of_range",
      "severity": "critical",
      "message": "Frequency critical: 59.75 Hz",
      "metric": "frequency_hz",
      "value": 59.75,
      "threshold": 59.80,
      "timestamp": "2024-01-01T00:00:00+00:00",
      "acknowledged": false,
      "acknowledged_by": null,
      "acknowledged_at": null
    }
  ],
  "recent": []
}
```

---

## Week 1 — Core panels and layout

### Step 1: Implement `MetricsPanel`

`MetricsPanel` receives a `metrics` prop (the shape above, or `null` while waiting for the first response) and renders the system-wide numbers at a glance.

Handle the `null` case — show a loading indicator while `metrics` is null so the panel doesn't crash before data arrives.

When `metrics` is populated, use `MetricCard` to display at minimum: frequency (Hz), total generation (MW), total load (MW), and system losses (MW). The `system_status` field maps directly to `StatusChip`. If `critical_buses` or `overloaded_lines` are non-empty arrays, surface them visibly — these are conditions the operator needs to notice immediately.

---

### Step 2: Implement `AlarmsPanel`

`AlarmsPanel` receives two props: `alarms` (the shape above) and `onRefresh` (a function to re-fetch alarms after an action).

Display the `active` list. For each alarm show its severity (use `StatusChip`), message, and timestamp. If an alarm is not yet acknowledged, show a button to acknowledge it.

When the operator clicks acknowledge, call `acknowledgeAlarm(alarmId, operatorName)` from `api/client.js`, then call `onRefresh()` so the list updates. For the operator name, decide whether to prompt the user or use a placeholder — that's a UX decision you can make.

Show a count of active alarms somewhere visible. If there are no active alarms, show a clear "no alarms" state rather than an empty list.

---

### Step 3: Implement `ControlPanel`

`ControlPanel` is self-contained — it manages its own form state and calls the API directly without any props needed.

The panel needs to let an operator send an `adjust_generation` command: select a generator (IDs 0–4, at buses 1, 2, 3, 6, 8 respectively) and enter a MW delta (positive to increase, negative to decrease). On submit, call `sendControlCommand` from `api/client.js` with this shape:

```json
{
  "command_type": "adjust_generation",
  "target": { "generator_id": 0, "delta_mw": 10 },
  "timestamp": "<current ISO timestamp>"
}
```

Show clear feedback after the call — success or the error message from the response. Disable or clear the form while a request is in flight to prevent duplicate submissions.

---

### Step 4: Wire components into `App.js`

`App.js` already handles all data fetching — `metrics` and `alarms` are populated every 2 seconds via `usePolling`. Your job is to replace the placeholder `<pre>` dump with a real layout using your three panels.

Import your components and render them. Pass `metrics` to `MetricsPanel`, pass `alarms` and `fetchData` (as `onRefresh`) to `AlarmsPanel`. `ControlPanel` needs no props.

The `error` state is also already tracked — wire it to a visible error banner so operators know when the backend is unreachable.

Use MUI's `Grid` for layout. A reasonable starting arrangement: `MetricsPanel` full-width at the top, then `AlarmsPanel` and `ControlPanel` side by side below it.

**Verify:** Run the full stack and confirm the dashboard shows live data, alarms appear after injecting a disturbance, and the control form submits successfully and shows feedback.

---

## Week 2 — Charts and grid diagram

### Step 5: Implement `HistoryChart`

`HistoryChart` accepts a `metric` prop (e.g. `"frequency"`) and a `label` prop for the chart title. It needs to fetch and display its own historical data independently from the main polling loop.

On mount, call `fetchMetricHistory(metric, start, end)` from `api/client.js` to load data points. The `start` and `end` parameters are ISO 8601 timestamps — calculate them relative to the current time based on the selected time range. Recharts is already in `package.json`.

Add a time-range selector (e.g. Last 5 min / 15 min / 1 hour) and re-fetch when the selection changes. Consider auto-refreshing on the same 2-second interval as the main polling loop so the chart stays live.

`MetricsPanel` already renders `<HistoryChart metric="frequency" />` — once implemented it will appear automatically inside the metrics panel.

---

### Step 6: Implement `GridDiagram`

`GridDiagram` accepts a `telemetry` prop (the full metrics object) and should render an SVG one-line diagram of the IEEE 14-bus network.

The bus connectivity is already documented inside `GridDiagram.js` — read the comments at the top of that file for the full list of connections and which buses have generators.

Start with a static SVG: position 14 bus nodes, draw lines between them according to the connectivity map, and label each node with its bus ID. Then make it dynamic: color each bus node based on its voltage status (green for normal, yellow for warning, red for critical) and each line based on its `loading_percent` (green below 80%, yellow 80–95%, red above 95%). Display the `voltage_pu` value as a label on each bus.

This is the most open-ended component — the layout of the nodes on the canvas is your design decision. Sketch it on paper first before writing SVG coordinates.

`App.js` will need to pass the `metrics` data down as the `telemetry` prop when you render `GridDiagram`.

---

## Summary of what you own

| File | Your role |
|------|-----------|
| `src/App.js` | Wire components into layout, surface error state |
| `src/components/MetricsPanel.js` | Implement entirely |
| `src/components/AlarmsPanel.js` | Implement entirely |
| `src/components/ControlPanel.js` | Implement entirely |
| `src/components/HistoryChart.js` | Implement entirely |
| `src/components/GridDiagram.js` | Implement entirely |
| `src/api/client.js` | Do not touch |
| `src/hooks/usePolling.js` | Do not touch |
| `src/components/StatusChip.js` | Do not touch |
| `src/components/MetricCard.js` | Do not touch |
