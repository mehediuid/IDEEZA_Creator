// The shared summary (spec §5.1.3; Phase 2 spec §3.2, §3.6.3, §3.7). One
// derivation of what a project is, so the My projects card and the project
// page's header print the same words (LST-32) and offer the same next step
// (COR-11, §3.5).
//
// Pure: no React, no storage and no clock of its own. The callers pass the
// builds, the project's brief draft (`readBriefDraft` on the list,
// `useProjectBrief` on the page), the marketplace records (`useMarket()`,
// T11) and `now`.
//
// Value imports are relative, like src/lib/spec/*: tsc leaves `@/` as it is
// in its output, and `node --test` loads the compiled module without a
// bundler. Several of the modules imported here import this one back (for
// `formatDate` and the status types); every such use sits inside a function,
// so the cycle never reads a binding while the modules load.

import type { BuildJob, BuildStatus } from "../create/history";
import { LICENSES, type BriefStepId, type Intent } from "../brief/types";
import type { StoredDraft } from "../brief/project-brief";
import type { ListingView, MarketData, Sale } from "../market/types";
import { listingStatusLine, listingViewOf } from "../market/listing";
import type { MintView } from "../wallet/types";
import { mintPhrase, mintViewOf } from "../wallet/mint";
import { stepHref, type ManualProject } from "./projects";
import {
  buildsOf,
  coverOf,
  listingMetadataOf,
  pendingVersionsOf,
  productsOfProject,
  type BuildRef,
} from "./project-read";
import { customersOf, joinSoldLine, soldLineOf, type Customers, type SoldLine } from "./customers";
import { ownedBySegment, ownershipOf } from "./ownership";
import { lockOf } from "./edit-gate";
import { can, type Viewer } from "./permissions";
import type { OwnershipSplit, ProjectLock } from "./p2-types";

// ─────────────────────────── the status ───────────────────────────

/** The glyph a status chip or the Showcase badge carries. The chip component
 *  maps each name to its Hugeicons glyph. The names live here so this module
 *  imports neither React nor the icon package. */
export type IconName = "circle" | "lock" | "hand-heart" | "tag" | "pause" | "badge-check" | "hexagon" | "eye";

/** The status is the outcome (owner decisions O5, O6; Phase 2 spec §3.2). Showcase is not one of them;
 *  the mint is a second axis (MintStatus) and the lock a fact (ProjectLock), not statuses. */
export type ProjectStatus = "draft" | "private" | "given" | "listed" | "paused" | "sold" | "minted";

/** One table. Changing a word here changes the list tab, the card chip and the details chip together. */
export const STATUS_WORD: Record<ProjectStatus, string> = {
  draft: "Draft",
  private: "Private",
  given: "Given",
  listed: "Listed",
  paused: "Paused",
  sold: "Sold",
  minted: "Minted",
};

export const STATUS_ICON: Record<ProjectStatus, IconName> = {
  draft: "circle",
  private: "lock",
  given: "hand-heart",
  listed: "tag",
  paused: "pause",
  sold: "badge-check",
  minted: "hexagon",
};

// v1's LISTED_SUBLINE is retired: a marketplace exists now, and "Listed" means
// a live listing whose own line says how it sells (P2-LISTING-23).

export type ShowcaseBadge = { word: string; icon: IconName; ariaLabel: string };
/** The Showcase badge: its own word and icon, info tone, beside the chip
 *  (LST-65, COR-9). It is not a control; its accessible name is "Showcased". */
export const SHOWCASE_BADGE: ShowcaseBadge = { word: "Showcase", icon: "eye", ariaLabel: "Showcased" };

/** No marketplace record at all — what a caller that hasn't read the market store passes. */
export const EMPTY_MARKET: MarketData = { listings: [], sales: [], bids: [], support: [], unreadable: false };

const NO_LISTING: ListingView = { kind: "none" };

/** The market facts the status reads (§3.2). Both are optional so a v1 caller still compiles;
 *  without them a project is never Listed, Paused or Sold. */
export type StatusFacts = { listing?: ListingView; sales?: readonly Sale[] };

function hasMainSale(projectId: string, sales: readonly Sale[]): boolean {
  return sales.some((s) => s.projectId === projectId && s.item.nft === "main");
}

/**
 * §3.2's one precedence, first match wins:
 * 1. the latest Main listing is live (Buy now, auction running, or ended and not closed) → listed;
 * 2. it is paused → paused;
 * 3. any Main sale exists → sold;
 * 4. minted (`p.mint`, or the draft's `mintedAt`) with intent give → given;
 * 5. minted otherwise (sell, save, only removed or closed listings) → private.
 *    A v1 sell with no listing reads Private (P2-LISTING-24): nothing was ever on a marketplace;
 * 6. `status: "completed"` with no readable mint → minted (unreadable, v1);
 * 7. draft.
 */
export function projectStatus(p: ManualProject, draft: StoredDraft | null, facts: StatusFacts = {}): ProjectStatus {
  const listing = facts.listing ?? NO_LISTING;
  if (listing.kind === "live") return "listed";
  if (listing.kind === "paused") return "paused";
  if (listing.kind === "sold" || hasMainSale(p.id, facts.sales ?? [])) return "sold";
  const minted = p.mint !== undefined || (draft?.state.mintedAt ?? null) !== null;
  if (minted) return draft?.state.intent === "give" ? "given" : "private";
  return p.status === "completed" ? "minted" : "draft"; // "minted" = the record is unreadable (LST-9)
}

/** Showcase, from the project record only (COR-105). Null on a Draft, whatever the record holds. */
export function showcaseOf(p: ManualProject, status: ProjectStatus): { at: number } | null {
  return status !== "draft" && typeof p.showcasedAt === "number" ? { at: p.showcasedAt } : null;
}

// ─────────────────────────── the source ───────────────────────────

export type ProjectSource =
  | { kind: "build"; builds: number } // buildsOf(p).length, at least one job still in this browser
  | { kind: "build-gone" } // refs exist, none in this browser
  | { kind: "hand" };

export function projectSourceOf(refs: BuildRef[]): ProjectSource {
  if (!refs.length) return { kind: "hand" };
  return refs.some((r) => r.job) ? { kind: "build", builds: refs.length } : { kind: "build-gone" };
}

export const BUILD_GONE_TIP =
  "The build this project came from isn't stored in this browser any more. Its products are still listed.";

/** LST-38 / COR-55: the card's meta tag and the rail's Source row, the same words. */
export function sourceTag(source: ProjectSource): { label: string; tip: string | null } {
  switch (source.kind) {
    case "build":
      return { label: "AI build", tip: null };
    case "build-gone":
      return { label: "AI build · not in this browser", tip: BUILD_GONE_TIP };
    case "hand":
      return { label: "By hand", tip: null };
  }
}

// ─────────────────────────── the next step ───────────────────────────

/** The pair's kinds (Phase 2 spec §3.6.3). There is no `open-editor`: Open in editor lives on
 *  the product page (decision 7). There is no `relist` or `view-listing`: an existing listing's
 *  operations live in the rail's Marketplace block (C1, C22). */
export type NextAction =
  | { kind: "review-version"; label: string; href: string } // "Review version 3" → /build/<id>
  | { kind: "continue-brief"; label: "Continue Brief"; href: string }
  | { kind: "add-brief"; label: "Add Brief"; href: string }
  | { kind: "view-brief"; label: "View brief"; href: string }
  | { kind: "add-to-marketplace"; label: "Add to marketplace" | "List another share"; href: string; blocked?: string };

/** The header pair. `card` is what the My projects card shows: `first` when it is the
 *  page's violet step, else null (§2.5 — a card never shows "View …"). */
export type ActionPair = { first: NextAction | null; second: NextAction | null; violet: boolean; card: NextAction | null };

/** A newer build of the project's chat, not saved anywhere yet (COR-18). */
export type PendingVersion = { buildId: string; n: number; status: BuildStatus };

/** §2.2: Add to marketplace on a project whose co-owners hold all of it. */
export const NO_SHARE_TO_SELL = "You hold no share of this project to sell.";

function pairOf(first: NextAction | null, second: NextAction | null, violet: boolean): ActionPair {
  return { first, second, violet, card: violet ? first : null };
}

/** The listing flow's entry (§3.6.3). On the project page the header renders
 *  `slots.actions["add-to-marketplace"]` in the button's place and opens the flow there; the
 *  card links here, and the page reads `?list=1` once on arrival. */
export function listFlowHref(projectId: string): string {
  return `/projects/${projectId}?list=1`;
}

/**
 * The one next-step chooser (§3.5, Phase 2 §2.2 and §3.6.3). The header shows
 * the pair and the card shows `card`, so the two can't differ (COR-11).
 * Showcase never changes it (§3.8). At most one violet.
 *
 * | status | first | second | violet |
 * |---|---|---|---|
 * | draft, a newer version ready | Review version n | — | ✓ |
 * | draft, Brief started | Continue Brief | — | ✓ |
 * | draft, no Brief (a build or by hand) | Add Brief | — | ✓ |
 * | private (never listed, removed, closed with no bids) | Add to marketplace | View brief | ✓ |
 * | private, the maker holds 0 % | Add to marketplace, `blocked` | View brief | — |
 * | given · listed · paused | View brief | — | — |
 * | sold, the maker still holds a share | List another share | View brief | — |
 * | sold in full (locked) | View brief | — | — |
 * | minted, record unreadable | — | — | — |
 *
 * The listing facts are optional so a v1 caller still compiles: without them
 * the maker holds everything and nothing is locked.
 */
export function nextAction(
  p: ManualProject,
  facts: {
    status: ProjectStatus;
    brief: StoredDraft | null;
    source: ProjectSource;
    pending: PendingVersion | null;
    listing?: ListingView;
    /** The maker's own share (`ownership.maker`). */
    creatorPct?: number;
    locked?: boolean;
  },
): ActionPair {
  const briefHref = stepHref(p, "brief");
  const viewBrief: NextAction = { kind: "view-brief", label: "View brief", href: briefHref };
  const creatorPct = facts.creatorPct ?? 100;
  const locked = facts.locked ?? false;

  switch (facts.status) {
    case "minted":
      return pairOf(null, null, false);
    case "draft":
      if (facts.pending?.status === "ready") {
        return pairOf(
          { kind: "review-version", label: `Review version ${facts.pending.n}`, href: `/build/${facts.pending.buildId}` },
          null,
          true,
        );
      }
      if (facts.brief) return pairOf({ kind: "continue-brief", label: "Continue Brief", href: briefHref }, null, true);
      return pairOf({ kind: "add-brief", label: "Add Brief", href: briefHref }, null, true);
    case "private": {
      if (locked) return pairOf(viewBrief, null, false);
      const add: NextAction = { kind: "add-to-marketplace", label: "Add to marketplace", href: listFlowHref(p.id) };
      if (creatorPct <= 0) return pairOf({ ...add, blocked: NO_SHARE_TO_SELL }, viewBrief, false);
      return pairOf(add, viewBrief, true);
    }
    case "sold":
      if (!locked && creatorPct > 0) {
        return pairOf(
          { kind: "add-to-marketplace", label: "List another share", href: listFlowHref(p.id) },
          viewBrief,
          false,
        );
      }
      return pairOf(viewBrief, null, false);
    case "given":
    case "listed":
    case "paused":
      return pairOf(viewBrief, null, false);
  }
}

// ─────────────────────────── the one date formatter ───────────────────────────
// Fixed English, local time. The card, the header and every <time> read it,
// so the two surfaces can't disagree on a date.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function clock(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "Sep 22, 2026" — the header's meta line (COR-10). */
export function formatDate(at: number): string {
  const d = new Date(at);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Sep 22, 2026 · 9:09 PM" — the full form (COM-7, COR-52, COR-107), and every <time>'s title. */
export function formatDateTime(at: number): string {
  return `${formatDate(at)} · ${clock(new Date(at))}`;
}

/** LST-41's short form: the time today, "Sep 22" this year, "Sep 22, 2025" earlier. */
export function formatShortDate(at: number, now: number): string {
  const d = new Date(at);
  const n = new Date(now);
  const sameYear = d.getFullYear() === n.getFullYear();
  if (sameYear && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()) return clock(d);
  return sameYear ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : formatDate(at);
}

// ─────────────────────────── the status line (§3.2) ───────────────────────────

const INTENT_PHRASE: Record<Intent, string> = { sell: "to sell", give: "to give", save: "to keep" };
/** The Brief step the line names. None at the form step (§4.1 row 2), nor at success. */
const STEP_PHRASE: Record<BriefStepId, string | null> = {
  idea: "Idea step",
  preview: "Preview step",
  form: null,
  success: null,
};

/** The part of a VideoJob (components/video-jobs/video-jobs-provider.tsx) this module once read.
 *  The status line's "· preview clip still rendering" is retired (P2-VIDEO-15); the type stays so
 *  a caller passing its jobs still compiles. */
export type ClipJob = { id: string; stage: string };

/** When the mint the phrase names happened: the chain event for an on-chain record (its own
 *  transaction, else the first sale that settled it), the signature for a lazy one, the Brief's
 *  `mintedAt` for a v1 mint. */
export function mintAtOf(mint: MintView, brief: StoredDraft | null): number | null {
  const rec = mint.record;
  if (rec) {
    if (mint.status === "onChain") return rec.onChain?.at ?? mint.settled?.at ?? rec.at;
    return rec.signedAt ?? rec.at;
  }
  return brief?.state.mintedAt ?? null;
}

/** Everything `statusLineOf` reads. The Phase 2 facts are optional: without them the line reads
 *  as it did in v1 for a Draft, a Private and a Given project. */
export type StatusLineFacts = {
  brief: StoredDraft | null;
  showcased: boolean;
  pending: PendingVersion | null;
  now: number;
  mint?: MintView;
  listing?: ListingView;
  customers?: Pick<Customers, "mainSale" | "mainSaleCount" | "soldSharePct">;
  /** Who reads a Sold line: the owner learns who and how much, a visitor only when (§3.2). */
  audience?: "owner" | "visitor";
};

const NO_MINT: MintView = { status: "notMinted", record: null, tokenId: null, settled: null };

/** The Sold line's parts (§3.2): one sale names its percent and buyer, a 100 % sale drops the
 *  percent, several roll up with the last one's short date; a visitor reads "Sold · {date}". */
export function soldPartsOf(
  customers: Pick<Customers, "mainSale" | "mainSaleCount" | "soldSharePct">,
  audience: "owner" | "visitor",
  now: number,
): SoldLine | null {
  const several = audience === "owner" && customers.mainSaleCount > 1;
  return soldLineOf(customers, audience, (at) => (several ? formatShortDate(at, now) : formatDate(at)));
}

/**
 * The status line (§3.2). Its first segment is the mint phrase (`mintPhrase`, T02) on a Private
 * or Given project; a Listed, Paused or Sold project leads with its market fact, which
 * `listingStatusLine` (T03) and `soldLineOf` (T05) word.
 *
 * | status | line |
 * |---|---|
 * | draft | v1: "Version 3 is ready to save" · "Brief in progress · to sell · Preview step" · … |
 * | private | "{mint} · kept private" / "· kept by you" (showcased); removed: "{mint} · removed from the marketplace {d2}"; closed: "{mint} · auction ended with no bids"; a sell never listed: "{mint} · not on the marketplace yet" |
 * | given | "{mint} · given to the community[ under {licence}]" |
 * | listed | "Listed Sep 28, 2026 · Buy now · 0.05 MATIC" · "Auction · top bid 0.04 MATIC · 2h 14m left" · … |
 * | paused | "Paused Sep 28, 2026 · relist it from the Marketplace block" |
 * | sold | "Sold 10% to Mira (demo buyer) · Sep 28, 2026" · "Sold to …" · "Sold 30% in 3 sales · last Sep 28"; a visitor: "Sold · Sep 28, 2026" |
 * | minted | v1: "Minted · the brief record isn't in this browser" |
 */
export function statusLineOf(status: ProjectStatus, f: StatusLineFacts): string {
  const listing = f.listing ?? NO_LISTING;
  switch (status) {
    case "draft": {
      if (f.pending?.status === "ready") return `Version ${f.pending.n} is ready to save`;
      const brief = f.brief;
      if (!brief) return "Not briefed yet";
      const intent = brief.state.intent;
      if (!intent) return "Brief started";
      const step = STEP_PHRASE[brief.step];
      return ["Brief in progress", INTENT_PHRASE[intent], ...(step ? [step] : [])].join(" · ");
    }
    case "minted":
      return "Minted · the brief record isn't in this browser";
    case "listed":
      return listingStatusLine(listing, f.now) ?? STATUS_WORD.listed;
    case "paused":
      return listingStatusLine(listing, f.now) ?? STATUS_WORD.paused;
    case "sold": {
      const parts = f.customers ? soldPartsOf(f.customers, f.audience ?? "owner", f.now) : null;
      return parts ? joinSoldLine(parts) : STATUS_WORD.sold;
    }
    case "given":
    case "private":
      break;
  }

  // A v1 caller passes no MintView: the Brief's own mintedAt is then the v1 ("legacy") mint.
  const given = f.mint ?? NO_MINT;
  const mint: MintView =
    given.status === "notMinted" && (f.brief?.state.mintedAt ?? null) !== null ? { ...given, status: "legacy" } : given;
  const phrase = mintPhrase(mint.status, mintAtOf(mint, f.brief), f.now) ?? "Minted";

  if (status === "given") {
    const license = f.brief?.state.license ?? null;
    const licence = license ? LICENSES.find((l) => l.value === license) : undefined;
    return licence ? `${phrase} · given to the community under ${licence.label}` : `${phrase} · given to the community`;
  }
  if (listing.kind === "ended") {
    if (listing.why === "noBids") return `${phrase} · auction ended with no bids`;
    const removed = listing.listing.events.filter((e) => e.kind === "removed").map((e) => e.at);
    const at = listing.listing.endedAt ?? (removed.length ? Math.max(...removed) : listing.listing.updatedAt);
    return `${phrase} · removed from the marketplace ${formatShortDate(at, f.now)}`;
  }
  if (listing.kind === "none" && f.brief?.state.intent === "sell") return `${phrase} · not on the marketplace yet`;
  return f.showcased ? `${phrase} · kept by you` : `${phrase} · kept private`;
}

// ─────────────────────────── the summary ───────────────────────────

export type ProjectSummary = {
  id: string;
  name: string;
  status: ProjectStatus;
  statusWord: string; // STATUS_WORD[status]
  statusLine: string; // §3.2, as the owner reads it
  showcase: { at: number } | null; // showcaseOf() — the badge and the Showcase tab
  products: { id: string; name: string; description: string }[]; // the current version + products a later version dropped (COR-42)
  productCount: number; // products.length — never a count of builds
  source: ProjectSource;
  next: ActionPair;
  when: { label: "Saved" | "Created"; at: number }; // latest savedAt, else createdAt (COR-10, §7)
  version: { kind: "single"; v: number } | { kind: "builds"; k: number } | null; // "Version 2" | "3 builds" | none
  pendingVersion: PendingVersion | null;
  cover: string | null; // coverOf()
  /** The Brief's v1 mint time; null for a record-only mint (`mint.record` holds that one). */
  mintedAt: number | null;
  sortKey: number; // "Recently updated": updatedAt NOW, lastActivityAt NEXT (LST-24)
  // ── Phase 2 (§3.7): the facts the card and the header share ──
  /** The mint axis (T02 `mintViewOf`). */
  mint: MintView;
  /** The Main listing, derived from the market records (T03 `listingViewOf`). */
  listing: ListingView;
  /** The split, from the contributors and the Main sales (T05 `ownershipOf`). */
  ownership: OwnershipSplit;
  /** Every sale of the project, as rows (T05 `customersOf`, project scope). */
  customers: Customers;
  /** The Sold line's parts for each audience; null unless a Main sale exists. */
  sold: { owner: SoldLine; visitor: SoldLine } | null;
  /** Decision 12: the maker sold everything (T08 `lockOf`). */
  lock: ProjectLock | null;
};

function pendingOf(refs: BuildRef[], all: BuildJob[], projects?: ManualProject[]): PendingVersion | null {
  const waiting = pendingVersionsOf(refs, all, projects);
  const pick = waiting.find((w) => w.status === "ready") ?? waiting[0];
  return pick ? { buildId: pick.job.id, n: pick.version, status: pick.status } : null;
}

/** "Saved" when any build has a save time; otherwise "Created" (a hand-made project, or one a build joined
 *  before save times were recorded — it was created then, and its save time is unknown). */
function whenOf(p: ManualProject, refs: BuildRef[]): ProjectSummary["when"] {
  const saved = refs.map((r) => r.savedAt).filter((t): t is number => typeof t === "number");
  return saved.length ? { label: "Saved", at: Math.max(...saved) } : { label: "Created", at: p.createdAt };
}

/** LST-42 / COR-10: one lineage past version 1 → its version; several lineages → the build count. */
function versionOf(refs: BuildRef[]): ProjectSummary["version"] {
  const lineages = new Set(refs.map((r) => r.chatId));
  if (lineages.size > 1) return { kind: "builds", k: refs.length };
  const top = Math.max(0, ...refs.map((r) => r.version));
  return top > 1 ? { kind: "single", v: top } : null;
}

export function projectSummary(
  p: ManualProject,
  ctx: {
    builds: BuildJob[];
    brief: StoredDraft | null;
    /** Accepted for v1 callers; the status line no longer reads the clip (P2-VIDEO-15). */
    videoJobs: ClipJob[];
    now: number;
    /** The live projects, so a build saved into a deleted one reads as pending (pendingVersionsOf). */
    projects?: ManualProject[];
    /** The marketplace records (`useMarket().data`, T11; T25 passes it on My projects).
     *  Absent → none, so a v1 caller still compiles. */
    market?: MarketData;
  },
): ProjectSummary {
  const market = ctx.market ?? EMPTY_MARKET;
  const refs = buildsOf(p, ctx.builds);
  const rows = productsOfProject(p, refs);
  const listing = listingViewOf(p.id, {
    listings: market.listings,
    sales: market.sales,
    bids: market.bids,
    now: ctx.now,
    current: listingMetadataOf(p, rows, ctx.now),
  });
  const sales = market.sales.filter((s) => s.projectId === p.id);
  const status = projectStatus(p, ctx.brief, { listing, sales });
  const showcase = showcaseOf(p, status);
  const source = projectSourceOf(refs);
  const pendingVersion = pendingOf(refs, ctx.builds, ctx.projects);
  const products = rows.map(({ id, name, description }) => ({ id, name, description }));
  const mint = mintViewOf(p, ctx.brief, sales);
  const customers = customersOf(p, sales);
  const ownership = ownershipOf({
    createdAt: p.createdAt,
    contributors: p.contributors ?? [],
    sales,
    listedPercent: listing.kind === "live" ? listing.listing.percentSelling : 0,
  });
  const lock = lockOf(ownership, sales);
  const soldOwner = soldPartsOf(customers, "owner", ctx.now);
  const soldVisitor = soldPartsOf(customers, "visitor", ctx.now);
  return {
    id: p.id,
    name: p.name,
    status,
    statusWord: STATUS_WORD[status],
    statusLine: statusLineOf(status, {
      brief: ctx.brief,
      showcased: showcase !== null,
      pending: pendingVersion,
      now: ctx.now,
      mint,
      listing,
      customers,
      audience: "owner",
    }),
    showcase,
    products,
    productCount: products.length,
    source,
    next: nextAction(p, {
      status,
      brief: ctx.brief,
      source,
      pending: pendingVersion,
      listing,
      creatorPct: ownership.maker,
      locked: lock !== null,
    }),
    when: whenOf(p, refs),
    version: versionOf(refs),
    pendingVersion,
    cover: coverOf(p, refs),
    mintedAt: ctx.brief?.state.mintedAt ?? null,
    sortKey: p.updatedAt,
    mint,
    listing,
    ownership,
    customers,
    sold: soldOwner && soldVisitor ? { owner: soldOwner, visitor: soldVisitor } : null,
    lock,
  };
}

// ─────────────────────────── what each surface prints ───────────────────────────
// The card renders cardText(), the header renders headerText(). Neither builds
// these strings itself: the LST-32 test compares them.

export function countLabel(n: number): string {
  return `${n} ${n === 1 ? "product" : "products"}`;
}

/** LST-37: "4 products · RC Car Controller, Remote Controller +2". An unnamed
 *  product reads "not named yet", never "Untitled product". */
export function productLine(s: Pick<ProjectSummary, "products">): string {
  const n = s.products.length;
  const names = s.products.slice(0, 2).map((x) => x.name.trim() || "not named yet");
  if (!names.length) return countLabel(n);
  const more = n - names.length;
  return `${countLabel(n)} · ${names.join(", ")}${more > 0 ? ` +${more}` : ""}`;
}

/** "Version 2" · "3 builds" · null. */
export function versionLabel(v: ProjectSummary["version"]): string | null {
  if (!v) return null;
  return v.kind === "single" ? `Version ${v.v}` : `${v.k} builds`;
}

export type TimeText = { text: string; dateTime: string; title: string };
/** One segment of a meta line; the surface joins them with " · " and renders a time part in <time>. */
export type MetaPart = { kind: "text"; text: string } | { kind: "time"; time: TimeText };
export type ChipText = { word: string; icon: IconName; badge: ShowcaseBadge | null; line: string };

export type CardText = {
  chip: ChipText;
  count: string;
  productLine: string; // LST-37
  meta: MetaPart[]; // LST-38 · LST-41 · LST-42: "AI build · Saved 4:12 PM · Version 2"
  metaText: string;
  sourceTip: string | null; // the tooltip on "AI build · not in this browser"
  version: string | null;
  /** LST-40 / §2.5: `next.card`, "{label} for {project}"; null when the pair has no violet step. */
  action: (NextAction & { ariaLabel: string }) | null;
};

/** P2-CONTRIB-10's lead segment: "Created by you · Owned by Ana Silva". The name links to the
 *  Contributors tab (`linkTab`) only when the viewer may see the roster. */
export type OwnedByText = { created: "Created by you" | null; ownedBy: string; linkTab: "contributors" | null };

/** §3.2: the owner's Sold line with the buyer as a link to their Customers row. */
export type SoldBuyerLink = { before: string; label: string; href: string; after: string };

export type HeaderText = {
  chip: ChipText;
  count: string;
  meta: MetaPart[]; // COR-10: "4 products · Version 2 · Saved Sep 26, 2026[ · Stage Prototype]"
  /** The whole meta line as it reads, the ownership lead first. */
  metaText: string;
  version: string | null;
  pair: ActionPair; // COR-11
  // ── Phase 2 (§3.5.10) ──
  /** P2-CONTRIB-10, rendered before `meta`; null unless someone else holds a majority. */
  ownedBy: OwnedByText | null;
  /** P2-TABS-10: "Stage Prototype" (also the last part of `meta`); null without a stage. */
  stage: string | null;
  /** §3.8.5: the owner's lock line under the status line; null when not locked or not the owner. */
  lockLine: string | null;
  /** §3.2: the owner's Sold line in parts, the buyer name a link; null otherwise. */
  soldBuyerLink: SoldBuyerLink | null;
  /** The Explore marketplace header (§2.4): "Created by you · Listed Sep 28, 2026"; null on the project page. */
  createdBy: string | null;
};

/** What the header knows beyond the summary. Every field is optional: a v1 caller reads the owner's header. */
export type HeaderCtx = {
  viewer?: Viewer;
  /** `view.stage` (T08 `currentStage` over the journey). */
  stage?: { short: string } | null;
  /** "market" on `/marketplace/[id]`. */
  context?: "project" | "market";
};

function chipOf(s: ProjectSummary, line = s.statusLine): ChipText {
  return { word: s.statusWord, icon: STATUS_ICON[s.status], badge: s.showcase ? SHOWCASE_BADGE : null, line };
}

function timeOf(s: ProjectSummary, date: string): TimeText {
  return { text: `${s.when.label} ${date}`, dateTime: new Date(s.when.at).toISOString(), title: formatDateTime(s.when.at) };
}

function metaTextOf(parts: MetaPart[]): string {
  return parts.map((m) => (m.kind === "time" ? m.time.text : m.text)).join(" · ");
}

export function cardText(s: ProjectSummary, now: number): CardText {
  const tag = sourceTag(s.source);
  const version = versionLabel(s.version);
  const meta: MetaPart[] = [
    { kind: "text", text: tag.label },
    { kind: "time", time: timeOf(s, formatShortDate(s.when.at, now)) },
  ];
  if (version) meta.push({ kind: "text", text: version });
  return {
    chip: chipOf(s),
    count: countLabel(s.productCount),
    productLine: productLine(s),
    meta,
    metaText: metaTextOf(meta),
    sourceTip: tag.tip,
    version,
    action: s.next.card ? { ...s.next.card, ariaLabel: `${s.next.card.label} for ${s.name}` } : null,
  };
}

const LOCAL_OWNER: Viewer = { kind: "local-owner" };

export function headerText(s: ProjectSummary, ctx: HeaderCtx = {}): HeaderText {
  const viewer = ctx.viewer ?? LOCAL_OWNER;
  const version = versionLabel(s.version);
  const meta: MetaPart[] = [{ kind: "text", text: countLabel(s.productCount) }];
  if (s.source.kind === "hand") meta.push({ kind: "text", text: "Made by hand" });
  else if (version) meta.push({ kind: "text", text: version });
  meta.push({ kind: "time", time: timeOf(s, formatDate(s.when.at)) });
  if (s.source.kind === "build-gone") meta.push({ kind: "text", text: "build not in this browser" });
  const stage = ctx.stage ? `Stage ${ctx.stage.short}` : null;
  if (stage) meta.push({ kind: "text", text: stage });

  const segment = ownedBySegment(s.ownership, viewer);
  const ownedBy: OwnedByText | null = segment
    ? { created: segment.created, ownedBy: segment.ownedBy, linkTab: segment.linked ? "contributors" : null }
    : null;
  const lead = ownedBy ? [...(ownedBy.created ? [ownedBy.created] : []), `Owned by ${ownedBy.ownedBy}`] : [];

  // The Sold line names the buyer to the owner only; everyone else reads "Sold · {date}" (§3.2).
  const seesBuyers = can(viewer, "customers.see");
  const line = s.status === "sold" && s.sold && !seesBuyers ? joinSoldLine(s.sold.visitor) : s.statusLine;
  const buyer = s.status === "sold" && seesBuyers ? (s.sold?.owner.buyer ?? null) : null;
  const soldBuyerLink: SoldBuyerLink | null =
    buyer && s.sold
      ? {
          before: s.sold.owner.before,
          label: buyer.label,
          href: `/projects/${s.id}?tab=customers&sale=${encodeURIComponent(buyer.saleId)}`,
          after: s.sold.owner.after,
        }
      : null;

  const listedAt = s.listing.kind === "none" ? null : s.listing.listing.listedAt;
  return {
    chip: chipOf(s, line),
    count: countLabel(s.productCount),
    meta,
    metaText: [...lead, metaTextOf(meta)].join(" · "),
    version,
    pair: s.next,
    ownedBy,
    stage,
    lockLine: can(viewer, "facts.seeOwnerOnly") && s.lock ? s.lock.line : null,
    soldBuyerLink,
    createdBy:
      ctx.context === "market"
        ? listedAt !== null
          ? `Created by you · Listed ${formatDate(listedAt)}`
          : "Created by you"
        : null,
  };
}

// ─────────────────────────── the list's search and view (B1) ───────────────────────────
// The three names spec §5.1.3 keeps beside the summary. The list state only
// /projects needs — the tabs, the order, the page and the URL codec — is
// src/lib/manual/project-list.ts.

/** Case- and accent-insensitive: NFKD splits "é" into "e" and a combining mark, which is dropped. */
function fold(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Search (LST-13/14): NFKD, drop diacritics, lowercase; every whitespace token must be found in
 * the name, a product name, the description or a product description. `via` names the product
 * the match lies in when the name, the description and the first product don't hold every word
 * and one other product does (LST-14, "the only match").
 */
export function matchProject(
  s: ProjectSummary,
  description: string,
  q: string,
): { hit: boolean; via?: string } {
  const tokens = fold(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return { hit: true };
  const [first, ...rest] = s.products;
  const head = fold([s.name, description, first?.name ?? "", first?.description ?? ""].join("\n"));
  const others = rest.map((x) => ({ name: x.name.trim(), text: fold(`${x.name}\n${x.description}`) }));
  const everything = [head, ...others.map((o) => o.text)].join("\n");
  if (!tokens.every((t) => everything.includes(t))) return { hit: false };
  if (tokens.every((t) => head.includes(t))) return { hit: true };
  const only = others.find((o) => o.name && tokens.every((t) => o.text.includes(t)));
  return only ? { hit: true, via: only.name } : { hit: true };
}

/** List view state in the URL (LST-28): written with `replace`, defaults left out. */
export type ListQuery = {
  tab: "all" | "draft" | "private" | "given" | "listed" | "sold" | "showcase"; // showcase = membership (LST-10)
  q: string;
  sort: "updated" | "newest" | "oldest" | "name";
  source: "any" | "build" | "hand";
  page: number; // 1-based
};
export const PAGE_SIZE = 12;
// e.g. /projects?tab=draft&q=remote&sort=name&source=hand&page=2
