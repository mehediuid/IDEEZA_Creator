// EDIT GATE — edit-gate.ts (decision 12, P2-LISTING-13(C), Phase 2 spec §3.5.9).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { editGateOf, listingEditGate, lockOf, projectLockOf } from "../../.tmp-test/lib/manual/edit-gate.js";

const T = Date.UTC(2026, 8, 22, 9, 0);
const DAY = 86_400_000;

const listing = (over = {}) => ({
  id: "lst_1",
  projectId: "p1",
  slot: "main",
  source: "page",
  listedAt: T,
  updatedAt: T,
  type: "buyNow",
  token: "MATIC",
  price: "0.05",
  percentSelling: 10,
  royaltiesPct: 10,
  mintingType: "lazy",
  network: "mumbai",
  collection: "IDEEZA",
  benefits: [],
  metadata: { name: "Car", description: "", products: [], cover: null, at: T },
  status: "live",
  events: [],
  ...over,
});

// ─────────────────────────── listingEditGate (P2-LISTING-13) ───────────────────────────

describe("listingEditGate", () => {
  for (const kind of ["none", "paused", "ended", "sold"]) {
    it(`is free when the listing view is "${kind}"`, () => {
      const view =
        kind === "none"
          ? { kind: "none" }
          : kind === "paused"
            ? { kind: "paused", listing: listing({ status: "paused" }), changed: [] }
            : kind === "ended"
              ? { kind: "ended", listing: listing({ status: "removed" }), why: "removed" }
              : { kind: "sold", listing: listing({ status: "removed" }), sale: {} };
      assert.deepEqual(listingEditGate(view, "rename"), { kind: "free" });
    });
  }

  it("a live Buy now listing gives confirm, naming the listing", () => {
    const view = { kind: "live", listing: listing(), auction: null };
    assert.deepEqual(listingEditGate(view, "rename"), { kind: "confirm", listingId: "lst_1" });
  });

  it("a running auction blocks with the running copy", () => {
    const view = {
      kind: "live",
      listing: listing({ type: "auction", price: undefined, minBid: "0.04" }),
      auction: { phase: "running", top: null, minNext: "0.04", msLeft: DAY },
    };
    assert.deepEqual(listingEditGate(view, "description"), {
      kind: "blocked",
      reason: "An auction is running — you can change the project after it closes.",
    });
  });

  it("endingSoon reads the same as running", () => {
    const view = {
      kind: "live",
      listing: listing({ type: "auction" }),
      auction: { phase: "endingSoon", top: null, minNext: "0.04", msLeft: 60_000 },
    };
    assert.equal(
      listingEditGate(view, "cover").reason,
      "An auction is running — you can change the project after it closes.",
    );
  });

  it("an ended-but-not-yet-closed auction blocks with its own copy", () => {
    const view = {
      kind: "live",
      listing: listing({ type: "auction" }),
      auction: { phase: "ended", top: null, minNext: "0.04", msLeft: 0 },
    };
    assert.deepEqual(listingEditGate(view, "addProduct"), {
      kind: "blocked",
      reason: "Close the auction first, then change the project.",
    });
  });
});

// ─────────────────────────── lockOf (decision 12) ───────────────────────────

const split = (maker, holdings = []) => ({
  holdings,
  maker,
  reserved: 0,
  sellable: 100 - maker,
  total: 100,
  overAllocated: false,
  split: holdings.length > 0,
  majority: null,
});

const mainSale = (over = {}) => ({
  id: "sale_1",
  listingId: "lst_1",
  projectId: "p1",
  at: T,
  buyerId: "buyer-mira",
  buyerAddress: "0x1",
  sellerAddress: "0x2",
  item: { nft: "main", sharePct: 10 },
  via: "buyNow",
  token: "MATIC",
  price: "0.05",
  fees: { ideezaBps: 250, ideeza: "0.00125", network: { coin: "MATIC", amount: "0.001" } },
  payout: "0.04875",
  royaltiesPct: 10,
  mint: "lazy",
  mintedAtSale: true,
  tokenId: 1,
  network: "mumbai",
  collection: "IDEEZA",
  benefits: [],
  txHash: "0xhash",
  demo: true,
  ...over,
});

describe("lockOf", () => {
  it("is null while the maker holds more than 0, even with sales", () => {
    const s = split(70, [{ holder: { kind: "buyer", saleId: "sale_1", buyerId: "buyer-mira", name: "Mira (demo buyer)" }, percent: 30, since: T }]);
    assert.equal(lockOf(s, [mainSale({ at: T })]), null);
  });

  it("is null when co-owners hold 100% and there has been no sale", () => {
    const s = split(0, [{ holder: { kind: "coOwner", id: "ctb_1", name: "Ana Silva" }, percent: 100, since: T }]);
    assert.equal(lockOf(s, []), null);
  });

  it("is set when the maker holds 0 after a Main sale, with the header's exact line", () => {
    const s = split(0, [
      { holder: { kind: "buyer", saleId: "sale_1", buyerId: "buyer-mira", name: "Mira (demo buyer)" }, percent: 100, since: T },
    ]);
    const lock = lockOf(s, [mainSale({ at: T })]);
    assert.equal(lock.kind, "soldInFull");
    assert.equal(lock.at, T);
    assert.deepEqual(lock.buyers, ["Mira (demo buyer)"]);
    assert.equal(
      lock.line,
      "Sold in full to Mira (demo buyer) on Sep 22, 2026 — it's theirs now, so this project is read-only.",
    );
  });

  it("ignores an edition sale — only a Main sale can lock", () => {
    const s = split(0, [{ holder: { kind: "coOwner", id: "ctb_1", name: "Ana" }, percent: 100, since: T }]);
    const editionSale = mainSale({
      item: { nft: "physical", trackId: "ed_1", productId: "prd_1", productName: "Car", use: "private", tier: "regular", serial: 1 },
    });
    assert.equal(lockOf(s, [editionSale]), null);
  });

  it("names every distinct buyer once, joined, at the latest sale's date", () => {
    const s = split(0, [
      { holder: { kind: "buyer", saleId: "sale_1", buyerId: "buyer-mira", name: "Mira (demo buyer)" }, percent: 60, since: T },
      { holder: { kind: "buyer", saleId: "sale_2", buyerId: "buyer-leo", name: "Leo (demo buyer)" }, percent: 40, since: T + DAY },
    ]);
    const lock = lockOf(s, [mainSale({ id: "sale_1", at: T, buyerId: "buyer-mira" }), mainSale({ id: "sale_2", at: T + DAY, buyerId: "buyer-leo" })]);
    assert.deepEqual(lock.buyers, ["Mira (demo buyer)", "Leo (demo buyer)"]);
    assert.equal(lock.at, T + DAY);
    assert.match(lock.line, /Mira \(demo buyer\) and Leo \(demo buyer\)/);
  });
});

// ─────────────────────────── editGateOf (§3.5.9) ───────────────────────────

describe("editGateOf", () => {
  it("the lock wins over free", () => {
    const lock = { kind: "soldInFull", at: T, buyers: ["Mira (demo buyer)"], line: "Sold in full to Mira (demo buyer) on Sep 22, 2026 — it's theirs now, so this project is read-only." };
    const gate = editGateOf({ listing: { kind: "none" }, lock }, "rename");
    assert.deepEqual(gate, { kind: "locked", reason: lock.line });
  });

  it("the lock wins over confirm", () => {
    const lock = { kind: "soldInFull", at: T, buyers: [], line: "locked line" };
    const view = { kind: "live", listing: listing(), auction: null };
    assert.equal(editGateOf({ listing: view, lock }, "rename").kind, "locked");
  });

  it("with no lock, a live Buy-now listing gives confirm", () => {
    const view = { kind: "live", listing: listing(), auction: null };
    assert.deepEqual(editGateOf({ listing: view, lock: null }, "cover"), { kind: "confirm", listingId: "lst_1" });
  });

  it("with no lock, a running auction gives blocked with the auction copy", () => {
    const view = {
      kind: "live",
      listing: listing({ type: "auction" }),
      auction: { phase: "running", top: null, minNext: "0.04", msLeft: DAY },
    };
    assert.deepEqual(editGateOf({ listing: view, lock: null }, "editProduct"), {
      kind: "blocked",
      reason: "An auction is running — you can change the project after it closes.",
    });
  });

  it("with no lock, an ended auction gives 'Close the auction first…'", () => {
    const view = {
      kind: "live",
      listing: listing({ type: "auction" }),
      auction: { phase: "ended", top: null, minNext: "0.04", msLeft: 0 },
    };
    assert.equal(editGateOf({ listing: view, lock: null }, "addProduct").reason, "Close the auction first, then change the project.");
  });
});

// ─────────────────────────── projectLockOf: one derivation where no view exists ───────────────────────────

describe("projectLockOf", () => {
  const p = { id: "p1", createdAt: T, contributors: [] };
  it("reads the project's own Main sales through ownershipOf + lockOf", () => {
    assert.equal(projectLockOf(p, [mainSale({ item: { nft: "main", sharePct: 60 } })]), null);
    const lock = projectLockOf(p, [mainSale({ item: { nft: "main", sharePct: 100 } })]);
    assert.equal(lock.kind, "soldInFull");
    assert.deepEqual(lock.buyers, ["Mira (demo buyer)"]);
  });
  it("counts co-owners, and ignores another project's sales and edition sales", () => {
    const withAna = { ...p, contributors: [{ id: "ctb_ana00001", name: "Ana", role: "coOwner", share: 40, addedAt: T }] };
    assert.notEqual(projectLockOf(withAna, [mainSale({ item: { nft: "main", sharePct: 60 } })]), null);
    assert.equal(projectLockOf(p, [mainSale({ projectId: "p2", item: { nft: "main", sharePct: 100 } })]), null);
    const edition = mainSale({ item: { nft: "physical", trackId: "ed_1", productId: "p1", productName: "Car", use: "private", tier: "regular", serial: 1 } });
    assert.equal(projectLockOf(p, [edition]), null);
  });
});
