// A sample Innovations post's Activity (owner, 2026-10-13, decision A: the post shows the project's
// Activity, now and earlier, in place of a progress bar).
import { test } from "node:test";
import assert from "node:assert/strict";

const A = await import("../../.tmp-test/lib/innovations/sample-activity.js");
const S = await import("../../.tmp-test/lib/innovations/sample-posts.js");
const J = await import("../../.tmp-test/lib/manual/journey.js");

test("every sample post has a journey the Activity block can read: proof on every entry, known types", () => {
  for (const post of S.SAMPLE_POSTS) {
    const j = A.sampleJourneyOf(post);
    assert.equal(J.normalizeJourney(j).activities.length, j.activities.length, post.slug);
    const project = j.activities.filter((a) => a.target.kind === "project");
    assert.ok(project.length >= 1, post.slug);
    for (const a of j.activities) {
      assert.ok(a.media.length >= 1, `${post.slug}: proof`);
      assert.ok(a.media.every((m) => m.blobKey.startsWith("/innovations/")), `${post.slug}: shipped files`);
      assert.ok(a.createdAt >= post.createdAt, `${post.slug}: after the project began`);
      if (a.type === "others") assert.ok(a.customName && a.customName.length <= 40, `${post.slug}: named`);
      else assert.ok(J.typeDefOf(a.target, a.type), `${post.slug}: ${a.type}`);
    }
    for (const p of post.products) {
      assert.ok(j.activities.some((a) => a.target.kind === "product" && a.target.productId === p.id), `${post.slug}/${p.id}`);
    }
  }
});

test("the status chip is the current Activity: a type's short name, or an Others entry's own name", () => {
  const hub = S.samplePostBySlug("smart-plant-watering-hub");
  assert.equal(A.sampleStatusOf(hub), "Testing");
  const hexapod = S.samplePostBySlug("hexapod-walking-robot");
  assert.equal(A.sampleStatusOf(hexapod), "Demo at a maker fair");
  const current = J.currentOf(A.sampleJourneyOf(hexapod), hexapod.id, { kind: "project" }, hexapod.createdAt);
  assert.equal(current.type, "others");
});

test("the journey is deterministic", () => {
  const post = S.SAMPLE_POSTS[5];
  assert.deepEqual(A.sampleJourneyOf(post), A.sampleJourneyOf(post));
});
