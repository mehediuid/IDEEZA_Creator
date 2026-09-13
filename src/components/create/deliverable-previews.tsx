// Deliverable previews — what the review tabs show for each of the five
// artifacts a build produces.
//
// Every pixel here is derived from `job.parts` through
// src/lib/create/build-artifacts.ts, so the board diagram, the wiring
// map, the sketch and the BOM all describe one build. Nothing is
// decorative: a block is a part, a line is a net, a table row is a BOM
// row. These components are presentational — they read the job and
// nothing else.

import type { BuildItemKind, BuildJob } from "@/lib/create/history";
import {
  bomFor,
  firmwareFor,
  netsFor,
  pcbMetaFor,
  type NetWire,
} from "@/lib/create/build-artifacts";
import type { ConceptPartCategory } from "@/lib/create/concept";

// ─────────────────────── what each artifact covers ──────────────────
//
// This panel has no download or export control — the review step is a
// preview, not a delivery mechanism. So every line here describes what
// the artifact *covers* (what was designed, what it accounts for),
// never a file format or a document you could take away, per CLAUDE.md
// §6 ("no promises without delivery").

export const WHAT_SHIPS: Record<BuildItemKind, string[]> = {
  "3d": [
    "3D enclosure model, sized to the board",
    "Print settings: PETG, 0.2 mm layer",
    "Mount points sized for the PCB",
  ],
  pcb: [
    "Schematic, converted into a 2-layer board layout",
    "Placement and copper routing between every part",
    "Bill of materials for this board",
  ],
  code: [
    "Arduino-style sketch, fully commented",
    "Library list pinned to versions",
    "Wiring map to the PCB pins",
  ],
  wiring: [
    "Netlist + pin-to-pin table",
    "Wire colors per net class",
    "Harness lengths, 22 AWG",
    "Connector pinouts: USB-C, JST-PH",
    "Continuity test checklist",
  ],
  parts: [
    "Every part — category, name, reference and quantity",
    "Grouped by function, quantities per board",
  ],
};

// ─────────────────────────── shared geometry ───────────────────────

type Box = { x: number; y: number; w: number; h: number; cx: number; cy: number };

function box(x: number, y: number, w: number, h: number): Box {
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

type Route = {
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // Where a label on this run sits, and which way it reads from there.
  lx: number;
  ly: number;
  anchor: "start" | "middle" | "end";
};

// An orthogonal run between two blocks, leaving one side and entering the
// other. Blocks sit on a grid, so a run either crosses the single gutter
// between neighbours (corridor = null) or takes the clear lane it is
// given — down the gutter beside the source, along the corridor, down the
// gutter beside the target. A net that cut straight across would be drawn
// over the parts in between.
function route(
  a: Box,
  ay: number,
  b: Box,
  by: number,
  gapX: number,
  corridor: number | null,
): Route {
  const flip = a.cx > b.cx;
  const src = flip ? b : a;
  const dst = flip ? a : b;
  const y1 = flip ? by : ay;
  const y2 = flip ? ay : by;
  const x1 = src.x + src.w;
  const x2 = dst.x;
  if (corridor === null) {
    const mx = Math.round((x1 + x2) / 2);
    return {
      d: `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`,
      x1,
      y1,
      x2,
      y2,
      lx: x2 - 8,
      ly: y2 - 6,
      anchor: "end",
    };
  }
  const gx1 = Math.round(x1 + gapX / 2);
  const gx2 = Math.round(x2 - gapX / 2);
  return {
    d: `M ${x1} ${y1} H ${gx1} V ${corridor} H ${gx2} V ${y2} H ${x2}`,
    x1,
    y1,
    x2,
    y2,
    lx: gx1 + 10,
    ly: corridor - 7,
    anchor: "start",
  };
}

// The name that fits in a block: "ESP32-S3-WROOM-1" reads as "ESP32-S3",
// "BME680 Environmental Sensor" as "BME680".
function shortName(name: string): string {
  const clean = name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = clean.split(" ").filter(Boolean);
  let out = words[0] ?? "Part";
  if (out.length < 4 && words[1]) out = `${out} ${words[1]}`;
  if (out.length <= 13) return out;
  // A part number breaks at its hyphens, so cut there rather than
  // mid-token: "ESP32-S3-WROOM-1" reads as "ESP32-S3".
  const head = out.slice(0, 13);
  const cut = head.lastIndexOf("-");
  return cut >= 4 ? head.slice(0, cut) : `${out.slice(0, 12)}…`;
}

// Wires between the same two parts (SDA and SCL on one I²C bus) are one
// connection on a block diagram.
function uniquePairs(wires: NetWire[]): NetWire[] {
  const seen = new Set<string>();
  const out: NetWire[] = [];
  for (const w of wires) {
    const key = w.from < w.to ? `${w.from}|${w.to}` : `${w.to}|${w.from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function MetaLine({ text }: { text: string }) {
  return (
    <p className="mt-6 font-mono text-sm tracking-tight text-text-secondary">
      {text}
    </p>
  );
}

// ─────────────────────────────── PCB ───────────────────────────────

const PCB_MARGIN = 24;
const PCB_PAD = 36;
const PCB_BLOCK_W = 112;
const PCB_BLOCK_H = 42;
const PCB_GAP_X = 60;
const PCB_GAP_Y = 34;

export function PcbPreview({ job }: { job: BuildJob }) {
  const bom = bomFor(job);
  const meta = pcbMetaFor(job);
  const nets = netsFor(job);

  const n = Math.max(bom.rows.length, 1);
  const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);

  const gridW = cols * PCB_BLOCK_W + (cols - 1) * PCB_GAP_X;
  const gridH = rows * PCB_BLOCK_H + (rows - 1) * PCB_GAP_Y;
  const boardW = gridW + 2 * PCB_PAD;
  const boardH = gridH + 2 * PCB_PAD;
  const svgW = boardW + 2 * PCB_MARGIN;
  const svgH = boardH + 2 * PCB_MARGIN;

  const blocks = new Map<string, Box>();
  const cell = new Map<string, { col: number; row: number }>();
  bom.rows.forEach((row, i) => {
    const col = i % cols;
    const rowIndex = Math.floor(i / cols);
    blocks.set(
      row.ref,
      box(
        PCB_MARGIN + PCB_PAD + col * (PCB_BLOCK_W + PCB_GAP_X),
        PCB_MARGIN + PCB_PAD + rowIndex * (PCB_BLOCK_H + PCB_GAP_Y),
        PCB_BLOCK_W,
        PCB_BLOCK_H,
      ),
    );
    cell.set(row.ref, { col, row: rowIndex });
  });

  // Ground is a plane on a 2-layer board, not a line between footprints,
  // so the diagram carries the power and signal nets.
  const runs = uniquePairs(nets.wires.filter((w) => w.cls !== "ground"))
    .map((w) => {
      const a = blocks.get(w.from);
      const b = blocks.get(w.to);
      const ca = cell.get(w.from);
      const cb = cell.get(w.to);
      if (!a || !b || !ca || !cb) return null;
      // Neighbours on the same row meet across their own gutter; anything
      // further takes a clear corridor — the gap above the row they share,
      // or the gap between the two rows.
      const neighbours = ca.row === cb.row && Math.abs(ca.col - cb.col) === 1;
      const corridor = neighbours
        ? null
        : ca.row === cb.row
          ? a.y - PCB_GAP_Y / 2
          : Math.min(a.y, b.y) + PCB_BLOCK_H + PCB_GAP_Y / 2;
      return { w, r: route(a, a.cy, b, b.cy, PCB_GAP_X, corridor) };
    })
    .filter((run): run is { w: NetWire; r: Route } => run !== null);

  const holes = [
    [PCB_MARGIN + 18, PCB_MARGIN + 18],
    [PCB_MARGIN + boardW - 18, PCB_MARGIN + 18],
    [PCB_MARGIN + 18, PCB_MARGIN + boardH - 18],
    [PCB_MARGIN + boardW - 18, PCB_MARGIN + boardH - 18],
  ];

  return (
    <figure className="rounded-xl bg-bg-brand-subtle p-12">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        role="img"
        aria-label={`Board layout: ${bom.rows.length} parts on a ${meta.layers}-layer board`}
        style={{ width: "100%", height: "auto" }}
      >
        <rect
          x={PCB_MARGIN}
          y={PCB_MARGIN}
          width={boardW}
          height={boardH}
          rx={8}
          fill="none"
          stroke="var(--color-bg-brand)"
          strokeWidth={2}
        />
        {holes.map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={6}
            fill="none"
            stroke="var(--color-bg-brand)"
            strokeWidth={1.5}
          />
        ))}

        {runs.map(({ w, r }) => (
          <g key={`${w.from}-${w.to}`}>
            <path
              d={r.d}
              fill="none"
              stroke="var(--color-bg-brand)"
              strokeWidth={1.5}
            />
            <circle cx={r.x1} cy={r.y1} r={3} fill="var(--color-bg-brand)" />
            <circle cx={r.x2} cy={r.y2} r={3} fill="var(--color-bg-brand)" />
          </g>
        ))}

        {bom.rows.map((row) => {
          const b = blocks.get(row.ref);
          if (!b) return null;
          return (
            <g key={row.ref}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={4}
                fill="color-mix(in srgb, var(--color-bg-brand) 18%, transparent)"
              />
              <text
                x={b.x + 10}
                y={b.cy + 4}
                fontFamily="var(--font-family-mono)"
                fontSize={11}
                fill="var(--color-text-brand)"
              >
                {shortName(row.name)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <MetaLine
          text={`${meta.layers}-layer · ${meta.widthMm} x ${meta.heightMm} mm · ${meta.partCount} parts · Gerber + KiCad`}
        />
      </figcaption>
    </figure>
  );
}

// ────────────────────────────── wiring ─────────────────────────────

// Left to right, the way current travels: what plugs in, what conditions
// it, what decides, what it drives.
const WIRING_ROLES: ConceptPartCategory[][] = [
  ["Connector & mech"],
  ["Power Management"],
  ["Microcontroller"],
  ["Sensor", "Actuator", "Display & I/O", "Connectivity", "Passive"],
];

const WIRE_STROKE: Record<NetWire["cls"], string> = {
  power: "var(--color-text-secondary)",
  ground: "var(--color-text-primary)",
  signal: "var(--color-bg-brand)",
};

const W_MARGIN = 16;
const W_COL_W = 120;
const W_GAP_X = 112;
const W_BLOCK_H = 56;
const W_GAP_Y = 28;
// Every wire entering a block needs room for its own label.
const W_WIRE_PITCH = 18;
const W_LANE_STEP = 20;
// Where each net class sits in the legend row, and how far it reaches.
const W_LEGEND: [string, NetWire["cls"], number][] = [
  ["POWER", "power", 0],
  ["GROUND", "ground", 132],
  ["SIGNAL", "signal", 272],
];
const W_LEGEND_W = 272 + 40 + 50;

export function WiringPreview({ job }: { job: BuildJob }) {
  const bom = bomFor(job);
  const nets = netsFor(job);

  const columns = WIRING_ROLES.map((roles) =>
    bom.rows.filter((r) => roles.includes(r.category)),
  ).filter((col) => col.length > 0);

  const order = new Map<string, number>();
  columns.forEach((col, ci) => col.forEach((row) => order.set(row.ref, ci)));

  // Several wires can run between the same two parts (SDA, SCL, 3V3) —
  // they stack, entering each block at their own height.
  const bundles = new Map<string, NetWire[]>();
  for (const w of nets.wires) {
    if (w.cls === "ground") continue;
    if (!order.has(w.from) || !order.has(w.to)) continue;
    const key =
      (order.get(w.from) ?? 0) <= (order.get(w.to) ?? 0)
        ? `${w.from}|${w.to}`
        : `${w.to}|${w.from}`;
    const list = bundles.get(key);
    if (list) list.push(w);
    else bundles.set(key, [w]);
  }

  // A run that skips a column would be drawn straight over the part in
  // between, so it gets a lane of its own above the map.
  const lanes = new Map<string, number>();
  let laneCount = 0;
  for (const [key, list] of bundles) {
    const [fromRef, toRef] = key.split("|");
    const span = Math.abs((order.get(toRef) ?? 0) - (order.get(fromRef) ?? 0));
    if (span <= 1) continue;
    lanes.set(key, laneCount);
    laneCount += list.length;
  }
  const laneBand = laneCount ? laneCount * W_LANE_STEP + 10 : 0;

  const attached = new Map<string, number>();
  for (const [key, list] of bundles) {
    for (const ref of key.split("|")) {
      attached.set(ref, (attached.get(ref) ?? 0) + list.length);
    }
  }
  const heightOf = (ref: string) =>
    Math.max(W_BLOCK_H, ((attached.get(ref) ?? 0) + 1) * W_WIRE_PITCH);

  const colHeights = columns.map(
    (col) =>
      col.reduce((sum, row) => sum + heightOf(row.ref), 0) +
      (col.length - 1) * W_GAP_Y,
  );
  const contentH = Math.max(W_BLOCK_H, ...colHeights);
  const top0 = W_MARGIN + laneBand;
  const bandW =
    2 * W_MARGIN +
    columns.length * W_COL_W +
    Math.max(0, columns.length - 1) * W_GAP_X;
  const railY = top0 + contentH + 40;
  const legendY = railY + 46;

  const blocks = new Map<string, Box>();
  columns.forEach((col, ci) => {
    let y = top0 + (contentH - colHeights[ci]) / 2;
    for (const row of col) {
      const h = heightOf(row.ref);
      blocks.set(
        row.ref,
        box(W_MARGIN + ci * (W_COL_W + W_GAP_X), y, W_COL_W, h),
      );
      y += h + W_GAP_Y;
    }
  });

  // Every part returns to the rail on its own drop. A block with another
  // below it in its column leaves sideways into the gutter first — a
  // straight drop would be drawn through the part underneath.
  const drops: { ref: string; d: string; x: number }[] = [];
  columns.forEach((col) => {
    col.forEach((row, ri) => {
      const b = blocks.get(row.ref);
      if (!b) return;
      const y = b.y + b.h;
      if (ri === col.length - 1) {
        drops.push({ ref: row.ref, d: `M ${b.cx} ${y} V ${railY}`, x: b.cx });
        return;
      }
      // Each drop keeps its own line down the gutter, and stays in it
      // however many parts the column holds.
      const gx = Math.min(
        b.x + b.w + 12 + ri * 8,
        b.x + b.w + W_GAP_X - 10,
      );
      drops.push({
        ref: row.ref,
        d: `M ${b.cx} ${y} V ${y + 12} H ${gx} V ${railY}`,
        x: gx,
      });
    });
  });

  // The frame has to reach the right-most drop, which can sit in the
  // gutter past the last column.
  const svgW = Math.max(
    bandW,
    2 * W_MARGIN + W_LEGEND_W,
    ...drops.map((d) => d.x + W_MARGIN),
  );
  const svgH = legendY + 24;

  const slot = new Map<string, number>();
  const filled = new Map<string, number>();
  for (const [key, list] of bundles) {
    list.forEach((_, i) => {
      for (const ref of key.split("|")) {
        const next = filled.get(ref) ?? 0;
        slot.set(`${ref}#${key}#${i}`, next);
        filled.set(ref, next + 1);
      }
    });
  }
  const entryY = (ref: string, b: Box, key: string, i: number) =>
    Math.round(
      b.y +
        ((slot.get(`${ref}#${key}#${i}`) ?? 0) + 1) *
          (b.h / ((attached.get(ref) ?? 1) + 1)),
    );

  const runs: { key: string; w: NetWire; r: Route }[] = [];
  for (const [key, list] of bundles) {
    const [fromRef, toRef] = key.split("|");
    const a = blocks.get(fromRef);
    const b = blocks.get(toRef);
    if (!a || !b) continue;
    const lane = lanes.get(key);
    list.forEach((w, i) => {
      runs.push({
        key: `${key}-${w.label}-${i}`,
        w,
        r: route(
          a,
          entryY(fromRef, a, key, i),
          b,
          entryY(toRef, b, key, i),
          W_GAP_X,
          lane === undefined
            ? null
            : W_MARGIN + 14 + (lane + i) * W_LANE_STEP,
        ),
      });
    });
  }

  return (
    <figure className="rounded-xl bg-bg-brand-subtle p-12">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        role="img"
        aria-label={`Wiring map: ${nets.nets} nets across ${nets.connections} connections`}
        style={{ width: "100%", height: "auto" }}
      >
        {runs.map(({ key, w, r }) => (
          <g key={key}>
            <path
              d={r.d}
              fill="none"
              stroke={WIRE_STROKE[w.cls]}
              strokeWidth={1.5}
              strokeDasharray={w.cls === "power" ? "5 4" : undefined}
            />
            <circle cx={r.x1} cy={r.y1} r={3} fill={WIRE_STROKE[w.cls]} />
            <circle cx={r.x2} cy={r.y2} r={3} fill={WIRE_STROKE[w.cls]} />
            <text
              x={r.lx}
              y={r.ly}
              textAnchor={r.anchor}
              fontFamily="var(--font-family-mono)"
              fontSize={10}
              fill="var(--color-text-secondary)"
            >
              {w.label}
            </text>
          </g>
        ))}

        {/* Ground is the one net every part sits on, so it reads as a rail
            under the whole map rather than as N lines to one node. */}
        <line
          x1={W_MARGIN}
          y1={railY}
          x2={svgW - W_MARGIN}
          y2={railY}
          stroke={WIRE_STROKE.ground}
          strokeWidth={2}
        />
        <text
          x={W_MARGIN}
          y={railY + 16}
          fontFamily="var(--font-family-mono)"
          fontSize={10}
          fill="var(--color-text-primary)"
        >
          GND
        </text>
        {drops.map((drop) => (
          <g key={`gnd-${drop.ref}`}>
            <path
              d={drop.d}
              fill="none"
              stroke={WIRE_STROKE.ground}
              strokeWidth={1.5}
            />
            <circle cx={drop.x} cy={railY} r={3} fill={WIRE_STROKE.ground} />
          </g>
        ))}

        {bom.rows.map((row) => {
          const b = blocks.get(row.ref);
          if (!b) return null;
          return (
            <g key={row.ref}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={4}
                fill="color-mix(in srgb, var(--color-bg-brand) 18%, transparent)"
              />
              <text
                x={b.x + 10}
                y={b.cy + 4}
                fontFamily="var(--font-family-mono)"
                fontSize={11}
                fill="var(--color-text-brand)"
              >
                {shortName(row.name)}
              </text>
            </g>
          );
        })}

        {/* Legend — the three net classes, drawn with the strokes they
            actually use above. */}
        {W_LEGEND.map(([label, cls, offset]) => (
          <g key={label}>
            <line
              x1={W_MARGIN + offset}
              y1={legendY}
              x2={W_MARGIN + offset + 30}
              y2={legendY}
              stroke={WIRE_STROKE[cls]}
              strokeWidth={2}
              strokeDasharray={cls === "power" ? "5 4" : undefined}
            />
            <text
              x={W_MARGIN + offset + 40}
              y={legendY + 4}
              fontFamily="var(--font-family-mono)"
              fontSize={10}
              letterSpacing="0.06em"
              fill="var(--color-text-secondary)"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        <MetaLine
          text={`${nets.nets} nets · ${nets.connections} connections · ${nets.classes} net classes · Netlist + Harness CSV`}
        />
      </figcaption>
    </figure>
  );
}

// ───────────────────────────── firmware ────────────────────────────

type Tone = "plain" | "keyword" | "string" | "comment";

const TONE_COLOR: Record<Tone, string> = {
  plain: "var(--color-text-primary)",
  keyword: "var(--color-text-brand)",
  string: "var(--color-text-blue)",
  comment: "var(--color-text-tertiary)",
};

const KEYWORDS = new Set([
  "void",
  "if",
  "else",
  "for",
  "while",
  "return",
  "break",
  "continue",
  "true",
  "false",
  "const",
  "static",
  "int",
  "bool",
  "char",
  "float",
  "double",
  "unsigned",
  "uint8_t",
  "uint16_t",
  "uint32_t",
]);

// Three tokens is the whole vocabulary: what the language reserves, what
// is literal text, and what is a note to the reader. Anything else is
// plain — a highlighter that guesses at identifiers colours noise.
const SCAN = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(#[a-z]+)|([A-Za-z_][A-Za-z0-9_]*)/g;

function tokenize(line: string): { text: string; tone: Tone }[] {
  // An include's path is literal text, but `<Wire.h>` is not a string in
  // any other line, so the directive is read whole.
  const include = /^(#include)(\s+)(\S+)(.*)$/.exec(line);
  if (include) {
    return [
      { text: include[1], tone: "keyword" },
      { text: include[2], tone: "plain" },
      { text: include[3], tone: "string" },
      ...(include[4] ? [{ text: include[4], tone: "plain" as Tone }] : []),
    ];
  }

  const out: { text: string; tone: Tone }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  SCAN.lastIndex = 0;
  while ((m = SCAN.exec(line)) !== null) {
    let tone: Tone | null = null;
    if (m[1]) tone = "comment";
    else if (m[2]) tone = "string";
    else if (m[3]) tone = "keyword";
    else if (m[4] && KEYWORDS.has(m[4])) tone = "keyword";
    if (!tone) continue;
    if (m.index > last) {
      out.push({ text: line.slice(last, m.index), tone: "plain" });
    }
    out.push({ text: m[0], tone });
    last = m.index + m[0].length;
    if (tone === "comment") break;
  }
  if (last < line.length) out.push({ text: line.slice(last), tone: "plain" });
  return out;
}

export function FirmwarePreview({ job }: { job: BuildJob }) {
  const firmware = firmwareFor(job);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-brand-subtle">
      <div
        className="border-b border-border px-12 py-6"
        style={{
          background:
            "color-mix(in srgb, var(--color-bg-brand) 14%, var(--color-bg-brand-subtle))",
        }}
      >
        <span className="font-mono text-sm text-text-primary">
          {firmware.filename}
        </span>
      </div>
      <div className="overflow-x-auto p-12">
        <pre className="font-mono text-sm leading-[1.7] text-text-primary">
          <code>
            {firmware.lines.map((line, i) => (
              <span key={i} className="block whitespace-pre">
                {line === ""
                  ? " "
                  : tokenize(line).map((t, j) => (
                      <span key={j} style={{ color: TONE_COLOR[t.tone] }}>
                        {t.text}
                      </span>
                    ))}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ────────────────────────────── parts ──────────────────────────────

export function PartsPreview({ job }: { job: BuildJob }) {
  const bom = bomFor(job);
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-6 border-b border-border px-12 py-8">
        <h3 className="text-2xs font-bold tracking-wider text-text-secondary">
          PARTS IN THIS BUILD
        </h3>
        <p className="font-mono text-sm text-text-secondary">
          {bom.unique} unique parts · {bom.units} units
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-bg-subtle">
              <th scope="col" className="px-12 py-6 text-2xs font-semibold tracking-wider text-text-secondary">
                CATEGORY
              </th>
              <th scope="col" className="px-12 py-6 text-2xs font-semibold tracking-wider text-text-secondary">
                COMPONENT NAME
              </th>
              <th scope="col" className="px-12 py-6 text-2xs font-semibold tracking-wider text-text-secondary">
                REF
              </th>
              <th scope="col" className="px-12 py-6 text-2xs font-semibold tracking-wider text-text-secondary">
                QTY
              </th>
            </tr>
          </thead>
          <tbody>
            {bom.rows.map((row) => (
              <tr key={row.ref} className="border-t border-border">
                <td className="px-12 py-8 text-md text-text-secondary">
                  {row.category}
                </td>
                <td className="px-12 py-8 text-md text-text-primary">
                  {row.name}
                </td>
                <td className="px-12 py-8 font-mono text-md text-text-secondary">
                  {row.ref}
                </td>
                <td className="px-12 py-8 font-mono text-md text-text-secondary">
                  {row.qty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="border-t border-border px-12 py-6">
        <p className="font-mono text-sm text-text-tertiary">
          Grouped by function · quantities are per board
        </p>
      </footer>
    </section>
  );
}

export function PartsSummary({ job }: { job: BuildJob }) {
  const bom = bomFor(job);
  const rows: [string, number][] = [
    ["Unique parts", bom.unique],
    ["Total units", bom.units],
    ["Active devices", bom.active],
    ["Passives", bom.passives],
    ["Connectors & mech", bom.connectors],
  ];
  return (
    <section>
      <h3 className="text-2xs font-bold tracking-wider text-text-secondary">
        PARTS SUMMARY
      </h3>
      <dl className="mt-8">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-6 border-b border-border py-6 last:border-b-0"
          >
            <dt className="text-sm text-text-secondary">{label}</dt>
            <dd className="font-mono text-sm text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
