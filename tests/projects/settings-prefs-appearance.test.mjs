// Settings › Appearance: the attributes <html> carries, and the pre-paint
// script that puts them there before the first paint agrees with them.
import { test } from "node:test";
import assert from "node:assert/strict";

const { appearanceAttrs, APPEARANCE_PREPAINT } = await import("../../.tmp-test/lib/settings/appearance.js");
const { DEFAULT_SETTINGS, SETTINGS_KEY } = await import("../../.tmp-test/lib/settings/prefs.js");

const base = DEFAULT_SETTINGS.appearance;

test("the defaults put nothing on <html>", () => {
  assert.deepEqual(appearanceAttrs(base), { textSize: null, contrast: null, motion: null });
});

test("each choice maps to its attribute", () => {
  assert.deepEqual(appearanceAttrs({ ...base, textSize: "large", contrast: "high", motion: "reduce" }), {
    textSize: "large",
    contrast: "high",
    motion: "reduce",
  });
});

/** Runs the pre-paint script against a stored record and returns <html>'s dataset. */
function prepaint(stored) {
  const dataset = {};
  const localStorage = { getItem: (k) => (k === SETTINGS_KEY ? stored : null) };
  new Function("localStorage", "document", APPEARANCE_PREPAINT)(localStorage, { documentElement: { dataset } });
  return dataset;
}

test("the pre-paint script sets what the record says", () => {
  const stored = JSON.stringify({ appearance: { textSize: "large", contrast: "high", motion: "reduce" } });
  assert.deepEqual(prepaint(stored), { textSize: "large", contrast: "high", motion: "reduce" });
  assert.deepEqual(prepaint(JSON.stringify({ appearance: { textSize: "large" } })), { textSize: "large" });
});

test("nothing stored, or a broken record, sets nothing and never throws", () => {
  assert.deepEqual(prepaint(null), {});
  assert.deepEqual(prepaint("{not json"), {});
  assert.deepEqual(prepaint(JSON.stringify({ appearance: { textSize: "huge", contrast: 1 } })), {});
});
