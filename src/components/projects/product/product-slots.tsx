"use client";

// The product page's slots (Phase 2 spec §2.3, §3.10; Build and Earn P0).
// The product page renders its Media and Contributors panels and its rail
// Marketplace block from PRODUCT_SLOTS. A missing panel means a missing tab
// (P2-EDITOR-18); an empty rail is absent (P2-EDITOR-19).
//
// P0 makes the page engineering only for the owner: the Customers panel is
// gone (Earn › Customers), the Editions block is the buyer's side only (the
// owner's controls are Earn › Editions), and so is the Contributors credit
// (product-tabs.tsx gates its tab; the team is the project's Team tab). The
// buyer's side — Preview as buyer and Explore marketplace — reads both as
// before, because the public listing pages are not changed in P0.
//
// This file is a merge point. Each task adds only its import, one adapter
// named `<Area>Slot` directly above PRODUCT_SLOTS, and its key(s), and never
// reorders or edits another entry:
// - W1: T14 panels.media · T17 panels.contributors · T20 headerParts.titleRow;
// - W3: T27 rail.marketplace.

import type * as React from "react";
import type { Viewer } from "@/lib/manual/permissions";
import type { ProductVersionView } from "@/lib/manual/product-page";
import type { ProjectProduct, ProjectView } from "@/lib/manual/project-read";
import { buyerSide } from "@/lib/manual/project-route";
import type { ManualProject } from "@/lib/manual/projects";
import { ProductActivityChip } from "../details/activity-chip";
import { ProductContributorsPanel } from "./product-contributors";
import { ProductMediaPanel } from "./product-media";
import { EditionBlock } from "../editions/edition-block";

/** What every product slot is rendered with. */
export type ProductSlotProps = {
  project: ManualProject;
  /** The project page's one derivation (COR-74): no slot derives project state of its own. */
  view: ProjectView;
  product: ProjectProduct;
  /** The version the page shows (`?v=`). */
  version: ProductVersionView;
  /** Who is looking (PPL-1): controls ask can(viewer, …, view.canCtx). */
  viewer: Viewer;
  /** The minute clock `view` was derived at. */
  now: number;
  /** Says `message` in the page's one polite live region (COR-101). */
  announce: (message: string) => void;
};

export type ProductSlots = {
  panels: Partial<Record<"media" | "contributors", React.ComponentType<ProductSlotProps>>>;
  rail: Partial<Record<"marketplace", React.ComponentType<ProductSlotProps>>>;
  headerParts?: { titleRow?: React.ComponentType<ProductSlotProps>[] };
};

// T20's wiring: the Activity chip (P2-TABS-5), scoped to this product.
function ActivitySlot(props: ProductSlotProps) {
  return <ProductActivityChip {...props} />;
}

// T17's wiring (P2-CONTRIB-15, P2-TABS-4): the product page's read-only
// contributors credit.
function ContributorsSlot(props: ProductSlotProps) {
  return <ProductContributorsPanel {...props} />;
}

// T27's wiring (P2-TABS-24…27): the rail's Marketplace block, this product's
// Physical and Virtual NFT editions — the buyer's side only since P0.
function EditionsSlot(props: ProductSlotProps) {
  return buyerSide(props.viewer) ? <EditionBlock {...props} /> : null;
}

export const PRODUCT_SLOTS: ProductSlots = {
  panels: {
    media: ProductMediaPanel,
    contributors: ContributorsSlot,
  },
  rail: {
    marketplace: EditionsSlot,
  },
  headerParts: {
    titleRow: [ActivitySlot],
  },
};
