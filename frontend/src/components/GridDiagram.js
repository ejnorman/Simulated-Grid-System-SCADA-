import { Paper, Typography, Divider, Box } from "@mui/material";

// Row layout (top→bottom): [12,13,14] → [6,11,10,9,8] → [5,4,7] → [1,2,3]
// Buses 6/13, 9/14, and 7/9/14 share x-columns so connecting lines are straight.
// This arrangement eliminates line crossings with straight segments.
const BUS_POSITIONS = {
  1:  { x: 80,  y: 450 },
  2:  { x: 240, y: 450 },
  3:  { x: 590, y: 450 },
  4:  { x: 430, y: 330 },
  5:  { x: 240, y: 330 },
  6:  { x: 190, y: 190 },
  7:  { x: 530, y: 330 },
  8:  { x: 640, y: 190 },
  9:  { x: 530, y: 190 },
  10: { x: 430, y: 190 },
  11: { x: 310, y: 190 },
  12: { x: 80,  y: 70  },
  13: { x: 190, y: 70  },
  14: { x: 530, y: 70  },
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
const LINE_NORMAL = "#686868";
const LINE_TRIPPED = "#555";
const BUS_GEN_NORMAL = "#4caf50";
const BUS_MID_NORMAL = "#42a5f5";
const BUS_GEN_TRIPPED = "#616161";

function buildStatusMaps(alarms, metrics) {
  const lineStatus = {}; // id → alarm severity
  const busStatus = {}; // id → alarm severity
  const lineService = {}; // id → { in_service, loading_percent }
  const genService = {}; // bus → { in_service, output_mw }

  const genIdToBus = {};
  for (const gen of metrics?.generators ?? []) {
    genIdToBus[gen.id] = gen.bus;
  }

  const SEVERITY_RANK = { warning: 1, critical: 2 };

  for (const alarm of alarms?.active ?? []) {
    const lm = alarm.id.match(/^loading_line_(\d+)$/);
    const bm = alarm.id.match(/^voltage_bus_(\d+)$/);
    const gm = alarm.id.match(/^gen_overload_(\d+)$/);
    if (lm) lineStatus[parseInt(lm[1])] = alarm.severity;
    if (bm) busStatus[parseInt(bm[1])] = alarm.severity;
    if (gm) {
      const bus = genIdToBus[parseInt(gm[1])];
      if (bus != null) {
        const cur = busStatus[bus];
        if (!cur || SEVERITY_RANK[alarm.severity] > SEVERITY_RANK[cur]) {
          busStatus[bus] = alarm.severity;
        }
      }
    }
  }

  for (const line of metrics?.lines ?? []) {
    lineService[line.id] = {
      in_service: line.in_service,
      loading_percent: line.loading_percent,
    };
  }

  for (const gen of metrics?.generators ?? []) {
    genService[gen.bus] = { in_service: gen.in_service, output_mw: gen.output_mw };
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
    <Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
      <Typography variant="h6" gutterBottom>
        IEEE 14-Bus System
      </Typography>
      <Divider sx={{ mb: 1, borderColor: "#2a2a2a" }} />

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 5, mb: 1, flexShrink: 0, flexWrap: 'wrap' }}>
        {LEGEND.map(({ color, label, circle, dashed }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {circle ? (
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
            ) : (
              <svg width="18" height="10" style={{ flexShrink: 0 }}>
                <line
                  x1="0" y1="5" x2="18" y2="5"
                  stroke={color} strokeWidth="2.5"
                  strokeDasharray={dashed ? "4 3" : undefined}
                />
              </svg>
            )}
            <Typography variant="caption" sx={{ color: '#aaa', lineHeight: 1 }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
      <svg
        viewBox="0 0 700 540"
        width="100%"
        height="100%"
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
                y={my - (subLabel ? 7 : 4)}
                textAnchor="middle"
                fontSize="11"
                fill={idColor}
                stroke="#111"
                strokeWidth="2.5"
                paintOrder="stroke"
                fontWeight={sev && !tripped ? "bold" : "normal"}
              >
                L{id}
              </text>
              {subLabel && (
                <text
                  x={mx}
                  y={my + 7}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#ddd"
                  stroke="#111"
                  strokeWidth="2.5"
                  paintOrder="stroke"
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
          const tripped = isGen && genService[busId]?.in_service === false;
          const outputMw = isGen ? (genService[busId]?.output_mw ?? null) : null;

          const color = tripped
            ? BUS_GEN_TRIPPED
            : sev
              ? ALARM_COLOR[sev]
              : isGen
                ? BUS_GEN_NORMAL
                : BUS_MID_NORMAL;

          const r = isGen ? 22 : 13;

          return (
            <g key={busId}>
              <circle cx={x} cy={y} r={r} fill={color} opacity={tripped ? 0.7 : 1} />
              {isGen && (
                tripped ? (
                  <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fill="#fff" fontWeight="bold">✕</text>
                ) : (
                  <>
                    <text x={x} y={y - 3} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="bold">
                      {outputMw != null ? Math.round(outputMw) : "—"}
                    </text>
                    <text x={x} y={y + 10} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.75)">
                      MW
                    </text>
                  </>
                )
              )}
              <text
                x={x}
                y={y - r - 4}
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill={tripped ? "#888" : "#ccc"}
              >
                {busId}
              </text>
            </g>
          );
        })}
      </svg>
      </Box>
    </Paper>
  );
}
