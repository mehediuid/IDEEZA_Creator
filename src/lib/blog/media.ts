// What an article accepts as a picture or a video, and the words for each
// refusal (spec § States: name the file, say how to fix it). Pure, so the rules
// are tested; image.ts does the browser work.

export const IMAGE_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES: readonly string[] = ["video/mp4", "video/webm"];
/** iPhone photos: kept when this browser can open them (the stored copy is always JPEG). */
export const HEIC_TYPES: readonly string[] = ["image/heic", "image/heif"];
/** iPhone videos (.mov): kept when this browser can play them. */
export const PHONE_VIDEO_TYPES: readonly string[] = ["video/quicktime"];
/** What the pickers offer: every type above, and the iPhone extensions some systems leave untyped. */
export const IMAGE_ACCEPT = [...IMAGE_TYPES, ...HEIC_TYPES, ".heic", ".heif"].join(",");
export const VIDEO_ACCEPT = [...VIDEO_TYPES, ...PHONE_VIDEO_TYPES, ".mov"].join(",");
/** The thumbnail stored beside each image for small places (the publish strip): its long edge. */
export const THUMB_EDGE = 320;
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
/** The cover's best size (3:2); smaller still works, with a warning. */
export const COVER_MIN = { width: 1200, height: 800 };
/** Long edge after downscaling — sharp on a retina reading column. */
export const IMAGE_MAX_EDGE = 2000;

type FileLike = { name: string; type: string; size: number };

/** A size as a refusal says it: whole megabytes ("34 MB"). */
export function megabytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}

/** An iPhone photo, by type or (when the system left it untyped) by its name. */
export function isHeic(f: FileLike): boolean {
  return HEIC_TYPES.includes(f.type) || (!f.type && /\.(heic|heif)$/i.test(f.name));
}

/** What a picked or dropped file is, by its type: a picture, a video, or neither. */
export function mediaKind(f: FileLike): "image" | "video" | null {
  if (IMAGE_TYPES.includes(f.type) || isHeic(f)) return "image";
  if (VIDEO_TYPES.includes(f.type) || PHONE_VIDEO_TYPES.includes(f.type) || (!f.type && /\.mov$/i.test(f.name))) return "video";
  return null;
}

/** Why an image can't go in, or null. `heic`: this browser may open iPhone photos, so they are
 *  tried (a failed try says so in `heicUnreadable`'s words). */
export function imageProblem(f: FileLike, opts: { heic?: boolean } = {}): string | null {
  if (!IMAGE_TYPES.includes(f.type) && !(opts.heic && isHeic(f))) return `${f.name} isn't a supported image. Use JPG, PNG, WebP or GIF.`;
  if (f.size > IMAGE_MAX_BYTES) return `${f.name} is ${megabytes(f.size)}. Images can be up to 20 MB.`;
  return null;
}

/** An iPhone photo this browser couldn't open. */
export function heicUnreadable(name: string): string {
  return `${name} is an iPhone photo (HEIC) this browser can't open. Save it as JPG, then add it again.`;
}

/** Why a video can't go in, or null. `plays`: whether this browser plays a type (an iPhone .mov
 *  goes in when it does). */
export function videoProblem(f: FileLike, opts: { plays?: (type: string) => boolean } = {}): string | null {
  const phone = PHONE_VIDEO_TYPES.includes(f.type) || (!f.type && /\.mov$/i.test(f.name));
  if (!VIDEO_TYPES.includes(f.type)) {
    if (!phone || !opts.plays) return `${f.name} isn't a supported video. Use MP4 or WebM.`;
    if (!opts.plays(f.type || "video/quicktime")) return `${f.name} can't play in this browser. Use MP4 or WebM.`;
  }
  if (f.size > VIDEO_MAX_BYTES) return `${f.name} is ${megabytes(f.size)}. Videos can be up to 50 MB.`;
  return null;
}

/** A warning (never a refusal) for a cover that will look soft. */
export function smallCoverWarning(width: number, height: number): string | null {
  if (width >= COVER_MIN.width && height >= COVER_MIN.height) return null;
  return `This image is small (${width} × ${height} px) and may look blurry. Best at 1200 × 800 px or bigger.`;
}

/** The size an image is stored at: no edge longer than IMAGE_MAX_EDGE, never enlarged. */
export function fitWithin(width: number, height: number, max = IMAGE_MAX_EDGE): { width: number; height: number } {
  const long = Math.max(width, height);
  if (!long || long <= max) return { width, height };
  const s = max / long;
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) };
}
