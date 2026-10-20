// /settings/language — app language, date and time formatting, voice typing.

import type { Metadata } from "next";
import { LanguagePage } from "@/components/settings/language-page";

export const metadata: Metadata = { title: "Language · Settings · IDEEZA" };

export default function LanguageRoute() {
  return <LanguagePage />;
}
