// /settings/privacy — search engines, blog reuse, and what this app keeps.

import type { Metadata } from "next";
import { PrivacyPage } from "@/components/settings/privacy-page";

export const metadata: Metadata = { title: "Privacy · Settings · IDEEZA" };

export default function PrivacyRoute() {
  return <PrivacyPage />;
}
