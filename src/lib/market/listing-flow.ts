// The listing flow's pure half (Phase 2 spec §3.9, LISTING P2-LISTING-2…16
// as changed in §4.5). What the "Add to marketplace" form opens with, the ONE
// wallet request each commit makes, the rail Marketplace block's facts for
// every listing state, and what the page's live region says. The components
// in src/components/projects/listing/ render these and own the writes;
// nothing here reads storage or the clock.
//
// Pure, relative imports only.

import { estimateGas } from "../brief/gas";
import { NETWORKS, TOKENS_BY_NETWORK, type BriefState, type Network } from "../brief/types";
import { benefitDurationText } from "../manual/customers";
import { formatDate, formatDateTime, type MetaPart } from "../manual/project-summary";
import { shortAddress } from "../wallet/demo-wallet";
import { buyerLabel } from "../wallet/identities";
import { formatAmount } from "../wallet/money";
import type { Charge, MintStatus, MintType, SummaryRow, WalletRequest } from "../wallet/types";
import { auctionStateOf, bidsOf, timeLeftLabel, type SettleResult } from "./auction";
import { feePercentText, payoutOf } from "./fee";
import { listingInputFromBrief, listingInputFromListing, sellingSteps, type ListingInput } from "./listing-form";
import type { Bid, Listing, ListingView, UtilityBenefit } from "./types";

// ─────────────────────────── the form's opening values ───────────────────────────

/** The header's "Add to marketplace" / "List another share": focus returns here after Remove. */
export const LISTING_TRIGGER_ID = "add-to-marketplace-trigger";
/** The rail Marketplace block's first control: focus lands here after a listing is written. */
export const MARKETPLACE_FOCUS_ID = "marketplace-first-control";

export const DEMO_LINE = "Testnet demo — nothing is listed on a real blockchain.";
export const VIDEOS_READY_LINE = "Videos · every product is ready ✓";
export const LOCKED_HELP = "Set when it was minted.";
export const COLLECTION_UNKNOWN = "This mint's collection isn't known, so it can't be listed. Check it in the Brief.";
export const STORAGE_FULL = "This browser's storage is full — the listing wasn't saved.";
export const MARKET_UNREADABLE = "This browser's marketplace records couldn't be read, so nothing was changed.";

/** What the mint fixed (P2-LISTING-4 C): the record's chain and collection, else a legacy
 *  (v1) mint's draft values. */
export function lockedTermsOf(
  record: { network: Network; collection: string } | null,
  draft: Pick<BriefState, "network" | "collection"> | null,
): { network: Network | null; collection: string } {
  if (record) return { network: record.network, collection: record.collection };
  return { network: draft?.network ?? null, collection: draft?.collection.trim() ?? "" };
}

/** A token already on chain is listed as on chain: its later edits cost gas. */
export function listedMintingType(current: MintStatus, chosen: MintType): MintType {
  return current === "onChain" ? "instant" : chosen;
}

function defaultPercent(creatorPct: number): number | null {
  if (creatorPct <= 0) return null;
  return creatorPct < 10 ? creatorPct : 10;
}

/**
 * What "Add to marketplace" / "List another share" opens with:
 * - after a removed, closed or sold listing, its last terms (P2-LISTING-15);
 * - a v1 Sell that never listed, its Brief's terms (P2-LISTING-24 C, C13);
 * - otherwise the defaults (P2-LISTING-4): Buy now, the chain's first token, 10 %.
 * Blockchain and Collection are the mint's. The ownership box is always
 * unticked: an Add asks for it again. A past auction end, a token the chain
 * doesn't have and a share above the maker's own are dropped to the default.
 */
export function addInputOf(f: {
  listing: ListingView;
  record: { network: Network; collection: string } | null;
  mintStatus: MintStatus;
  draft: BriefState | null;
  creatorPct: number;
  now: number;
}): ListingInput {
  const { network, collection } = lockedTermsOf(f.record, f.draft);
  const tokens = network ? TOKENS_BY_NETWORK[network] : [];
  const last = f.listing.kind === "ended" || f.listing.kind === "sold" ? f.listing.listing : null;
  const fromBrief = !last && f.listing.kind === "none" && f.draft?.intent === "sell" ? listingInputFromBrief(f.draft) : null;
  const base: ListingInput = last
    ? listingInputFromListing(last)
    : (fromBrief ?? {
        network,
        collection,
        type: "buyNow",
        mintingType: "lazy",
        token: tokens[0] ?? null,
        price: "",
        minBid: "",
        auctionBuyNow: "",
        endsAt: "",
        percentSelling: defaultPercent(f.creatorPct),
        royalties: f.draft?.royalties.trim() || "10",
        benefits: [],
        confirmOwner: false,
      });
  const steps = sellingSteps(f.creatorPct).filter((s) => !s.disabled);
  const pctOk = base.percentSelling !== null && steps.some((s) => s.value === base.percentSelling);
  const ends = base.endsAt ? new Date(base.endsAt).getTime() : NaN;
  return {
    ...base,
    network,
    collection,
    mintingType: listedMintingType(f.mintStatus, last ? "lazy" : base.mintingType),
    token: base.token && tokens.includes(base.token) ? base.token : (tokens[0] ?? null),
    percentSelling: pctOk ? base.percentSelling : defaultPercent(f.creatorPct),
    endsAt: Number.isFinite(ends) && ends > f.now ? base.endsAt : "",
    confirmOwner: false,
  };
}

// ─────────────────────────── the one request per commit (§3.9) ───────────────────────────

function networkLabel(n: Network): string {
  return NETWORKS.find((x) => x.value === n)?.label ?? n;
}

/** One network fee on `network`: what changing an on-chain listing costs. */
export function gasChargeOf(network: Network): Charge {
  const gas = estimateGas(network);
  return { network, lines: [{ coin: gas.native, amount: String(gas.fee) }] };
}

type Terms = Pick<ListingInput, "type" | "token" | "price" | "minBid" | "auctionBuyNow" | "percentSelling">;

function termsRows(t: Terms, endsAt: number | null): SummaryRow[] {
  const token = t.token ?? "ETH";
  const rows: SummaryRow[] =
    t.type === "buyNow"
      ? [{ label: "Listing", value: `Buy now · ${formatAmount(t.price, token)}` }]
      : [{ label: "Listing", value: `Auction · minimum bid ${formatAmount(t.minBid, token)}` }];
  if (t.type === "auction" && t.auctionBuyNow.trim()) {
    rows.push({ label: "Buy now price", value: formatAmount(t.auctionBuyNow, token) });
  }
  if (t.type === "auction" && endsAt !== null) rows.push({ label: "Ends", value: formatDateTime(endsAt) });
  rows.push({ label: "Selling percentage", value: `${t.percentSelling ?? 0}% of the project` });
  return rows;
}

/**
 * Add's one request (§3.9 "Listing · Add"). `mintRequest` is `useMint().plan()`'s:
 * - none (lazy minted and staying lazy, or already on chain): a free
 *   signature, "Sign the listing — no fee";
 * - a new lazy mint: its signature, retitled "Sign to mint and list — no fee";
 * - a new instant mint, or an upgrade: its transaction (4 IDZ + gas), with the
 *   listing's terms added to the summary.
 */
export function listRequestOf(f: {
  projectName: string;
  network: Network;
  collection: string;
  tokenId: number;
  input: Terms;
  endsAt: number | null;
  mintRequest: WalletRequest | null;
}): WalletRequest {
  const terms = termsRows(f.input, f.endsAt);
  const m = f.mintRequest;
  if (!m) {
    return {
      kind: "signature",
      purpose: "list",
      identity: "maker",
      network: f.network,
      title: "Sign the listing — no fee",
      summary: [
        { label: "Project", value: f.projectName },
        ...terms,
        { label: "Collection", value: `${f.collection} · token #${f.tokenId}` },
        { label: "Network", value: networkLabel(f.network) },
      ],
      note: "You're signing the listing's terms. Nothing is charged.",
      doneLine: `${f.projectName} is listed on Explore marketplace.`,
    };
  }
  const summary = [...m.summary, ...terms];
  if (m.purpose === "lazyMint") {
    return {
      ...m,
      title: "Sign to mint and list — no fee",
      summary,
      doneLine: `Token #${f.tokenId} is reserved, and ${f.projectName} is listed on Explore marketplace.`,
    };
  }
  return {
    ...m,
    title: m.purpose === "upgradeMint" ? m.title : `Mint ${f.projectName} on chain and list it`,
    summary,
    doneLine: `Minted on chain, and ${f.projectName} is listed on Explore marketplace.`,
  };
}

/** Edit's one request (P2-LISTING-7): a free signature for a lazy listing, the network fee for an on-chain one. */
export function editRequestOf(l: Listing, projectName: string, next: Terms & { royalties: string; benefits: UtilityBenefit[] }): WalletRequest {
  const onChain = l.mintingType === "instant";
  const token = next.token ?? l.token;
  const was = l.price ? formatAmount(l.price, l.token) : "—";
  const now = formatAmount(next.price, token);
  const summary: SummaryRow[] = [
    { label: "Project", value: projectName },
    { label: "Price", value: was === now ? now : `${was} → ${now}` },
    { label: "Selling percentage", value: `${next.percentSelling ?? l.percentSelling}% of the project` },
    { label: "Royalties", value: `${Number(next.royalties) || 0}% on resales` },
  ];
  if (next.benefits.length) summary.push({ label: "Holder benefits", value: next.benefits.map((b) => b.name.trim()).join(", ") });
  const base = { purpose: "editListing" as const, identity: "maker" as const, network: l.network, summary, doneLine: "Listing updated." };
  return onChain
    ? {
        ...base,
        kind: "transaction",
        title: "Update the on-chain listing",
        note: "Changing an on-chain listing costs a network fee.",
        charge: gasChargeOf(l.network),
      }
    : { ...base, kind: "signature", title: "Sign the listing change — no fee", note: "You're signing the new terms. Nothing is charged." };
}

/** Relist's one request (P2-LISTING-14): the metadata buyers will see is signed again. */
export function relistRequestOf(l: Listing, projectName: string, changed: string[]): WalletRequest {
  const onChain = l.mintingType === "instant";
  const summary: SummaryRow[] = [
    { label: "Project", value: projectName },
    { label: "Listing", value: termsLineOf(l) },
    { label: "NFT metadata", value: changed.length ? `updates now: ${changed.join(", ")}` : "unchanged" },
  ];
  const base = { purpose: "relist" as const, identity: "maker" as const, network: l.network, summary, doneLine: "Back on the marketplace." };
  return onChain
    ? {
        ...base,
        kind: "transaction",
        title: "Relist on chain",
        note: "Updating on-chain metadata costs a network fee.",
        charge: gasChargeOf(l.network),
      }
    : { ...base, kind: "signature", title: "Sign to relist — no fee", note: "You're signing the updated metadata. Nothing is charged." };
}

/** Remove's request (P2-LISTING-9): only an on-chain listing needs one (the network fee); a lazy one has none. */
export function removeRequestOf(l: Listing, projectName: string): WalletRequest | null {
  if (l.mintingType !== "instant") return null;
  return {
    kind: "transaction",
    purpose: "removeListing",
    identity: "maker",
    network: l.network,
    title: "Remove the on-chain listing",
    summary: [
      { label: "Project", value: projectName },
      { label: "Listing", value: termsLineOf(l) },
    ],
    note: "Removing an on-chain listing costs a network fee (test tokens — no real cost).",
    doneLine: "Removed from the marketplace.",
    charge: gasChargeOf(l.network),
  };
}

// ─────────────────────────── what the page says ───────────────────────────

/** "Listed on the marketplace · 0.05 MATIC · Buy now" / "Auction started · ends Oct 3, 2026 · 2:30 PM" (P2-LISTING-6). */
export function listedAnnouncement(l: Listing): string {
  if (l.type === "auction") return `Auction started · ends ${formatDateTime(l.endsAt ?? l.listedAt)}`;
  return `Listed on the marketplace · ${formatAmount(l.price ?? "0", l.token)} · Buy now`;
}

/** "Listing updated · 0.06 MATIC" (P2-LISTING-7). */
export function updatedAnnouncement(l: Listing): string {
  return `Listing updated · ${formatAmount(l.price ?? "0", l.token)}`;
}

export const REMOVED_ANNOUNCEMENT = "Removed from the marketplace";
export const RELISTED_ANNOUNCEMENT = "Back on the marketplace";

/** "0.05 MATIC · Buy now · 10%" / "0.02 MATIC minimum bid · Auction · 100%". */
export function termsLineOf(l: Listing): string {
  if (l.type === "auction") return `${formatAmount(l.minBid ?? "0", l.token)} minimum bid · Auction · ${l.percentSelling}%`;
  return `${formatAmount(l.price ?? "0", l.token)} · Buy now · ${l.percentSelling}%`;
}

// ─────────────────────────── the rail Marketplace block (P2-LISTING-2 C) ───────────────────────────

export type CardFact = { label: string; value: MetaPart[] };
export type PillTone = "success" | "warning" | "neutral";

export type MarketplaceCard =
  | { kind: "none"; lines: [string, string] }
  | { kind: "ended"; lead: string; when: string; terms: string }
  | { kind: "buyNow"; state: string; facts: CardFact[] }
  | {
      kind: "auction";
      state: string;
      pill: { text: string; tone: PillTone };
      facts: CardFact[];
      /** Close is the page's ★ once the auction has ended; before, this says when it can be closed. */
      closeReady: boolean;
      closeHint: string | null;
      bids: number;
      fixedNote: string;
    }
  | { kind: "paused"; since: MetaPart[]; changed: string; terms: string }
  | { kind: "sold"; state: MetaPart[]; facts: CardFact[] };

const text = (t: string): MetaPart => ({ kind: "text", text: t });
function time(t: string, at: number): MetaPart {
  return { kind: "time", time: { text: t, dateTime: new Date(at).toISOString(), title: formatDateTime(at) } };
}
const fact = (label: string, ...value: MetaPart[]): CardFact => ({ label, value });

/** "Lazy — minted on chain when it first sells" / "Instant — minted on chain". */
export function mintingLineOf(l: Listing): string {
  return l.mintingType === "instant" ? "Instant — minted on chain" : "Lazy — minted on chain when it first sells";
}

function bidsWord(n: number): string {
  return n === 1 ? "1 bid" : `${n} bids`;
}

/** The block's card for each listing view (P2-LISTING-2 C, -8, -10, -14, -15, -16). `bids`
 *  and `now` feed the auction's pill; it follows the page's minute clock. */
export function marketplaceCardOf(view: ListingView, ctx: { bids: Bid[]; now: number }): MarketplaceCard {
  switch (view.kind) {
    case "none":
      return {
        kind: "none",
        lines: [
          "Not on the marketplace yet.",
          "Add it from the button at the top of the page — it stays yours until someone buys it.",
        ],
      };
    case "ended": {
      const l = view.listing;
      const when =
        view.why === "removed"
          ? `Removed on ${formatDate(l.endedAt ?? l.updatedAt)}.`
          : `The auction ended on ${formatDate(l.endsAt ?? l.endedAt ?? l.updatedAt)}${view.unpaid ? " — no bid could be paid" : " with no bids"}.`;
      return { kind: "ended", lead: "Not on the marketplace.", when, terms: `Your last terms: ${termsLineOf(l)}.` };
    }
    case "live": {
      const l = view.listing;
      const since = fact("On the marketplace", text("since "), time(formatDateTime(l.listedAt), l.listedAt));
      const common = [
        fact("Selling percentage", text(`${l.percentSelling}%`)),
        fact("Royalties", text(`${l.royaltiesPct}% on resales`)),
        fact("Minting", text(mintingLineOf(l))),
      ];
      if (l.type === "buyNow") {
        const price = l.price ?? "0";
        return {
          kind: "buyNow",
          state: "Listed · Buy now",
          facts: [
            fact("Price", text(formatAmount(price, l.token))),
            fact("You receive", text(`${formatAmount(payoutOf(price), l.token)} per sale`)),
            ...common,
            since,
          ],
        };
      }
      const a = auctionStateOf(l, ctx.bids, ctx.now);
      const count = bidsOf(l.id, ctx.bids).length;
      const endsAt = l.endsAt ?? l.listedAt;
      const facts: CardFact[] = [fact("Minimum bid", text(formatAmount(l.minBid ?? "0", l.token)))];
      if (l.auctionBuyNow) facts.push(fact("Buy now price", text(formatAmount(l.auctionBuyNow, l.token))));
      facts.push(
        fact("Top bid", text(a.top ? `${formatAmount(a.top.amount, l.token)} · ${bidsWord(count)}` : "No bids yet")),
        fact("You receive", text(`the winning bid minus ${feePercentText()}`)),
        ...common,
        fact("Ends", time(formatDateTime(endsAt), endsAt)),
      );
      const ended = a.phase === "ended";
      return {
        kind: "auction",
        state: "Listed · Auction",
        pill: ended
          ? { text: "Ended", tone: "neutral" }
          : { text: timeLeftLabel(a.msLeft), tone: a.phase === "endingSoon" ? "warning" : "success" },
        facts,
        closeReady: ended,
        closeHint: ended ? null : `You can close it once it ends on ${formatDateTime(endsAt)}.`,
        bids: count,
        fixedNote: "An auction can't be changed once it starts.",
      };
    }
    case "paused": {
      const l = view.listing;
      const at = l.pause?.at ?? l.updatedAt;
      const lead = "Buyers can't see or buy it while it's paused.";
      return {
        kind: "paused",
        since: [text("Paused · since "), time(formatDateTime(at), at)],
        changed: view.changed.length ? `${lead} You changed: ${view.changed.join(", ")}.` : lead,
        terms: `Price ${formatAmount(l.price ?? "0", l.token)} · Selling percentage ${l.percentSelling}%`,
      };
    }
    case "sold": {
      const s = view.sale;
      const share = s.item.nft === "main" ? s.item.sharePct : view.listing.percentSelling;
      return {
        kind: "sold",
        state: [text("Sold · "), time(formatDateTime(s.at), s.at)],
        facts: [
          fact("Buyer", text(`${buyerLabel(s.buyerId)} · ${shortAddress(s.buyerAddress)}`)),
          fact("Price", text(`${formatAmount(s.price, s.token)} · ${s.via === "auctionWin" ? "winning bid" : "Buy now"}`)),
          fact("IDEEZA fee", text(`${feePercentText(s.fees.ideezaBps)} · ${formatAmount(s.fees.ideeza, s.token)}`)),
          fact("You received", text(formatAmount(s.payout, s.token))),
          fact("Selling percentage", text(`${share}% of the project`)),
          fact("Royalties", text(`${s.royaltiesPct}% on resales`)),
          fact("Transfer date", time(formatDate(s.at), s.at)),
        ],
      };
    }
  }
}

// ─────────────────────────── Bidding History and Close (P2-LISTING-11, -12) ───────────────────────────

/** "Bidding History (3)" · "Bidding History". */
export function biddingHistoryLabel(n: number): string {
  return n > 0 ? `Bidding History (${n})` : "Bidding History";
}

export type BidRow = { id: string; bid: string; bidder: string; at: number; time: string; date: string; clock: string };

/** The table's rows, highest (so newest) first: a bid must beat the one before it. `date` and
 *  `clock` are `time`'s two halves ("Sep 28, 2026" · "9:09 PM"), for a row that wraps. */
export function bidRowsOf(l: Listing, bids: Bid[]): BidRow[] {
  return bidsOf(l.id, bids).map((b) => {
    const date = formatDate(b.at);
    const time = formatDateTime(b.at);
    return {
      id: b.id,
      bid: formatAmount(b.amount, b.token),
      bidder: buyerLabel(b.bidderId),
      at: b.at,
      time,
      date,
      clock: time.slice(date.length + " · ".length),
    };
  });
}

export type CloseCopy = { title: string; body: string; skipped: string | null; confirm: string };

/** The Close dialog's words for `settleWithWallets`' answer. A higher bid a wallet can't pay is
 *  skipped, and the body says so (P2-LISTING-12, P2-MARKETPLACE-17). */
export function closeCopyOf(result: SettleResult, l: Listing, bids: Bid[]): CloseCopy {
  const ordered = bidsOf(l.id, bids);
  if (result.kind === "sale") {
    const skipped = ordered.slice(0, ordered.findIndex((b) => b.id === result.bid.id));
    return {
      title: "Close the auction?",
      body: `${buyerLabel(result.bid.bidderId)} wins with ${formatAmount(result.bid.amount, l.token)}. The sale is recorded and they appear in Customers.`,
      skipped: skipped.length
        ? `${skipped.length === 1 ? "A higher bid is" : `${skipped.length} higher bids are`} skipped: ${skipped
            .map((b) => `${buyerLabel(b.bidderId)}, ${formatAmount(b.amount, l.token)}`)
            .join("; ")} — the demo wallet can't pay it now.`
        : null,
      confirm: "Close and sell",
    };
  }
  return {
    title: "Close the auction?",
    body: ordered.length
      ? "No bid can be paid — the bidders' demo wallets don't cover them. The auction ends and the project comes off the marketplace."
      : "No one bid. The auction ends and the project comes off the marketplace.",
    skipped: null,
    confirm: "Close auction",
  };
}

/** What the live region says once Close has written. */
export function closedAnnouncement(result: SettleResult, l: Listing): string {
  if (result.kind === "sale") {
    return `Auction closed · sold to ${buyerLabel(result.bid.bidderId)} for ${formatAmount(result.bid.amount, l.token)}`;
  }
  return result.kind === "noBids" && result.unpaid ? "Auction closed — no bid could be paid" : "Auction closed with no bids";
}

// ─────────────────────────── the Utility NFT pill (P2-CUSTOMERS-17) ───────────────────────────

/** The live or sold Main listing's benefits, when it has any; else null (no pill). */
export function utilityBenefitsOf(view: ListingView): UtilityBenefit[] | null {
  if (view.kind !== "live" && view.kind !== "sold") return null;
  return view.listing.benefits.length ? view.listing.benefits : null;
}

/** "Exclusive group · 12 months" · "Premium subscription · For as long as they hold it". */
export function benefitLineOf(b: UtilityBenefit): string {
  return `${b.name} · ${benefitDurationText(b.duration)}`;
}

export function utilityPillCopy(owner: boolean): { lead: string; note: string } {
  return owner
    ? { lead: "Buyers of this NFT get:", note: "IDEEZA records these with every sale. Giving buyers access is up to you for now." }
    : { lead: "Owning this NFT gives you:", note: "Benefits start on the day you buy." };
}

// ─────────────────────────── holder benefits in the form (P2-CUSTOMERS-16) ───────────────────────────

export const BENEFITS_MAX = 5;
export const BENEFIT_NAME_MAX = 40;
export type BenefitDurationKey = "1" | "3" | "6" | "12" | "held";
export const BENEFIT_DURATIONS: { value: BenefitDurationKey; label: string }[] = [
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
  { value: "held", label: "For as long as they hold it" },
];

export function durationKeyOf(d: UtilityBenefit["duration"]): BenefitDurationKey {
  return "whileHeld" in d ? "held" : (String(d.months) as BenefitDurationKey);
}

export function durationOf(key: BenefitDurationKey): UtilityBenefit["duration"] {
  return key === "held" ? { whileHeld: true } : { months: Number(key) as 1 | 3 | 6 | 12 };
}

/** The benefits as they are stored: names trimmed (the form keeps what was typed). */
export function cleanBenefits(list: UtilityBenefit[]): UtilityBenefit[] {
  return list.slice(0, BENEFITS_MAX).map((b) => ({ ...b, name: b.name.trim().slice(0, BENEFIT_NAME_MAX) }));
}

// ─────────────────────────── the sale an auction's close writes ───────────────────────────

/** The share a Main sale of `l` passes on. */
export function saleShareOf(l: Listing): { nft: "main"; sharePct: number } {
  return { nft: "main", sharePct: l.percentSelling };
}
