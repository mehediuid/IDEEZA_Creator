// Reuse consent (Figma P5/P6; owner decision D-4) — the words and the one rule
// for saving it, pure so both are tested.
//
// Consent is asymmetric. A grant (unticked → ticked) is saved only by Save and
// publish or Update: closing the publish step never grants reuse. A withdrawal
// (ticked → unticked) is saved on close too, and the caller confirms it with a
// toast. Once IDEEZA has shared the blog the box is locked on (P6) and nothing
// here changes it. The thumbnail and topics are kept on close as before, but
// only when they changed, so opening and closing the step never moves the
// blog's date. Relative imports only (node:test loads this).

import { findArticle, patchDraft, setReuse, submit } from "./article";
import { sameCover } from "./cover";
import { dayDate } from "./dates";
import type { ArticleMeta, BlogArticle, BlogData } from "./types";

/** P5, the Figma's words exactly (D-7). */
export const REUSE_LABEL = "Give access to IDEEZA to future use";

/** What "future use" means, one string everywhere: the helper, the "?" and the list (D-4). */
export const REUSE_SCOPE = "IDEEZA may share your blog on Medium, in newsletters and in learning guides, always with your name and a link back.";

/** The helper's other sentences: it is optional, where to take it back, and what a share leaves behind. */
export const REUSE_OPTIONAL = "Optional: it doesn't affect the review.";
export const REUSE_UNTIL = "Untick it here any time before IDEEZA shares it.";
export const REUSE_COPIES = "Shared copies stay up until IDEEZA support removes them.";

/** The toast after a withdrawal saved on close. */
export const REUSE_WITHDRAWN = "IDEEZA can no longer reuse this blog. Nothing was sent for review.";

/** P6, the Figma's sentence (frame 16), split at its "support" link. */
export const LOCKED_SENTENCE = {
  before: "This option cannot be unchecked. Please contact ",
  link: "support",
  after: " to make changes.",
} as const;

export type SharedOn = NonNullable<BlogArticle["reuse"]["sharedOn"]>;

/** "Shared on Medium · 13 Oct 2026." — where and when, after the P6 sentence. */
export function sharedLine(s: SharedOn): string {
  return `Shared on ${s.where} · ${dayDate(s.at)}.`;
}

/** The Report a problem topic for a question about a locked blog. */
export function supportTopic(title: string): string {
  return `Blog reuse: ${title.trim() || "Untitled draft"}`;
}

export type ReuseOnClose = "withdraw" | "drop-grant" | "none";

/** What closing the step does with the box: a withdrawal is saved, a new grant is dropped. */
export function reuseOnClose(saved: boolean, chosen: boolean, locked: boolean): ReuseOnClose {
  if (locked || saved === chosen) return "none";
  return chosen ? "drop-grant" : "withdraw";
}

export type StepChoices = Pick<ArticleMeta, "cover" | "topics">;

/** Whether the thumbnail or the topics differ from the draft's. */
export function choicesChanged(draft: StepChoices, choices: StepChoices): boolean {
  return !sameCover(draft.cover, choices.cover) || draft.topics.join("\n") !== choices.topics.join("\n");
}

/** Closing the step without sending: keeps a changed thumbnail and topics, saves a withdrawal,
 *  never a grant. `withdrawn` tells the caller to confirm it. */
export function keepOnClose(data: BlogData, id: string, choices: StepChoices, reuse: boolean, now: number): { data: BlogData; withdrawn: boolean } {
  const article = findArticle(data, id);
  if (!article) return { data, withdrawn: false };
  let next = choicesChanged(article.draft, choices) ? patchDraft(data, id, choices, now) : data;
  const rule = reuseOnClose(article.reuse.allowed, reuse, !!article.reuse.sharedOn);
  if (rule === "withdraw") next = setReuse(next, id, false, now);
  return { data: next, withdrawn: rule === "withdraw" && findArticle(next, id)?.reuse.allowed === false };
}

/** Save and publish / Update: the choices, the reuse box as it stands, and the send. */
export function sendWithChoices(data: BlogData, id: string, choices: StepChoices, reuse: boolean, now: number): BlogData {
  return submit(setReuse(patchDraft(data, id, choices, now), id, reuse, now), id, now);
}
