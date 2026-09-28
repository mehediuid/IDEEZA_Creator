"use client";

// The product page's slots (Phase 2 spec §2.3, §3.10). The product page
// renders its Media, Contributors and Customers panels and its rail
// Marketplace block from PRODUCT_SLOTS. A missing panel means a missing tab
// (P2-EDITOR-18); an empty rail is absent (P2-EDITOR-19).
//
// This file is a merge point. Each task adds only its import, one adapter
// named `<Area>Slot` directly above PRODUCT_SLOTS, and its key(s), and never
// reorders or edits another entry:
// - W1: T14 panels.media · T17 panels.contributors · T18 panels.customers ·
//   T20 headerParts.titleRow;
// - W3: T27 rail.marketplace.

import type * as React from "react";
import type { Viewer } from "@/lib/manual/permissions";
import type { ProductVersionView } from "@/lib/manual/product-page";
import type { ProjectProduct, ProjectView } from "@/lib/manual/project-read";
import type { ManualProject } from "@/lib/manual/projects";
import { ProductCustomers } from "./product-customers";
import { ProductActivityChip } from "../details/activity-chip";
import { ProductContributorsPanel } from "./product-contributors";
import { ProductMediaPanel } from "./product-media";

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
  panels: Partial<Record<"media" | "contributors" | "customers", React.ComponentType<ProductSlotProps>>>;
  rail: Partial<Record<"marketplace", React.ComponentType<ProductSlotProps>>>;
  headerParts?: { titleRow?: React.ComponentType<ProductSlotProps>[] };
};

// T18's adapter: ProductCustomers already takes ProductSlotProps exactly, so
// this only keeps the merge point's one-adapter-per-task shape.
function CustomersSlot(props: ProductSlotProps) {
  return <ProductCustomers {...props} />;
}

// T20's wiring: the Activity chip (P2-TABS-5), scoped to this product.
function ActivitySlot(props: ProductSlotProps) {
  return <ProductActivityChip {...props} />;
}

// T17's wiring (P2-CONTRIB-15, P2-TABS-4): the product page's read-only
// contributors credit.
function ContributorsSlot(props: ProductSlotProps) {
  return <ProductContributorsPanel {...props} />;
}

export const PRODUCT_SLOTS: ProductSlots = {
  panels: {
    media: ProductMediaPanel,
    contributors: ContributorsSlot,
    customers: CustomersSlot,
  },
  rail: {},
  headerParts: {
    titleRow: [ActivitySlot],
  },
};
