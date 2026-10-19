// /settings/profile — your picture, legal name, handle, gender, links and
// wallet address.

import type { Metadata } from "next";
import { ProfileSettingsPage } from "@/components/settings/profile/profile-settings";

export const metadata: Metadata = { title: "Profile · Settings · IDEEZA" };

export default function ProfileSettingsRoute() {
  return <ProfileSettingsPage />;
}
