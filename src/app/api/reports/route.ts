// POST /api/reports
//
// Keeps a problem report from the Report a problem dialog: a multipart body
// with `report` (JSON) and up to three images (`image0`…`image2`), already
// shrunk in the browser. Everything is checked again here, since anyone can
// call this: the fields and their lengths (parsePayload), and each image by
// its first bytes rather than the type it claims.
//
// 200 { ok, ref } once the report is kept, the same for a second send of the
// same report. 409 when a different report already holds the id (the dialog
// mints a new one and sends again). 400 for a body that isn't a report, 411
// without a length, 413 for one too big, 429 past the per-address limit,
// 500 when no store would take it.

import {
  BODY_BYTES_MAX,
  IMAGE_BYTES_MAX,
  IMAGES_MAX,
  PRIORITY_OF,
  imageTypeOf,
  parsePayload,
  refOf,
} from "@/lib/support/problem-report";
import { imageFileOf, saveReport, type StoredImage } from "@/lib/server/report-store";

// Node, not edge: the disk fallback writes files.
export const runtime = "nodejs";

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

/** A few reports a minute from one address is a maker; more is a script.
 *  Per instance only, so it's a brake, not a wall: the Vercel Firewall rule
 *  in docs/map/OPERATIONS.md is the wall. */
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 10;
const recent = new Map<string, number[]>();

function overLimit(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= PER_WINDOW) return true;
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.delete(recent.keys().next().value as string);
  return false;
}

export async function POST(req: Request) {
  // Checked before the body is read: formData() buffers all of it.
  const length = Number(req.headers.get("content-length"));
  if (!(length > 0)) return fail(411, "length required");
  if (length > BODY_BYTES_MAX) return fail(413, "too big");
  if (overLimit(req)) return fail(429, "too many");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "not a form");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("report") ?? ""));
  } catch {
    return fail(400, "report");
  }
  const parsed = parsePayload(raw);
  if (!parsed.ok) return fail(400, parsed.reason);
  const payload = parsed.payload;

  const files = [0, 1, 2, 3].map((i) => form.get(`image${i}`)).filter((f): f is File => f instanceof File);
  if (files.length > IMAGES_MAX) return fail(400, "images");

  const images: { bytes: Uint8Array; contentType: string }[] = [];
  const meta: StoredImage[] = [];
  let total = 0;
  for (let i = 0; i < files.length; i++) {
    const bytes = new Uint8Array(await files[i].arrayBuffer());
    total += bytes.length;
    if (bytes.length > IMAGE_BYTES_MAX || total > BODY_BYTES_MAX) return fail(413, "image too big");
    const contentType = imageTypeOf(bytes);
    if (!contentType) return fail(400, "image type");
    const size = (raw as { images?: { width?: unknown; height?: unknown }[] }).images?.[i];
    const dim = (v: unknown) => (typeof v === "number" && v > 0 && v <= 10000 ? Math.round(v) : 0);
    images.push({ bytes, contentType });
    meta.push({
      file: imageFileOf(i, contentType),
      contentType,
      width: dim(size?.width),
      height: dim(size?.height),
      bytes: bytes.length,
    });
  }

  const ref = refOf(payload.id);
  let saved: Awaited<ReturnType<typeof saveReport>>;
  try {
    saved = await saveReport(
      {
        v: 1,
        ...payload,
        ref,
        receivedAt: new Date().toISOString(),
        build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
        priority: payload.impact ? PRIORITY_OF[payload.impact] : "low",
        status: "new",
        images: meta,
      },
      images,
    );
  } catch (err) {
    console.error("[reports] could not keep a report", err);
    return fail(500, "store");
  }
  if (saved === "conflict") return fail(409, "id taken");
  return Response.json({ ok: true, ref });
}
