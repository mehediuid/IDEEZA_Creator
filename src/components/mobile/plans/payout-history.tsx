"use client";

// Withdrawal history and statement on the phone (mobile Figma "Get Paid ›
// Withdraw history", "Transaction details", "Download Statement",
// "Statement ready", "Withdrawal Statement - View"), on the web's record
// (lib/account/payout.ts): totals by status, search, Status and Date range,
// every withdrawal newest first (`?tx=` opens its details: the steps, where
// it went, the reference to copy, the fee and the total; Share; Download
// receipt). The statement is the web's CSV — your sales (your share), their
// IDEEZA fees and your withdrawals for a year or a month — downloaded at
// once, then shown as a document (/m/settings/idz-pay/statement).

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download04Icon, Invoice03Icon, Tick02Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { SearchInput } from "@/components/ideeza/search-input";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { networkName } from "@/components/settings/get-paid/parts";
import { DATE_RANGES, filterWithdrawals, periodLabel, withdrawalTotalsOf, type DateRange } from "@/lib/account/money-phone";
import { STATUS_WORD, WITHDRAWAL_STATUSES, formatUsd, statementCsv, statementFileName, statementYears, type StatementPeriod, type Withdrawal, type WithdrawalStatus } from "@/lib/account/payout";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { cn } from "@/lib/utils";
import { FilterButton, useCopy, whenOf } from "../earn-coin/parts";
import { Sheet } from "../kit/sheet";
import { EmptyState } from "../kit/state";
import { OfflineBanner } from "../kit/states";
import { SheetSelect } from "../kit/sheet-select";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { useGetPaid } from "./get-paid-screen";
import { CARD, LINK, Row, RowsCard, n, payoutLine } from "./parts";

const PER_PAGE = 10;
const STATUS_TONE: Record<WithdrawalStatus, "success" | "brand-outline" | "warning"> = { complete: "success", "in-progress": "brand-outline", pending: "warning" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Saves `text` as a file through the browser's own download. */
function download(text: string, name: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function WithdrawalHistoryScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { store, loaded, data } = useGetPaid();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<WithdrawalStatus | "all">("all");
  const [range, setRange] = React.useState<DateRange>("all");
  const [count, setCount] = React.useState(PER_PAGE);
  const [statement, setStatement] = React.useState(false);
  const [now] = React.useState(() => Date.now());
  const tx = params.get("tx");

  const list = store?.withdrawals ?? [];
  const totals = withdrawalTotalsOf(list);
  const shown = filterWithdrawals(list, { query, status, range, now });
  const open = tx ? (list.find((w) => w.id === tx) ?? null) : null;

  return (
    <Screen
      top={<TopBar back="/m/settings/idz-pay" title="Withdrawal history" actions={[{ icon: Download04Icon, label: "Download statement", onClick: () => setStatement(true) }]} />}
      className="px-8 pb-12 pt-4"
    >
      {!loaded || !store ? (
        <Skeleton shape="block" className="h-[240px] w-full" />
      ) : (
        <div className="flex flex-col gap-8">
          <OfflineBanner />
          <div className="grid grid-cols-3 gap-4">
            {WITHDRAWAL_STATUSES.map((s, i) => (
              <div key={s} className="flex min-w-0 flex-col gap-1 rounded-xl bg-bg-brand-subtle px-5 py-5">
                <span className={cn(T.section, "truncate tabular-nums")}>{formatUsd(totals[s])}</span>
                <span className={cn(T.meta, "flex items-center gap-2")}>
                  {STATUS_WORD[s]}
                  {i === 0 && <span className="sr-only">(testnet demo)</span>}
                </span>
              </div>
            ))}
          </div>
          <TestnetDemoBadge className="self-start" />
          <SearchInput
            size="xl"
            aria-label="Search transactions"
            placeholder="Search transactions"
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setCount(PER_PAGE);
            }}
            onClear={() => setQuery("")}
          />
          <div className="flex gap-6">
            <FilterButton
              label="Status"
              value={status}
              onChange={(v) => {
                setStatus(v as WithdrawalStatus | "all");
                setCount(PER_PAGE);
              }}
              options={[{ value: "all", label: "Every status" }, ...WITHDRAWAL_STATUSES.map((s) => ({ value: s, label: STATUS_WORD[s] }))]}
            />
            <FilterButton
              label="Date range"
              value={range}
              onChange={(v) => {
                setRange(v as DateRange);
                setCount(PER_PAGE);
              }}
              options={DATE_RANGES.map((r) => ({ value: r.value, label: r.label }))}
            />
          </div>
          {list.length === 0 ? (
            <EmptyState icon={Invoice03Icon} title="No withdrawals yet" body="Each withdrawal you sign shows up here, with its reference." />
          ) : shown.length === 0 ? (
            <EmptyState
              icon={Invoice03Icon}
              title="Nothing matches"
              body="No withdrawal matches this search and these filters."
              action={{
                label: "Clear filters",
                onClick: () => {
                  setQuery("");
                  setStatus("all");
                  setRange("all");
                },
              }}
            />
          ) : (
            <>
              <ul className="flex flex-col gap-4">
                {shown.slice(0, count).map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => router.replace(`/m/settings/idz-pay/history?tx=${w.id}`)}
                      className={cn(CARD, "flex w-full flex-col gap-2 px-7 py-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
                    >
                      <span className="flex items-center justify-between gap-4">
                        <span className={cn(T.section, "tabular-nums")}>{formatUsd(w.amount)}</span>
                        <Badge tone={STATUS_TONE[w.status]}>{STATUS_WORD[w.status]}</Badge>
                      </span>
                      <span className={cn(T.meta, "flex items-center justify-between gap-4")}>
                        <span className="min-w-0 truncate">
                          {w.to.label}
                          {w.to.address ? ` (${shortAddress(w.to.address)})` : ""}
                        </span>
                        <span className="shrink-0">{whenOf(w.at)}</span>
                      </span>
                      <span className={cn(T.meta, "font-mono text-text-tertiary")}>{w.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {shown.length > count && (
                <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setCount((c) => c + PER_PAGE)}>
                  Show more
                </Button>
              )}
            </>
          )}
        </div>
      )}
      <TransactionSheet withdrawal={open} onClose={() => router.replace("/m/settings/idz-pay/history")} />
      {store && <StatementSheet open={statement} onClose={() => setStatement(false)} years={statementYears(data.earnings, store.withdrawals, now)} />}
    </Screen>
  );
}

const STEPS = ["Withdrawal requested", "Approved & processing", "Sent to your wallet"];

/** Transaction details (Figma): the amount and its status, the steps it took, where it went. */
function TransactionSheet({ withdrawal: w, onClose }: { withdrawal: Withdrawal | null; onClose: () => void }) {
  const copy = useCopy();
  const toast = useToast();
  if (!w) return null;
  const done = w.status === "complete" ? 3 : w.status === "in-progress" ? 2 : 1;
  const lines = [
    `IDEEZA withdrawal receipt (testnet demo)`,
    `Reference: ${w.id}`,
    `Amount: ${formatUsd(w.amount)} as ${payoutLine(w.amount, w.token)}`,
    `To: ${w.to.label}${w.to.address ? ` · ${w.to.address}` : ""}${w.to.network ? ` · ${networkName(w.to.network)}` : ""}`,
    `Date: ${whenOf(w.at)}`,
    `Status: ${STATUS_WORD[w.status]}`,
    `Withdrawal fee: $0.00`,
    `Total: ${formatUsd(w.amount)}`,
  ];
  const share = async () => {
    const text = lines.join("\n");
    try {
      if (navigator.share) await navigator.share({ title: `Withdrawal ${w.id}`, text });
      else await copy(text, "Receipt copied");
    } catch {
      // Closing the share sheet isn't an error.
    }
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title="Transaction details"
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              download(`${lines.join("\r\n")}\r\n`, `ideeza-withdrawal-${w.id}.txt`, "text/plain;charset=utf-8");
              toast({ title: "Receipt downloaded" });
            }}
          >
            Download receipt
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={share}>
            Share
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-2">
        <span className={T.amountHero}>{formatUsd(w.amount)}</span>
        <span className={T.meta}>as {payoutLine(w.amount, w.token)}</span>
        <Badge tone={STATUS_TONE[w.status]}>{STATUS_WORD[w.status]}</Badge>
      </div>
      <ol className="flex flex-col">
        {STEPS.map((s, i) => {
          const reached = i < done;
          return (
            <li key={s} className="flex gap-5">
              <span className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn("inline-flex size-[24px] items-center justify-center rounded-full", reached ? "bg-bg-brand text-text-on-brand" : "bg-bg-subtle text-text-tertiary")}
                >
                  {reached && <Icon icon={Tick02Icon} size={14} />}
                </span>
                {i < STEPS.length - 1 && <span aria-hidden className={cn("w-[2px] flex-1", reached && i + 1 < done ? "bg-bg-brand" : "bg-bg-subtle")} />}
              </span>
              <span className="flex flex-col pb-6">
                <span className={cn(T.body, reached && "text-text-primary")}>
                  {s}
                  <span className="sr-only">{reached ? " — done" : " — not yet"}</span>
                </span>
                <span className={T.meta}>{reached ? whenOf(w.at) : w.legacy ? "Requested in Earn before Get paid" : "Waiting"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <RowsCard>
        <Row label="Method">
          {w.to.label}
          {w.to.address ? ` (${shortAddress(w.to.address)})` : ""}
        </Row>
        {w.to.network && <Row label="Network">{networkName(w.to.network)}</Row>}
        <Row label="Date & time">{whenOf(w.at)}</Row>
        <Row label="Transaction ID">
          <button type="button" onClick={() => copy(w.id, "Transaction ID copied")} className="inline-flex min-h-[32px] items-center gap-2 font-mono text-text-brand outline-none focus-visible:underline">
            {w.id}
            <Icon icon={Copy01Icon} size={14} />
          </button>
        </Row>
        <Row label="Withdrawal fee">−$0.00</Row>
        <Row label="Total" strong>
          {formatUsd(w.amount)}
        </Row>
      </RowsCard>
    </Sheet>
  );
}

/** Download statement (Figma): a year and a month, then the CSV at once, then Statement ready. */
function StatementSheet({ open, onClose, years }: { open: boolean; onClose: () => void; years: number[] }) {
  const router = useRouter();
  const { store, data } = useGetPaid();
  const [year, setYear] = React.useState(String(years[0]));
  const [month, setMonth] = React.useState("all");
  const [ready, setReady] = React.useState<{ period: StatementPeriod; name: string; rows: number } | null>(null);
  const close = () => {
    setReady(null);
    onClose();
  };
  const generate = () => {
    if (!store) return;
    const period: StatementPeriod = { year: Number(year), month: month === "all" ? null : Number(month) };
    const csv = statementCsv(period, data.earnings, store.withdrawals);
    const name = statementFileName(period);
    download(csv, name);
    setReady({ period, name, rows: Math.max(0, csv.split("\r\n").length - 1) });
  };
  if (ready)
    return (
      <Sheet
        open={open}
        onClose={close}
        title="Statement ready"
        description={`Your statement for ${periodLabel(ready.period.year, ready.period.month)} has been made and saved to your downloads.`}
        actions={
          <>
            <Button
              size="xl"
              className="w-full"
              onClick={() => router.push(`/m/settings/idz-pay/statement?year=${ready.period.year}${ready.period.month ? `&month=${ready.period.month}` : ""}`)}
            >
              Open
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
              Close
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-5 rounded-xl bg-bg-subtle px-6 py-5">
          <span aria-hidden className="text-[color:var(--color-icon-default)]">
            <Icon icon={Invoice03Icon} size={22} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className={cn(T.body, "truncate text-text-primary")}>{ready.name}</span>
            <span className={T.meta}>
              CSV · {n(ready.rows)} {ready.rows === 1 ? "line" : "lines"}
            </span>
          </span>
        </div>
      </Sheet>
    );
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Download statement"
      description="A CSV of your sales, their IDEEZA fees and your withdrawals for the year or month you choose, in dollars at demo rates. It downloads straight away."
      actions={
        <Button size="xl" className="w-full" onClick={generate}>
          Generate statement
        </Button>
      }
    >
      <div className="flex gap-4">
        <SheetSelect title="Year" value={year} onChange={setYear} options={years.map((y) => ({ value: String(y), label: String(y) }))} />
        <SheetSelect title="Month" value={month} onChange={setMonth} options={[{ value: "all", label: "Whole year" }, ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))]} />
      </div>
    </Sheet>
  );
}

// ── Withdrawal statement (the document) ─────────────────────────────────

export function StatementScreen() {
  const params = useSearchParams();
  const toast = useToast();
  const { store, loaded, data } = useGetPaid();
  const year = Number(params.get("year")) || new Date().getFullYear();
  const m = Number(params.get("month"));
  const period: StatementPeriod = { year, month: m >= 1 && m <= 12 ? m : null };
  const csv = store ? statementCsv(period, data.earnings, store.withdrawals) : "";
  const rows = csv
    .replace(/^﻿/, "")
    .split("\r\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) ?? []);
  return (
    <Screen
      top={
        <TopBar
          back="/m/settings/idz-pay/history"
          title="Withdrawal statement"
          actions={
            store
              ? [
                  {
                    icon: Download04Icon,
                    label: "Download the statement",
                    onClick: () => {
                      download(csv, statementFileName(period));
                      toast({ title: "Statement downloaded" });
                    },
                  },
                ]
              : []
          }
        />
      }
      className="px-8 pb-12 pt-4"
    >
      {!loaded || !store ? (
        <Skeleton shape="block" className="h-[400px] w-full" />
      ) : (
        <article className={cn(CARD, "flex flex-col gap-6 p-6")}>
          <header className="flex items-start justify-between gap-4">
            <IdeezaLogo height={20} decorative={false} />
            <span className="flex flex-col items-end text-right">
              <span className={T.rowTitle}>Withdrawal statement</span>
              <span className={T.micro}>Summary for {periodLabel(period.year, period.month)}</span>
              <TestnetDemoBadge />
            </span>
          </header>
          {rows.length === 0 ? (
            <p className={cn(T.body, "py-8 text-center")}>No sales or withdrawals in {periodLabel(period.year, period.month)}.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {rows.map((r, i) => (
                <li key={`${r[8]}-${i}`} className={cn(T.meta, "flex items-start justify-between gap-4 py-4")}>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium text-text-primary">
                      {r[1]}
                      {r[2] ? ` · ${r[2]}` : ""}
                    </span>
                    <span className="text-text-secondary [overflow-wrap:anywhere]">{r[3]}</span>
                    <span className="text-text-tertiary">
                      {r[0]}
                      {r[7] ? ` · ${r[7]}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end tabular-nums">
                    <span className="text-text-primary">{r[1] === "Withdrawal" && r[5] === "IDZ" ? payoutLine((r[4] || "0").replace(/^-/, ""), "IDZ").replace("≈ ", "≈ −") : `${r[4]} ${r[5]}`}</span>
                    <span className="text-text-secondary">{formatUsd(r[6] || "0")}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className={cn(T.micro, "text-center text-text-tertiary")}>Made by IDEEZA from this browser’s records. Dollars at demo rates.</p>
        </article>
      )}
      <Link href="/m/settings/idz-pay" className={cn(LINK, "mt-8 flex min-h-[44px] items-center justify-center")}>
        Back to Get paid
      </Link>
    </Screen>
  );
}
