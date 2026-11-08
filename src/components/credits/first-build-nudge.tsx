"use client";

// D1 of the upgrade plan: the maker's first build is ready — the moment they
// have seen what IDEEZA does. Once in a lifetime, on Free only (paid makers
// hear of a bigger plan only at a limit), a small card says what is left and
// what Builder gives. ✕ closes it; it never comes back after it was shown, and
// it waits its turn behind any other card already shown today
// (lib/account/nudges.ts).

import * as React from "react";
import Link from "next/link";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IconButton, buttonVariants } from "@/components/ideeza";
import { dismissNudge, markNudgeShown, mayShow, useNudgeEntry } from "@/lib/account/nudges";
import { useAuth } from "@/lib/account/auth";
import { checkoutHref } from "@/lib/create/checkout-route";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { statusOf, useCreateHistory } from "@/lib/create/history";
import { useCreatePlan } from "@/lib/create/plan";
import { priceOf } from "@/lib/create/plans";
import { pitchPlan } from "@/lib/create/upsell";
import { cn } from "@/lib/utils";

const NUDGE = "first-build";

export function FirstBuildNudge({ jobId, className }: { jobId: string; className?: string }) {
  const { account } = useAuth();
  const email = account?.email ?? null;
  const { hydrated: nudgesReady, entry } = useNudgeEntry(email);
  const { hydrated: planReady, sub } = useCreatePlan();
  const { hydrated: creditsReady, balance } = useCredits();
  const { builds } = useCreateHistory();
  const [now] = React.useState(() => Date.now());
  const [closed, setClosed] = React.useState(false);

  const ready = builds.filter((b) => statusOf(b) === "ready");
  const first = ready.length === 1 && ready[0].id === jobId;
  const plan = pitchPlan(sub.tier);
  const show =
    !closed && !!email && nudgesReady && planReady && creditsReady && sub.tier === "free" && first && !!plan && mayShow(entry, NUDGE, now, { once: true });

  React.useEffect(() => {
    if (show && email) markNudgeShown(email, NUDGE, now);
  }, [show, email, now]);

  if (!show || !plan) return null;
  return (
    <aside
      aria-label="Your first build"
      className={cn("flex items-center gap-[12px] rounded-xl bg-bg-brand-subtle px-[16px] py-[12px] max-sm:flex-wrap", className)}
    >
      <p className="min-w-0 flex-1 text-md leading-md text-text-primary">
        <strong className="font-semibold">Your first build is ready.</strong> You have {balance.toLocaleString("en-US")}{" "}
        {balance === 1 ? "credit" : "credits"} left. {plan.name} gives {plan.credits.toLocaleString("en-US")} a month for{" "}
        {usd(priceOf(plan.tier, "monthly").perMonth)}.
      </p>
      <Link
        href={checkoutHref({ kind: "plan", tier: plan.tier, cycle: "monthly" })}
        className={cn(buttonVariants({ hierarchy: "outline-brand", size: "md" }), "shrink-0")}
      >
        See {plan.name}
      </Link>
      <IconButton
        type="button"
        size="sm"
        aria-label="Close"
        onClick={() => {
          setClosed(true);
          if (email) dismissNudge(email, NUDGE, Date.now());
        }}
        icon={<Icon icon={Cancel01Icon} size={16} />}
      />
    </aside>
  );
}
