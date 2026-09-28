// The "Add to marketplace" form's pure model (Phase 2 spec §3.5.4, LISTING
// §2.B). One `ListingFields` component (T22) renders this for both the page
// and the Brief's Sell step (P2-LISTING-22), so the field order, the copy
// and the validation can't drift between them.
//
// Pure, relative imports only.

import type { BriefState, ListingType, Network, Token } from "../brief/types";
import { ROYALTY_MAX, ROYALTY_MIN } from "../brief/types";
import type { MintType, SummaryRow } from "../wallet/types";
import { formatAmount, toMicros } from "../wallet/money";
import { FEE_LABEL, feePercentText, ideezaFeeOf, payoutOf } from "./fee";
import type { Listing, UtilityBenefit } from "./types";

export const AUCTION_MIN_MS = 5 * 60_000;
export const AUCTION_MAX_MS = 30 * 86_400_000;

export type ListingInput = {
  network: Network | null;
  collection: string;
  type: ListingType;
  mintingType: MintType;
  token: Token | null;
  price: string;
  minBid: string;
  auctionBuyNow: string;
  /** A `datetime-local` value, e.g. "2026-10-03T14:30". */
  endsAt: string;
  percentSelling: number | null;
  royalties: string;
  benefits: UtilityBenefit[];
  confirmOwner: boolean;
};

export type ListingCtx = {
  mode: "brief" | "add" | "edit";
  now: number;
  creatorPct: number;
  original?: Listing;
};

type FieldKey = keyof ListingInput;

/** Digits and at most one dot, at most 6 decimals — the same shape
 *  `wallet/money.ts#toMicros` accepts, kept local so a bad value here reads
 *  as its OWN reason ("more than 6 decimals") rather than the generic
 *  "no price" one that a plain `toMicros(...) === null` can't tell apart. */
function amountShape(raw: string): "empty" | "malformed" | "tooLong" | "ok" {
  const t = raw.trim();
  if (!t) return "empty";
  const m = /^(\d*)(?:\.(\d*))?$/.exec(t);
  if (!m) return "malformed";
  const whole = m[1] ?? "";
  const frac = m[2] ?? "";
  if (!whole && !frac) return "empty";
  if (frac.length > 6) return "tooLong";
  return "ok";
}

type Problem = { field: FieldKey | null; message: string };

/** LISTING-5's table, one rule set for the page and the Brief. The first
 *  problem, read top-down, is the CTA's reason; a field's own message sits
 *  under it. Two of the table's rows aren't computed here, on purpose:
 *  "you hold no share to sell" (`creatorPct === 0`) is a gate on the button
 *  that opens this form, not a field in it; and "no wallet connected" needs
 *  the wallet's live connection state, which this pure `ListingCtx` doesn't
 *  carry — the wallet step (T13) owns that check at submit time. */
export function listingProblems(
  i: ListingInput,
  c: ListingCtx,
): { first: string | null; fields: Partial<Record<FieldKey, string>> } {
  const problems: Problem[] = [];
  const note = (field: FieldKey | null, message: string) => problems.push({ field, message });

  if (i.type === "buyNow") {
    const shape = amountShape(i.price);
    if (!i.token || shape === "empty" || shape === "malformed") {
      note("price", "Choose a token and enter a price.");
    } else if (shape === "tooLong") {
      note("price", "Use at most 6 decimal places.");
    } else if (toMicros(i.price) === BigInt(0)) {
      note("price", "The price must be above 0.");
    }
  } else {
    const minShape = amountShape(i.minBid);
    if (!i.token || minShape === "empty" || minShape === "malformed") {
      note("minBid", "Choose a token and enter the minimum bid.");
    } else if (minShape === "tooLong") {
      note("minBid", "Use at most 6 decimal places.");
    }
    if (i.auctionBuyNow.trim()) {
      const buyShape = amountShape(i.auctionBuyNow);
      if (buyShape === "tooLong") {
        note("auctionBuyNow", "Use at most 6 decimal places.");
      } else if (buyShape === "ok" && toMicros(i.auctionBuyNow) === BigInt(0)) {
        note("auctionBuyNow", "The buy now price must be above 0.");
      } else if (buyShape === "ok" && minShape === "ok") {
        const min = toMicros(i.minBid);
        const buy = toMicros(i.auctionBuyNow);
        if (min !== null && buy !== null && min > buy) {
          note("minBid", "The minimum bid can't be above the buy now price.");
        }
      }
    }
    if (!i.endsAt) {
      note("endsAt", "Set the date the auction ends.");
    } else {
      const endsMs = new Date(i.endsAt).getTime();
      if (Number.isFinite(endsMs)) {
        const delta = endsMs - c.now;
        if (delta < AUCTION_MIN_MS) note("endsAt", "Set an end at least 5 minutes from now.");
        else if (delta > AUCTION_MAX_MS) note("endsAt", "Keep the auction to 30 days or less.");
      }
    }
  }

  if (i.percentSelling !== null && i.percentSelling > c.creatorPct) {
    note("percentSelling", `You can sell up to ${c.creatorPct}% — the rest belongs to contributors or buyers.`);
  }

  const roy = i.royalties.trim();
  if (!roy) {
    note("royalties", "Set the royalties percentage.");
  } else {
    const n = Number(roy);
    if (!Number.isFinite(n) || n < ROYALTY_MIN || n > ROYALTY_MAX) {
      note("royalties", "Royalties must be between 2 and 10%.");
    }
  }

  if (i.benefits.some((b) => !b.name.trim())) {
    note("benefits", "Name this benefit, or remove it.");
  }

  if (!i.confirmOwner) {
    note("confirmOwner", "Confirm you're the rightful owner and take responsibility for it.");
  }

  // Only checked once every field is otherwise fine, so a real field error
  // never gets shadowed by "nothing changed".
  if (c.mode === "edit" && c.original && problems.length === 0) {
    const o = c.original;
    const royalties = Number(i.royalties) || 0;
    const percentSelling = i.percentSelling ?? o.percentSelling;
    const unchanged =
      o.token === i.token &&
      (o.price ?? "") === i.price &&
      o.percentSelling === percentSelling &&
      o.royaltiesPct === royalties &&
      JSON.stringify(o.benefits) === JSON.stringify(i.benefits);
    if (unchanged) {
      note(null, "Change the price, the selling percentage, the royalties or a benefit to update.");
    }
  }

  const fields: Partial<Record<FieldKey, string>> = {};
  for (const p of problems) {
    if (p.field && !fields[p.field]) fields[p.field] = p.message;
  }
  return { first: problems[0]?.message ?? null, fields };
}

/** The Brief's Sell/Give draft, read into the shared form — never written
 *  (C13): a v1 sell draft's "backfill" is dropped, and this is the whole of
 *  what replaces it. */
export function listingInputFromBrief(s: BriefState): ListingInput {
  const trimmedPct = s.sellingPct.trim();
  const pct = trimmedPct ? Number(trimmedPct) : NaN;
  return {
    network: s.network,
    collection: s.collection,
    type: s.listingType,
    mintingType: s.mintType,
    token: s.token,
    price: s.price,
    minBid: s.minBid,
    auctionBuyNow: s.auctionBuyNow,
    endsAt: s.expiresAt,
    percentSelling: Number.isFinite(pct) ? pct : null,
    royalties: s.royalties,
    benefits: s.benefits,
    confirmOwner: s.confirmOwnership,
  };
}

function toDateTimeLocal(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Edit's prefill, and "Add to marketplace" again after Remove or a closed
 *  auction (P2-LISTING-15). */
export function listingInputFromListing(l: Listing): ListingInput {
  return {
    network: l.network,
    collection: l.collection,
    type: l.type,
    mintingType: l.mintingType,
    token: l.token,
    price: l.price ?? "",
    minBid: l.minBid ?? "",
    auctionBuyNow: l.auctionBuyNow ?? "",
    endsAt: l.endsAt ? toDateTimeLocal(l.endsAt) : "",
    percentSelling: l.percentSelling,
    royalties: String(l.royaltiesPct),
    benefits: l.benefits,
    // Edit's checkbox is ticked and must stay ticked (P2-LISTING-4 row 9).
    confirmOwner: true,
  };
}

const SELLING_STEPS = [10, 25, 50, 75, 100] as const;

/** 10 / 25 / 50 / 75 / 100 %, plus "All of your share ({n}%)" when
 *  `creatorPct` isn't one of those steps. Every step above `creatorPct` is
 *  disabled. */
export function sellingSteps(creatorPct: number): { value: number; label: string; disabled: boolean }[] {
  const steps: { value: number; label: string; disabled: boolean }[] = SELLING_STEPS.map((value) => ({
    value,
    label: `${value}%`,
    disabled: value > creatorPct,
  }));
  if (creatorPct > 0 && creatorPct < 100 && !(SELLING_STEPS as readonly number[]).includes(creatorPct)) {
    steps.push({ value: creatorPct, label: `All of your share (${creatorPct}%)`, disabled: false });
  }
  return steps.sort((a, b) => a.value - b.value);
}

/** The form's summary, above the CTA. A row with an empty `label` reads as
 *  one whole sentence (the auction's second line); otherwise the display is
 *  "{label} · {value}" (P2-LISTING-4). */
export function listingSummaryRows(i: ListingInput, _c: ListingCtx): SummaryRow[] {
  void _c; // the rate is one constant today (IDEEZA_FEE_BPS); ctx is here for a future per-listing rate.
  if (i.type === "auction") {
    return [
      { label: FEE_LABEL, value: "taken from the winning bid" },
      { label: "", value: `You receive the winning bid minus ${feePercentText()}` },
    ];
  }
  const token = i.token ?? "ETH";
  const fee = ideezaFeeOf(i.price || "0");
  const payout = payoutOf(i.price || "0");
  return [
    { label: FEE_LABEL, value: `${formatAmount(fee, token)} per sale` },
    { label: "You receive", value: formatAmount(payout, token) },
  ];
}
