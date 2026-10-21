// A shared project read as an Innovations post (src/lib/innovations/mine-post.ts): its media
// opens on the project video, which stands for the whole project (owner, 2026-10-21), then the
// products' videos in product order, then the cover and images. A product keeps its own video.
import { test } from "node:test";
import assert from "node:assert/strict";

const { minePostOf } = await import("../../.tmp-test/lib/innovations/mine-post.js");
const { projectView } = await import("../../.tmp-test/lib/manual/project-read.js");
const { PROJECT_VIDEO_KEY } = await import("../../.tmp-test/lib/video/types.js");
const { PROJECT_VIDEO_TITLE } = await import("../../.tmp-test/lib/video/video-copy.js");
import { DAY, MIN, T, four } from "./fixtures/projects.mjs";

const NOW = T + 10 * DAY;
const PRODUCTS = ["prd_drone001", "prd_drone002", "prd_drone003", "prd_drone004"];

function take(id, productId, extra = {}) {
  return {
    id,
    productId,
    n: 1,
    prompt: "",
    lines: ["A", "B", "Built with IDEEZA"],
    quality: "low",
    source: null,
    createdAt: T,
    readyAt: T + MIN,
    clip: { mime: "video/mp4", width: 854, height: 480, durationMs: 10_000, bytes: 1 },
    ...extra,
  };
}

const JOIN = {
  intro: ["Survey Drone", "Maps a field"],
  cuts: PRODUCTS.map((id) => ({ productId: id, takeId: `take_${id}`, fromMs: 6000, ms: 4000, label: id })),
  outro: "Built with IDEEZA",
};

/** Every product's video ready; with `project`, the project video too. Its key goes first, so
 *  the record's own order never decides the post's. */
function record({ project = true } = {}) {
  const products = {};
  if (project) {
    products[PROJECT_VIDEO_KEY] = {
      takes: [take("take_project", PROJECT_VIDEO_KEY, { join: JOIN, clip: { mime: "video/mp4", width: 854, height: 480, durationMs: 20_000, bytes: 1 } })],
      inUseId: "take_project",
    };
  }
  for (const id of [...PRODUCTS].reverse()) products[id] = { takes: [take(`take_${id}`, id)], inUseId: `take_${id}` };
  return { version: 1, projectId: four.project.id, products };
}

const viewOf = (videos) =>
  projectView(four.project, { builds: four.builds, chats: four.chats, brief: four.draft, videoJobs: [], now: NOW, videos });

test("the post opens on the project video, then the products' videos in product order, then the images", () => {
  const post = minePostOf(four.project, viewOf(record()));
  const clips = post.media.filter((m) => m.kind === "clip");
  assert.deepEqual(
    clips.map((m) => m.takeId),
    ["take_project", ...PRODUCTS.map((id) => `take_${id}`)],
  );
  assert.equal(post.media[0].takeId, "take_project");
  // The images follow every video.
  const firstImage = post.media.findIndex((m) => m.kind === "image");
  assert.equal(firstImage, clips.length);
});

test("the project video is labelled with the project, never through a product", () => {
  const post = minePostOf(four.project, viewOf(record()));
  const [first] = post.media;
  assert.equal(first.productId, PROJECT_VIDEO_KEY);
  assert.equal(first.label, `${PROJECT_VIDEO_TITLE} · ${four.project.name}`);
  assert.equal(first.alt, `${four.project.name}, its project video`);
  assert.equal(first.durationMs, 20_000);
  assert.ok(!post.products.some((p) => p.id === PROJECT_VIDEO_KEY));
});

test("each product keeps its own video, never the project's", () => {
  const post = minePostOf(four.project, viewOf(record()));
  assert.deepEqual(
    post.products.map((p) => p.video?.takeId),
    PRODUCTS.map((id) => `take_${id}`),
  );
});

test("without a project video, the post opens on the first product's video as before", () => {
  const post = minePostOf(four.project, viewOf(record({ project: false })));
  const clips = post.media.filter((m) => m.kind === "clip");
  assert.deepEqual(
    clips.map((m) => m.takeId),
    PRODUCTS.map((id) => `take_${id}`),
  );
  assert.equal(post.media[0].productId, PRODUCTS[0]);
});

test("a project video with no take in use leads nothing", () => {
  const videos = record();
  videos.products[PROJECT_VIDEO_KEY] = { takes: [take("take_project", PROJECT_VIDEO_KEY, { readyAt: undefined, join: JOIN })], inUseId: null };
  const post = minePostOf(four.project, viewOf(videos));
  assert.equal(post.media[0].productId, PRODUCTS[0]);
});
