"use client";

// Settings › Plan & pricing (User Panel V2, "✅ Pricing" page): Plans (the
// design's "Available Plan"), Credits, and Billing history — every payment,
// for a plan or for credits. Payment method comes when a real payment
// provider does; until then the only way to pay is the Demo wallet, which
// keeps its own home behind the sidebar's wallet button.
//
// The tab is in the URL (?tab=credits, ?tab=billing), so a link lands on it
// and a refresh keeps it.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TestnetDemoBadge } from "@/components/ideeza";
import { TabStrip, type TabDef } from "@/components/projects/details/tab-strip";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { planOf } from "@/lib/create/plans";
import { useBuyCredits } from "./buy-credits";
import { CreditsPanel } from "./credits-panel";
import { PlansPanel } from "./plans-panel";

type Tab = "plans" | "credits" | "billing";
const TABS: readonly TabDef<Tab>[] = [
  { id: "plans", label: "Plans" },
  { id: "credits", label: "Credits" },
  { id: "billing", label: "Billing history" },
];

export function PlanPricingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get("tab");
  const tab: Tab = asked === "credits" || asked === "billing" ? asked : "plans";
  const select = (id: Tab) => router.replace(id === "plans" ? pathname : `${pathname}?tab=${id}`, { scroll: false });

  return (
    <div className="h-full overflow-y-auto bg-bg-page">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-[24px] px-[32px] py-[28px] max-md:px-[16px] max-md:py-[20px]">
        <header className="flex flex-col gap-[4px]">
          <nav aria-label="Breadcrumb" className="text-sm leading-sm text-text-tertiary">
            Settings <span aria-hidden>›</span> <span className="text-text-secondary">Plan &amp; pricing</span>
          </nav>
          <h1 className="text-3xl font-semibold leading-3xl text-text-primary">Plan &amp; pricing</h1>
        </header>

        <TabStrip label="Plan and pricing sections" groups={[TABS]} active={tab} onSelect={select} />

        <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "plans" ? <PlansPanel /> : tab === "credits" ? <CreditsPanel /> : <BillingHistory />}
        </section>
      </div>
    </div>
  );
}

type Row = { id: string; ts: number; item: string; paidWith: string; amount: number | null; status: string };

function BillingHistory() {
  const { hydrated: creditsReady, ledger } = useCredits();
  const { hydrated: planReady, sub } = useCreatePlan();
  const { open } = useBuyCredits();

  if (!creditsReady || !planReady) return <p className="text-md leading-md text-text-tertiary">Reading your payments…</p>;

  const rows: Row[] = [
    ...ledger
      .filter((e) => e.reason === "purchase")
      .map((e) => ({
        id: e.orderId ?? e.id,
        ts: e.ts,
        item: `${e.pack ? `${e.pack} pack` : "Custom credits"} · ${e.delta.toLocaleString("en-US")} credits`,
        paidWith: e.paidWith ?? "—",
        amount: e.price ?? null,
        status: "Paid",
      })),
    ...sub.orders.map((o) => ({
      id: o.orderId,
      ts: o.ts,
      item: `${planOf(o.tier).name} plan · ${o.cycle === "yearly" ? "annual" : "monthly"}${o.kind === "renewal" ? " renewal" : ""}`,
      paidWith: o.paidWith,
      amount: o.amount,
      status: o.kind === "renewal" ? "Renewed" : "Paid",
    })),
  ].sort((a, b) => b.ts - a.ts);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-[8px] rounded-xl border border-solid border-border bg-bg-surface p-[24px]">
        <h2 className="text-lg font-semibold leading-lg text-text-primary">No payments yet</h2>
        <p className="max-w-[62ch] text-md leading-md text-text-secondary">
          What you pay for a plan or for credits shows up here, with its order, how you paid and the amount.
        </p>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => open()}
          className="text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Buy credits
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
        <TestnetDemoBadge /> Paid from the demo wallet on testnet. No real money moved.
      </p>
      <div className="overflow-x-auto rounded-xl border border-solid border-border bg-bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-left text-md leading-md">
          <thead className="bg-bg-subtle text-sm leading-sm text-text-secondary">
            <tr>
              {["Order", "Date", "Item", "Paid with", "Amount", "Status"].map((h) => (
                <th key={h} scope="col" className="px-[16px] py-[10px] font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-solid border-border">
                <th scope="row" className="px-[16px] py-[12px] font-mono text-sm font-medium text-text-primary">
                  {r.id.replace(/^(order|plan|renew)_/, "").slice(0, 16).toUpperCase()}
                </th>
                <td className="px-[16px] py-[12px] tabular-nums text-text-secondary">
                  {new Date(r.ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-[16px] py-[12px] text-text-primary">{r.item}</td>
                <td className="px-[16px] py-[12px] text-text-secondary">{r.paidWith}</td>
                <td className="px-[16px] py-[12px] tabular-nums text-text-primary">{r.amount !== null ? usd(r.amount) : "—"}</td>
                <td className="px-[16px] py-[12px] text-text-success">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
