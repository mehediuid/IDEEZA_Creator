"use client";

// Balance › Buy IDZ Token's purchase history (Figma 41571:113571): every
// presale purchase of the connected demo account, filtered by Chain Type,
// Status, Month and Year (C1), ten to a page. Columns as the Figma table:
// Transaction ID · Chain · Date & Time · You Received · You Paid · Wallet
// Address · Status, where Status runs Claim in … → Claim → Claimed (C9).
// The countdown is a timer the screen reader isn't made to read every
// second; the moment a purchase unlocks is said once. Below a 720 px box the
// rows stack, one card each.

import * as React from "react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, Divider, Select, TestnetDemoBadge } from "@/components/ideeza";
import { Pagination } from "@/components/projects/pagination";
import { useCopy } from "@/components/wallet/wallet-dialog";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { demoAddress } from "@/lib/wallet/demo-wallet";
import { formatWhen } from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import { claimInOf } from "@/lib/wallet/presale";
import {
  PURCHASE_STATUSES,
  filterPurchases,
  purchaseStatusOf,
  purchaseYearsOf,
  type Purchase,
  type PurchaseStatus,
} from "@/lib/wallet/presale-records";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { cn } from "@/lib/utils";
import { AddressChip, TxHashCell } from "./idz-activity";
import { IdzCoin } from "./idz-coin";

const PER_PAGE = 10;
const UNSET = "";
const ALL = "all";
const CELL = "px-[16px] py-[8px]";
const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const PURCHASE_LOG_ID = "purchase-log-title";

export type ClaimState = { claiming: string | null; note: { id: string; text: string } | null };

function Status({
  p,
  now,
  claim,
  onClaim,
}: {
  p: Purchase;
  now: number;
  claim: ClaimState;
  onClaim: (p: Purchase) => void;
}) {
  const status = purchaseStatusOf(p, now);
  const busy = claim.claiming === p.id;
  let control: React.ReactNode;
  if (status === "claimed") {
    control = (
      <Badge tone="success" icon={<Icon icon={Tick02Icon} size={12} />} className="text-sm leading-xs">
        Claimed
      </Badge>
    );
  } else if (status === "locked") {
    const left = claimInOf(p.buy.unlocksAt - now);
    control = (
      <span
        role="timer"
        aria-label={`${left}, at ${formatWhen(p.buy.unlocksAt)}`}
        className="inline-flex h-[28px] items-center whitespace-nowrap rounded-md bg-bg-brand-subtle px-[12px] text-sm font-semibold leading-xs tabular-nums text-text-brand"
      >
        {left}
      </span>
    );
  } else {
    control = (
      <Button
        hierarchy="primary"
        size="sm"
        aria-label={`Claim ${formatAmount(p.buy.idz, "IDZ")}`}
        aria-disabled={busy || claim.claiming !== null || undefined}
        aria-busy={busy || undefined}
        className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
        onClick={claim.claiming === null ? () => onClaim(p) : undefined}
      >
        {busy ? "Claiming…" : "Claim"}
      </Button>
    );
  }
  const note = claim.note?.id === p.id ? claim.note.text : null;
  return (
    // `data-claim`: where focus lands once this purchase's claim confirms (its button is gone then).
    <span data-claim={p.id} tabIndex={-1} className="flex flex-col items-start gap-[4px] outline-none">
      {control}
      {note && <span className="max-w-[24ch] text-sm leading-xs text-text-error">{note}</span>}
    </span>
  );
}

export function PurchaseTable({
  purchases,
  now,
  claim,
  onClaim,
}: {
  purchases: Purchase[];
  now: number;
  claim: ClaimState;
  onClaim: (p: Purchase) => void;
}) {
  const [network, setNetwork] = React.useState<string>(UNSET);
  const [status, setStatus] = React.useState<string>(UNSET);
  const [month, setMonth] = React.useState<string>(UNSET);
  const [year, setYear] = React.useState<string>(UNSET);
  const [page, setPage] = React.useState(1);
  const { copied, copy } = useCopy();

  // Said once, in the one second-tick a purchase unlocks in — never the countdown itself.
  const unlocked = now ? purchases.filter((p) => !p.claim && p.buy.unlocksAt <= now && p.buy.unlocksAt > now - 1000) : [];
  const ready = unlocked.length ? `${unlocked.map((p) => formatAmount(p.buy.idz, "IDZ")).join(", ")} ready to claim.` : "";

  const pick = (v: string) => (v === UNSET || v === ALL ? "all" : v);
  const filter = {
    network: pick(network) as Network | "all",
    status: pick(status) as PurchaseStatus | "all",
    month: pick(month) === "all" ? ("all" as const) : Number(month),
    year: pick(year) === "all" ? ("all" as const) : Number(year),
  };
  const shown = filterPurchases(purchases, filter, now);
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const pageRows = shown.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const filtered = filter.network !== "all" || filter.status !== "all" || filter.month !== "all" || filter.year !== "all";
  const set = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPage(1);
  };

  const paid = (p: Purchase) => formatAmount(p.buy.paid.amount, p.buy.paid.coin);
  const received = (p: Purchase) => (
    <span className="inline-flex items-center gap-[4px] font-medium tabular-nums text-text-primary">
      <IdzCoin height={20} />
      {formatAmount(p.buy.idz, "IDZ")}
    </span>
  );

  return (
    <section aria-labelledby={PURCHASE_LOG_ID} className="flex flex-col gap-[24px] [container-type:inline-size]">
      <Divider />
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <h2 id={PURCHASE_LOG_ID} tabIndex={-1} className="text-lg font-semibold leading-lg text-text-primary outline-none">
          Transaction Activity
        </h2>
        <div className="flex flex-wrap items-center gap-[12px]">
          <Select
            aria-label="Chain Type"
            size="lg"
            placeholder="Chain Type"
            value={network}
            onChange={set(setNetwork)}
            options={[{ label: "All chains", value: ALL }, ...NETWORKS.map((n) => ({ label: n.label, value: n.value }))]}
          />
          <Select
            aria-label="Status"
            size="lg"
            placeholder="Status"
            value={status}
            onChange={set(setStatus)}
            options={[{ label: "All statuses", value: ALL }, ...PURCHASE_STATUSES.map((s) => ({ label: s.label, value: s.value }))]}
          />
          <Select
            aria-label="Month"
            size="lg"
            placeholder="Month"
            value={month}
            onChange={set(setMonth)}
            options={[{ label: "All months", value: ALL }, ...MONTHS.map((m, i) => ({ label: m, value: String(i) }))]}
          />
          <Select
            aria-label="Year"
            size="lg"
            placeholder="Year"
            value={year}
            onChange={set(setYear)}
            options={[{ label: "All years", value: ALL }, ...purchaseYearsOf(purchases, now).map((y) => ({ label: String(y), value: String(y) }))]}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-[12px] rounded-xl border border-solid border-border p-[20px]">
          <p className="text-md leading-md text-text-secondary">
            {filtered ? "No purchases match these filters." : "No purchases yet. Buy IDZ Token above to make your first."}
          </p>
          {filtered && (
            <Button
              hierarchy="secondary"
              size="md"
              onClick={() => {
                setNetwork(UNSET);
                setStatus(UNSET);
                setMonth(UNSET);
                setYear(UNSET);
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* `relative`: the visually hidden labels are positioned, and
              without it they escape the scroller and widen the page. */}
          <div className="relative hidden overflow-x-auto rounded-xl border border-solid border-border [@container(min-width:720px)]:block">
            <table className="w-full border-collapse text-left text-md leading-md">
              <caption className="sr-only">IDZ presale purchases, newest first</caption>
              <thead className="bg-bg-subtle text-text-primary">
                <tr>
                  {["Transaction ID", "Chain", "Date & Time", "You Received", "You Paid", "Wallet Address", "Status"].map((h) => (
                    <th key={h} scope="col" className={cn(CELL, "whitespace-nowrap py-[12px] font-medium")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {pageRows.map((p) => (
                  <tr key={p.id} className="border-t border-solid border-border">
                    <th scope="row" className={cn(CELL, "whitespace-nowrap font-regular")}>
                      <TxHashCell id={p.id} hash={p.txHash} copied={copied} copy={copy} />
                    </th>
                    <td className={cn(CELL, "text-sm font-medium leading-xs")}>{networkLabelOf(p.network)}</td>
                    <td className={cn(CELL, "whitespace-nowrap tabular-nums")}>{formatWhen(p.at)}</td>
                    <td className={cn(CELL, "whitespace-nowrap")}>{received(p)}</td>
                    <td className={cn(CELL, "whitespace-nowrap tabular-nums")}>{paid(p)}</td>
                    <td className={CELL}>
                      <AddressChip address={demoAddress(p.identity)} />
                    </td>
                    <td className={CELL}>
                      <Status p={p} now={now} claim={claim} onClaim={onClaim} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label="IDZ presale purchases, newest first" className="flex flex-col rounded-xl border border-solid border-border [@container(min-width:720px)]:hidden">
            {pageRows.map((p, i) => (
              <li key={p.id} className={cn("flex flex-col gap-[8px] p-[16px]", i > 0 && "border-t border-solid border-border")}>
                <div className="flex items-start justify-between gap-[12px]">
                  <span className="flex flex-col gap-[2px]">
                    <span className="text-md font-semibold leading-md">{received(p)}</span>
                    <span className="text-sm leading-xs text-text-secondary">You paid {paid(p)}</span>
                  </span>
                  <Status p={p} now={now} claim={claim} onClaim={onClaim} />
                </div>
                <p className="text-sm leading-xs text-text-secondary">
                  {formatWhen(p.at)} · {networkLabelOf(p.network)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-[8px] text-sm leading-xs text-text-secondary">
                  <AddressChip address={demoAddress(p.identity)} />
                  <TxHashCell id={p.id} hash={p.txHash} copied={copied} copy={copy} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <p className="flex flex-wrap items-center gap-[8px] text-sm leading-sm text-text-secondary">
          <TestnetDemoBadge /> Read from the demo wallet on testnet. No real money moved.
        </p>
        {pageCount > 1 && <Pagination page={current} pageCount={pageCount} onChange={setPage} />}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {copied?.text ?? ready}
      </p>
    </section>
  );
}
