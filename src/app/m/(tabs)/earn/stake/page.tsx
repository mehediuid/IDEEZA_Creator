"use client";

import * as React from "react";
import { EarnTabsScreen } from "@/components/mobile/earn-coin/earn-tabs-screen";

// Earn Coin › Stake (Figma "Stacking" 228508 / 228566 / 228625).
// The three Earn tabs are one screen: a tab tap swaps the panel without navigating.
export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <EarnTabsScreen />
    </React.Suspense>
  );
}
