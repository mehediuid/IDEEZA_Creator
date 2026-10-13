// Demo review (owner decision D9): there is no backend and no IDEEZA team in
// this build, so an automatic check stands in for them, clearly labelled, and
// decides REVIEW_DELAY_MS after sending. It checks real, explainable things and
// says how to fix each; it never features or takes down an article. Leaves at
// the production cut, when a server sets `reviews` instead.

import { blockTexts, headingsOf, linksOf, wordCount } from "./doc";
import type { BlogDoc, ReviewReason } from "./types";

export const MIN_WORDS = 150;
const HEADING_AT = 400;

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

function repeats(texts: readonly string[]): boolean {
  const seen = new Set<string>();
  for (const t of texts) {
    const k = t.toLowerCase().replace(/\s+/g, " ").trim();
    if (k.length < 40) continue;
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

/** The check itself: pure, so a reload never changes an outcome. */
export function demoReview(doc: BlogDoc): DemoOutcome {
  const reasons: ReviewReason[] = [];
  const words = wordCount(doc);
  if (words < MIN_WORDS) {
    reasons.push({ id: "needs-detail", detail: `Write at least ${MIN_WORDS} words; you have ${words}.` });
  }
  if (words >= HEADING_AT && headingsOf(doc).length === 0) {
    reasons.push({ id: "hard-to-follow", detail: `It's ${words} words with no heading. Add a heading at each new step.` });
  }
  const texts = blockTexts(doc);
  const links = linksOf(doc).length;
  const spam: string[] = [];
  if (links > 1 && links > words / 40) spam.push(`${links} links in ${words} words`);
  if (words >= 20 && capsShare(texts) > 0.4) spam.push("a lot of capital letters");
  if (repeats(texts)) spam.push("a paragraph repeated");
  if (spam.length) reasons.push({ id: "reads-like-ad", detail: `We noticed ${spam.join(", ")}.` });
  return reasons.length ? { outcome: "changes", reasons } : { outcome: "approved", reasons: [] };
}

export const DEMO_REVIEW_NOTE = "In this preview an automatic check stands in for the IDEEZA team.";
