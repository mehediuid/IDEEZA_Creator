// A message's photos and PDFs (spec §4): IndexedDB `ideeza-messages` / `files`,
// one record per blob, indexed by `conversationId`. Not `ideeza-media`: a
// project's delete sweep clears that one, and a buyer's attachments outlive the
// project they asked about.

import * as React from "react";
import type { WriteResult } from "../key-store";

export const FILES_DB = "ideeza-messages";
export const FILES_STORE = "files";
const FILES_DB_VERSION = 1;

export type MessageFile = { key: string; conversationId: string; blob: Blob; createdAt: number };

let opening: Promise<IDBDatabase | null> | null = null;

function openFiles(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (opening) return opening;
  opening = new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(FILES_DB, FILES_DB_VERSION);
    } catch {
      opening = null;
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: "key" }).createIndex("conversationId", "conversationId");
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

function committed(tx: IDBTransaction): Promise<boolean> {
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

export async function putMessageFile(file: MessageFile): Promise<WriteResult> {
  const db = await openFiles();
  if (!db) return { ok: false };
  try {
    const tx = db.transaction(FILES_STORE, "readwrite");
    tx.objectStore(FILES_STORE).put(file);
    return (await committed(tx)) ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function getMessageFile(key: string): Promise<Blob | null> {
  const db = await openFiles();
  if (!db) return null;
  try {
    const tx = db.transaction(FILES_STORE, "readonly");
    const req = tx.objectStore(FILES_STORE).get(key);
    if (!(await committed(tx))) return null;
    return (req.result as MessageFile | undefined)?.blob ?? null;
  } catch {
    return null;
  }
}

export async function deleteMessageFiles(keys: readonly string[]): Promise<boolean> {
  if (!keys.length) return true;
  const db = await openFiles();
  if (!db) return false;
  try {
    const tx = db.transaction(FILES_STORE, "readwrite");
    const store = tx.objectStore(FILES_STORE);
    for (const k of keys) store.delete(k);
    return await committed(tx);
  } catch {
    return false;
  }
}

/** An object URL for a stored file, revoked when the component lets go of it.
 *  `missing` once the read finished without a file. */
export function useMessageFileUrl(key: string | null): { url: string | null; missing: boolean } {
  const [state, setState] = React.useState<{ key: string | null; url: string | null; missing: boolean }>({
    key: null,
    url: null,
    missing: false,
  });
  React.useEffect(() => {
    if (!key) return;
    let url: string | null = null;
    let live = true;
    void getMessageFile(key).then((blob) => {
      if (!live) return;
      url = blob ? URL.createObjectURL(blob) : null;
      setState({ key, url, missing: !blob });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key]);
  return state.key === key ? { url: state.url, missing: state.missing } : { url: null, missing: false };
}
