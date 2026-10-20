// The 3D Module's Enclosure body (Assembly plan D6): a hollow case — floor,
// four walls with openings cut through them, screw bosses — and its lid.
// The 3D Module draws it and the Assembly checks fit against it, from this
// one geometry, so the case the maker sizes is the case the fit check sees.
//
// Millimetres, the shape's own frame: centred on the shape's position, y up
// (the base spans y = −h/2 … h/2). Pure; relative imports only (node:test).

export type EnclosureSide = "+x" | "-x" | "+z" | "-z";

/** A hole through one wall. `u` is the opening's centre along the wall
 *  (along z for an x wall, along x for a z wall, from the wall's middle);
 *  `v` its centre's height above the base's outer bottom. */
export type EnclosureOpening = { id: string; side: EnclosureSide; u: number; v: number; w: number; h: number };

export type EnclosureBosses = { inset: number; d: number; h: number; hole: number };

export type EnclosureSpec = {
  part: "base" | "lid";
  /** Links a base and its lid: sizing one sizes the other. */
  group: string;
  /** Outer size. A lid's `h` is its plate thickness. */
  w: number;
  d: number;
  h: number;
  wall: number;
  bosses?: EnclosureBosses | null;
  openings?: EnclosureOpening[];
};

export const ENCLOSURE_DEFAULTS = {
  w: 96,
  d: 66,
  h: 28,
  wall: 2,
  lid: 3,
  bosses: { inset: 8, d: 6, h: 8, hole: 2.5 } as EnclosureBosses,
  opening: { w: 10, h: 4.5 },
};

export const ENCLOSURE_LIMITS = { min: 10, max: 400, wallMin: 0.8, wallMax: 10 };

export type EnclosureBox = { id: string; center: [number, number, number]; size: [number, number, number] };
export type EnclosureBoss = { id: string; x: number; z: number; y0: number; h: number; r: number; hole: number };

/** The spec's real outer size: its dimensions times the shape's scale. */
export function enclosureSize(spec: EnclosureSpec, scale: [number, number, number] = [1, 1, 1]) {
  return { w: spec.w * Math.abs(scale[0]), h: spec.h * Math.abs(scale[1]), d: spec.d * Math.abs(scale[2]) };
}

/** Where the bosses stand (centres, x/z), symmetric, `inset` from the inner walls. */
export function bossCentres(spec: EnclosureSpec, scale?: [number, number, number]): Array<[number, number]> {
  const b = spec.bosses;
  if (spec.part !== "base" || !b) return [];
  const { w, d } = enclosureSize(spec, scale);
  const x = w / 2 - spec.wall - b.inset;
  const z = d / 2 - spec.wall - b.inset;
  if (x <= b.d / 2 || z <= b.d / 2) return [];
  return [[-x, -z], [x, -z], [-x, z], [x, z]];
}

/** A wall rectangle (in its own u/y plane) less one opening: up to four pieces. */
function cut(
  u0: number,
  u1: number,
  y0: number,
  y1: number,
  holes: Array<{ u0: number; u1: number; y0: number; y1: number }>,
): Array<{ u0: number; u1: number; y0: number; y1: number }> {
  let pieces = [{ u0, u1, y0, y1 }];
  for (const h of holes) {
    const next: typeof pieces = [];
    for (const p of pieces) {
      const hu0 = Math.max(p.u0, h.u0), hu1 = Math.min(p.u1, h.u1);
      const hy0 = Math.max(p.y0, h.y0), hy1 = Math.min(p.y1, h.y1);
      if (hu1 - hu0 <= 1e-6 || hy1 - hy0 <= 1e-6) {
        next.push(p);
        continue;
      }
      if (hu0 - p.u0 > 1e-6) next.push({ u0: p.u0, u1: hu0, y0: p.y0, y1: p.y1 });
      if (p.u1 - hu1 > 1e-6) next.push({ u0: hu1, u1: p.u1, y0: p.y0, y1: p.y1 });
      if (hy0 - p.y0 > 1e-6) next.push({ u0: hu0, u1: hu1, y0: p.y0, y1: hy0 });
      if (p.y1 - hy1 > 1e-6) next.push({ u0: hu0, u1: hu1, y0: hy1, y1: p.y1 });
    }
    pieces = next;
  }
  return pieces;
}

/** The case as boxes (floor, wall pieces) and bosses, in its own frame. */
export function enclosureGeometry(
  spec: EnclosureSpec,
  scale?: [number, number, number],
): { boxes: EnclosureBox[]; bosses: EnclosureBoss[] } {
  const { w, h, d } = enclosureSize(spec, scale);
  if (spec.part === "lid") return { boxes: [{ id: "plate", center: [0, 0, 0], size: [w, h, d] }], bosses: [] };
  const t = Math.min(spec.wall, w / 3, d / 3, h / 2);
  const bottom = -h / 2;
  const top = h / 2;
  const boxes: EnclosureBox[] = [{ id: "floor", center: [0, bottom + t / 2, 0], size: [w, t, d] }];
  const openings = spec.openings ?? [];
  const holesOn = (side: EnclosureSide) =>
    openings
      .filter((o) => o.side === side)
      .map((o) => ({ u0: o.u - o.w / 2, u1: o.u + o.w / 2, y0: bottom + o.v - o.h / 2, y1: bottom + o.v + o.h / 2 }));
  // x walls run the full depth; z walls sit between them.
  for (const side of ["+x", "-x"] as const) {
    const sx = side === "+x" ? 1 : -1;
    for (const [i, p] of cut(-d / 2, d / 2, bottom + t, top, holesOn(side)).entries()) {
      boxes.push({
        id: `wall${side}:${i}`,
        center: [sx * (w / 2 - t / 2), (p.y0 + p.y1) / 2, (p.u0 + p.u1) / 2],
        size: [t, p.y1 - p.y0, p.u1 - p.u0],
      });
    }
  }
  for (const side of ["+z", "-z"] as const) {
    const sz = side === "+z" ? 1 : -1;
    for (const [i, p] of cut(-w / 2 + t, w / 2 - t, bottom + t, top, holesOn(side)).entries()) {
      boxes.push({
        id: `wall${side}:${i}`,
        center: [(p.u0 + p.u1) / 2, (p.y0 + p.y1) / 2, sz * (d / 2 - t / 2)],
        size: [p.u1 - p.u0, p.y1 - p.y0, t],
      });
    }
  }
  const b = spec.bosses;
  const bosses: EnclosureBoss[] = b
    ? bossCentres(spec, scale).map(([x, z], i) => ({
        id: `boss:${i}`,
        x,
        z,
        y0: bottom + t,
        h: Math.min(b.h, h - t),
        r: b.d / 2,
        hole: b.hole,
      }))
    : [];
  return { boxes, bosses };
}

/** A new linked base and lid, sized to the defaults (or `size`). */
export function newEnclosurePair(group: string, size?: Partial<{ w: number; d: number; h: number }>): { base: EnclosureSpec; lid: EnclosureSpec } {
  const w = size?.w ?? ENCLOSURE_DEFAULTS.w;
  const d = size?.d ?? ENCLOSURE_DEFAULTS.d;
  const h = size?.h ?? ENCLOSURE_DEFAULTS.h;
  return {
    base: {
      part: "base",
      group,
      w,
      d,
      h,
      wall: ENCLOSURE_DEFAULTS.wall,
      bosses: { ...ENCLOSURE_DEFAULTS.bosses },
      openings: [],
    },
    lid: { part: "lid", group, w, d, h: ENCLOSURE_DEFAULTS.lid, wall: ENCLOSURE_DEFAULTS.wall },
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A spec with every number inside what the geometry can draw. */
export function normalizeEnclosure(spec: EnclosureSpec): EnclosureSpec {
  const { min, max, wallMin, wallMax } = ENCLOSURE_LIMITS;
  const w = clamp(spec.w, min, max);
  const d = clamp(spec.d, min, max);
  const h = spec.part === "lid" ? clamp(spec.h, wallMin, 30) : clamp(spec.h, min, max);
  const wall = clamp(spec.wall, wallMin, Math.min(wallMax, w / 4, d / 4));
  const out: EnclosureSpec = { part: spec.part, group: spec.group, w, d, h, wall };
  if (spec.part === "base") {
    out.bosses = spec.bosses
      ? {
          inset: clamp(spec.bosses.inset, 0, Math.min(w, d) / 2),
          d: clamp(spec.bosses.d, 2, 20),
          h: clamp(spec.bosses.h, 0.5, h - wall),
          hole: clamp(spec.bosses.hole, 0, spec.bosses.d - 0.5),
        }
      : null;
    out.openings = (spec.openings ?? []).map((o) => {
      const along = o.side === "+x" || o.side === "-x" ? d : w;
      const ow = clamp(o.w, 1, along - 2 * wall);
      const oh = clamp(o.h, 1, h - wall);
      return {
        id: o.id,
        side: o.side,
        w: ow,
        h: oh,
        u: clamp(o.u, -along / 2 + wall + ow / 2, along / 2 - wall - ow / 2),
        v: clamp(o.v, wall + oh / 2, h - oh / 2),
      };
    });
  }
  return out;
}
