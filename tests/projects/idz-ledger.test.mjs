// IDZ on the Balance page (spec 2026-10-19-balance-overview-design.md): one price, the demo
// contract address, and the ledger that reconciles with the derived balance.
import { test } from "node:test";
import assert from "node:assert/strict";

const idz = await import("../../.tmp-test/lib/wallet/idz.js");
const { balancesOf } = await import("../../.tmp-test/lib/wallet/balances.js");
const { walletConnect, defaultWallet, pushActivity, demoAddress, normalizeWallet } = await import("../../.tmp-test/lib/wallet/demo-wallet.js");
const { activityOf } = await import("../../.tmp-test/lib/wallet/request-view.js");

const NOW = Date.UTC(2026, 9, 19, 9, 30, 0);
const EMPTY_MARKET = { listings: [], sales: [], bids: [], support: [], unreadable: false };
const ctx = (wallet) => ({ wallet, market: EMPTY_MARKET, now: NOW });

function mint(w, id, at, title = "Minted on chain · Car", purpose) {
  const entry = {
    id: `act_${at}`,
    at,
    identity: id,
    network: "baseSepolia",
    kind: "transaction",
    title,
    txHash: `0x${"ab".repeat(32)}`,
    charge: { network: "baseSepolia", lines: [{ coin: "IDZ", amount: "4" }, { coin: "ETH", amount: "0.00104" }] },
  };
  if (purpose) entry.purpose = purpose;
  return pushActivity(w, entry);
}

function credits(w, id, at, amount, title = "Pay for AI credits") {
  return pushActivity(w, {
    id: `act_c_${at}`,
    at,
    identity: id,
    network: "baseSepolia",
    kind: "transaction",
    title,
    txHash: `0x${"cd".repeat(32)}`,
    charge: { network: "baseSepolia", lines: [{ coin: "IDZ", amount }] },
  });
}

test("one price: 40 IDZ at $0.025065 is $1.00, 4 IDZ is $0.10, a sliver reads under a cent", () => {
  assert.equal(idz.IDZ_USD_PRICE, "0.025065");
  assert.equal(idz.idzUsdOf("40"), "$1.00");
  assert.equal(idz.idzUsdOf("4"), "$0.10");
  assert.equal(idz.idzUsdOf("0"), "$0.00");
  assert.equal(idz.idzUsdOf("0.1"), "< $0.01");
  assert.equal(idz.idzUsdOf("1000000"), "$25,065.00");
  assert.equal(idz.idzUsdOf("2000"), "$50.13");
});

test("the IDZ contract: a 0x address per network, the same every time, different per network", () => {
  const base = idz.idzContractOf("baseSepolia");
  assert.match(base, /^0x[0-9a-f]{40}$/);
  assert.equal(idz.idzContractOf("baseSepolia"), base);
  assert.notEqual(idz.idzContractOf("mumbai"), base);
  assert.deepEqual(idz.IDZ_TOKEN, { name: "IDEEZA Coin", symbol: "IDZ", decimals: 18 });
});

test("a fresh maker's ledger is the 2,000 IDZ starting balance alone, as a Reward coming in", () => {
  const rows = idz.idzLedgerOf(defaultWallet(), "maker-1");
  assert.equal(rows.length, 1);
  const [seed] = rows;
  assert.equal(seed.type, "reward");
  assert.equal(seed.direction, "in");
  assert.equal(seed.amount, "2000");
  assert.equal(seed.at, null);
  assert.equal(seed.network, null);
  assert.equal(seed.txHash, null);
  assert.equal(seed.address, demoAddress("maker-1"));
});

test("a demo buyer starts with no IDZ: no starting row at all", () => {
  assert.deepEqual(idz.idzLedgerOf(defaultWallet(), "buyer-mira"), []);
});

test("spends come out newest first, typed by purpose, with only their IDZ line counted", () => {
  let w = walletConnect(defaultWallet(), "maker-1");
  w = mint(w, "maker-1", NOW - 3000, "Minted on chain · Car", "instantMint");
  w = credits(w, "maker-1", NOW - 2000, "8");
  w = mint(w, "maker-2", NOW - 1000); // another account: not this ledger
  const rows = idz.idzLedgerOf(w, "maker-1");
  assert.deepEqual(rows.map((r) => [r.type, r.direction, r.amount]), [
    ["credits", "out", "8"],
    ["projectCreate", "out", "4"],
    ["reward", "in", "2000"],
  ]);
  assert.equal(rows[1].title, "Minted on chain · Car");
  assert.equal(rows[1].network, "baseSepolia");
  assert.equal(rows[1].txHash, `0x${"ab".repeat(32)}`);
});

test("older records with no purpose are typed from their title", () => {
  let w = defaultWallet();
  w = mint(w, "maker-1", NOW - 3000);
  w = credits(w, "maker-1", NOW - 2000, "5", "Pay for Builder");
  const types = idz.idzLedgerOf(w, "maker-1").map((r) => r.type);
  assert.deepEqual(types, ["credits", "projectCreate", "reward"]);
});

test("activity with no IDZ in its charge (a lazy mint's signature, a gas-only spend) is not an IDZ row", () => {
  let w = defaultWallet();
  w = pushActivity(w, { id: "sig", at: NOW - 10, identity: "maker-1", network: "baseSepolia", kind: "signature", title: "Signed a lazy mint · Car" });
  w = pushActivity(w, {
    id: "gas",
    at: NOW - 5,
    identity: "maker-1",
    network: "mumbai",
    kind: "transaction",
    title: "Signed a listing · Car",
    charge: { network: "mumbai", lines: [{ coin: "MATIC", amount: "0.01" }] },
  });
  assert.equal(idz.idzLedgerOf(w, "maker-1").length, 1);
});

test("the ledger reconciles: the starting balance less every Out row is the derived balance", () => {
  let w = walletConnect(defaultWallet(), "maker-1");
  w = mint(w, "maker-1", NOW - 3000);
  w = mint(w, "maker-1", NOW - 2500);
  w = credits(w, "maker-1", NOW - 2000, "12.5");
  const rows = idz.idzLedgerOf(w, "maker-1");
  const net = rows.reduce((sum, r) => sum + (r.direction === "in" ? 1 : -1) * Number(r.amount), 0);
  assert.equal(String(net), balancesOf("maker-1", ctx(w)).idz);
  assert.equal(idz.idzHoldingsOf(w, "maker-1", ctx(w)).available, "1979.5");
});

test("holdings: Staked, Ready to claim and Pending are 0 until staking and buying exist", () => {
  const h = idz.idzHoldingsOf(defaultWallet(), "maker-1", ctx(defaultWallet()));
  assert.deepEqual(h, { available: "2000", staked: "0", claimable: "0", pending: "0" });
});

test("filters: by network (the starting row has none, so it shows only under every network) and by type", () => {
  let w = defaultWallet();
  w = mint(w, "maker-1", NOW - 3000);
  w = credits(w, "maker-1", NOW - 2000, "8");
  const rows = idz.idzLedgerOf(w, "maker-1");
  assert.equal(idz.filterIdzLedger(rows, { network: "all", type: "all" }).length, 3);
  assert.equal(idz.filterIdzLedger(rows, { network: "baseSepolia", type: "all" }).length, 2);
  assert.equal(idz.filterIdzLedger(rows, { network: "mumbai", type: "all" }).length, 0);
  assert.deepEqual(idz.filterIdzLedger(rows, { network: "all", type: "reward" }).map((r) => r.id), ["seed"]);
  assert.deepEqual(idz.TRANSFER_TYPES.map((t) => t.label), ["Reward", "Project Create", "Credits"]);
});

test("a confirmed request now records its purpose, and a stored purpose survives a reload", () => {
  const req = {
    kind: "transaction",
    purpose: "buyCredits",
    identity: "maker",
    network: "baseSepolia",
    title: "Pay for AI credits",
    summary: [],
    charge: { network: "baseSepolia", lines: [{ coin: "IDZ", amount: "8" }] },
  };
  const proof = { identity: "maker-1", address: demoAddress("maker-1"), at: NOW, txHash: `0x${"ef".repeat(32)}` };
  const entry = activityOf(req, proof, "act_x");
  assert.equal(entry.purpose, "buyCredits");
  const back = normalizeWallet({ ...defaultWallet(), activity: [entry, { ...entry, id: "act_y", purpose: "nonsense" }] });
  assert.equal(back.activity[0].purpose, "buyCredits");
  assert.equal(back.activity[1].purpose, undefined);
});

test("dates read one way: day, short month, four-digit year, then the time", () => {
  assert.match(idz.formatWhen(Date.UTC(2024, 7, 13, 14, 8)), /^\d{1,2} Aug 2024, \d{1,2}:\d{2} (AM|PM)$/);
});

test("the wallet button's short figure: whole thousands as K, a decimal kept to one place", () => {
  assert.equal(idz.idzCompactOf("40"), "40 IDZ");
  assert.equal(idz.idzCompactOf("19.5"), "19.5 IDZ");
  assert.equal(idz.idzCompactOf("1800.52"), "1.8K IDZ");
  assert.equal(idz.idzCompactOf("2000"), "2K IDZ");
});
