"use client";

// Payment details — the checkout page (User Panel V2 41549:165658 and its
// states: Crypto USDT/IDZ, Wallet connected, Builder → Disruptor 41549:166495,
// a credit pack 41549:166716, custom credits 41549:166643). One page for a
// plan upgrade and for credits, chosen by the query (lib/create/checkout-route).
//
// Left: for an upgrade from a paid plan, "Confirm your upgrade" (from → to,
// and what happens now); then how to pay. Right (under it on a narrow page):
// the order — what, how billed, Auto renewal for a plan, anything taken off,
// Due today, and the button, which waits for the wallet. Paying runs the Demo
// wallet's own request (review, sign) and lands the plan or the credits in the same
// commit as its debit. Then "Upgrade completed" / "Payment successful", or
// "Payment failed" with Try again. Payments aren't on: it is all testnet.

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { NARROW_COLUMN, NARROW_WITH_RAIL } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { useDefaultToken } from "@/lib/account/payment";
import { PLAN_PRICING_HREF, VALIDITY_MONTHS, addMonths, coinAmount, usd } from "@/lib/create/credit-pricing";
import { checkoutOrderOf, type CheckoutOrder } from "@/lib/create/checkout-route";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { YEARLY_OFF, planOf, priceOf, quoteUpgrade, relationOf } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { invoiceHref } from "./billing-history";
import { creditsLine, orderOf } from "./buy-credits";
import { OrderSummary, PaymentResult } from "./order-summary";
import { PaymentPicker, useWalletStatus, type PayCoin } from "./payment-picker";
import { PricingFrame } from "./pricing-frame";

const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const n = (v: number) => v.toLocaleString("en-US");
const pct = (d: number) => `${Math.round(d * 100)}%`;

function newOrderId(prefix: "plan" | "order"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const CRUMBS = [
  { label: "Plan & pricing", href: PLAN_PRICING_HREF },
  { label: "Payment details" },
];

export function CheckoutPage() {
  const params = useSearchParams();
  const order = checkoutOrderOf((k) => params.get(k));
  return (
    <PricingFrame crumbs={CRUMBS}>
      {order ? <Checkout key={params.toString()} order={order} /> : <NothingToBuy />}
    </PricingFrame>
  );
}

function NothingToBuy({ line }: { line?: string }) {
  return (
    <div className="flex flex-col items-start gap-[12px] py-[24px]">
      <h1 className="text-4xl font-semibold leading-4xl text-text-primary">Nothing to pay for</h1>
      <p className="max-w-[62ch] text-lg leading-lg text-text-secondary">
        {line ?? "This link doesn't name a plan or credits to buy. Choose one on Plan & pricing."}
      </p>
      <Link href={PLAN_PRICING_HREF} className={buttonVariants({ hierarchy: "primary", size: "lg" })}>
        See plans
      </Link>
    </div>
  );
}

type Phase = { kind: "form" } | { kind: "done"; id: string; line: string } | { kind: "failed"; message: string };

function Checkout({ order }: { order: CheckoutOrder }) {
  const { hydrated: planReady, sub, plan: current, start, cancel } = useCreatePlan();
  const { hydrated: creditsReady, balance, purchase } = useCredits();
  const discount = useCreditDiscount();
  const { request } = useWalletRequest();
  const wallet = useWalletStatus();
  const defaultToken = useDefaultToken();
  const [coin, setCoin] = React.useState<PayCoin>(defaultToken);
  const [autoRenew, setAutoRenew] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>({ kind: "form" });
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [orderId, setOrderId] = React.useState(() => newOrderId(order.kind === "plan" ? "plan" : "order"));
  const [now] = React.useState(() => Date.now());

  if (!planReady || !creditsReady) return <p className="text-lg leading-lg text-text-tertiary">Reading your plan and credits…</p>;

  // ── what is bought ──
  const isPlan = order.kind === "plan";
  const target = isPlan ? planOf(order.tier) : null;
  const cycle = isPlan ? order.cycle : "monthly";
  const rel = isPlan ? relationOf(sub, order.tier, cycle) : null;
  const quote = isPlan ? quoteUpgrade(sub, order.tier, cycle, now) : null;
  const credits = !isPlan ? orderOf(order.kind === "pack" ? { kind: "pack", id: order.id } : { kind: "custom", credits: order.credits }, discount) : null;
  const due = isPlan ? quote!.due : credits!.price.final;

  if (phase.kind === "done") {
    return isPlan ? (
      <PaymentResult
        tone="success"
        title="Upgrade completed"
        primary={{ label: "Go to dashboard", href: "/" }}
        secondary={{ label: "View invoice", href: invoiceHref(phase.id) }}
      >
        <p>{phase.line}</p>
      </PaymentResult>
    ) : (
      <PaymentResult
        tone="success"
        title="Payment successful"
        primary={{ label: "Go to dashboard", href: "/" }}
        secondary={{ label: "View invoice", href: invoiceHref(phase.id) }}
      >
        <p>{phase.line}</p>
      </PaymentResult>
    );
  }
  if (phase.kind === "failed") {
    return (
      <PaymentResult
        tone="error"
        title="Payment failed"
        primary={{
          label: "Try again",
          onClick: () => {
            setOrderId(newOrderId(isPlan ? "plan" : "order"));
            setPhase({ kind: "form" });
          },
        }}
      >
        <p>Unfortunately, we couldn&apos;t process your payment. Please try again.</p>
        <p className="text-md leading-md">{phase.message} Nothing was charged.</p>
      </PaymentResult>
    );
  }

  if (isPlan && rel !== "upgrade") {
    const line =
      rel === "current"
        ? `You're already on ${target!.name}${order.cycle === "yearly" ? ", billed yearly" : ""}.`
        : rel === "scheduled"
          ? `${target!.name} starts on ${sub.renewsAt ? date(sub.renewsAt) : "your renewal"}. Nothing to pay now.`
          : `${target!.name} is a smaller plan. Switch to it from Plans: it starts when your period ends, and nothing is charged.`;
    return <NothingToBuy line={line} />;
  }

  const finishPlan = (pay: { paidWith: string; txHash?: string; payer?: string }) => {
    start(order.kind === "plan" ? order.tier : "free", cycle, {
      orderId,
      amount: quote!.due,
      paidWith: pay.paidWith,
      price: quote!.price,
      credit: quote!.unused,
      txHash: pay.txHash,
      payer: pay.payer,
    });
    if (!autoRenew) cancel();
  };

  const pay = async () => {
    if (paying) return;
    setNote(null);
    if (isPlan && due === 0) {
      finishPlan({ paidWith: "Covered by unused time" });
      setPhase({ kind: "done", id: orderId, line: `You're all set on ${target!.name}. ${n(target!.credits)} AI credits are added for this month.` });
      return;
    }
    setPaying(true);
    try {
      const result = await request(
        {
          kind: "transaction",
          purpose: isPlan ? "subscribe" : "buyCredits",
          identity: "maker",
          network: "baseSepolia",
          title: isPlan ? `Pay for ${target!.name}` : "Pay for AI credits",
          summary: isPlan
            ? [
                { label: "Plan", value: `${target!.name} · ${cycle === "yearly" ? "billed yearly" : "billed monthly"}` },
                { label: "Due today", value: usd(due) },
              ]
            : [
                { label: "Credits", value: `${credits!.name} · ${creditsLine(credits!.base, credits!.bonus)}` },
                { label: "Price", value: usd(due) },
              ],
          note: "Testnet demo, no real money moves.",
          doneLine: isPlan ? `You're on ${target!.name}.` : `${n(credits!.base + credits!.bonus)} credits added to your account.`,
          charge: { network: "baseSepolia", lines: [{ coin, amount: String(coinAmount(due, coin)) }] },
        },
        {
          commit: (proof) => {
            const paidWith = `${coin} · demo wallet`;
            if (isPlan) finishPlan({ paidWith, txHash: proof.txHash, payer: proof.address });
            else
              purchase({
                orderId,
                base: credits!.base,
                bonus: credits!.bonus,
                pack: credits!.pack,
                price: credits!.price.final,
                listPrice: credits!.price.base,
                paidWith,
                txHash: proof.txHash,
                payer: proof.address,
              });
            return { ok: true };
          },
        },
      );
      if (result.ok) {
        const added = credits ? credits.base + credits.bonus : 0;
        setPhase({
          kind: "done",
          id: orderId,
          line: isPlan
            ? `You're all set on ${target!.name}. ${n(target!.credits)} AI credits are added for this month.`
            : `${n(added)} credits added. You now have ${n(balance + added)} credits.`,
        });
      } else if (result.reason === "rejected") {
        setNote("Payment cancelled in the wallet. Nothing was charged.");
      } else {
        setPhase({ kind: "failed", message: result.message ?? "The wallet couldn't take the payment." });
      }
    } finally {
      setPaying(false);
    }
  };

  // ── the summary ──
  const fromPaid = isPlan && sub.tier !== "free";
  const per = isPlan ? priceOf(order.tier, cycle) : null;
  const renewsAt = isPlan ? quote!.renewsAt : null;
  const summary = isPlan ? (
    <OrderSummary
      head={{
        title: cycle === "yearly" ? "Pay annually" : "Pay monthly",
        price: usd(per!.period),
        sub: `${usd(per!.perMonth)} / month`,
        save: cycle === "yearly" ? `Save ${pct(YEARLY_OFF)}` : undefined,
      }}
      lines={[
        { label: `${target!.name} plan`, value: `${n(target!.credits)} AI credits / month` },
        { label: "Starts", value: "Today" },
        { label: autoRenew ? "Renews on" : "Ends on", value: date(renewsAt!) },
      ]}
      renewal={{ on: autoRenew, onChange: () => setAutoRenew((v) => !v) }}
      adjustments={
        quote!.unused > 0 ? [{ label: `Unused time on ${current.name}`, value: `−${usd(quote!.unused)}`, tone: "success" }] : []
      }
      subtotal={usd(quote!.price)}
      total={usd(due)}
      cta={{
        label: fromPaid ? "Confirm upgrade" : `Upgrade to ${target!.name}`,
        onClick: pay,
        loading: paying,
        disabled: due > 0 && !wallet.connected,
        hint: due > 0 && !wallet.connected ? "Connect your wallet to pay." : undefined,
      }}
      note={note && <p role="status">{note}</p>}
    />
  ) : (
    <OrderSummary
      head={{
        title: credits!.pack ? `${credits!.pack} pack` : "Custom AI credits",
        price: usd(credits!.price.base),
        sub: creditsLine(credits!.base, credits!.bonus),
      }}
      lines={[{ label: "Credits last", value: `Until ${date(addMonths(now, VALIDITY_MONTHS))}` }]}
      adjustments={
        credits!.price.saved > 0
          ? [{ label: `${current.name} plan discount (${pct(discount)})`, value: `−${usd(credits!.price.saved)}`, tone: "success" }]
          : []
      }
      subtotal={usd(credits!.price.base)}
      total={usd(due)}
      cta={{
        label: `Pay ${usd(due)}`,
        onClick: pay,
        loading: paying,
        disabled: !wallet.connected,
        hint: !wallet.connected ? "Connect your wallet to pay." : undefined,
      }}
      note={note && <p role="status">{note}</p>}
    />
  );

  return (
    <div className="flex flex-col gap-[32px] pb-[24px]">
      <PageHeader title="Payment details" className="mb-0" />
      {/* Form and summary switch on the page container (main's width), never
          the window: under 1024 the summary stacks under the form. */}
      <div className={NARROW_WITH_RAIL}>
        <div className={cn(NARROW_COLUMN, "flex flex-col gap-[32px]")}>
          {fromPaid && (
            <section aria-labelledby="confirm-upgrade" className="flex flex-col gap-[16px]">
              <h2 id="confirm-upgrade" className="text-2xl font-semibold leading-2xl text-text-primary">
                Confirm your upgrade
              </h2>
              <div className="grid grid-cols-2 gap-[16px] max-sm:grid-cols-1">
                <PlanTile label="From" name={current.name} line={`${usd(priceOf(sub.tier, sub.cycle).perMonth)} / month${sub.cycle === "yearly" ? " · annual" : ""}`} />
                <PlanTile label="Upgrading to" name={target!.name} line={`${usd(per!.perMonth)} / month${cycle === "yearly" ? " · annual" : ""}`} brand />
              </div>
              <div className="flex items-start gap-[12px] rounded-xl bg-bg-subtle p-[16px]">
                <span aria-hidden className="mt-[2px] text-text-brand">
                  <Icon icon={InformationCircleIcon} size={20} />
                </span>
                <div className="flex flex-col gap-[4px]">
                  <p className="text-lg font-semibold leading-lg text-text-brand">Important</p>
                  <p className="text-md leading-md text-text-secondary">
                    Your plan becomes {target!.name} now. The unused time on {current.name} comes off today&apos;s price, and the next
                    billing is on {date(renewsAt!)}. Cancel any time.
                  </p>
                </div>
              </div>
            </section>
          )}
          {due > 0 ? (
            <PaymentPicker amountUsd={due} coin={coin} onCoin={setCoin} />
          ) : (
            <p className="text-lg leading-lg text-text-secondary">The unused time on {current.name} covers this upgrade. Nothing to pay today.</p>
          )}
        </div>
        <div className={NARROW_COLUMN}>{summary}</div>
      </div>
    </div>
  );
}

function PlanTile({ label, name, line, brand }: { label: string; name: string; line: string; brand?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-[4px] rounded-xl p-[20px]", brand ? "bg-bg-brand-subtle" : "bg-bg-subtle")}>
      <span className="text-lg leading-lg text-text-secondary">{label}</span>
      <span className={cn("text-3xl font-semibold leading-3xl", brand ? "text-text-brand" : "text-text-primary")}>{name}</span>
      <span className="text-lg leading-lg text-text-secondary">{line}</span>
    </div>
  );
}

