// The 3D viewer's contract, kept apart from the WebGL module so the panel can
// import the types without pulling three.js into its own chunk.

import type { Assembly, SystemId } from "@/lib/three/assembly";

export type ViewPreset = "iso" | "front" | "side" | "top";
export type CameraCommand = "home" | "fit" | "zoom-in" | "zoom-out";

/** A part's bounds on screen, in CSS px from the viewer's top-left. */
export type ScreenBox = { x: number; y: number; w: number; h: number };

export type AssemblyViewerProps = {
  assembly: Assembly;
  /** 0–100 (partPosition). */
  explode: number;
  hidden: ReadonlySet<SystemId>;
  isolatedId: string | null;
  hoverId: string | null;
  selectedId: string | null;
  preset: ViewPreset;
  /** Bumped with each camera command so repeating one still runs it. */
  cameraNonce: number;
  cameraCommand: CameraCommand | null;
  /** While exploded the hint says "Drag to pan", so the left button pans. */
  panWithLeft: boolean;
  onHover: (id: string | null) => void;
  /** A part, or null for a click on empty space. */
  onPick: (id: string | null) => void;
  onBoxes: (boxes: { hover?: ScreenBox; selected?: ScreenBox }) => void;
  /** The WebGL module has loaded and its canvas is up. */
  onMounted: () => void;
  /** The first frame has drawn with every part in place. */
  onReady: () => void;
  onError: () => void;
};
