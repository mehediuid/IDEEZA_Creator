// What a buyer holds, project by project (owner, 2026-11-16: "anything bought goes to My projects — how many
// copies, the permission; for a Virtual NFT, how many, everything").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../../src/", import.meta.url).pathname;
const read = (path) => readFileSync(join(SRC, path), "utf8");
const P = await import("../../.tmp-test/lib/market/purchases.js");
const market = await import("../../.tmp-test/lib/market/sample-market.js");
const sales = await import("../../.tmp-test/lib/market/phone-sample-sales.js");

const T = Date.UTC(2026, 10, 16);
const sale = (id, item, at, price = "0.04", buyerId = "buyer-mira", projectId = "proj_a") => ({
  id, listingId: "l", projectId, at, buyerId, buyerAddress: "0x1", sellerAddress: "0x2", item, via: "buyNow", token: "ETH", price,
  fees: { ideezaBps: 250, ideeza: "0.001", network: { coin: "ETH", amount: "0.001" } }, payout: price, royaltiesPct: 10, mint: "lazy",
  mintedAtSale: true, tokenId: null, network: "baseSepolia", collection: "C", benefits: [], txHash: `0x${id}`, demo: true,
});
const copy = (kind, use, serial, productId = "project", productName = "Lamp", trackId = `t_${kind}_${use}`) => ({ nft: kind, trackId, productId, productName, use, tier: "extended", serial });

test("own purchases fold into one project: kind × use × scope, copies with numbers of how many, paid summed", () => {
  const list = [
    sale("s1", copy("physical", "commercial", 7), T, "0.04"),
    sale("s2", copy("physical", "commercial", 8), T + 1, "0.04"),
    sale("s3", copy("virtual", "private", 1, "prd_x", "PlantPal", "t_prod"), T + 2, "0.005"),
    sale("s4", { nft: "main", sharePct: 100 }, T + 3, "0.2"),
    sale("s5", copy("virtual", "private", 2), T + 4, "0.01", "buyer-leo"),
  ];
  const tracks = [{ id: "t_physical_commercial", supply: { total: 50 } }];
  const [p] = P.ownPurchasesOf(list, "buyer-mira", [{ id: "proj_a", name: "Lamp", cover: null }], tracks, "Maya");
  assert.equal(p.creator, "Maya");
  assert.equal(p.count, 4, "two physical copies, one virtual copy, the Main NFT once");
  assert.deepEqual(
    p.lines.map((l) => P.lineTitleOf(l)),
    ["Whole project · 100%", "Physical NFT · Business use", "Virtual NFT · Personal use · PlantPal"],
  );
  const physical = p.lines[1];
  assert.equal(P.copiesLineOf(physical), "2 copies · #7, #8 of 50");
  assert.deepEqual(physical.paid, [{ amount: "0.08", token: "ETH" }]);
  assert.deepEqual(P.cardChipsOf(p), ["Whole project · 100%", "Physical NFT ×2", "Virtual NFT ×1"]);
  assert.deepEqual(P.usesOf(p), ["Personal use", "Business use"]);
  assert.equal(p.lastAt, T + 3, "Leo's purchase is not Mira's");
});

test("sample purchases read their use from the sale and their supply from the use offered", () => {
  const m = market.SAMPLE_MARKETS.find((x) => x.offers.some((o) => o.kind === "physical"));
  const [personal] = market.copyUsesOf(m, "physical");
  const s = sales.makeSampleSale({ id: "ps1", projectId: m.feedId, offer: personal, buyerId: "buyer-mira", buyerAddress: "0x1", serial: 1, txHash: "0xa", at: T });
  const [p] = P.samplePurchasesOf([s], "buyer-mira");
  assert.equal(p.id, m.feedId);
  assert.equal(p.creator, m.post.creator.name);
  assert.equal(p.lines[0].use, "Personal use");
  assert.match(P.copiesLineOf(p.lines[0]), /^1 copy · #1 of \d+$/);
  assert.deepEqual(P.samplePurchasesOf([s], "buyer-leo"), []);
});

test("every use held says what it allows; a Main share says its share", () => {
  for (const k of ["physical", "virtual"]) for (const u of ["Personal use", "Business use"]) assert.ok(P.USE_RULES[k][u].length > 20);
  assert.match(P.mainRuleOf(100), /^The whole project is yours/);
  assert.match(P.mainRuleOf(10), /^You own 10% of the project/);
});

test("My projects has a Purchased tab beside the outcomes, and the purchased page shows own, rights, files, receipts", () => {
  const list = read("components/projects/my-projects.tsx");
  assert.match(list, /const onPurchased = params\.get\("tab"\) === PURCHASED;/);
  assert.match(list, /\{ id: PURCHASED, label: "Purchased", n: purchased\.count, active: purchased\.active \}/);
  assert.doesNotMatch(read("lib/manual/project-list.ts"), /purchased/i, "the list's own tabs (shared with the phone) are untouched");
  const page = read("components/projects/purchased/purchased-page.tsx");
  for (const h of ["What you own", "What you can do", "Files", "Receipts"]) assert.match(page, new RegExp(`>\\s*${h}\\s*<`));
  assert.match(page, /This testnet demo has no files to download\./, "files are named honestly, never a fake download");
});
