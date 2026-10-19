// /settings/kyc — the three KYC levels; Level 1 is the demo identity check.
// `?from=` is the project page the Earn ladder sent you from, for the way back.

import type { Metadata } from "next";
import { KycPage } from "@/components/settings/kyc-page";

export const metadata: Metadata = { title: "KYC Verification · Settings · IDEEZA" };

export default async function KycRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const from = (await searchParams).from;
  return <KycPage from={typeof from === "string" ? from : null} />;
}
