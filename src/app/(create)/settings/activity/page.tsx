// /settings/activity — folded into /settings/data#activity in Settings v2;
// its Appreciated list moved to Innovations (`?mode=appreciated`).

import { redirect } from "next/navigation";
import { redirectLegacy } from "@/lib/settings/legacy-route";

export default async function LegacyRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams;
  if (search.list === "appreciated") redirect("/innovations?mode=appreciated");
  redirectLegacy("activity", search);
}
