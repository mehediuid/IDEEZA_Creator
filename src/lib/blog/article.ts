// What a writer (and the review) can do to an article — pure functions over the
// index, so every rule is tested here and the store only reads, applies, writes.
// A submitted draft is frozen: editing it first takes it out of review
// (`withdraw`), so the IDEEZA team always reads what was sent.

import { demoReview } from "./demo-review";
import { isEmptyDoc } from "./doc";
import { thingsLine, uniqueReasons } from "./reasons";
import { lastReview, statusOf } from "./status";
import {
  EMPTY_META,
  REVIEW_DELAY_MS,
  TITLE_MAX,
  TOPICS_MAX,
  type ArticleMeta,
  type BlogArticle,
  type BlogCover,
  type BlogData,
  type BlogDoc,
  type ReviewReason,
  type ReviewRound,
  type SubmissionKind,
} from "./types";

function patch(data: BlogData, id: string, fn: (a: BlogArticle) => BlogArticle | null): BlogData {
  let changed = false;
  const articles = data.articles.map((a) => {
    if (a.id !== id) return a;
    const next = fn(a);
    if (!next || next === a) return a;
    changed = true;
    return next;
  });
  return changed ? { ...data, articles } : data;
}

export function findArticle(data: BlogData, id: string): BlogArticle | null {
  return data.articles.find((a) => a.id === id) ?? null;
}

export function createArticle(data: BlogData, id: string, now: number, meta: Partial<ArticleMeta> = {}): BlogData {
  const article: BlogArticle = {
    id,
    createdAt: now,
    updatedAt: now,
    draft: { ...EMPTY_META, ...meta },
    live: null,
    submission: null,
    reviews: [],
    reuse: { allowed: false, at: null, sharedOn: null },
    featured: false,
    takenDown: null,
  };
  return { ...data, articles: [article, ...data.articles] };
}

/** Whether the draft can be changed now: not while it waits for review, not once taken down. */
export function canEdit(a: BlogArticle): boolean {
  return !a.submission && !a.takenDown;
}

function cleanTopics(topics: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of topics) {
    const v = t.trim().replace(/\s+/g, " ").slice(0, 32);
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
    if (out.length === TOPICS_MAX) break;
  }
  return out;
}

/** Changes the draft's meta. Refused (the same data back) while the draft is frozen. */
export function patchDraft(data: BlogData, id: string, change: Partial<ArticleMeta>, now: number): BlogData {
  return patch(data, id, (a) => {
    if (!canEdit(a)) return null;
    const draft: ArticleMeta = { ...a.draft, ...change };
    draft.title = draft.title.slice(0, TITLE_MAX);
    draft.topics = cleanTopics(draft.topics);
    return { ...a, draft, updatedAt: now };
  });
}

/** The body was saved: only the time moves. */
export function touchArticle(data: BlogData, id: string, now: number): BlogData {
  return patch(data, id, (a) => (canEdit(a) ? { ...a, updatedAt: now } : null));
}

export type SendProblem = "title" | "body" | "category";

/** What still stops the article from being sent, in the order the fields appear. */
export function sendProblems(meta: ArticleMeta, doc: BlogDoc): SendProblem[] {
  const out: SendProblem[] = [];
  if (!meta.title.trim()) out.push("title");
  if (isEmptyDoc(doc)) out.push("body");
  if (!meta.categoryId) out.push("category");
  return out;
}

export const SEND_PROBLEM_TEXT: Readonly<Record<SendProblem, string>> = {
  title: "Add a title first.",
  body: "Write something first.",
  category: "Choose a blog category.",
};

export function submissionKindOf(a: BlogArticle): SubmissionKind {
  if (a.live) return "changes";
  return a.reviews.some((r) => r.outcome === "changes") ? "again" : "first";
}

/** The button's words, the Figma's (P7, P8): Publish, or Update for a published blog. Publishing
 *  sends it to the IDEEZA team first; the publish step says so. */
export function sendLabel(a: BlogArticle | null): string {
  return a && submissionKindOf(a) === "changes" ? "Update" : "Publish";
}

export function submit(data: BlogData, id: string, now: number, delay = REVIEW_DELAY_MS): BlogData {
  return patch(data, id, (a) => {
    if (!canEdit(a)) return null;
    return { ...a, submission: { at: now, decideAt: now + delay, kind: submissionKindOf(a) }, updatedAt: now };
  });
}

/** Takes a pending submission back; the draft is editable again. */
export function withdraw(data: BlogData, id: string, now: number): BlogData {
  return patch(data, id, (a) => (a.submission ? { ...a, submission: null, updatedAt: now } : null));
}

/** Applies a review outcome to a pending submission. Approval publishes the draft's meta;
 *  the caller copies the draft body to the live key. */
export function decide(data: BlogData, id: string, outcome: "approved" | "changes", reasons: ReviewReason[], at: number, demo: boolean): BlogData {
  return patch(data, id, (a) => {
    if (!a.submission) return null;
    const round: ReviewRound = { at, outcome, reasons: outcome === "approved" ? [] : reasons, kind: a.submission.kind, seen: false, demo };
    const live = outcome === "approved" ? { ...a.draft, approvedAt: at } : a.live;
    return { ...a, live, submission: null, reviews: [...a.reviews, round] };
  });
}

/** Every submission whose time has come, decided by the demo check. `docOf` reads the
 *  submitted body. Returns the new index and the ids that went live (their bodies to copy). */
export function settleReviews(data: BlogData, now: number, docOf: (id: string) => BlogDoc): { data: BlogData; approved: string[] } {
  let next = data;
  const approved: string[] = [];
  for (const a of data.articles) {
    if (!a.submission || a.submission.decideAt > now) continue;
    const verdict = demoReview(docOf(a.id));
    next = decide(next, a.id, verdict.outcome, verdict.reasons, a.submission.decideAt, true);
    if (verdict.outcome === "approved") approved.push(a.id);
  }
  return { data: next, approved };
}

/** When the next pending review decides, for a timer; null when nothing waits. */
export function nextDecision(data: BlogData): number | null {
  let soonest: number | null = null;
  for (const a of data.articles) if (a.submission && (soonest === null || a.submission.decideAt < soonest)) soonest = a.submission.decideAt;
  return soonest;
}

/** Drops the changes waiting on a live article; the draft goes back to the live meta
 *  (the caller copies the live body back too). */
export function discardChanges(data: BlogData, id: string, now: number): BlogData {
  return patch(data, id, (a) => {
    if (!a.live) return null;
    const { title, categoryId, topics, projectId, cover } = a.live;
    return { ...a, draft: { title, categoryId, topics, projectId, cover }, submission: null, updatedAt: now };
  });
}

/** A live article leaves the Blog and becomes a draft again (to come back, it is sent again). */
export function takeOffline(data: BlogData, id: string, now: number): BlogData {
  return patch(data, id, (a) => (a.live ? { ...a, live: null, submission: null, featured: false, updatedAt: now } : null));
}

export function removeArticle(data: BlogData, id: string): BlogData {
  return data.articles.some((a) => a.id === id) ? { ...data, articles: data.articles.filter((a) => a.id !== id) } : data;
}

/** Turns reuse on or off. Refused (the same data back) once IDEEZA has shared the blog. */
export function setReuse(data: BlogData, id: string, allowed: boolean, now: number): BlogData {
  return patch(data, id, (a) => (a.reuse.allowed === allowed || a.reuse.sharedOn ? null : { ...a, reuse: { allowed, at: now, sharedOn: null } }));
}

/** A new cover. One of the article's own (already reviewed) images on a live article applies
 *  at once (D2); anything else waits in the draft for the next review. */
export function changeCover(data: BlogData, id: string, cover: BlogCover, opts: { reviewed: boolean }, now: number): BlogData {
  return patch(data, id, (a) => {
    if (a.takenDown) return null;
    const draft = { ...a.draft, cover };
    const live = a.live && opts.reviewed ? { ...a.live, cover } : a.live;
    return { ...a, draft, live, updatedAt: now };
  });
}

/** The writer has seen the outcome (opened the article or the bell item). */
export function markSeen(data: BlogData, id: string): BlogData {
  return patch(data, id, (a) => (a.reviews.some((r) => !r.seen) ? { ...a, reviews: a.reviews.map((r) => (r.seen ? r : { ...r, seen: true })) } : null));
}

export type Outcome = { id: string; title: string; outcome: "approved" | "changes"; things: number; at: number; kind: SubmissionKind; demo: boolean };

/** Review outcomes the writer hasn't opened yet, newest first — the bell's Blog review items.
 *  `things` counts the latest round only, repeats dropped, like every other count. */
export function unseenOutcomes(data: BlogData): Outcome[] {
  const out: Outcome[] = [];
  for (const a of data.articles) {
    const r = lastReview(a);
    if (!r || r.seen || a.submission || a.takenDown) continue;
    out.push({
      id: a.id,
      title: displayTitle(a),
      outcome: r.outcome,
      things: uniqueReasons(r.reasons).length,
      at: r.at,
      kind: r.kind,
      demo: r.demo,
    });
  }
  return out.sort((x, y) => y.at - x.at);
}

/** "2 things to fix", for the list row of a rejected blog: the latest round only, repeats
 *  dropped. A live blog whose update was rejected says it in its live note instead
 *  ("Update rejected · 2 things to fix", status.ts `liveNoteOf`), with the same count. */
export function thingsToFix(a: BlogArticle): string | null {
  if (statusOf(a) !== "needs") return null;
  const n = uniqueReasons(lastReview(a)?.reasons ?? []).length;
  return n ? thingsLine(n) : null;
}

/** The title a list or a page shows. */
export function displayTitle(a: BlogArticle): string {
  return (a.live && statusOf(a) !== "draft" ? a.live.title : a.draft.title).trim() || "Untitled draft";
}

// ─────────────────────────── Undo (D-17) ───────────────────────────

/** Puts a blog's record back as it was before a Delete, Take offline or Discard changes was
 *  undone: in place when it is still listed, at its old position when it was deleted. */
export function restoreArticle(data: BlogData, snapshot: BlogArticle, index: number): BlogData {
  if (data.articles.some((a) => a.id === snapshot.id)) return patch(data, snapshot.id, () => snapshot);
  const articles = [...data.articles];
  articles.splice(Math.max(0, Math.min(index, articles.length)), 0, snapshot);
  return { ...data, articles };
}

// ─────────────────── the bell's Featured and Removed items (D-16) ───────────────────
// The IDEEZA team features or removes a blog without a review round, so these two have no
// `seen` flag in the record; the writer's opened ones are kept as keys beside it
// (notice-seen.ts). A blog featured again after losing it, or removed on a new date, is a
// new key, so it is news again.

export type BlogNotice = { key: string; id: string; title: string; kind: "featured" | "removed"; at: number; reasons: number };

export function noticeKeysOf(a: BlogArticle): string[] {
  const keys: string[] = [];
  if (a.takenDown) keys.push(`removed:${a.id}:${a.takenDown.at}`);
  else if (a.live && a.featured) keys.push(`featured:${a.id}:${a.live.approvedAt}`);
  return keys;
}

/** Featured and Removed news the writer hasn't opened, newest first. */
export function unseenNotices(data: BlogData, seen: ReadonlySet<string>): BlogNotice[] {
  const out: BlogNotice[] = [];
  for (const a of data.articles) {
    for (const key of noticeKeysOf(a)) {
      if (seen.has(key)) continue;
      const removed = key.startsWith("removed:");
      out.push({
        key,
        id: a.id,
        title: displayTitle(a),
        kind: removed ? "removed" : "featured",
        at: removed && a.takenDown ? a.takenDown.at : (a.live?.approvedAt ?? a.updatedAt),
        reasons: removed && a.takenDown ? uniqueReasons(a.takenDown.reasons).length : 0,
      });
    }
  }
  return out.sort((x, y) => y.at - x.at);
}
