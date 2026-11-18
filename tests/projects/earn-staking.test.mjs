// Earn Coin › Stake (mobile Figma "Stacking"): the demo contracts, the stake form's checks, the
// reward shares, withdraw and claim, all read from the demo wallet's activity, so the balance,
// the holdings and the IDZ ledger agree with the stakes.
import { test } from "node:test";
import assert from "node:assert/strict";

const staking = await import("../../.tmp-test/lib/wallet/staking.js");
const idz = await import("../../.tmp-test/lib/wallet/idz.js");
const { balancesOf } = await import("../../.tmp-test/lib/wallet/balances.js");
const { defaultWallet, pushActivity, normalizeWallet } = await import("../../.tmp-test/lib/wallet/demo-wallet.js");
const { activityOf, proofOf } = await import("../../.tmp-test/lib/wallet/request-view.js");
const { requestCopy } = await import("../../.tmp-test/lib/wallet/request.js");

const NOW = Date.UTC(2026, 10, 5, 9, 0, 0);
const DAY = staking.STAKE_DAY_MS;
const EMPTY_MARKET = { listings: [], sales: [], bids: [], support: [], unreadable: false };
const ctx = (wallet, now = NOW) => ({ wallet, market: EMPTY_MARKET, now });
const flex = staking.contractOf("flex");
const quick = staking.optionOf(flex, "flex-3"); // 8 % APR, 3 days, a share a day, 1 day grace, 1,000 limit

function confirm(w, req, at, id, who = "maker-1") {
  const proof = proofOf(req, who, at, `0x${id.padEnd(64, "0").slice(0, 64)}`);
  return pushActivity(w, activityOf(req, proof, id));
}

function stake(w, amount = "365", at = NOW, id = "act_stake_a", c = flex, o = quick) {
  return confirm(w, staking.stakeRequestOf(c, o, amount), at, id);
}

test("the demo contracts: Base Sepolia, a demo address each, options with their terms", () => {
  assert.ok(staking.STAKE_CONTRACTS.length >= 4);
  for (const c of staking.STAKE_CONTRACTS) {
    assert.equal(c.network, "baseSepolia");
    assert.match(c.address, /^0x[0-9a-f]{40}$/);
    assert.ok(c.options.length >= 1);
  }
  assert.equal(staking.aprText(3790), "37.9%");
  assert.equal(staking.aprText(800), "8%");
  assert.equal(staking.daysText(1), "1 day");
  assert.equal(staking.chainIdOf("baseSepolia"), 84532);
  assert.equal(staking.searchContracts("vault").length, 1);
  assert.equal(staking.searchContracts("  ").length, staking.STAKE_CONTRACTS.length);
});

test("reward total: APR over the lock-up, rounded down to the micro", () => {
  assert.equal(staking.rewardTotalOf("365", 800, 3), "0.24"); // 365 × 8 % × 3 / 365
  assert.equal(staking.rewardTotalOf("100", 3790, 60), "6.230136");
});

test("stake form checks: amount, balance, wallet limit, gas, the contract's state and window", () => {
  const base = { option: quick, network: "baseSepolia", status: "active", now: NOW, available: "2000", gas: "0.05", staked: "0" };
  assert.equal(staking.stakeCheckOf("", base).error.text, "Enter how many IDZ to stake.");
  assert.equal(staking.stakeCheckOf("1.1234567", base).error.text, "Use digits only, with up to 6 decimals.");
  assert.equal(staking.stakeCheckOf("0", base).error.text, "Enter more than 0.");
  assert.match(staking.stakeCheckOf("2001", base).error.text, /^Not enough IDZ — you have 2,000 IDZ\./);
  assert.match(staking.stakeCheckOf("1001", base).error.text, /you can stake 1,000 IDZ more/);
  assert.match(staking.stakeCheckOf("10", { ...base, staked: "1000" }).error.text, /reached this option's wallet limit/);
  assert.match(staking.stakeCheckOf("10", { ...base, gas: "0" }).error.text, /^Not enough test ETH for the network fee/);
  assert.match(staking.stakeCheckOf("10", { ...base, status: "paused" }).error.text, /paused/);
  assert.equal(staking.stakeCheckOf("10", { ...base, status: "blocked" }).error.field, "form");
  const launch = staking.optionOf(staking.contractOf("launch"), "launch-7");
  assert.match(staking.stakeCheckOf("10", { ...base, option: launch }).error.text, /^This option closed on/);
  const ok = staking.stakeCheckOf("365", base);
  assert.equal(ok.error, null);
  assert.equal(ok.reward, "0.24");
  assert.equal(staking.maxStakeOf(quick, { available: "2000", staked: "250" }), "750");
  assert.equal(staking.maxStakeOf(quick, { available: "40", staked: "0" }), "40");
});

test("a stake debits its IDZ and gas, shows as Staked, and is a Stake row in the ledger", () => {
  const w = stake(normalizeWallet(defaultWallet()));
  const reread = normalizeWallet(JSON.parse(JSON.stringify(w)));
  assert.deepEqual(reread.activity[0].stake, w.activity[0].stake); // the terms survive a reload
  assert.equal(balancesOf("maker-1", ctx(reread)).idz, "1635");
  assert.equal(balancesOf("maker-1", ctx(reread)).native.baseSepolia.ETH, "0.04896");
  const h = idz.idzHoldingsOf(reread, "maker-1", ctx(reread));
  assert.equal(h.available, "1635");
  assert.equal(h.staked, "365");
  const row = idz.idzLedgerOf(reread, "maker-1")[0];
  assert.equal(row.type, "stake");
  assert.equal(row.direction, "out");
  assert.equal(row.amount, "365");
  assert.equal(row.title, "Staked IDZ · 365 IDZ");
  assert.equal(staking.stakedInOptionOf(reread, "maker-1", "flex", "flex-3"), "365");
  assert.equal(staking.stakedInOptionOf(reread, "maker-2", "flex", "flex-3"), "0");
});

test("phases: grace, locked, open; the lock-up's days left and progress", () => {
  const s = staking.stakesOf(stake(defaultWallet()), "maker-1")[0];
  assert.equal(staking.stakePhaseOf(s, NOW), "grace");
  assert.equal(staking.stakePhaseOf(s, NOW + DAY), "locked");
  assert.equal(staking.stakePhaseOf(s, NOW + 3 * DAY), "open");
  assert.equal(staking.daysLeftOf(s, NOW + 1), 3);
  assert.equal(staking.daysLeftOf(s, NOW + DAY + 1), 2);
  assert.equal(Math.round(staking.lockProgressOf(s, NOW + 1.5 * DAY)), 50);
  assert.match(staking.stakeActionBlockOf(s, "active", NOW + 1.5 * DAY, "withdraw"), /^Locked until the lock-up ends, in 2 days\./);
  assert.equal(staking.stakeActionBlockOf(s, "active", NOW, "withdraw"), null);
  assert.match(staking.stakeActionBlockOf(s, "paused", NOW, "withdraw"), /paused/);
});

test("rewards unlock a share per interval; a claim credits them and marks them claimed", () => {
  let w = stake(defaultWallet());
  let s = staking.stakesOf(w, "maker-1")[0];
  const t0 = staking.tranchesOf(s, NOW);
  assert.deepEqual(t0.map((t) => t.amount), ["0.08", "0.08", "0.08"]);
  assert.deepEqual(t0.map((t) => t.status), ["locked", "locked", "locked"]);
  assert.equal(staking.rewardOf(s, NOW).nextAt, NOW + DAY);
  assert.equal(staking.stakeActionBlockOf(s, "active", NOW, "claim"), "No reward is ready yet.");
  const later = NOW + 2 * DAY + 5;
  assert.equal(staking.rewardOf(s, later).ready, "0.16");
  w = confirm(w, staking.claimRewardRequestOf(flex, s, "0.16"), later, "act_reward_a");
  s = staking.stakesOf(w, "maker-1")[0];
  assert.deepEqual(staking.tranchesOf(s, later).map((t) => t.status), ["claimed", "claimed", "locked"]);
  assert.equal(staking.rewardOf(s, later).claimed, "0.16");
  assert.equal(balancesOf("maker-1", ctx(w, later)).idz, "1635.16");
  const ledger = idz.idzLedgerOf(w, "maker-1");
  assert.equal(ledger[0].type, "reward");
  assert.equal(ledger[0].amount, "0.16");
  assert.equal(ledger[0].title, "Claimed a staking reward · IDZ Flexible Pool");
});

test("withdraw: the IDZ comes back as a Withdraw row, Staked drops, later shares stop", () => {
  let w = stake(defaultWallet());
  let s = staking.stakesOf(w, "maker-1")[0];
  const at = NOW + DAY / 2; // in the grace time, before any share unlocked
  const req = staking.withdrawRequestOf(flex, s);
  assert.equal(req.account, 1);
  assert.equal(requestCopy("confirmed", req, w).title, "Withdrawn.");
  w = confirm(w, req, at, "act_unstake_a");
  s = staking.stakesOf(w, "maker-1")[0];
  assert.equal(staking.stakePhaseOf(s, at), "withdrawn");
  assert.equal(staking.tranchesOf(s, at + 10 * DAY).length, 0);
  assert.equal(staking.stakedIdzOf(w, "maker-1"), "0");
  assert.equal(balancesOf("maker-1", ctx(w, at)).idz, "2000");
  assert.equal(idz.idzLedgerOf(w, "maker-1")[0].type, "withdraw");
  assert.equal(staking.stakeActionBlockOf(s, "active", at, "withdraw"), "Already withdrawn.");
});

test("the dashboard's month and year filter", () => {
  const w = stake(stake(defaultWallet(), "10", Date.UTC(2025, 2, 3), "act_old"), "20", NOW, "act_new");
  const rows = staking.stakesOf(w, "maker-1");
  assert.deepEqual(rows.map((s) => s.id), ["act_new", "act_old"]);
  assert.deepEqual(staking.stakeYearsOf(rows, NOW), [2026, 2025]);
  assert.deepEqual(staking.filterStakes(rows, { month: "all", year: 2025 }).map((s) => s.id), ["act_old"]);
  assert.deepEqual(staking.filterStakes(rows, { month: 10, year: "all" }).map((s) => s.id), ["act_new"]);
});

test("the demo admin's contract states normalize and toggle", () => {
  let a = staking.normalizeStakeAdmin({ status: { flex: "paused", nope: "blocked", vault: "odd" } });
  assert.deepEqual(a.status, { flex: "paused" });
  assert.equal(staking.contractStatusOf(a, "flex"), "paused");
  a = staking.withContractStatus(a, "flex", "active");
  assert.equal(staking.contractStatusOf(a, "flex"), "active");
  assert.equal(staking.contractStatusOf(staking.withContractStatus(a, "vault", "blocked"), "vault"), "blocked");
  assert.deepEqual(staking.normalizeStakeAdmin("junk"), { v: 1, status: {} });
});
