// The wallet request dialog's model (Phase 2 spec §3.5.3; MINT-3): the gate,
// what a mid-flight wallet change means, and the phase table's copy.
import { test } from "node:test";
import assert from "node:assert/strict";

const { TIMING, failureOf, gateOf, requestCopy } = await import("../../.tmp-test/lib/wallet/request.js");
const { defaultWallet, walletConnect, walletDisconnect, walletSwitchAccount, walletSwitchNetwork } = await import(
  "../../.tmp-test/lib/wallet/demo-wallet.js"
);

const makerReq = {
  kind: "signature",
  purpose: "lazyMint",
  identity: "maker",
  network: "baseSepolia",
  title: "Mint Car",
  summary: [{ label: "Project", value: "Car" }],
  note: "You're signing a mint voucher.",
  doneLine: "Token #1 is reserved for Car.",
};

const buyerReq = {
  kind: "transaction",
  purpose: "purchase",
  identity: "buyer-mira",
  network: "mumbai",
  title: "Buy Car",
  summary: [{ label: "Project", value: "Car" }],
  note: "",
  doneLine: "Token #1",
  charge: { network: "mumbai", lines: [{ coin: "MATIC", amount: "0.071" }] },
};

test("TIMING matches MINT-3's phase durations", () => {
  assert.deepEqual(TIMING, { connect: 600, switch: 500, sign: 900, confirm: 2400 });
});

test("gateOf, for the maker: connect → wrongNetwork → review", () => {
  assert.equal(gateOf(makerReq, undefined), "connect");
  assert.equal(gateOf(makerReq, defaultWallet()), "connect");
  const onMumbai = walletSwitchNetwork(walletConnect(defaultWallet(), "maker-1"), "maker-1", "mumbai");
  assert.equal(gateOf(makerReq, onMumbai), "wrongNetwork"); // req wants baseSepolia
  const onBase = walletConnect(defaultWallet(), "maker-1");
  assert.equal(gateOf(makerReq, onBase), "review");
});

test("gateOf, for a buyer identity: connect → wrongNetwork → review", () => {
  assert.equal(gateOf(buyerReq, undefined), "connect");
  const onBase = walletConnect(defaultWallet(), "buyer-mira"); // default network is baseSepolia, req wants mumbai
  assert.equal(gateOf(buyerReq, onBase), "wrongNetwork");
  const onMumbai = walletSwitchNetwork(walletConnect(defaultWallet(), "buyer-mira"), "buyer-mira", "mumbai");
  assert.equal(gateOf(buyerReq, onMumbai), "review");
});

test("failureOf: a disconnect ends the request", () => {
  const before = walletConnect(defaultWallet(), "maker-1");
  const after = walletDisconnect(before, "maker-1");
  assert.equal(failureOf(before, after, "maker-1"), "walletDisconnected");
});

test("failureOf: a network change ends the request", () => {
  const before = walletConnect(defaultWallet(), "maker-1");
  const after = walletSwitchNetwork(before, "maker-1", "mumbai");
  assert.equal(failureOf(before, after, "maker-1"), "networkChanged");
});

test("failureOf: an account change ends a maker's request", () => {
  const before = walletConnect(defaultWallet(), "maker-1");
  const after = walletSwitchAccount(before, 2);
  assert.equal(failureOf(before, after, "maker-1"), "accountChanged");
});

test("failureOf: nothing that matters moved → null", () => {
  const before = walletConnect(defaultWallet(), "maker-1");
  const after = { ...before };
  assert.equal(failureOf(before, after, "maker-1"), null);
});

test("requestCopy: connect", () => {
  const c = requestCopy("connect", makerReq, undefined);
  assert.equal(c.title, "Connect a wallet to continue.");
  assert.ok(c.body.some((l) => l.includes("testnet demo wallet")));
  assert.equal(c.primary, "Connect demo wallet");
  assert.deepEqual(c.secondary, ["Cancel"]);
});

test("requestCopy: connecting and switching are busy, cancellable phases", () => {
  assert.equal(requestCopy("connecting", makerReq, undefined).primary, "Connecting…");
  assert.deepEqual(requestCopy("connecting", makerReq, undefined).secondary, ["Cancel"]);
  assert.equal(requestCopy("switching", makerReq, undefined).primary, "Switching…");
});

test("requestCopy: wrongNetwork names both networks and offers the switch", () => {
  const onMumbai = walletSwitchNetwork(walletConnect(defaultWallet(), "maker-1"), "maker-1", "mumbai");
  const c = requestCopy("wrongNetwork", makerReq, onMumbai);
  assert.match(c.title, /Mumbai Testnet \(Polygon\)/);
  assert.match(c.title, /Base Sepolia \(Testnet\)/);
  assert.equal(c.primary, "Switch to Base Sepolia (Testnet)");
});

test("requestCopy: review, a signature — \"You pay now: Nothing\", then the note", () => {
  const c = requestCopy("review", makerReq, walletConnect(defaultWallet(), "maker-1"));
  assert.ok(c.body.includes("You pay now: Nothing"));
  assert.ok(c.body.includes(makerReq.note));
  assert.equal(c.primary, "Sign");
  assert.deepEqual(c.secondary, ["Reject"]);
});

test("requestCopy: review, a transaction — the note, and Confirm and pay", () => {
  const c = requestCopy("review", buyerReq, walletConnect(defaultWallet(), "buyer-mira"));
  assert.equal(c.primary, "Confirm and pay");
  assert.deepEqual(c.secondary, ["Reject"]);
});

test("requestCopy: review has no affordability line of its own — shortfallOf reads the full market (errata 29)", () => {
  const req = {
    kind: "transaction",
    purpose: "instantMint",
    identity: "maker",
    network: "baseSepolia",
    title: "Mint Car",
    summary: [],
    note: "Minted on chain now.",
    doneLine: "Minted on chain.",
    charge: { network: "baseSepolia", lines: [{ coin: "IDZ", amount: "4" }] },
  };
  const c = requestCopy("review", req, walletConnect(defaultWallet(), "maker-1"), "insufficientFunds");
  assert.deepEqual(c.body, ["Minted on chain now."]);
  assert.equal(c.primary, "Confirm and pay");
  assert.deepEqual(c.secondary, ["Reject"]);
});

test("requestCopy: signing and pending", () => {
  const signing = requestCopy("signing", makerReq, undefined);
  assert.equal(signing.primary, "Waiting for your signature…");
  const pending = requestCopy("pending", buyerReq, undefined);
  assert.equal(pending.title, "Transaction submitted.");
  assert.ok(pending.body.some((l) => l.includes("Waiting for confirmation on Mumbai Testnet (Polygon)")));
  assert.ok(pending.body.some((l) => l.includes("A submitted transaction can't be cancelled.")));
  assert.equal(pending.primary, undefined); // no primary — Escape does nothing here
});

test("requestCopy: confirmed carries the request's own doneLine", () => {
  const signatureDone = requestCopy("confirmed", makerReq, undefined);
  assert.equal(signatureDone.title, "Signed.");
  assert.ok(signatureDone.body.includes(makerReq.doneLine));
  assert.equal(signatureDone.primary, "Done");

  const txDone = requestCopy("confirmed", buyerReq, undefined);
  assert.equal(txDone.title, "Confirmed.");
});

test("requestCopy: rejected", () => {
  const c = requestCopy("rejected", makerReq, undefined);
  assert.equal(c.title, "Request rejected.");
  assert.ok(c.body.some((l) => l.includes("You rejected it in your wallet. Nothing was signed or charged.")));
  assert.equal(c.primary, "Try again");
  assert.deepEqual(c.secondary, ["Close"]);
});

test("requestCopy: failed, every static reason from MINT-3's table", () => {
  const cases = {
    walletDisconnected: "Your wallet disconnected before it confirmed.",
    networkChanged: "Your wallet switched network before it confirmed.",
    accountChanged: "Your wallet switched account before it confirmed.",
    storageFailed: "This browser couldn't save it — storage is full or blocked.",
  };
  for (const [reason, line] of Object.entries(cases)) {
    const c = requestCopy("failed", makerReq, undefined, reason);
    assert.ok(c.body.includes(line), reason);
    assert.ok(c.body.includes("Nothing was charged."), reason);
    assert.equal(c.primary, "Try again");
  }
});

test("requestCopy: failed, insufficientFunds — a fixed line; the dialog names the balance from the full market", () => {
  const req = { ...makerReq, kind: "transaction", charge: { network: "baseSepolia", lines: [{ coin: "IDZ", amount: "4" }] } };
  const c = requestCopy("failed", req, walletConnect(defaultWallet(), "maker-1"), "insufficientFunds");
  assert.deepEqual(c.body, ["Your balance changed before it confirmed.", "Nothing was charged."]);
  assert.equal(c.primary, "Try again");
});
