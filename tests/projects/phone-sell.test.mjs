// Earn › Sell on the phone (mobile Figma "Project Details · 2026 update" 14, 15d): the owner's
// licence words on the shared copies requests, Manage's order of uses, and the folded copy rows
// before a mint.
import { test } from "node:test";
import assert from "node:assert/strict";

const s = await import("../../.tmp-test/lib/market/phone-sell.js");

test("the licence words are Personal use / Business use", () => {
  assert.equal(s.plainUseWords("Virtual NFT · Private use · 10 NFTs"), "Virtual NFT · Personal use · 10 NFTs");
  assert.equal(s.plainUseWords("Commercial use Physical NFTs are listed"), "Business use Physical NFTs are listed");
  assert.equal(s.plainUseWords("Price"), "Price");
});

test("a request keeps everything but its words", () => {
  const req = {
    kind: "signature",
    purpose: "createEditions",
    identity: "maker",
    network: "baseSepolia",
    title: "Create 10 lazy NFTs — no charge",
    summary: [
      { label: "NFT", value: "Virtual NFT · Private use" },
      { label: "Number of NFTs", value: "10" },
    ],
    note: "Each NFT is minted only when it's bought, so nothing is charged now.",
    doneLine: "10 Commercial use Virtual NFTs created — Testnet demo",
  };
  const out = s.withUseWords(req);
  assert.equal(out.purpose, "createEditions");
  assert.equal(out.network, "baseSepolia");
  assert.deepEqual(out.summary, [
    { label: "NFT", value: "Virtual NFT · Personal use" },
    { label: "Number of NFTs", value: "10" },
  ]);
  assert.equal(out.doneLine, "10 Business use Virtual NFTs created — Testnet demo");
  assert.equal(req.summary[0].value, "Virtual NFT · Private use", "the original request is left as it was");
});

test("Manage lists Personal use first, then Business use", () => {
  assert.deepEqual([...s.PHONE_USES], ["private", "commercial"]);
});

test("before the mint the copy rows fold into one line each", () => {
  assert.equal(s.preMintCopiesLine("Lamp", "project"), "Mint Lamp first — its NFTs use the project's collection and blockchain.");
  assert.equal(s.preMintCopiesLine("Lamp", "products"), "Mint Lamp first — product copies use the project's collection too.");
});
