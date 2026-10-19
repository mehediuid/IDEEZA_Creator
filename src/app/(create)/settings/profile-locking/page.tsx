// /settings/profile-locking — folded into /settings/privacy#lock in Settings v2.

import { redirectLegacy } from "@/lib/settings/legacy-route";

export default async function LegacyRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirectLegacy("profile-locking", await searchParams);
}
