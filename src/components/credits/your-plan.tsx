"use client";

// Your plan — the first section of Settings › Plan & billing (#your-plan):
// the plan and its price, when it renews (or ends, or changes), Auto-renew,
// and what it sets against what you use. "Change plan" opens Pricing, where
// the plan cards and the comparison live.
//
// Auto-renew is the plan's one off switch: off asks first (Cancel
// subscription, with a smaller plan offered instead) and then ends the plan
// with its period; on again keeps it. A smaller plan already scheduled can be
// dropped with "Keep <plan>". Plans set amounts; they never lock or remove
// anything already made, so a meter past its amount says so plainly.

import * as React from "react";
import Link from "next/link";
import { Button, Toggle, buttonVariants } from "@/components/ideeza";
import { SettingsCard, SettingsRow } from "@/components/settings/settings-card";
import { PLAN_SECTIONS, PRICING_HREF, usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { creditPeriod, planOf, priceOf } from "@/lib/create/plans";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { CancelDialog, Meter, usePlanUsage } from "./plans-panel";

const n = (v: number) => v.toLocaleString("en-US");
/** "$10", "$6.40": whole dollars without cents. */
const price = (v: number) => (Number.isInteger(v) ? `$${v}` : usd(v));

/** A row's value on the right, in the row's own type. */
export function RowValue({ children }: { children: React.ReactNode }) {
  return <span className="text-md font-medium leading-md tabular-nums text-text-primary">{children}</span>;
}

/** A row whose control is wide (a meter, a field and its button): under the
 *  label once the label would get narrower than 10rem, as on a phone. */
export const WRAP = "flex-wrap [&>span:first-child]:min-w-[10rem]";

/** A card action that is a link, drawn as the card's Edit is. */
export const CARD_ACTION = cn(
  buttonVariants({ hierarchy: "outline-brand", size: "sm" }),
  "[@media(pointer:coarse)]:h-[var(--touch-min)]",
);

export function YourPlanCard() {
  const { hydrated, sub, plan, keep } = useCreatePlan();
  const { hydrated: creditsReady, ledger } = useCredits();
  const usage = usePlanUsage();
  const { date } = useDates();
  const [cancelling, setCancelling] = React.useState(false);
  const [now] = React.useState(() => Date.now());

  const action = (
    <Link href={PRICING_HREF} className={CARD_ACTION}>
      Change plan
    </Link>
  );

  if (!hydrated) {
    return (
      <SettingsCard id={PLAN_SECTIONS.plan} title="Your plan" action={action}>
        <SettingsRow label="Plan" help="Reading your plan…" />
      </SettingsCard>
    );
  }

  const paid = sub.renewsAt !== null;
  const when = sub.renewsAt !== null ? date(sub.renewsAt) : "";
  const per = priceOf(sub.tier, sub.cycle);
  const billed = !paid
    ? `Free forever. ${n(plan.credits)} AI credits every month.`
    : sub.cycle === "yearly"
      ? `${price(per.perMonth)} a month, billed yearly (${usd(per.period)} a year).`
      : `${price(per.perMonth)} a month, billed monthly.`;

  const cancelled = sub.pending?.tier === "free";
  const switching = sub.pending && !cancelled ? sub.pending : null;
  const switchLine = switching
    ? switching.tier === sub.tier
      ? `${plan.name} goes on, billed monthly. Nothing is charged now.`
      : `${planOf(switching.tier).name} starts, billed ${switching.cycle === "yearly" ? "yearly" : "monthly"}. Nothing is charged now.`
    : "";

  const period = creditPeriod(sub, now);
  const granted = creditsReady ? ledger.find((e) => e.reason === "grant" && e.orderId === `grant_${sub.id}_${period.index}`) : undefined;

  return (
    <SettingsCard id={PLAN_SECTIONS.plan} title="Your plan" action={action}>
      <SettingsRow label="Plan" help={billed} control={<RowValue>{plan.name}</RowValue>} />
      {paid &&
        (switching ? (
          <SettingsRow
            label="Changes on"
            help={switchLine}
            className={WRAP}
            control={
              <>
                <RowValue>{when}</RowValue>
                <Button hierarchy="secondary" size="sm" className="[@media(pointer:coarse)]:h-[var(--touch-min)]" onClick={keep}>
                  Keep {plan.name}
                </Button>
              </>
            }
          />
        ) : (
          <SettingsRow
            label={cancelled ? "Ends on" : "Renews on"}
            help={
              cancelled
                ? `Then you're on Free. Turn Auto-renew on to keep ${plan.name}.`
                : `For ${usd(per.period)}. Renewals in this demo aren't charged (testnet).`
            }
            control={<RowValue>{when}</RowValue>}
          />
        ))}
      {paid && (
        <SettingsRow
          label="Auto-renew"
          help={
            cancelled
              ? `Off. ${plan.name} ends on ${when}, and nothing you made is deleted.`
              : `On. Turn it off to end ${plan.name} on ${when}; nothing you made is deleted.`
          }
          control={<Toggle checked={!cancelled} onChange={() => (cancelled ? keep() : setCancelling(true))} aria-label="Auto-renew" />}
        />
      )}
      <SettingsRow
        label="AI credits"
        help={
          granted
            ? `${n(granted.delta)} added on ${date(granted.ts)}. They last until ${date(period.end)}.`
            : "Added at the start of each monthly period. They last until it ends."
        }
        control={<RowValue>{n(plan.credits)} a month</RowValue>}
      />
      <SettingsRow
        label="Projects"
        help={`You have ${n(usage.projects)}. ${plan.name} sets ${n(plan.projects)}.`}
        className={WRAP}
        control={<Meter used={usage.projects} amount={plan.projects} verb="created" label="Projects" />}
      />
      <SettingsRow
        label="Contributors"
        help={
          plan.contributors === 0
            ? `${plan.name} works alone. Up to ${n(usage.mostContributors)} on one of your projects now.`
            : `Up to ${n(usage.mostContributors)} on one project. ${plan.name} sets ${n(plan.contributors)}.`
        }
        className={WRAP}
        control={
          plan.contributors > 0 ? (
            <Meter used={usage.mostContributors} amount={plan.contributors} verb="added" label="Contributors" />
          ) : (
            <RowValue>None</RowValue>
          )
        }
      />
      <SettingsRow label="Exports" control={<RowValue>{n(plan.exports)} a month</RowValue>} />
      <p className="m-0 mt-[12px] max-w-[62ch] text-sm leading-sm text-text-tertiary">
        A plan sets these amounts. It never locks or removes a project, and every plan can mint, list and buy.
      </p>
      {cancelling && <CancelDialog onClose={() => setCancelling(false)} />}
    </SettingsCard>
  );
}
