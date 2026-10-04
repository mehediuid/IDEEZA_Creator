// /marketplace/[id] — a listed project as a demo buyer sees it (Phase 2 spec
// §2.4, P2-MARKETPLACE-8). A thin server wrapper: the id is resolved against
// this browser's stores inside MarketProjectPage, which shows the skeleton
// until every store is read, "This project isn't on the marketplace" for a
// project that was never listed, and otherwise the project shell with
// MARKET_SLOTS — unless its listing is paused (OffMarketGate).

import type { Metadata } from "next";
import * as React from "react";
import { MarketProjectPage } from "@/components/marketplace/market-project-page";
import { OffMarketGate } from "./off-market";

// The client sets "{project} · Explore marketplace · IDEEZA" once it knows the name.
export const metadata: Metadata = { title: "Explore marketplace · IDEEZA" };

export default async function MarketProjectRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <OffMarketGate id={id}>
      <MarketProjectPage id={id} />
    </OffMarketGate>
  );
}
