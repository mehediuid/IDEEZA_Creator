"use client";

// One bought copy to sell on: its price, the split, the listing or its receipt (CL-036 › The item panel).
import { use } from "react";
import { ResaleItemScreen } from "@/components/mobile/purchased/earn/resale-item";
import { segmentOf } from "@/components/mobile/purchased/paths";

export default function Page({ params }: { params: Promise<{ id: string; tile: string }> }) {
  const { id, tile } = use(params);
  return <ResaleItemScreen id={segmentOf(id)} tileKey={segmentOf(tile)} />;
}
