// /settings/get-paid/history — a Phase 1 sub-page; Settings v2 shows the withdrawal history on the one
// Get paid page, so this sends you there, keeping the query (`?from=`).

import { redirect } from "next/navigation";
import { getPaidHref } from "@/lib/account/get-paid-href";

export default async function GetPaidSubRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(getPaidHref("history", await searchParams));
}
