"use client";

// The buyer rail: the rail's `marketplace` block for everyone but the owner
// (Figma 41505:134087; P2-MARKETPLACE-10…15, -18, P2-LISTING-21). One block id
// with LISTING's owner card (T22), so the listing has one home.
//
// - A demo buyer on /marketplace/[id]:
//   - a holder reads Purchased Summary first;
//   - a live Buy now reads its facts, ★ Buy now (the page's one violet, 44 px)
//     and the wallet line — headed "Buy another share" for a holder;
//   - a live auction is the Auction card (bid-card.tsx);
//   - paused, removed, closed with no bids and sold each say so, with no button.
// - Preview as buyer (`?view=buyer`) and a contributor preview that may see
//   the listing read the same facts with no button, and a quiet "Open in
//   Explore marketplace" (preview stays read-only, PPL-6).
// - A project never listed has no block.
//
// Every `can()` passes `view.canCtx` (listingLive, auction, holding); an auction
// asks again at the card's own clock, so Place bid goes the moment it ends.
// Below a 1024 px page the block stands above the tab strip, open (C21).

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, TestnetDemoBadge } from "@/components/ideeza";
import { can } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";
import { auctionStateOf, timeLeftLabel } from "@/lib/market/auction";
import { useMarket } from "@/lib/market/market-store";
import { holdingOf } from "@/lib/market/sales";
import type { AuctionState, Listing } from "@/lib/market/types";
import { availableOf } from "@/lib/wallet/balances";
import { demoAddress, shortAddress } from "@/lib/wallet/demo-wallet";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf, testCoin } from "@/lib/wallet/request-view";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { RailBlock, RailFact, RailFacts } from "@/components/projects/details/rail-block";
import type { SlotProps } from "@/components/projects/details/slots";
import { cn } from "@/lib/utils";
import { BidCard, useAfterDialogClose, useAuctionClock } from "./bid-card";
import { buyerNameOf, usePurchase } from "./purchase-dialog";
import { PurchasedSummary } from "./purchased-summary";

const QUIET_LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";

/** The words of a listing that can't be bought now (P2-MARKETPLACE-10's other states). */
function closedLine(view: ProjectView): { title: string; detail?: string } | null {
  const lv = view.listing;
  if (lv.kind === "paused") return { title: "Paused by the creator — it can't be bought right now." };
  if (lv.kind === "ended") {
    return lv.why === "removed"
      ? { title: "The creator took this listing off the marketplace." }
      : { title: "Ended with no bids." };
  }
  if (lv.kind === "sold") {
    const sale = lv.sale;
    const pct = sale.item.nft === "main" ? sale.item.sharePct : 0;
    return {
      title: `Sold on ${formatDate(sale.at)}.`,
      detail: `Sold for ${formatAmount(sale.price, sale.token)} · ${pct >= 100 ? "the whole project" : `${pct}% of the project`}`,
    };
  }
  return null;
}

/** The listing's facts, read-only for everyone (P2-MARKETPLACE-10, -11). */
function ListingFacts({ listing, view, auction }: { listing: Listing; view: ProjectView; auction: AuctionState | null }) {
  const minting =
    view.mint.status === "lazyMinted"
      ? "Lazy — the token is minted when you buy"
      : view.mint.status === "onChain"
        ? `Minted on ${networkLabelOf(listing.network)}`
        : listing.mintingType === "lazy"
          ? "Lazy — the token is minted when you buy"
          : `Minted on ${networkLabelOf(listing.network)}`;
  const ended = auction?.phase === "ended";
  return (
    <RailFacts>
      <RailFact label="Listing type">{listing.type === "auction" ? "Auction" : "Buy now"}</RailFact>
      {listing.type === "auction" && auction ? (
        <RailFact label={auction.top ? "Current bid" : "Starting bid"}>
          <span className="font-semibold tabular-nums">
            {formatAmount(auction.top?.amount ?? listing.minBid ?? "0", listing.token)}
          </span>
        </RailFact>
      ) : (
        <RailFact label="Price">
          <span className="font-semibold tabular-nums">{formatAmount(listing.price ?? "0", listing.token)}</span>
        </RailFact>
      )}
      <RailFact label="Selling percentage">
        <span className="tabular-nums">{listing.percentSelling}%</span>
      </RailFact>
      {listing.type === "auction" && auction && (
        <RailFact label={ended ? "Ended" : "Ends"}>
          <span className="tabular-nums">
            <time dateTime={new Date(listing.endsAt ?? listing.listedAt).toISOString()}>
              {formatDateTime(listing.endsAt ?? listing.listedAt)}
            </time>
          </span>
          {!ended && (
            <span className="ml-2 inline-flex align-middle">
              <Badge tone={auction.phase === "endingSoon" ? "warning" : "neutral"}>{timeLeftLabel(auction.msLeft)}</Badge>
            </span>
          )}
        </RailFact>
      )}
      <RailFact label="Royalties">{listing.royaltiesPct}% on resales</RailFact>
      <RailFact label="Minting">{minting}</RailFact>
      <RailFact label="Collection">{listing.collection || "—"}</RailFact>
      <RailFact label="Blockchain">{networkLabelOf(listing.network)}</RailFact>
    </RailFacts>
  );
}

/** "Paying from Mira's demo wallet · 0x7d50…8993 · 10 test MATIC" (P2-MARKETPLACE-13 as changed), then the
 *  one home of every wallet control, the Demo wallet dialog. */
function WalletLine({ buyerId, listing, verb, now }: { buyerId: DemoBuyerId; listing: Listing; verb: "buy" | "bid"; now: number }) {
  const wallet = useDemoWallet();
  const { data } = useMarket();
  const { openManage } = useWalletRequest();
  const name = buyerNameOf(buyerId);
  const connected = wallet?.identities[buyerId]?.connected === true;
  const have = availableOf(buyerId, listing.token, listing.network, { wallet, market: data, now });
  return (
    <div className="flex flex-col gap-3 text-sm text-text-secondary">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-[2px] inline-flex shrink-0 text-text-tertiary">
          <Icon icon={Wallet01Icon} size={14} />
        </span>
        <p className="min-w-0 break-words">
          {wallet === undefined ? (
            "Reading the demo wallet…"
          ) : connected ? (
            <span className="tabular-nums">
              Paying from {name}&apos;s demo wallet · {shortAddress(demoAddress(buyerId))} · {testCoin(have, listing.token)}
            </span>
          ) : (
            <>
              {name}&apos;s demo wallet isn&apos;t connected — you&apos;ll connect it when you {verb}.
            </>
          )}{" "}
          <TestnetDemoBadge className="align-middle" />
        </p>
      </div>
      <button
        type="button"
        onClick={openManage}
        className={cn(QUIET_LINK, "text-text-secondary hover:text-text-primary")}
      >
        Manage demo wallets
      </button>
    </div>
  );
}

export function BuyerRail({ project, view, viewer, now, announce }: SlotProps) {
  const listing = view.listing.kind === "none" ? null : view.listing.listing;
  // Called on every render (hooks can't wait on the viewer): the auction card's clock.
  const clock = useAuctionClock(listing?.type === "auction" ? listing.endsAt : undefined, now);
  if (viewer.kind === "local-owner" || !listing || !can(viewer, "listing.seePublic", view.canCtx)) return null;
  const live = view.listing.kind === "live";
  const auction = live && listing.type === "auction" ? auctionStateOf(listing, view.bids, clock) : null;
  const meta = live
    ? listing.type === "auction"
      ? auction?.phase === "ended"
        ? "Auction ended"
        : "Auction"
      : `Buy now · ${formatAmount(listing.price ?? "0", listing.token)}`
    : undefined;

  return (
    <RailBlock title="Marketplace" meta={meta} collapsible={false}>
      {viewer.kind === "demo-buyer" ? (
        <BuyerBody
          project={project}
          view={view}
          buyerId={viewer.buyerId}
          listing={listing}
          auction={auction}
          clock={clock}
          announce={announce}
          viewer={viewer}
        />
      ) : (
        <PreviewBody project={project} view={view} listing={listing} auction={auction} clock={clock} announce={announce} />
      )}
    </RailBlock>
  );
}

/** Preview as buyer and a contributor preview: the facts, no button (PPL-6, P2-LISTING-21). */
function PreviewBody({
  project,
  view,
  listing,
  auction,
  clock,
  announce,
}: {
  project: SlotProps["project"];
  view: ProjectView;
  listing: Listing;
  auction: AuctionState | null;
  clock: number;
  announce: (m: string) => void;
}) {
  const closed = closedLine(view);
  const facts = <ListingFacts listing={listing} view={view} auction={auction} />;
  return (
    <>
      {closed ? (
        <ClosedLine line={closed} />
      ) : auction ? (
        <BidCard
          project={project}
          listing={listing}
          bids={view.bids}
          state={auction}
          clock={clock}
          buyerId={null}
          canBid={false}
          canBuy={false}
          buyBusy={false}
          onBuyNow={() => {}}
          facts={facts}
          wallet={null}
          announce={announce}
        />
      ) : (
        facts
      )}
      <Link href={`/marketplace/${project.id}`} className={QUIET_LINK}>
        Open in Explore marketplace
        <Icon icon={ArrowUpRight01Icon} size={14} />
      </Link>
    </>
  );
}

function ClosedLine({ line }: { line: { title: string; detail?: string } }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-md font-medium text-text-primary">{line.title}</p>
      {line.detail && <p className="text-sm tabular-nums text-text-secondary">{line.detail}</p>}
    </div>
  );
}

function BuyerBody({
  project,
  view,
  viewer,
  buyerId,
  listing,
  auction,
  clock,
  announce,
}: {
  project: SlotProps["project"];
  view: ProjectView;
  viewer: SlotProps["viewer"];
  buyerId: DemoBuyerId;
  listing: Listing;
  auction: AuctionState | null;
  clock: number;
  announce: (m: string) => void;
}) {
  const { data } = useMarket();
  const { busy, buy } = usePurchase({ project, view, buyerId });
  const summaryRef = React.useRef<HTMLButtonElement>(null);
  const afterClose = useAfterDialogClose();
  const holding = holdingOf(project.id, buyerId, view.sales);
  const ctx = view.canCtx;
  const live = view.listing.kind === "live";
  const closed = closedLine(view);
  const canBuy = live && can(viewer, "listing.buy", ctx);
  const canBid = live && auction !== null && can(viewer, "listing.bid", { ...ctx, auction: auction.phase });
  const support = React.useMemo(() => data.support.filter((r) => r.projectId === project.id), [data.support, project.id]);

  const purchase = async (via: "buyNow" | "auctionBuyNow") => {
    const done = await buy(listing, via);
    if (!done) return;
    // P2-MARKETPLACE-14: once the dialog closes, focus goes to Purchased Summary and the sentence is said again.
    afterClose(() => {
      summaryRef.current?.focus();
      announce(done);
    });
  };

  const facts = <ListingFacts listing={listing} view={view} auction={auction} />;
  return (
    <>
      {holding && can(viewer, "purchase.seeSummary", ctx) && (
        <PurchasedSummary
          holding={holding}
          buyerId={buyerId}
          support={support}
          toggleRef={summaryRef}
          announce={announce}
        />
      )}
      {live && listing.type === "buyNow" ? (
        <div className={cn("flex flex-col gap-8", holding && "border-t border-solid border-border pt-8")}>
          {holding && <h3 className="text-md font-bold text-text-primary">Buy another share</h3>}
          {facts}
          {canBuy && (
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              className="h-[44px] w-full"
              disabled={busy}
              onClick={() => void purchase("buyNow")}
            >
              Buy now
            </Button>
          )}
          <WalletLine buyerId={buyerId} listing={listing} verb="buy" now={clock} />
        </div>
      ) : live && auction ? (
        <div className={cn(holding && "border-t border-solid border-border pt-8")}>
          <BidCard
            project={project}
            listing={listing}
            bids={view.bids}
            state={auction}
            clock={clock}
            buyerId={buyerId}
            canBid={canBid}
            canBuy={canBuy}
            buyBusy={busy}
            onBuyNow={() => void purchase("auctionBuyNow")}
            facts={facts}
            wallet={<WalletLine buyerId={buyerId} listing={listing} verb="bid" now={clock} />}
            announce={announce}
          />
        </div>
      ) : closed && !(holding && view.listing.kind === "sold" && view.listing.sale.buyerId === buyerId) ? (
        <ClosedLine line={closed} />
      ) : null}
    </>
  );
}
