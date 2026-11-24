// A01 Button: anything drawn with buttonVariants (a Link, an <a>) must look exactly like the
// Button. cva alone keeps clashing classes side by side (the base's `border-transparent` beside
// secondary's / outline-brand's stroke, a size's side padding beside iconOnly's `px-0`), and the
// stylesheet's order then dropped the stroke and squeezed icon-only icons (found 2026-11-24 on the
// Settings home). The exported buttonVariants therefore merges with cn(), as the Button does.
// Reads the source, so it needs no compile step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../../src/components/ideeza/button.tsx", import.meta.url), "utf8");

test("the exported buttonVariants merges cva's classes with cn()", () => {
  assert.match(src, /const buttonCva = cva\(/);
  assert.match(src, /const buttonVariants = \([^)]*\)[^=]*=>\s*cn\(buttonCva\(props\)\)/);
  assert.match(src, /export \{ buttonVariants \}/);
});

test("the base still draws a transparent stroke that a hierarchy's stroke replaces", () => {
  // If the base stops carrying border-transparent, primary/ghost would grow a default border.
  assert.match(src, /border-solid border-transparent/);
  assert.match(src, /border-\[var\(--color-button-secondary-border\)\]/);
  assert.match(src, /border-\[var\(--color-border-brand\)\]/);
});
