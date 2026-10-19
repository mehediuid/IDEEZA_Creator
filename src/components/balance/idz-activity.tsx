"use client";

// Balance › Overview's Transaction Activity (Figma 41571:126311): every IDZ
// movement of the connected demo account, filtered by Chain Type and
// Transfer Type, ten to a page. Columns as the Figma table (41571:126319):
// Transaction ID · Date & Time · Amount · Wallet Address · Chain · Transfer
// Type with its arrow. The ID is the short transaction hash with a copy
// button (the full hash is copied); In and Out are written, not only
// coloured. Below a 720 px box the rows stack, one card each.

import * as React from "react";
import { ArrowDown02Icon, ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Divider, Select, TestnetDemoBadge } from "@/components/ideeza";
import { Pagination } from "@/components/projects/pagination";
import { CopyButton, useCopy } from "@/components/wallet/wallet-dialog";
import { NETWORKS, type Network } from "@/lib/brief/types";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import {
  TRANSFER_TYPES,
  filterIdzLedger,
  formatWhen,
  transferTypeLabel,
  type IdzRow,
  type TransferType,
} from "@/lib/wallet/idz";
import { formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { cn } from "@/lib/utils";
import { IdzCoin } from "./idz-coin";

const PER_PAGE = 10;
/** "" shows the chip's own name (Figma "Chain Type", "Transfer Type") until a choice is made. */
const UNSET = "";
const ALL = "all";

const CELL = "px-[16px] py-[8px]";

function signed(r: IdzRow): string {
  return `${r.direction === "in" ? "+" : "−"}${formatAmount(r.amount, "IDZ")}`;
}

function chainOf(r: IdzRow): string {
  return r.network ? networkLabelOf(r.network) : "Every network";
}

function Direction({ r }: { r: IdzRow }) {
  const into = r.direction === "in";
  return (
    <span className={cn("inline-flex items-center gap-[2px] text-sm font-medium leading-xs", into ? "text-text-success" : "text-text-error")}>
      <Icon icon={into ? ArrowUp02Icon : ArrowDown02Icon} size={20} />
      {into ? "In" : "Out"}
    </span>
  );
}

function AddressChip({ address }: { address: string }) {
  return (
    <span
      title={address}
      className="inline-flex h-[24px] items-center rounded-lg bg-bg-subtle px-[8px] text-sm font-medium leading-xs tabular-nums text-text-secondary"
    >
      <span aria-hidden>{shortAddress(address)}</span>
      <span className="sr-only">{address}</span>
    </span>
  );
}

export function IdzActivity({ rows }: { rows: IdzRow[] }) {
  const [network, setNetwork] = React.useState<string>(UNSET);
  const [type, setType] = React.useState<string>(UNSET);
  const [page, setPage] = React.useState(1);
  const { copied, copy } = useCopy();

  const filter = {
    network: (network === UNSET || network === ALL ? "all" : network) as Network | "all",
    type: (type === UNSET || type === ALL ? "all" : type) as TransferType | "all",
  };
  const shown = filterIdzLedger(rows, filter);
  const pageCount = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const pageRows = shown.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const filtered = filter.network !== "all" || filter.type !== "all";

  const txCell = (r: IdzRow) =>
    r.txHash ? (
      <span className="inline-flex items-center gap-[4px]">
        <span title={r.txHash} className="tabular-nums">
          <span aria-hidden>{shortAddress(r.txHash)}</span>
          <span className="sr-only">{r.txHash}</span>
        </span>
        <CopyButton
          label="Copy transaction hash"
          done={copied?.what === r.id}
          onPress={() => copy(r.id, r.txHash!, "Transaction hash copied")}
        />
      </span>
    ) : (
      <span title="Your demo wallet starts with this">—</span>
    );

  return (
    <section aria-labelledby="idz-activity-title" className="flex flex-col gap-[24px] [container-type:inline-size]">
      <Divider />
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <h2 id="idz-activity-title" className="text-lg font-semibold leading-lg text-text-primary">
          Transaction Activity
        </h2>
        <div className="flex flex-wrap items-center gap-[12px]">
          <Select
            aria-label="Chain Type"
            size="lg"
            placeholder="Chain Type"
            value={network}
            onChange={(v) => {
              setNetwork(v);
              setPage(1);
            }}
            options={[{ label: "All chains", value: ALL }, ...NETWORKS.map((n) => ({ label: n.label, value: n.value }))]}
          />
          <Select
            aria-label="Transfer Type"
            size="lg"
            placeholder="Transfer Type"
            value={type}
            onChange={(v) => {
              setType(v);
              setPage(1);
            }}
            options={[{ label: "All types", value: ALL }, ...TRANSFER_TYPES.map((t) => ({ label: t.label, value: t.value }))]}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-[12px] rounded-xl border border-solid border-border p-[20px]">
          <p className="text-md leading-md text-text-secondary">
            {filtered ? "No transactions match these filters." : "No IDZ has moved in this wallet yet."}
          </p>
          {filtered && (
            <Button
              hierarchy="secondary"
              size="md"
              onClick={() => {
                setNetwork(UNSET);
                setType(UNSET);
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
              <caption className="sr-only">IDZ transactions, newest first</caption>
              <thead className="bg-bg-subtle text-text-primary">
                <tr>
                  {["Transaction ID", "Date & Time", "Amount", "Wallet Address", "Chain", "Transfer Type"].map((h) => (
                    <th key={h} scope="col" className={cn(CELL, "whitespace-nowrap py-[12px] font-medium")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-t border-solid border-border">
                    <th scope="row" className={cn(CELL, "whitespace-nowrap font-regular")}>
                      {txCell(r)}
                    </th>
                    <td className={cn(CELL, "whitespace-nowrap tabular-nums")}>{r.at === null ? "—" : formatWhen(r.at)}</td>
                    <td className={cn(CELL, "whitespace-nowrap")}>
                      <span className="inline-flex items-center gap-[4px] font-medium tabular-nums">
                        <IdzCoin height={20} />
                        {signed(r)}
                      </span>
                    </td>
                    <td className={CELL}>
                      <AddressChip address={r.address} />
                    </td>
                    <td className={cn(CELL, "text-sm font-medium leading-xs")}>{chainOf(r)}</td>
                    <td className={CELL}>
                      <span className="flex flex-col gap-[2px]">
                        <span className="flex flex-wrap items-center gap-x-[8px]">
                          <span className="text-text-primary">{transferTypeLabel(r.type)}</span>
                          <Direction r={r} />
                        </span>
                        <span className="text-sm leading-xs text-text-tertiary">{r.title}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul aria-label="IDZ transactions, newest first" className="flex flex-col rounded-xl border border-solid border-border [@container(min-width:720px)]:hidden">
            {pageRows.map((r, i) => (
              <li key={r.id} className={cn("flex flex-col gap-[8px] p-[16px]", i > 0 && "border-t border-solid border-border")}>
                <div className="flex items-start justify-between gap-[12px]">
                  <span className="flex flex-col gap-[2px]">
                    <span className="flex flex-wrap items-center gap-x-[8px] text-md font-medium leading-md text-text-primary">
                      {transferTypeLabel(r.type)}
                      <Direction r={r} />
                    </span>
                    <span className="text-sm leading-xs text-text-tertiary">{r.title}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-[4px] text-md font-semibold leading-md tabular-nums text-text-primary">
                    <IdzCoin height={20} />
                    {signed(r)}
                  </span>
                </div>
                <p className="text-sm leading-xs text-text-secondary">
                  {r.at === null ? "Starting balance" : formatWhen(r.at)} · {chainOf(r)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-[8px] text-sm leading-xs text-text-secondary">
                  <AddressChip address={r.address} />
                  {r.txHash && txCell(r)}
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
        {copied?.text ?? ""}
      </p>
    </section>
  );
}
