// One assembly, composed: the document's instances matched to the parts they
// stand for (live from the PCB, the 3D Module and the library), placed by
// the solver, copied by their patterns, and checked (F14–F17). The editor,
// Product Preview and the product page's summary all read this, so the three
// can't disagree. Pure; relative imports only.

import { fitCheck, worldAabbOf, type FitIssue, type FitResult } from "./fit";
import { libraryPart } from "./library";
import { aabbOf, add, apply, applyDir, axisAngle, dot, qmul, qnorm, rotate, scale, sub, type Aabb, type Pose, type Vec3 } from "./math";
import { solveAssembly, type MateStatus } from "./solve";
import type { AsmDoc, AsmPart, AsmSummary, InstanceRec, PatternRec } from "./types";

export type Sources = {
  /** The PCB, when the product has a board; null when PCB Design is empty. */
  pcb: AsmPart | null;
  three: readonly AsmPart[];
  /** The 3D Module's AI model, as an approximate part (F40). */
  ai?: AsmPart | null;
};

export type SceneItem = {
  rec: InstanceRec;
  part: AsmPart;
  pose: Pose;
  /** Fit checks it: grounded, snapped, moved, or a 3D shape at its designed place. */
  placed: boolean;
  /** A pattern copy: the pattern's id. Copies can't be moved on their own. */
  copyOf?: string;
};

export type HoleCheck = { holes: number; onBosses: number; worst: number } | null;
export type OpeningCheck = Array<{ port: string; inst: string; ok: boolean; margin: number; opening: string | null }>;

export type AsmScene = {
  items: SceneItem[];
  /** Instances whose part is gone from its editor (deleted, hidden). */
  missing: InstanceRec[];
  mates: Map<string, MateStatus>;
  freedom: Map<string, number>;
  fit: FitResult;
  holes: HoleCheck;
  openings: OpeningCheck;
  /** The lid against the tallest part: negative = the lid can't close by that much. */
  lid: { gap: number; part: string } | null;
};

export function partFor(rec: InstanceRec, sources: Sources): AsmPart | null {
  switch (rec.source) {
    case "pcb":
      return sources.pcb;
    case "three":
      return sources.three.find((p) => p.ref === rec.ref) ?? null;
    case "library":
      return libraryPart(rec.id, rec.ref, rec.label);
    case "ai":
      return sources.ai ?? null;
  }
}

/** Pattern copies of a seed at its solved pose. */
function patternPoses(p: PatternRec, seed: Pose): Pose[] {
  switch (p.kind) {
    case "linear": {
      const axis = p.axis;
      return Array.from({ length: p.count - 1 }, (_, k) => ({ p: add(seed.p, scale(axis, p.spacing * (k + 1))), q: seed.q }));
    }
    case "circular": {
      const step = ((p.angle >= 360 ? 360 / p.count : p.angle / Math.max(1, p.count - 1)) * Math.PI) / 180;
      return Array.from({ length: p.count - 1 }, (_, k) => {
        const q = axisAngle(p.axis, step * (k + 1));
        return { p: add(rotate(q, sub(seed.p, p.center)), p.center), q: qnorm(qmul(q, seed.q)) };
      });
    }
    case "mirror": {
      // Reflected through the plane; turned half a turn about the plane's
      // normal, which is the mirror image of a part symmetric across it.
      const n = p.normal;
      const d = dot(sub(seed.p, p.point), n);
      const q = axisAngle(n, Math.PI);
      return [{ p: sub(seed.p, scale(n, 2 * d)), q: qnorm(qmul(q, seed.q)) }];
    }
  }
}

export const patternCopyId = (patternId: string, k: number) => `${patternId}#${k + 1}`;

function holeCheck(items: SceneItem[]): HoleCheck {
  const pcb = items.find((i) => i.part.source === "pcb" && i.placed);
  const base = items.find((i) => i.part.enclosure?.role === "base" && i.placed);
  if (!pcb || !base) return null;
  const holes = pcb.part.features.filter((f) => f.kind === "axis" && f.id.startsWith("hole:")).map((f) => apply(pcb.pose, f.point));
  const bosses = base.part.features.filter((f) => f.id.startsWith("axis:boss:")).map((f) => apply(base.pose, f.point));
  if (!holes.length || !bosses.length) return { holes: holes.length, onBosses: 0, worst: 0 };
  const up = applyDir(base.pose, [0, 1, 0]);
  const flat = (v: Vec3) => sub(v, scale(up, dot(v, up)));
  let on = 0, worst = 0;
  for (const h of holes) {
    const d = Math.min(...bosses.map((b) => Math.hypot(...flat(sub(h, b)))));
    if (d <= 0.5) {
      on++;
      worst = Math.max(worst, d);
    }
  }
  return { holes: holes.length, onBosses: on, worst: Math.round(worst * 100) / 100 };
}

function openingCheck(items: SceneItem[]): OpeningCheck {
  const bases = items.filter((i) => i.part.enclosure?.role === "base" && i.placed);
  const openings = bases.flatMap((b) =>
    b.part.enclosure!.openings.map((o) => {
      const normal: Vec3 = o.side === "+x" ? [1, 0, 0] : o.side === "-x" ? [-1, 0, 0] : o.side === "+z" ? [0, 0, 1] : [0, 0, -1];
      const along: Vec3 = o.side === "+x" || o.side === "-x" ? [0, 0, 1] : [1, 0, 0];
      return {
        id: o.id,
        center: apply(b.pose, o.center),
        normal: applyDir(b.pose, normal),
        along: applyDir(b.pose, along),
        up: applyDir(b.pose, [0, 1, 0]),
        size: o.size,
      };
    }),
  );
  const out: OpeningCheck = [];
  for (const item of items) {
    if (!item.placed || !item.part.ports?.length) continue;
    for (const port of item.part.ports) {
      const c = apply(item.pose, port.center);
      const dir = applyDir(item.pose, port.dir);
      let best: { id: string; margin: number } | null = null;
      for (const o of openings) {
        if (dot(dir, o.normal) < 0.9) continue;
        const rel = sub(c, o.center);
        const du = Math.abs(dot(rel, o.along)), dv = Math.abs(dot(rel, o.up));
        const margin = Math.min(o.size[0] / 2 - (du + port.size[0] / 2), o.size[1] / 2 - (dv + port.size[1] / 2));
        if (!best || margin > best.margin) best = { id: o.id, margin };
      }
      out.push({
        port: port.label,
        inst: item.rec.id,
        ok: !!best && best.margin >= 0,
        margin: best ? Math.round(best.margin * 100) / 100 : 0,
        opening: best?.id ?? null,
      });
    }
  }
  return out;
}

function lidCheck(items: SceneItem[], fit: FitResult): AsmScene["lid"] {
  const lid = items.find((i) => i.part.enclosure?.role === "lid" && i.placed);
  if (!lid) return null;
  const hit = fit.problems.find((p) => p.kind === "overlap" && (p.a.inst === lid.rec.id || p.b.inst === lid.rec.id));
  if (hit && hit.kind === "overlap") {
    const other = hit.a.inst === lid.rec.id ? hit.b : hit.a;
    return { gap: -Math.round(hit.depth * 100) / 100, part: other.name };
  }
  // The tallest placed part under the lid: the gap from its top to the lid's underside.
  const lidBox = worldAabbOf(lid.part.solids, lid.pose);
  if (!lidBox) return null;
  let best: { gap: number; part: string } | null = null;
  for (const item of items) {
    if (!item.placed || item === lid || item.part.enclosure) continue;
    for (const s of item.part.solids) {
      if (s.collide === false) continue;
      const box = worldAabbOf([s], item.pose);
      if (!box) continue;
      const overlapsXZ = box.max[0] > lidBox.min[0] && box.min[0] < lidBox.max[0] && box.max[2] > lidBox.min[2] && box.min[2] < lidBox.max[2];
      if (!overlapsXZ || box.max[1] > lidBox.min[1] + 0.05) continue;
      const gap = lidBox.min[1] - box.max[1];
      if (!best || gap < best.gap) best = { gap: Math.round(gap * 100) / 100, part: s.name };
    }
  }
  return best;
}

/** The assembly, composed and checked. */
export function composeScene(doc: AsmDoc, sources: Sources): AsmScene {
  const missing: InstanceRec[] = [];
  const resolved: Array<{ rec: InstanceRec; part: AsmPart }> = [];
  for (const rec of doc.instances) {
    const part = partFor(rec, sources);
    if (part) resolved.push({ rec, part });
    else missing.push(rec);
  }
  const solve = solveAssembly(
    resolved.map(({ rec, part }) => ({ id: rec.id, pose: rec.pose ?? part.defaultPose, grounded: !!rec.grounded, features: part.features })),
    doc.mates,
  );
  const items: SceneItem[] = resolved.map(({ rec, part }) => ({
    rec,
    part,
    pose: solve.poses.get(rec.id) ?? rec.pose ?? part.defaultPose,
    placed: !!rec.grounded || !!rec.placed || solve.solved.has(rec.id) || (rec.source === "three" && !rec.pose),
  }));

  for (const p of doc.patterns) {
    const seed = items.find((i) => i.rec.id === p.seed);
    if (!seed) continue;
    patternPoses(p, seed.pose).forEach((pose, k) => {
      const id = patternCopyId(p.id, k);
      const rec: InstanceRec = { id, source: seed.rec.source, ref: seed.rec.ref, pattern: p.id, ...(seed.rec.label ? { label: `${seed.rec.label}-${k + 2}` } : {}) };
      const part = seed.rec.source === "library" ? libraryPart(id, seed.rec.ref, rec.label) : { ...seed.part, id };
      if (part) items.push({ rec, part, pose, placed: seed.placed, copyOf: p.id });
    });
  }

  const fit = fitCheck({
    clearanceMm: doc.clearanceMm,
    parts: items.map((i) => ({
      id: i.rec.id,
      name: i.part.name,
      pose: i.pose,
      placed: i.placed,
      hidden: !!i.rec.hidden,
      solids: i.part.solids,
      ...(i.part.enclosure ? { enclosure: { role: i.part.enclosure.role } } : {}),
    })),
  });
  return { items, missing, mates: solve.status, freedom: solve.freedom, fit, holes: holeCheck(items), openings: openingCheck(items), lid: lidCheck(items, fit) };
}

/** A fit issue in plain words: "C3 hits the Lid by 0.6 mm". */
export function describeIssue(issue: FitIssue, clearance: number): string {
  const r = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
  if (issue.kind === "overlap") return `${issue.a.name} hits the ${issue.b.name} by ${r(issue.depth)} mm`;
  if (issue.kind === "close") return `${issue.a.name} is ${r(issue.gap)} mm from the ${issue.b.name} (rule ${r(clearance)} mm)`;
  return `${issue.a.partName} is outside the case`;
}

/** What the product page's Editor block reads (written with each save). */
export function summarize(doc: AsmDoc, scene: AsmScene, now: number): AsmSummary {
  return {
    parts: scene.items.length,
    placed: scene.items.filter((i) => i.placed).length,
    problems: scene.fit.problems.length,
    warnings: scene.fit.warnings.length + scene.openings.filter((o) => !o.ok).length,
    wires: doc.wires.length,
    at: now,
  };
}

/** The scene's world bounds (for framing the camera). */
export function sceneBounds(scene: AsmScene): Aabb | null {
  const boxes = scene.items.filter((i) => !i.rec.hidden).map((i) => worldAabbOf(i.part.solids, i.pose)).filter((b): b is Aabb => !!b);
  if (!boxes.length) return null;
  return aabbOf(boxes.flatMap((b) => [b.min, b.max]));
}

/** Explode (F32): each part lifted along the stacking axis by its rank × gap. */
export function explodeOffsets(scene: AsmScene, t: number): Map<string, Vec3> {
  const ranked = scene.items
    .filter((i) => !i.rec.hidden)
    .map((i) => ({ id: i.rec.id, box: worldAabbOf(i.part.solids, i.pose) }))
    .filter((x): x is { id: string; box: Aabb } => !!x.box)
    .sort((a, b) => a.box.min[1] - b.box.min[1] || a.id.localeCompare(b.id));
  const tallest = Math.max(10, ...ranked.map((r) => r.box.max[1] - r.box.min[1]));
  const gap = Math.max(18, tallest * 0.8);
  const out = new Map<string, Vec3>();
  ranked.forEach((r, rank) => out.set(r.id, [0, rank * gap * t, 0]));
  return out;
}

