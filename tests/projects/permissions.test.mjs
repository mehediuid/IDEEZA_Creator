// Permissions, complete (Phase 2 spec §3.8): the four viewer kinds, every cell of the
// §3.8.2 table, the needs, the lock (§3.8.5) and the delete gate (§3.8.4) — plus v1's
// outcome ↔ status agreement (§5.1.4).
import { test } from "node:test";
import assert from "node:assert/strict";

const { ACTIONS, can, coOwnersDetail, deleteBlockOf, hasAudience, roleOf } = await import(
  "../../.tmp-test/lib/manual/permissions.js"
);
const { commerceOf, parseBriefDraft } = await import("../../.tmp-test/lib/brief/project-brief.js");
const { formatDate, projectStatus } = await import("../../.tmp-test/lib/manual/project-summary.js");

const OWNER = { kind: "local-owner" };
const VISITOR = { kind: "owner-preview" };
const member = (role) => ({
  kind: "contributor-preview",
  contributorId: "ctb_ana00001",
  name: "Ana Silva",
  role,
  share: role === "coOwner" ? 30 : 0,
});
const BUYER = { kind: "demo-buyer", buyerId: "buyer-mira" };
const MEMBERS = ["viewer", "editor", "coOwner"].map(member);
const VIEWERS = [OWNER, VISITOR, ...MEMBERS, BUYER];
const nameOf = (v) => (v.kind === "contributor-preview" ? `member(${v.role})` : v.kind);

// §3.8.2, one row per action. O owner · V visitor · M member (every role) · E member (editor,
// coOwner only) · B buyer. `L`: refused while ctx.locked.
const TABLE = {
  "project.rename": ["O", "L"],
  "project.editDescription": ["O", "L"],
  "project.delete": ["O"],
  "project.brief": ["O"],
  "project.showcase": ["O"],
  "product.add": ["O", "L"],
  "product.edit": ["O", "L"],
  "product.openEditor": ["O", "L"],
  "network.manage": ["O", "L"],
  "app.manage": ["O", "L"],
  "activity.write": ["O", "L"],
  "video.generate": ["O", "L"],
  "mint.run": ["O", "L"],
  "mint.changeWallet": ["O", "L"],
  "listing.create": ["O", "L"],
  "listing.manage": ["O"],
  "listing.seePublic": ["OVEB"],
  "listing.buy": ["B"],
  "listing.bid": ["B"],
  "purchase.seeSummary": ["B"],
  "creator.support": ["B"],
  "deliverables.download": ["OMB"],
  "facts.seeOwnerOnly": ["O"],
  "preview.enter": ["O"],
  "customers.see": ["O"],
  "people.seeTeam": ["OVMB"],
  "people.seeRoster": ["OM"],
  "ownership.see": ["OM"],
  "people.invite": ["O", "L"],
  "people.manage": ["O", "L"],
  "editions.manage": ["O", "L"],
  "businessPlan.manage": ["O", "L"],
  "legal.edit": ["O", "L"],
  "activity.seeListedMarker": ["O"],
  // NOT_YET: nobody.
  "ownership.listShare": [""],
  "project.report": [""],
  "share.newsfeed": [""],
  "premiumParts.manage": [""],
};
const LOCKED = Object.keys(TABLE).filter((a) => TABLE[a][1] === "L");

function granted(action, viewer) {
  const who = TABLE[action][0];
  switch (viewer.kind) {
    case "local-owner":
      return who.includes("O");
    case "owner-preview":
      return who.includes("V");
    case "contributor-preview":
      return who.includes("M") || (who.includes("E") && viewer.role !== "viewer");
    case "demo-buyer":
      return who.includes("B");
  }
}

// A context that meets every need there is, so only the grant decides. Creating a listing needs
// none/ended/sold; managing one needs live/paused.
const OPEN = { status: "private", mint: "lazyMinted", creatorPct: 100, listingLive: true, auction: "running", holding: true };
const openCtx = (action) => ({ ...OPEN, listing: action === "listing.manage" ? "live" : "none" });

test("the action list is exactly §3.8.2's, with no v1 project.openEditor", () => {
  assert.deepEqual([...ACTIONS].sort(), Object.keys(TABLE).sort());
  assert.equal(ACTIONS.includes("project.openEditor"), false);
});

test("each viewer kind has its role (§3.8.1)", () => {
  assert.equal(roleOf(OWNER), "owner");
  assert.equal(roleOf(VISITOR), "visitor");
  for (const m of MEMBERS) assert.equal(roleOf(m), "member");
  assert.equal(roleOf(BUYER), "buyer");
});

test("every cell of §3.8.2, for each viewer kind, with every need met", () => {
  for (const action of ACTIONS) {
    for (const viewer of VIEWERS) {
      assert.equal(can(viewer, action, openCtx(action)), granted(action, viewer), `${action} · ${nameOf(viewer)}`);
    }
  }
});

test("a preview never writes: no visitor or member cell holds a write or an owner-only fact", () => {
  const reads = new Set(["listing.seePublic", "people.seeTeam", "people.seeRoster", "ownership.see", "deliverables.download"]);
  for (const viewer of [VISITOR, ...MEMBERS]) {
    for (const action of ACTIONS) {
      if (can(viewer, action, openCtx(action))) assert.ok(reads.has(action), `${action} · ${nameOf(viewer)}`);
    }
  }
});

test("an unmet need refuses: an empty context grants only the actions with no need", () => {
  const needless = new Set(Object.keys(TABLE).filter((a) => ![
    "project.showcase", "mint.changeWallet", "listing.create", "listing.manage", "listing.buy", "listing.bid",
    "purchase.seeSummary", "creator.support",
  ].includes(a)));
  for (const action of ACTIONS) {
    for (const viewer of VIEWERS) {
      // A buyer downloads only while holding; the maker and a member need nothing.
      const expected =
        needless.has(action) && granted(action, viewer) && !(action === "deliverables.download" && viewer === BUYER);
      assert.equal(can(viewer, action), expected, `${action} · ${nameOf(viewer)}`);
    }
  }
});

test("the lock (§3.8.5) refuses every L action, and keeps View brief, Showcase, Preview and every read", () => {
  for (const action of ACTIONS) {
    const locked = { ...openCtx(action), locked: true };
    const expected = granted(action, OWNER) && !LOCKED.includes(action);
    assert.equal(can(OWNER, action, locked), expected, action);
  }
  const locked = { status: "sold", listing: "sold", mint: "onChain", creatorPct: 0, locked: true };
  for (const action of ["project.brief", "project.showcase", "preview.enter", "facts.seeOwnerOnly", "customers.see", "project.delete"]) {
    assert.equal(can(OWNER, action, locked), true, action);
  }
  for (const action of ["project.rename", "product.openEditor", "video.generate", "listing.create", "people.invite", "legal.edit"]) {
    assert.equal(can(OWNER, action, locked), false, action);
  }
  // `locked: false` and no `locked` are the same.
  assert.equal(can(OWNER, "project.rename", { locked: false }), true);
  assert.equal(can(OWNER, "project.rename"), true);
});

test("Showcase needs a mint: never on a Draft, never without the status (COR-105, X41)", () => {
  assert.equal(can(OWNER, "project.showcase", { status: "draft" }), false);
  assert.equal(can(OWNER, "project.showcase"), false);
  for (const status of ["private", "given", "listed", "paused", "sold", "minted"]) {
    assert.equal(can(OWNER, "project.showcase", { status }), true, status);
  }
});

test("listing.create needs Private or Sold, no live or paused listing, and a share to sell", () => {
  const ok = { status: "private", listing: "none", creatorPct: 100 };
  assert.equal(can(OWNER, "listing.create", ok), true);
  assert.equal(can(OWNER, "listing.create", { ...ok, creatorPct: 0 }), false);
  assert.equal(can(OWNER, "listing.create", { status: "private", listing: "none" }), false);
  assert.equal(can(OWNER, "listing.create", { ...ok, status: "sold", listing: "sold", creatorPct: 40 }), true);
  assert.equal(can(OWNER, "listing.create", { ...ok, listing: "ended" }), true);
  for (const status of ["draft", "given", "listed", "paused", "minted"]) {
    assert.equal(can(OWNER, "listing.create", { ...ok, status }), false, status);
  }
  for (const listing of ["live", "paused"]) assert.equal(can(OWNER, "listing.create", { ...ok, listing }), false, listing);
});

test("listing.manage needs a live or paused listing", () => {
  for (const listing of ["live", "paused"]) assert.equal(can(OWNER, "listing.manage", { listing }), true, listing);
  for (const listing of ["none", "ended", "sold"]) assert.equal(can(OWNER, "listing.manage", { listing }), false, listing);
  assert.equal(can(OWNER, "listing.manage"), false);
});

test("listing.buy and listing.bid are a buyer's, on a live listing; bidding only while the auction runs", () => {
  assert.equal(can(BUYER, "listing.buy", { listingLive: true }), true);
  assert.equal(can(BUYER, "listing.buy", { listingLive: false }), false);
  for (const auction of ["running", "endingSoon"]) {
    assert.equal(can(BUYER, "listing.bid", { listingLive: true, auction }), true, auction);
  }
  assert.equal(can(BUYER, "listing.bid", { listingLive: true, auction: "ended" }), false);
  assert.equal(can(BUYER, "listing.bid", { listingLive: true }), false);
  assert.equal(can(BUYER, "listing.bid", { listingLive: false, auction: "running" }), false);
  assert.equal(can(OWNER, "listing.buy", { listingLive: true }), false); // no self-purchase
});

test("a holder's summary, support and downloads need `holding`; the maker and a member download freely", () => {
  for (const action of ["purchase.seeSummary", "creator.support", "deliverables.download"]) {
    assert.equal(can(BUYER, action, { holding: true }), true, action);
    assert.equal(can(BUYER, action, { holding: false }), false, action);
  }
  assert.equal(can(OWNER, "deliverables.download"), true);
  for (const m of MEMBERS) assert.equal(can(m, "deliverables.download"), true, m.role);
  assert.equal(can(VISITOR, "deliverables.download", { holding: true }), false);
});

test("mint.changeWallet needs a lazy mint (P2-MINT-11)", () => {
  assert.equal(can(OWNER, "mint.changeWallet", { mint: "lazyMinted" }), true);
  for (const mint of ["notMinted", "onChain", "legacy"]) assert.equal(can(OWNER, "mint.changeWallet", { mint }), false, mint);
});

test("P2-CUSTOMERS-19 and P2-VIDEO-20: customers and video are the maker's only", () => {
  assert.equal(can(OWNER, "customers.see"), true);
  assert.equal(can(VISITOR, "customers.see"), false);
  assert.equal(can(OWNER, "video.generate"), true);
  assert.equal(can(VISITOR, "video.generate"), false);
  for (const v of [...MEMBERS, BUYER]) {
    assert.equal(can(v, "customers.see"), false, nameOf(v));
    assert.equal(can(v, "video.generate"), false, nameOf(v));
  }
});

test("a contributor preview sees the listing only as an editor or co-owner", () => {
  assert.equal(can(member("viewer"), "listing.seePublic"), false);
  assert.equal(can(member("editor"), "listing.seePublic"), true);
  assert.equal(can(member("coOwner"), "listing.seePublic"), true);
});

test("hasAudience: only a Private project that isn't showcased has nobody to preview for (PPL-9, X26)", () => {
  assert.equal(hasAudience("private", null), false);
  assert.equal(hasAudience("private", { at: 1 }), true);
  for (const status of ["draft", "given", "listed", "paused", "sold", "minted"]) {
    assert.equal(hasAudience(status, null), true, status);
  }
});

// ── The delete gate (§3.8.4) ──

const FREE = { marketUnreadable: false, sold: { sharePct: 0, editions: 0 }, auction: null, listed: false, otherOwners: [] };
const ENDS = new Date(2026, 9, 3, 14, 30).getTime();
const ANA = { kind: "coOwner", name: "Ana Silva", percent: 30 };
const KOFI = { kind: "coOwner", name: "Kofi Mensah", percent: 10 };
const LEE = { kind: "coOwner", name: "Lee Park", percent: 5 };

test("nothing blocks a project with no market facts and no co-owner share", () => {
  assert.equal(deleteBlockOf(FREE), null);
  // A co-owner at 0 % holds nothing, so it never blocks.
  assert.equal(deleteBlockOf({ ...FREE, otherOwners: [{ ...ANA, percent: 0 }] }), null);
  // The maker may press Delete; the block, not can(), says why it can't run (COR-67).
  assert.equal(can(OWNER, "project.delete", { status: "listed" }), true);
  assert.equal(can(VISITOR, "project.delete"), false);
});

test("rule 0 · marketUnreadable: its reason and detail", () => {
  assert.deepEqual(deleteBlockOf({ ...FREE, marketUnreadable: true }), {
    id: "marketUnreadable",
    reason: "This project can't be deleted right now.",
    detail: "This browser's marketplace records couldn't be read, so we can't tell whether it's listed or sold.",
  });
});

test("rule 1 · sold: its reason, and the detail for a share, for NFTs and for both", () => {
  const sold = (s) => deleteBlockOf({ ...FREE, sold: { sharePct: 0, editions: 0, ...s } });
  assert.deepEqual(sold({ sharePct: 10 }), {
    id: "sold",
    reason: "A sold project can't be deleted.",
    detail: "A buyer owns 10% of it.",
  });
  assert.equal(sold({ sharePct: 10, buyers: 1 }).detail, "A buyer owns 10% of it.");
  assert.equal(sold({ sharePct: 30, buyers: 3 }).detail, "Buyers own 30% of it.");
  assert.equal(sold({ editions: 3 }).detail, "Buyers hold 3 of its NFTs.");
  assert.equal(sold({ editions: 1 }).detail, "A buyer holds 1 of its NFTs.");
  assert.equal(sold({ sharePct: 10, editions: 3 }).detail, "Buyers own 10% of it and hold 3 of its NFTs.");
  assert.equal(sold({ sharePct: 12.5 }).detail, "A buyer owns 12.5% of it.");
});

test("rule 2 · auction: its reason, and the end date in the detail", () => {
  assert.deepEqual(deleteBlockOf({ ...FREE, auction: { endsAt: ENDS } }), {
    id: "auction",
    reason: "A project in an auction can't be deleted.",
    detail: `Close the auction after it ends on ${formatDate(ENDS)}, in the Marketplace block.`,
  });
  assert.equal(formatDate(ENDS), "Oct 3, 2026");
});

test("rule 3 · listed: its reason and the way out (P2-LISTING-19)", () => {
  assert.deepEqual(deleteBlockOf({ ...FREE, listed: true }), {
    id: "listed",
    reason: "A listed project can't be deleted.",
    detail: "Remove the listing first — it's in the Marketplace block.",
  });
});

test("rule 4 · otherOwners: its reason, the co-owner detail and the Open Contributors link (P2-CONTRIB-14)", () => {
  const link = { label: "Open Contributors", tab: "contributors" };
  assert.deepEqual(deleteBlockOf({ ...FREE, otherOwners: [ANA] }), {
    id: "otherOwners",
    reason: "Someone else owns part of this project, so it can't be deleted.",
    detail: "Ana Silva holds 30%. Change their role or remove them in Contributors first.",
    link,
  });
  assert.equal(
    deleteBlockOf({ ...FREE, otherOwners: [ANA, KOFI] }).detail,
    "Ana Silva and Kofi Mensah hold 40% between them. Change their roles or remove them in Contributors first.",
  );
  assert.equal(
    deleteBlockOf({ ...FREE, otherOwners: [ANA, KOFI, LEE] }).detail,
    "Ana Silva and 2 others hold 45% between them. Change their roles or remove them in Contributors first.",
  );
  assert.equal(coOwnersDetail([]), null);
  assert.equal(coOwnersDetail([{ ...ANA, percent: 0 }, KOFI]), deleteBlockOf({ ...FREE, otherOwners: [KOFI] }).detail);
  // Only otherOwners carries the link.
  assert.equal("link" in deleteBlockOf({ ...FREE, listed: true }), false);
});

test("the order: marketUnreadable > sold > auction > listed > otherOwners (C6)", () => {
  const all = {
    marketUnreadable: true,
    sold: { sharePct: 10, editions: 0 },
    auction: { endsAt: ENDS },
    listed: true,
    otherOwners: [ANA],
  };
  const order = [];
  let facts = all;
  for (;;) {
    const block = deleteBlockOf(facts);
    if (!block) break;
    order.push(block.id);
    facts = {
      ...facts,
      ...(block.id === "marketUnreadable" && { marketUnreadable: false }),
      ...(block.id === "sold" && { sold: { sharePct: 0, editions: 0 } }),
      ...(block.id === "auction" && { auction: null }),
      ...(block.id === "listed" && { listed: false }),
      ...(block.id === "otherOwners" && { otherOwners: [] }),
    };
  }
  assert.deepEqual(order, ["marketUnreadable", "sold", "auction", "listed", "otherOwners"]);
});

// ── v1: the outcome and the status never disagree ──

test("commerceOf's outcome and projectStatus() never disagree (§5.1.4)", () => {
  const MINTED = Date.UTC(2026, 8, 22, 21, 9);
  const NOW = Date.UTC(2026, 8, 26, 12, 0);
  const EXPECTED = {
    none: "draft",
    briefing: "draft",
    private: "private",
    given: "given",
    listed: "listed",
    mintedUnreadable: "minted",
  };
  const project = (status = "draft") => ({
    id: "proj_a", slug: "a", name: "A", productName: "", description: "", status,
    createdAt: 1, updatedAt: 1,
    flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
  });
  const draft = (state, step = "form") => parseBriefDraft(JSON.stringify({ state, step }));
  const cases = [
    [project(), null],
    [project(), draft({}, "idea")],
    [project(), draft({ intent: "sell" }, "preview")],
    [project(), draft({ intent: "save", mintedAt: MINTED }, "success")],
    [project("completed"), draft({ intent: "save", mintedAt: MINTED }, "success")],
    [project("completed"), draft({ intent: "give", mintedAt: MINTED, license: "mit" }, "success")],
    [project("completed"), draft({ intent: "sell", mintedAt: MINTED, price: "0.05" }, "success")],
    [project("completed"), draft({ mintedAt: MINTED }, "success")], // minted, its intent unreadable
    [project("completed"), null],
    [project("completed"), draft({ intent: "give" }, "form")],
  ];
  for (const [p, d] of cases) {
    const outcome = commerceOf(p, d, [], NOW).outcome;
    assert.equal(projectStatus(p, d), EXPECTED[outcome], `${p.status} · ${JSON.stringify(d?.state.intent)} · ${outcome}`);
  }
});
