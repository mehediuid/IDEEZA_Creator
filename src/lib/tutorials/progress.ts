// What the viewer has done in Tutorials (plan § Reward logic): the stretches of
// each video they have actually played, the rewards they have claimed, the
// pages they have read to the end, and the last page opened in each category.
//
// A video counts as watched once 90% of its length has been played. Only
// stretches that really played count: a jump (a seek, or a gap longer than a
// normal playback tick) starts a new stretch, and watching the same part twice
// counts it once, so neither skipping to the end nor replaying the start can
// earn a reward.
//
// Pure, relative imports only.

import { addAmounts } from "../wallet/money";
import type { Amount } from "../wallet/types";
import { isAvailable, pagesOf, videosOf, videosOfPage } from "./catalog";
import type { TutorialCategory, TutorialTopic, TutorialVideo } from "./types";

export const TUTORIAL_PROGRESS_KEY = "ideeza:tutorials:progress";

/** The share of a video that must be played before its reward can be claimed. */
export const WATCH_SHARE = 0.9;
/** The longest move between two playback ticks that still counts as playing.
 *  Browsers tick every ~250 ms; a bigger move is a seek. */
export const MAX_TICK_SECONDS = 1.5;

/** Played stretches, [from, to] in seconds, sorted and never overlapping. */
export type Span = [number, number];

export type Claim = { at: number; amount: Amount; activityId: string };

export type TutorialProgress = {
  v: 1;
  watched: Record<string, Span[]>;
  /** Each video's length, as the player last read it. */
  duration: Record<string, number>;
  claimed: Record<string, Claim>;
  /** "<category>/<page>" → when it was read to the end. */
  read: Record<string, number>;
  /** Category slug → the page last opened there. */
  last: Record<string, string>;
};

export function emptyProgress(): TutorialProgress {
  return { v: 1, watched: {}, duration: {}, claimed: {}, read: {}, last: {} };
}

export function pageKey(categorySlug: string, pageSlug: string): string {
  return `${categorySlug}/${pageSlug}`;
}

/** `spans` with [from, to] added and merged. */
export function addSpan(spans: readonly Span[], from: number, to: number): Span[] {
  if (!(to > from) || !Number.isFinite(from) || !Number.isFinite(to)) return spans.slice();
  const all = [...spans, [Math.max(0, from), to] as Span].sort((a, b) => a[0] - b[0]);
  const out: Span[] = [];
  for (const s of all) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else out.push([s[0], s[1]]);
  }
  return out;
}

export function playedSeconds(spans: readonly Span[] | undefined): number {
  return (spans ?? []).reduce((sum, [a, b]) => sum + (b - a), 0);
}

/** The stretch one playback tick covered, or null when the move was a jump. */
export function tickSpan(prev: number, now: number, seeking: boolean): Span | null {
  if (seeking) return null;
  const d = now - prev;
  return d > 0 && d <= MAX_TICK_SECONDS ? [prev, now] : null;
}

/** 0–1: how much of the video has been played. */
export function watchedShare(p: TutorialProgress, videoId: string): number {
  const total = p.duration[videoId];
  if (!total || !Number.isFinite(total)) return 0;
  return Math.min(1, playedSeconds(p.watched[videoId]) / total);
}

export function isWatched(p: TutorialProgress, videoId: string): boolean {
  return watchedShare(p, videoId) >= WATCH_SHARE;
}

/** The video card's footer, by state (Figma F2, F5, F6 plus the states the
 *  logic needs between them). */
export type RewardState = "soon" | "earn" | "watching" | "ready" | "claimed";

export function rewardStateOf(p: TutorialProgress, video: TutorialVideo): RewardState {
  if (p.claimed[video.id]) return "claimed";
  if (!isAvailable(video)) return "soon";
  if (isWatched(p, video.id)) return "ready";
  return playedSeconds(p.watched[video.id]) > 0 ? "watching" : "earn";
}

/** A page is done once it was read to the end and every video on it that can be watched was. */
export function isPageDone(p: TutorialProgress, categorySlug: string, page: TutorialTopic): boolean {
  if (!p.read[pageKey(categorySlug, page.slug)]) return false;
  return videosOfPage(page)
    .filter(isAvailable)
    .every((v) => isWatched(p, v.id) || !!p.claimed[v.id]);
}

/** What the viewer has claimed from a category's videos. */
export function earnedIn(p: TutorialProgress, category: TutorialCategory): Amount {
  const got = videosOf(category)
    .map((v) => p.claimed[v.id]?.amount)
    .filter((a): a is Amount => !!a);
  return got.length ? addAmounts(...got) : "0";
}

/** Where a category's card opens: the page last opened there, else its first page. */
export function resumeSlugOf(p: TutorialProgress, category: TutorialCategory): string | null {
  const pages = pagesOf(category);
  const last = p.last[category.slug];
  if (last && pages.some((e) => e.page.slug === last)) return last;
  return pages[0]?.page.slug ?? null;
}

// ── reading the stored record ────────────────────────────────────────────

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function sanitizeSpans(raw: unknown): Span[] {
  if (!Array.isArray(raw)) return [];
  let out: Span[] = [];
  for (const s of raw) {
    if (Array.isArray(s) && finite(s[0]) && finite(s[1])) out = addSpan(out, s[0], s[1]);
  }
  return out;
}

/** Any stored value, made safe to read: unknown or broken fields are dropped. */
export function normalizeProgress(raw: unknown): TutorialProgress {
  const p = emptyProgress();
  if (!isDict(raw)) return p;
  if (isDict(raw.watched)) {
    for (const [id, spans] of Object.entries(raw.watched)) {
      const clean = sanitizeSpans(spans);
      if (clean.length) p.watched[id] = clean;
    }
  }
  if (isDict(raw.duration)) {
    for (const [id, d] of Object.entries(raw.duration)) if (finite(d) && d > 0) p.duration[id] = d;
  }
  if (isDict(raw.claimed)) {
    for (const [id, c] of Object.entries(raw.claimed)) {
      if (isDict(c) && finite(c.at) && typeof c.amount === "string" && typeof c.activityId === "string") {
        p.claimed[id] = { at: c.at, amount: c.amount, activityId: c.activityId };
      }
    }
  }
  if (isDict(raw.read)) {
    for (const [k, at] of Object.entries(raw.read)) if (finite(at)) p.read[k] = at;
  }
  if (isDict(raw.last)) {
    for (const [k, slug] of Object.entries(raw.last)) if (typeof slug === "string") p.last[k] = slug;
  }
  return p;
}
