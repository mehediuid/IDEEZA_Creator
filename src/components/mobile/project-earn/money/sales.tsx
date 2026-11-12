"use client";

// Earn › Money › Sales on the phone (Figma 17, 17b, 17e; the web's
// EarnCustomers, project-earnings.tsx and customers-tab.tsx, their words):
// the Testnet demo badge by the heading; once there is a sale, Your earnings
// (paid to you per coin, in dollars at the demo rates, the fee-and-splits
// line, and Withdraw in Get paid, which opens the phone's Get paid); then the
// sales as rows, newest first: who, the price, the item, the date and
// benefits. A row opens its detail sheet (17e): who bought it, then the web's
// detail lines (the wallet with Copy, Bought, Paid, the fee, You received,
// When, Minted, Network, Benefits), the demo line, Message {buyer} · Close.
// `?sale=<id>` opens that sale's sheet once, on arrival. With none: "No sales
// yet." and, while nothing is for sale, Go to Sell.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { earningsOf, formatUsd, type Earning } from "@/lib/account/payout";
import { customerRowText, customersEmptyCopy, customersSummaryText, type CustomerRow } from "@/lib/manual/customers";
import { can } from "@/lib/manual/permissions";
import { phoneEarnHref } from "@/lib/manual/phone-earn";
import { saleFromQuery, saleItemLine, saleWhenLine } from "@/lib/manual/phone-plan-money";
import { phoneProjectHref } from "@/lib/manual/phone-project";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { addAmounts, formatAmount } from "@/lib/wallet/money";
import { DEMO_BUYERS } from "@/lib/wallet/identities";
import { cn } from "@/lib/utils";
import { Sheet } from "../../kit/sheet";
import { ErrorState } from "../../kit/state";
import { Chevron, ListCard } from "../../kit/list";
import { useEarn } from "../context";
import { EARN_CARD, EARN_H3_CLASS, EARN_LEAD, EARN_NOTE } from "../parts";
import { MoneySection, ROW_BUTTON } from "./parts";
import { T } from "../../type";

export function Sales() {
  const { project, view, viewer, now } = useEarn();
  const router = useRouter();
  const search = useSearchParams();
  const rows = view.customers.rows;
  // Read once, on arrival (the web's P2-CUSTOMERS-11).
  const [initialSale] = React.useState(() => search.get("sale"));
  const [openId, setOpenId] = React.useState<string | null>(() => saleFromQuery(rows, initialSale)?.saleId ?? null);
  if (!can(viewer, "customers.see")) return null;

  const status = view.summary.status;
  const toSell = rows.length === 0 && !view.marketUnreadable && (status === "draft" || status === "private");
  const opened = openId ? (rows.find((r) => r.saleId === openId) ?? null) : null;
  const close = () => {
    setOpenId(null);
    if (search.get("sale")) router.replace(phoneEarnHref(project.id, "money"), { scroll: false });
  };

  return (
    <MoneySection
      id="customers"
      title="Sales"
      lead="Everyone who bought the project or a copy of it, and what the sales paid you."
      aside={<TestnetDemoBadge />}
    >
      {view.marketUnreadable ? (
        <ErrorState title="Sales can't be shown" body="This browser's sales record couldn't be read. It's been left as it is." />
      ) : rows.length === 0 ? (
        <div className={EARN_CARD}>
          <p className={EARN_LEAD}>{`${customersEmptyCopy({ scope: { kind: "project" }, status, projectId: project.id }).title}.`}</p>
          {toSell && (
            <Link href={phoneEarnHref(project.id, "sell")} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "self-start")}>
              Go to Sell
            </Link>
          )}
        </div>
      ) : (
        <>
          {view.sales.length > 0 && <Earnings />}
          <div className="flex flex-col gap-2">
            <p className={cn(T.rowTitle, "text-text-secondary")}>{customersSummaryText(view.customers)}</p>
            <p className={EARN_NOTE}>Demo purchases from Explore marketplace, made in this browser. Nothing is on a blockchain.</p>
            <p className={EARN_NOTE}>
              To tell everyone who bought at once,{" "}
              <Link href={phoneProjectHref(project.id, "activity")} className="font-medium text-text-brand outline-none hover:underline focus-visible:underline">
                add to Activity
              </Link>
              .
            </p>
          </div>
          <ListCard label={`Sales of ${project.name}, newest first`}>
            {rows.map((row) => {
              const text = customerRowText(row, { projectName: project.name, now });
              return (
                <li key={row.saleId}>
                  <button type="button" aria-label={`${text.buyer}, ${text.price}, sale details`} aria-haspopup="dialog" className={ROW_BUTTON} onClick={() => setOpenId(row.saleId)}>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-baseline justify-between gap-4">
                        <span className={cn(T.rowTitle, "min-w-0 truncate")}>{text.buyer}</span>
                        <span className={cn(T.rowTitle, "shrink-0 tabular-nums")}>{text.price}</span>
                      </span>
                      <span className={cn(T.meta, "flex items-baseline justify-between gap-4")}>
                        <span className="min-w-0 truncate">{saleItemLine(text)}</span>
                        <span className="shrink-0">{saleWhenLine(row.at, text.benefits)}</span>
                      </span>
                    </span>
                    <Chevron />
                  </button>
                </li>
              );
            })}
          </ListCard>
        </>
      )}
      {opened && <SaleSheet row={opened} onClose={close} />}
    </MoneySection>
  );
}

/** "0.975 ETH · 9.75 USDC": your share, per coin, in first-sold order (the web's `perCoin`). */
function perCoin(earnings: readonly Earning[]): string {
  const sums = new Map<Earning["token"], string>();
  for (const e of earnings) sums.set(e.token, addAmounts(sums.get(e.token) ?? "0", e.net));
  return [...sums].map(([coin, amount]) => formatAmount(amount, coin)).join(" · ");
}

/** Your earnings (the web's ProjectEarnings): what this project's sales paid you. */
function Earnings() {
  const { project, view } = useEarn();
  const earnings = React.useMemo(
    () => earningsOf(view.sales, [{ id: project.id, name: project.name, contributors: project.contributors ?? [] }]),
    [view.sales, project.id, project.name, project.contributors],
  );
  const usd = addAmounts("0", ...earnings.map((e) => e.netUsd));
  const coins = perCoin(earnings);
  return (
    <section aria-labelledby="earnings-heading" className={EARN_CARD}>
      <h3 id="earnings-heading" className={EARN_H3_CLASS}>
        Your earnings
      </h3>
      <dl className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <dt className={T.meta}>Paid to you from sales</dt>
          <dd className={cn(T.section, "tabular-nums")}>{coins || "Nothing yet"}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className={T.meta}>In dollars, at demo rates</dt>
          <dd className={cn(T.section, "tabular-nums")}>{formatUsd(usd)}</dd>
        </div>
      </dl>
      <p className={EARN_NOTE}>
        Your share of each sale, after the 2.5% IDEEZA fee and the splits. Earnings from all your projects are one balance, and you withdraw them in Get paid.
      </p>
      <Link href="/m/settings/idz-pay" className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}>
        Withdraw in Get paid
      </Link>
    </section>
  );
}

/** 17e: one sale, in the web's detail words. */
function SaleSheet({ row, onClose }: { row: CustomerRow; onClose: () => void }) {
  const { project, now, announce } = useEarn();
  const text = customerRowText(row, { projectName: project.name, now });
  const buyerName = DEMO_BUYERS.find((b) => b.id === row.buyerId)?.name ?? "the buyer";
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(row.buyerAddress)
      .then(() => {
        announce("Wallet address copied");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };
  const lines = [{ term: "Bought by", value: text.buyer }, ...text.detail];
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Sale · ${text.item}`}
      actions={
        <>
          <Link
            href={`/m${startHref({ kind: "direct", to: row.buyerId, projectId: project.id, about: { kind: "purchase", saleId: row.saleId } }, ME)}`}
            className={cn(buttonVariants({ size: "xl" }), "w-full")}
          >
            {`Message ${buyerName}`}
          </Link>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <dl className="flex flex-col">
        {lines.map((d, i) => (
          <div key={`${d.term}-${i}`} className="flex min-h-[44px] items-center justify-between gap-6 border-b-[length:var(--border-width-1)] border-solid border-border py-3 last:border-b-0">
            <dt className={cn(T.body, "shrink-0")}>{d.term}</dt>
            <dd className={cn(T.body, "flex min-w-0 items-center justify-end gap-2 text-right text-text-primary")}>
              {d.term === "Wallet" ? (
                <>
                  <span className="min-w-0 truncate font-mono">{d.value}</span>
                  <IconButton
                    hierarchy="ghost"
                    size="xl"
                    aria-label="Copy wallet address"
                    icon={<Icon icon={copied ? Tick02Icon : Copy01Icon} size={16} />}
                    onClick={copy}
                    className="-my-3 shrink-0"
                  />
                </>
              ) : (
                <span className="min-w-0 break-words">{d.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className={EARN_NOTE}>Testnet demo: bought with a demo wallet in this browser. No transaction was sent.</p>
    </Sheet>
  );
}
