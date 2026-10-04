"use client";

// MARKET_SLOTS — the buyer view's composition (Phase 2 spec §2.4, §3.10;
// P2-MARKETPLACE-8 as changed). The same ProjectShell and the same slot
// components as the project page (SLOTS, project-page.tsx), so a buyer reads
// exactly what Preview as buyer shows, with:
// - banners: the Testnet demo banner and its Shopping as switch, in the
//   Preview-as-buyer banner's place;
// - the header in its "market" context (market-header.tsx);
// - tabs as a buyer sees them (`projectTabsFor`): Products, whose cards open
//   `/marketplace/<id>/products/<productId>`, Media, Network when there is
//   one, and the team credit when there are contributors;
// - the rail: the buyer rail first, then Details, Legal (only when filled) and
//   the Project log (public lines only). Outcome, Versions and Manage are the
//   owner's and are absent.

import * as React from "react";
import { useCreateHistory } from "@/lib/create/history";
import { useJourney } from "@/lib/manual/journey-store";
import { productsTabView } from "@/lib/manual/products-tab-view";
import { ProductsTab } from "@/components/projects/details/products-tab";
import { SLOTS } from "@/components/projects/details/project-page";
import type { ProjectSlots, SlotProps } from "@/components/projects/details/slots";
import { BuyerRail } from "./buyer-rail";
import { DemoBuyerBanner } from "./demo-buyer-banner";
import { MarketHeader } from "./market-header";

function DemoBannerSlot() {
  return <DemoBuyerBanner className="mb-10" />;
}

/** The Products tab with the marketplace's own links. A buyer sees no owner-only fact and adds nothing. */
function MarketProductsSlot({ project, view, now }: SlotProps) {
  const { chats } = useCreateHistory();
  const { record: journey } = useJourney(project.id);
  const cards = React.useMemo(
    () => productsTabView(view, { owner: false, activities: journey.activities }),
    [view, journey.activities],
  );
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

export const MARKET_SLOTS: ProjectSlots = {
  banners: [DemoBannerSlot],
  header: MarketHeader,
  tabs: {
    products: MarketProductsSlot,
    media: SLOTS.tabs.media,
    network: SLOTS.tabs.network,
    contributors: SLOTS.tabs.contributors,
  },
  rail: {
    marketplace: BuyerRail,
    details: SLOTS.rail.details,
    legal: SLOTS.rail.legal,
    log: SLOTS.rail.log,
  },
};
