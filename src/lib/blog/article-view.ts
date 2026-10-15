// The blog's details page in words (Figma frames 20–22), pure so each rule is
// tested: which version the page shows, the byline (read time and a bare day-first
// date), what the rail says under the status badge, the reject-reason panel above
// the page (grouped by review), and which "On this page" entry is current.
// Relative imports only (node:test loads these).

import { dayDate } from "./dates";
import { DEMO_REVIEW_LABEL, demoWait } from "./demo-review";
import { REMOVED_FINAL, reasonInfo, thingsLine, uniqueReasons } from "./reasons";
import { DISPLAY_SENTENCE, displayStatusOf, featuredUpdating, lastReview, liveNoteOf, statusOf, updateRejected } from "./status";
import type { ArticleMeta, BlogArticle, ReviewReason, ReviewRound } from "./types";

export type BodyKind = "live" | "doc";

/** What the page shows: readers' version while there is one, the draft otherwise. */
export function readerVersion(a: BlogArticle): { meta: ArticleMeta; body: BodyKind } {
  const s = statusOf(a);
  if ((s === "live" || s === "changes" || s === "down") && a.live) return { meta: a.live, body: "live" };
  return { meta: a.draft, body: "doc" };
}

/** Whether two metas differ in anything a reader would see. */
export function metaDiffers(x: ArticleMeta, y: ArticleMeta): boolean {
  return (
    x.title !== y.title ||
    x.categoryId !== y.categoryId ||
    x.projectId !== y.projectId ||
    x.topics.join("\n") !== y.topics.join("\n") ||
    JSON.stringify(x.cover) !== JSON.stringify(y.cover)
  );
}

/** The byline's date, bare and day first as frames 20–22 draw it: the day it went live, else
 *  the day it was sent, else the last edit. */
export function bylineDate(a: BlogArticle, body: BodyKind): string {
  if (body === "live" && a.live) return dayDate(a.live.approvedAt);
  if (a.submission) return dayDate(a.submission.at);
  return dayDate(a.updatedAt);
}

/** "5 minutes to read" (the Figma's "5 Mintes to Read", the typo fixed). */
export const minRead = (n: number) => `${n} minute${n === 1 ? "" : "s"} to read`;

// ─────────────────────────── the rail's status block ───────────────────────────

export type StatusView = {
  /** One sentence under the badge, from the record. */
  sentence: string;
  /** While the demo check will decide: the Demo review badge and when it decides (D-2). */
  demo: { label: string; wait: string } | null;
  /** The demo's reading-address gap, under a live blog's sentence (D-1). */
  caption: string | null;
  /** "Shared on Medium · 13 Oct 2026", when IDEEZA has shared it (F53). */
  shared: string | null;
};

export const DEMO_LINK_CAPTION = "Demo: readers outside this browser can't open it yet.";

/** The latest round sent back only for being off topic: editing can't fix that. */
function offTopicOnly(r: ReviewRound | null): boolean {
  return !!r && r.reasons.length > 0 && r.reasons.every((x) => x.id === "off-topic");
}

/** What the rail says under the status badge (and Quick view under its badges). `now` dates the
 *  demo's "decides in about a minute"; `reasons` is where the reason panel sits from here. */
export function statusView(a: BlogArticle, draftDiffers: boolean, now: number, reasons: "above" | "below" = "above"): StatusView {
  const d = displayStatusOf(a);
  const note = liveNoteOf(a, draftDiffers);
  const last = lastReview(a);
  let sentence = DISPLAY_SENTENCE[d];
  if (a.takenDown) {
    sentence = `The IDEEZA team removed this from the IDEEZA Blog on ${dayDate(a.takenDown.at)}. Readers can't see it.`;
  } else if (featuredUpdating(a)) {
    sentence = "Still featured. Readers see the published version until the IDEEZA team checks your update.";
  } else if (note?.kind === "update-review") {
    sentence = "Your update is waiting for review. Readers still see the published version.";
  } else if (note?.kind === "update-rejected") {
    sentence = `Your update was rejected. Readers still see the published version. See the reasons ${reasons}.`;
  } else if (note?.kind === "unsent") {
    sentence = "You have changes readers don't see yet. Edit, then Update to send them for review.";
  } else if (d === "rejected") {
    const who = last?.demo ? "The demo check rejected it." : "The IDEEZA team rejected it.";
    sentence = offTopicOnly(last) ? `${who} See the reason ${reasons}.` : `${who} See the reasons ${reasons}, then edit it and publish it again.`;
  }
  return {
    sentence,
    demo: a.submission && !a.takenDown ? { label: DEMO_REVIEW_LABEL, wait: demoWait(a.submission.decideAt, now) } : null,
    caption: a.live && !a.takenDown ? DEMO_LINK_CAPTION : null,
    shared: a.reuse.sharedOn ? `Shared on ${a.reuse.sharedOn.where} · ${dayDate(a.reuse.sharedOn.at)}` : null,
  };
}

/** The rail's sentence alone (statusView's), for callers that show only that. */
export function statusNote(a: BlogArticle, draftDiffers: boolean, now = 0): string {
  return statusView(a, draftDiffers, now).sentence;
}

// ─────────────────────────── the reason panel ───────────────────────────

/** One reason: its title, what the review found (when it said), and how to fix it — or, on a
 *  removed blog, nothing to fix (the panel says why once). */
export type ReasonRow = { title: string; found: string | null; fix: string | null };
export type ReasonGroup = { at: number; date: string; demo: boolean; rows: ReasonRow[] };

export type ReasonPanel = {
  kind: "rejected" | "removed";
  /** The Figma's title (D2), never with a count in it (guard G1). */
  title: "Reject reason" | "Removal reason";
  /** The latest round was the demo check's: the note shows under the title (F19). */
  demo: boolean;
  /** Open while there is something to fix; folded once the blog was sent again (frame 21). */
  open: boolean;
  /** Captions under the title: the count of the latest round, and what the reasons are about. */
  captions: string[];
  /** The newest round, first ("Latest review"). */
  latest: ReasonGroup;
  /** Rounds before it since the blog was last approved, newest first ("Earlier reviews (n)"). */
  earlier: ReasonGroup[];
  /** A removal's final word, once under its rows (D-3). */
  final: string | null;
  /** The reasons are about an update the page doesn't show: link to it (F22). */
  aboutUpdate: boolean;
};

const rowsOf = (reasons: readonly ReviewReason[], removed: boolean): ReasonRow[] => {
  const list = uniqueReasons(reasons);
  return (list.length ? list : [{ id: "", detail: "" }]).map((r) => {
    const info = reasonInfo(r.id);
    return { title: info.title, found: r.detail.trim() || null, fix: removed ? null : info.fix };
  });
};

const groupOf = (r: { at: number; reasons: readonly ReviewReason[]; demo: boolean }, removed: boolean): ReasonGroup => ({
  at: r.at,
  date: dayDate(r.at),
  demo: r.demo,
  rows: rowsOf(r.reasons, removed),
});

/** The panel above the blog's details (Figma frames 21–22): why the IDEEZA team removed it, or
 *  the reasons from each review since the blog was last approved, grouped by review — the
 *  latest first and open, earlier ones folded. Every count covers the latest review only. */
export function reasonPanel(a: BlogArticle): ReasonPanel | null {
  if (a.takenDown) {
    return {
      kind: "removed",
      title: "Removal reason",
      demo: false,
      open: true,
      captions: [],
      latest: groupOf({ at: a.takenDown.at, reasons: a.takenDown.reasons, demo: false }, true),
      earlier: [],
      final: REMOVED_FINAL,
      aboutUpdate: false,
    };
  }
  const rounds: ReviewRound[] = [];
  for (let i = a.reviews.length - 1; i >= 0 && a.reviews[i].outcome === "changes"; i--) rounds.push(a.reviews[i]);
  if (!rounds.length) return null;
  const [latest, ...earlier] = rounds;
  const sentAgain = !!a.submission;
  const aboutUpdate = latest.kind === "changes" && !!a.live;
  const captions: string[] = [];
  captions.push(sentAgain ? "From the last review. You've sent it again." : thingsLine(uniqueReasons(latest.reasons).length || 1));
  if (aboutUpdate && (updateRejected(a) || sentAgain)) {
    captions.push(`About your update, reviewed ${dayDate(latest.at)}. Readers still see the published version below.`);
  }
  return {
    kind: "rejected",
    title: "Reject reason",
    demo: latest.demo,
    open: !sentAgain,
    captions,
    latest: groupOf(latest, false),
    earlier: earlier.map((r) => groupOf(r, false)),
    final: null,
    aboutUpdate,
  };
}

/** Why a blog may be missing here. Blogs live in the browser they were written in (this build
 *  has no server), so another browser or device never has them; say so plainly (F43, D-1). */
export function missingBody(browserHasBlogs: boolean): string {
  return browserHasBlogs
    ? "The link may be wrong, the blog was deleted, or it was written in another browser or on another device."
    : "Blogs in this demo are kept in the browser they were written in, and this browser has none yet.";
}

/** "On this page" earns its place from two headings. */
export const showContents = (count: number) => count >= 2;

/** The current "On this page" entry: the last heading above the reading line, the first
 *  before any has passed, and once the page is scrolled to its end the last heading in view
 *  (a short last section never reaches the line). `tops` are measured from the top of the
 *  scrolling box. */
export function currentHeading(tops: readonly number[], line: number, viewHeight: number, endInView: boolean): number {
  if (!tops.length) return -1;
  const limit = endInView ? viewHeight : line;
  let at = 0;
  tops.forEach((t, i) => {
    if (t <= limit) at = i;
  });
  return at;
}
