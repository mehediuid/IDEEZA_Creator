// Small 3D math for the assembly: vectors, quaternions and rigid poses, in
// millimetres, y up (three.js's frame). Pure and dependency-free, so the
// solver, the fit check and the router run in node:test as they run in the
// browser. Quaternions are [x, y, z, w]; Euler angles follow three.js's
// default "XYZ" order, so a 3D Module shape's rotation means the same here.

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
/** A rigid transform: rotate by `q`, then move by `p`. */
export type Pose = { p: Vec3; q: Quat };

export const V0: Vec3 = [0, 0, 0];
export const Q0: Quat = [0, 0, 0, 1];
export const IDENTITY: Pose = { p: V0, q: Q0 };

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: Vec3, b: Vec3): number => len(sub(a, b));
export function norm(a: Vec3): Vec3 {
  const l = len(a);
  return l < 1e-12 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
}
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Any unit vector perpendicular to `a`. */
export function perpendicular(a: Vec3): Vec3 {
  const n = norm(a);
  const helper: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return norm(cross(n, helper));
}

// ── quaternions ──────────────────────────────────────────────────────────

export function qmul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}
export const qconj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];
export function qnorm(q: Quat): Quat {
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  return l < 1e-12 ? [0, 0, 0, 1] : [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
/** Rotates `v` by the unit quaternion `q`. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  // t = 2 * cross(q.xyz, v); v' = v + w * t + cross(q.xyz, t)
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}
export function axisAngle(axis: Vec3, angle: number): Quat {
  const n = norm(axis);
  const s = Math.sin(angle / 2);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(angle / 2)];
}
/** The rotation vector (axis × angle) → quaternion: the exponential map. */
export function fromRotationVector(r: Vec3): Quat {
  const a = len(r);
  if (a < 1e-12) return qnorm([r[0] / 2, r[1] / 2, r[2] / 2, 1]);
  return axisAngle(r, a);
}
/** The shortest rotation taking unit vector `from` onto unit vector `to`. */
export function rotationBetween(from: Vec3, to: Vec3): Quat {
  const a = norm(from);
  const b = norm(to);
  const d = dot(a, b);
  if (d > 1 - 1e-9) return Q0;
  if (d < -1 + 1e-9) return axisAngle(perpendicular(a), Math.PI);
  const c = cross(a, b);
  return qnorm([c[0], c[1], c[2], 1 + d]);
}
/** three.js Euler "XYZ" (radians) → quaternion. */
export function fromEuler(e: Vec3): Quat {
  const c1 = Math.cos(e[0] / 2), c2 = Math.cos(e[1] / 2), c3 = Math.cos(e[2] / 2);
  const s1 = Math.sin(e[0] / 2), s2 = Math.sin(e[1] / 2), s3 = Math.sin(e[2] / 2);
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ];
}
/** Quaternion → three.js Euler "XYZ" (radians). */
export function toEuler(q: Quat): Vec3 {
  const [x, y, z, w] = qnorm(q);
  const m11 = 1 - 2 * (y * y + z * z), m12 = 2 * (x * y - z * w), m13 = 2 * (x * z + y * w);
  const m22 = 1 - 2 * (x * x + z * z), m23 = 2 * (y * z - x * w);
  const m32 = 2 * (y * z + x * w), m33 = 1 - 2 * (x * x + y * y);
  const ey = Math.asin(Math.max(-1, Math.min(1, m13)));
  if (Math.abs(m13) < 0.9999999) return [Math.atan2(-m23, m33), ey, Math.atan2(-m12, m11)];
  return [Math.atan2(m32, m22), ey, 0];
}
/** The angle (radians) of the rotation between two orientations. */
export function qangle(a: Quat, b: Quat): number {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d));
}

// ── poses ────────────────────────────────────────────────────────────────

export const apply = (t: Pose, v: Vec3): Vec3 => add(rotate(t.q, v), t.p);
export const applyDir = (t: Pose, v: Vec3): Vec3 => rotate(t.q, v);
/** `a ∘ b`: first b, then a. */
export function compose(a: Pose, b: Pose): Pose {
  return { p: add(rotate(a.q, b.p), a.p), q: qnorm(qmul(a.q, b.q)) };
}
export function invert(t: Pose): Pose {
  const qi = qconj(t.q);
  return { p: scale(rotate(qi, t.p), -1), q: qi };
}
/** The pose after rotating `t` by `q` about the world point `pivot`. */
export function rotateAbout(t: Pose, q: Quat, pivot: Vec3): Pose {
  return { p: add(rotate(q, sub(t.p, pivot)), pivot), q: qnorm(qmul(q, t.q)) };
}
export const round = (n: number, step = 1e-4): number => Math.round(n / step) * step;
export const roundVec = (v: Vec3, step = 1e-4): Vec3 => [round(v[0], step), round(v[1], step), round(v[2], step)];

/** An axis-aligned box, world millimetres. */
export type Aabb = { min: Vec3; max: Vec3 };
export function aabbOf(points: readonly Vec3[]): Aabb {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let k = 0; k < 3; k++) {
      if (p[k] < min[k]) min[k] = p[k];
      if (p[k] > max[k]) max[k] = p[k];
    }
  }
  return { min, max };
}
export function aabbUnion(a: Aabb, b: Aabb): Aabb {
  return {
    min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
    max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])],
  };
}
