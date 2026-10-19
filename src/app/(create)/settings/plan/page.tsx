// /settings/plan — Plan & billing: your plan, credits, buying credits, credit
// alerts and limits, how you pay, billing details and invoices, one section
// each (#your-plan … #invoices). Plans to choose from are on ./pricing.

import type { Metadata } from "next";
import { PlanBillingPage } from "@/components/credits/plan-billing-page";

export const metadata: Metadata = { title: "Plan & billing · IDEEZA" };

export default function PlanBillingRoute() {
  return <PlanBillingPage />;
}
