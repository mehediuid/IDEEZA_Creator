// IDEEZA PCB Software — palette.
// Fully mapped onto IDEEZA semantic design tokens, so all editor chrome themes
// through the token system (light / dark via [data-theme]).
export const C = {
  primary: "var(--color-violet-600)",
  weak: "var(--color-bg-brand-subtle)",
  heading: "var(--color-text-primary)",
  text: "var(--color-text-primary)",
  body: "var(--color-text-secondary)",
  gray: "var(--color-text-tertiary)",
  g400: "var(--color-text-tertiary)",
  border: "var(--color-border-default)",
} as const;

// Raw primary hex, for the rare spot that needs a literal (e.g. rgba shadows).
export const PRIMARY_HEX = "#7c2db9";
