// /settings/get-paid/tax-identification — a Phase 1 tax form. Settings v2 hides the tax forms until real
// payouts exist (V7), so this sends you to the one Get paid page, keeping the query (`?from=`).

import { redirect } from "next/navigation";
import { getPaidHref } from "@/lib/account/get-paid-href";

export default async function GetPaidSubRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(getPaidHref(null, await searchParams));
}
