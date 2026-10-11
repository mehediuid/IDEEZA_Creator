"use client";

// Earn › Editions (Build and Earn P1-3): one row per product. On the left the
// product's name and what it sells, one line per listed track ("Design files
// · 3 of 30 sold · 0.05 MATIC"), or "Not selling". On the right one quiet
// button, Sell copies, which opens the guided flow (sell/sell-flow-dialog.tsx)
// — or, when a gate applies (`entryStateOf`, first match wins), the reason
// in plain words with a link to its fix: the mint flow, or Earn › Project NFT.
//
// A product with tracks keeps their controls under a native "Manage"
// disclosure: each kind's rows (editions/edition-block.tsx's
// `EditionTracks`), Add to marketplace, Edit, Remove listing and Add copies.
// The rows read `view` and ask `can(viewer, "editions.manage", view.canCtx)`
// themselves, so the Draft, Given and sold-in-full gates hide them as the
// block's gates always did. Nothing here is violet.
//
// The Testnet demo line heads the section, once for every product. Each row
// is a region named by its product and addressed `#editions-<id>`, so the
// Marketplace block's Physical and Virtual summaries can link to it. After a
// listing is signed, the sentence is said in the page's live region, shown
// under the row, and focus moves to the new track's Edit inside Manage.

import * as React from "react";
import Link from "next/link";
import { ArrowDown01Icon, ArrowRight01Icon, CheckmarkCircle02Icon, PackageIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, StateCard } from "@/components/ideeza";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { earnHref, earnMintHref } from "@/lib/manual/earn-route";
import { editionProductsOf } from "@/lib/manual/earn-view";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { editionChainOf, tracksOf } from "@/lib/market/editions";
import { entryStateOf, KIND_LABEL, NOT_SELLING, sellingLinesOf } from "@/lib/market/sell-flow";
import type { EditionKind } from "@/lib/market/types";
import { DemoLine, TAP } from "../editions/create-dialog";
import { EditionTracks } from "../editions/edition-block";
import { focusSoon } from "../listing/listing-dialog";
import type { SlotProps } from "../details/slots";
import { SellFlowDialog } from "./sell/sell-flow-dialog";

const KINDS: EditionKind[] = ["virtual", "physical"];
const LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-sm font-semibold text-text-link underline-offset-2 outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function EarnEditions({ project, view, viewer, now, announce }: SlotProps) {
  const products = editionProductsOf(view.products, view.editions);
  if (products.length === 0) {
    return (
      <StateCard
        tone="empty"
        icon={<Icon icon={PackageIcon} size={32} />}
        title="No products yet"
        body="Editions are sold per product. Add a product to the project first."
        className="mx-auto"
      />
    );
  }
  return (
    <div className="flex max-w-[720px] flex-col gap-8">
      <DemoLine />
      <div className="flex flex-col divide-y divide-border border-y border-solid border-border">
        {products.map((product) => (
          <EditionsRow key={product.id} {...{ project, view, viewer, now, announce, product }} />
        ))}
      </div>
    </div>
  );
}

function EditionsRow({ product, ...rest }: Omit<SlotProps, "brief"> & { product: ProjectProduct }) {
  const { project, view, viewer, announce } = rest;
  const headingId = React.useId();
  const brief = useProjectBrief(project.id) ?? null;
  const [open, setOpen] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const buttonId = `sell-${product.id}`;
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, view.mint.status === "legacy" && brief ? brief.state : null);
  const status = view.summary.status;
  const minted = status !== "draft" && view.mint.status !== "notMinted";
  const given = status === "given";
  const manage = can(viewer, "editions.manage", view.canCtx);
  const state = entryStateOf({
    productId: product.id,
    projectName: project.name,
    minted,
    given,
    manage,
    chainKnown: chain !== null,
    dropped: product.dropped !== null,
    mainView: view.listing,
    tracks: view.editions,
  });
  const lines = sellingLinesOf(product.id, view.editions, view.sales);
  const mine = tracksOf(product.id, view.editions);
  // `EditionTracks` renders nothing behind these gates, so Manage would be empty.
  const managed = mine.length > 0 && minted && !given && manage && chain !== null;

  return (
    <section id={`editions-${product.id}`} aria-labelledby={headingId} className="flex scroll-mt-10 flex-col gap-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 flex-1 basis-[240px] flex-col gap-2">
          <h2 id={headingId} className="m-0 break-words text-lg font-bold text-text-primary">
            {displayProductName(product.name)}
          </h2>
          {lines.length ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {lines.map((line, i) => (
                <li key={i} className="text-sm tabular-nums text-text-secondary">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-text-secondary">{NOT_SELLING}</p>
          )}
        </div>
        {state.kind === "open" ? (
          <Button
            id={buttonId}
            type="button"
            hierarchy="secondary"
            size="md"
            aria-haspopup="dialog"
            className={TAP}
            onClick={() => {
              setNote(null);
              setOpen(true);
            }}
          >
            Sell copies
          </Button>
        ) : (
          <div className="flex min-w-0 max-w-[40ch] flex-1 basis-[240px] flex-col gap-2">
            <p className="m-0 text-sm leading-relaxed text-text-primary">{state.kind === "blocked" ? state.reason : state.line}</p>
            {state.kind === "blocked" && state.link && (
              <Link href={state.link === "mint" ? earnMintHref(project.id) : earnHref(project.id, "sell")} className={LINK}>
                {state.link === "mint" ? "Go to mint" : "Go to Project NFT"}
                <Icon icon={ArrowRight01Icon} size={14} />
              </Link>
            )}
          </div>
        )}
      </div>

      {note && (
        <p className="m-0 flex items-start gap-2 text-sm font-medium text-text-success">
          <span aria-hidden className="mt-[2px] inline-flex">
            <Icon icon={CheckmarkCircle02Icon} size={14} />
          </span>
          {note}
        </p>
      )}

      {managed && (
        <details open={manageOpen} onToggle={(e) => setManageOpen(e.currentTarget.open)} className="group flex flex-col">
          <summary className="inline-flex min-h-[var(--touch-min)] cursor-pointer list-none items-center gap-2 self-start rounded-sm text-sm font-semibold text-text-primary outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus [&::-webkit-details-marker]:hidden">
            Manage
            <span
              aria-hidden
              className="inline-flex text-text-tertiary transition-transform duration-normal ease-out group-open:rotate-180 motion-reduce:transition-none"
            >
              <Icon icon={ArrowDown01Icon} size={16} />
            </span>
          </summary>
          <div className="flex flex-col gap-8 pt-4">
            {KINDS.filter((k) => mine.some((t) => t.kind === k)).map((k) => (
              <div key={k} className="flex flex-col gap-4">
                <h3 className="m-0 text-sm font-semibold text-text-primary">{KIND_LABEL[k]}</h3>
                <EditionTracks kind={k} product={product} {...rest} />
              </div>
            ))}
          </div>
        </details>
      )}

      {open && (
        <SellFlowDialog
          project={project}
          view={view}
          productId={product.id}
          onClose={() => {
            setOpen(false);
            focusSoon(buttonId);
          }}
          onDone={(message, track) => {
            setOpen(false);
            setNote(message);
            announce(message);
            setManageOpen(true);
            focusSoon(`edition-${track.id}-edit`);
          }}
        />
      )}
    </section>
  );
}
