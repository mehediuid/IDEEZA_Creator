"use client";

// Your plan, above every tab of Plan & pricing (User Panel V2: the plan card
// over Billing History 41549:164343 and Payment Method 41549:161519), and its
// details (View Plan Details 41549:165008). Requirements, not looks:
//
// - The banner: the plan, its price, how it's billed, and when it renews,
//   ends or changes. View details.
// - Details: the same, what this period added, and what you use against the
//   plan's amounts — projects, and the most contributors on one project — as
//   meters. Then the one plan action: Cancel plan, or Keep <plan> once a
//   change is waiting (the design's Auto Renewal switch is the same thing as
//   Cancel, so it isn't a second control). On Free: See plans.
//
// Plans set amounts; they don't lock or remove anything already made, so a
// meter past its amount says so instead of threatening a lockout.

import * as React from "react";
import { Button, ModalFrame, ProgressBar } from "@/components/ideeza";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { creditPeriod, planOf, priceOf } from "@/lib/create/plans";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { CancelDialog } from "./plans-panel";

const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const n = (v: number) => v.toLocaleString("en-US");

/** "Renews on 13 Nov 2026", "Ends on …, then you're on Free", "Switches to Tinkerer on …", "Free forever". */
function useStatusLine(): string {
  const { sub } = useCreatePlan();
  if (sub.renewsAt === null) return "Free forever";
  const when = date(sub.renewsAt);
  if (!sub.pending) return `Renews on ${when}`;
  if (sub.pending.tier === "free") return `Ends on ${when}, then you're on Free`;
  const next = planOf(sub.pending.tier).name;
  if (sub.pending.tier === sub.tier) return `Switches to monthly billing on ${when}`;
  return `Switches to ${next}${sub.pending.cycle !== sub.cycle ? ` (${sub.pending.cycle})` : ""} on ${when}`;
}

function usePriceLine(): string | null {
  const { sub } = useCreatePlan();
  if (sub.renewsAt === null) return null;
  const price = priceOf(sub.tier, sub.cycle);
  return sub.cycle === "yearly"
    ? `${usd(price.perMonth)} a month, ${usd(price.period)} billed yearly`
    : `${usd(price.perMonth)} a month, billed monthly`;
}

export function PlanBanner({ onSeePlans }: { onSeePlans: () => void }) {
  const { hydrated, plan } = useCreatePlan();
  const status = useStatusLine();
  const price = usePriceLine();
  const [open, setOpen] = React.useState(false);

  if (!hydrated) return <div aria-hidden className="h-[104px] rounded-xl border border-solid border-border-brand bg-bg-brand-subtle" />;

  return (
    <section
      aria-label="Your plan"
      className="flex flex-wrap items-center justify-between gap-[16px] rounded-xl border border-solid border-border-brand bg-bg-brand-subtle p-[20px]"
    >
      <div className="flex min-w-0 flex-col gap-[4px]">
        <p className="text-sm font-medium leading-sm text-text-brand">Your plan</p>
        <p className="text-xl font-semibold leading-xl text-text-primary">{plan.name}</p>
        <p className="text-md leading-md text-text-secondary">
          {price ? `${price} · ` : ""}
          {status}
        </p>
      </div>
      <Button hierarchy="secondary" size="lg" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        View details
      </Button>
      {open && (
        <PlanDetailsDialog
          onClose={() => setOpen(false)}
          onSeePlans={() => {
            setOpen(false);
            onSeePlans();
          }}
        />
      )}
    </section>
  );
}

function PlanDetailsDialog({ onClose, onSeePlans }: { onClose: () => void; onSeePlans: () => void }) {
  const { sub, plan, keep } = useCreatePlan();
  const { ledger, balance } = useCredits();
  const { projects } = useManualProjects();
  const status = useStatusLine();
  const price = usePriceLine();
  const [cancelling, setCancelling] = React.useState(false);
  const [now] = React.useState(() => Date.now());
  const closeRef = React.useRef<HTMLButtonElement>(null);

  const period = creditPeriod(sub, now);
  const granted = ledger.find((e) => e.reason === "grant" && e.orderId === `grant_${sub.id}_${period.index}`);
  const mostContributors = projects.reduce((m, p) => Math.max(m, p.contributors?.length ?? 0), 0);
  const paid = sub.renewsAt !== null;

  if (cancelling) return <CancelDialog onClose={onClose} />;

  return (
    <ModalFrame
      open
      onClose={onClose}
      title="Plan details"
      size="sm"
      initialFocus={closeRef}
      footer={
        <>
          {!paid ? (
            <Button hierarchy="primary" size="lg" className="ml-auto" onClick={onSeePlans}>
              See plans
            </Button>
          ) : sub.pending ? (
            <Button
              hierarchy="primary"
              size="lg"
              className="ml-auto"
              onClick={() => {
                keep();
                onClose();
              }}
            >
              Keep {plan.name}
            </Button>
          ) : (
            <Button hierarchy="danger" size="lg" className="ml-auto" aria-haspopup="dialog" onClick={() => setCancelling(true)}>
              Cancel plan
            </Button>
          )}
          <Button ref={closeRef} hierarchy="secondary" size="lg" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-[20px]">
        <div className="flex flex-col gap-[4px] rounded-lg border border-solid border-border-brand bg-bg-brand-subtle p-[16px]">
          <p className="text-lg font-semibold leading-lg text-text-primary">{plan.name}</p>
          {price && <p className="text-md leading-md text-text-secondary">{price}</p>}
          <p className="text-md leading-md text-text-secondary">{status}</p>
        </div>

        <section aria-labelledby="plan-period" className="flex flex-col gap-[6px]">
          <h3 id="plan-period" className="text-md font-semibold leading-md text-text-primary">
            AI credits
          </h3>
          <p className="text-md leading-md text-text-secondary">
            {granted
              ? `${n(granted.delta)} added on ${date(granted.ts)}, for use until ${date(period.end)}.`
              : `${n(plan.credits)} are added each month.`}{" "}
            You have {n(balance)} in all.
          </p>
        </section>

        <section aria-labelledby="plan-usage" className="flex flex-col gap-[12px]">
          <h3 id="plan-usage" className="text-md font-semibold leading-md text-text-primary">
            What you use
          </h3>
          <Meter label="Projects" used={projects.length} amount={plan.projects} />
          <Meter label="Contributors on one project" used={mostContributors} amount={plan.contributors} />
          <p className="text-sm leading-sm text-text-tertiary">
            A plan sets these amounts. It never locks or removes a project, and every plan can mint, list and buy.
          </p>
        </section>
      </div>
    </ModalFrame>
  );
}

function Meter({ label, used, amount }: { label: string; used: number; amount: number }) {
  const over = used > amount;
  const figure = amount === 0 ? (used === 0 ? "Not on this plan" : `${n(used)}, not on this plan`) : `${n(used)} of ${n(amount)}`;
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-baseline justify-between gap-[12px] text-md leading-md">
        <span className="text-text-secondary">{label}</span>
        <span className={cn("tabular-nums", over ? "text-text-error" : "text-text-primary")}>{figure}</span>
      </div>
      {amount > 0 && <ProgressBar value={(used / amount) * 100} label={`${label}: ${figure}`} />}
      {over && amount > 0 && (
        <p className="text-sm leading-sm text-text-error">
          {n(used - amount)} over this plan&apos;s {n(amount)}. Nothing is locked or removed.
        </p>
      )}
    </div>
  );
}
