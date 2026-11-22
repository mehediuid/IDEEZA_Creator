"use client";

// One bought copy: its units, what a sale hands over, and Sell this copy (CL-035 › Your copies, CL-036).
import { use } from "react";
import { CopyScreen } from "@/components/mobile/purchased/copy-screen";
import { segmentOf } from "@/components/mobile/purchased/paths";

export default function Page({ params }: { params: Promise<{ id: string; copy: string }> }) {
  const { id, copy } = use(params);
  return <CopyScreen id={segmentOf(id)} copyKey={segmentOf(copy)} />;
}
