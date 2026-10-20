// The Innovations feed: Following counts this browser's own Follow choices over the dataset's (Innovations post P5); Saved and Appreciated show this browser's own lists.
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

test("Saved and Appreciated show only the projects this browser saved or appreciated, and survive the address", () => {
  const base = { category: "all", sort: "newest", q: "" };
  const [a, b] = F.PROJECTS;
  const page = F.getFeedPage({ ...base, mode: "saved" }, null, {}, [a.id, b.id, "no-such-project"]);
  assert.deepEqual(page.projects.map((p) => p.id).sort(), [a.id, b.id].sort());
  assert.equal(F.getFeedPage({ ...base, mode: "appreciated" }, null, {}, []).total, 0);
  assert.equal(F.getFeedPage({ ...base, mode: "discover" }, null, {}, [a.id]).total, F.PROJECTS.length, "ids only filter the two lists");
  assert.equal(F.parseFeedParams(new URLSearchParams("mode=saved")).mode, "saved");
  assert.equal(F.parseFeedParams(new URLSearchParams("mode=appreciated")).mode, "appreciated");
  assert.equal(F.parseFeedParams(new URLSearchParams("mode=nope")).mode, "discover");
  assert.deepEqual(F.parseIdsParam("p1,p2,,bad id!,p3"), ["p1", "p2", "p3"]);
});
