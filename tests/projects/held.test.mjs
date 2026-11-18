// Waiting for videos (owner, 2026-11-18): what a maker signs while videos are still being made waits
// here, off the marketplace and Innovations, until every video is ready — then it goes live by itself.
import { test } from "node:test";
import assert from "node:assert/strict";

const held = await import("../../.tmp-test/lib/market/held.js");
const { PROJECT_SCOPE } = await import("../../.tmp-test/lib/market/types.js");

const listing = { id: "lst_1", projectId: "p1", slot: "main", status: "live", price: "0.5", token: "ETH" };
const main = { id: "h1", projectId: "p1", at: 1, kind: "main", listing };
const copies = (id, trackId, scope = PROJECT_SCOPE) => ({ id, projectId: "p1", at: 2, kind: "copies", trackId, scope, kindOfCopy: "virtual", terms: { token: "ETH", regular: "0.01", extended: "0.02", royaltyPct: 10 } });
const share = { id: "h3", projectId: "p1", at: 3, kind: "share", story: "Why I built it" };
const relist = { id: "h4", projectId: "p2", at: 4, kind: "relist", listingId: "lst_9" };

test("decodeHeld: keeps what is well formed and drops the rest whole", () => {
  const raw = JSON.stringify({
    version: 1,
    items: [main, copies("h2", "t1"), share, relist, { id: "bad", projectId: "p1", at: 1, kind: "copies" }, { kind: "main" }, 5],
    live: [{ id: "h0", projectId: "p1", projectName: "Kit", kind: "main", at: 9 }, { id: "x" }],
  });
  const s = held.decodeHeld(raw);
  assert.deepEqual(s.items.map((i) => i.id), ["h1", "h2", "h3", "h4"]);
  assert.deepEqual(s.live.map((l) => l.id), ["h0"]);
  assert.deepEqual(held.decodeHeld(null), { version: 1, items: [], live: [] });
  assert.deepEqual(held.decodeHeld("not json"), { version: 1, items: [], live: [] });
});

test("holdItem: a second item for the same thing replaces the first; others stay", () => {
  let s = { version: 1, items: [], live: [] };
  s = held.holdItem(s, main);
  s = held.holdItem(s, copies("h2", "t1"));
  s = held.holdItem(s, copies("h5", "t2"));
  s = held.holdItem(s, { ...main, id: "h6" });
  s = held.holdItem(s, copies("h7", "t1"));
  assert.deepEqual(s.items.map((i) => i.id).sort(), ["h5", "h6", "h7"]);
  assert.deepEqual(held.heldOf(s, "p1").map((i) => i.id).sort(), ["h5", "h6", "h7"]);
  assert.deepEqual(held.heldOf(s, "p2"), []);
});

test("heldPurposeOf: which videos an item waits for", () => {
  assert.equal(held.heldPurposeOf(main), "sell");
  assert.equal(held.heldPurposeOf(share), "showcase");
  assert.equal(held.heldPurposeOf(relist), "relist");
  assert.equal(held.heldPurposeOf(copies("h2", "t1")), "sell");
  assert.equal(held.heldPurposeOf(copies("h2", "t1", "prd_a")), "edition");
});

test("the words: labels, where it goes live, the line", () => {
  assert.equal(held.heldLabelOf(main), "Main NFT listing");
  assert.equal(held.heldLabelOf(copies("h2", "t1")), "Virtual copies");
  assert.equal(held.heldLabelOf(share), "Innovations post");
  assert.equal(held.heldWhereOf("share"), "Innovations");
  assert.equal(held.heldWhereOf("main"), "Explore marketplace");
  assert.equal(held.heldLine("Explore marketplace", 4), "Goes live on Explore marketplace when all 4 videos are ready.");
  assert.equal(held.heldLine("Innovations", 1), "Goes live on Innovations when the video is ready.");
  assert.equal(held.HELD_CHIP, "Waiting for videos");
  assert.match(held.heldId(), /^held_[0-9a-z]+$/);
  assert.notEqual(held.heldId(), held.heldId());
});
