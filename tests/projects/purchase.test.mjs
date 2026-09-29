// The purchase quote and the one write a purchase makes (Phase 2 spec
// §3.5.5, P2-MARKETPLACE-14, -16, C11, C12).
import { test } from "node:test";
import assert from "node:assert/strict";

const { makeSale, purchaseQuote, txHashOf } = await import("../../.tmp-test/lib/market/purchase.js");

function listingFixture(overrides = {}) {
  return {
    id: "lst_1",
    projectId: "proj_1",
    slot: "main",
    source: "page",
    listedAt: 1000,
    updatedAt: 1000,
    type: "buyNow",
    token: "MATIC",
    price: "0.05",
    percentSelling: 10,
    royaltiesPct: 10,
    mintingType: "lazy",
    network: "mumbai",
    collection: "Test Collection",
    benefits: [],
    metadata: { name: "Car", description: "", products: [], cover: null, at: 1000 },
    status: "live",
    events: [],
    ...overrides,
  };
}

function saleInputFixture(overrides = {}) {
  return {
    listingId: "lst_1",
    projectId: "proj_1",
    buyerId: "buyer-mira",
    buyerAddress: "0xbuyer",
    sellerAddress: "0xseller",
    item: { nft: "main", sharePct: 10 },
    via: "buyNow",
    token: "MATIC",
    price: "0.05",
    royaltiesPct: 10,
    network: "mumbai",
    collection: "Test Collection",
    ...overrides,
  };
}

function mintViewFixture(overrides = {}) {
  return {
    status: "lazyMinted",
    record: {
      v: 1,
      demo: true,
      type: "lazy",
      network: "mumbai",
      collection: "Test Collection",
      tokenId: 1,
      wallet: { account: 1, address: "0xmaker" },
      at: 500,
    },
    tokenId: 1,
    settled: null,
    ...overrides,
  };
}

test("purchaseQuote(listing, 'buyNow'): the price, fee and payout, and the fee-disclosure line", () => {
  const quote = purchaseQuote(listingFixture(), "buyNow");
  assert.equal(quote.price, "0.05");
  assert.equal(quote.ideezaFee, "0.00125");
  assert.equal(quote.payout, "0.04875");
  assert.equal(quote.networkFee, "0.021");
  assert.ok(
    quote.lines.includes("Includes IDEEZA fee (2.5%) · 0.00125 MATIC — taken from the price, not added to it"),
    quote.lines.join("\n"),
  );
});

test("purchaseQuote: 'Buy now with X' reads the auction buy-now price", () => {
  const quote = purchaseQuote(listingFixture({ type: "auction", price: undefined, auctionBuyNow: "0.10" }), "auctionBuyNow");
  assert.equal(quote.price, "0.10");
});

test("makeSale: a lazy listing with a record at tokenId 1 gives tokenId 1 and mintedAtSale true", () => {
  const result = makeSale(saleInputFixture(), {
    sales: [],
    mint: mintViewFixture(),
    ownership: { creatorPct: 100 },
    now: 2000,
  });
  assert.equal(result.tokenId, 1);
  assert.equal(result.mintedAtSale, true);
  assert.equal(result.mint, "lazy");
});

test("makeSale: a second share sale (a new listing) keeps tokenId 1 with mintedAtSale false", () => {
  const priorSale = {
    id: "sale_first",
    listingId: "lst_1",
    projectId: "proj_1",
    at: 1500,
    buyerId: "buyer-mira",
    buyerAddress: "0xbuyer",
    sellerAddress: "0xseller",
    item: { nft: "main", sharePct: 10 },
    via: "buyNow",
    token: "MATIC",
    price: "0.05",
    fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } },
    payout: "0.04875",
    royaltiesPct: 10,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1,
    network: "mumbai",
    collection: "Test Collection",
    benefits: [],
    txHash: txHashOf("sale_first"),
    demo: true,
  };
  const result = makeSale(saleInputFixture({ listingId: "lst_2" }), {
    sales: [priorSale],
    mint: mintViewFixture({ status: "onChain", settled: { at: 1500, txHash: txHashOf("sale_first"), via: "sale" } }),
    ownership: { creatorPct: 90 },
    now: 3000,
  });
  assert.equal(result.tokenId, 1);
  assert.equal(result.mintedAtSale, false);
});

test("makeSale: fees.ideeza and payout for a 0.05 price", () => {
  const result = makeSale(saleInputFixture({ price: "0.05" }), {
    sales: [],
    mint: mintViewFixture(),
    ownership: { creatorPct: 100 },
    now: 2000,
  });
  assert.equal(result.fees.ideeza, "0.00125");
  assert.equal(result.payout, "0.04875");
});

test("makeSale: refuses a sold listing, a share above the creator's, and a bad amount", () => {
  const sold = makeSale(saleInputFixture({ listingId: "lst_sold" }), {
    sales: [
      {
        id: "sale_x",
        listingId: "lst_sold",
        projectId: "proj_1",
        at: 1,
        buyerId: "buyer-leo",
        buyerAddress: "0xleo",
        sellerAddress: "0xseller",
        item: { nft: "main", sharePct: 5 },
        via: "buyNow",
        token: "MATIC",
        price: "0.05",
        fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.021" } },
        payout: "0.04875",
        royaltiesPct: 10,
        mint: "lazy",
        mintedAtSale: true,
        tokenId: 1,
        network: "mumbai",
        collection: "Test Collection",
        benefits: [],
        txHash: txHashOf("sale_x"),
        demo: true,
      },
    ],
    mint: mintViewFixture(),
    ownership: { creatorPct: 95 },
    now: 2000,
  });
  assert.equal(sold.ok, false);
  assert.equal(sold.reason, "alreadySold");

  const overShare = makeSale(saleInputFixture({ item: { nft: "main", sharePct: 50 } }), {
    sales: [],
    mint: mintViewFixture(),
    ownership: { creatorPct: 20 },
    now: 2000,
  });
  assert.equal(overShare.ok, false);
  assert.equal(overShare.reason, "overShare");

  const badAmount = makeSale(saleInputFixture({ price: "not-a-number" }), {
    sales: [],
    mint: mintViewFixture(),
    ownership: { creatorPct: 100 },
    now: 2000,
  });
  assert.equal(badAmount.ok, false);
  assert.equal(badAmount.reason, "badAmount");
});

test("txHashOf: deterministic for a given id, 0x + 64 hex, different for a different id", () => {
  assert.equal(txHashOf("sale_abc"), txHashOf("sale_abc"));
  assert.notEqual(txHashOf("sale_abc"), txHashOf("sale_xyz"));
  assert.match(txHashOf("sale_abc"), /^0x[0-9a-f]{64}$/);
});

test("makeSale: an edition track sells one unit per sale — a prior unit's sale doesn't refuse the next (T27)", () => {
  const item = (serial) => ({
    nft: "physical",
    trackId: "ed_1",
    productId: "prd_1",
    productName: "Widget",
    use: "private",
    tier: "regular",
    serial,
  });
  const first = makeSale(saleInputFixture({ listingId: "ed_1", item: item(1), price: "0.01" }), {
    sales: [],
    mint: mintViewFixture({ status: "onChain", record: { ...mintViewFixture().record, type: "instant" } }),
    ownership: { creatorPct: 100 },
    now: 2000,
  });
  assert.ok(!("ok" in first));
  // Editions are always lazy: each unit is minted by its own sale, and carries no Main token id.
  assert.equal(first.mint, "lazy");
  assert.equal(first.mintedAtSale, true);
  assert.equal(first.tokenId, null);
  const second = makeSale(saleInputFixture({ listingId: "ed_1", item: item(2), price: "0.01" }), {
    sales: [first],
    mint: mintViewFixture(),
    ownership: { creatorPct: 100 },
    now: 3000,
  });
  assert.ok(!("ok" in second), JSON.stringify(second));
  assert.equal(second.item.serial, 2);
});

test("purchaseQuote(track, 'buyNow', tier, network): the tier's price on the project's chain (errata 9)", () => {
  const track = {
    id: "ed_1",
    projectId: "proj_1",
    productId: "prd_1",
    kind: "physical",
    use: "private",
    supply: { total: 10 },
    createdAt: 1,
    lazy: true,
    listing: { token: "ETH", regular: "0.01", extended: "0.02", royaltyPct: 5, listedAt: 1, updatedAt: 1 },
    demo: true,
  };
  const reg = purchaseQuote(track, "buyNow", "regular", "baseSepolia");
  const ext = purchaseQuote(track, "buyNow", "extended", "baseSepolia");
  assert.equal(reg.price, "0.01");
  assert.equal(ext.price, "0.02");
  assert.equal(ext.payout, "0.0195");
  assert.ok(reg.lines[0].endsWith("ETH"));
});

test("makeSale: while the project is sold in full, its editions are refused (R1-2)", () => {
  const item = { nft: "physical", trackId: "ed_1", productId: "prd_1", productName: "Widget", use: "private", tier: "regular", serial: 1 };
  const fullSale = { id: "sale_all", listingId: "lst_1", projectId: "proj_1", at: 1500, buyerId: "buyer-leo", item: { nft: "main", sharePct: 100 } };
  const refused = makeSale(saleInputFixture({ listingId: "ed_1", item, price: "0.01" }), {
    sales: [fullSale],
    mint: mintViewFixture(),
    ownership: { creatorPct: 0 },
    now: 2000,
  });
  assert.deepEqual(refused, {
    ok: false,
    reason: "locked",
    message: "This project was sold in full, so its NFTs aren't for sale any more.",
  });
  // The caller's own lock flag refuses too.
  assert.equal(
    makeSale(saleInputFixture({ listingId: "ed_1", item, price: "0.01" }), {
      sales: [], mint: mintViewFixture(), ownership: { creatorPct: 100 }, now: 2000, locked: true,
    }).reason,
    "locked",
  );
  // Co-owners holding everything without a sale is no lock.
  assert.ok(!("ok" in makeSale(saleInputFixture({ listingId: "ed_1", item, price: "0.01" }), {
    sales: [], mint: mintViewFixture(), ownership: { creatorPct: 0 }, now: 2000,
  })));
});
