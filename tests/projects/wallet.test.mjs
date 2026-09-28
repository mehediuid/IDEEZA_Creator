// The demo wallet store (Phase 2 spec §3.5.3; P2-MINT-1): deterministic
// addresses, and a v1 or corrupt record normalizing to the default v2.
import { test } from "node:test";
import assert from "node:assert/strict";

const { demoAddress, demoHex, defaultWallet, normalizeWallet, shortAddress, walletConnect, walletDisconnect, walletSwitchAccount, walletSwitchNetwork, pushActivity } =
  await import("../../.tmp-test/lib/wallet/demo-wallet.js");
const { DEMO_ACCOUNTS, DEMO_BUYERS, activeBuyerOf, buyerLabel } = await import("../../.tmp-test/lib/wallet/identities.js");

test("MINT-1's three address vectors are deterministic in every browser", () => {
  assert.equal(demoAddress("maker-1"), "0x955de749945de5b6935de423925de290995ded95");
  assert.equal(demoAddress("maker-2"), "0x2b10424c2c1043df2d1045722e10470527103c00");
  assert.equal(demoAddress("maker-3"), "0xd0386d77cf386be4d238709dd1386f0acc38672b");
});

test("shortAddress: the first 6 characters, an ellipsis, then the last 4", () => {
  assert.equal(shortAddress(demoAddress("maker-1")), "0x955d…ed95");
});

test("demoHex(input,n): FNV-1a-32 over input+\"#\"+i, 8 hex chars each, cut to n", () => {
  assert.equal(demoHex("a", 8).length, 8);
  assert.match(demoHex("a", 8), /^[0-9a-f]{8}$/);
  assert.equal(demoHex("x", 40).length, 40);
  assert.equal(demoHex("x", 40), demoHex("x", 64).slice(0, 40)); // cut to n, not re-derived
});

test("DEMO_ACCOUNTS carries the three labels and addresses", () => {
  assert.deepEqual(
    DEMO_ACCOUNTS.map((a) => a.label),
    ["Demo account 1", "Demo account 2", "Demo account 3"],
  );
  assert.equal(DEMO_ACCOUNTS[0].address, demoAddress("maker-1"));
});

test("normalizeWallet: corrupt JSON gives the default v2", () => {
  const bad = normalizeWallet(JSON.parse("null"));
  assert.deepEqual(bad, defaultWallet());
  assert.equal(bad.v, 2);
  assert.equal(bad.account, 1);
  assert.equal(bad.identities["maker-1"].connected, false);
  assert.equal(bad.identities["maker-1"].network, "baseSepolia");
  assert.deepEqual(bad.activity, []);
});

test("normalizeWallet: a v1 record (no `identities`) also gives the default v2", () => {
  const v1 = { v: 1, connected: true, account: 2, network: "mumbai", balances: {}, activity: [] };
  assert.deepEqual(normalizeWallet(v1), defaultWallet());
});

test("normalizeWallet: a valid v2 record round-trips, and a corrupt identity sanitizes", () => {
  const w = walletConnect(defaultWallet(), "maker-2");
  const round = normalizeWallet(JSON.parse(JSON.stringify(w)));
  assert.equal(round.account, 2);
  assert.equal(round.identities["maker-2"].connected, true);

  const corrupt = { ...w, identities: { ...w.identities, "maker-1": "not an object" } };
  const fixed = normalizeWallet(corrupt);
  assert.equal(fixed.identities["maker-1"].connected, false);
  assert.equal(fixed.identities["maker-1"].network, "baseSepolia");
});

test("walletConnect / walletDisconnect: disconnect keeps the account, connect again is the same address", () => {
  let w = defaultWallet();
  w = walletConnect(w, "maker-1");
  assert.equal(w.identities["maker-1"].connected, true);
  assert.equal(w.account, 1);

  w = walletDisconnect(w, "maker-1");
  assert.equal(w.identities["maker-1"].connected, false);
  assert.equal(w.account, 1); // the chosen account survives a disconnect

  w = walletConnect(w, "maker-1");
  assert.equal(demoAddress("maker-1"), "0x955de749945de5b6935de423925de290995ded95"); // unchanged
});

test("walletSwitchAccount: connected stays connected across a switch", () => {
  let w = walletConnect(defaultWallet(), "maker-1");
  w = walletSwitchAccount(w, 2);
  assert.equal(w.account, 2);
  assert.equal(w.identities["maker-2"].connected, true);
});

test("walletSwitchNetwork sets one identity's network", () => {
  let w = walletConnect(defaultWallet(), "maker-1");
  w = walletSwitchNetwork(w, "maker-1", "mumbai");
  assert.equal(w.identities["maker-1"].network, "mumbai");
  assert.equal(w.identities["maker-2"].network, "baseSepolia"); // untouched
});

test("pushActivity prepends, newest first, and is never pruned", () => {
  let w = defaultWallet();
  for (let i = 0; i < 25; i += 1) {
    w = pushActivity(w, { id: `a${i}`, at: i, identity: "maker-1", network: "baseSepolia", kind: "signature", title: "x" });
  }
  assert.equal(w.activity.length, 25); // v2: never pruned (C4) — balances sum every one of them
  assert.equal(w.activity[0].id, "a24");
});

test("activeBuyerOf: an unknown or missing id defaults to Mira", () => {
  assert.equal(activeBuyerOf("bogus").name, "Mira");
  assert.equal(activeBuyerOf(null).name, "Mira");
  assert.equal(activeBuyerOf(undefined).name, "Mira");
  assert.equal(activeBuyerOf("buyer-leo").name, "Leo");
});

test("buyerLabel names a buyer without ever reading as a real identity", () => {
  assert.equal(buyerLabel("buyer-mira"), "Mira (demo buyer)");
  assert.equal(DEMO_BUYERS.map((b) => b.id).join(","), "buyer-mira,buyer-leo,buyer-sam");
});
