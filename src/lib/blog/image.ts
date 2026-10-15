// Turning a picked file into a stored article image (browser only): check it,
// decode it, shrink it to IMAGE_MAX_EDGE, and put the blob in IndexedDB, with a
// small thumbnail beside it for small places (the publish strip). Decoding and
// resizing run off the main thread where the browser can (createImageBitmap and
// OffscreenCanvas), so forty photos don't freeze typing. A GIF is kept as it is
// (redrawing it would stop the animation); a PNG with transparency stays PNG so
// schematics keep their clear background. An iPhone photo (HEIC) is tried when
// the browser can open it; the stored copy is JPEG.

import { putBlogFile, thumbKey, type FileCause } from "./files";
import { fitWithin, heicUnreadable, imageProblem, isHeic, THUMB_EDGE, videoProblem } from "./media";
import { newBlogId } from "./store";

export type StoredImage = { fileKey: string; width: number; height: number };
export type StoredVideo = { fileKey: string; width: number; height: number };
export type StoreResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** The refusal for a file that couldn't be kept, by cause. */
export function notStored(name: string, cause: FileCause): string {
  return cause === "unavailable"
    ? `Couldn't save ${name}: this browser won't let the Blog keep pictures (private browsing or blocked site data can do this).`
    : `Couldn't save ${name}: this browser's storage is full.`;
}

type Drawable = { source: CanvasImageSource; width: number; height: number; close: () => void };

function decodeWithImg(blob: Blob): Promise<Drawable> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

/** The picture, decoded off the main thread when the browser can. */
async function decode(blob: Blob): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // HEIC in Safari, and a few formats, open only through <img>.
    }
  }
  return decodeWithImg(blob);
}

type Canvas2D = { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D };

function canvasOf(width: number, height: number): Canvas2D | null {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  return ctx ? { canvas, ctx } : null;
}

function toBlob(c: Canvas2D, type: string, quality?: number): Promise<Blob | null> {
  if (typeof OffscreenCanvas === "function" && c.canvas instanceof OffscreenCanvas) {
    return c.canvas.convertToBlob({ type, quality }).catch(() => null);
  }
  const el = c.canvas as HTMLCanvasElement;
  return new Promise((resolve) => el.toBlob(resolve, type, quality));
}

function hasAlpha(ctx: Canvas2D["ctx"], w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4 * 16) if (data[i] < 255) return true;
  return false;
}

/** Draws the picture at `size`, as PNG (keeping transparency) or JPEG on white. */
async function render(pic: Drawable, size: { width: number; height: number }, keepAlpha: "check" | "png" | "jpeg"): Promise<{ blob: Blob; png: boolean } | null> {
  // A bitmap resized by the browser itself (off the main thread) when it can.
  let source: CanvasImageSource = pic.source;
  let resized: ImageBitmap | null = null;
  if (typeof createImageBitmap === "function" && (size.width !== pic.width || size.height !== pic.height)) {
    try {
      resized = await createImageBitmap(pic.source as ImageBitmapSource, { resizeWidth: size.width, resizeHeight: size.height, resizeQuality: "high" });
      source = resized;
    } catch {
      resized = null;
    }
  }
  const c = canvasOf(size.width, size.height);
  if (!c) return null;
  c.ctx.drawImage(source, 0, 0, size.width, size.height);
  resized?.close();
  const png = keepAlpha === "png" || (keepAlpha === "check" && hasAlpha(c.ctx, size.width, size.height));
  if (!png) {
    // JPEG has no transparency: paint white under the picture first. Image data, not UI colour.
    c.ctx.globalCompositeOperation = "destination-over";
    c.ctx.fillStyle = "#ffffff";
    c.ctx.fillRect(0, 0, size.width, size.height);
  }
  const blob = await toBlob(c, png ? "image/png" : "image/jpeg", png ? undefined : 0.85);
  return blob ? { blob, png } : null;
}

export async function storeImage(file: File, articleId: string): Promise<StoreResult<StoredImage>> {
  const problem = imageProblem(file, { heic: true });
  if (problem) return { ok: false, error: problem };
  const heic = isHeic(file);
  let pic: Drawable;
  try {
    pic = await decode(file);
  } catch {
    return { ok: false, error: heic ? heicUnreadable(file.name) : `${file.name} couldn't be opened. Try another image.` };
  }
  try {
    const natural = { width: pic.width, height: pic.height };
    let blob: Blob = file;
    let size = natural;
    let png = file.type === "image/png";
    if (file.type !== "image/gif") {
      size = fitWithin(natural.width, natural.height);
      const out = await render(pic, size, file.type === "image/png" ? "check" : "jpeg");
      if (!out) return { ok: false, error: `Couldn't process ${file.name}. Try again.` };
      blob = out.blob;
      png = out.png;
    }
    const fileKey = newBlogId("file_");
    const createdAt = Date.now();
    const saved = await putBlogFile({ key: fileKey, articleId, blob, createdAt });
    if (!saved.ok) return { ok: false, error: notStored(file.name, saved.cause) };
    // The small copy is a convenience: without it, small places read the image itself.
    const thumbSize = fitWithin(natural.width, natural.height, THUMB_EDGE);
    if (thumbSize.width < size.width) {
      const thumb = await render(pic, thumbSize, png ? "png" : "jpeg");
      if (thumb) await putBlogFile({ key: thumbKey(fileKey), articleId, blob: thumb.blob, createdAt });
    }
    return { ok: true, value: { fileKey, ...size } };
  } finally {
    pic.close();
  }
}

/** A video's own size, read from its metadata (0 × 0 when the browser can't tell). */
function videoSize(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    let timer = 0;
    const done = (width: number, height: number) => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    timer = window.setTimeout(() => done(0, 0), 4000);
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
    v.onerror = () => done(0, 0);
    v.src = url;
  });
}

/** Whether this browser plays a video type ("maybe" counts: Chrome says it for .mov). */
export function browserPlays(type: string): boolean {
  if (typeof document === "undefined") return false;
  return document.createElement("video").canPlayType(type) !== "";
}

export async function storeVideo(file: File, articleId: string): Promise<StoreResult<StoredVideo>> {
  const problem = videoProblem(file, { plays: browserPlays });
  if (problem) return { ok: false, error: problem };
  const size = await videoSize(file);
  const fileKey = newBlogId("file_");
  const saved = await putBlogFile({ key: fileKey, articleId, blob: file, createdAt: Date.now() });
  if (!saved.ok) return { ok: false, error: notStored(file.name, saved.cause) };
  return { ok: true, value: { fileKey, ...size } };
}
