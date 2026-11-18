"use client";

// The hackathon hero's hologram (owner 2026-11-16: a visual of its own, not
// art the landing page already uses). Thousands of violet-to-blue points of
// light take the shape of an idea (a light bulb), scatter, gather into its
// PCB (a board, its traces, the chip and its pins), then its code (a code
// window with "</>"), then the product in 3D (a drone), then start over — "describe it, IDEEZA AI builds
// it", told without a word. The shapes are made here from simple geometry,
// so nothing is borrowed from elsewhere on the site.
//
// Plain three.js: one Points cloud, additive blending, a small shader that
// mixes each point from its place in the last shape to its place in the next
// (staggered, with a burst outward in between). The whole cloud turns slowly
// and leans toward the pointer. It pauses off screen; with reduced motion it
// draws the product once and holds still.

import * as React from "react";
import * as THREE from "three";

type V3 = [number, number, number];
type Part = { w: number; gen: (r: () => number) => V3 };

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const onLine = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** A point on a box's surface (centre c, size s). */
function onBox(r: () => number, c: V3, s: V3): V3 {
  const face = Math.floor(r() * 6);
  const u = r() - 0.5;
  const v = r() - 0.5;
  const [x, y, z] = face < 2 ? [face ? 0.5 : -0.5, u, v] : face < 4 ? [u, face === 3 ? 0.5 : -0.5, v] : [u, v, face === 5 ? 0.5 : -0.5];
  return [c[0] + x * s[0], c[1] + y * s[1], c[2] + z * s[2]];
}

/** Fills n points from weighted parts, in order, so every shape has exactly n. */
function build(n: number, parts: Part[], seed: number, rotX = 0, rotY = 0, scale = 1): Float32Array {
  const r = seeded(seed);
  const out = new Float32Array(n * 3);
  const total = parts.reduce((s, p) => s + p.w, 0);
  const cx = Math.cos(rotX);
  const sx = Math.sin(rotX);
  const cy = Math.cos(rotY);
  const sy = Math.sin(rotY);
  let k = 0;
  parts.forEach((p, pi) => {
    const count = pi === parts.length - 1 ? n - k : Math.round((p.w / total) * n);
    for (let i = 0; i < count && k < n; i++, k++) {
      let [x, y, z] = p.gen(r);
      // tilt toward the camera, then turn
      [y, z] = [y * cx - z * sx, y * sx + z * cx];
      [x, z] = [x * cy + z * sy, -x * sy + z * cy];
      out.set([x * scale, y * scale, z * scale], k * 3);
    }
  });
  // Shuffle which point goes where, so a morph mixes the whole cloud, not part by part.
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    for (let d = 0; d < 3; d++) {
      const t = out[i * 3 + d];
      out[i * 3 + d] = out[j * 3 + d];
      out[j * 3 + d] = t;
    }
  }
  return out;
}

/** An idea: a light bulb — the glass, the neck, the screw base, the filament. */
function bulb(n: number): Float32Array {
  return build(
    n,
    [
      {
        w: 0.6,
        gen: (r) => {
          for (;;) {
            const u = r() * 2 - 1;
            const th = r() * Math.PI * 2;
            const s = Math.sqrt(1 - u * u);
            if (u > -0.72) {
              const rad = 1.25 * (0.97 + r() * 0.03);
              return [s * Math.cos(th) * rad, 0.45 + u * rad, s * Math.sin(th) * rad];
            }
          }
        },
      },
      {
        w: 0.08,
        gen: (r) => {
          const t = r();
          const rad = lerp(0.85, 0.5, t);
          const th = r() * Math.PI * 2;
          return [Math.cos(th) * rad, lerp(-0.42, -0.95, t), Math.sin(th) * rad];
        },
      },
      {
        w: 0.15,
        gen: (r) => {
          const y = lerp(-0.95, -1.55, r());
          const rad = 0.5 + 0.05 * Math.sin(y * 42);
          const th = r() * Math.PI * 2;
          return [Math.cos(th) * rad, y, Math.sin(th) * rad];
        },
      },
      {
        w: 0.03,
        gen: (r) => {
          const rad = Math.sqrt(r()) * 0.22;
          const th = r() * Math.PI * 2;
          return [Math.cos(th) * rad, -1.66, Math.sin(th) * rad];
        },
      },
      {
        w: 0.14,
        gen: (r) => {
          const which = r();
          if (which < 0.5) {
            const side = r() < 0.5 ? -0.2 : 0.2;
            return [side, lerp(-0.9, 0.25, r()), 0];
          }
          const t = r();
          const a = t * Math.PI * 2 * 7;
          return [lerp(-0.2, 0.2, t), 0.32 + Math.sin(a) * 0.08, Math.cos(a) * 0.08];
        },
      },
    ],
    11,
    0.12,
    0,
    1,
  );
}

/** Its PCB: the board's edge, Manhattan traces to the chip, pads, the chip and its pins, two parts. */
function pcb(n: number): Float32Array {
  const rt = seeded(5);
  const traces: [V3, V3, V3][] = [];
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 7; i++) {
      const off = -0.42 + i * 0.14;
      const start: V3 = side === 0 ? [0.72, 0, off] : side === 1 ? [-0.72, 0, off] : side === 2 ? [off, 0, 0.72] : [off, 0, -0.72];
      const run = 0.25 + rt() * 0.75;
      const turn = (rt() - 0.5) * 1.4;
      const mid: V3 = side === 0 ? [start[0] + run, 0, start[2]] : side === 1 ? [start[0] - run, 0, start[2]] : side === 2 ? [start[0], 0, start[2] + run * 0.6] : [start[0], 0, start[2] - run * 0.6];
      const end: V3 = side < 2 ? [mid[0], 0, Math.max(-1.1, Math.min(1.1, mid[2] + turn))] : [Math.max(-1.6, Math.min(1.6, mid[0] + turn)), 0, mid[2]];
      traces.push([start, mid, end]);
    }
  }
  return build(
    n,
    [
      {
        w: 0.1,
        gen: (r) => {
          const t = r() * 4;
          const W = 1.75;
          const D = 1.25;
          if (t < 1) return [lerp(-W, W, t), 0, -D];
          if (t < 2) return [W, 0, lerp(-D, D, t - 1)];
          if (t < 3) return [lerp(W, -W, t - 2), 0, D];
          return [-W, 0, lerp(D, -D, t - 3)];
        },
      },
      {
        w: 0.36,
        gen: (r) => {
          const [a, b, c] = traces[Math.floor(r() * traces.length)];
          return r() < 0.5 ? onLine(a, b, r()) : onLine(b, c, r());
        },
      },
      {
        w: 0.08,
        gen: (r) => {
          const end = traces[Math.floor(r() * traces.length)][2];
          const th = r() * Math.PI * 2;
          return [end[0] + Math.cos(th) * 0.06, 0, end[2] + Math.sin(th) * 0.06];
        },
      },
      { w: 0.24, gen: (r) => onBox(r, [0, 0.11, 0], [1.1, 0.22, 1.1]) },
      {
        w: 0.12,
        gen: (r) => {
          const side = Math.floor(r() * 4);
          const pin = (Math.floor(r() * 8) - 3.5) * 0.12;
          const t = r() * 0.18;
          return side === 0 ? [0.55 + t, 0.03, pin] : side === 1 ? [-0.55 - t, 0.03, pin] : side === 2 ? [pin, 0.03, 0.55 + t] : [pin, 0.03, -0.55 - t];
        },
      },
      { w: 0.05, gen: (r) => onBox(r, [1.15, 0.08, -0.75], [0.45, 0.16, 0.28]) },
      {
        w: 0.05,
        gen: (r) => {
          const th = r() * Math.PI * 2;
          return [-1.2 + Math.cos(th) * 0.16, r() * 0.35, 0.75 + Math.sin(th) * 0.16];
        },
      },
    ],
    23,
    0.95,
    -0.45,
    1.05,
  );
}

/** Its code: a code window — the frame and title bar, three dots, lines of code, and "</>" floating in front. */
function code(n: number): Float32Array {
  const W = 1.6;
  const H = 1.05;
  // Lines of code above and below the glyph (y, x, length), so "</>" stays clear in the middle.
  const lines: [number, number, number][] = [
    [0.6, -1.35, 0.9],
    [0.48, -1.1, 1.3],
    [-0.62, -1.1, 0.8],
    [-0.75, -1.35, 1.2],
  ];
  // The glyph's strokes: "<", "/", ">" (x1, y1, x2, y2).
  const glyph: [number, number, number, number][] = [
    [-1.0, -0.02, -0.5, 0.36],
    [-1.0, -0.02, -0.5, -0.4],
    [1.0, -0.02, 0.5, 0.36],
    [1.0, -0.02, 0.5, -0.4],
    [-0.18, -0.42, 0.18, 0.38],
  ];
  return build(
    n,
    [
      {
        w: 0.22,
        gen: (r) => {
          const t = r() * 4;
          if (t < 1) return [lerp(-W, W, t), -H, -0.15];
          if (t < 2) return [W, lerp(-H, H, t - 1), -0.15];
          if (t < 3) return [lerp(W, -W, t - 2), H, -0.15];
          return [-W, lerp(H, -H, t - 3), -0.15];
        },
      },
      { w: 0.08, gen: (r) => [lerp(-W, W, r()), 0.78, -0.15] },
      {
        w: 0.04,
        gen: (r) => {
          const k = Math.floor(r() * 3);
          const th = r() * Math.PI * 2;
          return [-1.42 + k * 0.16 + Math.cos(th) * 0.04, 0.92 + Math.sin(th) * 0.04, -0.15];
        },
      },
      {
        w: 0.16,
        gen: (r) => {
          const [y, x, len] = lines[Math.floor(r() * lines.length)];
          return [x + r() * len, y, -0.15];
        },
      },
      {
        w: 0.5,
        gen: (r) => {
          const [x1, y1, x2, y2] = glyph[Math.floor(r() * glyph.length)];
          const t = r();
          return [lerp(x1, x2, t) + (r() - 0.5) * 0.06, lerp(y1, y2, t) + (r() - 0.5) * 0.06, 0.12 + (r() - 0.5) * 0.06];
        },
      },
    ],
    41,
    0.12,
    -0.25,
    1.05,
  );
}

/** The product: a drone — body, dome, arms, rotor guards, blades, skids, camera. */
function drone(n: number): Float32Array {
  const ends: V3[] = [
    [1.45, 0.05, 1.05],
    [-1.45, 0.05, 1.05],
    [1.45, 0.05, -1.05],
    [-1.45, 0.05, -1.05],
  ];
  return build(
    n,
    [
      { w: 0.24, gen: (r) => onBox(r, [0, 0, 0], [1.2, 0.36, 0.8]) },
      {
        w: 0.06,
        gen: (r) => {
          const u = r();
          const th = r() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          return [s * Math.cos(th) * 0.34, 0.18 + u * 0.34, s * Math.sin(th) * 0.34];
        },
      },
      {
        w: 0.12,
        gen: (r) => {
          const e = ends[Math.floor(r() * 4)];
          return onLine([Math.sign(e[0]) * 0.45, 0, Math.sign(e[2]) * 0.3], e, r());
        },
      },
      {
        w: 0.3,
        gen: (r) => {
          const e = ends[Math.floor(r() * 4)];
          const th = r() * Math.PI * 2;
          const rad = 0.62 + (r() - 0.5) * 0.03;
          return [e[0] + Math.cos(th) * rad, e[1] + 0.12 + (r() - 0.5) * 0.05, e[2] + Math.sin(th) * rad];
        },
      },
      {
        w: 0.12,
        gen: (r) => {
          const e = ends[Math.floor(r() * 4)];
          const blade = Math.floor(r() * 2);
          const a = blade ? Math.PI / 2 + 0.3 : 0.3;
          const t = (r() * 2 - 1) * 0.55;
          return [e[0] + Math.cos(a) * t, e[1] + 0.16, e[2] + Math.sin(a) * t];
        },
      },
      {
        w: 0.08,
        gen: (r) => {
          const side = r() < 0.5 ? -0.4 : 0.4;
          const t = r();
          return t < 0.75 ? [side, -0.48, lerp(-0.55, 0.55, t / 0.75)] : [side, lerp(-0.18, -0.48, (t - 0.75) / 0.25), (r() < 0.5 ? -1 : 1) * 0.3];
        },
      },
      {
        w: 0.08,
        gen: (r) => {
          const u = r() * 2 - 1;
          const th = r() * Math.PI * 2;
          const s = Math.sqrt(1 - u * u);
          return [s * Math.cos(th) * 0.14, -0.12 + u * 0.14, 0.42 + s * Math.sin(th) * 0.14];
        },
      },
    ],
    37,
    0.42,
    0.35,
    1.12,
  );
}

const VERT = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aRand;
  uniform float uT;
  uniform float uTime;
  uniform float uSize;
  uniform float uPR;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = smoothstep(0.0, 1.0, clamp((uT - aRand * 0.35) / 0.65, 0.0, 1.0));
    vec3 p = mix(aFrom, aTo, t);
    float burst = sin(3.14159 * t);
    vec3 dir = normalize(vec3(sin(aRand * 91.7), cos(aRand * 47.3), sin(aRand * 13.1 + 1.0)));
    p += dir * burst * (0.5 + aRand * 1.1);
    p += 0.018 * vec3(sin(uTime * 1.3 + aRand * 40.0), cos(uTime * 1.1 + aRand * 30.0), sin(uTime * 0.9 + aRand * 20.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPR * (0.55 + aRand * 0.9) * (7.5 / -mv.z);
    float h = clamp(p.y * 0.28 + 0.5 + (aRand - 0.5) * 0.35, 0.0, 1.0);
    vColor = h < 0.5 ? mix(uC1, uC2, h * 2.0) : mix(uC2, uC3, (h - 0.5) * 2.0);
    vAlpha = 0.45 + 0.55 * fract(aRand * 7.0);
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
  }
`;

const HOLD = 2.6;
const MORPH = 1.8;

export function ParticleHologram({ still, onStep }: { still: boolean; onStep: (i: number) => void }) {
  const wrap = React.useRef<HTMLDivElement>(null);
  const stepCb = React.useRef(onStep);
  React.useEffect(() => {
    stepCb.current = onStep;
  }, [onStep]);

  React.useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const phone = window.matchMedia("(max-width: 767px)").matches;
    const N = phone ? 4200 : 7600;
    const shapes = [bulb(N), pcb(N), code(N), drone(N)];

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    const pr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(pr);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 7.4);

    const css = getComputedStyle(document.documentElement);
    const tok = (name: string, fb: string) => new THREE.Color((css.getPropertyValue(name) || fb).trim() || fb);

    const geo = new THREE.BufferGeometry();
    const start = still ? shapes[3] : shapes[0];
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(start), 3));
    const aFrom = new THREE.BufferAttribute(new Float32Array(start), 3);
    const aTo = new THREE.BufferAttribute(new Float32Array(start), 3);
    geo.setAttribute("aFrom", aFrom);
    geo.setAttribute("aTo", aTo);
    const rnd = seeded(99);
    geo.setAttribute("aRand", new THREE.BufferAttribute(Float32Array.from({ length: N }, () => rnd()), 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uT: { value: 1 },
        uTime: { value: 0 },
        uSize: { value: phone ? 9 : 7.5 },
        uPR: { value: pr },
        uC1: { value: tok("--color-violet-600", "#7c3aed") },
        uC2: { value: tok("--color-violet-300", "#c4b5fd") },
        uC3: { value: tok("--color-blue-300", "#93c5fd") },
      },
    });
    const cloud = new THREE.Points(geo, mat);
    const group = new THREE.Group();
    group.add(cloud);
    scene.add(group);

    const size = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Fit the widest shape (about 2.7 units either side) across a narrow panel;
      // on a wide panel the height decides, at 7.4.
      camera.position.z = Math.max(7.4, 2.7 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (w / h)));
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    if (still) {
      group.rotation.set(0.15, -0.5, 0);
      renderer.render(scene, camera);
      stepCb.current(3);
      return () => {
        ro.disconnect();
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    // Pointer lean.
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      lean.tx = ((e.clientY - r.top) / r.height - 0.5) * 0.45;
      lean.ty = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
    };
    const onLeave = () => {
      lean.tx = 0;
      lean.ty = 0;
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    // Only run while on screen.
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
    });
    io.observe(el);

    let k = 0; // current shape
    let phase: "hold" | "morph" = "hold";
    let phaseT = 0;
    let spin = 0;
    let last = performance.now();
    let raf = 0;
    stepCb.current(0);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      phaseT += dt;
      if (phase === "hold" && phaseT > HOLD) {
        const next = (k + 1) % shapes.length;
        (aFrom.array as Float32Array).set(shapes[k]);
        (aTo.array as Float32Array).set(shapes[next]);
        aFrom.needsUpdate = true;
        aTo.needsUpdate = true;
        k = next;
        phase = "morph";
        phaseT = 0;
        stepCb.current(k);
      }
      if (phase === "morph") {
        mat.uniforms.uT.value = Math.min(1, phaseT / MORPH);
        if (phaseT >= MORPH) {
          phase = "hold";
          phaseT = 0;
        }
      }
      mat.uniforms.uTime.value = now / 1000;
      spin += dt * 0.22;
      lean.x += (lean.tx - lean.x) * 0.05;
      lean.y += (lean.ty - lean.y) * 0.05;
      group.rotation.set(0.1 + lean.x, spin + lean.y, 0);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [still]);

  return <div ref={wrap} aria-hidden className="absolute inset-0" />;
}
