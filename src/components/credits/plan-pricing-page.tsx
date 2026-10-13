"use client";

// Settings › Plan & pricing (User Panel V2, "✅ Pricing" page). Two tabs
// today, as the design's: Credits (buy and track AI credits) and Billing
// history (every purchase). Available plan and Payment method come with the
// plan step: plans aren't on sale, and the only way to pay is the Demo wallet,
// which keeps its own home behind the sidebar's wallet button.
//
// The tab is in the URL (?tab=billing), so a link lands on it and a refresh
// keeps it.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TestnetDemoBadge } from "@/components/ideeza";
import { TabStrip, type TabDef } from "@/components/projects/details/tab-strip";
import { PLAN_PRICING_HREF, usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useBuyCredits } from "./buy-credits";
import { CreditsPanel } from "./credits-panel";

type Tab = "credits" | "billing";
const TABS: readonly TabDef<Tab>[] = [
  { id: "credits", label: "Credits" },
  { id: "billing", label: "Billing history" },
];

export function PlanPricingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "billing" ? "billing" : "credits";
  const select = (id: Tab) => router.replace(id === "credits" ? pathname : `${pathname}?tab=${id}`, { scroll: false });

  return (
    <div className="h-full overflow-y-auto bg-bg-page">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-[24px] px-[32px] py-[28px] max-md:px-[16px] max-md:py-[20px]">
        <header className="flex flex-col gap-[4px]">
          <nav aria-label="Breadcrumb" className="text-sm leading-sm text-text-tertiary">
            Settings <span aria-hidden>›</span> <span className="text-text-secondary">Plan &amp; pricing</span>
          </nav>
          <h1 className="text-3xl font-semibold leading-3xl text-text-primary">Plan &amp; pricing</h1>
        </header>

        <TabStrip label="Plan and pricing sections" groups={[TABS]} active={tab} onSelect={select} />

        <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "credits" ? <CreditsPanel /> : <BillingHistory />}
        </section>
      </div>
    </div>
  );
}

function BillingHistory() {
  const { hydrated, ledger } = useCredits();
  const { open } = useBuyCredits();
  const rows = ledger.filter((e) => e.reason === "purchase").slice().reverse();

  if (!hydrated) return <p className="text-md leading-md text-text-tertiary">Reading your purchases…</p>;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-[8px] rounded-xl border border-solid border-border bg-bg-surface p-[24px]">
        <h2 className="text-lg font-semibold leading-lg text-text-primary">No purchases yet</h2>
        <p className="max-w-[62ch] text-md leading-md text-text-secondary">
          Credits you buy show up here with their order, how you paid and the amount.
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
        <table className="w-full min-w-[720px] border-collapse text-left text-md leading-md">
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
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-solid border-border">
                <th scope="row" className="px-[16px] py-[12px] font-mono text-sm font-medium text-text-primary">
                  {(e.orderId ?? e.id).replace(/^order_/, "").toUpperCase()}
                </th>
                <td className="px-[16px] py-[12px] tabular-nums text-text-secondary">
                  {new Date(e.ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-[16px] py-[12px] text-text-primary">
                  {e.pack ? `${e.pack} pack` : "Custom credits"} · {e.delta.toLocaleString("en-US")} credits
                </td>
                <td className="px-[16px] py-[12px] text-text-secondary">{e.paidWith ?? "—"}</td>
                <td className="px-[16px] py-[12px] tabular-nums text-text-primary">{e.price !== undefined ? usd(e.price) : "—"}</td>
                <td className="px-[16px] py-[12px] text-text-success">Paid</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-sm text-text-tertiary">
        What each purchase has left, and when it expires, is in the{" "}
        <Link href={PLAN_PRICING_HREF} className="font-semibold text-text-link hover:text-text-link-hover">
          credit history
        </Link>
        .
      </p>
    </div>
  );
}
