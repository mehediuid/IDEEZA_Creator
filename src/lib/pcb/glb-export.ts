// glTF / GLB export of the board.
//
// Builds a throwaway three.js scene from `derivePcbScene` — the same derivation
// the 3D tab renders — and serialises it with three's GLTFExporter. Going
// through the shared scene description (rather than grabbing the live r3f
// scene) means the export works from any view and can't drift from what the
// viewer shows.

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { derivePcbScene, type Pcb3DScene } from "./pcb-scene";
import type { PcbState } from "./types";

function mesh(geo: THREE.BufferGeometry, color: string, opts: { metalness?: number; roughness?: number } = {}) {
  return new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: opts.metalness ?? 0,
      roughness: opts.roughness ?? 0.6,
    }),
  );
}

/** Board + copper + parts as a real three.js scene graph, grouped by role. */
export function buildBoardScene(s: Pcb3DScene): THREE.Scene {
  const scene = new THREE.Scene();
  scene.name = "IDEEZA PCB";
  const b = s.board;
  const halfT = b.thickness / 2;

  const slab = mesh(new THREE.BoxGeometry(b.width, b.thickness, b.depth), b.color, {
    metalness: b.metalness,
    roughness: b.roughness,
  });
  slab.name = "Board";
  slab.position.set(0, b.yOffset, 0);
  scene.add(slab);

  const copper = new THREE.Group();
  copper.name = "Copper";
  for (const t of s.tracks) {
    const len = Math.hypot(t.x2 - t.x1, t.z2 - t.z1);
    if (len <= 0) continue;
    const ribbon = mesh(new THREE.BoxGeometry(len, 0.02, Math.max(t.width, 0.01)), t.color, { metalness: 0.85, roughness: 0.28 });
    ribbon.name = `Track_${t.id}`;
    ribbon.position.set(
      (t.x1 + t.x2) / 2,
      b.yOffset + (t.top ? halfT + s.expose : -halfT - s.expose),
      (t.z1 + t.z2) / 2,
    );
    ribbon.rotation.y = -Math.atan2(t.z2 - t.z1, t.x2 - t.x1);
    copper.add(ribbon);
  }
  for (const v of s.vias) {
    const barrel = mesh(new THREE.CylinderGeometry(v.outer / 2, v.outer / 2, b.thickness + 0.04, 16), s.padColor, { metalness: 0.9, roughness: 0.25 });
    barrel.name = `Via_${v.id}`;
    barrel.position.set(v.x, b.yOffset, v.z);
    copper.add(barrel);
  }
  for (const p of s.pads) {
    const pad = mesh(new THREE.BoxGeometry(p.w, 0.03, p.d), s.padColor, { metalness: 0.9, roughness: 0.25 });
    pad.name = `Pad_${p.id}`;
    pad.position.set(p.x, b.yOffset + halfT + s.expose, p.z);
    pad.rotation.y = (-p.rot * Math.PI) / 180;
    copper.add(pad);
  }
  for (const r of s.regions) {
    if (r.pts.length < 3) continue;
    const shape = new THREE.Shape(r.pts.map(([x, z]) => new THREE.Vector2(x, z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    const region = mesh(geo, r.color, { metalness: 0.8, roughness: 0.3 });
    region.name = `Region_${r.id}`;
    region.position.y = b.yOffset + (r.top ? halfT + s.expose : -halfT - s.expose);
    copper.add(region);
  }
  if (copper.children.length) scene.add(copper);

  const parts = new THREE.Group();
  parts.name = "Components";
  for (const c of s.bodies) {
    const body = mesh(new THREE.BoxGeometry(c.w, c.h, c.d), c.color, { roughness: 0.55 });
    body.name = c.label ? `Part_${c.label}` : `Part_${c.id}`;
    body.position.set(c.x, b.yOffset + halfT + c.h / 2, c.z);
    body.rotation.y = (-c.rot * Math.PI) / 180;
    parts.add(body);
  }
  if (parts.children.length) scene.add(parts);

  return scene;
}

/** Serialise the board to binary glTF (.glb) or JSON glTF (.gltf). */
export function exportBoardGltf(state: PcbState, binary = true): Promise<ArrayBuffer | string> {
  const scene = buildBoardScene(derivePcbScene(state));
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => resolve(binary ? (result as ArrayBuffer) : JSON.stringify(result, null, 2)),
      (err) => reject(err),
      { binary },
    );
  });
}
