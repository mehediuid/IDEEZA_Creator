"use client";

// Earn › Sell's item panel (owner, 2026-11-18, the Sell desk plan, A with
// every recommendation): the one home for the tile picked on the board (D4).
// It sits in the page frame's rail beside the board; under a 1024 px page it
// opens from the side as the DS Drawer when a tile is tapped (owner,
// 2026-11-18: "on a small screen the info goes far below — open it from the
// side"), with the item's title in the drawer's header.
//
// Every control here is the one the row had, unchanged:
// - Main NFT: before the mint, the mint flow (sell intent); minted and not
//   listed, ListingFlow ("Before you can list" while a ladder step is missing);
//   listed or paused, the listing's own controls (ListingBody: Edit, Remove,
//   Relist, Bidding history, Close auction); sold in full, a receipt (D11).
// - A Physical or Virtual tile: Sell opens the Sell copies flow with the kind
//   preset; listed, the scope's tracks (EditionTracks: Edit, Remove listing,
//   Add copies) and "Sell … copies too" while the other use is open.
// - The NFT's Activity (D9: here rather than under every row).
// Added (D6–D8): what it sold and earned, who bought it last, and what buyers
// see — the project's own Explore marketplace card — with the way there.
// At most one violet control: the panel's Sell or Mint.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, CheckmarkCircle02Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza";
import { ListingCard } from "@/components/marketplace/listing-card";
import { useCreator } from "@/components/marketplace/use-creator-name";
import { getPaidHref } from "@/lib/account/get-paid-href";
import { withReturn } from "@/lib/account/return-to";
import { payoutLinesText } from "@/lib/commerce/payout";
import { earnHref, earnMintHref } from "@/lib/manual/earn-route";
import { formatShortDate, formatDate, type NextAction } from "@/lib/manual/project-summary";
import { marketItemsOf } from "@/lib/market/market-list";
import {
  allSalesLineOf,
  boughtByOf,
  DESK_KIND_LINE,
  deskTitleOf,
  earnedTextOf,
  marketHrefOf,
  NO_SALES_LINE,
  RECENT_SALES_SHOWN,
  saleWhatOf,
  SOLD_OUT_NOTE,
  type DeskKind,
  type DeskTile,
} from "@/lib/market/sell-desk";
import { USE_LABEL, type CopyRowState } from "@/lib/market/sell-flow";
import type { EditionKind, EditionUse, Sale } from "@/lib/market/types";
import { buyerLabel } from "@/lib/wallet/identities";
import { formatAmount } from "@/lib/wallet/money";
import { cn } from "@/lib/utils";
import { RailStackScope } from "../../details/rail-block";
import { ListingBody } from "../../details/rail-marketplace";
import type { SlotProps } from "../../details/slots";
import { EditionTracks, type CopyScope } from "../../editions/edition-block";
import { focusSoon } from "../../listing/listing-dialog";
import { ListingFlow } from "../../listing/listing-flow";
import { HeldBlock } from "@/components/video-jobs/held-block";
import { heldOf, useHeld } from "@/lib/market/held";
import { NftActivityLine } from "../nft-activity";
import { EARN_LINK, TAP } from "../surface";
import { DeskChip, KIND_NAME, KindMark, SoldMeter } from "./board";
import { SellFlowDialog } from "./sell-flow-dialog";

const SECTION = "flex min-w-0 flex-col gap-6 px-10 py-9";
const LABEL = "m-0 text-md font-semibold leading-md text-text-primary";
const NOTE = "m-0 text-md leading-md text-text-secondary";
const SMALL = "m-0 text-sm leading-sm text-text-tertiary";
const BIG = cn(TAP, "w-full justify-center");

export type MainDesk = {
  tile: DeskTile;
  /** `mainRowStateOf`: its line and what the row's button did. */
  state: { line: string; action: "mint" | "list" | "manage" | "disabled" | "none"; label: string };
  /** The project's "Add to marketplace" / "List another share" action, when listing is open. */
  listing: Extract<NextAction, { kind: "add-to-marketplace" }> | null;
};

export type CopyDesk = { tile: DeskTile; state: CopyRowState; scope: CopyScope; kind: EditionKind };

/** The panel's frame beside the board: one surface card, its parts divided, held in view while the board scrolls. */
export function PanelFrame({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <aside
      id={id}
      aria-label="Selected item"
      className="sticky top-8 flex min-w-0 flex-col divide-y divide-border rounded-2xl border border-solid border-border bg-bg-surface"
    >
      {children}
    </aside>
  );
}

/** True inside the drawer (under a 1024 px page): its header already says the item's kind and title. */
const InDrawer = React.createContext(false);
export const PanelInDrawer = InDrawer.Provider;

/** The drawer's title and line for an item: what the panel's head says beside the board. */
export function panelHeadOf(
  item: { kind: "draft" } | { kind: DeskKind; scopeName: string | null },
  projectName: string,
): { title: string; description: string } {
  if (item.kind === "draft") return { title: `Mint ${projectName} to start selling`, description: "Not minted yet" };
  if (item.kind === "main") return { title: projectName, description: `${KIND_NAME.main} · ${MAIN_SUB}` };
  return { title: deskTitleOf(item.kind, item.scopeName, projectName), description: `${KIND_NAME[item.kind]} · ${DESK_KIND_LINE[item.kind]}` };
}

const MAIN_SUB = "The project itself. Whoever buys it gets everything inside it.";

function Head({ kind, title, sub, chip, lines }: { kind: DeskKind; title: string; sub: string; chip: DeskTile["chip"]; lines: string[] }) {
  const inDrawer = React.useContext(InDrawer);
  return (
    <div className={SECTION}>
      <div className={cn("flex min-w-0 flex-col gap-2", inDrawer && "hidden")}>
        <span className="flex items-center gap-4 text-sm font-semibold leading-sm text-text-tertiary">
          <KindMark kind={kind} size="sm" />
          {KIND_NAME[kind]}
        </span>
        <h3 className="m-0 break-words text-xl font-semibold leading-xl text-text-primary">{title}</h3>
        <p className={NOTE}>{sub}</p>
      </div>
      <div className="flex min-w-0 flex-col items-start gap-3">
        <DeskChip chip={chip} />
        {lines.filter((l) => l !== chip.label).length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-md leading-md text-text-secondary tabular-nums">
            {lines.filter((l) => l !== chip.label).map((l) => (
              <li key={l} className="break-words">
                {l}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Sold, earned, bought by, last sale: the Overview's fact boxes, for this one item. */
function Numbers({ tile, now, soldValue }: { tile: DeskTile; now: number; soldValue: string }) {
  const facts: { label: string; value: string; meter?: boolean }[] = [
    { label: "Sold", value: soldValue, meter: true },
    { label: "Earned", value: earnedTextOf(tile.earned) },
    { label: "Bought by", value: boughtByOf(tile.buyers) },
    { label: "Last sale", value: tile.lastSaleAt ? formatShortDate(tile.lastSaleAt, now) : "—" },
  ];
  return (
    <dl className="m-0 grid grid-cols-2 gap-4">
      {facts.map((f) => (
        <div key={f.label} className="flex min-w-0 flex-col gap-1 rounded-xl bg-bg-subtle px-6 py-5">
          <dt className="text-sm font-medium leading-sm text-text-secondary">{f.label}</dt>
          <dd className="m-0 break-words text-md font-semibold leading-md text-text-primary tabular-nums">{f.value}</dd>
          {f.meter && tile.meter && <SoldMeter meter={tile.meter} label={`Sold ${tile.soldLine ?? ""}`} />}
        </div>
      ))}
    </dl>
  );
}

/** The item's last three sales, each by the buyer's relation (a person, never a type), with the way to all of them. */
function RecentSales({ sales, now, projectId }: { sales: Sale[]; now: number; projectId: string }) {
  return (
    <div className={SECTION}>
      <h4 className={LABEL}>Recent sales</h4>
      {sales.length === 0 ? (
        <p className={NOTE}>{NO_SALES_LINE}</p>
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {sales.slice(0, RECENT_SALES_SHOWN).map((s) => {
              const who = buyerLabel(s.buyerId);
              return (
                <li key={s.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-5">
                  <span aria-hidden className="inline-flex size-[32px] items-center justify-center rounded-full bg-bg-subtle text-sm font-semibold text-text-secondary">
                    {who.slice(0, 1)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-md leading-md text-text-primary">{who}</span>
                    <span className="truncate text-sm leading-sm text-text-tertiary">{saleWhatOf(s)}</span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="text-md font-semibold leading-md text-text-primary tabular-nums">{formatAmount(s.price, s.token)}</span>
                    <span className="text-sm leading-sm text-text-tertiary">{formatShortDate(s.at, now)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <Link href={earnHref(projectId, "customers")} className={EARN_LINK}>
            {allSalesLineOf(sales.length)}
            <Icon icon={ArrowRight01Icon} size={14} />
          </Link>
        </>
      )}
    </div>
  );
}

/** What buyers see: this project's own Explore marketplace card, and the way to the tile's page there. */
function BuyerView({ project, view, now, tile }: Pick<SlotProps, "project" | "view" | "now"> & { tile: DeskTile }) {
  const me = useCreator();
  const item = React.useMemo(() => {
    const listing = "listing" in view.listing ? [view.listing.listing] : [];
    const like = [{ id: project.id, name: project.name, cover: view.summary.cover, productCount: view.products.filter((p) => p.dropped === null).length, locked: view.lock !== null }];
    const items = marketItemsOf(listing, like, view.sales, view.bids, null, now, view.editions);
    return items.find((i) => i.status !== "sold") ?? items[0] ?? null;
  }, [project.id, project.name, view.listing, view.summary.cover, view.products, view.lock, view.sales, view.bids, view.editions, now]);
  return (
    <div className={SECTION}>
      <h4 className={LABEL}>What buyers see</h4>
      {item ? (
        <div className="max-w-[360px]">
          <ListingCard item={item} tab={item.status === "sold" ? "sold" : "forSale"} now={now} heldPct={null} creator={me.name} stats={null} />
        </div>
      ) : (
        <p className={NOTE}>Not on Explore marketplace yet. Once something here is on sale, buyers find it there.</p>
      )}
      {tile.live && (
        <a href={marketHrefOf(project.id, tile.scope, tile.kind)} target="_blank" rel="noreferrer" className={EARN_LINK}>
          View on marketplace
          <Icon icon={LinkSquare02Icon} size={14} />
        </a>
      )}
    </div>
  );
}

function Activity(props: SlotProps & { target: Parameters<typeof NftActivityLine>[0]["target"] }) {
  // The line renders nothing for a reader with no entries (a project sold in full): no empty band then.
  return (
    <div className={cn(SECTION, "empty:hidden")}>
      <NftActivityLine {...props} />
    </div>
  );
}

// ───────────────────────── Main NFT ─────────────────────────

export function MainPanel(props: SlotProps & { desk: MainDesk }) {
  const { project, view, now, desk } = props;
  const { tile, state, listing } = desk;
  const minted = view.summary.status !== "draft" && view.mint.status !== "notMinted";
  const locked = view.lock !== null;
  const mainSale = view.customers.mainSale;
  const pct = tile.meter?.sold ?? 0;
  // Signed and waiting for its videos (owner, 2026-11-18): the head says so, ListingFlow shows it.
  const { store: heldStore } = useHeld();
  const waiting = heldOf(heldStore, project.id).some((i) => i.kind === "main");
  return (
    <>
      <Head kind="main" title={project.name} sub={MAIN_SUB} chip={tile.chip} lines={[waiting ? "Signed · goes live when its videos are ready" : state.line]} />

      {locked && mainSale ? (
        <div className={SECTION}>
          <h4 className={LABEL}>Receipt</h4>
          <span className="text-3xl font-semibold leading-3xl text-text-primary tabular-nums">{formatAmount(mainSale.price.amount, mainSale.price.token)}</span>
          <dl className="m-0 grid grid-cols-2 gap-4">
            {[
              { label: "Bought by", value: mainSale.buyer },
              { label: "You got", value: payoutLinesText(tile.earned) || formatAmount(mainSale.payout, mainSale.price.token) },
              { label: "Date", value: formatDate(mainSale.at) },
              { label: "Share", value: `${pct}% of the project` },
            ].map((f) => (
              <div key={f.label} className="flex min-w-0 flex-col gap-1 rounded-xl bg-bg-subtle px-6 py-5">
                <dt className="text-sm font-medium leading-sm text-text-secondary">{f.label}</dt>
                <dd className="m-0 break-words text-md font-semibold leading-md text-text-primary">{f.value}</dd>
              </div>
            ))}
          </dl>
          <p className={NOTE}>It&apos;s theirs now, so this project is read-only. The payment joined your balance in Get paid.</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Link href={earnHref(project.id, "customers", { sale: mainSale.saleId })} className={EARN_LINK}>
              See this sale in Money
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
            <Link href={withReturn(getPaidHref("balance"), earnHref(project.id, "sell"))} className={EARN_LINK}>
              Get paid
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          </div>
        </div>
      ) : state.action === "mint" ? (
        <div className={SECTION}>
          <p className={NOTE}>Minting saves {project.name} as an NFT in your name. With Sell chosen, it goes on Explore marketplace as it mints.</p>
          <Link href={earnMintHref(project.id, "sell")} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), BIG, "hover:text-[color:var(--color-button-primary-text)]")}>
            Mint and sell the project
          </Link>
        </div>
      ) : state.action === "list" && listing ? (
        <div className={SECTION}>
          {!waiting && (
            <p className={NOTE}>
              {pct > 0
                ? `${pct}% is sold. Put more of it on sale, at a fixed price or as an auction.`
                : "Put it on Explore marketplace at a fixed price or as an auction, all of it or a share."}
            </p>
          )}
          <ListingFlow {...props} action={listing} label={pct > 0 ? undefined : "Sell the Main NFT"} violet className={BIG} />
        </div>
      ) : state.action === "manage" ? (
        <div className={SECTION}>
          <RailStackScope className="flex flex-col gap-6">
            <ListingBody {...props} />
          </RailStackScope>
        </div>
      ) : null}

      {minted && !locked && (tile.meter || tile.sales.length > 0) && (
        <div className={SECTION}>
          <Numbers tile={tile} now={now} soldValue={`${pct}% of it`} />
        </div>
      )}
      {minted && <Activity {...props} target={{ kind: "main" }} />}
      {minted && !locked && <RecentSales sales={tile.sales} now={now} projectId={project.id} />}
      {minted && <BuyerView project={project} view={view} now={now} tile={tile} />}
    </>
  );
}

// ───────────────────────── a Physical or Virtual tile ─────────────────────────

export function CopyPanel(props: SlotProps & { desk: CopyDesk }) {
  const { project, view, viewer, now, announce, desk } = props;
  const { tile, state, scope, kind } = desk;
  const [dialog, setDialog] = React.useState<{ use: EditionUse | null } | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const sellId = `sell-${scope.id}-${kind}`;
  const word = kind === "physical" ? "physical" : "virtual";
  const title = deskTitleOf(kind, scope.product ? scope.name : null, project.name);
  const hasTracks = view.editions.some((t) => t.productId === scope.id && t.kind === kind);
  const lines = state.kind === "manage" ? state.lines : [state.line];
  const soldOut = tile.chip.label === "Sold out";

  const sell = (use: EditionUse | null) => {
    setNote(null);
    setDialog({ use });
  };
  // Signed while a video was still being made (owner, 2026-11-18): waiting, not for sale yet.
  const { store: held } = useHeld();
  const waiting = heldOf(held, project.id).find((i) => i.kind === "copies" && i.scope === scope.id && i.kindOfCopy === kind);

  return (
    <>
      <Head kind={kind} title={title} sub={DESK_KIND_LINE[kind]} chip={tile.chip} lines={lines} />

      {waiting && (
        <div className={SECTION}>
          <HeldBlock item={waiting} projectId={project.id} products={view.products} onCancelled={announce} />
        </div>
      )}

      {state.kind === "sell" && !waiting && (
        <div className={SECTION}>
          <p className={NOTE}>
            {kind === "physical"
              ? "Set how many you can make, the price, and how you'll make and ship them. Two steps, then you sign."
              : "Set how many copies and the price. Buyers download the design files with your licence. Two steps, then you sign."}
          </p>
          <Button id={sellId} type="button" hierarchy="primary" size="lg" aria-haspopup="dialog" className={BIG} onClick={() => sell(null)}>
            {`Sell ${word} copies`}
          </Button>
          <p className={SMALL}>Copies are listed on their own. The Main NFT doesn&apos;t need to be listed.</p>
        </div>
      )}

      {state.kind === "blocked" && (
        <div className={SECTION}>
          {state.link === "mint" ? (
            <>
              <p className={NOTE}>Copies need the project minted first. Mint it privately (nothing goes on sale), then sell copies here.</p>
              <Link href={earnMintHref(project.id, "save")} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), BIG, "hover:text-[color:var(--color-button-primary-text)]")}>
                Mint privately
              </Link>
            </>
          ) : (
            <p className={NOTE}>{state.line}</p>
          )}
        </div>
      )}

      {state.kind === "manage" && (
        <div className={SECTION}>
          {soldOut && <p className={NOTE}>{SOLD_OUT_NOTE}</p>}
          <Numbers tile={tile} now={now} soldValue={tile.soldLine?.replace(" sold", "") ?? "—"} />
        </div>
      )}

      {(state.kind === "manage" || note) && (
        <div className={SECTION}>
          {note && (
            <p className="m-0 flex items-start gap-2 text-md font-medium text-text-success">
              <span aria-hidden className="mt-[2px] inline-flex">
                <Icon icon={CheckmarkCircle02Icon} size={14} />
              </span>
              {note}
            </p>
          )}
          {state.kind === "manage" && (
            <RailStackScope className="flex flex-col gap-6">
              <EditionTracks kind={kind} scope={scope} project={project} view={view} viewer={viewer} now={now} announce={announce} />
            </RailStackScope>
          )}
          {state.kind === "manage" && state.more && (
            <Button id={sellId} type="button" hierarchy="secondary" size="md" aria-haspopup="dialog" className={cn("self-start", TAP)} onClick={() => sell(state.more)}>
              {`Sell ${USE_LABEL[state.more].toLowerCase()} copies too`}
            </Button>
          )}
        </div>
      )}

      {hasTracks && <Activity {...props} target={{ kind, scope: scope.id }} />}
      {hasTracks && <RecentSales sales={tile.sales} now={now} projectId={project.id} />}
      {state.kind !== "blocked" || hasTracks ? <BuyerView project={project} view={view} now={now} tile={tile} /> : null}

      {dialog && (
        <SellFlowDialog
          project={project}
          view={view}
          scope={scope}
          kind={kind}
          use={dialog.use}
          onClose={() => {
            setDialog(null);
            focusSoon(sellId);
          }}
          onDone={(message, track) => {
            setDialog(null);
            setNote(message);
            announce(message);
            focusSoon(`edition-${track.id}-edit`);
          }}
        />
      )}
    </>
  );
}

// ───────────────────────── before the mint ─────────────────────────

/** D10: nothing is minted, so the board is one band and the panel offers the mint's two ways. */
export function DraftPanel({ project }: Pick<SlotProps, "project">) {
  const inDrawer = React.useContext(InDrawer);
  return (
    <>
      <div className={SECTION}>
        <div className={cn("flex min-w-0 flex-col gap-2", inDrawer && "hidden")}>
          <span className="text-sm font-semibold leading-sm text-text-tertiary">Not minted yet</span>
          <h3 className="m-0 break-words text-xl font-semibold leading-xl text-text-primary">Mint {project.name} to start selling</h3>
        </div>
        <p className={NOTE}>Minting saves {project.name} as an NFT in your name. After that, each thing on the board is listed on its own.</p>
      </div>
      <div className={SECTION}>
        <Link href={earnMintHref(project.id, "sell")} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), BIG, "hover:text-[color:var(--color-button-primary-text)]")}>
          Mint and sell the project
        </Link>
        <p className={SMALL}>Opens the mint with Sell chosen: it goes on Explore marketplace as it mints. This sells the Main NFT, the project itself.</p>
        <Link
          href={earnMintHref(project.id, "save")}
          // The reset colours every a:hover as a link; the button keeps its own text colour.
          className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), BIG, "hover:text-[color:var(--color-button-secondary-text)]")}
        >
          Mint privately, sell copies later
        </Link>
        <p className={SMALL}>Keep the project and sell Physical or Virtual copies after the mint. Copies never need the Main NFT listed.</p>
      </div>
    </>
  );
}
