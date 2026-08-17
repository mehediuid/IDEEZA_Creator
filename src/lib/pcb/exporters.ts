// Real manufacturing/export file generators for the PCB module. Every function
// here produces a genuine, openable file from the live board — no placeholders.
// Coverage: Pick & Place (CSV/TXT/JSON), DXF (R12 ASCII), SVG, PDF (hand-rolled
// vector), PNG (SVG rasterised), and 3D mesh (STL ASCII / OBJ). STEP is
// intentionally omitted — a correct B-rep needs a CAD kernel we don't bundle.

import type { CanvasObject, PcbState } from "./types";
import { PAD_OFFSETS } from "./schematic-to-pcb";

// Canvas board origin (matches pcb-canvas.tsx top:60/left:60) + px→mm scale.
const BOARD_X0 = 60;
const BOARD_Y0 = 60;
const PX_PER_MM = 10;

// Footprint body footprint (canvas px) + physical height (mm) for 3D mesh export.
const FP_BODY: Record<string, { w: number; d: number; h: number }> = {
  fp0805: { w: 15, d: 9, h: 0.5 },
  fpSOD123: { w: 17, d: 8, h: 0.5 },
  fpSOT23: { w: 15, d: 15, h: 0.6 },
  fpSOIC8: { w: 22, d: 26, h: 1.2 },
};
const isFootprint = (k: string) => k in FP_BODY;

export interface ExportComp {
  ref: string;
  xmm: number; // board-relative mm, X right
  ymm: number; // board-relative mm, Y down (screen)
  rot: number; // degrees
  side: string; // "top" | "bottom"
  footprint: string;
  wmm: number;
  dmm: number;
  hmm: number;
}
export interface ExportSeg {
  x1: number; y1: number; x2: number; y2: number; // mm, Y down
  width: number; // mm
  layer: string;
}
export interface ExportPad {
  x: number; y: number; w: number; h: number; rot: number; // mm, Y down
}
export interface ExportVia {
  x: number; y: number; outer: number; hole: number; // mm, Y down
}
export interface ExportCutout {
  x: number; y: number; w: number; h: number; // mm, Y down
}
/** The board's own edge when the user drew one (#122). Without it the board is
 *  the `pcbBoard` rectangle — which is what every export used to assume, so a
 *  circular or polygon board shipped as a rectangle. */
export interface ExportOutline {
  shape: "rect" | "circle" | "poly";
  x: number; y: number; w: number; h: number; r: number; // mm, Y down
  pts: Array<{ x: number; y: number }>;
}
/** What a DXF / document export should contain. Every flag is honoured by the
 *  builders below, so a checkbox in the dialog changes the file. */
export interface ExportInclude {
  outline?: boolean;
  tracks?: boolean;
  pads?: boolean;
  vias?: boolean;
  comps?: boolean;
  side?: "both" | "top" | "bottom";
}
export interface DxfOptions {
  unit?: "mm" | "inch";
  scale?: number;
  include?: ExportInclude;
}
export interface DocOptions {
  theme?: "default" | "whiteOnBlack" | "blackOnWhite";
  hairline?: boolean;
  include?: ExportInclude;
}
const ALL_IN: Required<Omit<ExportInclude, "side">> & { side: "both" } = {
  outline: true, tracks: true, pads: true, vias: true, comps: true, side: "both",
};
const inc = (o?: ExportInclude) => ({ ...ALL_IN, ...(o ?? {}) });
const onSide = (layer: string, side: ExportInclude["side"]) =>
  side === "both" || !side ? true : side === "bottom" ? layer === "bottom" : layer !== "bottom";

export interface ExportModel {
  boardWmm: number;
  boardHmm: number;
  thicknessMm: number;
  comps: ExportComp[];
  tracks: ExportSeg[];
  pads: ExportPad[];
  vias: ExportVia[];
  cutouts: ExportCutout[];
  outline: ExportOutline | null;
}

// Build a unit-normalised (mm) model of the live board, origin at the board's
// top-left corner. Y is screen-down here; Y-up formats flip via (boardH - y).
export function collectPcbModel(state: PcbState, opts?: { onlySelected?: boolean }): ExportModel {
  const W = state.pcbBoard?.width && state.pcbBoard.width > 0 ? state.pcbBoard.width : 720;
  const H = state.pcbBoard?.height && state.pcbBoard.height > 0 ? state.pcbBoard.height : 480;
  const mm = (px: number) => px / PX_PER_MM;
  const rx = (x: number) => mm((x ?? 0) - BOARD_X0);
  const ry = (y: number) => mm((y ?? 0) - BOARD_Y0);

  const thicknessMm =
    (state.threeD?.layers ?? []).reduce((a, l) => a + (parseFloat(l.thickness) || 0), 0) || 1.6;

  let objs: CanvasObject[] = (state.objects ?? []).filter((o) => (o.scope ?? "schematic") === "pcb");
  if (opts?.onlySelected && state.selectedIds.length) {
    objs = objs.filter((o) => state.selectedIds.includes(o.id));
  }

  const comps: ExportComp[] = [];
  const tracks: ExportSeg[] = [];
  const pads: ExportPad[] = [];
  const vias: ExportVia[] = [];
  const cutouts: ExportCutout[] = [];
  let outline: ExportOutline | null = null;

  for (const o of objs) {
    if (o.kind === "boardOutline" && (o.props as Record<string, unknown> | undefined)?.shape) {
      const shape = String((o.props as Record<string, unknown>).shape);
      if (shape === "polygon" && (o.points?.[0]?.length ?? 0) > 2) {
        outline = { shape: "poly", x: 0, y: 0, w: 0, h: 0, r: 0, pts: o.points![0].map((p) => ({ x: rx(o.x + p.x), y: ry(o.y + p.y) })) };
      } else if (shape === "circle" && (o.width ?? 0) > 1) {
        outline = { shape: "circle", x: rx(o.x), y: ry(o.y), w: mm(o.width!), h: mm(o.width!), r: mm(o.width! / 2), pts: [] };
      } else if ((o.width ?? 0) > 1 && (o.height ?? 0) > 1) {
        outline = { shape: "rect", x: rx(o.x), y: ry(o.y), w: mm(o.width!), h: mm(o.height!), r: 0, pts: [] };
      }
      continue;
    }
    if (o.kind === "cutout") {
      cutouts.push({ x: rx(o.x), y: ry(o.y), w: mm(o.width ?? 0), h: mm(o.height ?? 0) });
      continue;
    }
    if (o.kind === "track") {
      tracks.push({
        x1: rx(o.x), y1: ry(o.y), x2: rx(o.endX ?? o.x), y2: ry(o.endY ?? o.y),
        width: mm(o.width ?? 8), layer: (o.layer ?? "top") !== "bottom" ? "top" : "bottom",
      });
      continue;
    }
    if (o.kind === "via") {
      vias.push({ x: rx(o.x), y: ry(o.y), outer: mm(o.width ?? 24), hole: mm(o.drill ?? 12) });
      continue;
    }
    const body = FP_BODY[o.kind];
    if (body) {
      const rot = ((o.rotation ?? 0) * Math.PI) / 180;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      comps.push({
        ref: (o.text || "").trim() || o.id,
        xmm: rx(o.x), ymm: ry(o.y), rot: o.rotation ?? 0,
        side: o.side ?? o.layer ?? "top",
        footprint: o.footprint || o.kind,
        wmm: mm(body.w), dmm: mm(body.d), hmm: body.h,
      });
      for (const off of PAD_OFFSETS[o.kind] ?? []) {
        const ox = off.x * cos - off.y * sin;
        const oy = off.x * sin + off.y * cos;
        pads.push({ x: rx((o.x ?? 0) + ox), y: ry((o.y ?? 0) + oy), w: 0.9, h: 1.1, rot: o.rotation ?? 0 });
      }
    }
  }
  return { boardWmm: mm(W), boardHmm: mm(H), thicknessMm, comps, tracks, pads, vias, cutouts, outline };
}

// ── downloads ────────────────────────────────────────────────────────────────
export function downloadBlob(filename: string, data: BlobPart, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ── Pick & Place (CSV / TXT / JSON) ───────────────────────────────────────────
export function buildPickPlace(m: ExportModel, fmt: "CSV" | "TXT" | "JSON"): { text: string; ext: string; mime: string } {
  const rows = m.comps.map((c) => ({
    Designator: c.ref,
    "Mid X (mm)": c.xmm.toFixed(3),
    "Mid Y (mm)": (m.boardHmm - c.ymm).toFixed(3), // Y-up
    "Rotation (deg)": String(c.rot),
    Side: c.side === "bottom" ? "Bottom" : "Top",
    Footprint: c.footprint,
  }));
  if (fmt === "JSON") return { text: JSON.stringify(rows, null, 2), ext: "json", mime: "application/json" };
  const headers = ["Designator", "Mid X (mm)", "Mid Y (mm)", "Rotation (deg)", "Side", "Footprint"];
  if (fmt === "TXT") {
    const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(Object.values(r)[i]).length)));
    const line = (cells: string[]) => cells.map((c, i) => c.padEnd(w[i])).join("  ");
    return { text: [line(headers), ...rows.map((r) => line(Object.values(r)))].join("\n"), ext: "txt", mime: "text/plain" };
  }
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map((r) => Object.values(r).map(esc).join(","))].join("\n");
  return { text: csv, ext: "csv", mime: "text/csv" };
}

// ── DXF (AutoCAD R12 ASCII) ───────────────────────────────────────────────────
export function buildDxf(m: ExportModel, opts?: DxfOptions): string {
  const want = inc(opts?.include);
  // mm is the model's unit; inch divides by 25.4. `scale` multiplies on top.
  const k = (opts?.unit === "inch" ? 1 / 25.4 : 1) * (opts?.scale && opts.scale > 0 ? opts.scale : 1);
  const yf = (y: number) => (m.boardHmm - y) * k;
  const xf = (x: number) => x * k;
  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  const line = (x1: number, y1: number, x2: number, y2: number, layer: string) =>
    out.push("0", "LINE", "8", layer, "10", xf(x1).toFixed(4), "20", yf(y1).toFixed(4), "11", xf(x2).toFixed(4), "21", yf(y2).toFixed(4));
  const circle = (cx: number, cy: number, r: number, layer: string) =>
    out.push("0", "CIRCLE", "8", layer, "10", xf(cx).toFixed(4), "20", yf(cy).toFixed(4), "40", (r * k).toFixed(4));
  const rect = (x: number, y: number, w: number, h: number, layer: string) => {
    line(x, y, x + w, y, layer); line(x + w, y, x + w, y + h, layer);
    line(x + w, y + h, x, y + h, layer); line(x, y + h, x, y, layer);
  };
  if (want.outline) {
    const o = m.outline;
    if (o?.shape === "circle") circle(o.x, o.y, o.r, "OUTLINE");
    else if (o?.shape === "poly" && o.pts.length > 2) {
      for (let i = 0; i < o.pts.length; i++) {
        const a = o.pts[i], b = o.pts[(i + 1) % o.pts.length];
        line(a.x, a.y, b.x, b.y, "OUTLINE");
      }
    } else if (o?.shape === "rect") rect(o.x, o.y, o.w, o.h, "OUTLINE");
    else rect(0, 0, m.boardWmm, m.boardHmm, "OUTLINE");
    // Cutouts are board edges too — a fab reads them off the outline layer.
    for (const c of m.cutouts) rect(c.x, c.y, c.w, c.h, "OUTLINE");
  }
  if (want.tracks) {
    for (const t of m.tracks) {
      if (!onSide(t.layer, want.side)) continue;
      line(t.x1, t.y1, t.x2, t.y2, t.layer === "bottom" ? "BOTTOM" : "TOP");
    }
  }
  if (want.pads) for (const p of m.pads) circle(p.x, p.y, Math.max(p.w, p.h) / 2, "PADS");
  if (want.vias) for (const v of m.vias) { circle(v.x, v.y, v.outer / 2, "VIAS"); circle(v.x, v.y, v.hole / 2, "DRILL"); }
  if (want.comps) {
    for (const c of m.comps) {
      if (!onSide(c.side, want.side)) continue;
      rect(c.xmm - c.wmm / 2, c.ymm - c.dmm / 2, c.wmm, c.dmm, "COMPONENTS");
    }
  }
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n");
}

// ── SVG ───────────────────────────────────────────────────────────────────────
export function buildSvg(m: ExportModel, opts?: DocOptions): string {
  const want = inc(opts?.include);
  // Theme is a real paint swap, not a label: the board, the copper and the
  // page all change together so the sheet stays readable either way.
  const theme = opts?.theme ?? "default";
  const paint = theme === "blackOnWhite"
    ? { page: "#ffffff", board: "#ffffff", edge: "#141414", top: "#141414", bottom: "#5a5a5a", pad: "#141414", via: "#141414", hole: "#ffffff", comp: "#141414" }
    : theme === "whiteOnBlack"
    ? { page: "#000000", board: "#000000", edge: "#ffffff", top: "#ffffff", bottom: "#b4b4b4", pad: "#ffffff", via: "#ffffff", hole: "#000000", comp: "#ffffff" }
    : { page: "#ffffff", board: "#0d3b24", edge: "#c9c9c9", top: "#d05a5a", bottom: "#3b7dd8", pad: "#e0b24a", via: "#c9902f", hole: "#141414", comp: "#e6e6e6" };
  const hair = (w: number) => (opts?.hairline ? 0.1 : w);
  const pad = 4;
  const W = (m.boardWmm + pad * 2).toFixed(2);
  const Ht = (m.boardHmm + pad * 2).toFixed(2);
  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${W}" height="${Ht}" fill="${paint.page}"/>`);
  if (want.outline) {
    const o = m.outline;
    if (o?.shape === "circle") {
      parts.push(`<circle cx="${(pad + o.x).toFixed(3)}" cy="${(pad + o.y).toFixed(3)}" r="${o.r.toFixed(3)}" fill="${paint.board}" stroke="${paint.edge}" stroke-width="${hair(0.15)}"/>`);
    } else if (o?.shape === "poly" && o.pts.length > 2) {
      parts.push(`<polygon points="${o.pts.map((q) => `${(pad + q.x).toFixed(3)},${(pad + q.y).toFixed(3)}`).join(" ")}" fill="${paint.board}" stroke="${paint.edge}" stroke-width="${hair(0.15)}"/>`);
    } else if (o?.shape === "rect") {
      parts.push(`<rect x="${(pad + o.x).toFixed(3)}" y="${(pad + o.y).toFixed(3)}" width="${o.w.toFixed(3)}" height="${o.h.toFixed(3)}" fill="${paint.board}" stroke="${paint.edge}" stroke-width="${hair(0.15)}"/>`);
    } else {
      parts.push(`<rect x="${pad}" y="${pad}" width="${m.boardWmm}" height="${m.boardHmm}" fill="${paint.board}" stroke="${paint.edge}" stroke-width="${hair(0.15)}"/>`);
    }
    // Cutouts: the board substrate is gone there, so paint the page through.
    for (const c of m.cutouts) {
      parts.push(`<rect x="${(pad + c.x).toFixed(3)}" y="${(pad + c.y).toFixed(3)}" width="${c.w.toFixed(3)}" height="${c.h.toFixed(3)}" fill="${paint.page}" stroke="${paint.edge}" stroke-width="${hair(0.15)}"/>`);
    }
  }
  if (want.tracks) {
    for (const t of m.tracks) {
      if (!onSide(t.layer, want.side)) continue;
      const col = t.layer === "bottom" ? paint.bottom : paint.top;
      parts.push(`<line x1="${(t.x1 + pad).toFixed(3)}" y1="${(t.y1 + pad).toFixed(3)}" x2="${(t.x2 + pad).toFixed(3)}" y2="${(t.y2 + pad).toFixed(3)}" stroke="${col}" stroke-width="${Math.max(0.1, hair(t.width)).toFixed(3)}" stroke-linecap="round"/>`);
    }
  }
  if (want.pads) for (const p of m.pads) parts.push(`<rect x="${(p.x - p.w / 2 + pad).toFixed(3)}" y="${(p.y - p.h / 2 + pad).toFixed(3)}" width="${p.w}" height="${p.h}" fill="${paint.pad}"/>`);
  if (want.vias) for (const v of m.vias) { parts.push(`<circle cx="${(v.x + pad).toFixed(3)}" cy="${(v.y + pad).toFixed(3)}" r="${(v.outer / 2).toFixed(3)}" fill="${paint.via}"/>`); parts.push(`<circle cx="${(v.x + pad).toFixed(3)}" cy="${(v.y + pad).toFixed(3)}" r="${(v.hole / 2).toFixed(3)}" fill="${paint.hole}"/>`); }
  if (want.comps) {
    for (const c of m.comps) {
      if (!onSide(c.side, want.side)) continue;
      parts.push(`<rect x="${(c.xmm - c.wmm / 2 + pad).toFixed(3)}" y="${(c.ymm - c.dmm / 2 + pad).toFixed(3)}" width="${c.wmm}" height="${c.dmm}" fill="none" stroke="${paint.comp}" stroke-width="${hair(0.12)}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${Ht}mm" viewBox="0 0 ${W} ${Ht}">${parts.join("")}</svg>`;
}

// SVG → PNG (browser). Returns a data URL. scale = px per mm.
export function rasterizeSvgToPng(svg: string, wMm: number, hMm: number, scale = 8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(wMm * scale));
      canvas.height = Math.max(1, Math.round(hMm * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no 2d context")); return; }
      ctx.fillStyle = "#101014";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("svg raster failed")); };
    img.src = blobUrl;
  });
}

// ── PDF (hand-rolled single-page vector) ──────────────────────────────────────
export function buildPdf(m: ExportModel, opts?: DocOptions): Blob {
  const want = inc(opts?.include);
  const theme = opts?.theme ?? "default";
  // PDF paint per theme (RG = stroke, rg = fill).
  const P = theme === "whiteOnBlack"
    ? { edge: "1 1 1", top: "1 1 1", bottom: "0.7 0.7 0.7", pad: "1 1 1", comp: "1 1 1", bg: "0 0 0" }
    : theme === "blackOnWhite"
    ? { edge: "0.1 0.1 0.1", top: "0.1 0.1 0.1", bottom: "0.4 0.4 0.4", pad: "0.1 0.1 0.1", comp: "0.1 0.1 0.1", bg: null as string | null }
    : { edge: "0.15 0.15 0.15", top: "0.82 0.35 0.35", bottom: "0.23 0.49 0.85", pad: "0.88 0.70 0.29", comp: "0.45 0.45 0.45", bg: null as string | null };
  const S = 2.834645; // pt per mm
  const margin = 20;
  const wPt = m.boardWmm * S + margin * 2;
  const hPt = m.boardHmm * S + margin * 2;
  const X = (x: number) => (margin + x * S).toFixed(2);
  const Y = (y: number) => (margin + (m.boardHmm - y) * S).toFixed(2); // flip to Y-up
  const lw = (w: number) => (opts?.hairline ? 0.4 : Math.max(0.4, w * S)).toFixed(2);
  let c = "";
  if (P.bg) c += `${P.bg} rg\n0 0 ${wPt.toFixed(2)} ${hPt.toFixed(2)} re f\n`;
  c += `0.6 w\n${P.edge} RG\n`;
  if (want.outline) {
    const o = m.outline;
    if (o?.shape === "poly" && o.pts.length > 2) {
      c += `${X(o.pts[0].x)} ${Y(o.pts[0].y)} m\n`;
      for (const q of o.pts.slice(1)) c += `${X(q.x)} ${Y(q.y)} l\n`;
      c += "h S\n";
    } else if (o?.shape === "circle") {
      // four Béziers make a circle in PDF content streams
      const k = 0.5523 * o.r;
      c += `${X(o.x - o.r)} ${Y(o.y)} m\n`;
      c += `${X(o.x - o.r)} ${Y(o.y + k)} ${X(o.x - k)} ${Y(o.y + o.r)} ${X(o.x)} ${Y(o.y + o.r)} c\n`;
      c += `${X(o.x + k)} ${Y(o.y + o.r)} ${X(o.x + o.r)} ${Y(o.y + k)} ${X(o.x + o.r)} ${Y(o.y)} c\n`;
      c += `${X(o.x + o.r)} ${Y(o.y - k)} ${X(o.x + k)} ${Y(o.y - o.r)} ${X(o.x)} ${Y(o.y - o.r)} c\n`;
      c += `${X(o.x - k)} ${Y(o.y - o.r)} ${X(o.x - o.r)} ${Y(o.y - k)} ${X(o.x - o.r)} ${Y(o.y)} c\nS\n`;
    } else if (o?.shape === "rect") {
      c += `${X(o.x)} ${Y(o.y + o.h)} ${(o.w * S).toFixed(2)} ${(o.h * S).toFixed(2)} re S\n`;
    } else {
      c += `${margin} ${margin} ${(m.boardWmm * S).toFixed(2)} ${(m.boardHmm * S).toFixed(2)} re S\n`;
    }
    // Cutout edges are board edges — same stroke as the outline.
    for (const cut of m.cutouts) {
      c += `${X(cut.x)} ${Y(cut.y + cut.h)} ${(cut.w * S).toFixed(2)} ${(cut.h * S).toFixed(2)} re S\n`;
    }
  }
  if (want.tracks) {
    for (const t of m.tracks) {
      if (!onSide(t.layer, want.side)) continue;
      const col = t.layer === "bottom" ? P.bottom : P.top;
      c += `${col} RG\n${lw(t.width)} w\n${X(t.x1)} ${Y(t.y1)} m ${X(t.x2)} ${Y(t.y2)} l S\n`;
    }
  }
  if (want.comps) {
    c += `${P.comp} RG\n0.5 w\n`;
    for (const cm of m.comps) {
      if (!onSide(cm.side, want.side)) continue;
      c += `${X(cm.xmm - cm.wmm / 2)} ${Y(cm.ymm + cm.dmm / 2)} ${(cm.wmm * S).toFixed(2)} ${(cm.dmm * S).toFixed(2)} re S\n`;
    }
  }
  if (want.pads) {
    c += `${P.pad} rg\n`;
    for (const p of m.pads) c += `${X(p.x - p.w / 2)} ${Y(p.y + p.h / 2)} ${(p.w * S).toFixed(2)} ${(p.h * S).toFixed(2)} re f\n`;
  }
  if (want.vias) {
    c += `${P.pad} rg\n`;
    for (const v of m.vias) c += `${X(v.x - v.outer / 2)} ${Y(v.y + v.outer / 2)} ${(v.outer * S).toFixed(2)} ${(v.outer * S).toFixed(2)} re f\n`;
  }

  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${wPt.toFixed(2)} ${hPt.toFixed(2)}]/Contents 4 0 R/Resources<</ProcSet[/PDF]>>>>`,
    `<</Length ${c.length}>>\nstream\n${c}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { pdf += String(o).padStart(10, "0") + " 00000 n \n"; });
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

// ── 3D mesh (STL ASCII / OBJ) ─────────────────────────────────────────────────
// The board sits in the XY plane (Z = thickness up); components stack on top.
type Box = { cx: number; cy: number; cz: number; w: number; d: number; h: number };
function modelBoxes(m: ExportModel, include: { board?: boolean; comps?: boolean } = { board: true, comps: true }): Box[] {
  const boxes: Box[] = [];
  if (include.board !== false)
    boxes.push({ cx: m.boardWmm / 2, cy: m.boardHmm / 2, cz: m.thicknessMm / 2, w: m.boardWmm, d: m.boardHmm, h: m.thicknessMm });
  if (include.comps !== false)
    for (const c of m.comps)
      boxes.push({ cx: c.xmm, cy: m.boardHmm - c.ymm, cz: m.thicknessMm + c.hmm / 2, w: c.wmm, d: c.dmm, h: c.hmm });
  return boxes;
}
function boxCorners(b: Box): [number, number, number][] {
  const x0 = b.cx - b.w / 2, x1 = b.cx + b.w / 2;
  const y0 = b.cy - b.d / 2, y1 = b.cy + b.d / 2;
  const z0 = b.cz - b.h / 2, z1 = b.cz + b.h / 2;
  return [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
}
// 12 triangles (two per face), CCW outward.
const BOX_TRIS: [number, number, number][] = [
  [0, 3, 2], [0, 2, 1], // bottom
  [4, 5, 6], [4, 6, 7], // top
  [0, 1, 5], [0, 5, 4], // front
  [1, 2, 6], [1, 6, 5], // right
  [2, 3, 7], [2, 7, 6], // back
  [3, 0, 4], [3, 4, 7], // left
];

export function buildStl(m: ExportModel, include?: { board?: boolean; comps?: boolean }): string {
  const out: string[] = ["solid ideeza_pcb"];
  for (const b of modelBoxes(m, include)) {
    const v = boxCorners(b);
    for (const [a, bb, cc] of BOX_TRIS) {
      const p1 = v[a], p2 = v[bb], p3 = v[cc];
      const ux = p2[0] - p1[0], uy = p2[1] - p1[1], uz = p2[2] - p1[2];
      const vx = p3[0] - p1[0], vy = p3[1] - p1[1], vz = p3[2] - p1[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1; nx /= len; ny /= len; nz /= len;
      out.push(`facet normal ${nx.toFixed(4)} ${ny.toFixed(4)} ${nz.toFixed(4)}`, "outer loop");
      for (const p of [p1, p2, p3]) out.push(`vertex ${p[0].toFixed(4)} ${p[1].toFixed(4)} ${p[2].toFixed(4)}`);
      out.push("endloop", "endfacet");
    }
  }
  out.push("endsolid ideeza_pcb");
  return out.join("\n");
}

export function buildObj(m: ExportModel, include?: { board?: boolean; comps?: boolean }): string {
  const out: string[] = ["# IDEEZA PCB export"];
  let base = 0;
  for (const b of modelBoxes(m, include)) {
    for (const p of boxCorners(b)) out.push(`v ${p[0].toFixed(4)} ${p[1].toFixed(4)} ${p[2].toFixed(4)}`);
    for (const [a, bb, cc] of BOX_TRIS) out.push(`f ${base + a + 1} ${base + bb + 1} ${base + cc + 1}`);
    base += 8;
  }
  return out.join("\n");
}

// ── Schematic image (SVG / PNG) ───────────────────────────────────────────────
// The board exporters above work off the PCB model; a schematic sheet has no
// such model — its symbols are drawn by `placed-objects.tsx`. Rather than
// re-describing every glyph here (two copies of the same geometry would drift),
// this captures the live sheet: each placed object's rendered <svg> is cloned
// into a standalone document, with computed colours baked in so `currentColor`
// and CSS variables survive outside the app. What you see is what you export.
export type SchemCapture = { svg: string; width: number; height: number };
export type SheetCaptureOptions = {
  includeFrame?: boolean;
  ink?: "asDrawn" | "print";
  /** Restrict the capture to these object ids (the Range = Selection export). */
  onlyIds?: string[];
};

// Computed colours arrive as "rgb(…)" / "rgba(…)" or "color(srgb …)" → [r,g,b,a] in 0–1.
function parseColor(c: string): [number, number, number, number] | null {
  let m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/);
  if (m) return [+m[1] / 255, +m[2] / 255, +m[3] / 255, m[4] === undefined ? 1 : +m[4]];
  m = c.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  return null;
}
const relLum = (c: [number, number, number, number]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const escXml = (t: string) => t.replace(/[<&>]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

export function captureSchematicSvg(opts: SheetCaptureOptions = {}): SchemCapture | null {
  if (typeof document === "undefined") return null;
  const root = document.querySelector(".pcb-app [data-canvas-wrapper]") as HTMLElement | null;
  if (!root) return null;
  const nodes = Array.from(root.querySelectorAll("[data-object-id]")) as (HTMLElement | SVGGraphicsElement)[];
  if (nodes.length === 0) return null;

  // The sheet itself is transparent — the paint comes from an ancestor. Walk up
  // for the first opaque colour, otherwise the baked (theme-coloured) strokes
  // would land on white and vanish.
  const liveBg = (() => {
    let n: HTMLElement | null = root;
    while (n) {
      const c = window.getComputedStyle(n).backgroundColor;
      if (c && !/^rgba\(0,\s*0,\s*0,\s*0\)$|^transparent$/.test(c)) return c;
      n = n.parentElement;
    }
    return "#ffffff";
  })();

  // Print ink maps every colour by its distance from the page tone: surface
  // fills (the tones that matched the sheet) go white, everything else goes
  // near-black — so light and dark themes print the same black-on-white sheet.
  const mapColor = (() => {
    if (opts.ink !== "print") return (v: string) => v;
    const bgLum = (() => { const c = parseColor(liveBg); return c ? relLum(c) : 1; })();
    return (v: string): string => {
      const c = parseColor(v);
      if (!c || c[3] < 0.05) return v;
      return Math.abs(relLum(c) - bgLum) < 0.22 ? "#ffffff" : "#141414";
    };
  })();

  // Bake computed paint onto a clone so the markup is self-contained.
  const bake = (live: Element, clone: Element) => {
    const cs = window.getComputedStyle(live);
    for (const prop of ["fill", "stroke"] as const) {
      const v = cs.getPropertyValue(prop);
      if (v && v !== "none") clone.setAttribute(prop, mapColor(v));
    }
    const lk = Array.from(live.children);
    const ck = Array.from(clone.children);
    for (let i = 0; i < Math.min(lk.length, ck.length); i++) bake(lk[i], ck[i]);
  };

  const rb = root.getBoundingClientRect();
  const only = opts.onlyIds ? new Set(opts.onlyIds) : null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const items: string[] = [];

  // The sheet frame (border, zone labels, title block) is HTML, not placed
  // objects — serialized from the live DOM on the same principle as the object
  // capture: what you see is what you export, no second copy of the geometry.
  // Backgrounds/borders become rects/lines, leaf text becomes <text>, and the
  // one inline <svg> (the logo) is cloned like an object glyph.
  if (opts.includeFrame) {
    const frameRoot = root.querySelector("[data-sheet-frame]") as HTMLElement | null;
    if (frameRoot) {
      const fr = frameRoot.getBoundingClientRect();
      minX = Math.min(minX, fr.left - rb.left);
      minY = Math.min(minY, fr.top - rb.top);
      maxX = Math.max(maxX, fr.right - rb.left);
      maxY = Math.max(maxY, fr.bottom - rb.top);
      const walk = (el: Element) => {
        if (el instanceof SVGSVGElement) {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return;
          const clone = el.cloneNode(true) as SVGSVGElement;
          bake(el, clone);
          clone.setAttribute("x", (r.left - rb.left).toFixed(2));
          clone.setAttribute("y", (r.top - rb.top).toFixed(2));
          clone.setAttribute("width", r.width.toFixed(2));
          clone.setAttribute("height", r.height.toFixed(2));
          items.push(clone.outerHTML);
          return;
        }
        if (!(el instanceof HTMLElement)) return;
        const cs = window.getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 && r.height <= 0) return;
        const x = r.left - rb.left;
        const y = r.top - rb.top;
        const opac = Math.max(0, Math.min(1, parseFloat(cs.opacity) || 1));
        const o = opac < 1 ? ` opacity="${opac.toFixed(2)}"` : "";
        const bgc = parseColor(cs.backgroundColor);
        if (bgc && bgc[3] > 0.02) {
          const rx = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.height / 2);
          items.push(
            `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${r.width.toFixed(2)}" height="${r.height.toFixed(2)}"` +
              ` fill="${mapColor(cs.backgroundColor)}"${rx > 0 ? ` rx="${rx.toFixed(2)}"` : ""}${o}/>`,
          );
        }
        // Partial borders are load-bearing here (corner brackets, separators),
        // so each side is its own line. Radius on a bracket arm is dropped.
        const sides: [string, number, number, number, number][] = [
          ["top", x, y, x + r.width, y],
          ["right", x + r.width, y, x + r.width, y + r.height],
          ["bottom", x, y + r.height, x + r.width, y + r.height],
          ["left", x, y, x, y + r.height],
        ];
        for (const [side, x1, y1, x2, y2] of sides) {
          const bw = parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0;
          const bs = cs.getPropertyValue(`border-${side}-style`);
          const bc = parseColor(cs.getPropertyValue(`border-${side}-color`));
          if (bw > 0.4 && bs !== "none" && bc && bc[3] > 0.02) {
            items.push(
              `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"` +
                ` stroke="${mapColor(cs.getPropertyValue(`border-${side}-color`))}" stroke-width="${bw.toFixed(2)}"${o}/>`,
            );
          }
        }
        let text = "";
        for (const child of Array.from(el.childNodes)) if (child.nodeType === 3) text += child.textContent ?? "";
        text = text.trim();
        if (text && r.width > 0) {
          items.push(
            `<text x="${(x + r.width / 2).toFixed(2)}" y="${(y + r.height * 0.78).toFixed(2)}" text-anchor="middle"` +
              ` font-family="${cs.fontFamily.replace(/"/g, "'")}" font-size="${cs.fontSize}" font-weight="${cs.fontWeight}"` +
              ` fill="${mapColor(cs.color)}"${o}>${escXml(text)}</text>`,
          );
        }
        for (const child of Array.from(el.children)) walk(child);
      };
      walk(frameRoot);
    }
  }

  for (const node of nodes) {
    if (only && !only.has(node.getAttribute("data-object-id") ?? "")) continue;
    const r = node.getBoundingClientRect();
    // A horizontal wire has zero height and a vertical one zero width, so only
    // a node with no extent at all is skipped.
    if (r.width === 0 && r.height === 0) continue;
    const x = r.left - rb.left;
    const y = r.top - rb.top;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + r.width); maxY = Math.max(maxY, y + r.height);

    // Wires / buses / tracks are <line> elements living inside one overlay
    // <svg>, so they carry no inner <svg> of their own. Their screen CTM maps
    // overlay user-space straight into the exported picture, zoom and pan
    // included. The id sits on the transparent pick band, not on the ink — the
    // visible line is its next sibling, so an invisible id-carrier defers to
    // its twin (cloning the band alone exported wires as nothing at all).
    if (node instanceof SVGGraphicsElement && !(node instanceof SVGSVGElement)) {
      const strokeC = parseColor(window.getComputedStyle(node).stroke);
      const sib = node.nextElementSibling;
      const src =
        strokeC && strokeC[3] === 0 && sib instanceof SVGGraphicsElement && !(sib instanceof SVGSVGElement)
          ? sib
          : node;
      const ctm = src.getScreenCTM();
      if (ctm) {
        const clone = src.cloneNode(true) as SVGGraphicsElement;
        bake(src, clone);
        items.push(
          `<g transform="matrix(${ctm.a},${ctm.b},${ctm.c},${ctm.d},${(ctm.e - rb.left).toFixed(2)},${(ctm.f - rb.top).toFixed(2)})">${clone.outerHTML}</g>`,
        );
      }
      continue;
    }

    const liveSvg = node.querySelector("svg");
    if (liveSvg) {
      const clone = liveSvg.cloneNode(true) as SVGSVGElement;
      bake(liveSvg, clone);
      clone.setAttribute("x", x.toFixed(2));
      clone.setAttribute("y", y.toFixed(2));
      clone.setAttribute("width", r.width.toFixed(2));
      clone.setAttribute("height", r.height.toFixed(2));
      items.push(clone.outerHTML);
    }
    // Labels / designators render as plain spans next to the glyph.
    for (const span of Array.from(node.querySelectorAll("span"))) {
      const text = (span.textContent ?? "").trim();
      if (!text) continue;
      const sr = span.getBoundingClientRect();
      if (sr.width === 0) continue;
      const cs = window.getComputedStyle(span);
      items.push(
        `<text x="${(sr.left - rb.left + sr.width / 2).toFixed(2)}" y="${(sr.top - rb.top + sr.height * 0.78).toFixed(2)}"` +
          ` text-anchor="middle" font-family="${cs.fontFamily.replace(/"/g, "'")}" font-size="${cs.fontSize}"` +
          ` font-weight="${cs.fontWeight}" fill="${mapColor(cs.color)}">${escXml(text)}</text>`,
      );
    }
  }
  if (!items.length || minX === Infinity) return null;

  const pad = 24;
  const width = Math.ceil(maxX - minX + pad * 2);
  const height = Math.ceil(maxY - minY + pad * 2);
  const shift = `translate(${(pad - minX).toFixed(2)}, ${(pad - minY).toFixed(2)})`;
  const bg = opts.ink === "print" ? "#ffffff" : liveBg;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${bg}"/><g transform="${shift}">${items.join("")}</g></svg>`;
  return { svg, width, height };
}

/** Raster a captured sheet at `scale`× its on-screen size. */
export function rasterizeToPng(svg: string, width: number, height: number, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no 2d context")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("svg raster failed")); };
    img.src = blobUrl;
  });
}

// ── Sheet PDF ─────────────────────────────────────────────────────────────────
// The sheet capture is an SVG of the live DOM; translating arbitrary SVG into
// PDF vector operators would be a whole renderer, so each sheet is rasterized
// (like the PNG export, at the same `scale`) and embedded as one full-page
// JPEG (DCTDecode). One capture per page — the all-sheets export hands in one
// capture per sheet. Page size follows each sheet's aspect at 96 px → 72 pt.
export function buildSheetPdf(pages: SchemCapture[], scale = 2): Promise<Blob> {
  const rasterOne = (page: SchemCapture) =>
    new Promise<{ jpeg: Uint8Array<ArrayBuffer>; pxW: number; pxH: number; wPt: number; hPt: number }>((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(new Blob([page.svg], { type: "image/svg+xml" }));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(page.width * scale));
        canvas.height = Math.max(1, Math.round(page.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("no 2d context")); return; }
        // JPEG carries no alpha — pre-fill so nothing lands on black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(blobUrl);
        const b64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1] ?? "";
        const bin = atob(b64);
        const jpeg = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i);
        resolve({ jpeg, pxW: canvas.width, pxH: canvas.height, wPt: page.width * 0.75, hPt: page.height * 0.75 });
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("svg raster failed")); };
      img.src = blobUrl;
    });
  return (async () => {
    const rastered = [];
    for (const p of pages) rastered.push(await rasterOne(p));
    return wrapJpegsInPdf(rastered);
  })();
}

// One JPEG per page. All text parts are ASCII, so string length == byte length
// and the xref offsets stay byte-accurate around the binary streams. Object
// layout: 1 Catalog · 2 Pages · then per page k: page 3+3k · contents 4+3k ·
// image 5+3k.
function wrapJpegsInPdf(pages: Array<{ jpeg: Uint8Array<ArrayBuffer>; pxW: number; pxH: number; wPt: number; hPt: number }>): Blob {
  const kids = pages.map((_, k) => `${3 + k * 3} 0 R`).join(" ");
  const objs: (string | Uint8Array<ArrayBuffer>)[][] = [
    ["<</Type/Catalog/Pages 2 0 R>>"],
    [`<</Type/Pages/Kids[${kids}]/Count ${pages.length}>>`],
  ];
  pages.forEach((p, k) => {
    const content = `q ${p.wPt.toFixed(2)} 0 0 ${p.hPt.toFixed(2)} 0 0 cm /Im${k} Do Q`;
    objs.push(
      [`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${p.wPt.toFixed(2)} ${p.hPt.toFixed(2)}]/Contents ${4 + k * 3} 0 R/Resources<</ProcSet[/PDF/ImageC]/XObject<</Im${k} ${5 + k * 3} 0 R>>>>>>`],
      [`<</Length ${content.length}>>\nstream\n${content}\nendstream`],
      [
        `<</Type/XObject/Subtype/Image/Width ${p.pxW}/Height ${p.pxH}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${p.jpeg.length}>>\nstream\n`,
        p.jpeg,
        "\nendstream",
      ],
    );
  });
  const parts: (string | Uint8Array<ArrayBuffer>)[] = ["%PDF-1.4\n"];
  let total = "%PDF-1.4\n".length;
  const push = (p: string | Uint8Array<ArrayBuffer>) => { parts.push(p); total += p.length; };
  const offsets: number[] = [];
  objs.forEach((chunks, i) => {
    offsets.push(total);
    push(`${i + 1} 0 obj\n`);
    for (const ch of chunks) push(ch);
    push("\nendobj\n");
  });
  const xrefStart = total;
  let tail = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) tail += String(o).padStart(10, "0") + " 00000 n \n";
  tail += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  push(tail);
  return new Blob(parts, { type: "application/pdf" });
}
