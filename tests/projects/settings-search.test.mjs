// Settings › the page registry, breadcrumbs, nav and "Find a setting".
import { test } from "node:test";
import assert from "node:assert/strict";

const { SETTINGS_PAGES, NAV_PAGES, settingsCrumbs, settingsPageAt, movedHref } = await import("../../.tmp-test/lib/settings/registry.js");
const { SETTINGS_ROWS } = await import("../../.tmp-test/lib/settings/rows/index.js");
const { searchSettings, SEARCH_LIMIT } = await import("../../.tmp-test/lib/settings/search.js");

test("every nav page has rows with unique ids; legacy pages point to a nav page", () => {
  for (const p of NAV_PAGES) {
    const rows = SETTINGS_ROWS[p.id];
    assert.ok(Array.isArray(rows) && rows.length, p.id);
    const ids = rows.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, `${p.id} has duplicate row ids`);
  }
  for (const p of SETTINGS_PAGES.filter((x) => !x.nav)) {
    const to = movedHref(p.id);
    assert.ok(to, p.id);
    assert.ok(NAV_PAGES.some((n) => to.split("#")[0] === n.href), `${p.id} → ${to}`);
  }
});

test("the nav is one flat list of eight pages, labels = page titles", () => {
  assert.deepEqual(
    NAV_PAGES.map((p) => p.label),
    ["Account", "Notifications", "Privacy & safety", "Language & region", "Appearance & accessibility", "AI & your data", "Plan & billing", "Get paid"],
  );
  for (const p of NAV_PAGES) assert.equal(p.label, p.title);
});

test("crumbs: Settings › Page", () => {
  assert.deepEqual(settingsCrumbs("home"), [{ label: "Settings" }]);
  assert.deepEqual(settingsCrumbs("privacy"), [{ label: "Settings", href: "/settings" }, { label: "Privacy & safety" }]);
});

test("the page at a path, including deeper paths and a trailing slash", () => {
  assert.equal(settingsPageAt("/settings").id, "home");
  assert.equal(settingsPageAt("/settings/get-paid/").id, "get-paid");
  assert.equal(settingsPageAt("/settings/plan/checkout").id, "plan");
  assert.equal(settingsPageAt("/settings/kyc").id, "home");
  assert.equal(settingsPageAt("/projects"), null);
});

test("search: label, keywords, help or page; label hits first", () => {
  assert.deepEqual(searchSettings("   "), []);
  assert.deepEqual(searchSettings("how do I"), []);
  const bangla = searchSettings("bangla");
  assert.equal(bangla[0].page, "language");
  assert.equal(bangla[0].href, "/settings/language#app-language");
  assert.equal(searchSettings("2fa")[0].href, "/settings/account#sign-in");
  const block = searchSettings("block");
  assert.equal(block[0].href, "/settings/privacy#blocked");
  assert.ok(block.length <= SEARCH_LIMIT);
});

test("search: everyday words find our rows", () => {
  assert.equal(searchSettings("dark mode")[0].href, "/settings/appearance#theme");
  assert.equal(searchSettings("how do I turn off emails")[0].page, "notifications");
  assert.equal(searchSettings("delete my data")[0].href, "/settings/data#erase");
  assert.equal(searchSettings("kyc")[0].href, "/settings/get-paid#identity");
  assert.equal(searchSettings("change password")[0].href, "/settings/account#sign-in");
  assert.ok(searchSettings("notifications").some((h) => h.href === "/settings/notifications"));
});

test("search: a control that lives elsewhere opens its home", () => {
  assert.equal(searchSettings("view as public")[0].href, "/creators/me?view=public");
});

test("search: one stray word doesn't empty the list; best matches only", () => {
  assert.equal(searchSettings("payout zebra")[0].href, "/settings/get-paid#withdraw");
  const tz = searchSettings("time zone");
  assert.equal(tz[0].href, "/settings/language#time-zone");
  assert.ok(tz.every((h) => h.href !== "/settings/language#date-format"));
  assert.deepEqual(searchSettings("zebra"), []);
});

test("search: short words match whole words only", () => {
  assert.ok(searchSettings("ai").every((h) => h.page !== "notifications"));
});
