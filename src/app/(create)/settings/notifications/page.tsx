// /settings/notifications — what pops up and what adds to the bell's count:
// pop-ups (right away, once a day, paused; quiet hours; outside this tab), the
// seven notice kinds with the bid threshold, and muted projects.

import type { Metadata } from "next";
import { NotificationsPage } from "@/components/settings/notifications-page";

export const metadata: Metadata = { title: "Notifications · Settings · IDEEZA" };

export default function NotificationsRoute() {
  return <NotificationsPage />;
}
