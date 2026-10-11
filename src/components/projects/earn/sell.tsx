"use client";

// Earn › Sell (owner, 2026-10-11): the whole project, then copies of each
// product.
// - "Your project" (the old Project NFT), one card: what it is in one
//   sentence (YOUR_PROJECT_LEAD); its state in plain words
//   (`yourProjectLineOf`), or, while a Main listing is live, paused or sold,
//   the listing's own card with Edit · Remove · Relist · Bidding history ·
//   Close auction (rail-marketplace.tsx's ListingBody); then its one action
//   from the pair (`earnPairOf`): Start mint / Continue mint, the mint flow,
//   or Add to marketplace / List another share, the listing flow
//   (ListingFlow, which opens once on `?list=1` and drops it from the
//   address, so a link here works as the header button did). The pair's tone
//   makes it the page's one violet. Last, quiet, "Mint details": the mint's
//   proof, the payout wallet and the Testnet demo badge, with the minted
//   flow's summary.
// - "Copies of each product" (`#copies`): editions.tsx.
// Everything asks `can(viewer, …, view.canCtx)` as before, so a project sold
// in full reads without a write.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { ListingFlow } from "@/components/projects/listing/listing-flow";
import { commercialFactsOf, commercialStateOf } from "@/lib/commerce/state";
import { earnPairOf, YOUR_PROJECT_LEAD, yourProjectLineOf } from "@/lib/manual/earn-view";
import { can } from "@/lib/manual/permissions";
import type { NextAction } from "@/lib/manual/project-summary";
import { marketplaceCardOf } from "@/lib/market/listing-flow";
import { cn } from "@/lib/utils";
import { RailStackScope } from "../details/rail-block";
import { ListingBody } from "../details/rail-marketplace";
import { MintDetails } from "../details/rail-outcome";
import type { SlotProps } from "../details/slots";
import { EarnCopies, YOUR_PROJECT_ID } from "./editions";
import { EARN_LINK, EARN_STACK, EarnBlock, TAP } from "./surface";

/** Full width at phone width; 44 px there and on a coarse pointer. */
const ACTION = "justify-center max-sm:w-full max-md:h-[44px] [@media(pointer:coarse)]:h-[44px]";

const MINT_LABEL: Partial<Record<NextAction["kind"], string>> = {
  "add-brief": "Start mint",
  "continue-brief": "Continue mint",
};

export function EarnSell(props: SlotProps) {
  return (
    <div className={EARN_STACK}>
      <YourProject {...props} />
      <EarnCopies {...props} />
    </div>
  );
}

function YourProject(props: SlotProps) {
  const { project, view, viewer, brief, now, announce } = props;
  const commercial = commercialStateOf(commercialFactsOf(project, brief, { listing: view.listing, sales: view.sales }));
  const pair = earnPairOf(project, view.summary, brief, viewer, view.canCtx);
  const actions = [pair.first, pair.second].filter((a): a is NextAction => a !== null);
  const mint = actions.find((a) => MINT_LABEL[a.kind]) ?? null;
  const listing = actions.find((a): a is Extract<NextAction, { kind: "add-to-marketplace" }> => a.kind === "add-to-marketplace") ?? null;
  const summaryOf = actions.find((a) => a.kind === "view-brief") ?? null;
  const line = yourProjectLineOf(commercial, view.listing.kind);
  const ended = view.listing.kind === "ended" ? marketplaceCardOf(view.listing, { bids: view.bids, now }) : null;
  const showsListing = line === null && can(viewer, "facts.seeOwnerOnly");

  return (
    <EarnBlock id={YOUR_PROJECT_ID} card title="Your project" lead={YOUR_PROJECT_LEAD}>
      <RailStackScope className="flex flex-col gap-8">
        {line && (
          <div className="flex flex-col gap-1">
            <p className="m-0 text-md font-semibold leading-md text-text-primary">{line}</p>
            {ended?.kind === "ended" && <p className="m-0 text-sm leading-relaxed text-text-secondary">{`${ended.when} ${ended.terms}`}</p>}
          </div>
        )}

        {showsListing && (
          <div className="flex flex-col gap-6">
            <ListingBody {...props} />
          </div>
        )}

        {mint && (
          <Link
            href={mint.href}
            // The reset colours every a:hover as a link; the button keeps its own text colour.
            className={cn(
              buttonVariants({ hierarchy: pair.violet ? "primary" : "secondary", size: "lg" }),
              "self-start gap-3",
              pair.violet ? "hover:text-[color:var(--color-button-primary-text)]" : "hover:text-[color:var(--color-button-secondary-text)]",
              ACTION,
              TAP,
            )}
          >
            {MINT_LABEL[mint.kind]}
            <Icon icon={ArrowRight01Icon} size={16} />
          </Link>
        )}

        {listing && (
          <div className="flex flex-col items-start gap-4">
            <ListingFlow {...props} action={listing} violet={pair.violet} className={ACTION} />
          </div>
        )}

        <MintDetails summary={view.summary} commerce={view.commerce} viewer={viewer} view={view} announce={announce}>
          {summaryOf && (
            <Link href={summaryOf.href} className={cn(EARN_LINK, "text-sm")}>
              Open the mint summary
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          )}
        </MintDetails>
      </RailStackScope>
    </EarnBlock>
  );
}
