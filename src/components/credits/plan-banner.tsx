"use client";

// Your plan, over Billing history and Payment method (User Panel V2: the plan
// card in 41549:164343 and 41549:161519; on Free, 41549:161482), and its
// details (View Plan Details 41549:165008):
//
// - The banner: the plan in the brand ink, its price a month, how it's billed
//   and the next billing (or when it ends or changes); View details. On Free:
//   Compare plans, "For lifetime", Upgrade now.
// - Details: the same card with Auto renewal (off = the plan ends with this
//   period, as a cancel does; on again = it renews), the plan's benefits with
//   what you use against them as meters, and Cancel subscription (or Keep,
//   once it is cancelled).
//
// Plans set amounts; they don't lock or remove anything already made, so a
// meter past its amount says so instead of threatening a lockout.

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ModalFrame, Toggle } from "@/components/ideeza";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { creditPeriod, planOf, priceOf } from "@/lib/create/plans";
import { CancelDialog, Meter, usePlanUsage } from "./plans-panel";

const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const n = (v: number) => v.toLocaleString("en-US");

/** How a paid plan is billed and what happens next: Monthly, "Next billing 13 Nov 2026". Null on Free. */
function useBilling(): { type: string; note: string } | null {
  const { sub } = useCreatePlan();
  if (sub.renewsAt === null) return null;
  const when = date(sub.renewsAt);
  const type = sub.cycle === "yearly" ? "Annual" : "Monthly";
  const note = !sub.pending
    ? `Next billing ${when}`
    : sub.pending.tier === "free"
      ? `Ends on ${when}, then Free`
      : sub.pending.tier === sub.tier
        ? `Monthly billing from ${when}`
        : `Switches to ${planOf(sub.pending.tier).name} on ${when}`;
  return { type, note };
}

function PlanHead() {
  const { sub, plan } = useCreatePlan();
  const billing = useBilling();
  const per = billing ? priceOf(sub.tier, sub.cycle).perMonth : 0;
  return (
    <div className="flex flex-col gap-[4px]">
      <p className="text-xl leading-xl text-text-brand">{plan.name}</p>
      <p className="flex items-baseline gap-[4px] text-text-brand">
        <span className="text-3xl font-bold leading-3xl tabular-nums">{billing ? (Number.isInteger(per) ? `$${per}` : usd(per)) : "Free"}</span>
        {billing && <span className="text-md leading-md">/ month</span>}
      </p>
      <p className="text-md leading-md text-text-brand">
        {billing ? (
          <>
            Subscription type <span className="font-semibold">{billing.type}</span> ({billing.note})
          </>
        ) : (
          "For lifetime"
        )}
      </p>
    </div>
  );
}

export function PlanBanner({ onSeePlans }: { onSeePlans: () => void }) {
  const { hydrated, sub } = useCreatePlan();
  const [open, setOpen] = React.useState(false);
  const paid = sub.renewsAt !== null;

  if (!hydrated) return <div aria-hidden className="h-[120px] rounded-2xl bg-bg-brand-subtle" />;

  return (
    <section
      aria-label="Your plan"
      className="flex flex-wrap items-center justify-between gap-[16px] rounded-2xl bg-bg-brand-subtle px-[24px] py-[24px]"
    >
      {paid ? (
        <PlanHead />
      ) : (
        <div className="flex flex-col gap-[4px]">
          <p className="flex items-center gap-[8px] text-md leading-md text-text-secondary">
            Your plan
            <button
              type="button"
              onClick={onSeePlans}
              className="text-sm font-semibold leading-sm text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Compare plans
            </button>
          </p>
          <p className="text-3xl font-bold leading-3xl text-text-brand">Free</p>
          <p className="text-md leading-md text-text-brand">For lifetime</p>
        </div>
      )}
      {paid ? (
        <Button hierarchy="primary" size="lg" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          View details
        </Button>
      ) : (
        <Button hierarchy="primary" size="lg" onClick={onSeePlans}>
          Upgrade now
        </Button>
      )}
      {open && <PlanDetailsDialog onClose={() => setOpen(false)} />}
    </section>
  );
}

function PlanDetailsDialog({ onClose }: { onClose: () => void }) {
  const { sub, plan, keep, cancel } = useCreatePlan();
  const { ledger } = useCredits();
  const usage = usePlanUsage();
  const [cancelling, setCancelling] = React.useState(false);
  const [now] = React.useState(() => Date.now());

  const period = creditPeriod(sub, now);
  const granted = ledger.find((e) => e.reason === "grant" && e.orderId === `grant_${sub.id}_${period.index}`);
  const cancelled = sub.pending?.tier === "free";

  if (cancelling) return <CancelDialog onClose={onClose} />;

  const benefits: { label: string; meter?: { used: number; amount: number; verb: string } }[] = [
    { label: `${n(plan.credits)} AI credits every month${granted ? `, ${n(granted.delta)} added on ${date(granted.ts)}` : ""}` },
    { label: `Create ${n(plan.projects)} projects`, meter: { used: usage.projects, amount: plan.projects, verb: "created" } },
    { label: `${n(plan.exports)} exports a month` },
    { label: plan.queue },
    { label: `Add ${n(plan.contributors)} contributors to a project`, meter: { used: usage.mostContributors, amount: plan.contributors, verb: "added" } },
    { label: "Mint, list and buy on the marketplace" },
  ];

  return (
    <ModalFrame open onClose={onClose} title="Plan details" size="md">
      <div className="flex flex-col gap-[24px]">
        <div className="flex items-start justify-between gap-[16px] rounded-2xl bg-bg-brand-subtle p-[24px]">
          <PlanHead />
          <label className="flex shrink-0 items-center gap-[8px] text-md leading-md text-text-brand">
            Auto renewal
            <Toggle checked={!cancelled} onChange={() => (cancelled ? keep() : cancel())} aria-label="Auto renewal" />
          </label>
        </div>

        <section aria-labelledby="plan-benefits" className="flex flex-col gap-[16px]">
          <h3 id="plan-benefits" className="text-md leading-md text-text-tertiary">
            Benefits
          </h3>
          <ul role="list" className="flex flex-col gap-[14px]">
            {benefits.map((b) => (
              <li key={b.label} className="flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[6px]">
                <span className="flex items-center gap-[10px] text-lg leading-lg text-text-primary">
                  <span aria-hidden className="shrink-0 text-text-brand">
                    <Icon icon={CheckmarkCircle02Icon} size={20} />
                  </span>
                  {b.label}
                </span>
                {b.meter && b.meter.amount > 0 && <Meter {...b.meter} label={b.label} />}
              </li>
            ))}
          </ul>
          <p className="text-sm leading-sm text-text-tertiary">
            A plan sets these amounts. It never locks or removes a project, and every plan can mint, list and buy.
          </p>
        </section>

        {cancelled ? (
          <Button
            hierarchy="primary"
            size="lg"
            className="w-full"
            onClick={() => {
              keep();
              onClose();
            }}
          >
            Keep {plan.name}
          </Button>
        ) : (
          <Button hierarchy="danger" size="lg" className="w-full" aria-haspopup="dialog" onClick={() => setCancelling(true)}>
            Cancel subscription
          </Button>
        )}
      </div>
    </ModalFrame>
  );
}
