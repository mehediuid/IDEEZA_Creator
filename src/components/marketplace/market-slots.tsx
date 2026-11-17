"use client";

// MARKET_SLOTS — the buyer view's composition (Phase 2 spec §2.4, §3.10;
// P2-MARKETPLACE-8 as changed). The same ProjectShell and the same slot
// components as the project page (SLOTS, project-page.tsx), so a buyer reads
// exactly what Preview as buyer shows, with:
// - banners: the Testnet demo banner and its Shopping as switch, in the
//   Preview-as-buyer banner's place;
// - the header in its "market" context (market-header.tsx);
// - tabs as a buyer sees them (`projectTabsFor`): Products, whose cards open
//   `/marketplace/<id>/products/<productId>` and say what of the product's
//   own is on sale (its copies are its page's), Media, Network when there is
//   one, and Team (name and role) when there are contributors;
// - the header: the project's media stage first (the Innovations post's own),
//   then the read-only header naming the creator (market-header.tsx);
// - the rail: its lead is the buyer rail (the buy box) and the Creator block
//   together (MarketLead), above the tabs on a narrow page; then On
//   Innovations (market-rail.tsx), Details, Legal (only when filled) and the
//   Project log (public lines only). Outcome, Versions and Manage are the
//   owner's and are absent.

import * as React from "react";
import { useCreateHistory } from "@/lib/create/history";
import { useJourney } from "@/lib/manual/journey-store";
import { productsTabView } from "@/lib/manual/products-tab-view";
import type { Token } from "@/lib/brief/types";
import { tracksOf } from "@/lib/market/editions";
import { KIND_LABEL } from "@/lib/market/sell-flow";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import { ProductsTab } from "@/components/projects/details/products-tab";
import { SLOTS } from "@/components/projects/details/project-page";
import type { ProjectSlots, SlotProps } from "@/components/projects/details/slots";
import { BuyerRail } from "./buyer-rail";
import { listedKindsOf } from "./copy-panel";
import { DemoBuyerBanner } from "./demo-buyer-banner";
import { MarketHeader } from "./market-header";
import { CreatorRailBlock, StoryRailBlock } from "./market-rail";

function DemoBannerSlot({ project }: SlotProps) {
  return <DemoBuyerBanner className="mb-10" projectId={project.id} />;
}

/** "Physical NFT on sale · from 0.008 ETH": what of a product's own is listed, at its lowest This version price. */
function saleLineOf(view: SlotProps["view"], productId: string): string | null {
  const kinds = listedKindsOf(view, productId);
  if (!kinds.length) return null;
  let low: { regular: string; token: Token } | null = null;
  for (const t of tracksOf(productId, view.editions)) {
    if (!t.listing || !kinds.includes(t.kind)) continue;
    if (!low || (t.listing.token === low.token && compareAmounts(t.listing.regular, low.regular) < 0)) low = t.listing;
  }
  const what = kinds.length > 1 ? "Physical and Virtual NFTs" : KIND_LABEL[kinds[0]];
  return low ? `${what} on sale · from ${formatAmount(low.regular, low.token)}` : `${what} on sale`;
}

/** The Products tab with the marketplace's own links. A buyer sees no owner-only fact and adds nothing. */
function MarketProductsSlot({ project, view, now }: SlotProps) {
  const { chats } = useCreateHistory();
  const { record: journey } = useJourney(project.id);
  // Each product's own copies live on its page (owner, 2026-11-15: never mixed into the project's box);
  // its card says they are there.
  const cards = React.useMemo(() => {
    const base = productsTabView(view, { owner: false, journey, project });
    for (const p of view.products) {
      if (base[p.id]) base[p.id] = { ...base[p.id], sale: saleLineOf(view, p.id) };
    }
    return base;
  }, [view, journey, project]);
  return (
    <ProductsTab
      projectId={project.id}
      projectName={project.name}
      products={view.products}
      cards={cards}
      chats={chats}
      showOwnerOnlyFacts={false}
      canAddProduct={false}
      now={now}
      productHref={(productId) => `/marketplace/${project.id}/products/${productId}`}
    />
  );
}

/** The rail's lead: the buy box, then the Creator block with the way to the creator, so on a
 *  narrow page both stand above the tabs (the frame places the lead there) and beside the page
 *  they top the rail. One surface, a hairline between them. */
function MarketLead(props: SlotProps) {
  return (
    <div className="divide-y divide-border">
      <BuyerRail {...props} />
      <CreatorRailBlock {...props} />
    </div>
  );
}

export const MARKET_SLOTS: ProjectSlots = {
  banners: [DemoBannerSlot],
  header: MarketHeader,
  tabs: {
    products: MarketProductsSlot,
    media: SLOTS.tabs.media,
    network: SLOTS.tabs.network,
    team: SLOTS.tabs.team,
  },
  rail: {
    marketplace: MarketLead,
    story: StoryRailBlock,
    details: SLOTS.rail.details,
    legal: SLOTS.rail.legal,
    log: SLOTS.rail.log,
  },
};
