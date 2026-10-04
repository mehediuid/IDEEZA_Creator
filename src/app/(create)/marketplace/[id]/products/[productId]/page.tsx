// /marketplace/[id]/products/[productId] — one product of a listed project,
// as a demo buyer sees it (Phase 2 spec §2.3, P2-MARKETPLACE-8, -21): the
// project page's product page in its "market" context — the Explore
// marketplace breadcrumb, `/marketplace` links, and the firmware and
// downloads only for a holder — unless the listing is paused (OffMarketGate).

import type { Metadata } from "next";
import * as React from "react";
import { ProductPage } from "@/components/projects/product/product-page";
import { OffMarketGate } from "../../off-market";

export const metadata: Metadata = { title: "Explore marketplace · IDEEZA" };

export default async function MarketProductRoute({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id, productId } = await params;
  return (
    <OffMarketGate id={id}>
      <ProductPage id={id} productId={productId} context="market" />
    </OffMarketGate>
  );
}
