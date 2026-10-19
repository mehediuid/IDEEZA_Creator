// Your handle: the address of your profile, `/creators/<handle>` (Settings ›
// Profile, spec 2026-10-19-settings-design.md §5.2). 3–30 lower-case letters,
// numbers and hyphens, starting and ending with a letter or number. Whether a
// sample creator already has it is ids.ts's question. Pure, no imports.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/** What someone typed, as a handle is stored: trimmed and lower-cased. */
export function cleanHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Why `handle` (already cleaned) can't be a handle; null when it can. */
export function handleFormatProblem(handle: string): string | null {
  if (handle.length < HANDLE_MIN) return `Use at least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX) return `Use ${HANDLE_MAX} characters or fewer.`;
  if (/[^a-z0-9-]/.test(handle)) return "Use only lower-case letters, numbers and hyphens.";
  if (handle.startsWith("-") || handle.endsWith("-")) return "Start and end with a letter or number.";
  return null;
}
