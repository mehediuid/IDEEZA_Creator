"use client";

import * as React from "react";
import { EarnTabsScreen } from "@/components/mobile/earn-coin/earn-tabs-screen";

// Earn Coin › Refer & Earn (Figma "Refer & Earn" 228855…229224).
// The three Earn tabs are one screen: a tab tap swaps the panel without navigating.
export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <EarnTabsScreen />
    </React.Suspense>
  );
}
