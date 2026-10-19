// Settings › the page registry, breadcrumbs, nav and "Find a setting".
import { test } from "node:test";
import assert from "node:assert/strict";

const { SETTINGS_PAGES, settingsCrumbs, settingsNav, settingsPageAt } = await import("../../.tmp-test/lib/settings/registry.js");
const { SETTINGS_ROWS } = await import("../../.tmp-test/lib/settings/rows/index.js");
const { searchSettings, SEARCH_LIMIT } = await import("../../.tmp-test/lib/settings/search.js");

test("every page has rows and unique row ids", () => {
  for (const p of SETTINGS_PAGES) {
    const rows = SETTINGS_ROWS[p.id];
    assert.ok(Array.isArray(rows), p.id);
    const ids = rows.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, `${p.id} has duplicate row ids`);
  }
});

test("the nav follows Figma: groups, then single pages, in order", () => {
  const nav = settingsNav().map((e) => (e.kind === "group" ? e.group : e.page.label));
  assert.deepEqual(nav, ["General", "Preferences", "Audience", "Plan & Pricing", "Policy & Privacy", "Activity", "Report"]);
});

test("crumbs: Settings › Group › Page, the group linking to its first page", () => {
  assert.deepEqual(settingsCrumbs("home"), [{ label: "Settings" }]);
  assert.deepEqual(settingsCrumbs("security"), [
    { label: "Settings", href: "/settings" },
    { label: "General", href: "/settings/profile" },
    { label: "Security" },
  ]);
  assert.deepEqual(settingsCrumbs("activity"), [{ label: "Settings", href: "/settings" }, { label: "Activity" }]);
});

test("the page at a path, including deeper paths and a trailing slash", () => {
  assert.equal(settingsPageAt("/settings").id, "home");
  assert.equal(settingsPageAt("/settings/get-paid/").id, "get-paid");
  assert.equal(settingsPageAt("/settings/plan/checkout").id, "plan");
  assert.equal(settingsPageAt("/projects"), null);
});

test("search: words match label, help, keywords or page; label hits first", () => {
  assert.deepEqual(searchSettings("   "), []);
  const two = searchSettings("2fa");
  assert.equal(two[0].page, "security");
  const bangla = searchSettings("bangla");
  assert.equal(bangla[0].page, "language");
  assert.equal(bangla[0].href, "/settings/language#app-language");
  const block = searchSettings("block");
  assert.equal(block[0].label, "Blocking");
  assert.ok(block.length <= SEARCH_LIMIT);
});

test("search: a control that lives elsewhere opens its home", () => {
  const hit = searchSettings("view as public")[0];
  assert.equal(hit.href, "/creators/me?view=public");
});

test("search: every word must match; accents are folded", () => {
  assert.deepEqual(searchSettings("payout zebra"), []);
  assert.ok(searchSettings("time zone").some((h) => h.rowId === "timezone"));
});
