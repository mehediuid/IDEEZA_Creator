"use client";

// Invoice (mobile Figma "v2 · Invoice"; the web's invoice-view.tsx): one
// payment's invoice, derived from the ledger and the plan's orders
// (lib/account/invoices.ts) — number, date, billed to (Billing details, else
// the legal name, else the profile name), the lines, what came off, tax and
// the total, and how it was paid. Download PDF is the phone's print sheet,
// which saves a PDF; on paper only the invoice prints.

import * as React from "react";
import { Download04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { useMe } from "@/components/dashboard/sidebar-account";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { billedTo, useBillingDetails } from "@/lib/account/billing-details";
import { invoiceNameOf, useIdentity } from "@/lib/account/identity";
import { invoicesOf } from "@/lib/account/invoices";
import { usd } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { shortAddress } from "@/lib/wallet/demo-wallet";
import { cn } from "@/lib/utils";
import { BottomBar } from "../kit/bottom-bar";
import { NotFoundState } from "../kit/state";
import { ListBones, OfflineBanner } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { CARD, HAIRLINE, Hero, Row, dateOf } from "./parts";

export function InvoiceScreen({ orderId }: { orderId: string }) {
  const { hydrated: creditsReady, ledger } = useCredits();
  const { hydrated: planReady, sub } = useCreatePlan();
  const me = useMe();
  const billing = useBillingDetails();
  const { identity } = useIdentity();
  const invoice = React.useMemo(() => invoicesOf(ledger, sub.orders).find((i) => i.id === orderId) ?? null, [ledger, sub.orders, orderId]);
  const ready = creditsReady && planReady;
  const to = billedTo(billing, invoiceNameOf({ billingName: billing.name, legalName: identity.legalName, profileName: me.name }));

  return (
    <Screen
      top={<TopBar back="/m/plans?tab=billing" title="Invoice" className="print:hidden" />}
      className="px-8 pb-8 pt-4"
      footer={
        invoice ? (
          <BottomBar className="print:hidden">
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => window.print()}>
              <Icon icon={Download04Icon} size={18} />
              Download PDF
            </Button>
          </BottomBar>
        ) : undefined
      }
    >
      {!ready ? (
        <ListBones rows={4} />
      ) : !invoice ? (
        <NotFoundState
          thing="invoice"
          body="There’s no payment with this number in this browser. Payments are kept in the browser they were made in."
          action={{ label: "See your invoices", href: "/m/plans?tab=billing" }}
        />
      ) : (
        <div className="flex flex-col gap-8">
        <div className="print:hidden">
          <Hero
            label={invoice.status === "Paid" ? "Total paid" : "Total"}
            meta={
              <>
                <Badge tone={invoice.status === "Paid" ? "success" : "neutral"}>{invoice.status}</Badge>
                <span>
                  {invoice.lines[0]?.description ? `${invoice.lines[0].description} · ` : ""}
                  {dateOf(invoice.ts)}
                </span>
              </>
            }
          >
            <span className={T.amountHero}>{usd(invoice.status === "Paid" ? invoice.paid : invoice.total)}</span>
          </Hero>
        </div>
        <article aria-labelledby="invoice-title" className={cn(CARD, "flex flex-col gap-6 p-8")}>
          <div className="print:hidden">
            <OfflineBanner />
          </div>
          <header className={cn(HAIRLINE, "flex items-start justify-between gap-4 border-b-[length:var(--border-width-1)] pb-6")}>
            <div className="flex flex-col gap-2">
              <IdeezaLogo height={24} decorative={false} />
              <h2 id="invoice-title" className={T.meta}>
                Invoice · AI platform
              </h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone={invoice.status === "Paid" ? "success" : "neutral"}>{invoice.status}</Badge>
              <TestnetDemoBadge />
            </div>
          </header>
          <dl className={cn(HAIRLINE, "flex flex-col border-b-[length:var(--border-width-1)] pb-4")}>
            <Row label="Invoice #">
              <span className="font-mono">{invoice.number}</span>
            </Row>
            <Row label="Date">{dateOf(invoice.ts)}</Row>
            {invoice.period && (
              <Row label="Period">
                {dateOf(invoice.period.from)} – {dateOf(invoice.period.to)}
              </Row>
            )}
            <Row label="Billed to">
              <span className="flex flex-col items-end">
                <span>{to.name}</span>
                {to.lines.map((l, i) => (
                  <span key={`${i}-${l}`} className={T.meta}>
                    {l}
                  </span>
                ))}
              </span>
            </Row>
          </dl>
          <dl className="flex flex-col rounded-xl bg-bg-subtle px-6 py-2">
            {invoice.lines.map((l) => (
              <Row key={l.description} label={<span className="flex flex-col"><span className="text-text-primary">{l.description}</span>{l.detail && <span className={T.meta}>{l.detail}</span>}</span>}>
                {usd(l.total)}
              </Row>
            ))}
            {invoice.adjustments.map((a) => (
              <Row key={a.label} label={a.label} tone="success">
                −{usd(a.amount)}
              </Row>
            ))}
            <Row label="Tax">{usd(invoice.tax)}</Row>
          </dl>
          <p className={cn(T.section, "flex items-center justify-between")}>
            {invoice.status === "Paid" ? "Total paid" : "Total"} <span className="tabular-nums">{usd(invoice.status === "Paid" ? invoice.paid : invoice.total)}</span>
          </p>
          <dl className={cn(HAIRLINE, "flex flex-col border-t-[length:var(--border-width-1)] pt-4")}>
            <Row label="Paid with">{invoice.paidWith}</Row>
            {invoice.payer && <Row label="From">{shortAddress(invoice.payer)}</Row>}
            {invoice.txHash && (
              <Row label="Transaction">
                <span className="font-mono">{shortAddress(invoice.txHash)}</span>
              </Row>
            )}
          </dl>
          <p className={cn(T.meta, "text-text-tertiary")}>Testnet demo: no real money moved. Questions? Contact support@ideeza.com.</p>
        </article>
        </div>
      )}
    </Screen>
  );
}
