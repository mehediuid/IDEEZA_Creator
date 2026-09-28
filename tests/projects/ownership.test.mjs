import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAJORITY,
  ownershipOf,
  maxShareFor,
  sellableShareOf,
  otherOwnersOf,
  otherOwnersDetail,
  ownershipRow,
  ownedBySegment,
} from "../../.tmp-test/lib/manual/ownership.js";

const CREATED = Date.parse("2026-09-22T09:00:00");

const ANA = { id: "ctb_ana00001", name: "Ana Silva", role: "coOwner", share: 30, addedAt: Date.parse("2026-09-24T10:00:00") };
const KOFI = { id: "ctb_kofi0001", name: "Kofi Mensah", role: "coOwner", share: 10, addedAt: Date.parse("2026-09-25T10:00:00") };
const NIA = { id: "ctb_nia00001", name: "Nia Osei", role: "coOwner", share: 5, addedAt: Date.parse("2026-09-26T09:00:00") };
const LEE = { id: "ctb_lee00001", name: "Lee Park", role: "viewer", share: 0, addedAt: Date.parse("2026-09-26T10:00:00") };

function mainSale(id, buyerId, sharePct, at) {
  return {
    id,
    listingId: "lst_x",
    projectId: "proj_c1",
    at,
    buyerId,
    buyerAddress: "0xabc",
    sellerAddress: "0xdef",
    item: { nft: "main", sharePct },
    via: "buyNow",
    token: "ETH",
    price: "0.05",
    fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "ETH", amount: "0.0001" } },
    payout: "0.04875",
    royaltiesPct: 0,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1,
    network: "baseSepolia",
    collection: "col",
    benefits: [],
    txHash: "0x1",
    demo: true,
  };
}

test("MAJORITY is 51", () => {
  assert.equal(MAJORITY, 51);
});

test("ownershipOf: solo — the maker holds everything, and isn't split", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [], sales: [], listedPercent: 0 });
  assert.equal(s.maker, 100);
  assert.equal(s.split, false);
  assert.equal(s.overAllocated, false);
  assert.equal(s.holdings.length, 1);
  assert.equal(s.holdings[0].holder.kind, "maker");
  assert.equal(s.majority.holder.kind, "maker");
});

test("ownershipOf: with a co-owner — the maker keeps the remainder, oldest holdings first", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 0 });
  assert.equal(s.maker, 70);
  assert.equal(s.split, true);
  assert.equal(s.holdings.length, 2);
  assert.equal(s.holdings[0].holder.kind, "maker");
  assert.deepEqual(s.holdings[1].holder, { kind: "coOwner", id: ANA.id, name: "Ana Silva" });
});

test("ownershipOf: a Viewer or Editor never holds a share", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [LEE], sales: [], listedPercent: 0 });
  assert.equal(s.maker, 100);
  assert.equal(s.holdings.length, 1);
});

test("ownershipOf: a reserve is the live listing's Percent Selling, clamped to the maker", () => {
  const under = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 20 });
  assert.equal(under.reserved, 20);
  assert.equal(under.sellable, 50);
  const over = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 90 });
  assert.equal(over.reserved, 70);
  assert.equal(over.sellable, 0);
});

test("ownershipOf: a 10% sale then a 20% sale leaves the maker at 70%", () => {
  const sales = [mainSale("sale_a", "buyer-mira", 10, 1), mainSale("sale_b", "buyer-leo", 20, 2)];
  const s = ownershipOf({ createdAt: CREATED, contributors: [], sales, listedPercent: 0 });
  assert.equal(s.maker, 70);
  assert.equal(s.holdings.length, 3);
});

test("ownershipOf: a 100% sale leaves the maker at 0%, and the buyer is the majority", () => {
  const sales = [mainSale("sale_a", "buyer-mira", 100, 1)];
  const s = ownershipOf({ createdAt: CREATED, contributors: [], sales, listedPercent: 0 });
  assert.equal(s.maker, 0);
  assert.equal(s.majority.holder.kind, "buyer");
  assert.equal(s.majority.holder.name, "Mira (demo buyer)");
});

test("ownershipOf: over-allocation (a hand-edited record) clamps the maker to 0 and flags it", () => {
  const s = ownershipOf({
    createdAt: CREATED,
    contributors: [ANA, KOFI, { id: "ctb_x", name: "Xin Wu", role: "coOwner", share: 70, addedAt: 3 }],
    sales: [],
    listedPercent: 0,
  });
  assert.equal(s.total, 110);
  assert.equal(s.overAllocated, true);
  assert.equal(s.maker, 0);
});

test("ownershipOf: a majority at exactly 51% is found; a 50/50 split has none", () => {
  const at51 = ownershipOf({ createdAt: CREATED, contributors: [{ ...ANA, share: 51 }], sales: [], listedPercent: 0 });
  assert.equal(at51.majority.percent, 51);
  assert.equal(at51.majority.holder.kind, "coOwner");
  const at5050 = ownershipOf({ createdAt: CREATED, contributors: [{ ...ANA, share: 50 }], sales: [], listedPercent: 0 });
  assert.equal(at5050.majority, null);
});

test("maxShareFor: the maker's share when adding; plus the co-owner's own share when editing them", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 0 });
  assert.equal(maxShareFor(s, null), 70);
  assert.equal(maxShareFor(s, ANA), 100);
  assert.equal(maxShareFor(s, LEE), 70);
});

test("sellableShareOf: the maker's sellable share; editing a live listing counts its reserve back in", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 20 });
  assert.equal(sellableShareOf(s), 50);
  assert.equal(sellableShareOf(s, { editingLiveListing: true }), 70);
});

test("otherOwnersOf: co-owners only — a buyer holding is never in this list", () => {
  const sales = [mainSale("sale_a", "buyer-mira", 10, 1)];
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales, listedPercent: 0 });
  assert.deepEqual(otherOwnersOf(s), [{ kind: "coOwner", name: "Ana Silva", percent: 30 }]);
});

test("otherOwnersDetail: one, two and three-or-more co-owners (reuses permissions.ts's coOwnersDetail, one home for the copy)", () => {
  const one = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 0 });
  assert.deepEqual(otherOwnersDetail(otherOwnersOf(one)), {
    detail: "Ana Silva holds 30%. Change their role or remove them in Contributors first.",
    linkToContributors: true,
  });
  const two = ownershipOf({ createdAt: CREATED, contributors: [ANA, KOFI], sales: [], listedPercent: 0 });
  assert.deepEqual(otherOwnersDetail(otherOwnersOf(two)), {
    detail: "Ana Silva and Kofi Mensah hold 40% between them. Change their roles or remove them in Contributors first.",
    linkToContributors: true,
  });
  const three = ownershipOf({ createdAt: CREATED, contributors: [ANA, KOFI, NIA], sales: [], listedPercent: 0 });
  assert.deepEqual(otherOwnersDetail(otherOwnersOf(three)), {
    detail: "Ana Silva and 2 others hold 45% between them. Change their roles or remove them in Contributors first.",
    linkToContributors: true,
  });
});

test("otherOwnersDetail: no co-owners gives an empty, unlinked result", () => {
  assert.deepEqual(otherOwnersDetail([]), { detail: "", linkToContributors: false });
});

test("ownershipRow: absent for the owner on a sole-owner project", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [], sales: [], listedPercent: 0 });
  assert.equal(ownershipRow(s, { kind: "local-owner" }), null);
});

test("ownershipRow: the owner's row on a split project", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 0 });
  const row = ownershipRow(s, { kind: "local-owner" });
  assert.deepEqual(row, { label: "Ownership", value: "You · 70%", note: "Ana Silva 30%", link: "See contributors" });
});

test("ownershipRow: the note adds '+n more' beyond two other holders", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA, KOFI, NIA], sales: [], listedPercent: 0 });
  const row = ownershipRow(s, { kind: "local-owner" });
  assert.equal(row.note, "Ana Silva 30% · Kofi Mensah 10% · 1 more");
});

test("ownershipRow: absent for a buyer preview", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 0 });
  assert.equal(ownershipRow(s, { kind: "owner-preview" }), null);
});

test("ownershipRow: 'Your role' for a contributor preview, always shown", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 0 });
  const coOwnerViewer = { kind: "contributor-preview", contributorId: ANA.id, name: ANA.name, role: "coOwner", share: 30 };
  assert.deepEqual(ownershipRow(s, coOwnerViewer), { label: "Your role", value: "Co-owner · 30%" });
  const editorViewer = { kind: "contributor-preview", contributorId: LEE.id, name: LEE.name, role: "editor", share: 0 };
  assert.deepEqual(ownershipRow(s, editorViewer), { label: "Your role", value: "Editor" });
});

test("ownedBySegment: absent below a majority", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 0 });
  assert.equal(ownedBySegment(s, { kind: "local-owner" }), null);
});

test("ownedBySegment: the owner's view once a co-owner reaches 51%", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [{ ...ANA, share: 60 }], sales: [], listedPercent: 0 });
  assert.deepEqual(ownedBySegment(s, { kind: "local-owner" }), { created: "Created by you", ownedBy: "Ana Silva", linked: true });
});

test("ownedBySegment: a buyer preview reads 'Owned by' with no 'Created by' and no link", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [{ ...ANA, share: 60 }], sales: [], listedPercent: 0 });
  assert.deepEqual(ownedBySegment(s, { kind: "owner-preview" }), { created: null, ownedBy: "Ana Silva", linked: false });
});

test("ownedBySegment: the majority holder previewing themselves reads 'Owned by you'", () => {
  const s = ownershipOf({ createdAt: CREATED, contributors: [{ ...ANA, share: 60 }], sales: [], listedPercent: 0 });
  const viewer = { kind: "contributor-preview", contributorId: ANA.id, name: "Ana Silva", role: "coOwner", share: 60 };
  assert.deepEqual(ownedBySegment(s, viewer), { created: null, ownedBy: "you", linked: true });
});

test("ownedBySegment: a majority buyer holding reads their buyer label", () => {
  const sales = [mainSale("sale_a", "buyer-mira", 60, 1)];
  const s = ownershipOf({ createdAt: CREATED, contributors: [], sales, listedPercent: 0 });
  assert.deepEqual(ownedBySegment(s, { kind: "local-owner" }), {
    created: "Created by you",
    ownedBy: "Mira (demo buyer)",
    linked: true,
  });
});
