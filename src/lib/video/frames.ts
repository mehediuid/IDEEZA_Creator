// The browser-made clip's frame plan (Phase 2 spec §3.5.7 = VIDEO
// P2-VIDEO-2). Pure maths only: what the encoder (later, browser-only code)
// should draw at a given second, and the plain-language transcript
// `VideoPlayer`'s "What's in this video" reads. No canvas, no tokens — the
// renderer resolves `--gradient-brand` / `--color-white` itself at render
// time, so this module never holds a hex.
//
// Pure, relative imports only.

import type { OnScreenLines, VideoTake } from "./types";

/** One second, three scenes (VIDEO §2A):
 *  0–3 s image cover-fit, slow zoom 1.00→1.08;
 *  3–6 s image at 1.35, panning left to right;
 *  6–10 s pulling back 1.20→1.00, with a title band from 7.5 s. */
export type FramePlan = {
  scene: 0 | 1 | 2;
  scale: number;
  offsetX: number;
  offsetY: number;
  /** 0 at the start of a 250 ms cross-fade into this scene, 1 once it's settled. */
  fade: number;
  line: string;
  title: string | null;
};

const SCENE_1_AT = 3;
const SCENE_2_AT = 6;
const CLIP_END = 10;
const TITLE_BAND_AT = 7.5;
const CROSSFADE_SEC = 0.25;

function fadeAt(t: number): number {
  for (const boundary of [SCENE_1_AT, SCENE_2_AT]) {
    if (t >= boundary && t < boundary + CROSSFADE_SEC) return (t - boundary) / CROSSFADE_SEC;
  }
  return 1;
}

/** What the frame at `tSec` (clamped to the clip's 10 s) looks like. */
export function framePlan(tSec: number, lines: OnScreenLines, productName: string): FramePlan {
  const t = Math.max(0, Math.min(CLIP_END, tSec));
  const fade = fadeAt(t);

  if (t < SCENE_1_AT) {
    // Slow zoom in, 1.00 → 1.08 across the first 3 seconds.
    const p = t / SCENE_1_AT;
    return { scene: 0, scale: 1 + 0.08 * p, offsetX: 0, offsetY: 0, fade, line: lines[0], title: null };
  }
  if (t < SCENE_2_AT) {
    // Held at 1.35, panning left to right across the middle 3 seconds.
    const p = (t - SCENE_1_AT) / (SCENE_2_AT - SCENE_1_AT);
    return { scene: 1, scale: 1.35, offsetX: -1 + 2 * p, offsetY: 0, fade, line: lines[1], title: null };
  }
  // Pull back, 1.20 → 1.00, across the last 4 seconds; the title band joins from 7.5 s.
  const p = (t - SCENE_2_AT) / (CLIP_END - SCENE_2_AT);
  return {
    scene: 2,
    scale: 1.2 - 0.2 * p,
    offsetX: 0,
    offsetY: 0,
    fade,
    line: lines[2],
    title: t >= TITLE_BAND_AT ? productName : null,
  };
}

/** What's actually on screen, not the prompt (P2-VIDEO-9's transcript). With
 *  no product image the first two scenes draw on the gradient instead. */
export function describeClip(take: VideoTake, productName: string, hasImage: boolean): string[] {
  const [line1, line2, line3] = take.lines;
  return [
    hasImage
      ? `0–3 s — ${productName} image, slow zoom in. On screen: '${line1}'.`
      : `0–3 s — ${productName}'s name on a gradient background, slow zoom in. On screen: '${line1}'.`,
    hasImage
      ? `3–6 s — close detail, panning across. On screen: '${line2}'.`
      : `3–6 s — the gradient background, panning across. On screen: '${line2}'.`,
    `6–10 s — full view with the title '${productName}'. On screen: '${line3}'.`,
  ];
}
