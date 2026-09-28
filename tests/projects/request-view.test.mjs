// The Demo wallet dialog's words, read with the full market (P2-MINT-2/3/5,
// contract errata 29).
import { test } from "node:test";
import assert from "node:assert/strict";

const rv = await import("../../.tmp-test/lib/wallet/request-view.js");
const { defaultWallet, walletConnect, walletSwitchNetwork, pushActivity, demoAddress } = await import(
  "../../.tmp-test/lib/wallet/demo-wallet.js"
);

const NOW = Date.UTC(2026, 8, 28, 12, 0, 0);
const EMPTY_MARKET = { listings: [], sales: [], bids: [], support: [], unreadable: false };
const ctx = (wallet, market = EMPTY_MARKET) => ({ wallet, market, now: NOW });

const MINT = {
  kind: "transaction",
  purpose: "instantMint",
  identity: "maker",
  network: "baseSepolia",
  title: "Mint Car",
  summary: [
    { label: "Project", value: "Car" },
    { label: "Collection", value: "Test Collection · token #1" },
    { label: "Network", value: "Base Sepolia (Testnet)" },
  ],
  note: "",
  doneLine: "Minted on chain.",
  charge: { network: "baseSepolia", lines: [{ coin: "IDZ", amount: "4" }, { coin: "ETH", amount: "0.00104" }] },
};

const SIGN = { ...MINT, kind: "signature", purpose: "lazyMint", charge: undefined, doneLine: "Token #1 is reserved for Car." };

function spend(w, id, lines, network = "baseSepolia") {
  return pushActivity(w, {
    id: `act_${lines.map((l) => l.amount).join("_")}`,
    at: NOW - 5000,
    identity: id,
    network,
    kind: "transaction",
    title: "Minted on chain · Old",
    charge: { network, lines },
  });
}

function sale(overrides = {}) {
  return {
    id: "sale_1",
    listingId: "lst_1",
    projectId: "proj_1",
    at: NOW - 1000,
    buyerId: "buyer-mira",
    buyerAddress: demoAddress("buyer-mira"),
    sellerAddress: demoAddress("maker-1"),
    item: { nft: "main", sharePct: 100 },
    via: "buyNow",
    token: "ETH",
    price: "0.5",
    fees: { ideezaBps: 250, ideeza: "0.0125", network: { coin: "ETH", amount: "0.00104" } },
    payout: "0.4875",
    royaltiesPct: 0,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1,
    network: "baseSepolia",
    collection: "Test Collection",
    benefits: [],
    txHash: "0x" + "a".repeat(64),
    demo: true,
    ...overrides,
  };
}

test("requestIdentityOf: a buyer signs as named, the maker as its current or required account", () => {
  const w = { ...defaultWallet(), account: 2 };
  assert.equal(rv.requestIdentityOf({ ...MINT, identity: "buyer-leo" }, w), "buyer-leo");
  assert.equal(rv.requestIdentityOf(MINT, w), "maker-2");
  assert.equal(rv.requestIdentityOf({ ...MINT, account: 3 }, w), "maker-3");
  assert.equal(rv.requestIdentityOf(MINT, undefined), "maker-1");
});

test("requestGateOf: connect, wrong network, review, and a required signer the wallet left", () => {
  const fresh = defaultWallet();
  assert.equal(rv.requestGateOf(MINT, fresh), "connect");
  const on = walletConnect(fresh, "maker-1");
  assert.equal(rv.requestGateOf(MINT, on), "review");
  assert.equal(rv.requestGateOf(MINT, walletSwitchNetwork(on, "maker-1", "mumbai")), "wrongNetwork");
  assert.equal(rv.requestGateOf({ ...MINT, account: 2 }, on), "accountChanged");
});

test("connectionLineOf is the MINT-3 header strip", () => {
  const on = walletConnect(defaultWallet(), "maker-1");
  assert.equal(rv.connectionLineOf("maker-1", on), "Connected: 0x955d…ed95 · Demo account 1 · Base Sepolia (Testnet)");
  assert.equal(rv.connectionLineOf("maker-1", defaultWallet()), "Not connected · Demo account 1");
  assert.match(rv.connectionLineOf("buyer-mira", walletConnect(defaultWallet(), "buyer-mira")), /· Mira \(demo buyer\) ·/);
});

test("sumCharge adds same-coin lines, so price + fee in one coin is checked as one amount", () => {
  const c = rv.sumCharge({ network: "mumbai", lines: [{ coin: "MATIC", amount: "9.99" }, { coin: "MATIC", amount: "0.021" }] });
  assert.deepEqual(c, { network: "mumbai", lines: [{ coin: "MATIC", amount: "10.011" }] });
  // A buyer with 10 MATIC can't pay 9.99 + 0.021, though each line alone fits.
  const buy = { ...MINT, purpose: "purchase", identity: "buyer-mira", network: "mumbai", charge: { network: "mumbai", lines: [{ coin: "MATIC", amount: "9.99" }, { coin: "MATIC", amount: "0.021" }] } };
  const short = rv.shortfallOf(buy, "buyer-mira", ctx(defaultWallet()));
  assert.equal(short.text, "Not enough test MATIC — you have 10 MATIC, this needs 10.011 MATIC.");
});

test("chargeRowsOf labels the mint fee and the network fee, and totals the charge", () => {
  const out = rv.chargeRowsOf(MINT);
  assert.deepEqual(out.rows, [
    { label: "Mint fee", value: "4 IDZ" },
    { label: "Network fee (Base Sepolia)", value: "0.00104 ETH", note: "test ETH — no real cost" },
  ]);
  assert.equal(out.total, "4 IDZ + 0.00104 ETH");
  assert.equal(rv.chargeRowsOf(SIGN), null);
  const buy = { ...MINT, purpose: "purchase", network: "mumbai", charge: { network: "mumbai", lines: [{ coin: "MATIC", amount: "0.05" }, { coin: "MATIC", amount: "0.021" }] } };
  assert.deepEqual(rv.chargeRowsOf(buy).rows.map((r) => r.label), ["Price", "Network fee (Mumbai)"]);
  assert.equal(rv.chargeRowsOf(buy).total, "0.071 MATIC");
});

test("shortfallOf: MINT-3's IDZ and network-fee copy", () => {
  let w = walletConnect(defaultWallet(), "maker-1");
  assert.equal(rv.shortfallOf(MINT, "maker-1", ctx(w)), null);
  const poor = spend(w, "maker-1", [{ coin: "IDZ", amount: "38" }]);
  assert.equal(rv.shortfallOf(MINT, "maker-1", ctx(poor)).text, "Not enough IDZ — you have 2 IDZ, this needs 4 IDZ.");
  const noGas = spend(w, "maker-1", [{ coin: "ETH", amount: "0.0497" }]);
  assert.equal(
    rv.shortfallOf(MINT, "maker-1", ctx(noGas)).text,
    "Not enough test ETH for the network fee — you have 0.0003 ETH, this needs 0.00104 ETH.",
  );
  assert.equal(rv.shortfallOf(SIGN, "maker-1", ctx(poor)), null);
});

test("errata 29: affordability reads the market — a seller's payout lifts the maker's balance", () => {
  const w = spend(walletConnect(defaultWallet(), "maker-1"), "maker-1", [{ coin: "ETH", amount: "0.05" }]);
  // Wallet activity alone: 0 ETH left, so the network fee can't be paid.
  assert.ok(rv.shortfallOf(MINT, "maker-1", ctx(w)));
  // With the sale's 0.4875 ETH payout to account 1, it can.
  assert.equal(rv.shortfallOf(MINT, "maker-1", ctx(w, { ...EMPTY_MARKET, sales: [sale()] })), null);
  const short = rv.shortfallOf(
    { ...MINT, identity: "buyer-mira", purpose: "purchase", charge: { network: "baseSepolia", lines: [{ coin: "ETH", amount: "0.6" }] } },
    "buyer-mira",
    ctx(w, { ...EMPTY_MARKET, sales: [sale()] }),
  );
  // Mira started with 1 ETH and paid 0.5 + 0.00104 for the sale.
  assert.equal(short.have, "0.49896");
  assert.equal(rv.balanceChangedLine(short), "Your balance changed — you now have 0.49896 ETH.");
});

test("balanceAfterOf: 36 IDZ · 0.04896 ETH after an instant mint", () => {
  const w = walletConnect(defaultWallet(), "maker-1");
  assert.equal(rv.balanceAfterOf(MINT, "maker-1", ctx(w)), "36 IDZ · 0.04896 ETH");
  assert.equal(rv.balanceAfterOf(SIGN, "maker-1", ctx(w)), null);
});

test("balanceLineOf, accountRowOf and buyerRowOf use the chosen network's own coin", () => {
  const w = walletConnect(defaultWallet(), "maker-1");
  assert.equal(rv.balanceLineOf("maker-1", "baseSepolia", ctx(w)), "40 IDZ · 0.05 test ETH");
  assert.equal(rv.balanceLineOf("maker-1", "mumbai", ctx(w)), "40 IDZ · 0.5 test MATIC");
  assert.equal(rv.accountRowOf(2, ctx(w)), "Demo account 2 · 0x2b10…3c00 · 40 IDZ");
  const mira = walletSwitchNetwork(w, "buyer-mira", "mumbai");
  assert.match(rv.buyerRowOf("buyer-mira", "Mira", mira, ctx(mira)), /^Mira · 0x[0-9a-f]{4}…[0-9a-f]{4} · 10 test MATIC$/);
  assert.match(rv.buyerRowOf("buyer-leo", "Leo", mira, ctx(mira)), / · 1 test ETH$/);
});

test("activityLineOf and recentOf: the newest 3 of one identity, with the charge", () => {
  let w = walletConnect(defaultWallet(), "maker-1");
  for (let i = 0; i < 4; i++) w = spend(w, "maker-1", [{ coin: "IDZ", amount: String(i + 1) }]);
  w = spend(w, "maker-2", [{ coin: "IDZ", amount: "9" }]);
  const recent = rv.recentOf(w, "maker-1");
  assert.equal(recent.length, 3);
  assert.ok(recent.every((a) => a.identity === "maker-1"));
  const line = rv.activityLineOf(MINT_ACTIVITY());
  assert.match(line.text, /^Minted on chain · Car · \w{3} \d{1,2}, 2026 · \d{1,2}:\d{2} [AP]M$/);
  assert.equal(line.charge, "−4 IDZ, −0.00104 ETH");
});

function MINT_ACTIVITY() {
  return rv.activityOf(MINT, { identity: "maker-1", address: demoAddress("maker-1"), at: NOW, txHash: "0x" + "b".repeat(64) }, "act_x");
}

test("menuEntryOf: not read, disconnected, connected (P2-MINT-2's table)", () => {
  assert.deepEqual(rv.menuEntryOf(undefined), { title: "Wallet", detail: null, demo: false });
  assert.deepEqual(rv.menuEntryOf(defaultWallet()), { title: "Connect wallet", detail: null, demo: true });
  const on = walletConnect(defaultWallet(), "maker-1");
  assert.deepEqual(rv.menuEntryOf(on), {
    title: "Connected: 0x955d…ed95",
    detail: "Demo account 1 · Base Sepolia (Testnet)",
    demo: true,
  });
  const two = walletConnect(on, "maker-2");
  assert.equal(rv.menuEntryOf(two).title, "Connected: 0x2b10…3c00");
});

test("activityOf: a mint's charge is the debit; a purchase's is left to its Sale", () => {
  const a = MINT_ACTIVITY();
  assert.equal(a.title, "Minted on chain · Car");
  assert.deepEqual(a.charge, MINT.charge);
  assert.equal(a.txHash, "0x" + "b".repeat(64));
  const buy = rv.activityOf(
    { ...MINT, purpose: "purchase", title: "Buy Car", summary: [], charge: { network: "baseSepolia", lines: [{ coin: "ETH", amount: "0.5" }] } },
    { identity: "buyer-mira", address: demoAddress("buyer-mira"), at: NOW, txHash: "0x1" },
    "act_y",
  );
  assert.equal(buy.charge, undefined);
  assert.equal(buy.title, "Buy Car");
  const signed = rv.activityOf(SIGN, { identity: "maker-1", address: "0x", at: NOW, signature: "0xsig" }, "act_z", "proj_1");
  assert.equal(signed.title, "Signed a lazy mint · Car");
  assert.equal(signed.charge, undefined);
  assert.equal(signed.projectId, "proj_1");
});

test("demo hashes are 0x-hex of the right length, and deterministic", () => {
  assert.match(rv.demoTxHashOf("s1"), /^0x[0-9a-f]{64}$/);
  assert.match(rv.demoSignatureOf("s1"), /^0x[0-9a-f]{130}$/);
  assert.equal(rv.demoTxHashOf("s1"), rv.demoTxHashOf("s1"));
  assert.notEqual(rv.demoTxHashOf("s1"), rv.demoTxHashOf("s2"));
  const p = rv.proofOf(MINT, "maker-1", NOW, rv.demoTxHashOf("s1"));
  assert.equal(p.address, demoAddress("maker-1"));
  assert.ok(p.txHash && !p.signature);
  assert.ok(rv.proofOf(SIGN, "maker-1", NOW, "0xs").signature);
});

test("walletFactLineOf: balance on a connected instant mint, and the can't-afford warning", () => {
  const m = { market: EMPTY_MARKET, now: NOW };
  const on = walletConnect(defaultWallet(), "maker-1");
  assert.equal(
    rv.walletFactLineOf(on, { type: "instant", network: "baseSepolia" }, m).line,
    "Demo account 1 · 0x955d…ed95 · Balance 40 IDZ · 0.05 ETH",
  );
  assert.equal(rv.walletFactLineOf(on, { type: "lazy", network: "baseSepolia" }, m).line, "Demo account 1 · 0x955d…ed95");
  assert.equal(
    rv.walletFactLineOf(defaultWallet(), { type: "instant", network: "baseSepolia" }, m).line,
    "No wallet connected — you'll connect the demo wallet when you pay.",
  );
  const poor = spend(on, "maker-1", [{ coin: "IDZ", amount: "38" }]);
  const warn = rv.walletFactLineOf(poor, { type: "instant", network: "baseSepolia" }, m);
  assert.equal(warn.tone, "warning");
  assert.equal(
    warn.line,
    "Not enough IDZ for an instant mint — you have 2, it needs 4. Lazy mint costs nothing now, or switch demo account in your wallet.",
  );
  assert.equal(
    rv.mintShortfallOf(poor, "instant", "baseSepolia", m).missing,
    "Not enough IDZ for an instant mint — choose Lazy mint or switch demo account.",
  );
  assert.equal(rv.mintShortfallOf(poor, "lazy", "baseSepolia", m), null);
});
