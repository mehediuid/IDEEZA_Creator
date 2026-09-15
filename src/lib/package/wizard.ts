// Part Wizard — parametric families.
//
// 24 families across 8 pin arrangements. A family pre-fills a reference prefix,
// a mount type and the parameter set its arrangement needs; the parameters then
// generate both halves of the part — the symbol's pins and the footprint's pads
// — so the wizard arrives at the Symbol step already filled in.
//
// HONEST LIMIT (the spec's own design note 02): the geometry is *nominal
// reference* geometry, not a full IPC-7351 toe/heel/side land calculation. Pad
// sizes come from each family's defaults and the parameters the user enters, not
// from a solder-joint model. Exact IPC compliance is a calculation change, not a
// visual one.

import {
  type FpPad,
  type Mounting,
  type SymObj,
  type SymPin,
  newId,
} from "./types";

export const ARRANGEMENTS = [
  "two-pad",
  "single-row",
  "dual-row",
  "header",
  "quad",
  "grid",
  "staggered-grid",
  "chip-array",
] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

export type ParamField = {
  key: string;
  label: string;
  /** mm fields are shown in the draft's display unit; plain counts are not. */
  mm: boolean;
  min: number;
  max: number;
  integer?: boolean;
};

/** The parameter set each arrangement needs — the spec's own table. */
export const FIELDS: Record<Arrangement, ParamField[]> = {
  "two-pad": [
    { key: "gap", label: "Gap", mm: true, min: 0.1, max: 40 },
    { key: "padW", label: "Pad width", mm: true, min: 0.1, max: 20 },
    { key: "padH", label: "Pad height", mm: true, min: 0.1, max: 20 },
  ],
  "single-row": [
    { key: "count", label: "Pin count", mm: false, min: 1, max: 80, integer: true },
    { key: "pitch", label: "Pitch", mm: true, min: 0.2, max: 10 },
    { key: "padW", label: "Pad width", mm: true, min: 0.1, max: 20 },
    { key: "padH", label: "Pad height", mm: true, min: 0.1, max: 20 },
    { key: "drill", label: "Drill", mm: true, min: 0.1, max: 6 },
  ],
  "dual-row": [
    { key: "count", label: "Pin count", mm: false, min: 2, max: 120, integer: true },
    { key: "pitch", label: "Pitch", mm: true, min: 0.2, max: 10 },
    { key: "rowSpacing", label: "Row spacing", mm: true, min: 0.3, max: 40 },
    { key: "padW", label: "Pad width", mm: true, min: 0.1, max: 20 },
    { key: "padH", label: "Pad height", mm: true, min: 0.1, max: 20 },
    { key: "drill", label: "Drill", mm: true, min: 0.1, max: 6 },
  ],
  header: [
    { key: "rows", label: "Rows", mm: false, min: 1, max: 2, integer: true },
    { key: "count", label: "Pins per row", mm: false, min: 1, max: 60, integer: true },
    { key: "pitch", label: "Pitch", mm: true, min: 0.5, max: 10 },
    { key: "rowSpacing", label: "Row spacing", mm: true, min: 0.5, max: 20 },
  ],
  quad: [
    { key: "perSide", label: "Pins per side", mm: false, min: 1, max: 40, integer: true },
    { key: "pitch", label: "Lead pitch", mm: true, min: 0.2, max: 5 },
    { key: "span", label: "Centre-to-lead-row span", mm: true, min: 1, max: 40 },
    { key: "padW", label: "Pad width", mm: true, min: 0.1, max: 10 },
    { key: "padH", label: "Pad height", mm: true, min: 0.1, max: 10 },
  ],
  grid: [
    { key: "rows", label: "Rows", mm: false, min: 1, max: 40, integer: true },
    { key: "cols", label: "Columns", mm: false, min: 1, max: 40, integer: true },
    { key: "pitch", label: "Ball / pin pitch", mm: true, min: 0.2, max: 5 },
    { key: "padW", label: "Pad diameter", mm: true, min: 0.1, max: 5 },
    { key: "drill", label: "Drill", mm: true, min: 0.1, max: 4 },
  ],
  "staggered-grid": [
    { key: "rows", label: "Rows", mm: false, min: 1, max: 40, integer: true },
    { key: "cols", label: "Columns", mm: false, min: 1, max: 40, integer: true },
    { key: "pitch", label: "Ball / pin pitch", mm: true, min: 0.2, max: 5 },
    { key: "padW", label: "Pad diameter", mm: true, min: 0.1, max: 5 },
    { key: "drill", label: "Drill", mm: true, min: 0.1, max: 4 },
  ],
  "chip-array": [
    { key: "elements", label: "Elements", mm: false, min: 2, max: 16, integer: true },
    { key: "pitch", label: "Element pitch", mm: true, min: 0.2, max: 5 },
    { key: "gap", label: "Pad gap", mm: true, min: 0.1, max: 5 },
    { key: "padW", label: "Pad width", mm: true, min: 0.1, max: 5 },
    { key: "padH", label: "Pad height", mm: true, min: 0.1, max: 5 },
  ],
};

export type Family = {
  id: string;
  label: string;
  arrangement: Arrangement;
  /** Reference prefix the family pre-fills. */
  prefix: string;
  mount: Mounting;
  /** Nominal body height, in mm, used by the 3D step's starting value. */
  bodyHeight: number;
  params: Record<string, number>;
};

const SMD = "SMD" as const;
const THT = "THT" as const;

export const FAMILIES: Family[] = [
  { id: "passive", label: "Passive (R/L/C)", arrangement: "two-pad", prefix: "R", mount: SMD, bodyHeight: 0.55, params: { gap: 0.9, padW: 0.8, padH: 1.0 } },
  { id: "connector", label: "Connector", arrangement: "single-row", prefix: "J", mount: THT, bodyHeight: 6, params: { count: 4, pitch: 2.54, padW: 1.7, padH: 1.7, drill: 1.0 } },
  { id: "body-soic-qfp-dip", label: "SOIC/QFP/DIP body", arrangement: "dual-row", prefix: "U", mount: SMD, bodyHeight: 1.75, params: { count: 8, pitch: 1.27, rowSpacing: 5.3, padW: 0.6, padH: 1.5, drill: 0.8 } },
  { id: "relay", label: "Relay module", arrangement: "dual-row", prefix: "K", mount: THT, bodyHeight: 15, params: { count: 6, pitch: 2.54, rowSpacing: 7.62, padW: 1.8, padH: 1.8, drill: 1.1 } },
  { id: "crystal", label: "Crystal/Oscillator", arrangement: "two-pad", prefix: "Y", mount: SMD, bodyHeight: 1.2, params: { gap: 1.8, padW: 1.2, padH: 1.6 } },
  { id: "bga", label: "BGA", arrangement: "grid", prefix: "U", mount: SMD, bodyHeight: 1.2, params: { rows: 4, cols: 4, pitch: 0.8, padW: 0.4, drill: 0.3 } },
  { id: "capacitors", label: "Capacitors", arrangement: "two-pad", prefix: "C", mount: SMD, bodyHeight: 0.9, params: { gap: 0.7, padW: 0.7, padH: 0.9 } },
  { id: "capacitors-np", label: "Capacitors Non-Polarized", arrangement: "two-pad", prefix: "C", mount: SMD, bodyHeight: 0.9, params: { gap: 0.8, padW: 0.8, padH: 1.0 } },
  { id: "chip-arrays", label: "Chip Arrays", arrangement: "chip-array", prefix: "RN", mount: SMD, bodyHeight: 0.6, params: { elements: 4, pitch: 0.8, gap: 0.6, padW: 0.4, padH: 0.6 } },
  { id: "diodes", label: "Diodes", arrangement: "two-pad", prefix: "D", mount: SMD, bodyHeight: 1.1, params: { gap: 1.2, padW: 1.0, padH: 1.2 } },
  { id: "dip", label: "DIP", arrangement: "dual-row", prefix: "U", mount: THT, bodyHeight: 4, params: { count: 8, pitch: 2.54, rowSpacing: 7.62, padW: 1.6, padH: 1.6, drill: 0.9 } },
  { id: "edge", label: "Edge Connectors", arrangement: "single-row", prefix: "J", mount: SMD, bodyHeight: 2, params: { count: 8, pitch: 1.0, padW: 0.6, padH: 3.0, drill: 0.6 } },
  { id: "header", label: "Header Connectors", arrangement: "header", prefix: "J", mount: THT, bodyHeight: 8.5, params: { rows: 2, count: 5, pitch: 2.54, rowSpacing: 2.54 } },
  { id: "molded-inductors", label: "Molded Inductors", arrangement: "two-pad", prefix: "L", mount: SMD, bodyHeight: 1.8, params: { gap: 1.4, padW: 1.2, padH: 1.6 } },
  { id: "pga", label: "PGA", arrangement: "grid", prefix: "U", mount: THT, bodyHeight: 3.5, params: { rows: 4, cols: 4, pitch: 2.54, padW: 1.6, drill: 0.9 } },
  { id: "plcc", label: "PLCC", arrangement: "quad", prefix: "U", mount: SMD, bodyHeight: 3.5, params: { perSide: 8, pitch: 1.27, span: 5.6, padW: 0.6, padH: 2.0 } },
  { id: "qfp", label: "Quad Packs (QFP)", arrangement: "quad", prefix: "U", mount: SMD, bodyHeight: 1.4, params: { perSide: 8, pitch: 0.8, span: 4.6, padW: 0.4, padH: 1.5 } },
  { id: "resistors", label: "Resistors", arrangement: "two-pad", prefix: "R", mount: SMD, bodyHeight: 0.5, params: { gap: 0.9, padW: 0.8, padH: 1.0 } },
  { id: "resistor-networks", label: "Resistor Networks", arrangement: "single-row", prefix: "RN", mount: THT, bodyHeight: 4, params: { count: 6, pitch: 2.54, padW: 1.5, padH: 1.5, drill: 0.8 } },
  { id: "sip", label: "SIP", arrangement: "single-row", prefix: "U", mount: THT, bodyHeight: 4, params: { count: 8, pitch: 2.54, padW: 1.5, padH: 1.5, drill: 0.8 } },
  { id: "soic", label: "SOIC/SOP", arrangement: "dual-row", prefix: "U", mount: SMD, bodyHeight: 1.75, params: { count: 8, pitch: 1.27, rowSpacing: 5.3, padW: 0.6, padH: 1.5, drill: 0.8 } },
  { id: "sot", label: "SOT", arrangement: "dual-row", prefix: "Q", mount: SMD, bodyHeight: 1.1, params: { count: 3, pitch: 0.95, rowSpacing: 2.3, padW: 0.6, padH: 1.0, drill: 0.6 } },
  { id: "staggered-bga", label: "Staggered BGA", arrangement: "staggered-grid", prefix: "U", mount: SMD, bodyHeight: 1.2, params: { rows: 4, cols: 4, pitch: 0.8, padW: 0.4, drill: 0.3 } },
  { id: "staggered-pga", label: "Staggered PGA", arrangement: "staggered-grid", prefix: "U", mount: THT, bodyHeight: 3.5, params: { rows: 4, cols: 4, pitch: 2.54, padW: 1.6, drill: 0.9 } },
];

export const familyById = (id: string) => FAMILIES.find((f) => f.id === id);

const pad = (n: number, x: number, y: number, w: number, h: number, tht: boolean, drill?: number): FpPad => ({
  id: newId("wpad"),
  kind: "pad",
  padKind: "Pad",
  shape: tht ? "THT round" : "SMD rect",
  w,
  h,
  drill: tht ? (drill ?? 0.9) : undefined,
  x: Math.round(x * 1000) / 1000,
  y: Math.round(y * 1000) / 1000,
  pin: n,
});

/** Pad positions for a family's arrangement, numbered the way the package is.
 *  Dual-row and quad run counter-clockwise from pin 1, which is what an IC's
 *  own datasheet does — the spec's SOIC preview shows 1-2-3-4 across the top
 *  and 8-7-6-5 back along the bottom. */
export function padsFor(f: Family, p: Record<string, number>): FpPad[] {
  const tht = f.mount === "THT";
  const g = (k: string, fb = 0) => (Number.isFinite(p[k]) ? p[k] : fb);
  const out: FpPad[] = [];

  switch (f.arrangement) {
    case "two-pad": {
      const w = g("padW", 0.8);
      const h = g("padH", 1);
      const dx = g("gap", 0.9) / 2 + w / 2;
      out.push(pad(1, -dx, 0, w, h, tht, g("drill", 0.9)), pad(2, dx, 0, w, h, tht, g("drill", 0.9)));
      break;
    }
    case "single-row": {
      const n = Math.max(1, Math.round(g("count", 4)));
      const pitch = g("pitch", 2.54);
      const w = g("padW", 1.5);
      const h = g("padH", 1.5);
      const x0 = -((n - 1) * pitch) / 2;
      for (let i = 0; i < n; i += 1) out.push(pad(i + 1, x0 + i * pitch, 0, w, h, tht, g("drill", 0.9)));
      break;
    }
    case "dual-row": {
      const n = Math.max(2, Math.round(g("count", 8)));
      const per = Math.ceil(n / 2);
      const pitch = g("pitch", 1.27);
      const rs = g("rowSpacing", 5.3);
      const w = g("padW", 0.6);
      const h = g("padH", 1.5);
      const other = n - per;
      // Each row is centred on its *own* count, so an odd pin count puts the
      // lone pad in the middle — which is what a SOT-23's pin 3 does. Centring
      // both rows on the longer one would park it under pin 1.
      const x0 = -((per - 1) * pitch) / 2;
      const x0b = -((other - 1) * pitch) / 2;
      for (let i = 0; i < per; i += 1) out.push(pad(i + 1, x0 + i * pitch, -rs / 2, w, h, tht, g("drill", 0.8)));
      for (let i = 0; i < other; i += 1) out.push(pad(n - i, x0b + i * pitch, rs / 2, w, h, tht, g("drill", 0.8)));
      break;
    }
    case "header": {
      const rows = Math.min(2, Math.max(1, Math.round(g("rows", 2))));
      const n = Math.max(1, Math.round(g("count", 5)));
      const pitch = g("pitch", 2.54);
      const rs = g("rowSpacing", 2.54);
      const w = pitch * 0.66;
      const x0 = -((n - 1) * pitch) / 2;
      const y0 = rows === 1 ? 0 : -rs / 2;
      let k = 1;
      for (let r = 0; r < rows; r += 1) {
        for (let i = 0; i < n; i += 1) out.push(pad(k++, x0 + i * pitch, y0 + r * rs, w, w, true, pitch * 0.4));
      }
      break;
    }
    case "quad": {
      const per = Math.max(1, Math.round(g("perSide", 8)));
      const pitch = g("pitch", 0.8);
      const span = g("span", 4.6);
      const w = g("padW", 0.4);
      const h = g("padH", 1.5);
      const start = -((per - 1) * pitch) / 2;
      let k = 1;
      // Left, bottom, right, top — counter-clockwise from the top-left corner.
      for (let i = 0; i < per; i += 1) out.push(pad(k++, -span, start + i * pitch, h, w, tht, g("drill", 0.3)));
      for (let i = 0; i < per; i += 1) out.push(pad(k++, start + i * pitch, span, w, h, tht, g("drill", 0.3)));
      for (let i = per - 1; i >= 0; i -= 1) out.push(pad(k++, span, start + i * pitch, h, w, tht, g("drill", 0.3)));
      for (let i = per - 1; i >= 0; i -= 1) out.push(pad(k++, start + i * pitch, -span, w, h, tht, g("drill", 0.3)));
      break;
    }
    case "grid":
    case "staggered-grid": {
      const rows = Math.max(1, Math.round(g("rows", 4)));
      const cols = Math.max(1, Math.round(g("cols", 4)));
      const pitch = g("pitch", 0.8);
      const d = g("padW", 0.4);
      const stag = f.arrangement === "staggered-grid";
      const x0 = -((cols - 1) * pitch) / 2;
      const y0 = -((rows - 1) * pitch) / 2;
      let k = 1;
      for (let r = 0; r < rows; r += 1) {
        // A staggered array offsets alternate rows by half a pitch, which is
        // the whole point of the arrangement.
        const off = stag && r % 2 === 1 ? pitch / 2 : 0;
        for (let c = 0; c < cols; c += 1) out.push(pad(k++, x0 + c * pitch + off, y0 + r * pitch, d, d, tht, g("drill", 0.3)));
      }
      break;
    }
    case "chip-array": {
      const els = Math.max(2, Math.round(g("elements", 4)));
      const pitch = g("pitch", 0.8);
      const gap = g("gap", 0.6);
      const w = g("padW", 0.4);
      const h = g("padH", 0.6);
      const x0 = -((els - 1) * pitch) / 2;
      const dy = gap / 2 + h / 2;
      let k = 1;
      // Each element is a pair: one pad on each side of the array's centreline.
      for (let i = 0; i < els; i += 1) out.push(pad(k++, x0 + i * pitch, -dy, w, h, tht, g("drill", 0.3)));
      for (let i = els - 1; i >= 0; i -= 1) out.push(pad(k++, x0 + i * pitch, dy, w, h, tht, g("drill", 0.3)));
      break;
    }
  }
  return out;
}

/** The symbol that goes with those pads: pins in one or two columns around a
 *  body rectangle, numbered to match. The pin numbers are the contract between
 *  the two editors, so they are derived from the same pad list. */
export function symbolFor(f: Family, pads: FpPad[]): SymObj[] {
  const nums = pads.map((p) => p.pin).filter((n): n is number => n !== null).sort((a, b) => a - b);
  const n = nums.length;
  const GRID = 20;
  const half = Math.ceil(n / 2);
  const top = 120;
  const bodyX = 300;
  const bodyW = 200;
  const bodyH = Math.max(80, (half - 1) * GRID * 2 + 60);

  const out: SymObj[] = [{ id: newId("wbody"), kind: "rect", x: bodyX, y: top, w: bodyW, h: bodyH }];

  nums.forEach((num, i) => {
    const left = i < half;
    const row = left ? i : i - half;
    const y = top + 30 + row * GRID * 2;
    out.push({
      id: newId("wpin"),
      kind: "pin",
      num,
      name: `Pin${num}`,
      etype: "Passive",
      length: 40,
      angle: left ? 0 : 180,
      x: left ? bodyX - 40 : bodyX + bodyW + 40,
      y,
    } satisfies SymPin);
  });

  // The two text objects every symbol wants, wired to the header fields rather
  // than carrying their own copy of the prefix and value.
  out.push({ id: newId("wtxt"), kind: "text", x: bodyX + bodyW / 2, y: top - 16, textKind: "Designator", content: "", size: 13 });
  out.push({ id: newId("wtxt"), kind: "text", x: bodyX + bodyW / 2, y: top + bodyH + 26, textKind: "Value", content: "", size: 12 });
  return out;
}

/** The silkscreen body outline, so the footprint states its own extent — and
 *  so the 3D step can read the body's width and depth from real data. */
export function silkFor(f: Family, pads: FpPad[]) {
  if (!pads.length) return null;
  const xs = pads.map((p) => p.x);
  const ys = pads.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const w = Math.max(0.4, f.arrangement === "dual-row" || f.arrangement === "quad" ? spanX + 1 : spanX * 0.8 + 0.4);
  const h = Math.max(0.4, f.arrangement === "dual-row" ? spanY - 1.2 : spanY * 0.8 + 0.4);
  return { id: newId("wsilk"), kind: "rect" as const, layer: "Top Silkscreen" as const, x: -w / 2, y: -h / 2, w, h };
}
