// /settings/privacy — Privacy & safety: your profile, who can reach you, blocked people, hidden
// words and your reports.

import type { Metadata } from "next";
import { PrivacyPage } from "@/components/settings/privacy-page";

export const metadata: Metadata = { title: "Privacy & safety · Settings · IDEEZA" };

export default function PrivacyRoute() {
  return <PrivacyPage />;
}
