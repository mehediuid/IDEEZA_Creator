"use client";

// The buy box's parts on Explore marketplace's buyer view (owner, 2026-11-15:
// the marketplace details page is a shop page, the phone's approved buy box on
// the web — overline, price large, then the button, then the facts small):
// - OfferTop: what is sold as the overline ("Whole project · Main NFT", or the
//   share), the price in large type, and an optional line under it (an
//   auction's end and time left);
// - DealFacts: the listing's facts as a compact grid, a small label over each
//   value, three to a row, then the notes they need and the testnet note as a
//   caption — what used to be eight stacked rows above the button.

import * as React from "react";
import { Badge } from "@/components/ideeza";
import { SHARE_SALE_NOTE } from "@/lib/commerce/share-copy";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDateTime } from "@/lib/manual/project-summary";
import { timeLeftLabel } from "@/lib/market/auction";
import type { AuctionState, Listing } from "@/lib/market/types";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";

/** "Whole project · Main NFT", or the share on sale. */
export function soldWhatOf(listing: Listing): string {
  return listing.percentSelling >= 100 ? "Whole project · Main NFT" : `Main NFT · ${listing.percentSelling}% of the project`;
}

/** Lazy while nothing is on chain yet: the token is minted at the sale. */
function isLazy(listing: Listing, view: ProjectView): boolean {
  if (view.mint.status === "lazyMinted") return true;
  if (view.mint.status === "onChain") return false;
  return listing.mintingType === "lazy";
}

/** The overline, the price large, and what stands under it. */
export function OfferTop({
  overline,
  label,
  price,
  sub,
}: {
  overline: string;
  /** Said before the price for an auction: "Current bid", "Starting bid". */
  label?: string;
  price: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="m-0 text-sm font-medium text-text-secondary">{overline}</p>
      {label && <p className="m-0 text-sm text-text-tertiary">{label}</p>}
      <p className="m-0 break-words text-2xl font-semibold leading-2xl tabular-nums text-text-primary">{price}</p>
      {sub && <div className="text-sm text-text-secondary">{sub}</div>}
    </div>
  );
}

/** An auction's price block: the bid that leads (or the starting bid), and when it ends. */
export function AuctionTop({ listing, auction }: { listing: Listing; auction: AuctionState }) {
  const ended = auction.phase === "ended";
  const endsAt = listing.endsAt ?? listing.listedAt;
  return (
    <OfferTop
      overline={`${soldWhatOf(listing)} · Auction`}
      label={auction.top ? (ended ? "Winning bid" : "Current bid") : ended ? "No bids" : "Starting bid"}
      price={formatAmount(auction.top?.amount ?? listing.minBid ?? "0", listing.token)}
      sub={
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
          <span>
            {ended ? "Ended" : "Ends"}{" "}
            <time dateTime={new Date(endsAt).toISOString()}>{formatDateTime(endsAt)}</time>
          </span>
          {!ended && <Badge tone={auction.phase === "endingSoon" ? "warning" : "neutral"}>{timeLeftLabel(auction.msLeft)}</Badge>}
        </span>
      }
    />
  );
}

/** A fact in the grid: a small label over its value. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-sm text-text-tertiary">{label}</dt>
      <dd className="m-0 break-words text-md text-text-primary">{value}</dd>
    </div>
  );
}

/** The listing's facts, small, under the button. */
export function DealFacts({ listing, view }: { listing: Listing; view: ProjectView }) {
  const lazy = isLazy(listing, view);
  const facts = [
    { label: "Listing", value: listing.type === "auction" ? "Auction" : "Buy now" },
    { label: "Share", value: `${listing.percentSelling}%` },
    { label: "Royalties", value: `${listing.royaltiesPct}%` },
    { label: "Minting", value: lazy ? "Lazy" : "Minted" },
    { label: "Chain", value: networkLabelOf(listing.network) },
    { label: "Collection", value: listing.collection || "—" },
  ];
  return (
    <div className="flex flex-col gap-4 border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border pt-6">
      <dl className="m-0 grid grid-cols-3 gap-x-6 gap-y-5">
        {facts.map((f) => (
          <Fact key={f.label} label={f.label} value={f.value} />
        ))}
      </dl>
      <p className="m-0 text-sm text-text-tertiary">
        Royalties are a share of resales, if marketplaces honour them.
        {lazy ? " Lazy: the token is minted when you buy." : ""}
      </p>
      <p className="m-0 text-sm text-text-tertiary">{SHARE_SALE_NOTE}</p>
    </div>
  );
}
