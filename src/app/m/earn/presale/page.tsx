"use client";

import * as React from "react";
import { PresaleScreen } from "@/components/mobile/earn-coin/presale-screen";

// Buy IDEEZA Coin (Figma 229538…230129): the presale; `?step=connect` · `?step=wallet`.
export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <PresaleScreen />
    </React.Suspense>
  );
}
