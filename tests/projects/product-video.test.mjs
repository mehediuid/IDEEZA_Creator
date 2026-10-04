// The per-product video model and its writers (Phase 2 spec §3.5.7 = VIDEO
// §2A, owner decision 9).
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  defaultLines,
  deleteTake,
  failTake,
  featuredVideoOf,
  finishTake,
  markLost,
  migrateLegacyClip,
  productVideoStatus,
  sanitizeProjectVideos,
  startTake,
  useTake,
} = await import("../../.tmp-test/lib/video/product-video.js");
const { mintedSell, T } = await import("./fixtures/projects.mjs");

const NOW = T + 10_000;

/** A VideoJob fixture (jobs.ts's shape). `stage` defaults to "rendering", in
 *  progress and not yet done. */
function job(id, o = {}) {
  return {
    id,
    title: o.title ?? "Take",
    prompt: o.prompt ?? "prompt",
    quality: o.quality ?? "low",
    stage: o.stage ?? "rendering",
    startedAt: o.startedAt ?? NOW - 5_000,
    stageStartedAt: o.stageStartedAt ?? NOW - 5_000,
    emailReminder: null,
    browserNotify: false,
    minted: false,
  };
}

const CLIP = { mime: "video/webm", width: 640, height: 360, durationMs: 10_000, bytes: 12_345 };

// ─────────────────────────── sanitizeProjectVideos ───────────────────────

test("sanitizeProjectVideos: a well-formed record round-trips", () => {
  const raw = {
    version: 1,
    projectId: "p-x",
    products: {
      prd_a: {
        takes: [
          { id: "take_1", n: 1, prompt: "p", lines: ["a", "b", "c"], quality: "low", source: null, createdAt: 1 },
        ],
        inUseId: "take_1",
      },
    },
  };
  const v = sanitizeProjectVideos(raw, "p-x");
  assert.equal(v.version, 1);
  assert.equal(v.projectId, "p-x");
  assert.equal(v.products.prd_a.takes.length, 1);
  assert.equal(v.products.prd_a.inUseId, "take_1");
});

test("sanitizeProjectVideos: the wrong version, or a non-object, comes back null", () => {
  assert.equal(sanitizeProjectVideos(null, "p-x"), null);
  assert.equal(sanitizeProjectVideos("hello", "p-x"), null);
  assert.equal(sanitizeProjectVideos({ version: 2, products: {} }, "p-x"), null);
  assert.equal(sanitizeProjectVideos({ version: 1 }, "p-x"), null); // no products at all
});

test("sanitizeProjectVideos: an inUseId pointing at nothing resets to null, and a broken take is dropped", () => {
  const raw = {
    version: 1,
    products: {
      prd_a: {
        takes: [
          { id: "take_1", n: 1, prompt: "p", lines: ["a", "b", "c"], quality: "low", source: null, createdAt: 1 },
          { id: "take_2" /* no n: dropped */ },
        ],
        inUseId: "take_missing",
      },
    },
  };
  const v = sanitizeProjectVideos(raw, "p-x");
  assert.equal(v.products.prd_a.takes.length, 1);
  assert.equal(v.products.prd_a.inUseId, null);
});

test("sanitizeProjectVideos: an unknown quality falls back to low", () => {
  const raw = {
    version: 1,
    products: {
      prd_a: {
        takes: [
          { id: "take_1", n: 1, prompt: "p", lines: ["a", "b", "c"], quality: "ultra", source: null, createdAt: 1 },
        ],
        inUseId: null,
      },
    },
  };
  const v = sanitizeProjectVideos(raw, "p-x");
  assert.equal(v.products.prd_a.takes[0].quality, "low");
});

// ─────────────────────────── defaultLines ───────────────────────

test("defaultLines: the name, the one-liner cut to 60, then the constant line", () => {
  const lines = defaultLines("Smart Plant Pot", "A pot that waters itself.");
  assert.deepEqual(lines, ["Smart Plant Pot", "A pot that waters itself.", "Built with IDEEZA"]);
});

test("defaultLines: a long description is cut to 60 characters, with an ellipsis", () => {
  const long = "A ".repeat(40).trim(); // 79 chars
  const [, line2] = defaultLines("X", long);
  assert.ok(line2.length <= 60, line2);
  assert.ok(line2.endsWith("…"));
});

// ─────────────────────────── productVideoStatus ───────────────────────

test("productVideoStatus: no record, or no takes, reads as none", () => {
  assert.deepEqual(productVideoStatus(undefined, [], NOW), { state: "none" });
  assert.deepEqual(productVideoStatus({ takes: [], inUseId: null }, [], NOW), { state: "none" });
});

test("productVideoStatus: a take in progress, with no in-use take yet, reads as rendering", () => {
  const v = { takes: [{ id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 5_000 }], inUseId: null };
  const status = productVideoStatus(v, [job("take_1")], NOW);
  assert.equal(status.state, "rendering");
  assert.equal(status.take.id, "take_1");
  assert.ok(status.progress >= 0 && status.progress <= 99);
});

test("productVideoStatus: an in-use ready take reads as ready", () => {
  const v = {
    takes: [{ id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 5_000, readyAt: NOW - 1_000, clip: CLIP }],
    inUseId: "take_1",
  };
  const status = productVideoStatus(v, [], NOW);
  assert.equal(status.state, "ready");
  assert.equal(status.take.id, "take_1");
  assert.equal(status.next, undefined);
});

test("productVideoStatus: ready, with a newer take still rendering, carries `next` — still reads ready (C5)", () => {
  const v = {
    takes: [
      { id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 20_000, readyAt: NOW - 10_000, clip: CLIP },
      { id: "take_2", productId: "prd_a", n: 2, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 5_000 },
    ],
    inUseId: "take_1",
  };
  const status = productVideoStatus(v, [job("take_2")], NOW);
  assert.equal(status.state, "ready");
  assert.equal(status.take.id, "take_1");
  assert.equal(status.next.take.id, "take_2");
});

test("productVideoStatus: a failed newer take, with a ready in-use take, still reads ready — not failed", () => {
  const v = {
    takes: [
      { id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 20_000, readyAt: NOW - 10_000, clip: CLIP },
      { id: "take_2", productId: "prd_a", n: 2, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 5_000, failure: { kind: "encode", at: NOW - 1_000 } },
    ],
    inUseId: "take_1",
  };
  const status = productVideoStatus(v, [], NOW);
  assert.equal(status.state, "ready");
  assert.equal(status.take.id, "take_1");
});

test("productVideoStatus: a take marked failed reads as failed, with its kind", () => {
  const v = {
    takes: [{ id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 5_000, failure: { kind: "encode", at: NOW - 1_000 } }],
    inUseId: null,
  };
  const status = productVideoStatus(v, [], NOW);
  assert.equal(status.state, "failed");
  assert.equal(status.failure, "encode");
});

test("productVideoStatus: no ready time, no failure and no job reads as interrupted", () => {
  const v = {
    takes: [{ id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 5_000 }],
    inUseId: null,
  };
  const status = productVideoStatus(v, [], NOW); // the job is gone — a reload lost it
  assert.equal(status.state, "failed");
  assert.equal(status.failure, "interrupted");
});

// ─────────────────────────── startTake / takes ───────────────────────

test("startTake: numbers takes 1, 2, 3… per product, never reused", () => {
  let { video } = startTake(undefined, { productId: "prd_a", prompt: "p", lines: ["", "", ""], quality: "low", source: null }, NOW, "take_1");
  assert.equal(video.takes[0].n, 1);
  ({ video } = startTake(video, { productId: "prd_a", prompt: "p", lines: ["", "", ""], quality: "low", source: null }, NOW, "take_2"));
  assert.equal(video.takes[1].n, 2);
  video = deleteTake(video, "take_1"); // even after take 1 is gone…
  ({ video } = startTake(video, { productId: "prd_a", prompt: "p", lines: ["", "", ""], quality: "low", source: null }, NOW, "take_3"));
  assert.equal(video.takes.at(-1).n, 3); // …3 is never reused as 2's replacement
});

test("startTake: past 5 takes, evicts the oldest take that ISN'T in use", () => {
  let video;
  for (let i = 1; i <= 5; i++) {
    ({ video } = startTake(video, { productId: "prd_a", prompt: "p", lines: ["", "", ""], quality: "low", source: null }, NOW + i, `take_${i}`));
  }
  video = { ...video, inUseId: "take_2" }; // take 2 is in use; take 1 is the oldest and evictable
  const { video: after, evicted } = startTake(video, { productId: "prd_a", prompt: "p", lines: ["", "", ""], quality: "low", source: null }, NOW + 6, "take_6");
  assert.deepEqual(evicted, ["take_1"]);
  assert.equal(after.takes.length, 5);
  assert.deepEqual(after.takes.map((t) => t.id), ["take_2", "take_3", "take_4", "take_5", "take_6"]);
});

test("startTake: when the oldest take IS in use, the next-oldest is evicted instead", () => {
  let video;
  for (let i = 1; i <= 5; i++) {
    ({ video } = startTake(video, { productId: "prd_a", prompt: "p", lines: ["", "", ""], quality: "low", source: null }, NOW + i, `take_${i}`));
  }
  video = { ...video, inUseId: "take_1" };
  const { video: after, evicted } = startTake(video, { productId: "prd_a", prompt: "p", lines: ["", "", ""], quality: "low", source: null }, NOW + 6, "take_6");
  assert.deepEqual(evicted, ["take_2"]);
  assert.deepEqual(after.takes.map((t) => t.id), ["take_1", "take_3", "take_4", "take_5", "take_6"]);
});

test("finishTake: the take becomes ready and takes over inUseId; an earlier failure is cleared", () => {
  const v = { takes: [{ id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW, failure: { kind: "encode", at: NOW } }], inUseId: null };
  const next = finishTake(v, "take_1", CLIP, NOW + 1_000);
  assert.equal(next.inUseId, "take_1");
  assert.equal(next.takes[0].readyAt, NOW + 1_000);
  assert.equal(next.takes[0].failure, undefined);
  assert.deepEqual(next.takes[0].clip, CLIP);
});

test("failTake: records the failure and leaves the in-use take untouched", () => {
  const v = {
    takes: [
      { id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 10_000, readyAt: NOW - 5_000, clip: CLIP },
      { id: "take_2", productId: "prd_a", n: 2, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW },
    ],
    inUseId: "take_1",
  };
  const next = failTake(v, "take_2", "encode", NOW + 1_000);
  assert.equal(next.inUseId, "take_1");
  assert.deepEqual(next.takes[1].failure, { kind: "encode", at: NOW + 1_000 });
});

test("useTake: only a ready take can become in-use; a rendering or failed one is refused", () => {
  const v = {
    takes: [
      { id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 10_000, readyAt: NOW - 5_000, clip: CLIP },
      { id: "take_2", productId: "prd_a", n: 2, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW, readyAt: NOW, clip: CLIP },
      { id: "take_3", productId: "prd_a", n: 3, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW },
    ],
    inUseId: "take_1",
  };
  assert.equal(useTake(v, "take_2").inUseId, "take_2");
  assert.equal(useTake(v, "take_3").inUseId, "take_1"); // take 3 never rendered — refused
  assert.equal(useTake(v, "take_9").inUseId, "take_1"); // doesn't exist — refused
});

test("deleteTake: refuses the in-use take, but removes any other", () => {
  const v = {
    takes: [
      { id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 10_000, readyAt: NOW - 5_000, clip: CLIP },
      { id: "take_2", productId: "prd_a", n: 2, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW, readyAt: NOW, clip: CLIP },
    ],
    inUseId: "take_1",
  };
  assert.equal(deleteTake(v, "take_1").takes.length, 2); // refused
  assert.equal(deleteTake(v, "take_2").takes.length, 1); // removed
});

// ─────────────────────────── markLost ───────────────────────

test("markLost: the in-use take going missing falls back to the newest other ready take", () => {
  const v = {
    takes: [
      { id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 20_000, readyAt: NOW - 20_000, clip: CLIP },
      { id: "take_2", productId: "prd_a", n: 2, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW - 10_000, readyAt: NOW - 10_000, clip: CLIP },
    ],
    inUseId: "take_2",
  };
  const next = markLost(v, new Set(["take_2"]), NOW);
  assert.equal(next.inUseId, "take_1");
  assert.equal(next.takes[1].failure.kind, "lost");
});

test("markLost: with no other ready take, the product falls back to none", () => {
  const v = {
    takes: [{ id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW, readyAt: NOW, clip: CLIP }],
    inUseId: "take_1",
  };
  const next = markLost(v, new Set(["take_1"]), NOW);
  assert.equal(next.inUseId, null);
  assert.equal(next.takes[0].failure.kind, "lost");
});

test("markLost: a take not in the missing set is untouched", () => {
  const v = {
    takes: [{ id: "take_1", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: NOW, readyAt: NOW, clip: CLIP }],
    inUseId: "take_1",
  };
  const next = markLost(v, new Set(["take_9"]), NOW);
  assert.deepEqual(next, v);
});

// ─────────────────────────── migrateLegacyClip ───────────────────────

test("migrateLegacyClip: a minted draft with a done legacy job gives Take 1 for the headline product", () => {
  const draft = {
    state: { ...mintedSell.draft.state, videoJobId: "job_legacy1", videoPrompt: "A pot that glows softly at night", quality: "high" },
    step: "success",
  };
  const jobs = [job("job_legacy1", { stage: "done", quality: "high" })];
  const out = migrateLegacyClip(mintedSell.project, draft, jobs, NOW);
  assert.ok(out);
  assert.equal(out.productId, "p1"); // mintedSell's one (legacy) product row
  assert.equal(out.input.productId, "p1");
  assert.equal(out.input.prompt, "A pot that glows softly at night");
  assert.equal(out.input.quality, "high"); // kept as it is, not downgraded
  assert.deepEqual(out.input.lines, defaultLines("Smart Plant Pot", "A pot that waters itself."));
});

test("migrateLegacyClip: nothing to migrate — neither field is set", () => {
  const draft = { state: { ...mintedSell.draft.state, videoJobId: null, storyboardGenerated: false }, step: "success" };
  assert.equal(migrateLegacyClip(mintedSell.project, draft, [], NOW), null);
});

test("migrateLegacyClip: a legacy job still short of done is left running — no migration yet", () => {
  const draft = { state: { ...mintedSell.draft.state, videoJobId: "job_legacy1" }, step: "success" };
  const jobs = [job("job_legacy1", { stage: "rendering" })];
  assert.equal(migrateLegacyClip(mintedSell.project, draft, jobs, NOW), null);
});

test("migrateLegacyClip: storyboardGenerated alone (no job reference) migrates unconditionally", () => {
  const draft = { state: { ...mintedSell.draft.state, videoJobId: null, storyboardGenerated: true }, step: "success" };
  const out = migrateLegacyClip(mintedSell.project, draft, [], NOW);
  assert.ok(out);
  assert.equal(out.productId, "p1");
});

test("migrateLegacyClip: no draft at all", () => {
  assert.equal(migrateLegacyClip(mintedSell.project, null, [], NOW), null);
});

// ─────────────────────────── featuredVideoOf ───────────────────────

test("featuredVideoOf: the first current product's in-use take, purely", () => {
  const products = [
    { id: "prd_a", dropped: { lastIn: 1, current: 2 } }, // dropped — skipped
    { id: "prd_b", dropped: null },
    { id: "prd_c", dropped: null },
  ];
  const video = {
    version: 1,
    projectId: "p-x",
    products: {
      prd_a: { takes: [{ id: "t_a", productId: "prd_a", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: 0, readyAt: 0, clip: CLIP }], inUseId: "t_a" },
      prd_c: { takes: [{ id: "t_c", productId: "prd_c", n: 1, prompt: "", lines: ["", "", ""], quality: "low", source: null, createdAt: 0, readyAt: 0, clip: CLIP }], inUseId: "t_c" },
    },
  };
  const take = featuredVideoOf(video, products);
  assert.equal(take.id, "t_c"); // prd_a is dropped, prd_b has no video — prd_c is first eligible
});

test("featuredVideoOf: no record, or nothing in use, gives null", () => {
  assert.equal(featuredVideoOf(null, []), null);
  assert.equal(featuredVideoOf({ version: 1, projectId: "p-x", products: {} }, [{ id: "prd_a", dropped: null }]), null);
});
