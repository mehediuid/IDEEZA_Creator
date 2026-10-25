// What the Tour Guide remembers in this browser (`ideeza:tour`), and the rules read from it: who
// gets the Welcome, and where each chapter starts again.

import { TOUR_CHAPTERS, isChapterId } from "./chapters";
import type { ChapterId, ChapterState, TourRecord } from "./types";

export const TOUR_KEY = "ideeza:tour";

export function emptyTour(): TourRecord {
  return { v: 1, welcome: "unseen", chapters: {}, offers: true, offered: [], snoozed: [], pointed: false, arrival: false };
}

const WELCOME = new Set(["unseen", "started", "later", "declined"]);
const STATES = new Set<ChapterState>(["done", "skipped", "paused"]);

/** A stored record, or `null` when there is none worth reading (none at all, or not ours). */
export function normalizeTour(raw: unknown): TourRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return null;
  const rec = emptyTour();
  if (typeof r.welcome === "string" && WELCOME.has(r.welcome)) rec.welcome = r.welcome as TourRecord["welcome"];
  const chapters = r.chapters && typeof r.chapters === "object" && !Array.isArray(r.chapters) ? (r.chapters as Record<string, unknown>) : {};
  for (const [id, value] of Object.entries(chapters)) {
    if (!isChapterId(id) || !value || typeof value !== "object") continue;
    const { state, step, seen } = value as { state?: unknown; step?: unknown; seen?: unknown };
    if (typeof state !== "string" || !STATES.has(state as ChapterState)) continue;
    const last = TOUR_CHAPTERS.find((c) => c.id === id)!.steps.length - 1;
    const at = typeof step === "number" && Number.isFinite(step) ? Math.trunc(step) : 0;
    const entry: { state: ChapterState; step: number; seen?: number[] } = { state: state as ChapterState, step: Math.min(Math.max(at, 0), last) };
    if (Array.isArray(seen)) entry.seen = [...new Set(seen.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= last))];
    rec.chapters[id] = entry;
  }
  if (typeof r.offers === "boolean") rec.offers = r.offers;
  if (Array.isArray(r.offered)) rec.offered = [...new Set(r.offered.filter(isChapterId))];
  if (Array.isArray(r.snoozed)) rec.snoozed = [...new Set(r.snoozed.filter(isChapterId))].filter((id) => !rec.offered.includes(id));
  if (typeof r.pointed === "boolean") rec.pointed = r.pointed;
  if (typeof r.arrival === "boolean") rec.arrival = r.arrival;
  return rec;
}

/** The Welcome shows on Home to a browser that hasn't answered it: a new one (no record and nothing
 *  made yet), or one whose tours were reset. Closed once, it comes back once, on a later visit
 *  (`laterThisVisit` is false in a new tab or window). */
export function shouldWelcome(
  rec: TourRecord | null,
  at: { pathname: string; hasActivity: boolean; laterThisVisit?: boolean },
): boolean {
  if (at.pathname !== "/") return false;
  if (!rec) return !at.hasActivity;
  if (rec.welcome === "later") return !at.laterThisVisit;
  return rec.welcome === "unseen";
}

export function withWelcome(rec: TourRecord | null, choice: "started" | "declined"): TourRecord {
  return { ...(rec ?? emptyTour()), welcome: choice };
}

/** The Welcome closed without an answer: the first time it waits for a later visit, the second
 *  time it is declined for good. */
export function withWelcomeClosed(rec: TourRecord | null): TourRecord {
  const base = rec ?? emptyTour();
  return { ...base, welcome: base.welcome === "later" ? "declined" : "later" };
}

export function withChapter(rec: TourRecord | null, id: ChapterId, state: ChapterState, step: number): TourRecord {
  const base = rec ?? emptyTour();
  return { ...base, chapters: { ...base.chapters, [id]: { state, step } } };
}

/** A first-visit offer answered with Not now: once, it waits for a later visit; twice, it isn't
 *  offered again. */
export function withOffered(rec: TourRecord | null, id: ChapterId): TourRecord {
  const base = rec ?? emptyTour();
  if (base.offered.includes(id)) return base;
  if (base.snoozed.includes(id)) return { ...base, snoozed: base.snoozed.filter((x) => x !== id), offered: [...base.offered, id] };
  return { ...base, snoozed: [...base.snoozed, id] };
}

/** One tip of an any-order chapter (the editor modules') has been shown; the last one ends it. */
export function withTipSeen(rec: TourRecord | null, id: ChapterId, index: number, total: number): TourRecord {
  const base = rec ?? emptyTour();
  const at = base.chapters[id];
  const seen = [...new Set([...(at?.seen ?? []), index])].sort((a, b) => a - b);
  const state: ChapterState = seen.length >= total ? "done" : "paused";
  return { ...base, chapters: { ...base.chapters, [id]: { state, step: 0, seen } } };
}

/** Tips turned on from the panel: an any-order chapter keeps what it has shown unless it starts
 *  over (`fresh`, a Replay). */
export function withTipsOn(rec: TourRecord | null, id: ChapterId, fresh: boolean): TourRecord {
  const base = rec ?? emptyTour();
  const seen = fresh ? [] : (base.chapters[id]?.seen ?? []);
  return { ...base, chapters: { ...base.chapters, [id]: { state: "paused", step: 0, seen } } };
}

/** Where the tours live has been pointed out. */
export function withPointed(rec: TourRecord | null): TourRecord {
  return { ...(rec ?? emptyTour()), pointed: true };
}

/** The shared-link arrival card has been shown. */
export function withArrival(rec: TourRecord | null): TourRecord {
  return { ...(rec ?? emptyTour()), arrival: true };
}

/** The panel's "Offer a tour the first time I open a page". */
export function withOffers(rec: TourRecord | null, on: boolean): TourRecord {
  return { ...(rec ?? emptyTour()), offers: on };
}

/** What the panel offers: Start (new), Replay (done), or Resume at the step it stopped on. */
export function chapterStatus(rec: TourRecord | null, id: ChapterId): { kind: "new" | "done" | "resume"; step: number } {
  const at = rec?.chapters[id];
  if (!at) return { kind: "new", step: 0 };
  if (at.state === "done") return { kind: "done", step: 0 };
  return at.step > 0 ? { kind: "resume", step: at.step } : { kind: "new", step: 0 };
}
