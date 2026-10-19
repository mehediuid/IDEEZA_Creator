// Get Paid (Settings spec §5.5, decision D3): one earnings balance for the
// whole account, withdrawn only in Settings › Get Paid. This file is its
// record and its arithmetic.
//
// The record, `ideeza:account:payout` (v1): withdrawal methods (a crypto
// wallet address is the one kind that works; bank, Payoneer and PayPal are
// not available yet) with one default, the "Get paid in" token (D14), tax
// residence, tax identification (only the last four digits of a TIN are ever
// kept), and every withdrawal. A per-project payout request from before Get
// Paid (`ideeza:commerce:payouts`) reads as a pending withdrawal, so nothing a
// maker asked for disappears.
//
// The balance is derived, never stored: every sale of your projects pays you
// your share (a share of the project you sold is all yours; a copy sale is
// split by who held the project when it sold: co-owners and buyers of a
// share take theirs), net of IDEEZA's 2.5 % fee, less every withdrawal.
// Sales are in test coins, so dollars come from fixed demo rates: dollar
// coins and IDZ one for one, test ETH and MATIC at the rates below. Nothing
// here is a market price; the page says so.
//
// Pure apart from the guarded localStorage read and write; relative imports
// only (node:test).

import type { Sale } from "../market/types";
import { addAmounts, compareAmounts, fromMicros, subAmounts, toMicros } from "../wallet/money";
import type { Amount, Coin } from "../wallet/types";

export const PAYOUT_KEY = "ideeza:account:payout";

export type PayoutToken = "USDT" | "IDZ";
export const PAYOUT_TOKENS: readonly PayoutToken[] = ["USDT", "IDZ"];

export type WithdrawalStatus = "complete" | "in-progress" | "pending";
export const WITHDRAWAL_STATUSES: readonly WithdrawalStatus[] = ["complete", "in-progress", "pending"];
export const STATUS_WORD: Record<WithdrawalStatus, string> = {
  complete: "Complete",
  "in-progress": "In Progress",
  pending: "Pending",
};

export type WithdrawalMethod = { id: string; kind: "crypto"; address: string; label: string; addedAt: number };

export type TaxResidence = { country: string; city: string; address: string; postalCode: string };
export type TaxClassification = "individual" | "business";
export type TinType = "ssn" | "ein";
export type TaxIdentification = {
  usPerson: boolean;
  legalName: string;
  classification: TaxClassification;
  tinType: TinType | null;
  tinLast4: string | null;
  savedAt: number;
};

export type Withdrawal = {
  id: string;
  /** US dollars, exact. */
  amount: Amount;
  token: PayoutToken;
  methodId: string | null;
  /** Where it went, kept as it was: a method removed later still reads right in the history. */
  to: { label: string; address: string | null };
  at: number;
  status: WithdrawalStatus;
  /** The demo wallet's signature that confirmed it. */
  signature?: string;
  /** Folded in from a project's "Request payout" before Get Paid. */
  legacy?: true;
};

export type PayoutStore = {
  v: 1;
  methods: WithdrawalMethod[];
  defaultMethodId: string | null;
  getPaidIn: PayoutToken;
  taxResidence: TaxResidence | null;
  taxIdentification: TaxIdentification | null;
  withdrawals: Withdrawal[];
};

export const EMPTY_PAYOUT: PayoutStore = {
  v: 1,
  methods: [],
  defaultMethodId: null,
  getPaidIn: "USDT",
  taxResidence: null,
  taxIdentification: null,
  withdrawals: [],
};

export const METHODS_MAX = 10;
export const METHOD_LABEL_MAX = 40;
export const DEFAULT_METHOD_LABEL = "Crypto wallet";
export const TAX_FIELD_MAX = 120;
export const LEGAL_NAME_MAX = 80;

// ───────────────────────── normalizing ─────────────────────────

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const str = (v: unknown, max = TAX_FIELD_MAX) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const time = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** `0x` and 40 hex digits: an EVM address, which any wallet (a receive-only one too) has. */
export function isWalletAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s);
}

function normalizeMethod(raw: unknown): WithdrawalMethod | null {
  if (!isDict(raw) || raw.kind !== "crypto" || typeof raw.id !== "string" || !raw.id) return null;
  const address = typeof raw.address === "string" ? raw.address : "";
  const addedAt = time(raw.addedAt);
  if (!isWalletAddress(address) || addedAt === null) return null;
  return { id: raw.id, kind: "crypto", address, label: str(raw.label, METHOD_LABEL_MAX) || DEFAULT_METHOD_LABEL, addedAt };
}

function normalizeResidence(raw: unknown): TaxResidence | null {
  if (!isDict(raw)) return null;
  const r = { country: str(raw.country, 2).toUpperCase(), city: str(raw.city), address: str(raw.address), postalCode: str(raw.postalCode, 20) };
  return Object.keys(taxResidenceProblems(r)).length ? null : r;
}

function normalizeIdentification(raw: unknown): TaxIdentification | null {
  if (!isDict(raw) || typeof raw.usPerson !== "boolean") return null;
  const legalName = str(raw.legalName, LEGAL_NAME_MAX);
  const classification = raw.classification === "business" ? "business" : raw.classification === "individual" ? "individual" : null;
  const savedAt = time(raw.savedAt);
  if (!legalName || !classification || savedAt === null) return null;
  if (!raw.usPerson) return { usPerson: false, legalName, classification, tinType: null, tinLast4: null, savedAt };
  const tinType = raw.tinType === "ssn" || raw.tinType === "ein" ? raw.tinType : null;
  const tinLast4 = typeof raw.tinLast4 === "string" && /^\d{4}$/.test(raw.tinLast4) ? raw.tinLast4 : null;
  if (!tinType || !tinLast4) return null;
  return { usPerson: true, legalName, classification, tinType, tinLast4, savedAt };
}

function normalizeWithdrawal(raw: unknown): Withdrawal | null {
  if (!isDict(raw) || typeof raw.id !== "string" || !raw.id) return null;
  const amount = typeof raw.amount === "string" ? toMicros(raw.amount) : null;
  const token = raw.token === "USDT" || raw.token === "IDZ" ? raw.token : null;
  const status = WITHDRAWAL_STATUSES.find((s) => s === raw.status) ?? null;
  const at = time(raw.at);
  const to = isDict(raw.to) ? raw.to : null;
  if (amount === null || amount <= BigInt(0) || !token || !status || at === null || !to) return null;
  const w: Withdrawal = {
    id: raw.id,
    amount: fromMicros(amount),
    token,
    methodId: typeof raw.methodId === "string" ? raw.methodId : null,
    to: { label: str(to.label, METHOD_LABEL_MAX) || DEFAULT_METHOD_LABEL, address: typeof to.address === "string" ? to.address : null },
    at,
    status,
  };
  if (typeof raw.signature === "string") w.signature = raw.signature;
  if (raw.legacy === true) w.legacy = true;
  return w;
}

/** The stored record; anything broken falls back per field, and a bad row is dropped alone. */
export function normalizePayout(raw: unknown): PayoutStore {
  if (!isDict(raw) || raw.v !== 1) return EMPTY_PAYOUT;
  const methods = (Array.isArray(raw.methods) ? raw.methods : [])
    .map(normalizeMethod)
    .filter((m): m is WithdrawalMethod => m !== null)
    .slice(0, METHODS_MAX);
  const named = methods.find((m) => m.id === raw.defaultMethodId);
  return {
    v: 1,
    methods,
    defaultMethodId: named ? named.id : (methods[0]?.id ?? null),
    getPaidIn: raw.getPaidIn === "IDZ" ? "IDZ" : "USDT",
    taxResidence: normalizeResidence(raw.taxResidence),
    taxIdentification: normalizeIdentification(raw.taxIdentification),
    withdrawals: (Array.isArray(raw.withdrawals) ? raw.withdrawals : []).map(normalizeWithdrawal).filter((w): w is Withdrawal => w !== null),
  };
}

export function parsePayout(raw: string | null): PayoutStore {
  if (!raw) return EMPTY_PAYOUT;
  try {
    return normalizePayout(JSON.parse(raw));
  } catch {
    return EMPTY_PAYOUT;
  }
}

// ───────────────────────── methods ─────────────────────────

export type AddMethodResult = { ok: true; store: PayoutStore; method: WithdrawalMethod } | { ok: false; problem: "address" | "duplicate" | "full" };

/** A crypto wallet by its address. The first one is the default. */
export function addMethod(store: PayoutStore, input: { address: string; label: string }, at: number, id: string): AddMethodResult {
  const address = input.address.trim();
  if (!isWalletAddress(address)) return { ok: false, problem: "address" };
  if (store.methods.some((m) => m.address.toLowerCase() === address.toLowerCase())) return { ok: false, problem: "duplicate" };
  if (store.methods.length >= METHODS_MAX) return { ok: false, problem: "full" };
  const method: WithdrawalMethod = { id, kind: "crypto", address, label: input.label.trim().slice(0, METHOD_LABEL_MAX) || DEFAULT_METHOD_LABEL, addedAt: at };
  return { ok: true, method, store: { ...store, methods: [...store.methods, method], defaultMethodId: store.defaultMethodId ?? id } };
}

/** The default moves to the first method left, if any. */
export function removeMethod(store: PayoutStore, id: string): PayoutStore {
  const methods = store.methods.filter((m) => m.id !== id);
  if (methods.length === store.methods.length) return store;
  const defaultMethodId = store.defaultMethodId === id ? (methods[0]?.id ?? null) : store.defaultMethodId;
  return { ...store, methods, defaultMethodId };
}

export function makeDefault(store: PayoutStore, id: string): PayoutStore {
  if (!store.methods.some((m) => m.id === id) || store.defaultMethodId === id) return store;
  return { ...store, defaultMethodId: id };
}

export function defaultMethodOf(store: PayoutStore): WithdrawalMethod | null {
  return store.methods.find((m) => m.id === store.defaultMethodId) ?? null;
}

// ───────────────────────── tax ─────────────────────────

export function taxResidenceProblems(r: TaxResidence): Partial<Record<keyof TaxResidence, string>> {
  const out: Partial<Record<keyof TaxResidence, string>> = {};
  if (!r.country.trim()) out.country = "Choose your country.";
  if (!r.city.trim()) out.city = "Enter your city.";
  if (!r.address.trim()) out.address = "Enter your address.";
  if (!r.postalCode.trim()) out.postalCode = "Enter your postal code.";
  return out;
}

const TIN_NAME: Record<TinType, string> = { ssn: "SSN", ein: "EIN" };

/** An SSN or EIN as typed: nine digits, dashes and spaces allowed. */
export function tinProblem(typed: string, type: TinType): string | null {
  const t = typed.replace(/[\s-]/g, "");
  if (!t) return `Enter your ${TIN_NAME[type]}.`;
  if (!/^\d+$/.test(t)) return "Use digits only.";
  if (t.length !== 9) return `Enter all 9 digits of your ${TIN_NAME[type]}.`;
  return null;
}

/** What is stored from the form: a US person's TIN as its last four digits, nothing more. */
export function taxIdentificationOf(
  form: { usPerson: boolean; legalName: string; classification: TaxClassification; tinType: TinType; tin: string },
  at: number,
): TaxIdentification {
  const legalName = form.legalName.trim().slice(0, LEGAL_NAME_MAX);
  if (!form.usPerson) return { usPerson: false, legalName, classification: form.classification, tinType: null, tinLast4: null, savedAt: at };
  const digits = form.tin.replace(/\D/g, "");
  return { usPerson: true, legalName, classification: form.classification, tinType: form.tinType, tinLast4: digits.slice(-4), savedAt: at };
}

// ───────────────────────── dollars ─────────────────────────

/**
 * Dollars per coin, fixed, for the demo: test coins have no market price, so a
 * balance across sales in different coins needs a stated rate. Dollar coins
 * and IDZ (the demo rate Plan & pricing uses) are one for one; test ETH is the
 * rate the design's mint cost was drawn at (0.00104 ETH ≈ $3.90).
 */
export const DEMO_USD_RATES: Record<Coin, Amount> = {
  USDT: "1",
  USDC: "1",
  IDZ: "1",
  ETH: "3750",
  WETH: "3750",
  MATIC: "0.5",
};

const ZERO = BigInt(0);
const MICROS = BigInt(1_000_000);
const CENT = BigInt(10_000);
const micros = (a: Amount) => {
  const t = typeof a === "string" ? a.trim() : "";
  const neg = t.startsWith("-");
  const n = toMicros(neg ? t.slice(1) : t) ?? ZERO;
  return neg ? -n : n;
};

/** An amount of a coin in dollars at the demo rate, exact to the micro (floored). */
export function usdOf(amount: Amount, coin: Coin): Amount {
  return fromMicros((micros(amount) * micros(DEMO_USD_RATES[coin])) / MICROS);
}

/** Floored to the cent: what can be shown and withdrawn. */
export function centsFloor(a: Amount): Amount {
  const m = micros(a);
  const floored = m >= ZERO ? (m / CENT) * CENT : -((-m + CENT - BigInt(1)) / CENT) * CENT;
  return fromMicros(floored);
}

/** "$1,234.56", floored to the cent. */
export function formatUsd(a: Amount): string {
  const m = micros(centsFloor(a));
  const neg = m < ZERO;
  const cents = (neg ? -m : m) / CENT;
  const whole = (cents / BigInt(100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (cents % BigInt(100)).toString().padStart(2, "0");
  return `${neg ? "-" : ""}$${whole}.${frac}`;
}

// ───────────────────────── earnings ─────────────────────────

/** A project as the ledger reads it: its name and who else holds a part of it. */
export type ShareProject = {
  id: string;
  name: string;
  contributors: readonly { role: string; share: number; addedAt: number }[];
};

export type EarningSale = Pick<Sale, "id" | "projectId" | "at" | "item" | "token" | "price" | "fees" | "payout">;

export type Earning = {
  saleId: string;
  projectId: string;
  projectName: string;
  at: number;
  /** "Main NFT · 10% of the project" · "Virtual copy #3 · Rover" */
  what: string;
  token: Coin;
  /** Your share of this sale, 0–100. */
  sharePct: number;
  gross: Amount;
  fee: Amount;
  net: Amount;
  grossUsd: Amount;
  feeUsd: Amount;
  netUsd: Amount;
};

/**
 * Your part of one sale, in percent. A Main sale sells a share of the project
 * out of your own holding, so it is all yours. A copy sale is split by who
 * held the project when it sold: co-owners added by then and the shares
 * sold before it take theirs; you keep the rest (never below 0).
 */
export function shareOfSale(sale: EarningSale, project: ShareProject, projectSales: readonly EarningSale[]): number {
  if (sale.item.nft === "main") return 100;
  const coOwners = project.contributors
    .filter((c) => c.role === "coOwner" && c.share > 0 && c.addedAt <= sale.at)
    .reduce((sum, c) => sum + c.share, 0);
  const sold = projectSales
    .filter((s) => s.projectId === sale.projectId && s.item.nft === "main" && s.at < sale.at)
    .reduce((sum, s) => sum + (s.item.nft === "main" ? s.item.sharePct : 0), 0);
  return Math.max(0, Math.min(100, 100 - coOwners - sold));
}

/** `pct` of an amount, floored to the micro. */
function partOf(a: Amount, pct: number): Amount {
  if (pct >= 100) return fromMicros(micros(a));
  return fromMicros((micros(a) * BigInt(Math.round(pct * 100))) / BigInt(10_000));
}

function whatOf(item: EarningSale["item"]): string {
  if (item.nft === "main") return `Main NFT · ${item.sharePct}% of the project`;
  return `${item.nft === "physical" ? "Physical" : "Virtual"} copy #${item.serial} · ${item.productName}`;
}

/** Every sale of these projects, your part of it, oldest first. */
export function earningsOf(sales: readonly EarningSale[], projects: readonly ShareProject[]): Earning[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  return sales
    .filter((s) => byId.has(s.projectId))
    .slice()
    .sort((a, b) => a.at - b.at)
    .map((s) => {
      const project = byId.get(s.projectId)!;
      const sharePct = shareOfSale(s, project, sales);
      const gross = partOf(s.price, sharePct);
      const fee = partOf(s.fees.ideeza, sharePct);
      const net = partOf(s.payout, sharePct);
      return {
        saleId: s.id,
        projectId: s.projectId,
        projectName: project.name,
        at: s.at,
        what: whatOf(s.item),
        token: s.token,
        sharePct,
        gross,
        fee,
        net,
        grossUsd: usdOf(gross, s.token),
        feeUsd: usdOf(fee, s.token),
        netUsd: usdOf(net, s.token),
      };
    });
}

export type Balance = { earned: Amount; withdrawn: Amount; available: Amount };

/** `earned` less every withdrawal, never below 0. */
export function subtractWithdrawn(earned: Amount, withdrawals: readonly Withdrawal[]): Amount {
  const left = subAmounts(earned, addAmounts("0", ...withdrawals.map((w) => w.amount)));
  return compareAmounts(left, "0") > 0 ? left : "0";
}

/** Earned less every withdrawal: a pending one is held until it's settled. Never below 0. */
export function balanceOf(earnings: readonly Earning[], withdrawals: readonly Withdrawal[]): Balance {
  const earned = addAmounts("0", ...earnings.map((e) => e.netUsd));
  const withdrawn = addAmounts("0", ...withdrawals.map((w) => w.amount));
  return { earned, withdrawn, available: subtractWithdrawn(earned, withdrawals) };
}

/** The full price of every sale of these projects, in dollars: the KYC levels' "total transactions". */
export function salesTotalUsdOf(sales: readonly Pick<Sale, "projectId" | "price" | "token">[], projectIds: readonly string[]): Amount {
  const mine = new Set(projectIds);
  return addAmounts("0", ...sales.filter((s) => mine.has(s.projectId)).map((s) => usdOf(s.price, s.token)));
}

// ───────────────────────── withdrawals ─────────────────────────

export function recordWithdrawal(store: PayoutStore, w: Withdrawal): PayoutStore {
  return { ...store, withdrawals: [...store.withdrawals, w] };
}

export function withdrawalStats(list: readonly Withdrawal[]): Record<WithdrawalStatus, Amount> {
  const sum = (s: WithdrawalStatus) => addAmounts("0", ...list.filter((w) => w.status === s).map((w) => w.amount));
  return { complete: sum("complete"), "in-progress": sum("in-progress"), pending: sum("pending") };
}

const pad = (n: number) => String(n).padStart(2, "0");
/** The local calendar day, "2026-10-19". */
export const dayOf = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export type WithdrawalFilter = { query?: string; status?: WithdrawalStatus | null; range?: { from: string; to: string } | null };

/** Newest first: a search over the reference, where it went and the amount; a status; a day range, both days in. */
export function filterWithdrawals(list: readonly Withdrawal[], f: WithdrawalFilter): Withdrawal[] {
  const q = (f.query ?? "").trim().toLowerCase();
  return list
    .filter((w) => !f.status || w.status === f.status)
    .filter((w) => {
      if (!f.range) return true;
      const day = dayOf(w.at);
      return day >= f.range.from && day <= f.range.to;
    })
    .filter((w) => !q || [w.id, w.to.label, w.to.address ?? "", w.amount, w.token].some((s) => s.toLowerCase().includes(q)))
    .slice()
    .sort((a, b) => b.at - a.at);
}

/** "Other amount": dollars and cents, more than nothing, no more than the balance. */
export function withdrawAmountProblem(typed: string, available: Amount): string | null {
  const t = typed.trim();
  if (!t) return "Enter an amount.";
  if (!/^\d*(\.\d{0,2})?$/.test(t) || t === ".") return "Use dollars and cents, like 12.50.";
  const m = toMicros(t);
  if (m === null) return "Use dollars and cents, like 12.50.";
  if (m <= ZERO) return "Enter more than $0.00.";
  if (m > micros(available)) return `That's more than your balance of ${formatUsd(available)}.`;
  return null;
}

// ───────────────────────── before Get Paid ─────────────────────────

/** A stored per-project request (lib/commerce/payout.ts), as much of it as is read here. */
export type LegacyRequest = { id: string; at: number; lines: readonly { token: Coin; amount: Amount }[] };

export const LEGACY_LABEL = "Requested in Earn";

/** Each old request as a pending withdrawal of what it asked, in dollars at the demo rates. */
export function legacyWithdrawalsOf(requests: readonly LegacyRequest[]): Withdrawal[] {
  return requests.map((r) => ({
    id: `legacy-${r.id}`,
    amount: addAmounts("0", ...r.lines.map((l) => usdOf(l.amount, l.token))),
    token: "USDT",
    methodId: null,
    to: { label: LEGACY_LABEL, address: null },
    at: r.at,
    status: "pending",
    legacy: true,
  }));
}

/** The record with every old request it doesn't hold yet; the same record when there is none. */
export function mergeLegacy(store: PayoutStore, requests: readonly LegacyRequest[]): PayoutStore {
  const have = new Set(store.withdrawals.map((w) => w.id));
  const add = legacyWithdrawalsOf(requests).filter((w) => !have.has(w.id) && compareAmounts(w.amount, "0") > 0);
  return add.length ? { ...store, withdrawals: [...store.withdrawals, ...add].sort((a, b) => a.at - b.at) } : store;
}

// ───────────────────────── statement ─────────────────────────

export type StatementPeriod = { year: number; month: number | null };

export function statementFileName(p: StatementPeriod): string {
  return `ideeza-statement-${p.year}${p.month ? `-${pad(p.month)}` : ""}.csv`;
}

/** This year back to the first year with a sale or a withdrawal, newest first. */
export function statementYears(earnings: readonly Earning[], withdrawals: readonly Withdrawal[], now: number): number[] {
  const last = new Date(now).getFullYear();
  let first = last;
  for (const t of [...earnings.map((e) => e.at), ...withdrawals.map((w) => w.at)]) first = Math.min(first, new Date(t).getFullYear());
  const out: number[] = [];
  for (let y = last; y >= first; y--) out.push(y);
  return out;
}

const inPeriod = (t: number, p: StatementPeriod) => {
  const d = new Date(t);
  return d.getFullYear() === p.year && (p.month === null || d.getMonth() + 1 === p.month);
};

const stampOf = (t: number) => {
  const d = new Date(t);
  return `${dayOf(t)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** A text cell: quoted when it must be, and never read as a formula by a spreadsheet. */
function cell(s: string): string {
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const neg = (a: Amount) => (compareAmounts(a, "0") === 0 ? "0" : `-${a}`);

/**
 * The period's statement as CSV (RFC 4180, CRLF): each sale (your share of
 * it), its IDEEZA fee, and each withdrawal, oldest first, in the coin and in
 * dollars at the demo rates.
 */
export function statementCsv(p: StatementPeriod, earnings: readonly Earning[], withdrawals: readonly Withdrawal[]): string {
  type Row = { at: number; order: number; cells: string[] };
  const rows: Row[] = [];
  for (const e of earnings) {
    if (!inPeriod(e.at, p)) continue;
    const project = cell(e.projectName);
    rows.push({ at: e.at, order: 0, cells: [stampOf(e.at), "Sale", project, cell(`${e.what} · your share ${e.sharePct}%`), e.gross, e.token, e.grossUsd, "", cell(e.saleId)] });
    rows.push({ at: e.at, order: 1, cells: [stampOf(e.at), "IDEEZA fee", project, "2.5% of the sale", neg(e.fee), e.token, neg(e.feeUsd), "", cell(e.saleId)] });
  }
  for (const w of withdrawals) {
    if (!inPeriod(w.at, p)) continue;
    const to = w.to.address ? `To ${w.to.label} (${w.to.address})` : w.to.label;
    rows.push({ at: w.at, order: 2, cells: [stampOf(w.at), "Withdrawal", "", cell(to), neg(w.amount), w.token, neg(w.amount), STATUS_WORD[w.status], cell(w.id)] });
  }
  rows.sort((a, b) => a.at - b.at || a.order - b.order);
  const header = "Date,Type,Project,Details,Amount,Token,Amount (USD),Status,Reference";
  return [header, ...rows.map((r) => r.cells.join(","))].join("\r\n");
}

// ───────────────────────── storage ─────────────────────────

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readRaw(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** `false`: the browser refused the write, and the prior record stands. */
export function writePayout(store: PayoutStore): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(PAYOUT_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}
