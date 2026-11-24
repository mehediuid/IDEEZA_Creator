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
  // The Products part as a listing's page has it (owner, 2026-11-24): the same tab strip, cards and image grid.
  assert.match(page, /main=\{<SampleTabs post=\{post\} feedId=\{feedId\} \/>\}/);
  assert.match(page, /const SAMPLE_TABS = \["products", "media"\] as const;/);
  assert.match(page, /<TabStrip\s+label="Project sections"/);
  assert.match(page, /\{active === "media" \? <SampleMediaTab post=\{post\} \/> : <SampleProductsTab post=\{post\} feedId=\{feedId\} \/>\}/);
  assert.doesNotMatch(page, /WhatsInside/, "no What's inside rows on the shop page");
  const products = read(MARKET + "sample-products.tsx");
  assert.match(products, /<ProductsSection line=/);
  assert.match(products, /<ProductCardFrame/);
  assert.match(products, /href=\{sampleProductHref\(feedId, p\.id\)\}/, "a product opens in the shop");
  assert.match(products, /<MediaTileCard key=\{tile\.key\}/);
  const tab = read("components/projects/details/products-tab.tsx");
  assert.match(tab, /<ProductsSection\s/, "a listing's Products tab is drawn by the same frame");
  assert.match(tab, /<ProductCardFrame name=\{name\} href=\{href\}/);
  assert.match(read("components/projects/details/media-tab.tsx"), /\{ownerFacts \? "From your builds" : "Images"\}/, "a buyer never reads 'your builds'");
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

const purchases = await import("../../.tmp-test/lib/market/purchases.js");

test("the Marketplace block says what the buyer owns, in web terms (owner, 2026-11-24)", () => {
  const line = (kind, n, extra = {}) => ({ kind, use: kind === "main" ? null : "Personal use", product: null, sharePct: null, copies: Array.from({ length: n }, () => ({})), paid: [], unitsPerCopy: null, ...extra });
  assert.equal(purchases.ownedWhatOf({ lines: [line("virtual", 1), line("virtual", 1, { use: "Business use" })] }), "2 Virtual NFTs");
  assert.equal(purchases.ownedWhatOf({ lines: [line("physical", 1)] }), "1 Physical NFT");
  assert.equal(purchases.ownedWhatOf({ lines: [line("main", 1, { sharePct: 100 })] }), "the Main NFT");
  assert.equal(
    purchases.ownedWhatOf({ lines: [line("main", 1, { sharePct: 10 }), line("physical", 2), line("virtual", 1)] }),
    "a 10% share of the Main NFT, 2 Physical NFTs and 1 Virtual NFT",
  );
  assert.equal(purchases.ownedWhatOf({ lines: [] }), null);
  const see = read("components/projects/purchased/see-what-you-own.tsx");
  assert.match(see, /You own \{what\} of \{projectName \?\? "this project"\}/);
  assert.match(see, /\{p\.count === 1 \? "See it" : "See them"\}/);
  assert.doesNotMatch(see, />\s*See what you own\s*</, "never the bare link");
  assert.match(read("components/projects/editions/edition-block.tsx"), /<SeeWhatYouOwn projectId=\{project\.id\} projectName=\{project\.name\} \/>/);
  // The Use row holding copies says so; the price's line no longer repeats it.
  assert.match(read(MARKET + "offer-parts.tsx"), /\{o\.owned \? <Badge tone="success">You own \{o\.owned\}<\/Badge> : null\}/);
  assert.match(read(MARKET + "copy-panel.tsx"), /owned: ownedOn\(t\.id\)/);
  assert.match(read(MARKET + "sample-offer-box.tsx"), /owned: ownedOf\(o\)/);
  for (const f of ["copy-panel.tsx", "sample-offer-box.tsx"]) assert.doesNotMatch(read(MARKET + f), /you own \$\{owned\}/, f);
});

const chain = await import("../../.tmp-test/lib/market/chain-record.js");
const reports = await import("../../.tmp-test/lib/data/reports.js");

test("View on blockchain: every NFT tab shows its record, and nothing links to an explorer (owner, 2026-11-24)", () => {
  const date = () => "Nov 18, 2026";
  const tx = (over) => ({ at: 1, txHash: "0x" + "ab".repeat(32), serial: null, mine: false, ...over });
  const main = chain.chainRowsOf({ kind: "main", network: "baseSepolia", collection: "IDEEZA Creators", tokenId: null, lazy: true, holder: "Tomas Berg", txs: [] }, date);
  assert.deepEqual(main.map((r) => r.label), ["Blockchain", "Collection", "Token", "Held by", "Last transaction"]);
  assert.equal(main.find((r) => r.label === "Token").value, "Minted when it's bought");
  assert.equal(main.find((r) => r.label === "Last transaction").value, "None yet");
  const own = chain.chainRowsOf({ kind: "main", network: "baseSepolia", collection: "My IDEEZA Collection", tokenId: 3, lazy: true, holder: "Maya Karim", txs: [] }, date);
  assert.equal(own.find((r) => r.label === "Token").value, "#3 · minted when it's bought");
  const copy = chain.chainRowsOf(
    { kind: "copy", network: "baseSepolia", collection: "IDEEZA Creators", minted: 2, of: 50, txs: [tx({ serial: 1, mine: true, at: 1 }), tx({ serial: 2, at: 2, txHash: "0x" + "cd".repeat(32) })] },
    date,
  );
  assert.deepEqual(copy.map((r) => r.label), ["Blockchain", "Collection", "Copies minted", "Your copies", "Last transaction"]);
  assert.equal(copy.find((r) => r.label === "Copies minted").value, "2 of 50");
  assert.equal(copy.find((r) => r.label === "Your copies").value, "#1");
  assert.match(copy.find((r) => r.label === "Last transaction").value, /^0xcdcd…cdcd · Nov 18, 2026$/, "the newest transaction");
  const parts = read(MARKET + "offer-parts.tsx");
  assert.match(parts, /View on blockchain/);
  assert.match(parts, /\{DEMO_MINT_FOOTNOTE\}/);
  assert.doesNotMatch(parts, /basescan|etherscan|explorer\.|https?:\/\//i, "no explorer link: nothing is on a real chain");
  // In every tab: the Main NFT (a listing's and a sample's) and each copy panel (a listing's, its products', a sample's).
  assert.match(read(MARKET + "buyer-rail.tsx"), /<ViewOnChain\s+what=\{`Main NFT · \$\{project\.name\}`\}/);
  assert.match(read(MARKET + "copy-panel.tsx"), /<ViewOnChain\s+what=\{`\$\{name\} · \$\{scopeName\}`\}/);
  const sample = read(MARKET + "sample-offer-box.tsx");
  assert.match(sample, /<ViewOnChain\s+what=\{`Main NFT · \$\{post\.title\}`\}/);
  assert.match(sample, /<ViewOnChain\s+what=\{`\$\{offer\.name\} · \$\{post\.title\}`\}/);
});

test("Report: the ⋯ beside Share on every marketplace page reports the project or the product (owner, 2026-11-24)", () => {
  assert.equal(reports.productReportIdOf("sample:p12", "hub"), "sample:p12#hub");
  assert.deepEqual(reports.reportedIdParts("sample:p12#hub"), { postId: "sample:p12", productId: "hub" });
  assert.deepEqual(reports.reportedIdParts("sample:p12"), { postId: "sample:p12", productId: null });
  const rows = reports.reportsYouMade(
    { profiles: [], posts: ["sample:p12", "sample:p12#hub", "sample:gone#x"], comments: [], messages: { conversations: [], entries: [], reports: [] }, problems: [] },
    { person: () => null, personHref: () => null, post: (id) => (id === "sample:p12" ? { title: "Hub project", href: "/x" } : id === "sample:p12#hub" ? { title: "Watering Hub", href: "/x" } : null) },
  );
  assert.deepEqual(rows.map((r) => r.what), ["The post “Hub project”", "The product “Watering Hub”", "A product that is no longer here"]);
  const menu = read(MARKET + "report-menu.tsx");
  assert.match(menu, /label: `Report \$\{target\}`/);
  assert.match(menu, /<ReportDialog\s+open=\{reporting\}\s+target=\{target\}/);
  assert.match(read("components/innovations/report-dialog.tsx"), /project: "Report this project",\s+product: "Report this product",/);
  assert.match(read(MARKET + "market-header.tsx"), /<MarketReportMenu reportId=\{postIdOfProject\(project\.id\)\} target="project" \/>/);
  assert.match(read(MARKET + "sample-market-page.tsx"), /<MarketReportMenu reportId=\{post\.id\} target="project" \/>/);
  assert.match(read(MARKET + "sample-product-page.tsx"), /<MarketReportMenu reportId=\{productReportIdOf\(post\.id, product\.id\)\} target="product" \/>/);
  assert.match(read("components/projects/product/product-page.tsx"), /<MarketReportMenu reportId=\{productReportIdOf\(postIdOfProject\(project\.id\), product\.id\)\} target="product" \/>/);
});
