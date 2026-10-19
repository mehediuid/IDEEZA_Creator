// /settings/notifications — which notices reach you and how: the ten kinds,
// this browser, the digest, quiet hours, the bid threshold and muted projects.

import type { Metadata } from "next";
import { NotificationsPage } from "@/components/settings/notifications-page";

export const metadata: Metadata = { title: "Notification · Settings · IDEEZA" };

export default function NotificationsRoute() {
  return <NotificationsPage />;
}
