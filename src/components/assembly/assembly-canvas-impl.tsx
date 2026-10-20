"use client";

// Assembly's 3D canvas, in millimetres (y up). It draws the composed scene —
// every part's solids at its solved place — and whatever the open tool
// needs: the grabbable features while snapping, the pins in Wiring mode, the
// routed wires, the measure line, the section plane, the move/rotate gizmo.
// Every pick goes back to the store; nothing here decides anything.

import * as React from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { GizmoHelper, GizmoViewcube, Grid, Html, OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { apply, applyDir, type Pose, type Vec3 } from "@/lib/assembly/math";
import { explodeOffsets, sceneBounds, type AsmScene, type SceneItem } from "@/lib/assembly/scene";
import type { Feature, Solid } from "@/lib/assembly/types";
import type { WireGeom } from "@/lib/assembly/wiring";
import type { MateEnd, WireEnd, WireRec } from "@/lib/assembly/types";

export type CanvasView = "iso" | "front" | "top" | "right";

export type AssemblyCanvasProps = {
  scene: AsmScene;
  wires: ReadonlyArray<{ rec: WireRec; geom: WireGeom }>;
  mode: "assembly" | "wiring" | "preview";
  selectedInst: string | null;
  selectedWire: string | null;
  problemSolids: ReadonlyArray<{ inst: string; solid: string }>;
  tool: null | "move" | "rotate" | "snap" | "measure" | "wire";
  snapFrom: MateEnd | null;
  wireFrom: WireEnd | null;
  measure: readonly Vec3[];
  section: { on: boolean; axis: "x" | "y" | "z"; at: number };
  explode: number;
  hideLid: boolean;
  labels: boolean;
  fitTick: number;
  view: { name: CanvasView; tick: number };
  turntable: boolean;
  onSelectInst: (id: string | null) => void;
  onSelectWire: (id: string) => void;
  onPickFeature: (end: MateEnd) => void;
  onPickPin: (end: WireEnd) => void;
  onMeasurePoint: (p: Vec3) => void;
  onWirePoint: (wireId: string, p: Vec3) => void;
  onMovePreview: (id: string, pose: Pose) => void;
  onMoveCommit: (id: string, pose: Pose) => void;
};

const BRAND = "#7c2db9";
const BRAND_LIGHT = "#bb96fc";
const PROBLEM = "#ef4444";

export function AssemblyCanvasImpl(props: AssemblyCanvasProps) {
  return (
    <Canvas
      camera={{ position: [160, 140, 190], fov: 35, near: 0.5, far: 6000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true, localClippingEnabled: true }}
      style={{ position: "absolute", inset: 0 }}
      onPointerMissed={() => {
        if (props.tool !== "measure" && props.tool !== "snap" && props.tool !== "wire") props.onSelectInst(null);
      }}
    >
      <Contents {...props} />
    </Canvas>
  );
}

function Contents(props: AssemblyCanvasProps) {
  const { scene, mode, section, explode, fitTick, view } = props;
  const controls = React.useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, gl } = useThree();
  const offsets = React.useMemo(() => (explode > 0 ? explodeOffsets(scene, explode) : null), [scene, explode]);

  const clip = React.useMemo(() => {
    if (!section.on) return [];
    const n = section.axis === "x" ? new THREE.Vector3(-1, 0, 0) : section.axis === "y" ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 0, -1);
    return [new THREE.Plane(n, section.at)];
  }, [section]);
  React.useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  // Frame the whole assembly (on open, Bring in, Fit view) or look from one side.
  const frame = React.useCallback(
    (side: CanvasView) => {
      const b = sceneBounds(scene);
      const center = b ? new THREE.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2) : new THREE.Vector3();
      const size = b ? Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2], 30) : 120;
      const d = size * 2.1;
      const dir =
        side === "front" ? new THREE.Vector3(0, 0, 1) : side === "top" ? new THREE.Vector3(0, 1, 0.0001) : side === "right" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0.8, 0.7, 1).normalize();
      camera.position.copy(center.clone().add(dir.multiplyScalar(d)));
      camera.lookAt(center);
      controls.current?.target.copy(center);
      controls.current?.update();
    },
    [camera, scene],
  );
  const fitDone = React.useRef(-1);
  React.useEffect(() => {
    if (fitDone.current === fitTick) return;
    fitDone.current = fitTick;
    frame("iso");
  }, [fitTick, frame]);
  React.useEffect(() => {
    if (view.tick > 0) frame(view.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.tick]);

  const wiring = mode === "wiring";
  const problem = (inst: string, solid: string) => props.problemSolids.some((p) => p.inst === inst && p.solid === solid);

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[200, 320, 160]} intensity={1.05} />
      <directionalLight position={[-180, 120, -140]} intensity={0.35} />
      <Grid
        args={[600, 600]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#7b8494"
        sectionSize={50}
        sectionThickness={1}
        sectionColor={BRAND}
        fadeDistance={900}
        fadeStrength={1.4}
        infiniteGrid
        followCamera={false}
        position={[0, -0.05, 0]}
      />
      <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.1} minDistance={8} maxDistance={2500} autoRotate={props.turntable} autoRotateSpeed={1.2} />
      <GizmoHelper alignment="top-right" margin={[72, 72]}>
        <GizmoViewcube color="#ffffff" textColor="#334155" strokeColor={BRAND} />
      </GizmoHelper>

      {scene.items.map((item) => {
        if (item.rec.hidden) return null;
        if (props.hideLid && item.part.enclosure?.role === "lid") return null;
        const off = offsets?.get(item.rec.id);
        const pose: Pose = off ? { p: [item.pose.p[0] + off[0], item.pose.p[1] + off[1], item.pose.p[2] + off[2]], q: item.pose.q } : item.pose;
        return (
          <ItemMesh
            key={item.rec.id}
            item={item}
            pose={pose}
            clip={clip}
            selected={props.selectedInst === item.rec.id}
            faded={wiring}
            problem={problem}
            label={props.labels && explode > 0.02 ? item.part.name : null}
            onClick={(e) => {
              if (props.tool === "measure") {
                e.stopPropagation();
                props.onMeasurePoint([e.point.x, e.point.y, e.point.z]);
                return;
              }
              if (props.tool === "snap" || props.tool === "wire" || mode === "wiring") return;
              e.stopPropagation();
              props.onSelectInst(item.rec.id);
            }}
          />
        );
      })}

      {props.tool === "snap" && mode === "assembly" && <FeatureMarkers {...props} />}

      {(wiring || mode === "preview") &&
        explode === 0 &&
        props.wires.map(({ rec, geom }) => (
          <WireMesh
            key={rec.id}
            rec={rec}
            geom={geom}
            clip={clip}
            selected={props.selectedWire === rec.id}
            onClick={() => wiring && props.onSelectWire(rec.id)}
            onDouble={(p) => wiring && props.onWirePoint(rec.id, p)}
          />
        ))}
      {mode === "assembly" && explode === 0 && props.wires.map(({ rec, geom }) => <WireMesh key={rec.id} rec={rec} geom={geom} clip={clip} selected={false} quiet />)}

      {wiring && <PinMarkers {...props} />}

      {props.measure.length > 0 && <MeasureLine points={props.measure} />}
      {section.on && <SectionPlane section={section} scene={scene} />}
      {props.selectedInst && (props.tool === "move" || props.tool === "rotate") && <Gizmo {...props} id={props.selectedInst} />}
    </>
  );
}

// ───────────────────────────── parts ─────────────────────────────

function quat(q?: [number, number, number, number]) {
  return q ? new THREE.Quaternion(q[0], q[1], q[2], q[3]) : new THREE.Quaternion();
}

function slabGeometry(s: NonNullable<Solid["slab"]>) {
  const shape = new THREE.Shape(s.outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of s.holes) {
    const path = new THREE.Path();
    if ("r" in h) path.absarc(h.x, -h.z, h.r, 0, Math.PI * 2, true);
    else {
      path.moveTo(h.x - h.w / 2, -(h.z - h.d / 2));
      path.lineTo(h.x - h.w / 2, -(h.z + h.d / 2));
      path.lineTo(h.x + h.w / 2, -(h.z + h.d / 2));
      path.lineTo(h.x + h.w / 2, -(h.z - h.d / 2));
      path.closePath();
    }
    shape.holes.push(path);
  }
  return new THREE.ExtrudeGeometry(shape, { depth: s.thickness, bevelEnabled: false, curveSegments: 24 });
}

function SolidMesh({ solid, color, opacity, emissive, clip }: { solid: Solid; color: string; opacity: number; emissive: string | null; clip: THREE.Plane[] }) {
  const geometry = React.useMemo(() => {
    if (solid.slab) return slabGeometry(solid.slab);
    const sh = solid.shape;
    switch (sh.kind) {
      case "box":
        return new THREE.BoxGeometry(sh.size[0], sh.size[1], sh.size[2]);
      case "cyl":
        return new THREE.CylinderGeometry(sh.r, sh.r, sh.h, 32);
      case "cone":
        return new THREE.ConeGeometry(sh.r, sh.h, 32);
      case "sphere":
        return new THREE.SphereGeometry(sh.r, 32, 20);
      case "hull": {
        const box = new THREE.Box3().setFromPoints(sh.points.map((p) => new THREE.Vector3(...p)));
        const size = box.getSize(new THREE.Vector3());
        return new THREE.BoxGeometry(size.x, size.y, size.z);
      }
    }
  }, [solid]);
  React.useEffect(() => () => geometry.dispose(), [geometry]);
  const sh = solid.shape;
  const position: Vec3 = solid.slab
    ? [0, solid.slab.y0, 0]
    : sh.kind === "hull"
      ? (() => {
          const box = new THREE.Box3().setFromPoints(sh.points.map((p) => new THREE.Vector3(...p)));
          const c = box.getCenter(new THREE.Vector3());
          return [c.x, c.y, c.z] as Vec3;
        })()
      : sh.center;
  const rotation = solid.slab ? new THREE.Euler(-Math.PI / 2, 0, 0) : undefined;
  const quaternion = !solid.slab && "q" in sh ? quat(sh.q) : undefined;
  const translucent = opacity < 0.99;
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} quaternion={quaternion}>
      <meshStandardMaterial
        color={color}
        transparent={translucent}
        opacity={opacity}
        depthWrite={!translucent}
        roughness={0.55}
        metalness={0.12}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 0.45 : 0}
        clippingPlanes={clip}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ItemMesh({
  item,
  pose,
  clip,
  selected,
  faded,
  problem,
  label,
  onClick,
}: {
  item: SceneItem;
  pose: Pose;
  clip: THREE.Plane[];
  selected: boolean;
  faded: boolean;
  problem: (inst: string, solid: string) => boolean;
  label: string | null;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const box = React.useMemo(() => {
    const b = new THREE.Box3();
    for (const s of item.part.solids) {
      const c = s.slab ? null : s.shape.kind === "hull" ? null : s.shape.center;
      if (c) b.expandByPoint(new THREE.Vector3(...c));
    }
    return b;
  }, [item.part.solids]);
  return (
    <group position={pose.p} quaternion={quat(pose.q)} onClick={onClick} userData={{ instance: item.rec.id }}>
      {item.part.solids.map((s) => {
        const bad = problem(item.rec.id, s.id);
        const base = s.translucent ? 0.32 : 1;
        const opacity = faded ? Math.min(base, 0.28) : item.placed ? base : Math.min(base, 0.75);
        return <SolidMesh key={s.id} solid={s} color={s.color} opacity={opacity} emissive={bad ? PROBLEM : selected ? BRAND : null} clip={clip} />;
      })}
      {label && !box.isEmpty() && (
        <Html position={[box.max.x + 6, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2]} distanceFactor={undefined} style={{ pointerEvents: "none" }}>
          <span className="whitespace-nowrap rounded-md border border-solid border-border-default bg-bg-surface px-3 py-1 text-xs font-semibold leading-xs text-text-primary shadow-2">{label}</span>
        </Html>
      )}
    </group>
  );
}

// ───────────────────────────── snap features ─────────────────────────────

function FeatureMarkers(props: AssemblyCanvasProps) {
  const { scene, snapFrom } = props;
  const [hover, setHover] = React.useState<string | null>(null);
  // Stage 1: the parts that can move. Stage 2: every other part.
  const items = scene.items.filter((i) => !i.rec.hidden && !i.copyOf && (snapFrom ? i.rec.id !== snapFrom.inst : !i.rec.grounded));
  return (
    <>
      {items.flatMap((item) =>
        item.part.features.map((f) => {
          const key = `${item.rec.id}|${f.id}`;
          const picked = snapFrom?.inst === item.rec.id && snapFrom.feature === f.id;
          return (
            <FeatureMarker
              key={key}
              feature={f}
              pose={item.pose}
              hot={hover === key}
              picked={picked}
              onOver={() => setHover(key)}
              onOut={() => setHover((h) => (h === key ? null : h))}
              onPick={() => props.onPickFeature({ inst: item.rec.id, feature: f.id })}
            />
          );
        }),
      )}
      {snapFrom &&
        (() => {
          const item = scene.items.find((i) => i.rec.id === snapFrom.inst);
          const f = item?.part.features.find((x) => x.id === snapFrom.feature);
          return item && f ? <FeatureMarker feature={f} pose={item.pose} hot picked onOver={() => {}} onOut={() => {}} onPick={() => {}} /> : null;
        })()}
    </>
  );
}

function FeatureMarker({ feature, pose, hot, picked, onOver, onOut, onPick }: { feature: Feature; pose: Pose; hot: boolean; picked: boolean; onOver: () => void; onOut: () => void; onPick: () => void }) {
  const p = apply(pose, feature.point);
  const d = applyDir(pose, feature.dir);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...d));
  const lift = 0.25;
  const at: Vec3 = [p[0] + d[0] * lift, p[1] + d[1] * lift, p[2] + d[2] * lift];
  const color = picked ? "#22c55e" : hot ? BRAND : BRAND_LIGHT;
  const events = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onOver();
    },
    onPointerOut: () => onOut(),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onPick();
    },
  };
  if (feature.kind === "axis") {
    const r = Math.max(1.2, (feature.radius ?? 1.5) + 0.6);
    return (
      <mesh position={at} quaternion={q} {...events}>
        <torusGeometry args={[r, Math.max(0.35, r * 0.18), 10, 32]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.95} />
        {hot && <Tip text={feature.label} />}
      </mesh>
    );
  }
  const size = feature.size ?? [6, 6];
  const r = Math.max(1.4, Math.min(5, Math.min(size[0], size[1]) / 5));
  return (
    <mesh position={at} quaternion={q} {...events}>
      <circleGeometry args={[r, 28]} />
      <meshBasicMaterial color={color} depthTest={false} transparent opacity={hot || picked ? 0.95 : 0.6} side={THREE.DoubleSide} />
      {hot && <Tip text={feature.label} />}
    </mesh>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <Html style={{ pointerEvents: "none" }} position={[0, 0, 2]}>
      <span className="whitespace-nowrap rounded-md bg-bg-toast px-3 py-1 text-xs font-semibold leading-xs text-text-on-toast">{text}</span>
    </Html>
  );
}

// ───────────────────────────── wiring ─────────────────────────────

function PinMarkers(props: AssemblyCanvasProps) {
  const [hover, setHover] = React.useState<string | null>(null);
  return (
    <>
      {props.scene.items.flatMap((item) => {
        if (!item.placed || item.rec.hidden) return [];
        return item.part.pins.map((pin) => {
          const key = `${item.rec.id}|${pin.id}`;
          const p = apply(item.pose, pin.point);
          const picked = props.wireFrom?.inst === item.rec.id && props.wireFrom.pin === pin.id;
          const lead = item.part.source !== "pcb";
          return (
            <mesh
              key={key}
              position={p}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover(key);
              }}
              onPointerOut={() => setHover((h) => (h === key ? null : h))}
              onClick={(e) => {
                e.stopPropagation();
                props.onPickPin({ inst: item.rec.id, pin: pin.id });
              }}
            >
              <sphereGeometry args={[lead ? 1.1 : 0.7, 16, 12]} />
              <meshBasicMaterial color={picked ? "#22c55e" : hover === key ? BRAND : lead ? BRAND : BRAND_LIGHT} depthTest={false} transparent />
              {hover === key && <Tip text={`${pin.label}${pin.net ? ` · ${pin.net}` : pin.netHint ? ` · wants ${pin.netHint}` : ""}`} />}
            </mesh>
          );
        });
      })}
    </>
  );
}

function WireMesh({
  rec,
  geom,
  clip,
  selected,
  quiet,
  onClick,
  onDouble,
}: {
  rec: WireRec;
  geom: WireGeom;
  clip: THREE.Plane[];
  selected: boolean;
  quiet?: boolean;
  onClick?: () => void;
  onDouble?: (p: Vec3) => void;
}) {
  const parts = React.useMemo(() => {
    if (geom.path.length < 2) return null;
    const pts = geom.path.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < pts.length; i++) curve.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
    const tube = new THREE.TubeGeometry(curve as unknown as THREE.Curve<THREE.Vector3>, Math.max(8, pts.length * 3), geom.od / 2, 10, false);
    // Heat-shrink sleeves over each end, 8 mm long.
    const sleeve = (from: THREE.Vector3, dir: THREE.Vector3) => {
      const len = 8;
      const c = from.clone().add(dir.clone().multiplyScalar(len / 2));
      const g = new THREE.CylinderGeometry(geom.od / 2 + rec.sleeveMm, geom.od / 2 + rec.sleeveMm, len, 14);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      return { g, c, q };
    };
    const a = sleeve(pts[0], pts[Math.min(1, pts.length - 1)].clone().sub(pts[0]).normalize());
    const b = sleeve(pts[pts.length - 1], pts[pts.length - 2].clone().sub(pts[pts.length - 1]).normalize());
    return { tube, sleeves: [a, b] };
  }, [geom.path, geom.od, rec.sleeveMm]);
  React.useEffect(
    () => () => {
      parts?.tube.dispose();
      parts?.sleeves.forEach((s) => s.g.dispose());
    },
    [parts],
  );
  if (!parts) return null;
  const bad = !geom.ok || geom.tight || geom.through.length > 0;
  return (
    <group
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick();
      }}
      onDoubleClick={(e) => {
        if (!onDouble) return;
        e.stopPropagation();
        onDouble([e.point.x, e.point.y, e.point.z]);
      }}
    >
      <mesh geometry={parts.tube}>
        <meshStandardMaterial color={rec.color} roughness={0.45} emissive={selected ? BRAND : bad && !quiet ? "#f59e0b" : "#000000"} emissiveIntensity={selected || (bad && !quiet) ? 0.5 : 0} clippingPlanes={clip} transparent={quiet} opacity={quiet ? 0.55 : 1} />
      </mesh>
      {parts.sleeves.map((s, i) => (
        <mesh key={i} geometry={s.g} position={s.c} quaternion={s.q}>
          <meshStandardMaterial color="#2a2f37" roughness={0.6} clippingPlanes={clip} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────────── measure, section, gizmo ─────────────────────────────

function MeasureLine({ points }: { points: readonly Vec3[] }) {
  const a = points[0];
  const b = points[1];
  const geometry = React.useMemo(() => (b ? new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]) : null), [a, b]);
  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.9, 14, 10]} />
          <meshBasicMaterial color="#22c55e" depthTest={false} transparent />
        </mesh>
      ))}
      {geometry && b && (
        <>
          <lineSegments geometry={geometry}>
            <lineBasicMaterial color={BRAND} depthTest={false} transparent />
          </lineSegments>
          <Html position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} style={{ pointerEvents: "none" }}>
            <span className="whitespace-nowrap rounded-md bg-bg-toast px-3 py-1 font-mono text-xs leading-xs text-text-on-toast">{Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]).toFixed(2)} mm</span>
          </Html>
        </>
      )}
    </>
  );
}

function SectionPlane({ section, scene }: { section: { axis: "x" | "y" | "z"; at: number }; scene: AsmScene }) {
  const b = sceneBounds(scene);
  if (!b) return null;
  const size: [number, number] =
    section.axis === "x" ? [b.max[2] - b.min[2] + 20, b.max[1] - b.min[1] + 20] : section.axis === "y" ? [b.max[0] - b.min[0] + 20, b.max[2] - b.min[2] + 20] : [b.max[0] - b.min[0] + 20, b.max[1] - b.min[1] + 20];
  const c: Vec3 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
  const pos: Vec3 = section.axis === "x" ? [section.at, c[1], c[2]] : section.axis === "y" ? [c[0], section.at, c[2]] : [c[0], c[1], section.at];
  const rot: Vec3 = section.axis === "x" ? [0, Math.PI / 2, 0] : section.axis === "y" ? [-Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={size} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Gizmo(props: AssemblyCanvasProps & { id: string }) {
  const item = props.scene.items.find((i) => i.rec.id === props.id);
  const [obj, setObj] = React.useState<THREE.Group | null>(null);
  const dragging = React.useRef(false);
  if (!item || item.rec.grounded || item.copyOf) return null;
  const read = (g: THREE.Group): Pose => {
    const snap = (v: number) => Math.round(v * 2) / 2;
    return { p: [snap(g.position.x), snap(g.position.y), snap(g.position.z)], q: [g.quaternion.x, g.quaternion.y, g.quaternion.z, g.quaternion.w] };
  };
  return (
    <>
      <group ref={setObj} position={item.pose.p} quaternion={quat(item.pose.q)} />
      {obj && (
        <TransformControls
          object={obj}
          mode={props.tool === "rotate" ? "rotate" : "translate"}
          translationSnap={1}
          rotationSnap={Math.PI / 12}
          size={0.8}
          onMouseDown={() => {
            dragging.current = true;
          }}
          onObjectChange={() => {
            if (dragging.current) props.onMovePreview(props.id, read(obj));
          }}
          onMouseUp={() => {
            dragging.current = false;
            props.onMoveCommit(props.id, read(obj));
          }}
        />
      )}
    </>
  );
}
