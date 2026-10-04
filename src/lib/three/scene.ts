// The 3D module's scene document (BUILDLOAD §3.3): the shape list three-app
// stores, and the AI model the Generate with AI modal stores. Moved out of
// the components (three-canvas.tsx re-exports SceneShape and ShapeType), so
// the build → editor seed (lib/three/from-build.ts) and its node tests can
// build and check them without React.
//
// Pure, types and constants only.

export type ShapeType = "box" | "sphere" | "cylinder" | "cone" | "torus" | "plane";

export type SceneShape = {
  id: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  hidden: boolean;
  locked: boolean;
  /** What the shape is, when it has a name of its own — a seeded build shape
   *  ("Enclosure base", "U1 · ESP32"). A shape the maker drew has none, and
   *  the shape list falls back to its type. */
  name?: string;
};

/** The scene a new document opens on: one 2-unit cube at the origin — the
 *  same value three-app.tsx starts from. */
export const DEFAULT_SHAPES: SceneShape[] = [
  {
    id: "default-cube",
    type: "box",
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    hidden: false,
    locked: false,
  },
];

/** What the Generate with AI modal keeps per document (ai-generate-modal.tsx). */
export type AiModelDoc = {
  prompt: string;
  imageUrl: string | null;
  glbUrl: string | null;
  provider: "meshy" | "demo" | null;
};
