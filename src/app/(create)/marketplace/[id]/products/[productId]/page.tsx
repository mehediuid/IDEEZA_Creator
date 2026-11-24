// /marketplace/[id]/products/[productId] — one product of a listed project,
// as a demo buyer sees it (Phase 2 spec §2.3, P2-MARKETPLACE-8, -21): the
// project page's product page in its "market" context — the Explore
// marketplace breadcrumb, `/marketplace` links, and the firmware and
// downloads only for a holder — unless the listing is paused (OffMarketGate).
// The page's toast (its header Share's "Link copied") sits outside the page.
// A sample's feed id ("p7") is another creator's project, read from code: its
// product gets the same frame and rail (sample-product-page.tsx; owner,
// 2026-11-24: every marketplace page the same).

import type { Metadata } from "next";
import * as React from "react";
import { PostToastProvider } from "@/components/innovations/toast";
import { ProductPage } from "@/components/projects/product/product-page";
import { SampleProductPage } from "@/components/marketplace/sample-product-page";
import { sampleMarketOf } from "@/lib/market/sample-market";
import { OffMarketGate } from "../../off-market";

export const metadata: Metadata = { title: "Explore marketplace · IDEEZA" };

/** sampleProductHref encodes the id; a stray "%" is left as it is. */
function idOf(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function MarketProductRoute({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id, productId } = await params;
  const sample = sampleMarketOf(id);
  if (sample) return <SampleProductPage market={sample} productId={idOf(productId)} />;
  return (
    <PostToastProvider>
      <OffMarketGate id={id}>
        <ProductPage id={id} productId={productId} context="market" />
      </OffMarketGate>
    </PostToastProvider>
  );
}
