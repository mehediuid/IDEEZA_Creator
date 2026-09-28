import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VIEW_PARAM,
  BUYER_VIEW,
  CONTRIBUTOR_VIEW,
  AS_PARAM,
  viewerFromParam,
  viewerFromParams,
  isBuyerPreview,
  isPreview,
  isVisitorLike,
  withView,
  networkTabVisible,
} from "../../.tmp-test/lib/manual/buyer-preview.js";

const ANA = { id: "ctb_ana00001", name: "Ana Silva", role: "coOwner", share: 30, addedAt: 1 };
const LEE = { id: "ctb_lee00001", name: "Lee Park", role: "viewer", share: 0, addedAt: 2 };
const CONTRIBUTORS = [ANA, LEE];

const OWNER = { kind: "local-owner" };
const VISITOR = { kind: "owner-preview" };
const MEMBER = { kind: "contributor-preview", contributorId: ANA.id, name: ANA.name, role: ANA.role, share: ANA.share };
const BUYER = { kind: "demo-buyer", buyerId: "buyer-mira" };

test("VIEW_PARAM, BUYER_VIEW, CONTRIBUTOR_VIEW and AS_PARAM are the query contract", () => {
  assert.equal(VIEW_PARAM, "view");
  assert.equal(BUYER_VIEW, "buyer");
  assert.equal(CONTRIBUTOR_VIEW, "contributor");
  assert.equal(AS_PARAM, "as");
});

// ─────────────────────────── viewerFromParam (legacy, kept for current callers) ───────────────────────────

test("viewerFromParam('buyer') resolves the visitor viewer", () => {
  assert.deepEqual(viewerFromParam("buyer"), { kind: "owner-preview" });
});

test("viewerFromParam resolves the local owner for null or any other value", () => {
  assert.deepEqual(viewerFromParam(null), { kind: "local-owner" });
  assert.deepEqual(viewerFromParam(""), { kind: "local-owner" });
  assert.deepEqual(viewerFromParam("seller"), { kind: "local-owner" });
});

// ─────────────────────────── viewerFromParams (P2-CONTRIB-12) ───────────────────────────

test("viewerFromParams('buyer', …) resolves the visitor viewer, whatever 'as' is", () => {
  assert.deepEqual(viewerFromParams("buyer", null, CONTRIBUTORS), { kind: "owner-preview" });
  assert.deepEqual(viewerFromParams("buyer", "ctb_ana00001", CONTRIBUTORS), { kind: "owner-preview" });
});

test("viewerFromParams('contributor', <known id>, …) resolves that contributor's viewer", () => {
  assert.deepEqual(viewerFromParams("contributor", "ctb_ana00001", CONTRIBUTORS), {
    kind: "contributor-preview",
    contributorId: "ctb_ana00001",
    name: "Ana Silva",
    role: "coOwner",
    share: 30,
  });
});

test("viewerFromParams('contributor', <unknown id>, …) falls back to the local owner (P2-CONTRIB-12's guard)", () => {
  assert.deepEqual(viewerFromParams("contributor", "ctb_nobody", CONTRIBUTORS), { kind: "local-owner" });
});

test("viewerFromParams('contributor', null, …) — no 'as' — falls back to the local owner", () => {
  assert.deepEqual(viewerFromParams("contributor", null, CONTRIBUTORS), { kind: "local-owner" });
});

test("viewerFromParams resolves the local owner for null, empty or any other 'view'", () => {
  assert.deepEqual(viewerFromParams(null, null, CONTRIBUTORS), { kind: "local-owner" });
  assert.deepEqual(viewerFromParams("", null, CONTRIBUTORS), { kind: "local-owner" });
  assert.deepEqual(viewerFromParams("seller", null, CONTRIBUTORS), { kind: "local-owner" });
});

// ─────────────────────────── isBuyerPreview / isPreview / isVisitorLike truth tables ───────────────────────────

test("isBuyerPreview is true only for the visitor (owner-preview) viewer", () => {
  assert.equal(isBuyerPreview(OWNER), false);
  assert.equal(isBuyerPreview(VISITOR), true);
  assert.equal(isBuyerPreview(MEMBER), false);
  assert.equal(isBuyerPreview(BUYER), false);
});

test("isPreview: owner-preview and contributor-preview only", () => {
  assert.equal(isPreview(OWNER), false);
  assert.equal(isPreview(VISITOR), true);
  assert.equal(isPreview(MEMBER), true);
  assert.equal(isPreview(BUYER), false);
});

test("isVisitorLike: owner-preview and demo-buyer only", () => {
  assert.equal(isVisitorLike(OWNER), false);
  assert.equal(isVisitorLike(VISITOR), true);
  assert.equal(isVisitorLike(MEMBER), false);
  assert.equal(isVisitorLike(BUYER), true);
});

// ─────────────────────────── withView (widened: keeps tab, drops 'as' unless contributor) ───────────────────────────

test("withView adds view=buyer to an empty query", () => {
  assert.equal(withView("", "buyer"), "view=buyer");
});

test("withView adds view=buyer beside an existing param, keeping it", () => {
  assert.equal(withView("tab=network", "buyer"), "tab=network&view=buyer");
});

test("withView accepts a leading '?'", () => {
  assert.equal(withView("?tab=media", "buyer"), "tab=media&view=buyer");
});

test("withView(search, null) removes view and keeps every other param", () => {
  assert.equal(withView("tab=network&view=buyer", null), "tab=network");
  assert.equal(withView("view=buyer&tab=media", null), "tab=media");
});

test("withView(search, null) on view=buyer alone empties the query", () => {
  assert.equal(withView("view=buyer", null), "");
});

test("withView is idempotent — entering preview twice doesn't duplicate the param", () => {
  assert.equal(withView("view=buyer", "buyer"), "view=buyer");
});

test("withView({contributor}) sets view=contributor and as=<id>, keeping tab", () => {
  assert.equal(withView("tab=media", { contributor: "ctb_ana00001" }), "tab=media&view=contributor&as=ctb_ana00001");
});

test("withView keeps tab and drops 'as' when moving from a contributor preview to buyer", () => {
  assert.equal(withView("tab=contributors&view=contributor&as=ctb_ana00001", "buyer"), "tab=contributors&view=buyer");
});

test("withView(search, null) drops both view and as, keeping tab", () => {
  assert.equal(withView("tab=contributors&view=contributor&as=ctb_ana00001", null), "tab=contributors");
});

test("withView({contributor}) is idempotent", () => {
  assert.equal(
    withView("view=contributor&as=ctb_ana00001", { contributor: "ctb_ana00001" }),
    "view=contributor&as=ctb_ana00001",
  );
});

// ─────────────────────────── networkTabVisible (COR-49, PPL-8) ───────────────────────────

test("networkTabVisible: the owner always sees the tab (Create Network is its empty state)", () => {
  assert.equal(networkTabVisible(OWNER, false, false), true);
  assert.equal(networkTabVisible(OWNER, true, false), true);
  assert.equal(networkTabVisible(OWNER, true, true), true);
});

test("networkTabVisible: a contributor preview always sees the tab, like the owner (spec §2.2)", () => {
  assert.equal(networkTabVisible(MEMBER, false, false), true);
  assert.equal(networkTabVisible(MEMBER, true, false), true);
});

test("networkTabVisible: a buyer preview sees it only once hydrated with a network (COR-49, PPL-8)", () => {
  assert.equal(networkTabVisible(VISITOR, false, true), false); // not hydrated yet — no flash
  assert.equal(networkTabVisible(VISITOR, true, false), false); // hydrated, nothing to read
  assert.equal(networkTabVisible(VISITOR, true, true), true);
});

test("networkTabVisible: a demo buyer follows the same rule as a buyer preview (spec §2.2)", () => {
  assert.equal(networkTabVisible(BUYER, true, false), false);
  assert.equal(networkTabVisible(BUYER, true, true), true);
});
