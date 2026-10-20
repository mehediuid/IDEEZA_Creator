// Export the assembled product as one GLB (F38): every visible part's solids
// at its solved place, in millimetres, named by part — for a render, an AR
// view or a manufacturer's look. Built from the scene's data, not the canvas,
// so helpers (grid, gizmo, markers) never end up in the file.

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { AsmScene } from "@/lib/assembly/scene";
import type { Solid } from "@/lib/assembly/types";

function meshOf(s: Solid): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  const material = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.55, metalness: 0.12, transparent: !!s.translucent, opacity: s.translucent ? 0.4 : 1 });
  if (s.slab) {
    const shape = new THREE.Shape(s.slab.outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const h of s.slab.holes) {
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
    geo = new THREE.ExtrudeGeometry(shape, { depth: s.slab.thickness, bevelEnabled: false, curveSegments: 24 });
    const m = new THREE.Mesh(geo, material);
    m.rotation.x = -Math.PI / 2;
    m.position.y = s.slab.y0;
    m.name = s.name;
    return m;
  }
  const sh = s.shape;
  let center: [number, number, number] = [0, 0, 0];
  let q: [number, number, number, number] | undefined;
  switch (sh.kind) {
    case "box":
      geo = new THREE.BoxGeometry(...sh.size);
      center = sh.center;
      q = sh.q;
      break;
    case "cyl":
      geo = new THREE.CylinderGeometry(sh.r, sh.r, sh.h, 32);
      center = sh.center;
      q = sh.q;
      break;
    case "cone":
      geo = new THREE.ConeGeometry(sh.r, sh.h, 32);
      center = sh.center;
      q = sh.q;
      break;
    case "sphere":
      geo = new THREE.SphereGeometry(sh.r, 32, 20);
      center = sh.center;
      break;
    case "hull": {
      const box = new THREE.Box3().setFromPoints(sh.points.map((p) => new THREE.Vector3(...p)));
      const size = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3());
      geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      center = [c.x, c.y, c.z];
      break;
    }
  }
  const m = new THREE.Mesh(geo, material);
  m.position.set(...center);
  if (q) m.quaternion.set(...q);
  m.name = s.name;
  return m;
}

export function exportGlb(scene: AsmScene, fileName: string): Promise<number> {
  const root = new THREE.Group();
  root.name = "Assembly";
  for (const item of scene.items) {
    if (item.rec.hidden) continue;
    const g = new THREE.Group();
    g.name = item.part.name;
    g.position.set(...item.pose.p);
    g.quaternion.set(...item.pose.q);
    for (const s of item.part.solids) if (s.collide !== false) g.add(meshOf(s));
    root.add(g);
  }
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      root,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: "model/gltf-binary" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        root.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
        resolve(blob.size);
      },
      (err) => reject(err),
      { binary: true },
    );
  });
}
