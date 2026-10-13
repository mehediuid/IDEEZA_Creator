// What AI credits cost — User Panel V2, "AI Credit Purchase" (Figma
// 41549:170243). Three packs, a custom amount at a flat rate, and a discount
// on both for paid plans by billing cycle ("Compare Credit Discounts by
// Plan"; the design's "Explorer" row is the Tinkerer plan). Bought credits
// last 12 months from the purchase.
//
// The design's paid-plan screen shows rounded prices ($3 / $6 / $12 under
// "35% OFF"); the discount table is the source of truth, so prices are
// computed from it ($20 at 35% is $13).
//
// Payments aren't on. In this demo a purchase is paid from the Demo wallet
// on testnet: USDT one for one, IDZ at the demo rate below.
//
// Pure, no imports.

/** Settings › Plan & pricing: its Plans tab, and its Credits tab. */
export const PLAN_PRICING_HREF = "/settings/plan";
export const CREDITS_HREF = "/settings/plan?tab=credits";

export type PackId = "starter" | "pro" | "power";

export type CreditPack = {
  id: PackId;
  name: string;
  /** US dollars, before any plan discount. */
  price: number;
  base: number;
  bonus: number;
  popular?: boolean;
};

export const CREDIT_PACKS: readonly CreditPack[] = [
  { id: "starter", name: "Starter", price: 5, base: 100, bonus: 0 },
  { id: "pro", name: "Pro", price: 10, base: 500, bonus: 50, popular: true },
  { id: "power", name: "Power", price: 20, base: 1000, bonus: 150 },
];

/** A custom amount: dollars per credit, and the least that can be bought. */
export const CUSTOM_RATE = 0.1;
export const CUSTOM_MIN = 50;
export const CUSTOM_MAX = 100_000;

/** Bought credits expire this many months after the purchase. */
export const VALIDITY_MONTHS = 12;

/** The demo rate for paying in IDZ: IDZ per US dollar. */
export const IDZ_PER_USD = 1;

export type PlanTierKey = "free" | "tinkerer" | "builder" | "disruptor";
export type BillingCycle = "monthly" | "yearly";

/** The credit discount a plan gives, by cycle (the design's table). */
const DISCOUNT: Record<PlanTierKey, Record<BillingCycle, number>> = {
  free: { monthly: 0, yearly: 0 },
  tinkerer: { monthly: 0, yearly: 0 },
  builder: { monthly: 0.15, yearly: 0.25 },
  disruptor: { monthly: 0.25, yearly: 0.35 },
};

/** The largest discount any plan gives — "Save up to 35%". */
export const MAX_DISCOUNT = Math.max(...Object.values(DISCOUNT).flatMap((d) => Object.values(d)));

export function discountFor(tier: PlanTierKey, cycle: BillingCycle): number {
  return DISCOUNT[tier][cycle];
}

/** The rows of "Compare credit discounts": every plan and cycle with one. */
export function discountRows(): { tier: PlanTierKey; cycle: BillingCycle; discount: number }[] {
  const rows: { tier: PlanTierKey; cycle: BillingCycle; discount: number }[] = [];
  for (const tier of Object.keys(DISCOUNT) as PlanTierKey[]) {
    for (const cycle of ["monthly", "yearly"] as const) {
      const discount = DISCOUNT[tier][cycle];
      if (discount > 0) rows.push({ tier, cycle, discount });
    }
  }
  return rows;
}

const cents = (n: number) => Math.round(n * 100) / 100;

export type Price = { base: number; final: number; saved: number };

function priced(base: number, discount: number): Price {
  const final = cents(base * (1 - discount));
  return { base: cents(base), final, saved: cents(base - final) };
}

export function packPrice(pack: CreditPack, discount = 0): Price {
  return priced(pack.price, discount);
}

export function customPrice(credits: number, discount = 0): Price {
  return priced(Math.max(0, Math.trunc(credits)) * CUSTOM_RATE, discount);
}

/** Why a typed custom amount can't be bought; null when it can. */
export function customAmountError(credits: number): string | null {
  if (!Number.isFinite(credits) || credits <= 0) return `Enter at least ${CUSTOM_MIN} credits`;
  if (!Number.isInteger(credits)) return "Enter a whole number of credits";
  if (credits < CUSTOM_MIN) return `Enter at least ${CUSTOM_MIN} credits`;
  if (credits > CUSTOM_MAX) return `Enter at most ${CUSTOM_MAX.toLocaleString("en-US")} credits`;
  return null;
}

/** A pack that gives at least `credits` for no more than the custom price —
 *  the cheapest such pack ("Better deal available"), or null. */
export function betterDeal(credits: number, discount = 0): CreditPack | null {
  if (customAmountError(credits)) return null;
  const custom = customPrice(credits, discount).final;
  const fits = CREDIT_PACKS.filter((p) => p.base + p.bonus >= credits && packPrice(p, discount).final <= custom);
  if (!fits.length) return null;
  return fits.reduce((a, b) => (packPrice(b, discount).final < packPrice(a, discount).final ? b : a));
}

/** The smallest pack that covers `short` credits; the largest when none does. */
export function packCovering(short: number): CreditPack {
  return CREDIT_PACKS.find((p) => p.base + p.bonus >= short) ?? CREDIT_PACKS[CREDIT_PACKS.length - 1];
}

/** "$10.00" */
export function usd(n: number): string {
  return `$${cents(n).toFixed(2)}`;
}

/** What a dollar price costs in a coin: USDT one for one, IDZ at the demo rate. */
export function coinAmount(dollars: number, coin: "USDT" | "IDZ"): number {
  return cents(coin === "IDZ" ? dollars * IDZ_PER_USD : dollars);
}

/** The day `months` calendar months after `ts` (the 31st clamps to the month's last day). */
export function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.getTime();
}
