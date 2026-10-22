// What the Tour Guide remembers in this browser (`ideeza:tour`), and the rules read from it: who
// gets the Welcome, and where each chapter starts again.

import { TOUR_CHAPTERS, isChapterId } from "./chapters";
import type { ChapterId, ChapterState, TourRecord } from "./types";

export const TOUR_KEY = "ideeza:tour";

export function emptyTour(): TourRecord {
  return { v: 1, welcome: "unseen", chapters: {}, offers: true, offered: [] };
}

const WELCOME = new Set(["unseen", "started", "declined"]);
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
    const { state, step } = value as { state?: unknown; step?: unknown };
    if (typeof state !== "string" || !STATES.has(state as ChapterState)) continue;
    const last = TOUR_CHAPTERS.find((c) => c.id === id)!.steps.length - 1;
    const at = typeof step === "number" && Number.isFinite(step) ? Math.trunc(step) : 0;
    rec.chapters[id] = { state: state as ChapterState, step: Math.min(Math.max(at, 0), last) };
  }
  if (typeof r.offers === "boolean") rec.offers = r.offers;
  if (Array.isArray(r.offered)) rec.offered = [...new Set(r.offered.filter(isChapterId))];
  return rec;
}

/** The Welcome shows on Home to a browser that hasn't answered it: a new one (no record and nothing
 *  made yet), or one whose tours were reset. */
export function shouldWelcome(rec: TourRecord | null, at: { pathname: string; hasActivity: boolean }): boolean {
  if (at.pathname !== "/") return false;
  if (!rec) return !at.hasActivity;
  return rec.welcome === "unseen";
}

export function withWelcome(rec: TourRecord | null, choice: "started" | "declined"): TourRecord {
  return { ...(rec ?? emptyTour()), welcome: choice };
}

export function withChapter(rec: TourRecord | null, id: ChapterId, state: ChapterState, step: number): TourRecord {
  const base = rec ?? emptyTour();
  return { ...base, chapters: { ...base.chapters, [id]: { state, step } } };
}

/** A first-visit offer answered with Not now: it isn't offered again. */
export function withOffered(rec: TourRecord | null, id: ChapterId): TourRecord {
  const base = rec ?? emptyTour();
  return base.offered.includes(id) ? base : { ...base, offered: [...base.offered, id] };
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
