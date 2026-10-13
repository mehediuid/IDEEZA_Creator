// C7b — the rail's Outcome and About blocks, and the ⋯ menu's Share to Innovations, keep their one-home rules (COM-3, COM-12, COM-18,
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

test("Share to Innovations lives in the ⋯ menu only — no rail block, no link of its own (owner, 2026-10-11)", () => {
  assert.throws(() => read("rail-showcase.tsx"), /ENOENT/, "the rail's Showcase block is gone");
  const menu = read("project-menu.tsx");
  assert.doesNotMatch(menu, /href=/, "the menu's items act; none is a link");
  assert.doesNotMatch(menu, /shareToNewsfeed/);
});

test("Sharing and the owner-only facts ask the one permission source (PPL-1, COM-55, PPL-7)", () => {
  assert.match(read("rail-outcome.tsx"), /can\(viewer, "facts\.seeOwnerOnly"\)/);
  const menu = read("project-menu.tsx");
  assert.match(menu, /can\(viewer, "project\.showcase", view\.canCtx\)/);
  assert.match(menu, /can\(viewer, "project\.delete"\)/);
  assert.match(read("header.tsx"), /const menu = engineering && owner;/, "the ⋯ menu is the owner's, never a preview's");
  // "Share to Innovations" always opens the share dialog — the videos (P2-VIDEO-15), then the post's
  // story and status (owner, 2026-10-12) — and shares with that post. Once shared the item opens the
  // post, where Stop sharing lives (plan D8, 2026-10-13).
  assert.match(menu, /setShowcase\(project\.id, true, undefined, post\)/);
  assert.match(menu, /router\.push\(postHref\(mineSlugOf\(project\)\)\)/);
  assert.match(menu, /<ShareDialog/);
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
  assert.match(read("rail-details.tsx"), /<RailBlock title="About"/);
  assert.match(read("rail-log.tsx"), /<RailBlock title="Recent"/);
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
