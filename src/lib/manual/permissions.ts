// Permissions — the one place a control asks whether the viewer may act
// (PPL-1; Phase 2 spec §3.8, complete). No control checks ownership inline:
// the page renders from (project, viewer), and `can()` answers.
//
// Four viewer kinds, one role each (C7):
// - local-owner: the maker in this browser — role owner;
// - owner-preview: the maker previewing as a buyer (?view=buyer) — role visitor;
// - contributor-preview: the maker previewing as one contributor
//   (?view=contributor&as=<id>) — role member. A preview never writes;
// - demo-buyer: a demo buyer on /marketplace/* — role buyer.
//
// Every Phase 2 action is declared here, so no later task edits this file.
// A control that hides for any non-owner asks `can()`; code that only needs
// "is this a preview" uses `isPreview()` (buyer-preview.ts).
//
// Imports are relative, so node:test loads the compiled module.

import type { AuctionPhase, ListingView } from "../market/types";
import type { DemoBuyerId, MintStatus } from "../wallet/types";
import type { ContributorRole, DeleteFacts, OtherOwner } from "./p2-types";
import { formatDate, type ProjectStatus } from "./project-summary";

// ─────────────────────────── who is looking (§3.8.1) ───────────────────────────

export type Viewer =
  | { kind: "local-owner" } // role owner
  | { kind: "owner-preview" } // ?view=buyer — role visitor
  | { kind: "contributor-preview"; contributorId: string; name: string; role: ContributorRole; share: number } // role member
  | { kind: "demo-buyer"; buyerId: DemoBuyerId }; // /marketplace/* — role buyer

/** What an answer may depend on besides who asks. Every `can()` on the page passes `view.canCtx` (T10). */
export type CanContext = {
  status?: ProjectStatus;
  mint?: MintStatus;
  listing?: ListingView["kind"];
  auction?: AuctionPhase;
  creatorPct?: number;
  listingLive?: boolean;
  holding?: boolean;
  locked?: boolean;
};

export type Role = "owner" | "visitor" | "member" | "buyer";

const ROLE_OF: Record<Viewer["kind"], Role> = {
  "local-owner": "owner",
  "owner-preview": "visitor",
  "contributor-preview": "member",
  "demo-buyer": "buyer",
};

export function roleOf(viewer: Viewer): Role {
  return ROLE_OF[viewer.kind];
}

// ─────────────────────────── actions and grants (§3.8.2) ───────────────────────────

/** Every action a control can ask about. The NOT_YET ones are declared so their controls call can() from day one. */
export const ACTIONS = [
  "project.rename",
  "project.editDescription",
  "project.delete",
  "project.brief",
  "project.showcase",
  "product.add",
  "product.edit",
  "product.openEditor",
  "network.manage",
  "app.manage",
  "activity.write",
  "video.generate",
  "mint.run",
  "mint.changeWallet",
  "listing.create",
  "listing.manage",
  "listing.seePublic",
  "listing.buy",
  "listing.bid",
  "purchase.seeSummary",
  "creator.support",
  "deliverables.download",
  "facts.seeOwnerOnly", // Outcome, Built in, Stored, part changes
  "preview.enter",
  "customers.see",
  "people.seeTeam",
  "people.seeRoster",
  "ownership.see",
  "people.invite",
  "people.manage",
  "editions.manage",
  "businessPlan.manage",
  "legal.edit",
  "activity.seeListedMarker",
  // NOT_YET
  "ownership.listShare",
  "project.report",
  "share.newsfeed",
  "premiumParts.manage",
] as const;
export type Action = (typeof ACTIONS)[number];

/** Nobody has these yet: each needs something that doesn't exist (a share market,
 *  reports, a newsfeed, premium parts), and a `true` would put a control on the page
 *  over invented data (PPL-3). */
const NOT_YET: ReadonlySet<Action> = new Set<Action>([
  "ownership.listShare",
  "project.report",
  "share.newsfeed",
  "premiumParts.manage",
]);

/** A visitor (Preview as buyer) sees the public listing and the team credit, nothing else. */
const VISITOR: ReadonlySet<Action> = new Set<Action>(["listing.seePublic", "people.seeTeam"]);

/** A contributor preview: reads only, whatever the role (a preview never writes). */
const MEMBER: ReadonlySet<Action> = new Set<Action>([
  "people.seeTeam",
  "people.seeRoster",
  "ownership.see",
  "deliverables.download",
]);
/** The member roles that also see the public listing (§3.8.2: editor, coOwner). */
const MEMBER_SEES_LISTING: ReadonlySet<ContributorRole> = new Set<ContributorRole>(["editor", "coOwner"]);

/** A demo buyer on Explore marketplace. `NEEDS` adds the listing and holding facts. */
const BUYER: ReadonlySet<Action> = new Set<Action>([
  "listing.seePublic",
  "listing.buy",
  "listing.bid",
  "purchase.seeSummary",
  "creator.support",
  "deliverables.download",
  "people.seeTeam",
]);

/** The maker may do everything except a buyer's own acts (and the NOT_YET list). */
const OWNER_NEVER: ReadonlySet<Action> = new Set<Action>([
  "listing.buy",
  "listing.bid",
  "purchase.seeSummary",
  "creator.support",
]);

/** Per viewer, what it may do before the project's state is asked. */
const GRANTS: Record<Role, (action: Action, viewer: Viewer) => boolean> = {
  owner: (action) => !OWNER_NEVER.has(action),
  visitor: (action) => VISITOR.has(action),
  member: (action, viewer) =>
    MEMBER.has(action) ||
    (action === "listing.seePublic" &&
      viewer.kind === "contributor-preview" &&
      MEMBER_SEES_LISTING.has(viewer.role)),
  buyer: (action) => BUYER.has(action),
};

/**
 * The lock (decision 12, §3.8.5): after a 100 % sale these are refused. View brief,
 * Showcase, Preview and every read stay; delete stays blocked by the "sold" rule.
 */
const LOCKED: ReadonlySet<Action> = new Set<Action>([
  "project.rename",
  "project.editDescription",
  "product.add",
  "product.edit",
  "product.openEditor",
  "network.manage",
  "app.manage",
  "activity.write",
  "video.generate",
  "mint.run",
  "mint.changeWallet",
  "listing.create",
  "people.invite",
  "people.manage",
  "editions.manage",
  "businessPlan.manage",
  "legal.edit",
]);

const CREATE_FROM_STATUS: ReadonlySet<ProjectStatus> = new Set<ProjectStatus>(["private", "sold"]);
const CREATE_FROM_LISTING: ReadonlySet<ListingView["kind"]> = new Set<ListingView["kind"]>(["none", "ended", "sold"]);
const MANAGE_LISTING: ReadonlySet<ListingView["kind"]> = new Set<ListingView["kind"]>(["live", "paused"]);
const BIDDING: ReadonlySet<AuctionPhase> = new Set<AuctionPhase>(["running", "endingSoon"]);

/** Actions whose answer also depends on the project's state. An unset fact never satisfies a need. */
const NEEDS: Partial<Record<Action, (ctx: CanContext, role: Role) => boolean>> = {
  // COR-105, X41: only a minted project can be showcased — never a Draft, and
  // never when the caller didn't say which state the project is in.
  "project.showcase": (ctx) => ctx.status !== undefined && ctx.status !== "draft",
  "mint.changeWallet": (ctx) => ctx.mint === "lazyMinted",
  "listing.create": (ctx) =>
    ctx.status !== undefined &&
    CREATE_FROM_STATUS.has(ctx.status) &&
    ctx.listing !== undefined &&
    CREATE_FROM_LISTING.has(ctx.listing) &&
    typeof ctx.creatorPct === "number" &&
    ctx.creatorPct > 0,
  "listing.manage": (ctx) => ctx.listing !== undefined && MANAGE_LISTING.has(ctx.listing),
  "listing.buy": (ctx) => ctx.listingLive === true,
  "listing.bid": (ctx) => ctx.listingLive === true && ctx.auction !== undefined && BIDDING.has(ctx.auction),
  "purchase.seeSummary": (ctx) => ctx.holding === true,
  "creator.support": (ctx) => ctx.holding === true,
  // The firmware and every download come after purchase (O12, P2-MARKETPLACE-21).
  "deliverables.download": (ctx, role) => role !== "buyer" || ctx.holding === true,
};

export function can(viewer: Viewer, action: Action, ctx: CanContext = {}): boolean {
  if (NOT_YET.has(action)) return false;
  const role = roleOf(viewer);
  if (!GRANTS[role](action, viewer)) return false;
  if (ctx.locked === true && LOCKED.has(action)) return false;
  const need = NEEDS[action];
  return need ? need(ctx, role) : true;
}

/** Is there an audience at all? Gates Preview as buyer (PPL-9, §7 X26): false only for a
 *  Private project that isn't showcased — nobody but the maker will ever see that page. */
export function hasAudience(status: ProjectStatus, showcase: { at: number } | null): boolean {
  return !(status === "private" && showcase === null);
}

// ─────────────────────────── the delete gate (§3.8.4) ───────────────────────────

export type DeleteBlockId = "marketUnreadable" | "sold" | "auction" | "listed" | "otherOwners";
export type DeleteBlock = {
  id: DeleteBlockId;
  reason: string;
  /** The way out. */
  detail: string;
  /** otherOwners only: the quiet link under the detail, which selects the Contributors tab. */
  link?: { label: "Open Contributors"; tab: "contributors" };
};

/** 10 → "10%", 12.5 → "12.5%", float noise dropped. */
function pct(n: number): string {
  return `${Math.round(n * 100) / 100}%`;
}

function soldDetail(sold: DeleteFacts["sold"]): string {
  const share = sold.sharePct > 0;
  const nfts = sold.editions > 0;
  if (share && nfts) return `Buyers own ${pct(sold.sharePct)} of it and hold ${sold.editions} of its NFTs.`;
  if (nfts) return sold.editions === 1 ? "A buyer holds 1 of its NFTs." : `Buyers hold ${sold.editions} of its NFTs.`;
  return (sold.buyers ?? 1) > 1 ? `Buyers own ${pct(sold.sharePct)} of it.` : `A buyer owns ${pct(sold.sharePct)} of it.`;
}

/**
 * The co-owner detail of the delete gate (P2-CONTRIB-14): the co-owners holding more
 * than 0 %, in the order given, or null when there are none. `otherOwnersDetail`
 * (ownership.ts, T05) reads this, so the copy has one home.
 * - one: "Ana Silva holds 30%. Change their role or remove them in Contributors first."
 * - two: "Ana Silva and Kofi Mensah hold 40% between them. Change their roles or remove them in Contributors first."
 * - more: "Ana Silva and 2 others hold 45% between them. Change their roles or remove them in Contributors first."
 */
export function coOwnersDetail(others: readonly OtherOwner[]): string | null {
  const held = others.filter((o) => o.percent > 0);
  if (!held.length) return null;
  const [first, second] = held;
  if (held.length === 1) {
    return `${first.name} holds ${pct(first.percent)}. Change their role or remove them in Contributors first.`;
  }
  const total = pct(held.reduce((sum, o) => sum + o.percent, 0));
  const who = held.length === 2 ? `${first.name} and ${second.name}` : `${first.name} and ${held.length - 1} others`;
  return `${who} hold ${total} between them. Change their roles or remove them in Contributors first.`;
}

const OPEN_CONTRIBUTORS = { label: "Open Contributors", tab: "contributors" } as const;

type DeleteRule = {
  id: DeleteBlockId;
  applies: (f: DeleteFacts) => boolean;
  block: (f: DeleteFacts) => Omit<DeleteBlock, "id">;
};

/** First match wins: marketUnreadable → sold → auction → listed → otherOwners (C6). */
const DELETE_RULES: readonly DeleteRule[] = [
  {
    // An unreadable purchase record must not allow an irreversible delete (CUSTOMERS C12, extended).
    id: "marketUnreadable",
    applies: (f) => f.marketUnreadable,
    block: () => ({
      reason: "This project can't be deleted right now.",
      detail: "This browser's marketplace records couldn't be read, so we can't tell whether it's listed or sold.",
    }),
  },
  {
    id: "sold",
    applies: (f) => f.sold.sharePct > 0 || f.sold.editions > 0,
    block: (f) => ({ reason: "A sold project can't be deleted.", detail: soldDetail(f.sold) }),
  },
  {
    id: "auction",
    applies: (f) => f.auction !== null,
    block: (f) => ({
      reason: "A project in an auction can't be deleted.",
      detail: f.auction!.ended
        ? `The auction ended on ${formatDate(f.auction!.endsAt)} — close it in the Marketplace block first.`
        : `Close the auction after it ends on ${formatDate(f.auction!.endsAt)}, in the Marketplace block.`,
    }),
  },
  {
    id: "listed",
    applies: (f) => f.listed || (f.editionsListed ?? 0) > 0,
    block: (f) => ({
      reason: "A listed project can't be deleted.",
      detail: f.listed
        ? "Remove the listing first — it's in the Marketplace block."
        : "Take its NFTs off the marketplace first — Remove listing is on each product's page.",
    }),
  },
  {
    id: "otherOwners",
    applies: (f) => coOwnersDetail(f.otherOwners) !== null,
    block: (f) => ({
      reason: "Someone else owns part of this project, so it can't be deleted.",
      detail: coOwnersDetail(f.otherOwners)!,
      link: OPEN_CONTRIBUTORS,
    }),
  },
];

/**
 * Why Delete is blocked, or `null` (COR-67). A block keeps the control where it
 * is — `aria-disabled`, focusable, with `reason` and `detail` beside it and
 * named by `aria-describedby` — and pressing it opens nothing. A project with
 * only removed or closed listings is deletable.
 */
export function deleteBlockOf(facts: DeleteFacts): DeleteBlock | null {
  const rule = DELETE_RULES.find((r) => r.applies(facts));
  return rule ? { id: rule.id, ...rule.block(facts) } : null;
}
