"use client";

// Earn › Overview (Project Details · 2026 update 12, 12b).
import { use } from "react";
import { EarnScreen } from "@/components/mobile/project-earn/earn-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EarnScreen id={decodeURIComponent(id)} section="overview" />;
}
