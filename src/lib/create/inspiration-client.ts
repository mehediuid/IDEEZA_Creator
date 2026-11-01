// The browser half of an inspiration image (inspiration.ts): a picked,
// pasted or dropped picture, cropped to the concept's own 4:3 frame and
// shrunk to 512 × 384 before it leaves the page — a phone photo is a few MB,
// the generator uses 512 × 384, and the upload should not wait on the rest.

import { INSPIRATION_HEIGHT, INSPIRATION_WIDTH } from "./inspiration";

/** Cover-crop to 512 × 384, centred, as a JPEG data URL. Throws when the
 *  browser cannot read the picture (a HEIC on a desktop, a broken file). */
export async function shrinkInspiration(file: Blob): Promise<string> {
  const W = INSPIRATION_WIDTH;
  const H = INSPIRATION_HEIGHT;
  // `from-image` honours a phone photo's rotation flag.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.max(W / bitmap.width, H / bitmap.height);
    const sw = W / scale;
    const sh = H / scale;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, W, H);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

/** Keeps it where concept images live; its app URL, or the reason not. */
export async function uploadInspiration(dataUrl: string): Promise<{ url: string } | { error: string }> {
  try {
    const res = await fetch("/api/concept/inspiration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && data.url) return { url: data.url };
    return { error: data.error ?? "We couldn't keep the picture — try again." };
  } catch {
    return { error: "We couldn't send the picture — check your connection and try again." };
  }
}
