// Settings › Appearance & accessibility › Single-key shortcuts: one table per
// editor is both what the editor's keydown handler runs and what the
// Settings page lists, so the list can't drift from the keys.
import { test } from "node:test";
import assert from "node:assert/strict";

const { SHORTCUT_EDITORS, PCB_KEYS, THREE_D_KEYS, MAP_KEYS, singleKeyOf } = await import(
  "../../.tmp-test/lib/settings/shortcuts.js"
);

const key = (k, mods = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

test("every listed key is one character, each id once, each key and Shift once per editor", () => {
  for (const ed of SHORTCUT_EDITORS) {
    assert.ok(ed.name.length > 0);
    const ids = new Set();
    const combos = new Set();
    for (const s of ed.keys) {
      assert.equal(s.key.length, 1, `${ed.name} ${s.key}`);
      assert.ok(s.does.length > 0);
      assert.ok(!ids.has(s.id), `${ed.name}: ${s.id} twice`);
      ids.add(s.id);
      const combo = `${s.shift ? "shift+" : ""}${s.key.toLowerCase()}`;
      assert.ok(!combos.has(combo), `${ed.name}: ${combo} twice`);
      combos.add(combo);
    }
  }
  assert.deepEqual(
    SHORTCUT_EDITORS.map((e) => e.keys),
    [PCB_KEYS, THREE_D_KEYS, MAP_KEYS],
  );
});

test("PCB: H, V, R, and Shift+R the other way", () => {
  assert.equal(singleKeyOf(PCB_KEYS, key("h")), "hand");
  assert.equal(singleKeyOf(PCB_KEYS, key("H", { shiftKey: true })), "hand", "Shift on a key with no Shift entry still runs it");
  assert.equal(singleKeyOf(PCB_KEYS, key("v")), "select");
  assert.equal(singleKeyOf(PCB_KEYS, key("r")), "rotate");
  assert.equal(singleKeyOf(PCB_KEYS, key("R", { shiftKey: true })), "rotateBack");
});

test("3D: G, R, S, H, L, B, Y and 0", () => {
  const got = ["g", "r", "s", "h", "l", "b", "y", "0"].map((k) => singleKeyOf(THREE_D_KEYS, key(k)));
  assert.deepEqual(got, ["move", "rotate", "scale", "hide", "lock", "box", "cylinder", "resetView"]);
});

test("Connection map: V and L", () => {
  assert.equal(singleKeyOf(MAP_KEYS, key("v")), "select");
  assert.equal(singleKeyOf(MAP_KEYS, key("L", { shiftKey: true })), "draw");
});

test("modified and named keys are never single-key shortcuts", () => {
  assert.equal(singleKeyOf(PCB_KEYS, key("h", { metaKey: true })), null);
  assert.equal(singleKeyOf(THREE_D_KEYS, key("0", { ctrlKey: true })), null);
  assert.equal(singleKeyOf(THREE_D_KEYS, key("g", { altKey: true })), null);
  assert.equal(singleKeyOf(PCB_KEYS, key("Escape")), null);
  assert.equal(singleKeyOf(PCB_KEYS, key("x")), null);
});
