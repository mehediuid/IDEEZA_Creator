// The creator pages use the design system's own text styles (Figma "IDEEZA — Design System",
// Foundations › F01 Typography Scale and its text styles; owner, 2026-10-13: "we can't go outside it").
// Body text is Body/SM (14 px, text-md); 12 px (text-sm) is Caption/MD, Label/MD or a small field note;
// 11 px is Caption/SM (the SM badge) or an uppercase label; 10 px exists only as Overline/SM, which these
// pages don't use; 13 px exists nowhere. These read the sources, so they need no compile step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";

const SRC = new URL("../../src/", import.meta.url);
const read = (path) => readFileSync(new URL(path, SRC), "utf8");

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(new URL(dir, SRC))) {
    const path = `${dir}/${name}`;
    if (statSync(new URL(path, SRC)).isDirectory()) out.push(...filesUnder(path));
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

/** The creator pages' components: My projects, a project, a product, Earn, Explore marketplace, Blog. */
const CREATOR = [
  ...filesUnder("components/projects"),
  ...filesUnder("components/marketplace"),
  ...filesUnder("components/blog"),
  "components/brief/step-details.tsx",
  "components/brief/step-review.tsx",
  "components/brief/step-success.tsx",
];

test("the type tokens are the design system's: 2xs 10 / xs 11 / sm 12 / md 14 / lg 16 — no page redefines them", () => {
  const css = read("styles/tokens.css");
  assert.match(css, /--font-size-2xs: 10px;\s*--font-size-xs: 11px;\s*--font-size-sm: 12px;\s*--font-size-md: 14px;\s*--font-size-lg: 16px;/);
  assert.doesNotMatch(css, /--font-size-(2xs|xs|sm):\s*13px/, "13 px is not a design-system size");
  assert.doesNotMatch(css, /data-type-scale/, "no per-page override of the scale");
});

test("no creator-page text is 10 px (too small to read) or a literal size outside the design system", () => {
  for (const path of CREATOR) {
    const src = read(path);
    assert.doesNotMatch(src, /\btext-2xs\b/, `${path}: 10 px is only Overline/SM, never reading text`);
    assert.doesNotMatch(src, /\btext-\[(9|10|13|15)px\]/, `${path}: a literal size outside the scale`);
  }
});

test("section headings are the design system's H4 (20 px SemiBold, 28 px line)", () => {
  const H4 = "text-2xl font-semibold leading-2xl";
  const block = read("components/projects/details/rail-block.tsx");
  assert.equal(block.split(H4).length - 1, 3, "the rail block's h2, its folded toggle title and the h2 beside an action");
  assert.doesNotMatch(block, /text-(lg|xl) font-bold/);
  assert.match(read("components/projects/earn/surface.tsx"), new RegExp(`EARN_H2 = "m-0 ${H4}`));
  for (const tab of ["products-tab", "media-tab", "team-tab", "customers-tab", "contributors-tab", "network-tab"]) {
    assert.match(read(`components/projects/details/${tab}.tsx`), new RegExp(`<h2[^>]*${H4}`), tab);
  }
});
