// The browser-made clip's frame plan (Phase 2 spec §3.5.7 = VIDEO
// P2-VIDEO-2). Pure maths: what the encoder draws at a given second, and the
// plain-language transcript `VideoPlayer` reads.
import { test } from "node:test";
import assert from "node:assert/strict";

const { describeClip, framePlan } = await import("../../.tmp-test/lib/video/frames.js");

const LINES = ["Line one", "Line two", "Line three"];
const NAME = "Smart Plant Pot";

test("t = 0 s: scene 0, the zoom at its start, line 1, no title", () => {
  const f = framePlan(0, LINES, NAME);
  assert.equal(f.scene, 0);
  assert.equal(f.scale, 1);
  assert.equal(f.line, "Line one");
  assert.equal(f.title, null);
});

test("t = 3 s: scene 1 begins — held at 1.35, panning from its start, line 2", () => {
  const f = framePlan(3, LINES, NAME);
  assert.equal(f.scene, 1);
  assert.equal(f.scale, 1.35);
  assert.equal(f.offsetX, -1);
  assert.equal(f.line, "Line two");
  assert.equal(f.title, null);
});

test("t = 6 s: scene 2 begins — the pull-back starts at 1.20, line 3, still no title band", () => {
  const f = framePlan(6, LINES, NAME);
  assert.equal(f.scene, 2);
  assert.equal(f.scale, 1.2);
  assert.equal(f.line, "Line three");
  assert.equal(f.title, null);
});

test("t = 7.5 s: the title band joins — the product name, over line 3", () => {
  const f = framePlan(7.5, LINES, NAME);
  assert.equal(f.scene, 2);
  assert.equal(f.line, "Line three");
  assert.equal(f.title, "Smart Plant Pot");
  // Midway through the pull-back's last 4 seconds: 1.20 - 0.20 * (1.5/4).
  assert.ok(Math.abs(f.scale - 1.125) < 1e-9);
});

test("t = 10 s: the pull-back finishes at 1.00, title still shown", () => {
  const f = framePlan(10, LINES, NAME);
  assert.equal(f.scene, 2);
  assert.equal(f.scale, 1);
  assert.equal(f.title, "Smart Plant Pot");
});

test("a scene's cross-fade starts at 0 and settles to 1 within 250 ms", () => {
  assert.equal(framePlan(3, LINES, NAME).fade, 0);
  assert.ok(framePlan(3.125, LINES, NAME).fade > 0 && framePlan(3.125, LINES, NAME).fade < 1);
  assert.equal(framePlan(3.25, LINES, NAME).fade, 1);
  assert.equal(framePlan(0, LINES, NAME).fade, 1); // the clip's own opening isn't a cross-fade
});

test("out-of-range seconds clamp to the clip's 10 s", () => {
  assert.deepEqual(framePlan(-5, LINES, NAME), framePlan(0, LINES, NAME));
  assert.deepEqual(framePlan(99, LINES, NAME), framePlan(10, LINES, NAME));
});

test("describeClip: what's actually on screen, with a product image", () => {
  const take = { lines: LINES };
  assert.deepEqual(describeClip(take, NAME, true), [
    "0–3 s — Smart Plant Pot image, slow zoom in. On screen: 'Line one'.",
    "3–6 s — close detail, panning across. On screen: 'Line two'.",
    "6–10 s — full view with the title 'Smart Plant Pot'. On screen: 'Line three'.",
  ]);
});

test("describeClip: a hand-made product with no image describes the gradient instead", () => {
  const take = { lines: LINES };
  const lines = describeClip(take, NAME, false);
  assert.match(lines[0], /gradient background/);
  assert.match(lines[1], /gradient background/);
  // The title band is the same either way — the poster stands in for the image (D9).
  assert.equal(lines[2], "6–10 s — full view with the title 'Smart Plant Pot'. On screen: 'Line three'.");
});
