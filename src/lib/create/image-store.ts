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
// TWO DRIVERS, chosen by what is configured:
//
//   blob — Vercel Blob, when BLOB_READ_WRITE_TOKEN is set. Its REST API takes
//          a plain fetch with a bearer token, so this needs no SDK. The URL it
//          returns is public and permanent, and it is what goes in the chat.
//   disk — otherwise: the server's own filesystem, served back through
//          /api/concept/image/<id>. Right for local development and for a
//          long-lived server with a volume.
//
// The disk driver is what shipped first, and it is why image generation broke
// on the live site: a serverless function's filesystem is read-only apart
// from /tmp, so `put` threw EACCES and the route reported a failed render for
// a render that had actually worked. /tmp would not have saved it either —
// the next request can land on another instance, and the image would 404.

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
 *  build a path until it matches. */
const ID = /^[0-9a-f]{32}$/;

function blobToken(): string | null {
  const t = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return t && t.length > 0 ? t : null;
}

/** Named so a surface can state which store is in use rather than implying
 *  every install behaves the same. */
export function activeStore(): "blob" | "disk" {
  return blobToken() ? "blob" : "disk";
}

// ─────────────────────────────── disk ────────────────────────────────

function dir(): string {
  return (
    process.env.IDEEZA_IMAGE_DIR?.trim() ||
    path.join(process.cwd(), ".ideeza", "concept-images")
  );
}

// ──────────────────────────── Vercel Blob ────────────────────────────

// Taken from @vercel/blob 2.8.0 rather than from memory: the API moved host
// and shape, and the older `PUT https://blob.vercel-storage.com/<pathname>`
// with x-api-version 7 still authenticates, which makes a stale integration
// look healthy right up until it does not store anything.
const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";
/** Under one prefix so the store stays legible beside anything else the
 *  project keeps there. */
const BLOB_PREFIX = "concept-images";

/** The store id is the fourth segment of the token
 *  (vercel_blob_rw_<storeId>_<secret>), which is how the SDK reads it too. */
function blobStoreId(): string {
  return (blobToken() ?? "").split("_")[3] ?? "";
}

/** One PUT. `x-add-random-suffix: 0` keeps the pathname exactly as given,
 *  which is what lets the sidecar be found from the image's own URL. */
async function blobPut(
  pathname: string,
  body: Uint8Array | string,
  contentType: string,
): Promise<string> {
  const params = new URLSearchParams({ pathname });
  const res = await fetch(`${BLOB_API}/?${params}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${blobToken()}`,
      "x-api-version": BLOB_API_VERSION,
      "x-vercel-blob-store-id": blobStoreId(),
      // Public on purpose: the browser loads the image straight from the
      // store, and the sidecar is read back the same way. Proxying either
      // through a function would spend an invocation per view.
      "x-vercel-blob-access": "public",
      "x-add-random-suffix": "0",
      "x-allow-overwrite": "0",
      "x-content-type": contentType,
    },
    body: body as BodyInit,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`blob put ${res.status}: ${detail.slice(0, 160)}`);
  }
  const data = (await res.json()) as { url?: string; downloadUrl?: string };
  const url = data.url ?? data.downloadUrl;
  if (!url) throw new Error("blob put: no url in the response");
  return url;
}

/** The sidecar sits beside the image under the same id, so its URL is the
 *  image's with the extension swapped — no second lookup, and nothing extra
 *  to carry in the chat. */
function sidecarUrlFor(imageUrl: string): string {
  return imageUrl.replace(/\.[a-z0-9]+(?=$|[?#])/i, ".json");
}

// ──────────────────────────── the seam ───────────────────────────────

/** Store the bytes and return the URL the app will refer to them by. */
export async function put(
  bytes: Uint8Array,
  meta: Omit<ImageMeta, "ts">,
): Promise<{ id: string; url: string }> {
  const id = randomUUID().replace(/-/g, "");
  const contentType = safeType(meta.contentType);
  const record: ImageMeta = { ...meta, contentType, ts: Date.now() };
  const ext = extFor(contentType);

  if (blobToken()) {
    const url = await blobPut(
      `${BLOB_PREFIX}/${id}.${ext}`,
      bytes,
      contentType,
    );
    // The sidecar carries the user's own prompt and is public like the image
    // it describes; its name is a random uuid, so it is not enumerable.
    await blobPut(
      `${BLOB_PREFIX}/${id}.json`,
      JSON.stringify(record),
      "application/json",
    );
    return { id, url };
  }

  const base = dir();
  await mkdir(base, { recursive: true });
  await writeFile(path.join(base, `${id}.${ext}`), bytes);
  await writeFile(path.join(base, `${id}.json`), JSON.stringify(record), "utf8");
  return { id, url: `/api/concept/image/${id}` };
}

/** Recover an image's metadata from the URL the chat stored. Returns null for
 *  a URL this store did not write — an old Pollinations link, say — which the
 *  caller handles rather than guessing. */
export async function readMeta(url: string): Promise<ImageMeta | null> {
  const record = await (url.startsWith("http")
    ? readBlobMeta(url)
    : readDiskMeta(url));
  if (!record) return null;
  if (typeof record.prompt !== "string" || typeof record.seed !== "string") {
    return null;
  }
  return {
    prompt: record.prompt,
    seed: record.seed,
    provider: String(record.provider ?? "unknown"),
    // Normalised on the way out too: a sidecar is a file someone could edit,
    // and it must not decide a response header.
    contentType: safeType(String(record.contentType ?? FALLBACK_TYPE)),
    ts: Number(record.ts ?? 0),
  };
}

async function readBlobMeta(url: string): Promise<Partial<ImageMeta> | null> {
  if (!/\/(?:[^/]+\/)?[0-9a-f]{32}\.[a-z0-9]+(?:$|[?#])/i.test(url)) return null;
  try {
    const res = await fetch(sidecarUrlFor(url), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Partial<ImageMeta>;
  } catch {
    return null;
  }
}

async function readDiskMeta(url: string): Promise<Partial<ImageMeta> | null> {
  const id = idFromUrl(url);
  if (!id) return null;
  try {
    const raw = await readFile(path.join(dir(), `${id}.json`), "utf8");
    return JSON.parse(raw) as Partial<ImageMeta>;
  } catch {
    return null;
  }
}

/** Recover the id from one of our own disk URLs; null for anything else. */
export function idFromUrl(url: string): string | null {
  const m = /\/api\/concept\/image\/([0-9a-f]{32})(?:[?#]|$)/.exec(url);
  return m ? m[1] : null;
}

/** Read the bytes back. Disk only — a blob is served by Vercel directly, and
 *  proxying it through a function would spend an invocation to no end. */
export async function read(
  id: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!ID.test(id)) return null;
  const record = await readDiskMeta(`/api/concept/image/${id}`);
  if (!record) return null;
  const contentType = safeType(String(record.contentType ?? FALLBACK_TYPE));
  try {
    const bytes = await readFile(path.join(dir(), `${id}.${extFor(contentType)}`));
    return { bytes: new Uint8Array(bytes), contentType };
  } catch {
    return null;
  }
}
