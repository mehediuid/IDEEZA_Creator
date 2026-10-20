"use client";

// Buy credits — a section of Settings › Plan & billing (#buy-credits), from
// User Panel V2 "AI Credit Purchase" (41549:170244 and its states): the three
// packs (Pro the most popular) with their bonus, each price struck through
// when your plan takes a discount off; a custom amount (at least 50 credits
// at $0.10 each) with "Better deal available" when a pack gives as many for
// less; and Compare discounts, the plans' credit discounts. Buying goes to
// the checkout page (checkout-page.tsx). The packs are rows here, in the
// settings type, rather than the design's tall cards.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, ModalFrame, NumberInput, buttonVariants } from "@/components/ideeza";
import { SettingsCard, SettingsRow } from "@/components/settings/settings-card";
import { checkoutHref } from "@/lib/create/checkout-route";
import {
  CREDIT_PACKS,
  CUSTOM_MIN,
  CUSTOM_RATE,
  MAX_DISCOUNT,
  PLAN_SECTIONS,
  PRICING_HREF,
  VALIDITY_MONTHS,
  betterDeal,
  customAmountError,
  customPrice,
  discountRows,
  packPrice,
  usd,
} from "@/lib/create/credit-pricing";
import { useCreatePlan, useCreditDiscount } from "@/lib/create/plan";
import { planOf } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { WRAP } from "./your-plan";

const pct = (d: number) => `${Math.round(d * 100)}%`;
const n = (v: number) => v.toLocaleString("en-US");
/** "$5", "$8.50": whole dollars without cents. */
const price = (v: number) => (Number.isInteger(v) ? `$${v}` : usd(v));
const TOUCH = "[@media(pointer:coarse)]:h-[var(--touch-min)]";

function Price({ final, base }: { final: number; base: number }) {
  return (
    <span className="flex items-baseline gap-[6px] tabular-nums">
      {base > final && <s className="text-sm leading-sm text-text-tertiary">{usd(base)}</s>}
      <span className="text-md font-semibold leading-md text-text-primary">{price(final)}</span>
    </span>
  );
}

export function BuyCreditsCard() {
  const router = useRouter();
  const { plan } = useCreatePlan();
  const discount = useCreditDiscount();
  const [compare, setCompare] = React.useState(false);

  return (
    <SettingsCard
      id={PLAN_SECTIONS.buy}
      title="Buy credits"
      description={`Bought credits last ${VALIDITY_MONTHS} months. ${
        discount > 0 ? `Your ${plan.name} plan takes ${pct(discount)} off.` : `Builder and Disruptor plans take up to ${pct(MAX_DISCOUNT)} off.`
      }`}
      action={
        <Button hierarchy="secondary" size="sm" aria-haspopup="dialog" className={TOUCH} onClick={() => setCompare(true)}>
          Compare discounts
        </Button>
      }
    >
      {CREDIT_PACKS.map((p) => {
        const cost = packPrice(p, discount);
        const total = p.base + p.bonus;
        return (
          <SettingsRow
            key={p.id}
            className="flex-wrap"
            label={
              <span className="inline-flex flex-wrap items-center gap-[8px]">
                {p.name} pack
                {p.popular && <Badge tone="brand">Most popular</Badge>}
              </span>
            }
            help={p.bonus > 0 ? `${n(p.base)} + ${n(p.bonus)} bonus = ${n(total)} credits` : `${n(total)} credits`}
            control={
              <>
                <Price final={cost.final} base={cost.base} />
                <Button
                  hierarchy={p.popular ? "primary" : "tonal"}
                  size="sm"
                  className={cn("min-w-[64px]", TOUCH)}
                  aria-label={`Buy the ${p.name} pack, ${n(total)} credits for ${usd(cost.final)}`}
                  onClick={() => router.push(checkoutHref({ kind: "pack", id: p.id }))}
                >
                  Buy
                </Button>
              </>
            }
          />
        );
      })}
      <CustomAmount discount={discount} />
      {compare && <DiscountsDialog onClose={() => setCompare(false)} />}
    </SettingsCard>
  );
}

function CustomAmount({ discount }: { discount: number }) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const credits = Number(text);
  const error = text === "" ? null : customAmountError(credits);
  const valid = text !== "" && !error;
  const cost = customPrice(valid ? credits : 0, discount);
  const deal = valid ? betterDeal(credits, discount) : null;
  const inputId = React.useId();
  const helpId = React.useId();

  return (
    <>
      <SettingsRow
        className={WRAP}
        label={<label htmlFor={inputId}>Custom amount</label>}
        help={
          <span id={helpId} className={error ? "text-text-error" : undefined}>
            {error ?? `At least ${CUSTOM_MIN} credits, ${usd(CUSTOM_RATE)} each${discount > 0 ? `, ${pct(discount)} off with your plan` : ""}.`}
          </span>
        }
        control={
          <>
            <NumberInput
              id={inputId}
              value={text}
              onChange={setText}
              step={10}
              min={0}
              placeholder={`Min ${CUSTOM_MIN}`}
              stepsWhat="custom credits"
              ariaDescribedBy={helpId}
              className="w-[156px]"
            />
            <Price final={cost.final} base={cost.base} />
            <Button
              hierarchy="tonal"
              size="sm"
              className={cn("min-w-[64px]", TOUCH)}
              disabled={!valid}
              aria-label={valid ? `Buy ${n(credits)} credits for ${usd(cost.final)}` : "Buy a custom amount"}
              onClick={() => valid && router.push(checkoutHref({ kind: "custom", credits }))}
            >
              Buy
            </Button>
          </>
        }
      />
      {deal && (
        <div role="status" className="mt-[8px] flex flex-wrap items-center justify-between gap-[12px] rounded-lg bg-bg-brand-subtle px-[16px] py-[12px]">
          <p className="m-0 max-w-[62ch] text-md leading-md text-text-primary">
            <span className="font-semibold text-text-brand">Better deal available.</span> The {deal.name} pack gives{" "}
            {n(deal.base + deal.bonus)} credits for {usd(packPrice(deal, discount).final)}.
          </p>
          <Button hierarchy="secondary" size="sm" className={TOUCH} onClick={() => router.push(checkoutHref({ kind: "pack", id: deal.id }))}>
            Switch to {deal.name} pack
          </Button>
        </div>
      )}
    </>
  );
}

function DiscountsDialog({ onClose }: { onClose: () => void }) {
  const pro = CREDIT_PACKS.find((p) => p.id === "pro")!;
  const cell = "px-[16px] py-[12px] tabular-nums text-text-primary";
  return (
    <ModalFrame
      open
      onClose={onClose}
      title="Compare credit discounts by plan"
      description="What the Pro pack costs on each plan. Every pack and custom amount gets the same discount."
      size="lg"
    >
      <div className="flex flex-col items-center gap-[20px]">
        <div className="relative w-full overflow-x-auto rounded-xl border border-solid border-border">
          <table className="w-full min-w-[600px] border-collapse text-left text-md leading-md">
            <thead className="bg-bg-subtle text-text-primary">
              <tr>
                {["IDEEZA plan", "Base price", "Final price", "Total credits"].map((h) => (
                  <th key={h} scope="col" className="px-[16px] py-[12px] font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-solid border-border">
                <th scope="row" className="px-[16px] py-[12px] font-regular text-text-primary">
                  Free and Tinkerer
                </th>
                <td className={cell}>{price(pro.price)}</td>
                <td className={cell}>{price(pro.price)}</td>
                <td className={cell}>{n(pro.base + pro.bonus)}</td>
              </tr>
              {discountRows().map((r) => {
                const cost = packPrice(pro, r.discount);
                return (
                  <tr key={`${r.tier}-${r.cycle}`} className="border-t border-solid border-border">
                    <th scope="row" className="px-[16px] py-[12px] font-regular text-text-primary">
                      {planOf(r.tier).name} ({r.cycle === "yearly" ? "yearly" : "monthly"})
                      <span className="block text-sm leading-sm text-text-secondary">{pct(r.discount)} discount</span>
                    </th>
                    <td className={cell}>{price(pro.price)}</td>
                    <td className={cell}>
                      {usd(cost.final)}
                      <span className="block text-sm leading-sm text-text-secondary">Save {usd(cost.saved)}</span>
                    </td>
                    <td className={cell}>
                      {n(pro.base + pro.bonus)}
                      <span className="block text-sm leading-sm text-text-secondary">
                        ({n(pro.base)} + {pro.bonus} bonus)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Link href={PRICING_HREF} onClick={onClose} className={cn(buttonVariants({ hierarchy: "primary", size: "lg" }), "w-full max-w-[420px]")}>
          See plans and save up to {pct(MAX_DISCOUNT)}
        </Link>
        <p className="m-0 text-center text-sm leading-sm text-text-tertiary">
          Builder and Disruptor take a discount off credits. Free and Tinkerer don&apos;t.
        </p>
      </div>
    </ModalFrame>
  );
}
