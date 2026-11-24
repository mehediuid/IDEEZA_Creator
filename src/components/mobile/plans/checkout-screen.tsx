"use client";

// Checkout on the phone (/m/plans/checkout; mobile Figma "02 · Upgrade &
// Checkout" Annual · Monthly · Crypto · Coupon · Card error, then "05 ·
// Success & Failed"). The web's checkout logic (components/credits/
// checkout-page.tsx): `?plan=builder&cycle=yearly`, `?pack=pro` or
// `?credits=80`; an upgrade from a paid plan takes the unused time off; the
// welcome offer halves a first plan payment; a plan takes a coupon code
// (lib/create/coupons.ts: off what is left today, each code once, and one
// discount per order — the bigger of the offer and the coupon); the plan's
// discount comes off credits. Card and PayPal aren't available yet (web: an
// info line in the wallet row), so the method is Crypto from the Demo wallet,
// USDT or IDZ, signed in the kit's wallet sheet (KIT-WS) — the plan or the
// credits land in the same commit as the debit. A token the wallet can't pay
// with is off and says what you have. Due today and the one button sit in
// the Bottom action bar: Connect wallet while none is connected, then the
// web's words with the amount — Upgrade to Builder · $10.00 (Confirm upgrade
// from a paid plan), Pay $x for credits (MON-11). Offline, Pay is off with its reason and nothing is bought. Then the
// full-screen result: Upgrade completed / Credits added (kept in the address
// as `?done=<order>`, so a reload shows the result, not the form again), or
// Payment failed with the wallet's own reason.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cancel01Icon, CheckmarkCircle02Icon, DiscountTag01Icon, InformationCircleIcon, PlusSignIcon, Tick02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { Toggle } from "@/components/ideeza/toggle";
import { creditsLine, orderOf } from "@/components/credits/buy-credits";
import { useWalletStatus, type PayCoin } from "@/components/credits/payment-picker";
import { useWelcomeOffer } from "@/components/credits/welcome-offer";
import { planSummaryOf } from "@/lib/account/money-phone";
import { useDefaultToken } from "@/lib/account/payment";
import { invoiceNumber, invoicesOf } from "@/lib/account/invoices";
import { OFFER_OFF, countdown, offerPrice, spendOffer } from "@/lib/account/welcome-offer";
import { checkCoupon, couponRule, couponSaving, couponsUsed, pickDiscount, type AppliedCoupon, type Coupon } from "@/lib/create/coupons";
import { needsConfirm } from "@/lib/create/credit-limits";
import { VALIDITY_MONTHS, addMonths, coinAmount, usd } from "@/lib/create/credit-pricing";
import { checkoutOrderOf, type CheckoutOrder } from "@/lib/create/checkout-route";
import { useCredits } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { planOf, priceOf, quoteUpgrade, relationOf } from "@/lib/create/plans";
import { useSettings } from "@/lib/settings/use-settings";
import { compareAmounts, formatAmount } from "@/lib/wallet/money";
import { networkLabelOf } from "@/lib/wallet/request-view";
import { cn } from "@/lib/utils";
import { ConnectSheet } from "../earn-coin/parts";
import { useWalletSheet } from "../earn-coin/wallet-sheet";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { Chevron, LIST_CARD, LIST_DIVIDERS, LIST_ROW } from "../kit/list";
import { EmptyState } from "../kit/state";
import { ListBones, OfflineBanner, useOnline } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { T } from "../type";
import { CARD, HAIRLINE, InfoLine, OFFLINE_REASON, ResultView, Row, SectionHead, dateOf, invoicePath, n, newOrderId, pct, usePayBalances } from "./parts";

const cents = (v: number) => Math.round(v * 100) / 100;
/** The time a code is checked at (outside render, so the component stays pure). */
const wallClock = () => Date.now();
const COINS = ["USDT", "IDZ"] as const;

export function CheckoutScreen() {
  const params = useSearchParams();
  const order = checkoutOrderOf((k) => params.get(k));
  const done = params.get("done");
  if (!order) return <NothingToPay line="This link doesn’t name a plan or credits to buy. Choose one on Plan & pricing." />;
  const key = [params.get("plan"), params.get("cycle"), params.get("pack"), params.get("credits")].join("|");
  return done ? <Done key={done} order={order} orderId={done} /> : <Checkout key={key} order={order} />;
}

function NothingToPay({ line }: { line: string }) {
  return (
    <Screen top={<TopBar back="/m/plans" title="Checkout" />} className="px-8 pt-8">
      <EmptyState icon={InformationCircleIcon} title="Nothing to pay for" body={line} action={{ label: "See plans", href: "/m/plans" }} />
    </Screen>
  );
}

function Bones() {
  return (
    <Screen top={<TopBar back="/m/plans" title="Checkout" />} className="px-8 pt-8">
      <ListBones rows={4} />
    </Screen>
  );
}

/** "Builder · Annual", "Pro pack", "Custom credits". */
function whatOf(order: CheckoutOrder, pack: string | undefined): string {
  if (order.kind === "plan") return `${planOf(order.tier).name} · ${order.cycle === "yearly" ? "Annual" : "Monthly"}`;
  return pack ? `${pack} pack` : "Custom credits";
}

/** The result of a payment that went through, read back from its invoice — so a reload shows it again
 *  in place of the form (and its Pay button). */
function Done({ order, orderId }: { order: CheckoutOrder; orderId: string }) {
  const router = useRouter();
  const { hydrated: planReady, sub } = useCreatePlan();
  const { hydrated: creditsReady, balance, ledger } = useCredits();
  const discount = useCreditDiscount();
  const invoice = React.useMemo(() => invoicesOf(ledger, sub.orders).find((i) => i.id === orderId) ?? null, [ledger, sub.orders, orderId]);
  if (!planReady || !creditsReady) return <Bones />;
  if (!invoice) return <Checkout order={order} />;
  if (order.kind === "plan") {
    const target = planOf(order.tier);
    const saved = invoice.coupon ? ` You saved ${usd(invoice.coupon.amount)} with ${invoice.coupon.code}.` : "";
    return (
      <Screen>
        <ResultView
          tone="success"
          title="Upgrade completed"
          line={`You’re all set on ${target.name}. ${n(target.credits)} AI credits are added for this month.${saved}`}
          rows={[
            { label: "Plan", value: whatOf(order, undefined) },
            { label: "Amount paid", value: usd(invoice.paid) },
            { label: "Date", value: dateOf(invoice.ts) },
            { label: "Invoice", value: `#${invoiceNumber(invoice.id, invoice.ts)}` },
          ]}
          primary={{ label: "Start creating", href: "/m/ai" }}
          secondary={{ label: "View invoice", href: invoicePath(invoice.id) }}
          onClose={() => router.replace("/m/plans?tab=billing")}
        />
      </Screen>
    );
  }
  const credits = orderOf(order.kind === "pack" ? { kind: "pack", id: order.id } : { kind: "custom", credits: order.credits }, discount);
  const added = credits.base + credits.bonus;
  return (
    <Screen>
      <ResultView
        tone="success"
        title="Credits added"
        line={`${n(added)} credits have been added to your balance.`}
        rows={[
          { label: "Pack", value: whatOf(order, credits.pack) },
          { label: "Credits added", value: `+${n(added)}`, tone: "success" },
          { label: "Balance now", value: `${n(balance)} credits` },
          { label: "Amount paid", value: usd(invoice.paid) },
        ]}
        primary={{ label: "Start creating", href: "/m/ai" }}
        secondary={{ label: "View invoice", href: invoicePath(invoice.id) }}
        onClose={() => router.replace("/m/plans?tab=credits")}
      />
    </Screen>
  );
}

type Phase = { kind: "form" } | { kind: "failed"; message: string };
type CouponMessage = { text: string; tone: "error" | "info" };

const NETWORK = "baseSepolia" as const;

/** Why the wallet didn't take a payment, in the wallet sheet's own words. */
const FAIL_WORDS: Record<string, string> = {
  walletDisconnected: "Your wallet disconnected before it confirmed.",
  networkChanged: "Your wallet switched network before it confirmed.",
  accountChanged: "Your wallet switched account before it confirmed.",
  insufficientFunds: "Your balance changed before it confirmed.",
  storageFailed: "This browser couldn’t save it (storage is full or blocked).",
};

function Checkout({ order }: { order: CheckoutOrder }) {
  const router = useRouter();
  const online = useOnline();
  const { hydrated: planReady, sub, plan: current, start, cancel } = useCreatePlan();
  const { hydrated: creditsReady, purchase } = useCredits();
  const welcome = useWelcomeOffer();
  const discount = useCreditDiscount();
  const wallet = useWalletStatus();
  const balances = usePayBalances(NETWORK);
  const defaultToken = useDefaultToken();
  const { request, sheet } = useWalletSheet();
  const { confirmAbove } = useSettings().credits;
  const [picked, setPicked] = React.useState<PayCoin>(defaultToken);
  const [autoRenew, setAutoRenew] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>({ kind: "form" });
  const [paying, setPaying] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [asking, setAsking] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [orderId, setOrderId] = React.useState(() => newOrderId(order.kind === "plan" ? "plan" : "order"));
  const [now] = React.useState(() => Date.now());
  const [coupon, setCoupon] = React.useState<Coupon | null>(null);
  const [couponDraft, setCouponDraft] = React.useState("");
  const [couponMsg, setCouponMsg] = React.useState<CouponMessage | null>(null);
  // `paying` is state, so two presses in one tick would both read false: the lock is a ref.
  const inFlight = React.useRef(false);

  if (!planReady || !creditsReady) return <Bones />;

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
  const couponApplied: AppliedCoupon | null = winner === "coupon" && coupon && couponOff ? { code: coupon.code, amount: couponOff, rule: couponRule(coupon) } : null;
  const due = isPlan ? cents(Math.max(0, quote!.due - (offered?.saving ?? 0) - (couponApplied?.amount ?? 0))) : credits!.price.final;
  const used = couponsUsed(sub.orders);
  const what = whatOf(order, credits?.pack);

  if (phase.kind === "failed") {
    return (
      <Screen>
        <ResultView
          tone="error"
          title="Payment failed"
          line={isPlan ? "We couldn’t process your payment. No charge was made to your account." : "Your credit purchase didn’t go through. Nothing was charged; please try again."}
          rows={[
            { label: "Reason", value: phase.message, tone: "error" },
            { label: isPlan ? "Plan" : "Pack", value: what },
            { label: "Amount", value: usd(due) },
          ]}
          primary={{
            label: "Try again",
            onClick: () => {
              setOrderId(newOrderId(isPlan ? "plan" : "order"));
              setPhase({ kind: "form" });
            },
          }}
          secondary={{ label: "Change payment method", href: "/m/settings/payments" }}
          onClose={() => router.replace("/m/plans")}
        />
      </Screen>
    );
  }

  if (isPlan && rel !== "upgrade") {
    const line =
      rel === "current"
        ? `You’re already on ${target!.name}${cycle === "yearly" ? ", billed yearly" : ""}.`
        : rel === "scheduled"
          ? `${target!.name} starts on ${sub.renewsAt ? dateOf(sub.renewsAt) : "your renewal"}. Nothing to pay now.`
          : `${target!.name} is a smaller plan. Switch to it from Plans: it starts when your period ends, and nothing is charged.`;
    return <NothingToPay line={line} />;
  }

  // The token you pay with: the one you picked, unless the wallet can't cover it and can cover the other.
  const short = (c: PayCoin) => !!balances && due > 0 && compareAmounts(balances[c], String(coinAmount(due, c))) < 0;
  const other: PayCoin = picked === "USDT" ? "IDZ" : "USDT";
  const coin: PayCoin = short(picked) && !short(other) ? other : picked;
  const noFunds = short("USDT") && short("IDZ");

  /** The result takes the form's place in the address, so a reload can't pay twice. */
  const showDone = (id: string) => {
    const q = new URLSearchParams(window.location.search);
    q.set("done", id);
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
  };

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

  // ── the coupon (the web's rules and words) ──
  const applyCoupon = () => {
    if (!isPlan || paying) return;
    const r = checkCoupon(couponDraft, { tier: order.tier, due: quote!.due, now: wallClock(), used });
    if (!r.ok) {
      setCouponMsg({ text: r.message, tone: "error" });
      return;
    }
    if (offer && offer.saving >= r.saving) {
      setCouponMsg({ text: `Your welcome offer already saves more (${usd(offer.saving)}). One discount per order, so this coupon isn’t added.`, tone: "info" });
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
    if (!online) {
      setNote(OFFLINE_REASON);
      return;
    }
    if (!couponStillGood()) return;
    if (!confirmed && due > 0 && needsConfirm(due, confirmAbove)) {
      setAsking(true);
      return;
    }
    if (isPlan && due === 0) {
      inFlight.current = true;
      finishPlan({ paidWith: quote!.due > 0 && couponApplied ? "Covered by coupon" : "Covered by unused time" });
      showDone(orderId);
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
          network: NETWORK,
          title: isPlan ? `Pay for ${target!.name}` : "Pay for AI credits",
          summary: isPlan
            ? [
                { label: "Plan", value: `${target!.name} · ${cycle === "yearly" ? "billed yearly" : "billed monthly"}` },
                ...(couponApplied ? [{ label: "Coupon", value: `${couponApplied.code} · −${usd(couponApplied.amount)}` }] : []),
                { label: "Due today", value: usd(due) },
                // The sheet lists what leaves the wallet for USDT itself; IDZ is said here.
                ...(coin === "IDZ" ? [{ label: "You pay", value: `≈ ${coinAmount(due, "IDZ").toLocaleString("en-US")} IDZ` }] : []),
              ]
            : [
                { label: "Credits", value: `${credits!.pack ? `${credits!.pack} pack` : "Custom credits"} · ${creditsLine(credits!.base, credits!.bonus)}` },
                { label: "Price", value: usd(due) },
                ...(coin === "IDZ" ? [{ label: "You pay", value: `≈ ${coinAmount(due, "IDZ").toLocaleString("en-US")} IDZ` }] : []),
              ],
          note: "Testnet demo, no real money moves.",
          doneLine: isPlan ? `You’re on ${target!.name}.` : `${n(credits!.base + credits!.bonus)} credits added to your account.`,
          charge: { network: NETWORK, lines: [{ coin, amount: String(coinAmount(due, coin)) }] },
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
      if (result.ok) showDone(orderId);
      else if (result.reason === "rejected") setNote("Payment cancelled in the wallet. Nothing was charged.");
      else setPhase({ kind: "failed", message: result.message || FAIL_WORDS[result.reason] || "The wallet couldn’t take the payment." });
    } finally {
      inFlight.current = false;
      setPaying(false);
    }
  };

  const fromPaid = isPlan && sub.tier !== "free";
  const per = isPlan ? priceOf(order.tier, cycle) : null;
  const summary = isPlan ? planSummaryOf(target!.monthly, order.tier, cycle) : null;
  // The web's button words (checkout-page.tsx), with the amount the phone's bar pays.
  const verb = isPlan ? (fromPaid ? "Confirm upgrade" : `Upgrade to ${target!.name}`) : null;
  const ctaLabel = verb ? (due > 0 ? `${verb} · ${usd(due)}` : verb) : `Pay ${usd(due)}`;
  const noWallet = due > 0 && !wallet.connected;
  const reason = !online ? OFFLINE_REASON : noWallet ? null : due > 0 && noFunds ? "Your demo wallet doesn’t hold enough test USDT or IDZ for this." : null;

  return (
    <Screen
      top={<TopBar back="/m/plans" title="Checkout" />}
      className="px-8 pb-8 pt-4"
      footer={
        <BottomBar>
          <p className={cn(T.section, "flex items-center justify-between")}>
            Due today <span className="tabular-nums">{usd(due)}</span>
          </p>
          {(reason || note) && (
            <p id="pay-why" role="status" className={T.caption}>
              {reason ?? note}
            </p>
          )}
          {noWallet ? (
            <Button size="xl" className="w-full" disabled={!online} aria-describedby={reason ? "pay-why" : undefined} onClick={() => setConnecting(true)}>
              Connect wallet
            </Button>
          ) : (
            <Button size="xl" className="w-full" loading={paying} disabled={!!reason} aria-describedby={reason || note ? "pay-why" : undefined} onClick={() => pay()}>
              {ctaLabel}
            </Button>
          )}
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-8">
        <OfflineBanner />
        <section aria-label="What you’re buying" className={LIST_CARD}>
          <button
            type="button"
            onClick={() => router.push(isPlan ? "/m/plans" : "/m/plans?tab=credits")}
            aria-label={`${isPlan ? `${target!.name} plan` : credits!.pack ? `${credits!.pack} pack` : "Custom AI credits"}. ${isPlan ? "Change plan" : "Change pack"}`}
            className={cn(LIST_ROW, "items-start active:bg-bg-subtle")}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex flex-wrap items-center gap-3">
                <span className={T.section}>{isPlan ? `${target!.name} plan` : credits!.pack ? `${credits!.pack} pack` : "Custom AI credits"}</span>
                <Badge tone="brand">{isPlan ? (cycle === "yearly" ? "Annual" : "Monthly") : `${VALIDITY_MONTHS} months`}</Badge>
              </span>
              <span className={cn(T.body, "flex flex-wrap items-center gap-x-3 gap-y-1")}>
                {isPlan ? (cycle === "yearly" ? "Billed annually" : "Billed monthly") : creditsLine(credits!.base, credits!.bonus)}
                <span className="tabular-nums text-text-primary">· {isPlan ? `${usd(per!.period)} / ${cycle === "yearly" ? "yr" : "mo"}` : usd(credits!.price.base)}</span>
              </span>
              <span className="flex flex-wrap items-center gap-3">
                <span className={cn(T.rowTitle, "text-text-brand")}>{isPlan ? "Change plan" : "Change pack"}</span>
                <TestnetDemoBadge />
              </span>
            </span>
            <Chevron className="self-center" />
          </button>
        </section>

        {fromPaid && (
          <section aria-labelledby="confirm-upgrade" className="flex flex-col gap-4">
            <SectionHead
              id="confirm-upgrade"
              info={
                <p className={T.body}>
                  Your plan becomes {target!.name} now. The unused time on {current.name} comes off today’s price, and the next billing is on {dateOf(quote!.renewsAt)}. Cancel any time.
                </p>
              }
            >
              Confirm your upgrade
            </SectionHead>
            <div className="grid grid-cols-2 gap-4">
              <PlanTile label="From" name={current.name} line={`${usd(priceOf(sub.tier, sub.cycle).perMonth)} / month${sub.cycle === "yearly" ? " · annual" : ""}`} />
              <PlanTile label="Upgrading to" name={target!.name} line={`${usd(per!.perMonth)} / month${cycle === "yearly" ? " · annual" : ""}`} brand />
            </div>
            <p className={T.meta}>Starts now · next billing {dateOf(quote!.renewsAt)}</p>
          </section>
        )}

        {offered && (
          <p role="status" className={cn(T.body, "flex items-start gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid border-[var(--color-border-success)] bg-bg-success-subtle p-6 text-text-success")}>
            <Icon icon={CheckmarkCircle02Icon} size={18} />
            <span className="flex flex-col">
              <span className={cn(T.rowTitle, "text-text-success")}>Welcome offer applied</span>
              <span>
                You saved {usd(offered.saving)}. It ends in <span className="tabular-nums">{countdown(welcome.left)}</span>.
              </span>
            </span>
          </p>
        )}

        {due > 0 && (
          <section aria-labelledby="pay-method" className="flex flex-col gap-4">
            <h2 id="pay-method" className={T.section}>
              Pay with crypto
            </h2>
            <div className={cn(LIST_CARD, LIST_DIVIDERS)}>
              <div className="flex flex-col gap-4 px-8 py-6">
                <p className={T.meta}>Choose a token and connect your wallet to pay.</p>
                <div role="radiogroup" aria-label="Token" className="flex gap-4">
                  {COINS.map((c) => {
                    const on = coin === c;
                    const off = short(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={off}
                        onClick={() => setPicked(c)}
                        className={cn(
                          "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border-[length:var(--border-width-1-5)] border-solid px-4 py-3 outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed",
                          on ? "border-border-brand bg-bg-brand-subtle" : "border-border active:bg-bg-subtle",
                        )}
                      >
                        <span className={cn(T.rowTitle, "inline-flex items-center gap-3", on && "text-text-brand", off && "text-text-disabled")}>
                          <span aria-hidden className={cn("size-[10px] rounded-full border-[length:var(--border-width-2)] border-solid", on ? "border-border-brand bg-bg-brand" : "border-border")} />
                          {c}
                        </span>
                        {balances && (
                          <span className={cn(T.micro, "tabular-nums", off && "text-text-error")}>
                            {off ? "Not enough: you have " : "You have "}
                            {formatAmount(balances[c], c)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <dl className="flex flex-col px-8 py-3">
                <Row label="Amount due">
                  ≈ {coinAmount(due, coin).toLocaleString("en-US")} {coin}
                </Row>
                <Row label="Network">{networkLabelOf(NETWORK)}</Row>
              </dl>
              <div className={cn(LIST_ROW, "hover:bg-transparent")}>
                <span className="shrink-0 text-[color:var(--color-icon-default)]">
                  <Icon icon={Wallet01Icon} size={24} />
                </span>
                <span className={cn(T.body, "flex-1 text-text-primary")}>Demo wallet</span>
                {wallet.connected ? (
                  <span className={cn(T.caption, "inline-flex shrink-0 items-center gap-2 text-text-success")}>
                    <Icon icon={CheckmarkCircle02Icon} size={16} />
                    Wallet connected · {wallet.short}
                  </span>
                ) : (
                  <span className={cn(T.caption, "shrink-0")}>Not connected</span>
                )}
              </div>
            </div>
            <InfoLine>Card and PayPal aren’t available yet.</InfoLine>
          </section>
        )}
        {due === 0 && isPlan && (
          <p className={T.body}>{quote!.due > 0 ? "Your coupon covers this upgrade." : `The unused time on ${current.name} covers this upgrade.`} Nothing to pay today.</p>
        )}

        {/* Nothing to pay today (the unused time covers it): no code can help, so no field. */}
        {isPlan && quote!.due > 0 && (
          <CouponRow
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
        )}
        {couponApplied && offer && <p className={T.meta}>Your coupon saves more than the welcome offer, so the offer isn’t used.</p>}

        {isPlan && (
          <label className={cn(LIST_CARD, "cursor-pointer flex-row items-center justify-between gap-6 px-8 py-6")}>
            <span className="flex flex-col gap-1">
              <span className={T.rowTitle}>Auto-renew subscription</span>
              <span className={T.meta}>{autoRenew ? `Renews on ${dateOf(quote!.renewsAt)}. You can cancel any time.` : `Ends on ${dateOf(quote!.renewsAt)}, then you’re on Free.`}</span>
            </span>
            <Toggle checked={autoRenew} onChange={() => setAutoRenew((v) => !v)} aria-label="Auto-renew subscription" />
          </label>
        )}

        <section aria-labelledby="summary" className={cn(CARD, "flex flex-col p-8")}>
          <h2 id="summary" className={cn(T.section, "pb-2")}>
            Summary
          </h2>
          <dl className="flex flex-col">
            {isPlan ? (
              <>
                <Row label="Subtotal">{usd(summary!.subtotal)}</Row>
                {summary!.annualOff > 0 && (
                  <Row label="Annual discount (20%)" tone="success">
                    −{usd(summary!.annualOff)}
                  </Row>
                )}
                {quote!.unused > 0 && (
                  <Row label={`Unused time on ${current.name}`} tone="success">
                    −{usd(quote!.unused)}
                  </Row>
                )}
                {offered && (
                  <Row label={`Welcome offer (${pct(OFFER_OFF)} off)`} tone="success">
                    −{usd(offered.saving)}
                  </Row>
                )}
                {couponApplied && (
                  <Row label={`Coupon ${couponApplied.code} (${couponApplied.rule})`} tone="success">
                    −{usd(couponApplied.amount)}
                  </Row>
                )}
              </>
            ) : (
              <>
                <Row label="Subtotal">{usd(credits!.price.base)}</Row>
                {credits!.price.saved > 0 && (
                  <Row label={`${current.name} plan discount (${pct(discount)})`} tone="success">
                    −{usd(credits!.price.saved)}
                  </Row>
                )}
                <Row label="Credits last">Until {dateOf(addMonths(now, VALIDITY_MONTHS))}</Row>
              </>
            )}
            <Row label="Tax">{usd(0)}</Row>
          </dl>
          <p className={cn(T.section, HAIRLINE, "mt-3 flex items-center justify-between border-t-[length:var(--border-width-1)] pt-6")}>
            Due today <span className="tabular-nums">{usd(due)}</span>
          </p>
        </section>
      </div>
      <ConnectSheet open={connecting} onClose={() => setConnecting(false)} description="You pay from it. This is the testnet demo wallet — test funds only, nothing is written to a real blockchain." />
      {confirmAbove !== null && (
        <ConfirmSheet
          open={asking}
          onClose={() => setAsking(false)}
          title="Confirm this purchase"
          body={`${what} costs ${usd(due)}, more than the ${usd(confirmAbove)} you asked to confirm. You can change that amount in Credit alerts and limits.`}
          verb={`Pay ${usd(due)}`}
          onConfirm={() => {
            setAsking(false);
            void pay(true);
          }}
        />
      )}
      {sheet}
    </Screen>
  );
}

/** "Have a coupon?" (Figma Upgrade & Checkout › Coupon; the web's CouponField): the link, the code and
 *  Apply, the reason it doesn't work, and the applied code with ✓ and ✕ to take it off. */
function CouponRow({
  applied,
  draft,
  message,
  disabled,
  onDraft,
  onApply,
  onRemove,
}: {
  applied: AppliedCoupon | null;
  draft: string;
  message: CouponMessage | null;
  /** While the payment runs: neither Apply nor ✕ answers. */
  disabled?: boolean;
  onDraft: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
}) {
  const [opened, setOpened] = React.useState(false);
  const open = opened || !!applied || !!message || draft !== "";
  const inputId = React.useId();
  const supportId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (!open)
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => {
          setOpened(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={cn(LIST_CARD, LIST_ROW, "flex-row active:bg-bg-subtle")}
      >
        <span className="shrink-0 text-[color:var(--color-icon-default)]">
          <Icon icon={DiscountTag01Icon} size={24} />
        </span>
        <span className={cn(T.body, "flex-1 text-text-primary")}>Have a coupon?</span>
        <span aria-hidden className="shrink-0 text-[color:var(--color-icon-default)]">
          <Icon icon={PlusSignIcon} size={20} />
        </span>
      </button>
    );

  const error = message?.tone === "error";
  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={inputId} className={T.label}>
        Have a coupon?
      </label>
      {applied ? (
        <>
          <TextInput
            id={inputId}
            size="xl"
            readOnly
            value={applied.code}
            leading={<Icon icon={Tick02Icon} size={16} />}
            aria-describedby={supportId}
            action={<IconButton type="button" size="sm" aria-label={`Remove coupon ${applied.code}`} disabled={disabled} onClick={onRemove} icon={<Icon icon={Cancel01Icon} size={16} />} />}
          />
          <p id={supportId} role="status" className={T.caption}>
            Coupon applied: {usd(applied.amount)} off. Off today’s payment only. Renewals are at the full price.
          </p>
        </>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!disabled) onApply();
          }}
        >
          <div className="flex items-start gap-4">
            <TextInput
              ref={inputRef}
              id={inputId}
              size="xl"
              value={draft}
              onValueChange={(v) => onDraft(v.toUpperCase())}
              placeholder="Enter coupon code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={32}
              invalid={error}
              aria-invalid={error || undefined}
              aria-describedby={message ? supportId : undefined}
              containerClassName="min-w-0 flex-1"
            />
            <Button type="submit" hierarchy="tonal" size="xl" disabled={disabled}>
              Apply
            </Button>
          </div>
          {message && (
            <p id={supportId} role={error ? "alert" : "status"} className={cn(T.caption, error && "text-text-error")}>
              {message.text}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function PlanTile({ label, name, line, brand }: { label: string; name: string; line: string; brand?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl p-6", brand ? "bg-bg-brand-subtle" : "bg-bg-subtle")}>
      <span className={T.meta}>{label}</span>
      <span className={cn(T.section, brand && "text-text-brand")}>{name}</span>
      <span className={T.meta}>{line}</span>
    </div>
  );
}
