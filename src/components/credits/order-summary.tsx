"use client";

// The right column of a checkout (User Panel V2 "Payment details": "Pay
// Monthly $10.00", the plan, Auto renewal, Subtotal, the button) and the
// screens after it ("Upgrade Completed" 41549:167626, "Payment Failed"
// 41549:167678 / 167704).

import * as React from "react";
import Link from "next/link";
import { Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, TestnetDemoBadge, Toggle, buttonVariants } from "@/components/ideeza";
import { cn } from "@/lib/utils";

export type SummaryLine = { label: React.ReactNode; value: React.ReactNode; tone?: "success" };

export function OrderSummary({
  head,
  lines,
  renewal,
  adjustments = [],
  subtotal,
  total,
  cta,
  note,
}: {
  head: { title: string; price: string; sub: string; save?: string };
  lines: SummaryLine[];
  /** A plan: whether it renews at the end of the period. */
  renewal?: { on: boolean; onChange: () => void };
  adjustments?: SummaryLine[];
  subtotal: string;
  total: string;
  cta: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean; hint?: string };
  note?: React.ReactNode;
}) {
  const hintId = React.useId();
  return (
    <section
      aria-label="Order summary"
      className="flex flex-col gap-[20px] rounded-2xl border border-solid border-border bg-bg-surface p-[24px] shadow-2"
    >
      <div className="flex flex-col gap-[8px] rounded-xl bg-bg-subtle p-[16px]">
        <div className="flex items-baseline justify-between gap-[12px]">
          <h2 className="text-xl font-semibold leading-xl text-text-primary">{head.title}</h2>
          <span className="text-xl font-semibold leading-xl tabular-nums text-text-primary">{head.price}</span>
        </div>
        <div className="flex items-baseline justify-between gap-[12px]">
          <span className="text-lg leading-lg text-text-secondary">{head.sub}</span>
          {head.save && <span className="text-lg leading-lg text-text-success">{head.save}</span>}
        </div>
      </div>

      <dl className="flex flex-col gap-[14px] text-lg leading-lg">
        {lines.map((l, i) => (
          <div key={i} className="flex items-baseline justify-between gap-[12px]">
            <dt className="text-text-secondary">{l.label}</dt>
            <dd className={cn("tabular-nums", l.tone === "success" ? "text-text-success" : "text-text-primary")}>{l.value}</dd>
          </div>
        ))}
        {renewal && (
          <div className="flex items-center justify-between gap-[12px]">
            <dt id="auto-renewal" className="text-text-secondary">
              Auto renewal
            </dt>
            <dd>
              <Toggle checked={renewal.on} onChange={renewal.onChange} aria-label="Auto renewal" />
            </dd>
          </div>
        )}
      </dl>

      <dl className="flex flex-col gap-[14px] border-t border-solid border-border pt-[20px] text-lg leading-lg">
        {adjustments.map((l, i) => (
          <div key={i} className="flex items-baseline justify-between gap-[12px]">
            <dt className="text-text-secondary">{l.label}</dt>
            <dd className={cn("tabular-nums", l.tone === "success" ? "text-text-success" : "text-text-primary")}>{l.value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-[12px]">
          <dt className="text-text-secondary">Subtotal</dt>
          <dd className="tabular-nums text-text-primary">{subtotal}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-[12px] font-semibold">
          <dt className="text-text-primary">Due today</dt>
          <dd className="text-xl leading-xl tabular-nums text-text-primary">{total}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-[8px]">
        <Button
          hierarchy="primary"
          size="xl"
          className="w-full"
          onClick={cta.onClick}
          disabled={cta.disabled}
          loading={cta.loading}
          aria-describedby={cta.hint ? hintId : undefined}
        >
          {cta.label}
        </Button>
        {cta.hint && (
          <p id={hintId} className="text-center text-sm leading-sm text-text-secondary">
            {cta.hint}
          </p>
        )}
      </div>
      {note && <div className="text-md leading-md text-text-secondary">{note}</div>}
    </section>
  );
}

/** After the payment: done or failed, centred on the page as the design shows it. */
export function PaymentResult({
  tone,
  title,
  children,
  primary,
  secondary,
  compact,
}: {
  /** Inside a dialog: no page-high panel. */
  compact?: boolean;
  tone: "success" | "error";
  title: string;
  children: React.ReactNode;
  primary: { label: string; href?: string; onClick?: () => void };
  secondary?: { label: string; href: string };
}) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => ref.current?.focus(), []);
  const ok = tone === "success";
  // On the checkout page the result is the page, so its title is the page's
  // h1; inside a dialog it sits under the dialog's own title.
  const Heading = compact ? "h2" : "h1";
  return (
    <section
      role="status"
      aria-labelledby="payment-result"
      className={cn(
        "flex flex-col items-center justify-center gap-[16px] rounded-2xl bg-bg-subtle px-[24px] text-center",
        compact ? "py-[32px]" : "min-h-[560px] flex-1 py-[48px]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-[104px] items-center justify-center rounded-xl",
          ok ? "bg-bg-success-subtle" : "bg-bg-error-subtle text-text-error",
        )}
      >
        {ok ? (
          <span className="inline-flex size-[60px] items-center justify-center rounded-full bg-bg-success text-text-on-brand">
            <Icon icon={Tick02Icon} size={36} strokeWidth={2.5} />
          </span>
        ) : (
          <Icon icon={Alert02Icon} size={64} strokeWidth={2} />
        )}
      </span>
      <Heading id="payment-result" ref={ref} tabIndex={-1} className="text-3xl font-semibold leading-3xl text-text-primary outline-none">
        {title}
      </Heading>
      <div className="flex max-w-[56ch] flex-col items-center gap-[8px] text-lg leading-lg text-text-secondary">{children}</div>
      <div className="mt-[8px] flex flex-wrap items-center justify-center gap-[12px]">
        {primary.href ? (
          <Link href={primary.href} className={cn(buttonVariants({ hierarchy: ok ? "primary" : "danger", size: "xl" }), "min-w-[260px]")}>
            {primary.label}
          </Link>
        ) : (
          <Button hierarchy={ok ? "primary" : "danger"} size="xl" className="min-w-[260px]" onClick={primary.onClick}>
            {primary.label}
          </Button>
        )}
        {secondary && (
          <Link href={secondary.href} className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }))}>
            {secondary.label}
          </Link>
        )}
      </div>
      {ok && (
        <p className="flex flex-wrap items-center justify-center gap-[8px] text-sm leading-sm text-text-secondary">
          <TestnetDemoBadge /> Paid from your demo wallet. No real money moved.
        </p>
      )}
    </section>
  );
}
