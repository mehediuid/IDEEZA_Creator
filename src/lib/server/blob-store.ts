// Vercel Blob over its REST API: a plain fetch, so no SDK. Server-only,
// Node runtime. Shared by everything the app keeps in the project's one
// private store: concept images (lib/create/image-store.ts) and problem
// reports (lib/server/report-store.ts). Each keeps its own disk fallback.

import { headers } from "next/headers";

// Taken from @vercel/blob 2.8.0 rather than from memory: the API moved host
// and shape, and the older `PUT https://blob.vercel-storage.com/<pathname>`
// with x-api-version 7 still authenticates, which makes a stale integration
// look healthy right up until it stores nothing.
const BLOB_API = "https://vercel.com/api/blob";
const BLOB_API_VERSION = "12";

/** How this deployment proves it may use the store.
 *
 *  Two shapes, both read out of the SDK rather than assumed. A classic
 *  read-write token carries its own store id as its fourth segment. A store
 *  connected through the newer integration issues no such token at all: the
 *  project gets a short-lived OIDC token, refreshed per invocation, plus
 *  BLOB_STORE_ID separately. The request is otherwise identical — only the
 *  bearer differs, and the store id always rides its own header because it
 *  is not encoded in an OIDC token. */
/** The OIDC token is NOT an environment variable in a deployed function. The
 *  platform injects it as the `x-vercel-oidc-token` REQUEST HEADER, and the
 *  env var exists only as the local-development fallback — which is exactly
 *  why the store wrote happily from a laptop and fell through to the disk in
 *  production. Read out of @vercel/oidc 3.8.8:
 *
 *    getContext().headers?.["x-vercel-oidc-token"] ?? process.env.VERCEL_OIDC_TOKEN
 */
async function oidcToken(): Promise<string | null> {
  try {
    const fromHeader = (await headers()).get("x-vercel-oidc-token")?.trim();
    if (fromHeader) return fromHeader;
  } catch {
    // Called outside a request scope; the env fallback is all there is.
  }
  return process.env.VERCEL_OIDC_TOKEN?.trim() || null;
}

export async function blobAuth(): Promise<{ token: string; storeId: string } | null> {
  const rw = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (rw) {
    // vercel_blob_rw_<storeId>_<secret>
    return { token: rw, storeId: rw.split("_")[3] ?? "" };
  }
  const stored = process.env.BLOB_STORE_ID?.trim();
  const oidc = stored ? await oidcToken() : null;
  if (oidc && stored) {
    return {
      token: oidc,
      storeId: stored.startsWith("store_")
        ? stored.slice("store_".length)
        : stored,
    };
  }
  // A store that cannot authenticate looks exactly like one that is not
  // configured: both fall through to the disk driver and, on a read-only
  // filesystem, both surface as the same generic failure. Knowing which is
  // the difference between a five-minute fix and a hunt.
  console.error(
    "[blob] no credentials — rwToken:",
    Boolean(rw),
    "storeId:",
    Boolean(stored),
    "oidc:",
    Boolean(oidc),
  );
  return null;
}

export type BlobAuth = { token: string; storeId: string };

function blobHeaders(auth: BlobAuth): Record<string, string> {
  return {
    authorization: `Bearer ${auth.token}`,
    "x-api-version": BLOB_API_VERSION,
    "x-vercel-blob-store-id": auth.storeId,
  };
}

/** Where a pathname ends up. Derived rather than remembered, so an id is all
 *  the app has to carry — and checked against the URL the API returns on
 *  every write, so if the host shape ever changes this fails loudly at the
 *  write instead of quietly 404ing at every later read. */
function blobUrl(storeId: string, pathname: string): string {
  return `https://${storeId.toLowerCase()}.private.blob.vercel-storage.com/${pathname}`;
}

export async function blobPut(
  auth: BlobAuth,
  pathname: string,
  body: Uint8Array | string,
  contentType: string,
  /** Write over a blob already at this pathname. Off by default: a second
   *  write to the same name is a bug unless the caller says it's a retry. */
  { overwrite = false }: { overwrite?: boolean } = {},
): Promise<void> {
  const params = new URLSearchParams({ pathname });
  const res = await fetch(`${BLOB_API}/?${params}`, {
    method: "PUT",
    headers: {
      ...blobHeaders(auth),
      // Private on purpose: a concept render is the maker's own idea, and a
      // report can show their screen. Only this app reads them back.
      "x-vercel-blob-access": "private",
      "x-add-random-suffix": "0",
      "x-allow-overwrite": overwrite ? "1" : "0",
      "x-content-type": contentType,
    },
    body: body as BodyInit,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(new Error(`blob put ${res.status}: ${detail.slice(0, 200)}`), { status: res.status, detail });
  }
  const data = (await res.json()) as { url?: string };
  const expected = blobUrl(auth.storeId, pathname);
  if (data.url && data.url !== expected) {
    throw new Error(
      `blob put: the store answered ${data.url}, which this build cannot derive from an id — the URL shape has changed`,
    );
  }
}

export async function blobGet(
  auth: BlobAuth,
  pathname: string,
): Promise<Uint8Array | null> {
  const res = await fetch(blobUrl(auth.storeId, pathname), {
    headers: blobHeaders(auth),
  });
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}
