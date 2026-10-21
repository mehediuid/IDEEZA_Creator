// The project video (owner, 2026-10-21; docs/superpowers/specs/2026-10-21-project-video-design.md):
// one video for the whole project, joined from its products' videos — an intro card, each current
// product's cut in order, an outro card. It can be made once every current product has a ready
// video, and the whole project's share, sale, gift and relist wait for it (readiness
// `projectVideo`). It is stored like a product's video, under `PROJECT_VIDEO_KEY`.
//
// Pure, relative imports only.

import type { ProjectProduct } from "../manual/project-read";
import type { VideoJob } from "./jobs";
import { productVideoStatus } from "./product-video";
import { PROJECT_VIDEO_KEY, type JoinPlan, type ProductVideoStatus, type ProjectVideos, type VideoTake } from "./types";

export const INTRO_MS = 2000;
export const OUTRO_MS = 2000;
export const OUTRO_LINE = "Built with IDEEZA";
const SHARED_MS = 15_000;
const CUT_MIN_MS = 2000;
const CUT_MAX_MS = 10_000;
const LINE_MAX = 60;

export const isProjectKey = (id: string | null | undefined): boolean => id === PROJECT_VIDEO_KEY;

/** Each product's share (D6): about 15 s split between them, at most 10 s and at least 2 s each. */
export function cutMs(n: number): number {
  if (n <= 0) return CUT_MAX_MS;
  return Math.round(Math.min(CUT_MAX_MS, Math.max(CUT_MIN_MS, SHARED_MS / n)) / 100) * 100;
}

export function joinLengthMs(plan: JoinPlan): number {
  return INTRO_MS + plan.cuts.reduce((sum, c) => sum + c.ms, 0) + OUTRO_MS;
}

export const JOIN_FADE_MS = 250;

/** One stretch of a project video: the intro card, product cut `index`, or the outro card. */
export type JoinSegment = { segment: "intro" | "cut" | "outro"; index: number; localMs: number };
/** A frame: its stretch and, for 250 ms after each boundary, the stretch before it held at its
 *  last instant under this one fading in (`fade` 0 → 1). */
export type JoinFrame = JoinSegment & { fade: number; prev: JoinSegment | null };

/** What the renderer draws at `tSec`, clamped to the video's length. */
export function joinFrameAt(plan: JoinPlan, tSec: number): JoinFrame {
  const segments: { segment: JoinSegment["segment"]; index: number; ms: number }[] = [
    { segment: "intro", index: 0, ms: INTRO_MS },
    ...plan.cuts.map((c, index) => ({ segment: "cut" as const, index, ms: c.ms })),
    { segment: "outro", index: 0, ms: OUTRO_MS },
  ];
  // Whole microseconds, so a frame on a boundary (159 / 30 s) never lands a hair before it.
  const t = Math.max(0, Math.min(joinLengthMs(plan), Math.round(tSec * 1_000_000) / 1000));
  let i = 0;
  let start = 0;
  while (i < segments.length - 1 && t >= start + segments[i].ms) start += segments[i++].ms;
  const s = segments[i];
  const localMs = Math.min(s.ms, t - start);
  const before = i > 0 ? segments[i - 1] : null;
  const fading = before !== null && localMs < JOIN_FADE_MS;
  return {
    segment: s.segment,
    index: s.index,
    localMs,
    fade: fading ? localMs / JOIN_FADE_MS : 1,
    prev: fading ? { segment: before.segment, index: before.index, localMs: before.ms } : null,
  };
}

function line(s: string): string {
  const t = s.trim();
  return t.length <= LINE_MAX ? t : `${t.slice(0, LINE_MAX - 1).trimEnd()}…`;
}

const nameOf = (name: string) => (name.trim() ? name : "Not named yet");

function readyTakeOf(videos: ProjectVideos | null, id: string, jobs: VideoJob[], now: number): VideoTake | null {
  const status = productVideoStatus(videos?.products[id], jobs, now);
  return status.state === "ready" ? status.take : null;
}

/** The plan a Make project video starts from: the products in the order given, each cut from the
 *  end of its ready clip, where its title shows. Null while any of them has no ready video. */
export function defaultJoinPlan(input: {
  projectName: string;
  description: string;
  products: { id: string; name: string }[];
  videos: ProjectVideos | null;
  jobs?: VideoJob[];
  now?: number;
}): JoinPlan | null {
  if (input.products.length === 0) return null;
  const ms = cutMs(input.products.length);
  const cuts: JoinPlan["cuts"] = [];
  for (const p of input.products) {
    const take = readyTakeOf(input.videos, p.id, input.jobs ?? [], input.now ?? 0);
    if (!take) return null;
    const duration = take.clip?.durationMs || CUT_MAX_MS;
    const len = Math.min(ms, duration);
    cuts.push({ productId: p.id, takeId: take.id, fromMs: Math.max(0, duration - len), ms: len, label: line(nameOf(p.name)) });
  }
  return { intro: [line(input.projectName), line(input.description)], cuts, outro: OUTRO_LINE };
}

/** A saved draft laid over a fresh plan: the draft's intro, outro, order and labels where its
 *  products are still there (new ones go last), with the fresh plan's takes and lengths. */
export function mergeJoinDraft(draft: JoinPlan | undefined, fresh: JoinPlan): JoinPlan {
  if (!draft) return fresh;
  const freshById = new Map(fresh.cuts.map((c) => [c.productId, c]));
  const kept = draft.cuts
    .filter((c) => freshById.has(c.productId))
    .map((c) => ({ ...freshById.get(c.productId)!, label: c.label }));
  const keptIds = new Set(kept.map((c) => c.productId));
  const added = fresh.cuts.filter((c) => !keptIds.has(c.productId));
  return { intro: draft.intro, cuts: [...kept, ...added], outro: draft.outro };
}

export type ProjectVideoState = "waiting" | "make" | "rendering" | "ready" | "outdated" | "failed";

export type ProjectVideoStatus = {
  state: ProjectVideoState;
  /** It counts as made: a ready take that shows exactly the current products. */
  ok: boolean;
  /** The `PROJECT_VIDEO_KEY` record's own status. */
  video: ProductVideoStatus;
  /** Current products with a ready video, and current products. */
  ready: number;
  total: number;
  /** Current products the in-use take leaves out. Blocks (D5). */
  missing: string[];
  /** Products the in-use take shows that aren't current any more. Blocks (D5). */
  extra: string[];
  /** Products cut from an older take than the one they use now. Doesn't block (D5). */
  older: string[];
  /** The in-use take's length. */
  lengthMs: number | null;
};

/** One state for every surface (spec, "Rows and copy"). */
export function projectVideoStatusOf(input: {
  products: ProjectProduct[];
  videos: ProjectVideos | null;
  jobs: VideoJob[];
  now: number;
}): ProjectVideoStatus {
  const { videos, jobs, now } = input;
  const current = input.products.filter((p) => p.dropped === null);
  const total = current.length;
  const ready = current.filter((p) => readyTakeOf(videos, p.id, jobs, now) !== null).length;
  const productsReady = total > 0 && ready === total;

  const video = productVideoStatus(videos?.products[PROJECT_VIDEO_KEY], jobs, now);
  const inUse = video.state === "ready" ? video.take : null;
  const names = new Map(input.products.map((p) => [p.id, nameOf(p.name)]));
  const currentIds = new Set(current.map((p) => p.id));

  let missing: string[] = [];
  let extra: string[] = [];
  let older: string[] = [];
  if (inUse) {
    const cuts = inUse.join?.cuts ?? [];
    const inTake = new Set(cuts.map((c) => c.productId));
    missing = current.filter((p) => !inTake.has(p.id)).map((p) => nameOf(p.name));
    extra = cuts.filter((c) => !currentIds.has(c.productId)).map((c) => names.get(c.productId) ?? c.label);
    older = cuts
      .filter((c) => currentIds.has(c.productId))
      .filter((c) => {
        const take = readyTakeOf(videos, c.productId, jobs, now);
        return take !== null && take.id !== c.takeId;
      })
      .map((c) => names.get(c.productId) ?? c.label);
  }

  const fresh = inUse !== null && missing.length === 0 && extra.length === 0;
  const renderingNow = video.state === "rendering" || (video.state === "ready" && !!video.next);
  let state: ProjectVideoState;
  if (fresh) state = "ready";
  else if (renderingNow) state = "rendering";
  else if (inUse) state = "outdated";
  else if (video.state === "failed" && productsReady) state = "failed";
  else state = productsReady ? "make" : "waiting";

  const lengthMs = inUse ? inUse.clip?.durationMs || (inUse.join ? joinLengthMs(inUse.join) : null) : null;
  return { state, ok: fresh, video, ready, total, missing, extra, older, lengthMs };
}

function seconds(ms: number): string {
  return String(Math.round(ms / 100) / 10);
}

/** What's on screen, segment by segment — the player's "What's in this video". */
export function describeJoin(plan: JoinPlan): string[] {
  let at = 0;
  const span = (ms: number) => {
    const from = at;
    at += ms;
    return `${seconds(from)}–${seconds(at)} s`;
  };
  const intro = plan.intro[1].trim() ? `'${plan.intro[0]}', '${plan.intro[1]}'` : `'${plan.intro[0]}'`;
  return [
    `${span(INTRO_MS)} — title card: ${intro}.`,
    ...plan.cuts.map((c) => `${span(c.ms)} — ${c.label}, from its product video.`),
    `${span(OUTRO_MS)} — closing card: '${plan.outro}'.`,
  ];
}
