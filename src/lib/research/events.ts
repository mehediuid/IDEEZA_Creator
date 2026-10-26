// What a tester's session reports besides pages, clicks and the replay, which the tools capture on
// their own: the journey's milestones, the Welcome's answer and the first-product guide's state,
// and the app's own calls that failed or kept the tester waiting. Each event goes to PostHog with
// its details, and to Clarity by a name alone (Clarity events carry no properties), so the name
// says the detail there.
//
// The overview tour's chapters are not reported, and nothing is recorded while one plays (owner,
// 2026-10-26: not needed there): it moves through the pages by itself, so its pages and clicks are
// the tour's, not the tester's.
//
// Pure: the host sends them.

import type { TourRecord } from "../tour/types";
import { JOURNEY, type JourneyId } from "./journey";

export type ResearchEvent = {
  name: string;
  props?: Record<string, string | number | boolean>;
  clarity: string;
};

export function journeyEvent(id: JourneyId): ResearchEvent {
  return { name: `journey_${id}`, props: { step: JOURNEY.indexOf(id) + 1, of: JOURNEY.length }, clarity: `journey_${id}` };
}

/** Report a problem opened: the tester hit something worth telling us. */
export const REPORT_OPENED: ResearchEvent = { name: "report_opened", clarity: "report_opened" };

/** What changed between two reads of the tour record: the Welcome's answer and the first-product
 *  guide's state. `undefined` is the record not read yet: nothing to compare. */
export function tourEvents(prev: TourRecord | null | undefined, next: TourRecord | null | undefined): ResearchEvent[] {
  if (prev === undefined || !next) return [];
  const out: ResearchEvent[] = [];
  if (next.welcome !== (prev?.welcome ?? "unseen") && next.welcome !== "unseen") {
    out.push({ name: "tour_welcome", props: { choice: next.welcome }, clarity: `tour_welcome_${next.welcome}` });
  }
  if (next.guide !== (prev?.guide ?? "off")) {
    out.push({ name: "tour_guide", props: { state: next.guide }, clarity: `tour_guide_${next.guide}` });
  }
  return out;
}

/** PostHog's own capture, which a playing tour would fill with its pages and clicks. Errors and
 *  the events above still go. */
const TOUR_NOISE = new Set(["$pageview", "$pageleave", "$autocapture", "$rageclick", "$dead_click", "$$heatmap", "$snapshot", "$web_vitals"]);

export const isTourNoise = (event: string): boolean => TOUR_NOISE.has(event);

/** A call kept the tester waiting this long (the AI's model takes 15–40 s under load). */
export const SLOW_MS = 15_000;

/** This app's `/api` route for a fetched URL, its ids folded to `:id`; null for anything else. */
export function apiRouteOf(url: string, origin: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, origin);
  } catch {
    return null;
  }
  if (parsed.origin !== origin || !parsed.pathname.startsWith("/api/")) return null;
  return parsed.pathname
    .split("/")
    .map((part) => (/^[a-z-]*$/.test(part) ? part : ":id"))
    .join("/");
}

export type CallProblem = "failed" | "slow";

/** `status` null: the request never got an answer. */
export function callProblem(status: number | null, ms: number): CallProblem | null {
  if (status === null || status >= 400) return "failed";
  return ms >= SLOW_MS ? "slow" : null;
}

export function apiEvent(route: string, problem: CallProblem, ms: number, status: number | null): ResearchEvent {
  return {
    name: "api_problem",
    props: { route, problem, ms: Math.round(ms), status: status ?? 0 },
    clarity: `api_${problem}`,
  };
}
