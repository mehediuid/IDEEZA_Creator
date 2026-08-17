// DXF (ASCII) import.
//
// A real parser for the entity set a PCB/schematic import actually needs, and a
// converter into `CanvasObject`s the editor can draw and edit. Everything lands
// as geometry the app can express exactly — straight runs become lines, curves
// become polygons/polylines — rather than pretending a fixed-size circle glyph
// is a 12.7 mm circle.
//
// Not handled (reported as skipped rather than silently dropped): blocks/INSERT,
// splines, dimensions, hatches, 3D entities.

import type { CanvasObject } from "./types";
import { PX_PER_MM } from "./drc";

export type DxfLine = { type: "LINE"; layer: string; x1: number; y1: number; x2: number; y2: number };
export type DxfPoly = { type: "POLYLINE"; layer: string; pts: Array<{ x: number; y: number }>; closed: boolean };
export type DxfCircle = { type: "CIRCLE"; layer: string; cx: number; cy: number; r: number };
export type DxfArc = { type: "ARC"; layer: string; cx: number; cy: number; r: number; a1: number; a2: number };
export type DxfText = { type: "TEXT"; layer: string; x: number; y: number; h: number; text: string };
export type DxfEntity = DxfLine | DxfPoly | DxfCircle | DxfArc | DxfText;

export type DxfDoc = {
  entities: DxfEntity[];
  /** From $INSUNITS when present. */
  units: "mm" | "inch" | "unknown";
  skipped: Record<string, number>;
  bbox: { minX: number; minY: number; maxX: number; maxY: number } | null;
};

const HANDLED = new Set(["LINE", "LWPOLYLINE", "POLYLINE", "VERTEX", "SEQEND", "CIRCLE", "ARC", "TEXT", "MTEXT"]);

/** Split a DXF file into (code, value) pairs — the format's only real syntax. */
function pairs(text: string): Array<[number, string]> {
  const lines = text.split(/\r\n|\r|\n/);
  const out: Array<[number, string]> = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (!Number.isFinite(code)) continue;
    out.push([code, lines[i + 1].trim()]);
  }
  return out;
}

export function parseDxf(text: string): DxfDoc {
  const p = pairs(text);
  const entities: DxfEntity[] = [];
  const skipped: Record<string, number> = {};
  let units: DxfDoc["units"] = "unknown";

  // HEADER → $INSUNITS (1 = inches, 4 = mm; others left unknown).
  for (let i = 0; i < p.length - 2; i++) {
    if (p[i][0] === 9 && p[i][1] === "$INSUNITS") {
      const v = Number(p[i + 1][1]);
      units = v === 1 ? "inch" : v === 4 ? "mm" : "unknown";
      break;
    }
  }

  // Walk entities: a `0` code starts a new one, so buffer codes until the next.
  let cur: { type: string; codes: Array<[number, string]> } | null = null;
  let polyBuf: { layer: string; pts: Array<{ x: number; y: number }>; closed: boolean } | null = null;

  const num = (codes: Array<[number, string]>, code: number, fallback = 0) => {
    const hit = codes.find(([c]) => c === code);
    return hit ? Number(hit[1]) || 0 : fallback;
  };
  const str = (codes: Array<[number, string]>, code: number, fallback = "") => {
    const hit = codes.find(([c]) => c === code);
    return hit ? hit[1] : fallback;
  };

  const flush = () => {
    if (!cur) return;
    const { type, codes } = cur;
    const layer = str(codes, 8, "0");
    if (type === "LINE") {
      entities.push({ type: "LINE", layer, x1: num(codes, 10), y1: num(codes, 20), x2: num(codes, 11), y2: num(codes, 21) });
    } else if (type === "LWPOLYLINE") {
      const xs = codes.filter(([c]) => c === 10).map(([, v]) => Number(v) || 0);
      const ys = codes.filter(([c]) => c === 20).map(([, v]) => Number(v) || 0);
      const pts = xs.map((x, i) => ({ x, y: ys[i] ?? 0 }));
      if (pts.length >= 2) entities.push({ type: "POLYLINE", layer, pts, closed: (num(codes, 70) & 1) === 1 });
    } else if (type === "POLYLINE") {
      polyBuf = { layer, pts: [], closed: (num(codes, 70) & 1) === 1 };
    } else if (type === "VERTEX") {
      polyBuf?.pts.push({ x: num(codes, 10), y: num(codes, 20) });
    } else if (type === "SEQEND") {
      if (polyBuf && polyBuf.pts.length >= 2) entities.push({ type: "POLYLINE", ...polyBuf });
      polyBuf = null;
    } else if (type === "CIRCLE") {
      entities.push({ type: "CIRCLE", layer, cx: num(codes, 10), cy: num(codes, 20), r: num(codes, 40) });
    } else if (type === "ARC") {
      entities.push({ type: "ARC", layer, cx: num(codes, 10), cy: num(codes, 20), r: num(codes, 40), a1: num(codes, 50), a2: num(codes, 51) });
    } else if (type === "TEXT" || type === "MTEXT") {
      const t = str(codes, 1);
      if (t) entities.push({ type: "TEXT", layer, x: num(codes, 10), y: num(codes, 20), h: num(codes, 40, 2.5), text: t });
    } else if (type && type !== "SECTION" && type !== "ENDSEC" && type !== "EOF" && type !== "TABLE" && type !== "ENDTAB" && type !== "BLOCK" && type !== "ENDBLK") {
      skipped[type] = (skipped[type] ?? 0) + 1;
    }
    cur = null;
  };

  let inEntities = false;
  for (let i = 0; i < p.length; i++) {
    const [code, value] = p[i];
    if (code === 0) {
      flush();
      if (value === "SECTION") {
        const next = p[i + 1];
        inEntities = !!next && next[0] === 2 && next[1] === "ENTITIES";
        continue;
      }
      if (value === "ENDSEC") { inEntities = false; continue; }
      if (value === "EOF") break;
      if (inEntities || value === "SEQEND" || value === "VERTEX") cur = { type: value, codes: [] };
      else if (HANDLED.has(value)) cur = { type: value, codes: [] };
      continue;
    }
    if (cur) cur.codes.push([code, value]);
  }
  flush();

  // Bounding box over everything imported.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const hit = (x: number, y: number) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  };
  for (const e of entities) {
    if (e.type === "LINE") { hit(e.x1, e.y1); hit(e.x2, e.y2); }
    else if (e.type === "POLYLINE") e.pts.forEach((q) => hit(q.x, q.y));
    else if (e.type === "CIRCLE" || e.type === "ARC") { hit(e.cx - e.r, e.cy - e.r); hit(e.cx + e.r, e.cy + e.r); }
    else hit(e.x, e.y);
  }
  return {
    entities,
    units,
    skipped,
    bbox: minX === Infinity ? null : { minX, minY, maxX, maxY },
  };
}

export function summariseDxf(doc: DxfDoc): { counts: Record<string, number>; total: number } {
  const counts: Record<string, number> = {};
  for (const e of doc.entities) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return { counts, total: doc.entities.length };
}

/** The file's layers with entity counts, in first-seen order — the rows of the
 *  dialog's layer-mapping table. */
export function dxfLayers(doc: DxfDoc): Array<{ name: string; count: number }> {
  const order: string[] = [];
  const counts: Record<string, number> = {};
  for (const e of doc.entities) {
    if (!(e.layer in counts)) order.push(e.layer);
    counts[e.layer] = (counts[e.layer] ?? 0) + 1;
  }
  return order.map((name) => ({ name, count: counts[name] }));
}

export type DxfLayerMap = Record<string, { include: boolean; target?: string }>;

export type DxfPlaceOpts = {
  /** File units → canvas px. */
  unit: "mm" | "inch";
  scale: number;
  /** "origin" keeps the DXF origin, "center" centres the drawing on the target. */
  reference: "origin" | "center";
  /** Where the reference point lands, in canvas px. */
  at: { x: number; y: number };
  /** Arc/circle flattening — segments per full turn. */
  segments?: number;
  /** Per-DXF-layer include/target mapping; a layer absent from the map is included. */
  layers?: DxfLayerMap;
  /** Stroke width (canvas px) stamped on the imported line segments. */
  strokeWidth?: number;
};

/** px per file unit — mm goes through the documented board scale; inch = 25.4 mm. */
export const pxPerUnit = (unit: "mm" | "inch", scale: number) =>
  (unit === "inch" ? 25.4 : 1) * PX_PER_MM * scale;

/** Convert parsed DXF geometry into editable canvas objects.
 *
 *  `idPrefix` must be unique per import — a fixed `"dxf"` meant a second import
 *  re-issued `dxf_1, dxf_2, …` and collided with the first one's objects, so
 *  selecting or deleting one hit both. The caller passes a prefix derived from
 *  the board; the session counter is the fallback. */
let importSeq = 0;
export function dxfToObjects(doc: DxfDoc, opts: DxfPlaceOpts, idPrefix?: string): CanvasObject[] {
  const prefix = idPrefix ?? `dxf${++importSeq}`;
  const k = pxPerUnit(opts.unit, opts.scale);
  const bb = doc.bbox;
  // DXF is Y-up, the canvas is Y-down; flip around the drawing's own top edge.
  const originX = opts.reference === "center" && bb ? (bb.minX + bb.maxX) / 2 : bb ? bb.minX : 0;
  const originY = opts.reference === "center" && bb ? (bb.minY + bb.maxY) / 2 : bb ? bb.maxY : 0;
  const X = (x: number) => opts.at.x + (x - originX) * k;
  const Y = (y: number) => opts.at.y - (y - originY) * k;

  const segs = Math.max(8, opts.segments ?? 48);
  const out: CanvasObject[] = [];
  let n = 0;
  const id = () => `${prefix}_${++n}`;
  // The current entity's mapping decides the emitted objects' layer; the
  // stroke width is one dial for the whole import.
  let target: string | undefined;
  const width = opts.strokeWidth && opts.strokeWidth > 0 ? opts.strokeWidth : undefined;
  const seg = (x1: number, y1: number, x2: number, y2: number) =>
    out.push({ id: id(), kind: "line", x: X(x1), y: Y(y1), endX: X(x2), endY: Y(y2), layer: target, width } as CanvasObject);

  for (const e of doc.entities) {
    const map = opts.layers?.[e.layer];
    if (map && !map.include) continue;
    target = map?.target;
    if (e.type === "LINE") {
      seg(e.x1, e.y1, e.x2, e.y2);
    } else if (e.type === "POLYLINE") {
      for (let i = 0; i + 1 < e.pts.length; i++) seg(e.pts[i].x, e.pts[i].y, e.pts[i + 1].x, e.pts[i + 1].y);
      if (e.closed && e.pts.length > 2) seg(e.pts[e.pts.length - 1].x, e.pts[e.pts.length - 1].y, e.pts[0].x, e.pts[0].y);
    } else if (e.type === "CIRCLE") {
      // A closed run of segments carries the true radius. It used to be emitted
      // as `kind: "polygon"` — the board's **copper region** — so importing a
      // mechanical drawing silently poured copper in every circle.
      let px = e.cx + e.r, py = e.cy;
      for (let i = 1; i <= segs; i++) {
        const t = (i / segs) * Math.PI * 2;
        const nx = e.cx + Math.cos(t) * e.r, ny = e.cy + Math.sin(t) * e.r;
        seg(px, py, nx, ny);
        px = nx; py = ny;
      }
    } else if (e.type === "ARC") {
      const a1 = (e.a1 * Math.PI) / 180;
      const a2raw = (e.a2 * Math.PI) / 180;
      const a2 = a2raw <= a1 ? a2raw + Math.PI * 2 : a2raw;
      const steps = Math.max(2, Math.round((segs * (a2 - a1)) / (Math.PI * 2)));
      let px = e.cx + Math.cos(a1) * e.r, py = e.cy + Math.sin(a1) * e.r;
      for (let i = 1; i <= steps; i++) {
        const t = a1 + ((a2 - a1) * i) / steps;
        const nx = e.cx + Math.cos(t) * e.r, ny = e.cy + Math.sin(t) * e.r;
        seg(px, py, nx, ny);
        px = nx; py = ny;
      }
    } else if (e.type === "TEXT") {
      out.push({ id: id(), kind: "text", x: X(e.x), y: Y(e.y), text: e.text, layer: target } as CanvasObject);
    }
  }
  return out;
}
