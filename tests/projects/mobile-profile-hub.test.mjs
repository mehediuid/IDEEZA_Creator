// The Profile tab (master "Ideeza-Main Profile" 10702:230343, "Profile Settings" 10702:240249):
// every row the hub and its General / Others lists open is a real /m screen (General and Others
// were 404s), and the small words the profile screens work out. Reads the sources for the
// addresses, so a new row with a dead address fails here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  PHONE_SETTINGS_GENERAL_HREF,
  PHONE_SETTINGS_OTHERS_HREF,
  curly,
  languageMatches,
  sampleProfileLocked,
  shortDateOf,
} from "../../.tmp-test/lib/people/phone-profile.js";

const SRC = new URL("../../src/", import.meta.url);
const read = (path) => readFileSync(new URL(path, SRC), "utf8");

/** The page file a /m address opens, in or out of the (tabs) group. */
function routeExists(href) {
  const path = href.split(/[?#]/)[0].replace(/^\/m\/?/, "");
  const dirs = [`app/m/${path}`, `app/m/(tabs)/${path}`];
  return dirs.some((d) => existsSync(new URL(`${d}/page.tsx`, SRC)));
}

const CONSTANTS = { PHONE_SETTINGS_GENERAL_HREF, PHONE_SETTINGS_OTHERS_HREF };

/** Every `href` a source hands a row: string literals and the named constants above. */
function hrefsIn(src) {
  const literal = [...src.matchAll(/href(?:=|:\s*)"(\/m[^"]*)"/g)].map((m) => m[1]);
  const named = [...src.matchAll(/href(?:=\{|:\s*)(PHONE_SETTINGS_\w+_HREF)/g)].map((m) => CONSTANTS[m[1]]);
  return [...literal, ...named];
}

test("every row of the Profile hub and its in-place Settings opens a real screen", () => {
  const hrefs = hrefsIn(read("components/mobile/profile/hub.tsx"));
  for (const want of ["/m/earn/wallet", "/m/earn/refer", "/m/plans", "/m/projects", "/m/saved", "/m/settings/payments", "/m/settings/idz-pay", "/m/settings/security", "/m/help"]) {
    assert.ok(hrefs.includes(want), `hub links ${want}`);
  }
  assert.ok(hrefs.includes(PHONE_SETTINGS_GENERAL_HREF) && hrefs.includes(PHONE_SETTINGS_OTHERS_HREF), "General and Others have their own lists");
  for (const href of hrefs) assert.ok(routeExists(href), `${href} has a page`);
});

test("General and Others list only pages that exist", () => {
  const hrefs = hrefsIn(read("components/mobile/profile/settings-index.tsx"));
  assert.ok(hrefs.length >= 5);
  for (const href of hrefs) assert.ok(routeExists(href), `${href} has a page`);
});

test("a language is found by the name people type for it", () => {
  const options = ["Bangla", "English", "Persian", "Chinese"];
  assert.deepEqual(languageMatches(options, "beng"), ["Bangla"]);
  assert.deepEqual(languageMatches(options, "Farsi"), ["Persian"]);
  assert.deepEqual(languageMatches(options, "mandarin"), ["Chinese"]);
  assert.deepEqual(languageMatches(options, "eng"), ["Bangla", "English"]);
  assert.deepEqual(languageMatches(options, "  "), []);
});

test("one demo creator's profile is locked, and no one else's", () => {
  assert.equal(sampleProfileLocked("feed:c7"), true);
  assert.equal(sampleProfileLocked("feed:c1"), false);
  assert.equal(sampleProfileLocked("me"), false);
});

test("phone copy takes the typographic apostrophe", () => {
  assert.equal(curly("Copied someone's work"), "Copied someone’s work");
  assert.equal(curly("Kai hasn't shared"), "Kai hasn’t shared");
});

test("tile and activity dates read as the web writes them", () => {
  const at = Date.UTC(2026, 9, 12, 12);
  assert.equal(shortDateOf(at), "Oct 12");
  assert.equal(shortDateOf(at, true), "Oct 12, 2026");
});
