// Keeps an inspiration image (lib/create/inspiration.ts) where concept
// images live, and answers with its app URL. The composer has already cropped
// and shrunk it to 512 × 384; this checks it is a picture, of a size that
// says so, before anything is stored and served back from this origin.
//
// Runtime is nodejs because the store may touch the disk.

import { NextResponse } from "next/server";
import { put } from "@/lib/create/image-store";
import { INSPIRATION_PROVIDER, MAX_STORED_BYTES, parseDataUrl, sniffType } from "@/lib/create/inspiration";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseDataUrl((body as { image?: unknown } | null)?.image);
  if (!parsed) {
    return NextResponse.json({ error: "Send the picture as a JPG, PNG or WebP." }, { status: 400 });
  }
  const bytes = new Uint8Array(Buffer.from(parsed.base64, "base64"));
  if (bytes.byteLength > MAX_STORED_BYTES) {
    return NextResponse.json({ error: "That picture is too large." }, { status: 413 });
  }
  const type = sniffType(bytes);
  if (!type) {
    return NextResponse.json({ error: "That file isn't a picture." }, { status: 400 });
  }
  try {
    const { url } = await put(bytes, {
      prompt: "",
      seed: "",
      provider: INSPIRATION_PROVIDER,
      contentType: type,
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "We couldn't keep the picture — try again." }, { status: 500 });
  }
}
