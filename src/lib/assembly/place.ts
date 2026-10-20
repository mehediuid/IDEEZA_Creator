// Placing parts (F8, F10, F39): the two-pick Snap, Place inside, the lid's
// lock and Place all. Each returns a plan — the mates to add and a starting
// pose already close to the answer — and `applyPlan` writes it into the
// document; the solver (solve.ts) then holds the part where its mates say.
// Pure; relative imports only.

import { mateName, nextId } from "./doc";
import { worldAabbOf } from "./fit";
import {
  add,
  apply,
  applyDir,
  axisAngle,
  compose,
  dot,
  invert,
  rotate,
  rotateAbout,
  rotationBetween,
  scale,
  sub,
  Q0,
  type Pose,
  type Vec3,
} from "./math";
import type { AsmScene, SceneItem } from "./scene";
import { relativePose } from "./solve";
import type { AsmDoc, Feature, MateRec, MateType } from "./types";

export type PlannedMate = { type: MateType; a: { inst: string; feature: string }; b: { inst: string; feature: string }; offset?: number; rel?: Pose };
export type Plan = { ok: true; pose: Pose; mates: PlannedMate[]; message: string } | { ok: false; error: string };

const HOLE_TOL = 0.5;
const PCB_STANDOFF = 3;

const fail = (error: string): Plan => ({ ok: false, error });
const featureOf = (item: SceneItem, id: string) => item.part.features.find((f) => f.id === id) ?? null;
const r1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** A part's place moved so `fb` (on it) meets `fa` (on the target): faces
 *  face each other, axes line up, points coincide — centre to centre. */
function alignPose(b: SceneItem, fb: Feature, a: SceneItem, fa: Feature): Pose {
  const pa = apply(a.pose, fa.point), na = applyDir(a.pose, fa.dir);
  const pb = apply(b.pose, fb.point), nb = applyDir(b.pose, fb.dir);
  const target = fb.kind === "face" ? scale(na, -1) : dot(nb, na) >= 0 ? na : scale(na, -1);
  const turned = rotateAbout(b.pose, rotationBetween(nb, target), pb);
  return { p: add(turned.p, sub(pa, pb)), q: turned.q };
}

/** Snap (F10): the maker picked `fbId` on the part to move, then `faId` on
 *  where it goes. Two faces → Flush; two holes/axes → Concentric, plus the
 *  Flush that seats them when both have a seat (a peg in a hole); a board's
 *  holes onto a case's bosses also line up a second hole, so it can't turn. */
export function snapPlan(scene: AsmScene, movingId: string, fbId: string, targetId: string, faId: string): Plan {
  const b = scene.items.find((i) => i.rec.id === movingId);
  const a = scene.items.find((i) => i.rec.id === targetId);
  if (!a || !b) return fail("Pick a part that is in the assembly.");
  if (a === b) return fail("Pick a feature on another part.");
  if (b.rec.grounded) return fail(`${b.part.name} is fixed in place. Unfix it to move it.`);
  if (b.copyOf) return fail("A pattern copy follows its original. Move the original.");
  let fb = featureOf(b, fbId);
  let fa = featureOf(a, faId);
  if (!fa || !fb) return fail("That feature isn't on the part any more.");
  // A face against a hole: use the hole's seat, so it is two faces.
  if (fa.kind !== fb.kind) {
    if (fa.kind === "axis" && fa.seat) fa = featureOf(a, fa.seat);
    else if (fb.kind === "axis" && fb.seat) fb = featureOf(b, fb.seat);
    if (!fa || !fb || fa.kind !== fb.kind) return fail("Pick two faces, or two holes.");
  }
  let pose = alignPose(b, fb, a, fa);
  const mates: PlannedMate[] = [];
  if (fa.kind === "face") {
    mates.push({ type: "flush", a: { inst: a.rec.id, feature: fa.id }, b: { inst: b.rec.id, feature: fb.id } });
    return { ok: true, pose, mates, message: `Snapped: ${fb.label} flush with ${fa.label}` };
  }
  mates.push({ type: "concentric", a: { inst: a.rec.id, feature: fa.id }, b: { inst: b.rec.id, feature: fb.id } });
  if (fa.seat && fb.seat && featureOf(a, fa.seat) && featureOf(b, fb.seat)) {
    mates.push({ type: "flush", a: { inst: a.rec.id, feature: fa.seat }, b: { inst: b.rec.id, feature: fb.seat } });
  }
  // A second hole on a second boss: turn about the first until one lands.
  const otherHoles = b.part.features.filter((f) => f.kind === "axis" && f.id !== fb!.id);
  const otherAxes = a.part.features.filter((f) => f.kind === "axis" && f.id !== fa!.id);
  if (otherHoles.length && otherAxes.length) {
    const pivot = apply(a.pose, fa.point);
    const axis = applyDir(a.pose, fa.dir);
    let best = null as { pose: Pose; hole: Feature; boss: Feature; d: number } | null;
    for (let k = 0; k < 360; k += 1) {
      const turned = rotateAbout(pose, axisAngle(axis, (k * Math.PI) / 180), pivot);
      for (const h of otherHoles) {
        const hp = apply(turned, h.point);
        for (const bo of otherAxes) {
          const bp = apply(a.pose, bo.point);
          const off = sub(hp, bp);
          const d = Math.hypot(...sub(off, scale(axis, dot(off, axis))));
          if (d <= HOLE_TOL && (!best || d < best.d - 1e-9)) best = { pose: turned, hole: h, boss: bo, d };
        }
      }
      if (best && best.d < 1e-3) break;
    }
    if (best) {
      pose = best.pose;
      mates.push({ type: "concentric", a: { inst: a.rec.id, feature: best.boss.id }, b: { inst: b.rec.id, feature: best.hole.id } });
      return { ok: true, pose, mates, message: `Snapped: ${fb.label} and ${best.hole.label} on ${fa.label} and ${best.boss.label}` };
    }
  }
  return { ok: true, pose, mates, message: `Snapped: ${fb.label} on ${fa.label}` };
}

/** The case a part goes in: a placed base, grounded ones first. */
function caseOf(scene: AsmScene): SceneItem | null {
  const bases = scene.items.filter((i) => i.part.enclosure?.role === "base" && i.placed && !i.copyOf);
  return bases.find((b) => b.rec.grounded) ?? bases[0] ?? null;
}

/** Board holes onto case bosses (base frame, x/z): the turn and shift that
 *  puts the most holes on bosses, at least two. */
function matchHoles(holes: Array<{ f: Feature; x: number; z: number }>, bosses: Array<{ f: Feature; x: number; z: number }>) {
  let best = null as { turn: number; dx: number; dz: number; pairs: Array<[Feature, Feature]> } | null;
  for (const turn of [0, 90, 180, 270]) {
    const q = axisAngle([0, 1, 0], (turn * Math.PI) / 180);
    const rot = holes.map((h) => {
      const p = rotate(q, [h.x, 0, h.z]);
      return { f: h.f, x: p[0], z: p[2] };
    });
    for (const anchor of rot) {
      for (const boss of bosses) {
        const dx = boss.x - anchor.x, dz = boss.z - anchor.z;
        const pairs: Array<[Feature, Feature]> = [];
        const used = new Set<Feature>();
        for (const h of rot) {
          const hit = bosses.find((bo) => !used.has(bo.f) && Math.hypot(h.x + dx - bo.x, h.z + dz - bo.z) <= HOLE_TOL);
          if (hit) {
            used.add(hit.f);
            pairs.push([h.f, hit.f]);
          }
        }
        if (pairs.length >= 2 && (!best || pairs.length > best.pairs.length)) best = { turn, dx, dz, pairs };
      }
    }
  }
  return best;
}

/** Place inside (F8): into the case's cavity — a board onto the bosses its
 *  holes match, else on standoffs; a part on the floor where it fits. */
export function placeInsidePlan(scene: AsmScene, movingId: string): Plan {
  const b = scene.items.find((i) => i.rec.id === movingId);
  if (!b) return fail("Pick a part that is in the assembly.");
  if (b.part.enclosure?.role === "lid") return fail("The lid goes on top: use Close the lid.");
  if (b.part.enclosure?.role === "base") return fail("This is the case. Pick a part to put inside it.");
  if (b.rec.grounded) return fail(`${b.part.name} is fixed in place. Unfix it to move it.`);
  const base = caseOf(scene);
  if (!base) return fail("There is no case yet. Add an Enclosure in the 3D Module, then bring it in.");
  const cavity = base.part.enclosure!.cavity;
  const local = worldAabbOf(b.part.solids.filter((s) => s.collide !== false), { p: [0, 0, 0], q: Q0 });
  if (!local) return fail("This part has nothing to place.");
  const floor = base.part.features.find((f) => f.id === "face:floor");
  const bottomFace = b.part.features.find((f) => f.id === "face:bottom");
  if (!floor || !bottomFace) return fail("This part has no bottom face to stand on.");
  const cw = cavity.max[0] - cavity.min[0], cd = cavity.max[2] - cavity.min[2];
  const pw = local.max[0] - local.min[0], pd = local.max[2] - local.min[2];
  const fitsStraight = pw <= cw && pd <= cd;
  const fitsTurned = pd <= cw && pw <= cd;
  if (!fitsStraight && !fitsTurned) {
    return fail(`${b.part.name} (${r1(pw)} × ${r1(pd)} mm) is bigger than the inside of the case (${r1(cw)} × ${r1(cd)} mm).`);
  }

  // A board with holes, a case with bosses: holes on bosses.
  const holes = b.part.features.filter((f) => f.kind === "axis" && f.id.startsWith("hole:")).map((f) => ({ f, x: f.point[0], z: f.point[2] }));
  const bosses = base.part.features.filter((f) => f.id.startsWith("axis:boss:")).map((f) => ({ f, x: f.point[0], z: f.point[2] }));
  if (holes.length >= 2 && bosses.length >= 2) {
    const m = matchHoles(holes, bosses);
    if (m) {
      const topY = m.pairs[0][1].point[1];
      const q = axisAngle([0, 1, 0], (m.turn * Math.PI) / 180);
      const pose = compose(base.pose, { p: [m.dx, topY, m.dz], q });
      const seat = m.pairs[0][1].seat;
      const mates: PlannedMate[] = m.pairs.slice(0, 2).map(([h, bo]) => ({ type: "concentric", a: { inst: base.rec.id, feature: bo.id }, b: { inst: b.rec.id, feature: h.id } }));
      if (seat) mates.push({ type: "flush", a: { inst: base.rec.id, feature: seat }, b: { inst: b.rec.id, feature: bottomFace.id } });
      return { ok: true, pose, mates, message: `Placed on the bosses: ${m.pairs.length} holes matched within ${HOLE_TOL} mm` };
    }
  }

  // Else on the floor (a board on standoffs), centred, or where it doesn't hit what's there.
  const bossTop = bosses.length ? Math.max(...bosses.map((bo) => bo.f.point[1])) : null;
  const standoff = b.part.source === "pcb" ? (bossTop !== null ? bossTop - floor.point[1] : PCB_STANDOFF) : 0;
  const turn = fitsStraight ? 0 : 90;
  const q = axisAngle([0, 1, 0], (turn * Math.PI) / 180);
  const corners: Vec3[] = [];
  for (const x of [local.min[0], local.max[0]]) for (const z of [local.min[2], local.max[2]]) corners.push(rotate(q, [x, 0, z]));
  const minX = Math.min(...corners.map((c) => c[0])), maxX = Math.max(...corners.map((c) => c[0]));
  const minZ = Math.min(...corners.map((c) => c[2])), maxZ = Math.max(...corners.map((c) => c[2]));
  const y = floor.point[1] + standoff - local.min[1];
  const others = scene.items
    .filter((i) => i !== b && i !== base && i.placed && !i.rec.hidden && !i.part.enclosure)
    .map((i) => worldAabbOf(i.part.solids.filter((s) => s.collide !== false), i.pose))
    .filter((x): x is NonNullable<typeof x> => !!x);
  const cx = (cavity.min[0] + cavity.max[0]) / 2 - (minX + maxX) / 2;
  const cz = (cavity.min[2] + cavity.max[2]) / 2 - (minZ + maxZ) / 2;
  const candidates: Array<[number, number]> = [[cx, cz]];
  for (let gx = cavity.min[0] - minX; gx <= cavity.max[0] - maxX + 1e-6; gx += 2) {
    for (let gz = cavity.min[2] - minZ; gz <= cavity.max[2] - maxZ + 1e-6; gz += 2) candidates.push([gx, gz]);
  }
  const hits = (pose: Pose) => {
    const box = worldAabbOf(b.part.solids.filter((s) => s.collide !== false), pose);
    return !!box && others.some((o) => [0, 1, 2].every((k) => Math.min(box.max[k], o.max[k]) - Math.max(box.min[k], o.min[k]) > 0.05));
  };
  let pose: Pose | null = null;
  for (const [x, z] of candidates) {
    const p = compose(base.pose, { p: [x, y, z], q });
    if (!hits(p)) {
      pose = p;
      break;
    }
  }
  if (!pose) return fail(`There's no room left on the case floor for ${b.part.name}.`);
  const mates: PlannedMate[] = [{ type: "distance", a: { inst: base.rec.id, feature: floor.id }, b: { inst: b.rec.id, feature: bottomFace.id }, offset: standoff }];
  return {
    ok: true,
    pose,
    mates,
    message: standoff > 0 ? `Placed inside on ${r1(standoff)} mm standoffs` : "Placed inside on the case floor",
  };
}

/** Close the lid: on the case's rim, centred, locked there. */
export function lidPlan(scene: AsmScene, lidId: string): Plan {
  const lid = scene.items.find((i) => i.rec.id === lidId);
  if (!lid || lid.part.enclosure?.role !== "lid") return fail("Pick the lid.");
  const base = caseOf(scene);
  if (!base) return fail("There is no case to close.");
  const rim = base.part.features.find((f) => f.id === "face:rim");
  const top = lid.part.features.find((f) => f.id === "face:lid-top");
  if (!rim || !top) return fail("The case has no rim.");
  const pose = compose(base.pose, { p: [rim.point[0], rim.point[1] + top.point[1], rim.point[2]], q: Q0 });
  return {
    ok: true,
    pose,
    mates: [{ type: "lock", a: { inst: base.rec.id, feature: rim.id }, b: { inst: lid.rec.id, feature: "face:lid-bottom" }, rel: relativePose(base.pose, pose) }],
    message: "The lid is on the case, locked",
  };
}

/** Writes a plan into the document: the part's start pose, placed, and its new mates. */
export function applyPlan(doc: AsmDoc, instId: string, plan: Extract<Plan, { ok: true }>): AsmDoc {
  const mates: MateRec[] = [...doc.mates];
  for (const m of plan.mates) {
    mates.push({ id: nextId("m", mates.map((x) => x.id)), name: mateName(m.type, mates), ...m });
  }
  return {
    ...doc,
    instances: doc.instances.map((i) => (i.id === instId ? { ...i, pose: plan.pose, placed: true } : i)),
    mates,
  };
}

/** A part's pose after the maker typed a position or a turn (F6), unmated parts only. */
export function movedPose(pose: Pose, at: Vec3 | null, turnDeg: Vec3 | null): Pose {
  let next = pose;
  if (turnDeg) {
    const q = [axisAngle([1, 0, 0], (turnDeg[0] * Math.PI) / 180), axisAngle([0, 1, 0], (turnDeg[1] * Math.PI) / 180), axisAngle([0, 0, 1], (turnDeg[2] * Math.PI) / 180)].reduce(
      (acc, r) => compose({ p: [0, 0, 0], q: r }, acc),
      { p: [0, 0, 0], q: Q0 } as Pose,
    ).q;
    next = rotateAbout(next, q, next.p);
  }
  if (at) next = { p: at, q: next.q };
  return next;
}

/** The pose of a part relative to another (for UI readouts in the case's frame). */
export const poseIn = (frame: Pose, pose: Pose): Pose => compose(invert(frame), pose);
