"use client";

// A project the demo creator you shop as bought copies of (CL-035, CL-036); `?nft=physical|virtual` opens that kind.
import { use } from "react";
import { PurchasedScreen } from "@/components/mobile/purchased/purchased-screen";
import { segmentOf } from "@/components/mobile/purchased/paths";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PurchasedScreen id={segmentOf(id)} />;
}
