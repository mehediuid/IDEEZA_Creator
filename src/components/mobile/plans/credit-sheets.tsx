"use client";

// The AI Credits popups (mobile Figma "03 · AI Credits": Better deal
// available, Upgrade to unlock, Compare credit discounts, Compare plans), each
// a bottom sheet in the kit's one style, on the web's prices and rules
// (lib/create/credit-pricing.ts, plans.ts). The plan they offer is the web's
// pitch (`pitchPlan`, CL-032): Builder from Free or Tinkerer, Disruptor from
// Builder, at the cycle the maker pays by. "You've reached your limit" is gone:
// Buy more credits opens Buy credits, the main way out, as on the web — that
// sheet's last block names the plan.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InformationCircleIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ideeza/button";
import { CREDIT_PACKS, MAX_DISCOUNT, discountRows, packPrice, usd, type CreditPack } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { pitchCycle, pitchPlan } from "@/lib/create/upsell";
import { PLANS, planOf, priceOf, relationOf, type Plan } from "@/lib/create/plans";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { T } from "../type";
import { BulletList, CARD, LINK, SheetMark, checkoutPath, dollars, n, pct } from "./parts";

/** The plan the "upgrade" offers name — the web's pitch: Builder from Free or Tinkerer, Disruptor from Builder; null on Disruptor. */
export function useNextPlan(): Plan | null {
  const { sub } = useCreatePlan();
  return pitchPlan(sub.tier);
}

/** Better deal available: a pack gives at least the typed credits for no more than the custom price. */
export function BetterDealSheet({
  open,
  onClose,
  deal,
  credits,
  customPrice,
  discount,
  onCustom,
}: {
  open: boolean;
  onClose: () => void;
  deal: CreditPack;
  credits: number;
  customPrice: number;
  discount: number;
  onCustom: () => void;
}) {
  const router = useRouter();
  const price = packPrice(deal, discount).final;
  const gap = Math.round((price - customPrice) * 100) / 100;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Better deal available"
      description={
        gap > 0
          ? `For just ${usd(gap)} more, get the ${deal.name} pack: ${n(deal.base + deal.bonus)} credits instead of ${n(credits)}.`
          : `The ${deal.name} pack gives ${n(deal.base + deal.bonus)} credits for ${usd(price)}, no more than ${n(credits)} custom credits cost.`
      }
      actions={
        <>
          <Button size="xl" className="w-full" onClick={() => router.push(`/m/plans/checkout?pack=${deal.id}`)}>
            Get {deal.name} pack — {usd(price)}
          </Button>
          <Button
            hierarchy="secondary"
            size="xl"
            className="w-full"
            onClick={() => {
              onClose();
              onCustom();
            }}
          >
            Continue with custom amount
          </Button>
        </>
      }
    >
      <SheetMark icon={SparklesIcon} />
      <BulletList
        items={[
          `${deal.name} pack: ${n(deal.base + deal.bonus)} credits${deal.bonus > 0 ? ` (+${n(deal.bonus)} bonus)` : ""}`,
          `Save up to ${pct(MAX_DISCOUNT)} on credits with an IDEEZA plan`,
        ]}
      />
    </Sheet>
  );
}

/** Upgrade to unlock: the credit discount comes with Builder and higher plans. */
export function UpgradeUnlockSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const builder = planOf("builder");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Upgrade to unlock"
      description="AI credit discounts come with Builder and higher plans."
      actions={
        <>
          <Button size="xl" className="w-full" onClick={() => router.push(checkoutPath("builder", "monthly"))}>
            Upgrade to Builder
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Maybe later
          </Button>
        </>
      }
    >
      <SheetMark icon={InformationCircleIcon} tone="warning" />
      <BulletList
        items={[
          builder.queue,
          `${n(builder.projects)} projects & ${n(builder.exports)} exports`,
          `${n(builder.credits)} AI credits / month`,
          "15% off AI credits (25% yearly)",
        ]}
      />
    </Sheet>
  );
}

/** Compare credit discounts: the Pro pack's price on each plan and cycle. */
export function DiscountsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pro = CREDIT_PACKS.find((p) => p.id === "pro") as CreditPack;
  const total = n(pro.base + pro.bonus);
  const rows = [
    { name: "Free and Tinkerer", off: null as number | null, price: pro.price, saved: 0 },
    ...discountRows().map((r) => {
      const cost = packPrice(pro, r.discount);
      return { name: `${planOf(r.tier).name} · ${r.cycle === "yearly" ? "Yearly" : "Monthly"}`, off: r.discount, price: cost.final, saved: cost.saved };
    }),
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Compare credit discounts"
      description={`What the ${pro.name} pack (${total} credits) costs on each plan.`}
      actions={
        <Button size="xl" className="w-full" onClick={() => router.push("/m/plans")}>
          Upgrade plan & save up to {pct(MAX_DISCOUNT)}
        </Button>
      }
    >
      <ul className="flex flex-col gap-4">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-6 rounded-xl bg-bg-subtle px-8 py-6">
            <span className="flex flex-col gap-1">
              <span className={T.rowTitle}>{r.name}</span>
              {r.off === null ? (
                <span className={T.meta}>No discount</span>
              ) : (
                <span className={cn(T.caption, "self-start rounded-md bg-bg-brand-subtle px-3 py-1 text-text-brand")}>{pct(r.off)} off</span>
              )}
            </span>
            <span className="flex flex-col items-end gap-1 text-right">
              <span className={cn(T.rowTitle, "tabular-nums")}>{usd(r.price)}</span>
              <span className={cn(T.meta, "tabular-nums")}>{total} credits</span>
              {r.saved > 0 && <span className={cn(T.meta, "tabular-nums text-text-success")}>Save {usd(r.saved)}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className={cn(T.meta, "text-center text-text-tertiary")}>Discounts apply to the Builder and Disruptor plans. Free and Tinkerer get no AI credit discount.</p>
    </Sheet>
  );
}

/** Compare plans: how many AI credits each plan adds every month, and its price. */
export function ComparePlansSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sub, plan } = useCreatePlan();
  const next = useNextPlan();
  const router = useRouter();
  const cycle = pitchCycle(sub);
  const upgrade = next && relationOf(sub, next.tier, cycle) === "upgrade" ? next : null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Compare plans"
      description="See how many AI credits each plan includes every month."
      actions={
        upgrade ? (
          <Button size="xl" className="w-full" onClick={() => router.push(checkoutPath(upgrade.tier, cycle))}>
            Upgrade to {upgrade.name}
          </Button>
        ) : undefined
      }
    >
      <table className={cn(CARD, "w-full border-separate border-spacing-0 bg-bg-subtle text-left")}>
        <thead>
          <tr className={T.body}>
            <th scope="col" className="px-8 py-5 font-regular">
              Plan
            </th>
            <th scope="col" className="px-4 py-5 text-right font-regular">
              Credits/mo
            </th>
            <th scope="col" className="px-8 py-5 text-right font-regular">
              Price
            </th>
          </tr>
        </thead>
        <tbody>
          {PLANS.map((p) => (
            <tr key={p.tier} className={T.body}>
              <th scope="row" className="border-t-[length:var(--border-width-1)] border-solid border-border px-8 py-4 font-medium text-text-primary">
                {p.name}
                {p.tier === plan.tier && <span className={cn(T.meta, "ml-3")}>· yours</span>}
              </th>
              <td className="border-t-[length:var(--border-width-1)] border-solid border-border px-4 py-4 text-right tabular-nums text-text-brand">{n(p.credits)}</td>
              <td className="border-t-[length:var(--border-width-1)] border-solid border-border px-8 py-4 text-right tabular-nums text-text-primary">
                {dollars(priceOf(p.tier, "monthly").perMonth)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={cn(T.meta, "rounded-xl bg-bg-success-subtle px-6 py-4 text-text-success")}>
        Disruptor adds {n(planOf("disruptor").credits)} AI credits a month and takes {pct(0.25)} off every credit you buy.
      </p>
      <Link href="/m/plans" onClick={onClose} className={cn(LINK, "self-center")}>
        See every plan
      </Link>
    </Sheet>
  );
}
