// The pressed state every tappable thing in /m shows under the finger (mobile
// UX lens 16): a phone has no hover, so without it a tap gives no feedback.
//
// · PRESSED — the DS state layer: text/primary at opacity/pressed over
//   whatever is under it, so it reads on a card, the page, a sheet or a tint,
//   in both themes. It only lights an enabled <button> or an <a href>, so a
//   static row that shares a row class (LIST_ROW on an <li>) never flashes.
// · PRESSED_SECONDARY — the DS Secondary button's own hover / pressed fills,
//   for the 44 px Secondary icon buttons (A02) that draw neither.
// · PRESSED_DIM — a text action (A03 Link in a toast) or a tab-bar item dims
//   to opacity/muted while pressed (the native tab bar's press).
//
// Tailwind reads class names from the source, so each one is written out whole.

export const PRESSED =
  "enabled:active:bg-[color-mix(in_srgb,var(--color-text-primary)_calc(var(--opacity-pressed)*100%),transparent)] [&[href]]:active:bg-[color-mix(in_srgb,var(--color-text-primary)_calc(var(--opacity-pressed)*100%),transparent)]";

export const PRESSED_SECONDARY =
  "hover:bg-[var(--color-button-secondary-bg-hover)] active:bg-[var(--color-button-secondary-bg-pressed)]";

export const PRESSED_DIM = "transition-opacity duration-fast active:opacity-[var(--opacity-muted)]";
