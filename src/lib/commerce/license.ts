// The ladder's license fix (Build and Earn P1-4, L3 "license set"). The
// license lives where the Brief keeps it, `state.license` in the project's
// draft (`ideeza:brief:draft:<projectId>`), so the mint flow's Details step
// reads the same choice. A project minted before every intent chose a
// license gets it set here without reopening the Brief.
//
// Only the license field changes: every other field of the stored draft is
// written back as it was. A draft that can't be read is never overwritten.
// Relative imports only (node:test).

import { briefDraftKey, DEFAULT_STATE, LICENSES, type License } from "../brief/types";

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function isLicense(v: unknown): v is License {
  return typeof v === "string" && LICENSES.some((l) => l.value === v);
}

/**
 * The draft to store with `license` chosen: the stored one with its license
 * replaced, or, with no draft yet, a fresh one at its first step. `null` when
 * the stored draft can't be read: overwriting it would lose it.
 */
export function draftWithLicense(raw: string | null, license: License): string | null {
  if (!raw) return JSON.stringify({ state: { ...DEFAULT_STATE, license }, step: "idea" });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isDict(parsed) || !isDict(parsed.state)) return null;
  return JSON.stringify({ ...parsed, state: { ...parsed.state, license } });
}

export type LicenseWrite = "saved" | "unreadable" | "refused";

/**
 * Writes the license into the project's draft, then tells this tab's readers
 * (`useProjectBrief` listens for `storage`, which a same-tab write doesn't fire).
 */
export function saveDraftLicense(projectId: string, license: License): LicenseWrite {
  if (typeof window === "undefined") return "refused";
  const key = briefDraftKey(projectId);
  let next: string | null;
  try {
    next = draftWithLicense(window.localStorage.getItem(key), license);
  } catch {
    return "refused";
  }
  if (next === null) return "unreadable";
  try {
    window.localStorage.setItem(key, next);
  } catch {
    return "refused";
  }
  window.dispatchEvent(new StorageEvent("storage", { key }));
  return "saved";
}
