// /settings/get-paid — Get paid: the balance by project, withdrawing, withdrawal methods,
// Get paid in, identity, history and the statement, on one page (Settings v2, V7).
// `?from=` is the project page that sent you here (the Earn ladder, Withdraw in Get paid),
// for the way back.

import type { Metadata } from "next";
import { GetPaidPage } from "@/components/settings/get-paid/get-paid-page";

export const metadata: Metadata = { title: "Get paid · Settings · IDEEZA" };

export default async function GetPaidRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const from = (await searchParams).from;
  return <GetPaidPage from={typeof from === "string" ? from : null} />;
}
