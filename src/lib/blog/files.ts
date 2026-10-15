// An article's images and videos (spec § Data): IndexedDB `ideeza-blog` / `files`,
// one record per blob, indexed by `articleId`. Not `ideeza-media`: a project's
// delete sweep clears that one, and an article is not owned by a project. Never
// data URLs in localStorage — a ten-photo article would fill it.

import * as React from "react";

export const BLOG_FILES_DB = "ideeza-blog";
export const BLOG_FILES_STORE = "files";
const DB_VERSION = 1;

export type BlogFile = { key: string; articleId: string; blob: Blob; createdAt: number };

let opening: Promise<IDBDatabase | null> | null = null;

function openFiles(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (opening) return opening;
  opening = new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(BLOG_FILES_DB, DB_VERSION);
    } catch {
      opening = null;
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOG_FILES_STORE)) {
        db.createObjectStore(BLOG_FILES_STORE, { keyPath: "key" }).createIndex("articleId", "articleId");
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

/** Why a file wasn't stored: the browser won't open the picture store at all (private
 *  browsing, blocked site data), or it opened and refused the file (storage is full). */
export type FileCause = "unavailable" | "full";

export type FileWrite = { ok: true } | { ok: false; cause: FileCause };

/** The thumbnail stored beside an image (a small copy for small places). */
export const thumbKey = (fileKey: string) => `${fileKey}.thumb`;

export async function putBlogFile(file: BlogFile): Promise<FileWrite> {
  const db = await openFiles();
  if (!db) return { ok: false, cause: "unavailable" };
  try {
    const tx = db.transaction(BLOG_FILES_STORE, "readwrite");
    tx.objectStore(BLOG_FILES_STORE).put(file);
    return (await committed(tx)) ? { ok: true } : { ok: false, cause: "full" };
  } catch {
    return { ok: false, cause: "full" };
  }
}

/** Whether the picture store opens in this browser at all. */
export async function blogFilesAvailable(): Promise<boolean> {
  return (await openFiles()) !== null;
}

export async function getBlogFile(key: string): Promise<Blob | null> {
  const db = await openFiles();
  if (!db) return null;
  try {
    const tx = db.transaction(BLOG_FILES_STORE, "readonly");
    const req = tx.objectStore(BLOG_FILES_STORE).get(key);
    if (!(await committed(tx))) return null;
    return (req.result as BlogFile | undefined)?.blob ?? null;
  } catch {
    return null;
  }
}

/** Every stored file key of one article. */
export async function blogFileKeys(articleId: string): Promise<string[]> {
  const db = await openFiles();
  if (!db) return [];
  try {
    const tx = db.transaction(BLOG_FILES_STORE, "readonly");
    const req = tx.objectStore(BLOG_FILES_STORE).index("articleId").getAllKeys(articleId);
    if (!(await committed(tx))) return [];
    return (req.result as IDBValidKey[]).map(String);
  } catch {
    return [];
  }
}

export async function deleteBlogFiles(keys: readonly string[]): Promise<boolean> {
  if (!keys.length) return true;
  const db = await openFiles();
  if (!db) return false;
  try {
    const tx = db.transaction(BLOG_FILES_STORE, "readwrite");
    const store = tx.objectStore(BLOG_FILES_STORE);
    for (const k of keys) store.delete(k);
    return await committed(tx);
  } catch {
    return false;
  }
}

/** An object URL for a stored file, revoked when the component lets go of it.
 *  `missing` once the read finished without a file. `thumb`: the small copy when there is one
 *  (images stored since thumbnails exist), else the file itself. */
export function useBlogFileUrl(key: string | null, opts: { thumb?: boolean } = {}): { url: string | null; missing: boolean } {
  const thumb = !!opts.thumb;
  const [state, setState] = React.useState<{ key: string | null; url: string | null; missing: boolean }>({
    key: null,
    url: null,
    missing: false,
  });
  React.useEffect(() => {
    if (!key) return;
    let url: string | null = null;
    let live = true;
    void (async () => {
      const blob = (thumb ? await getBlogFile(thumbKey(key)) : null) ?? (await getBlogFile(key));
      if (!live) return;
      url = blob ? URL.createObjectURL(blob) : null;
      setState({ key, url, missing: !blob });
    })();
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key, thumb]);
  return state.key === key ? { url: state.url, missing: state.missing } : { url: null, missing: false };
}
