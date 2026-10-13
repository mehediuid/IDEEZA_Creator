"use client";

// The Credits tab of Plan & pricing (User Panel V2, "Credits" 41549:170244):
// buy AI credits as a pack or a custom amount, see the balance and, behind
// it, every purchase with what's left of it and when it expires.
//
// - Packs: Starter, Pro (most popular), Power — price, base, bonus, total,
//   "Buy now". Under each, what a plan would save, with "Compare plans".
// - Custom amount: at least 50 credits at $0.10 each. When a pack gives as
//   many for less, it says so and offers to switch ("Better deal").
// - Current balance opens the credit history.
// Every Buy opens the one Buy credits dialog on its Pay step.

import * as React from "react";
import { Badge, Banner, Button, ModalFrame, NumberInput } from "@/components/ideeza";
import {
  CREDIT_PACKS,
  CUSTOM_MIN,
  CUSTOM_RATE,
  MAX_DISCOUNT,
  betterDeal,
  customAmountError,
  customPrice,
  discountRows,
  packPrice,
  usd,
  VALIDITY_MONTHS,
} from "@/lib/create/credit-pricing";
import { lotsOf } from "@/lib/create/credit-lots";
import { useCredits, type CreditEntry } from "@/lib/create/credits";
import { cn } from "@/lib/utils";
import { CURRENT_DISCOUNT, useBuyCredits } from "./buy-credits";

const pct = (d: number) => `${Math.round(d * 100)}%`;
const date = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function CreditsPanel() {
  const { hydrated, balance } = useCredits();
  const { open } = useBuyCredits();
  const [history, setHistory] = React.useState(false);
  const [compare, setCompare] = React.useState(false);
  const discount = CURRENT_DISCOUNT;

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <div className="flex max-w-[62ch] flex-col gap-[4px]">
          <h2 className="text-2xl font-semibold leading-2xl text-text-primary">Buy AI credits</h2>
          <p className="text-md leading-md text-text-secondary">
            Credits pay for AI work: a concept render uses 1, a product build uses 4 per product. Credits you buy last{" "}
            {VALIDITY_MONTHS} months.
          </p>
        </div>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setHistory(true)}
          className="flex flex-col items-end gap-[2px] rounded-lg px-[10px] py-[6px] text-right outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <span className="text-sm leading-sm text-text-secondary">Current balance</span>
          <span className="text-lg font-semibold leading-lg tabular-nums text-text-brand">
            {hydrated ? `${balance.toLocaleString("en-US")} credits` : "—"}
          </span>
          <span className="text-sm font-medium leading-sm text-text-link">Credit history</span>
        </button>
      </div>

      <ul role="list" className="grid grid-cols-3 gap-[16px] max-lg:grid-cols-1">
        {CREDIT_PACKS.map((p) => {
          const price = packPrice(p, discount);
          return (
            <li
              key={p.id}
              className={cn(
                "flex flex-col rounded-xl border border-solid bg-bg-surface",
                p.popular ? "border-border-brand" : "border-border",
              )}
            >
              <div className="flex flex-1 flex-col gap-[12px] p-[20px]">
                <div className="flex items-center justify-between gap-[8px]">
                  <h3 className="text-lg font-semibold leading-lg text-text-primary">{p.name}</h3>
                  {p.popular && <Badge tone="brand">Most popular</Badge>}
                </div>
                <p className="flex items-baseline gap-[8px]">
                  <span className="text-3xl font-semibold leading-3xl tabular-nums text-text-primary">{usd(price.final)}</span>
                  {price.saved > 0 && (
                    <s className="text-md leading-md tabular-nums text-text-tertiary">{usd(price.base)}</s>
                  )}
                </p>
                <dl className="flex flex-col gap-[6px] text-md leading-md">
                  <div className="flex justify-between gap-[12px]">
                    <dt className="text-text-secondary">Base credits</dt>
                    <dd className="tabular-nums text-text-primary">{p.base.toLocaleString("en-US")}</dd>
                  </div>
                  {p.bonus > 0 && (
                    <div className="flex justify-between gap-[12px]">
                      <dt className="text-text-success">Bonus credits</dt>
                      <dd className="tabular-nums text-text-success">+{p.bonus}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-[12px] border-t border-solid border-border pt-[6px] font-semibold">
                    <dt className="text-text-primary">Total</dt>
                    <dd className="tabular-nums text-text-primary">{(p.base + p.bonus).toLocaleString("en-US")}</dd>
                  </div>
                </dl>
                <Button
                  hierarchy={p.popular ? "primary" : "secondary"}
                  size="lg"
                  className="mt-auto w-full"
                  aria-haspopup="dialog"
                  aria-label={`Buy the ${p.name} pack, ${p.base + p.bonus} credits for ${usd(price.final)}`}
                  onClick={() => open({ pick: { kind: "pack", id: p.id } })}
                >
                  Buy now
                </Button>
              </div>
              <div className="flex flex-col items-center gap-[2px] border-t border-solid border-border px-[20px] py-[12px] text-center">
                <span className="text-sm leading-sm text-text-secondary">
                  {discount > 0 ? `You save ${pct(discount)} with your plan` : `Save up to ${pct(MAX_DISCOUNT)} with an IDEEZA plan`}
                </span>
                {discount === 0 && (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setCompare(true)}
                    className="text-sm font-semibold leading-sm text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    Compare plans
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <CustomAmount discount={discount} />

      {history && <CreditHistoryDialog onClose={() => setHistory(false)} />}
      {compare && <DiscountsDialog onClose={() => setCompare(false)} />}
    </div>
  );
}

function CustomAmount({ discount }: { discount: number }) {
  const { open } = useBuyCredits();
  const [text, setText] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const credits = Number(text);
  const error = text === "" ? null : customAmountError(credits);
  const valid = text !== "" && !error;
  const price = customPrice(valid ? credits : 0, discount);
  const deal = valid ? betterDeal(credits, discount) : null;
  const inputId = React.useId();
  const errorId = React.useId();

  return (
    <section
      aria-labelledby={`${inputId}-label`}
      className="flex flex-col gap-[16px] rounded-xl border border-solid border-border bg-bg-surface p-[20px]"
    >
      {deal && (
        <Banner
          tone="info"
          title="Better deal available"
          action={
            <Button
              hierarchy="primary"
              size="md"
              aria-haspopup="dialog"
              onClick={() => open({ pick: { kind: "pack", id: deal.id } })}
            >
              Switch to {deal.name}
            </Button>
          }
        >
          The {deal.name} pack gives {(deal.base + deal.bonus).toLocaleString("en-US")} credits for{" "}
          {usd(packPrice(deal, discount).final)}.
        </Banner>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-[16px] max-md:grid-cols-1">
        <div className="flex flex-col gap-[6px]">
          <label id={`${inputId}-label`} htmlFor={inputId} className="text-md font-semibold leading-md text-text-primary">
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
            placeholder={`At least ${CUSTOM_MIN}`}
            stepsWhat="custom credits"
            ariaDescribedBy={error && touched ? errorId : undefined}
          />
          {error && touched && (
            <p id={errorId} className="text-sm leading-sm text-text-error">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-[2px]">
          <span className="text-2xl font-semibold leading-2xl tabular-nums text-text-primary">{usd(price.final)}</span>
          <span className="text-sm leading-sm text-text-secondary">{usd(CUSTOM_RATE)} per credit</span>
        </div>
        <Button
          hierarchy="secondary"
          size="lg"
          disabled={!valid}
          aria-haspopup="dialog"
          onClick={() => valid && open({ pick: { kind: "custom", credits } })}
        >
          Buy credits
        </Button>
      </div>
    </section>
  );
}

/** "Pro pack", "Custom credits", "Starting balance", "Top up". */
function lotName(e: CreditEntry | undefined): string {
  if (!e) return "Credits";
  if (e.reason === "purchase") return e.pack ? `${e.pack} pack` : "Custom credits";
  if (e.reason === "seed") return "Starting balance";
  return "Top up";
}

function CreditHistoryDialog({ onClose }: { onClose: () => void }) {
  const { ledger } = useCredits();
  const byId = new Map(ledger.map((e) => [e.id, e]));
  const lots = lotsOf(ledger).slice().reverse();
  const [now] = React.useState(() => Date.now());
  return (
    <ModalFrame open onClose={onClose} title="Credit history" description="What you bought, what's left of it and when it expires." size="lg">
      {lots.length === 0 ? (
        <p className="text-md leading-md text-text-secondary">No credits yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-solid border-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-md leading-md">
            <thead className="bg-bg-subtle text-sm leading-sm text-text-secondary">
              <tr>
                {["Type", "Date", "Credits", "Bonus", "Left", "Expires", "Price"].map((h) => (
                  <th key={h} scope="col" className="px-[14px] py-[10px] font-semibold">
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
                    <th scope="row" className="px-[14px] py-[10px] font-medium text-text-primary">
                      {lotName(e)}
                    </th>
                    <td className="px-[14px] py-[10px] tabular-nums text-text-secondary">{date(l.ts)}</td>
                    <td className="px-[14px] py-[10px] tabular-nums text-text-primary">{(l.amount - l.bonus).toLocaleString("en-US")}</td>
                    <td className="px-[14px] py-[10px] tabular-nums text-text-secondary">{l.bonus > 0 ? `+${l.bonus}` : "—"}</td>
                    <td className="px-[14px] py-[10px] tabular-nums text-text-primary">{l.remaining.toLocaleString("en-US")}</td>
                    <td className={cn("px-[14px] py-[10px] tabular-nums", expired ? "text-text-tertiary" : "text-text-secondary")}>
                      {l.expiresAt === null ? "Never" : `${expired ? "Expired " : ""}${date(l.expiresAt)}`}
                    </td>
                    <td className="px-[14px] py-[10px] tabular-nums text-text-secondary">
                      {e?.price !== undefined ? usd(e.price) : "Free"}
                    </td>
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

const PLAN_NAME = { free: "Free", explorer: "Explorer", builder: "Builder", disruptor: "Disruptor" } as const;

function DiscountsDialog({ onClose }: { onClose: () => void }) {
  const pro = CREDIT_PACKS.find((p) => p.id === "pro")!;
  return (
    <ModalFrame
      open
      onClose={onClose}
      title="Credit discounts by plan"
      description={`A paid plan takes a share off every credit you buy. Here is the ${pro.name} pack (${pro.base + pro.bonus} credits) on each.`}
      size="md"
    >
      <div className="flex flex-col gap-[12px]">
        <div className="overflow-x-auto rounded-lg border border-solid border-border">
          <table className="w-full min-w-[480px] border-collapse text-left text-md leading-md">
            <thead className="bg-bg-subtle text-sm leading-sm text-text-secondary">
              <tr>
                {["Plan", "Discount", `${pro.name} pack`, "You save"].map((h) => (
                  <th key={h} scope="col" className="px-[14px] py-[10px] font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {discountRows().map((r) => {
                const price = packPrice(pro, r.discount);
                return (
                  <tr key={`${r.tier}-${r.cycle}`} className="border-t border-solid border-border">
                    <th scope="row" className="px-[14px] py-[10px] font-medium text-text-primary">
                      {PLAN_NAME[r.tier]} ({r.cycle})
                    </th>
                    <td className="px-[14px] py-[10px] tabular-nums text-text-secondary">{pct(r.discount)}</td>
                    <td className="px-[14px] py-[10px] tabular-nums text-text-primary">{usd(price.final)}</td>
                    <td className="px-[14px] py-[10px] tabular-nums text-text-success">{usd(price.saved)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm leading-sm text-text-secondary">
          The Free plan has no credit discount. Plans aren&apos;t on sale yet, so every price here is the full price for now.
        </p>
      </div>
    </ModalFrame>
  );
}
