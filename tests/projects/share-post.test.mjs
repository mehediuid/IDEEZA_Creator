// The Innovations post a share carries: the maker's story. Its status is the project's current
// activity, read where it shows (owner, 2026-10-13), so the post never stores or asks for one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STORY_MAX, STORY_MISSING, sharePostBlocker, sharePostIn } from "../../.tmp-test/lib/manual/share-post.js";
import { detailsMissing, DEFAULT_MINT_STATE } from "../../.tmp-test/lib/brief/mint-flow.js";

test("a post needs only its story", () => {
  assert.equal(sharePostBlocker({ story: "  " }), STORY_MISSING);
  assert.equal(sharePostBlocker({ story: "Built for my nephew." }), null);
});

test("sharePostIn keeps the story, drops a stored stage, and refuses what isn't a post", () => {
  assert.deepEqual(sharePostIn({ story: "Hi", stage: "mass-production" }), { story: "Hi" });
  assert.deepEqual(sharePostIn({ story: "Hi" }), { story: "Hi" });
  assert.equal(sharePostIn({ stage: "mass-production" }), undefined);
  assert.equal(sharePostIn(null), undefined);
  assert.equal(sharePostIn({ story: "x".repeat(900) }).story.length, STORY_MAX);
});

test("the mint's Details ask the post's story only when it's shared", () => {
  const base = { ...DEFAULT_MINT_STATE, intent: "save", collection: "Garden", confirmOwnership: true };
  const f = { now: 0, creatorPct: 100, readiness: null };
  assert.equal(detailsMissing(base, f), null);
  assert.equal(detailsMissing({ ...base, shareToNewsfeed: true }, f), STORY_MISSING);
  assert.equal(detailsMissing({ ...base, shareToNewsfeed: true, story: "Why I built it" }, f), null);
});
