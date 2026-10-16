// /marketplace — Explore marketplace (Phase 2 spec §2.4, P2-MARKETPLACE-2…7).
// MarketplacePage reads its view — tab, search, type, sort and page — from
// the URL with `useSearchParams`, so it sits in a Suspense boundary, like
// /projects: the route shell still prerenders. The fallback is the page's own
// frame, header and skeleton grid, so the title is already where it stays.

import * as React from "react";
import type { Metadata } from "next";
import { Page } from "@/components/ideeza/page";
import { ListingsSkeleton, MarketplaceHeader, MarketplacePage } from "@/components/marketplace/marketplace-page";

export const metadata: Metadata = {
  title: "Explore marketplace · IDEEZA",
};

export default function ExploreMarketplacePage() {
  return (
    <React.Suspense
      fallback={
        <Page>
          <MarketplaceHeader forSale={null} />
          <ListingsSkeleton />
        </Page>
      }
    >
      <MarketplacePage />
    </React.Suspense>
  );
}
