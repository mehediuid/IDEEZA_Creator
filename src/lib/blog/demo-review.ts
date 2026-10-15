// Demo review (owner decision D9): there is no backend and no IDEEZA team in
// this build, so an automatic check decides in their place, clearly labelled,
// REVIEW_DELAY_MS after sending. It checks real, explainable things and says
// what it found (quoting the words it means) next to how to fix each; it never
// features or removes a blog. Leaves at the production cut, when a server sets
// `reviews` instead. Relative imports only (node:test loads this).

import { dayDate } from "./dates";
import { blockTexts, headingsOf, linksOf, wordCount } from "./doc";
import type { BlogDoc, ReviewReason } from "./types";

export const MIN_WORDS = 150;
const HEADING_AT = 400;
/** How many words of a paragraph or link a reason quotes. */
const QUOTE_WORDS = 6;

export type DemoOutcome = { outcome: "approved" | "changes"; reasons: ReviewReason[] };

function capsShare(texts: readonly string[]): number {
  let letters = 0;
  let caps = 0;
  for (const t of texts) {
    for (const ch of t) {
      if (/\p{L}/u.test(ch)) {
        letters += 1;
        if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) caps += 1;
      }
    }
  }
  return letters ? caps / letters : 0;
}

/** The first paragraph that appears twice, as written the first time. */
function repeated(texts: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const t of texts) {
    const k = t.toLowerCase().replace(/\s+/g, " ").trim();
    if (k.length < 40) continue;
    if (seen.has(k)) return t;
    seen.add(k);
  }
  return null;
}

/** “The first six words…” of a text, so the writer can find it. */
export function quoteStart(text: string, words = QUOTE_WORDS): string {
  const all = text.trim().split(/\s+/).filter(Boolean);
  const head = all.slice(0, words).join(" ");
  return `“${head}${all.length > words ? "…" : ""}”`;
}

/** A link as a reader would name it: its host, or the address when it has none. */
function linkName(href: string): string {
  try {
    return new URL(href).host || href;
  } catch {
    return href;
  }
}

/** The check itself: pure, so a reload never changes an outcome. */
export function demoReview(doc: BlogDoc): DemoOutcome {
  const reasons: ReviewReason[] = [];
  const words = wordCount(doc);
  if (words < MIN_WORDS) {
    reasons.push({ id: "needs-detail", detail: `We counted ${words} words. Blogs need at least ${MIN_WORDS}.` });
  }
  if (words >= HEADING_AT && headingsOf(doc).length === 0) {
    reasons.push({ id: "hard-to-follow", detail: `We counted ${words} words and no heading.` });
  }
  const texts = blockTexts(doc);
  const links = linksOf(doc);
  const found: string[] = [];
  if (links.length > 1 && links.length > words / 40) found.push(`${links.length} links in ${words} words, the first to ${linkName(links[0])}`);
  if (words >= 20 && capsShare(texts) > 0.4) found.push("a lot of capital letters");
  const again = repeated(texts);
  if (again) found.push(`a repeated paragraph starting ${quoteStart(again)}`);
  if (found.length) reasons.push({ id: "reads-like-ad", detail: `We found ${listOf(found)}.` });
  return reasons.length ? { outcome: "changes", reasons } : { outcome: "approved", reasons: [] };
}

/** "a", "a and b", "a, b and c". */
function listOf(parts: readonly string[]): string {
  return parts.length < 2 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Shown wherever a demo decision is (owner D-2: the demo time only, no production promise). */
export const DEMO_REVIEW_NOTE = "Demo: an automatic check decides here instead of the IDEEZA team.";

/** The Demo review badge's word. */
export const DEMO_REVIEW_LABEL = "Demo review";

/** When the demo check decides a blog waiting for review, from the time it is due. The demo
 *  always decides about a minute after sending; an older record still says its true time. */
export function demoWait(decideAt: number, now: number): string {
  const left = decideAt - now;
  if (left <= 90_000) return "It decides in about a minute.";
  const minutes = Math.round(left / 60_000);
  if (minutes < 60) return `It decides in about ${minutes} minutes.`;
  return `It decides on ${dayDate(decideAt)}.`;
}
