// The cover crop (spec § Send dialog): a focus point (x, y in percent) and a zoom
// over a stored image, drawn in a fixed 3:2 frame. Moving by mouse, touch or the
// arrow keys and the zoom buttons all go through these, so they agree.

import type { BlogCover } from "./types";

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 100) / 100;

export function coverFrom(fileKey: string, alt: string): BlogCover {
  return { fileKey, x: 50, y: 50, zoom: 1, alt };
}

/** Moves the focus by a drag of (dx, dy) px in a frame `width` × `height` px: dragging the
 *  picture right shows more of its left, so the focus moves the other way. */
export function dragCover(c: BlogCover, dx: number, dy: number, width: number, height: number): BlogCover {
  if (width <= 0 || height <= 0) return c;
  return { ...c, x: round(clamp(c.x - (dx / width) * (100 / c.zoom), 0, 100)), y: round(clamp(c.y - (dy / height) * (100 / c.zoom), 0, 100)) };
}

/** Arrow keys: 1 % a press, 10 % with Shift. The picture moves the way the arrow points. */
export function nudgeCover(c: BlogCover, key: string, big: boolean): BlogCover {
  const step = big ? 10 : 1;
  switch (key) {
    case "ArrowLeft":
      return { ...c, x: clamp(c.x + step, 0, 100) };
    case "ArrowRight":
      return { ...c, x: clamp(c.x - step, 0, 100) };
    case "ArrowUp":
      return { ...c, y: clamp(c.y + step, 0, 100) };
    case "ArrowDown":
      return { ...c, y: clamp(c.y - step, 0, 100) };
    default:
      return c;
  }
}

export function zoomCover(c: BlogCover, zoom: number): BlogCover {
  return { ...c, zoom: round(clamp(zoom, ZOOM_MIN, ZOOM_MAX)) };
}

export function centerCover(c: BlogCover): BlogCover {
  return { ...c, x: 50, y: 50 };
}

export function sameCover(a: BlogCover | null, b: BlogCover | null): boolean {
  if (!a || !b) return a === b;
  return a.fileKey === b.fileKey && a.x === b.x && a.y === b.y && a.zoom === b.zoom && a.alt === b.alt;
}
