"use client";

// Plan & pricing › Billing (mobile Figma "v2 · Billing History"), as a
// hub: the current plan in one line (name, status, price and renewal or
// end), then rows — Auto renewal, the web's Plan details (Benefits, with
// what you use against them, in a sheet), AI credits, Payment method,
// Billing details (what every invoice prints under "Billed to", edited on
// /m/settings/billing), Downgrade plan or Switch to monthly, Cancel
// subscription — or, while a change waits, Keep as the card's one button;
// on Free, Upgrade now. Then every payment as an invoice row
// (lib/account/invoices.ts: plan payments, renewals marked Not charged,
// credit purchases; the web's search by order ID and year), each opening
// its invoice.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiMagicIcon, ArrowDown02Icon, Cancel01Icon, CheckmarkCircle02Icon, CrownIcon, Invoice03Icon, RepeatIcon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { SearchInput } from "@/components/ideeza/search-input";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { Toggle } from "@/components/ideeza/toggle";
import { usePlanUsage } from "@/components/credits/plans-panel";
import { useWalletStatus } from "@/components/credits/payment-picker";
import { useBillingDetails } from "@/lib/account/billing-details";
import { useDefaultToken } from "@/lib/account/payment";
import { filterInvoices, invoiceYears, invoicesOf } from "@/lib/account/invoices";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { PLANS, planOf, priceOf } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW, ListCard, ListRow } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { SheetSelect } from "../kit/sheet-select";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { CancelSheet } from "./cancel-sheet";
import { CARD, dateOf, downgradePath, invoicePath, n } from "./parts";

const PER_PAGE = 10;
const ALL = "all";

export function BillingTab() {
  const { hydrated: planReady, sub } = useCreatePlan();
  const { hydrated: creditsReady, ledger } = useCredits();
  const [count, setCount] = React.useState(PER_PAGE);
  const [query, setQuery] = React.useState("");
  const [year, setYear] = React.useState<string>(ALL);
  const all = React.useMemo(() => invoicesOf(ledger, sub.orders), [ledger, sub.orders]);
  const years = React.useMemo(() => invoiceYears(all), [all]);
  if (!planReady || !creditsReady) return <ListBones rows={4} />;
  const shown = filterInvoices(all, query, year === ALL ? null : Number(year));
  const clear = () => {
    setQuery("");
    setYear(ALL);
    setCount(PER_PAGE);
  };
  return (
    <div className="flex flex-col gap-12">
      <CurrentPlan />
      <section aria-labelledby="invoices" className="flex flex-col gap-6">
        <h2 id="invoices" className={T.section}>
          Invoices
        </h2>
        {all.length === 0 ? (
          <EmptyState
            icon={Invoice03Icon}
            title="No payments yet"
            body="What you pay for a plan or for credits shows up here, each with its invoice."
            action={{ label: "Buy credits", href: "/m/plans?tab=credits" }}
          />
        ) : (
          <>
            <div className="flex items-center gap-4">
              <SearchInput
                size="xl"
                containerClassName="min-w-0 flex-1"
                aria-label="Search by order ID"
                placeholder="Search by order ID"
                value={query}
                onValueChange={(v) => {
                  setQuery(v);
                  setCount(PER_PAGE);
                }}
                onClear={() => setQuery("")}
              />
              <SheetSelect
                title="Year"
                value={year}
                onChange={(v) => {
                  setYear(v);
                  setCount(PER_PAGE);
                }}
                options={[{ label: "All years", value: ALL }, ...years.map((y) => ({ label: String(y), value: String(y) }))]}
                className="w-[128px] shrink-0"
              />
            </div>
            {shown.length === 0 ? (
              <EmptyState
                icon={Invoice03Icon}
                title="No payment matches"
                body={`No payment matches “${query.trim()}”${year !== ALL ? ` in ${year}` : ""}.`}
                action={{ label: "Clear filters", onClick: clear }}
              />
            ) : (
              <ul className={cn(LIST_CARD, LIST_DIVIDERS)}>
                {shown.slice(0, count).map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={invoicePath(inv.id)}
                      aria-label={`${inv.item}, ${dateOf(inv.ts)}, ${usd(inv.total)}, ${inv.status}, ${inv.paidWith}. Open the invoice`}
                      className={cn(LIST_ROW, "justify-between active:bg-bg-subtle")}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className={cn(T.rowTitle, "truncate")}>{inv.item}</span>
                        <span className={T.meta}>{dateOf(inv.ts)}</span>
                        <span className={cn(T.meta, "truncate text-text-tertiary")}>
                          #{inv.number} · {inv.paidWith}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn(T.rowTitle, "tabular-nums")}>{usd(inv.total)}</span>
                        <Badge tone={inv.status === "Paid" ? "success" : "neutral"}>{inv.status}</Badge>
                      </span>
                      <Chevron />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {shown.length > count && (
              <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setCount((c) => c + PER_PAGE)}>
                Show more
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function CurrentPlan() {
  const router = useRouter();
  const { sub, plan, keep, cancel } = useCreatePlan();
  const usage = usePlanUsage();
  const wallet = useWalletStatus();
  const token = useDefaultToken();
  const details = useBillingDetails();
  const toast = useToast();
  const [cancelling, setCancelling] = React.useState(false);
  const [benefitsOpen, setBenefitsOpen] = React.useState(false);
  const paid = sub.renewsAt !== null;
  const per = priceOf(sub.tier, sub.cycle);
  const when = sub.renewsAt ? dateOf(sub.renewsAt) : "";
  const pending = sub.pending;
  const cancelled = pending?.tier === "free";
  const status = !paid || !pending ? { tone: "success" as const, label: "Active" } : pending.tier === "free" ? { tone: "warning" as const, label: `Ends ${when}` } : { tone: "warning" as const, label: `Changes ${when}` };
  const smaller = PLANS.filter((p) => p.monthly > 0 && p.monthly < plan.monthly);
  const down = smaller[smaller.length - 1] ?? null;
  const benefits: { label: string; meter?: { used: number; amount: number; verb: string } }[] = [
    { label: `${n(plan.credits)} AI credits every month` },
    { label: `Create ${n(plan.projects)} projects`, meter: { used: usage.projects, amount: plan.projects, verb: "created" } },
    { label: `${n(plan.exports)} exports a month` },
    { label: plan.queue },
    { label: `Add ${n(plan.contributors)} contributors to a project`, meter: { used: usage.mostContributors, amount: plan.contributors, verb: "added" } },
    { label: "Mint, list and buy on the marketplace" },
  ];
  const priceLine = paid ? `${usd(per.period)} / ${sub.cycle === "yearly" ? "year" : "month"}` : "$0.00 · for lifetime";
  const dateLine = paid ? `${pending ? (pending.tier === "free" ? "Ends on" : "Changes on") : "Renews on"} ${when}` : null;
  const billedTo = details.name || details.email;
  return (
    <section aria-label="Current plan" className="flex flex-col gap-6">
      <div className={cn(CARD, "flex flex-col gap-4 p-8")}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={T.meta}>Current plan</span>
            <span className={T.title}>{plan.tier === "free" ? "Free" : `${plan.name} · ${sub.cycle === "yearly" ? "Annual" : "Monthly"}`}</span>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <div className="flex flex-col gap-1">
          <p className={cn(T.body, "flex flex-wrap items-center gap-x-3 gap-y-2 tabular-nums text-text-primary")}>
            <TestnetDemoBadge />
            {priceLine}
          </p>
          {dateLine && <p className={T.meta}>{dateLine}</p>}
        </div>
        {pending && pending.tier !== "free" && (
          <p className={T.meta}>
            Then {planOf(pending.tier).name} · {pending.cycle === "yearly" ? "Annual" : "Monthly"}
          </p>
        )}
        {pending && (
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              keep();
              toast({ title: `You’re keeping ${plan.name}` });
            }}
          >
            Keep {plan.name}
          </Button>
        )}
      </div>
      <ListCard label="Plan details">
        {paid && (
          <li>
            <label className={cn(LIST_ROW, "cursor-pointer hover:bg-transparent")}>
              <span className="shrink-0 text-[color:var(--color-icon-default)]">
                <Icon icon={RepeatIcon} size={24} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(T.body, "text-text-primary")}>Auto renewal</span>
                <span className={T.meta}>{cancelled ? `Off. ${plan.name} ends on ${when}, then you’re on Free.` : `On. It renews on ${when}.`}</span>
              </span>
              <Toggle
                checked={!cancelled}
                aria-label="Auto renewal"
                onChange={() => {
                  if (cancelled) {
                    keep();
                    toast({ title: `You’re keeping ${plan.name}` });
                  } else {
                    cancel();
                    toast({ title: `${plan.name} ends on ${when}` });
                  }
                }}
              />
            </label>
          </li>
        )}
        {paid && <ListRow icon={CheckmarkCircle02Icon} title="Benefits" meta={`${n(usage.projects)}/${n(plan.projects)} projects created`} onClick={() => setBenefitsOpen(true)} />}
        <ListRow icon={AiMagicIcon} title="AI credits" value={`${n(plan.credits)} / month`} />
        <ListRow icon={Wallet02Icon} title="Payment method" meta={wallet.connected ? `Demo wallet ${wallet.short} · ${token}` : "No wallet connected"} href="/m/settings/payments" />
        <li id="billing-details" className="scroll-mt-8">
          <ListCardRowLink href="/m/settings/billing" icon={Invoice03Icon} title="Billing details" meta={billedTo ? billedTo : "Not set"} />
        </li>
      </ListCard>
      {!paid ? (
        <ListCard label="Upgrade">
          <ListRow icon={CrownIcon} title="Upgrade now" meta={`${plan.name} · ${n(plan.credits)} AI credits a month`} onClick={() => router.push("/m/plans")} />
        </ListCard>
      ) : !pending ? (
        <ListCard label="Change plan">
          {(down || sub.cycle === "yearly") && (
            <ListRow
              icon={ArrowDown02Icon}
              title={down ? "Downgrade plan" : "Switch to monthly"}
              meta={down ? `To ${down.name}, from ${when}` : `From ${when}`}
              href={down ? downgradePath(down.tier, sub.cycle) : downgradePath(sub.tier, "monthly")}
            />
          )}
          <ListRow icon={Cancel01Icon} title="Cancel subscription" meta={`You keep ${plan.name} until ${when}`} danger onClick={() => setCancelling(true)} />
        </ListCard>
      ) : null}
      <Sheet open={benefitsOpen} onClose={() => setBenefitsOpen(false)} title="Benefits" description={`${plan.name} · ${sub.cycle === "yearly" ? "Annual" : "Monthly"}`}>
        <ul className="flex flex-col gap-5 pb-4">
          {benefits.map((b) => (
            <li key={b.label} className="flex flex-col gap-2">
              <span className={cn(T.body, "flex items-start gap-4 text-text-primary")}>
                <span aria-hidden className="mt-[2px] shrink-0 text-text-brand">
                  <Icon icon={CheckmarkCircle02Icon} size={16} />
                </span>
                {b.label}
              </span>
              {b.meter && b.meter.amount > 0 && (
                <span className="flex items-center gap-4 pl-[24px]">
                  <ProgressBar value={(b.meter.used / b.meter.amount) * 100} label={`${b.label}: ${b.meter.used} of ${b.meter.amount} ${b.meter.verb}`} className="flex-1" />
                  <span className={cn(T.meta, "shrink-0 tabular-nums", b.meter.used > b.meter.amount && "text-text-error")}>
                    {n(b.meter.used)}/{n(b.meter.amount)} {b.meter.verb}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className={cn(T.meta, "pb-8 text-text-tertiary")}>A plan sets these amounts. It never locks or removes a project, and every plan can mint, list and buy.</p>
      </Sheet>
      <CancelSheet open={cancelling} onClose={() => setCancelling(false)} />
    </section>
  );
}

/** A ListRow's link without its own <li> (the Billing details row carries the anchor). */
function ListCardRowLink({ href, icon, title, meta }: { href: string; icon: typeof Invoice03Icon; title: string; meta: string }) {
  return (
    <Link href={href} className={LIST_ROW}>
      <span className="shrink-0 text-[color:var(--color-icon-default)]">
        <Icon icon={icon} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(T.body, "text-text-primary")}>{title}</span>
        <span className={cn(T.meta, "truncate")}>{meta}</span>
      </span>
      <Chevron />
    </Link>
  );
}
