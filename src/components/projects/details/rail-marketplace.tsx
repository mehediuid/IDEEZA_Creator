"use client";

// The rail's Marketplace block, the owner's side (Phase 2 spec §2.2, §2.7;
// P2-LISTING-1, -2 and -8…16 as changed in §4.5). It is the one home of the
// listing's state and of every operation on a listing that exists: Edit ·
// Remove · View on marketplace, Bidding History · Close auction, Relist.
// Starting a listing is the header's (ListingFlow); the `none` card says so.
//
// First in the rail, and below a 1024 px page container between the header
// and the tab strip (C21), always open there: it can hold the page's one
// violet (Close auction once an auction has ended, Relist while paused).
// Absent for a Draft, Given, and a mint whose record can't be read.
//
// Every fact is `marketplaceCardOf(view.listing)`, from the page's one
// derivation (COR-74); every write is the listing dialogs' own. What changed
// is said in the page's one polite live region (COR-101), and focus moves to
// what's next: this block's first control after a write, the header's
// "Add to marketplace" after Remove. Every card carries MARKETPLACE_FOCUS_ID
// on that first control — on its lead line when it has none (Ended, None) —
// so a write that changes the card (Close auction → Sold or Ended) still
// lands the keyboard in the block.
//
// T27: the block's tabs are "Main NFT · Physical NFT · Virtual NFT" (Main
// first and selected); Physical and Virtual are read-only summaries
// (editions/edition-summary.tsx, P2-TABS-28). Removing the Main listing also
// takes its Physical and Virtual NFT listings off the marketplace, and the
// confirm says so (spec C23).

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CheckmarkBadge01Icon,
  PauseIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { TestnetDemoBadge } from "@/components/ideeza";
import { can } from "@/lib/manual/permissions";
import {
  LISTING_TRIGGER_ID,
  MARKETPLACE_FOCUS_ID,
  biddingHistoryLabel,
  marketplaceCardOf,
  type CardFact,
  type MarketplaceCard,
  type PillTone,
} from "@/lib/market/listing-flow";
import type { Listing } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { BiddingHistoryDialog } from "../listing/bidding-history";
import { CloseAuctionDialog } from "../listing/close-auction-dialog";
import { focusSoon, ListingDialog } from "../listing/listing-dialog";
import { RelistPanel } from "../listing/relist";
import { RemoveListingDialog } from "../listing/remove-listing-dialog";
import { RailBlock, RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";
import type { SlotProps } from "./slots";
import { NftTypeTabs } from "../editions/edition-summary";
import { writeTracks } from "../editions/create-dialog";
import { unlistProjectTracks } from "@/lib/market/editions";

type Dialog = "edit" | "remove" | "bids" | "close" | null;

/** The statuses whose Marketplace block the owner sees (P2-LISTING-1 C). */
const WITH_BLOCK = new Set(["private", "listed", "paused", "sold"]);

const PRIMARY =
  "bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface";
const QUIET = "border border-solid border-border bg-bg-surface hover:bg-bg-surface-raised";

const PILL_TONE: Record<PillTone, string> = {
  success: "bg-bg-success-subtle text-text-success",
  warning: "bg-bg-warning-subtle text-text-warning",
  neutral: "bg-bg-subtle text-text-secondary",
};

const LINK =
  "inline-flex items-center gap-2 self-start rounded-sm text-md font-semibold text-text-link underline-offset-2 outline-none transition-colors duration-normal ease-decelerate hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";
/** A card's lead line when it has no control: a focus target, not a Tab stop. */
const LEAD = "m-0 rounded-sm text-md font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

export function RailMarketplace(props: SlotProps) {
  const { viewer, view } = props;
  if (!can(viewer, "facts.seeOwnerOnly") || !WITH_BLOCK.has(view.summary.status)) return null;
  return (
    <RailBlock title="Marketplace" collapsible={false}>
      <NftTypeTabs projectId={props.project.id} view={view} main={<MarketplaceBody {...props} />} />
    </RailBlock>
  );
}

function MarketplaceBody({ project, view, viewer, brief, now, announce }: SlotProps) {
  const stacked = useRailStacked();
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const card = marketplaceCardOf(view.listing, { bids: view.bids, now });
  const listing: Listing | null = "listing" in view.listing ? view.listing.listing : null;
  const manage = can(viewer, "listing.manage", view.canCtx);
  const closeHintId = React.useId();
  const editionsListed = view.editions.filter((t) => t.listing !== null).length;

  // 40 px beside the page, 44 px once stacked or on a coarse pointer (P2-LISTING-8).
  const button = cn(
    "inline-flex items-center justify-center gap-3 rounded-lg px-8 text-md font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[44px]",
    stacked ? "min-h-[44px]" : "min-h-[40px]",
  );

  const done = (message: string, focusId = MARKETPLACE_FOCUS_ID) => {
    setDialog(null);
    announce(message);
    focusSoon(focusId);
  };
  const closeDialog = () => {
    setDialog(null);
  };
  const marketLink = (first: boolean) => (
    <Link href={`/marketplace/${project.id}`} id={first ? MARKETPLACE_FOCUS_ID : undefined} className={LINK}>
      View on marketplace
      <Icon icon={ArrowUpRight01Icon} size={16} />
    </Link>
  );

  return (
    <>
      <StateRow card={card} />

      {card.kind === "none" && (
        <div className="flex flex-col gap-2">
          <p id={MARKETPLACE_FOCUS_ID} tabIndex={-1} className={LEAD}>
            {card.lines[0]}
          </p>
          <p className="m-0 text-md leading-relaxed text-text-secondary">{card.lines[1]}</p>
        </div>
      )}

      {card.kind === "ended" && (
        <div className="flex flex-col gap-2">
          <p id={MARKETPLACE_FOCUS_ID} tabIndex={-1} className={LEAD}>
            {card.lead}
          </p>
          <p className="m-0 text-md text-text-secondary">{card.when}</p>
          <p className="m-0 text-sm text-text-secondary">{card.terms}</p>
        </div>
      )}

      {card.kind === "buyNow" && listing && (
        <>
          <Facts facts={card.facts} />
          {marketLink(true)}
          {manage && (
            <div className="flex flex-wrap gap-4">
              <button type="button" onClick={() => setDialog("edit")} className={cn(button, QUIET)}>
                Edit
              </button>
              <button type="button" onClick={() => setDialog("remove")} className={cn(button, QUIET, "text-text-error")}>
                Remove
              </button>
            </div>
          )}
        </>
      )}

      {card.kind === "auction" && listing && (
        <>
          <Facts facts={card.facts} />
          {marketLink(true)}
          {manage && (
            <div className="flex flex-wrap gap-4">
              <button type="button" onClick={() => setDialog("bids")} className={cn(button, QUIET)}>
                {biddingHistoryLabel(card.bids)}
              </button>
              <button
                type="button"
                aria-disabled={!card.closeReady || undefined}
                aria-describedby={card.closeHint ? closeHintId : undefined}
                onClick={() => {
                  if (card.closeReady) setDialog("close");
                }}
                className={cn(button, card.closeReady ? PRIMARY : cn(QUIET, "cursor-not-allowed opacity-60"))}
              >
                Close auction
              </button>
            </div>
          )}
          {card.closeHint && (
            <p id={closeHintId} className="m-0 text-sm text-text-secondary">
              {card.closeHint}
            </p>
          )}
          <p className="m-0 text-sm text-text-tertiary">{card.fixedNote}</p>
        </>
      )}

      {card.kind === "paused" && listing && (
        <>
          <p className="m-0 text-md leading-relaxed text-text-secondary">{card.changed}</p>
          <p className="m-0 text-sm text-text-secondary">{card.terms}</p>
          {manage && (
            <RelistPanel
              project={project}
              view={view}
              brief={brief}
              listing={listing}
              changed={view.listing.kind === "paused" ? view.listing.changed : []}
              buttonClass={button}
              primaryClass={PRIMARY}
              onDone={(m) => done(m)}
            >
              <button
                type="button"
                id={MARKETPLACE_FOCUS_ID}
                onClick={() => setDialog("edit")}
                className={cn(button, QUIET)}
              >
                Edit
              </button>
              <button type="button" onClick={() => setDialog("remove")} className={cn(button, QUIET, "text-text-error")}>
                Remove listing
              </button>
            </RelistPanel>
          )}
        </>
      )}

      {card.kind === "sold" && (
        <>
          <Facts facts={card.facts} />
          <Link
            href={`/projects/${project.id}?tab=customers`}
            scroll={false}
            id={MARKETPLACE_FOCUS_ID}
            className={LINK}
          >
            See customers
            <Icon icon={ArrowRight01Icon} size={16} />
          </Link>
        </>
      )}

      {dialog === "edit" && listing && (
        <ListingDialog
          mode="edit"
          project={project}
          view={view}
          brief={brief}
          now={now}
          listing={listing}
          onClose={closeDialog}
          onDone={(m) => done(m)}
        />
      )}
      {dialog === "remove" && listing && (
        <RemoveListingDialog
          projectName={project.name}
          listing={listing}
          extra={editionsListed > 0 ? <p>{editionsRemovedLine(editionsListed)}</p> : undefined}
          onClose={closeDialog}
          onDone={(m) => {
            // The Main listing is gone: its editions' listings go with it (their NFTs and sales stay).
            const w = editionsListed > 0 ? writeTracks(project.id, (all) => unlistProjectTracks(all, project.id).tracks) : null;
            done(w && !w.ok ? `${m} ${w.message} Remove the NFT listings on each product's page.` : m, LISTING_TRIGGER_ID);
          }}
        />
      )}
      {dialog === "bids" && listing && (
        <BiddingHistoryDialog projectName={project.name} listing={listing} bids={view.bids} onClose={closeDialog} />
      )}
      {dialog === "close" && listing && (
        <CloseAuctionDialog
          project={project}
          brief={brief}
          listing={listing}
          now={now}
          onClose={closeDialog}
          onDone={(m) => done(m)}
        />
      )}
    </>
  );
}

/** The Remove confirm names the edition listings that go with the Main one (TABS T3). */
function editionsRemovedLine(n: number): string {
  return n === 1
    ? "Its Physical or Virtual NFT listing comes off the marketplace too. Its NFTs and sales are kept."
    : `Its ${n} Physical and Virtual NFT listings come off the marketplace too. Their NFTs and sales are kept.`;
}

const STATE_ICON: Partial<Record<MarketplaceCard["kind"], IconValue>> = {
  buyNow: Tag01Icon,
  auction: Tag01Icon,
  paused: PauseIcon,
  sold: CheckmarkBadge01Icon,
};

/** The card's first line — its state beside its glyph, the auction's time pill — and the demo badge. */
function StateRow({ card }: { card: MarketplaceCard }) {
  const icon = STATE_ICON[card.kind];
  const state =
    card.kind === "buyNow" || card.kind === "auction" ? (
      card.state
    ) : card.kind === "paused" ? (
      <RailValue parts={card.since} />
    ) : card.kind === "sold" ? (
      <RailValue parts={card.state} />
    ) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {state && (
        <p className={cn("m-0 inline-flex items-center gap-2 text-md font-semibold", card.kind === "paused" ? "text-text-primary" : "text-text-success")}>
          {icon && <Icon icon={icon} size={16} />}
          <span>{state}</span>
        </p>
      )}
      {card.kind === "auction" && (
        <span className={cn("inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold tabular-nums", PILL_TONE[card.pill.tone])}>
          {card.pill.text}
        </span>
      )}
      <TestnetDemoBadge className="ml-auto" />
    </div>
  );
}

function Facts({ facts }: { facts: CardFact[] }) {
  return (
    <RailFacts>
      {facts.map((f) => (
        <RailFact key={f.label} label={f.label}>
          <RailValue parts={f.value} />
        </RailFact>
      ))}
    </RailFacts>
  );
}
