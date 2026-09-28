// C7b — the rail's Outcome and Details blocks keep their one-home rules (COM-3, COM-12, COM-18,
// COM-55, PPL-1, PPL-7, COR-54, COR-55, COR-56). The words they render are pinned by
// rail-copy.test.mjs; these read the component sources, so they need no compile step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) =>
  readFileSync(new URL(`../../src/components/projects/details/${name}`, import.meta.url), "utf8");

test("the Outcome block still has no door to Innovations or the Brief — its only link is P2-VIDEO-15's one-missing-product line (COM-12, COM-18, COR-105)", () => {
  const src = read("rail-outcome.tsx");
  const hrefs = src.match(/href=/g) ?? [];
  assert.equal(hrefs.length, 1, "the Showcase note's product-page link is the block's only href");
  assert.match(src, /href=\{link\.href\}/);
  assert.doesNotMatch(src, /\/innovations/);
  assert.doesNotMatch(src, /shareToNewsfeed/);
});

test("Showcase and the owner-only facts ask the one permission source (PPL-1, COM-55, PPL-7)", () => {
  const outcome = read("rail-outcome.tsx");
  assert.match(outcome, /can\(viewer, "facts\.seeOwnerOnly"\)/);
  assert.match(outcome, /can\(viewer, "project\.showcase", \{ status: summary\.status \}\)/);
  // P2-VIDEO-15: "Stop showcasing" is never gated; "Showcase project" flips at once only once
  // `readinessOf` passes, so the single v1 toggle is now these two explicit calls.
  assert.match(outcome, /setShowcase\(projectId, true\)/);
  assert.match(outcome, /setShowcase\(projectId, false\)/);
  assert.match(read("rail-details.tsx"), /can\(viewer, "facts\.seeOwnerOnly"\)/);
});

test("Details carries no chat link — Built in lives in the Versions block (COR-55, owner decision O9)", () => {
  assert.doesNotMatch(read("rail-details.tsx"), /"Built in"|\/chat\//);
});

test("both blocks frame themselves in the shared RailBlock, whose probe matches RAIL_MIN (COR-54, COR-56)", () => {
  assert.match(read("rail-outcome.tsx"), /<RailBlock/);
  assert.match(read("rail-details.tsx"), /<RailBlock/);
  const frame = read("rail-block.tsx");
  assert.match(frame, /export const RAIL_MIN = 1024;/);
  assert.match(frame, /\[@container\(max-width:1023px\)\]:w-\[2px\]/, "the probe's literal is RAIL_MIN − 1");
});
