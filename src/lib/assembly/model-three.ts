// The 3D Module's shapes as assembly parts (F2): one part per visible shape,
// in millimetres, at the place the maker designed it. Read-only — Assembly
// never writes the 3D Module's document (Preview used to, and the two editors
// fought over it). An Enclosure shape (D6) comes in hollow: a floor, walls
// with their openings, bosses, and a cavity the fit check can use.
//
// The 3D Module's base geometry (three-canvas-impl.tsx): box 2 units, sphere
// r 1.2, cylinder r 1 × 2, cone r 1.2 × 2.4, torus R 1 / r 0.4, plane 3 × 3;
// a unit is 10 mm (SCENE_UNIT_MM). Pure; relative imports only.

import { bossCentres, enclosureGeometry, enclosureSize } from "../three/enclosure";
import { SCENE_UNIT_MM, type SceneShape } from "../three/scene";
import { fromEuler, type Vec3 } from "./math";
import type { AsmPart, Feature, Opening, Solid } from "./types";

const U = SCENE_UNIT_MM;
const SHAPE_COLOR = "#c3cad6";
const CASE_COLOR = "#b4bdca";

const TYPE_NAME: Record<SceneShape["type"], string> = {
  box: "Box",
  sphere: "Sphere",
  cylinder: "Cylinder",
  cone: "Cone",
  torus: "Torus",
  plane: "Plane",
  enclosure: "Case",
};

/** The id an instance of a 3D shape carries. */
export const threeInstanceId = (shapeId: string) => `three:${shapeId}`;

/** True when the document is the 3D Module's untouched default (one cube) or empty. */
export function isPristineScene(shapes: readonly SceneShape[]): boolean {
  return shapes.length === 0 || (shapes.length === 1 && shapes[0].id === "default-cube");
}

function boxFaces(prefix: string, label: string, center: Vec3, size: Vec3): Feature[] {
  const [w, h, d] = size;
  const [x, y, z] = center;
  return [
    { id: `${prefix}+y`, kind: "face", label: `${label} top`, point: [x, y + h / 2, z], dir: [0, 1, 0], size: [w, d] },
    { id: `${prefix}-y`, kind: "face", label: `${label} bottom`, point: [x, y - h / 2, z], dir: [0, -1, 0], size: [w, d] },
    { id: `${prefix}+x`, kind: "face", label: `${label} right`, point: [x + w / 2, y, z], dir: [1, 0, 0], size: [d, h] },
    { id: `${prefix}-x`, kind: "face", label: `${label} left`, point: [x - w / 2, y, z], dir: [-1, 0, 0], size: [d, h] },
    { id: `${prefix}+z`, kind: "face", label: `${label} front`, point: [x, y, z + d / 2], dir: [0, 0, 1], size: [w, h] },
    { id: `${prefix}-z`, kind: "face", label: `${label} back`, point: [x, y, z - d / 2], dir: [0, 0, -1], size: [w, h] },
  ];
}

function enclosurePart(shape: SceneShape, name: string): Pick<AsmPart, "solids" | "features" | "enclosure"> {
  const spec = shape.enclosure!;
  const { w, h, d } = enclosureSize(spec, shape.scale);
  const geo = enclosureGeometry(spec, shape.scale);
  if (spec.part === "lid") {
    return {
      solids: [{ id: "plate", name, shape: { kind: "box", center: [0, 0, 0], size: [w, h, d] }, color: CASE_COLOR, translucent: true }],
      features: [
        { id: "face:lid-bottom", kind: "face", label: "Lid underside", point: [0, -h / 2, 0], dir: [0, -1, 0], size: [w, d] },
        { id: "face:lid-top", kind: "face", label: "Lid top", point: [0, h / 2, 0], dir: [0, 1, 0], size: [w, d] },
      ],
      enclosure: { role: "lid", cavity: { min: [-w / 2, -h / 2, -d / 2], max: [w / 2, h / 2, d / 2] }, openings: [] },
    };
  }
  const t = Math.min(spec.wall, w / 3, d / 3, h / 2);
  const floorTop = -h / 2 + t;
  const solids: Solid[] = geo.boxes.map((b) => ({
    id: b.id,
    name: b.id === "floor" ? `${name} floor` : `${name} wall`,
    shape: { kind: "box", center: b.center, size: b.size },
    color: CASE_COLOR,
    translucent: b.id !== "floor",
  }));
  const features: Feature[] = [
    { id: "face:floor", kind: "face", label: "Case floor (inside)", point: [0, floorTop, 0], dir: [0, 1, 0], size: [w - 2 * t, d - 2 * t] },
    { id: "face:bottom", kind: "face", label: "Case bottom", point: [0, -h / 2, 0], dir: [0, -1, 0], size: [w, d] },
    { id: "face:rim", kind: "face", label: "Case rim", point: [0, h / 2, 0], dir: [0, 1, 0], size: [w, d] },
    { id: "face:wall+x:in", kind: "face", label: "Right wall (inside)", point: [w / 2 - t, (floorTop + h / 2) / 2, 0], dir: [-1, 0, 0], size: [d - 2 * t, h - t] },
    { id: "face:wall-x:in", kind: "face", label: "Left wall (inside)", point: [-w / 2 + t, (floorTop + h / 2) / 2, 0], dir: [1, 0, 0], size: [d - 2 * t, h - t] },
    { id: "face:wall+z:in", kind: "face", label: "Front wall (inside)", point: [0, (floorTop + h / 2) / 2, d / 2 - t], dir: [0, 0, -1], size: [w - 2 * t, h - t] },
    { id: "face:wall-z:in", kind: "face", label: "Back wall (inside)", point: [0, (floorTop + h / 2) / 2, -d / 2 + t], dir: [0, 0, 1], size: [w - 2 * t, h - t] },
    { id: "face:wall+x:out", kind: "face", label: "Right wall (outside)", point: [w / 2, 0, 0], dir: [1, 0, 0], size: [d, h] },
    { id: "face:wall-x:out", kind: "face", label: "Left wall (outside)", point: [-w / 2, 0, 0], dir: [-1, 0, 0], size: [d, h] },
    { id: "face:wall+z:out", kind: "face", label: "Front wall (outside)", point: [0, 0, d / 2], dir: [0, 0, 1], size: [w, h] },
    { id: "face:wall-z:out", kind: "face", label: "Back wall (outside)", point: [0, 0, -d / 2], dir: [0, 0, -1], size: [w, h] },
  ];
  geo.bosses.forEach((b, i) => {
    solids.push({ id: b.id, name: `Boss ${i + 1}`, shape: { kind: "cyl", center: [b.x, b.y0 + b.h / 2, b.z], r: b.r, h: b.h }, color: CASE_COLOR });
    const topY = b.y0 + b.h;
    features.push({ id: `face:boss-top:${i}`, kind: "face", label: `Boss ${i + 1} top`, point: [b.x, topY, b.z], dir: [0, 1, 0], size: [b.r * 2, b.r * 2] });
    features.push({ id: `axis:boss:${i}`, kind: "axis", label: `Boss ${i + 1}`, point: [b.x, topY, b.z], dir: [0, 1, 0], radius: b.hole / 2 || b.r, seat: `face:boss-top:${i}` });
  });
  const openings: Opening[] = (spec.openings ?? []).map((o) => {
    const y = -h / 2 + o.v;
    const center: Vec3 =
      o.side === "+x" ? [w / 2, y, o.u] : o.side === "-x" ? [-w / 2, y, o.u] : o.side === "+z" ? [o.u, y, d / 2] : [o.u, y, -d / 2];
    return { id: o.id, side: o.side, center, size: [o.w, o.h] };
  });
  return {
    solids,
    features,
    enclosure: { role: "base", cavity: { min: [-w / 2 + t, floorTop, -d / 2 + t], max: [w / 2 - t, h / 2, d / 2 - t] }, openings },
  };
}

/** One part for a 3D Module shape. Hidden shapes aren't parts (they are the
 *  build's own board and parts, seeded hidden, or the maker put them away). */
export function threePart(shape: SceneShape, index: number): AsmPart {
  const [sx, sy, sz] = shape.scale.map((v) => Math.abs(v)) as Vec3;
  const name = shape.name?.trim() || (shape.type === "enclosure" ? (shape.enclosure?.part === "lid" ? "Lid" : "Case") : `${TYPE_NAME[shape.type]} ${index + 1}`);
  const base: Omit<AsmPart, "solids" | "features"> = {
    id: threeInstanceId(shape.id),
    source: "three",
    ref: shape.id,
    name,
    origin: "From 3D Module · live",
    pins: [],
    defaultPose: { p: [shape.position[0] * U, shape.position[1] * U, shape.position[2] * U], q: fromEuler(shape.rotation) },
  };
  const c: Vec3 = [0, 0, 0];
  switch (shape.type) {
    case "enclosure":
      if (shape.enclosure) return { ...base, ...enclosurePart(shape, name) };
      return { ...base, solids: [], features: [] };
    case "box": {
      const size: Vec3 = [2 * U * sx, 2 * U * sy, 2 * U * sz];
      return { ...base, solids: [{ id: "body", name, shape: { kind: "box", center: c, size }, color: SHAPE_COLOR }], features: boxFaces("face:", name, c, size) };
    }
    case "cylinder": {
      const r = U * Math.max(sx, sz);
      const h = 2 * U * sy;
      return {
        ...base,
        solids: [{ id: "body", name, shape: { kind: "cyl", center: c, r, h }, color: SHAPE_COLOR }],
        features: [
          { id: "face:+y", kind: "face", label: `${name} top`, point: [0, h / 2, 0], dir: [0, 1, 0], size: [2 * r, 2 * r] },
          { id: "face:-y", kind: "face", label: `${name} bottom`, point: [0, -h / 2, 0], dir: [0, -1, 0], size: [2 * r, 2 * r] },
          { id: "axis:main", kind: "axis", label: `${name} axis`, point: [0, -h / 2, 0], dir: [0, 1, 0], radius: r, seat: "face:-y" },
        ],
        ...(sx !== sz ? { approximate: true } : {}),
      };
    }
    case "cone": {
      const r = 1.2 * U * Math.max(sx, sz);
      const h = 2.4 * U * sy;
      return {
        ...base,
        solids: [{ id: "body", name, shape: { kind: "cone", center: c, r, h }, color: SHAPE_COLOR }],
        features: [
          { id: "face:-y", kind: "face", label: `${name} base`, point: [0, -h / 2, 0], dir: [0, -1, 0], size: [2 * r, 2 * r] },
          { id: "axis:main", kind: "axis", label: `${name} axis`, point: [0, -h / 2, 0], dir: [0, 1, 0], radius: r, seat: "face:-y" },
        ],
      };
    }
    case "sphere": {
      const r = 1.2 * U * Math.max(sx, sy, sz);
      return {
        ...base,
        solids: [{ id: "body", name, shape: { kind: "sphere", center: c, r }, color: SHAPE_COLOR }],
        features: [{ id: "face:-y", kind: "face", label: `${name} bottom`, point: [0, -r, 0], dir: [0, -1, 0], size: [r, r] }],
        ...(sx !== sy || sy !== sz ? { approximate: true } : {}),
      };
    }
    case "torus": {
      // A torus lies in its local x/y plane (three's TorusGeometry); collide on its bounds.
      const ex = 1.4 * U * sx, ey = 1.4 * U * sy, ez = 0.4 * U * sz;
      const pts: Vec3[] = [];
      for (const x of [-ex, ex]) for (const y of [-ey, ey]) for (const z of [-ez, ez]) pts.push([x, y, z]);
      return {
        ...base,
        solids: [{ id: "body", name, shape: { kind: "hull", points: pts }, color: SHAPE_COLOR }],
        features: [{ id: "axis:main", kind: "axis", label: `${name} axis`, point: [0, 0, 0], dir: [0, 0, 1], radius: U * sx }],
        approximate: true,
      };
    }
    case "plane": {
      const size: Vec3 = [3 * U * sx, 3 * U * sy, 0.2];
      return {
        ...base,
        solids: [{ id: "body", name, shape: { kind: "box", center: c, size }, color: SHAPE_COLOR }],
        features: [
          { id: "face:+z", kind: "face", label: `${name} front`, point: [0, 0, 0.1], dir: [0, 0, 1], size: [size[0], size[1]] },
          { id: "face:-z", kind: "face", label: `${name} back`, point: [0, 0, -0.1], dir: [0, 0, -1], size: [size[0], size[1]] },
        ],
      };
    }
  }
}

/** Every visible shape of the 3D Module's document, as parts. */
export function threeParts(shapes: readonly SceneShape[]): AsmPart[] {
  if (isPristineScene(shapes)) return [];
  return shapes.map((s, i) => ({ s, i })).filter(({ s }) => !s.hidden).map(({ s, i }) => threePart(s, i));
}

/** The boss centres of an enclosure shape, in its frame — for the hole/boss match. */
export function bossesOf(shape: SceneShape): Array<[number, number]> {
  return shape.type === "enclosure" && shape.enclosure ? bossCentres(shape.enclosure, shape.scale) : [];
}
