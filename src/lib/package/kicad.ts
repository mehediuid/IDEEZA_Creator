// Import — KiCad file parsing.
//
// `.kicad_sym` and `.kicad_mod` are both S-expressions, so one small reader
// serves both and each file gets its own mapper into the package model. The
// parse is deliberately tolerant: a library file carries far more than this
// flow models (alternates, custom pad primitives, zones), and anything not
// understood is skipped rather than failing the whole import — the result
// screen then reports honestly what did and didn't come through.
//
// Only the geometry this flow can actually edit is imported. A `.step` body is
// a CAD kernel problem, so it is recorded but not tessellated (see the spec's
// own design note 03).

import {
  type FpObj,
  type FpPad,
  type PadShape,
  type PinType,
  type SymObj,
  newId,
} from "./types";

// ── S-expression reader ─────────────────────────────────────────────────────
export type Sx = string | Sx[];

export function parseSx(src: string): Sx[] {
  const out: Sx[] = [];
  const stack: Sx[][] = [out];
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    if (c === "(") {
      const node: Sx[] = [];
      stack[stack.length - 1].push(node);
      stack.push(node);
      i += 1;
    } else if (c === ")") {
      if (stack.length > 1) stack.pop();
      i += 1;
    } else if (c === '"') {
      let s = "";
      i += 1;
      while (i < n && src[i] !== '"') {
        if (src[i] === "\\" && i + 1 < n) {
          i += 1;
          s += src[i] === "n" ? "\n" : src[i];
        } else s += src[i];
        i += 1;
      }
      i += 1;
      stack[stack.length - 1].push(s);
    } else if (/\s/.test(c)) {
      i += 1;
    } else {
      let s = "";
      while (i < n && !/[\s()]/.test(src[i])) {
        s += src[i];
        i += 1;
      }
      stack[stack.length - 1].push(s);
    }
  }
  return out;
}

const isList = (x: Sx): x is Sx[] => Array.isArray(x);
const head = (x: Sx): string => (isList(x) ? (typeof x[0] === "string" ? x[0] : "") : x);
const kids = (x: Sx): Sx[] => (isList(x) ? x.slice(1) : []);

/** Every descendant list whose head matches `name`. */
function findAll(node: Sx, name: string, out: Sx[][] = []): Sx[][] {
  if (!isList(node)) return out;
  if (head(node) === name) out.push(node);
  for (const k of kids(node)) findAll(k, name, out);
  return out;
}

const firstOf = (node: Sx, name: string): Sx[] | undefined => findAll(node, name)[0];
const numAt = (node: Sx[] | undefined, i: number, fb = 0): number => {
  if (!node) return fb;
  const v = node[i];
  const n = typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fb;
};
/** A direct child value, e.g. (name "VCC" …) → "VCC". */
function childValue(node: Sx, name: string): string | undefined {
  if (!isList(node)) return undefined;
  for (const k of kids(node)) {
    if (isList(k) && head(k) === name && typeof k[1] === "string") return k[1];
  }
  return undefined;
}

// ── .kicad_sym → symbol ─────────────────────────────────────────────────────
const PIN_TYPE_MAP: Record<string, PinType> = {
  passive: "Passive",
  input: "Input",
  output: "Output",
  bidirectional: "Bidirectional",
  power_in: "Power In",
  power_out: "Power Out",
  open_collector: "Open Collector",
  open_emitter: "Open Collector",
  tri_state: "Tri-State",
  unspecified: "Unspecified",
  no_connect: "Unspecified",
  free: "Unspecified",
};

/** KiCad symbol geometry is millimetres with Y up; the symbol canvas is
 *  abstract units with Y down, so mm are scaled up to a readable size and the
 *  Y axis is flipped. */
const SYM_SCALE = 10;

export type SymImport = {
  name: string | null;
  prefix: string | null;
  value: string | null;
  objects: SymObj[];
  pins: number;
  /** Constructs present in the file that this flow doesn't model. */
  skipped: string[];
};

export function parseKicadSym(src: string): SymImport {
  const forms = parseSx(src);
  const root = forms.find((f) => head(f) === "kicad_symbol_lib") ?? forms[0] ?? [];
  const symbols = findAll(root, "symbol");
  const top = symbols[0];
  const skipped: string[] = [];

  if (!top) return { name: null, prefix: null, value: null, objects: [], pins: 0, skipped: ["no symbol block found"] };

  const name = typeof top[1] === "string" ? top[1] : null;
  let prefix: string | null = null;
  let value: string | null = null;
  for (const prop of findAll(top, "property")) {
    const key = typeof prop[1] === "string" ? prop[1] : "";
    const val = typeof prop[2] === "string" ? prop[2] : "";
    if (key === "Reference") prefix = val.replace(/[^A-Za-z]/g, "") || val;
    if (key === "Value") value = val;
  }

  // Collect from every unit block — a multi-unit symbol is flattened, which is
  // stated on the result screen rather than silently dropping units.
  const pinNodes = findAll(top, "pin");
  const objects: SymObj[] = [];
  const xs: number[] = [];
  const ys: number[] = [];

  for (const pin of pinNodes) {
    const at = firstOf(pin, "at");
    const x = numAt(at, 1) * SYM_SCALE;
    const y = -numAt(at, 2) * SYM_SCALE;
    const angle = ((numAt(at, 3) % 360) + 360) % 360;
    const len = numAt(firstOf(pin, "length"), 1, 2.54) * SYM_SCALE;
    const nm = childValue(pin, "name") ?? "";
    const numTxt = childValue(pin, "number") ?? "";
    const num = parseInt(numTxt.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(num) || num <= 0) {
      skipped.push(`pin "${numTxt || nm}" has no numeric number`);
      continue;
    }
    const etype = PIN_TYPE_MAP[String(pin[1] ?? "").toLowerCase()] ?? "Unspecified";
    // KiCad's pin angle points from the pin's end back toward the body; the
    // canvas models the lead direction, which is the same axis.
    const canvasAngle = angle === 0 ? 0 : angle === 90 ? 270 : angle === 180 ? 180 : 90;
    objects.push({
      id: newId("ipin"),
      kind: "pin",
      num,
      name: nm || `Pin${num}`,
      etype,
      length: Math.max(6, Math.round(len)),
      angle: canvasAngle,
      x,
      y,
    });
    xs.push(x);
    ys.push(y);
  }

  for (const r of findAll(top, "rectangle")) {
    const s = firstOf(r, "start");
    const e = firstOf(r, "end");
    const x1 = numAt(s, 1) * SYM_SCALE;
    const y1 = -numAt(s, 2) * SYM_SCALE;
    const x2 = numAt(e, 1) * SYM_SCALE;
    const y2 = -numAt(e, 2) * SYM_SCALE;
    objects.push({ id: newId("irect"), kind: "rect", x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
    xs.push(x1, x2);
    ys.push(y1, y2);
  }

  for (const c of findAll(top, "circle")) {
    const ctr = firstOf(c, "center");
    const x = numAt(ctr, 1) * SYM_SCALE;
    const y = -numAt(ctr, 2) * SYM_SCALE;
    const r = numAt(firstOf(c, "radius"), 1, 1) * SYM_SCALE;
    objects.push({ id: newId("icir"), kind: "circle", x, y, r });
    xs.push(x - r, x + r);
    ys.push(y - r, y + r);
  }

  for (const pl of findAll(top, "polyline")) {
    const ptsNode = firstOf(pl, "pts");
    const pts = ptsNode
      ? findAll(ptsNode, "xy").map((xy) => ({ x: numAt(xy, 1) * SYM_SCALE, y: -numAt(xy, 2) * SYM_SCALE }))
      : [];
    if (pts.length >= 2) {
      objects.push({ id: newId("ipl"), kind: "polyline", points: pts });
      pts.forEach((p) => {
        xs.push(p.x);
        ys.push(p.y);
      });
    }
  }

  if (findAll(top, "arc").length) skipped.push("symbol arcs (not imported)");
  if (findAll(top, "text").length) skipped.push("symbol free text (not imported)");
  if (symbols.length > 2) skipped.push(`${symbols.length - 1} unit blocks flattened into one symbol`);

  // Centre the imported artwork on the canvas the editor actually shows.
  if (xs.length) {
    const dx = 410 - (Math.min(...xs) + Math.max(...xs)) / 2;
    const dy = 235 - (Math.min(...ys) + Math.max(...ys)) / 2;
    for (const o of objects) shiftSym(o, dx, dy);
  }

  return { name, prefix, value, objects, pins: objects.filter((o) => o.kind === "pin").length, skipped };
}

function shiftSym(o: SymObj, dx: number, dy: number): void {
  if (o.kind === "polyline" || o.kind === "bezier") {
    o.points = o.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  } else if (o.kind === "line" || o.kind === "arc") {
    o.x1 += dx;
    o.y1 += dy;
    o.x2 += dx;
    o.y2 += dy;
  } else {
    o.x += dx;
    o.y += dy;
  }
}

// ── .kicad_mod → footprint ──────────────────────────────────────────────────
function padShape(type: string, shape: string): PadShape {
  const tht = type === "thru_hole" || type === "np_thru_hole";
  if (tht) return shape === "oval" ? "THT oval" : "THT round";
  if (shape === "circle") return "SMD round";
  return "SMD rect";
}

export type FpImport = {
  name: string | null;
  mounting: "SMD" | "THT" | null;
  objects: FpObj[];
  pads: number;
  mounting_holes: number;
  skipped: string[];
};

export function parseKicadMod(src: string): FpImport {
  const forms = parseSx(src);
  const root = forms.find((f) => head(f) === "footprint" || head(f) === "module") ?? forms[0];
  const skipped: string[] = [];
  if (!root) return { name: null, mounting: null, objects: [], pads: 0, mounting_holes: 0, skipped: ["no footprint block found"] };

  const name = typeof root[1] === "string" ? root[1] : null;
  const attr = firstOf(root, "attr");
  const attrTxt = attr ? attr.slice(1).map(String).join(" ") : "";

  const objects: FpObj[] = [];
  // Only *electrical* through-hole pads say anything about how the part mounts:
  // an SMD part with a mounting hole is still an SMD part.
  let electricalTht = 0;
  let mech = 0;

  for (const p of findAll(root, "pad")) {
    const numTxt = typeof p[1] === "string" ? p[1] : "";
    const type = String(p[2] ?? "");
    const shape = String(p[3] ?? "");
    const at = firstOf(p, "at");
    const size = firstOf(p, "size");
    const drillNode = firstOf(p, "drill");
    const num = parseInt(numTxt.replace(/[^0-9]/g, ""), 10);
    const isMech = type === "np_thru_hole" || !Number.isFinite(num) || num <= 0;
    const sh = padShape(type, shape);
    if (isMech) mech += 1;
    else if (sh.startsWith("THT")) electricalTht += 1;
    const pad: FpPad = {
      id: newId("ipad"),
      kind: "pad",
      padKind: isMech ? "Mounting" : "Pad",
      shape: sh,
      w: Math.max(0.05, numAt(size, 1, 1)),
      h: Math.max(0.05, numAt(size, 2, 1)),
      drill: sh.startsWith("THT") ? Math.max(0.05, numAt(drillNode, 1, 0.9)) : undefined,
      x: numAt(at, 1),
      y: numAt(at, 2),
      pin: isMech ? null : num,
    };
    objects.push(pad);
  }

  const layerOf = (node: Sx): "Top Silkscreen" | "Bottom Silkscreen" | "Top Paste Mask" | "Bottom Paste Mask" => {
    const l = childValue(node, "layer") ?? "";
    if (l.startsWith("B.Silk")) return "Bottom Silkscreen";
    if (l.startsWith("F.Paste")) return "Top Paste Mask";
    if (l.startsWith("B.Paste")) return "Bottom Paste Mask";
    return "Top Silkscreen";
  };

  for (const l of findAll(root, "fp_line")) {
    const s = firstOf(l, "start");
    const e = firstOf(l, "end");
    objects.push({ id: newId("ifl"), kind: "line", layer: layerOf(l), x1: numAt(s, 1), y1: numAt(s, 2), x2: numAt(e, 1), y2: numAt(e, 2) });
  }
  for (const c of findAll(root, "fp_circle")) {
    const ctr = firstOf(c, "center");
    const end = firstOf(c, "end");
    const cx = numAt(ctr, 1);
    const cy = numAt(ctr, 2);
    objects.push({ id: newId("ifc"), kind: "circle", layer: layerOf(c), x: cx, y: cy, r: Math.max(0.05, Math.hypot(numAt(end, 1) - cx, numAt(end, 2) - cy)) });
  }
  for (const r of findAll(root, "fp_rect")) {
    const s = firstOf(r, "start");
    const e = firstOf(r, "end");
    const x1 = numAt(s, 1);
    const y1 = numAt(s, 2);
    const x2 = numAt(e, 1);
    const y2 = numAt(e, 2);
    objects.push({ id: newId("ifr"), kind: "rect", layer: layerOf(r), x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) });
  }
  for (const pl of findAll(root, "fp_poly")) {
    const ptsNode = firstOf(pl, "pts");
    const pts = ptsNode ? findAll(ptsNode, "xy").map((xy) => ({ x: numAt(xy, 1), y: numAt(xy, 2) })) : [];
    if (pts.length >= 2) objects.push({ id: newId("ifp"), kind: "polyline", layer: layerOf(pl), points: pts });
  }

  // Reference/value text is re-created from the header fields instead of
  // importing KiCad's own placeholders, which carry `REF**` / `VAL**`.
  for (const t of findAll(root, "fp_text")) {
    const kindTxt = String(t[1] ?? "");
    if (kindTxt === "reference" || kindTxt === "value") {
      const at = firstOf(t, "at");
      objects.push({
        id: newId("ift"),
        kind: "text",
        layer: layerOf(t),
        x: numAt(at, 1),
        y: numAt(at, 2),
        textKind: kindTxt === "reference" ? "Designator" : "Value",
        content: "",
        size: 0.8,
      });
    }
  }

  if (findAll(root, "fp_arc").length) skipped.push("footprint arcs (not imported)");
  if (findAll(root, "zone").length) skipped.push("zones (out of scope for a part)");
  if (findAll(root, "model").length) skipped.push("3D model reference (attach a STEP file instead)");
  if (findAll(root, "primitives").length) skipped.push("custom pad primitives (imported as their bounding pad)");

  const pads = objects.filter((o): o is FpPad => o.kind === "pad").length;
  // The footprint's own attr is the author's statement, so it wins; the pads
  // are only consulted when the file does not say.
  const mounting: "SMD" | "THT" | null = /through_hole/.test(attrTxt)
    ? "THT"
    : /smd/.test(attrTxt)
      ? "SMD"
      : electricalTht > 0
        ? "THT"
        : pads > 0
          ? "SMD"
          : null;

  return { name, mounting, objects, pads, mounting_holes: mech, skipped };
}

// ── .step ───────────────────────────────────────────────────────────────────
export type StepImport = { name: string; solids: number; recognised: boolean };

/** A STEP file needs a CAD kernel to tessellate, which this app does not carry
 *  (the spec's design note 03 says the same about the viewer). The header is
 *  read so the import can confirm it really is a STEP file and say how many
 *  solids it declares; the body is still placed as a box on the 3D step. */
export function parseStepHeader(src: string, fileName: string): StepImport {
  const recognised = /ISO-10303-21/.test(src.slice(0, 4000));
  const solids = (src.match(/MANIFOLD_SOLID_BREP/g) || []).length;
  return { name: fileName, solids, recognised };
}
