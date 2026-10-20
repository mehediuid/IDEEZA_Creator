"use client";

// Get paid › Withdrawal history and statement: every withdrawal, newest
// first, ten to a page (amount and token, when, where it went with its
// network, the reference, the status); and Download statement, a CSV for the
// year or month you choose with your sales (your share), their IDEEZA fees
// and your withdrawals, in the coin and in dollars at the demo rates. It
// downloads at once, with a UTF-8 BOM so a spreadsheet shows Bangla names.

import * as React from "react";
import { Download04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ModalFrame, Select, type BadgeTone } from "@/components/ideeza";
import { Pagination } from "@/components/projects/pagination";
import {
  formatUsd,
  statementCsv,
  statementFileName,
  statementYears,
  STATUS_WORD,
  type Earning,
  type StatementPeriod,
  type Withdrawal,
  type WithdrawalStatus,
} from "@/lib/account/payout";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { SettingsCard } from "../settings-card";
import { formatWhen, networkName, TAP } from "./parts";

const PER_PAGE = 10;
const WHOLE_YEAR = "all";
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

export function HistoryCard({ withdrawals, earnings, onSaved }: { withdrawals: Withdrawal[]; earnings: Earning[]; onSaved: (s: string) => void }) {
  const [page, setPage] = React.useState(1);
  const [statementOpen, setStatementOpen] = React.useState(false);
  const newest = React.useMemo(() => withdrawals.slice().sort((a, b) => b.at - a.at), [withdrawals]);
  const pageCount = Math.max(1, Math.ceil(newest.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const rows = newest.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <SettingsCard
      id="history"
      title="Withdrawal history"
      description="Every withdrawal, newest first. The statement adds your sales and their IDEEZA fees."
    >
      <Button
        type="button"
        hierarchy="secondary"
        size="sm"
        aria-haspopup="dialog"
        className={cn("mb-[4px] self-start", TAP)}
        onClick={() => setStatementOpen(true)}
      >
        <Icon icon={Download04Icon} size={16} />
        Download statement
      </Button>
      {newest.length === 0 ? (
        <p className="m-0 py-[8px] text-md leading-md text-text-secondary">No withdrawals yet. Each one shows here with its reference.</p>
      ) : (
        <>
          <ul role="list" aria-label="Withdrawals, newest first" className="m-0 flex list-none flex-col p-0">
            {rows.map((w) => (
              <li key={w.id} className="flex flex-wrap items-start justify-between gap-x-[16px] gap-y-[4px] border-b border-solid border-border py-[12px] last:border-b-0">
                <div className="flex min-w-0 flex-1 basis-[240px] flex-col gap-[2px]">
                  <span className="text-md font-medium leading-md tabular-nums text-text-primary">
                    {formatUsd(w.amount)} <span className="font-regular text-text-secondary">in {w.token}</span>
                  </span>
                  <span className="text-sm leading-sm text-text-tertiary">
                    {formatWhen(w.at)} · {w.to.address ? `To ${w.to.label}` : w.to.label}
                    {w.to.network && ` on ${networkName(w.to.network)}`}
                    {w.to.address && <span className="whitespace-nowrap font-mono"> · {shortAddress(w.to.address)}</span>}
                  </span>
                  <span className="text-sm leading-sm text-text-tertiary">
                    Reference <span className="font-mono">{w.id}</span>
                  </span>
                </div>
                <Badge tone={TONE[w.status]}>{STATUS_WORD[w.status]}</Badge>
              </li>
            ))}
          </ul>
          {pageCount > 1 && <Pagination page={current} pageCount={pageCount} onChange={setPage} />}
        </>
      )}
      <StatementDialog
        open={statementOpen}
        earnings={earnings}
        withdrawals={withdrawals}
        onClose={() => setStatementOpen(false)}
        onSaved={(name) => onSaved(`${name} downloaded.`)}
      />
    </SettingsCard>
  );
}

const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString("en-US", { month: "long" });

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
  const [month, setMonth] = React.useState(WHOLE_YEAR);
  const ids = { year: React.useId(), month: React.useId() };
  const generate = () => {
    const period: StatementPeriod = { year: Number(year), month: month === WHOLE_YEAR ? null : Number(month) };
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
      sheet
      title="Download statement"
      description="A CSV of your sales, their IDEEZA fees and your withdrawals for the year or month you choose, in dollars at demo rates. It downloads straight away."
      footer={
        <div className="ml-auto flex flex-wrap justify-end gap-[8px]">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" hierarchy="primary" size="lg" className={TAP} onClick={generate}>
            <Icon icon={Download04Icon} size={18} />
            Download
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
        <div className="flex flex-col gap-[6px]">
          <span className="text-sm font-medium leading-sm text-text-primary" id={ids.year}>
            Year
          </span>
          <Select aria-labelledby={ids.year} size="lg" value={year} onChange={setYear} options={years.map((y) => ({ label: String(y), value: String(y) }))} />
        </div>
        <div className="flex flex-col gap-[6px]">
          <span className="text-sm font-medium leading-sm text-text-primary" id={ids.month}>
            Month
          </span>
          <Select
            aria-labelledby={ids.month}
            size="lg"
            value={month}
            onChange={setMonth}
            options={[
              { label: "The whole year", value: WHOLE_YEAR },
              ...Array.from({ length: 12 }, (_, i) => ({ label: monthName(i + 1), value: String(i + 1) })),
            ]}
          />
        </div>
      </div>
    </ModalFrame>
  );
}
