// Money (Phase 2 spec §3.1, §3.5.1). Every amount, IDZ included, is bigint
// micros inside a sum: 1 unit = 1,000,000 micros. It is stored and passed around as
// an `Amount`, a decimal string of units ("0.05"), and parsed back with
// `toMicros`. No float arithmetic anywhere, so 0.05 + 0.021 is exactly 0.071.
//
// Pure, relative imports only (node:test loads the compiled file).

import type { Amount, Coin } from "./types";

// BigInt(), not `n` literals: the app compiles to ES2017, which has no bigint literal syntax.
const ZERO = BigInt(0);
export const MICROS_PER_UNIT = BigInt(1_000_000);
/** Decimal places an `Amount` may carry. */
export const AMOUNT_DECIMALS = 6;

const TYPED = /^(\d*)(?:\.(\d*))?$/;

/**
 * A typed amount in micros: digits and at most one dot, at most 6 decimals
 * ("5", "0.05", ".5", "5."). Surrounding whitespace is ignored. A sign, a
 * seventh decimal, an exponent or no digit at all → null. Zero is a valid
 * amount here; "> 0" is the caller's rule.
 */
export function toMicros(s: string): bigint | null {
  if (typeof s !== "string") return null;
  const m = TYPED.exec(s.trim());
  if (!m) return null;
  const whole = m[1] ?? "";
  const frac = m[2] ?? "";
  if (!whole && !frac) return null;
  if (frac.length > AMOUNT_DECIMALS) return null;
  return BigInt(whole || "0") * MICROS_PER_UNIT + BigInt((frac + "000000").slice(0, AMOUNT_DECIMALS));
}

/** Micros back to units, with no trailing zeros: 71000 → "0.071", 4000000 → "4", -500000 → "-0.5". */
export function fromMicros(n: bigint): Amount {
  const negative = n < ZERO;
  const abs = negative ? -n : n;
  const whole = abs / MICROS_PER_UNIT;
  const frac = (abs % MICROS_PER_UNIT).toString().padStart(AMOUNT_DECIMALS, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** An amount in its one written form ("0.050" → "0.05", " 4 " → "4"), or null when it doesn't parse. */
export function normalizeAmount(a: string): Amount | null {
  const micros = toMicros(a);
  return micros === null ? null : fromMicros(micros);
}

/**
 * The micros of an amount this module produced, which may be negative (a
 * difference). An amount that doesn't parse reads as 0: stored amounts are
 * normalized when their store is read, and a render must never throw.
 */
function micros(a: Amount): bigint {
  if (typeof a !== "string") return ZERO;
  const t = a.trim();
  const negative = t.startsWith("-");
  const n = toMicros(negative ? t.slice(1) : t);
  if (n === null) return ZERO;
  return negative ? -n : n;
}

/** "0.05 MATIC" · "4 IDZ". The amount is written in its normal form when it parses. */
export function formatAmount(a: Amount, coin: Coin): string {
  const t = typeof a === "string" ? a.trim() : "";
  const negative = t.startsWith("-");
  const n = toMicros(negative ? t.slice(1) : t);
  const shown = n === null ? t : fromMicros(negative ? -n : n);
  return `${shown} ${coin}`;
}

/** The sum, in bigint: addAmounts("0.05", "0.021") = "0.071". */
export function addAmounts(...amounts: Amount[]): Amount {
  return fromMicros(amounts.reduce((sum, a) => sum + micros(a), ZERO));
}

/** a − b, in bigint. It may be negative ("-0.5"). */
export function subAmounts(a: Amount, b: Amount): Amount {
  return fromMicros(micros(a) - micros(b));
}

/** -1 when a < b, 0 when equal, 1 when a > b. */
export function compareAmounts(a: Amount, b: Amount): -1 | 0 | 1 {
  const d = micros(a) - micros(b);
  return d < ZERO ? -1 : d > ZERO ? 1 : 0;
}
