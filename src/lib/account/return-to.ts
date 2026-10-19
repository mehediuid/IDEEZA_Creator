// The way back from Settings to the project that sent you there (Settings
// spec §5.5): the Earn ladder's Verify identity and Add a withdrawal method
// open Settings with `?from=<the project page you were on>`, and the settings
// page offers a link back. Only a path inside a project is taken, so the
// parameter can never send anyone off the site.
//
// Pure; no imports.

const PROJECT_PATH = /^\/projects\/([A-Za-z0-9_-]+)(?:\/[A-Za-z0-9_\-/]*)?$/;

/** The path to return to, or null for anything that isn't a project page. */
export function returnPathOf(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 200 || raw.includes("//")) return null;
  return PROJECT_PATH.test(raw) ? raw : null;
}

/** The project the return path belongs to. */
export function returnProjectIdOf(path: string): string | null {
  return PROJECT_PATH.exec(path)?.[1] ?? null;
}

/** `href` carrying where to come back to; `href` as it is without one. A hash stays last. */
export function withReturn(href: string, from: string | null): string {
  const path = returnPathOf(from);
  if (!path) return href;
  const [base, hash] = href.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}from=${encodeURIComponent(path)}${hash ? `#${hash}` : ""}`;
}
