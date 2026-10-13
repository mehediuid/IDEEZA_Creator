// The people in the demo (spec §3): who a PersonId is, the role tag others see,
// the Acting as choices, and the context card's line. Read live from what the
// app already stores, with a conversation's name snapshot as the fallback.
// Pure, relative imports.

import { DEMO_BUYERS } from "../wallet/identities";
import { formatDate } from "../manual/project-summary";
import { ME, type ContextRef, type MessagesData, type Participant, type PersonId, type Subject } from "./types";

export const MAKER_NAME = "You (maker)";

export type PersonKind = "maker" | "buyer" | "team" | "creator";

export type Person = { id: PersonId; name: string; initials: string; kind: PersonKind };

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

export function kindOf(id: PersonId): PersonKind {
  if (id === ME) return "maker";
  if (id.startsWith("buyer-")) return "buyer";
  if (id.startsWith(FEED_PREFIX)) return "creator";
  return "team";
}

/** Who `id` is, from the live sources, else a conversation's snapshot, else "Someone". */
export function personOf(id: PersonId, src: PeopleSources, snapshots: readonly Participant[] = []): Person {
  const kind = kindOf(id);
  let name: string | undefined;
  if (kind === "maker") name = MAKER_NAME;
  else if (kind === "buyer") name = DEMO_BUYERS.find((b) => b.id === id)?.name;
  else if (kind === "creator") name = src.creators.find((c) => feedPersonId(c.id) === id)?.name;
  else for (const t of src.teams) name ??= t.members.find((m) => m.id === id)?.name;
  name ??= snapshots.find((p) => p.id === id)?.name ?? "Someone";
  return { id, name, initials: initialsOfName(name), kind };
}

/** The tag beside a name: Creator · Customer · Buyer · Team · Editor. */
export function roleTagOf(
  id: PersonId,
  subject: Subject,
  ctx: { sales: readonly { projectId: string; buyerId: string }[]; teams: readonly TeamSource[] },
): string {
  const kind = kindOf(id);
  if (kind === "maker" || kind === "creator") return "Creator";
  if (kind === "buyer") {
    const bought = subject.kind === "project" && ctx.sales.some((s) => s.projectId === subject.projectId && s.buyerId === id);
    return bought ? "Customer" : "Buyer";
  }
  const team = ctx.teams.find((t) => subject.kind === "project" && t.projectId === subject.projectId);
  const role = team?.members.find((m) => m.id === id)?.role;
  return role ? `Team · ${role}` : "Team";
}

export type ActingChoice = { id: PersonId; label: string; group: "You" | "Demo buyers" | "Team members" | "Innovations creators" };

/** The Acting as list: you, the demo buyers, every team member, and every creator someone has written to. */
export function actingChoices(src: PeopleSources, data: MessagesData): ActingChoice[] {
  const out: ActingChoice[] = [{ id: ME, label: MAKER_NAME, group: "You" }];
  for (const b of DEMO_BUYERS) out.push({ id: b.id, label: `${b.name} (demo buyer)`, group: "Demo buyers" });
  const seen = new Set<string>();
  for (const t of src.teams) {
    for (const m of t.members) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({ id: m.id, label: `${m.name} (team · ${t.projectName})`, group: "Team members" });
    }
  }
  const creators = new Set<string>();
  for (const c of data.conversations) for (const p of c.participants) if (kindOf(p.id) === "creator") creators.add(p.id);
  for (const id of creators) out.push({ id, label: `${personOf(id, src, data.conversations.flatMap((c) => c.participants)).name} (Innovations creator)`, group: "Innovations creators" });
  return out;
}

type SaleLike = {
  id: string;
  at: number;
  item: { nft: "main"; sharePct: number } | { nft: "physical" | "virtual"; productName: string };
};

const KIND_WORD = { physical: "Physical", virtual: "Virtual" } as const;

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
