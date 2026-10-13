// Turning a picked file into a stored article image (browser only): check it,
// decode it, shrink it to IMAGE_MAX_EDGE, and put the blob in IndexedDB. A GIF
// is kept as it is (redrawing it would stop the animation); a PNG with
// transparency stays PNG so schematics keep their clear background.

import { putBlogFile } from "./files";
import { fitWithin, imageProblem, videoProblem } from "./media";
import { newBlogId } from "./store";

export type StoredImage = { fileKey: string; width: number; height: number };
export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: string };

function decode(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4 * 16) if (data[i] < 255) return true;
  return false;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function storeImage(file: File, articleId: string): Promise<StoreResult<StoredImage>> {
  const problem = imageProblem(file);
  if (problem) return { ok: false, error: problem };
  let img: HTMLImageElement;
  try {
    img = await decode(file);
  } catch {
    return { ok: false, error: `${file.name} couldn't be opened. Try another image.` };
  }
  const natural = { width: img.naturalWidth, height: img.naturalHeight };
  let blob: Blob = file;
  let size = natural;
  if (file.type !== "image/gif") {
    size = fitWithin(natural.width, natural.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: `Couldn't process ${file.name}. Try again.` };
    ctx.drawImage(img, 0, 0, size.width, size.height);
    const keepPng = file.type === "image/png" && hasAlpha(ctx, size.width, size.height);
    if (!keepPng) {
      // JPEG has no transparency: paint white under the picture first. Image data, not UI colour.
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size.width, size.height);
    }
    const out = await toBlob(canvas, keepPng ? "image/png" : "image/jpeg", keepPng ? undefined : 0.85);
    if (!out) return { ok: false, error: `Couldn't process ${file.name}. Try again.` };
    blob = out;
  }
  const fileKey = newBlogId("file_");
  const saved = await putBlogFile({ key: fileKey, articleId, blob, createdAt: Date.now() });
  if (!saved.ok) return { ok: false, error: `Couldn't save ${file.name}: this browser's storage is full.` };
  return { ok: true, value: { fileKey, ...size } };
}

export async function storeVideo(file: File, articleId: string): Promise<StoreResult<{ fileKey: string }>> {
  const problem = videoProblem(file);
  if (problem) return { ok: false, error: problem };
  const fileKey = newBlogId("file_");
  const saved = await putBlogFile({ key: fileKey, articleId, blob: file, createdAt: Date.now() });
  if (!saved.ok) return { ok: false, error: `Couldn't save ${file.name}: this browser's storage is full.` };
  return { ok: true, value: { fileKey } };
}
