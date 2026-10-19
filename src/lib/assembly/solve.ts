// The mate solver (F12). A mate ties a feature of one part to a feature of
// another; solving finds each part's place so its mates hold.
//
// Parts are solved one at a time, outward from the grounded ones: a part is
// solved once it has a mate to a part already solved (or grounded), using
// every such mate at once. "Solved" is a small least-squares fit
// (Levenberg–Marquardt over the part's 6 degrees of freedom, numeric
// Jacobian) that starts from where the part is now, so it lands on the
// nearest pose that satisfies the mates — a snap never flips a part over
// unless the maker asked (`flip`). A part whose mates can't all hold at once
// is over-defined: its unmet mates report "conflict". The rank of the
// mates' Jacobian at the solution says how many degrees of freedom remain.
//
// Millimetres and radians; rotation residuals are weighted so a 0.01 rad
// error counts like 0.1 mm. Pure; relative imports only.

import {
  add,
  apply,
  applyDir,
  compose,
  cross,
  dot,
  fromRotationVector,
  invert,
  qconj,
  qmul,
  qnorm,
  rotate,
  scale,
  sub,
  type Pose,
  type Vec3,
} from "./math";
import type { Feature, MateRec } from "./types";

export type SolveInstance = { id: string; pose: Pose; grounded: boolean; features: readonly Feature[] };
export type MateStatus = "ok" | "conflict" | "missing" | "suppressed" | "waiting";
export type SolveResult = {
  poses: Map<string, Pose>;
  status: Map<string, MateStatus>;
  /** Mate residual (mm-equivalent) after solving. */
  residual: Map<string, number>;
  /** Degrees of freedom each mated part still has (0 = fully placed). */
  freedom: Map<string, number>;
  /** Parts a mate moved. */
  solved: Set<string>;
};

const ROT_WEIGHT = 10; // mm per radian
export const SOLVE_TOL = 1e-3;

type Bound = { mate: MateRec; fa: Feature; fb: Feature };

/** World point and direction of a feature on a part at `pose`. */
function world(f: Feature, pose: Pose): { p: Vec3; d: Vec3 } {
  return { p: apply(pose, f.point), d: applyDir(pose, f.dir) };
}

/** The mate's residual vector for part a at `ta`, part b at `tb`. */
export function mateResidual(m: MateRec, fa: Feature, fb: Feature, ta: Pose, tb: Pose): number[] {
  const A = world(fa, ta);
  const B = world(fb, tb);
  const w = ROT_WEIGHT;
  switch (m.type) {
    case "flush":
    case "distance": {
      // Faces opposite (or aligned with flip), and B's plane at `offset` from A's.
      const s = m.flip ? 1 : -1;
      const nd = sub(B.d, scale(A.d, s));
      return [nd[0] * w, nd[1] * w, nd[2] * w, dot(sub(B.p, A.p), A.d) - (m.offset ?? 0)];
    }
    case "concentric": {
      const c = cross(A.d, B.d);
      const d = sub(B.p, A.p);
      const perp = sub(d, scale(A.d, dot(d, A.d)));
      const out = [c[0] * w, c[1] * w, c[2] * w, perp[0], perp[1], perp[2]];
      // With flip the axes point the same way; without it, whichever is nearer.
      if (m.flip) out.push((1 - dot(A.d, B.d)) * w);
      return out;
    }
    case "lock": {
      const rel = m.rel ?? { p: [0, 0, 0], q: [0, 0, 0, 1] };
      const target = compose(ta, rel);
      const dp = sub(tb.p, target.p);
      const dq = qnorm(qmul(tb.q, qconj(target.q)));
      const sgn = dq[3] < 0 ? -2 : 2; // small-angle rotation vector ≈ 2 · xyz
      return [dp[0], dp[1], dp[2], dq[0] * sgn * w, dq[1] * sgn * w, dq[2] * sgn * w];
    }
    case "parallel": {
      const c = cross(A.d, B.d);
      return [c[0] * w, c[1] * w, c[2] * w];
    }
    case "perpendicular":
      return [dot(A.d, B.d) * w];
    case "angle":
      return [(dot(A.d, B.d) - Math.cos(((m.angle ?? 90) * Math.PI) / 180)) * w];
    case "tangent": {
      // B is a cylinder (an axis feature): its axis lies parallel to A's face,
      // its surface touching it.
      const r = fb.radius ?? 0;
      return [dot(B.d, A.d) * w, dot(sub(B.p, A.p), A.d) - r];
    }
  }
}

const norm2 = (r: number[]) => r.reduce((s, v) => s + v * v, 0);

/** The pose `t` moved by a small twist: rotation `w` about `pivot`, then `v`. */
function perturb(t: Pose, x: readonly number[], pivot: Vec3): Pose {
  const q = fromRotationVector([x[0], x[1], x[2]]);
  return { p: add(add(rotate(q, sub(t.p, pivot)), pivot), [x[3], x[4], x[5]]), q: qnorm(qmul(q, t.q)) };
}

/** Solves a 6×6 linear system (Gaussian elimination with partial pivoting). */
function solve6(a: number[][], b: number[]): number[] | null {
  const n = 6;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-14) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/** Eigenvalues of a symmetric 6×6 matrix (cyclic Jacobi). */
function eigenvalues(s: number[][]): number[] {
  const a = s.map((r) => [...r]);
  const n = a.length;
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-18) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const sn = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p], akq = a[k][q];
          a[k][p] = c * akp - sn * akq;
          a[k][q] = sn * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k], aqk = a[q][k];
          a[p][k] = c * apk - sn * aqk;
          a[q][k] = sn * apk + c * aqk;
        }
      }
    }
  }
  return a.map((row, i) => row[i]);
}

type Term = { bound: Bound; moving: "a" | "b"; other: Pose };

function residualsAt(terms: Term[], t: Pose): number[] {
  const out: number[] = [];
  for (const { bound, moving, other } of terms) {
    const ta = moving === "a" ? t : other;
    const tb = moving === "b" ? t : other;
    out.push(...mateResidual(bound.mate, bound.fa, bound.fb, ta, tb));
  }
  return out;
}

function jacobian(terms: Term[], t: Pose, pivot: Vec3, r0: number[]): number[][] {
  const h = 1e-6;
  const cols: number[][] = [];
  for (let k = 0; k < 6; k++) {
    const x = [0, 0, 0, 0, 0, 0];
    x[k] = h;
    const rp = residualsAt(terms, perturb(t, x, pivot));
    x[k] = -h;
    const rm = residualsAt(terms, perturb(t, x, pivot));
    cols.push(rp.map((v, i) => (v - rm[i]) / (2 * h)));
  }
  return r0.map((_, i) => cols.map((c) => c[i])); // m × 6
}

/** Fits one part's pose to its terms (Levenberg–Marquardt). */
export function fitPose(terms: Term[], start: Pose, pivot: Vec3): { pose: Pose; cost: number; rank: number } {
  let t = start;
  let r = residualsAt(terms, t);
  let cost = norm2(r);
  let lambda = 1e-3;
  for (let it = 0; it < 200 && cost > 1e-14; it++) {
    const J = jacobian(terms, t, pivot, r);
    const JtJ = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => J.reduce((s, row) => s + row[i] * row[j], 0)));
    const Jtr = Array.from({ length: 6 }, (_, i) => J.reduce((s, row, k) => s + row[i] * r[k], 0));
    let improved = false;
    for (let tries = 0; tries < 12; tries++) {
      const A = JtJ.map((row, i) => row.map((v, j) => (i === j ? v + lambda * (v + 1e-9) : v)));
      const step = solve6(A, Jtr.map((v) => -v));
      if (!step) {
        lambda *= 10;
        continue;
      }
      const next = perturb(t, step, pivot);
      const rn = residualsAt(terms, next);
      const cn = norm2(rn);
      if (cn < cost) {
        t = next;
        r = rn;
        const gain = cost - cn;
        cost = cn;
        lambda = Math.max(lambda / 4, 1e-12);
        improved = true;
        if (gain < 1e-16 && Math.hypot(...step) < 1e-12) it = 1e9;
        break;
      }
      lambda *= 8;
    }
    if (!improved) break;
  }
  const J = jacobian(terms, t, pivot, r);
  const JtJ = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => J.reduce((s, row) => s + row[i] * row[j], 0)));
  const ev = eigenvalues(JtJ);
  const maxEv = Math.max(...ev.map(Math.abs), 1e-12);
  const rank = ev.filter((e) => Math.abs(e) > Math.max(1e-6, maxEv * 1e-8)).length;
  return { pose: t, cost, rank };
}

/** Solves every mate. `instances` carries each part's current (or default)
 *  pose; grounded parts never move. */
export function solveAssembly(instances: readonly SolveInstance[], mates: readonly MateRec[]): SolveResult {
  const byId = new Map(instances.map((i) => [i.id, i]));
  const poses = new Map(instances.map((i) => [i.id, i.pose]));
  const status = new Map<string, MateStatus>();
  const residual = new Map<string, number>();
  const freedom = new Map<string, number>();
  const solved = new Set<string>();

  const active: Bound[] = [];
  for (const m of mates) {
    if (m.suppressed) {
      status.set(m.id, "suppressed");
      continue;
    }
    const ia = byId.get(m.a.inst), ib = byId.get(m.b.inst);
    const fa = ia?.features.find((f) => f.id === m.a.feature);
    const fb = ib?.features.find((f) => f.id === m.b.feature);
    if (!ia || !ib || !fa || !fb || ia.id === ib.id) {
      status.set(m.id, "missing");
      continue;
    }
    active.push({ mate: m, fa, fb });
  }

  const fixed = new Set(instances.filter((i) => i.grounded).map((i) => i.id));
  const pending = new Set(active.flatMap((b) => [b.mate.a.inst, b.mate.b.inst]).filter((id) => !fixed.has(id)));

  const solveOne = (id: string) => {
    const terms: Term[] = [];
    for (const b of active) {
      if (b.mate.b.inst === id && fixed.has(b.mate.a.inst)) terms.push({ bound: b, moving: "b", other: poses.get(b.mate.a.inst)! });
      else if (b.mate.a.inst === id && fixed.has(b.mate.b.inst)) terms.push({ bound: b, moving: "a", other: poses.get(b.mate.b.inst)! });
    }
    if (!terms.length) return false;
    const start = poses.get(id)!;
    const first = terms[0];
    const pivotFeature = first.moving === "b" ? first.bound.fb : first.bound.fa;
    const pivot = apply(start, pivotFeature.point);
    const { pose, rank } = fitPose(terms, start, pivot);
    poses.set(id, pose);
    freedom.set(id, Math.max(0, 6 - rank));
    fixed.add(id);
    pending.delete(id);
    solved.add(id);
    return true;
  };

  // Outward from the ground; an island with no grounded part keeps its first part where it is.
  while (pending.size) {
    let progressed = false;
    for (const id of [...pending]) if (solveOne(id)) progressed = true;
    if (progressed) continue;
    const anchor = instances.find((i) => pending.has(i.id));
    if (!anchor) break;
    fixed.add(anchor.id);
    pending.delete(anchor.id);
  }

  for (const b of active) {
    const r = mateResidual(b.mate, b.fa, b.fb, poses.get(b.mate.a.inst)!, poses.get(b.mate.b.inst)!);
    const e = Math.sqrt(norm2(r));
    residual.set(b.mate.id, e);
    status.set(b.mate.id, e <= SOLVE_TOL * 10 ? "ok" : "conflict");
  }
  return { poses, status, residual, freedom, solved };
}

/** B's pose in A's frame — what a Lock mate keeps. */
export const relativePose = (ta: Pose, tb: Pose): Pose => compose(invert(ta), tb);
