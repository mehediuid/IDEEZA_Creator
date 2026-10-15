// The cover crop (spec § Send dialog): a focus point (x, y in percent) and a zoom
// over a stored image, drawn in a fixed 3:2 frame. Moving by mouse, touch or the
// arrow keys and the zoom buttons all go through these, so they agree.

import { COVER_MIN, smallCoverWarning } from "./media";
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

// ── What the frame really shows (audit F72, F90) ──────────────────────────────
// The image is drawn `object-fit: cover` in the frame, then scaled by `zoom` around
// the focus point. A point of the picture lands on screen at `zoom·p − x%·overflow`,
// where `overflow` is how much wider (taller) the scaled picture is than the frame.
// So a drag of `dx` px keeps the picture under the pointer when x moves by
// `dx / overflow`; an axis with no overflow can't move at all.

export type Size = { width: number; height: number };

/** How far the picture can travel in each axis, in frame px, at the cover's zoom. */
export function overflowOf(frame: Size, image: Size | null, zoom: number): Size {
  if (frame.width <= 0 || frame.height <= 0) return { width: 0, height: 0 };
  // Unknown size: assume the frame's own shape (the image fills it exactly at zoom 1).
  const fit = image && image.width > 0 && image.height > 0 ? Math.max(frame.width / image.width, frame.height / image.height) : 0;
  const drawn = fit ? { width: image!.width * fit, height: image!.height * fit } : frame;
  return { width: Math.max(0, drawn.width * zoom - frame.width), height: Math.max(0, drawn.height * zoom - frame.height) };
}

/** Less than half a pixel of travel reads as none. */
const STILL = 0.5;

/** A drag of (dx, dy) px that keeps the picture under the pointer. */
export function panCover(c: BlogCover, dx: number, dy: number, frame: Size, image: Size | null): BlogCover {
  const o = overflowOf(frame, image, c.zoom);
  const x = o.width > STILL ? round(clamp(c.x - (dx / o.width) * 100, 0, 100)) : c.x;
  const y = o.height > STILL ? round(clamp(c.y - (dy / o.height) * 100, 0, 100)) : c.y;
  return x === c.x && y === c.y ? c : { ...c, x, y };
}

/** Whether two crops look different in this frame (a move along an axis that can't travel doesn't). */
export function visiblyMoved(a: BlogCover, b: BlogCover, frame: Size, image: Size | null): boolean {
  if (a.zoom !== b.zoom || a.fileKey !== b.fileKey) return true;
  const o = overflowOf(frame, image, a.zoom);
  return Math.abs(((a.x - b.x) / 100) * o.width) > STILL || Math.abs(((a.y - b.y) / 100) * o.height) > STILL;
}

const AXIS: Readonly<Record<string, "x" | "y">> = { ArrowLeft: "x", ArrowRight: "x", ArrowUp: "y", ArrowDown: "y" };
const WAY: Readonly<Record<string, string>> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

/** An arrow key on the frame: the move, and the words a screen reader hears (said politely). */
export function stepCover(c: BlogCover, key: string, big: boolean, frame: Size, image: Size | null): { cover: BlogCover; said: string } {
  const axis = AXIS[key];
  if (!axis) return { cover: c, said: "" };
  const o = overflowOf(frame, image, c.zoom);
  if ((axis === "x" ? o.width : o.height) <= STILL) {
    return { cover: c, said: axis === "x" ? "Zoom in to move it sideways." : "Zoom in to move it up or down." };
  }
  const next = nudgeCover(c, key, big);
  if (next[axis] === c[axis]) return { cover: c, said: `It can't move further ${WAY[key]}.` };
  return { cover: next, said: `Moved ${WAY[key]}.` };
}

/** "Zoom 125%", and the limits said plainly. */
export function zoomWords(zoom: number): string {
  if (zoom <= ZOOM_MIN) return "Zoom 100%, the smallest.";
  if (zoom >= ZOOM_MAX) return `Zoom ${Math.round(ZOOM_MAX * 100)}%, the largest.`;
  return `Zoom ${Math.round(zoom * 100)}%.`;
}

/** How many of the image's own pixels the 3:2 thumbnail shows at this zoom. */
export function croppedSize(image: Size, zoom: number): Size {
  const z = Math.max(ZOOM_MIN, zoom);
  const width = Math.min(image.width, image.height * 1.5) / z;
  return { width: Math.round(width), height: Math.round(width / 1.5) };
}

/** A warning for a crop that will look soft: the image itself is small (media.ts's warning, word
 *  for word, D-8), or the zoom leaves too few of its pixels for the best size. */
export function cropWarning(image: Size, zoom: number): string | null {
  const whole = smallCoverWarning(image.width, image.height);
  if (whole) return whole;
  const crop = croppedSize(image, zoom);
  if (crop.width >= COVER_MIN.width && crop.height >= COVER_MIN.height) return null;
  return `At this zoom the thumbnail is ${crop.width} × ${crop.height} px and may look blurry. Zoom out, or use an image ${COVER_MIN.width} × ${COVER_MIN.height} px or bigger.`;
}
