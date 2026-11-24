"use client";

// Earn › Sell for what you bought: the copies, by kind, then the ones sold on (CL-036).
import { use } from "react";
import { PurchasedEarnScreen } from "@/components/mobile/purchased/earn/earn-screen";
import { segmentOf } from "@/components/mobile/purchased/paths";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PurchasedEarnScreen id={segmentOf(id)} section="sell" />;
}
