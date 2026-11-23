// The phone's social screens against the web (web-vs-phone audit 2026-11-23, Medium): Saved and
// Appreciated list every post on the web's lists, clip or not (SOC-4); a clip's address leads on to
// the post's comments or its details once the clip is off the Feed (SOC-9, SOC-3); Profile search
// and the Search history rows follow "Keep my search history" (SOC-8, SET-6); no sample creator's
// profile is locked on the phone only (SOC-7); Share via… on the clip ⋯ and the marketplace Share
// menu (SOC-5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const clips = await import("../../.tmp-test/lib/innovations/clips.js");
const profile = await import("../../.tmp-test/lib/people/phone-profile.js");
const { SAMPLE_POSTS } = await import("../../.tmp-test/lib/innovations/sample-posts.js");

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
/** Every post's clips, on the marketplace or not. */
const ALL = SAMPLE_POSTS.flatMap(clips.clipsOfPost);

test("a post's item id is its Project clip's id", () => {
  assert.equal(clips.postItemIdOf("sample:p12"), "p12");
  assert.equal(clips.postItemIdOf("mine:proj_1"), "mine:proj_1");
});

test("Saved lists a post with no clip on the Feed as itself, dated by its newest mark", () => {
  // Hexapod (p1) has no listing, so it has no clip on the Feed: it still shows, as the post.
  assert.equal(clips.clipById("p1"), null);
  const listed = clips.FEED_CLIPS.find((c) => c.kind === "project");
  const rows = clips.savedPostRows(["sample:p1", listed.postId], { "p1~remote": 300, [listed.id]: 200 }, clips.FEED_CLIPS);
  assert.deepEqual(
    rows.map((r) => [r.postId, r.clip?.id ?? null, r.at]),
    [
      ["sample:p1", null, 300],
      [listed.postId, listed.id, 200],
    ],
  );
  // A clip on the Feed is listed as savedRows lists it; a share's own thread is never a Saved post.
  const one = clips.savedPostRows([listed.postId, "share:s1"], {}, clips.FEED_CLIPS);
  assert.deepEqual(
    one.map((r) => [r.postId, r.clip?.id ?? null, r.at]),
    [[listed.postId, listed.id, null]],
  );
});

test("Saved keeps the web's order when this phone knows no dates", () => {
  const rows = clips.savedPostRows(["sample:p1", "sample:p2", "mine:x"], {}, []);
  // Newest saved last on the web's list, so first here.
  assert.deepEqual(
    rows.map((r) => r.postId),
    ["mine:x", "sample:p2", "sample:p1"],
  );
  assert.ok(rows.every((r) => r.clip === null && r.at === null));
});

test("Appreciated lists every appreciated post, newest first, its Project clip while it plays", () => {
  const listed = clips.FEED_CLIPS.find((c) => c.kind === "project");
  const rows = clips.appreciatedPostRows(["sample:p1", listed.postId, "share:s9"], clips.FEED_CLIPS);
  assert.deepEqual(
    rows.map((r) => [r.postId, r.clip?.id ?? null]),
    [
      [listed.postId, listed.id],
      ["sample:p1", null],
    ],
  );
});

test("the marks of a post are its own and its clips', never a look-alike's", () => {
  const savedAt = { "sample:p1": 1, p1: 2, "p1~remote": 3, p12: 4, "p12~probe": 5, "mine:a": 6, "mine:a~b": 7, "mine:ab": 8 };
  assert.deepEqual(clips.postMarksOf(savedAt, "sample:p1").sort(), ["p1", "p1~remote", "sample:p1"]);
  assert.deepEqual(clips.postMarksOf(savedAt, "mine:a").sort(), ["mine:a", "mine:a~b"]);
});

test("a clip off the Feed leads to its details, or to its post's comments on the maker's Timeline", () => {
  const project = { projectId: "p1", productId: null, postId: "sample:p1" };
  const product = { projectId: "p1", productId: "remote", postId: "sample:p1" };
  assert.equal(clips.offFeedHrefOf(project, null, "/m/creators/aiko"), "/m/projects/p1");
  assert.equal(clips.offFeedHrefOf(product, null, "/m/creators/aiko"), "/m/projects/p1/products/remote");
  assert.equal(clips.offFeedHrefOf(project, "c9", "/m/creators/aiko"), "/m/creators/aiko?post=sample%3Ap1&comment=c9");
  assert.equal(clips.offFeedHrefOf(product, "", "/m/creators/aiko"), "/m/creators/aiko?post=sample%3Ap1");
  // Your own project, never shared, is on no Timeline: its details.
  assert.equal(clips.offFeedHrefOf({ projectId: "m9", productId: null, postId: "mine:m9" }, "c1", null), "/m/projects/m9");
});

test("every sample post can be listed and opened, on sale or not", () => {
  for (const post of SAMPLE_POSTS) {
    const row = clips.savedPostRows([post.id], {}, clips.FEED_CLIPS)[0];
    assert.ok(row, `${post.id} is listed`);
    if (!row.clip) assert.ok(ALL.every((c) => c.postId !== post.id || !clips.onMarketplace(c)), `${post.id} has no clip on the Feed`);
  }
});

test("no sample creator's profile is locked on the phone only (SOC-7)", () => {
  assert.equal("sampleProfileLocked" in profile, false);
  assert.doesNotMatch(read("components/mobile/profile/creator-profile.tsx"), /sampleProfileLocked|LOCKED_SAMPLES/);
});

test("Profile search keeps Recent only while Keep my search history is on (SOC-8)", () => {
  const src = read("components/mobile/profile/profile-search.tsx");
  assert.match(src, /privacy\.keepSearchHistory/);
  assert.match(src, /if \(keep && !update\(/);
});

test("each Search history row runs the search again on the phone's Search (SET-6)", () => {
  const src = read("components/mobile/settings/data-search-history.tsx");
  assert.match(src, /href=\{againHref\(s\)\}/);
  assert.match(src, /`\/m\/search\?\$\{q\}`/);
  assert.doesNotMatch(src, /once Search, Feed and Explore marketplace are on the phone/);
});

test("the clip ⋯ and the marketplace Share menu offer Share via… (SOC-5)", () => {
  for (const path of ["components/mobile/feed/clip-menu.tsx", "components/mobile/feed/share-action.tsx"]) {
    assert.match(read(path), /label: "Share via…"/, path);
  }
  assert.match(read("components/mobile/feed/share-via.ts"), /navigator\.share\(/);
});
