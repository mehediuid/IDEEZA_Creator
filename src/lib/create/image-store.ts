// Where a generated concept image lives.
//
// Server-only, Node runtime.
//
// Every free generator hands back bytes or a URL that expires — the AI
// Horde's presigned link dies in thirty minutes — while the app persists a
// concept's URL in the user's localStorage chat history and may render it
// again days later. So the image has to be ours.
//
// Beside each image sits its own metadata, which is what lets a refine evolve
// the same concept. The old code recovered the parent's prompt and seed by
// *parsing them back out of the Pollinations URL*; that only worked because
// the URL happened to encode them. Storing them is both honest and more
// robust — the URL is an opaque id now, and nothing has to be reverse
// engineered.
//
// TWO DRIVERS, chosen by what is configured, both answering at the same app
// URL (/api/concept/image/<id>) so nothing downstream knows which is in use:
//
//   blob — Vercel Blob. Its REST API takes a plain fetch, so this needs no
//          SDK. The store is PRIVATE: a blob URL returns 403 to the open
//          internet and 200 to us, so the image route reads it with our own
//          credentials and serves the bytes. That is the better default — a
//          concept render is the maker's own idea, not public material — and
//          it costs one function call per image per CDN edge, which the
//          route's s-maxage then caches away.
//   disk — otherwise: the server's own filesystem. Right for local work and
//          for a long-lived server with a volume.
//
// The disk driver is why image generation broke on the live site: a
// serverless filesystem is read-only apart from /tmp, so `put` threw EACCES.
// /tmp would not have saved it either — the next request can land on another
// instance, and the image would 404.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { blobAuth, blobGet, blobPut } from "@/lib/server/blob-store";

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
  return bare in EXT
    ? bare === "image/jpg"
      ? "image/jpeg"
      : bare
    : FALLBACK_TYPE;
}

function extFor(contentType: string): string {
  return EXT[safeType(contentType)] ?? "webp";
}

/** Ids are minted here and only here, so this pattern is the whole contract.
 *  It is also the path-traversal guard: an id off the wire is never used to
 *  build a path or a URL until it matches. */
const ID = /^[0-9a-f]{32}$/;

/** The app-facing URL. One place builds it, so the route that serves an image
 *  and the route that stores one cannot disagree — and it is the same shape
 *  whichever driver is behind it. */
export function urlFor(id: string): string {
  return `/api/concept/image/${id}`;
}

/** Recover the id from one of our URLs; null for anything else — an old
 *  Pollinations link still sitting in someone's chat, say. */
export function idFromUrl(url: string): string | null {
  const m = /\/api\/concept\/image\/([0-9a-f]{32})(?:[?#]|$)/.exec(url);
  return m ? m[1] : null;
}

// ─────────────────────────────── disk ────────────────────────────────

// The folder is only known at run time, so each file call carries
// `turbopackIgnore`: without it the build's file tracer reads these paths as
// "any file in the project" and traces the whole repository into the route
// (Turbopack's "overly broad pattern" / "unexpected file in NFT list").
function dir(): string {
  // Both branches pass through a marked join, and each file call marks both
  // its own argument and the join inside it: the comment covers only the
  // expression it sits on, and the tracer follows dir() into each call (a
  // build with fewer of them still traced 1,292 files into the image route).
  return path.join(
    /* turbopackIgnore: true */ process.env.IDEEZA_IMAGE_DIR?.trim() ||
      path.join(/* turbopackIgnore: true */ process.cwd(), ".ideeza", "concept-images"),
  );
}

async function diskPut(
  id: string,
  bytes: Uint8Array,
  contentType: string,
  record: ImageMeta,
): Promise<void> {
  const base = dir();
  await mkdir(/* turbopackIgnore: true */ base, { recursive: true });
  await writeFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ base, `${id}.${extFor(contentType)}`), bytes);
  await writeFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ base, `${id}.json`), JSON.stringify(record), "utf8");
}

async function diskRecord(id: string): Promise<Partial<ImageMeta> | null> {
  try {
    return JSON.parse(
      await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ dir(), `${id}.json`), "utf8"),
    ) as Partial<ImageMeta>;
  } catch {
    return null;
  }
}

async function diskRead(
  id: string,
  contentType: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const bytes = await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ dir(), `${id}.${extFor(contentType)}`));
    return { bytes: new Uint8Array(bytes), contentType };
  } catch {
    return null;
  }
}

// ──────────────────────────── Vercel Blob ────────────────────────────

// The driver itself is lib/server/blob-store.ts, shared with problem reports.

/** Under one prefix so the store stays legible beside anything else the
 *  project keeps there. */
const BLOB_PREFIX = "concept-images";

/** The image carries no extension: the id alone locates it and its type is
 *  kept in the sidecar, which is the same id plus .json. */
const imagePath = (id: string) => `${BLOB_PREFIX}/${id}`;
const metaPath = (id: string) => `${BLOB_PREFIX}/${id}.json`;

// ──────────────────────────── the seam ───────────────────────────────

/** Store the bytes and return the URL the app will refer to them by. */
export async function put(
  bytes: Uint8Array,
  meta: Omit<ImageMeta, "ts">,
): Promise<{ id: string; url: string }> {
  const id = randomUUID().replace(/-/g, "");
  const contentType = safeType(meta.contentType);
  const record: ImageMeta = { ...meta, contentType, ts: Date.now() };

  const auth = await blobAuth();
  if (auth) {
    try {
      await blobPut(auth, imagePath(id), bytes, contentType);
      await blobPut(
        auth,
        metaPath(id),
        JSON.stringify(record),
        "application/json",
      );
      return { id, url: urlFor(id) };
    } catch (err) {
      // Credentials that exist but do not work are worse than none at all:
      // an OIDC token pulled into .env.local expires within the day, so every
      // render on a developer's machine failed with "we couldn't store it"
      // while a perfectly writable disk sat underneath. Fall through and let
      // the disk answer. On a serverless filesystem it throws EROFS in turn,
      // which is the real storage failure and is reported as one.
      console.error("[image-store] blob put failed, falling back to disk", err);
    }
  }

  await diskPut(id, bytes, contentType, record);
  return { id, url: urlFor(id) };
}

/** Read an image's metadata back from the URL the chat stored. Null for a URL
 *  this store did not write — an old Pollinations link, say — which the
 *  caller handles rather than guessing. */
export async function readMeta(url: string): Promise<ImageMeta | null> {
  const id = idFromUrl(url);
  if (!id) return null;
  const raw = await readRecord(id);
  if (!raw) return null;
  if (typeof raw.prompt !== "string" || typeof raw.seed !== "string") {
    return null;
  }
  return {
    prompt: raw.prompt,
    seed: raw.seed,
    provider: String(raw.provider ?? "unknown"),
    // Normalised on the way out too: a sidecar is data someone could edit,
    // and it must not decide a response header.
    contentType: safeType(String(raw.contentType ?? FALLBACK_TYPE)),
    ts: Number(raw.ts ?? 0),
  };
}

async function readRecord(id: string): Promise<Partial<ImageMeta> | null> {
  if (!ID.test(id)) return null;
  const auth = await blobAuth();
  if (auth) {
    const bytes = await blobGet(auth, metaPath(id)).catch(() => null);
    if (bytes) {
      try {
        return JSON.parse(
          new TextDecoder().decode(bytes),
        ) as Partial<ImageMeta>;
      } catch {
        return null;
      }
    }
    // Written by the disk fallback above, so look there before giving up.
  }
  return diskRecord(id);
}

/** The bytes, for the route that serves them. */
export async function read(
  id: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!ID.test(id)) return null;
  const meta = await readMeta(urlFor(id));
  if (!meta) return null;

  const auth = await blobAuth();
  if (auth) {
    const bytes = await blobGet(auth, imagePath(id)).catch(() => null);
    // The stored type wins over whatever the transport reports: it is the one
    // this store normalised on the way in.
    if (bytes) return { bytes, contentType: meta.contentType };
  }
  return diskRead(id, meta.contentType);
}
