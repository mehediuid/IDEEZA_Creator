// Every Explore marketplace details page shows its information the same way
// (owner, 2026-11-24: "some give the rail as separate cut-out boxes, some flat
// together — why? keep it consistent everywhere"): a sample's page, a listing
// of this browser's, and their product pages share one frame (ProjectFrame),
// one rail surface with hairlines (never a card per block), and one order —
// Marketplace → Creator → On Innovations → the page's facts. A sample's header
// reads as a listing's: the status chip and its line, "Created by …", the
// description and Project activity. These read the sources (as
// market-details.test.mjs does) and check sample-record.ts's words.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../../src/", import.meta.url).pathname;
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (path) => code(readFileSync(join(SRC, path), "utf8"));
const MARKET = "components/marketplace/";

const market = await import("../../.tmp-test/lib/market/sample-market.js");
const record = await import("../../.tmp-test/lib/manual/sample-record.js");

const withMain = market.SAMPLE_MARKETS.find((m) => m.offers.some((o) => o.kind === "main"));
const sale = (over) => ({
  id: "psale_1",
  projectId: withMain.feedId,
  kind: "physical",
  name: "Physical NFT · Personal use",
  buyerId: "buyer-mira",
  buyerAddress: "0x0",
  price: "0.02",
  token: "ETH",
  network: "base-sepolia",
  networkFee: "0",
  serial: 1,
  txHash: "",
  at: withMain.post.sharedAt + 1000,
  demo: true,
  ...over,
});

test("a sample's status reads as a listing's: Listed with its Buy now line, Sold once its Main NFT is bought", () => {
  const main = withMain.offers.find((o) => o.kind === "main");
  const listed = record.sampleStatusOf(withMain, [], 0);
  assert.equal(listed.status, "listed");
  assert.equal(listed.word, "Listed");
  assert.match(listed.line, /^Listed .+ · Buy now · /);
  assert.ok(listed.line.endsWith(`${main.token}`), listed.line);
  const sold = record.sampleStatusOf(withMain, [sale({ kind: "main", name: "Main NFT", serial: null })], 0);
  assert.equal(sold.status, "sold");
  assert.match(sold.line, /^Sold · /);
});

test("a sample's Recent: the listing and this browser's sales, newest first, in a buyer's words", () => {
  const lines = record.sampleLogLinesOf(withMain, [
    sale({ id: "a", at: withMain.post.sharedAt + 1000 }),
    sale({ id: "b", kind: "virtual", at: withMain.post.sharedAt + 2000 }),
    sale({ id: "other", projectId: "nope" }),
  ]);
  assert.deepEqual(
    lines.map((l) => l.title),
    [`Sold a Virtual NFT of ${withMain.post.title}`, `Sold a Physical NFT of ${withMain.post.title}`, lines[2].title],
  );
  assert.match(lines[2].title, /^Listed · Buy now · /);
  assert.equal(lines.length, 3, "another project's sale has no line");
});

test("a sample's page uses the listing page's frame and one rail surface, never a card per block", () => {
  const page = read(MARKET + "sample-market-page.tsx");
  assert.match(page, /<ProjectFrame/);
  assert.match(page, /banner=\{<DemoBuyerBanner className="mb-10" sample \/>\}/, "banner, then breadcrumb, as a listing's page");
  assert.match(page, /<SampleOfferBox market=\{market\} announce=\{announce\} initialTab=\{initialTab\} \/>\s*<SampleCreatorBlock post=\{post\} \/>/);
  assert.match(page, /<RailRest label="Project record">\s*<SampleStoryBlock post=\{post\} \/>\s*<RecentBlock lines=\{logLines\} \/>/);
  assert.match(page, /<StatusChip status=\{status\.status\} word=\{status\.word\} \/>/);
  assert.match(page, /<DescriptionText text=\{post\.description\} \/>/);
  assert.match(page, /heading="Project activity"/);
  assert.match(page, /hrefOf=\{\(productId\) => sampleProductHref\(feedId, productId\)\}/, "a product opens in the shop");
  for (const f of ["sample-market-page.tsx", "sample-offer-box.tsx", "sample-product-page.tsx", "rail-blocks.tsx", "market-rail.tsx"]) {
    assert.doesNotMatch(read(MARKET + f), /\bCARD\b|NARROW_ONLY|WIDE_ONLY/, `${f}: no card per block, no second copy for a narrow page`);
  }
  assert.match(read(MARKET + "sample-offer-box.tsx"), /<RailBlock title="Marketplace" collapsible=\{false\}>/);
});

test("Creator and On Innovations are drawn once and shown on every marketplace page", () => {
  const blocks = read(MARKET + "rail-blocks.tsx");
  assert.match(blocks, /<RailBlock title="Creator" collapsible=\{false\}>/);
  assert.match(blocks, /<RailBlock title="On Innovations" meta=\{counts\}>/);
  const own = read(MARKET + "market-rail.tsx");
  assert.match(own, /<CreatorBlock/);
  assert.match(own, /<OnInnovationsBlock/);
  assert.match(read(MARKET + "sample-market-page.tsx"), /<OnInnovationsBlock/);
  const product = read("components/projects/product/product-page.tsx");
  assert.match(product, /<CreatorRailBlock project=\{project\} view=\{view\} viewer=\{viewer\} \/>\s*<StoryRailBlock project=\{project\} viewer=\{viewer\} \/>/);
  assert.match(read("components/projects/product/product-rail.tsx"), /<Marketplace \{\.\.\.slot\} \/> : null\}\s*\{buyer\}/, "under the Marketplace block");
  const sampleProduct = read(MARKET + "sample-product-page.tsx");
  assert.match(sampleProduct, /className=\{cn\(RAIL_SURFACE, "empty:hidden"\)\}/);
  assert.match(sampleProduct, /<SampleCreatorBlock post=\{post\} \/>\s*<SampleStoryBlock post=\{post\} \/>/);
  assert.match(sampleProduct, /<RailBlock title="Specs">/);
  const route = read("app/(create)/marketplace/[id]/products/[productId]/page.tsx");
  assert.match(route, /if \(sample\) return <SampleProductPage market=\{sample\} productId=\{idOf\(productId\)\} \/>;/);
});
