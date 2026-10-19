"use client";

// One invoice (User Panel V2 › Invoice 41549:165299 / 41549:165359): who paid,
// for what period or credits, the lines, what was taken off, tax, the total,
// how it was paid and the transaction — readable here, and printed or saved as
// a PDF from the browser's print dialog (the page chrome stays off paper).
// Built from the payment itself (lib/account/invoices.ts); a testnet invoice
// says so on its face. "Billed to" prints the Billing details saved on Plan &
// pricing › Billing history (lib/account/billing-details.ts), as they are now.

import * as React from "react";
import Link from "next/link";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { useMe } from "@/components/dashboard/sidebar-account";
import { Badge, Button, TestnetDemoBadge } from "@/components/ideeza";
import { NARROW_COLUMN, Page } from "@/components/ideeza/page";
import { billedTo, useBillingDetails } from "@/lib/account/billing-details";
import { invoicesOf } from "@/lib/account/invoices";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/wallet/demo-wallet";

const BILLING_HREF = "/settings/plan?tab=billing";
const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function InvoiceView({ orderId }: { orderId: string }) {
  const { hydrated: creditsReady, ledger } = useCredits();
  const { hydrated: planReady, sub } = useCreatePlan();
  const me = useMe();
  const billing = useBillingDetails();
  const invoice = React.useMemo(() => invoicesOf(ledger, sub.orders).find((i) => i.id === orderId) ?? null, [ledger, sub.orders, orderId]);

  React.useEffect(() => {
    if (invoice) document.title = `${invoice.number} · Invoice · IDEEZA`;
  }, [invoice]);

  const back = (
    <Link
      href={BILLING_HREF}
      className="text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      ← Billing history
    </Link>
  );

  if (!creditsReady || !planReady) {
    return <Shell>{<p className="text-md leading-md text-text-tertiary">Reading the invoice…</p>}</Shell>;
  }
  if (!invoice) {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-[8px] rounded-xl border border-solid border-border bg-bg-surface p-[24px]">
          <h1 className="text-xl font-semibold leading-xl text-text-primary">No invoice here</h1>
          <p className="text-md leading-md text-text-secondary">
            There&apos;s no payment with this number in this browser. Payments are kept in the browser they were made in.
          </p>
          {back}
        </div>
      </Shell>
    );
  }

  const renewal = invoice.status === "Not charged";
  const to = billedTo(billing, me.name);
  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-[12px] print:hidden">
        {back}
        <Button hierarchy="secondary" size="lg" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
      </div>

      <article
        aria-labelledby="invoice-title"
        className="flex flex-col gap-[28px] rounded-xl border border-solid border-border bg-bg-surface p-[40px] max-md:p-[20px] print:border-0 print:p-0"
      >
        <header className="flex flex-wrap items-start justify-between gap-[16px] border-b border-solid border-border-subtle pb-[20px]">
          <IdeezaLogo height={32} decorative={false} />
          <div className="flex flex-col items-end gap-[4px] text-right max-md:items-start max-md:text-left">
            <h1 id="invoice-title" className="text-3xl font-semibold leading-3xl text-text-primary">
              Invoice
            </h1>
            <p className="font-mono text-md leading-md text-text-secondary">{invoice.number}</p>
            <p className="text-md leading-md text-text-secondary">Issued {date(invoice.ts)}</p>
            <div className="flex flex-wrap items-center gap-[8px]">
              <Badge tone={renewal ? "neutral" : "success"}>{invoice.status}</Badge>
              <TestnetDemoBadge />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-[24px] max-md:grid-cols-1">
          <section aria-labelledby="billed-to" className="flex flex-col gap-[4px] text-md leading-md">
            <h2 id="billed-to" className="text-sm font-medium leading-sm text-text-tertiary">
              Billed to
            </h2>
            <p className="font-semibold text-text-primary">{to.name}</p>
            {to.lines.map((l, i) => (
              <p key={`${i}-${l}`} className="text-text-secondary [overflow-wrap:anywhere]">
                {l}
              </p>
            ))}
            {invoice.payer && <p className="font-mono text-text-secondary">{shortAddress(invoice.payer)}</p>}
          </section>
          <section aria-labelledby="order-details" className="flex flex-col gap-[4px] text-md leading-md">
            <h2 id="order-details" className="text-sm font-medium leading-sm text-text-tertiary">
              {invoice.period ? "Plan details" : "Order"}
            </h2>
            <p className="font-semibold text-text-primary">{invoice.lines[0].description}</p>
            {invoice.period ? (
              <p className="text-text-secondary">
                {date(invoice.period.from)} – {date(invoice.period.to)}
              </p>
            ) : (
              <p className="text-text-secondary">Credits last 12 months from {date(invoice.ts)}</p>
            )}
            {invoice.lines[0].detail && <p className="text-text-secondary">{invoice.lines[0].detail}</p>}
          </section>
        </div>

        <table className="w-full border-collapse text-left text-md leading-md">
          <caption className="sr-only">What this invoice is for</caption>
          <thead className="text-sm leading-sm text-text-secondary">
            <tr className="border-b border-solid border-border-subtle">
              <th scope="col" className="py-[10px] pr-[16px] font-semibold">
                Description
              </th>
              <th scope="col" className="py-[10px] pr-[16px] text-right font-semibold">
                Qty
              </th>
              <th scope="col" className="py-[10px] pr-[16px] text-right font-semibold">
                Unit price
              </th>
              <th scope="col" className="py-[10px] text-right font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.description} className="border-b border-solid border-border-subtle">
                <td className="py-[12px] pr-[16px] text-text-primary">
                  {l.description}
                  {l.detail && <span className="block text-sm leading-sm text-text-secondary">{l.detail}</span>}
                </td>
                <td className="py-[12px] pr-[16px] text-right tabular-nums text-text-secondary">{l.qty}</td>
                <td className="py-[12px] pr-[16px] text-right tabular-nums text-text-secondary">{usd(l.unit)}</td>
                <td className="py-[12px] text-right tabular-nums text-text-primary">{usd(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto grid w-full max-w-[360px] grid-cols-[1fr_auto] gap-x-[24px] gap-y-[8px] text-md leading-md">
          <dt className="text-text-secondary">Subtotal</dt>
          <dd className="text-right tabular-nums text-text-primary">{usd(invoice.subtotal)}</dd>
          {invoice.adjustments.map((a) => (
            <React.Fragment key={a.label}>
              <dt className="text-text-secondary">{a.label}</dt>
              <dd className="text-right tabular-nums text-text-primary">−{usd(a.amount)}</dd>
            </React.Fragment>
          ))}
          <dt className="text-text-secondary">Tax (0%)</dt>
          <dd className="text-right tabular-nums text-text-primary">{usd(invoice.tax)}</dd>
          <dt className="border-t border-solid border-border-subtle pt-[12px] text-lg font-semibold leading-lg text-text-primary">Total</dt>
          <dd className="border-t border-solid border-border-subtle pt-[12px] text-right text-lg font-semibold leading-lg tabular-nums text-text-brand">
            {usd(invoice.total)}
          </dd>
          <dt className="text-text-secondary">Amount paid</dt>
          <dd className="text-right tabular-nums text-text-primary">{usd(invoice.paid)}</dd>
        </dl>

        <div className="grid grid-cols-2 gap-[24px] border-t border-solid border-border-subtle pt-[20px] text-md leading-md max-md:grid-cols-1">
          <section aria-labelledby="paid-with" className="flex flex-col gap-[4px]">
            <h2 id="paid-with" className="text-sm font-medium leading-sm text-text-tertiary">
              Payment method
            </h2>
            <p className="text-text-primary">{invoice.paidWith}</p>
          </section>
          <section aria-labelledby="transaction" className="flex min-w-0 flex-col gap-[4px]">
            <h2 id="transaction" className="text-sm font-medium leading-sm text-text-tertiary">
              Transaction
            </h2>
            <p className="break-all font-mono text-sm leading-sm text-text-primary">
              {invoice.txHash ?? (renewal ? "None: a renewal isn't charged on testnet" : "Not recorded")}
            </p>
          </section>
        </div>

        <footer className="flex flex-col items-center gap-[4px] text-center text-sm leading-sm text-text-secondary">
          <p>Testnet demo: paid with test tokens from the demo wallet. No real money moved.</p>
          <p>
            Questions? Contact support@ideeza.com · ideeza.com
          </p>
        </footer>
      </article>
    </Shell>
  );
}

/** The page frame and, on its left edge, the narrow column. On paper the
 *  frame's inset and the column's cap fall away, so the invoice fills the sheet. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Page className="print:bg-bg-surface print:p-0">
      <div className={cn(NARROW_COLUMN, "flex flex-col gap-[20px] print:max-w-none")}>{children}</div>
    </Page>
  );
}
