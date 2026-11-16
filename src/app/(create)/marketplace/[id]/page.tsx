// /marketplace/[id] — a listed project as a demo buyer sees it (Phase 2 spec
// §2.4, P2-MARKETPLACE-8). A thin server wrapper: the id is resolved against
// this browser's stores inside MarketProjectPage, which shows the skeleton
// until every store is read, "This project isn't on the marketplace" for a
// project that was never listed, and otherwise the project shell with
// MARKET_SLOTS — unless its listing is paused (OffMarketGate). A sample's
// feed id ("p2") is another creator's listing, read from code
// (sample-market.ts), and gets its own shop page.

import type { Metadata } from "next";
import * as React from "react";
import { MarketProjectPage } from "@/components/marketplace/market-project-page";
import { SampleMarketPage } from "@/components/marketplace/sample-market-page";
import { sampleMarketOf } from "@/lib/market/sample-market";
import { offerTabOf } from "@/components/marketplace/offer-tab";
import { OffMarketGate } from "./off-market";

// The client sets "{project} · Explore marketplace · IDEEZA" once it knows the name.
export const metadata: Metadata = { title: "Explore marketplace · IDEEZA" };

export default async function MarketProjectRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nft?: string }>;
}) {
  const { id } = await params;
  // Another creator's sample (owner, 2026-11-16: the marketplace always has Innovations' data): read from code.
  const sample = sampleMarketOf(id);
  if (sample) return <SampleMarketPage market={sample} initialTab={offerTabOf((await searchParams).nft)} />;
  return (
    <OffMarketGate id={id}>
      <MarketProjectPage id={id} />
    </OffMarketGate>
  );
}
