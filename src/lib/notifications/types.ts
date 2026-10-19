// The notice model (spec docs/superpowers/specs/2026-10-19-settings-design.md
// §5.6, D7): one shape for everything the bell lists, whatever store it came
// from. Each source in sources.ts derives notices from a store this browser
// already keeps; filter.ts applies the Notification settings; read.ts keeps
// what the bell has marked read. Types only, relative imports.

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
  /** Money received or security: breaks through quiet hours when the settings let it. */
  urgent?: boolean;
  /** Already read where it lives (opened in Messages, seen in the Blog). */
  read?: boolean;
  /** A bid or an offer: its amount in US dollars, or null for a coin with no dollar value. */
  bid?: { usd: number | null };
  /** Decided by the Blog's demo review. */
  demo?: boolean;
  /** A Blog notice: what marks it seen in the Blog's own records. */
  blog?: { key: string; articleId: string; notice: boolean };
}

/** The ten kinds in Figma's order, with Figma's names (D9 for people you follow and teams). */
export const NOTICE_KIND_LABELS: Readonly<Record<NoticeKind, string>> = {
  marketplace: "Marketplace",
  product: "Product",
  coin: "Coin",
  comments: "Comments",
  message: "Message",
  following: "Updates from people you follow",
  teams: "Project teams",
  blog: "Blog",
  policy: "Policy & Community",
  other: "Other Notification",
};
