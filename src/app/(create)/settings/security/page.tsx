// /settings/security — what sign-in will bring, and a download of your work
// until then.

import type { Metadata } from "next";
import { SecurityPage } from "@/components/settings/security-page";

export const metadata: Metadata = { title: "Security · Settings · IDEEZA" };

export default function SecurityRoute() {
  return <SecurityPage />;
}
