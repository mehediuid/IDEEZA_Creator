// The Innovations post a share carries (owner, 2026-10-12): the story and the status, both asked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STAGE_MISSING, STORY_MAX, STORY_MISSING, sharePostBlocker, sharePostIn, stageWordOf } from "../../.tmp-test/lib/manual/share-post.js";
import { detailsMissing } from "../../.tmp-test/lib/brief/mint-flow.js";
import { DEFAULT_MINT_STATE } from "../../.tmp-test/lib/brief/mint-flow.js";

test("a post needs its story, then its status", () => {
  assert.equal(sharePostBlocker({ story: "  ", stage: "prototype-development" }), STORY_MISSING);
  assert.equal(sharePostBlocker({ story: "Built for my nephew.", stage: null }), STAGE_MISSING);
  assert.equal(sharePostBlocker({ story: "Built for my nephew.", stage: "prototype-development" }), null);
});

test("sharePostIn keeps a stored post and drops what isn't one", () => {
  assert.deepEqual(sharePostIn({ story: "Hi", stage: "mass-production" }), { story: "Hi", stage: "mass-production" });
  assert.deepEqual(sharePostIn({ story: "Hi", stage: "bogus" }), { story: "Hi", stage: null });
  assert.equal(sharePostIn({ stage: "mass-production" }), undefined);
  assert.equal(sharePostIn(null), undefined);
  assert.equal(sharePostIn({ story: "x".repeat(900), stage: null }).story.length, STORY_MAX);
  assert.equal(stageWordOf("prototype-development"), "Prototype Development");
  assert.equal(stageWordOf(null), null);
});

test("the mint's Details ask the post's story and status only when it's shared", () => {
  const base = { ...DEFAULT_MINT_STATE, intent: "save", collection: "Garden", confirmOwnership: true };
  const f = { now: 0, creatorPct: 100, readiness: null };
  assert.equal(detailsMissing(base, f), null);
  assert.equal(detailsMissing({ ...base, shareToNewsfeed: true }, f), STORY_MISSING);
  assert.equal(detailsMissing({ ...base, shareToNewsfeed: true, story: "Why I built it" }, f), STAGE_MISSING);
  assert.equal(detailsMissing({ ...base, shareToNewsfeed: true, story: "Why I built it", shareStage: "digital-design" }, f), null);
});
