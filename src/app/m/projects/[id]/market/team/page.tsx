"use client";

// 06 · Team for a buyer, on Explore marketplace, as the demo buyer reads it: About › Team, read-only (BUY-9).
import { use } from "react";
import { BuyerTeamScreen } from "@/components/mobile/project-earn/buyer/about-screens";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BuyerTeamScreen id={decodeURIComponent(id)} context="market" />;
}
