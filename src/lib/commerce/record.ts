// The commerce record (Build and Earn P1-1, storage migration commerce-split@1):
// `ideeza:commerce:<projectId>` holds the commerce fields a `ManualProject`
// still carries — `mint`, each contributor's `share`, `legal` and
// `ownerConfirmedAt`. `showcasedAt` stays in engineering. While the split
// settles, both copies are kept:
// - read: the commerce copy is laid over the record's own fields, field by
//   field, and wins (`withCommerceRecord`); a field it lacks reads from the record;
// - write: every list the projects store writes is mirrored here
//   (`mirrorCommerce`), and the record keeps its fields, so a rollback that
//   reads only `ideeza:manual:projects` loses nothing;
// - delete: the key goes on `ideeza:project-deleted` (`removeCommerceOnDelete`).
// The projects store reaches these through its record hooks
// (manual/record-hooks.ts); it never imports this file.
//
// Pure over a storage-like object; relative imports, so node:test loads it.

import { normalizeMintRecord } from "../wallet/mint";
import type { MintRecord } from "../wallet/types";
import {
  normalizeLegal,
  onProjectDeleted,
  type ManualProject,
  type ProjectLegal,
  type ProjectRecordHooks,
} from "../manual/public";

export const COMMERCE_KEY_PREFIX = "ideeza:commerce:";
export const commerceKey = (projectId: string) => `${COMMERCE_KEY_PREFIX}${projectId}`;

export type CommerceRecord = {
  v: 1;
  mint?: MintRecord;
  /** `contributors[].share`, by contributor id. */
  shares?: Record<string, number>;
  legal?: ProjectLegal;
  ownerConfirmedAt?: number;
};

export type CommerceStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** This browser's localStorage; null on the server or when site data is blocked. */
export function browserCommerceStore(): CommerceStore | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const isDict = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isShare = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100;

/** The record's fields in one fixed order, absent ones dropped; null when none is left. */
function recordOf(parts: Omit<CommerceRecord, "v">): CommerceRecord | null {
  const rec: CommerceRecord = { v: 1 };
  if (parts.mint) rec.mint = parts.mint;
  if (parts.shares && Object.keys(parts.shares).length) rec.shares = parts.shares;
  if (parts.legal) rec.legal = parts.legal;
  if (parts.ownerConfirmedAt !== undefined) rec.ownerConfirmedAt = parts.ownerConfirmedAt;
  return Object.keys(rec).length > 1 ? rec : null;
}

/** The commerce fields as the project record holds them; null when it holds none. */
export function commerceRecordOf(
  p: Pick<ManualProject, "mint" | "contributors" | "legal" | "ownerConfirmedAt">,
): CommerceRecord | null {
  const shares = p.contributors?.length ? Object.fromEntries(p.contributors.map((c) => [c.id, c.share])) : undefined;
  return recordOf({ mint: p.mint, shares, legal: p.legal, ownerConfirmedAt: p.ownerConfirmedAt });
}

/** A stored record, each field through its own check (a bad one is dropped); null when it isn't one. */
export function normalizeCommerceRecord(raw: unknown): CommerceRecord | null {
  if (!isDict(raw) || raw.v !== 1) return null;
  const shares = isDict(raw.shares)
    ? Object.fromEntries(Object.entries(raw.shares).filter((e): e is [string, number] => isShare(e[1])))
    : undefined;
  return (
    recordOf({
      mint: raw.mint === undefined ? undefined : normalizeMintRecord(raw.mint),
      shares,
      legal: raw.legal === undefined ? undefined : normalizeLegal(raw.legal),
      ownerConfirmedAt: isTime(raw.ownerConfirmedAt) ? raw.ownerConfirmedAt : undefined,
    }) ?? { v: 1 }
  );
}

/** The key, read: `unreadable` when it's present but isn't a record — left exactly as it is. */
export function readCommerceRecord(store: CommerceStore, projectId: string): { record: CommerceRecord | null; unreadable: boolean } {
  let raw: string | null;
  try {
    raw = store.getItem(commerceKey(projectId));
  } catch {
    return { record: null, unreadable: false };
  }
  if (raw === null) return { record: null, unreadable: false };
  try {
    const record = normalizeCommerceRecord(JSON.parse(raw));
    return record ? { record, unreadable: false } : { record: null, unreadable: true };
  } catch {
    return { record: null, unreadable: true };
  }
}

/** JSON with every object's keys sorted, so two values that differ only in key order (a
 *  normalizer's order against the stored one) compare equal. */
function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    isDict(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x,
  );
}
export const sameValue = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const same = sameValue;

/** `p` with `rec`'s fields laid over its own (the new key wins); `p` itself when nothing differs.
 *  A share lands only on a co-owner, and only as a whole 1–100, so the record stays one the
 *  contributors' normalizer would keep. */
export function withCommerceRecord(p: ManualProject, rec: CommerceRecord | null): ManualProject {
  if (!rec) return p;
  let next = p;
  const set = <K extends keyof ManualProject>(key: K, value: ManualProject[K] | undefined) => {
    if (value === undefined || same(next[key], value)) return;
    next = { ...next, [key]: value };
  };
  set("mint", rec.mint);
  set("legal", rec.legal);
  set("ownerConfirmedAt", rec.ownerConfirmedAt);
  const shares = rec.shares;
  if (shares && p.contributors?.length) {
    const contributors = p.contributors.map((c) => {
      const share = shares[c.id];
      return c.role === "coOwner" && share !== undefined && share >= 1 && share !== c.share ? { ...c, share } : c;
    });
    if (contributors.some((c, i) => c !== p.contributors![i])) next = { ...next, contributors };
  }
  return next;
}

/** `existing` with `from`'s fields filling what it lacks: the copy already here wins. */
export function mergeCommerceRecords(existing: CommerceRecord | null, from: CommerceRecord | null): CommerceRecord | null {
  if (!existing) return from;
  if (!from) return existing;
  return recordOf({
    mint: existing.mint ?? from.mint,
    shares: existing.shares || from.shares ? { ...from.shares, ...existing.shares } : undefined,
    legal: existing.legal ?? from.legal,
    ownerConfirmedAt: existing.ownerConfirmedAt ?? from.ownerConfirmedAt,
  });
}

/** The commerce copy of every project in `list`, written to match its record. A key that can't
 *  be read is left as it is (its project reads its record's fields). A write the browser refuses
 *  removes the key instead, so a stale copy never wins over the record. */
export function mirrorCommerce(store: CommerceStore, list: readonly ManualProject[]): void {
  for (const p of list) {
    const key = commerceKey(p.id);
    try {
      const stored = readCommerceRecord(store, p.id);
      if (stored.unreadable) continue;
      const rec = commerceRecordOf(p);
      if (!rec) {
        if (store.getItem(key) !== null) store.removeItem(key);
        continue;
      }
      if (stored.record && sameValue(stored.record, rec)) continue;
      try {
        store.setItem(key, JSON.stringify(rec));
      } catch {
        store.removeItem(key);
      }
    } catch {
      // Storage itself is unreachable: there is nothing to keep in step.
    }
  }
}

export function removeCommerceRecord(store: CommerceStore, projectId: string): void {
  try {
    store.removeItem(commerceKey(projectId));
  } catch {
    // Blocked site data: nothing was stored either.
  }
}

/** Removes a project's commerce key when the project is deleted (`ideeza:project-deleted`);
 *  returns the unsubscribe. */
export function removeCommerceOnDelete(store: CommerceStore): () => void {
  return onProjectDeleted((id) => removeCommerceRecord(store, id));
}

/** The projects store's hooks (manual/record-hooks.ts) over `store()`, read when they run. */
export function commerceRecordHooks(store: () => CommerceStore | null): ProjectRecordHooks {
  return {
    id: "commerce",
    read: (p) => {
      const s = store();
      return s ? withCommerceRecord(p, readCommerceRecord(s, p.id).record) : p;
    },
    wrote: (list) => {
      const s = store();
      if (s) mirrorCommerce(s, list);
    },
  };
}
