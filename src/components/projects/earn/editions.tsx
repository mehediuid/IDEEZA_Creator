"use client";

// Earn › Sell › Copies of each product (`#copies`; Build and Earn P1-3): one
// row per product. On the left the product's name and what it sells, one line
// per listed track ("Design files · 3 of 30 sold · 0.05 MATIC"), or "Not
// selling". On the right one quiet button, Sell copies, which opens the
// guided flow (sell/sell-flow-dialog.tsx) — or, when a gate applies
// (`entryStateOf`, first match wins), the reason in plain words with a link
// to its fix: the mint flow, or the "Your project" card above, where the
// listing starts.
//
// A product with tracks keeps their controls under a native "Manage"
// disclosure: each kind's rows (editions/edition-block.tsx's
// `EditionTracks`, in plain words: Personal use, Copies sold 3 of 30, Price,
// Price with future updates), Add to marketplace, Edit, Remove listing and
// Add copies. The rows read `view` and ask `can(viewer, "editions.manage",
// view.canCtx)` themselves, so the Draft, Given and sold-in-full gates hide
// them as the block's gates always did. Nothing here is violet.
//
// The Testnet demo line heads the rows, once for every product. Each row is a
// region named by its product and addressed `#editions-<id>`. After a listing
// is signed, the sentence is said in the page's live region, shown under the
// row, and focus moves to the new track's Edit inside Manage.

import * as React from "react";
import Link from "next/link";
import { ArrowDown01Icon, ArrowRight01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { earnMintHref } from "@/lib/manual/earn-route";
import { editionProductsOf } from "@/lib/manual/earn-view";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { editionChainOf, tracksOf } from "@/lib/market/editions";
import { LISTING_TRIGGER_ID } from "@/lib/market/listing-flow";
import { entryStateOf, KIND_LABEL, NOT_SELLING, sellingLinesOf } from "@/lib/market/sell-flow";
import type { EditionKind } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { DemoLine } from "../editions/create-dialog";
import { EditionTracks } from "../editions/edition-block";
import { focusSoon } from "../listing/listing-dialog";
import { RailStackScope } from "../details/rail-block";
import type { SlotProps } from "../details/slots";
import { SellFlowDialog } from "./sell/sell-flow-dialog";
import { EARN_H3, EARN_LEAD, EarnBlock, TAP } from "./surface";

const KINDS: EditionKind[] = ["virtual", "physical"];
const LINK =
  "inline-flex min-h-[24px] items-center gap-2 self-start rounded-sm text-sm font-semibold text-text-link underline-offset-2 outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** The "Your project" card's id on the Sell tab: a gate's fix jumps up to it. */
export const YOUR_PROJECT_ID = "your-project";

export function EarnCopies({ project, view, viewer, now, announce }: SlotProps) {
  const products = editionProductsOf(view.products, view.editions);
  return (
    <EarnBlock id="copies" title="Copies of each product" lead="Sell copies of a product: its design files, or units you build and ship.">
      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className={EARN_LEAD}>No products yet. Copies are sold per product, so add one to the project first.</p>
          <Link
            href={`/projects/${encodeURIComponent(project.id)}`}
            // The reset colours every a:hover as a link; the button keeps its own text colour.
            className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "hover:text-[color:var(--color-button-secondary-text)]", TAP)}
          >
            Open products
          </Link>
        </div>
      ) : (
        <>
          <DemoLine />
          {/* The track cards' facts stack with the page, as a rail block's do. */}
          <RailStackScope>
            <div className="flex flex-col divide-y divide-border border-y border-solid border-border">
              {products.map((product) => (
                <EditionsRow key={product.id} {...{ project, view, viewer, now, announce, product }} />
              ))}
            </div>
          </RailStackScope>
        </>
      )}
    </EarnBlock>
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
          <h3 id={headingId} className={cn(EARN_H3, "break-words")}>
            {displayProductName(product.name)}
          </h3>
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
            {state.kind === "blocked" && state.link === "mint" && (
              <Link href={earnMintHref(project.id)} className={LINK}>
                Go to mint
                <Icon icon={ArrowRight01Icon} size={14} />
              </Link>
            )}
            {state.kind === "blocked" && state.link === "projectNft" && (
              <a href={`#${YOUR_PROJECT_ID}`} className={LINK}>
                Go to Your project
                <Icon icon={ArrowRight01Icon} size={14} />
              </a>
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
                <h4 className="m-0 text-sm font-semibold leading-sm text-text-primary">{KIND_LABEL[k]}</h4>
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
          onListingFix={() => {
            setOpen(false);
            focusSoon(LISTING_TRIGGER_ID);
          }}
        />
      )}
    </section>
  );
}
