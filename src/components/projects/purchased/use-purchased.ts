"use client";

// Everything the active demo creator bought in this browser, project by project (lib/market/purchases.ts): their
// purchases of this browser's own listings (the market store) and of other creators' samples (the phone's sample
// store). In the prototype the person shops as Mira, Leo or Sam ("Shopping as"), so My projects shows what that
// demo creator holds (owner, 2026-11-16 default). `ready` is false until every store is read.

import * as React from "react";
import { useMinuteClock } from "@/components/create/build-status";
import { useCreator } from "@/components/marketplace/use-creator-name";
import { useSampleSales } from "@/components/mobile/project-earn/buyer/sample-sales-store";
import { useCreateHistory } from "@/lib/create/history";
import { projectSummary } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import { ownPurchasesOf, purchasedProjectsOf, samplePurchasesOf, type PurchasedProject } from "@/lib/market/purchases";
import type { DemoBuyer } from "@/lib/wallet/identities";
import { useActiveBuyer } from "@/lib/wallet/use-demo-wallet";

export function usePurchased(): { ready: boolean; buyer: DemoBuyer; purchases: PurchasedProject[] } {
  const { hydrated, projects } = useManualProjects();
  const { hydrated: buildsHydrated, builds } = useCreateHistory();
  const market = useMarket();
  const sampleSales = useSampleSales();
  const { buyer } = useActiveBuyer();
  const me = useCreator();
  const now = useMinuteClock();
  const boughtIds = React.useMemo(
    () => [...new Set(market.data.sales.filter((s) => s.buyerId === buyer.id).map((s) => s.projectId))],
    [market.data.sales, buyer.id],
  );
  const editions = useProjectsEditions(boughtIds);
  const ready = hydrated && buildsHydrated && market.hydrated && editions.hydrated;

  const purchases = React.useMemo(() => {
    const bought = projects.filter((p) => boughtIds.includes(p.id));
    const like = bought.map((p) => {
      const s = projectSummary(p, { builds, brief: null, videoJobs: [], now, projects, market: market.data });
      return { id: p.id, name: s.name, cover: s.cover, products: (p.products ?? []).map((x) => x.name) };
    });
    return purchasedProjectsOf(ownPurchasesOf(market.data.sales, buyer.id, like, editions.record, me.name), samplePurchasesOf(sampleSales, buyer.id));
  }, [projects, boughtIds, builds, now, market.data, buyer.id, editions.record, me.name, sampleSales]);

  return { ready, buyer, purchases };
}
