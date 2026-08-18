"use client";

// Shared three.js meshes for the PCB board + its components. Rendered by BOTH
// the PCB module's 3D tab (read-only orbit viewer) and the Product Preview
// (selectable instances), so the board looks identical in the two places.

import * as React from "react";
import { Outlines } from "@react-three/drei";
import * as THREE from "three";
import type { Pcb3DBoard, Pcb3DComponent } from "@/lib/pcb/pcb-3d";
import type {
  Pcb3DScene,
  Pcb3DTrack,
  Pcb3DVia,
  Pcb3DPad,
  Pcb3DBody,
  Pcb3DRegion,
  Pcb3DSilk,
} from "@/lib/pcb/pcb-scene";
import { PAD_GOLD, VIA_HOLE } from "@/lib/pcb/pcb-scene";

const PCB_TRACE = "#22d3a6";
const COMPONENT_COLOR = "#1f2937";
const HIGHLIGHT = "#a78bfa";

export function PcbBoardMesh({
  board,
  selected = false,
  onSelect,
  onContextMenu,
}: {
  board: Pcb3DBoard;
  selected?: boolean;
  onSelect?: () => void;
  onContextMenu?: (x: number, y: number) => void;
}) {
  // Board is a flat box: width × thickness × depth, centered at origin with
  // top surface at y = thickness/2. Slight bevel via Outlines if selected.
  return (
    <mesh
      castShadow
      receiveShadow
      position={[0, board.thickness / 2, 0]}
      userData={{ previewId: "pcb-board" }}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
      onContextMenu={
        onContextMenu
          ? (e) => {
              e.stopPropagation();
              e.nativeEvent.preventDefault();
              onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
            }
          : undefined
      }
    >
      <boxGeometry args={[board.width, board.thickness, board.depth]} />
      <meshStandardMaterial
        color={board.color}
        roughness={0.55}
        metalness={0.15}
      />
      {selected && <Outlines thickness={3} color={HIGHLIGHT} />}
      {/* Faux silkscreen accent strip */}
      <mesh position={[0, board.thickness / 2 + 0.001, 0]}>
        <ringGeometry
          args={[
            Math.min(board.width, board.depth) * 0.35,
            Math.min(board.width, board.depth) * 0.36,
            64,
          ]}
        />
        <meshBasicMaterial color={PCB_TRACE} side={THREE.DoubleSide} />
      </mesh>
    </mesh>
  );
}

export function PcbComponentMesh({
  component,
  board,
  selected = false,
  onSelect,
  onContextMenu,
}: {
  component: Pcb3DComponent;
  board: Pcb3DBoard;
  selected?: boolean;
  onSelect?: () => void;
  onContextMenu?: (x: number, y: number) => void;
}) {
  const h = component.height ?? 0.18;
  // Component's local origin (PCB coords) → world: center the board on origin
  // and offset by component position, place ON TOP of board.
  const x = component.x - board.width / 2;
  const z = component.y - board.depth / 2;
  const y = board.thickness + h / 2;
  const w = component.w ?? 0.4;
  const d = component.d ?? 0.4;

  // Pick a geometry that suits the component kind. Most "components" are
  // boxes; capacitors / cylinders use cylinderGeometry.
  const geom = component.kind === "capacitor" ? "cylinder" : "box";

  return (
    <mesh
      castShadow
      receiveShadow
      position={[x, y, z]}
      userData={{ previewId: component.id }}
      onClick={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
      onContextMenu={
        onContextMenu
          ? (e) => {
              e.stopPropagation();
              e.nativeEvent.preventDefault();
              onContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY);
            }
          : undefined
      }
    >
      {geom === "cylinder" ? (
        <cylinderGeometry args={[Math.min(w, d) / 2, Math.min(w, d) / 2, h, 24]} />
      ) : (
        <boxGeometry args={[w, h, d]} />
      )}
      <meshStandardMaterial
        color={selected ? HIGHLIGHT : component.color ?? COMPONENT_COLOR}
        roughness={0.45}
        metalness={0.35}
      />
      {selected && <Outlines thickness={3} color={HIGHLIGHT} />}
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL PCB-2D SCENE MESHES — used by the PCB module's 3D tab (PcbSceneView) to
// render the actual placed objects (board slab + copper tracks + vias + pads +
// component bodies + copper regions) mapped 1:1 from the 2D layout.
// ─────────────────────────────────────────────────────────────────────────────

// The routed substrate showing at the board's edge — glass-epoxy, not mask.
const BOARD_EDGE = "#c8b183";
const EPS = 0.012; // copper offset above/below the board surface

// Board substrate — a plain slab (no faux silkscreen ring), top surface at
// y = thickness, centred on the origin. Finish (roughness/metalness) comes from
// the Board Material selection.
export function PcbSlabMesh({ board }: { board: Pcb3DScene["board"] }) {
  // With cutouts the slab stops being a box: the outline becomes a shape with
  // real holes, extruded through the thickness — so a cutout is a hole you can
  // see through, not a decal on the surface. No cutouts → keep the cheap box.
  const holed = React.useMemo(() => {
    if (!board.cutouts?.length && !board.outline) return null;
    const outline = new THREE.Shape();
    const hw = board.width / 2, hd = board.depth / 2;
    // Shape space is XY and the slab is rotated onto XZ below (Rx(90°) maps
    // shape-Y → world +Z), so a world z maps to shape-y directly.
    const o = board.outline;
    if (o?.shape === "circle") {
      outline.absarc(o.x, o.z, o.r, 0, Math.PI * 2, false);
    } else if (o?.shape === "poly" && o.pts.length > 2) {
      outline.moveTo(o.pts[0][0], o.pts[0][1]);
      for (const [qx, qz] of o.pts.slice(1)) outline.lineTo(qx, qz);
      outline.closePath();
    } else if (o?.shape === "rect") {
      outline.moveTo(o.x - o.w / 2, o.z - o.d / 2);
      outline.lineTo(o.x + o.w / 2, o.z - o.d / 2);
      outline.lineTo(o.x + o.w / 2, o.z + o.d / 2);
      outline.lineTo(o.x - o.w / 2, o.z + o.d / 2);
      outline.closePath();
    } else {
      outline.moveTo(-hw, -hd);
      outline.lineTo(hw, -hd);
      outline.lineTo(hw, hd);
      outline.lineTo(-hw, hd);
      outline.closePath();
    }
    for (const c of board.cutouts) {
      const hole = new THREE.Path();
      const x1 = c.x - c.w / 2, x2 = c.x + c.w / 2;
      // Rx(90°) maps shape-Y → world +Z (no flip): the same mapping
      // PcbRegionMesh uses, which is the known-good path.
      const y1 = c.z - c.d / 2, y2 = c.z + c.d / 2;
      hole.moveTo(x1, y1);
      hole.lineTo(x1, y2);
      hole.lineTo(x2, y2);
      hole.lineTo(x2, y1);
      hole.closePath();
      outline.holes.push(hole);
    }
    return new THREE.ExtrudeGeometry(outline, { depth: board.thickness, bevelEnabled: false });
  }, [board.cutouts, board.outline, board.width, board.depth, board.thickness]);

  React.useEffect(() => () => holed?.dispose(), [holed]);

  if (holed) {
    return (
      <mesh receiveShadow geometry={holed} rotation={[Math.PI / 2, 0, 0]} position={[0, board.thickness, 0]}>
        <meshStandardMaterial color={board.color} roughness={board.roughness} metalness={board.metalness} side={THREE.DoubleSide} />
      </mesh>
    );
  }
  // UIUX-2 — the slab isn't one flat colour: the faces carry the solder mask,
  // the four edges show the routed substrate underneath. A box's faces are
  // ordered +X, -X, +Y, -Y, +Z, -Z, so the two Y faces take the mask and the
  // rest take the edge — which is what a routed board edge actually looks like.
  return (
    <mesh receiveShadow position={[0, board.thickness / 2, 0]}>
      <boxGeometry args={[board.width, board.thickness, board.depth]} />
      <meshStandardMaterial attach="material-0" color={BOARD_EDGE} roughness={0.85} metalness={0} />
      <meshStandardMaterial attach="material-1" color={BOARD_EDGE} roughness={0.85} metalness={0} />
      <meshStandardMaterial attach="material-2" color={board.color} roughness={board.roughness} metalness={board.metalness} />
      <meshStandardMaterial attach="material-3" color={board.color} roughness={board.roughness} metalness={board.metalness} />
      <meshStandardMaterial attach="material-4" color={BOARD_EDGE} roughness={0.85} metalness={0} />
      <meshStandardMaterial attach="material-5" color={BOARD_EDGE} roughness={0.85} metalness={0} />
    </mesh>
  );
}

// Silkscreen outline — a thin white plate a touch larger than the part, so a
// printed border shows around it. Standard silkscreen = matte; UV = glossier.
export function PcbSilkMesh({
  s,
  thickness,
  color,
  glossy,
  lift = 0,
}: {
  s: Pcb3DSilk;
  thickness: number;
  color: string;
  glossy: boolean;
  lift?: number;
}) {
  // UIUX-2 — silkscreen is printed *marking*, not just an outline: the part's
  // designator is drawn to a canvas and laid on the board beside its outline,
  // so the board reads the way a printed one does. Rendered at the silk's own
  // finish colour, so Standard vs UV still changes it.
  const tex = React.useMemo(() => {
    if (!s.label) return null;
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 128;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = color;
    ctx.font = "bold 84px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label, cv.width / 2, cv.height / 2);
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 4;
    return t;
  }, [s.label, color]);
  React.useEffect(() => () => tex?.dispose(), [tex]);

  // A printed designator is about as wide as the part it names — small enough
  // not to crowd the board, big enough to read when you zoom to it.
  const labelW = Math.max(s.w * 1.6, 0.4);
  return (
    <group position={[s.x, thickness + 0.004 + lift, s.z]} rotation={[0, -s.rot, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[s.w, 0.008, s.d]} />
        <meshStandardMaterial color={color} roughness={glossy ? 0.35 : 0.92} metalness={0} />
      </mesh>
      {tex && (
        <mesh position={[0, 0.006, -(s.d / 2 + labelW * 0.17)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[labelW, labelW / 2]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// Copper track — a thin ribbon laid along its segment on the top/bottom surface.
export function PcbTrackMesh({ t, thickness, lift = 0 }: { t: Pcb3DTrack; thickness: number; lift?: number }) {
  const dx = t.x2 - t.x1;
  const dz = t.z2 - t.z1;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return null;
  const angle = Math.atan2(dz, dx);
  const y = (t.top ? thickness + EPS : -EPS) + lift;
  return (
    <mesh
      position={[(t.x1 + t.x2) / 2, y, (t.z1 + t.z2) / 2]}
      rotation={[0, -angle, 0]}
      castShadow
    >
      <boxGeometry args={[len, 0.022, t.width]} />
      <meshStandardMaterial color={t.color} roughness={0.34} metalness={0.85} />
    </mesh>
  );
}

// Via — a plated barrel through the board with a dark plated hole. Barrel
// plating colour follows the Pad Plating Color selection.
export function PcbViaMesh({ v, thickness, color = PAD_GOLD }: { v: Pcb3DVia; thickness: number; color?: string }) {
  return (
    <group position={[v.x, thickness / 2, v.z]}>
      <mesh castShadow>
        <cylinderGeometry args={[v.outer / 2, v.outer / 2, thickness + 0.06, 20]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[v.hole / 2, v.hole / 2, thickness + 0.12, 20]} />
        <meshStandardMaterial color={VIA_HOLE} roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  );
}

// Copper pad — a flat plated rectangle flush on the top surface. Plating
// colour follows the Pad Plating Color selection.
export function PcbPadMesh({ p, thickness, color = PAD_GOLD, lift = 0 }: { p: Pcb3DPad; thickness: number; color?: string; lift?: number }) {
  return (
    <mesh position={[p.x, thickness + EPS - 0.003 + lift, p.z]} rotation={[0, -p.rot, 0]} castShadow>
      <boxGeometry args={[p.w, 0.02, p.d]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.9} />
    </mesh>
  );
}

// Component body — the physical part sitting on top of the board.
// UIUX-2 — a part is drawn as the thing it is, not one black box for every
// footprint on the board: a chip has metallised end caps, a diode is a barrel
// with its cathode band, an IC carries its pin-1 dot, a can stands up with its
// crimp, a connector shows its housing wall. All built from the land pattern's
// own dimensions, so nothing needs a 3D asset library to look right.
const TERMINAL = "#c9ccd1"; // tinned end cap / lead
const BAND = "#e8eaed";     // cathode band, pin-1 mark

export function PcbBodyMesh({ b, thickness, lift = 0 }: { b: Pcb3DBody; thickness: number; lift?: number }) {
  const y = thickness + EPS + lift;
  const shape = b.shape ?? "box";

  if (shape === "chip") {
    // Chip resistor / MLCC: dark body with a tinned cap at each end.
    const cap = b.w * 0.18;
    return (
      <group position={[b.x, y, b.z]} rotation={[0, -b.rot, 0]}>
        <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[b.w - cap * 2, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.55} metalness={0.15} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (b.w - cap) / 2, b.h / 2, 0]} castShadow>
            <boxGeometry args={[cap, b.h * 1.02, b.d * 1.02]} />
            <meshStandardMaterial color={TERMINAL} roughness={0.3} metalness={0.75} />
          </mesh>
        ))}
      </group>
    );
  }

  if (shape === "diode") {
    // A barrel lying along the part, its cathode band at one end, leads out.
    const r = Math.min(b.d, b.h * 2.2) / 2;
    const len = b.w * 0.66;
    return (
      <group position={[b.x, y + r, b.z]} rotation={[0, -b.rot, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r, len, 16]} />
          <meshStandardMaterial color={b.color} roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[-len * 0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[r * 1.04, r * 1.04, len * 0.16, 16]} />
          <meshStandardMaterial color={BAND} roughness={0.5} metalness={0.1} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (len / 2 + b.w * 0.09), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.22, r * 0.22, b.w * 0.18, 8]} />
            <meshStandardMaterial color={TERMINAL} roughness={0.3} metalness={0.8} />
          </mesh>
        ))}
      </group>
    );
  }

  if (shape === "ic") {
    // A taller moulded body with a chamfered top and a pin-1 dot.
    const r = Math.min(b.w, b.d) * 0.09;
    return (
      <group position={[b.x, y, b.z]} rotation={[0, -b.rot, 0]}>
        <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.62} metalness={0.08} />
        </mesh>
        <mesh position={[-b.w / 2 + r * 2, b.h + 0.002, -b.d / 2 + r * 2]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r, 14]} />
          <meshStandardMaterial color={BAND} roughness={0.6} metalness={0} />
        </mesh>
      </group>
    );
  }

  if (shape === "can") {
    // An upright can — electrolytic / choke — with a crimped top rim.
    const r = Math.min(b.w, b.d) / 2;
    const h = Math.max(b.h, r * 1.6);
    return (
      <group position={[b.x, y, b.z]} rotation={[0, -b.rot, 0]}>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r, h, 20]} />
          <meshStandardMaterial color={b.color} roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, h * 0.94, 0]} castShadow>
          <cylinderGeometry args={[r * 1.05, r * 1.05, h * 0.09, 20]} />
          <meshStandardMaterial color={TERMINAL} roughness={0.35} metalness={0.6} />
        </mesh>
      </group>
    );
  }

  if (shape === "connector") {
    // A housing: base plus a raised wall along one side, so it reads as
    // something you plug into rather than a block.
    const wall = b.d * 0.22;
    const h = Math.max(b.h, 0.5);
    return (
      <group position={[b.x, y, b.z]} rotation={[0, -b.rot, 0]}>
        <mesh position={[0, h * 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[b.w, h * 0.6, b.d]} />
          <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, h * 0.8, -b.d / 2 + wall / 2]} castShadow>
          <boxGeometry args={[b.w, h * 0.8, wall]} />
          <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.05} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh
      position={[b.x, thickness + b.h / 2 + EPS + lift, b.z]}
      rotation={[0, -b.rot, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[b.w, b.h, b.d]} />
      <meshStandardMaterial color={b.color} roughness={0.5} metalness={0.25} />
    </mesh>
  );
}

// Copper region / pour — a filled polygon on the top/bottom surface.
export function PcbRegionMesh({ r, thickness, lift = 0 }: { r: Pcb3DRegion; thickness: number; lift?: number }) {
  const geom = React.useMemo(() => {
    const shape = new THREE.Shape();
    r.pts.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    // ShapeGeometry lives in XY; rotate into the XZ ground plane.
    g.rotateX(Math.PI / 2);
    return g;
  }, [r.pts]);
  const y = (r.top ? thickness + EPS - 0.004 : -EPS + 0.004) + lift;
  return (
    <mesh geometry={geom} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial
        color={r.color}
        roughness={0.4}
        metalness={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Whole scene group — convenience wrapper the 3D tab renders. `explode` lifts
// the layer stack apart vertically (top copper up, bottom copper down, bodies
// highest). The group is offset by the board's PCB-Height-from-Bottom, and
// `expose` (Layer Expose) raises the exposed copper proud of the mask.
export function PcbSceneMeshes({ scene, explode = false, outline = false }: { scene: Pcb3DScene; explode?: boolean; outline?: boolean }) {
  const th = scene.board.thickness;
  const gap = explode ? 0.7 : 0; // vertical separation between stack levels
  const exp = scene.expose; // extra copper proudness above/below the mask
  // UIUX-89 — Outline view is a render style, not a 2D-only setting: in 3D it
  // draws the same geometry as edges so the stack can be seen through. Applied
  // by walking the scene rather than threading a flag into every material.
  const groupRef = React.useRef<THREE.Group>(null);
  React.useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material;
      if (!mat) return;
      for (const m of Array.isArray(mat) ? mat : [mat]) {
        if ("wireframe" in m) (m as THREE.MeshStandardMaterial).wireframe = outline;
      }
    });
  });
  return (
    <group ref={groupRef} name="pcb-scene" position={[0, scene.board.yOffset, 0]}>
      <PcbSlabMesh board={scene.board} />
      {scene.silk.map((s) => (
        <PcbSilkMesh key={s.id} s={s} thickness={th} color={scene.silkColor} glossy={scene.silkGlossy} lift={gap} />
      ))}
      {scene.regions.map((r) => (
        <PcbRegionMesh key={r.id} r={r} thickness={th} lift={(r.top ? gap : -gap) + (r.top ? exp : -exp)} />
      ))}
      {scene.tracks.map((t) => (
        <PcbTrackMesh key={t.id} t={t} thickness={th} lift={(t.top ? gap : -gap) + (t.top ? exp : -exp)} />
      ))}
      {scene.pads.map((p) => (
        <PcbPadMesh key={p.id} p={p} thickness={th} color={scene.padColor} lift={gap + exp} />
      ))}
      {scene.vias.map((v) => (
        <PcbViaMesh key={v.id} v={v} thickness={th} color={scene.padColor} />
      ))}
      {scene.bodies.map((b) => (
        <PcbBodyMesh key={b.id} b={b} thickness={th} lift={gap * 2.2} />
      ))}
    </group>
  );
}
