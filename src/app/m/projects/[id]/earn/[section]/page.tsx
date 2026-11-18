"use client";

// Earn › Sell · Business plan · Money (Project Details · 2026 update 14–17).
// Any other segment opens Earn's Overview in its place (never a bare 404).
import { use } from "react";
import { redirect, RedirectType } from "next/navigation";
import { EarnScreen } from "@/components/mobile/project-earn/earn-screen";
import { parsePhoneEarnSection, phoneEarnHref } from "@/lib/manual/phone-earn";

export default function Page({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = use(params);
  const tab = parsePhoneEarnSection(section);
  if (!tab) redirect(phoneEarnHref(decodeURIComponent(id)), RedirectType.replace);
  return <EarnScreen id={decodeURIComponent(id)} section={tab} />;
}
