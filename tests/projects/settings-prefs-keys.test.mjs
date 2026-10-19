// Settings › Appearance › Single-key shortcuts: when off, an editor ignores a
// key that types a character on its own; ⌘/Ctrl/Alt shortcuts and the named
// keys (Escape, Delete, arrows, Space, Enter) keep working (WCAG 2.1.4).
import { test } from "node:test";
import assert from "node:assert/strict";

const { isCharacterKey, singleKeyShortcutsAllowed } = await import("../../.tmp-test/lib/settings/keys.js");

const key = (k, mods = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

test("letters, digits, punctuation and their shifted forms are character keys", () => {
  for (const k of ["w", "W", "h", "0", "9", "+", "-", "[", "?"]) assert.equal(isCharacterKey(key(k)), true, k);
  assert.equal(isCharacterKey(key("R", { shiftKey: true })), true, "Shift+R still types a character");
});

test("named keys and modified keys are not", () => {
  for (const k of ["Escape", "Delete", "Backspace", "Enter", "ArrowLeft", "Tab", " ", "F2", "Shift"]) {
    assert.equal(isCharacterKey(key(k)), false, k);
  }
  assert.equal(isCharacterKey(key("z", { metaKey: true })), false);
  assert.equal(isCharacterKey(key("z", { ctrlKey: true })), false);
  assert.equal(isCharacterKey(key("t", { altKey: true })), false);
});

test("on (the default): every shortcut runs", () => {
  assert.equal(singleKeyShortcutsAllowed(key("w"), true), true);
});

test("off: a bare character key is ignored, everything else still runs", () => {
  assert.equal(singleKeyShortcutsAllowed(key("w"), false), false);
  assert.equal(singleKeyShortcutsAllowed(key("R", { shiftKey: true }), false), false);
  assert.equal(singleKeyShortcutsAllowed(key("z", { metaKey: true }), false), true);
  assert.equal(singleKeyShortcutsAllowed(key("Escape"), false), true);
  assert.equal(singleKeyShortcutsAllowed(key("Delete"), false), true);
  assert.equal(singleKeyShortcutsAllowed(key(" "), false), true, "Space-to-pan stays");
});

test("with no stored choice (no browser storage) shortcuts stay on", () => {
  assert.equal(singleKeyShortcutsAllowed(key("w")), true);
});
