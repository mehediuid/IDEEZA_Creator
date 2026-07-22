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
export interface ExportModel {
  boardWmm: number;
  boardHmm: number;
  thicknessMm: number;
  comps: ExportComp[];
  tracks: ExportSeg[];
  pads: ExportPad[];
  vias: ExportVia[];
}

// Build a unit-normalised (mm) model of the live board, origin at the board's
// top-left corner. Y is screen-down here; Y-up formats flip via (boardH - y).
export function collectPcbModel(state: PcbState): ExportModel {
  const W = state.pcbBoard?.width && state.pcbBoard.width > 0 ? state.pcbBoard.width : 720;
  const H = state.pcbBoard?.height && state.pcbBoard.height > 0 ? state.pcbBoard.height : 480;
  const mm = (px: number) => px / PX_PER_MM;
  const rx = (x: number) => mm((x ?? 0) - BOARD_X0);
  const ry = (y: number) => mm((y ?? 0) - BOARD_Y0);

  const thicknessMm =
    (state.threeD?.layers ?? []).reduce((a, l) => a + (parseFloat(l.thickness) || 0), 0) || 1.6;

  const objs: CanvasObject[] = (state.objects ?? []).filter((o) => (o.scope ?? "schematic") === "pcb");

  const comps: ExportComp[] = [];
  const tracks: ExportSeg[] = [];
  const pads: ExportPad[] = [];
  const vias: ExportVia[] = [];

  for (const o of objs) {
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
  return { boardWmm: mm(W), boardHmm: mm(H), thicknessMm, comps, tracks, pads, vias };
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
export function buildDxf(m: ExportModel): string {
  const yf = (y: number) => m.boardHmm - y; // DXF is Y-up
  const out: string[] = ["0", "SECTION", "2", "ENTITIES"];
  const line = (x1: number, y1: number, x2: number, y2: number, layer: string) =>
    out.push("0", "LINE", "8", layer, "10", x1.toFixed(4), "20", yf(y1).toFixed(4), "11", x2.toFixed(4), "21", yf(y2).toFixed(4));
  const circle = (cx: number, cy: number, r: number, layer: string) =>
    out.push("0", "CIRCLE", "8", layer, "10", cx.toFixed(4), "20", yf(cy).toFixed(4), "40", r.toFixed(4));
  // board outline
  line(0, 0, m.boardWmm, 0, "OUTLINE");
  line(m.boardWmm, 0, m.boardWmm, m.boardHmm, "OUTLINE");
  line(m.boardWmm, m.boardHmm, 0, m.boardHmm, "OUTLINE");
  line(0, m.boardHmm, 0, 0, "OUTLINE");
  for (const t of m.tracks) line(t.x1, t.y1, t.x2, t.y2, t.layer === "bottom" ? "BOTTOM" : "TOP");
  for (const p of m.pads) circle(p.x, p.y, Math.max(p.w, p.h) / 2, "PADS");
  for (const v of m.vias) { circle(v.x, v.y, v.outer / 2, "VIAS"); circle(v.x, v.y, v.hole / 2, "DRILL"); }
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n");
}

// ── SVG ───────────────────────────────────────────────────────────────────────
export function buildSvg(m: ExportModel): string {
  const pad = 4;
  const W = (m.boardWmm + pad * 2).toFixed(2);
  const Ht = (m.boardHmm + pad * 2).toFixed(2);
  const parts: string[] = [];
  parts.push(`<rect x="${pad}" y="${pad}" width="${m.boardWmm}" height="${m.boardHmm}" fill="#0d3b24" stroke="#c9c9c9" stroke-width="0.15"/>`);
  for (const t of m.tracks) {
    const col = t.layer === "bottom" ? "#3b7dd8" : "#d05a5a";
    parts.push(`<line x1="${(t.x1 + pad).toFixed(3)}" y1="${(t.y1 + pad).toFixed(3)}" x2="${(t.x2 + pad).toFixed(3)}" y2="${(t.y2 + pad).toFixed(3)}" stroke="${col}" stroke-width="${Math.max(0.1, t.width).toFixed(3)}" stroke-linecap="round"/>`);
  }
  for (const p of m.pads) parts.push(`<rect x="${(p.x - p.w / 2 + pad).toFixed(3)}" y="${(p.y - p.h / 2 + pad).toFixed(3)}" width="${p.w}" height="${p.h}" fill="#e0b24a"/>`);
  for (const v of m.vias) { parts.push(`<circle cx="${(v.x + pad).toFixed(3)}" cy="${(v.y + pad).toFixed(3)}" r="${(v.outer / 2).toFixed(3)}" fill="#c9902f"/>`); parts.push(`<circle cx="${(v.x + pad).toFixed(3)}" cy="${(v.y + pad).toFixed(3)}" r="${(v.hole / 2).toFixed(3)}" fill="#141414"/>`); }
  for (const c of m.comps) parts.push(`<rect x="${(c.xmm - c.wmm / 2 + pad).toFixed(3)}" y="${(c.ymm - c.dmm / 2 + pad).toFixed(3)}" width="${c.wmm}" height="${c.dmm}" fill="none" stroke="#e6e6e6" stroke-width="0.12"/>`);
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
export function buildPdf(m: ExportModel): Blob {
  const S = 2.834645; // pt per mm
  const margin = 20;
  const wPt = m.boardWmm * S + margin * 2;
  const hPt = m.boardHmm * S + margin * 2;
  const X = (x: number) => (margin + x * S).toFixed(2);
  const Y = (y: number) => (margin + (m.boardHmm - y) * S).toFixed(2); // flip to Y-up
  let c = "0.6 w\n0.15 0.15 0.15 RG\n";
  c += `${margin} ${margin} ${(m.boardWmm * S).toFixed(2)} ${(m.boardHmm * S).toFixed(2)} re S\n`;
  for (const t of m.tracks) {
    const col = t.layer === "bottom" ? "0.23 0.49 0.85" : "0.82 0.35 0.35";
    c += `${col} RG\n${Math.max(0.4, t.width * S).toFixed(2)} w\n${X(t.x1)} ${Y(t.y1)} m ${X(t.x2)} ${Y(t.y2)} l S\n`;
  }
  c += "0.88 0.70 0.29 rg\n";
  for (const p of m.pads) c += `${X(p.x - p.w / 2)} ${Y(p.y + p.h / 2)} ${(p.w * S).toFixed(2)} ${(p.h * S).toFixed(2)} re f\n`;

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
