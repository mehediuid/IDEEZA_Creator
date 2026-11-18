// The DS menu panel opens in place under its trigger (owner, 2026-11-16: the Quality dropdown "comes from the sky").
// The panel mounts at left-0 top-0 and is placed after a measure; with `duration-fast` and no transition-property
// the browser timed that move too, so it flew in from the viewport's corner. Only the fade and zoom may animate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

for (const path of ["components/ideeza/menu.tsx", "components/blog/list/popover.ts"]) {
  test(`${path}: the floating panel never transitions its placement`, () => {
    const src = read(path);
    const panel = src.match(/"fixed left-0 top-0 z-popover[^"]*"/)?.[0];
    assert.ok(panel, "the panel's class list");
    assert.match(panel, /duration-fast/);
    assert.match(panel, /\btransition-none\b/, "duration-fast alone would time the move from the corner");
  });
}
