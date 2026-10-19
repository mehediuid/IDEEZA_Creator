// /settings/profile-share — who can reach you, see you, comment and message you, and quiet mode.

import type { Metadata } from "next";
import { ProfileSharePage } from "@/components/settings/profile-share-page";

export const metadata: Metadata = { title: "Profile & Share · Settings · IDEEZA" };

export default function ProfileShareRoute() {
  return <ProfileSharePage />;
}
