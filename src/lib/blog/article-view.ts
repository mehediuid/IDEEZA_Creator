// The blog's details page in words (Figma frames 20–22), pure so each rule is
// tested: which version the page shows, the byline's date, the line under the
// rail's status badge, the reject-reason panel above the page, and which "On
// this page" entry is current. Relative imports only (node:test loads these).

import { reasonInfo } from "./reasons";
import { DISPLAY_SENTENCE, displayStatusOf, liveNote, longDate, statusOf } from "./status";
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

/** The byline's date: the day it went live, or when the draft was sent or last edited. */
export function bylineDate(a: BlogArticle, body: BodyKind): string {
  if (body === "live" && a.live) return longDate(a.live.approvedAt);
  if (a.submission) return `Sent ${longDate(a.submission.at)}`;
  return `Edited ${longDate(a.updatedAt)}`;
}

export const minRead = (n: number) => `${n} min read`;

/** The line under the rail's status badge. A live blog with something waiting says that instead. */
export function statusNote(a: BlogArticle, draftDiffers: boolean): string {
  const note = liveNote(a, draftDiffers);
  if (note === "Update needs changes") return "Your update was rejected. Readers still see the published version. See the reasons above.";
  if (note === "Unsent changes") return "You have changes readers don't see yet. Edit, then Update to send them for review.";
  return DISPLAY_SENTENCE[displayStatusOf(a)];
}

export type ReasonRow = { title: string; detail: string; at: number; date: string };
export type ReasonPanel = { title: string; demo: boolean; open: boolean; rows: ReasonRow[] };

const rowsOf = (reasons: readonly ReviewReason[], at: number): ReasonRow[] => {
  const list = reasons.length ? reasons : [{ id: "", detail: "" }];
  return list.map((r) => ({ title: reasonInfo(r.id).title, detail: r.detail.trim() || reasonInfo(r.id).fix, at, date: longDate(at) }));
};

/** The panel above the blog's details (Figma frames 21–22): why the IDEEZA team removed it, or
 *  every reason it gave since the blog was last approved, newest first, each with its date. Open
 *  while there is something to fix; folded once the blog has been sent again. */
export function reasonPanel(a: BlogArticle): ReasonPanel | null {
  if (a.takenDown) return { title: "Removal reason", demo: false, open: true, rows: rowsOf(a.takenDown.reasons, a.takenDown.at) };
  const rounds: ReviewRound[] = [];
  for (let i = a.reviews.length - 1; i >= 0 && a.reviews[i].outcome === "changes"; i--) rounds.push(a.reviews[i]);
  if (!rounds.length) return null;
  return {
    title: "Reject reason",
    demo: rounds.some((r) => r.demo),
    open: !a.submission,
    rows: rounds.flatMap((r) => rowsOf(r.reasons, r.at)),
  };
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
