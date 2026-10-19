// Everything IDEEZA keeps in this browser, as a whole (Settings › AI & your
// data): its localStorage keys (`ideeza:…`, `ideeza-theme`), its
// sessionStorage keys (a tab's scroll places and drafts) and its IndexedDB
// databases (`ideeza-profile`, `-media`, `-blog`, `-messages`, `-video`, and
// any later `ideeza…` one the browser lists). The app keeps nothing in Cache
// Storage or cookies.
//
// - dumpIndexedDb reads every record of every database without creating one.
// - eraseBrowserData clears all of it; restoreBrowserData replaces all of it
//   with a backup. Both then reload, and until the page is gone a `pagehide`
//   guard writes the result once more, so a store still holding the old data
//   in memory can't save it back on the way out.

import { BLOG_FILES_DB } from "../blog/files";
import { MEDIA_DB } from "../manual/journey-store";
import { FILES_DB } from "../messages/files";
import { PHOTO_DB } from "../people/photo-store";
import { CLIP_DB } from "../video/clip-store";
import {
  BACKUP_PATH,
  blobRefs,
  decodeValue,
  encodeValue,
  findBackup,
  isAppKey,
  parseBackup,
  restorePlan,
  type Backup,
  type DbDump,
  type RestorePlan,
  type StoreDump,
} from "./backup-format";
import { markBackedUp } from "./backup";
import { listZip, readEntry, ZipReadError } from "./zip-read";

export const APP_DBS: readonly string[] = [PHOTO_DB, MEDIA_DB, BLOG_FILES_DB, FILES_DB, CLIP_DB];

/** A copy of every localStorage key this site holds. */
export function storageSnapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const s = window.localStorage;
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (key === null) continue;
      const v = s.getItem(key);
      if (v !== null) out[key] = v;
    }
  } catch {
    // Site data blocked: there is nothing to read.
  }
  return out;
}

/** The app's databases that exist here now. */
async function existingDbs(): Promise<string[]> {
  if (typeof indexedDB === "undefined") return [];
  if (indexedDB.databases) {
    try {
      const listed = (await indexedDB.databases()).map((d) => d.name).filter((n): n is string => !!n && n.startsWith("ideeza"));
      return [...new Set([...APP_DBS.filter((n) => listed.includes(n)), ...listed])];
    } catch {
      // Fall through: open each one without creating it.
    }
  }
  const found: string[] = [];
  for (const name of APP_DBS) if (await openExisting(name).then((db) => (db ? (db.close(), true) : false))) found.push(name);
  return found;
}

/** The database at its current version; null when it doesn't exist (nothing is created). */
function openExisting(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let created = false;
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(name);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      created = true;
      req.transaction?.abort();
    };
    req.onsuccess = () => {
      if (created) {
        req.result.close();
        resolve(null);
      } else resolve(req.result);
    };
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export type DumpedFile = { path: string; blob: Blob };

/** Every record of the app's databases, each file in them swapped for the path `place` gives it. */
export async function dumpIndexedDb(
  place: (db: string, record: unknown, key: unknown, field: string, blob: Blob) => string,
): Promise<{ dbs: DbDump[]; files: DumpedFile[] }> {
  const dbs: DbDump[] = [];
  const files: DumpedFile[] = [];
  for (const name of await existingDbs()) {
    const db = await openExisting(name);
    if (!db) continue;
    try {
      const stores: StoreDump[] = [];
      for (const storeName of Array.from(db.objectStoreNames)) {
        const store = db.transaction(storeName, "readonly").objectStore(storeName);
        const [keys, values] = await Promise.all([result(store.getAllKeys()), result(store.getAll())]);
        const outOfLine = store.keyPath === null;
        stores.push({
          name: storeName,
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement,
          indexes: Array.from(store.indexNames).map((n) => {
            const i = store.index(n);
            return { name: i.name, keyPath: i.keyPath, unique: i.unique, multiEntry: i.multiEntry };
          }),
          records: values.map((value, i) => {
            const key = keys[i];
            const coded = encodeValue(value, (blob, field) => {
              const path = place(name, value, key, field, blob);
              files.push({ path, blob });
              return path;
            });
            return outOfLine ? { key, value: coded } : { value: coded };
          }),
        });
      }
      dbs.push({ name, version: db.version, stores });
    } finally {
      db.close();
    }
  }
  return { dbs, files };
}

/** Deletes a database; waits while another tab still holds it, up to `waitMs`. */
function deleteDb(name: string, waitMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.deleteDatabase(name);
    } catch {
      resolve(false);
      return;
    }
    const timer = window.setTimeout(() => resolve(false), waitMs);
    req.onsuccess = () => {
      window.clearTimeout(timer);
      resolve(true);
    };
    req.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
  });
}

function appKeysOf(s: Storage): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k !== null && isAppKey(k)) out.push(k);
  }
  return out;
}

function clearAppKeys(): void {
  for (const s of [window.localStorage, window.sessionStorage]) {
    try {
      for (const k of appKeysOf(s)) s.removeItem(k);
    } catch {
      // Site data blocked: there is nothing here to clear.
    }
  }
}

/** Where the page lands after an erase or a restore, which then says what happened. */
export const DONE_PARAM = "done";

/** Writes once more as the page goes, then reloads the page fresh. */
function reloadAfter(writeAgain: () => void, done: "erased" | "restored"): void {
  window.addEventListener("pagehide", writeAgain);
  window.location.replace(`/settings/data?${DONE_PARAM}=${done}`);
}

/** Erases IDEEZA from this browser: every key, every database. False when a database couldn't
 *  be deleted (another tab is holding it). The page reloads either way. */
export async function eraseBrowserData(): Promise<boolean> {
  clearAppKeys();
  const names = [...new Set([...APP_DBS, ...(await existingDbs())])];
  const done = await Promise.all(names.map((n) => deleteDb(n)));
  clearAppKeys();
  reloadAfter(clearAppKeys, "erased");
  return done.every(Boolean);
}

async function writeDb(dump: DbDump, file: (path: string, type: string) => Blob): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(dump.name, dump.version);
    req.onupgradeneeded = () => {
      const up = req.result;
      for (const s of dump.stores) {
        if (up.objectStoreNames.contains(s.name)) continue;
        const store = up.createObjectStore(s.name, { keyPath: s.keyPath ?? undefined, autoIncrement: s.autoIncrement });
        for (const i of s.indexes) store.createIndex(i.name, i.keyPath, { unique: i.unique, multiEntry: i.multiEntry });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("blocked"));
  });
  try {
    const names = dump.stores.map((s) => s.name).filter((n) => db.objectStoreNames.contains(n));
    if (!names.length) return;
    const tx = db.transaction(names, "readwrite");
    for (const s of dump.stores) {
      if (!names.includes(s.name)) continue;
      const store = tx.objectStore(s.name);
      store.clear();
      for (const r of s.records) {
        const value = decodeValue(r.value, file);
        if (s.keyPath === null) store.put(value, r.key as IDBValidKey);
        else store.put(value);
      }
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export type RestoreFailure = "files" | "storage";

/** Replaces everything IDEEZA keeps here with `backup` (its files read from the zip into
 *  `files`), then reloads. Databases first, keys last, so a browser that refuses the files
 *  ("files") has not yet touched the projects and settings; one that runs out of room for the
 *  keys ("storage") has. */
export async function restoreBrowserData(backup: Backup, files: ReadonlyMap<string, Blob>): Promise<{ ok: true } | { ok: false; failed: RestoreFailure }> {
  const file = (path: string, type: string) => files.get(path) ?? new Blob([], { type });
  try {
    for (const name of [...new Set([...APP_DBS, ...(await existingDbs())])]) await deleteDb(name);
    for (const dump of backup.indexedDB) await writeDb(dump, file);
  } catch {
    return { ok: false, failed: "files" };
  }
  const writeKeys = () => {
    clearAppKeys();
    for (const [k, v] of Object.entries(backup.localStorage)) window.localStorage.setItem(k, v);
  };
  try {
    writeKeys();
  } catch {
    return { ok: false, failed: "storage" };
  }
  markBackedUp(backup.madeAt);
  reloadAfter(() => {
    try {
      writeKeys();
      markBackedUp(backup.madeAt);
    } catch {
      // The first write went through; this one only guards against a late save.
    }
  }, "restored");
  return { ok: true };
}

export type BackupError = "not-zip" | "foreign" | "newer" | "damaged" | "unsupported";

export type ReadBackup = { ok: true; backup: Backup; files: Map<string, Blob>; plan: RestorePlan } | { ok: false; error: BackupError };

/** Reads a zip Download made: its backup checked, every file it names read and checked, and
 *  what restoring it here would do. Nothing is written. */
export async function readBackupZip(file: Blob): Promise<ReadBackup> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = listZip(bytes);
    const at = findBackup(entries.map((e) => e.name));
    if (!at) return { ok: false, error: "foreign" };
    const prefix = at.slice(0, at.length - BACKUP_PATH.length);
    const byName = new Map(entries.map((e) => [e.name, e]));
    const parsed = parseBackup(new TextDecoder().decode(await readEntry(bytes, byName.get(at)!)));
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const files = new Map<string, Blob>();
    for (const ref of blobRefs(parsed.backup)) {
      if (files.has(ref.path)) continue;
      const entry = byName.get(prefix + ref.path);
      if (!entry) return { ok: false, error: "damaged" };
      files.set(ref.path, new Blob([(await readEntry(bytes, entry)) as BlobPart], { type: ref.type }));
    }
    return { ok: true, backup: parsed.backup, files, plan: restorePlan(parsed.backup, storageSnapshot()) };
  } catch (e) {
    if (e instanceof ZipReadError) return { ok: false, error: e.code };
    return { ok: false, error: "damaged" };
  }
}
