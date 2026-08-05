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

// ── ERC / DRC severity ───────────────────────────────────────────────────────
// One place for the 4 levels, so the bottom panel's dots and the canvas markers
// can never disagree about what "error" looks like.
export type SevKey = "fatal" | "error" | "warn" | "info";
export const SEV_META: Record<SevKey, { label: string; color: string }> = {
  fatal: { label: "Fatal Error", color: "var(--color-text-error)" },
  error: { label: "Error", color: "var(--color-pcb-violation)" },
  warn: { label: "Warn", color: "var(--color-text-warning)" },
  info: { label: "Info", color: "var(--color-text-secondary)" },
};
export const SEV_ORDER: SevKey[] = ["fatal", "error", "warn", "info"];
/** ErcSeverity ("fatal"|"error"|"warning"|"note") → filter/severity key. */
export const sevKeyOf = (s: string): SevKey =>
  s === "warning" ? "warn" : s === "note" ? "info" : s === "fatal" ? "fatal" : s === "error" ? "error" : "info";
