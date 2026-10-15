// The checkout's address (User Panel V2 › Payment details 41549:165658):
// /settings/plan/checkout with what is being bought in the query —
// ?plan=builder&cycle=monthly, ?pack=pro, or ?credits=80. A link or a refresh
// lands on the same order; anything else reads as nothing to buy.
//
// Pure, relative imports only.

import { CREDIT_PACKS, customAmountError, type BillingCycle, type PackId } from "./credit-pricing";
import { PLANS, type PlanTier } from "./plans";

export const CHECKOUT_PATH = "/settings/plan/checkout";

export type CheckoutOrder =
  | { kind: "plan"; tier: PlanTier; cycle: BillingCycle }
  | { kind: "pack"; id: PackId }
  | { kind: "custom"; credits: number };

export function checkoutHref(order: CheckoutOrder): string {
  if (order.kind === "plan") return `${CHECKOUT_PATH}?plan=${order.tier}&cycle=${order.cycle}`;
  if (order.kind === "pack") return `${CHECKOUT_PATH}?pack=${order.id}`;
  return `${CHECKOUT_PATH}?credits=${order.credits}`;
}

/** The order a query names; null when it names none, or one that can't be bought. */
export function checkoutOrderOf(get: (key: string) => string | null): CheckoutOrder | null {
  const plan = get("plan");
  if (plan !== null) {
    const tier = PLANS.find((p) => p.tier === plan && p.monthly > 0)?.tier;
    const cycle = get("cycle") === "yearly" ? "yearly" : get("cycle") === "monthly" || get("cycle") === null ? "monthly" : null;
    return tier && cycle ? { kind: "plan", tier, cycle } : null;
  }
  const pack = get("pack");
  if (pack !== null) {
    const found = CREDIT_PACKS.find((p) => p.id === pack);
    return found ? { kind: "pack", id: found.id } : null;
  }
  const credits = get("credits");
  if (credits !== null && /^\d+$/.test(credits)) {
    const n = Number(credits);
    return customAmountError(n) === null ? { kind: "custom", credits: n } : null;
  }
  return null;
}
