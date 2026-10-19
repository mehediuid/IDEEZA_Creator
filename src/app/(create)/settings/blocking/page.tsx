// /settings/blocking — blocked people, blocked conversations and hidden words.

import type { Metadata } from "next";
import { BlockingPage } from "@/components/settings/blocking-page";

export const metadata: Metadata = { title: "Manage Blocking · Settings · IDEEZA" };

export default function BlockingRoute() {
  return <BlockingPage />;
}
