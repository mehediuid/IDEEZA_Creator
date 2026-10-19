// /settings/activity — folded into /settings/data#activity in Settings v2.

import { redirectLegacy } from "@/lib/settings/legacy-route";

export default async function LegacyRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirectLegacy("activity", await searchParams);
}
