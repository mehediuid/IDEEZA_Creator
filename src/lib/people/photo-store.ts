// Your profile photo and cover (spec 2026-10-14-creator-profile-design.md; the
// cover, owner 2026-10-14): resized on this device — the photo to a 256 px
// square JPEG, the cover to at most 1600 px across — then kept in IndexedDB
// `ideeza-profile` / `files` under the keys "photo" and "cover", never in
// localStorage, whose few megabytes the projects need. Every change
// dispatches `ideeza:profile-photo` (or `-cover`), so each place showing it
// refreshes in this tab.

import * as React from "react";
import type { WriteResult } from "../key-store";

export const PHOTO_DB = "ideeza-profile";
const STORE = "files";

type FileKey = "photo" | "cover";
const CHANGE_EVENT: Record<FileKey, string> = { photo: "ideeza:profile-photo", cover: "ideeza:profile-cover" };

/** The largest file the picker accepts before resizing. */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const SIDE = 256;
const COVER_MAX = 1600;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(PHOTO_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function done(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

function announce(key: FileKey): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT[key]));
}

async function getFile(key: FileKey): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    return await new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

async function putFile(key: FileKey, blob: Blob): Promise<WriteResult> {
  const db = await openDb();
  if (!db) return { ok: false };
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    const ok = await done(tx);
    if (ok) announce(key);
    return ok ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  } finally {
    db.close();
  }
}

async function deleteFile(key: FileKey): Promise<WriteResult> {
  const db = await openDb();
  if (!db) return { ok: false };
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    const ok = await done(tx);
    if (ok) announce(key);
    return ok ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  } finally {
    db.close();
  }
}

export const getPhoto = () => getFile("photo");
export const putPhoto = (blob: Blob) => putFile("photo", blob);
export const deletePhoto = () => deleteFile("photo");
export const putCover = (blob: Blob) => putFile("cover", blob);
export const deleteCover = () => deleteFile("cover");

/** A 256 px square, centre-cropped JPEG of an image file; null when the file isn't an image this
 *  browser can read, or is larger than PHOTO_MAX_BYTES. */
export async function resizePhoto(file: Blob): Promise<Blob | null> {
  if (!file.type.startsWith("image/") || file.size > PHOTO_MAX_BYTES) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = SIDE;
    canvas.height = SIDE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIDE, SIDE);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

/** A cover image as a JPEG at most 1600 px on its longer side, uncropped (the page crops it to
 *  the band); null when the file isn't an image this browser can read, or is larger than
 *  PHOTO_MAX_BYTES. */
export async function resizeCover(file: Blob): Promise<Blob | null> {
  if (!file.type.startsWith("image/") || file.size > PHOTO_MAX_BYTES) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, COVER_MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
  } catch {
    return null;
  }
}

/** A stored file as an object URL (null when there is none), refreshed after every change. */
function useStoredFile(key: FileKey): { hydrated: boolean; url: string | null } {
  const [state, setState] = React.useState<{ hydrated: boolean; url: string | null }>({ hydrated: false, url: null });
  React.useEffect(() => {
    let alive = true;
    let current: string | null = null;
    const load = () => {
      void getFile(key).then((blob) => {
        if (!alive) return;
        if (current) URL.revokeObjectURL(current);
        current = blob ? URL.createObjectURL(blob) : null;
        setState({ hydrated: true, url: current });
      });
    };
    load();
    window.addEventListener(CHANGE_EVENT[key], load);
    return () => {
      alive = false;
      window.removeEventListener(CHANGE_EVENT[key], load);
      if (current) URL.revokeObjectURL(current);
    };
  }, [key]);
  return state;
}

/** Your photo as an object URL (null when there is none). */
export const useMyPhoto = () => useStoredFile("photo");
/** Your cover as an object URL (null when there is none). */
export const useMyCover = () => useStoredFile("cover");
