"use client";

// Plan & pricing › Billing (mobile Figma "v2 · Billing History"): the
// current plan (price, renewal or end, AI credits, how it is paid; the web's
// Plan details — Auto renewal and the plan's benefits with what you use
// against them; Downgrade plan and Cancel, or Keep when a change is waiting),
// every payment as an invoice row (lib/account/invoices.ts: plan payments,
// renewals marked Not charged, credit purchases; the web's search by order
// ID and year), each opening its invoice, and the web's Billing details that
// every invoice prints under "Billed to" (edited on /m/settings/billing).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckmarkCircle02Icon, Invoice03Icon } from "@hugeicons/core-free-icons";
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
import { Chevron } from "../kit/list";
import { SheetSelect } from "../kit/sheet-select";
import { EmptyState } from "../kit/state";
import { ListBones } from "../kit/states";
import { useToast } from "../kit/toast";
import { T } from "../type";
import { CancelSheet } from "./cancel-sheet";
import { CARD, HAIRLINE, LINK, Row, dateOf, downgradePath, invoicePath, n } from "./parts";

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
              <ul className="flex flex-col gap-4">
                {shown.slice(0, count).map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={invoicePath(inv.id)}
                      aria-label={`${inv.item}, ${dateOf(inv.ts)}, ${usd(inv.total)}, ${inv.status}, ${inv.paidWith}. Open the invoice`}
                      className={cn(CARD, "flex items-center justify-between gap-6 px-7 py-6 outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
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
      <BillingDetails />
    </div>
  );
}

/** The web's Billing details: what every invoice prints under "Billed to". */
function BillingDetails() {
  const d = useBillingDetails();
  const rows = [
    { label: "Name or company", value: d.name },
    { label: "Tax ID (VAT / GST / EIN)", value: d.taxId },
    { label: "Address", value: d.address },
    { label: "Billing email", value: d.email },
  ];
  return (
    <section id="billing-details" aria-labelledby="billing-details-title" className={cn(CARD, "flex scroll-mt-8 flex-col gap-4 p-8")}>
      <div className="flex items-start justify-between gap-6">
        <h2 id="billing-details-title" className={T.section}>
          Billing details
        </h2>
        <Link href="/m/settings/billing" aria-label="Edit billing details" className={cn(LINK, "-my-4 inline-flex min-h-[44px] items-center")}>
          Edit
        </Link>
      </div>
      <p className={T.meta}>Printed under “Billed to” on every invoice. Without a name here, invoices use your legal name from Settings › Account, else your profile name.</p>
      <dl className="flex flex-col">
        {rows.map((r) => (
          <Row key={r.label} label={r.label}>
            {r.value ? <span className="whitespace-pre-line">{r.value}</span> : <span className="text-text-tertiary">Not set</span>}
          </Row>
        ))}
      </dl>
    </section>
  );
}

function CurrentPlan() {
  const router = useRouter();
  const { sub, plan, keep, cancel } = useCreatePlan();
  const usage = usePlanUsage();
  const wallet = useWalletStatus();
  const token = useDefaultToken();
  const toast = useToast();
  const [cancelling, setCancelling] = React.useState(false);
  const paid = sub.renewsAt !== null;
  const per = priceOf(sub.tier, sub.cycle);
  const when = sub.renewsAt ? dateOf(sub.renewsAt) : "";
  const pending = sub.pending;
  const cancelled = pending?.tier === "free";
  const status = !paid
    ? { tone: "success" as const, label: "Active" }
    : !pending
      ? { tone: "success" as const, label: "Active" }
      : pending.tier === "free"
        ? { tone: "warning" as const, label: `Ends ${when}` }
        : { tone: "warning" as const, label: `Changes ${when}` };
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
  return (
    <section aria-label="Current plan" className={cn(CARD, "flex flex-col gap-4 p-8")}>
      <div className={cn(HAIRLINE, "flex items-start justify-between gap-4 border-b-[length:var(--border-width-1)] pb-6")}>
        <div className="flex flex-col gap-1">
          <span className={T.meta}>Current plan</span>
          <span className={T.title}>{plan.tier === "free" ? "Free" : `${plan.name} · ${sub.cycle === "yearly" ? "Annual" : "Monthly"}`}</span>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <dl className="flex flex-col">
        <Row label="Price">
          <span className="inline-flex flex-wrap items-center justify-end gap-3">
            <TestnetDemoBadge />
            {paid ? `${usd(per.period)} / ${sub.cycle === "yearly" ? "year" : "month"}` : "$0.00 · for lifetime"}
          </span>
        </Row>
        {paid && <Row label={pending ? (pending.tier === "free" ? "Ends on" : "Changes on") : "Renews on"}>{when}</Row>}
        {pending && pending.tier !== "free" && (
          <Row label="Then">
            {planOf(pending.tier).name} · {pending.cycle === "yearly" ? "Annual" : "Monthly"}
          </Row>
        )}
        <Row label="AI credits">{n(plan.credits)} / month</Row>
        <Row label="Payment">{wallet.connected ? `Demo wallet ${wallet.short} · ${token}` : "No wallet connected"}</Row>
      </dl>
      {paid && (
        <label className={cn(HAIRLINE, "flex cursor-pointer items-center justify-between gap-6 border-t-[length:var(--border-width-1)] pt-6")}>
          <span className="flex flex-col gap-1">
            <span className={T.rowTitle}>Auto renewal</span>
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
      )}
      {/* The web's Plan details: a paid plan's benefits against what you use. */}
      {paid && (
      <div className={cn(HAIRLINE, "flex flex-col gap-4 border-t-[length:var(--border-width-1)] pt-6")}>
        <h3 className={T.rowTitle}>Benefits</h3>
        <ul className="flex flex-col gap-5">
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
        <p className={cn(T.meta, "text-text-tertiary")}>A plan sets these amounts. It never locks or removes a project, and every plan can mint, list and buy.</p>
      </div>
      )}
      {!paid ? (
        <Button size="xl" className="w-full" onClick={() => router.push("/m/plans")}>
          Upgrade now
        </Button>
      ) : pending ? (
        <Button
          hierarchy="secondary"
          size="xl"
          className="w-full"
          onClick={() => {
            keep();
            toast({ title: `You’re keeping ${plan.name}` });
          }}
        >
          Keep {plan.name}
        </Button>
      ) : (
        <div className="flex items-center gap-4">
          {(down || sub.cycle === "yearly") && (
            <Button
              hierarchy="secondary"
              size="xl"
              className="flex-1"
              onClick={() => router.push(down ? downgradePath(down.tier, sub.cycle) : downgradePath(sub.tier, "monthly"))}
            >
              {down ? "Downgrade plan" : "Switch to monthly"}
            </Button>
          )}
          <Button hierarchy="ghost" size="xl" className="flex-1" onClick={() => setCancelling(true)}>
            Cancel
          </Button>
        </div>
      )}
      {paid && !pending && (
        <Link href="/m/settings/payments" className={cn(T.body, "inline-flex min-h-[44px] items-center justify-between text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}>
          Payment method
          <Chevron />
        </Link>
      )}
      <CancelSheet open={cancelling} onClose={() => setCancelling(false)} />
    </section>
  );
}
