"use client";

import { PaymentsScreen } from "@/components/mobile/plans/payments-screen";

// Payment method (mobile Figma "Payment Method"): `?tab=card` · `?tab=paypal` · `?tab=wallet`.
export default function Page() {
  return <PaymentsScreen />;
}
