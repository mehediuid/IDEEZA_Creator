// What sits under and on a photo or a video stays dark in both themes (owner
// rule: text over a photo or video is white; PR-02 10673:5 duration chip).
// `bg-bg-inverse` / `text-text-inverse` flip in dark mode — a letterbox, an
// image viewer's backdrop and a duration chip turned near-white — so media
// frames use these instead:
//
//   <div className={cn(MEDIA_GROUND, "aspect-video")}><video … /></div>
//   <span className={MEDIA_CHIP}>▶ 0:42</span>
//   <div {...MEDIA_THEME} className={MEDIA_GROUND}>…buttons in their dark look…</div>
//
// The ground is bg/overlay (gray-900 light, gray-950 dark); the ink is white.

import { cn } from "@/lib/utils";
import { T } from "../type";

/** The ground behind media: a letterbox, a viewer's backdrop, a cover's empty frame. */
export const MEDIA_GROUND = "bg-bg-overlay";

/** Text and icons drawn on media. */
export const MEDIA_INK = "text-[color:var(--color-white)]";

/** A small chip on a photo or a video (a duration, "1 of 4"): the scrim colour, white Caption/SM. */
export const MEDIA_CHIP = cn(
  T.micro,
  "inline-flex items-center gap-1 rounded-full bg-[var(--color-modal-scrim)] px-3 py-1 text-[color:var(--color-white)] tabular-nums",
);

/** Spread on a media frame so the DS atoms inside (IconButton, Button) take their dark look. */
export const MEDIA_THEME = { "data-theme": "dark" } as const;
