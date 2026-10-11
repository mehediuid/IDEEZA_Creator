"use client";

// One of a product's two Earn › Editions entry cards (Build and Earn P1-3):
// "Sell the design" (a Virtual NFT: a licence plus the design files) or "Sell
// the product" (a Physical NFT, pre-order style). The card is the way into
// the guided flow (sell-flow-dialog.tsx); what's already created and listed
// is the caller's: the product's existing edition rows render under the card
// (`children`), with their Edit, Remove listing, Add to marketplace and Add
// NFTs controls.
//
// - Open: the whole card is the button (the Earn overview's card), quiet —
//   never violet. A paused Main listing adds that the NFTs stay hidden.
// - Gated: the edition block's gates (Draft, Given, sold in full, an
//   unknown collection, a dropped product) and then the Main listing
//   (`listGate`), first match wins. Each replaces the button with the reason
//   in plain words — no disabled card — and a missing listing links to
//   Earn › Project NFT.
// - Both uses on sale: it says so; their rows below hold every control.
// - Physical: the stored "How you'll make and ship it" note, once a listing
//   has been signed with it.
//
// After a listing is signed, the sentence is said in the page's live region,
// shown under the card, and focus moves to the new row's Edit.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { earnHref } from "@/lib/manual/earn-route";
import { can, type Viewer } from "@/lib/manual/permissions";
import type { ProjectProduct, ProjectView } from "@/lib/manual/project-read";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ManualProject } from "@/lib/manual/projects";
import { editionChainOf, KIND_WORD } from "@/lib/market/editions";
import { entryStateOf, FLOW_KIND, FLOW_TITLE, flowBlurbOf, type SellFlow } from "@/lib/market/sell-flow";
import { cn } from "@/lib/utils";
import { focusSoon } from "../../listing/listing-dialog";
import { SellFlowDialog } from "./sell-flow-dialog";
import { useSellTerms } from "./use-sell-terms";

const CARD = "flex w-full flex-col gap-3 rounded-2xl border border-solid border-border bg-bg-surface p-8 text-left";
const PRESSABLE =
  "group min-h-[var(--touch-min)] outline-none transition-colors duration-normal ease-out hover:border-border-strong hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none";
const LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-sm font-semibold text-text-link underline-offset-2 outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function SellEntryCard({
  flow,
  project,
  view,
  viewer,
  product,
  announce,
  children,
}: {
  flow: SellFlow;
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  product: ProjectProduct;
  announce: (message: string) => void;
  /** This product's existing edition rows of this kind, under the card. */
  children?: React.ReactNode;
}) {
  const brief = useProjectBrief(project.id) ?? null;
  const plan = useSellTerms(project.id).physical[product.id];
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const titleId = React.useId();
  const cardId = `sell-${flow}-${product.id}`;
  const kind = FLOW_KIND[flow];
  const name = displayProductName(product.name);
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, view.mint.status === "legacy" && brief ? brief.state : null);
  const status = view.summary.status;
  const state = entryStateOf({
    flow,
    productId: product.id,
    projectName: project.name,
    minted: status !== "draft" && view.mint.status !== "notMinted",
    given: status === "given",
    manage: can(viewer, "editions.manage", view.canCtx),
    chainKnown: chain !== null,
    dropped: product.dropped !== null,
    mainView: view.listing,
    tracks: view.editions,
  });

  const head = (
    <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span id={titleId} className="inline-flex items-center gap-2 text-md font-semibold text-text-primary">
        {FLOW_TITLE[flow]}
        {state.kind === "open" && (
          <span
            aria-hidden
            className="inline-flex text-text-tertiary transition-transform duration-normal ease-out group-hover:translate-x-1 motion-reduce:transition-none"
          >
            <Icon icon={ArrowRight01Icon} size={16} />
          </span>
        )}
      </span>
      <Badge tone="neutral">{KIND_WORD[kind]}</Badge>
    </span>
  );
  const blurb = <span className="text-sm leading-relaxed text-text-secondary">{flowBlurbOf(flow, name)}</span>;
  // The physical flow's stored note: what the maker promised buyers of this product.
  const shipNote = kind === "physical" && plan && (
    <span className="flex flex-col gap-1 border-l-2 border-solid border-border pl-4 text-sm leading-relaxed">
      <span className="font-semibold text-text-primary">How you&apos;ll make and ship it</span>
      <span className="whitespace-pre-line break-words text-text-secondary">{plan.note}</span>
    </span>
  );

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-6">
      {state.kind === "open" ? (
        <button
          id={cardId}
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            setNote(null);
            setOpen(true);
          }}
          className={cn(CARD, PRESSABLE)}
        >
          {head}
          {blurb}
          {shipNote}
          {state.note && <span className="text-sm leading-relaxed text-text-secondary">{state.note}</span>}
        </button>
      ) : (
        <div className={CARD}>
          {head}
          {blurb}
          {shipNote}
          <p className="m-0 text-sm leading-relaxed text-text-primary">{state.kind === "blocked" ? state.reason : state.line}</p>
          {state.kind === "blocked" && state.link === "projectNft" && (
            <Link href={earnHref(project.id, "sell")} className={LINK}>
              Go to Project NFT
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          )}
        </div>
      )}

      {note && (
        <p className="m-0 flex items-start gap-2 text-sm font-medium text-text-success">
          <span aria-hidden className="mt-[2px] inline-flex">
            <Icon icon={CheckmarkCircle02Icon} size={14} />
          </span>
          {note}
        </p>
      )}
      {children}

      {open && (
        <SellFlowDialog
          flow={flow}
          project={project}
          view={view}
          productId={product.id}
          onClose={() => {
            setOpen(false);
            focusSoon(cardId);
          }}
          onDone={(message, track) => {
            setOpen(false);
            setNote(message);
            announce(message);
            focusSoon(`edition-${track.id}-edit`);
          }}
        />
      )}
    </section>
  );
}
