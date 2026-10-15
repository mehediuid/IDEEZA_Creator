// /settings/plan/invoice/[orderId] — one payment's invoice, opened from
// Billing history: read it, print it or save it as a PDF. The order id is the
// payment's; the invoice is built from it in the browser that made it.

import type { Metadata } from "next";
import { InvoiceView } from "@/components/credits/invoice-view";

export const metadata: Metadata = { title: "Invoice · IDEEZA" };

export default async function InvoiceRoute({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <InvoiceView orderId={decodeURIComponent(orderId)} />;
}
