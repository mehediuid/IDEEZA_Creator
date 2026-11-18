"use client";

// One Earn tab's body, chosen by the route (earn/page.tsx is the overview,
// earn/[section]/page.tsx the rest) and rendered from the layout's one read
// (earn-context.tsx). Sell is a desk across the page frame (its board and the
// item panel in the rail, sell.tsx); the other tabs read in the narrow column.

import * as React from "react";
import type { EarnSection } from "@/lib/manual/earn-route";
import { useEarnProps } from "./earn-context";
import { EarnMoney } from "./money";
import { EarnOverview } from "./overview";
import { EarnPlan } from "./plan";
import { EarnSell } from "./sell";
import { EARN_COLUMN } from "./surface";

export function EarnSectionBody({ section }: { section: EarnSection }) {
  const props = useEarnProps();
  if (!props) return null;
  switch (section) {
    case "overview":
      return (
        <div className={EARN_COLUMN}>
          <EarnOverview {...props} />
        </div>
      );
    case "sell":
      return <EarnSell {...props} />;
    case "plan":
      return (
        <div className={EARN_COLUMN}>
          <EarnPlan {...props} />
        </div>
      );
    case "money":
      return (
        <div className={EARN_COLUMN}>
          <EarnMoney {...props} />
        </div>
      );
  }
}
