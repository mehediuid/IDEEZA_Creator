// /settings — the settings home: find a setting, the most visited ones, and
// (on a phone) the list of every settings page.

import type { Metadata } from "next";
import { SettingsHome } from "@/components/settings/settings-home";

export const metadata: Metadata = { title: "Settings · IDEEZA" };

export default function SettingsRoute() {
  return <SettingsHome />;
}
