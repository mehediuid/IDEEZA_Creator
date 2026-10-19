"use client";

// /settings/get-paid/history (User Panel V2 "Withdraw history" 41537:183372,
// Download Statement 41537:183731): three tiles, the dollars Complete, In
// Progress and Pending, with Download Statement under them; then search,
// status and a date range over the table (Amount · Date & Time · Transaction
// ID · Method · Status · a row's own CSV), ten to a page, newest first.
// Download Statement builds the CSV for the year or month you choose (your
// sales, the IDEEZA fees and your withdrawals) and downloads it at once: no
// email, no wait (Figma's emailed PDF needs sign-in).

import * as React from "react";
import Link from "next/link";
import { Download04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ModalFrame, SearchInput, Select, TestnetDemoBadge, buttonVariants, type BadgeTone } from "@/components/ideeza";
import { DateRangeFilter } from "@/components/blog/list/date-range-filter";
import { Pagination } from "@/components/projects/pagination";
import {
  filterWithdrawals,
  formatUsd,
  statementCsv,
  statementFileName,
  statementYears,
  STATUS_WORD,
  WITHDRAWAL_STATUSES,
  withdrawalStats,
  type Earning,
  type StatementPeriod,
  type Withdrawal,
  type WithdrawalStatus,
} from "@/lib/account/payout";
import { usePayout } from "@/lib/account/use-payout";
import type { DayRange } from "@/lib/blog/date-range";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { SettingsCard } from "../settings-card";
import { SettingsFrame } from "../settings-frame";
import { formatWhen, GET_PAID_BALANCE, SubViewHeading, useEarnings } from "./parts";

const PER_PAGE = 10;
const ALL = "all";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TONE: Record<WithdrawalStatus, BadgeTone> = { complete: "success", "in-progress": "brand", pending: "warning" };

/** Saves `text` as a file through the browser's own download. */
function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function HistoryPage() {
  const store = usePayout();
  const { ready, earnings } = useEarnings();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string>(ALL);
  const [range, setRange] = React.useState<DayRange | null>(null);
  const [page, setPage] = React.useState(1);
  const [statementOpen, setStatementOpen] = React.useState(false);
  const [said, setSaid] = React.useState("");
  const headingId = React.useId();

  if (!store || !ready) {
    return (
      <SettingsFrame page="get-paid">
        <SubViewHeading title="Withdrawal History" id={headingId} />
        <p className="m-0 text-md leading-md text-text-tertiary">Reading your withdrawals…</p>
      </SettingsFrame>
    );
  }

  const all = store.withdrawals;
  const stats = withdrawalStats(all);
  const shown = filterWithdrawals(all, { query, status: status === ALL ? null : (status as WithdrawalStatus), range });
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = shown.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <SettingsFrame page="get-paid">
      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>
      <SubViewHeading title="Withdrawal History" id={headingId} />

      <section aria-label="Totals by status" className="flex flex-col items-center gap-[16px] rounded-xl border border-solid border-border p-[16px]">
        <dl className="m-0 grid w-full grid-cols-1 gap-[12px] [@container(min-width:560px)]:grid-cols-3">
          {WITHDRAWAL_STATUSES.map((s) => (
            <div key={s} className="flex flex-col-reverse gap-[2px] rounded-xl border border-solid border-border p-[16px]">
              <dt className="text-md leading-md text-text-secondary">{STATUS_WORD[s]}</dt>
              <dd className="m-0 text-xl font-semibold leading-xl tabular-nums text-text-primary">{formatUsd(stats[s])}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setStatementOpen(true)}
          className="min-h-[24px] cursor-pointer rounded-sm text-md font-medium leading-md text-text-brand underline underline-offset-2 outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
        >
          Download Statement
        </button>
      </section>

      {all.length === 0 ? (
        <div className="flex flex-col items-start gap-[12px] rounded-xl border border-solid border-border p-[20px]">
          <p className="m-0 text-lg font-medium leading-lg text-text-primary">No withdrawals yet</p>
          <p className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">
            When you withdraw from your balance, each withdrawal shows here with its reference and status.
          </p>
          <Link href={GET_PAID_BALANCE} className={buttonVariants({ hierarchy: "secondary", size: "md", className: "max-md:min-h-[var(--touch-min)]" })}>
            Go to your balance
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            <SearchInput
              aria-label="Search by reference or method"
              placeholder="Search by reference or method"
              value={query}
              onValueChange={reset(setQuery)}
              onClear={() => reset(setQuery)("")}
              containerClassName="w-[300px] max-md:w-full"
            />
            <div className="flex flex-wrap items-center gap-[8px]">
              <Select
                aria-label="Status"
                size="lg"
                value={status}
                onChange={reset(setStatus)}
                options={[{ label: "All statuses", value: ALL }, ...WITHDRAWAL_STATUSES.map((s) => ({ label: STATUS_WORD[s], value: s }))]}
              />
              <DateRangeFilter value={range} onChange={reset(setRange)} />
            </div>
          </div>

          <SettingsCard id="history" title="Balance Details" action={<TestnetDemoBadge />}>
            {shown.length === 0 ? (
              <p role="status" className="m-0 py-[12px] text-md leading-md text-text-secondary">
                No withdrawal matches these filters.
              </p>
            ) : (
              <div className="relative mt-[8px] overflow-x-auto rounded-lg border border-solid border-border">
                <table className="w-full min-w-[760px] border-collapse text-left text-md leading-md">
                  <caption className="sr-only">Withdrawals, newest first</caption>
                  <thead className="bg-bg-subtle text-text-primary">
                    <tr>
                      {["Amount", "Date & Time", "Transaction ID", "Method", "Status"].map((h) => (
                        <th key={h} scope="col" className="px-[16px] py-[12px] font-medium">
                          {h}
                        </th>
                      ))}
                      <th scope="col" className="w-[56px] px-[16px] py-[12px]">
                        <span className="sr-only">Receipt</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((w) => (
                      <HistoryRow key={w.id} w={w} onSaved={setSaid} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pageCount > 1 && <Pagination page={current} pageCount={pageCount} onChange={setPage} />}
          </SettingsCard>
        </>
      )}

      <StatementDialog
        open={statementOpen}
        earnings={earnings}
        withdrawals={all}
        onClose={() => setStatementOpen(false)}
        onSaved={(name) => setSaid(`${name} downloaded.`)}
      />
    </SettingsFrame>
  );
}

function HistoryRow({ w, onSaved }: { w: Withdrawal; onSaved: (s: string) => void }) {
  const d = new Date(w.at);
  const receipt = () => {
    const name = `ideeza-withdrawal-${w.id}.csv`;
    download(statementCsv({ year: d.getFullYear(), month: d.getMonth() + 1 }, [], [w]), name);
    onSaved(name);
  };
  return (
    <tr className="border-t border-solid border-border">
      <td className="whitespace-nowrap px-[16px] py-[12px] tabular-nums text-text-primary">
        {formatUsd(w.amount)}
        <span className="block text-sm leading-sm text-text-tertiary">in {w.token}</span>
      </td>
      <td className="whitespace-nowrap px-[16px] py-[12px] tabular-nums text-text-primary">{formatWhen(w.at)}</td>
      <th scope="row" className="whitespace-nowrap px-[16px] py-[12px] font-mono font-regular text-text-primary">
        {w.id}
      </th>
      <td className="whitespace-nowrap px-[16px] py-[12px] text-text-primary">
        {w.to.label}
        {w.to.address && <span className="font-mono text-text-tertiary"> ({shortAddress(w.to.address)})</span>}
      </td>
      <td className="px-[16px] py-[12px]">
        <Badge tone={TONE[w.status]}>{STATUS_WORD[w.status]}</Badge>
      </td>
      <td className="px-[16px] py-[12px]">
        <button
          type="button"
          onClick={receipt}
          aria-label={`Download ${w.id} as CSV`}
          title="Download as CSV"
          className="inline-flex size-[36px] cursor-pointer items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]"
        >
          <Icon icon={Download04Icon} size={20} />
        </button>
      </td>
    </tr>
  );
}

function StatementDialog({
  open,
  earnings,
  withdrawals,
  onClose,
  onSaved,
}: {
  open: boolean;
  earnings: Earning[];
  withdrawals: Withdrawal[];
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [now] = React.useState(() => Date.now());
  const years = React.useMemo(() => statementYears(earnings, withdrawals, now), [earnings, withdrawals, now]);
  const [year, setYear] = React.useState(String(years[0]));
  const [month, setMonth] = React.useState(ALL);
  const generate = () => {
    const period: StatementPeriod = { year: Number(year), month: month === ALL ? null : Number(month) };
    const name = statementFileName(period);
    download(statementCsv(period, earnings, withdrawals), name);
    onSaved(name);
    onClose();
  };
  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      size="sm"
      title="Download Statement"
      description="A CSV of your sales, the IDEEZA fees and your withdrawals for the year or month you choose. It downloads straight away."
      footer={
        <div className="ml-auto flex flex-wrap justify-end gap-[8px]">
          <Button type="button" hierarchy="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" hierarchy="primary" size="lg" onClick={generate}>
            <Icon icon={Download04Icon} size={18} />
            Generate Statement
          </Button>
        </div>
      }
    >
      <div className={cn("grid grid-cols-1 gap-[16px] sm:grid-cols-2")}>
        <div className="flex flex-col gap-[8px]">
          <span className="text-md font-medium leading-md text-text-primary" id="statement-year">
            Year
          </span>
          <Select aria-labelledby="statement-year" size="lg" value={year} onChange={setYear} options={years.map((y) => ({ label: String(y), value: String(y) }))} />
        </div>
        <div className="flex flex-col gap-[8px]">
          <span className="text-md font-medium leading-md text-text-primary" id="statement-month">
            Month
          </span>
          <Select
            aria-labelledby="statement-month"
            size="lg"
            value={month}
            onChange={setMonth}
            options={[{ label: "The whole year", value: ALL }, ...MONTHS.map((m, i) => ({ label: m, value: String(i + 1) }))]}
          />
        </div>
      </div>
    </ModalFrame>
  );
}
