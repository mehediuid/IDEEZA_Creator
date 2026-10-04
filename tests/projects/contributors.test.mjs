import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLE_WORD,
  CONTRIBUTOR_NAME_MAX,
  CONTRIBUTORS_MAX,
  newContributorId,
  contributorsIn,
  checkContributor,
  withContributor,
  withoutContributor,
  initialsOf,
  shareCell,
  rosterOf,
  teamOf,
  contributorsTabVisible,
  roleChipOf,
  shareHint,
  majorityNote,
  addedMessage,
  savedMessage,
  removedMessage,
  removeCopy,
} from "../../.tmp-test/lib/manual/contributors.js";
import { ownershipOf } from "../../.tmp-test/lib/manual/ownership.js";

const CREATED = Date.parse("2026-09-22T09:00:00");
const ANA = { id: "ctb_ana00001", name: "Ana Silva", role: "coOwner", share: 30, addedAt: Date.parse("2026-09-24T10:00:00") };
const LEE = { id: "ctb_lee00001", name: "Lee Park", role: "viewer", share: 0, addedAt: Date.parse("2026-09-25T10:00:00") };

function mainSale(buyerId, sharePct, at) {
  return {
    id: "sale_a",
    projectId: "p",
    listingId: "lst_x",
    at,
    buyerId,
    buyerAddress: "0xabc",
    sellerAddress: "0xdef",
    item: { nft: "main", sharePct },
    via: "buyNow",
    token: "ETH",
    price: "0.05",
    fees: { ideezaBps: 250, ideeza: "0", network: { coin: "ETH", amount: "0" } },
    payout: "0.05",
    royaltiesPct: 0,
    mint: "lazy",
    mintedAtSale: true,
    tokenId: 1,
    network: "baseSepolia",
    collection: "c",
    benefits: [],
    txHash: "0x1",
    demo: true,
  };
}

test("constants", () => {
  assert.equal(CONTRIBUTOR_NAME_MAX, 60);
  assert.equal(CONTRIBUTORS_MAX, 50);
  assert.deepEqual(ROLE_WORD, { viewer: "Viewer", editor: "Editor", coOwner: "Co-owner" });
});

test("newContributorId: 'ctb_' plus 8 base-36 characters", () => {
  const id = newContributorId();
  assert.match(id, /^ctb_[0-9a-z]{8}$/);
  assert.notEqual(id, newContributorId());
});

// ─────────────────────────── checkContributor (P2-CONTRIB-5) ───────────────────────────

test("checkContributor: an empty Add reports Name and Role, focus on Name", () => {
  const res = checkContributor({ name: "", role: null, share: "" }, { others: [], maxShare: 100 });
  assert.equal(res.ok, false);
  assert.equal(res.errors.name, "Enter their name.");
  assert.equal(res.errors.role, "Choose a role.");
  assert.equal(res.first, "name");
});

test("checkContributor: a duplicate name, ignoring case and outer spaces", () => {
  const res = checkContributor({ name: "ana silva ", role: "viewer", share: "" }, { others: [ANA], maxShare: 70 });
  assert.equal(res.ok, false);
  assert.equal(res.errors.name, "Ana Silva is already on this project.");
});

test("checkContributor: a share above maxShare", () => {
  const res = checkContributor({ name: "Kofi Mensah", role: "coOwner", share: "71" }, { others: [ANA], maxShare: 70 });
  assert.equal(res.ok, false);
  assert.equal(res.errors.share, "You have 70% available — enter 70% or less.");
});

test("checkContributor: a non-whole share", () => {
  const res = checkContributor({ name: "Kofi Mensah", role: "coOwner", share: "12.5" }, { others: [], maxShare: 100 });
  assert.equal(res.ok, false);
  assert.equal(res.errors.share, "Use a whole number, like 10.");
});

test("checkContributor: an empty or zero share", () => {
  const empty = checkContributor({ name: "Kofi Mensah", role: "coOwner", share: "" }, { others: [], maxShare: 100 });
  assert.equal(empty.errors.share, "Enter a share from 1% to 100%.");
  const zero = checkContributor({ name: "Kofi Mensah", role: "coOwner", share: "0" }, { others: [], maxShare: 100 });
  assert.equal(zero.errors.share, "Enter a share from 1% to 100%.");
});

test("checkContributor: a valid Viewer needs no share", () => {
  const res = checkContributor({ name: " Lee Park ", role: "viewer", share: "" }, { others: [ANA], maxShare: 70 });
  assert.deepEqual(res, { ok: true, value: { name: "Lee Park", role: "viewer", share: 0 } });
});

test("checkContributor: a valid Co-owner", () => {
  const res = checkContributor({ name: "Kofi Mensah", role: "coOwner", share: "10" }, { others: [ANA], maxShare: 70 });
  assert.deepEqual(res, { ok: true, value: { name: "Kofi Mensah", role: "coOwner", share: 10 } });
});

test("checkContributor: never accepts a share over maxShare (P2-CONTRIB-5 #5)", () => {
  for (let max = 0; max <= 100; max += 10) {
    for (const raw of ["1", "50", "99", "100", "101"]) {
      const res = checkContributor({ name: "X", role: "coOwner", share: raw }, { others: [], maxShare: max });
      if (res.ok) assert.ok(res.value.share <= max);
    }
  }
});

// ─────────────────────────── contributorsIn (COR-87) ───────────────────────────

test("contributorsIn: garbage input gives undefined", () => {
  assert.equal(contributorsIn(null), undefined);
  assert.equal(contributorsIn("nope"), undefined);
  assert.equal(contributorsIn([]), undefined);
  assert.equal(contributorsIn([{ nope: true }]), undefined);
});

test("contributorsIn: dedupes ids — the first wins", () => {
  const raw = [
    { id: "ctb_a", name: "Ana", role: "viewer", share: 0, addedAt: 1 },
    { id: "ctb_a", name: "Ana Dup", role: "viewer", share: 0, addedAt: 2 },
  ];
  const out = contributorsIn(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Ana");
});

test("contributorsIn: forces share to 0 off Co-owner", () => {
  const out = contributorsIn([{ id: "ctb_a", name: "Ana", role: "viewer", share: 40, addedAt: 1 }]);
  assert.equal(out[0].share, 0);
});

test("contributorsIn: drops a Co-owner row whose share isn't a whole 1–100", () => {
  const out = contributorsIn([
    { id: "ctb_a", name: "Zero", role: "coOwner", share: 0, addedAt: 1 },
    { id: "ctb_b", name: "Fraction", role: "coOwner", share: 12.5, addedAt: 2 },
    { id: "ctb_c", name: "TooBig", role: "coOwner", share: 101, addedAt: 3 },
    { id: "ctb_d", name: "Valid", role: "coOwner", share: 30, addedAt: 4 },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "ctb_d");
});

test("contributorsIn: returns the same reference when nothing changed", () => {
  const raw = [{ id: "ctb_a", name: "Ana", role: "coOwner", share: 30, addedAt: 1 }];
  assert.equal(contributorsIn(raw), raw);
});

test("contributorsIn: keeps a valid updatedAt, and is still the same reference", () => {
  const raw = [{ id: "ctb_a", name: "Ana", role: "viewer", share: 0, addedAt: 1, updatedAt: 2 }];
  const out = contributorsIn(raw);
  assert.equal(out, raw);
  assert.equal(out[0].updatedAt, 2);
});

// ─────────────────────────── withContributor / withoutContributor ───────────────────────────

test("withContributor: adds a new contributor with a fresh id", () => {
  const out = withContributor([], { name: "Ana Silva", role: "coOwner", share: 30 }, 1000);
  assert.equal(out.length, 1);
  assert.match(out[0].id, /^ctb_[0-9a-z]{8}$/);
  assert.equal(out[0].addedAt, 1000);
});

test("withContributor: edits an existing contributor in place, stamping updatedAt and keeping addedAt", () => {
  const out = withContributor([ANA], { name: "Ana Silva", role: "viewer", share: 0 }, 2000, ANA.id);
  assert.equal(out.length, 1);
  assert.equal(out[0].role, "viewer");
  assert.equal(out[0].updatedAt, 2000);
  assert.equal(out[0].addedAt, ANA.addedAt);
});

test("withoutContributor: removes by id", () => {
  assert.deepEqual(withoutContributor([ANA, LEE], ANA.id), [LEE]);
});

// ─────────────────────────── initialsOf / shareCell ───────────────────────────

test("initialsOf", () => {
  assert.equal(initialsOf("Ana Silva"), "AS");
  assert.equal(initialsOf("Cher"), "C");
  assert.equal(initialsOf("  ana   silva  "), "AS");
  assert.equal(initialsOf(""), "");
});

test("shareCell", () => {
  assert.deepEqual(shareCell("coOwner", 30), { text: "30%", label: "30%" });
  assert.deepEqual(shareCell("viewer", 0), { text: "—", label: "No share" });
  assert.deepEqual(shareCell("editor", 0), { text: "—", label: "No share" });
});

// ─────────────────────────── rosterOf / teamOf ───────────────────────────

test("rosterOf: the owner's rows — maker first, contributors oldest first, then buyer holdings in sale order", () => {
  const sales = [mainSale("buyer-mira", 10, 5)];
  const ownership = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales, listedPercent: 0 });
  const rows = rosterOf({ createdAt: CREATED, contributors: [ANA], ownership, viewer: { kind: "local-owner" } });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].kind, "maker");
  assert.equal(rows[0].name, "You");
  assert.equal(rows[0].role, "Creator");
  assert.equal(rows[0].share.text, "60%");
  assert.equal(rows[1].kind, "contributor");
  assert.equal(rows[1].name, "Ana Silva");
  assert.equal(rows[1].role, "Co-owner");
  assert.equal(rows[1].share.text, "30%");
  assert.equal(rows[2].kind, "buyer");
  assert.equal(rows[2].name, "Mira (demo buyer)");
  assert.equal(rows[2].role, "Shareholder");
  assert.equal(rows[2].share.text, "10%");
  assert.equal(rows[2].sub, "From a sale");
  assert.equal(rows[2].demo, true);
  assert.ok(rows[2].added.text.startsWith("Bought "));
});

test("rosterOf: a Viewer's Share cell reads '—' with the 'No share' label", () => {
  const ownership = ownershipOf({ createdAt: CREATED, contributors: [LEE], sales: [], listedPercent: 0 });
  const rows = rosterOf({ createdAt: CREATED, contributors: [LEE], ownership, viewer: { kind: "local-owner" } });
  assert.deepEqual(rows[1].share, { text: "—", label: "No share" });
});

test("rosterOf: a contributor preview sees 'Project creator' and their own row tagged '(you)'", () => {
  const ownership = ownershipOf({ createdAt: CREATED, contributors: [ANA], sales: [], listedPercent: 0 });
  const viewer = { kind: "contributor-preview", contributorId: ANA.id, name: ANA.name, role: "coOwner", share: 30 };
  const rows = rosterOf({ createdAt: CREATED, contributors: [ANA], ownership, viewer });
  assert.equal(rows[0].name, "Project creator");
  assert.equal(rows[0].role, "Creator");
  assert.equal(rows[1].name, "Ana Silva (you)");
});

test("teamOf: contributors only, oldest first, no maker or buyer rows", () => {
  assert.deepEqual(teamOf([LEE, ANA]), [
    { id: ANA.id, name: "Ana Silva", role: "Co-owner" },
    { id: LEE.id, name: "Lee Park", role: "Viewer" },
  ]);
});

// ─────────────────────────── contributorsTabVisible (P2-CONTRIB-1, spec §2.2) ───────────────────────────

test("contributorsTabVisible", () => {
  assert.equal(contributorsTabVisible({ kind: "local-owner" }, []), true);
  assert.equal(contributorsTabVisible({ kind: "local-owner" }, [ANA]), true);
  assert.equal(contributorsTabVisible({ kind: "owner-preview" }, []), false);
  assert.equal(contributorsTabVisible({ kind: "owner-preview" }, [ANA]), true);
  assert.equal(contributorsTabVisible({ kind: "demo-buyer", buyerId: "buyer-mira" }, []), false);
  assert.equal(contributorsTabVisible({ kind: "demo-buyer", buyerId: "buyer-mira" }, [ANA]), true);
  const member = { kind: "contributor-preview", contributorId: ANA.id, name: ANA.name, role: "coOwner", share: 30 };
  assert.equal(contributorsTabVisible(member, [ANA]), true);
});

// ─────────────────────────── roleChipOf (P2-CONTRIB-13) ───────────────────────────

test("roleChipOf: only for a contributor preview", () => {
  assert.equal(roleChipOf({ kind: "local-owner" }), null);
  assert.equal(roleChipOf({ kind: "owner-preview" }), null);
  assert.equal(roleChipOf({ kind: "demo-buyer", buyerId: "buyer-mira" }), null);
  const coOwner = { kind: "contributor-preview", contributorId: ANA.id, name: ANA.name, role: "coOwner", share: 30 };
  assert.equal(roleChipOf(coOwner), "You're a Co-owner · 30%");
  const editor = { kind: "contributor-preview", contributorId: LEE.id, name: LEE.name, role: "editor", share: 0 };
  assert.equal(roleChipOf(editor), "You're an Editor");
  const viewer = { kind: "contributor-preview", contributorId: LEE.id, name: LEE.name, role: "viewer", share: 0 };
  assert.equal(roleChipOf(viewer), "You're a Viewer");
});

// ─────────────────────────── copy (P2-CONTRIB-4, -6, -7) ───────────────────────────

test("shareHint", () => {
  assert.equal(shareHint(100, 0), "Up to 100%.");
  assert.equal(shareHint(70, 0), "Up to 70%.");
  assert.equal(shareHint(50, 20), "Up to 50%. 20% of yours is in your live listing.");
});

test("majorityNote: null below 51%, names the person or 'they'", () => {
  assert.equal(majorityNote("Ana Silva", 50), null);
  assert.equal(
    majorityNote("Ana Silva", 60),
    "At 60%, Ana Silva would hold most of this project, and the page would show it as owned by them.",
  );
  assert.equal(
    majorityNote("", 60),
    "At 60%, they would hold most of this project, and the page would show it as owned by them.",
  );
});

test("addedMessage", () => {
  assert.equal(addedMessage(ANA), "Ana Silva added as Co-owner · 30%.");
  assert.equal(addedMessage(LEE), "Lee Park added as Viewer.");
});

test("savedMessage", () => {
  assert.equal(savedMessage(ANA), "Changes to Ana Silva saved.");
});

test("removedMessage", () => {
  assert.equal(removedMessage(ANA), "Ana Silva removed — their 30% came back to you.");
  assert.equal(removedMessage(LEE), "Lee Park removed.");
});

test("removeCopy", () => {
  assert.deepEqual(removeCopy(ANA), {
    title: "Remove Ana Silva?",
    body: "They hold 30% of this project. Their share comes back to you, and they leave the contributors list.",
  });
  assert.deepEqual(removeCopy(LEE), { title: "Remove Lee Park?", body: "They leave this project's contributors list." });
});
