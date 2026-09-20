// Where a generated concept image lives.
//
// Server-only, Node runtime (it touches the filesystem).
//
// Every free generator hands back bytes or a URL that expires — the AI
// Horde's presigned link dies in thirty minutes — while the app persists a
// concept's URL in the user's localStorage chat history and may render it
// again days later. So the image has to be ours: the bytes are written once
// and served from `/api/concept/image/<id>`, a URL that does not rot.
//
// Beside each image sits its own metadata, which is what lets a refine
// evolve the same concept. The old code recovered the parent's prompt and
// seed by *parsing them back out of the Pollinations URL*; that only worked
// because the URL happened to encode them. Storing them is both honest and
// more robust — the URL is now an opaque id, and nothing has to be reverse
// engineered.
//
// Honest limit: this is the server's own disk. On a host with an ephemeral
// filesystem (a serverless deploy that scales to zero) the files do not
// survive, and the concept images would 404 while the chat still lists them.
// Point IDEEZA_IMAGE_DIR at a mounted volume there, or put an object store
// behind `put`/`read` — the two functions below are the whole seam.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ImageMeta = {
  /** The prompt this image was rendered from, as sent to the generator. */
  prompt: string;
  /** The seed it used, so a refine can keep the same concept. */
  seed: string;
  provider: string;
  contentType: string;
  ts: number;
};

/** The only types this store will hold. A provider's content-type is its own
 *  claim, and whatever is stored here is echoed back from this app's origin,
 *  so an unrecognised one is normalised rather than trusted. */
const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

const FALLBACK_TYPE = "image/webp";

function safeType(contentType: string): string {
  const bare = contentType.split(";")[0].trim().toLowerCase();
  return bare in EXT ? (bare === "image/jpg" ? "image/jpeg" : bare) : FALLBACK_TYPE;
}

/** Ids are minted here and only here, so this pattern is the whole contract.
 *  It is also the path-traversal guard: an id from the URL is never touched
 *  until it matches. */
const ID = /^[0-9a-f]{32}$/;

function dir(): string {
  return (
    process.env.IDEEZA_IMAGE_DIR?.trim() ||
    path.join(process.cwd(), ".ideeza", "concept-images")
  );
}

function extFor(contentType: string): string {
  return EXT[safeType(contentType)] ?? "webp";
}

/** Store the bytes and return the id the app will refer to them by. */
export async function put(
  bytes: Uint8Array,
  meta: Omit<ImageMeta, "ts">,
): Promise<string> {
  const id = randomUUID().replace(/-/g, "");
  const contentType = safeType(meta.contentType);
  const base = dir();
  await mkdir(base, { recursive: true });
  await writeFile(path.join(base, `${id}.${extFor(contentType)}`), bytes);
  await writeFile(
    path.join(base, `${id}.json`),
    JSON.stringify({ ...meta, contentType, ts: Date.now() } satisfies ImageMeta),
    "utf8",
  );
  return id;
}

/** The app-facing URL for a stored image. One place builds it, so the route
 *  that serves images and the route that stores them cannot disagree. */
export function urlFor(id: string): string {
  return `/api/concept/image/${id}`;
}

/** Recover the id from one of our own URLs; null for anything else — an old
 *  Pollinations URL already in someone's chat, say. */
export function idFromUrl(url: string): string | null {
  const m = /\/api\/concept\/image\/([0-9a-f]{32})(?:[?#]|$)/.exec(url);
  return m ? m[1] : null;
}

export async function readMeta(id: string): Promise<ImageMeta | null> {
  if (!ID.test(id)) return null;
  try {
    const raw = await readFile(path.join(dir(), `${id}.json`), "utf8");
    const parsed = JSON.parse(raw) as Partial<ImageMeta>;
    if (typeof parsed.prompt !== "string" || typeof parsed.seed !== "string") {
      return null;
    }
    return {
      prompt: parsed.prompt,
      seed: parsed.seed,
      provider: String(parsed.provider ?? "unknown"),
      // Normalised on the way out too: a sidecar is a file on disk, and an
      // older or hand-edited one must not decide a response header.
      contentType: safeType(String(parsed.contentType ?? FALLBACK_TYPE)),
      ts: Number(parsed.ts ?? 0),
    };
  } catch {
    return null;
  }
}

export async function read(
  id: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const meta = await readMeta(id);
  if (!meta) return null;
  try {
    const bytes = await readFile(
      path.join(dir(), `${id}.${extFor(meta.contentType)}`),
    );
    return { bytes: new Uint8Array(bytes), contentType: meta.contentType };
  } catch {
    return null;
  }
}
