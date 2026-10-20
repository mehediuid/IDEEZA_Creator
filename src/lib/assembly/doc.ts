// The stored assembly document: read defensively (a hand-edited or older
// value never crashes the editor), written as plain JSON. The key is
// editor-scope's "assembly" document — the one that held the old parts
// checklist; a checklist (a map of part id → ticked) reads as an empty
// assembly, and the first save replaces it (D4: the checklist is gone).
// Pure; relative imports only.

import type { Pose, Quat, Vec3 } from "./math";
import {
  DEFAULT_CLEARANCE_MM,
  emptyAsmDoc,
  type AsmDoc,
  type AsmSummary,
  type InstanceRec,
  type MateRec,
  type MateType,
  type PartSource,
  type PatternRec,
  type WirePoint,
  type WireRec,
} from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

function vec3(v: unknown): Vec3 | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  return v.every((x) => typeof x === "number" && Number.isFinite(x)) ? [v[0], v[1], v[2]] : null;
}
function quat(v: unknown): Quat | null {
  if (!Array.isArray(v) || v.length !== 4 || !v.every((x) => typeof x === "number" && Number.isFinite(x))) return null;
  const l = Math.hypot(v[0], v[1], v[2], v[3]);
  return l > 1e-9 ? [v[0] / l, v[1] / l, v[2] / l, v[3] / l] : null;
}
function pose(v: unknown): Pose | undefined {
  if (!isRecord(v)) return undefined;
  const p = vec3(v.p), q = quat(v.q);
  return p && q ? { p, q } : undefined;
}

const SOURCES: readonly PartSource[] = ["pcb", "three", "library", "ai"];
const MATES: readonly MateType[] = ["flush", "concentric", "distance", "lock", "parallel", "perpendicular", "angle", "tangent"];

function instance(v: unknown): InstanceRec | null {
  if (!isRecord(v)) return null;
  const id = str(v.id), ref = str(v.ref);
  const source = SOURCES.find((s) => s === v.source);
  if (!id || !ref || !source) return null;
  const out: InstanceRec = { id, source, ref };
  const label = str(v.label);
  if (label) out.label = label;
  const p = pose(v.pose);
  if (p) out.pose = p;
  if (v.grounded === true) out.grounded = true;
  if (v.hidden === true) out.hidden = true;
  if (v.placed === true) out.placed = true;
  return out;
}

function mate(v: unknown): MateRec | null {
  if (!isRecord(v) || !isRecord(v.a) || !isRecord(v.b)) return null;
  const id = str(v.id), name = str(v.name);
  const type = MATES.find((t) => t === v.type);
  const a = { inst: str(v.a.inst), feature: str(v.a.feature) };
  const b = { inst: str(v.b.inst), feature: str(v.b.feature) };
  if (!id || !name || !type || !a.inst || !a.feature || !b.inst || !b.feature) return null;
  const out: MateRec = { id, name, type, a: { inst: a.inst, feature: a.feature }, b: { inst: b.inst, feature: b.feature } };
  if (typeof v.offset === "number" && Number.isFinite(v.offset)) out.offset = v.offset;
  if (typeof v.angle === "number" && Number.isFinite(v.angle)) out.angle = v.angle;
  if (v.flip === true) out.flip = true;
  if (v.suppressed === true) out.suppressed = true;
  const rel = pose(v.rel);
  if (rel) out.rel = rel;
  return out;
}

function wirePoint(v: unknown): WirePoint | null {
  if (!isRecord(v)) return null;
  const local = vec3(v.local);
  if (!local) return null;
  return { inst: str(v.inst), local };
}

function wire(v: unknown): WireRec | null {
  if (!isRecord(v) || !isRecord(v.from) || !isRecord(v.to)) return null;
  const id = str(v.id), name = str(v.name);
  const from = { inst: str(v.from.inst), pin: str(v.from.pin) };
  const to = { inst: str(v.to.inst), pin: str(v.to.pin) };
  if (!id || !name || !from.inst || !from.pin || !to.inst || !to.pin) return null;
  const points = Array.isArray(v.points) ? v.points.map(wirePoint).filter((p): p is WirePoint => p !== null) : [];
  const out: WireRec = {
    id,
    name,
    from: { inst: from.inst, pin: from.pin },
    to: { inst: to.inst, pin: to.pin },
    gauge: Math.round(Math.min(30, Math.max(16, num(v.gauge, 22)))),
    color: str(v.color) ?? "#dc2626",
    sleeveMm: Math.min(3, Math.max(0, num(v.sleeveMm, 0.5))),
    slackPct: Math.min(100, Math.max(0, num(v.slackPct, 10))),
    points,
  };
  if (v.straight === true) out.straight = true;
  return out;
}

function pattern(v: unknown): PatternRec | null {
  if (!isRecord(v)) return null;
  const id = str(v.id), seed = str(v.seed);
  if (!id || !seed) return null;
  const count = Math.round(Math.min(50, Math.max(2, num(v.count, 2))));
  if (v.kind === "linear") {
    const axis = vec3(v.axis);
    return axis ? { id, kind: "linear", seed, count, spacing: num(v.spacing, 10), axis } : null;
  }
  if (v.kind === "circular") {
    const axis = vec3(v.axis), center = vec3(v.center);
    return axis && center ? { id, kind: "circular", seed, count, angle: num(v.angle, 360), axis, center } : null;
  }
  if (v.kind === "mirror") {
    const normal = vec3(v.normal), point = vec3(v.point);
    return normal && point ? { id, kind: "mirror", seed, normal, point } : null;
  }
  return null;
}

function summary(v: unknown): AsmSummary | undefined {
  if (!isRecord(v)) return undefined;
  return {
    parts: num(v.parts, 0),
    placed: num(v.placed, 0),
    problems: num(v.problems, 0),
    warnings: num(v.warnings, 0),
    wires: num(v.wires, 0),
    at: num(v.at, 0),
  };
}

/** The stored value, as a document. Anything that isn't a v1 assembly — the
 *  old checklist, garbage, nothing — is an empty assembly. */
export function parseAsmDoc(raw: string | null): AsmDoc {
  if (raw === null) return emptyAsmDoc();
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return emptyAsmDoc();
  }
  if (!isRecord(v) || v.v !== 1) return emptyAsmDoc();
  const list = <T>(x: unknown, f: (y: unknown) => T | null): T[] => (Array.isArray(x) ? x.map(f).filter((y): y is T => y !== null) : []);
  const instances = list(v.instances, instance);
  const ids = new Set(instances.map((i) => i.id));
  const doc: AsmDoc = {
    v: 1,
    mode: v.mode === "wiring" ? "wiring" : "assembly",
    brought: v.brought === true,
    instances: instances.filter((i, k) => instances.findIndex((j) => j.id === i.id) === k),
    mates: list(v.mates, mate),
    wires: list(v.wires, wire),
    patterns: list(v.patterns, pattern).filter((p) => ids.has(p.seed)),
    clearanceMm: Math.min(20, Math.max(0, num(v.clearanceMm, DEFAULT_CLEARANCE_MM))),
  };
  if (v.oldWiringSeen === true) doc.oldWiringSeen = true;
  const s = summary(v.summary);
  if (s) doc.summary = s;
  return doc;
}

export const serializeAsmDoc = (doc: AsmDoc): string => JSON.stringify(doc);

/** True when the stored value is a v1 assembly the maker has started. */
export function isAsmDocStarted(raw: string | null): boolean {
  const doc = parseAsmDoc(raw);
  return doc.brought || doc.instances.length > 0;
}

/** The next id with this prefix that the list doesn't use: "m1", "m2", … */
export function nextId(prefix: string, used: Iterable<string>): string {
  const taken = new Set(used);
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** "Concentric1", "Flush2": a mate's name, numbered within its type. */
export function mateName(type: MateType, mates: readonly MateRec[]): string {
  const base = type.charAt(0).toUpperCase() + type.slice(1);
  let n = 1;
  while (mates.some((m) => m.name === `${base}${n}`)) n++;
  return `${base}${n}`;
}

/** "Wiring1", "Wiring2": as production names them (CAD-309). */
export function wireName(wires: readonly WireRec[]): string {
  let n = 1;
  while (wires.some((w) => w.name === `Wiring${n}`)) n++;
  return `Wiring${n}`;
}
