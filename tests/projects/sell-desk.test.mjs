// Earn › Sell as a sales desk (owner, 2026-11-18, plan A with every
// recommendation): the board's tiles, the default tile, the line over the
// board and which products get a row (src/lib/market/sell-desk.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  ATTENTION,
  DESK_KIND_LINE,
  copyTileOf,
  defaultTileOf,
  deskCaptionOf,
  deskProductsOf,
  deskTitleOf,
  mainTileOf,
  marketHrefOf,
  priceRangeOf,
  tileKeyOf,
} = await import("../../.tmp-test/lib/market/sell-desk.js");
const { PROJECT_SCOPE } = await import("../../.tmp-test/lib/market/types.js");

const P = "proj_desk";
const listingOf = (regular, token = "ETH") => ({ token, regular, extended: regular, royaltyPct: 10, listedAt: 1, updatedAt: 1 });
const track = (id, productId, kind, use, total, regular = null) => ({
  id,
  projectId: P,
  productId,
  kind,
  use,
  supply: { total },
  createdAt: 1,
  lazy: true,
  listing: regular ? listingOf(regular) : null,
});
let n = 0;
const sale = (trackId, price, buyerId, at, nft = "physical") => ({
  id: `s${++n}`,
  listingId: trackId,
  projectId: P,
  at,
  buyerId,
  item: nft === "main" ? { nft: "main", sharePct: price.share ?? 100 } : { nft, trackId, productId: PROJECT_SCOPE, use: "private", tier: "regular", serial: 1 },
  token: "ETH",
  price: typeof price === "string" ? price : price.amount,
  payout: typeof price === "string" ? String(Number(price) * 0.975) : String(Number(price.amount) * 0.975),
  network: "baseSepolia",
});
const manage = { kind: "manage", lines: ["x"], more: null };

test("priceRangeOf: one price, a range in one token, and tokens apart", () => {
  assert.equal(priceRangeOf([]), null);
  assert.equal(priceRangeOf([{ amount: "0.04", token: "ETH" }]), "0.04 ETH");
  assert.equal(priceRangeOf([{ amount: "0.04", token: "ETH" }, { amount: "0.03", token: "ETH" }]), "0.03–0.04 ETH");
  assert.equal(priceRangeOf([{ amount: "0.03", token: "ETH" }, { amount: "0.03", token: "ETH" }]), "0.03 ETH");
  assert.equal(priceRangeOf([{ amount: "5", token: "USDC" }, { amount: "0.01", token: "ETH" }]), "0.01 ETH · 5 USDC");
});

test("copyTileOf: two uses on sale, one sold — price range, uses, meter, earned, buyers", () => {
  const tracks = [track("a", PROJECT_SCOPE, "physical", "private", 30, "0.03"), track("b", PROJECT_SCOPE, "physical", "commercial", 20, "0.04")];
  const t = copyTileOf({ projectId: P, scope: PROJECT_SCOPE, kind: "physical", state: manage, tracks, sales: [sale("b", "0.04", "buyer-sam", 50)] });
  assert.equal(t.key, tileKeyOf(PROJECT_SCOPE, "physical"));
  assert.deepEqual(t.chip, { label: "On sale", tone: "success" });
  assert.equal(t.price, "0.03–0.04 ETH");
  assert.equal(t.uses, "2 uses");
  assert.deepEqual(t.meter, { sold: 1, total: 50 });
  assert.equal(t.soldLine, "1 of 50 sold");
  assert.equal(t.earned.length, 1);
  assert.equal(t.earned[0].amount, "0.039");
  assert.equal(t.buyers, 1);
  assert.equal(t.lastSaleAt, 50);
  assert.equal(t.live, true);
  assert.equal(t.attention, 0);
});

test("copyTileOf: every listed copy sold — Sold out waits for the maker", () => {
  const tracks = [track("v", "prd_tank", "virtual", "private", 2, "0.006")];
  const sales = [sale("v", "0.006", "buyer-sam", 10, "virtual"), sale("v", "0.006", "buyer-leo", 20, "virtual")];
  const t = copyTileOf({ projectId: P, scope: "prd_tank", kind: "virtual", state: manage, tracks, sales });
  assert.deepEqual(t.chip, { label: "Sold out", tone: "brand" });
  assert.equal(t.live, false);
  assert.equal(t.attention, ATTENTION.soldOut);
  assert.equal(t.uses, "Personal use");
  assert.equal(t.buyers, 2);
  assert.equal(t.sales[0].buyerId, "buyer-leo", "newest first");
});

test("copyTileOf: the row's blocked and sell states read as short chips, no price", () => {
  const of = (state) => copyTileOf({ projectId: P, scope: PROJECT_SCOPE, kind: "virtual", state, tracks: [], sales: [] });
  assert.equal(of({ kind: "blocked", line: "Not minted yet", link: "mint" }).chip.label, "Not minted yet");
  assert.equal(of({ kind: "blocked", line: "Stopped · the project was sold", link: null }).chip.label, "Stopped");
  assert.equal(of({ kind: "blocked", line: "Given to the community, so copies aren't sold.", link: null }).chip.label, "Given");
  assert.deepEqual(of({ kind: "blocked", line: "A later version dropped this product, so it can't sell new copies.", link: null }).chip, { label: "Can't sell", tone: "warning" });
  const sell = of({ kind: "sell", line: "Not selling" });
  assert.deepEqual(sell.chip, { label: "Not selling", tone: "neutral" });
  assert.equal(sell.price, null);
  assert.equal(sell.meter, null);
});

const live = (extra = {}) => ({ kind: "live", listing: { id: "l", type: "buyNow", token: "ETH", price: "0.2", percentSelling: 100, ...extra }, auction: null });

test("mainTileOf: listed at a fixed price", () => {
  const t = mainTileOf({ projectId: P, action: "manage", status: "listed", locked: false, listing: live(), sales: [], inCheckout: false });
  assert.deepEqual(t.chip, { label: "On sale", tone: "success" });
  assert.equal(t.price, "0.2 ETH");
  assert.equal(t.uses, "Buy now");
  assert.equal(t.soldLine, "0% sold");
  assert.equal(t.live, true);
  assert.equal(t.attention, 0);
});

test("mainTileOf: a buyer in checkout, an auction, a paused listing, nothing listed", () => {
  assert.equal(mainTileOf({ projectId: P, action: "manage", status: "listed", locked: false, listing: live(), sales: [], inCheckout: true }).attention, ATTENTION.inCheckout);
  const auction = mainTileOf({
    projectId: P,
    action: "manage",
    status: "listed",
    locked: false,
    listing: { kind: "live", listing: { id: "l", type: "auction", token: "ETH", minBid: "0.1" }, auction: { phase: "endingSoon", top: { amount: "0.15" }, minNext: "0.16", msLeft: 1 } },
    sales: [],
    inCheckout: false,
  });
  assert.equal(auction.chip.label, "Auction");
  assert.equal(auction.price, "0.15 ETH");
  assert.equal(auction.uses, "Top bid");
  assert.equal(auction.attention, ATTENTION.endingSoon);
  const paused = mainTileOf({ projectId: P, action: "manage", status: "listed", locked: false, listing: { kind: "paused", listing: { token: "ETH", price: "0.2" }, changed: [] }, sales: [], inCheckout: false });
  assert.deepEqual(paused.chip, { label: "Paused", tone: "warning" });
  assert.equal(paused.attention, ATTENTION.paused);
  const none = mainTileOf({ projectId: P, action: "list", status: "private", locked: false, listing: { kind: "none" }, sales: [], inCheckout: false });
  assert.deepEqual(none.chip, { label: "Not selling", tone: "neutral" });
  assert.equal(none.meter, null);
  assert.equal(none.attention, ATTENTION.mainNotListed);
});

test("mainTileOf: not minted, part sold, sold in full", () => {
  const draft = mainTileOf({ projectId: P, action: "mint", status: "draft", locked: false, listing: { kind: "none" }, sales: [], inCheckout: false });
  assert.equal(draft.chip.label, "Not minted yet");
  assert.equal(draft.attention, 0);
  const part = mainTileOf({ projectId: P, action: "list", status: "sold", locked: false, listing: { kind: "none" }, sales: [sale(null, { amount: "0.1", share: 40 }, "buyer-mira", 5, "main")], inCheckout: false });
  assert.deepEqual(part.chip, { label: "Part sold", tone: "brand" });
  assert.equal(part.soldLine, "40% sold");
  assert.equal(part.price, "0.1 ETH");
  const full = mainTileOf({ projectId: P, action: "disabled", status: "sold", locked: true, listing: { kind: "none" }, sales: [sale(null, { amount: "0.12", share: 100 }, "buyer-leo", 9, "main")], inCheckout: false });
  assert.deepEqual(full.chip, { label: "Sold in full", tone: "brand" });
  assert.equal(full.price, "0.12 ETH");
  assert.equal(full.soldLine, "100% sold");
  assert.equal(full.buyers, 1);
});

test("defaultTileOf (D5): what waits first, then the latest sale, then the Main NFT; a hash asks for a product's copies", () => {
  const tile = (key, attention = 0, lastSaleAt = null, kind = "physical", scope = PROJECT_SCOPE, chip = "On sale") => ({ key, attention, lastSaleAt, kind, scope, chip: { label: chip } });
  const main = tile("project:main", 0, null, "main");
  assert.equal(defaultTileOf([]), null);
  assert.equal(defaultTileOf([main, tile("project:physical")]), "project:main");
  assert.equal(defaultTileOf([main, tile("project:physical", 0, 40), tile("p1:virtual", 0, 90, "virtual", "p1")]), "p1:virtual");
  assert.equal(defaultTileOf([tile("project:main", ATTENTION.mainNotListed, null, "main"), tile("p1:virtual", ATTENTION.soldOut, 1, "virtual", "p1")]), "p1:virtual");
  const board = [main, tile("project:physical"), tile("p1:physical", 0, null, "physical", "p1", "Can't sell"), tile("p1:virtual", 0, null, "virtual", "p1"), tile("p2:physical", 0, null, "physical", "p2")];
  assert.equal(defaultTileOf(board, "#copies"), "p1:virtual");
  assert.equal(defaultTileOf(board, "#editions-p2"), "p2:physical");
});

test("deskCaptionOf (D6): on sale, sold out, copies sold, and the Overview's earned sum", () => {
  const tiles = [{ live: true, chip: { label: "On sale" } }, { live: false, chip: { label: "Sold out" } }, { live: false, chip: { label: "Not selling" } }];
  const sales = [sale("a", "0.04", "buyer-sam", 1), sale("a", "0.04", "buyer-leo", 2)];
  assert.deepEqual(deskCaptionOf({ projectId: P, tiles, sales, locked: false }), [
    { value: "1 of 3", label: "on sale" },
    { value: "1", label: "sold out" },
    { value: "2", label: "copies sold" },
    { value: "0.078 ETH", label: "earned" },
  ]);
  assert.deepEqual(deskCaptionOf({ projectId: P, tiles: [], sales: [], locked: false }).at(-1), { value: "Nothing", label: "earned yet" });
  assert.equal(deskCaptionOf({ projectId: P, tiles, sales, locked: true })[0].value, "Sold in full");
});

test("deskProductsOf (D3): one product is the project's own row unless it has tracks of its own", () => {
  const one = [{ id: "p1", dropped: null }];
  assert.deepEqual(deskProductsOf(one, []), []);
  assert.deepEqual(deskProductsOf(one, [track("t", PROJECT_SCOPE, "virtual", "private", 5)]), []);
  assert.deepEqual(deskProductsOf(one, [track("t", "p1", "virtual", "private", 5)]).map((p) => p.id), ["p1"]);
  const three = [{ id: "p1", dropped: null }, { id: "p2", dropped: null }, { id: "p3", dropped: { at: 1 } }];
  assert.deepEqual(deskProductsOf(three, []).map((p) => p.id), ["p1", "p2"]);
  assert.deepEqual(deskProductsOf(three, [track("t", "p3", "physical", "private", 5)]).map((p) => p.id), ["p1", "p2", "p3"]);
  const droppedOne = [{ id: "p1", dropped: null }, { id: "old", dropped: { at: 1 } }];
  assert.deepEqual(deskProductsOf(droppedOne, [track("t", "old", "physical", "private", 5)]).map((p) => p.id), ["p1", "old"]);
});

test("the panel's words and the marketplace address", () => {
  assert.equal(deskTitleOf("main", null, "Smart Plant Pot"), "Smart Plant Pot");
  assert.equal(deskTitleOf("physical", null, "Smart Plant Pot"), "Physical copies of the whole project");
  assert.equal(deskTitleOf("virtual", "RefillTank", "Smart Plant Pot"), "Virtual copies of RefillTank");
  assert.equal(DESK_KIND_LINE.main, "The project itself · whole project only");
  assert.equal(marketHrefOf("p 1", PROJECT_SCOPE, "virtual"), "/marketplace/p%201?nft=virtual");
  assert.equal(marketHrefOf("p1", "prd_x", "physical"), "/marketplace/p1/products/prd_x");
});
