// A blog's status, worked out from its record (spec § Statuses) — never stored,
// so it can't disagree with the review history. The writer reads only the
// Figma's seven words (DISPLAY_LABEL, requirements L9) plus "published version"
// for what readers see; `ArticleStatus` is the record's own shape underneath,
// for the rules (what can be edited, which ⋯ rows apply). Relative imports only
// (node:test loads this).

import { thingsLine, uniqueReasons } from "./reasons";
import type { BlogArticle, ReviewRound } from "./types";

export type ArticleStatus = "draft" | "review" | "needs" | "live" | "changes" | "down";

export type StatusTab = "all" | "drafts" | "review" | "needs" | "live";

/** The list's legacy `tab` query (list.ts reads it); its ids never reach the screen. */
export const STATUS_TABS: readonly { id: StatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "drafts", label: "Drafts" },
  { id: "review", label: "Pending" },
  { id: "needs", label: "Rejected" },
  { id: "live", label: "Approved" },
];

/** The latest review round, if any. */
export function lastReview(a: BlogArticle): ReviewRound | null {
  return a.reviews.length ? a.reviews[a.reviews.length - 1] : null;
}

export function statusOf(a: BlogArticle): ArticleStatus {
  if (a.takenDown) return "down";
  if (a.live) return a.submission ? "changes" : "live";
  if (a.submission) return "review";
  return lastReview(a)?.outcome === "changes" ? "needs" : "draft";
}

export function tabOf(s: ArticleStatus): Exclude<StatusTab, "all"> | null {
  if (s === "draft") return "drafts";
  if (s === "review") return "review";
  if (s === "needs") return "needs";
  if (s === "live" || s === "changes") return "live";
  return null;
}

/** The reasons the latest round sent back, when that is the article's open question. */
export function openReasons(a: BlogArticle): ReviewRound | null {
  const r = lastReview(a);
  if (!r || r.outcome !== "changes" || a.submission) return null;
  return r;
}

/** A live blog whose latest review sent its update back: readers keep the published version. */
export function updateRejected(a: BlogArticle): boolean {
  if (a.takenDown || !a.live || a.submission) return false;
  const r = lastReview(a);
  return !!r && r.outcome === "changes" && r.at > a.live.approvedAt;
}

export type LiveNoteKind = "update-review" | "update-rejected" | "unsent";

/** A second line under a live blog's badge, when there is something to say: its update waits
 *  for review, its update was rejected (with the latest round's count), or it has changes
 *  readers don't see yet. */
export function liveNoteOf(a: BlogArticle, draftDiffers: boolean): { kind: LiveNoteKind; text: string } | null {
  const s = statusOf(a);
  if (s === "changes") return { kind: "update-review", text: "Update in review" };
  if (s !== "live") return null;
  if (updateRejected(a)) {
    const n = uniqueReasons(lastReview(a)?.reasons ?? []).length;
    return { kind: "update-rejected", text: n ? `Update rejected · ${thingsLine(n)}` : "Update rejected" };
  }
  return draftDiffers ? { kind: "unsent", text: "Unsent changes" } : null;
}

export function liveNote(a: BlogArticle, draftDiffers: boolean): string | null {
  return liveNoteOf(a, draftDiffers)?.text ?? null;
}

export type ArticleAction = "view" | "quick-view" | "copy-link" | "change-cover" | "edit" | "take-offline" | "discard-changes" | "delete";

/** What the row's ⋯ holds. The row itself opens the article, so "open" is never here. */
export function actionsFor(s: ArticleStatus): ArticleAction[] {
  switch (s) {
    case "draft":
    case "needs":
    case "down":
      return ["delete"];
    case "review":
      return ["edit", "delete"];
    case "live":
      return ["copy-link", "change-cover", "edit", "take-offline", "delete"];
    case "changes":
      return ["copy-link", "discard-changes", "delete"];
  }
}

/** Where the row goes: the editor while there is writing to do, the article page otherwise. */
export function opensEditor(s: ArticleStatus): boolean {
  return s === "draft" || s === "needs";
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function shortDate(t: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(t);
}

export function longDate(t: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(t);
}

/** "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago", then a date. */
export function relative(t: number, now: number): string {
  const d = Math.max(0, now - t);
  if (d < MIN) return "just now";
  if (d < HOUR) return `${Math.floor(d / MIN)} min ago`;
  if (d < DAY) return `${Math.floor(d / HOUR)} h ago`;
  if (d < 2 * DAY) return "yesterday";
  if (d < 7 * DAY) return `${Math.floor(d / DAY)} days ago`;
  return `on ${shortDate(t)}`;
}

/** The list's "Last change" cell, in the words of the status. */
export function whenLine(a: BlogArticle, now: number): string {
  const s = statusOf(a);
  if (s === "down" && a.takenDown) return `Removed ${shortDate(a.takenDown.at)}`;
  if (s === "review" || s === "changes") return `Sent ${a.submission ? relative(a.submission.at, now) : ""}`.trim();
  if (s === "needs") {
    const r = lastReview(a);
    return r ? `Reviewed ${relative(r.at, now)}` : `Edited ${relative(a.updatedAt, now)}`;
  }
  if (s === "live" && a.live) return `Live since ${shortDate(a.live.approvedAt)}`;
  return `Edited ${relative(a.updatedAt, now)}`;
}

// ─────────────────────────── the Figma's words ───────────────────────────
// The Figma requirements (spec 2026-10-14-blog-figma-requirements.md, L3/L9): the list and
// the badges speak the Figma's seven statuses. They are a reading of the same record —
// Pending and Re-submitted are both "waiting for the IDEEZA team", told apart by whether it
// was sent before; Featured is an approved blog the team picked.

export type DisplayStatus = "featured" | "approved" | "draft" | "resubmitted" | "removed" | "pending" | "rejected";

/** The Status filter's order, the Figma's (frame 04), with Featured beside Approved. */
export const DISPLAY_STATUSES: readonly DisplayStatus[] = ["approved", "featured", "pending", "rejected", "draft", "removed", "resubmitted"];

export const DISPLAY_LABEL: Readonly<Record<DisplayStatus, string>> = {
  featured: "Featured",
  approved: "Approved",
  draft: "Draft",
  resubmitted: "Re-submitted",
  removed: "Removed",
  pending: "Pending",
  rejected: "Rejected",
};

/** One sentence for each, wherever the badge has room to explain itself (the list's tooltip;
 *  details and Quick view say more, from the record: article-view.ts `statusView`). Never
 *  says who decided: in this build a demo check does (DEMO_REVIEW_NOTE). */
export const DISPLAY_SENTENCE: Readonly<Record<DisplayStatus, string>> = {
  featured: "Live on the IDEEZA Blog, and picked by the IDEEZA team.",
  approved: "Approved and live on the IDEEZA Blog.",
  draft: "Only you can see this.",
  resubmitted: "Sent again. Waiting for the IDEEZA team to review it.",
  removed: "The IDEEZA team removed this from the IDEEZA Blog. Readers can't see it.",
  pending: "Waiting for the IDEEZA team to review it. To change something, use Edit. It leaves review until you publish again.",
  rejected: "Rejected in review. See the reasons, then edit it and publish it again.",
};

export function displayStatusOf(a: BlogArticle): DisplayStatus {
  if (a.takenDown) return "removed";
  if (a.live) return a.submission ? "resubmitted" : a.featured ? "featured" : "approved";
  if (a.submission) return a.submission.kind === "again" ? "resubmitted" : "pending";
  return lastReview(a)?.outcome === "changes" ? "rejected" : "draft";
}

/** A Featured blog whose update waits for review: it keeps its Featured mark beside
 *  Re-submitted (F23), and stays under the Featured filter. */
export function featuredUpdating(a: BlogArticle): boolean {
  return !a.takenDown && !!a.live && !!a.submission && a.featured;
}

/** Whether the Status filter `s` lists this blog. Its badge decides, plus two blogs the badge
 *  alone would hide: a live blog whose update was rejected is also Rejected (it needs the
 *  writer), and a Featured blog with an update in review is also Featured. */
export function inStatus(a: BlogArticle, s: DisplayStatus): boolean {
  if (displayStatusOf(a) === s) return true;
  if (s === "rejected") return updateRejected(a);
  if (s === "featured") return featuredUpdating(a);
  return false;
}

/** The ⋯ menu the Figma draws for each status (L10–L13: View to website · Quick view · Edit ·
 *  Change thumbnail · Delete), plus Copy link, Take offline and Discard changes where they
 *  apply. `unsent`: a live blog's draft differs from what readers see, so it can be thrown away. */
export function menuFor(a: BlogArticle, opts: { unsent?: boolean } = {}): ArticleAction[] {
  const d = displayStatusOf(a);
  switch (d) {
    case "featured":
    case "approved":
      return opts.unsent
        ? ["view", "edit", "change-cover", "copy-link", "discard-changes", "take-offline", "delete"]
        : ["view", "edit", "change-cover", "copy-link", "take-offline", "delete"];
    case "draft":
      return ["edit", "delete"];
    case "pending":
    case "rejected":
      return ["quick-view", "edit", "change-cover", "delete"];
    case "resubmitted":
      return a.live
        ? ["view", "quick-view", "edit", "change-cover", "copy-link", "discard-changes", "take-offline", "delete"]
        : ["quick-view", "edit", "change-cover", "delete"];
    case "removed":
      return ["view", "delete"];
  }
}

/** "Mar 24, 2025 · 03:32 AM" — the Figma's Date & Time column. */
export function dateTime(t: number): string {
  const d = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(t);
  const h = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(t);
  return `${d} · ${h}`;
}
