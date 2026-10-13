"use client";

// Billing history (User Panel V2 › Billing History 41549:164343): every
// payment, for a plan or for credits, as an invoice (lib/account/invoices.ts)
// — search by invoice or order number, a year, ten to a page, and each row's
// invoice to read, print or save as PDF.

import * as React from "react";
import Link from "next/link";
import { Select, SearchInput, TestnetDemoBadge } from "@/components/ideeza";
import { Pagination } from "@/components/projects/pagination";
import { filterInvoices, invoiceYears, invoicesOf } from "@/lib/account/invoices";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { useBuyCredits } from "./buy-credits";

const PER_PAGE = 10;
const ALL = "all";

export const invoiceHref = (id: string) => `/settings/plan/invoice/${encodeURIComponent(id)}`;

export function BillingHistory() {
  const { hydrated: creditsReady, ledger } = useCredits();
  const { hydrated: planReady, sub } = useCreatePlan();
  const { open } = useBuyCredits();
  const [query, setQuery] = React.useState("");
  const [year, setYear] = React.useState<string>(ALL);
  const [page, setPage] = React.useState(1);

  const all = React.useMemo(() => invoicesOf(ledger, sub.orders), [ledger, sub.orders]);
  const years = React.useMemo(() => invoiceYears(all), [all]);
  const shown = filterInvoices(all, query, year === ALL ? null : Number(year));
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = shown.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  if (!creditsReady || !planReady) return <p className="text-md leading-md text-text-tertiary">Reading your payments…</p>;

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-start gap-[8px] rounded-xl border border-solid border-border bg-bg-surface p-[24px]">
        <h2 className="text-lg font-semibold leading-lg text-text-primary">No payments yet</h2>
        <p className="max-w-[62ch] text-md leading-md text-text-secondary">
          What you pay for a plan or for credits shows up here, each with its invoice.
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
    <div className="@container flex flex-col gap-[12px]">
      <p className="flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
        <TestnetDemoBadge /> Paid from the demo wallet on testnet. No real money moved.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <SearchInput
          aria-label="Search by invoice or order number"
          placeholder="Search by invoice or order number"
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          onClear={() => {
            setQuery("");
            setPage(1);
          }}
          containerClassName="w-[320px] max-md:w-full"
        />
        {years.length > 1 && (
          <Select
            aria-label="Year"
            value={year}
            onChange={(v) => {
              setYear(v);
              setPage(1);
            }}
            options={[{ label: "All years", value: ALL }, ...years.map((y) => ({ label: String(y), value: String(y) }))]}
          />
        )}
      </div>

      {shown.length === 0 ? (
        <p role="status" className="rounded-xl border border-solid border-border bg-bg-surface p-[20px] text-md leading-md text-text-secondary">
          No payment matches “{query.trim()}”{year !== ALL ? ` in ${year}` : ""}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-solid border-border bg-bg-surface">
          <table className="w-full min-w-[860px] border-collapse text-left text-md leading-md">
            <caption className="sr-only">Payments, newest first</caption>
            <thead className="bg-bg-subtle text-sm leading-sm text-text-secondary">
              <tr>
                {["Invoice", "Date", "Item", "Paid with", "Amount", "Status", ""].map((h, i) => (
                  <th key={i} scope="col" className="px-[16px] py-[10px] font-semibold">
                    {h || <span className="sr-only">Open</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-solid border-border">
                  <th scope="row" className="px-[16px] py-[12px] font-mono text-sm font-medium text-text-primary">
                    {r.number}
                  </th>
                  <td className="px-[16px] py-[12px] tabular-nums text-text-secondary">
                    {new Date(r.ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-[16px] py-[12px] text-text-primary">{r.item}</td>
                  <td className="px-[16px] py-[12px] text-text-secondary">{r.paidWith}</td>
                  <td className="px-[16px] py-[12px] tabular-nums text-text-primary">{usd(r.total)}</td>
                  <td className={cn("px-[16px] py-[12px]", r.status === "Paid" ? "text-text-success" : "text-text-secondary")}>{r.status}</td>
                  <td className="px-[16px] py-[12px] text-right">
                    <Link
                      href={invoiceHref(r.id)}
                      aria-label={`Invoice ${r.number}`}
                      className="font-semibold text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Invoice
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 && <Pagination page={current} pageCount={pageCount} onChange={setPage} />}
    </div>
  );
}
