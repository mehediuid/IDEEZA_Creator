// Purchases that are always there (owner, 2026-11-19: "My projects needs every kind of data, always there; what is
// bought on the marketplace stays too — projects with their Main, Physical and Virtual purchase information"):
// the demo creators' purchases of sample listings (demo-purchases.ts), the Smart Plant Pot's sales of every kind
// (demo-projects.ts), and how an older planting is topped up without breaking what the account did by hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

const D = await import("../../.tmp-test/lib/demo/demo-purchases.js");
const demo = await import("../../.tmp-test/lib/demo/demo-projects.js");
const P = await import("../../.tmp-test/lib/market/purchases.js");
const S = await import("../../.tmp-test/lib/market/phone-sample-sales.js");
const M = await import("../../.tmp-test/lib/market/sample-market.js");

const NOW = Date.UTC(2026, 10, 19, 9, 0);
const DAY = 86_400_000;

const titles = (list) => list.map((l) => `${P.lineTitleOf(l)} | ${l.kind === "main" ? "" : P.copiesLineOf(l)}`);

test("Mira, who shops by default, holds every kind: a whole project, Physical and Virtual for both uses", () => {
  const sales = D.withDemoSampleSales([], NOW);
  const mira = P.samplePurchasesOf(sales, "buyer-mira");
  const byName = Object.fromEntries(mira.map((p) => [p.name, titles(p.lines)]));
  assert.deepEqual(byName["Sleep-stage ring"], ["Whole project · 100% | "]);
  assert.deepEqual(byName["Air quality room sensor"], [
    "Physical NFT · Personal use | 1 copy · #1 of 50",
    "Physical NFT · Business use | 2 copies · #7, #8 of 50",
    "Virtual NFT · Business use | 1 copy · #1",
  ]);
  assert.deepEqual(byName["Lo-fi guitar pedal"], [
    "Physical NFT · Personal use | 1 copy · #12 of 40",
    "Virtual NFT · Personal use | 1 copy · #1",
  ]);
  const kinds = new Set(mira.flatMap((p) => p.lines.map((l) => `${l.kind}|${l.use ?? ""}`)));
  for (const k of ["main|", "physical|Personal use", "physical|Business use", "virtual|Personal use", "virtual|Business use"]) {
    assert.ok(kinds.has(k), k);
  }
  for (const s of sales) {
    assert.ok(s.at < NOW, "every purchase is in the past");
    assert.ok(s.at > M.sampleMarketOf(s.projectId).post.sharedAt, "after the listing went up");
    assert.equal(s.demo, true);
  }
});

test("Leo and Sam hold purchases too, so switching who shops never shows an empty tab", () => {
  const sales = D.withDemoSampleSales([], NOW);
  assert.deepEqual(
    P.samplePurchasesOf(sales, "buyer-leo").map((p) => p.name).sort(),
    ["E-ink smartwatch", "Smart plant watering hub"],
  );
  assert.deepEqual(
    P.samplePurchasesOf(sales, "buyer-sam").map((p) => p.name).sort(),
    ["Supercapacitor jump pack", "USB-C power meter"],
  );
  const meter = P.samplePurchasesOf(sales, "buyer-sam").find((p) => p.name === "USB-C power meter");
  assert.equal(P.lineTitleOf(meter.lines[0]), "Whole project · 100%");
});

test("a bought Main NFT sells the sample in full: the marketplace shows it sold", () => {
  const sales = D.withDemoSampleSales([], NOW);
  const items = M.sampleMarketItemsOf(sales, "buyer-leo");
  const ring = items.find((i) => i.projectId === "p28");
  assert.ok(ring.sale, "the Sleep-stage ring is sold");
  assert.equal(ring.sale.buyerId, "buyer-mira");
});

test("planted once: running it again adds nothing", () => {
  const once = D.withDemoSampleSales([], NOW);
  assert.equal(D.withDemoSampleSales(once, NOW + DAY).length, once.length);
});

test("an account that bought by hand keeps a story that adds up", () => {
  const ring = M.sampleMarketOf("p28");
  const air = M.sampleMarketOf("p7");
  const leoRing = S.makeSampleSale({
    projectId: "p28", offer: ring.offers.find((o) => o.kind === "main"), buyerId: "buyer-leo", buyerAddress: "0xleo",
    serial: null, txHash: "0x1", at: NOW - 10 * DAY, id: "own_1",
  });
  const biz = M.copyUsesOf(air, "physical").find((o) => o.use === "Business use");
  const miraBiz = S.makeSampleSale({ projectId: "p7", offer: biz, buyerId: "buyer-mira", buyerAddress: "0xmira", serial: 7, txHash: "0x2", at: NOW - 9 * DAY, id: "own_2" });
  const sales = D.withDemoSampleSales([leoRing, miraBiz], NOW);
  assert.equal(sales.filter((s) => s.projectId === "p28" && s.kind === "main").length, 1, "a Main NFT sold once only");
  const air2 = P.samplePurchasesOf(sales, "buyer-mira").find((p) => p.name === "Air quality room sensor");
  const bizLine = air2.lines.find((l) => l.kind === "physical" && l.use === "Business use");
  assert.equal(P.copiesLineOf(bizLine), "3 copies · #7, #8, #9 of 50", "the next free numbers");
});

test("the Smart Plant Pot has sales of every kind; the Lamp's Main NFT went to Leo", () => {
  const seed = demo.demoSeedOf(NOW);
  const plant = seed.sales.filter((s) => s.projectId === "proj_demo_plant");
  assert.deepEqual(
    plant.map((s) => `${s.item.nft}:${s.item.use}:${s.item.productId === "project" ? "project" : "product"}:${s.buyerId}:#${s.item.serial}`).sort(),
    [
      "physical:commercial:project:buyer-sam:#1",
      "physical:private:project:buyer-leo:#1",
      "virtual:commercial:project:buyer-mira:#1",
      "virtual:private:product:buyer-mira:#1",
      "virtual:private:project:buyer-leo:#1",
    ],
  );
  const lamp = seed.sales.filter((s) => s.projectId === "proj_demo_lamp");
  assert.deepEqual(lamp.map((s) => [s.item.nft, s.buyerId]), [["main", "buyer-leo"]]);
  assert.ok(seed.sales.every((s) => s.at < NOW));
  const tracks = Object.values(seed.editions).flat();
  const [mine] = P.ownPurchasesOf(seed.sales, "buyer-mira", [{ id: "proj_demo_plant", name: "Smart Plant Pot", cover: null }], tracks, "Maya");
  assert.deepEqual(titles(mine.lines), ["Virtual NFT · Business use | 1 copy · #1 of 50", "Virtual NFT · Personal use · PlantPal | 1 copy · #1 of 50"]);
});

test("topping up an older planting: a gone track or a sold Main NFT is skipped, a taken number moves on", () => {
  const seed = demo.demoSeedOf(NOW);
  const plantTracks = seed.editions["proj_demo_plant"];
  const sam = seed.sales.find((s) => s.id === "sale_demo_plant_1");
  const lampMain = seed.sales.find((s) => s.id === "sale_demo_lamp_main");
  // The account already sold Leo's Physical Personal-use #1 by hand, and removed the product's Virtual track.
  const byHand = { ...sam, id: "hand_1", buyerId: "buyer-mira", item: { ...sam.item, trackId: "trk_demo_plant_phys_private", use: "private", serial: 1 } };
  const held = [sam, lampMain, byHand];
  const tracksOf = (id) => (id === "proj_demo_plant" ? plantTracks.filter((t) => t.id !== "trk_demo_plant_prod_virt") : []);
  const next = demo.withDemoSales(held, seed.sales, tracksOf);
  const ids = next.map((s) => s.id);
  assert.ok(!ids.includes("sale_demo_plant_prod_virt"), "its track is gone");
  assert.equal(next.find((s) => s.id === "sale_demo_plant_phys_private").item.serial, 2, "#1 was taken");
  assert.equal(next.filter((s) => s.item.nft === "main" && s.projectId === "proj_demo_lamp").length, 1);
  assert.equal(demo.withDemoSales(next, seed.sales, tracksOf).length, next.length, "and once only");
});

test("the planter plants the purchases with the projects and tops up an older planting", () => {
  assert.equal(demo.DEMO_SEED_VERSION, 3);
  const seed = read("components/projects/demo-projects-seed.tsx");
  assert.equal(seed.match(/plantSamplePurchases\(storage, now\)/g)?.length, 2, "on a first planting and on a top-up");
  assert.match(seed, /withDemoSales\(sales as Sale\[\], ours, tracksOf\)/);
});
