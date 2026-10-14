// An article's status, worked out from its record (spec § Statuses) — never
// stored, so it can't disagree with the review history. Five words a writer
// learns once (Draft · In review · Needs changes · Live · Taken down), plus the
// Featured badge and the "Changes in review" state of a live article.

import type { BlogArticle, ReviewRound } from "./types";

export type ArticleStatus = "draft" | "review" | "needs" | "live" | "changes" | "down";

export type StatusTab = "all" | "drafts" | "review" | "needs" | "live";

export const STATUS_TABS: readonly { id: StatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "drafts", label: "Drafts" },
  { id: "review", label: "In review" },
  { id: "needs", label: "Needs changes" },
  { id: "live", label: "Live" },
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

export const STATUS_LABEL: Readonly<Record<ArticleStatus, string>> = {
  draft: "Draft",
  review: "In review",
  needs: "Needs changes",
  live: "Live",
  changes: "Live",
  down: "Taken down",
};

/** The DS Badge colour for each status. Never the error badge (it fails contrast). */
export const STATUS_TONE: Readonly<Record<ArticleStatus, "neutral" | "blue" | "warning" | "success">> = {
  draft: "neutral",
  review: "blue",
  needs: "warning",
  live: "success",
  changes: "success",
  down: "neutral",
};

/** One sentence that says what the status means for the writer. */
export const STATUS_SENTENCE: Readonly<Record<ArticleStatus, string>> = {
  draft: "Only you can see this.",
  review: "The IDEEZA team is reading it. We'll let you know when it's live.",
  needs: "The IDEEZA team asked for changes. See what to fix, then send it again.",
  live: "Anyone can read it on the IDEEZA Blog.",
  changes: "Readers still see the live version until your changes are checked.",
  down: "The IDEEZA team took this off the Blog. Only you can see it.",
};

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

/** A second line under a live article's badge, when there is something to say. */
export function liveNote(a: BlogArticle, draftDiffers: boolean): "Update needs changes" | "Unsent changes" | null {
  const s = statusOf(a);
  if (s !== "live") return null;
  const r = lastReview(a);
  if (r && r.outcome === "changes" && a.live && r.at > a.live.approvedAt) return "Update needs changes";
  return draftDiffers ? "Unsent changes" : null;
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
  if (s === "down" && a.takenDown) return `Taken down ${shortDate(a.takenDown.at)}`;
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

/** One sentence for each, shown with the badge where there is room (tooltip, details). */
export const DISPLAY_SENTENCE: Readonly<Record<DisplayStatus, string>> = {
  featured: "Live on the IDEEZA Blog, and picked by the IDEEZA team.",
  approved: "Approved and live on the IDEEZA Blog.",
  draft: "Only you can see this.",
  resubmitted: "Sent again. The IDEEZA team is reviewing it.",
  removed: "The IDEEZA team removed this from the Blog. Only you can see it.",
  pending: "Waiting for the IDEEZA team to review it.",
  rejected: "The IDEEZA team rejected it. See the reasons, then edit it and publish it again.",
};

export function displayStatusOf(a: BlogArticle): DisplayStatus {
  if (a.takenDown) return "removed";
  if (a.live) return a.submission ? "resubmitted" : a.featured ? "featured" : "approved";
  if (a.submission) return a.submission.kind === "again" ? "resubmitted" : "pending";
  return lastReview(a)?.outcome === "changes" ? "rejected" : "draft";
}

/** The ⋯ menu the Figma draws for each status (L10–L13), plus Copy link, Take offline and
 *  Discard changes where they apply. */
export function menuFor(a: BlogArticle): ArticleAction[] {
  const d = displayStatusOf(a);
  switch (d) {
    case "featured":
    case "approved":
      return ["view", "edit", "change-cover", "copy-link", "take-offline", "delete"];
    case "draft":
      return ["edit", "delete"];
    case "pending":
    case "rejected":
      return ["quick-view", "edit", "change-cover", "delete"];
    case "resubmitted":
      return a.live ? ["view", "quick-view", "edit", "change-cover", "discard-changes", "delete"] : ["quick-view", "edit", "change-cover", "delete"];
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
