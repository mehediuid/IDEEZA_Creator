// Balances, derived — never stored (Phase 2 spec §3.5.3, C4).
import { test } from "node:test";
import assert from "node:assert/strict";

const { affordOf, availableOf, balancesOf, heldBy } = await import("../../.tmp-test/lib/wallet/balances.js");
const { walletConnect, defaultWallet, pushActivity, demoAddress } = await import("../../.tmp-test/lib/wallet/demo-wallet.js");
const { addAmounts } = await import("../../.tmp-test/lib/wallet/money.js");

const NOW = Date.UTC(2026, 8, 28, 12, 0, 0);

const EMPTY_MARKET = { listings: [], sales: [], bids: [], support: [], unreadable: false };

function ctx(wallet, market = EMPTY_MARKET) {
  return { wallet, market, now: NOW };
}

test("balancesOf('maker-1') fresh: 40 IDZ, 0.05 ETH, 0.5 MATIC", () => {
  const bal = balancesOf("maker-1", ctx(undefined));
  assert.equal(bal.idz, "40");
  assert.equal(bal.native.baseSepolia.ETH, "0.05");
  assert.equal(bal.native.mumbai.MATIC, "0.5");
});

test("an instant-mint charge (4 IDZ + 0.00104 ETH) leaves 36 IDZ / 0.04896 ETH", () => {
  let w = walletConnect(defaultWallet(), "maker-1");
  w = pushActivity(w, {
    id: "act_1",
    at: NOW - 1000,
    identity: "maker-1",
    network: "baseSepolia",
    kind: "transaction",
    title: "Minted on chain · Car",
    charge: { network: "baseSepolia", lines: [{ coin: "IDZ", amount: "4" }, { coin: "ETH", amount: "0.00104" }] },
  });
  const bal = balancesOf("maker-1", ctx(w));
  assert.equal(bal.idz, "36");
  assert.equal(bal.native.baseSepolia.ETH, "0.04896");
});

function saleFixture(overrides = {}) {
  return {
    id: "sale_1",
    listingId: "lst_1",
    projectId: "proj_1",
    at: NOW - 5000,
    buyerId: "buyer-mira",
    buyerAddress: demoAddress("buyer-mira"),
    sellerAddress: demoAddress("maker-1"),
    item: { nft: "main", sharePct: 10 },
    via: "buyNow",
    token: "MATIC",
    price: "0.05",
    fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } },
    payout: "0.04875",
    royaltiesPct: 5,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1,
    network: "mumbai",
    collection: "Test Collection",
    benefits: [],
    txHash: "0xabc",
    demo: true,
    ...overrides,
  };
}

test("buyer-mira, after buying at 0.05 MATIC with a 0.021 network fee, has 9.929 MATIC", () => {
  const market = { ...EMPTY_MARKET, sales: [saleFixture()] };
  const bal = balancesOf("buyer-mira", ctx(undefined, market));
  assert.equal(bal.native.mumbai.MATIC, "9.929"); // 10 − 0.05 − 0.021
});

test("the seller's address is credited the payout, on top of its own seed", () => {
  const market = { ...EMPTY_MARKET, sales: [saleFixture()] };
  const bal = balancesOf("maker-1", ctx(undefined, market));
  assert.equal(bal.native.mumbai.MATIC, addAmounts("0.5", "0.04875")); // seed + payout
});

test("a sale credited to a different address doesn't touch maker-1's balance", () => {
  const market = { ...EMPTY_MARKET, sales: [saleFixture({ sellerAddress: demoAddress("maker-2") })] };
  const bal = balancesOf("maker-1", ctx(undefined, market));
  assert.equal(bal.native.mumbai.MATIC, "0.5"); // unchanged
});

function liveAuction(overrides = {}) {
  return {
    id: "lst_auction",
    projectId: "proj_2",
    slot: "main",
    source: "page",
    listedAt: NOW - 100000,
    updatedAt: NOW - 100000,
    type: "auction",
    token: "MATIC",
    minBid: "0.01",
    endsAt: NOW + 100000,
    percentSelling: 10,
    royaltiesPct: 5,
    mintingType: "lazy",
    network: "mumbai",
    collection: "Test Collection",
    benefits: [],
    metadata: { name: "x", description: "", products: [], cover: null, at: 0 },
    status: "live",
    events: [],
    ...overrides,
  };
}

test("Mira's live top bid of 0.04 lowers availableOf by 0.04", () => {
  const market = {
    ...EMPTY_MARKET,
    listings: [liveAuction()],
    bids: [{ id: "bid_1", listingId: "lst_auction", bidderId: "buyer-mira", amount: "0.04", token: "MATIC", at: NOW - 2000 }],
  };
  const available = availableOf("buyer-mira", "MATIC", "mumbai", ctx(undefined, market));
  assert.equal(available, "9.96"); // 10 − 0.04
  const held = heldBy("buyer-mira", { market, now: NOW });
  assert.equal(held.native.mumbai.MATIC, "0.04");
});

test("an auction sold through Buy now releases its bidders' holds", () => {
  const market = {
    ...EMPTY_MARKET,
    listings: [liveAuction()],
    bids: [{ id: "bid_1", listingId: "lst_auction", bidderId: "buyer-leo", amount: "0.06", token: "MATIC", at: NOW - 2000 }],
    sales: [{ id: "sale_1", listingId: "lst_auction", projectId: "proj_2", at: NOW - 1000, buyerId: "buyer-mira" }],
  };
  const held = heldBy("buyer-leo", { market, now: NOW });
  assert.equal(held.native.mumbai?.MATIC ?? "0", "0");
});

test("an outbid bidder holds nothing", () => {
  const market = {
    ...EMPTY_MARKET,
    listings: [liveAuction()],
    bids: [
      { id: "bid_1", listingId: "lst_auction", bidderId: "buyer-mira", amount: "0.04", token: "MATIC", at: NOW - 3000 },
      { id: "bid_2", listingId: "lst_auction", bidderId: "buyer-leo", amount: "0.05", token: "MATIC", at: NOW - 1000 },
    ],
  };
  const available = availableOf("buyer-mira", "MATIC", "mumbai", ctx(undefined, market));
  assert.equal(available, "10"); // Mira was outbid — nothing of hers is held
});

test("a live auction ended by now holds nothing", () => {
  const market = { ...EMPTY_MARKET, listings: [liveAuction({ endsAt: NOW - 1 })], bids: [{ id: "b", listingId: "lst_auction", bidderId: "buyer-mira", amount: "0.04", token: "MATIC", at: NOW - 3000 }] };
  const held = heldBy("buyer-mira", { market, now: NOW });
  assert.deepEqual(held.native, {});
});

test("affordOf: a short line reports the coin, what's had and what's needed", () => {
  const charge = { network: "baseSepolia", lines: [{ coin: "IDZ", amount: "4" }] };
  const result = affordOf("buyer-mira", charge, ctx(undefined)); // buyers seed 0 IDZ
  assert.deepEqual(result, { ok: false, short: "IDZ", have: "0", need: "4" });
});

test("affordOf: ok when every line is covered", () => {
  const charge = { network: "baseSepolia", lines: [{ coin: "IDZ", amount: "4" }, { coin: "ETH", amount: "0.00104" }] };
  assert.deepEqual(affordOf("maker-1", charge, ctx(undefined)), { ok: true });
});
