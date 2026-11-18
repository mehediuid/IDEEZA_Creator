// Buying a Feed sample project on the phone (mobile Figma "Project Details · 2026 update"
// 18b–18e): the listing rows as offers, the Main NFT sold once as the whole project, copies up to
// their supply and off the marketplace once the project is sold in full, the wallet request that
// really debits the demo buyer, and the stored list read back safely.
import { test } from "node:test";
import assert from "node:assert/strict";

const s = await import("../../.tmp-test/lib/market/phone-sample-sales.js");
const rv = await import("../../.tmp-test/lib/wallet/request-view.js");
const bal = await import("../../.tmp-test/lib/wallet/balances.js");

const post = {
  license: "Commercial use",
  listing: {
    href: "/marketplace",
    rows: [
      { label: "Virtual copy", price: "0.015 ETH" },
      { label: "Whole project (Main NFT)", price: "0.30 ETH" },
      { label: "Physical copy · 6 of 7 sold", price: "0.04 ETH" },
      { label: "Something else", price: "1 ETH" },
    ],
  },
};

const sale = (over) => ({
  id: `s_${Math.random()}`,
  projectId: "p1",
  kind: "virtual",
  name: "Virtual NFT · Business use",
  buyerId: "buyer-mira",
  buyerAddress: "0x1",
  price: "0.015",
  token: "ETH",
  network: "baseSepolia",
  networkFee: "0.00104",
  serial: 1,
  txHash: "0xabc",
  at: 1,
  demo: true,
  ...over,
});

test("prices read only as an amount and a known token", () => {
  assert.deepEqual(s.parsePrice("0.25 ETH"), { amount: "0.25", token: "ETH" });
  assert.deepEqual(s.parsePrice(" 0.30 ETH "), { amount: "0.3", token: "ETH" });
  assert.equal(s.parsePrice("0 ETH"), null);
  assert.equal(s.parsePrice("0.25 DOGE"), null);
  assert.equal(s.parsePrice("free"), null);
});

test("the rows become offers, the Main NFT first, in the owner's licence words", () => {
  const offers = s.sampleOffersOf(post);
  assert.deepEqual(
    offers.map((o) => [o.kind, o.name, o.price]),
    [
      ["main", "Main NFT", "0.3"],
      ["physical", "Physical NFT · Business use", "0.04"],
      ["virtual", "Virtual NFT · Business use", "0.015"],
    ],
  );
  assert.deepEqual(offers[1].sold, { count: 6, of: 7 });
  assert.deepEqual(s.sampleOffersOf({ license: null, listing: null }), []);
});

test("the Main NFT sells once, and selling it takes the copies off", () => {
  const [main, physical, virtual] = s.sampleOffersOf(post);
  assert.equal(s.sampleBuyBlock(main, "p1", []), null);
  const sold = [sale({ kind: "main", name: "Main NFT", serial: null, price: "0.3", buyerId: "buyer-leo" })];
  assert.equal(s.offerStateOf(main, "p1", sold).soldTo?.buyerId, "buyer-leo");
  assert.equal(s.sampleBuyBlock(main, "p1", sold), s.JUST_SOLD);
  assert.equal(s.sampleBuyBlock(virtual, "p1", sold), s.SOLD_IN_FULL);
  assert.equal(s.offerStateOf(physical, "p1", sold).locked, true);
  assert.equal(s.sampleBuyBlock(main, "p2", sold), null, "another project's sale changes nothing");
});

test("a copy row sells up to its supply and numbers each copy", () => {
  const [, physical, virtual] = s.sampleOffersOf(post);
  assert.equal(s.nextSampleSerial(physical, "p1", []), 7);
  const one = [sale({ kind: "physical", serial: 7 })];
  assert.deepEqual(
    { count: s.offerStateOf(physical, "p1", one).count, soldOut: s.offerStateOf(physical, "p1", one).soldOut },
    { count: 7, soldOut: true },
  );
  assert.equal(s.sampleBuyBlock(physical, "p1", one), s.SOLD_OUT);
  assert.equal(s.nextSampleSerial(virtual, "p1", one), 1, "a row with no supply counts from 1");
  assert.equal(s.sampleBuyBlock(virtual, "p1", [sale({}), sale({})]), null, "no supply, no sell-out");
  assert.equal(s.nextSampleSerial(s.sampleOffersOf(post)[0], "p1", []), null);
});

test("the holding is the active buyer's, newest first", () => {
  const all = [sale({ at: 1 }), sale({ at: 3, kind: "main", serial: null }), sale({ at: 2, buyerId: "buyer-leo" })];
  assert.deepEqual(
    s.sampleHoldingOf("p1", "buyer-mira", all).map((x) => x.at),
    [3, 1],
  );
  assert.deepEqual(s.sampleHoldingOf("p1", "buyer-sam", all), []);
});

test("the request is the buyer's transaction: price + network fee, the web's rows and words", () => {
  const [main, physical] = s.sampleOffersOf(post);
  const req = s.sampleRequestOf({ title: "Air Monitor", offer: main, buyerId: "buyer-mira", serial: null });
  assert.equal(req.purpose, "purchase");
  assert.equal(req.identity, "buyer-mira");
  assert.equal(req.network, "baseSepolia");
  assert.equal(req.offMarket, true);
  assert.deepEqual(req.charge.lines, [
    { coin: "ETH", amount: "0.3" },
    { coin: "ETH", amount: "0.00104" },
  ]);
  assert.equal(req.summary[0].value, "Air Monitor · 100% of the project");
  assert.match(req.summary.at(-1).value, /^Mira's demo wallet · 0x/);
  assert.match(req.note, /^Includes the 2\.5% IDEEZA fee|^Includes IDEEZA fee/);
  assert.equal(req.doneLine, "You own 100% of Air Monitor. The token moved to Mira's demo wallet.");
  const copy = s.sampleRequestOf({ title: "Air Monitor", offer: physical, buyerId: "buyer-leo", serial: 7 });
  assert.equal(copy.summary[1].value, "Physical NFT · Business use · #7 of 7");
  assert.equal(copy.doneLine, "Air Monitor · Physical NFT · Business use was minted to Leo's demo wallet.");
});

test("an off-market purchase debits the buyer once, through the wallet line", () => {
  const [main] = s.sampleOffersOf(post);
  const req = s.sampleRequestOf({ title: "Air Monitor", offer: main, buyerId: "buyer-mira", serial: null });
  const proof = { identity: "buyer-mira", address: "0x1", at: 5, txHash: "0xdef" };
  const line = rv.activityOf(req, proof, "act_1");
  assert.deepEqual(line.charge, { network: "baseSepolia", lines: [{ coin: "ETH", amount: "0.30104" }] });
  const market = { listings: [], sales: [], bids: [], support: [], unreadable: false };
  const wallet = { v: 2, account: 1, identities: {}, activity: [line] };
  assert.equal(bal.availableOf("buyer-mira", "ETH", "baseSepolia", { wallet, market, now: 10 }), "0.69896");
  const marketReq = { ...req, offMarket: undefined };
  assert.equal(rv.activityOf(marketReq, proof, "act_2").charge, undefined, "a market purchase stays debited by its Sale");
});

test("a sale is recorded unless the offer closed meanwhile", () => {
  const [main] = s.sampleOffersOf(post);
  const made = s.makeSampleSale({
    id: "x",
    projectId: "p1",
    offer: main,
    buyerId: "buyer-sam",
    buyerAddress: "0x9",
    serial: 4,
    txHash: "0x1",
    at: 9,
  });
  assert.equal(made.serial, null, "the Main NFT has no serial");
  assert.equal(made.networkFee, "0.00104");
  const ok = s.withSampleSale([], main, made);
  assert.equal(ok.ok, true);
  const again = s.withSampleSale(ok.sales, main, { ...made, id: "y" });
  assert.deepEqual(again, { ok: false, message: s.JUST_SOLD });
});

test("the stored list drops what doesn't read and keeps the rest", () => {
  const good = sale({});
  const out = s.normalizeSampleSales([good, { ...good, buyerId: "nobody" }, { ...good, price: "lots" }, "junk", { ...good, serial: 0 }]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], good);
  assert.deepEqual(s.normalizeSampleSales({}), []);
});
