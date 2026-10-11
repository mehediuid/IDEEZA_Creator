"use client";

// Earn › Sell's rows (owner's selling rules, 2026-10-11; the approved sell-flow
// mockup). A row is one thing that can be sold: its kind beside a dot, its
// state in words, and ONE quiet button, Sell or Manage.
//
// - `SellRow` is the row's frame: three columns from 560 px, two below it,
//   where the state wraps under the kind. The Main NFT's row (sell.tsx) uses it
//   too, so every row reads the same.
// - `CopyRow` is a Physical or Virtual row of one scope: the whole project
//   (`PROJECT_SCOPE`) or one product. Its state is `copyRowStateOf`, first
//   match wins, and never asks the Main listing: copies are listed on their
//   own. Sell opens the copies flow (sell/sell-flow-dialog.tsx) with the kind
//   preset; not minted, Sell is the mint flow; another gate (Given, sold in
//   full, an unknown collection, a dropped product) greys it, with the reason
//   as the state. Manage opens the scope's tracks of that kind under the row
//   (editions/edition-block.tsx's `EditionTracks`: Edit, Remove listing, Add
//   copies, in plain words), with "Sell {use} copies too" while the other use
//   is open.
// - `EarnProducts` is "One product at a time" (`#copies`): per product, its
//   two rows. Products sell copies only, never a Main NFT.
//
// After a listing is signed, the sentence is said in the page's live region,
// shown under the row, Manage opens and focus moves to the new track's Edit.
// Nothing here is violet.

import * as React from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { earnMintHref } from "@/lib/manual/earn-route";
import { editionProductsOf } from "@/lib/manual/earn-view";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { editionChainOf } from "@/lib/market/editions";
import { copyRowStateOf, KIND_LABEL, USE_LABEL } from "@/lib/market/sell-flow";
import { PROJECT_SCOPE, type EditionKind, type EditionUse } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { EditionTracks, type CopyScope } from "../editions/edition-block";
import { focusSoon } from "../listing/listing-dialog";
import { RailStackScope } from "../details/rail-block";
import type { SlotProps } from "../details/slots";
import { SellFlowDialog } from "./sell/sell-flow-dialog";
import { EARN_H3, EARN_LEAD, EarnBlock, TAP } from "./surface";

/** Physical before Virtual, as the mockup lists them. */
export const COPY_KINDS: EditionKind[] = ["physical", "virtual"];

const DOT: Record<"main" | EditionKind, string> = { main: "bg-bg-brand", physical: "bg-bg-warning", virtual: "bg-bg-info" };

/** A kind's dot: colour helps, the word beside it carries the meaning. */
export function KindDot({ kind }: { kind: "main" | EditionKind }) {
  return <span aria-hidden className={cn("inline-block size-[10px] shrink-0 rounded-full", DOT[kind])} />;
}

/** A row's one button, quiet: 44 px at phone width and on a coarse pointer. */
export const ROW_BUTTON = cn("min-w-[88px]", TAP);

/** One sellable thing: kind · state · its one button, and what opens under it. */
export function SellRow({
  kind,
  label,
  state,
  stateId,
  action,
  children,
}: {
  kind: "main" | EditionKind;
  label: string;
  state: React.ReactNode;
  /** The state's id, for the button's aria-describedby. */
  stateId: string;
  action: React.ReactNode;
  /** Under the row: Manage's controls, a note. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 [@container(min-width:560px)]:grid-cols-[144px_minmax(0,1fr)_auto]">
        <span className="flex min-w-0 items-center gap-3 text-md font-semibold leading-md text-text-primary">
          <KindDot kind={kind} />
          {label}
        </span>
        <div
          id={stateId}
          className="order-3 col-span-2 min-w-0 text-sm leading-sm text-text-secondary [@container(min-width:560px)]:order-none [@container(min-width:560px)]:col-span-1"
        >
          {state}
        </div>
        <div className="flex justify-end">{action}</div>
      </div>
      {children}
    </div>
  );
}

/** The state's lines: one, or one per listed use. */
export function StateLines({ lines, live = false }: { lines: string[]; live?: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {lines.map((line, i) => (
        <li key={i} className={cn("break-words tabular-nums", live && "font-medium text-text-success")}>
          {line}
        </li>
      ))}
    </ul>
  );
}

/** The quiet Sell / Manage button. `disabled` stays focusable and says why (`describedBy`). */
export function RowButton({
  id,
  label,
  onClick,
  disabled = false,
  describedBy,
  expanded,
  controls,
}: {
  id?: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  describedBy?: string;
  expanded?: boolean;
  controls?: string;
}) {
  return (
    <Button
      id={id}
      type="button"
      hierarchy="secondary"
      size="md"
      aria-disabled={disabled || undefined}
      aria-describedby={disabled ? describedBy : undefined}
      aria-expanded={expanded}
      aria-controls={expanded ? controls : undefined}
      aria-haspopup={expanded === undefined && !disabled ? "dialog" : undefined}
      className={cn(ROW_BUTTON, disabled && "cursor-not-allowed opacity-60")}
      onClick={() => {
        if (!disabled) onClick?.();
      }}
    >
      {label}
    </Button>
  );
}

/** Sell as a link (the mint flow), dressed as the quiet button. */
export function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      // The reset colours every a:hover as a link; the button keeps its own text colour.
      className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "hover:text-[color:var(--color-button-secondary-text)]", ROW_BUTTON)}
    >
      {label}
    </Link>
  );
}

export function DoneNote({ note }: { note: string }) {
  return (
    <p className="m-0 flex items-start gap-2 text-sm font-medium text-text-success">
      <span aria-hidden className="mt-[2px] inline-flex">
        <Icon icon={CheckmarkCircle02Icon} size={14} />
      </span>
      {note}
    </p>
  );
}

/** The whole project's scope: its copies are named "Whole project" beside the project. */
export const WHOLE_PROJECT: CopyScope = { id: PROJECT_SCOPE, name: "Whole project", product: null };

/** A Physical or Virtual row of one scope. */
export function CopyRow({ kind, scope, ...props }: SlotProps & { kind: EditionKind; scope: CopyScope }) {
  const { project, view, viewer, announce } = props;
  const brief = useProjectBrief(project.id) ?? null;
  const [dialog, setDialog] = React.useState<{ use: EditionUse | null } | null>(null);
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const base = `${scope.id}-${kind}`;
  const buttonId = `sell-${base}`;
  const stateId = `state-${base}`;
  const panelId = `manage-${base}`;
  const main = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, main, view.mint.status === "legacy" && brief ? brief.state : null);
  const status = view.summary.status;
  const state = copyRowStateOf({
    productId: scope.id,
    kind,
    projectName: project.name,
    minted: status !== "draft" && view.mint.status !== "notMinted",
    given: status === "given",
    manage: can(viewer, "editions.manage", view.canCtx),
    chainKnown: chain !== null,
    dropped: scope.product !== null && scope.product.dropped !== null,
    tracks: view.editions,
    sales: view.sales,
  });

  const sell = (use: EditionUse | null) => {
    setNote(null);
    setDialog({ use });
  };

  const action =
    state.kind === "manage" ? (
      <RowButton id={buttonId} label="Manage" expanded={open} controls={panelId} onClick={() => setOpen((o) => !o)} />
    ) : state.kind === "sell" ? (
      <RowButton id={buttonId} label="Sell" onClick={() => sell(null)} />
    ) : state.link === "mint" ? (
      <RowLink href={earnMintHref(project.id)} label="Sell" />
    ) : (
      <RowButton id={buttonId} label="Sell" disabled describedBy={stateId} />
    );

  return (
    <SellRow
      kind={kind}
      label={KIND_LABEL[kind]}
      stateId={stateId}
      state={state.kind === "manage" ? <StateLines lines={state.lines} live /> : <StateLines lines={[state.line]} />}
      action={action}
    >
      {note && <DoneNote note={note} />}
      {state.kind === "manage" && open && (
        <div id={panelId} className="flex flex-col gap-6">
          {/* The track cards' facts stack with the page, as a rail block's do. */}
          <RailStackScope>
            <EditionTracks kind={kind} scope={scope} project={project} view={view} viewer={viewer} now={props.now} announce={announce} />
          </RailStackScope>
          {state.more && (
            <Button
              type="button"
              hierarchy="secondary"
              size="md"
              aria-haspopup="dialog"
              className={cn("self-start", TAP)}
              onClick={() => sell(state.more)}
            >
              {`Sell ${USE_LABEL[state.more].toLowerCase()} copies too`}
            </Button>
          )}
        </div>
      )}
      {dialog && (
        <SellFlowDialog
          project={project}
          view={view}
          scope={scope}
          kind={kind}
          use={dialog.use}
          onClose={() => {
            setDialog(null);
            focusSoon(buttonId);
          }}
          onDone={(message, track) => {
            setDialog(null);
            setNote(message);
            announce(message);
            setOpen(true);
            focusSoon(`edition-${track.id}-edit`);
          }}
        />
      )}
    </SellRow>
  );
}

/** "One product at a time": each product's Physical and Virtual rows (`#copies`). */
export function EarnProducts(props: SlotProps) {
  const { project, view } = props;
  const products = editionProductsOf(view.products, view.editions);
  return (
    <EarnBlock id="copies" card title="One product at a time" lead="Products sell copies only, not a Main NFT.">
      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className={EARN_LEAD}>No products yet. Add one to the project to sell its copies.</p>
          <Link
            href={`/projects/${encodeURIComponent(project.id)}`}
            // The reset colours every a:hover as a link; the button keeps its own text colour.
            className={cn(buttonVariants({ hierarchy: "secondary", size: "md" }), "hover:text-[color:var(--color-button-secondary-text)]", TAP)}
          >
            Open products
          </Link>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {products.map((product) => {
            const name = displayProductName(product.name);
            const scope: CopyScope = { id: product.id, name, product };
            return (
              <section key={product.id} id={`editions-${product.id}`} aria-label={name} className="flex scroll-mt-10 flex-col pt-6 first:pt-0">
                <h3 className={cn(EARN_H3, "break-words")}>{name}</h3>
                <div className="flex flex-col">
                  {COPY_KINDS.map((kind) => (
                    <CopyRow key={kind} {...props} kind={kind} scope={scope} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </EarnBlock>
  );
}
