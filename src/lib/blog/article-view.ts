// The article page's words and choices (spec § Screens 4), pure so each rule is
// tested: which version the page shows, the byline's date, the status card's
// line, its reasons and earlier rounds, which actions are buttons (the rest sit
// in the ⋯, never both), and which "On this page" entry is current. Relative
// imports only (node:test loads these).

import { headingsOf, textOf } from "./doc";
import { reasonInfo } from "./reasons";
import { actionsFor, liveNote, longDate, openReasons, STATUS_SENTENCE, statusOf, type ArticleAction, type ArticleStatus } from "./status";
import type { ArticleMeta, BlogArticle, BlogDoc, ReviewReason, ReviewRound } from "./types";

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

/** The card's one line. A live article with something waiting says that first. */
export function statusLine(a: BlogArticle, draftDiffers: boolean): { lead: string | null; text: string } {
  const note = liveNote(a, draftDiffers);
  if (note === "Update needs changes") return { lead: "Update needs changes.", text: "Readers still see the live version. See what to change below." };
  if (note === "Unsent changes") return { lead: "Unsent changes.", text: "Readers see the live version until you send your changes for review." };
  return { lead: null, text: STATUS_SENTENCE[statusOf(a)] };
}

export type ReasonLine = { title: string; detail: string };

const reasonLines = (reasons: readonly ReviewReason[]): ReasonLine[] =>
  reasons.map((r) => ({ title: reasonInfo(r.id).title, detail: r.detail.trim() || reasonInfo(r.id).fix }));

export type CardReasons = { title: string; at: number; demo: boolean; lines: ReasonLine[] };

/** The reasons the card shows: why it was taken down, or what the latest review asked for. */
export function cardReasons(a: BlogArticle): CardReasons | null {
  if (statusOf(a) === "down" && a.takenDown) {
    return { title: `Why it was taken down (${longDate(a.takenDown.at)})`, at: a.takenDown.at, demo: false, lines: reasonLines(a.takenDown.reasons) };
  }
  const r = openReasons(a);
  if (!r) return null;
  return { title: `What to change (reviewed ${longDate(r.at)})`, at: r.at, demo: r.demo, lines: reasonLines(r.reasons) };
}

export type EarlierRound = { at: number; date: string; outcome: string; demo: boolean; lines: ReasonLine[] };

/** Every round the card doesn't already show, newest first. */
export function earlierReviews(a: BlogArticle): EarlierRound[] {
  const shown = statusOf(a) === "down" ? null : openReasons(a);
  return a.reviews
    .filter((r) => r !== shown)
    .reverse()
    .map((r: ReviewRound) => ({
      at: r.at,
      date: longDate(r.at),
      outcome:
        r.outcome === "approved"
          ? r.kind === "changes"
            ? "Changes approved"
            : "Approved, went live"
          : `Sent back: ${r.reasons.length} thing${r.reasons.length === 1 ? "" : "s"} to fix`,
      demo: r.demo,
      lines: reasonLines(r.reasons),
    }));
}

/** A button on the card: one of the shared actions, or the link into the editor. */
export type CardButton = Extract<ArticleAction, "copy-link" | "edit" | "discard-changes"> | "continue" | "fix";

/** The card's buttons, and the shared actions its ⋯ leaves out because a button has them. */
export function cardActions(s: ArticleStatus): { buttons: CardButton[]; omit: ArticleAction[] } {
  switch (s) {
    case "live":
      return { buttons: ["copy-link", "edit"], omit: ["copy-link", "edit"] };
    case "changes":
      return { buttons: ["discard-changes"], omit: ["discard-changes"] };
    case "review":
      return { buttons: ["edit"], omit: ["edit"] };
    case "needs":
      return { buttons: ["fix"], omit: [] };
    case "draft":
      return { buttons: ["continue"], omit: [] };
    case "down":
      return { buttons: [], omit: [] };
  }
}

/** The ⋯ rows left once the buttons have taken theirs. */
export function cardMenu(s: ArticleStatus): ArticleAction[] {
  const { omit } = cardActions(s);
  return actionsFor(s).filter((a) => !omit.includes(a));
}

/** "On this page" earns its place from two headings. */
export const showContents = (count: number) => count >= 2;

/** The anchor of each top-level heading the contents lists, by its index in the body. */
export function headingAnchors(doc: BlogDoc): Map<number, string> {
  const list = headingsOf(doc);
  const out = new Map<number, string>();
  let next = 0;
  doc.content.forEach((n, i) => {
    if (n.type !== "heading" || !textOf(n.content).trim()) return;
    const h = list[next++];
    if (h) out.set(i, h.anchor);
  });
  return out;
}

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
