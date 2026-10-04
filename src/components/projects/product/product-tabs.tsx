"use client";

// The product page's one tab strip and its tabpanel (P2-EDITOR-16…18 as
// changed; P2-TABS-2 as changed; spec §2.3, C2):
//   Media · 3D model · PCB · Firmware code · Wiring · Parts ┆ Contributors · Customers
// - Media is first and the default, and is never written to `?tab=`; an
//   unknown or absent `?tab=` reads as Media; the v1 links (`?tab=pcb`) still
//   work. Changes `replace` the URL (COR-32).
// - A piece the build never made has no tab (H-5); a hand-made, build-gone
//   or unmatched product has Media · Contributors · Customers only. The
//   firmware source waits for `deliverables.download` (O12).
// - The people tabs follow the viewer: Contributors is the roster for the
//   owner and a contributor, a team credit elsewhere with ≥ 1 contributor;
//   Customers is the owner's only (§2.3's table).
// - Panels come from PRODUCT_SLOTS.panels, and a missing panel means a
//   missing tab; Media, the one tab every product has, is VIDEO's panel.
// - The ┆ is an `aria-hidden` hairline, never a tab stop; the arrows cross it.

import * as React from "react";
import type { BuildJob, BuildProduct } from "@/lib/create/history";
import { can } from "@/lib/manual/permissions";
import { pickProductTab, productTabsOf, type ProductTabId } from "@/lib/manual/product-page";
import { TabStrip, type TabDef } from "../details/tab-strip";
import { DeliverablesAccess, ProductPiecePanel } from "./product-deliverables";
import { PRODUCT_SLOTS, type ProductSlotProps } from "./product-slots";

export const PRODUCT_TAB_LABEL: Record<ProductTabId, string> = {
  media: "Media",
  "3d": "3D model",
  pcb: "PCB",
  code: "Firmware code",
  wiring: "Wiring",
  parts: "Parts",
  contributors: "Contributors",
  customers: "Customers",
};

const PEOPLE: ReadonlySet<ProductTabId> = new Set<ProductTabId>(["contributors", "customers"]);
const PIECE: Partial<Record<ProductTabId, BuildProduct["items"][number]["kind"]>> = {
  "3d": "3d",
  pcb: "pcb",
  code: "code",
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
}) {
  const { project, product, viewer } = slot;
  const panels = PRODUCT_SLOTS.panels;
  const contributors = project.contributors?.length ?? 0;
  // The page's product-scoped download grant (an edition holder of this product has it too).
  const downloads = React.useContext(DeliverablesAccess);
  const tabs = productTabsOf(product, job && bp ? bp.items : null, {
    firmware: downloads,
    contributors:
      panels.contributors !== undefined &&
      (can(viewer, "people.seeRoster") || (can(viewer, "people.seeTeam") && contributors > 0)),
    customers: panels.customers !== undefined && can(viewer, "customers.see"),
  });
  // The pick shows at once; the URL follows it by replace.
  const [picked, setPicked] = React.useState<ProductTabId | null>(null);
  const active = pickProductTab(tabs, picked ?? asked);

  const select = (id: ProductTabId) => {
    if (id === active) return;
    setPicked(id);
    onTab(id === "media" ? null : id);
  };

  const def = (id: ProductTabId): TabDef<ProductTabId> => ({ id, label: PRODUCT_TAB_LABEL[id] });
  const groups = [tabs.filter((t) => !PEOPLE.has(t)).map(def), tabs.filter((t) => PEOPLE.has(t)).map(def)];

  const piece = PIECE[active];
  const Panel = active === "media" ? panels.media : PEOPLE.has(active) ? panels[active as "contributors" | "customers"] : undefined;

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
        {piece && job && bp ? (
          <ProductPiecePanel key={`${job.id}:${bp.id}:${piece}`} job={job} product={bp} kind={piece} chatHref={chatHref} />
        ) : Panel ? (
          <Panel {...slot} />
        ) : null}
      </div>
    </div>
  );
}
