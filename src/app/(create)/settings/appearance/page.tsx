// /settings/appearance — text size, contrast, motion, notices, shortcuts, data saver.

import type { Metadata } from "next";
import { AppearancePage } from "@/components/settings/appearance-page";

export const metadata: Metadata = { title: "Appearance & accessibility · Settings · IDEEZA" };

export default function AppearanceRoute() {
  return <AppearancePage />;
}
