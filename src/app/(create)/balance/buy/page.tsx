// /balance/buy — Balance › Buy IDZ Token: the demo presale and its purchases
// (spec 2026-10-19-balance-buy-idz-design.md). `?buy=1` opens the presale;
// `useSearchParams` inside needs a Suspense boundary so the route shell
// pre-renders before the query is known.

import * as React from "react";
import { BuyIdzPage } from "@/components/balance/buy-idz-page";
import { PricingFrame } from "@/components/credits/pricing-frame";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Buy IDZ Token · IDEEZA" };

export default function BuyIdzRoute() {
  return (
    <React.Suspense
      fallback={
        <PricingFrame crumbs={[{ label: "Balance", href: "/balance" }, { label: "Buy IDZ Token" }]}>
          <p className="text-md leading-md text-text-tertiary">Loading the presale…</p>
        </PricingFrame>
      }
    >
      <BuyIdzPage />
    </React.Suspense>
  );
}
