import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROJECT_TABS,
  PROJECT_TAB_LABEL,
  parseProjectTab,
  resolveTab,
  withTab,
  resolveProject,
  projectDocTitle,
  productDocTitle,
  marketDocTitle,
  projectTabsFor,
  buyerSide,
  projectRedirectOf,
} from "../../.tmp-test/lib/manual/project-route.js";
import { nextTabIndex, revealDelta } from "../../.tmp-test/lib/ui/tab-keys.js";

test("the strip is Products · Media · Network · Team, in that order (COR-19, P2-TABS-1, Build and Earn P0)", () => {
  assert.deepEqual([...PROJECT_TABS], ["products", "media", "network", "team"]);
  assert.deepEqual(PROJECT_TABS.map((id) => PROJECT_TAB_LABEL[id]), ["Products", "Media", "Network", "Team"]);
});

test("?tab= reads every strip id; the old ?tab=contributors opens Team; anything else is Products (COR-20, P0)", () => {
  assert.equal(parseProjectTab("media"), "media");
  assert.equal(parseProjectTab("network"), "network");
  assert.equal(parseProjectTab("team"), "team");
  assert.equal(parseProjectTab("contributors"), "team");
  assert.equal(parseProjectTab("customers"), "products", "the route sends it to Earn before the page reads it");
  assert.equal(parseProjectTab("products"), "products");
  assert.equal(parseProjectTab(null), "products");
  assert.equal(parseProjectTab(""), "products");
  assert.equal(parseProjectTab("Network"), "products");
  assert.equal(parseProjectTab("premium"), "products");
});

test("projectTabsFor: the tabs each viewer sees, in strip order (P2-TABS-1 as changed, §2.2)", () => {
  const owner = { kind: "local-owner" };
  const buyerPreview = { kind: "owner-preview" };
  const demoBuyer = { kind: "demo-buyer", buyerId: "buyer-mira" };
  const member = { kind: "contributor-preview", contributorId: "ctb_a", name: "Ana", role: "editor", share: 0 };
  const none = { networkReadable: false, contributors: 0 };
  const full = { networkReadable: true, contributors: 2 };

  // The owner: every tab, in every state — Team even with nobody on it (its empty state teaches).
  assert.deepEqual(projectTabsFor(owner, none), ["products", "media", "network", "team"]);
  assert.deepEqual(projectTabsFor(owner, full), ["products", "media", "network", "team"]);
  // A buyer preview or a demo buyer: Network only once there is one to read, Team with ≥ 1
  // contributor (C18).
  for (const v of [buyerPreview, demoBuyer]) {
    assert.deepEqual(projectTabsFor(v, none), ["products", "media"], v.kind);
    assert.deepEqual(projectTabsFor(v, full), ["products", "media", "network", "team"], v.kind);
    assert.deepEqual(projectTabsFor(v, { networkReadable: true, contributors: 0 }), ["products", "media", "network"], v.kind);
  }
  // A contributor preview: Team and Network always.
  assert.deepEqual(projectTabsFor(member, none), ["products", "media", "network", "team"]);
  assert.deepEqual(projectTabsFor({ ...member, role: "coOwner", share: 30 }, full), ["products", "media", "network", "team"]);
});

test("the buyer's side is Preview as buyer and a demo buyer; the owner and a contributor preview read the engineering page (P0)", () => {
  assert.equal(buyerSide({ kind: "owner-preview" }), true);
  assert.equal(buyerSide({ kind: "demo-buyer", buyerId: "buyer-mira" }), true);
  assert.equal(buyerSide({ kind: "local-owner" }), false);
  assert.equal(buyerSide({ kind: "contributor-preview", contributorId: "ctb_a", name: "Ana", role: "editor", share: 0 }), false);
});

test("the addresses that moved to Earn redirect there; everything else stays on the page (P0)", () => {
  // ?list=1 → Earn › Sell, which opens the listing flow once.
  assert.equal(projectRedirectOf("proj_car", { list: "1" }), "/projects/proj_car/earn/sell?list=1");
  assert.equal(projectRedirectOf("proj_car", { list: "1", tab: "media" }), "/projects/proj_car/earn/sell?list=1");
  // ?tab=customers → Earn › Money › Customers, keeping a sale= deep link and nothing else.
  assert.equal(projectRedirectOf("proj_car", { tab: "customers" }), "/projects/proj_car/earn/money#customers");
  assert.equal(
    projectRedirectOf("proj_car", { tab: "customers", sale: "sale_a", view: "buyer" }),
    "/projects/proj_car/earn/money?sale=sale_a#customers",
  );
  assert.equal(projectRedirectOf("proj_car", { tab: ["customers", "media"], sale: ["sale_b"] }), "/projects/proj_car/earn/money?sale=sale_b#customers");
  // An id is encoded once, by the Earn route contract.
  assert.equal(projectRedirectOf("a b", { list: "1" }), "/projects/a%20b/earn/sell?list=1");
  // Not moved: Team (and its old name), the previews, a saved build, list values other than "1".
  for (const q of [{}, { tab: "contributors" }, { tab: "team" }, { view: "buyer" }, { saved: "job_1" }, { list: "0" }, { list: undefined }]) {
    assert.equal(projectRedirectOf("proj_car", q), null, JSON.stringify(q));
  }
});

test("a tab the strip doesn't list falls back to Products (COR-19, COR-49)", () => {
  assert.equal(resolveTab("network", ["products", "network"]), "network");
  assert.equal(resolveTab("network", ["products", "media"]), "products");
  assert.equal(resolveTab("media", ["products"]), "products");
  assert.equal(resolveTab("products", ["products"]), "products");
});

test("choosing a tab rewrites ?tab= only, and Products is never written (COR-20)", () => {
  assert.equal(withTab("", "media"), "tab=media");
  assert.equal(withTab("?tab=media", "products"), "");
  assert.equal(withTab("view=buyer", "network"), "view=buyer&tab=network");
  assert.equal(withTab("tab=contributors", "team"), "tab=team");
  assert.equal(withTab("?view=buyer", "media"), "view=buyer&tab=media");
  assert.equal(withTab("tab=media&view=buyer", "network"), "tab=network&view=buyer");
  assert.equal(withTab("tab=media&view=buyer", "products"), "view=buyer");
});

test("an address resolves by id first, then by slug (COR-1)", () => {
  const list = [
    { id: "proj_a", slug: "car" },
    { id: "car", slug: "car-2" },
    { id: "proj_b", slug: "garden-weather-station" },
  ];
  assert.equal(resolveProject(list, "car")?.id, "car"); // an id beats another project's slug
  assert.equal(resolveProject(list, "garden-weather-station")?.id, "proj_b");
  assert.equal(resolveProject(list, "proj_a")?.id, "proj_a");
  assert.equal(resolveProject(list, "nope"), null);
  assert.equal(resolveProject([], "car"), null);
});

test("document titles (COR-3)", () => {
  assert.equal(projectDocTitle("Car"), "Car · My projects · IDEEZA");
  assert.equal(productDocTitle("Remote Controller", "Car"), "Remote Controller · Car · IDEEZA");
  assert.equal(marketDocTitle("Car"), "Car · Explore marketplace · IDEEZA");
});

test("arrows wrap, Home and End jump, other keys aren't the strip's (COR-20)", () => {
  assert.equal(nextTabIndex("ArrowRight", 0, 3), 1);
  assert.equal(nextTabIndex("ArrowRight", 2, 3), 0);
  assert.equal(nextTabIndex("ArrowLeft", 0, 3), 2);
  assert.equal(nextTabIndex("ArrowLeft", 2, 3), 1);
  assert.equal(nextTabIndex("ArrowDown", 1, 3), 2);
  assert.equal(nextTabIndex("ArrowUp", 1, 3), 0);
  assert.equal(nextTabIndex("Home", 2, 3), 0);
  assert.equal(nextTabIndex("End", 0, 3), 2);
  assert.equal(nextTabIndex("Enter", 0, 3), null);
  assert.equal(nextTabIndex("Tab", 0, 3), null);
  assert.equal(nextTabIndex("ArrowRight", 0, 0), null);
});

test("a tab past either edge of the strip scrolls just into view (COR-21)", () => {
  const view = { left: 0, right: 400 };
  assert.equal(revealDelta({ left: 100, right: 200 }, view, 8), 0);
  assert.equal(revealDelta({ left: 350, right: 460 }, view, 8), 68);
  assert.equal(revealDelta({ left: -40, right: 60 }, view, 8), -48);
  assert.equal(revealDelta({ left: 4, right: 100 }, view, 8), -4);
  assert.equal(revealDelta({ left: 350, right: 460 }, view), 60);
});
