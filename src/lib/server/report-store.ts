// Where a problem report is kept. Server-only, Node runtime.
//
// The project's private Vercel Blob store when one is configured, else the
// server's own disk under .ideeza/ (gitignored), which is what local work
// uses. Each report is a folder: its images first, then report.json, which
// is written last and never over an existing one. So a report.json means a
// complete report, and a second send of the same report (a double press, a
// retry after a dropped connection) finds it and keeps the one already there.
// A *different* report under a taken id (a draft restored in a second tab
// after the first sent it) is a conflict, never a silent "already": the
// dialog mints a fresh id and sends again.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { blobAuth, blobGet, blobPut } from "@/lib/server/blob-store";
import type { ReportPayload } from "@/lib/support/problem-report";

const PREFIX = "problem-reports";

export type StoredImage = { file: string; contentType: string; width: number; height: number; bytes: number };

export type StoredReport = ReportPayload & {
  v: 1;
  ref: string;
  receivedAt: string;
  /** The deployed commit, or "local". */
  build: string;
  priority: "high" | "medium" | "low";
  status: "new";
  images: StoredImage[];
};

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export const imageFileOf = (i: number, contentType: string) => `${i + 1}.${EXT[contentType] ?? "img"}`;

function dir(id: string): string {
  const base = process.env.IDEEZA_REPORT_DIR?.trim() || path.join(process.cwd(), ".ideeza", PREFIX);
  return path.join(base, id);
}

/** What makes two sends the same report. */
const fingerprint = (r: Pick<StoredReport, "kind" | "details" | "images">) =>
  JSON.stringify([r.kind, r.details, r.images.map((i) => i.bytes)]);

/** The report already kept under this id, if any. */
async function existing(id: string): Promise<StoredReport | null> {
  const auth = await blobAuth();
  const bytes = auth ? await blobGet(auth, `${PREFIX}/${id}/report.json`).catch(() => null) : null;
  try {
    const text = bytes ? new TextDecoder().decode(bytes) : await readFile(path.join(dir(id), "report.json"), "utf8");
    return JSON.parse(text) as StoredReport;
  } catch {
    return null;
  }
}

async function settle(report: StoredReport): Promise<"already" | "conflict" | null> {
  const kept = await existing(report.id);
  if (!kept) return null;
  return fingerprint(kept) === fingerprint(report) ? "already" : "conflict";
}

/** Keep the report. "saved" the first time, "already" when this same report
 *  is already kept, "conflict" when another one holds the id; throws when
 *  neither store would take it. */
export async function saveReport(
  report: StoredReport,
  images: { bytes: Uint8Array; contentType: string }[],
): Promise<"saved" | "already" | "conflict"> {
  const before = await settle(report);
  if (before) return before;
  const json = JSON.stringify(report, null, 2);

  const auth = await blobAuth();
  if (auth) {
    try {
      for (let i = 0; i < images.length; i++) {
        // A retry may find the images of a send that died before its JSON.
        await blobPut(auth, `${PREFIX}/${report.id}/${report.images[i].file}`, images[i].bytes, images[i].contentType, {
          overwrite: true,
        });
      }
      await blobPut(auth, `${PREFIX}/${report.id}/report.json`, json, "application/json");
      return "saved";
    } catch (err) {
      const after = await settle(report);
      if (after) return after;
      // The store refused report.json because it exists, but the read above
      // missed it (a throttled read): it is kept, so don't fail over to a disk
      // that a serverless function can't write.
      const { status, detail } = err as { status?: number; detail?: string };
      if (status === 409 || /already exists/i.test(detail ?? "")) return "already";
      // Credentials that exist but don't work (an expired local OIDC token)
      // fall through to the disk, as concept images do.
      console.error("[report-store] blob put failed, falling back to disk", err);
    }
  }

  const folder = dir(report.id);
  await mkdir(folder, { recursive: true });
  for (let i = 0; i < images.length; i++) {
    await writeFile(path.join(folder, report.images[i].file), images[i].bytes);
  }
  try {
    await writeFile(path.join(folder, "report.json"), json, { encoding: "utf8", flag: "wx" });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return (await settle(report)) ?? "already";
    throw err;
  }
  return "saved";
}
