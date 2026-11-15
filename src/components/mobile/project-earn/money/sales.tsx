"use client";

// Earn › Money › Sales on the phone (Figma 17, 17b, 17e; the web's
// EarnCustomers, project-earnings.tsx and customers-tab.tsx, their words):
// · EarningsSummary — Money's summary, first on its screen once there is a
//   sale: "Your earnings" with ⓘ (the fee-and-splits line) and the Testnet
//   demo badge, what was paid to you per coin large, in dollars at the demo
//   rates under it, and a Withdraw in Get paid row (the phone's Get paid);
// · Sales — "Sales ⓘ" (the web's lead and the demo-purchases note in the
//   sheet), the Testnet demo badge, "n sales to n people." under it, then
//   the sales as rows, newest first: who, the price, the item, the date and
//   benefits, and the sentence that points to Activity. A row opens its
//   detail sheet (17e): who bought it, then the web's detail lines (the
//   wallet with Copy, Bought, Paid, the fee, You received, When, Minted,
//   Network, Benefits), the demo line, Message {buyer} · Close. `?sale=<id>`
//   opens that sale's sheet once, on arrival. With none: a "No sales yet."
//   row and, while nothing is for sale, a Go to Sell row.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy01Icon, Store01Icon, Tick02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza/button";
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
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard } from "../../kit/list";
import { useEarn } from "../context";
import { EARN_NOTE, EarnLink, InfoButton } from "../parts";
import { MoneySection, ROW_BUTTON } from "./parts";
import { T } from "../../type";

const DEMO_NOTE = "Demo purchases from Explore marketplace, made in this browser. Nothing is on a blockchain.";

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
  const listed = !view.marketUnreadable && rows.length > 0;

  return (
    <MoneySection
      id="customers"
      title="Sales"
      lead="Everyone who bought the project or a copy of it, and what the sales paid you."
      more={<p className={T.body}>{DEMO_NOTE}</p>}
      sub={listed ? customersSummaryText(view.customers) : undefined}
      aside={<TestnetDemoBadge />}
    >
      {view.marketUnreadable ? (
        <ErrorState title="Sales can't be shown" body="This browser's sales record couldn't be read. It's been left as it is." />
      ) : rows.length === 0 ? (
        <ListCard label={`Sales of ${project.name}`}>
          <li className={cn(LIST_ROW, "hover:bg-transparent")}>
            <span className={cn(T.body, "text-text-primary")}>{`${customersEmptyCopy({ scope: { kind: "project" }, status, projectId: project.id }).title}.`}</span>
          </li>
          {toSell && (
            <li>
              <EarnLink href={phoneEarnHref(project.id, "sell")} className={LIST_ROW}>
                <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={Store01Icon} size={24} />
                </span>
                <span className={cn(T.body, "min-w-0 flex-1 text-text-primary")}>Go to Sell</span>
                <Chevron />
              </EarnLink>
            </li>
          )}
        </ListCard>
      ) : (
        <>
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
          <p className={EARN_NOTE}>
            To tell everyone who bought at once,{" "}
            <Link href={phoneProjectHref(project.id, "activity")} className="font-medium text-text-brand outline-none hover:underline focus-visible:underline">
              add to Activity
            </Link>
            .
          </p>
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

/** Your earnings (the web's ProjectEarnings), Money's summary: what this project's sales paid you.
 *  Shown once there is a sale and the record reads, as the web shows it. */
export function EarningsSummary() {
  const { project, view, viewer } = useEarn();
  const earnings = React.useMemo(
    () => earningsOf(view.sales, [{ id: project.id, name: project.name, contributors: project.contributors ?? [] }]),
    [view.sales, project.id, project.name, project.contributors],
  );
  if (!can(viewer, "customers.see") || view.marketUnreadable || view.customers.rows.length === 0 || view.sales.length === 0) return null;
  const usd = addAmounts("0", ...earnings.map((e) => e.netUsd));
  const coins = perCoin(earnings);
  return (
    <section aria-labelledby="earnings-heading" className={LIST_CARD}>
      <div className="flex flex-col gap-6 p-8">
        <div className="-my-3 flex items-center gap-2">
          <h2 id="earnings-heading" className={cn(T.overline, "min-w-0")}>
            Your earnings
          </h2>
          <InfoButton title="Your earnings">
            <p className={cn(T.body, "text-text-primary")}>
              Your share of each sale, after the 2.5% IDEEZA fee and the splits. Earnings from all your projects are one balance, and you withdraw them in Get paid.
            </p>
          </InfoButton>
          <span className="ml-auto shrink-0">
            <TestnetDemoBadge />
          </span>
        </div>
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className={T.micro}>Paid to you from sales</dt>
            <dd className={cn(T.display, "break-words tabular-nums")}>{coins || "Nothing yet"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className={T.micro}>In dollars, at demo rates</dt>
            <dd className={cn(T.rowTitle, "tabular-nums")}>{formatUsd(usd)}</dd>
          </div>
        </dl>
      </div>
      <ul className={cn("flex flex-col border-[length:var(--border-width-1)] border-x-0 border-b-0 border-solid border-border", LIST_DIVIDERS)}>
        <li>
          <Link href="/m/settings/idz-pay" className={LIST_ROW}>
            <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
              <Icon icon={Wallet01Icon} size={24} />
            </span>
            <span className={cn(T.body, "min-w-0 flex-1 text-text-primary")}>Withdraw in Get paid</span>
            <Chevron />
          </Link>
        </li>
      </ul>
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
