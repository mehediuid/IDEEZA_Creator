"use client";

// The buyer rail: the rail's `marketplace` block for everyone but the owner
// (Figma 41505:134087; P2-MARKETPLACE-10…15, -18, P2-LISTING-21). One block id
// with LISTING's owner card (T22), so the listing has one home.
//
// One Marketplace box (owner, 2026-11-15: "after the Main NFT there is so much
// information, then Physical, then Virtual — it isn't right"): the dev app's
// Marketplace section, tabs Main NFT / Physical NFT / Virtual NFT, only the
// ones on sale (a lone one is a chip), one panel at a time (offer-parts.tsx).
// The box opens on what the buyer holds, else on the Main NFT while it can be
// bought, else on the first copy tab.
//
// - Main NFT tab, a demo buyer on /marketplace/[id]:
//   - a holder reads Purchased Summary first;
//   - a live Buy now reads what is sold and its price large, ★ Buy now (the
//     panel's one violet, 44 px), the wallet line and the one legal line —
//     headed "Buy another share" for a holder;
//   - a live auction is the Auction card (bid-card.tsx);
//   - while another tab's checkout holds the listing, Buy waits, greyed, with
//     "Someone is buying this now. Try again in a few minutes." under it;
//   - paused, removed, closed with no bids and sold each say so, with no button;
//   - its facts and activity are folded under "NFT details".
// - Physical NFT / Virtual NFT tabs: the whole project's own copies only
//   (copy-panel.tsx); a product's copies are its page's. Copies sell without
//   the Main NFT (owner, 2026-10-11); only the lock (sold in full) hides them.
// - Preview as buyer (`?view=buyer`) and a contributor preview that may see
//   the listing read the same tabs with no button, the Testnet demo badge,
//   and a quiet "Open in Explore marketplace" (preview stays read-only, PPL-6).
// - A project with nothing on sale has no block.
// - The way to the creator — "Get creator support" for a holder of any sale of
//   the project (Main or a copy), about the newest one, else "Ask the
//   creator", about the listing — is the Creator block's (market-rail.tsx).
//
// Every `can()` passes `view.canCtx` (listingLive, auction, holding); an auction
// asks again at the card's own clock, so Place bid goes the moment it ends.
// Below a 1024 px page the block stands above the tab strip, open (C21).

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, TestnetDemoBadge, buttonVariants } from "@/components/ideeza";
import { can } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatDate } from "@/lib/manual/project-summary";
import { auctionStateOf } from "@/lib/market/auction";
import { IN_CHECKOUT_BUYER_LINE } from "@/lib/market/checkout-hold";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { holdingOf } from "@/lib/market/sales";
import { PROJECT_SCOPE, type AuctionState, type Listing, type Sale } from "@/lib/market/types";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { formatAmount } from "@/lib/wallet/money";
import type { DemoBuyerId } from "@/lib/wallet/types";
import { RailBlock } from "@/components/projects/details/rail-block";
import type { SlotProps } from "@/components/projects/details/slots";
import { cn } from "@/lib/utils";
import { BidCard, useAfterDialogClose, useAuctionClock } from "./bid-card";
import { CopyPanel, heldKindOf, listedKindsOf } from "./copy-panel";
import { ActivityNow } from "@/components/projects/details/activity/now-block";
import { usePurchase } from "./purchase-dialog";
import { PurchasedSummary } from "./purchased-summary";
import { AuctionTop, DealFacts, LegalLine, MoreFacts, OfferTabs, OfferTop, soldWhatOf, WalletLine, type OfferTab } from "./offer-parts";

const QUIET_LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-md font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)] max-md:min-h-[var(--touch-min)]";

/** The words of a listing that can't be bought now (P2-MARKETPLACE-10's other states). */
function closedLine(view: ProjectView): { title: string; detail?: string } | null {
  const lv = view.listing;
  if (lv.kind === "paused") return { title: "Paused by the creator — it can't be bought right now." };
  if (lv.kind === "ended") {
    if (lv.why === "removed") return { title: "The creator took this listing off the marketplace." };
    // Closed with bids that nobody could pay is not "no bids" (`unpaid`).
    return lv.unpaid ? { title: "Ended without a sale: no bid could be paid." } : { title: "Ended with no bids." };
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

export function BuyerRail({ project, view, viewer, now, announce }: SlotProps) {
  const listing = view.listing.kind === "none" ? null : view.listing.listing;
  // Called on every render (hooks can't wait on the viewer): the auction card's clock, the picked tab.
  const clock = useAuctionClock(listing?.type === "auction" ? listing.endsAt : undefined, now);
  const [picked, setPicked] = React.useState<OfferTab | null>(null);
  if (viewer.kind === "local-owner" || !can(viewer, "listing.seePublic", view.canCtx)) return null;
  const kinds = listedKindsOf(view, PROJECT_SCOPE);
  const tabs: OfferTab[] = listing ? ["main", ...kinds] : kinds;
  if (tabs.length === 0) return null;
  const buyerId = viewer.kind === "demo-buyer" ? viewer.buyerId : null;
  const heldMain = buyerId !== null && view.sales.some((s) => s.buyerId === buyerId && s.item.nft === "main");
  const first: OfferTab =
    listing && heldMain
      ? "main"
      : (heldKindOf(view, PROJECT_SCOPE, buyerId, kinds) ??
        (listing && (view.listing.kind === "live" || kinds.length === 0) ? "main" : kinds[0]));
  const tab = picked && tabs.includes(picked) ? picked : first;
  const live = view.listing.kind === "live";
  const auction = listing && live && listing.type === "auction" ? auctionStateOf(listing, view.bids, clock) : null;

  return (
    <RailBlock title="Marketplace" collapsible={false}>
      <OfferTabs tabs={tabs} active={tab} onSelect={setPicked}>
        {tab !== "main" ? (
          <CopyPanel
            project={project}
            view={view}
            viewer={viewer}
            now={clock}
            scopeId={PROJECT_SCOPE}
            scopeName={project.name}
            kind={tab}
            announce={announce}
          />
        ) : listing && viewer.kind === "demo-buyer" ? (
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
        ) : listing ? (
          <PreviewBody project={project} view={view} listing={listing} auction={auction} clock={clock} announce={announce} />
        ) : null}
      </OfferTabs>
    </RailBlock>
  );
}

/** The Main NFT's facts and activity, folded at the foot of its tab. */
function MainFacts({ project, listing, view }: { project: SlotProps["project"]; listing: Listing; view: ProjectView }) {
  return (
    <MoreFacts>
      <DealFacts listing={listing} view={view} />
      <ActivityNow
        variant="line"
        projectId={project.id}
        target={{ kind: "main" }}
        heading="Activity"
        emptyNote={`No activity yet · listed ${formatDate(listing.listedAt)}`}
      />
    </MoreFacts>
  );
}

/** Get creator support (a holder, about the buyer's newest sale) or Ask the creator (about the
 *  listing): opens the buyer's conversation with the creator in Messages, acting as the buyer. */
export function AskCreator({ projectId, sales, buyerId }: { projectId: string; sales: Sale[]; buyerId: DemoBuyerId }) {
  const latest = sales
    .filter((s) => s.buyerId === buyerId)
    .reduce<Sale | null>((a, s) => (!a || s.at > a.at ? s : a), null);
  const href = startHref(
    {
      kind: "direct",
      to: ME,
      projectId,
      about: latest ? { kind: "purchase", saleId: latest.id } : { kind: "listing" },
    },
    buyerId,
  );
  return (
    <Link
      href={href}
      // The reset colours every a:hover as a link; the button keeps its own text colour.
      className={cn(
        buttonVariants({ hierarchy: "secondary", size: "lg" }),
        "h-[44px] w-full hover:text-[color:var(--color-button-secondary-text)]",
      )}
    >
      {latest ? "Get creator support" : "Ask the creator"}
    </Link>
  );
}

/** Preview as buyer and a contributor preview: the Main NFT's price and facts, no button (PPL-6, P2-LISTING-21). */
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
  return (
    <>
      <TestnetDemoBadge className="self-start" />
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
          facts={<AuctionTop listing={listing} auction={auction} />}
          details={
            <>
              <LegalLine />
              <MainFacts project={project} listing={listing} view={view} />
            </>
          }
          wallet={null}
          announce={announce}
        />
      ) : (
        <OfferTop overline={soldWhatOf(listing)} price={formatAmount(listing.price ?? "0", listing.token)} />
      )}
      {!closed && !auction && <LegalLine />}
      {!auction && <MainFacts project={project} listing={listing} view={view} />}
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
      <p className="m-0 text-md font-medium text-text-primary">{line.title}</p>
      {line.detail && <p className="m-0 text-md tabular-nums text-text-secondary">{line.detail}</p>}
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
  const { busy, buy } = usePurchase({ project, view, buyerId });
  const holds = useCheckoutHolds();
  // Another tab's checkout holds the listing: Buy waits until it settles or lapses.
  const held = holds.others(listing.id) > 0;
  const heldId = React.useId();
  const summaryRef = React.useRef<HTMLButtonElement>(null);
  const afterClose = useAfterDialogClose();
  // The Main share only: Purchased Summary and "Buy another share" are about it, whatever else the buyer holds.
  const holding = holdingOf(project.id, buyerId, view.sales.filter((s) => s.item.nft === "main"));
  const ctx = view.canCtx;
  const live = view.listing.kind === "live";
  const closed = closedLine(view);
  const canBuy = live && can(viewer, "listing.buy", ctx);
  const canBid = live && auction !== null && can(viewer, "listing.bid", { ...ctx, auction: auction.phase });

  const purchase = async (via: "buyNow" | "auctionBuyNow") => {
    const done = await buy(listing, via);
    if (!done) return;
    // P2-MARKETPLACE-14: once the dialog closes, focus goes to Purchased Summary and the sentence is said again.
    afterClose(() => {
      summaryRef.current?.focus();
      announce(done);
    });
  };

  return (
    <>
      {holding && can(viewer, "purchase.seeSummary", ctx) && (
        <PurchasedSummary holding={holding} toggleRef={summaryRef} />
      )}
      {live && listing.type === "buyNow" ? (
        <div className={cn("flex flex-col gap-6", holding && "border-t border-solid border-border pt-8")}>
          {holding && <h3 className="m-0 text-md font-bold text-text-primary">Buy another share</h3>}
          <OfferTop overline={soldWhatOf(listing)} price={formatAmount(listing.price ?? "0", listing.token)} />
          {canBuy && (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                hierarchy="primary"
                size="lg"
                className={cn("h-[44px] w-full", held && "cursor-not-allowed opacity-60")}
                // Not `disabled`: that drops its focus before the wallet dialog reads its opener,
                // so Reject or Close would hand focus to <body> (the dialog covers it meanwhile).
                aria-disabled={busy || held || undefined}
                aria-describedby={held ? heldId : undefined}
                onClick={(e) => {
                  if (busy || held) return;
                  // Safari doesn't focus a clicked button.
                  e.currentTarget.focus();
                  void purchase("buyNow");
                }}
              >
                Buy now
              </Button>
              {held && (
                <p id={heldId} className="m-0 text-md text-text-secondary">
                  {IN_CHECKOUT_BUYER_LINE}
                </p>
              )}
            </div>
          )}
          <WalletLine buyerId={buyerId} token={listing.token} network={listing.network} verb="buy" now={clock} />
          <LegalLine />
          <MainFacts project={project} listing={listing} view={view} />
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
            buyHeld={held}
            onBuyNow={() => void purchase("auctionBuyNow")}
            facts={<AuctionTop listing={listing} auction={auction} />}
            details={
            <>
              <LegalLine />
              <MainFacts project={project} listing={listing} view={view} />
            </>
          }
            wallet={<WalletLine buyerId={buyerId} token={listing.token} network={listing.network} verb="bid" now={clock} />}
            announce={announce}
          />
        </div>
      ) : closed && !(holding && view.listing.kind === "sold" && view.listing.sale.buyerId === buyerId) ? (
        <>
          <ClosedLine line={closed} />
          <MainFacts project={project} listing={listing} view={view} />
        </>
      ) : null}
    </>
  );
}
