// /balance — Balance › Overview: the IDZ balance and its transaction activity
// (spec 2026-10-19-balance-overview-design.md).

import { BalanceOverview } from "@/components/balance/balance-overview";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Balance · IDEEZA" };

export default function BalanceRoute() {
  return <BalanceOverview />;
}
