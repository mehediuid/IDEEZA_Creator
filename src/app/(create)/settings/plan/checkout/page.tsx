// /settings/plan/checkout — Payment details: a plan upgrade
// (?plan=builder&cycle=monthly) or credits (?pack=pro, ?credits=80).
// `useSearchParams` inside needs a Suspense boundary.

import type { Metadata } from "next";
import * as React from "react";
import { CheckoutPage } from "@/components/credits/checkout-page";

export const metadata: Metadata = { title: "Payment details · IDEEZA" };

export default function CheckoutRoute() {
  return (
    <React.Suspense fallback={<div className="flex h-full items-center justify-center text-md text-text-tertiary">Loading payment details…</div>}>
      <CheckoutPage />
    </React.Suspense>
  );
}
