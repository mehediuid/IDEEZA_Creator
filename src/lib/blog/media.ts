// What an article accepts as a picture or a video, and the words for each
// refusal (spec § States: name the file, say how to fix it). Pure, so the rules
// are tested; image.ts does the browser work.

export const IMAGE_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES: readonly string[] = ["video/mp4", "video/webm"];
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
/** The cover's best size (3:2); smaller still works, with a warning. */
export const COVER_MIN = { width: 1200, height: 800 };
/** Long edge after downscaling — sharp on a retina reading column. */
export const IMAGE_MAX_EDGE = 2000;

type FileLike = { name: string; type: string; size: number };

export function imageProblem(f: FileLike): string | null {
  if (!IMAGE_TYPES.includes(f.type)) return `${f.name} isn't a supported image. Use JPG, PNG, WebP or GIF.`;
  if (f.size > IMAGE_MAX_BYTES) return `${f.name} is over 20 MB. Choose a smaller image.`;
  return null;
}

export function videoProblem(f: FileLike): string | null {
  if (!VIDEO_TYPES.includes(f.type)) return `${f.name} isn't a supported video. Use MP4 or WebM.`;
  if (f.size > VIDEO_MAX_BYTES) return `${f.name} is over 50 MB. Choose a shorter video.`;
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
