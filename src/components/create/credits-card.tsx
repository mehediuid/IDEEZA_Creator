"use client";

// CreditsCard — sits beside QuotaCard at the top of /history. Reads the
// local credits ledger live from CreditsProvider. There's no backend
// yet, so Top up is honest about what it does: it adds to the local
// balance, nothing more.

import * as React from "react";
import { describeEntry, useCredits, TOP_UP_CREDITS } from "@/lib/create/credits";

export function CreditsCard() {
  const { hydrated, balance, ledger, topUp } = useCredits();

  if (!hydrated) {
    return <Shell aria-hidden />;
  }

  const recent = ledger.slice(-3);

  return (
    <Shell>
      {/* Left: balance + what it's for + recent activity */}
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
          Credits
        </p>
        <p className="mt-[4px] text-xl font-semibold tabular-nums text-text-primary">
          {balance}
        </p>
        <p className="mt-[4px] text-sm text-text-secondary">
          Each full-product build uses 4 credits. Exploring and refining
          concepts stays free.
        </p>

        {recent.length > 0 && (
          <ul className="mt-[12px] flex flex-col gap-[2px]">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="text-sm tabular-nums text-text-tertiary"
              >
                {describeEntry(entry)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right: top-up affordance */}
      <div className="flex shrink-0 flex-col items-end gap-[6px]">
        <button
          type="button"
          onClick={() => topUp(TOP_UP_CREDITS)}
          className="inline-flex h-[40px] items-center gap-[8px] rounded-lg border border-border-strong bg-bg-surface px-[16px] text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Top up
        </button>
        <p className="max-w-[220px] text-right text-2xs text-text-tertiary">
          No payments are wired yet — this adds to your local balance.
        </p>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  "aria-hidden": ariaHidden,
}: {
  children?: React.ReactNode;
  "aria-hidden"?: boolean;
}) {
  return (
    <section
      id="credits"
      aria-label="Credits balance"
      aria-hidden={ariaHidden}
      className="flex items-center gap-[24px] rounded-2xl border border-border bg-bg-surface px-[20px] py-[16px]"
    >
      {children}
    </section>
  );
}
