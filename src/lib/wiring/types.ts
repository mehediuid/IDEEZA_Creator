// IDEEZA Wiring module — data model, peripheral catalog, and path helpers.
// The wiring canvas is a top-view SVG stage (like the PCB canvas) so it is
// fully testable and consistent with the rest of the app. "Height" is the
// lamination: how far a wire rises straight up from a pin before it turns
// toward the other pin — matching the pin → up → across → down → pin shape.

// ── wire tools (the Draw menu family) ────────────────────────────────────
export type WireTool = "twoPoint" | "air" | "sketch" | "ai";

export const WIRE_TOOLS: { id: WireTool; label: string; hint: string }[] = [
  { id: "twoPoint", label: "Peripheral Two Points wire", hint: "Pick two pins, set each lamination height — auto-routes." },
  { id: "air", label: "Peripheral Air wire", hint: "Straight point-to-point connection." },
  { id: "sketch", label: "Peripheral 3D sketch wire", hint: "Click multiple points to draw the path by hand." },
  { id: "ai", label: "Peripheral real AI wire", hint: "Pick two pins — AI routes a realistic path." },
];

export const WIRE_TOOL_LABEL: Record<WireTool, string> = Object.fromEntries(
  WIRE_TOOLS.map((t) => [t.id, t.label]),
) as Record<WireTool, string>;

// ── peripheral parts ─────────────────────────────────────────────────────
export interface PinDef {
  id: string;
  label: string;
  dx: number; // offset from part center (canvas px)
  dy: number;
}

export interface PeripheralDef {
  kind: string;
  label: string;
  w: number;
  h: number;
  color: string;
  pins: PinDef[];
}

// A small starter catalog. Each part carries its own pin layout so the canvas
// can render numbered, clickable pins.
export const PERIPHERAL_CATALOG: PeripheralDef[] = [
  {
    kind: "led", label: "LED", w: 54, h: 36, color: "#F87171",
    pins: [
      { id: "1", label: "+", dx: -27, dy: 0 },
      { id: "2", label: "−", dx: 27, dy: 0 },
    ],
  },
  {
    kind: "resistor", label: "Resistor", w: 64, h: 26, color: "#FBBF24",
    pins: [
      { id: "1", label: "1", dx: -32, dy: 0 },
      { id: "2", label: "2", dx: 32, dy: 0 },
    ],
  },
  {
    kind: "button", label: "Push Button", w: 52, h: 52, color: "#60A5FA",
    pins: [
      { id: "1", label: "1", dx: -26, dy: -18 },
      { id: "2", label: "2", dx: 26, dy: -18 },
      { id: "3", label: "3", dx: -26, dy: 18 },
      { id: "4", label: "4", dx: 26, dy: 18 },
    ],
  },
  {
    kind: "sensor", label: "Sensor", w: 60, h: 44, color: "#34D399",
    pins: [
      { id: "1", label: "VCC", dx: -30, dy: -14 },
      { id: "2", label: "GND", dx: -30, dy: 14 },
      { id: "3", label: "OUT", dx: 30, dy: 0 },
    ],
  },
  {
    kind: "connector", label: "Connector", w: 44, h: 64, color: "#A78BFA",
    pins: [
      { id: "1", label: "1", dx: 22, dy: -24 },
      { id: "2", label: "2", dx: 22, dy: -8 },
      { id: "3", label: "3", dx: 22, dy: 8 },
      { id: "4", label: "4", dx: 22, dy: 24 },
    ],
  },
  {
    kind: "motor", label: "DC Motor", w: 58, h: 58, color: "#F472B6",
    pins: [
      { id: "1", label: "+", dx: -29, dy: -12 },
      { id: "2", label: "−", dx: -29, dy: 12 },
    ],
  },
];

export const PERIPHERAL_BY_KIND: Record<string, PeripheralDef> = Object.fromEntries(
  PERIPHERAL_CATALOG.map((p) => [p.kind, p]),
);

export interface WirePart {
  id: string;
  kind: string;
  name: string; // display, e.g. "LED1"
  x: number;
  y: number;
  rotation?: number;
}

// ── wires ─────────────────────────────────────────────────────────────────
export interface WirePoint {
  x: number;
  y: number;
}

export interface WireObj {
  id: string;
  tool: WireTool;
  fromPart: string;
  fromPin: string;
  toPart: string;
  toPin: string;
  // Authored/derived corner path in canvas coords (excludes fillet rounding).
  points: WirePoint[];
  height1: number;
  height2: number;
  // Peripheral Wire Parameters (right panel).
  color: string;
  routeWidth: number;
  filletRadius: number;
  leadInStart: number;
  leadInEnd: number;
  heatShrink: number;
}

export const DEFAULT_WIRE_PARAMS = {
  color: "#7C2DB9",
  routeWidth: 3,
  filletRadius: 8,
  leadInStart: 6,
  leadInEnd: 6,
  heatShrink: 10,
};

// ── path helpers ───────────────────────────────────────────────────────────
// Absolute pin position for a part+pin (canvas coords).
export function pinPos(part: WirePart, pin: PinDef): WirePoint {
  return { x: part.x + pin.dx, y: part.y + pin.dy };
}

// Build the corner path for a wire given the two pin positions, the two
// lamination heights and the tool. Height rises "up" (screen -y).
export function buildWirePoints(
  tool: WireTool,
  from: WirePoint,
  to: WirePoint,
  height1: number,
  height2: number,
  sketchPoints?: WirePoint[],
): WirePoint[] {
  if (tool === "air") {
    return [from, to];
  }
  if (tool === "sketch") {
    return [from, ...(sketchPoints ?? []), to];
  }
  if (tool === "ai") {
    // A realistic-looking auto path: rise from each pin, arc over the middle.
    const h1 = height1 || 40;
    const h2 = height2 || 40;
    const topY = Math.min(from.y - h1, to.y - h2) - 24;
    const midX = (from.x + to.x) / 2;
    return [
      from,
      { x: from.x, y: from.y - h1 },
      { x: midX, y: topY },
      { x: to.x, y: to.y - h2 },
      to,
    ];
  }
  // twoPoint: pin → up (height1) → across → down (height2) → pin.
  return [
    from,
    { x: from.x, y: from.y - height1 },
    { x: to.x, y: to.y - height2 },
    to,
  ];
}

// Convert a corner path to an SVG path string with rounded corners of the
// given radius (the fillet). Straight fallback when radius is 0 or < 3 pts.
export function roundedPathD(pts: WirePoint[], radius: number): string {
  if (pts.length < 2) return "";
  if (pts.length === 2 || radius <= 0) {
    return "M " + pts.map((p) => `${p.x} ${p.y}`).join(" L ");
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const r = cornerRadius(prev, cur, next, radius);
    const a = shorten(cur, prev, r);
    const b = shorten(cur, next, r);
    d += ` L ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function dist(a: WirePoint, b: WirePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
// Clamp the fillet so it never exceeds half of either adjacent segment.
function cornerRadius(prev: WirePoint, cur: WirePoint, next: WirePoint, r: number): number {
  return Math.max(0, Math.min(r, dist(prev, cur) / 2, dist(cur, next) / 2));
}
// A point `r` away from `cur` toward `toward`.
function shorten(cur: WirePoint, toward: WirePoint, r: number): WirePoint {
  const d = dist(cur, toward) || 1;
  return { x: cur.x + ((toward.x - cur.x) / d) * r, y: cur.y + ((toward.y - cur.y) / d) * r };
}
