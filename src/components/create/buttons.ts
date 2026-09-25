// The canvas's quiet button family — Refine, Regenerate, Add a product, the
// spec's fixes — so the Build button stays the only filled one. Kept in its
// own module because the card and the spec panel inside it both use it.

export const OUTLINE_BUTTON =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";
export const OUTLINE_BUTTON_OFF =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-medium text-text-disabled outline-none";
/** Quieter still: no edge, the same size and words as the outline family —
 *  for a second action beside one of them, like the sheet's Change by
 *  message beside Done. */
export const GHOST_BUTTON =
  "inline-flex h-[36px] items-center gap-[8px] rounded-lg px-[12px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus";
