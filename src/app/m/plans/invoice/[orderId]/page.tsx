"use client";

import { useParams } from "next/navigation";
import { InvoiceScreen } from "@/components/mobile/plans/invoice-screen";

// One payment's invoice (mobile Figma "v2 · Invoice"), by its order id.
export default function Page() {
  const { orderId } = useParams<{ orderId: string }>();
  return <InvoiceScreen orderId={decodeURIComponent(orderId)} />;
}
