"use client";

// The welcome offer on the phone (CL-004; lib/account/welcome-offer.ts and the
// web's components/credits/welcome-offer.tsx): a new account on Free gets half
// off its first payment on any plan for 12 hours. As on the web it pops up
// once on Home — after the Welcome map and the tour, when
// no other sheet is up — and that starts the clock. Here it is an M09 sheet:
// the web's gift line ("A welcome gift, just for you") with the time left,
// the 50% OFF mark, Monthly · Annual, the three paid plans with the
// struck-through price and Most popular on Builder, Compare all plans, Claim
// 50% off → the phone's checkout, and Maybe later (AUTH-7, CL-004). Compare
// all plans opens Plan & pricing without closing the offer for good: back on
// Home it pops up again. Closed (✕, Maybe later or a claim), it never pops up
// again; the offer waits on Plan & pricing and the checkout until it ends or
// is used.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Radio } from "@/components/ideeza/checkbox";
import { OfferMark, useWelcomeOffer } from "@/components/credits/welcome-offer";
import { OFFER_OFF, closeOffer, countdown, offerPrice, startOffer } from "@/lib/account/welcome-offer";
import { usd, type BillingCycle } from "@/lib/create/credit-pricing";
import { PLANS, priceOf, type PlanTier } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { Chevron, LIST_CARD, LIST_ROW } from "../kit/list";
import { Sheet } from "../kit/sheet";
import { MobileTabs } from "../kit/tabs";
import { T } from "../type";

/** Home waits this long to settle, then looks every second until no other sheet is up. */
const SETTLE_MS = 1500;
const RETRY_MS = 1000;
const OFF = `${Math.round(OFFER_OFF * 100)}%`;
const PAID = PLANS.filter((p) => p.monthly > 0);
const CYCLES: readonly { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Annual" },
];

export function WelcomeOfferSheet() {
  const pathname = usePathname();
  const router = useRouter();
  const offer = useWelcomeOffer();
  const [open, setOpen] = React.useState(false);
  const [cycle, setCycle] = React.useState<BillingCycle>("monthly");
  const [tier, setTier] = React.useState<PlanTier>("builder");

  // It pops up while it has never been closed: first after the Welcome, and again on Home if
  // the app was left with it still up. Never once closed.
  const due =
    pathname === "/m" && offer.ready && !open && (offer.phase === "unstarted" ? offer.eligible : offer.live && offer.entry?.closedAt === null);

  React.useEffect(() => {
    if (!due || !offer.email) return;
    const email = offer.email;
    let poll = 0;
    const tryOpen = () => {
      if (document.querySelector('[aria-modal="true"]')) return;
      window.clearInterval(poll);
      if (startOffer(email, Date.now()).ok) setOpen(true);
    };
    const settle = window.setTimeout(() => {
      tryOpen();
      poll = window.setInterval(tryOpen, RETRY_MS);
    }, SETTLE_MS);
    return () => {
      window.clearTimeout(settle);
      window.clearInterval(poll);
    };
  }, [due, offer.email]);

  if (!open || !offer.email || !offer.live) return null;
  const email = offer.email;
  const close = () => {
    closeOffer(email, Date.now());
    setOpen(false);
  };
  const unit = cycle === "yearly" ? "year" : "month";
  const pay = (t: PlanTier) => {
    const { period } = priceOf(t, cycle);
    return { period, ...offerPrice(period) };
  };
  const picked = PAID.find((p) => p.tier === tier) ?? PAID[0];
  const mine = pay(picked.tier);
  /** Compare all plans: Plan & pricing, the offer only put away (it comes back on Home). */
  const compare = () => {
    setOpen(false);
    router.push("/m/plans");
  };

  return (
    <Sheet
      open
      onClose={close}
      title={`Welcome gift: ${OFF} off any plan`}
      description={`A welcome gift, just for you: your first ${unit} of any plan. Ends in ${countdown(offer.left)}.`}
      actions={
        <>
          <Button
            hierarchy="ai"
            size="xl"
            className="w-full"
            onClick={() => {
              close();
              router.push(`/m/plans/checkout?plan=${picked.tier}&cycle=${cycle}`);
            }}
          >
            Claim {OFF} off: {picked.name} for {usd(mine.final)}
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Maybe later
          </Button>
        </>
      }
    >
      <div className="flex justify-center py-2 text-text-brand">
        <OfferMark size="lg" />
      </div>
      <MobileTabs tabs={[...CYCLES]} value={cycle} onChange={setCycle} label="Billing" width="full" />
      <div role="radiogroup" aria-label="Plan" className="flex flex-col gap-4">
        {PAID.map((p) => {
          const on = p.tier === picked.tier;
          const f = pay(p.tier);
          return (
            <label
              key={p.tier}
              className={cn(
                "relative flex min-h-[44px] cursor-pointer items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid p-6 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus",
                on ? "border-border-brand bg-bg-brand-subtle" : "border-border bg-bg-surface",
              )}
            >
              <input type="radio" name="offer-plan" className="sr-only" checked={on} onChange={() => setTier(p.tier)} />
              <Radio checked={on} decorative />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn(T.rowTitle, "flex flex-wrap items-center gap-x-4 gap-y-1")}>
                  {p.name}
                  {p.popular && <Badge tone="brand">Most popular</Badge>}
                </span>
                <span className={T.meta}>{p.credits.toLocaleString("en-US")} AI credits a month</span>
              </span>
              <span className="flex flex-col items-end gap-2">
                <span className="flex items-baseline gap-3">
                  <span className={cn(T.meta, "tabular-nums text-text-tertiary line-through")}>{usd(f.period)}</span>
                  <span className={cn(T.rowTitle, "tabular-nums")}>{usd(f.final)}</span>
                </span>
                <Badge tone="success">You save {usd(f.saving)}</Badge>
              </span>
            </label>
          );
        })}
      </div>
      <button type="button" onClick={compare} className={cn(LIST_CARD, LIST_ROW, "flex-row")}>
        <span className={cn(T.rowTitle, "min-w-0 flex-1")}>Compare all plans</span>
        <Chevron />
      </button>
      <p className={cn(T.meta, "text-center text-text-tertiary")}>
        Then {usd(mine.period)} a {unit}. Cancel any time. Testnet demo: no real money moves.
      </p>
    </Sheet>
  );
}
