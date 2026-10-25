"use client";

// The product page's one tab strip and its tabpanel (P2-EDITOR-16…18 as
// changed; P2-TABS-2 as changed; spec §2.3, C2; Build and Earn P0):
//   3D model · PCB · Firmware code · Wiring · Parts · Media[ ┆ Contributors]
// - Owner, 2026-10-11: the build's pieces lead and Media follows them; a
//   buyer's side opens on Media first. The first tab is the default and is
//   never written to `?tab=`; an unknown or absent `?tab=` reads as the first;
//   the v1 links (`?tab=pcb`, `?tab=media`) still work. Changes `replace` the
//   URL (COR-32).
// - A piece the build never made has no tab (H-5); a hand-made, build-gone
//   or unmatched product has Media only — and then no tab strip at all, just
//   the panel. The firmware source waits for `deliverables.download` (O12).
// - P0: the owner's page is engineering only. Customers moved to Earn ›
//   Customers, and the team is the project's Team tab, so Contributors — a
//   team credit with ≥ 1 contributor — is the buyer's side only (`buyerSide`:
//   Preview as buyer and Explore marketplace, which are not changed in P0).
// - Panels come from PRODUCT_SLOTS.panels, and a missing panel means a
//   missing tab; Media, the one tab every product has, is VIDEO's panel.
// - The ┆ is an `aria-hidden` hairline, never a tab stop; the arrows cross it.
// - On an Innovations post (`post`, plan §6, D2) Media leads, then the open
//   pieces (3D model, Parts) ┆ the locked ones (PCB, Firmware code, Wiring)
//   with a lock: their panel says what a copy includes, never the files.

import * as React from "react";
import { Add01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { BuildItemKind, BuildJob, BuildProduct } from "@/lib/create/history";
import { isLeftOut } from "@/lib/create/pieces";
import { AddPiecesDialog, NotBuiltPanel } from "@/components/create/add-pieces-dialog";
import { can } from "@/lib/manual/permissions";
import { pickProductTab, productTabsOf, type ProductTabId } from "@/lib/manual/product-page";
import { buyerSide } from "@/lib/manual/project-route";
import { TabStrip, type TabDef } from "../details/tab-strip";
import { DeliverablesAccess, ProductPiecePanel } from "./product-deliverables";
import { PRODUCT_SLOTS, type ProductSlotProps } from "./product-slots";

export const PRODUCT_TAB_LABEL: Record<ProductTabId, string> = {
  media: "Media",
  pcb: "PCB",
  code: "Code",
  "3d": "3D Module",
  assembly: "Assembly",
  wiring: "Wiring",
  parts: "Parts",
  contributors: "Contributors",
  customers: "Sales",
};

const PEOPLE: ReadonlySet<ProductTabId> = new Set<ProductTabId>(["contributors", "customers"]);
/** The pieces an Innovations post keeps for a copy (D2). */
export type PostLockedTab = "pcb" | "code" | "wiring";
const POST_LOCKED: ReadonlySet<ProductTabId> = new Set<ProductTabId>(["pcb", "code", "wiring"]);
const PIECE: Partial<Record<ProductTabId, BuildProduct["items"][number]["kind"]>> = {
  "3d": "3d",
  pcb: "pcb",
  code: "code",
  assembly: "assembly",
  wiring: "wiring",
  parts: "parts",
};

export function ProductTabs({
  slot,
  job,
  bp,
  chatHref,
  asked,
  onTab,
  post,
}: {
  /** What every product slot renders with. */
  slot: ProductSlotProps;
  /** The build behind the version on screen, and this product inside it; null when none stands behind it. */
  job: BuildJob | null;
  bp: BuildProduct | null;
  /** Where a failed piece is retried; null in a preview or when the chat is gone. */
  chatHref: string | null;
  /** `?tab=` as the URL has it. */
  asked: string | null;
  /** Writes `?tab=` (null drops it: Media is never written). */
  onTab: (tab: string | null) => void;
  /** An Innovations post: the locked pieces' panel. */
  post?: { locked: (tab: PostLockedTab) => React.ReactNode };
}) {
  const { project, product, viewer } = slot;
  // The owner adds a piece the build left out from its own tab.
  const owner = !post && can(viewer, "product.openEditor", slot.view.canCtx);
  const [adding, setAdding] = React.useState<BuildItemKind[] | null>(null);
  const panels = PRODUCT_SLOTS.panels;
  const contributors = project.contributors?.length ?? 0;
  // The page's product-scoped download grant (an edition holder of this product has it too).
  const downloads = React.useContext(DeliverablesAccess);
  const tabs = productTabsOf(
    product,
    job && bp ? bp.items : null,
    post
      ? { firmware: true, contributors: false, customers: false, mediaFirst: true }
      : {
          firmware: downloads,
          contributors:
            panels.contributors !== undefined &&
            buyerSide(viewer) &&
            (can(viewer, "people.seeRoster") || (can(viewer, "people.seeTeam") && contributors > 0)),
          customers: false,
          mediaFirst: buyerSide(viewer),
          leftOut: owner,
        },
  );
  // The pick shows at once; the URL follows it by replace.
  const [picked, setPicked] = React.useState<ProductTabId | null>(null);
  const active = pickProductTab(tabs, picked ?? asked);

  const select = (id: ProductTabId) => {
    if (id === active) return;
    setPicked(id);
    onTab(id === tabs[0] ? null : id);
  };

  const leftOutKind = (id: ProductTabId) => {
    const kind = PIECE[id];
    const item = kind && bp ? bp.items.find((i) => i.kind === kind) : undefined;
    return item && isLeftOut(item) ? kind : undefined;
  };
  const def = (id: ProductTabId): TabDef<ProductTabId> =>
    post && POST_LOCKED.has(id)
      ? { id, label: PRODUCT_TAB_LABEL[id], icon: <Icon icon={SquareLock02Icon} size={14} /> }
      : leftOutKind(id)
        ? { id, label: `${PRODUCT_TAB_LABEL[id]} · Not built`, icon: <Icon icon={Add01Icon} size={14} /> }
        : { id, label: PRODUCT_TAB_LABEL[id] };
  const second = post ? POST_LOCKED : PEOPLE;
  const groups = [tabs.filter((t) => !second.has(t)).map(def), tabs.filter((t) => second.has(t)).map(def)];

  const lockedPanel = post && POST_LOCKED.has(active) ? post.locked(active as PostLockedTab) : null;
  const piece = lockedPanel ? undefined : PIECE[active];
  const Panel = active === "media" ? panels.media : active === "contributors" ? panels.contributors : undefined;

  // One tab is no choice: its panel stands alone, without a strip.
  if (tabs.length === 1) {
    return (
      <div>
        {lockedPanel ?? (piece && job && bp && leftOutKind(active) ? (
          <NotBuiltPanel kind={piece} onAdd={owner ? () => setAdding([piece]) : undefined} />
        ) : piece && job && bp ? (
          <ProductPiecePanel key={`${job.id}:${bp.id}:${piece}`} job={job} product={bp} kind={piece} chatHref={chatHref} />
        ) : Panel ? (
          <Panel {...slot} />
        ) : null)}
      </div>
    );
  }

  return (
    <div>
      <TabStrip label="Product sections" groups={groups} active={active} onSelect={select} />
      <div
        id={`panel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        tabIndex={0}
        className="rounded-lg pt-10 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {lockedPanel ?? (piece && job && bp && leftOutKind(active) ? (
          <NotBuiltPanel kind={piece} onAdd={owner ? () => setAdding([piece]) : undefined} />
        ) : piece && job && bp ? (
          <ProductPiecePanel key={`${job.id}:${bp.id}:${piece}`} job={job} product={bp} kind={piece} chatHref={chatHref} />
        ) : Panel ? (
          <Panel {...slot} />
        ) : null)}
      </div>
      {adding && job && bp && (
        <AddPiecesDialog buildId={job.id} product={bp} preselect={adding} onClose={() => setAdding(null)} />
      )}
    </div>
  );
}
