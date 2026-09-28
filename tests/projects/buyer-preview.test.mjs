import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VIEW_PARAM,
  BUYER_VIEW,
  viewerFromParam,
  isBuyerPreview,
  withView,
  networkTabVisible,
} from "../../.tmp-test/lib/manual/buyer-preview.js";

test("VIEW_PARAM and BUYER_VIEW are the query contract", () => {
  assert.equal(VIEW_PARAM, "view");
  assert.equal(BUYER_VIEW, "buyer");
});

test("viewerFromParam('buyer') resolves the visitor viewer", () => {
  assert.deepEqual(viewerFromParam("buyer"), { kind: "owner-preview" });
});

test("viewerFromParam resolves the local owner for null or any other value", () => {
  assert.deepEqual(viewerFromParam(null), { kind: "local-owner" });
  assert.deepEqual(viewerFromParam(""), { kind: "local-owner" });
  assert.deepEqual(viewerFromParam("seller"), { kind: "local-owner" });
});

test("isBuyerPreview matches viewer.kind", () => {
  assert.equal(isBuyerPreview({ kind: "owner-preview" }), true);
  assert.equal(isBuyerPreview({ kind: "local-owner" }), false);
});

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

test("networkTabVisible: the owner always sees the tab (Create Network is its empty state)", () => {
  const owner = { kind: "local-owner" };
  assert.equal(networkTabVisible(owner, false, false), true);
  assert.equal(networkTabVisible(owner, true, false), true);
  assert.equal(networkTabVisible(owner, true, true), true);
});

test("networkTabVisible: a buyer sees it only once hydrated with a network (COR-49, PPL-8)", () => {
  const buyer = { kind: "owner-preview" };
  assert.equal(networkTabVisible(buyer, false, true), false); // not hydrated yet — no flash
  assert.equal(networkTabVisible(buyer, true, false), false); // hydrated, nothing to read
  assert.equal(networkTabVisible(buyer, true, true), true);
});
