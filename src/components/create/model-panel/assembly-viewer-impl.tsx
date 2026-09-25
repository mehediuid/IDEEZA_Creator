"use client";

// The assembly in WebGL — dynamic-imported by assembly-viewer.tsx, so it
// never runs under SSR. It draws what the panel decides: which parts show,
// how far apart they stand, where the camera looks. What it reports back is
// only what the scene alone knows: the part under the pointer, the part
// clicked, and where the hovered and selected parts sit on screen, which the
// panel's rings and tooltip are drawn from.

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { partPosition, type AssemblyPart, type Vec3 } from "@/lib/three/assembly";
import { useTokens } from "@/lib/three/use-tokens";
import { PartMesh, type PartColors } from "./part-mesh";
import type { AssemblyViewerProps, ScreenBox, ViewPreset } from "./viewer-types";

type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;

const FOV = 35;
// The longest side of the enclosure spans this many scene units, whatever
// the product's size, so a key fob and a robot frame alike.
const SCENE_SPAN = 8;
const PRESET_DIR: Record<ViewPreset, THREE.Vector3> = {
  iso: new THREE.Vector3(1, 0.8, 1).normalize(),
  front: new THREE.Vector3(0, 0.12, 1).normalize(),
  side: new THREE.Vector3(1, 0.12, 0).normalize(),
  top: new THREE.Vector3(0, 1, 0.0001).normalize(),
};
// A click that travelled further than this was a drag of the camera.
const CLICK_SLOP_PX = 4;

type Registry = Map<string, THREE.Group>;

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(q.matches);
    read();
    q.addEventListener("change", read);
    return () => q.removeEventListener("change", read);
  }, []);
  return reduced;
}

function PartNode({
  part,
  target,
  scale,
  colors,
  wallMm,
  bosses,
  reduced,
  registry,
  dragging,
  onHover,
  onPick,
}: {
  part: AssemblyPart;
  target: THREE.Vector3;
  scale: number;
  colors: PartColors;
  wallMm: number;
  bosses?: Vec3[];
  reduced: boolean;
  registry: React.RefObject<Registry>;
  dragging: React.RefObject<boolean>;
  onHover: (id: string | null) => void;
  onPick: (id: string | null) => void;
}) {
  const ref = React.useRef<THREE.Group>(null);
  const placed = React.useRef(false);

  React.useLayoutEffect(() => {
    const map = registry.current;
    const g = ref.current;
    if (g) map.set(part.id, g);
    return () => {
      map.delete(part.id);
    };
  }, [part.id, registry]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (!placed.current || reduced) {
      g.position.copy(target);
      placed.current = true;
      return;
    }
    g.position.x = THREE.MathUtils.damp(g.position.x, target.x, 10, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, target.y, 10, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, target.z, 10, dt);
  });

  return (
    <group
      ref={ref}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (!dragging.current) onHover(part.id);
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(null);
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta <= CLICK_SLOP_PX) onPick(part.id);
      }}
    >
      <PartMesh part={part} scale={scale} colors={colors} wallMm={wallMm} bosses={bosses} />
    </group>
  );
}

/** Frames `box` from `dir`, fitting the narrower of the two fields of view. */
function frameFor(box: THREE.Box3, dir: THREE.Vector3, aspect: number) {
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const v = THREE.MathUtils.degToRad(FOV) / 2;
  const h = Math.atan(Math.tan(v) * aspect);
  const d = (sphere.radius / Math.sin(Math.min(v, h))) * 1.08;
  return { target: sphere.center.clone(), position: sphere.center.clone().addScaledVector(dir, d) };
}

function CameraRig({
  bounds,
  selectedBounds,
  preset,
  nonce,
  command,
  frameKey,
  reduced,
  controls,
  dragging,
}: {
  bounds: THREE.Box3;
  selectedBounds: THREE.Box3 | null;
  preset: ViewPreset;
  nonce: number;
  command: AssemblyViewerProps["cameraCommand"];
  /** Changes when what is visible changes shape enough to reframe. */
  frameKey: string;
  reduced: boolean;
  controls: React.RefObject<OrbitControlsImpl | null>;
  dragging: React.RefObject<boolean>;
}) {
  const { camera, size } = useThree();
  const goal = React.useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const aspect = size.width / Math.max(1, size.height);
  const boundsRef = React.useRef(bounds);
  const selectedRef = React.useRef(selectedBounds);
  // Synced before the effects below read them, which run in the same commit.
  React.useLayoutEffect(() => {
    boundsRef.current = bounds;
    selectedRef.current = selectedBounds;
  });

  // A preset or Home frames everything visible from that direction.
  React.useEffect(() => {
    goal.current = frameFor(boundsRef.current, PRESET_DIR[preset], aspect);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- aspect changes reframe below, not here
  }, [preset]);

  // What is visible changed (explode, a system, isolation): keep the current
  // direction and frame the new extent.
  React.useEffect(() => {
    const c = controls.current;
    const dir = c ? camera.position.clone().sub(c.target).normalize() : PRESET_DIR[preset];
    goal.current = frameFor(boundsRef.current, dir, aspect);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reframe on shape change only
  }, [frameKey, aspect]);

  React.useEffect(() => {
    if (!command) return;
    const c = controls.current;
    const target = c ? c.target.clone() : new THREE.Vector3();
    const from = camera.position.clone();
    if (command === "home") {
      goal.current = frameFor(boundsRef.current, PRESET_DIR.iso, aspect);
    } else if (command === "fit") {
      const dir = from.clone().sub(target).normalize();
      goal.current = frameFor(selectedRef.current ?? boundsRef.current, dir, aspect);
    } else {
      const k = command === "zoom-in" ? 0.8 : 1.25;
      goal.current = { target, position: target.clone().add(from.sub(target).multiplyScalar(k)) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run per command, keyed by its nonce
  }, [nonce]);

  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    if (dragging.current) {
      goal.current = null;
      return;
    }
    if (reduced) {
      camera.position.copy(g.position);
      c.target.copy(g.target);
      goal.current = null;
    } else {
      camera.position.lerp(g.position, 1 - Math.exp(-8 * dt));
      c.target.lerp(g.target, 1 - Math.exp(-8 * dt));
      if (camera.position.distanceTo(g.position) < 1e-3 && c.target.distanceTo(g.target) < 1e-3) {
        goal.current = null;
      }
    }
    c.update();
  });
  return null;
}

/** Projects the hovered and selected parts' bounds to the viewer's CSS px,
 *  and reports them when they move — the panel's rings follow the part. */
function BoxTracker({
  registry,
  hoverId,
  selectedId,
  onBoxes,
}: {
  registry: React.RefObject<Registry>;
  hoverId: string | null;
  selectedId: string | null;
  onBoxes: AssemblyViewerProps["onBoxes"];
}) {
  const { camera, size } = useThree();
  const last = React.useRef<{ hover?: ScreenBox; selected?: ScreenBox }>({});
  const box = React.useMemo(() => new THREE.Box3(), []);
  const v = React.useMemo(() => new THREE.Vector3(), []);

  const project = React.useCallback(
    (id: string | null): ScreenBox | undefined => {
      if (!id) return undefined;
      const g = registry.current.get(id);
      if (!g) return undefined;
      box.setFromObject(g);
      if (box.isEmpty()) return undefined;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < 8; i += 1) {
        v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        v.project(camera);
        const x = ((v.x + 1) / 2) * size.width;
        const y = ((1 - v.y) / 2) * size.height;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    },
    [registry, box, v, camera, size],
  );

  useFrame(() => {
    const next = { hover: project(hoverId), selected: project(selectedId) };
    const moved = (a?: ScreenBox, b?: ScreenBox) =>
      !a !== !b ||
      (a && b && (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5 || Math.abs(a.w - b.w) > 0.5 || Math.abs(a.h - b.h) > 0.5));
    if (moved(next.hover, last.current.hover) || moved(next.selected, last.current.selected)) {
      last.current = next;
      onBoxes(next);
    }
    if (process.env.NODE_ENV !== "production") {
      const parts: Array<{ id: string; screen: { x: number; y: number } }> = [];
      registry.current.forEach((g, id) => {
        g.getWorldPosition(v);
        v.project(camera);
        parts.push({ id, screen: { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height } });
      });
      (window as unknown as { __ideezaAssembly?: unknown }).__ideezaAssembly = { parts };
    }
  });
  return null;
}

function ContextWatch({ onError }: { onError: () => void }) {
  const { gl } = useThree();
  React.useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const done = React.useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return null;
}

class SceneBoundary extends React.Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function AssemblyViewerImpl(props: AssemblyViewerProps) {
  const {
    assembly,
    explode,
    hidden,
    isolatedId,
    hoverId,
    selectedId,
    preset,
    cameraNonce,
    cameraCommand,
    panWithLeft,
    onHover,
    onPick,
    onBoxes,
    onMounted,
    onReady,
    onError,
  } = props;
  React.useEffect(() => {
    onMounted();
  }, [onMounted]);
  const reduced = useReducedMotion();
  const registry = React.useRef<Registry>(new Map());
  const dragging = React.useRef(false);
  const controls = React.useRef<OrbitControlsImpl | null>(null);
  const down = React.useRef<{ x: number; y: number } | null>(null);

  const [shell, metal, can, box, chip, ic, board, mark] = useTokens([
    "--color-gray-200",
    "--color-gray-300",
    "--color-gray-400",
    "--color-gray-500",
    "--color-gray-600",
    "--color-gray-800",
    "--color-pcb-substrate",
    "--color-gray-100",
  ]);
  const colors: PartColors = { shell, metal, can, box, chip, ic, board, mark };

  const maxDim = Math.max(assembly.size.l, assembly.size.w, assembly.size.h);
  const scale = SCENE_SPAN / maxDim;

  const visible = React.useMemo(
    () =>
      assembly.parts.filter((p) =>
        isolatedId ? p.id === isolatedId : !hidden.has(p.system),
      ),
    [assembly.parts, hidden, isolatedId],
  );

  // An isolated part stands alone at the origin, the rest where the explode
  // puts them.
  const targets = React.useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    for (const p of visible) {
      const at = isolatedId ? ([0, 0, 0] as Vec3) : partPosition(p, explode, maxDim);
      m.set(p.id, new THREE.Vector3(at[0] * scale, at[1] * scale, at[2] * scale));
    }
    return m;
  }, [visible, isolatedId, explode, maxDim, scale]);

  const boundsOf = React.useCallback(
    (list: AssemblyPart[]) => {
      const b = new THREE.Box3();
      for (const p of list) {
        const c = targets.get(p.id);
        if (!c) continue;
        const half = new THREE.Vector3(p.body.l, p.body.h, p.body.w).multiplyScalar(scale / 2);
        b.expandByPoint(c.clone().sub(half));
        b.expandByPoint(c.clone().add(half));
      }
      if (b.isEmpty()) b.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
      return b;
    },
    [targets, scale],
  );
  const bounds = React.useMemo(() => boundsOf(visible), [boundsOf, visible]);
  const selectedBounds = React.useMemo(() => {
    const p = selectedId ? visible.find((x) => x.id === selectedId) : undefined;
    return p ? boundsOf([p]) : null;
  }, [boundsOf, visible, selectedId]);

  // The board's four bosses, under its corners, carried by the base.
  const base = assembly.parts.find((p) => p.shape === "shell-base");
  const boardPart = assembly.parts.find((p) => p.system === "board");
  const bosses: Vec3[] | undefined =
    base && boardPart
      ? [-1, 1].flatMap((sx) =>
          [-1, 1].map(
            (sz) =>
              [
                boardPart.at[0] + sx * (boardPart.body.l / 2 - 3) - base.at[0],
                -base.body.h / 2 + assembly.wallMm + 1,
                boardPart.at[2] + sz * (boardPart.body.w / 2 - 3) - base.at[2],
              ] as Vec3,
          ),
        )
      : undefined;

  // Reframe when the visible set changes shape — a whole number of the
  // explode's tenths, so dragging the slider doesn't chase every frame.
  const frameKey = `${isolatedId ?? ""}|${[...hidden].sort().join(",")}|${Math.round(explode / 10)}`;

  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: FOV, position: [8, 6.4, 8], near: 0.05, far: 500 }}
        style={{ width: "100%", height: "100%" }}
        onPointerMissed={(e) => {
          const d = down.current;
          if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) <= CLICK_SLOP_PX) onPick(null);
        }}
      >
        <ContextWatch onError={onError} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[5, 8, 6]} intensity={1.1} />
        <directionalLight position={[-6, 3, -4]} intensity={0.35} />
        <SceneBoundary onError={onError}>
          <React.Suspense fallback={null}>
            {visible.map((p) => (
              <PartNode
                key={p.id}
                part={p}
                target={targets.get(p.id) ?? new THREE.Vector3()}
                scale={scale}
                colors={colors}
                wallMm={assembly.wallMm}
                bosses={p.shape === "shell-base" ? bosses : undefined}
                reduced={reduced}
                registry={registry}
                dragging={dragging}
                onHover={onHover}
                onPick={onPick}
              />
            ))}
            <Ready onReady={onReady} />
          </React.Suspense>
        </SceneBoundary>
        <CameraRig
          bounds={bounds}
          selectedBounds={selectedBounds}
          preset={preset}
          nonce={cameraNonce}
          command={cameraCommand}
          frameKey={frameKey}
          reduced={reduced}
          controls={controls}
          dragging={dragging}
        />
        <BoxTracker registry={registry} hoverId={hoverId} selectedId={selectedId} onBoxes={onBoxes} />
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping={!reduced}
          minDistance={1}
          maxDistance={80}
          mouseButtons={
            panWithLeft
              ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
              : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
          }
          onStart={() => {
            dragging.current = true;
            onHover(null);
          }}
          onEnd={() => {
            dragging.current = false;
          }}
        />
      </Canvas>
    </div>
  );
}
