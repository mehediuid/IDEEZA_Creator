// /settings/plan/pricing — Pricing: the plan cards, the comparison and the
// FAQs, beside Settings › Plan & billing (its "Change plan"). Under
// /settings/plan because choosing reads your plan (Current plan, Upgrade,
// Downgrade) and leads to the checkout beside it (../checkout).

import type { Metadata } from "next";
import { PricingPage } from "@/components/credits/plans-panel";

export const metadata: Metadata = { title: "Pricing · IDEEZA" };

export default function PricingRoute() {
  return <PricingPage />;
}
