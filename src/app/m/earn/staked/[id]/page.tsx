"use client";

import { useParams } from "next/navigation";
import { StakeDetail } from "@/components/mobile/earn-coin/stake-detail";

// One stake and its rewards (Figma "Stacking" 228256 / 228382), by its transaction hash.
export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <StakeDetail stakeKey={id} />;
}
