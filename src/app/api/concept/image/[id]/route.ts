// GET /api/concept/image/<id>
//
// Serves a stored concept image. This is the URL that goes into the user's
// chat history, so it has to keep working long after the generator's own
// link has expired — which is the entire reason the bytes were stored.
//
// The id is minted by the store and is validated there before any path is
// built from it, so a crafted id reads as "not found" rather than reaching
// the filesystem.

import { read } from "@/lib/create/image-store";

// Node, not edge: the store is on disk. (nodejs is the default; it is
// written out because the sibling generate route also declares its own.)
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const image = await read(id);
  if (!image) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(image.bytes as BodyInit, {
    headers: {
      "Content-Type": image.contentType,
      // The bytes at an id never change — the id is minted per render — so
      // this is cached as hard as both caches allow. s-maxage is not
      // decoration: a CDN in front of this only caches a function response
      // when one of s-maxage / stale-while-revalidate is present, so without
      // it every view of every image in every chat, forever, woke a function.
      "Cache-Control":
        "public, max-age=31536000, s-maxage=31536000, immutable",
      // The bytes came from an outside provider; served from this origin they
      // must never be sniffed into something executable.
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(image.bytes.byteLength),
    },
  });
}
