"use client";

// Invoices — a section of Settings › Plan & billing (#invoices), from User
// Panel V2 › Billing History (41549:164343): every payment, for a plan or for
// credits (lib/account/invoices.ts) — search by order or invoice number on
// the left, the year on the right, then Transaction ID · Date & time ·
// Payment by · Plan name · Status and the invoice to download (read, print or
// save as PDF), ten to a page.

import * as React from "react";
import Link from "next/link";
import { Download04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Select, SearchInput, TestnetDemoBadge } from "@/components/ideeza";
import { Pagination } from "@/components/projects/pagination";
import { SettingsCard } from "@/components/settings/settings-card";
import { filterInvoices, invoiceYears, invoicesOf } from "@/lib/account/invoices";
import { PLAN_SECTIONS, usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { CoinGlyph } from "./payment-picker";
import { useDates } from "@/lib/settings/use-dates";

const PER_PAGE = 10;
const ALL = "all";

export const invoiceHref = (id: string) => `/settings/plan/invoice/${encodeURIComponent(id)}`;

export function InvoicesCard() {
  return (
    <SettingsCard
      id={PLAN_SECTIONS.invoices}
      title="Invoices"
      description="Every payment for a plan or credits, each with its invoice to read, print or save as a PDF."
    >
      <BillingHistory />
    </SettingsCard>
  );
}

function BillingHistory() {
  // "30/09/2024 | 12:41:22 PM", in Settings › Language › Date & Time Formatting.
  const dates = useDates();
  const stamp = (ts: number) => (
    <>
      {dates.date(ts, { style: "numeric" })}
      <span className="block text-sm leading-sm text-text-tertiary">{dates.time(ts, { seconds: true })}</span>
    </>
  );
  const { hydrated: creditsReady, ledger } = useCredits();
  const { hydrated: planReady, sub } = useCreatePlan();
  const [query, setQuery] = React.useState("");
  const [year, setYear] = React.useState<string>(ALL);
  const [page, setPage] = React.useState(1);

  const all = React.useMemo(() => invoicesOf(ledger, sub.orders), [ledger, sub.orders]);
  const years = React.useMemo(() => invoiceYears(all), [all]);
  const shown = filterInvoices(all, query, year === ALL ? null : Number(year));
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = shown.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  if (!creditsReady || !planReady) return <p className="m-0 py-[12px] text-md leading-md text-text-tertiary">Reading your payments…</p>;

  if (all.length === 0) {
    return (
      <p className="m-0 py-[12px] text-md leading-md text-text-secondary">
        No payments yet. What you pay for a plan or for credits shows up here, each with its invoice.{" "}
        <a
          href={`#${PLAN_SECTIONS.buy}`}
          className="rounded-sm font-medium text-text-link outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Buy credits
        </a>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <SearchInput
          aria-label="Search by order ID"
          placeholder="Search by order ID"
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          onClear={() => {
            setQuery("");
            setPage(1);
          }}
          containerClassName="w-[280px] max-md:w-full"
        />
        <Select
          aria-label="Year"
          size="md"
          value={year}
          onChange={(v) => {
            setYear(v);
            setPage(1);
          }}
          options={[{ label: "All years", value: ALL }, ...years.map((y) => ({ label: String(y), value: String(y) }))]}
        />
      </div>

      {shown.length === 0 ? (
        <p role="status" className="m-0 py-[12px] text-md leading-md text-text-secondary">
          No payment matches “{query.trim()}”{year !== ALL ? ` in ${year}` : ""}.
        </p>
      ) : (
        // `relative`: the table's visually hidden labels are positioned, and
        // without it they escape this scroller and widen the whole page.
        <div className="relative overflow-x-auto rounded-xl border border-solid border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-md leading-md">
            <caption className="sr-only">Payments, newest first</caption>
            <thead className="bg-bg-subtle text-text-primary">
              <tr>
                {["Transaction ID", "Date & time", "Payment by", "Plan name", "Amount", "Status"].map((h) => (
                  <th key={h} scope="col" className="px-[12px] py-[10px] font-medium">
                    {h}
                  </th>
                ))}
                <th scope="col" className="w-[60px] px-[12px] py-[10px]">
                  <span className="sr-only">Invoice</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const coin = r.paidWith.startsWith("USDT") ? "USDT" : r.paidWith.startsWith("IDZ") ? "IDZ" : null;
                return (
                  <tr key={r.id} className="border-t border-solid border-border">
                    <th scope="row" className="whitespace-nowrap px-[12px] py-[10px] font-regular text-text-primary">
                      {r.number}
                    </th>
                    <td className="whitespace-nowrap px-[12px] py-[10px] tabular-nums text-text-primary">{stamp(r.ts)}</td>
                    <td className="px-[12px] py-[10px] text-text-primary">
                      <span className="inline-flex items-center gap-[8px]">
                        {coin && <CoinGlyph coin={coin} />}
                        {r.paidWith}
                      </span>
                    </td>
                    <td className="px-[12px] py-[10px] text-text-primary">{r.item}</td>
                    <td className="px-[12px] py-[10px] tabular-nums text-text-primary">{usd(r.total)}</td>
                    <td className={cn("px-[12px] py-[10px]", r.status === "Paid" ? "text-text-success" : "text-text-secondary")}>
                      {r.status === "Paid" ? "Successful" : r.status}
                    </td>
                    <td className="px-[12px] py-[10px]">
                      <Link
                        href={invoiceHref(r.id)}
                        aria-label={`Invoice ${r.number}`}
                        title="Download invoice"
                        className="inline-flex size-[36px] items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:size-[var(--touch-min)]"
                      >
                        <Icon icon={Download04Icon} size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <p className="flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
          <TestnetDemoBadge /> Paid from the demo wallet on testnet. No real money moved.
        </p>
        {pageCount > 1 && <Pagination page={current} pageCount={pageCount} onChange={setPage} />}
      </div>
    </div>
  );
}
