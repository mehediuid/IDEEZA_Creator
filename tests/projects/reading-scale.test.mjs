// The creator pages read one type step up (owner, 2026-10-13: "fonts are far too small"):
// tokens.css's reading scale, scoped by <ReadingScale> on each creator route, and the
// dense tools left on the root scale. These read the sources, so they need no compile step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
const route = (path) => src(`app/(create)/${path}`);

test("the reading scale lifts 2xs / xs / sm to 11 / 12 / 13 px, with their line heights, and nothing else", () => {
  const css = src("styles/tokens.css");
  const block = css.match(/\[data-type-scale="reading"\],\s*body:has\(\[data-type-scale="reading"\]\) > :not\(:has\(\[data-type-scale="reading"\]\)\) \{([^}]*)\}/);
  assert.ok(block, "the scope covers the page and the layers portaled to <body> while it is on screen");
  const props = Object.fromEntries([...block[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  assert.deepEqual(props, {
    "--font-size-2xs": "11px",
    "--font-size-xs": "12px",
    "--font-size-sm": "13px",
    "--line-height-2xs": "16px",
    "--line-height-xs": "18px",
    "--line-height-sm": "20px",
  });
  // The root scale the tools keep is untouched.
  assert.match(css, /--font-size-2xs: 10px;\s*--font-size-xs: 11px;\s*--font-size-sm: 12px;\s*--font-size-md: 14px;/);
});

test("ReadingScale adds no box, so the pages' container queries and heights are untouched", () => {
  assert.match(src("components/projects/reading-scale.tsx"), /<div data-type-scale="reading" className="contents">/);
});

test("every creator route wraps its page in ReadingScale", () => {
  for (const path of [
    "projects/page.tsx",
    "projects/[id]/page.tsx",
    "projects/[id]/products/[productId]/page.tsx",
    "projects/[id]/earn/layout.tsx",
    "marketplace/layout.tsx",
  ]) {
    assert.match(route(path), /<ReadingScale>/, path);
  }
});

test("the tools keep the root scale: the network map, chat and build don't take it", () => {
  for (const path of ["projects/[id]/network/page.tsx", "chat/[chatId]/page.tsx", "build/[jobId]/page.tsx", "layout.tsx"]) {
    assert.doesNotMatch(route(path), /ReadingScale|data-type-scale/, path);
  }
});

test("a rail block's heading is one size with the tab panels' and Earn's section headings (text-xl)", () => {
  const block = src("components/projects/details/rail-block.tsx");
  assert.equal(block.match(/text-xl font-bold text-text-primary/g)?.length, 3, "the h2, the folded toggle's title and the h2 beside an action");
  assert.doesNotMatch(block, /text-lg font-bold/);
  assert.match(src("components/projects/earn/surface.tsx"), /EARN_H2 = "m-0 text-xl font-bold/);
});
