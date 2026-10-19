// The demo IDZ presale (spec 2026-10-19-balance-buy-idz-design.md; Figma
// User Panel V2 › Balance → Buy IDEEZA Coin 41571:113536). Its config — one
// round at the one IDZ price, a real end that never resets, the next price,
// the release time, the whitelist, the demo rate for test ETH — and the
// rules the buy form and the claim keep: the two-way quote, Max, the gas
// reserve, the field errors, and the wallet requests that pay and claim.
//
// Every sum runs in bigint micros (`money.ts`); nothing touches a chain.
//
// Pure, relative imports only.

import type { Network, Token } from "../brief/types";
import { estimateGas } from "../commerce/gas";
import { demoAddress, makerId } from "./demo-wallet";
import { IDZ_USD_PRICE } from "./idz-price";
import { compareAmounts, formatAmount, fromMicros, subAmounts, toMicros } from "./money";
import type { Purchase } from "./presale-records";
import type { AccountIndex, Amount, ChargeLine, WalletRequest } from "./types";

/** Balance › Buy IDZ Token, and the same page with the presale open. */
export const BUY_IDZ_HREF = "/balance/buy";
export const BUY_IDZ_NOW_HREF = "/balance/buy?buy=1";

export type PayCoin = "ETH" | "USDT" | "USDC";

/** C6: what the presale takes, all on its own network. */
export const PAY_COINS: readonly PayCoin[] = ["ETH", "USDT", "USDC"];

const MINUTE = 60_000;

/** The demo config — change a value here and every screen follows. */
export const PRESALE = {
  /** The presale's chain: the demo stand-in for the Figma's "Ethereum". */
  network: "baseSepolia" as Network,
  round: "Round 1",
  /** US dollars per IDZ: the one IDZ price (D5). */
  price: IDZ_USD_PRICE,
  /** The price the next round opens at (D8: written beside the countdown). */
  nextPrice: "0.03",
  /** The round's end, 31 Dec 2026 at 11:59:59 PM in Bangladesh (UTC+6): the countdown runs to
   *  it and never resets. */
  endsAt: Date.UTC(2026, 11, 31, 17, 59, 59),
  /** Bought IDZ unlocks this long after its purchase confirms, then it is claimed. */
  lockMs: 2 * MINUTE,
  /** A demo reference rate for test ETH, in US dollars — test ETH has no market. */
  ethUsd: "2500",
  /** C7: the demo accounts on the whitelist, and the share off their price. */
  whitelist: { accounts: [2] as readonly AccountIndex[], percentOff: 10 },
} as const;

/** "2 minutes" — the release time, in words. */
export const LOCK_WORDS = `${PRESALE.lockMs / MINUTE} minute${PRESALE.lockMs === MINUTE ? "" : "s"}`;

// ── bigint helpers ──────────────────────────────────────────────────────

const ZERO = BigInt(0);
const ONE = BigInt(1);
const MICROS = BigInt(1_000_000);

function micros(a: Amount): bigint {
  return toMicros(a) ?? ZERO;
}

function ceilDiv(a: bigint, b: bigint): bigint {
  return a === ZERO ? ZERO : (a - ONE) / b + ONE;
}

// ── price ───────────────────────────────────────────────────────────────

/** US dollars per coin: test ETH at the demo rate, USDT and USDC one for one. */
export function coinRateOf(coin: PayCoin): Amount {
  return coin === "ETH" ? PRESALE.ethUsd : "1";
}

/** The price this address pays: the round's, or the whitelist's (rounded down to the micro-dollar). */
export function presalePriceOf(address: string): { price: Amount; whitelisted: boolean } {
  const whitelisted = PRESALE.whitelist.accounts.some((n) => demoAddress(makerId(n)) === address);
  if (!whitelisted) return { price: PRESALE.price, whitelisted };
  const off = BigInt(100 - PRESALE.whitelist.percentOff);
  return { price: fromMicros((micros(PRESALE.price) * off) / BigInt(100)), whitelisted };
}

/** What `idz` costs in `coin`, rounded up to 0.000001 so the presale is never short. Null: not an amount. */
export function quotePayOf(idz: Amount, coin: PayCoin, price: Amount): Amount | null {
  const units = toMicros(idz);
  if (units === null) return null;
  return fromMicros(ceilDiv(units * micros(price), micros(coinRateOf(coin))));
}

/** How much IDZ `pay` buys, rounded down, so it never gives more than was paid for. Null: not an amount. */
export function quoteIdzOf(pay: Amount, coin: PayCoin, price: Amount): Amount | null {
  const units = toMicros(pay);
  const p = micros(price);
  if (units === null || p === ZERO) return null;
  return fromMicros((units * micros(coinRateOf(coin))) / p);
}

/** What `pay` is worth in US dollars at its coin's rate. */
export function worthUsdOf(pay: Amount, coin: PayCoin): Amount {
  return fromMicros((micros(pay) * micros(coinRateOf(coin))) / MICROS);
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$0.85", "$12,553,103.33": to the cent, half up. */
export function formatUsd(a: Amount): string {
  const cents = (micros(a) + BigInt(5_000)) / BigInt(10_000);
  return USD.format(Number(cents) / 100);
}

/** "$0.025065", "$2,500" — a price keeps all its digits, its whole part grouped. */
export function formatPrice(a: Amount): string {
  return `$${formatAmount(a, "IDZ").replace(/ IDZ$/, "")}`;
}

// ── the round ───────────────────────────────────────────────────────────

export function presaleOpenAt(now: number): boolean {
  return now < PRESALE.endsAt;
}

export type Countdown = { days: number; hours: number; minutes: number; seconds: number };

/** Whole days, hours, minutes and seconds in `ms`; never below zero. */
export function countdownOf(ms: number): Countdown {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor(total / 3_600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}

/** The purchase table's pill, in the two largest units: "Claim in 1 m 58 s", "Claim in 2 h 10 m". */
export function claimInOf(ms: number): string {
  const c = countdownOf(Math.ceil(Math.max(0, ms) / 1000) * 1000);
  if (c.days) return `Claim in ${c.days} d ${c.hours} h`;
  if (c.hours) return `Claim in ${c.hours} h ${c.minutes} m`;
  if (c.minutes) return `Claim in ${c.minutes} m ${c.seconds} s`;
  return `Claim in ${c.seconds} s`;
}

// ── gas and Max ─────────────────────────────────────────────────────────

/** C5b: test ETH kept back for gas — the network fee twice, for this purchase and its claim. */
export function gasReserveOf(network: Network): { coin: Token; amount: Amount } {
  const gas = estimateGas(network);
  return { coin: gas.native, amount: fromMicros(micros(String(gas.fee)) * BigInt(2)) };
}

/** What can be paid at most: the balance less the gas reserve for ETH, the token balance for the others. */
export function maxPayOf(coin: PayCoin, have: { coin: Amount; gas: Amount }): Amount {
  if (coin !== gasReserveOf(PRESALE.network).coin) return fromMicros(micros(have.coin));
  const left = subAmounts(have.coin, gasReserveOf(PRESALE.network).amount);
  return compareAmounts(left, "0") > 0 ? left : "0";
}

// ── the checks ──────────────────────────────────────────────────────────

/** Which field the buyer typed in last; the other one is the quote. */
export type BuyDraft = { driver: "get" | "pay"; text: string; coin: PayCoin };

export type BuyCheck = {
  idz: Amount | null;
  pay: Amount | null;
  /** "form": the round itself is closed. */
  error: { field: "get" | "pay" | "form"; text: string } | null;
};

/**
 * The buy form, read: the typed field, its quote, and the first thing that
 * stops the purchase, under the field it belongs to. `have.coin` is the
 * chosen coin's balance on the presale network; `have.gas` the gas coin's.
 */
export function buyCheckOf(d: BuyDraft, c: { price: Amount; have: { coin: Amount; gas: Amount }; now: number }): BuyCheck {
  const text = d.text.trim();
  const typed = text === "" ? null : toMicros(text);
  const idz = d.driver === "get" ? (typed === null ? null : fromMicros(typed)) : typed === null ? null : quoteIdzOf(text, d.coin, c.price);
  const pay = d.driver === "pay" ? (typed === null ? null : fromMicros(typed)) : typed === null ? null : quotePayOf(text, d.coin, c.price);
  const fail = (field: "get" | "pay" | "form", t: string): BuyCheck => ({ idz, pay, error: { field, text: t } });

  if (!presaleOpenAt(c.now)) return fail("form", `${PRESALE.round} has ended. Nothing can be bought until the next round opens.`);
  if (text === "") return fail(d.driver, d.driver === "get" ? "Enter how many IDZ you want." : `Enter how much ${d.coin} you want to pay.`);
  if (typed === null) return fail(d.driver, "Use digits only, with up to 6 decimals.");
  if (typed === ZERO) return fail(d.driver, "Enter more than 0.");
  if (!idz || compareAmounts(idz, "0") <= 0) return fail(d.driver, "That buys less than 0.000001 IDZ — enter more.");
  if (!pay || compareAmounts(pay, "0") <= 0) return fail(d.driver, "Enter more than 0.");

  const reserve = gasReserveOf(PRESALE.network);
  const coinIsGas = d.coin === reserve.coin;
  if (compareAmounts(pay, c.have.coin) > 0) {
    return fail("pay", `Not enough test ${d.coin} — you have ${formatAmount(c.have.coin, d.coin)}.`);
  }
  if (coinIsGas && compareAmounts(pay, maxPayOf(d.coin, c.have)) > 0) {
    return fail("pay", `Keep ${formatAmount(reserve.amount, reserve.coin)} for gas — you can pay at most ${formatAmount(maxPayOf(d.coin, c.have), d.coin)}.`);
  }
  if (!coinIsGas && compareAmounts(c.have.gas, reserve.amount) < 0) {
    return fail(
      "pay",
      `Not enough test ${reserve.coin} for gas — you have ${formatAmount(c.have.gas, reserve.coin)}, this needs ${formatAmount(reserve.amount, reserve.coin)}.`,
    );
  }
  return { idz, pay, error: null };
}

// ── the wallet requests ─────────────────────────────────────────────────

const RISK = "IDZ can lose value; this isn't investment advice.";

/** C8: the release rule, in one line. */
export const RELEASE_LINE = `Bought IDZ unlocks ${LOCK_WORDS} after the purchase confirms. Then you claim it on Balance › Buy IDZ Token.`;

/** Paying for IDZ: the coin and the purchase's gas, on the presale network. Its review is N5. */
export function buyRequestOf(o: { idz: Amount; pay: Amount; coin: PayCoin; price: Amount; whitelisted: boolean }): WalletRequest {
  const gas = estimateGas(PRESALE.network);
  const paid: ChargeLine = { coin: o.coin, amount: o.pay };
  const priceLine = `1 IDZ = ${formatPrice(o.price)}${o.whitelisted ? ` · whitelist −${PRESALE.whitelist.percentOff}%` : ""}`;
  const usd = worthUsdOf(o.pay, o.coin);
  return {
    kind: "transaction",
    purpose: "buyIdz",
    identity: "maker",
    network: PRESALE.network,
    title: "Buy IDZ in the presale",
    summary: [
      { label: "You get", value: formatAmount(o.idz, "IDZ") },
      { label: "Price", value: priceLine },
      { label: "Worth", value: `${formatUsd(usd)} (demo)` },
      { label: "Claim", value: `From ${LOCK_WORDS} after it confirms` },
    ],
    note: `Testnet demo — no real money moves. ${RISK}`,
    doneLine: `${formatAmount(o.idz, "IDZ")} bought. You can claim it in ${LOCK_WORDS}.`,
    // The gas first: `chargeRowsOf` names the first line that matches the fee as the fee.
    charge: { network: PRESALE.network, lines: [{ coin: gas.native, amount: String(gas.fee) }, paid] },
    presale: { idz: o.idz, paid, usd, price: o.price, round: PRESALE.round, whitelisted: o.whitelisted, lockMs: PRESALE.lockMs },
  };
}

/** Claiming an unlocked purchase: the claim's gas, signed by the account that bought it. */
export function claimRequestOf(p: Purchase): WalletRequest {
  const gas = estimateGas(p.network);
  const account = Number(p.identity.slice("maker-".length)) as AccountIndex;
  return {
    kind: "transaction",
    purpose: "claimIdz",
    identity: "maker",
    account,
    network: p.network,
    title: "Claim presale IDZ",
    summary: [
      { label: "You claim", value: formatAmount(p.buy.idz, "IDZ") },
      { label: "From", value: `Presale ${p.buy.round}` },
    ],
    note: "Testnet demo — no real money moves. The IDZ moves into your available balance.",
    doneLine: `${formatAmount(p.buy.idz, "IDZ")} added to your balance.`,
    charge: { network: p.network, lines: [{ coin: gas.native, amount: String(gas.fee) }] },
    claims: p.id,
  };
}
