"use client";

import { useParams } from "next/navigation";
import { StakeContractScreen } from "@/components/mobile/earn-coin/stake-contract";

// A staking contract's options and the Stake sheet (Figma "Stacking" 227865…228221).
export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <StakeContractScreen contractId={id} />;
}
