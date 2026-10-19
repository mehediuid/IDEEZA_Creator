// The backup inside the zip Download makes (Settings › AI & your data):
// `ideeza-backup/backup.json` holds every IDEEZA key of this browser's
// localStorage as stored, and every record of IDEEZA's IndexedDB databases
// with each file (a photo, an attachment, a clip) swapped for the path of
// that file in the zip, where the readable pages also link to it. Restore
// from a backup reads it back, checks it, and says what it holds and what it
// replaces before anything is written.
//
// Version 1. A newer version is refused, never half-read.
// Pure; relative imports only (node:test loads it).

import { summarize, type CategoryId } from "./export";

export const BACKUP_FORMAT = "ideeza-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_PATH = "ideeza-backup/backup.json";

export type BlobRef = { $blob: { path: string; type: string } };

export type StoreDump = {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: { name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }[];
  /** `key` only for a store without a key path (it keeps its keys out of line). */
  records: { key?: unknown; value: unknown }[];
};

export type DbDump = { name: string; version: number; stores: StoreDump[] };

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  madeAt: number;
  localStorage: Record<string, string>;
  indexedDB: DbDump[];
};

/** IDEEZA's own keys: `ideeza:…`, and `ideeza-theme`. Another site's key on the same origin never goes. */
export const isAppKey = (key: string): boolean => key.startsWith("ideeza:") || key.startsWith("ideeza-");

/** IDEEZA's keys of a storage copy, as they go in a backup. The video watch log that older
 *  versions kept is left behind. */
export function backupKeys(snapshot: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(snapshot)) {
    if (!isAppKey(key)) continue;
    out[key] = key === "ideeza:activity" ? withoutWatches(raw) : raw;
  }
  return out;
}

function withoutWatches(raw: string): string {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!isRec(v) || !("watches" in v)) return raw;
    const { watches: _old, ...rest } = v;
    void _old;
    return JSON.stringify(rest);
  } catch {
    return raw;
  }
}

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isBlob = (v: unknown): v is Blob => typeof Blob !== "undefined" && v instanceof Blob;
const isRef = (v: unknown): v is BlobRef =>
  isRec(v) && isRec(v.$blob) && typeof v.$blob.path === "string" && typeof v.$blob.type === "string" && Object.keys(v).length === 1;

/** A stored record made JSON-safe: each file in it becomes a BlobRef to the path `place` gives it
 *  (`field` is the name it sits under). Dates become `{ $date }`. */
export function encodeValue(value: unknown, place: (blob: Blob, field: string) => string, field = "file"): unknown {
  if (isBlob(value)) return { $blob: { path: place(value, field), type: value.type } };
  if (value instanceof Date) return { $date: value.getTime() };
  if (Array.isArray(value)) return value.map((x) => encodeValue(x, place, field));
  if (isRec(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(value)) out[k] = encodeValue(x, place, k);
    return out;
  }
  return value;
}

/** The record back, each BlobRef handed to `file` (which returns the Blob read from the zip). */
export function decodeValue(value: unknown, file: (path: string, type: string) => unknown): unknown {
  if (isRef(value)) return file(value.$blob.path, value.$blob.type);
  if (isRec(value) && typeof value.$date === "number" && Object.keys(value).length === 1) return new Date(value.$date);
  if (Array.isArray(value)) return value.map((x) => decodeValue(x, file));
  if (isRec(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(value)) out[k] = decodeValue(x, file);
    return out;
  }
  return value;
}

/** Every file a backup's records name. */
export function blobRefs(backup: Backup): { path: string; type: string }[] {
  const out: { path: string; type: string }[] = [];
  const walk = (v: unknown) => {
    if (isRef(v)) out.push(v.$blob);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (isRec(v)) Object.values(v).forEach(walk);
  };
  for (const db of backup.indexedDB) for (const s of db.stores) for (const r of s.records) walk(r.value);
  return out;
}

/** The backup's path in a zip: at the top, or inside the one folder a re-zip put round it. */
export function findBackup(names: readonly string[]): string | null {
  if (names.includes(BACKUP_PATH)) return BACKUP_PATH;
  const nested = names.filter((n) => !n.startsWith("__MACOSX/") && n.endsWith(`/${BACKUP_PATH}`)).sort((a, b) => a.length - b.length);
  return nested[0] ?? null;
}

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; error: "damaged" | "foreign" | "newer" };

const keyPathOk = (v: unknown) => typeof v === "string" || (Array.isArray(v) && v.every((x) => typeof x === "string"));

function storeOk(s: unknown): s is StoreDump {
  return (
    isRec(s) &&
    typeof s.name === "string" &&
    (s.keyPath === null || keyPathOk(s.keyPath)) &&
    typeof s.autoIncrement === "boolean" &&
    Array.isArray(s.indexes) &&
    s.indexes.every((i) => isRec(i) && typeof i.name === "string" && keyPathOk(i.keyPath)) &&
    Array.isArray(s.records) &&
    s.records.every((r) => isRec(r) && "value" in r)
  );
}

function dbOk(d: unknown): d is DbDump {
  return isRec(d) && typeof d.name === "string" && d.name.startsWith("ideeza") && Number.isInteger(d.version) && (d.version as number) >= 1 && Array.isArray(d.stores) && d.stores.every(storeOk);
}

/** backup.json checked: not ours, from a newer IDEEZA, or not whole. */
export function parseBackup(text: string): ParsedBackup {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, error: "damaged" };
  }
  if (!isRec(v) || v.format !== BACKUP_FORMAT) return { ok: false, error: "foreign" };
  if (!Number.isInteger(v.version) || (v.version as number) < 1) return { ok: false, error: "damaged" };
  if ((v.version as number) > BACKUP_VERSION) return { ok: false, error: "newer" };
  if (typeof v.madeAt !== "number" || !Number.isFinite(v.madeAt)) return { ok: false, error: "damaged" };
  const ls = v.localStorage;
  if (!isRec(ls) || !Object.entries(ls).every(([k, x]) => isAppKey(k) && typeof x === "string")) return { ok: false, error: "damaged" };
  if (!Array.isArray(v.indexedDB) || !v.indexedDB.every(dbOk)) return { ok: false, error: "damaged" };
  return { ok: true, backup: v as Backup };
}

export type RestorePlan = {
  madeAt: number;
  /** One line per kind of information: in the backup, and in this browser now. */
  holds: Record<CategoryId, string>;
  replaces: Record<CategoryId, string>;
  /** Photos, attachments and clips. */
  files: number;
  writes: Record<string, string>;
  /** IDEEZA keys here now that the backup doesn't have. */
  removes: string[];
  /** The backup holds nothing at all. */
  empty: boolean;
};

/** What restoring `backup` over this browser's storage copy `current` does. */
export function restorePlan(backup: Backup, current: Readonly<Record<string, string>>): RestorePlan {
  const mine = backupKeys(current);
  const writes = { ...backup.localStorage };
  const files = blobRefs(backup).length;
  const records = backup.indexedDB.reduce((n, d) => n + d.stores.reduce((m, s) => m + s.records.length, 0), 0);
  return {
    madeAt: backup.madeAt,
    holds: summarize(writes),
    replaces: summarize(mine),
    files,
    writes,
    removes: Object.keys(mine).filter((k) => !(k in writes)),
    empty: Object.keys(writes).length === 0 && records === 0,
  };
}
