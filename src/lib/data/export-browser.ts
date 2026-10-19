// Download your information, in the browser: copies this browser's storage,
// plans the zip (export.ts), fetches the photos, files and videos it names
// from IndexedDB through each store's own reader, makes photos smaller for
// Medium, writes the zip (zip.ts) and hands it to the browser as a download.
// Nothing is sent anywhere and no store is written.

import { getBlogFile } from "../blog/files";
import { getMediaFile, mediaKeysOf } from "../manual/journey-store";
import { getMessageFile } from "../messages/files";
import { getPhoto, PHOTO_DB } from "../people/photo-store";
import { fitWithin } from "../support/problem-report";
import { getClip, listClipIds } from "../video/clip-store";
import { exportFileName, finishExport, planExport, type CategoryId, type ExportOptions, type MediaRequest } from "./export";
import { makeZip, type ZipEntry } from "./zip";

export type ExportProgress = { label: string; done: number; total: number };

/** Photos for Medium: the long side at most this. */
const MEDIUM_EDGE = 1280;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/webm": "webm",
  "video/mp4": "mp4",
};

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

/** The profile's cover has no reader of its own outside the profile page, so it is read here
 *  without ever creating the database (only when the browser can list its databases). */
async function readCover(): Promise<Blob | null> {
  try {
    if (!indexedDB.databases) return null;
    const dbs = await indexedDB.databases();
    if (!dbs.some((d) => d.name === PHOTO_DB)) return null;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(PHOTO_DB);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    try {
      if (!db.objectStoreNames.contains("files")) return null;
      const req = db.transaction("files", "readonly").objectStore("files").get("cover");
      return await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
        req.onerror = () => resolve(null);
      });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** A photo at most MEDIUM_EDGE on its long side; anything else as it is. */
async function smaller(blob: Blob): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(blob.type)) return blob;
  try {
    const bmp = await createImageBitmap(blob);
    const size = fitWithin(bmp.width, bmp.height, MEDIUM_EDGE);
    if (size.width === bmp.width && size.height === bmp.height) {
      bmp.close();
      return blob;
    }
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, size.width, size.height);
    bmp.close();
    const type = blob.type === "image/png" ? "image/png" : "image/jpeg";
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    return out && out.size < blob.size ? out : blob;
  } catch {
    return blob;
  }
}

type Fetched = { category: CategoryId; base: string; name?: string; blob: Blob };

async function fetchRequest(req: MediaRequest, quality: ExportOptions["media"]): Promise<Fetched[]> {
  const shrink = (b: Blob) => (quality === "medium" ? smaller(b) : Promise.resolve(b));
  try {
    switch (req.db) {
      case "profile": {
        const blob = req.key === "photo" ? await getPhoto() : await readCover();
        return blob ? [{ category: req.category, base: req.path, blob: await shrink(blob) }] : [];
      }
      case "blog": {
        const blob = await getBlogFile(req.key);
        if (!blob) return [];
        return [{ category: req.category, base: req.path, blob: req.kind === "image" ? await shrink(blob) : blob }];
      }
      case "messages": {
        const blob = await getMessageFile(req.key);
        return blob ? [{ category: req.category, base: req.path, name: req.name, blob: await shrink(blob) }] : [];
      }
      case "media": {
        const out: Fetched[] = [];
        for (const key of await mediaKeysOf(req.projectId)) {
          const blob = await getMediaFile(key);
          if (blob) out.push({ category: req.category, base: `${req.path}/${key.replace(/[^A-Za-z0-9._-]+/g, "-")}`, blob: await shrink(blob) });
        }
        return out;
      }
      case "video": {
        const out: Fetched[] = [];
        for (const takeId of await listClipIds(req.projectId)) {
          const clip = await getClip(takeId);
          if (clip) out.push({ category: req.category, base: `${req.path}/${takeId.replace(/[^A-Za-z0-9._-]+/g, "-")}`, blob: clip.video });
        }
        return out;
      }
    }
  } catch {
    // A store this browser can't open: the rest of the file still goes.
    return [];
  }
}

export type MadeZip = { blob: Blob; name: string; files: number };

/** Builds the zip. `onProgress` hears each step, so the dialog can say what it is doing. */
export async function createInformationZip(opts: ExportOptions, onProgress?: (p: ExportProgress) => void): Promise<MadeZip> {
  onProgress?.({ label: "Reading your information", done: 0, total: 1 });
  const plan = planExport(storageSnapshot(), opts);

  const used = new Set<string>();
  const unique = (path: string) => {
    let p = path;
    const dot = path.lastIndexOf(".");
    const stem = dot > path.lastIndexOf("/") ? path.slice(0, dot) : path;
    const ext = dot > path.lastIndexOf("/") ? path.slice(dot) : "";
    for (let i = 2; used.has(p); i++) p = `${stem}-${i}${ext}`;
    used.add(p);
    return p;
  };

  const binary: ZipEntry[] = [];
  const mediaPaths: { category: CategoryId; path: string }[] = [];
  for (const [i, req] of plan.media.entries()) {
    onProgress?.({ label: "Adding your photos and files", done: i, total: plan.media.length });
    for (const f of await fetchRequest(req, opts.media)) {
      const ext = EXT[f.blob.type] ?? "bin";
      const path = unique(f.name ? `${f.base}/${f.name}` : `${f.base}.${ext}`);
      binary.push({ name: path, data: new Uint8Array(await f.blob.arrayBuffer()) });
      mediaPaths.push({ category: f.category, path });
    }
  }

  onProgress?.({ label: "Making the zip", done: 1, total: 1 });
  const text = finishExport(plan, mediaPaths, opts).map((f) => ({ name: unique(f.path), data: f.text }));
  const zip = makeZip([...text, ...binary], new Date(opts.now));
  return { blob: new Blob([zip as BlobPart], { type: "application/zip" }), name: exportFileName(opts.now), files: text.length + binary.length };
}

/** Hands a file to the browser as a download. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
