"use client";

// One Earn tab's body, chosen by the route (earn/page.tsx is the overview,
// earn/[section]/page.tsx the rest) and rendered from the layout's one read
// (earn-context.tsx).

import * as React from "react";
import type { EarnSection } from "@/lib/manual/earn-route";
import { useEarnProps } from "./earn-context";
import { EarnMoney } from "./money";
import { EarnOverview } from "./overview";
import { EarnPlan } from "./plan";
import { EarnSell } from "./sell";

export function EarnSectionBody({ section }: { section: EarnSection }) {
  const props = useEarnProps();
  if (!props) return null;
  switch (section) {
    case "overview":
      return <EarnOverview {...props} />;
    case "sell":
      return <EarnSell {...props} />;
    case "plan":
      return <EarnPlan {...props} />;
    case "money":
      return <EarnMoney {...props} />;
  }
}
