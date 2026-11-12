"use client";

// Downgrade plan (mobile Figma "v2 · Downgrade"; the web's DowngradeDialog):
// `?plan=tinkerer&cycle=monthly` — a smaller plan, or the same plan billed
// monthly. Nothing is paid now: the switch waits for the period's end
// (lib/create/plans.ts scheduleSwitch), and nothing you made is removed.
// What changes is the web's lossesOf, with what you have against the smaller
// plan's amounts.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { usePlanUsage } from "@/components/credits/plans-panel";
import { usd, type BillingCycle } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { PLANS, lossesOf, planOf, priceOf, relationOf, type PlanTier } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { EmptyState } from "../kit/state";
import { ListBones, OfflineBanner } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { useGoBack } from "../nav-trail";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { CARD, HAIRLINE, dateOf, n } from "./parts";

export function DowngradeScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const keepPlan = useGoBack("/m/plans?tab=billing");
  const toast = useToast();
  const { hydrated, sub, plan: current, schedule } = useCreatePlan();
  const usage = usePlanUsage();
  const tier = PLANS.find((p) => p.tier === params.get("plan") && p.monthly > 0)?.tier as PlanTier | undefined;
  const cycle: BillingCycle = params.get("cycle") === "yearly" ? "yearly" : "monthly";

  if (!hydrated)
    return (
      <Screen top={<TopBar back="/m/plans?tab=billing" title="Downgrade plan" />} className="px-8 pt-8">
        <ListBones rows={4} />
      </Screen>
    );
  if (!tier || relationOf(sub, tier, cycle) !== "downgrade" || sub.renewsAt === null) {
    return (
      <Screen top={<TopBar back="/m/plans?tab=billing" title="Downgrade plan" />} className="px-8 pt-8">
        <EmptyState
          icon={InformationCircleIcon}
          title="Nothing to downgrade"
          body={tier && relationOf(sub, tier, cycle) === "scheduled" ? `${planOf(tier).name} already starts on ${sub.renewsAt ? dateOf(sub.renewsAt) : "your renewal"}.` : "This isn’t a smaller plan than yours. Choose one on Plan & pricing."}
          action={{ label: "See plans", href: "/m/plans" }}
        />
      </Screen>
    );
  }

  const target = planOf(tier);
  const same = sub.tier === tier;
  const when = dateOf(sub.renewsAt);
  const losses = lossesOf(current, target);
  const nowPer = priceOf(sub.tier, sub.cycle).perMonth;
  const per = priceOf(tier, cycle);
  const rows = [
    { label: "Projects", line: `You have ${n(usage.projects)}. ${target.name} allows ${n(target.projects)}.`, over: usage.projects > target.projects },
    {
      label: "Contributors",
      line: `Up to ${n(usage.mostContributors)} on one project. ${target.name} allows ${target.contributors === 0 ? "none" : n(target.contributors)}.`,
      over: usage.mostContributors > target.contributors,
    },
  ];

  const confirm = () => {
    schedule(tier, cycle);
    toast({ title: same ? `Monthly billing from ${when}` : `Switches to ${target.name} on ${when}` });
    router.replace("/m/plans?tab=billing");
  };

  return (
    <Screen
      top={<TopBar back="/m/plans?tab=billing" title={same ? "Switch to monthly" : "Downgrade plan"} />}
      className="px-8 pb-8 pt-4"
      footer={
        <BottomBar>
          <Button hierarchy="danger" size="xl" className="w-full" onClick={confirm}>
            {same ? "Switch to monthly" : "Confirm downgrade"}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={keepPlan}>
            Keep {current.name}
          </Button>
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-8">
        <OfflineBanner />
        <Banner tone="attention" title={same ? "You’re about to switch to monthly billing" : "You’re about to downgrade"}>
          You keep {current.name} until {when}. The change starts then; nothing is charged now.
        </Banner>
        <section aria-label="From and to" className={cn(CARD, "flex flex-col gap-4 p-8")}>
          <div className="flex items-start justify-between gap-4">
            <span className="flex flex-col gap-1">
              <span className={T.meta}>Current plan</span>
              <span className={T.section}>
                {current.name} · {sub.cycle === "yearly" ? "Annual" : "Monthly"}
              </span>
            </span>
            <span className={cn(T.body, "inline-flex shrink-0 flex-wrap items-center justify-end gap-3 tabular-nums text-text-primary")}>
              <TestnetDemoBadge />
              {usd(nowPer)}/mo
            </span>
          </div>
          <span aria-hidden className="self-center text-text-brand">
            <Icon icon={ArrowDown02Icon} size={20} />
          </span>
          <div className="flex items-start justify-between gap-4">
            <span className="flex flex-col gap-1">
              <span className={T.meta}>New plan</span>
              <span className={cn(T.section, "text-text-brand")}>
                {target.name} · {cycle === "yearly" ? "Annual" : "Monthly"}
              </span>
            </span>
            <span className={cn(T.body, "shrink-0 tabular-nums text-text-primary")}>{usd(per.perMonth)}/mo</span>
          </div>
        </section>
        <section aria-labelledby="what-changes" className={cn(CARD, "flex flex-col gap-4 p-8")}>
          <h2 id="what-changes" className={T.section}>
            What changes
          </h2>
          {losses.length === 0 ? (
            <p className={T.body}>Only how you’re billed: monthly instead of yearly.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {losses.map((l) => {
                const [label, change] = l.split(": ");
                return (
                  <li key={l} className={cn(T.body, "flex items-start justify-between gap-6")}>
                    <span>{label}</span>
                    <span className="text-right text-text-error">{change}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {!same && (
            <ul className={cn(HAIRLINE, "flex flex-col gap-3 border-t-[length:var(--border-width-1)] pt-4")}>
              {rows.map((r) => (
                <li key={r.label} className="flex flex-col gap-1">
                  <span className={T.rowTitle}>{r.label}</span>
                  <span className={cn(T.body, r.over && "text-text-error")}>{r.line}</span>
                </li>
              ))}
              <li className={cn(T.body, "text-text-primary")}>Nothing is removed. Every project and contributor you have stays as it is.</li>
            </ul>
          )}
        </section>
        <p className={cn(T.meta, "rounded-xl bg-bg-brand-subtle px-8 py-6 text-text-brand")}>
          {current.name} stays active until {when}. {target.name}
          {same ? " billed monthly" : ""} starts after that at {usd(per.period)} a {cycle === "yearly" ? "year" : "month"}. Due today: {usd(0)}.
        </p>
      </div>
    </Screen>
  );
}
