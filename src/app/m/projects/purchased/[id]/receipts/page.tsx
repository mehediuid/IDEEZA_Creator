"use client";

// A purchase's receipts, newest first (CL-035 › Receipts).
import { use } from "react";
import { ReceiptsScreen } from "@/components/mobile/purchased/receipts-screen";
import { segmentOf } from "@/components/mobile/purchased/paths";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ReceiptsScreen id={segmentOf(id)} />;
}
