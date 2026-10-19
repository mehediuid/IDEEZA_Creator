// /settings/profile-locking — lock your profile, and how locking works.

import type { Metadata } from "next";
import { ProfileLockingPage } from "@/components/settings/profile-locking-page";

export const metadata: Metadata = { title: "Profile Locking · Settings · IDEEZA" };

export default function ProfileLockingRoute() {
  return <ProfileLockingPage />;
}
