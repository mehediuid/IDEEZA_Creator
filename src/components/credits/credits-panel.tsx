"use client";

// Credits — the Credits tab of Plan & pricing, laid out as User Panel V2
// draws it ("Credits" 41549:170244, Better Deal 41549:171154, Disruptor
// discount 41549:171369, Compare Plans 41549:170446, Current Balance
// 41549:172078):
//
// - "Purchase AI credits" with the 12-month line; on the right the current
//   balance (it opens the credit history) and, on a plan with a discount,
//   "Your <plan> discount · N% OFF".
// - Three pack cards — Starter, Pro (most popular), Power: the price (struck
//   through when a plan discount applies), base, bonus and total, Purchase
//   now, and under a hairline what a plan saves, with Compare plans.
// - Custom amount: at least 50 credits at $0.10 each, the price and the
//   rate (and your discount), Purchase credits; when a pack gives as many for
//   less, "Better deal available!" with Switch to pack.
// Purchase goes to the checkout page (checkout-page.tsx). Under them, Credit
// alerts and limits (credit-alerts.tsx, #credit-alerts).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Button, ModalFrame, NumberInput, buttonVariants } from "@/components/ideeza";
import { checkoutHref } from "@/lib/create/checkout-route";
import {
  CREDIT_PACKS,
  CUSTOM_MIN,
  CUSTOM_RATE,
  MAX_DISCOUNT,
  PLAN_PRICING_HREF,
  VALIDITY_MONTHS,
  betterDeal,
  customAmountError,
  customPrice,
  discountRows,
  packPrice,
  usd,
} from "@/lib/create/credit-pricing";
import { lotsOf } from "@/lib/create/credit-lots";
import { useCredits, type CreditEntry } from "@/lib/create/credits";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { planOf } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { CreditAlertsCard } from "./credit-alerts";
import { PLAN_CARDS } from "./pricing-frame";

const pct = (d: number) => `${Math.round(d * 100)}%`;
const n = (v: number) => v.toLocaleString("en-US");
const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
/** "$5", "$8.50": whole dollars without cents. */
const price = (v: number) => (Number.isInteger(v) ? `$${v}` : usd(v));

const CARD_FILL = "bg-[linear-gradient(160deg,var(--color-bg-brand-subtle),var(--color-bg-surface)_55%)]";

export function CreditsPanel() {
  const router = useRouter();
  const { hydrated, balance } = useCredits();
  const { plan } = useCreatePlan();
  const [history, setHistory] = React.useState(false);
  const [compare, setCompare] = React.useState(false);
  const discount = useCreditDiscount();

  return (
    <div className="flex w-full flex-col gap-[40px]">
      <div className="flex flex-wrap items-start justify-between gap-[24px]">
        <div className="flex max-w-[62ch] flex-col gap-[12px]">
          <h2 className="text-4xl font-semibold leading-4xl text-text-primary">Purchase AI credits</h2>
          <p className="text-lg leading-lg text-text-secondary">
            Power your creativity with flexible credit options with {VALIDITY_MONTHS}-month validity.
          </p>
        </div>
        <div className="flex flex-wrap items-stretch gap-[16px]">
          <div className="flex flex-col items-end gap-[6px]">
            <span className="text-lg leading-lg text-text-secondary">Current balance</span>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setHistory(true)}
              title="Open your credit history"
              className="rounded-lg bg-bg-brand-subtle px-[16px] py-[4px] text-2xl font-semibold leading-2xl tabular-nums text-text-brand outline-none transition-colors duration-fast hover:bg-[var(--color-button-tonal-bg-hover)] focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {hydrated ? `${n(balance)} credits` : "—"}
            </button>
          </div>
          {discount > 0 && (
            <div className="flex flex-col justify-center gap-[2px] rounded-xl bg-bg-success-subtle px-[16px] py-[8px]">
              <span className="text-lg leading-lg text-text-success">Your {plan.name} discount</span>
              <span className="text-2xl font-semibold leading-2xl text-text-success">{pct(discount)} OFF</span>
            </div>
          )}
        </div>
      </div>

      <ul role="list" className={cn(PLAN_CARDS, "pt-[12px]")}>
        {CREDIT_PACKS.map((p) => {
          const cost = packPrice(p, discount);
          return (
            <li
              key={p.id}
              className={cn(
                "relative flex flex-col rounded-2xl border border-solid",
                CARD_FILL,
                p.popular ? "border-border-brand" : "border-border",
              )}
            >
              {p.popular && (
                <Badge tone="brand-solid" className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 px-[12px] text-md leading-md">
                  Most popular
                </Badge>
              )}
              <div className="flex flex-1 flex-col gap-[16px] p-[24px]">
                <h3 className="text-3xl font-semibold leading-3xl text-text-primary">{p.name}</h3>
                <p className="flex items-baseline gap-[8px]">
                  <span className="text-5xl font-bold leading-5xl tabular-nums text-text-primary">{price(cost.final)}</span>
                  {cost.saved > 0 && <s className="text-lg leading-lg tabular-nums text-text-tertiary">{usd(cost.base)}</s>}
                </p>
                <dl className="flex flex-col gap-[12px] text-lg leading-lg">
                  <div className="flex justify-between gap-[12px]">
                    <dt className="text-text-secondary">Base credits</dt>
                    <dd className="tabular-nums text-text-secondary">{n(p.base)}</dd>
                  </div>
                  <div className={cn("flex justify-between gap-[12px]", p.bonus === 0 && "invisible")} aria-hidden={p.bonus === 0}>
                    <dt className="text-text-success">Bonus credits</dt>
                    <dd className="tabular-nums text-text-success">+{n(p.bonus)}</dd>
                  </div>
                  <div className="flex justify-between gap-[12px]">
                    <dt className="text-text-primary">Total credit</dt>
                    <dd className="tabular-nums text-text-primary">{n(p.base + p.bonus)}</dd>
                  </div>
                </dl>
                <Button
                  hierarchy={p.popular ? "primary" : "tonal"}
                  size="lg"
                  className="mt-auto w-full"
                  aria-label={`Purchase the ${p.name} pack, ${n(p.base + p.bonus)} credits for ${usd(cost.final)}`}
                  onClick={() => router.push(checkoutHref({ kind: "pack", id: p.id }))}
                >
                  Purchase now
                </Button>
              </div>
              <div className="flex flex-col items-center gap-[4px] border-t border-solid border-border px-[24px] py-[20px] text-center">
                <span className="text-md leading-md text-text-primary">
                  {discount > 0 ? `You're saving ${pct(discount)} with your ${plan.name} plan` : `Save up to ${pct(MAX_DISCOUNT)} with an IDEEZA plan`}
                </span>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setCompare(true)}
                  className="text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Compare plans
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <CustomAmount discount={discount} />

      <CreditAlertsCard />

      {history && <CreditHistoryDialog onClose={() => setHistory(false)} />}
      {compare && <DiscountsDialog onClose={() => setCompare(false)} />}
    </div>
  );
}

function CustomAmount({ discount }: { discount: number }) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const credits = Number(text);
  const error = text === "" ? null : customAmountError(credits);
  const valid = text !== "" && !error;
  const cost = customPrice(valid ? credits : 0, discount);
  const deal = valid ? betterDeal(credits, discount) : null;
  const inputId = React.useId();
  const errorId = React.useId();

  return (
    <section
      aria-labelledby={`${inputId}-label`}
      className="flex flex-col gap-[24px] rounded-2xl border border-solid border-border bg-bg-surface p-[24px]"
    >
      {deal && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-[16px] rounded-xl bg-bg-brand-subtle px-[24px] py-[20px]">
          <div className="flex items-start gap-[12px]">
            <span aria-hidden className="mt-[2px] text-text-brand">
              <Icon icon={InformationCircleIcon} size={20} />
            </span>
            <div className="flex flex-col gap-[4px]">
              <p className="text-lg font-semibold leading-lg text-text-brand">Better deal available!</p>
              <p className="text-md leading-md text-text-secondary">
                Get {n(deal.base)} credits{deal.bonus > 0 ? ` (+${deal.bonus} bonus)` : " (0 bonus)"} for just{" "}
                {usd(packPrice(deal, discount).final)} instead.
              </p>
            </div>
          </div>
          <Button hierarchy="primary" size="lg" className="min-w-[200px]" onClick={() => router.push(checkoutHref({ kind: "pack", id: deal.id }))}>
            Switch to {deal.name} pack
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 items-center gap-[16px] [@container(min-width:1024px)]:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_auto] [@container(min-width:1024px)]:gap-[32px]">
        <div className="flex flex-col gap-[12px]">
          <label id={`${inputId}-label`} htmlFor={inputId} className="text-xl font-semibold leading-xl text-text-primary">
            Custom amount
          </label>
          <NumberInput
            id={inputId}
            value={text}
            onChange={(v) => {
              setText(v);
              setTouched(true);
            }}
            step={10}
            min={0}
            size="lg"
            placeholder={`Enter amount… (min ${CUSTOM_MIN})`}
            stepsWhat="custom credits"
            ariaDescribedBy={error && touched ? errorId : undefined}
          />
          {error && touched && (
            <p id={errorId} role="alert" className="text-sm leading-sm text-text-error">
              {error}
            </p>
          )}
        </div>
        <span aria-hidden className="hidden h-full w-px bg-border [@container(min-width:1024px)]:block" />
        <div className="flex flex-wrap items-end gap-[32px]">
          <div className="flex flex-col gap-[4px]">
            <span className="text-4xl font-semibold leading-4xl tabular-nums text-text-primary">{usd(cost.final)}</span>
            <span className="text-lg leading-lg text-text-secondary">Rate: {usd(CUSTOM_RATE)} / credit</span>
          </div>
          {discount > 0 && (
            <div className="flex flex-col gap-[4px]">
              <span className="text-4xl font-semibold leading-4xl tabular-nums text-text-success">−{usd(cost.saved)}</span>
              <span className="text-lg leading-lg text-text-secondary">Your discount</span>
            </div>
          )}
        </div>
        <Button
          hierarchy="tonal"
          size="lg"
          className="min-w-[220px]"
          disabled={!valid}
          onClick={() => valid && router.push(checkoutHref({ kind: "custom", credits }))}
        >
          Purchase credits
        </Button>
      </div>
    </section>
  );
}

/** "Pro pack", "Custom credit", "Starting balance", "Builder plan", "Top up". */
function lotName(e: CreditEntry | undefined): string {
  if (!e) return "Credits";
  if (e.reason === "purchase") return e.pack ? `${e.pack} pack` : "Custom credit";
  if (e.reason === "seed") return "Starting balance";
  if (e.reason === "grant") return "Plan credits";
  return "Top up";
}

function CreditHistoryDialog({ onClose }: { onClose: () => void }) {
  const { ledger } = useCredits();
  const byId = new Map(ledger.map((e) => [e.id, e]));
  const lots = lotsOf(ledger).slice().reverse();
  const [now] = React.useState(() => Date.now());
  return (
    <ModalFrame open onClose={onClose} title="Credit history" description="Track your purchases and credit usage." size="lg">
      {lots.length === 0 ? (
        <p className="text-md leading-md text-text-secondary">No credits yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-solid border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-lg leading-lg">
            <thead className="bg-bg-subtle text-md leading-md text-text-primary">
              <tr>
                {["Type", "Purchase date", "Base credits", "Bonus", "Remaining", "Expiry date", "Price"].map((h) => (
                  <th key={h} scope="col" className="px-[20px] py-[16px] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => {
                const e = byId.get(l.id);
                const expired = l.expiresAt !== null && l.expiresAt <= now;
                return (
                  <tr key={l.id} className="border-t border-solid border-border">
                    <th scope="row" className="px-[20px] py-[14px] font-regular text-text-primary">
                      {lotName(e)}
                    </th>
                    <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{date(l.ts)}</td>
                    <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{n(l.amount - l.bonus)}</td>
                    <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{l.bonus > 0 ? `+${l.bonus}` : "-"}</td>
                    <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{n(l.remaining)}</td>
                    <td className={cn("px-[20px] py-[14px] tabular-nums", expired ? "text-text-tertiary" : "text-text-primary")}>
                      {l.expiresAt === null ? "Never" : `${expired ? "Expired " : ""}${date(l.expiresAt)}`}
                    </td>
                    <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{e?.price !== undefined ? usd(e.price) : "Free"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ModalFrame>
  );
}

function DiscountsDialog({ onClose }: { onClose: () => void }) {
  const pro = CREDIT_PACKS.find((p) => p.id === "pro")!;
  return (
    <ModalFrame
      open
      onClose={onClose}
      title="Compare credit discounts by plan"
      description="See how much you save on credit purchases with each IDEEZA plan."
      size="lg"
    >
      <div className="flex flex-col items-center gap-[24px]">
        <div className="w-full overflow-x-auto rounded-xl border border-solid border-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-lg leading-lg">
            <thead className="bg-bg-subtle text-md leading-md text-text-primary">
              <tr>
                <th scope="col" className="px-[20px] py-[16px] font-medium">
                  IDEEZA plan
                </th>
                <th scope="col" className="px-[20px] py-[16px] font-medium">
                  Base price
                </th>
                <th scope="col" className="px-[20px] py-[16px] font-medium">
                  Final price <span className="font-regular text-text-secondary">(after discount)</span>
                </th>
                <th scope="col" className="px-[20px] py-[16px] font-medium">
                  Total credits
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-solid border-border">
                <th scope="row" className="px-[20px] py-[14px] font-regular text-text-primary">
                  Free and Tinkerer
                </th>
                <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{price(pro.price)}</td>
                <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{price(pro.price)}</td>
                <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{n(pro.base + pro.bonus)}</td>
              </tr>
              {discountRows().map((r) => {
                const cost = packPrice(pro, r.discount);
                return (
                  <tr key={`${r.tier}-${r.cycle}`} className="border-t border-solid border-border">
                    <th scope="row" className="px-[20px] py-[14px] font-regular text-text-primary">
                      {planOf(r.tier).name} ({r.cycle === "yearly" ? "Yearly" : "Monthly"})
                      <span className="block text-md leading-md text-text-secondary">{pct(r.discount)} discount</span>
                    </th>
                    <td className="px-[20px] py-[14px] tabular-nums text-text-primary">{price(pro.price)}</td>
                    <td className="px-[20px] py-[14px] tabular-nums text-text-primary">
                      {usd(cost.final)}
                      <span className="block text-md leading-md text-text-secondary">Save {usd(cost.saved)}</span>
                    </td>
                    <td className="px-[20px] py-[14px] tabular-nums text-text-primary">
                      {n(pro.base + pro.bonus)}
                      <span className="block text-md leading-md text-text-secondary">
                        ({n(pro.base)} + {pro.bonus} bonus)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Link
          href={PLAN_PRICING_HREF}
          onClick={onClose}
          className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "w-full max-w-[480px]")}
        >
          Upgrade plan &amp; save up to {pct(MAX_DISCOUNT)}
        </Link>
        <p className="text-center text-md leading-md text-text-tertiary">
          Discounts apply to the Builder and Disruptor plans. Free and Tinkerer get no AI credit discount.
        </p>
      </div>
    </ModalFrame>
  );
}
