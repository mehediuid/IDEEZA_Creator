// C7b — the rail's Outcome, Showcase and Details blocks keep their one-home rules (COM-3, COM-12, COM-18,
// COM-55, PPL-1, PPL-7, COR-54, COR-55, COR-56). The words they render are pinned by
// rail-copy.test.mjs; these read the component sources, so they need no compile step.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) =>
  readFileSync(new URL(`../../src/components/projects/details/${name}`, import.meta.url), "utf8");

test("the Outcome block still has no door to Innovations or the Brief, and no link of its own (COM-12, COM-18, COR-105, Build and Earn P0)", () => {
  const src = read("rail-outcome.tsx");
  assert.equal((src.match(/href=/g) ?? []).length, 0, "the Showcase note's link moved with the Showcase row");
  assert.doesNotMatch(src, /\/innovations/);
  assert.doesNotMatch(src, /shareToNewsfeed/);
  assert.doesNotMatch(src, /ShowcaseFact|setShowcase|ReadinessDialog/, "Showcase is the rail's own block now");
});

test("the Showcase block's only link is P2-VIDEO-15's one-missing-product line, and it has no door to Innovations (P0)", () => {
  const src = read("rail-showcase.tsx");
  const hrefs = src.match(/href=/g) ?? [];
  assert.equal(hrefs.length, 1, "the Showcase note's product-page link is the block's only href");
  assert.match(src, /href=\{link\.href\}/);
  assert.doesNotMatch(src, /\/innovations/);
  assert.doesNotMatch(src, /shareToNewsfeed/);
});

test("Showcase and the owner-only facts ask the one permission source (PPL-1, COM-55, PPL-7)", () => {
  assert.match(read("rail-outcome.tsx"), /can\(viewer, "facts\.seeOwnerOnly"\)/);
  const showcase = read("rail-showcase.tsx");
  assert.match(showcase, /can\(viewer, "facts\.seeOwnerOnly"\)/);
  assert.match(showcase, /can\(viewer, "project\.showcase", view\.canCtx\)/);
  // P2-VIDEO-15: "Stop showcasing" is never gated; "Showcase project" flips at once only once
  // `readinessOf` passes, so the single v1 toggle is now these two explicit calls.
  assert.match(showcase, /setShowcase\(projectId, true\)/);
  assert.match(showcase, /setShowcase\(projectId, false\)/);
  assert.match(showcase, /<ReadinessDialog/);
  assert.match(read("rail-details.tsx"), /can\(viewer, "facts\.seeOwnerOnly"\)/);
});

test("Details has no Ownership row and no See contributors link: who holds what is Earn › Splits (P0)", () => {
  const src = read("rail-details.tsx");
  assert.doesNotMatch(src, /ownership:|goToContributors|"contributors"/);
});

test("Details carries no chat link — Built in lives in the Versions block (COR-55, owner decision O9)", () => {
  assert.doesNotMatch(read("rail-details.tsx"), /"Built in"|\/chat\//);
});

test("the blocks frame themselves in the shared RailBlock, whose probe matches RAIL_MIN (COR-54, COR-56)", () => {
  assert.match(read("rail-showcase.tsx"), /<RailBlock title="Showcase"/);
  assert.match(read("rail-details.tsx"), /<RailBlock/);
  const frame = read("rail-block.tsx");
  assert.match(frame, /export const RAIL_MIN = 1024;/);
  // The block's probe and RailStackScope's (an Earn card's facts) both carry RAIL_MIN − 1.
  assert.equal(frame.match(/\[@container\(max-width:1023px\)\]:w-\[2px\]/g)?.length, 2, "the probe's literal is RAIL_MIN − 1");
});

test("the mint's proof is Earn › Sell's quiet Mint details, owner-only, closed (owner, 2026-10-11)", () => {
  const src = read("rail-outcome.tsx");
  assert.match(src, /export function MintDetails\(/);
  assert.match(src, /<details className="group[^"]*">\s*<summary[^>]*>\s*Mint details/);
  assert.doesNotMatch(src, /<details[^>]* open/, "closed by default");
  assert.doesNotMatch(src, /RailOutcome|"Outcome"/, "no Outcome block or word left");
});
