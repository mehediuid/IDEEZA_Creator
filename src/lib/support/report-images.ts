// A problem report's images in the browser: picked, dropped, pasted or
// captured from this tab, each shrunk before it's kept. No library: a canvas
// re-encode, which also drops a photo's EXIF (and its location).

import { IMAGE_BYTES_MAX, IMAGE_EDGE_MAX, IMAGE_INPUT_BYTES_MAX, fitWithin } from "./problem-report";

export type ReportImage = {
  key: string;
  blob: Blob;
  name: string;
  width: number;
  height: number;
};

/** The image files in a pick, a drop or a paste; anything else is left out. */
export function imageFilesOf(src: DataTransfer | FileList | readonly File[] | null | undefined): File[] {
  if (!src) return [];
  const files = "files" in src ? Array.from(src.files) : Array.from(src);
  return files.filter((f) => f.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(f.name));
}

/** Whether a paste is the maker pasting a picture. A copy from Word or a
 *  spreadsheet carries text and an image of it, and the maker meant the text. */
export function pastedImages(data: DataTransfer | null): File[] {
  if (!data) return [];
  if (data.getData("text/plain")) return [];
  return imageFilesOf(data);
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = src;
  });

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

async function encode(source: CanvasImageSource, w: number, h: number): Promise<{ blob: Blob; width: number; height: number }> {
  const size = fitWithin(w, h, IMAGE_EDGE_MAX);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  // Image data, not UI colour: JPEG has no transparency, so a transparent
  // PNG lands on white rather than black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.drawImage(source, 0, 0, size.width, size.height);
  // WebP where the browser writes it; Safari answers PNG for WebP, so JPEG there.
  let blob = await toBlob(canvas, "image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.85);
  if (blob && blob.size > IMAGE_BYTES_MAX) blob = await toBlob(canvas, blob.type, 0.6);
  if (!blob) throw new Error("encode failed");
  if (blob.size > IMAGE_BYTES_MAX) throw new Error("too big");
  return { blob, ...size };
}

export type ShrinkResult = { ok: true; image: ReportImage } | { ok: false; reason: string };

export async function shrinkFile(file: File, key: string): Promise<ShrinkResult> {
  if (file.size > IMAGE_INPUT_BYTES_MAX) {
    return { ok: false, reason: `${file.name} is too big. Use one under ${IMAGE_INPUT_BYTES_MAX / 1024 / 1024} MB.` };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("empty");
    const out = await encode(img, img.naturalWidth, img.naturalHeight);
    return { ok: true, image: { key, name: file.name || "Pasted image", ...out } };
  } catch {
    return { ok: false, reason: `Couldn't read ${file.name || "that image"}. Use a PNG, JPG or WebP.` };
  } finally {
    URL.revokeObjectURL(url);
  }
}

type DisplayMediaOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
};

/** Whether this browser can capture its own tab: desktop Chrome, Edge,
 *  Firefox and Safari can; phones can't. */
export function canCaptureTab(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof matchMedia === "function" &&
    matchMedia("(pointer: fine)").matches
  );
}

/** Rejects when `p` hasn't settled in `ms`, so a stalled capture can't keep
 *  the dialog hidden. */
const within = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))]);

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** One frame of this tab. `hide` takes the dialog off the page before the
 *  frame is drawn, since the dialog covers the very page being reported.
 *  Must be called straight from the click: the browser asks only then.
 *  Resolves null when the maker cancels the browser's prompt. */
export async function captureTab(hide: () => void): Promise<{ blob: Blob; width: number; height: number } | null> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    } as DisplayMediaOptions);
  } catch (err) {
    if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "AbortError")) return null;
    throw err;
  }
  try {
    hide();
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await within(video.play(), 3000);
    // Two frames for the dialog and its scrim to leave the screen, then a
    // fresh captured frame: the first one can still show them, or be black.
    // A still page may send no new frame at all, so that wait is capped.
    await nextFrame();
    await nextFrame();
    await new Promise<void>((r) => {
      const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
      v.requestVideoFrameCallback?.(() => r());
      setTimeout(r, 300);
    });
    await new Promise<void>((r) => setTimeout(r, 120));
    if (!video.videoWidth || !video.videoHeight) throw new Error("empty capture");
    return await encode(video, video.videoWidth, video.videoHeight);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
