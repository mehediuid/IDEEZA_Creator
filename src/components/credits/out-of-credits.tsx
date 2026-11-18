"use client";

// "You're out of credits" with the way out (upgrade plan C1): when a balance
// can't pay for the next concept, say so where the prompt is, with the two
// fixes side by side — Buy credits (the dialog, in place) and the next plan up
// (plan-pitch.tsx). Nothing here stops anyone: the send stays as it was.

import * as React from "react";
import { CONCEPT_COST } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { creditPeriod } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { BuyCreditsButton } from "./buy-credits";
import { PlanPitchLine } from "./plan-pitch";

const ACTION =
  "rounded-sm text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus";

export function OutOfCreditsLine({ className, need = CONCEPT_COST }: { className?: string; need?: number }) {
  const { hydrated, sub } = useCreatePlan();
  const [now] = React.useState(() => Date.now());
  const refill = hydrated
    ? new Date(creditPeriod(sub, now).end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;
  return (
    <div role="status" className={cn("flex flex-col items-center gap-[4px] text-center", className)}>
      <p className="text-md leading-md text-text-secondary">
        You&apos;re out of credits.{refill ? ` They refill on ${refill}.` : ""}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-[16px] gap-y-[4px]">
        <BuyCreditsButton need={need} className={ACTION}>
          Buy credits
        </BuyCreditsButton>
        <PlanPitchLine />
      </div>
    </div>
  );
}
