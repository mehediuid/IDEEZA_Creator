"use client";

// The project on Explore marketplace as the active demo buyer shops it (Project Details · 2026
// update 18b–18h, 18j–18l).
import { use } from "react";
import { MarketScreen } from "@/components/mobile/project-earn/buyer/market-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MarketScreen id={decodeURIComponent(id)} />;
}
