// Data that is always there (owner, 2026-11-16: "the data Innovations always
// has, keep it on the marketplace too; keep data in My projects that will
// always be there"):
// - Explore marketplace: every sample post for sale is an item, another
//   creator's, bought through the phone's sample store (sample-market.ts);
// - My projects: four projects of the maker's own, one per outcome
//   (demo-projects.ts), planted once per account before the stores read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../../src/", import.meta.url).pathname;
const read = (path) => readFileSync(join(SRC, path), "utf8");

const market = await import("../../.tmp-test/lib/market/sample-market.js");
const sales = await import("../../.tmp-test/lib/market/phone-sample-sales.js");
const { SAMPLE_POSTS } = await import("../../.tmp-test/lib/innovations/sample-posts.js");
const demo = await import("../../.tmp-test/lib/demo/demo-projects.js");
const { listingViewOf } = await import("../../.tmp-test/lib/market/listing.js");
const { projectStatus } = await import("../../.tmp-test/lib/manual/project-summary.js");

const NOW = Date.UTC(2026, 10, 16, 9, 0);

test("every sample post for sale is a marketplace item, at its feed id, by its creator", () => {
  const forSale = SAMPLE_POSTS.filter((p) => p.listing);
  assert.ok(forSale.length >= 5, "the marketplace is never near-empty");
  assert.equal(market.SAMPLE_MARKETS.length, forSale.length);
  for (const m of market.SAMPLE_MARKETS) {
    assert.equal(m.post.id, `sample:${m.feedId}`);
    assert.equal(m.post.listing.href, `/marketplace/${m.feedId}`, "the post's On Marketplace opens its shop page");
    assert.equal(market.sampleMarketOf(m.feedId), m);
  }
  assert.equal(market.sampleMarketOf("proj_abc"), null, "a project of this browser's is never a sample");
  const items = market.sampleMarketItemsOf([], null);
  assert.equal(items.length, market.SAMPLE_MARKETS.length);
  for (const it of items) {
    const m = market.sampleMarketOf(it.projectId);
    assert.equal(it.creator, m.post.creator.name);
    assert.equal(it.status, "live");
    const main = m.offers.find((o) => o.kind === "main");
    if (main) {
      assert.equal(it.listing.price, main.price);
      assert.equal(it.listing.percentSelling, 100, "the Main NFT is the whole project");
    } else {
      assert.equal(it.listing, null);
      assert.ok(it.copies, "a sample selling only copies is a Copies card");
    }
  }
});

test("a sample's Main NFT, once bought, is Sold and takes its copies off; the buyer holds it", () => {
  const m = market.SAMPLE_MARKETS.find((x) => x.offers.some((o) => o.kind === "main") && x.offers.length > 1);
  const main = m.offers.find((o) => o.kind === "main");
  const sale = sales.makeSampleSale({
    id: "psale_1",
    projectId: m.feedId,
    offer: main,
    buyerId: "buyer-leo",
    buyerAddress: "0x1",
    serial: null,
    txHash: "0xabc",
    at: NOW,
  });
  const item = market.sampleMarketItemsOf([sale], "buyer-leo").find((i) => i.projectId === m.feedId);
  assert.equal(item.status, "sold");
  assert.equal(item.copies, null);
  assert.deepEqual(item.holding, { sharePct: 100 });
  assert.equal(item.sale.price, main.price);
  const other = market.sampleMarketItemsOf([sale], "buyer-mira").find((i) => i.projectId === m.feedId);
  assert.equal(other.holding, null);
});

test("search finds a sample by its creator, its products and its description", () => {
  const m = market.SAMPLE_MARKETS[0];
  assert.ok(market.sampleMatches(m, m.post.creator.name.split(" ")[0]));
  assert.ok(market.sampleMatches(m, m.post.products[0].name));
  assert.ok(!market.sampleMatches(m, "zzzz-nothing"));
});

test("the grid and the shop page read the samples; the post links to them", () => {
  const page = read("components/marketplace/marketplace-page.tsx");
  assert.match(page, /\[\.\.\.own, \.\.\.sampleMarketItemsOf\(sampleSales, buyer\.id\)\]/);
  assert.match(page, /sampleMatches\(sample, view\.q\)/);
  assert.match(read("components/marketplace/listing-card.tsx"), /By \{item\.creator \?\? "you"\}/);
  const route = read("app/(create)/marketplace/[id]/page.tsx");
  assert.match(route, /if \(sample\) return <SampleMarketPage market=\{sample\} \/>;/);
  const box = read("components/marketplace/sample-offer-box.tsx");
  assert.match(box, /<OfferTabs tabs=\{tabs\}/, "the same tab box as this browser's own listings");
  assert.match(box, /writeSampleSales\(next\.sales\)/, "one store with the phone");
});

test("four demo projects, one per outcome, each a finished build", () => {
  const seed = demo.demoSeedOf(NOW);
  assert.equal(seed.projects.length, 4);
  assert.deepEqual(
    seed.projects.map((p) => p.id),
    demo.DEMO_PROJECT_IDS,
  );
  const data = { listings: seed.listings, sales: seed.sales, bids: [], support: [], unreadable: false };
  const statusOf = (p) =>
    projectStatus(p, null, {
      listing: listingViewOf(p.id, { ...data, now: NOW, current: { name: p.name, description: p.description, products: [], cover: null, at: 0 } }),
      sales: seed.sales.filter((s) => s.projectId === p.id),
    });
  assert.deepEqual(seed.projects.map(statusOf), ["listed", "sold", "private", "draft"]);
  for (const p of seed.projects) {
    assert.ok(p.id.startsWith(demo.DEMO_PROJECT_PREFIX));
    assert.ok(p.createdAt < NOW);
    const build = seed.builds.find((b) => b.id === p.buildId);
    assert.equal(build.status, "ready");
    assert.equal(build.projectId, p.id);
    assert.deepEqual(
      build.items.map((i) => [i.kind, i.status]),
      ["3d", "pcb", "code", "assembly", "wiring", "parts"].map((k) => [k, "ready"]),
    );
    assert.match(build.conceptImageUrl, /^\/images\/browse-project\//);
    assert.equal(p.products[0].source.buildId, build.id);
  }
  const plant = seed.projects[0];
  assert.equal(typeof plant.showcasedAt, "number", "the listed one is shared on Innovations too");
  assert.equal(seed.editions[plant.id].length, 3, "whole-project Physical and Virtual, and its product's Virtual");
  assert.ok(seed.sales.every((s) => s.at < NOW), "every sale is in the past");
});

test("planted once per account, before the stores read, never over an unreadable list", () => {
  const seed = read("components/projects/demo-projects-seed.tsx");
  assert.match(seed, /if \(storage\.getItem\(DEMO_SEED_KEY\) !== null\) return false;/);
  assert.match(seed, /if \(!projects \|\| !builds \|\| !listings \|\| !sales\) return false;/);
  assert.match(seed, /React\.useLayoutEffect/);
  const layout = read("app/layout.tsx");
  assert.ok(layout.indexOf("<DemoProjectsSeed />") < layout.indexOf("<ThemeProvider>"), "ahead of every provider");
});
