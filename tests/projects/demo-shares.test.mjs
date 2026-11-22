// The demo posts behind the phone profile's Timeline (owner 2026-11-22: "one post can't show the idea —
// show several"): the lamp shared on Innovations beside the plant, and four clips shared to the Feed with
// words (two projects, two products, one Only me). Prototype only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as demo from "../../.tmp-test/lib/demo/demo-projects.js";
import { demoShareId, demoSharesOf, withDemoShares } from "../../.tmp-test/lib/demo/demo-shares.js";
import { FEED_CLIPS } from "../../.tmp-test/lib/innovations/clips.js";

const NOW = Date.UTC(2026, 10, 22, 12);
const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

test("every demo share is a clip on the Feed, in the past, of every kind", () => {
  const shares = demoSharesOf(NOW);
  assert.equal(shares.length, 4);
  for (const s of shares) {
    assert.ok(FEED_CLIPS.some((c) => c.id === s.clipId), `${s.clipId} plays on the Feed`);
    assert.ok(s.at < NOW);
    assert.ok(s.caption.length > 0);
    assert.equal(s.id, demoShareId(s.clipId));
  }
  const kinds = shares.map((s) => FEED_CLIPS.find((c) => c.id === s.clipId).kind);
  assert.deepEqual([...new Set(kinds)].sort(), ["product", "project"]);
  assert.equal(shares.filter((s) => s.audience === "only-me").length, 1);
});

test("the shares are added once, beside what the phone already holds; unreadable prefs are left alone", () => {
  const first = withDemoShares(undefined, NOW);
  assert.equal(first.shares.length, 4);
  const own = { id: "share_1", clipId: "p3", caption: "mine", audience: "public", at: NOW - 1 };
  const next = withDemoShares({ shares: [own], hidden: ["p10"] }, NOW);
  assert.deepEqual(next.shares.map((s) => s.id), ["share_1", ...demoSharesOf(NOW).map((s) => s.id)]);
  assert.deepEqual(next.hidden, ["p10"], "the rest of the prefs stay");
  assert.equal(withDemoShares(next, NOW), null, "and once only");
  assert.equal(withDemoShares([1, 2], NOW), null);
  assert.equal(withDemoShares("x", NOW), null);
});

test("the lamp is shared on Innovations too; an older planting gets its share unless it is shared or gone", () => {
  const seed = demo.demoSeedOf(NOW);
  const lamp = seed.projects.find((p) => p.id === "proj_demo_lamp");
  assert.equal(typeof lamp.showcasedAt, "number");
  assert.ok(lamp.post.story.length > 0);
  assert.deepEqual(demo.DEMO_SHOWCASED_V8, ["proj_demo_lamp"]);
  const older = { ...lamp };
  delete older.showcasedAt;
  delete older.post;
  const plant = seed.projects.find((p) => p.id === "proj_demo_plant");
  const unshared = { ...plant, showcasedAt: undefined, post: undefined };
  const out = demo.withDemoShowcases([older, unshared, "junk"], seed.projects, demo.DEMO_SHOWCASED_V8);
  assert.equal(out[0].showcasedAt, lamp.showcasedAt);
  assert.equal(out[1], unshared, "only the lamp: the plant's own choice stays");
  assert.equal(out[2], "junk");
  const already = { ...lamp, showcasedAt: 5 };
  assert.equal(demo.withDemoShowcases([already], seed.projects, demo.DEMO_SHOWCASED_V8)[0], already);
});

test("the planter plants the shares on a first planting and on the version 8 top-up", () => {
  const seed = read("components/projects/demo-projects-seed.tsx");
  assert.equal(seed.match(/plantShares\(storage, now\)/g)?.length, 2);
  assert.match(seed, /if \(planted < 8\) \{/);
});
