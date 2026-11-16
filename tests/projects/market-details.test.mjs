// Explore marketplace's details pages are shop pages (owner, 2026-11-15): media
// first, the creator named (never "you"), the buy box with the price and the
// button first and the facts small, the creator's block, a link to the
// Innovations story (never a copy of it), the owner's way back only in the
// prototype banner, viewer words under every clip, one Marketplace box with
// Main NFT / Physical NFT / Virtual NFT tabs, and a product page selling only
// its own copies. These read the sources (like page-frames.test.mjs); the
// behaviour is checked headless.
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
  // Owner, 2026-11-16: the big banner "doesn't look good and wastes a lot of space" — one slim line.
  assert.doesNotMatch(banner, /<Banner\b/);
  assert.match(banner, /<TestnetDemoBadge \/>/);
  assert.match(banner, /href=\{`\/projects\/\$\{projectId\}`\}/);
  assert.match(read(MARKET + "market-slots.tsx"), /<DemoBuyerBanner className="mb-10" projectId=\{project\.id\} \/>/);
});

test("the Main NFT tab: overline and price, the button, the wallet, the legal line, then the facts folded", () => {
  const rail = read(MARKET + "buyer-rail.tsx");
  assert.doesNotMatch(rail, /ListingFacts|EditionOffers/, "the stacked rows and the copies under the Main NFT are gone");
  const buyNow = rail.slice(rail.indexOf('listing.type === "buyNow" ? ('));
  const order = ["<OfferTop", "Buy now", "<WalletLine", "<LegalLine", "<MainFacts"].map((s) => buyNow.indexOf(s));
  assert.ok(order.every((i, n) => i > -1 && (n === 0 || i > order[n - 1])), `order ${order}`);
  assert.match(rail, /facts=\{<AuctionTop listing=\{listing\} auction=\{auction\} \/>\}/);
  assert.doesNotMatch(rail, /\{ask\}/, "Ask the creator is the Creator block's");
  const parts = read(MARKET + "offer-parts.tsx");
  assert.match(parts, /grid grid-cols-3/);
  // The facts and the activity fold under NFT details.
  assert.match(parts, /aria-expanded=\{open\}/);
  assert.match(rail, /<MoreFacts>\s*<DealFacts listing=\{listing\} view=\{view\} \/>\s*<ActivityNow/);
});

test("one Marketplace box: Main NFT / Physical NFT / Virtual NFT tabs, one panel at a time, the project's own copies only", () => {
  const rail = read(MARKET + "buyer-rail.tsx");
  assert.match(rail, /const kinds = listedKindsOf\(view, PROJECT_SCOPE\);/, "the whole project's copies, never a product's");
  assert.match(rail, /const tabs: OfferTab\[\] = listing \? \["main", \.\.\.kinds\] : kinds;/);
  assert.match(rail, /<OfferTabs tabs=\{tabs\} active=\{tab\} onSelect=\{setPicked\}>/);
  assert.match(rail, /scopeId=\{PROJECT_SCOPE\}/);
  const parts = read(MARKET + "offer-parts.tsx");
  assert.match(parts, /main: "Main NFT",\s*physical: "Physical NFT",\s*virtual: "Virtual NFT",/);
  assert.match(parts, /role="tablist"/);
  assert.match(parts, /if \(tabs\.length < 2\)/, "a lone tab is a chip");
});

test("a copy tab is the same buy box: Use as a choice with its counts, one price, no Version, one Buy now", () => {
  const panel = read(MARKET + "copy-panel.tsx");
  assert.match(panel, /helperLineOf\(kind, scopeName\)/);
  assert.match(panel, /\{offers\.length > 1 && \(\s*<Choice\s+legend="Use"/, "a choice only when both uses are on sale");
  // Owner, 2026-11-15: "this won't be there" — no Version choice; the copy sells at its listing's Price.
  assert.doesNotMatch(panel, /legend="Version"/);
  assert.doesNotMatch(panel, /TIER_WORD|TIER_HELP/, "no version word anywhere in the tab");
  assert.match(panel, /const price = formatAmount\(track\.listing\.regular, track\.listing\.token\);/);
  assert.match(panel, /useEditionPurchase\(\{ project, view, buyerId, versionless: true \}\)/, "the wallet and the done line name no version");
  assert.match(panel, /<OfferTop/);
  assert.match(panel, /hierarchy="primary"/);
  assert.match(panel, />\s*Buy now\s*</);
  assert.doesNotMatch(panel, /ModalFrame/, "no popup before the wallet: the price is chosen on the page");
  assert.match(panel, /<MoreFacts>/);
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

test("a market product page names its project and creator, and sells only its own copies", () => {
  const page = read("components/projects/product/product-page.tsx");
  assert.match(page, /const meta: React\.ReactNode = market \?/);
  assert.match(page, /Part of\{" "\}/);
  const slots = read("components/projects/product/product-slots.tsx");
  assert.doesNotMatch(slots, /WholeProjectOffer/, "never the project's offers on a product page");
  assert.match(slots, /return <EditionBlock \{\.\.\.props\} \/>;/);
  const block = read("components/projects/editions/edition-block.tsx");
  assert.match(block, /<OfferTabs tabs=\{kinds\} active=\{kind\} onSelect=\{setPicked\}>/);
  assert.match(block, /scopeId=\{product\.id\}/);
  // The project's Products tab says where a product's own copies are.
  assert.match(read(MARKET + "market-slots.tsx"), /sale: saleLineOf\(view, p\.id\)/);
  assert.match(read("components/projects/details/products-tab.tsx"), /\{card\.sale && </);
});

test("a marketplace card keeps M25's hover — picture shrinks, button rises from below — without moving any other card", () => {
  // Owner, 2026-11-16: keep the design; the cards "jumped" because a hover changed the card's height. Now only a
  // clip and transforms move: the card's box never changes size, so its row and its neighbours stay still.
  const card = read(MARKET + "listing-card.tsx");
  assert.doesNotMatch(card, /group-hover:h-|transition-\[height\]|group-hover:inline-flex|group-hover:flex|group-hover:opacity/);
  assert.match(card, /group-hover:\[clip-path:inset\(0_0_60px_0_round_var\(--radius-2xl\)\)\]/, "the picture gives up 60 px");
  assert.match(card, /group-hover:-translate-y-\[60px\]/, "the words slide up the same 60 px");
  assert.match(card, /bottom-\[20px\] h-\[44px\] translate-y-\[64px\][\s\S]*group-hover:translate-y-0/, "the button rises from below the card's edge");
  assert.match(card, /overflow-hidden rounded-\[var\(--radius-2xl\)\] border/, "the waiting button is hidden by the card's edge");
});
