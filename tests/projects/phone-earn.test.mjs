// The project's Earn side on the phone (mobile Figma "Project Details · 2026 update" 12–19):
// where each Earn screen, the mint, the buyer's view, the previews and a product's video live.
import { test } from "node:test";
import assert from "node:assert/strict";

const e = await import("../../.tmp-test/lib/manual/phone-earn.js");

test("Earn's tabs are the web's four, in its order", () => {
  assert.deepEqual(
    e.PHONE_EARN_TABS.map((t) => t.label),
    ["Overview", "Sell", "Business plan", "Money"],
  );
});

test("each Earn tab has its own address under /m; the Overview has no segment", () => {
  assert.equal(e.phoneEarnHref("p 1"), "/m/projects/p%201/earn");
  assert.equal(e.phoneEarnHref("p1", "sell"), "/m/projects/p1/earn/sell");
  assert.equal(e.phoneEarnHref("p1", "money", { sale: "s1" }), "/m/projects/p1/earn/money?sale=s1");
});

test("only sell, plan and money are a tab's segment", () => {
  assert.equal(e.parsePhoneEarnSection("sell"), "sell");
  assert.equal(e.parsePhoneEarnSection("plan"), "plan");
  assert.equal(e.parsePhoneEarnSection("money"), "money");
  assert.equal(e.parsePhoneEarnSection("overview"), null);
  assert.equal(e.parsePhoneEarnSection("editions"), null);
  assert.equal(e.parsePhoneEarnSection(null), null);
});

test("the mint reads the web's three intents, and private as Keep private", () => {
  assert.equal(e.phoneMintHref("p1"), "/m/projects/p1/earn/mint");
  assert.equal(e.phoneMintHref("p1", "give"), "/m/projects/p1/earn/mint?intent=give");
  assert.equal(e.phoneMintIntentOf("private"), "save");
  assert.equal(e.phoneMintIntentOf("save"), "save");
  assert.equal(e.phoneMintIntentOf("sell"), "sell");
  assert.equal(e.phoneMintIntentOf("give"), "give");
  assert.equal(e.phoneMintIntentOf("rent"), null);
  assert.equal(e.phoneMintIntentOf(null), null);
});

test("the buyer's view, the previews and a product's video and AR screens", () => {
  assert.equal(e.phoneMarketHref("p1"), "/m/projects/p1/market");
  assert.equal(e.phonePreviewHref("p1", "buyer"), "/m/projects/p1/preview?view=buyer");
  assert.equal(e.phonePreviewHref("p1", { contributor: "c 1" }), "/m/projects/p1/preview?view=contributor&as=c%201");
  assert.equal(e.phoneProductVideoHref("p1", "prd_1"), "/m/projects/p1/products/prd_1/video");
  assert.equal(e.phoneProductArHref("p1", "prd_1"), "/m/projects/p1/products/prd_1/ar");
});

test("where a shared project's post shows: on the Feed while something of it is for sale, else on your Timeline (SOC-6)", async () => {
  const { forSaleNowOf, SHARE_OFF_FEED_LINE } = await import("../../.tmp-test/lib/manual/phone-earn.js");
  const none = { listing: { kind: "none" }, lock: null, editions: [] };
  assert.equal(forSaleNowOf(none), false);
  assert.equal(forSaleNowOf({ ...none, listing: { kind: "live" } }), true);
  // A paused or ended Main listing isn't for sale.
  assert.equal(forSaleNowOf({ ...none, listing: { kind: "paused" } }), false);
  // A listed copy is, until the project is sold in full.
  assert.equal(forSaleNowOf({ ...none, editions: [{ listing: null }, { listing: { regular: "0.01" } }] }), true);
  assert.equal(forSaleNowOf({ ...none, lock: { reason: "sold" }, editions: [{ listing: { regular: "0.01" } }] }), false);
  assert.match(SHARE_OFF_FEED_LINE, /your Timeline\. It joins the Feed once it’s for sale\.$/);
});
