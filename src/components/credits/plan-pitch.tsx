"use client";

// The plan, beside the fix (upgrade plan, owner 2026-11-08): where a maker runs
// short of credits, the next plan up sits next to the packs — Builder from
// Free or Tinkerer, Disruptor from Builder, nothing on Disruptor
// (lib/create/upsell.ts). The packs stay the quick fix; this is the bigger
// one. What it says is the maker's own:
// - D2: after a second credit purchase this month, what they spent, when the
//   plan really is the better buy;
// - F2: once the welcome offer ended unused, the return coupon, at most once in
//   30 days; it is part of this limit moment, so it doesn't take the day's one
//   card (lib/account/nudges.ts).
//
// <PlanPitch /> is the row in the Buy credits dialog (C2); <PlanPitchLine />
// is the one-line link under a "needs N credits" reason (C1).

import * as React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ideeza";
import { markNudgeShown, mayShow, useNudgeEntry } from "@/lib/account/nudges";
import { checkoutHref } from "@/lib/create/checkout-route";
import { COUPONS, couponRule } from "@/lib/create/coupons";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { priceOf } from "@/lib/create/plans";
import { RETURN_COUPON, pitchCycle, pitchPerks, pitchPlan, savingsNudge } from "@/lib/create/upsell";
import { cn } from "@/lib/utils";
import { useWelcomeOffer } from "./welcome-offer";

const COUPON_NUDGE = "return-coupon";
const returnCoupon = COUPONS.find((c) => c.code === RETURN_COUPON);
/** "20% off", read from the coupon list so the words follow the code. */
const RETURN_RULE = returnCoupon ? couponRule(returnCoupon) : "money off";

/** The pitch for the current plan; null on Disruptor or before the plan is read. */
function usePitch() {
  const { hydrated, sub } = useCreatePlan();
  const plan = hydrated ? pitchPlan(sub.tier) : null;
  if (!plan) return null;
  const cycle = pitchCycle(sub);
  const per = priceOf(plan.tier, cycle);
  return {
    plan,
    href: checkoutHref({ kind: "plan", tier: plan.tier, cycle }),
    price: cycle === "yearly" ? `${usd(per.perMonth)} a month, billed yearly` : `${usd(per.perMonth)} a month`,
    tier: sub.tier,
  };
}

/** F2: the return coupon, when the welcome offer ended unused and the caps allow it today.
 *  Exported for the phone's Buy credits sheet (components/mobile/plans/upsell.tsx). */
export function useReturnCoupon(): string | null {
  const offer = useWelcomeOffer();
  const { hydrated, entry } = useNudgeEntry(offer.email);
  const [now] = React.useState(() => Date.now());
  const show =
    offer.ready && hydrated && !!offer.email && offer.phase === "ended" && mayShow(entry, COUPON_NUDGE, now, { everyDays: 30, capped: false });
  React.useEffect(() => {
    if (show && offer.email) markNudgeShown(offer.email, COUPON_NUDGE, now, false);
  }, [show, offer.email, now]);
  return show ? RETURN_COUPON : null;
}

/** C2 — the row in the Buy credits dialog. */
export function PlanPitch({ className }: { className?: string }) {
  const pitch = usePitch();
  const { ledger } = useCredits();
  const { sub } = useCreatePlan();
  const [now] = React.useState(() => Date.now());
  const coupon = useReturnCoupon();
  if (!pitch) return null;
  const savings = savingsNudge(ledger, sub, now);
  return (
    <section
      aria-label={`Or get ${pitch.plan.name}`}
      className={cn("flex items-center gap-[16px] rounded-xl bg-bg-brand-subtle p-[16px] max-sm:flex-col max-sm:items-stretch", className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <p className="text-lg font-semibold leading-lg text-text-primary">
          Or get {pitch.plan.name} · {pitch.price}
        </p>
        <p className="text-md leading-md text-text-secondary">{pitchPerks(pitch.plan).join(" · ")}</p>
        {savings && (
          <p className="text-md leading-md text-text-primary">
            You&apos;ve spent {usd(savings.spent)} on credits this month. {savings.plan.name} is {usd(savings.monthly)} with{" "}
            {savings.plan.credits.toLocaleString("en-US")} credits every month.
          </p>
        )}
        {coupon && (
          <p className="text-md font-semibold leading-md text-text-success">
            Use code {coupon} for {RETURN_RULE} your first month.
          </p>
        )}
      </div>
      <Link href={pitch.href} className={cn(buttonVariants({ hierarchy: "outline-brand", size: "md" }), "shrink-0")}>
        See {pitch.plan.name}
      </Link>
    </section>
  );
}

/** C1 — one line under a "needs N credits" reason. */
export function PlanPitchLine({ className }: { className?: string }) {
  const pitch = usePitch();
  if (!pitch) return null;
  return (
    <Link
      href={pitch.href}
      className={cn(
        "rounded-sm text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus",
        className,
      )}
    >
      Or get {pitch.plan.credits.toLocaleString("en-US")} credits every month with {pitch.plan.name} →
    </Link>
  );
}
