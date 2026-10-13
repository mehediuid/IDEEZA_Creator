"use client";

// The product page's rail (P2-EDITOR-19, P2-TABS-3 as changed; spec §2.3), in
// order:
// 1. Marketplace: Physical NFT · Virtual NFT editions — PRODUCT_SLOTS.rail
//    (T27), the buyer's side only since Build and Earn P0 (the owner's
//    controls are Earn › Sell): it shows only listed tracks, else it is
//    absent.
// 2. Specs and 3. Build check (product-facts.tsx; owner, 2026-10-11: facts
//    out of the header): a built product's labelled facts and its check.
// 4. Editor: six rows into this product's editor, and the seed caption
//    (P2-EDITOR-11). Absent in every preview and on a locked project.
// On an Innovations post (`post`) the post's own blocks replace 1 and 4.
// From a 1024 px page container it is the 360 px column right of the tabs;
// below that it follows the tab panel, each block collapsible and closed at
// 400 px (COR-56). When every block is absent the rail is too: `:empty`
// drops the surface, and no empty frame is left behind.

import * as React from "react";
import { RAIL_SURFACE } from "../details/frame";
import { cn } from "@/lib/utils";
import type { ProductConfidence } from "@/lib/create/confidence";
import type { BuildProduct } from "@/lib/create/history";
import { ProductEditorBlock } from "./product-editor-block";
import { ProductCheckBlock, ProductSpecsBlock } from "./product-facts";
import { PRODUCT_SLOTS, type ProductSlotProps } from "./product-slots";

export function ProductRail({
  slot,
  built,
  confidence,
  partChanges,
  post,
}: {
  slot: ProductSlotProps;
  /** This product inside the build of the version on screen; null when none stands behind it. */
  built: BuildProduct | null;
  confidence: ProductConfidence | null;
  /** The owner's "Built with your part changes: …" (PPL-7); null otherwise. */
  partChanges: string | null;
  /** An Innovations post's own blocks, which stand in for the Marketplace and Editor blocks (plan §6):
   *  the post shows the prices and buying stays on the Marketplace page. */
  post?: React.ReactNode;
}) {
  const Marketplace = PRODUCT_SLOTS.rail.marketplace;
  return (
    <aside aria-label="Product record" className={cn(RAIL_SURFACE, "empty:hidden")}>
      {!post && Marketplace ? <Marketplace {...slot} /> : null}
      {built && <ProductSpecsBlock product={built} partChanges={partChanges} />}
      {confidence && <ProductCheckBlock confidence={confidence} />}
      {post ?? (
        <ProductEditorBlock
          project={slot.project}
          productId={slot.product.id}
          viewer={slot.viewer}
          canCtx={slot.view.canCtx}
        />
      )}
    </aside>
  );
}
