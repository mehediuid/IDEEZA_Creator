// The per-product video model and its writers (Phase 2 spec §3.5.7 = VIDEO
// §2A/§3, owner decision 9). Each product keeps its own `ProductVideo`: a
// list of takes, oldest first, with at most one "in use". Every function
// here is a pure reducer over that record — the store, the encoder and the
// IndexedDB clip file live elsewhere (browser-only code the later video
// tasks own).
//
// Pure, relative imports only.

import type { ManualProject } from "../manual/projects";
import type { ProductSource } from "../manual/projects";
import { productRowsOf, type ProjectProduct } from "../manual/project-read";
import type { StoredDraft } from "../brief/project-brief";
import { etaLabel, progressOf, type VideoJob } from "./jobs";
import {
  TAKES_MAX,
  type OnScreenLines,
  type ProductVideo,
  type ProductVideoStatus,
  type ProjectVideos,
  type VideoFailureKind,
  type VideoQuality,
  type VideoTake,
} from "./types";

// ─────────────────────────── shape-checking a stored record ───────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const isQuality = (v: unknown): v is VideoQuality => v === "low" || v === "high";
const FAILURE_KINDS: readonly VideoFailureKind[] = [
  "unsupported",
  "storage",
  "encode",
  "interrupted",
  "cancelled",
  "lost",
];
const isFailureKind = (v: unknown): v is VideoFailureKind =>
  FAILURE_KINDS.includes(v as VideoFailureKind);

function sanitizeLines(raw: unknown): OnScreenLines {
  const a = Array.isArray(raw) ? raw : [];
  return [str(a[0]), str(a[1]), str(a[2])];
}

function sanitizeSource(raw: unknown): ProductSource | null {
  if (!isObj(raw) || typeof raw.buildId !== "string" || typeof raw.productId !== "string") return null;
  return { buildId: raw.buildId, productId: raw.productId };
}

function sanitizeTake(raw: unknown, productId: string): VideoTake | null {
  if (!isObj(raw) || typeof raw.id !== "string" || typeof raw.n !== "number") return null;
  const take: VideoTake = {
    id: raw.id,
    productId,
    n: raw.n,
    prompt: str(raw.prompt),
    lines: sanitizeLines(raw.lines),
    quality: isQuality(raw.quality) ? raw.quality : "low",
    source: sanitizeSource(raw.source),
    createdAt: num(raw.createdAt, Date.now()),
  };
  if (typeof raw.readyAt === "number") take.readyAt = raw.readyAt;
  if (isObj(raw.clip) && typeof raw.clip.mime === "string") {
    take.clip = {
      mime: raw.clip.mime,
      width: num(raw.clip.width),
      height: num(raw.clip.height),
      durationMs: num(raw.clip.durationMs),
      bytes: num(raw.clip.bytes),
    };
  }
  if (isObj(raw.failure) && isFailureKind(raw.failure.kind)) {
    take.failure = { kind: raw.failure.kind, at: num(raw.failure.at, Date.now()) };
  }
  return take;
}

function sanitizeProductVideo(raw: unknown, productId: string): ProductVideo | null {
  if (!isObj(raw) || !Array.isArray(raw.takes)) return null;
  const takes = raw.takes
    .map((t) => sanitizeTake(t, productId))
    .filter((t): t is VideoTake => !!t)
    // oldest first, by creation order — a corrupt store may have them out of order.
    .sort((a, b) => a.createdAt - b.createdAt || a.n - b.n);
  const ids = new Set(takes.map((t) => t.id));
  const inUseId = typeof raw.inUseId === "string" && ids.has(raw.inUseId) ? raw.inUseId : null;
  const video: ProductVideo = { takes, inUseId };
  if (isObj(raw.draft) && typeof raw.draft.prompt === "string") {
    video.draft = {
      prompt: raw.draft.prompt,
      lines: sanitizeLines(raw.draft.lines),
      quality: isQuality(raw.draft.quality) ? raw.draft.quality : "low",
    };
  }
  return video;
}

/** Shape-checks a stored `ideeza:video:<projectId>` record. A record that
 *  doesn't parse comes back null, the same way `sanitizeNetwork` does, so a
 *  caller can offer to start fresh instead of drawing a broken store. */
export function sanitizeProjectVideos(raw: unknown, projectId: string): ProjectVideos | null {
  if (!isObj(raw) || raw.version !== 1 || !isObj(raw.products)) return null;
  const products: Record<string, ProductVideo> = {};
  for (const [productId, v] of Object.entries(raw.products)) {
    const sanitized = sanitizeProductVideo(v, productId);
    if (sanitized) products[productId] = sanitized;
  }
  return { version: 1, projectId, products };
}

// ─────────────────────────── status ───────────────────────────

/** Cut to `max` characters, on a whole word where it can, with an ellipsis
 *  standing in for what's dropped. Used by `defaultLines` (≤ 60 chars). */
function cut(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** The three on-screen lines a fresh Generate pre-fills (P2-VIDEO-6): the
 *  product name, its one-liner cut to 60 characters, and the constant line. */
export function defaultLines(name: string, description: string): OnScreenLines {
  return [cut(name, 60), cut(description, 60), "Built with IDEEZA"];
}

function renderInfoOf(
  take: VideoTake,
  jobs: VideoJob[],
  now: number,
): { stage: VideoJob["stage"]; progress: number; eta: string } | null {
  const job = jobs.find((j) => j.id === take.id);
  if (!job || job.stage === "done" || job.stage === "failed") return null;
  const { total, etaSec } = progressOf(job, now);
  return { stage: job.stage, progress: total, eta: etaLabel(etaSec) };
}

/** One function, one table (P2-VIDEO-4). A rendering video is never "ready"
 *  by itself — only an established, in-use take counts, and a newer take
 *  that is still rendering (or that failed) never demotes it (P2-VIDEO-13
 *  C5, P2-VIDEO-8's "two ready takes" note). */
export function productVideoStatus(
  v: ProductVideo | undefined,
  jobs: VideoJob[],
  now: number,
): ProductVideoStatus {
  if (!v || v.takes.length === 0) return { state: "none" };
  const inUse = v.inUseId ? v.takes.find((t) => t.id === v.inUseId) : undefined;
  const latest = v.takes[v.takes.length - 1];

  if (inUse) {
    if (latest.id !== inUse.id) {
      const info = renderInfoOf(latest, jobs, now);
      if (info) return { state: "ready", take: inUse, next: { take: latest, progress: info.progress, eta: info.eta } };
    }
    return { state: "ready", take: inUse };
  }

  // No established take yet: the latest attempt decides the product's state.
  if (latest.readyAt) return { state: "ready", take: latest };
  if (latest.failure) return { state: "failed", take: latest, failure: latest.failure.kind };
  const info = renderInfoOf(latest, jobs, now);
  if (info) return { state: "rendering", take: latest, stage: info.stage, progress: info.progress, eta: info.eta };
  // No ready time, no failure record, no job: interrupted (P2-VIDEO-3).
  return { state: "failed", take: latest, failure: "interrupted" };
}

// ─────────────────────────── writers ───────────────────────────

/** Every Generate/Regenerate adds a take, numbered per product and never
 *  reused (P2-VIDEO-1). Past `TAKES_MAX`, the oldest take that isn't in use
 *  is evicted first — `evicted` names it so the caller can drop its file. */
export function startTake(
  v: ProductVideo | undefined,
  input: {
    productId: string;
    prompt: string;
    lines: OnScreenLines;
    quality: VideoQuality;
    source: ProductSource | null;
  },
  now: number,
  id: string,
): { video: ProductVideo; evicted: string[] } {
  const takes = v ? [...v.takes] : [];
  const n = takes.reduce((max, t) => Math.max(max, t.n), 0) + 1;
  const take: VideoTake = {
    id,
    productId: input.productId,
    n,
    prompt: input.prompt,
    lines: input.lines,
    quality: input.quality,
    source: input.source,
    createdAt: now,
  };
  const next = [...takes, take];
  const evicted: string[] = [];
  while (next.length > TAKES_MAX) {
    const idx = next.findIndex((t) => t.id !== take.id && t.id !== v?.inUseId);
    if (idx === -1) break;
    evicted.push(next[idx].id);
    next.splice(idx, 1);
  }
  return { video: { ...(v ?? { inUseId: null }), takes: next }, evicted };
}

/** The render finished: the take becomes ready and takes over `inUseId`
 *  (P2-VIDEO-1 — "when a take finishes it becomes the product's video"). */
export function finishTake(
  v: ProductVideo,
  takeId: string,
  clip: NonNullable<VideoTake["clip"]>,
  now: number,
): ProductVideo {
  const takes = v.takes.map((t) => {
    if (t.id !== takeId) return t;
    const next: VideoTake = { ...t, readyAt: now, clip };
    delete next.failure;
    return next;
  });
  return { ...v, takes, inUseId: takeId };
}

/** The render failed. The in-use take, if any, is untouched. */
export function failTake(v: ProductVideo, takeId: string, kind: VideoFailureKind, now: number): ProductVideo {
  const takes = v.takes.map((t) => (t.id === takeId ? { ...t, failure: { kind, at: now } } : t));
  return { ...v, takes };
}

/** Makes an existing ready take the product's video (P2-VIDEO-8). A take
 *  that isn't ready — rendering, failed or missing — is refused, and `v`
 *  comes back unchanged. */
export function useTake(v: ProductVideo, takeId: string): ProductVideo {
  const take = v.takes.find((t) => t.id === takeId);
  if (!take || !take.readyAt || take.failure) return v;
  return { ...v, inUseId: takeId };
}

/** Removes a take and its place in history. The in-use take can never be
 *  deleted (P2-VIDEO-1, P2-VIDEO-8) — `v` comes back unchanged instead. */
export function deleteTake(v: ProductVideo, takeId: string): ProductVideo {
  if (takeId === v.inUseId) return v;
  return { ...v, takes: v.takes.filter((t) => t.id !== takeId) };
}

/** P2-VIDEO-19: any ready take whose clip file has gone missing from
 *  IndexedDB is marked `lost`, so it stops counting as ready. If it was in
 *  use, the product falls back to its newest other ready take, else none. */
export function markLost(v: ProductVideo, missing: ReadonlySet<string>, now: number): ProductVideo {
  const takes = v.takes.map((t) =>
    missing.has(t.id) && t.readyAt && !t.failure ? { ...t, failure: { kind: "lost" as const, at: now } } : t,
  );
  let inUseId = v.inUseId;
  if (inUseId && missing.has(inUseId)) {
    const fallback = [...takes].reverse().find((t) => t.id !== inUseId && t.readyAt && !t.failure);
    inUseId = fallback ? fallback.id : null;
  }
  return { ...v, takes, inUseId };
}

/** P2-VIDEO-5: a project's first read after Phase 2 converts the Brief's
 *  old single clip (`videoJobId`, or the even older `storyboardGenerated`)
 *  into Take 1 for the headline product — the first row `productRowsOf`
 *  lists. Pure: it only describes the take to start. The caller generates
 *  its id, calls `startTake` and queues the real render, because the old
 *  job never produced a file.
 *
 *  A `videoJobId` that points at a job still short of `"done"` is left
 *  alone — the old render is still the one in flight, and migrating out
 *  from under it would orphan its progress. `storyboardGenerated` alone (no
 *  job reference at all, from an older Brief) migrates unconditionally. */
export function migrateLegacyClip(
  p: ManualProject,
  d: StoredDraft | null,
  jobs: VideoJob[],
  // Part of the spec's signature (§3.5.7) for symmetry with `startTake`,
  // which the caller invokes with its own `now` right after this — this
  // function only describes the take, so it never stamps a time itself.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  now: number,
): { productId: string; input: Parameters<typeof startTake>[1] } | null {
  const draft = d?.state;
  if (!draft) return null;
  if (!draft.videoJobId && !draft.storyboardGenerated) return null;
  if (draft.videoJobId) {
    const job = jobs.find((j) => j.id === draft.videoJobId);
    if (!job || job.stage !== "done") return null;
  }
  const headline = productRowsOf(p)[0];
  if (!headline) return null;
  const quality: VideoQuality = draft.quality === "high" ? "high" : "low";
  return {
    productId: headline.id,
    input: {
      productId: headline.id,
      prompt: draft.videoPrompt ?? "",
      lines: defaultLines(headline.name, headline.description),
      quality,
      source: headline.source ?? null,
    },
  };
}

/** D6: no project-level "Default Media" — MARKET's listing card falls back
 *  to the first current product's in-use take, purely. */
export function featuredVideoOf(video: ProjectVideos | null, products: ProjectProduct[]): VideoTake | null {
  if (!video) return null;
  for (const p of products) {
    if (p.dropped !== null) continue;
    const pv = video.products[p.id];
    if (!pv?.inUseId) continue;
    const take = pv.takes.find((t) => t.id === pv.inUseId);
    if (take) return take;
  }
  return null;
}
