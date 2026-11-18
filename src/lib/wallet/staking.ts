// Staking (Earn Coin › Stake; mobile Figma "Stacking" 10702:227864). The web
// has no staking yet, so this is the demo's own, on the web's wallet: demo
// contracts on Base Sepolia, each with staking options (APR, lock-up, reward
// interval, grace time, wallet limit, the window it takes stakes in). A stake,
// a withdrawal and a reward claim are wallet transactions whose activity lines
// carry the IDZ (the stake's charge, the withdrawal's and the claim's credit),
// so `balancesOf`, the IDZ ledger and the holdings read them like any other
// line: one balance everywhere. Nothing else is stored, except the demo
// admin's paused / blocked contracts.
//
// Time runs fast: a staking day passes in a minute (`STAKE_DAY_MS`), so a
// lock-up ends, and its rewards unlock, while you watch. Each stake keeps the
// day length it was made with.
//
// Rules:
// - Rewards unlock once per reward interval, from the stake's start, up to the
//   lock-up's end: the option's APR over the lock-up, split evenly (the last
//   share takes the rounding). A withdrawal stops the shares not yet unlocked.
// - Withdraw is open in the grace time after staking (changed your mind) and
//   again once the lock-up ends; in between the stake is locked.
// - A paused contract keeps counting, but takes no stake, claim or withdrawal
//   until it resumes; a blocked one is frozen (Get support).
// - The wallet limit is per option and per wallet, over its stakes not yet
//   withdrawn.
//
// Pure, relative imports only.

import type { Network } from "../brief/types";
import { estimateGas } from "../commerce/gas";
import { demoHex } from "./demo-wallet";
import { addAmounts, compareAmounts, formatAmount, fromMicros, subAmounts, toMicros } from "./money";
import type { AccountIndex, Amount, DemoWallet, IdentityId, StakeRecord, WalletActivity, WalletRequest } from "./types";

/** A staking day in the demo: one minute. */
export const STAKE_DAY_MS = 60_000;

/** "Testnet demo: a staking day passes in a minute here." */
export const STAKE_TIME_LINE = "Testnet demo: a staking day passes in a minute here.";

const CHAIN_ID: Record<Network, number> = { baseSepolia: 84532, mumbai: 80002 };

export function chainIdOf(n: Network): number {
  return CHAIN_ID[n];
}

export type StakeOption = {
  id: string;
  name: string;
  /** Basis points a year: 3790 = 37.9 %. */
  aprBps: number;
  lockDays: number;
  intervalDays: number;
  graceDays: number;
  walletLimit: Amount;
  /** The window the option takes new stakes in. */
  startsAt: number;
  endsAt: number;
};

export type StakeContract = { id: string; name: string; address: string; network: Network; options: StakeOption[] };

export type ContractStatus = "active" | "paused" | "blocked";

const OPENS = Date.UTC(2026, 9, 1);
/** The presale round's end: the options take stakes until then. */
const CLOSES = Date.UTC(2026, 11, 31, 17, 59, 59);

function contract(id: string, name: string, options: StakeOption[]): StakeContract {
  return { id, name, address: `0x${demoHex(`ideeza:testnet-demo:stake-contract:${id}`, 40)}`, network: "baseSepolia", options };
}

function option(id: string, name: string, aprBps: number, lockDays: number, intervalDays: number, graceDays: number, walletLimit: Amount, window: [number, number] = [OPENS, CLOSES]): StakeOption {
  return { id, name, aprBps, lockDays, intervalDays, graceDays, walletLimit, startsAt: window[0], endsAt: window[1] };
}

/** The demo contracts — change a value here and every screen follows. */
export const STAKE_CONTRACTS: readonly StakeContract[] = [
  contract("flex", "IDZ Flexible Pool", [
    option("flex-3", "Quick · 3 days", 800, 3, 1, 1, "1000"),
    option("flex-30", "Builder · 30 days", 2450, 30, 1, 3, "5000"),
  ]),
  contract("vault", "IDZ Maker Vault", [
    option("vault-60", "Maker · 60 days", 3790, 60, 2, 3, "5000"),
    option("vault-90", "Long · 90 days", 5000, 90, 3, 3, "10000"),
  ]),
  contract("community", "IDZ Community Pool", [option("community-14", "Community · 14 days", 1800, 14, 1, 2, "2000")]),
  contract("launch", "IDZ Launch Pool", [
    option("launch-7", "Launch · 7 days", 3000, 7, 1, 1, "1000", [Date.UTC(2026, 8, 1), OPENS]),
    option("launch-21", "Launch II · 21 days", 2100, 21, 3, 2, "3000"),
  ]),
];

export function contractOf(id: string): StakeContract | null {
  return STAKE_CONTRACTS.find((c) => c.id === id) ?? null;
}

export function optionOf(c: StakeContract, id: string): StakeOption | null {
  return c.options.find((o) => o.id === id) ?? null;
}

/** "37.9%" */
export function aprText(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}

/** "30 days", "1 day" */
export function daysText(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}

export function optionOpenAt(o: StakeOption, now: number): boolean {
  return now >= o.startsAt && now < o.endsAt;
}

/** The highest APR among the options still taking stakes; the highest of all when none is. */
export function topAprOf(c: StakeContract, now: number): number {
  const open = c.options.filter((o) => optionOpenAt(o, now));
  return Math.max(...(open.length ? open : c.options).map((o) => o.aprBps));
}

/** Search by name or address, as typed. */
export function searchContracts(query: string): StakeContract[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...STAKE_CONTRACTS];
  return STAKE_CONTRACTS.filter((c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || c.id.includes(q));
}

// ── the demo admin (paused / blocked contracts) ─────────────────────────

export const STAKE_ADMIN_KEY = "ideeza:wallet:stake-admin";

export type StakeAdmin = { v: 1; status: Record<string, "paused" | "blocked"> };

export function normalizeStakeAdmin(raw: unknown): StakeAdmin {
  const out: StakeAdmin = { v: 1, status: {} };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const status = (raw as { status?: unknown }).status;
  if (!status || typeof status !== "object" || Array.isArray(status)) return out;
  for (const [id, s] of Object.entries(status as Record<string, unknown>)) {
    if (contractOf(id) && (s === "paused" || s === "blocked")) out.status[id] = s;
  }
  return out;
}

export function contractStatusOf(admin: StakeAdmin | undefined, id: string): ContractStatus {
  return admin?.status[id] ?? "active";
}

export function withContractStatus(admin: StakeAdmin, id: string, status: ContractStatus): StakeAdmin {
  const next = { ...admin.status };
  if (status === "active") delete next[id];
  else next[id] = status;
  return { v: 1, status: next };
}

export const STATUS_WORDS: Record<Exclude<ContractStatus, "active">, string> = {
  paused: "This contract is paused",
  blocked: "This contract is blocked",
};

// ── stakes, read from the wallet ────────────────────────────────────────

export type StakeClaim = { id: string; at: number; amount: Amount; txHash: string | null };

export type Stake = {
  id: string;
  at: number;
  identity: IdentityId;
  network: Network;
  txHash: string | null;
  record: StakeRecord;
  withdrawal: { id: string; at: number; txHash: string | null } | null;
  /** Its reward claims, oldest first. */
  claims: StakeClaim[];
};

function isStake(a: WalletActivity): a is WalletActivity & { stake: StakeRecord } {
  return a.purpose === "stakeIdz" && !!a.stake;
}

function idzCredit(a: WalletActivity): Amount {
  return addAmounts(...(a.credit?.lines.filter((l) => l.coin === "IDZ").map((l) => l.amount) ?? []));
}

/** Every stake of `id`, newest first, each with its withdrawal (the first) and its reward claims. */
export function stakesOf(w: DemoWallet | undefined, id: IdentityId): Stake[] {
  const activity = w?.activity ?? [];
  const out: Stake[] = [];
  for (const a of activity) {
    if (!isStake(a) || a.identity !== id) continue;
    const mine = activity.filter((x) => x.identity === id && x.claims === a.id);
    const withdrawals = mine.filter((x) => x.purpose === "unstakeIdz").sort((x, y) => x.at - y.at);
    const claims = mine
      .filter((x) => x.purpose === "claimStakeReward")
      .sort((x, y) => x.at - y.at)
      .map((x) => ({ id: x.id, at: x.at, amount: idzCredit(x), txHash: x.txHash ?? null }));
    const w0 = withdrawals[0];
    out.push({
      id: a.id,
      at: a.at,
      identity: a.identity,
      network: a.network,
      txHash: a.txHash ?? null,
      record: a.stake,
      withdrawal: w0 ? { id: w0.id, at: w0.at, txHash: w0.txHash ?? null } : null,
      claims,
    });
  }
  return out.sort((x, y) => y.at - x.at);
}

/** The IDZ in stakes not yet withdrawn: the holdings' "Staked". */
export function stakedIdzOf(w: DemoWallet | undefined, id: IdentityId): Amount {
  return addAmounts(...stakesOf(w, id).filter((s) => !s.withdrawal).map((s) => s.record.amount));
}

/** What `id` has staked in one option, not yet withdrawn: what its wallet limit counts. */
export function stakedInOptionOf(w: DemoWallet | undefined, id: IdentityId, contractId: string, optionId: string): Amount {
  return addAmounts(
    ...stakesOf(w, id)
      .filter((s) => !s.withdrawal && s.record.contract === contractId && s.record.option === optionId)
      .map((s) => s.record.amount),
  );
}

export function lockEndOf(s: Stake): number {
  return s.at + s.record.lockDays * s.record.dayMs;
}

export function graceEndOf(s: Stake): number {
  return s.at + s.record.graceDays * s.record.dayMs;
}

export type StakePhase = "grace" | "locked" | "open" | "withdrawn";

export function stakePhaseOf(s: Stake, now: number): StakePhase {
  if (s.withdrawal) return "withdrawn";
  if (now >= lockEndOf(s)) return "open";
  return now < graceEndOf(s) ? "grace" : "locked";
}

/** Whole staking days left in the lock-up, rounded up: "12d left". */
export function daysLeftOf(s: Stake, now: number): number {
  return Math.max(0, Math.ceil((lockEndOf(s) - now) / s.record.dayMs));
}

/** How far through its lock-up a stake is, 0–100. */
export function lockProgressOf(s: Stake, now: number): number {
  const end = s.withdrawal ? Math.min(s.withdrawal.at, lockEndOf(s)) : now;
  const total = lockEndOf(s) - s.at;
  return total <= 0 ? 100 : Math.min(100, Math.max(0, ((end - s.at) / total) * 100));
}

// ── rewards ─────────────────────────────────────────────────────────────

const ZERO = BigInt(0);

function micros(a: Amount): bigint {
  return toMicros(a) ?? ZERO;
}

/** The whole reward of `amount` over a lock-up: APR × days / 365, rounded down to the micro. */
export function rewardTotalOf(amount: Amount, aprBps: number, lockDays: number): Amount {
  return fromMicros((micros(amount) * BigInt(aprBps) * BigInt(lockDays)) / BigInt(10_000 * 365));
}

export type TrancheStatus = "claimed" | "ready" | "locked";

export type Tranche = { index: number; unlocksAt: number; amount: Amount; status: TrancheStatus };

/** The reward in its shares, one per interval, oldest first. Shares a withdrawal stopped are left out. */
export function tranchesOf(s: Stake, now: number): Tranche[] {
  const r = s.record;
  const count = Math.max(1, Math.floor(r.lockDays / r.intervalDays));
  const total = micros(rewardTotalOf(r.amount, r.aprBps, r.lockDays));
  const share = total / BigInt(count);
  let claimed = micros(addAmounts(...s.claims.map((c) => c.amount)));
  const out: Tranche[] = [];
  for (let i = 0; i < count; i += 1) {
    const amount = i === count - 1 ? total - share * BigInt(count - 1) : share;
    const unlocksAt = i === count - 1 ? lockEndOf(s) : s.at + (i + 1) * r.intervalDays * r.dayMs;
    if (s.withdrawal && unlocksAt > s.withdrawal.at) break;
    let status: TrancheStatus;
    if (claimed >= amount && amount > ZERO) {
      claimed -= amount;
      status = "claimed";
    } else status = now >= unlocksAt ? "ready" : "locked";
    out.push({ index: i, unlocksAt, amount: fromMicros(amount), status });
  }
  return out;
}

export type RewardView = { total: Amount; claimed: Amount; ready: Amount; nextAt: number | null };

/** The stake's reward: all of it (what it can still earn, less what a withdrawal stopped), what was
 *  claimed, what is ready to claim, and when the next share unlocks. */
export function rewardOf(s: Stake, now: number): RewardView {
  const t = tranchesOf(s, now);
  const sum = (status?: TrancheStatus) => addAmounts(...t.filter((x) => !status || x.status === status).map((x) => x.amount));
  return {
    total: sum(),
    claimed: addAmounts(...s.claims.map((c) => c.amount)),
    ready: sum("ready"),
    nextAt: t.find((x) => x.status === "locked")?.unlocksAt ?? null,
  };
}

// ── the stake form ──────────────────────────────────────────────────────

export type StakeCheck = { amount: Amount | null; reward: Amount | null; error: { field: "amount" | "form"; text: string } | null };

function dateWords(at: number): string {
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Why a contract or option can't take a stake right now, or null when it can. */
export function stakeBlockOf(o: StakeOption, status: ContractStatus, now: number): string | null {
  if (status === "blocked") return `${STATUS_WORDS.blocked}. Nothing can be staked in it.`;
  if (status === "paused") return `${STATUS_WORDS.paused}. Staking opens again when it resumes.`;
  if (now < o.startsAt) return `This option opens on ${dateWords(o.startsAt)}.`;
  if (now >= o.endsAt) return `This option closed on ${dateWords(o.endsAt)}.`;
  return null;
}

/** How much more `id` may stake in an option: its wallet limit less what is staked there. */
export function limitLeftOf(o: StakeOption, staked: Amount): Amount {
  const left = subAmounts(o.walletLimit, staked);
  return compareAmounts(left, "0") > 0 ? left : "0";
}

/** The most that can be staked: the balance, within the wallet limit. */
export function maxStakeOf(o: StakeOption, c: { available: Amount; staked: Amount }): Amount {
  const left = limitLeftOf(o, c.staked);
  const have = compareAmounts(c.available, "0") > 0 ? c.available : "0";
  return compareAmounts(have, left) < 0 ? fromMicros(micros(have)) : left;
}

/**
 * The stake form, read: the amount, its reward over the lock-up, and the first thing that stops
 * the stake. `available` is the IDZ balance; `gas` the network's own test coin; `staked` what
 * this wallet already has in the option.
 */
export function stakeCheckOf(
  text: string,
  c: { option: StakeOption; network: Network; status: ContractStatus; now: number; available: Amount; gas: Amount; staked: Amount },
): StakeCheck {
  const t = text.trim();
  const typed = t === "" ? null : toMicros(t);
  const amount = typed === null ? null : fromMicros(typed);
  const reward = amount === null ? null : rewardTotalOf(amount, c.option.aprBps, c.option.lockDays);
  const fail = (field: "amount" | "form", s: string): StakeCheck => ({ amount, reward, error: { field, text: s } });
  const blocked = stakeBlockOf(c.option, c.status, c.now);
  if (blocked) return fail("form", blocked);
  if (t === "") return fail("amount", "Enter how many IDZ to stake.");
  if (typed === null) return fail("amount", "Use digits only, with up to 6 decimals.");
  if (typed === ZERO) return fail("amount", "Enter more than 0.");
  if (compareAmounts(amount!, c.available) > 0) return fail("amount", `Not enough IDZ — you have ${formatAmount(c.available, "IDZ")}.`);
  const left = limitLeftOf(c.option, c.staked);
  if (compareAmounts(amount!, left) > 0) {
    return fail(
      "amount",
      compareAmounts(left, "0") === 0
        ? `You've reached this option's wallet limit of ${formatAmount(c.option.walletLimit, "IDZ")}.`
        : `Over the wallet limit — you can stake ${formatAmount(left, "IDZ")} more in this option.`,
    );
  }
  const gas = estimateGas(c.network);
  if (compareAmounts(c.gas, String(gas.fee)) < 0) {
    return fail("amount", `Not enough test ${gas.native} for the network fee — you have ${formatAmount(c.gas, gas.native)}, this needs ${formatAmount(String(gas.fee), gas.native)}.`);
  }
  return { amount, reward, error: null };
}

/** Why a stake's withdrawal or claim can't go now, or null. */
export function stakeActionBlockOf(s: Stake, status: ContractStatus, now: number, action: "withdraw" | "claim"): string | null {
  if (status === "blocked") return `${STATUS_WORDS.blocked}. Get support to sort it out.`;
  if (status === "paused") return `${STATUS_WORDS.paused}. Try again when it resumes.`;
  if (action === "claim") {
    if (compareAmounts(rewardOf(s, now).ready, "0") > 0) return null;
    const next = rewardOf(s, now).nextAt;
    return next === null ? "Every reward of this stake is claimed." : "No reward is ready yet.";
  }
  const phase = stakePhaseOf(s, now);
  if (phase === "withdrawn") return "Already withdrawn.";
  if (phase === "locked") return `Locked until the lock-up ends, in ${daysText(daysLeftOf(s, now))}.`;
  return null;
}

// ── the wallet requests ─────────────────────────────────────────────────

const NOTE = "Testnet demo — no real money moves. IDZ can lose value; this isn't investment advice.";

function accountOf(id: IdentityId): AccountIndex {
  return Number(id.slice("maker-".length)) as AccountIndex;
}

/** Staking `amount` in an option: the IDZ and the gas, on the contract's network. */
export function stakeRequestOf(c: StakeContract, o: StakeOption, amount: Amount): WalletRequest {
  const gas = estimateGas(c.network);
  return {
    kind: "transaction",
    purpose: "stakeIdz",
    identity: "maker",
    network: c.network,
    title: "Stake IDZ",
    summary: [
      { label: "You stake", value: formatAmount(amount, "IDZ") },
      { label: "Option", value: `${o.name} · ${c.name}` },
      { label: "Lock-up", value: daysText(o.lockDays) },
      { label: "Est. reward", value: `${formatAmount(rewardTotalOf(amount, o.aprBps, o.lockDays), "IDZ")} at ${aprText(o.aprBps)} APR` },
    ],
    note: NOTE,
    doneLine: `${formatAmount(amount, "IDZ")} staked.`,
    // The gas first: `chargeRowsOf` names the first line that matches the fee as the fee.
    charge: { network: c.network, lines: [{ coin: gas.native, amount: String(gas.fee) }, { coin: "IDZ", amount }] },
    stake: {
      contract: c.id,
      option: o.id,
      amount,
      aprBps: o.aprBps,
      lockDays: o.lockDays,
      intervalDays: o.intervalDays,
      graceDays: o.graceDays,
      dayMs: STAKE_DAY_MS,
    },
  };
}

/** Withdrawing a stake: its IDZ back, for the gas, signed by the account that staked it. */
export function withdrawRequestOf(c: StakeContract, s: Stake): WalletRequest {
  const gas = estimateGas(s.network);
  return {
    kind: "transaction",
    purpose: "unstakeIdz",
    identity: "maker",
    account: accountOf(s.identity),
    network: s.network,
    title: "Withdraw staked IDZ",
    summary: [
      { label: "You get back", value: formatAmount(s.record.amount, "IDZ") },
      { label: "From", value: c.name },
    ],
    note: "Testnet demo — no real money moves. Rewards not yet unlocked stop here.",
    doneLine: `${formatAmount(s.record.amount, "IDZ")} is back in your balance.`,
    charge: { network: s.network, lines: [{ coin: gas.native, amount: String(gas.fee) }] },
    credit: { network: s.network, lines: [{ coin: "IDZ", amount: s.record.amount }] },
    claims: s.id,
  };
}

/** Claiming every reward share of a stake that is ready. */
export function claimRewardRequestOf(c: StakeContract, s: Stake, amount: Amount): WalletRequest {
  const gas = estimateGas(s.network);
  return {
    kind: "transaction",
    purpose: "claimStakeReward",
    identity: "maker",
    account: accountOf(s.identity),
    network: s.network,
    title: "Claim staking reward",
    summary: [
      { label: "You claim", value: formatAmount(amount, "IDZ") },
      { label: "From", value: c.name },
    ],
    note: "Testnet demo — no real money moves. The IDZ moves into your available balance.",
    doneLine: `${formatAmount(amount, "IDZ")} added to your balance.`,
    charge: { network: s.network, lines: [{ coin: gas.native, amount: String(gas.fee) }] },
    credit: { network: s.network, lines: [{ coin: "IDZ", amount }] },
    claims: s.id,
  };
}

// ── the dashboard's filter ──────────────────────────────────────────────

/** `month` 0–11 and `year` four digits, in local time, as the dates are written. */
export type StakeFilter = { month: number | "all"; year: number | "all" };

export function filterStakes(rows: readonly Stake[], f: StakeFilter): Stake[] {
  return rows.filter((s) => {
    const d = new Date(s.at);
    return (f.month === "all" || d.getMonth() === f.month) && (f.year === "all" || d.getFullYear() === f.year);
  });
}

/** Every year with a stake, newest first; this year when there are none. */
export function stakeYearsOf(rows: readonly Stake[], now: number): number[] {
  const years = [...new Set(rows.map((s) => new Date(s.at).getFullYear()))].sort((a, b) => b - a);
  return years.length ? years : [new Date(now).getFullYear()];
}
