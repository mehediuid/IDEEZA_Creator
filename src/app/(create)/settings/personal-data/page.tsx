// /settings/personal-data — folded into /settings/data#download in Settings v2.

import { redirectLegacy } from "@/lib/settings/legacy-route";

export default async function LegacyRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirectLegacy("personal-data", await searchParams);
}
