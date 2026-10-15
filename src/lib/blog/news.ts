// The Blog's news for the bell and the announcement (D10, D-16, F25): review
// results the writer hasn't opened (Approved, Rejected) and what the IDEEZA team
// did without a review (Featured, Removed), newest first, each in the Figma's
// status words. Counts are the latest round's, repeats dropped. A demo decision
// says it was one. Relative imports only (node:test loads this).

import { unseenNotices, unseenOutcomes } from "./article";
import type { BlogData } from "./types";

export type BlogNewsKind = "approved" | "rejected" | "featured" | "removed";

export type BlogNews = {
  /** Stable per event, so an announcement is made once. */
  key: string;
  id: string;
  kind: BlogNewsKind;
  title: string;
  at: number;
  /** About a live blog's update, not the blog itself. */
  update: boolean;
  reasons: number;
  /** Decided by the demo check. */
  demo: boolean;
  /** Featured or Removed: opening it is kept in notice-seen.ts, not the record. */
  notice: boolean;
};

export function blogNews(data: BlogData, seenNotices: ReadonlySet<string>): BlogNews[] {
  const out: BlogNews[] = [];
  for (const o of unseenOutcomes(data)) {
    out.push({
      key: `review:${o.id}:${o.at}`,
      id: o.id,
      kind: o.outcome === "changes" ? "rejected" : "approved",
      title: o.title,
      at: o.at,
      update: o.kind === "changes",
      reasons: o.things,
      demo: o.demo,
      notice: false,
    });
  }
  for (const n of unseenNotices(data, seenNotices)) {
    out.push({ key: n.key, id: n.id, kind: n.kind, title: n.title, at: n.at, update: false, reasons: n.reasons, demo: false, notice: true });
  }
  return out.sort((x, y) => y.at - x.at);
}

const KICKER: Record<BlogNewsKind, string> = {
  approved: "Blog · Approved",
  rejected: "Blog · Rejected",
  featured: "Blog · Featured",
  removed: "Blog · Removed",
};

/** The bell item's first line, in sentence case. */
export const newsKicker = (n: BlogNews) => KICKER[n.kind];

const reasonsLine = (n: number) => (n ? ` · ${n} reason${n === 1 ? "" : "s"}` : "");

/** The bell item's message. */
export function newsMessage(n: BlogNews): string {
  const t = `“${n.title}”`;
  switch (n.kind) {
    case "rejected":
      return n.update
        ? `Your update to ${t} was rejected${reasonsLine(n.reasons)}. Readers still see the published version.`
        : `${t} was rejected${reasonsLine(n.reasons)}`;
    case "approved":
      return n.update ? `Your update to ${t} is approved and live` : `${t} is approved and live on the IDEEZA Blog`;
    case "featured":
      return `${t} was featured on the IDEEZA Blog`;
    case "removed":
      return `${t} was removed from the IDEEZA Blog${reasonsLine(n.reasons)}`;
  }
}

/** What is spoken (and shown) once when a result arrives. */
export function newsAnnouncement(n: BlogNews): string {
  return `${n.demo ? "Demo review: " : ""}${newsMessage(n)}`;
}
