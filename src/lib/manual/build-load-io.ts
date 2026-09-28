// BUILDLOAD's storage half: seed a product's documents on its first open,
// Load a later version through the confirm, Restore the one backup slot,
// and record "Got it" on a notice (P2-BUILDLOAD-7, 9, 10, 12). Each takes
// the Storage it works on, so node:test runs it on a Map shim, and each is
// all-or-nothing: a refused write puts back every key it touched.
//
// Pure apart from the injected storage, relative imports only (node:test).

import type { BuildJob, BuildProduct } from "../create/history";
import {
  SEED_FAILED_MESSAGE,
  SEED_KEYS,
  decideSeed,
  editorOfKey,
  fingerprintOf,
  normalizeSeed,
  restoredAnnouncement,
  loadedAnnouncement,
  seedPlanOf,
  serializeSeedDoc,
  type EditorSeed,
  type SeedEditor,
  type SeedKey,
  type SeedPlan,
  type SeedReports,
} from "./build-load";
import { editorDocKey, legacyDocKey, prevKey, seedRecordKey } from "./editor-scope";
import type { EditorScope } from "./p2-types";

export type SeedStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The build a row is — `ProjectProduct["built"]` satisfies it. */
export type SeedBuilt = {
  ref: { version: number; job: BuildJob | null };
  product: BuildProduct;
};

// ───────────────────────────── a write that can be undone ─────────────────────────────

function read(storage: SeedStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Every key it writes or removes, with the value it had first, so a refused
 *  write can put all of them back. */
class Tx {
  private original = new Map<string, string | null>();
  constructor(private storage: SeedStorage) {}
  private touch(key: string) {
    if (!this.original.has(key)) this.original.set(key, read(this.storage, key));
  }
  set(key: string, value: string) {
    this.touch(key);
    this.storage.setItem(key, value); // throws on a refused write
  }
  remove(key: string) {
    this.touch(key);
    this.storage.removeItem(key);
  }
  rollback() {
    for (const [key, value] of [...this.original].reverse()) {
      try {
        if (value === null) this.storage.removeItem(key);
        else this.storage.setItem(key, value);
      } catch {
        // Best effort: putting back a value never needs more room than the
        // pass that failed took, but a blocked store can refuse even that.
      }
    }
    this.original.clear();
  }
}

/** The entries of an all-optional record named by `keys` (or all the others). */
function pick<T extends object>(o: T, keys: readonly (keyof T)[]): T {
  const out = {} as T;
  for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
  return out;
}
function omit<T extends object>(o: T, keys: readonly (keyof T)[]): T {
  const out = { ...o };
  for (const k of keys) delete out[k];
  return out;
}
const editorsOf = (keys: readonly SeedKey[]): SeedEditor[] => [...new Set(keys.map(editorOfKey))];

/** Reports with `editors` taken from `from` — and dropped where `from` has none. */
function withReports(base: SeedReports, from: SeedReports, editors: readonly SeedEditor[]): SeedReports {
  const out: Record<string, unknown> = { ...base };
  for (const e of editors) {
    if (from[e] !== undefined) out[e] = from[e];
    else delete out[e];
  }
  return out as SeedReports;
}

// ───────────────────────────── the record ─────────────────────────────

/** The product's seed record, or null when there is none or it doesn't
 *  normalise. */
export function readSeed(scope: EditorScope, storage: SeedStorage): EditorSeed | null {
  const raw = read(storage, seedRecordKey(scope));
  return raw === null ? null : normalizeSeed(raw);
}

// ───────────────────────────── first open ─────────────────────────────

export type EnsureResult =
  | { status: "skipped"; record: null }
  | { status: "exists"; record: EditorSeed }
  /** `stored` is false when a record that doesn't normalise is in the way:
   *  it is never rewritten, so the per-document rule decides every open. */
  | { status: "seeded"; record: EditorSeed; written: SeedKey[]; stored: boolean }
  | { status: "failed"; record: null; message: string };

/** Seeds every document the product's build supplies, on its first open
 *  (P2-BUILDLOAD-7). Does nothing when the row isn't built or its record
 *  exists. Documents first, then the record; a refused write removes this
 *  pass's documents and writes no record, so the next open tries again.
 *  `headRowId` is the project's first row — the only one that can own a
 *  legacy per-project document (EDITOR P2-EDITOR-3). */
export function ensureSeeded(
  scope: EditorScope,
  built: SeedBuilt | null,
  now: number,
  storage: SeedStorage,
  headRowId: string,
): EnsureResult {
  const job = built?.ref.job;
  if (!built || !job) return { status: "skipped", record: null };
  const recKey = seedRecordKey(scope);
  const rawRecord = read(storage, recKey);
  if (rawRecord !== null) {
    const existing = normalizeSeed(rawRecord);
    if (existing) return { status: "exists", record: existing };
  }

  const plan = seedPlanOf(job, built.product, built.ref.version);
  const isHead = scope.productId === headRowId;
  const tx = new Tx(storage);
  const seeded: Partial<Record<SeedKey, string>> = {};
  const kept: SeedKey[] = [];
  const written: SeedKey[] = [];
  const dropLegacy: string[] = [];
  try {
    for (const key of SEED_KEYS) {
      if (plan.docs[key] === undefined) continue;
      const docKey = editorDocKey(key, scope);
      const legacyKey = isHead ? legacyDocKey(key, scope.projectId) : null;
      const scoped = read(storage, docKey);
      const legacy = legacyKey ? read(storage, legacyKey) : null;
      const d = decideSeed(key, scoped, legacy);
      if (d.action === "keep") {
        kept.push(key);
        continue;
      }
      const raw = serializeSeedDoc(key, plan.docs[key], scoped ?? (d.dropLegacy ? legacy : null));
      tx.set(docKey, raw);
      seeded[key] = fingerprintOf(key, raw)!;
      written.push(key);
      if (d.dropLegacy && legacyKey) dropLegacy.push(legacyKey);
    }
    const record: EditorSeed = {
      v: 1,
      from: plan.from,
      at: now,
      seeded,
      kept,
      reports: plan.reports,
      dismissed: [],
      backup: null,
    };
    const stored = rawRecord === null;
    if (stored) tx.set(recKey, JSON.stringify(record));
    // The seed has the legacy doc's place now; removing never needs room.
    for (const k of dropLegacy) {
      try {
        storage.removeItem(k);
      } catch {
        // Left behind, it is still pristine, and the scoped key wins the read.
      }
    }
    return { status: "seeded", record, written, stored };
  } catch {
    tx.rollback();
    return { status: "failed", record: null, message: SEED_FAILED_MESSAGE };
  }
}

// ───────────────────────────── Load version m ─────────────────────────────

export type LoadResult =
  | { ok: true; record: EditorSeed; message: string }
  /** backup: the copies to `:prev` were refused (and undone) — offer
   *  "Replace without keeping". write: a document or the record was refused,
   *  and every key is back as it was. none: nothing to replace. record: a
   *  record that doesn't normalise is in the way, and is never rewritten. */
  | { ok: false; reason: "backup" | "write" | "none" | "record" };

/** Replaces `keys` with version `plan.from.version`'s documents
 *  (P2-BUILDLOAD-9). The caller has already released the PCB store's scope.
 *  With `keep` (the default) each replaced document is copied to its `:prev`
 *  slot first, for Restore; `keep: false` is "Replace without keeping". */
export function loadVersion(
  scope: EditorScope,
  plan: SeedPlan,
  keys: readonly SeedKey[],
  now: number,
  storage: SeedStorage,
  opts: { keep?: boolean } = {},
): LoadResult {
  const recKey = seedRecordKey(scope);
  const rawRecord = read(storage, recKey);
  const record: EditorSeed | null = rawRecord === null ? null : normalizeSeed(rawRecord);
  if (rawRecord !== null && !record) return { ok: false, reason: "record" };
  const base: EditorSeed = record ?? {
    v: 1,
    from: plan.from,
    at: now,
    seeded: {},
    kept: [],
    reports: {},
    dismissed: [],
    backup: null,
  };
  const ks = SEED_KEYS.filter((k) => keys.includes(k) && plan.docs[k] !== undefined);
  if (!ks.length) return { ok: false, reason: "none" };
  const keep = opts.keep !== false;
  const current = new Map(ks.map((k) => [k, read(storage, editorDocKey(k, scope))] as const));

  const tx = new Tx(storage);
  if (keep) {
    try {
      for (const k of ks) {
        const slot = prevKey(editorDocKey(k, scope));
        const cur = current.get(k) ?? null;
        if (cur === null) tx.remove(slot);
        else tx.set(slot, cur);
      }
    } catch {
      tx.rollback();
      return { ok: false, reason: "backup" };
    }
  }

  const editors = editorsOf(ks);
  const wasKept = ks.some((k) => base.kept.includes(k));
  try {
    const fps: Partial<Record<SeedKey, string>> = {};
    for (const k of ks) {
      const raw = serializeSeedDoc(k, plan.docs[k], current.get(k) ?? null);
      tx.set(editorDocKey(k, scope), raw);
      fps[k] = fingerprintOf(k, raw)!;
    }
    const next: EditorSeed = {
      ...base,
      from: plan.from,
      at: now,
      seeded: { ...omit(base.seeded, ks), ...fps },
      kept: base.kept.filter((k) => !ks.includes(k)),
      reports: withReports(base.reports, plan.reports, editors),
      dismissed: base.dismissed.filter((e) => !editors.includes(e)),
      backup: keep
        ? {
            version: wasKept ? null : base.from.version,
            keys: ks,
            at: now,
            prev: {
              from: base.from,
              seeded: pick(base.seeded, ks),
              kept: base.kept.filter((k) => ks.includes(k)),
              reports: pick(base.reports, editors),
            },
          }
        : null,
    };
    tx.set(recKey, JSON.stringify(next));
    // One slot: a backup slot no longer named by the record goes — the old
    // backup's other keys, and with "without keeping", these keys' too.
    const stale = [...(base.backup?.keys ?? []), ...(keep ? [] : ks)].filter((k) => !keep || !ks.includes(k));
    for (const k of new Set(stale)) {
      try {
        storage.removeItem(prevKey(editorDocKey(k, scope)));
      } catch {
        // An orphaned slot is swept with the project (editorKeysOf).
      }
    }
    return { ok: true, record: next, message: loadedAnnouncement(plan.from.version) };
  } catch {
    tx.rollback();
    return { ok: false, reason: "write" };
  }
}

// ───────────────────────────── Restore ─────────────────────────────

export type RestoreResult =
  | { ok: true; record: EditorSeed; message: string }
  | { ok: false; reason: "none" | "write" };

/** Swaps each backed-up document with its `:prev` slot, and the record's
 *  `from`, fingerprints, kept keys and reports with the backup's
 *  (P2-BUILDLOAD-10). The slot then holds what was replaced, so pressing
 *  again swaps back. The caller has already released the PCB store's scope. */
export function restoreBackup(scope: EditorScope, now: number, storage: SeedStorage): RestoreResult {
  const record = readSeed(scope, storage);
  const b = record?.backup;
  if (!record || !b) return { ok: false, reason: "none" };
  const ks = b.keys;
  const editors = editorsOf(ks);
  const tx = new Tx(storage);
  try {
    const restored = new Map<SeedKey, string | null>();
    for (const k of ks) {
      const docKey = editorDocKey(k, scope);
      const slot = prevKey(docKey);
      const cur = read(storage, docKey);
      const prv = read(storage, slot);
      if (prv === null) tx.remove(docKey);
      else tx.set(docKey, prv);
      if (cur === null) tx.remove(slot);
      else tx.set(slot, cur);
      restored.set(k, prv);
    }
    // A backup written before `prev` was kept: rebuild it from the slot.
    const prev = b.prev ?? {
      from: { ...record.from, version: b.version ?? record.from.version },
      seeded:
        b.version === null
          ? {}
          : Object.fromEntries(ks.flatMap((k) => {
              const fp = fingerprintOf(k, restored.get(k) ?? null);
              return fp ? [[k, fp]] : [];
            })),
      kept: b.version === null ? [...ks] : [],
      reports: pick(record.reports, editors),
    };
    const next: EditorSeed = {
      ...record,
      from: prev.from,
      seeded: { ...omit(record.seeded, ks), ...pick(prev.seeded, ks) },
      kept: [...record.kept.filter((k) => !ks.includes(k)), ...prev.kept.filter((k) => ks.includes(k))],
      reports: withReports(record.reports, prev.reports, editors),
      backup: {
        version: ks.some((k) => record.kept.includes(k)) ? null : record.from.version,
        keys: ks,
        at: now,
        prev: {
          from: record.from,
          seeded: pick(record.seeded, ks),
          kept: record.kept.filter((k) => ks.includes(k)),
          reports: pick(record.reports, editors),
        },
      },
    };
    tx.set(seedRecordKey(scope), JSON.stringify(next));
    return { ok: true, record: next, message: restoredAnnouncement(b.version) };
  } catch {
    tx.rollback();
    return { ok: false, reason: "write" };
  }
}

// ───────────────────────────── Got it ─────────────────────────────

/** "Got it" on an editor's import notice: it never shows again for this
 *  seed (a Load clears it for the editors it replaces). False when the
 *  record is missing, doesn't normalise, or the write was refused. */
export function dismissImportNotice(scope: EditorScope, editor: SeedEditor, storage: SeedStorage): boolean {
  const record = readSeed(scope, storage);
  if (!record) return false;
  if (record.dismissed.includes(editor)) return true;
  try {
    storage.setItem(seedRecordKey(scope), JSON.stringify({ ...record, dismissed: [...record.dismissed, editor] }));
    return true;
  } catch {
    return false;
  }
}
