"use client";

// The project's listing, the owner's side (Phase 2 spec §2.2, §2.7;
// P2-LISTING-1, -2 and -8…16 as changed in §4.5): the body of Earn › Sell's
// "Your project" card while a Main listing is live, paused or sold
// (earn/sell.tsx). It is the one home of the listing's state and of every
// operation on a listing that exists: Edit · Remove · View on marketplace,
// Bidding History · Close auction, Relist. Starting a listing is the card's
// ListingFlow.
//
// It can hold the page's one violet (Close auction once an auction has ended,
// Relist while paused). Once stacked (below a 1024 px page container) an
// auction's and a paused listing's action row comes first, right under its
// state line and before its facts, so that violet is above a phone's fold;
// it is the DOM order, so Tab follows what is seen.
//
// Every fact is `marketplaceCardOf(view.listing)`, from the page's one
// derivation (COR-74); every write is the listing dialogs' own. What changed
// is said in the page's one polite live region (COR-101), and focus moves to
// what's next: this body's first control after a write, the card's "Add to
// marketplace" after Remove. Every card carries MARKETPLACE_FOCUS_ID on that
// first control — on its lead line when it has none (Ended, None) — so a
// write that changes the card (Close auction → Sold or Ended) still lands the
// keyboard here. Removing the Main listing leaves the copies' listings as they
// are: copies are listed on their own (owner, 2026-10-11).

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
import { RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";
import type { SlotProps } from "./slots";
import { earnHref } from "@/lib/manual/earn-route";

type Dialog = "edit" | "remove" | "bids" | "close" | null;

const PRIMARY =
  "bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface";
const QUIET = "border border-solid border-border bg-bg-surface hover:bg-bg-surface-raised";

const PILL_TONE: Record<PillTone, string> = {
  success: "bg-bg-success-subtle text-text-success",
  warning: "bg-bg-warning-subtle text-text-warning",
  neutral: "bg-bg-subtle text-text-secondary",
};

const LINK =
  "inline-flex items-center gap-2 self-start rounded-sm text-md font-semibold text-text-link underline-offset-2 outline-none transition-colors duration-normal ease-decelerate hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
/** A card's lead line when it has no control: a focus target, not a Tab stop. */
const LEAD = "m-0 rounded-sm text-md font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

/** The Main listing's card and its operations; the caller shows it only to the owner. */
export function ListingBody({ project, view, viewer, brief, now, announce }: SlotProps) {
  const stacked = useRailStacked();
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const card = marketplaceCardOf(view.listing, { bids: view.bids, now });
  const listing: Listing | null = "listing" in view.listing ? view.listing.listing : null;
  const manage = can(viewer, "listing.manage", view.canCtx);
  const closeHintId = React.useId();

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
  // Below 1024 px it goes first in the card (C21).
  const auctionActions = card.kind === "auction" && (
    <>
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
    </>
  );
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
          <p className="m-0 text-md text-text-secondary">{card.terms}</p>
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
          {stacked && auctionActions}
          <Facts facts={card.facts} />
          {marketLink(true)}
          {!stacked && auctionActions}
          <p className="m-0 text-sm text-text-tertiary">{card.fixedNote}</p>
        </>
      )}

      {card.kind === "paused" && listing && (
        <>
          {!(manage && stacked) && pausedFacts(card)}
          {manage && (
            <RelistPanel
              actionsFirst={stacked}
              facts={stacked ? pausedFacts(card) : undefined}
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
            href={earnHref(project.id, "customers")}
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
          onClose={closeDialog}
          onDone={(m) => done(m, LISTING_TRIGGER_ID)}
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

/** A paused card's lines: what changed, and the terms buyers would get. */
function pausedFacts(card: Extract<MarketplaceCard, { kind: "paused" }>) {
  return (
    <>
      <p className="m-0 text-md leading-relaxed text-text-secondary">{card.changed}</p>
      <p className="m-0 text-md text-text-secondary">{card.terms}</p>
    </>
  );
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
        <span className={cn("inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold tabular-nums whitespace-nowrap", PILL_TONE[card.pill.tone])}>
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
