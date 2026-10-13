// The Following feed counts this browser's own Follow choices over the dataset's (Innovations post P5).
import { test } from "node:test";
import assert from "node:assert/strict";

const F = await import("../../.tmp-test/lib/feed.js");

const following = (follow) =>
  F.getFeedPage({ mode: "following", category: "all", sort: "newest", q: "" }, null, follow).total;

test("follow overrides round-trip through the query parameter", () => {
  assert.equal(F.followParamOf({ c4: true, c1: false }), "c1:0,c4:1");
  assert.deepEqual(F.parseFollowParam("c4:1,c1:0, bad , x:2"), { c4: true, c1: false });
  assert.deepEqual(F.parseFollowParam(null), {});
});

test("Following adds a maker this browser followed and drops one it stopped following", () => {
  const base = following({});
  const aiko = F.PROJECTS.filter((p) => p.creator.id === "c4").length;
  const naim = F.PROJECTS.filter((p) => p.creator.id === "c1").length;
  assert.equal(F.CREATORS.find((c) => c.id === "c4").following, false);
  assert.equal(F.CREATORS.find((c) => c.id === "c1").following, true);
  assert.equal(following({ c4: true }), base + aiko);
  assert.equal(following({ c1: false }), base - naim);
});
