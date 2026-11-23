"use client";

// Current credit and Credit history (mobile Figma "v2 · AI Credits /
// Balance" and "/ History"), on the web's credits ledger
// (lib/create/credits.tsx) and its lots (credit-lots.ts): the balance and
// what it buys, Running low at your low mark (Settings' credit alerts), this
// monthly period's plan credits, the latest movements, and every lot —
// starting balance, plan credits, packs and custom credits — Active, Used
// up or Expired. Buy more credits (the Bottom action bar) is the AI tab's
// Buy credits sheet, straight away as on the web — its last block names the
// next plan (CL-032). This month reads as three figures, then its rows.

import * as React from "react";
import { Alert02Icon, Calendar03Icon, DiscountTag01Icon, Invoice03Icon, Table02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { allowanceOf, lotStateOf, type LotState } from "@/lib/account/money-phone";
import { runningLow } from "@/lib/create/credit-limits";
import { lotsOf, type Lot } from "@/lib/create/credit-lots";
import { usd } from "@/lib/create/credit-pricing";
import { BUILD_COST, describeEntry, useCredits, type CreditEntry } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { BuyCreditsSheet } from "../ai/buy-credits-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListRow, ListCard } from "../kit/list";
import { EmptyState } from "../kit/state";
import { ListBones, OfflineBanner } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { ComparePlansSheet, UpgradeUnlockSheet } from "./credit-sheets";
import { Hero, dateOf, n, pct } from "./parts";

/** The credits that end first: every lot ending on the earliest day counts, not only one of them. */
function expiringFirst(lots: readonly Lot[], now: number): { credits: number; expiresAt: number } | null {
  const live = lots.filter((l) => l.remaining > 0 && l.expiresAt !== null && l.expiresAt > now);
  if (!live.length) return null;
  const first = Math.min(...live.map((l) => l.expiresAt as number));
  const day = dateOf(first);
  return { credits: live.filter((l) => dateOf(l.expiresAt as number) === day).reduce((sum, l) => sum + l.remaining, 0), expiresAt: first };
}

export function CurrentCreditScreen() {
  const { hydrated, balance, ledger } = useCredits();
  const { hydrated: planReady, sub, plan } = useCreatePlan();
  const discount = useCreditDiscount();
  const { lowAt } = useSettings().credits;
  const [now] = React.useState(() => Date.now());
  const [buying, setBuying] = React.useState(false);
  const [compare, setCompare] = React.useState(false);
  const [unlock, setUnlock] = React.useState(false);

  const lots = React.useMemo(() => lotsOf(ledger), [ledger]);
  const month = planReady ? allowanceOf(ledger, lots, sub, now) : null;
  const expiring = expiringFirst(lots, now);
  const out = hydrated && balance === 0;
  const low = hydrated && runningLow(balance, lowAt);
  const recent = ledger.slice(-3).reverse();

  // The web's Buy credits, straight away: the fix first, the plan quieter in the sheet's last block (CL-032).
  const buy = () => setBuying(true);

  return (
    <Screen
      top={<TopBar back title="Current credit" />}
      className="px-8 pb-12"
      footer={
        hydrated && planReady ? (
          <BottomBar>
            <Button size="xl" className="w-full" onClick={buy}>
              Buy more credits
            </Button>
          </BottomBar>
        ) : undefined
      }
    >
      {!hydrated || !planReady ? (
        <div className="pt-4">
          <ListBones rows={4} />
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <OfflineBanner />
          <Hero
            label="Current balance"
            meta={
              <span>
                ≈ {n(balance)} concept drawings or {n(Math.floor(balance / BUILD_COST))} one-product builds
                {expiring ? ` · ${n(expiring.credits)} expire ${dateOf(expiring.expiresAt)}` : ""}
              </span>
            }
          >
            <span className={T.amountHero}>{n(balance)} credits</span>
          </Hero>
          {low && (
            <div role="status" className="flex items-start gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-error)] bg-bg-surface p-6">
              <span aria-hidden className="text-[color:var(--color-icon-warning)]">
                <Icon icon={Alert02Icon} size={20} />
              </span>
              <span className="flex flex-col gap-1">
                <span className={T.rowTitle}>{out ? "You’re out of credits" : "Running low on credits"}</span>
                <span className={T.meta}>{out ? "Buy credits or upgrade to keep creating." : "You may run out soon. Top up to keep creating."}</span>
              </span>
            </div>
          )}

          <section aria-labelledby="this-month" className="flex flex-col gap-4">
            <h2 id="this-month" className={T.section}>
              This month
            </h2>
            <dl className="grid grid-cols-3 gap-4">
              <Fact label={`${plan.name} plan allowance`} value={n(month?.allowance ?? plan.credits)} />
              <Fact label="Used" value={n(month?.used ?? 0)} tone={month && month.used > 0 ? "error" : undefined} />
              <Fact label="Remaining" value={n(month?.remaining ?? plan.credits)} tone="success" />
            </dl>
            <ListCard label="This month">
              {month && <ListRow icon={Calendar03Icon} title="Plan credits end" value={dateOf(month.endsAt)} />}
              {discount > 0 ? (
                <ListRow icon={DiscountTag01Icon} title="Credit discount" value={`${pct(discount)} off`} />
              ) : (
                <ListRow icon={DiscountTag01Icon} title="Credit discount" meta="None · Unlock" onClick={() => setUnlock(true)} />
              )}
              <ListRow icon={Table02Icon} title="Compare plans" onClick={() => setCompare(true)} />
            </ListCard>
          </section>

          <section aria-labelledby="recent" className="flex flex-col gap-4">
            <h2 id="recent" className={T.section}>
              Recent activity
            </h2>
            <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
              {recent.length === 0 ? <li className={cn(LIST_ROW, T.body, "hover:bg-transparent")}>No credit has moved yet.</li> : recent.map((e) => <ActivityRow key={e.id} entry={e} />)}
              <ListRow icon={Invoice03Icon} title="View full credit history" href="/m/plans/credits/history" />
            </ul>
          </section>
        </div>
      )}
      <BuyCreditsSheet open={buying} onClose={() => setBuying(false)} />
      <ComparePlansSheet open={compare} onClose={() => setCompare(false)} />
      <UpgradeUnlockSheet open={unlock} onClose={() => setUnlock(false)} />
    </Screen>
  );
}

/** One of This month's three figures. */
function Fact({ label, value, tone }: { label: string; value: string; tone?: "success" | "error" }) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-1 rounded-xl bg-bg-subtle px-5 py-5">
      <dt className={T.meta}>{label}</dt>
      <dd className={cn(T.section, "tabular-nums", tone === "success" && "text-text-success", tone === "error" && "text-text-error")}>{value}</dd>
    </div>
  );
}

function ActivityRow({ entry: e }: { entry: CreditEntry }) {
  const line = describeEntry(e);
  const amount = line.split(" ")[0];
  const what = line.slice(amount.length + 1);
  return (
    <li className={cn(LIST_ROW, "justify-between hover:bg-transparent")}>
      <span className="flex min-w-0 flex-col">
        <span className={cn(T.body, "truncate text-text-primary")}>{what}</span>
        <span className={T.meta}>{dateOf(e.ts)}</span>
      </span>
      <span className={cn(T.rowTitle, "shrink-0 tabular-nums", e.delta >= 0 && "text-text-success")}>{amount}</span>
    </li>
  );
}

/** "Pro pack", "Custom credit", "Starting balance", "Builder plan credits". */
function lotName(e: CreditEntry | undefined): string {
  if (!e) return "Credits";
  if (e.reason === "purchase") return e.pack ? `${e.pack} pack` : "Custom credit";
  if (e.reason === "seed") return "Starting balance";
  if (e.reason === "grant") return `${e.pack ?? "Plan"} plan credits`;
  if (e.reason === "redeem") return `Code ${e.code ?? ""}`.trimEnd();
  return "Top up";
}

const STATE_BADGE: Record<LotState, { tone: "success" | "neutral"; label: string }> = {
  active: { tone: "success", label: "Active" },
  used: { tone: "neutral", label: "Used up" },
  expired: { tone: "neutral", label: "Expired" },
};

export function CreditHistoryScreen() {
  const { hydrated, balance, ledger } = useCredits();
  const [now] = React.useState(() => Date.now());
  const byId = React.useMemo(() => new Map(ledger.map((e) => [e.id, e])), [ledger]);
  const lots = React.useMemo(() => lotsOf(ledger).slice().reverse(), [ledger]);
  const active = lots.filter((l) => lotStateOf(l, now) === "active").length;
  return (
    <Screen top={<TopBar back title="Credit history" />} className="px-8 pb-12">
      {!hydrated ? (
        <div className="pt-4">
          <ListBones rows={4} />
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <OfflineBanner />
          <Hero
            label="Total remaining credits"
            meta={
              <>
                <TestnetDemoBadge />
                <Badge tone="brand-outline">
                  {active} active {active === 1 ? "pack" : "packs"}
                </Badge>
                <span>Track your purchases and credit usage.</span>
              </>
            }
          >
            <span className={cn(T.amountHero, "text-text-brand")}>{n(balance)} credits</span>
          </Hero>
          {lots.length === 0 ? (
            <EmptyState icon={Invoice03Icon} title="No credits yet" body="Credits your plan adds and credits you buy show up here." />
          ) : (
            <ul aria-label="Credit lots" className={cn(LIST_CARD, LIST_DIVIDERS)}>
              {lots.map((l) => {
                const e = byId.get(l.id);
                const state = STATE_BADGE[lotStateOf(l, now)];
                return (
                  <li key={l.id} className={cn(LIST_ROW, "items-start hover:bg-transparent")}>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-3">
                        <span className={T.rowTitle}>{lotName(e)}</span>
                        <Badge tone={state.tone}>{state.label}</Badge>
                      </span>
                      <span className={T.meta}>
                        {e?.price !== undefined ? `Paid ${usd(e.price)}` : e?.reason === "grant" ? "With your plan" : "Free"} · {dateOf(l.ts)}
                      </span>
                      <span className={cn(T.meta, "tabular-nums")}>
                        {n(l.amount - l.bonus)} {l.amount - l.bonus === 1 ? "credit" : "credits"}
                        {l.bonus > 0 && <span className="text-text-success"> +{n(l.bonus)} bonus</span>} · Expires {l.expiresAt === null ? "Never" : dateOf(l.expiresAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn(T.section, "tabular-nums", l.remaining > 0 && "text-text-success")}>{n(l.remaining)}</span>
                      <span className={T.meta}>Remaining</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Screen>
  );
}
