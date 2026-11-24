"use client";

// 06b · Network for a buyer, on Explore marketplace, as the demo buyer reads it: About › Network, read-only (BUY-9).
import { use } from "react";
import { BuyerNetworkScreen } from "@/components/mobile/project-earn/buyer/about-screens";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BuyerNetworkScreen id={decodeURIComponent(id)} context="market" />;
}
