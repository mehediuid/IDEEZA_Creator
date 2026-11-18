// An inspiration image, given on Home with the idea (owner, 2026-11-01:
// "the user can upload an image as inspiration"). The maker's picture is the
// starting point the product's concept is drawn from: the AI Horde renders
// it img2img, so the concept keeps the picture's shape, framing and feel
// while the prompt decides what the product is. One picture per idea —
// the generator takes one starting image, and a second would be decoration.
//
// Measured (2026-11-01, anonymous key): a 512 × 384 JPEG of a dark gadget box
// with "a desk lamp" came back in about 20 s as a lamp on that same box,
// same angle and light. The free text models cannot see an image, so the
// picture shapes the drawing, not the reading of the idea.
//
// Safe for the browser and the server: no Buffer, no DOM.

/** What the picker takes. Anything else is refused before it is read. */
export const INSPIRATION_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type InspirationType = (typeof INSPIRATION_TYPES)[number];

/** The file as picked. A phone photo is a few MB; it is shrunk before upload. */
export const MAX_PICK_BYTES = 15 * 1024 * 1024;
/** What the server stores: the shrunk 512 × 384 JPEG is well under this. */
export const MAX_STORED_BYTES = 1024 * 1024;

/** The concept's own frame (image-gen.ts renders 512 × 384, 4:3), so the
 *  picture is cropped to it once, here, rather than stretched by a worker. */
export const INSPIRATION_WIDTH = 512;
export const INSPIRATION_HEIGHT = 384;

/** How far the render may move from the picture: 0 keeps it, 1 ignores it.
 *  0.65 keeps the form and lets the prompt make it the product. */
export const INSPIRATION_STRENGTH = 0.65;

/** What the store records as an inspiration's provider, so a concept image
 *  can never be passed off as one. */
export const INSPIRATION_PROVIDER = "upload";

/** Why a picked file was not taken, in the words the composer shows. */
export function pickProblem(file: { type: string; size: number }): string | null {
  if (!(INSPIRATION_TYPES as readonly string[]).includes(file.type)) {
    return "That file isn't a picture we can use — pick a JPG, PNG or WebP.";
  }
  if (file.size > MAX_PICK_BYTES) return "That picture is over 15 MB — pick a smaller one.";
  return null;
}

/** "data:image/jpeg;base64,…" split, or null when it is not one of ours. */
export function parseDataUrl(s: unknown): { type: InspirationType; base64: string } | null {
  if (typeof s !== "string") return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(s);
  return m ? { type: m[1] as InspirationType, base64: m[2] } : null;
}

/** The type the bytes really are — the data URL's label is the sender's
 *  claim, and whatever is stored is served back from this app's origin. */
export function sniffType(b: Uint8Array): InspirationType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
