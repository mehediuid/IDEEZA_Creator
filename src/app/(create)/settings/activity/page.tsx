// /settings/activity — Your activity: what you appreciated, commented,
// watched and searched. `?list=<id>` opens one history.

import type { Metadata } from "next";
import { ActivityPage } from "@/components/settings/activity-page";
import { ACTIVITY_LISTS, type ActivityList } from "@/lib/settings/rows/activity";

export const metadata: Metadata = { title: "Your activity · Settings · IDEEZA" };

export default async function ActivityRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { list } = await searchParams;
  const open = ACTIVITY_LISTS.find((l) => l === list);
  return <ActivityPage list={(open as ActivityList | undefined) ?? null} />;
}
