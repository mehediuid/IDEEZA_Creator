// The people in the demo (spec §3): who a PersonId is, how they stand to the
// project a conversation is about, the Acting as choices, and the context
// card's line. Every user is a creator (owner, 2026-10-13): nobody is shown as
// a kind of person, only by what they did with this project, from the
// reader's side. Read live from what the app already stores, with a
// conversation's name snapshot as the fallback. Pure, relative imports.

import { DEMO_BUYERS } from "../wallet/identities";
import { formatDate } from "../manual/project-summary";
import { subjectNameOf } from "./rules";
import { ME, type ContextRef, type MessagesData, type Participant, type PersonId, type Subject } from "./types";

/** The browser's own account, as everyone sees it. */
export const MAKER_NAME = "You";

/** Where an id comes from, for finding its name. Never shown: every person is a creator. */
export type PersonSource = "you" | "demo" | "team" | "feed";

export type Person = { id: PersonId; name: string; initials: string; source: PersonSource };

export type TeamSource = { projectId: string; projectName: string; members: { id: string; name: string; role: string }[] };

export type PeopleSources = {
  teams: readonly TeamSource[];
  /** Innovations creators, by their feed id (without the "feed:" prefix). */
  creators: readonly { id: string; name: string }[];
};

export const FEED_PREFIX = "feed:";

export function feedPersonId(creatorId: string): PersonId {
  return `${FEED_PREFIX}${creatorId}`;
}

export function initialsOfName(name: string): string {
  const words = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words.length === 1 ? words[0][0] : words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function sourceOf(id: PersonId): PersonSource {
  if (id === ME) return "you";
  if (id.startsWith("buyer-")) return "demo";
  if (id.startsWith(FEED_PREFIX)) return "feed";
  return "team";
}

/** Who `id` is, from the live sources, else a conversation's snapshot, else "Someone". */
export function personOf(id: PersonId, src: PeopleSources, snapshots: readonly Participant[] = []): Person {
  const source = sourceOf(id);
  let name: string | undefined;
  if (source === "you") name = MAKER_NAME;
  else if (source === "demo") name = DEMO_BUYERS.find((b) => b.id === id)?.name;
  else if (source === "feed") name = src.creators.find((c) => feedPersonId(c.id) === id)?.name;
  else for (const t of src.teams) name ??= t.members.find((m) => m.id === id)?.name;
  name ??= snapshots.find((p) => p.id === id)?.name ?? "Someone";
  return { id, name, initials: initialsOfName(name), source };
}

type SaleItemLike = { nft: "main"; sharePct: number } | { nft: "physical" | "virtual"; productName: string };
type SaleLike = { id: string; at: number; item: SaleItemLike };
type RelationSale = { projectId: string; buyerId: string; at: number; item: SaleItemLike };

export type RelationCtx = {
  sales: readonly RelationSale[];
  teams: readonly TeamSource[];
  /** Who made the subject: you for a project in this browser, the creator for a post. */
  ownerOf: (subject: Subject) => PersonId | null;
};

/** How someone stands to a conversation's subject: `short` for the list row (after the
 *  subject's name), `long` for the conversation's header. Null where it would say nothing. */
export type Relation = { short: string | null; long: string | null };

const KIND_WORD = { physical: "Physical", virtual: "Virtual" } as const;

/**
 * Seen by `viewer`, what `other` did with `subject`, the first that holds: made it, works on
 * it, holds a share, owns copies, asked about your listing (`askedListing`, header only).
 */
export function relationOf(
  viewer: PersonId,
  other: PersonId,
  subject: Subject,
  ctx: RelationCtx,
  o: { askedListing?: boolean } = {},
): Relation {
  const name = subjectNameOf(subject);
  const owner = ctx.ownerOf(subject);
  if (owner === other) {
    return subject.kind === "post"
      ? { short: "their post", long: `Posted ${name}` }
      : { short: "their project", long: `Made ${name}` };
  }
  if (subject.kind !== "project") return { short: null, long: null };
  const role = ctx.teams.find((t) => t.projectId === subject.projectId)?.members.find((m) => m.id === other)?.role;
  if (role) return { short: role, long: `${role} on ${name}` };
  const theirs = ctx.sales.filter((s) => s.projectId === subject.projectId && s.buyerId === other);
  const share = theirs.reduce((sum, s) => sum + (s.item.nft === "main" ? s.item.sharePct : 0), 0);
  if (share > 0) return { short: `holds ${share}%`, long: `Holds ${share}% of ${name}` };
  const copies = theirs.filter((s) => s.item.nft !== "main").sort((a, b) => b.at - a.at);
  if (copies.length === 1) {
    const item = copies[0].item as { nft: "physical" | "virtual"; productName: string };
    return { short: "owns a copy", long: `Owns a ${KIND_WORD[item.nft]} copy of ${item.productName}` };
  }
  if (copies.length > 1) return { short: `owns ${copies.length} copies`, long: `Owns ${copies.length} copies from ${name}` };
  if (o.askedListing && owner === viewer) return { short: null, long: "Asked about your listing" };
  return { short: null, long: null };
}

/** Whose side a subject is on for `viewer`: their own project or post, or someone else's. */
export function sideOf(subject: Subject, viewer: PersonId, ownerOf: (subject: Subject) => PersonId | null): "mine" | "theirs" {
  return ownerOf(subject) === viewer ? "mine" : "theirs";
}

/** `label` is the Acting as row; `who` names them in the acting line ("Mira (demo creator)"). */
export type ActingChoice = {
  id: PersonId;
  label: string;
  who: string;
  group: "You" | "Demo creators" | "Team members" | "Innovations creators";
};

/** The Acting as list: you, the demo creators, every team member, and every Innovations creator someone has written to. */
export function actingChoices(src: PeopleSources, data: MessagesData): ActingChoice[] {
  const out: ActingChoice[] = [{ id: ME, label: MAKER_NAME, who: MAKER_NAME, group: "You" }];
  for (const b of DEMO_BUYERS) out.push({ id: b.id, label: b.name, who: `${b.name} (demo creator)`, group: "Demo creators" });
  const seen = new Set<string>();
  for (const t of src.teams) {
    for (const m of t.members) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({ id: m.id, label: `${m.name} · ${t.projectName} team`, who: `${m.name} (${t.projectName} team)`, group: "Team members" });
    }
  }
  const creators = new Set<string>();
  for (const c of data.conversations) for (const p of c.participants) if (sourceOf(p.id) === "feed") creators.add(p.id);
  const snapshots = data.conversations.flatMap((c) => c.participants);
  for (const id of creators) {
    const name = personOf(id, src, snapshots).name;
    out.push({ id, label: `${name} · from Innovations`, who: `${name} (from Innovations)`, group: "Innovations creators" });
  }
  return out;
}

/** The context card's second line. */
export function contextLineOf(c: ContextRef | null, info: { sale?: SaleLike | null; teamRole?: string | null } = {}): string {
  if (!c) return "";
  if (c.kind === "listing") return "Asked about the listing";
  if (c.kind === "post") return "Innovations post";
  if (c.kind === "team") return info.teamRole ? `Team · ${info.teamRole}` : "Team conversation";
  const s = info.sale;
  if (!s) return "Purchase";
  const bought = `bought ${formatDate(s.at)}`;
  return s.item.nft === "main"
    ? `Main NFT · ${s.item.sharePct}% share · ${bought}`
    : `${KIND_WORD[s.item.nft]} copy of ${s.item.productName} · ${bought}`;
}

/** A context entry in the timeline: "About: Physical copy of Smart Lamp · bought Oct 12, 2026". */
export function contextSentenceOf(c: ContextRef, info: { sale?: SaleLike | null; teamRole?: string | null } = {}): string {
  if (c.kind === "listing") return "About the listing";
  if (c.kind === "post") return "About the Innovations post";
  if (c.kind === "team") return info.teamRole ? `About the team · ${info.teamRole}` : "About the team";
  return `About: ${contextLineOf(c, info)}`;
}
