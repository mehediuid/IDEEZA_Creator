"use client";

// Earn › Sell, a sales desk (owner, 2026-11-18: "this page isn't in a good
// layout, a lot of space is empty — think again from scratch"; the plan
// https://claude.ai/artifact/KG362uZ1MZyahtgV1ygmuD, direction A with every
// recommendation, D1–D12), over the owner's selling rules (2026-10-11):
// - the page frame with its rail (WITH_RAIL): the board in the main column,
//   the item panel in the 360 px rail beside it; under a 1024 px page a tap on
//   a tile opens the panel from the side, as the DS Drawer (owner, 2026-11-18:
//   below the board it was far down the page), and each tile says what the
//   tap does (Manage ›, Sell ›);
// - the board (sell/board.tsx): the whole project's row (Main, Physical,
//   Virtual) and one row per product (Physical, Virtual; D3: a one-product
//   project has one row), each tile its state, price, sold meter and earnings
//   (D6), with the line over it; before the mint, one band (D10);
// - the item panel (sell/item-panel.tsx): every control the rows had, for the
//   tile picked (D4), with what it sold, who bought it last and what buyers
//   see (D7, D8), and the NFT's Activity (D9);
// - under the board, as before: the note that selling the Main NFT sells the
//   project (left out once it has), Mint details, and "No products yet".
// The tile open on arrival is the one waiting for the maker (D5,
// `defaultTileOf`); `#copies` / `#editions-<product>` ask for a product's
// copies and `?list=1` for the Main NFT, whose ListingFlow then opens once.
// Everything asks `can(viewer, …, view.canCtx)` as before, so a project sold in
// full reads without a write.

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Drawer } from "@/components/ideeza";
import { WITH_RAIL } from "@/components/ideeza/page";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { payoutLinesText, type PayoutLine } from "@/lib/commerce/payout";
import { earnPairOf, mainRowStateOf } from "@/lib/manual/earn-view";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { NextAction } from "@/lib/manual/project-summary";
import { useCheckoutHolds } from "@/lib/market/checkout-hold-store";
import { editionChainOf } from "@/lib/market/editions";
import { copyTileOf, defaultTileOf, deskCaptionOf, deskProductsOf, mainTileOf, tileKeyOf, type DeskTile } from "@/lib/market/sell-desk";
import { MAIN_SALE_DETAIL, MAIN_SALE_NOTE, copyRowStateOf } from "@/lib/market/sell-flow";
import { PROJECT_SCOPE, type EditionKind } from "@/lib/market/types";
import { addAmounts } from "@/lib/wallet/money";
import { RailStackScope, useRailStacked } from "../details/rail-block";
import { MintDetails } from "../details/rail-outcome";
import type { SlotProps } from "../details/slots";
import type { CopyScope } from "../editions/edition-block";
import { useCommitGate } from "./ladder/level-check";
import { earnSourceOf } from "./ladder/use-earn-facts";
import { EARN_LINK } from "./surface";
import { SellBoard, type BoardRow } from "./sell/board";
import { CopyPanel, DraftPanel, MainPanel, PanelFrame, PanelInDrawer, panelHeadOf, type CopyDesk, type MainDesk } from "./sell/item-panel";

const COPY_KINDS: EditionKind[] = ["physical", "virtual"];
/** The listing's own gate and form ask these; the panel's "Before you can list" leaves them out. */
const LIST_HANDLED = ["videos", "ownership"] as const;
const PANEL_ID = "sell-item-panel";

/** The whole project's copies are named "Whole project" beside the project. */
const WHOLE_PROJECT: CopyScope = { id: PROJECT_SCOPE, name: "Whole project", product: null };

type Desk = {
  rows: BoardRow[];
  tiles: DeskTile[];
  main: MainDesk;
  copies: Map<string, CopyDesk>;
  draft: boolean;
  caption: { value: string; label: string }[] | null;
  /** The mint summary's link, under Mint details, when the project has one. */
  summaryHref: string | null;
};

/** A row's earnings in one line: the same token's amounts added. */
function rowEarned(tiles: (DeskTile | undefined)[]): string | null {
  const out = new Map<string, PayoutLine>();
  for (const l of tiles.flatMap((t) => t?.earned ?? [])) {
    const k = `${l.network}:${l.token}`;
    const prev = out.get(k);
    out.set(k, prev ? { ...prev, amount: addAmounts(prev.amount, l.amount) } : { ...l });
  }
  return out.size ? payoutLinesText([...out.values()]) : null;
}

/** Every tile's facts and the rows' own states, from the page's one read. */
function useDesk(props: SlotProps): Desk {
  const { project, view, viewer, brief } = props;
  const stored = useProjectBrief(project.id) ?? null;
  const holds = useCheckoutHolds();
  const pair = earnPairOf(project, view.summary, brief, viewer, view.canCtx);
  const actions = [pair.first, pair.second].filter((a): a is NextAction => a !== null);
  const listing = actions.find((a): a is Extract<NextAction, { kind: "add-to-marketplace" }> => a.kind === "add-to-marketplace") ?? null;
  const summary = actions.find((a): a is Extract<NextAction, { kind: "view-brief" }> => a.kind === "view-brief") ?? null;
  const inCheckout = view.listing.kind === "live" && holds.any(view.listing.listing.id) > 0;
  const mainState = mainRowStateOf({
    status: view.summary.status,
    listing: view.listing,
    locked: view.lock !== null,
    canList: listing !== null,
    manage: can(viewer, "facts.seeOwnerOnly") && (view.listing.kind === "live" || view.listing.kind === "paused"),
    inCheckout,
  });
  const gate = useCommitGate("list", earnSourceOf(project, view, brief), { handled: LIST_HANDLED });
  const missing = mainState.action === "list" && gate.ready && !gate.check.ok ? gate.check.missing.length : 0;
  const mainFacts = mainTileOf({
    projectId: project.id,
    action: mainState.action,
    status: view.summary.status,
    locked: view.lock !== null,
    listing: view.listing,
    sales: view.sales,
    inCheckout,
  });
  const mainTile: DeskTile = missing ? { ...mainFacts, hint: missing === 1 ? "1 step before listing" : `${missing} steps before listing` } : mainFacts;

  const mainListing = view.listing.kind === "none" ? null : view.listing.listing;
  const chain = editionChainOf(view.mint.record, mainListing, view.mint.status === "legacy" && stored ? stored.state : null);
  const minted = view.summary.status !== "draft" && view.mint.status !== "notMinted";
  const products = deskProductsOf(view.products, view.editions);
  const current = view.products.filter((p) => p.dropped === null);
  const scopes: CopyScope[] = [WHOLE_PROJECT, ...products.map((p) => ({ id: p.id, name: displayProductName(p.name), product: p }))];

  const copies = new Map<string, CopyDesk>();
  for (const scope of scopes) {
    for (const kind of COPY_KINDS) {
      const state = copyRowStateOf({
        productId: scope.id,
        kind,
        projectName: project.name,
        minted,
        given: view.summary.status === "given",
        manage: can(viewer, "editions.manage", view.canCtx),
        chainKnown: chain !== null,
        dropped: scope.product !== null && scope.product.dropped !== null,
        tracks: view.editions,
        sales: view.sales,
      });
      const tile = copyTileOf({ projectId: project.id, scope: scope.id, kind, state, tracks: view.editions, sales: view.sales });
      copies.set(tile.key, { tile, state, scope, kind });
    }
  }

  const rows: BoardRow[] = scopes.map((scope) => {
    const tiles: BoardRow["tiles"] = {
      ...(scope.id === PROJECT_SCOPE ? { main: mainTile } : null),
      physical: copies.get(tileKeyOf(scope.id, "physical"))?.tile,
      virtual: copies.get(tileKeyOf(scope.id, "virtual"))?.tile,
    };
    if (scope.id === PROJECT_SCOPE) {
      const names = current.map((p) => displayProductName(p.name));
      return {
        scope: scope.id,
        name: project.name,
        what: `Whole project · ${current.length === 1 ? "1 product" : `${current.length} products`}`,
        // One product: the row is that product too, so it says which (D3).
        also: products.length === 0 && names.length ? names.join(" + ") : null,
        cover: view.summary.cover,
        earned: rowEarned(Object.values(tiles)),
        tiles,
      };
    }
    return {
      scope: scope.id,
      name: scope.name,
      what: scope.product?.dropped ? "Product · dropped by a later version" : "Product",
      also: null,
      cover: null,
      earned: rowEarned(Object.values(tiles)),
      tiles,
    };
  });

  const tiles = [mainTile, ...[...copies.values()].map((c) => c.tile)];
  const draft = mainState.action === "mint";
  return {
    rows,
    tiles,
    main: { tile: mainTile, state: mainState, listing },
    copies,
    draft,
    caption: draft ? null : deskCaptionOf({ projectId: project.id, tiles, sales: view.sales, locked: view.lock !== null }),
    summaryHref: summary?.href ?? null,
  };
}

export function EarnSell(props: SlotProps) {
  // The probe reads the page frame's width: from 1024 px the item panel sits in the rail, below it
  // the panel opens as a drawer (owner, 2026-11-18).
  return (
    <RailStackScope>
      <SellDesk {...props} />
    </RailStackScope>
  );
}

function SellDesk(props: SlotProps) {
  const { project, view, viewer, announce } = props;
  const desk = useDesk(props);
  const narrow = useRailStacked();
  const search = useSearchParams();
  const listAsked = search.get("list") === "1";
  const [picked, setPicked] = React.useState<string | null>(null);
  const [drawer, setDrawer] = React.useState(false);
  // The address's hash, read once the router has written it (a client-side move from the Overview's
  // "Sell copies of a product" sets it after this first render), and again when it changes.
  const [hash, setHash] = React.useState("");
  React.useEffect(() => {
    const changed = () => {
      setHash(window.location.hash);
      setPicked(null);
    };
    const frame = requestAnimationFrame(() => setHash(window.location.hash));
    window.addEventListener("hashchange", changed);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", changed);
    };
  }, [search]);
  // `?list=1` on a narrow page: open the Main NFT's drawer, where its ListingFlow opens once.
  React.useEffect(() => {
    if (!narrow || !listAsked) return;
    const frame = requestAnimationFrame(() => setDrawer(true));
    return () => cancelAnimationFrame(frame);
  }, [narrow, listAsked]);

  const keys = new Set(desk.tiles.map((t) => t.key));
  const fallback = desk.draft ? "draft" : listAsked ? tileKeyOf(PROJECT_SCOPE, "main") : defaultTileOf(desk.tiles, hash);
  const selected = picked && (picked === "draft" ? desk.draft : keys.has(picked)) ? picked : fallback;
  const open = narrow && drawer;

  const pick = (key: string) => {
    setPicked(key);
    if (narrow) setDrawer(true);
    const tile = desk.tiles.find((t) => t.key === key);
    if (tile && !narrow) announce(`${tile.kind === "main" ? "Main NFT" : tile.kind === "physical" ? "Physical copies" : "Virtual copies"}: ${tile.chip.label}`);
  };

  const locked = view.lock !== null;
  const copy = selected ? desk.copies.get(selected) : undefined;
  const panel =
    selected === "draft" ? (
      <DraftPanel project={project} />
    ) : copy ? (
      <CopyPanel key={selected} {...props} desk={copy} />
    ) : (
      <MainPanel key={selected ?? "main"} {...props} desk={desk.main} />
    );
  const head = panelHeadOf(
    selected === "draft" ? { kind: "draft" } : copy ? { kind: copy.kind, scopeName: copy.scope.product ? copy.scope.name : null } : { kind: "main", scopeName: null },
    project.name,
  );

  return (
    <div className={WITH_RAIL}>
      <div className="flex min-w-0 flex-col gap-10">
        <SellBoard
          rows={desk.rows}
          caption={desk.caption}
          // A narrow page shows no tile as open until one is tapped.
          selected={narrow && !open ? null : selected}
          onSelect={pick}
          draft={desk.draft ? { name: project.name, selected: !narrow && selected === "draft" } : null}
          sold={locked}
          opens={narrow}
        />
        {!locked && (
          <p className="m-0 rounded-xl bg-bg-subtle px-12 py-8 text-md leading-md text-text-secondary">
            <strong className="font-semibold text-text-primary">{MAIN_SALE_NOTE}</strong> {MAIN_SALE_DETAIL}
          </p>
        )}
        {!desk.draft && (
          <MintDetails summary={view.summary} commerce={view.commerce} viewer={viewer} view={view} announce={announce}>
            {desk.summaryHref && (
              <Link href={desk.summaryHref} className={EARN_LINK}>
                Open the mint summary
                <Icon icon={ArrowRight01Icon} size={14} />
              </Link>
            )}
          </MintDetails>
        )}
        {view.products.length === 0 && (
          <div className="flex flex-col items-start gap-4">
            <p className="m-0 text-md leading-md text-text-secondary">No products yet. Add one to the project to sell its copies.</p>
            <Link href={`/projects/${encodeURIComponent(project.id)}`} className={EARN_LINK}>
              Open products
              <Icon icon={ArrowRight01Icon} size={14} />
            </Link>
          </div>
        )}
      </div>

      {narrow ? (
        <ItemDrawer open={open} onClose={() => setDrawer(false)} title={head.title} description={head.description}>
          {panel}
        </ItemDrawer>
      ) : (
        <PanelFrame id={PANEL_ID}>{panel}</PanelFrame>
      )}
    </div>
  );
}

/** The item panel as the DS Drawer. Its Sell and listing flows open their own dialogs on top; while
 *  one is there the drawer is `covered` (it hands that dialog the keyboard and stops closing on the
 *  scrim), found by watching for a modal layer added to the page after the drawer opened. */
function ItemDrawer({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [covered, setCovered] = React.useState(false);
  React.useEffect(() => {
    if (!open || typeof MutationObserver === "undefined") return;
    let before: Set<Element> | null = null;
    const modals = () => document.querySelectorAll('[aria-modal="true"]');
    const check = () => {
      if (!before) return;
      const seen = before;
      setCovered([...modals()].some((el) => !seen.has(el)));
    };
    // A frame on, the drawer's own panel is in the page: everything modal now is the drawer or under it.
    const frame = requestAnimationFrame(() => {
      before = new Set(modals());
      check();
    });
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [open]);
  return (
    <Drawer open={open} onClose={onClose} title={title} description={description} covered={open && covered} bodyClassName="p-0">
      <PanelInDrawer value>
        <div id={PANEL_ID} className="flex min-w-0 flex-col divide-y divide-border">
          {children}
        </div>
      </PanelInDrawer>
    </Drawer>
  );
}
