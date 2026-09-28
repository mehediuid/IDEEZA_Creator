// The clip store's pure part (Phase 2 VIDEO P2-VIDEO-19): which ready takes
// have lost their file, and the record with them marked lost.
import { test } from "node:test";
import assert from "node:assert/strict";

const { missingReadyTakes, withLostTakes } = await import("../../.tmp-test/lib/video/clip-store.js");

const NOW = 1_800_000_000_000;
const CLIP = { mime: "video/mp4", width: 640, height: 360, durationMs: 10_000, bytes: 1_000 };

function take(id, productId, n, o = {}) {
  return {
    id,
    productId,
    n,
    prompt: "p",
    lines: ["a", "b", "c"],
    quality: "low",
    source: null,
    createdAt: NOW - 10_000 + n,
    ...o,
  };
}
const ready = (id, productId, n, o = {}) => take(id, productId, n, { readyAt: NOW - 5_000 + n, clip: CLIP, ...o });

function record() {
  return {
    version: 1,
    projectId: "proj_a",
    products: {
      prd_a: {
        takes: [ready("take_a1", "prd_a", 1), ready("take_a2", "prd_a", 2), take("take_a3", "prd_a", 3)],
        inUseId: "take_a2",
      },
      prd_b: {
        takes: [ready("take_b1", "prd_b", 1), take("take_b2", "prd_b", 2, { failure: { kind: "encode", at: NOW } })],
        inUseId: "take_b1",
      },
    },
  };
}

test("missingReadyTakes: only ready, unfailed takes without a file", () => {
  const got = missingReadyTakes(record(), new Set(["take_a1", "take_b1"]));
  assert.deepEqual([...got].sort(), ["take_a2"]);
});

test("missingReadyTakes: a rendering or failed take is never missing", () => {
  const got = missingReadyTakes(record(), new Set());
  assert.deepEqual([...got].sort(), ["take_a1", "take_a2", "take_b1"]);
});

test("withLostTakes: nothing missing → null (nothing to write)", () => {
  assert.equal(withLostTakes(record(), new Set(), NOW), null);
  assert.equal(withLostTakes(record(), new Set(["take_zz"]), NOW), null);
});

test("withLostTakes: a lost in-use take falls back to the newest other ready take", () => {
  const rec = record();
  const next = withLostTakes(rec, new Set(["take_a2"]), NOW);
  assert.ok(next);
  const a = next.products.prd_a;
  assert.equal(a.inUseId, "take_a1");
  assert.deepEqual(a.takes.find((t) => t.id === "take_a2").failure, { kind: "lost", at: NOW });
  // The other product is the very same object: untouched.
  assert.equal(next.products.prd_b, rec.products.prd_b);
  // The input isn't mutated.
  assert.equal(rec.products.prd_a.inUseId, "take_a2");
});

test("withLostTakes: every ready take lost → no video (the gate reads No video yet)", () => {
  const next = withLostTakes(record(), new Set(["take_b1"]), NOW);
  assert.equal(next.products.prd_b.inUseId, null);
  assert.equal(next.products.prd_b.takes[0].failure.kind, "lost");
});

const { productVideoStatus } = await import("../../.tmp-test/lib/video/product-video.js");

test("a lost take stops counting: its product reads No video yet (P2-VIDEO-19)", () => {
  const next = withLostTakes(record(), new Set(["take_b1"]), NOW);
  assert.deepEqual(productVideoStatus(next.products.prd_b, [], NOW), { state: "failed", take: next.products.prd_b.takes[1], failure: "encode" });
  // With no later failed take, the lost one leaves the product with none.
  const only = { takes: [ready("take_c1", "prd_c", 1)], inUseId: "take_c1" };
  const lost = withLostTakes({ version: 1, projectId: "p", products: { prd_c: only } }, new Set(["take_c1"]), NOW);
  assert.deepEqual(productVideoStatus(lost.products.prd_c, [], NOW), { state: "none" });
  // A lost in-use take hands over to the other ready take, which reads ready.
  const both = withLostTakes(record(), new Set(["take_a2"]), NOW);
  const st = productVideoStatus(both.products.prd_a, [], NOW);
  assert.equal(st.state, "ready");
  assert.equal(st.take.id, "take_a1");
});
