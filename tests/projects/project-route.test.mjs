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
} from "../../.tmp-test/lib/manual/project-route.js";
import { nextTabIndex, revealDelta } from "../../.tmp-test/lib/ui/tab-keys.js";

test("the strip is Products · Media · Network, in that order (COR-19)", () => {
  assert.deepEqual([...PROJECT_TABS], ["products", "media", "network"]);
  assert.deepEqual(
    PROJECT_TABS.map((id) => PROJECT_TAB_LABEL[id]),
    ["Products", "Media", "Network"],
  );
});

test("?tab= reads media and network; anything else is Products (COR-20)", () => {
  assert.equal(parseProjectTab("media"), "media");
  assert.equal(parseProjectTab("network"), "network");
  assert.equal(parseProjectTab("products"), "products");
  assert.equal(parseProjectTab(null), "products");
  assert.equal(parseProjectTab(""), "products");
  assert.equal(parseProjectTab("Network"), "products");
  assert.equal(parseProjectTab("contributors"), "products");
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
