// Download your information, in the browser: copies this browser's storage,
// plans the readable pages (export.ts), reads every photo, attachment and clip
// from IndexedDB (browser-data.ts) into its category's folder, adds the
// backup that Restore reads (backup-format.ts), writes the zip (zip.ts) and
// hands it to the browser as a download. Nothing is sent anywhere; the only
// store written is the time of this download.

import { BACKUP_FORMAT, BACKUP_PATH, BACKUP_VERSION, backupKeys, type Backup } from "./backup-format";
import { markBackedUp } from "./backup";
import { dumpIndexedDb, storageSnapshot } from "./browser-data";
import { exportFileName, finishExport, mediaContext, mediaPlace, planExport, type CategoryId } from "./export";
import { makeZip, type ZipEntry } from "./zip";

export type ExportProgress = { label: string; done: number; total: number };

export type MadeZip = { blob: Blob; name: string; files: number };

/** Builds the zip and records when. `onProgress` hears each step, so the page can say what it is doing. */
export async function createInformationZip(now: number, onProgress?: (p: ExportProgress) => void): Promise<MadeZip> {
  onProgress?.({ label: "Reading your information", done: 0, total: 1 });
  const snapshot = storageSnapshot();
  const plan = planExport(snapshot);
  const ctx = mediaContext(snapshot);

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

  onProgress?.({ label: "Reading your photos, files and videos", done: 0, total: 1 });
  const media: { category: CategoryId; path: string }[] = [];
  const { dbs, files } = await dumpIndexedDb((db, record, key, field, blob) => {
    const placed = mediaPlace(db, record, key, field, blob.type, ctx);
    const path = unique(placed.path);
    media.push({ category: placed.category, path });
    return path;
  });

  const binary: ZipEntry[] = [];
  for (const [i, f] of files.entries()) {
    onProgress?.({ label: "Adding your photos, files and videos", done: i, total: files.length });
    binary.push({ name: f.path, data: new Uint8Array(await f.blob.arrayBuffer()) });
  }

  onProgress?.({ label: "Making the zip", done: 1, total: 1 });
  const backup: Backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, madeAt: now, localStorage: backupKeys(snapshot), indexedDB: dbs };
  const text = [
    ...finishExport(plan, media, now).map((f) => ({ name: unique(f.path), data: f.text })),
    { name: unique(BACKUP_PATH), data: JSON.stringify(backup) },
  ];
  const zip = makeZip([...text, ...binary], new Date(now));
  markBackedUp(now);
  return { blob: new Blob([zip as BlobPart], { type: "application/zip" }), name: exportFileName(now), files: text.length + binary.length };
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
