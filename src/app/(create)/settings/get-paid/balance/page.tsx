// /settings/get-paid/balance — the balance, Withdraw Money, withdrawal methods and "Get paid in".
// `?from=` is the project page the Earn ladder sent you from, for the way back.

import type { Metadata } from "next";
import { BalancePage } from "@/components/settings/get-paid/balance";

export const metadata: Metadata = { title: "Balance · Get Paid · Settings · IDEEZA" };

export default async function BalanceRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const from = (await searchParams).from;
  return <BalancePage from={typeof from === "string" ? from : null} />;
}
