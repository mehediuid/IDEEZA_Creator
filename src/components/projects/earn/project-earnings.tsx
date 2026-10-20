"use client";

// Earn › Money › Sales: what this project's sales paid you (Settings spec D3).
// Earnings are one balance for the account, withdrawn in Settings › Get paid,
// so this card shows the project's part of it and links there: your share of
// each sale after IDEEZA's fee and the splits, per coin, and in dollars at the
// demo rates. It replaced the per-project "Request payout (demo)"; requests
// made with that read as pending withdrawals in Get paid. One Earn card,
// under the section heading that carries the Testnet demo badge.

import * as React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ideeza";
import { getPaidHref } from "@/lib/account/get-paid-href";
import { earningsOf, formatUsd, type Earning } from "@/lib/account/payout";
import { withReturn } from "@/lib/account/return-to";
import { addAmounts, formatAmount } from "@/lib/wallet/money";
import type { ProjectView } from "@/lib/manual/project-read";
import { earnHref } from "@/lib/manual/earn-route";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { EARN_CARD, EARN_H3, EARN_LEAD, TAP } from "./surface";

/** "0.975 ETH · 9.75 USDC": your share, per coin, in first-sold order. */
function perCoin(earnings: readonly Earning[]): string {
  const sums = new Map<string, string>();
  for (const e of earnings) sums.set(e.token, addAmounts(sums.get(e.token) ?? "0", e.net));
  return [...sums].map(([coin, amount]) => formatAmount(amount, coin as Earning["token"])).join(" · ");
}

export function ProjectEarnings({
  project,
  view,
}: {
  project: Pick<ManualProject, "id" | "name" | "contributors">;
  view: Pick<ProjectView, "sales">;
}) {
  const headingId = React.useId();
  const earnings = React.useMemo(
    () => earningsOf(view.sales, [{ id: project.id, name: project.name, contributors: project.contributors ?? [] }]),
    [view.sales, project.id, project.name, project.contributors],
  );
  const usd = addAmounts("0", ...earnings.map((e) => e.netUsd));
  const coins = perCoin(earnings);

  return (
    <section aria-labelledby={headingId} className={EARN_CARD}>
      <h3 id={headingId} className={EARN_H3}>
        Your earnings
      </h3>

      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-medium text-text-secondary">Paid to you from sales</dt>
          <dd className="m-0 text-md font-semibold tabular-nums text-text-primary">{coins || "Nothing yet"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm font-medium text-text-secondary">In dollars, at demo rates</dt>
          <dd className="m-0 text-md font-semibold tabular-nums text-text-primary">{formatUsd(usd)}</dd>
        </div>
      </dl>

      <p className={EARN_LEAD}>
        Your share of each sale, after the 2.5% IDEEZA fee and the splits. Earnings from all your projects are one balance, and you withdraw them in Get paid.
      </p>

      <Link
        href={withReturn(getPaidHref("withdraw"), earnHref(project.id, "money"))}
        // The reset colours every a:hover as a link; the button keeps its own text colour.
        className={cn(
          buttonVariants({ hierarchy: "secondary", size: "lg" }),
          "self-start hover:text-[color:var(--color-button-secondary-text)] max-sm:w-full",
          TAP,
        )}
      >
        Withdraw in Get paid
      </Link>
    </section>
  );
}
