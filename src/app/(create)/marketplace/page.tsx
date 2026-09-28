// /marketplace — Explore marketplace (Phase 2 spec §2.4, P2-MARKETPLACE-2…7).
// MarketplacePage reads its view — tab, search, type, sort and page — from
// the URL with `useSearchParams`, so it sits in a Suspense boundary, like
// /projects: the route shell still prerenders.

import * as React from "react";
import type { Metadata } from "next";
import { MarketplacePage } from "@/components/marketplace/marketplace-page";

export const metadata: Metadata = {
  title: "Explore marketplace · IDEEZA",
};

export default function ExploreMarketplacePage() {
  return (
    <React.Suspense
      fallback={<div className="mx-auto w-full max-w-[1280px] px-[16px] py-[28px] min-[640px]:px-[32px]" />}
    >
      <MarketplacePage />
    </React.Suspense>
  );
}
