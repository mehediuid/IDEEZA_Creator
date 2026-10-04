// IDEEZA's fee on every marketplace sale (Phase 2 spec §3.5.2, owner
// decision 11, C10). The seller pays it out of the price; it is never added
// to what the buyer pays. It is floored to the micro, so any rounding falls
// in the creator's favour.
//
// Pure, relative imports only.

import { fromMicros, toMicros } from "../wallet/money";
import type { Amount } from "../wallet/types";

/** IDEEZA's cut of every marketplace sale, in basis points. Owner decision 11: 2.5 %, changeable here only. */
export const IDEEZA_FEE_BPS = 250;

// BigInt(), not `n` literals: the app compiles to ES2017.
const ZERO = BigInt(0);
const BPS_PER_WHOLE = BigInt(10_000);

/** A price that doesn't parse (or is negative) reads as 0, so its fee and payout are "0". */
function priceMicros(price: Amount): bigint {
  return toMicros(price) ?? ZERO;
}

/** Clamped to 0–10 000 bps (0–100 %), so a payout can never go negative. */
function bpsOf(bps: number): bigint {
  if (!Number.isFinite(bps) || bps <= 0) return ZERO;
  return BigInt(Math.min(10_000, Math.round(bps)));
}

/** The fee on `price`, floored to the micro: ideezaFeeOf("0.05") = "0.00125"; ideezaFeeOf("0.000001") = "0". */
export function ideezaFeeOf(price: Amount, bps = IDEEZA_FEE_BPS): Amount {
  return fromMicros((priceMicros(price) * bpsOf(bps)) / BPS_PER_WHOLE);
}

/** What the seller receives: price − fee. payoutOf("0.05") = "0.04875". */
export function payoutOf(price: Amount, bps = IDEEZA_FEE_BPS): Amount {
  const p = priceMicros(price);
  return fromMicros(p - (p * bpsOf(bps)) / BPS_PER_WHOLE);
}

/** "2.5%" at 250 bps, "5%" at 500, "1.25%" at 125 — written from integers, never a float. */
export function feePercentText(bps = IDEEZA_FEE_BPS): string {
  const n = Number(bpsOf(bps));
  const whole = Math.floor(n / 100);
  const frac = String(n % 100).padStart(2, "0").replace(/0+$/, "");
  return `${whole}${frac ? `.${frac}` : ""}%`;
}

/** "IDEEZA fee (2.5%)" */
export const FEE_LABEL: string = `IDEEZA fee (${feePercentText()})`;
