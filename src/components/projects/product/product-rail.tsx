"use client";

// The product page's rail (P2-EDITOR-19, P2-TABS-3 as changed; spec §2.3), in
// order:
// 1. Marketplace: Physical NFT · Virtual NFT editions — PRODUCT_SLOTS.rail
//    (T27). In a preview it shows only listed tracks, else it is absent.
// 2. Editor: six rows into this product's editor, and the seed caption
//    (P2-EDITOR-11). Absent in every preview and on a locked project.
// From a 1024 px page container it is the 360 px column right of the tabs;
// below that it follows the tab panel, each block collapsible and closed at
// 400 px (COR-56). When every block is absent the rail is too: `:empty`
// drops the surface, and no empty frame is left behind.

import * as React from "react";
import { RAIL_SURFACE } from "../details/frame";
import { cn } from "@/lib/utils";
import { ProductEditorBlock } from "./product-editor-block";
import { PRODUCT_SLOTS, type ProductSlotProps } from "./product-slots";

export function ProductRail({ slot }: { slot: ProductSlotProps }) {
  const Marketplace = PRODUCT_SLOTS.rail.marketplace;
  return (
    <aside aria-label="Product record" className={cn(RAIL_SURFACE, "empty:hidden")}>
      {Marketplace ? <Marketplace {...slot} /> : null}
      <ProductEditorBlock
        project={slot.project}
        productId={slot.product.id}
        viewer={slot.viewer}
        canCtx={slot.view.canCtx}
      />
    </aside>
  );
}
