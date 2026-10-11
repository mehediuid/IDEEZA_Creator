"use client";

// Earn › Sell, with the owner's selling rules (2026-10-11; the approved
// sell-flow mockup):
// - "What you can sell": three short rule cards, Main · Physical · Virtual, what
//   each is and where it applies, under the line that each is listed on its
//   own and copies never sell the project.
// - "Whole project · {name}": three rows, Main NFT, Physical NFT, Virtual NFT
//   (editions.tsx's `SellRow`), each its state in words and ONE quiet button.
//   The Main row's Sell is the mint flow while nothing is minted, else the
//   existing listing flow (ListingFlow, which also opens once on `?list=1`);
//   while a Main listing is live or paused its Manage opens the listing's own
//   controls under the row (rail-marketplace.tsx's ListingBody: Edit, Remove,
//   Relist, Bidding history, Close auction). A missing ladder step stands
//   under the row in Sell's place. Then the note that selling the Main NFT
//   sells the project, and, quiet, "Mint details".
// - "One product at a time" (`#copies`): editions.tsx.
// Everything asks `can(viewer, …, view.canCtx)` as before, so a project sold
// in full reads without a write. No control here is violet: the listing's own
// Relist or Close auction can be, as the page's one.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { TestnetDemoBadge } from "@/components/ideeza";
import { ListingFlow } from "@/components/projects/listing/listing-flow";
import { earnMintHref } from "@/lib/manual/earn-route";
import { earnPairOf, mainRowStateOf } from "@/lib/manual/earn-view";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { NextAction } from "@/lib/manual/project-summary";
import { MAIN_SALE_DETAIL, MAIN_SALE_NOTE, SELL_RULES, SELL_RULES_LEAD } from "@/lib/market/sell-flow";
import { cn } from "@/lib/utils";
import { RailStackScope } from "../details/rail-block";
import { ListingBody } from "../details/rail-marketplace";
import { MintDetails } from "../details/rail-outcome";
import type { SlotProps } from "../details/slots";
import { useCommitGate } from "./ladder/level-check";
import { earnSourceOf } from "./ladder/use-earn-facts";
import { COPY_KINDS, CopyRow, EarnProducts, KindDot, RowButton, RowLink, SellRow, StateLines, WHOLE_PROJECT } from "./editions";
import { EARN_LINK, EARN_STACK, EarnBlock, TAP } from "./surface";

const LIST_HANDLED = ["videos", "ownership"] as const;

export function EarnSell(props: SlotProps) {
  return (
    <div className={EARN_STACK}>
      <SellRules />
      <WholeProject {...props} />
      <EarnProducts {...props} />
    </div>
  );
}

function SellRules() {
  return (
    <EarnBlock title="What you can sell" lead={SELL_RULES_LEAD} aside={<TestnetDemoBadge />}>
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 [@container(min-width:640px)]:grid-cols-3">
        {SELL_RULES.map((r) => (
          <li key={r.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-solid border-border bg-bg-surface p-6">
            <span className="flex items-center gap-3 text-md font-semibold leading-md text-text-primary">
              <KindDot kind={r.id} />
              {r.title}
            </span>
            <span className="text-sm leading-sm text-text-secondary">{r.line}</span>
            <span className="mt-1 text-sm font-semibold leading-sm text-text-tertiary">{r.where}</span>
          </li>
        ))}
      </ul>
    </EarnBlock>
  );
}

function WholeProject(props: SlotProps) {
  const { project, view, viewer, brief, announce } = props;
  const pair = earnPairOf(project, view.summary, brief, viewer, view.canCtx);
  const summaryOf = [pair.first, pair.second].find((a) => a?.kind === "view-brief") ?? null;
  const products = view.products.filter((p) => p.dropped === null).map((p) => displayProductName(p.name));
  return (
    <EarnBlock card title={`Whole project · ${project.name}`} lead={products.length ? products.join(" + ") : undefined}>
      <div className="-my-6 flex flex-col divide-y divide-border">
        <MainRow {...props} />
        {COPY_KINDS.map((kind) => (
          <CopyRow key={kind} {...props} kind={kind} scope={WHOLE_PROJECT} />
        ))}
      </div>
      <p className="m-0 rounded-xl bg-bg-subtle px-6 py-5 text-sm leading-sm text-text-secondary">
        <strong className="font-semibold text-text-primary">{MAIN_SALE_NOTE}</strong> {MAIN_SALE_DETAIL}
      </p>
      <MintDetails summary={view.summary} commerce={view.commerce} viewer={viewer} view={view} announce={announce}>
        {summaryOf && (
          <Link href={summaryOf.href} className={cn(EARN_LINK, "text-sm")}>
            Open the mint summary
            <Icon icon={ArrowRight01Icon} size={14} />
          </Link>
        )}
      </MintDetails>
    </EarnBlock>
  );
}

/** The Main NFT's row: its state, then Sell (the mint or the listing flow) or Manage (the listing's controls). */
function MainRow(props: SlotProps) {
  const { project, view, viewer, brief } = props;
  const pair = earnPairOf(project, view.summary, brief, viewer, view.canCtx);
  const actions = [pair.first, pair.second].filter((a): a is NextAction => a !== null);
  const listing = actions.find((a): a is Extract<NextAction, { kind: "add-to-marketplace" }> => a.kind === "add-to-marketplace") ?? null;
  const state = mainRowStateOf({
    status: view.summary.status,
    listing: view.listing,
    locked: view.lock !== null,
    canList: listing !== null,
    manage: can(viewer, "facts.seeOwnerOnly") && (view.listing.kind === "live" || view.listing.kind === "paused"),
  });
  const { check, ready } = useCommitGate("list", earnSourceOf(project, view, brief), { handled: LIST_HANDLED });
  const steps = state.action === "list" && ready && !check.ok;
  const [open, setOpen] = React.useState(false);
  // A listing just written opens its controls, where focus lands (MARKETPLACE_FOCUS_ID).
  const [seen, setSeen] = React.useState(view.listing.kind);
  if (seen !== view.listing.kind) {
    setSeen(view.listing.kind);
    if (view.listing.kind === "live" || view.listing.kind === "paused") setOpen(true);
  }
  const stateId = "state-main";
  const panelId = "manage-main";

  const action =
    state.action === "mint" ? (
      <RowLink href={earnMintHref(project.id)} label="Sell" />
    ) : state.action === "manage" ? (
      <RowButton id="sell-main" label="Manage" expanded={open} controls={panelId} onClick={() => setOpen((o) => !o)} />
    ) : state.action === "list" && listing ? (
      // A missing ladder step stands under the row in Sell's place.
      steps ? null : <ListingFlow {...props} action={listing} label={state.label} violet={false} className={cn("justify-center", TAP)} />
    ) : state.action === "none" || state.action === "list" ? null : (
      <RowButton id="sell-main" label={state.label} disabled describedBy={stateId} />
    );

  return (
    <SellRow kind="main" label="Main NFT" stateId={stateId} state={<StateLines lines={[state.line]} live={state.live} />} action={action}>
      {steps && listing && <ListingFlow {...props} action={listing} violet={false} className="" />}
      {state.action === "manage" && open && (
        <div id={panelId}>
          <RailStackScope className="flex flex-col gap-6">
            <ListingBody {...props} />
          </RailStackScope>
        </div>
      )}
    </SellRow>
  );
}
