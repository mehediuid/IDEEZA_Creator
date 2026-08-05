// glTF / GLB import.
//
// Parses the file with three's GLTFLoader (real geometry, real validation — an
// invalid file is rejected with its own error), keeps the parsed group in a
// module-level registry, and describes it to the store so the 3D view can place
// it. Parsed scene graphs are session-only on purpose: they are megabytes of
// geometry and have no business in the persisted document.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type ImportedModel = {
  id: string;
  name: string;
  /** "board" sits at the board origin; otherwise the id of the part it rides. */
  target: string;
  meshes: number;
  vertices: number;
  bytes: number;
  /** Longest side of the model's bounding box, in its own units. */
  size: number;
};

const registry = new Map<string, THREE.Group>();
let seq = 0;

export const getImportedGroup = (id: string) => registry.get(id) ?? null;

export function dropImportedGroup(id: string) {
  const g = registry.get(id);
  g?.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose?.());
    else mat?.dispose?.();
  });
  registry.delete(id);
}

/** Read + parse a .glb/.gltf File. Rejects with the loader's own message. */
export function parseGltfFile(file: File, target: string): Promise<ImportedModel> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      const loader = new GLTFLoader();
      try {
        loader.parse(
          buf,
          "",
          (gltf) => {
            const group = new THREE.Group();
            group.name = file.name;
            group.add(gltf.scene);
            let meshes = 0;
            let vertices = 0;
            group.traverse((o) => {
              const m = o as THREE.Mesh;
              if (!m.isMesh) return;
              meshes++;
              const pos = m.geometry?.getAttribute("position");
              vertices += pos ? pos.count : 0;
            });
            if (meshes === 0) {
              reject(new Error("That file has no meshes to show"));
              return;
            }
            const box = new THREE.Box3().setFromObject(group);
            const span = new THREE.Vector3();
            box.getSize(span);
            const id = `gltf_${++seq}`;
            registry.set(id, group);
            resolve({
              id,
              name: file.name,
              target,
              meshes,
              vertices,
              bytes: file.size,
              size: Math.max(span.x, span.y, span.z),
            });
          },
          // Say what failed in the user's terms, keeping the loader's reason.
          (err) => {
            const why = err instanceof Error ? err.message : String(err ?? "");
            reject(new Error(`That isn't a readable glTF/GLB file${why ? ` — ${why}` : ""}`));
          },
        );
      } catch (e) {
        const why = e instanceof Error ? e.message : String(e ?? "");
        reject(new Error(`That isn't a readable glTF/GLB file${why ? ` — ${why}` : ""}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
