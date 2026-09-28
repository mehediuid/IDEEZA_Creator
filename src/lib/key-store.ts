// One localStorage key, live — the pattern every Phase 2 store shares (spec
// §3.4): `useSyncExternalStore` over the key's raw string, re-read on
// `storage` (another tab wrote), `focus`, a same-tab event every writer here
// dispatches, and `ideeza:project-deleted` (the delete sweep removes keys
// without telling this tab). Every write reports to `reportWrite` (COR-93).
//
// The video, journey, editions and business-plan stores decode their own key
// on top of this; `MarketProvider` reads its four keys through the same
// subscription. Relative imports, so node:test can load the modules above it.

import * as React from "react";
import { PROJECT_DELETED_EVENT } from "./manual/events";
import { reportWrite } from "./storage-status";

/** Dispatched on `window` after every write made through this module. */
export const STORE_CHANGE_EVENT = "ideeza:store-change";

/** What every store writer returns. */
export type WriteResult = { ok: true } | { ok: false };

const SERVER = "\u0000server";
const EVENTS = ["storage", "focus", STORE_CHANGE_EVENT, PROJECT_DELETED_EVENT] as const;

/** The key's raw value; null when it's absent or storage can't be reached. */
export function readStoredKey(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Tells this tab's readers to re-read — `setItem` only reaches other tabs. */
export function notifyStores(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
}

/** Writes `value` as JSON, reports the outcome, and notifies this tab. */
export function writeStoredKey(key: string, value: unknown): WriteResult {
  let ok = false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    ok = true;
  } catch {
    // Quota, or blocked site data: reported below, and the prior value stands.
  }
  reportWrite(key, ok);
  notifyStores();
  return ok ? { ok: true } : { ok: false };
}

export function subscribeStores(onChange: () => void): () => void {
  for (const e of EVENTS) window.addEventListener(e, onChange);
  return () => {
    for (const e of EVENTS) window.removeEventListener(e, onChange);
  };
}

/** A stored value, parsed. `unreadable` = the key is present but isn't JSON. */
export function parseStored(raw: string | null): { value: unknown; unreadable: boolean } {
  if (raw === null) return { value: undefined, unreadable: false };
  try {
    return { value: JSON.parse(raw), unreadable: false };
  } catch {
    return { value: undefined, unreadable: true };
  }
}

/** The key's raw string, live. `hydrated` is false until the browser's copy
 *  has been read, so a surface never flashes an empty state at stored data. */
export function useStoredKey(key: string | null): { hydrated: boolean; raw: string | null } {
  const raw = React.useSyncExternalStore(
    subscribeStores,
    () => (key ? readStoredKey(key) : null),
    () => SERVER,
  );
  return raw === SERVER ? { hydrated: false, raw: null } : { hydrated: true, raw };
}
