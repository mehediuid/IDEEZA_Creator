// The words for selling a share of a project (Build and Earn P1-4): the one fixed note, and
// royalties as a share of resales, if marketplaces honour it. No return or profit is promised.
import { test } from "node:test";
import assert from "node:assert/strict";

const { SHARE_SALE_NOTE, ROYALTY_MEANING, royaltyText } = await import("../../.tmp-test/lib/commerce/share-copy.js");
const flow = await import("../../.tmp-test/lib/market/listing-flow.js");

test("the fixed note is the spec's sentence, word for word", () => {
  assert.equal(
    SHARE_SALE_NOTE,
    "Demo on a testnet. Selling a share of a project can be regulated as an investment where you live; this is not available for real money.",
  );
});

test("royalties are a share of resales, if marketplaces honour it", () => {
  assert.equal(ROYALTY_MEANING, "A share of resales, if marketplaces honour it.");
  assert.equal(royaltyText(5), "5% · a share of resales, if marketplaces honour it");
  assert.equal(royaltyText("2.5"), "2.5% · a share of resales, if marketplaces honour it");
});

test("no share-sale copy promises a return, profit, income or earnings", () => {
  const words = /\b(return|returns|profit|profits|income|earn|earns|earnings|invest in|grow your|passive)\b/i;
  assert.doesNotMatch(SHARE_SALE_NOTE.replace("regulated as an investment", ""), words);
  assert.doesNotMatch(ROYALTY_MEANING, words);
  assert.doesNotMatch(royaltyText(10), words);
});

test("the sold card's royalties read the same way", () => {
  const sale = {
    id: "s1", listingId: "l1", projectId: "p", at: 1, buyerId: "buyer-mira", buyerAddress: "0x1", sellerAddress: "0x2",
    item: { nft: "main", sharePct: 10 }, via: "buyNow", token: "MATIC", price: "1",
    fees: { ideezaBps: 250, ideeza: "0.025", network: { coin: "MATIC", amount: "0.02" } }, payout: "0.975",
    royaltiesPct: 7, mint: "lazy", mintedAtSale: true, tokenId: 1, network: "mumbai", collection: "C", benefits: [], txHash: "0x", demo: true,
  };
  const card = flow.marketplaceCardOf({ kind: "sold", listing: { percentSelling: 10 }, sale }, { bids: [], now: 2 });
  const royalties = card.facts.find((f) => f.label === "Royalties").value.map((v) => v.text).join("");
  assert.equal(royalties, "7% · a share of resales, if marketplaces honour it");
});
