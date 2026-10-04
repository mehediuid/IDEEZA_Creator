// The clip files (Phase 2 spec §3.4, VIDEO §3; P2-VIDEO-2, 18, 19). A take's
// video and its poster are real files, so they live in IndexedDB —
// localStorage can't hold video (D10). Database `ideeza-video` v1, object
// store `clips` keyed by the take id, with a `projectId` index so a project's
// delete drops every clip it made in one pass.
//
// `ideeza:video:<projectId>` (store.ts) says which takes exist and which one
// is in use; this store holds their bytes. The two can drift when site data
// is partly cleared, so `verifyClips` lists what's really here and marks any
// ready take whose file is gone as `lost` (P2-VIDEO-19) — `readinessOf`,
// which is synchronous and pure, then stays honest.
//
// Browser-only below the pure helpers. Relative imports, so node:test loads
// the pure part.

import { markLost } from "./product-video";
import { readProjectVideos, writeProjectVideos } from "./store";
import type { ProjectVideos } from "./types";

export const CLIP_DB = "ideeza-video";
export const CLIP_DB_VERSION = 1;
export const CLIP_STORE = "clips";
export const CLIP_PROJECT_INDEX = "projectId";

export type ClipRecord = {
  takeId: string;
  projectId: string;
  productId: string;
  video: Blob;
  /** The frame at 1.5 s, as a JPEG. */
  poster: Blob;
  mime: string;
  width: number;
  height: number;
  durationMs: number;
  createdAt: number;
  /** The frames were drawn from the product's image; false = the gradient
   *  stood in (no image, or it didn't load). The transcript says which. */
  usedImage: boolean;
};

// ─────────────────────────── pure: what's missing ───────────────────────────

/** Ready takes (not already failed) whose clip id isn't among `clipIds`. */
export function missingReadyTakes(videos: ProjectVideos, clipIds: ReadonlySet<string>): Set<string> {
  const missing = new Set<string>();
  for (const pv of Object.values(videos.products)) {
    for (const t of pv.takes) {
      if (t.readyAt && !t.failure && !clipIds.has(t.id)) missing.add(t.id);
    }
  }
  return missing;
}

/** `videos` with every take in `missing` marked lost (markLost per product),
 *  or null when nothing changes — the caller then writes nothing. */
export function withLostTakes(videos: ProjectVideos, missing: ReadonlySet<string>, now: number): ProjectVideos | null {
  if (missing.size === 0) return null;
  let changed = false;
  const products: ProjectVideos["products"] = {};
  for (const [productId, pv] of Object.entries(videos.products)) {
    const touches = pv.takes.some((t) => missing.has(t.id) && t.readyAt && !t.failure);
    if (!touches) {
      products[productId] = pv;
      continue;
    }
    products[productId] = markLost(pv, missing, now);
    changed = true;
  }
  return changed ? { ...videos, products } : null;
}

// ─────────────────────────── IndexedDB ───────────────────────────

/** Why a clip couldn't be stored: `quota` maps to the "no room" copy. */
export class ClipStoreError extends Error {
  constructor(
    readonly kind: "unavailable" | "quota" | "failed",
    message?: string,
  ) {
    super(message ?? kind);
    this.name = "ClipStoreError";
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function isQuota(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") return Promise.reject(new ClipStoreError("unavailable"));
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(CLIP_DB, CLIP_DB_VERSION);
    } catch (e) {
      reject(new ClipStoreError("unavailable", String(e)));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CLIP_STORE)) {
        const store = db.createObjectStore(CLIP_STORE, { keyPath: "takeId" });
        store.createIndex(CLIP_PROJECT_INDEX, "projectId", { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab upgrading the schema closes this connection, and the next
      // call opens a fresh one.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(new ClipStoreError("unavailable", req.error?.message));
    req.onblocked = () => reject(new ClipStoreError("unavailable", "blocked"));
  });
  dbPromise = opening.catch((e) => {
    dbPromise = null;
    throw e;
  });
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(isQuota(tx.error) ? new ClipStoreError("quota") : new ClipStoreError("failed", tx.error?.message));
    tx.onerror = () => reject(isQuota(tx.error) ? new ClipStoreError("quota") : new ClipStoreError("failed", tx.error?.message));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new ClipStoreError("failed", req.error?.message));
  });
}

/** Stores a finished take's files. Rejects with ClipStoreError — `quota`
 *  when the browser has no room left. */
export async function putClip(rec: ClipRecord): Promise<void> {
  const db = await openDb();
  let tx: IDBTransaction;
  try {
    tx = db.transaction(CLIP_STORE, "readwrite");
    tx.objectStore(CLIP_STORE).put(rec);
  } catch (e) {
    throw isQuota(e) ? new ClipStoreError("quota") : new ClipStoreError("failed", String(e));
  }
  await done(tx);
}

/** A take's files, or null when this browser doesn't hold them. */
export async function getClip(takeId: string): Promise<ClipRecord | null> {
  const db = await openDb();
  const tx = db.transaction(CLIP_STORE, "readonly");
  const rec = await request<ClipRecord | undefined>(tx.objectStore(CLIP_STORE).get(takeId));
  return rec && rec.video instanceof Blob ? rec : null;
}

/** The take ids this browser holds a clip for, in one project. */
export async function listClipIds(projectId: string): Promise<string[]> {
  const db = await openDb();
  const tx = db.transaction(CLIP_STORE, "readonly");
  const keys = await request(tx.objectStore(CLIP_STORE).index(CLIP_PROJECT_INDEX).getAllKeys(projectId));
  return keys.map(String);
}

export async function deleteClips(takeIds: readonly string[]): Promise<void> {
  if (takeIds.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(CLIP_STORE, "readwrite");
  const store = tx.objectStore(CLIP_STORE);
  for (const id of takeIds) store.delete(id);
  await done(tx);
}

/** Every clip one project made (P2-VIDEO-18), through the `projectId` index. */
export async function deleteProjectClips(projectId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(CLIP_STORE, "readwrite");
  const index = tx.objectStore(CLIP_STORE).index(CLIP_PROJECT_INDEX);
  const cursorReq = index.openKeyCursor(IDBKeyRange.only(projectId));
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (!cursor) return;
    tx.objectStore(CLIP_STORE).delete(cursor.primaryKey);
    cursor.continue();
  };
  await done(tx);
}

/**
 * P2-VIDEO-19. Lists the project's clips and marks every ready take whose
 * file is gone as `lost`; an in-use take that's lost hands over to the
 * newest other ready take, else to none. Only takes that were already ready
 * before the listing started are judged: a take turns ready only after its
 * clip is stored, so one finishing mid-check is never mistaken for lost.
 * When IndexedDB can't be read, nothing is marked — an unreadable store
 * isn't evidence that the files are gone.
 */
export async function verifyClips(projectId: string): Promise<{ lost: string[] }> {
  const before = readProjectVideos(projectId);
  if (!before) return { lost: [] };
  let ids: string[];
  try {
    ids = await listClipIds(projectId);
  } catch {
    return { lost: [] };
  }
  const judged = missingReadyTakes(before, new Set(ids));
  if (judged.size === 0) return { lost: [] };
  const fresh = readProjectVideos(projectId);
  if (!fresh) return { lost: [] };
  const next = withLostTakes(fresh, judged, Date.now());
  if (!next) return { lost: [] };
  return writeProjectVideos(projectId, next).ok ? { lost: [...judged] } : { lost: [] };
}
