// The notice model (spec docs/superpowers/specs/2026-10-19-settings-design.md
// §5.6, D7): one shape for everything the bell lists, whatever store it came
// from. Each source in sources.ts derives notices from a store this browser
// already keeps; filter.ts applies the Notification settings; popups.ts says
// when one pops up; read.ts keeps what the bell has marked read. Relative
// imports only.

import type { NoticeKind } from "../settings/prefs";

export type { NoticeKind };

export interface Notice {
  /** Stable per event, so its read state outlives a reload ("sale:<id>", "msg:<conversation>:<at>"). */
  id: string;
  kind: NoticeKind;
  /** The small line over the title ("Ready to review", "Blog · Approved"). */
  tag: string;
  title: string;
  body?: string;
  /** Where the notice leads: its place in the app. */
  href: string;
  /** When it happened (epoch ms); its order in the bell and its day in a summary. */
  at: number;
  /** The project it is about, which "Mute this project" mutes. */
  projectId?: string;
  /** A sale (money received): counts and pops up in quiet hours when "Let sales through" is on. */
  urgent?: boolean;
  /** Already read where it lives (opened in Messages, seen in the Blog). */
  read?: boolean;
  /** A bid: its amount in US dollars at the demo rate (lib/account/payout.ts), null when unreadable. */
  bid?: { usd: number | null };
  /** Decided by the Blog's demo review. */
  demo?: boolean;
  /** A Blog notice: what marks it seen in the Blog's own records. */
  blog?: { key: string; articleId: string; notice: boolean };
}

/** The kinds Settings › Notifications shows, in its order. Follow, Policy and Other stay in the
 *  settings record (older records keep parsing) but nothing sends them, so they aren't shown. */
export const SHOWN_KINDS = ["marketplace", "product", "coin", "message", "comments", "teams", "blog"] as const;
export type ShownKind = (typeof SHOWN_KINDS)[number];

export const KIND_LABELS: Readonly<Record<ShownKind, string>> = {
  marketplace: "Sales and bids",
  product: "Builds and videos",
  coin: "Credits and plan",
  message: "Messages and requests",
  comments: "Comments and replies",
  teams: "Team conversations",
  blog: "Blog reviews",
};
