// The phone's buy box (owner 2026-11-22, study Uq1VPBrq9Jjez6jeWwEkjz): which tab opens, which choice is
// picked, and the words for a choice on the bar and on the wallet's sheet.
import { test } from "node:test";
import assert from "node:assert/strict";

const p = await import("../../.tmp-test/lib/market/buy-pick.js");

const all = () => true;

test("the opening tab is the web's: asked, then a held Main NFT, then the kind bought last, then the first", () => {
  const tabs = ["main", "physical", "virtual"];
  assert.equal(p.openingTabOf({ tabs, asked: null, heldKinds: [], buyable: all }), "main");
  assert.equal(p.openingTabOf({ tabs, asked: "virtual", heldKinds: ["main"], buyable: all }), "virtual");
  assert.equal(p.openingTabOf({ tabs, asked: null, heldKinds: ["virtual", "main"], buyable: all }), "main");
  assert.equal(p.openingTabOf({ tabs, asked: null, heldKinds: ["physical", "virtual"], buyable: all }), "virtual");
  // A tab the screen doesn't have is ignored.
  assert.equal(p.openingTabOf({ tabs: ["physical", "virtual"], asked: "main", heldKinds: ["main"], buyable: all }), "physical");
  assert.equal(p.openingTabOf({ tabs: [], asked: null, heldKinds: [], buyable: all }), null);
});

test("a tab with nothing left to buy is passed over, unless the address asked for it", () => {
  const tabs = ["main", "physical", "virtual"];
  const notMain = (t) => t !== "main";
  assert.equal(p.openingTabOf({ tabs, asked: null, heldKinds: [], buyable: notMain }), "physical");
  assert.equal(p.openingTabOf({ tabs, asked: "main", heldKinds: [], buyable: notMain }), "main");
  // Nothing buyable anywhere: the first in the order still opens.
  assert.equal(p.openingTabOf({ tabs, asked: null, heldKinds: ["virtual"], buyable: () => false }), "virtual");
});

test("the picked choice: the buyer's while it can be bought, else the first open, else the first", () => {
  const c = [
    { key: "use:Personal use", open: false },
    { key: "use:Business use", open: true },
    { key: "holder:r1", open: true },
  ];
  assert.equal(p.pickedChoiceOf(c, null).key, "use:Business use");
  assert.equal(p.pickedChoiceOf(c, "holder:r1").key, "holder:r1");
  assert.equal(p.pickedChoiceOf(c, "use:Personal use").key, "use:Business use");
  assert.equal(p.pickedChoiceOf([{ key: "a", open: false }], null).key, "a");
  assert.equal(p.pickedChoiceOf([], null), null);
});

test("the words: what the bar and the wallet's sheet say a choice is", () => {
  assert.equal(p.MAIN_PICK_TITLE, "Main NFT");
  assert.equal(p.mainBarLine("0.3 ETH", null), "0.3 ETH · 100% of the project");
  assert.equal(p.mainBarLine("0.05 ETH", 10), "0.05 ETH · 10% of the project");
  assert.deepEqual(p.PICK_TAB_LABEL, { main: "Main NFT", physical: "Physical NFT", virtual: "Virtual NFT" });
  assert.equal(p.copyPickTitle("physical", "Personal use"), "Physical NFT · Personal use");
  assert.equal(p.holderPickTitle("virtual", "#1 of 20", "Business use"), "Virtual NFT #1 of 20 · Business use");
  assert.equal(p.copyBarLine("0.02 ETH", "physical", 1), "0.02 ETH · makes 1 unit");
  assert.equal(p.copyBarLine("0.04 ETH", "physical", 50), "0.04 ETH · makes 50 units");
  assert.equal(p.copyBarLine("0.01 ETH", "virtual", null), "0.01 ETH · 3D model and preview");
  assert.equal(p.buyTitleOf({ kind: "main", sharePct: null }), "Buy Main NFT");
  assert.equal(p.buyTitleOf({ kind: "main", sharePct: 25 }), "Buy Main NFT · 25% of the project");
  assert.equal(p.buyTitleOf({ kind: "use", copy: "physical", use: "Personal use" }), "Buy Physical NFT · Personal use");
  assert.equal(
    p.buyTitleOf({ kind: "holder", copy: "physical", number: "#1 of 20", use: "Business use", seller: "Sam" }),
    "Buy Physical NFT #1 of 20 · Business use from Sam",
  );
  assert.equal(p.askedTabOf("physical"), "physical");
  assert.equal(p.askedTabOf("copies"), null);
  assert.equal(p.askedTabOf(null), null);
});
