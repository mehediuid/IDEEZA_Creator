"use client";

import * as React from "react";
import { EarnTabsScreen } from "@/components/mobile/earn-coin/earn-tabs-screen";

// Earn Coin › Buy $IDZ (Figma 229495 / 229392); `?bought=<tx>` opens the purchase's success sheet.
// The three Earn tabs are one screen: a tab tap swaps the panel without navigating.
export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <EarnTabsScreen />
    </React.Suspense>
  );
}
