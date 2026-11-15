// Explore marketplace's details pages are shop pages (owner, 2026-11-15): media
// first, the creator named (never "you"), the buy box with the price and the
// button first and the facts small, the creator's block, a link to the
// Innovations story (never a copy of it), the owner's way back only in the
// prototype banner, viewer words under every clip, and a product without
// copies of its own pointing to its project's offers. These read the sources
// (like page-frames.test.mjs); the behaviour is checked headless.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../../src/", import.meta.url).pathname;
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (path) => code(readFileSync(join(SRC, path), "utf8"));
const MARKET = "components/marketplace/";

const copy = await import("../../.tmp-test/lib/video/video-copy.js");

test("the market header leads with the post's media stage and names the creator", () => {
  const header = read(MARKET + "market-header.tsx");
  assert.match(header, /<PostMediaStage post=\{post\} mine=\{mine\} \/>/);
  assert.match(header, /<ProjectHeader \{\.\.\.props\} context="market" creatorName=\{creator\} \/>/);
  assert.doesNotMatch(header, /Your project page/, "the owner's way back is the banner's");
  const shared = read("components/projects/details/header.tsx");
  assert.match(shared, /replace\(\/\^Created by you\(\?: · \)\?\/, ""\)/);
  assert.match(shared, /text\.meta\.filter\(\(m\) => m\.kind !== "time"\)/, "no Saved date for a buyer");
  assert.match(shared, /text\.chip\.badge && !market && <ShowcaseChip \/>/);
});

test("the Testnet demo banner holds the one way back to the owner's page, on a listing's page only", () => {
  const banner = read(MARKET + "demo-buyer-banner.tsx");
  assert.match(banner, /\{projectId && \(/);
  assert.match(banner, /href=\{`\/projects\/\$\{projectId\}`\}/);
  assert.match(read(MARKET + "market-slots.tsx"), /<DemoBuyerBanner className="mb-10" projectId=\{project\.id\} \/>/);
});

test("the buy box: overline and price, the button, the wallet, then the facts small", () => {
  const rail = read(MARKET + "buyer-rail.tsx");
  assert.doesNotMatch(rail, /ListingFacts/, "the eight stacked rows are gone");
  const buyNow = rail.slice(rail.indexOf('listing.type === "buyNow" ? ('));
  const order = ["<OfferTop", "Buy now", "<WalletLine", "<DealFacts"].map((s) => buyNow.indexOf(s));
  assert.ok(order.every((i, n) => i > -1 && (n === 0 || i > order[n - 1])), `order ${order}`);
  assert.match(rail, /facts=\{<AuctionTop listing=\{listing\} auction=\{auction\} \/>\}/);
  assert.match(rail, /details=\{<DealFacts listing=\{listing\} view=\{view\} \/>\}/);
  assert.doesNotMatch(rail, /\{ask\}/, "Ask the creator is the Creator block's");
  const parts = read(MARKET + "offer-parts.tsx");
  assert.match(parts, /grid grid-cols-3/);
});

test("Creator and On Innovations are the buyer view's own rail blocks", () => {
  const slots = read(MARKET + "market-slots.tsx");
  // The Creator block rides in the lead with the buy box, so a narrow page keeps it above the tabs.
  assert.match(slots, /<BuyerRail \{\.\.\.props\} \/>\s*<CreatorRailBlock \{\.\.\.props\} \/>/);
  assert.match(slots, /marketplace: MarketLead,/);
  assert.match(slots, /story: StoryRailBlock,/);
  const blocks = read(MARKET + "market-rail.tsx");
  assert.match(blocks, /<AskCreator projectId=\{project\.id\}/);
  assert.match(blocks, /href=\{postHref\(mineSlugOf\(project\)\)\}/);
  assert.match(blocks, /typeof project\.showcasedAt === "number"/, "only while it is shared");
  assert.doesNotMatch(read("components/projects/details/project-page.tsx"), /CreatorRailBlock|StoryRailBlock/, "never on the owner's page");
});

test("viewer words under a clip never speak of 'your' prompt or videos", () => {
  assert.doesNotMatch(copy.viewerHonestyLine("VoxLamp"), /\byour\b/i);
  assert.doesNotMatch(copy.PROJECT_HONESTY_VIEWER, /\byour\b/i);
  assert.match(copy.viewerHonestyLine("VoxLamp"), /VoxLamp's image/);
  for (const [file, needle] of [
    ["components/innovations/post-media.tsx", 'projectId={mine.project.id} audience="viewer"'],
    ["components/projects/product/product-media.tsx", 'productName={name} projectId={project.id} audience="viewer"'],
    ["components/projects/details/media-tab.tsx", 'productName={project.name} projectId={project.id} audience="viewer"'],
  ]) {
    assert.ok(read(file).includes(needle), file);
  }
});

test("a market product page names its project and creator, and points to the project's offers", () => {
  const page = read("components/projects/product/product-page.tsx");
  assert.match(page, /const meta: React\.ReactNode = market \?/);
  assert.match(page, /Part of\{" "\}/);
  const offer = read(MARKET + "whole-project-offer.tsx");
  assert.match(offer, /viewer\.kind !== "demo-buyer" \|\| view\.lock !== null/);
  assert.match(offer, /tracksOf\(product\.id, view\.editions\)\.some\(\(t\) => t\.listing !== null\)/);
  assert.match(offer, /href=\{`\/marketplace\/\$\{project\.id\}`\}/);
});

test("copies: Physical / Virtual tabs of compact rows, the version asked after Buy, never a card per offer", () => {
  const src = read(MARKET + "edition-offers.tsx");
  // Tabs with each kind's lowest price; a kind alone is a plain heading; a holder opens on what they own.
  assert.match(src, /role="tablist"/);
  assert.match(src, /fromLine\(lowest\(k\)\)/);
  assert.match(src, /held \?\? kinds\[0\]/);
  // What the kind gets you, said once, in the product page's words.
  assert.match(src, /helperLineOf\(kind, project\.name\)/);
  // One row per offer with a small secondary Buy; the page itself has no radio and no copy "Buy now".
  assert.match(src, /function CopyRow\(/);
  assert.match(src, /hierarchy="secondary"\s+size="md"/);
  const page = src.slice(0, src.indexOf("<ModalFrame"));
  assert.doesNotMatch(page, /role="radiogroup"|type="radio"/);
  assert.doesNotMatch(page.replace(/\/\/.*$/gm, ""), />\s*Buy now\s*</);
  // Two prices: the one popup style asks first, on the picked price; one price goes straight to the wallet.
  assert.match(src, /if \(oneTier\) void go\("extended"\);\s*else setChoosing\(true\);/);
  assert.match(src, /initialFocus=\{pickedRef\}/);
  // Many rows fold each product into one line.
  assert.match(src, /export const ROWS_OPEN = 6;/);
  assert.match(src, /folded=\{fold && !isProjectScope\(g\.productId\)\}/);
  assert.doesNotMatch(src, /BuyableOffer|OfferFrame/, "the old card per offer is gone");
});
