// A project's journey (the Activity history), live — Phase 2 spec §3.4,
// §3.6.2, P2-TABS-9, C24.
// - The text is localStorage `ideeza:project:journey:<projectId>`,
//   normalized on every read. The delete sweep removes it with the project.
// - The files are IndexedDB `ideeza-media` / `files`, one record per blob,
//   indexed by `projectId`, so a project's files can go after its journey
//   key already has. VIDEO keeps its own `ideeza-video` (C24).
//
// Deleting an entry cascades to its files (`removeActivity`), and deleting the
// project clears every file of it (`useJourneyMediaSweep`, mounted once by
// MarketProvider, the one store at the root).

import * as React from "react";
import { onProjectDeleted } from "./events";
import { normalizeJourney, JOURNEY_KEY, type Activity, type ProjectJourney } from "./journey";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";

// ─────────────────────────── the text ───────────────────────────

export function decodeJourney(raw: string | null): ProjectJourney {
  return normalizeJourney(parseStored(raw).value);
}

export function readJourney(projectId: string): ProjectJourney {
  return decodeJourney(readStoredKey(JOURNEY_KEY(projectId)));
}

const isJourneyShape = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);

/** Refused (and the key left as it is) when the stored journey can't be read: writing over it
 *  would lose every entry this browser still holds. */
export function writeJourney(projectId: string, next: ProjectJourney): WriteResult {
  if (!projectId) return { ok: false };
  if (storedUnreadable(JOURNEY_KEY(projectId), isJourneyShape)) return { ok: false };
  return writeStoredKey(JOURNEY_KEY(projectId), next);
}

export function useJourney(projectId: string | null | undefined): {
  hydrated: boolean;
  record: ProjectJourney;
  write: (next: ProjectJourney) => WriteResult;
} {
  const id = projectId || null;
  const { hydrated, raw } = useStoredKey(id ? JOURNEY_KEY(id) : null);
  const record = React.useMemo(() => decodeJourney(raw), [raw]);
  const write = React.useCallback((next: ProjectJourney) => writeJourney(id ?? "", next), [id]);
  return { hydrated, record, write };
}

// ─────────────────────────── the files ───────────────────────────

export const MEDIA_DB = "ideeza-media";
export const MEDIA_STORE = "files";
const MEDIA_DB_VERSION = 1;

/** One stored blob. `key` is the `MediaRef.blobKey` (or `posterKey`) that names it. */
export type MediaFile = { key: string; projectId: string; blob: Blob; createdAt: number };

let opening: Promise<IDBDatabase | null> | null = null;

/** The database, or null where IndexedDB isn't available (private modes,
 *  blocked site data). One connection per tab, reopened after a close. */
function openMedia(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (opening) return opening;
  opening = new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(MEDIA_DB, MEDIA_DB_VERSION);
    } catch {
      opening = null;
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: "key" }).createIndex("projectId", "projectId");
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const drop = () => {
        opening = null;
      };
      db.onclose = drop;
      db.onversionchange = () => {
        db.close();
        drop();
      };
      resolve(db);
    };
    req.onerror = () => {
      opening = null;
      resolve(null);
    };
  });
  return opening;
}

/** Resolves true once the transaction commits, false if it errors or aborts (a full disk aborts it). */
function committed(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

/** Stores one file. `{ ok: false }` when the browser refuses it — the form
 *  then stays open with "Couldn't save — this browser's storage is full." */
export async function putMediaFile(file: MediaFile): Promise<WriteResult> {
  const db = await openMedia();
  if (!db) return { ok: false };
  try {
    const tx = db.transaction(MEDIA_STORE, "readwrite");
    tx.objectStore(MEDIA_STORE).put(file);
    return (await committed(tx)) ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function getMediaFile(key: string): Promise<Blob | null> {
  const db = await openMedia();
  if (!db) return null;
  try {
    const tx = db.transaction(MEDIA_STORE, "readonly");
    const req = tx.objectStore(MEDIA_STORE).get(key);
    if (!(await committed(tx))) return null;
    const rec = req.result as MediaFile | undefined;
    return rec?.blob ?? null;
  } catch {
    return null;
  }
}

/** Every file key stored for a project. */
export async function mediaKeysOf(projectId: string): Promise<string[]> {
  const db = await openMedia();
  if (!db) return [];
  try {
    const tx = db.transaction(MEDIA_STORE, "readonly");
    const req = tx.objectStore(MEDIA_STORE).index("projectId").getAllKeys(IDBKeyRange.only(projectId));
    if (!(await committed(tx))) return [];
    return req.result.filter((k): k is string => typeof k === "string");
  } catch {
    return [];
  }
}

export async function deleteMediaFiles(keys: readonly string[]): Promise<boolean> {
  if (!keys.length) return true;
  const db = await openMedia();
  if (!db) return false;
  try {
    const tx = db.transaction(MEDIA_STORE, "readwrite");
    const store = tx.objectStore(MEDIA_STORE);
    for (const k of keys) store.delete(k);
    return await committed(tx);
  } catch {
    return false;
  }
}

/** Removes every file of a project, in one transaction; returns how many went. */
export async function deleteProjectMedia(projectId: string): Promise<number> {
  const db = await openMedia();
  if (!db) return 0;
  try {
    const tx = db.transaction(MEDIA_STORE, "readwrite");
    const store = tx.objectStore(MEDIA_STORE);
    let removed = 0;
    const req = store.index("projectId").getAllKeys(IDBKeyRange.only(projectId));
    req.onsuccess = () => {
      for (const k of req.result) {
        store.delete(k);
        removed += 1;
      }
    };
    return (await committed(tx)) ? removed : 0;
  } catch {
    return 0;
  }
}

/** The blob keys an entry names: each file, and each video's poster. */
export function mediaKeysOfActivity(a: Activity): string[] {
  return a.media.flatMap((m) => (m.posterKey ? [m.blobKey, m.posterKey] : [m.blobKey]));
}

/** Deletes one entry, then its files (P2-TABS-8, -9). The text goes first: if
 *  that write is refused the entry keeps its files and still shows them. */
export async function removeActivity(projectId: string, activityId: string): Promise<WriteResult> {
  const journey = readJourney(projectId);
  const entry = journey.activities.find((a) => a.id === activityId);
  if (!entry) return { ok: true };
  const written = writeJourney(projectId, {
    ...journey,
    activities: journey.activities.filter((a) => a.id !== activityId),
  });
  if (!written.ok) return written;
  await deleteMediaFiles(mediaKeysOfActivity(entry));
  return { ok: true };
}

/** Clears a deleted project's files (§3.4). Mount once, at the root. */
export function useJourneyMediaSweep(): void {
  React.useEffect(
    () =>
      onProjectDeleted((id) => {
        void deleteProjectMedia(id);
      }),
    [],
  );
}
