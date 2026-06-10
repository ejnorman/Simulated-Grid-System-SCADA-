import { Paper, Typography, Divider } from "@mui/material";

const BUS_POSITIONS = {
  1: { x: 100, y: 70 },
  2: { x: 280, y: 70 },
  3: { x: 455, y: 90 },
  4: { x: 360, y: 190 },
  5: { x: 170, y: 190 },
  6: { x: 515, y: 215 },
  7: { x: 375, y: 310 },
  8: { x: 560, y: 335 },
  9: { x: 345, y: 400 },
  10: { x: 235, y: 465 },
  11: { x: 400, y: 460 },
  12: { x: 620, y: 350 },
  13: { x: 580, y: 450 },
  14: { x: 450, y: 515 },
};

const GENERATOR_BUSES = new Set([1, 2, 3, 6, 8]);

const LINE_TOPOLOGY = [
  { id: 0, from: 1, to: 2 },
  { id: 1, from: 1, to: 5 },
  { id: 2, from: 2, to: 3 },
  { id: 3, from: 2, to: 4 },
  { id: 4, from: 2, to: 5 },
  { id: 5, from: 3, to: 4 },
  { id: 6, from: 4, to: 5 },
  { id: 7, from: 4, to: 7 },
  { id: 8, from: 4, to: 9 },
  { id: 9, from: 5, to: 6 },
  { id: 10, from: 6, to: 11 },
  { id: 11, from: 6, to: 12 },
  { id: 12, from: 6, to: 13 },
  { id: 13, from: 7, to: 8 },
  { id: 14, from: 7, to: 9 },
  { id: 15, from: 9, to: 10 },
  { id: 16, from: 9, to: 14 },
  { id: 17, from: 10, to: 11 },
  { id: 18, from: 12, to: 13 },
  { id: 19, from: 13, to: 14 },
];

const ALARM_COLOR = { critical: "#f44336", warning: "#ff9800" };
const LINE_NORMAL = "#3a3a3a";
const LINE_TRIPPED = "#555";
const BUS_GEN_NORMAL = "#4caf50";
const BUS_MID_NORMAL = "#42a5f5";
const BUS_GEN_TRIPPED = "#616161";

function buildStatusMaps(alarms, metrics) {
  const lineStatus = {}; // id → alarm severity
  const busStatus = {}; // id → alarm severity
  const lineService = {}; // id → { in_service, loading_percent }
  const genService = {}; // bus → in_service

  for (const alarm of alarms?.active ?? []) {
    const lm = alarm.id.match(/^loading_line_(\d+)$/);
    const bm = alarm.id.match(/^voltage_bus_(\d+)$/);
    if (lm) lineStatus[parseInt(lm[1])] = alarm.severity;
    if (bm) busStatus[parseInt(bm[1])] = alarm.severity;
  }

  for (const line of metrics?.lines ?? []) {
    lineService[line.id] = {
      in_service: line.in_service,
      loading_percent: line.loading_percent,
    };
  }

  for (const gen of metrics?.generators ?? []) {
    genService[gen.bus] = gen.in_service;
  }

  return { lineStatus, busStatus, lineService, genService };
}

const LEGEND = [
  { color: BUS_GEN_NORMAL, label: "Generator bus", circle: true },
  { color: BUS_MID_NORMAL, label: "Bus", circle: true },
  { color: "#ff9800", label: "Warning", circle: false },
  { color: "#f44336", label: "Critical", circle: false },
  { color: LINE_TRIPPED, label: "Line tripped", circle: false, dashed: true },
];

export default function GridDiagram({ metrics, alarms }) {
  const { lineStatus, busStatus, lineService, genService } = buildStatusMaps(
    alarms,
    metrics,
  );

  return (
    <Paper sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        IEEE 14-Bus System
      </Typography>
      <Divider sx={{ mb: 1, borderColor: "#2a2a2a" }} />

      {/* Legend */}
      <svg width="100%" height="22" style={{ marginBottom: 6 }}>
        {LEGEND.map(({ color, label, circle, dashed }, i) => (
          <g key={label} transform={`translate(${i * 115 + 8}, 4)`}>
            {circle ? (
              <circle cx="7" cy="7" r="5" fill={color} />
            ) : (
              <line
                x1="0"
                y1="7"
                x2="14"
                y2="7"
                stroke={color}
                strokeWidth="2"
                strokeDasharray={dashed ? "4 3" : undefined}
              />
            )}
            <text x="19" y="11" fontSize="10" fill="#888">
              {label}
            </text>
          </g>
        ))}
      </svg>

      <svg
        viewBox="0 0 700 540"
        width="100%"
        style={{ display: "block", background: "#111", borderRadius: 4 }}
      >
        {/* Lines */}
        {LINE_TOPOLOGY.map(({ id, from, to }) => {
          const a = BUS_POSITIONS[from];
          const b = BUS_POSITIONS[to];
          const svc = lineService[id];
          const tripped = svc ? !svc.in_service : false;
          const sev = lineStatus[id];
          const color = tripped
            ? LINE_TRIPPED
            : sev
              ? ALARM_COLOR[sev]
              : LINE_NORMAL;

          return (
            <line
              key={id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={color}
              strokeWidth={tripped ? 1.5 : sev ? 3 : 1.5}
              strokeLinecap="round"
              strokeDasharray={tripped ? "8 5" : undefined}
              opacity={tripped ? 0.5 : 1}
            />
          );
        })}

        {/* Line labels — show loading % if significant, or OPEN if tripped */}
        {LINE_TOPOLOGY.map(({ id, from, to }) => {
          const a = BUS_POSITIONS[from];
          const b = BUS_POSITIONS[to];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const svc = lineService[id];
          const tripped = svc ? !svc.in_service : false;
          const loading = svc?.loading_percent ?? 0;
          const sev = lineStatus[id];

          const idColor = tripped
            ? "#aeaeae"
            : sev
              ? ALARM_COLOR[sev]
              : "#898989";
          const subLabel = tripped
            ? "OPEN"
            : loading > 1
              ? `${loading.toFixed(0)}%`
              : null;

          return (
            <g key={`lid-${id}`}>
              <text
                x={mx}
                y={my - (subLabel ? 6 : 4)}
                textAnchor="middle"
                fontSize="9"
                fill={idColor}
                fontWeight={sev && !tripped ? "bold" : "normal"}
              >
                L{id}
              </text>
              {subLabel && (
                <text
                  x={mx}
                  y={my + 5}
                  textAnchor="middle"
                  fontSize="8"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.25"
                  fontWeight={sev && !tripped ? "bold" : "normal"}
                >
                  {subLabel}
                </text>
              )}
            </g>
          );
        })}

        {/* Bus circles */}
        {Object.entries(BUS_POSITIONS).map(([busIdStr, { x, y }]) => {
          const busId = parseInt(busIdStr);
          const isGen = GENERATOR_BUSES.has(busId);
          const sev = busStatus[busId];
          const tripped = isGen && genService[busId] === false;

          const color = tripped
            ? BUS_GEN_TRIPPED
            : sev
              ? ALARM_COLOR[sev]
              : isGen
                ? BUS_GEN_NORMAL
                : BUS_MID_NORMAL;

          const r = isGen ? 11 : 8;

          return (
            <g key={busId}>
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={color}
                opacity={tripped ? 0.7 : 1}
              />
              {/* Added white font fill to see percentage text easier*/}
              {isGen && (
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#fff"
                  fontWeight="bold"
                >
                  {tripped ? "✕" : "G"}
                </text>
              )}
              <text
                x={x}
                y={y - r - 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill={tripped ? "#888" : "#ccc"}
              >
                {busId}
              </text>
            </g>
          );
        })}
      </svg>
    </Paper>
  );
}
