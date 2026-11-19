// Selling a bought copy on (owner, 2026-11-19: "if I want to sell it again, complete that flow; and like the
// project's Earn, somewhere I see it all"): list, a new price, off sale, bought by another holder; who holds it after;
// what the price pays whom; and My projects following the copy to its new holder.
import { test } from "node:test";
import assert from "node:assert/strict";

const R = await import("../../.tmp-test/lib/market/resales.js");
const P = await import("../../.tmp-test/lib/market/purchases.js");
const S = await import("../../.tmp-test/lib/market/phone-sample-sales.js");
const U = await import("../../.tmp-test/lib/market/units.js");
const D = await import("../../.tmp-test/lib/demo/demo-purchases.js");
const K = await import("../../.tmp-test/lib/market/resale-desk.js");

const NOW = Date.UTC(2026, 10, 19, 9);
const DAY = 86_400_000;
const KEY = "p7:physical:Business use:#8";
const DRAFT = {
  copyKey: KEY,
  source: "sample",
  projectId: "p7",
  projectName: "Air quality room sensor",
  kind: "physical",
  use: "Business use",
  product: null,
  serial: 8,
  of: 50,
  token: "ETH",
  network: "baseSepolia",
  royaltyPct: 10,
};

function sampleSale(id, buyerId, serial, kind = "physical", name = "Physical NFT · Business use") {
  return S.makeSampleSale({
    id,
    projectId: "p7",
    offer: { kind, name, price: "0.05", token: "ETH" },
    buyerId,
    buyerAddress: `0x${buyerId}`,
    serial,
    txHash: `0x${id}`,
    at: NOW - 86_400_000,
  });
}

test("the price splits: the creator's royalty, IDEEZA's 2.5%, the rest to the seller, to the micro", () => {
  assert.deepEqual(R.resaleSplitOf("0.06", 10), { royalty: "0.006", fee: "0.0015", payout: "0.0525" });
  assert.deepEqual(R.resaleSplitOf("1", 5), { royalty: "0.05", fee: "0.025", payout: "0.925" });
  assert.deepEqual(R.resaleSplitOf("0.000001", 10), { royalty: "0", fee: "0", payout: "0.000001" });
  assert.equal(R.readPrice("0.06"), "0.06");
  assert.equal(R.readPrice("0"), null);
  assert.equal(R.readPrice("abc"), null);
  assert.equal(R.readPrice("0.0000001"), null, "more than 6 decimals doesn't read");
});

test("list, reprice, take off sale: only the holder, one live listing per copy", () => {
  const listed = R.listResale([], DRAFT, "buyer-mira", "buyer-mira", "0.06", NOW, "rs1");
  assert.ok(listed.ok);
  assert.equal(listed.resale.status, "listed");
  assert.equal(R.liveListingOf(KEY, "buyer-mira", listed.resales).id, "rs1");
  assert.deepEqual(R.listResale(listed.resales, DRAFT, "buyer-mira", "buyer-mira", "0.07", NOW, "rs2"), { ok: false, message: R.ALREADY_LISTED });
  assert.deepEqual(R.listResale([], DRAFT, "buyer-mira", "buyer-leo", "0.06", NOW, "rs2"), { ok: false, message: R.NOT_YOURS });
  assert.deepEqual(R.listResale([], DRAFT, "buyer-mira", "buyer-mira", "0", NOW, "rs2"), { ok: false, message: R.BAD_PRICE });

  const repriced = R.repriceResale(listed.resales, "rs1", "0.055", NOW + 1);
  assert.ok(repriced.ok);
  assert.equal(repriced.resale.price, "0.055");

  const off = R.cancelResale(repriced.resales, "rs1", NOW + 2);
  assert.ok(off.ok);
  assert.equal(R.liveListingOf(KEY, "buyer-mira", off.resales), null);
  assert.deepEqual(R.repriceResale(off.resales, "rs1", "0.05", NOW + 3), { ok: false, message: R.OFF_SALE });
  // Off sale, it can go up again.
  assert.ok(R.listResale(off.resales, DRAFT, "buyer-mira", "buyer-mira", "0.05", NOW + 4, "rs2").ok);
});

test("bought on: the copy, its licence and its units left move; the chain names the holder; no buying your own", () => {
  const listed = R.listResale([], DRAFT, "buyer-mira", "buyer-mira", "0.06", NOW, "rs1");
  assert.equal(R.resaleBuyBlock(listed.resales, "rs1", "buyer-mira", "buyer-mira"), R.OWN_LISTING);
  assert.equal(R.resaleBuyBlock(listed.resales, "rs1", "buyer-sam", "buyer-leo"), R.OFF_SALE, "the seller no longer holds it");

  const bought = R.buyResale(listed.resales, "rs1", { id: "buyer-sam", address: "0xsam" }, "buyer-mira", { at: NOW + 10, txHash: "0xabc" }, 50);
  assert.ok(bought.ok);
  assert.equal(bought.resale.status, "sold");
  assert.deepEqual(
    { ...bought.resale.sale, networkFee: undefined },
    { buyerId: "buyer-sam", buyerAddress: "0xsam", at: NOW + 10, txHash: "0xabc", royalty: "0.006", fee: "0.0015", payout: "0.0525", networkFee: undefined, unitsLeft: 50 },
  );
  assert.equal(R.holderOf(KEY, "buyer-mira", bought.resales), "buyer-sam");
  assert.equal(R.boughtOnOf(KEY, "buyer-sam", bought.resales).id, "rs1");
  assert.equal(R.resaleBuyBlock(bought.resales, "rs1", "buyer-leo", "buyer-sam"), R.JUST_SOLD);

  // Sam sells it on to Leo: the key stays, so does the chain.
  const again = R.listResale(bought.resales, DRAFT, "buyer-sam", "buyer-sam", "0.08", NOW + 20, "rs2");
  const leo = R.buyResale(again.resales, "rs2", { id: "buyer-leo", address: "0xleo" }, "buyer-sam", { at: NOW + 30, txHash: "0xdef" }, 50);
  assert.ok(leo.ok);
  assert.equal(R.holderOf(KEY, "buyer-mira", leo.resales), "buyer-leo");
  assert.deepEqual(R.chainOf(KEY, leo.resales).map((r) => r.id), ["rs1", "rs2"]);
  assert.deepEqual(R.soldByOf("buyer-mira", leo.resales).map((r) => r.id), ["rs1"]);

  // Units follow the key: Mira made 10, so Sam got 40; what Mira made stays hers.
  const log = [{ id: "o1", copyKey: KEY, holder: "buyer-mira", units: 10, at: NOW - 1 }];
  const samUnits = U.copyUnitsOf(KEY, 50, "buyer-sam", log);
  assert.deepEqual(samUnits, { allowance: 50, made: 10, madeByHolder: 0, left: 40 });
  assert.equal(R.handsOverOf(DRAFT, samUnits.left), "The copy, its Business use licence and 40 units left to make");
  assert.equal(R.handsOverOf({ kind: "virtual", use: "Personal use" }, null), "The copy and its Personal use licence");
});

test("My projects follows the copy: gone from the seller's lines into their sold list, in the buyer's lines from the seller", () => {
  const sales = [sampleSale("ps7", "buyer-mira", 7), sampleSale("ps8", "buyer-mira", 8)];
  const listed = R.listResale([], DRAFT, "buyer-mira", "buyer-mira", "0.06", NOW, "rs1");
  let mira = P.samplePurchasesOf(sales, "buyer-mira", listed.resales).find((p) => p.id === "p7");
  assert.equal(mira.count, 2);
  assert.equal(mira.forSale, 1);
  const eight = mira.lines[0].copies.find((c) => c.serial === 8);
  assert.deepEqual(eight.listing, { id: "rs1", price: "0.06", token: "ETH", listedAt: NOW });
  assert.ok(P.cardChipsOf(mira).includes("For sale ×1"));

  const bought = R.buyResale(listed.resales, "rs1", { id: "buyer-sam", address: "0xsam" }, "buyer-mira", { at: NOW + 10, txHash: "0xabc" }, 50);
  mira = P.samplePurchasesOf(sales, "buyer-mira", bought.resales).find((p) => p.id === "p7");
  assert.equal(mira.count, 1, "the sold copy left Mira's lines");
  assert.equal(mira.forSale, 0);
  assert.deepEqual(
    mira.sold.map((s) => [s.serial, s.to, s.price, s.payout, s.unitsLeft]),
    [[8, "Sam", "0.06", "0.0525", 50]],
  );
  assert.ok(P.cardChipsOf(mira).includes("Sold ×1"));
  assert.deepEqual(
    { price: mira.sold[0].bought.price, at: mira.sold[0].bought.at },
    { price: "0.05", at: NOW - 86_400_000 },
    "what Mira had paid the creator for it stays with the sale",
  );

  const sam = P.samplePurchasesOf(sales, "buyer-sam", bought.resales).find((p) => p.id === "p7");
  assert.equal(sam.count, 1);
  const copy = sam.lines[0].copies[0];
  assert.deepEqual([copy.serial, copy.from, copy.price, copy.at, copy.key], [8, "Mira", "0.06", NOW + 10, KEY]);
  assert.equal(sam.lines[0].use, "Business use", "the same licence");

  // Mira sells her last copy: the project stays in her Purchased, with what it earned.
  const d7 = { ...DRAFT, copyKey: "p7:physical:Business use:#7", serial: 7 };
  const l2 = R.listResale(bought.resales, d7, "buyer-mira", "buyer-mira", "0.05", NOW + 20, "rs2");
  const b2 = R.buyResale(l2.resales, "rs2", { id: "buyer-leo", address: "0xleo" }, "buyer-mira", { at: NOW + 30, txHash: "0xdef" }, 40);
  const gone = P.samplePurchasesOf(sales, "buyer-mira", b2.resales).find((p) => p.id === "p7");
  assert.equal(gone.count, 0);
  assert.equal(gone.lines.length, 0);
  assert.equal(gone.sold.length, 2);
  assert.equal(gone.lastAt, NOW + 30);
});

test("the wallet: a free signature to list, the buyer pays price + network fee, the payout and royalty paid once", () => {
  const listed = R.listResale([], DRAFT, "buyer-mira", "buyer-mira", "0.06", NOW, "rs1");
  const sign = R.resaleListRequestOf(DRAFT, "buyer-mira", "0.06", false);
  assert.equal(sign.kind, "signature");
  assert.equal(sign.identity, "buyer-mira");
  assert.equal(sign.charge, undefined, "nothing charged to list");
  assert.ok(sign.summary.some((r) => r.label === "You get" && r.value.startsWith("0.0525 ETH")));

  const pay = R.resaleBuyRequestOf(listed.resale, "buyer-sam", 50);
  assert.equal(pay.kind, "transaction");
  assert.equal(pay.offMarket, true);
  assert.equal(pay.charge.lines[0].amount, "0.06");
  assert.ok(pay.summary.some((r) => r.label === "You get" && /50 units left/.test(r.value)));

  const bought = R.buyResale(listed.resales, "rs1", { id: "buyer-sam", address: "0xsam" }, "buyer-mira", { at: NOW + 10, txHash: "0xabc" }, 50);
  const lines = R.missingPayoutsOf(bought.resales, new Set(), "maker-1");
  assert.deepEqual(lines.map((a) => [a.identity, a.credit.lines[0].amount]), [["buyer-mira", "0.0525"]], "a sample's creator isn't in this browser");
  assert.deepEqual(R.missingPayoutsOf(bought.resales, new Set(lines.map((a) => a.id)), "maker-1"), [], "paid once");

  const own = R.buyResale(
    R.listResale([], { ...DRAFT, source: "own", projectId: "proj_x", copyKey: "proj_x:t1:#1", royaltyPct: 5 }, "buyer-sam", "buyer-sam", "1", NOW, "rs9").resales,
    "rs9",
    { id: "buyer-leo", address: "0xleo" },
    "buyer-sam",
    { at: NOW + 5, txHash: "0x9" },
    1,
  );
  assert.deepEqual(
    R.missingPayoutsOf(own.resales, new Set(), "maker-1").map((a) => [a.identity, a.credit.lines[0].amount]),
    [
      ["buyer-sam", "0.925"],
      ["maker-1", "0.05"],
    ],
    "this browser's own project: the royalty goes to its creator",
  );
});

test("the stored list: a malformed record is dropped, never the list", () => {
  const ok = R.listResale([], DRAFT, "buyer-mira", "buyer-mira", "0.06", NOW, "rs1").resales;
  assert.equal(R.normalizeResales([...ok, { id: 1 }, null, { ...ok[0], id: "bad", status: "sold", sale: null }]).length, 1);
  assert.deepEqual(R.normalizeResales("nope"), []);
});

test("the demo always shows selling on: one copy sold, one for sale, another holder's for sale, this browser's own too", () => {
  const sales = D.withDemoSampleSales([], NOW);
  const log = D.withDemoUnits([], sales, [], NOW);
  const plantTracks = [{ id: "trk_demo_plant_phys", supply: { total: 20 }, listing: { royaltyPct: 10 } }];
  const own = [
    {
      id: "sale_demo_plant_1",
      projectId: "proj_demo_plant",
      buyerId: "buyer-sam",
      token: "ETH",
      network: "baseSepolia",
      item: { nft: "physical", trackId: "trk_demo_plant_phys", productId: "project", productName: "Smart Plant Pot", use: "commercial", serial: 1 },
    },
  ];
  const ownOf = (id) => (id === "proj_demo_plant" ? { name: "Smart Plant Pot", tracks: plantTracks } : null);
  const resales = D.withDemoResales([], sales, own, log, NOW, ownOf);
  assert.deepEqual(
    resales.map((r) => [r.id, r.status, r.sellerId, r.sale?.buyerId ?? null]),
    [
      ["rsl_demo_mira_air_phys_biz_2", "sold", "buyer-mira", "buyer-sam"],
      ["rsl_demo_mira_air_virt_biz", "listed", "buyer-mira", null],
      ["rsl_demo_leo_hub_virt_biz", "listed", "buyer-leo", null],
      ["rsl_demo_sam_plant_phys", "listed", "buyer-sam", null],
    ],
  );
  assert.equal(resales[0].sale.unitsLeft, 50, "Mira made nothing with #8, so all 50 went with it");
  assert.equal(resales[3].product, null);
  assert.equal(resales[3].use, "Business use");
  assert.equal(D.withDemoResales(resales, sales, own, log, NOW + DAY, ownOf).length, 4, "planted once");

  // Mira's Air quality: #8 sold to Sam, the Virtual copy for sale; Earn says so.
  const mira = P.samplePurchasesOf(sales, "buyer-mira", resales).find((p) => p.id === "p7");
  const facts = K.earnFactsOf(mira, "buyer-mira", log);
  assert.deepEqual(
    { earned: facts.earned, sold: facts.sold, forSale: facts.forSale, asking: facts.asking, held: facts.held },
    { earned: "0.0525 ETH", sold: 1, forSale: 1, asking: "0.035 ETH", held: 3 },
  );
  assert.equal(K.earnNextOf(facts, mira).action.label, "Manage what's for sale");
  const tiles = K.resaleTilesOf(mira, "buyer-mira", log);
  const seen = new Set(tiles.map((t) => `${t.kind}|${t.state}|${t.number}`));
  for (const want of ["physical|held|#7 of 50", "virtual|listed|#1", "physical|sold|#8 of 50"]) assert.ok(seen.has(want), want);
  assert.equal(tiles.at(-1).state, "sold", "copies sold on come last");
  const events = K.earnEventsOf(mira, "buyer-mira", resales, log);
  assert.ok(events.some((e) => e.kind === "sold" && e.amount === "+0.0525 ETH" && /to Sam for 0.06 ETH/.test(e.text)));
  assert.ok(events.some((e) => e.kind === "units" && /Made 10 units with #7 of 50/.test(e.text)));
  assert.ok(events.some((e) => e.kind === "listed" && /at 0.035 ETH/.test(e.text)));

  // Sam holds #8 now, from Mira, with its 50 units.
  const sam = P.samplePurchasesOf(sales, "buyer-sam", resales).find((p) => p.id === "p7");
  assert.equal(sam.lines[0].copies[0].from, "Mira");
});

test("Earn's next step follows the holder: sell, manage, sold out, or the whole project's own Earn", () => {
  const base = { earned: null, sold: 0, forSale: 0, asking: null, held: 0, units: null, ownsProject: false };
  assert.equal(K.earnNextOf({ ...base, held: 2 }, { buyable: [] }).action.label, "Sell a copy");
  assert.equal(K.earnNextOf({ ...base, held: 0, sold: 2 }, { buyable: ["physical"] }).action.label, "Buy another copy");
  assert.equal(K.earnNextOf({ ...base, held: 0, sold: 2 }, { buyable: [] }).action, null);
  assert.equal(K.earnNextOf({ ...base, ownsProject: true }, { buyable: [] }).action.to, "project");
  assert.equal(K.perTokenText([{ amount: "0.01", token: "ETH" }, { amount: "0.02", token: "ETH" }, { amount: "5", token: "USDC" }]), "0.03 ETH · 5 USDC");
});
