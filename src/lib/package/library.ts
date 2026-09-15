// Where a finished package goes.
//
// Every new package starts private; publishing is the deliberate, separate
// choice made on Finalize. A published package is locked at version 1 — a later
// edit has to create a new version rather than changing what other people's
// designs already depend on, so the store is append-only by (name, version).
//
// The rows are also surfaced to the Place-a-Part picker's Personal rail through
// part-catalog.ts, so an authored package is a real, findable part rather than
// an entry in a list nothing reads.

import {
  type Body3D,
  type Category,
  type FpObj,
  type Mounting,
  type PackageDraft,
  type SymObj,
  type Visibility,
  electricalPads,
  symPins,
} from "./types";

const KEY = "ideeza:pcb:personalPackages";

export type SavedPackage = {
  id: string;
  name: string;
  category: Category;
  description: string;
  visibility: Visibility;
  /** Locked at 1 on publish; a later edit is a new version, not an overwrite. */
  version: number;
  createdAt: string;
  /** How the part's data got here — reported on the confirmation screen. */
  path: "import" | "wizard" | "custom";
  prefix: string;
  value: string;
  mounting: Mounting;
  pins: number;
  pads: number;
  symbol: SymObj[];
  footprint: FpObj[];
  body: Body3D;
};

export function readPackages(): SavedPackage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is SavedPackage => !!x && typeof x.name === "string" && !!x.name.trim());
  } catch {
    return [];
  }
}

/** The next version for this name — 1 for a new package, n+1 for a re-save. */
export function nextVersion(name: string): number {
  const taken = readPackages().filter((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  return taken.length ? Math.max(...taken.map((p) => p.version)) + 1 : 1;
}

export function savePackage(draft: PackageDraft): SavedPackage {
  const name = draft.name.trim();
  const rec: SavedPackage = {
    id: `pkg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    category: (draft.category || "Passive") as Category,
    description: draft.description.trim(),
    visibility: draft.visibility,
    version: nextVersion(name),
    createdAt: new Date().toISOString(),
    path: draft.path ?? "custom",
    prefix: draft.prefix,
    value: draft.value,
    mounting: draft.mounting,
    pins: symPins(draft).length,
    pads: electricalPads(draft).length,
    symbol: draft.symbol,
    footprint: draft.footprint,
    body: draft.body,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...readPackages(), rec]));
    } catch {}
  }
  return rec;
}
