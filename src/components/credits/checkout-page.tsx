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
// Above the amount set in "Ask before a purchase over" (Credit alerts and
// limits), the button asks once more before the wallet opens.
//
// A plan takes a coupon code ("Have a coupon?", lib/create/coupons.ts): it
// comes off what is left to pay today, one discount per order — beside the
// welcome offer the bigger one wins —, Pay checks it again (a code that ended
// meanwhile is taken off and nothing is charged), and the order keeps the code
// and what it took off for its invoice. One payment runs at a time.

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
import { needsConfirm } from "@/lib/create/credit-limits";
import { PLAN_PRICING_HREF, VALIDITY_MONTHS, addMonths, coinAmount, usd } from "@/lib/create/credit-pricing";
import { checkoutOrderOf, type CheckoutOrder } from "@/lib/create/checkout-route";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { YEARLY_OFF, planOf, priceOf, quoteUpgrade, relationOf } from "@/lib/create/plans";
import { OFFER_OFF, countdown, offerPrice, spendOffer } from "@/lib/account/welcome-offer";
import { checkCoupon, couponRule, couponSaving, couponsUsed, pickDiscount, type AppliedCoupon, type Coupon } from "@/lib/create/coupons";
import { CouponField, type CouponMessage } from "./coupon-field";
import { useWelcomeOffer } from "./welcome-offer";
import { useSettings } from "@/lib/settings/use-settings";
import { cn } from "@/lib/utils";
import { invoiceHref } from "./billing-history";
import { creditsLine, orderOf } from "./buy-credits";
import { OrderSummary, PaymentResult } from "./order-summary";
import { PaymentPicker, useWalletStatus, type PayCoin } from "./payment-picker";
import { PricingFrame } from "./pricing-frame";
import { PurchaseConfirm } from "./purchase-confirm";

const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const n = (v: number) => v.toLocaleString("en-US");
const pct = (d: number) => `${Math.round(d * 100)}%`;
const cents = (v: number) => Math.round(v * 100) / 100;
/** The time an Apply or a Pay is pressed (an event, not a render). */
const wallClock = () => Date.now();

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
  const welcome = useWelcomeOffer();
  const discount = useCreditDiscount();
  const { request } = useWalletRequest();
  const wallet = useWalletStatus();
  const defaultToken = useDefaultToken();
  const [coin, setCoin] = React.useState<PayCoin>(defaultToken);
  const [autoRenew, setAutoRenew] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>({ kind: "form" });
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const { confirmAbove } = useSettings().credits;
  const [asking, setAsking] = React.useState(false);
  const [orderId, setOrderId] = React.useState(() => newOrderId(order.kind === "plan" ? "plan" : "order"));
  const [now] = React.useState(() => Date.now());
  const [coupon, setCoupon] = React.useState<Coupon | null>(null);
  const [couponDraft, setCouponDraft] = React.useState("");
  const [couponMsg, setCouponMsg] = React.useState<CouponMessage | null>(null);
  // `paying` is state, so two presses in one tick would both read false: the lock is a ref.
  const inFlight = React.useRef(false);

  if (!planReady || !creditsReady) return <p className="text-lg leading-lg text-text-tertiary">Reading your plan and credits…</p>;

  // ── what is bought ──
  const isPlan = order.kind === "plan";
  const target = isPlan ? planOf(order.tier) : null;
  const cycle = isPlan ? order.cycle : "monthly";
  const rel = isPlan ? relationOf(sub, order.tier, cycle) : null;
  const quote = isPlan ? quoteUpgrade(sub, order.tier, cycle, now) : null;
  const credits = !isPlan ? orderOf(order.kind === "pack" ? { kind: "pack", id: order.id } : { kind: "custom", credits: order.credits }, discount) : null;
  // The welcome offer: half off the first payment of a plan bought from Free while it runs.
  const offer = isPlan && welcome.ready && welcome.live && sub.tier === "free" ? offerPrice(quote!.due) : null;
  // A coupon: off what is left today. One discount per order, the bigger one.
  const couponOff = isPlan && coupon ? couponSaving(coupon, quote!.due) : null;
  const winner = isPlan ? pickDiscount(offer?.saving ?? null, couponOff) : null;
  const offered = winner === "offer" ? offer : null;
  const couponApplied: AppliedCoupon | null =
    winner === "coupon" && coupon && couponOff ? { code: coupon.code, amount: couponOff, rule: couponRule(coupon) } : null;
  const due = isPlan ? cents(Math.max(0, quote!.due - (offered?.saving ?? 0) - (couponApplied?.amount ?? 0))) : credits!.price.final;
  const used = couponsUsed(sub.orders);
  const savedLine = couponApplied ? ` You saved ${usd(couponApplied.amount)} with ${couponApplied.code}.` : "";

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
      amount: due,
      paidWith: pay.paidWith,
      price: quote!.price,
      credit: quote!.unused,
      ...(offered ? { offer: offered.saving } : {}),
      ...(couponApplied ? { coupon: couponApplied } : {}),
      txHash: pay.txHash,
      payer: pay.payer,
    });
    if (offered && welcome.email) spendOffer(welcome.email, now);
    if (!autoRenew) cancel();
  };

  // ── the coupon ──
  const applyCoupon = () => {
    if (!isPlan) return;
    const r = checkCoupon(couponDraft, { tier: order.tier, due: quote!.due, now: wallClock(), used });
    if (!r.ok) {
      setCouponMsg({ text: r.message, tone: "error" });
      return;
    }
    if (offer && offer.saving >= r.saving) {
      setCouponMsg({
        text: `Your welcome offer already saves more (${usd(offer.saving)}). One discount per order, so this coupon isn't added.`,
        tone: "info",
      });
      return;
    }
    setCoupon(r.coupon);
    setCouponDraft("");
    setCouponMsg(null);
  };
  const removeCoupon = () => {
    setCoupon(null);
    setCouponDraft("");
    setCouponMsg(null);
  };
  /** Pay checks the code again: one that stopped working comes off, and nothing is charged. */
  const couponStillGood = (): boolean => {
    if (!isPlan || !couponApplied) return true;
    const r = checkCoupon(couponApplied.code, { tier: order.tier, due: quote!.due, now: wallClock(), used });
    if (r.ok) return true;
    setCoupon(null);
    setCouponDraft(couponApplied.code);
    setCouponMsg({ text: r.message, tone: "error" });
    setNote("Your coupon was taken off, so the price changed. Nothing was charged. Check Due today, then pay again.");
    return false;
  };

  const pay = async (confirmed = false) => {
    if (paying || inFlight.current) return;
    setNote(null);
    if (!couponStillGood()) return;
    if (!confirmed && due > 0 && needsConfirm(due, confirmAbove)) {
      setAsking(true);
      return;
    }
    const doneLine = `You're all set on ${target?.name}. ${n(target?.credits ?? 0)} AI credits are added for this month.${savedLine}`;
    if (isPlan && due === 0) {
      inFlight.current = true;
      finishPlan({ paidWith: quote!.due > 0 && couponApplied ? "Covered by coupon" : "Covered by unused time" });
      setPhase({ kind: "done", id: orderId, line: doneLine });
      return;
    }
    inFlight.current = true;
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
                ...(couponApplied ? [{ label: "Coupon", value: `${couponApplied.code} · −${usd(couponApplied.amount)}` }] : []),
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
          line: isPlan ? doneLine : `${n(added)} credits added. You now have ${n(balance + added)} credits.`,
        });
      } else {
        // Nothing landed: the same order may be paid again.
        inFlight.current = false;
        if (result.reason === "rejected") setNote("Payment cancelled in the wallet. Nothing was charged.");
        else setPhase({ kind: "failed", message: result.message ?? "The wallet couldn't take the payment." });
      }
    } catch (e) {
      inFlight.current = false;
      throw e;
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
      adjustments={[
        ...(quote!.unused > 0 ? [{ label: `Unused time on ${current.name}`, value: `−${usd(quote!.unused)}`, tone: "success" as const }] : []),
        ...(offered ? [{ label: `Welcome offer (${Math.round(OFFER_OFF * 100)}% off)`, value: `−${usd(offered.saving)}`, tone: "success" as const }] : []),
        ...(couponApplied
          ? [{ label: `Coupon ${couponApplied.code} (${couponApplied.rule})`, value: `−${usd(couponApplied.amount)}`, tone: "success" as const }]
          : []),
      ]}
      coupon={
        // Nothing to pay today (the unused time covers it): no code can help, so no field.
        quote!.due > 0 ? (
          <CouponField
            applied={couponApplied}
            draft={couponDraft}
            message={couponMsg}
            disabled={paying}
            onDraft={(v) => {
              setCouponDraft(v);
              setCouponMsg(null);
            }}
            onApply={applyCoupon}
            onRemove={removeCoupon}
          />
        ) : undefined
      }
      subtotal={usd(quote!.price)}
      total={usd(due)}
      cta={{
        label: fromPaid ? "Confirm upgrade" : `Upgrade to ${target!.name}`,
        onClick: () => pay(),
        loading: paying,
        disabled: due > 0 && !wallet.connected,
        hint: due > 0 && !wallet.connected ? "Connect your wallet to pay." : undefined,
      }}
      note={
        note ? (
          <p role="status">{note}</p>
        ) : couponApplied && offer ? (
          <p>Your coupon saves more than the welcome offer, so the offer isn&apos;t used.</p>
        ) : offered ? (
          <p className="text-text-success">
            Your welcome offer ends in <span className="tabular-nums">{countdown(welcome.left)}</span>.
          </p>
        ) : undefined
      }
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
        onClick: () => pay(),
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
            <p className="text-lg leading-lg text-text-secondary">
              {quote && quote.due > 0 ? "Your coupon covers this upgrade." : `The unused time on ${current.name} covers this upgrade.`} Nothing to pay today.
            </p>
          )}
        </div>
        <div className={NARROW_COLUMN}>{summary}</div>
      </div>
      {confirmAbove !== null && (
        <PurchaseConfirm
          open={asking}
          amount={due}
          limit={confirmAbove}
          what={isPlan ? `${target!.name}, billed ${cycle === "yearly" ? "yearly" : "monthly"},` : credits!.pack ? `The ${credits!.pack} pack` : "This custom amount"}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            void pay(true);
          }}
        />
      )}
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

