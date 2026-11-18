// A product's video on the phone (mobile Figma "Project Details · 2026 update" 11–11za): the
// render tray's items and order, where it stays out of the way, the AR clip kept as a take, and
// the camera's troubles.
import { test } from "node:test";
import assert from "node:assert/strict";

const v = await import("../../.tmp-test/lib/video/phone-video.js");
const { productVideoStatus } = await import("../../.tmp-test/lib/video/product-video.js");
const { readinessOf } = await import("../../.tmp-test/lib/manual/readiness.js");

const job = (over = {}) => ({
  id: "take_aaaa0001",
  title: "Lamp Head · Desk Lamp",
  prompt: "",
  quality: "low",
  stage: "rendering",
  startedAt: 0,
  stageStartedAt: 0,
  emailReminder: null,
  browserNotify: false,
  minted: false,
  projectId: "earn2",
  productId: "prd_lamp0001",
  render: { lines: ["a", "b", "c"], imageUrl: null, productName: "Lamp Head" },
  ...over,
});
const facts = (over = {}) => ({ n: 2, name: "Lamp Head", waiting: true, renderable: true, failure: null, durationMs: 10_000, ...over });

test("a render in progress: its product and take, the progress and time left, Cancel asks first", () => {
  const item = v.trayItemOf(job(), facts(), 15_000);
  assert.equal(item.tone, "progress");
  assert.equal(item.title, "Rendering Lamp Head · Take 2");
  assert.match(item.supporting, /^\d+ % · (under a minute|about \d+ min) left$/);
  assert.ok(item.progress > 0 && item.progress < 100);
  assert.deepEqual(item.action, { kind: "cancel", label: "Cancel", takeId: "take_aaaa0001", n: 2 });
});

test("a finished take waiting for its review opens the phone's review; a settled one is to watch", () => {
  const ready = v.trayItemOf(job({ stage: "done" }), facts(), 0);
  assert.equal(ready.title, "Take 2 is ready");
  assert.equal(ready.supporting, "Lamp Head · 10 seconds");
  assert.deepEqual(ready.action, { kind: "go", label: "Review", href: "/m/projects/earn2/products/prd_lamp0001/video?review=take_aaaa0001" });
  const settled = v.trayItemOf(job({ stage: "done" }), facts({ waiting: false }), 0);
  assert.deepEqual(settled.action, { kind: "go", label: "Watch", href: "/m/projects/earn2?tab=media" });
});

test("a failed take says the web's failure words and offers Try again from its own inputs", () => {
  const failed = v.trayItemOf(job({ stage: "failed" }), facts({ failure: "storage" }), 0);
  assert.equal(failed.title, "Take 2 couldn’t be made");
  assert.match(failed.supporting, /^Lamp Head · There's no room to store the video/);
  assert.equal(failed.action.href, "/m/projects/earn2/products/prd_lamp0001/video?from=take_aaaa0001");
  assert.equal(v.trayItemOf(job({ stage: "failed" }), facts({ renderable: false }), 0).action, null);
});

test("a project video job goes to the phone's Project video screen", () => {
  const p = job({ productId: "project", render: { lines: ["", "", ""], imageUrl: null, productName: "Desk Lamp", join: null } });
  assert.equal(v.trayItemOf(p, facts({ name: "Desk Lamp" }), 0).title, "Rendering the project video · Take 2");
  assert.equal(v.trayItemOf({ ...p, stage: "done" }, facts(), 0).action.href, "/m/projects/earn2/video?review=take_aaaa0001");
  assert.equal(v.trayItemOf({ ...p, stage: "failed" }, facts(), 0).action.href, "/m/projects/earn2/video");
});

test("a legacy job (no product) has no place in the tray", () => {
  assert.equal(v.trayItemOf(job({ render: null, projectId: null, productId: null }), facts(), 0), null);
});

test("the nudge: one product or many, make or update", () => {
  assert.equal(v.trayNudgeOf("earn1", 3, false).title, "All 3 product videos are ready");
  assert.equal(v.trayNudgeOf("earn1", 3, false).supporting, "Make the project video from them.");
  assert.equal(v.trayNudgeOf("earn2", 1, true).title, "Your product video is ready");
  assert.equal(v.trayNudgeOf("earn2", 1, true).action.label, "Update project video");
  assert.equal(v.trayNudgeOf("earn2", 1, false).action.href, "/m/projects/earn2/video");
});

test("one item at a time, a nudge first, the rest behind the +N line", () => {
  const a = { key: "a" };
  const b = { key: "b" };
  const n = { key: "nudge:x" };
  assert.deepEqual(v.trayStackOf([], []), { shown: null, more: null });
  assert.deepEqual(v.trayStackOf([], [a]), { shown: a, more: null });
  assert.deepEqual(v.trayStackOf([n], [a, b]), { shown: n, more: "+2 more videos" });
  assert.deepEqual(v.trayStackOf([], [a, b]), { shown: a, more: "+1 more video" });
});

test("the tray stays off the camera, the buyer's views and the screen already showing that render", () => {
  const j = { projectId: "earn2", productId: "prd_lamp0001" };
  assert.equal(v.trayHiddenFor("/m/projects/earn2/products/prd_lamp0001/ar", null), true);
  assert.equal(v.trayHiddenFor("/m/projects/earn2/market", null), true);
  assert.equal(v.trayHiddenFor("/m/projects/earn2/preview", null), true);
  assert.equal(v.trayHiddenFor("/m/projects/earn2/products/prd_lamp0001/video", j), true);
  assert.equal(v.trayHiddenFor("/m/projects/earn2/products/prd_other/video", j), false);
  assert.equal(v.trayHiddenFor("/m/projects/earn2/video", { projectId: "earn2", productId: "project" }), true);
  assert.equal(v.trayHiddenFor("/m/projects/earn2/video", j), false);
  assert.equal(v.trayHiddenFor("/m/projects/earn2", j), false);
  assert.equal(v.trayHiddenFor("/m", j), false);
});

test("the camera's clock, format, quality and troubles", () => {
  assert.equal(v.recordClock(4_200), "0:04 of 0:10");
  assert.equal(v.recordClock(12_000), "0:10 of 0:10");
  assert.equal(v.recordClock(-5), "0:00 of 0:10");
  assert.equal(v.pickRecorderMime((m) => m === "video/webm"), "video/webm");
  assert.equal(v.pickRecorderMime((m) => m.startsWith("video/mp4")), "video/mp4;codecs=avc1");
  assert.equal(v.pickRecorderMime(() => false), "");
  assert.equal(v.qualityOfHeight(720), "high");
  assert.equal(v.qualityOfHeight(480), "low");
  assert.equal(v.cameraTroubleOf("NotAllowedError"), "denied");
  assert.equal(v.cameraTroubleOf("NotFoundError"), "missing");
  assert.equal(v.cameraTroubleOf(undefined), "unsupported");
  assert.equal(v.CAMERA_TROUBLE_COPY.denied.title, "The camera is off for IDEEZA");
});

test("the note of recorded takes survives junk and drops takes no longer kept", () => {
  assert.deepEqual(v.parseRecorded(null), {});
  assert.deepEqual(v.parseRecorded("[1,2]"), {});
  assert.deepEqual(v.parseRecorded("{bad"), {});
  assert.deepEqual(v.parseRecorded('{"take_a":"camera","take_b":"x"}'), { take_a: "camera" });
  assert.deepEqual(v.withRecorded({ take_a: "camera", take_b: "upload" }, "take_c", "upload", new Set(["take_b"])), { take_b: "upload", take_c: "upload" });
  assert.equal(v.clipMetaOf(9_600, "camera", "28 Oct 2026"), "10-second clip · Recorded on this phone · 28 Oct 2026");
  assert.equal(v.clipMetaOf(4_000, "upload", "28 Oct 2026"), "4-second clip · Uploaded from this phone · 28 Oct 2026");
});

test("a kept clip is a finished take: waiting for review, or in use at once", () => {
  const clip = { mime: "video/webm", width: 640, height: 480, durationMs: 10_000, bytes: 1000 };
  const lines = ["Lamp Head", "LED head", "Built with IDEEZA"];
  const later = v.addClipTake(undefined, { productId: "prd_lamp0001", takeId: "take_1", lines, clip, use: false }, 5);
  assert.equal(later.n, 1);
  assert.equal(later.video.inUseId, null);
  assert.equal(later.video.takes[0].readyAt, 5);
  assert.equal(later.video.takes[0].toReview, true);
  assert.equal(productVideoStatus(later.video, [], 5).state, "review");
  const used = v.addClipTake(later.video, { productId: "prd_lamp0001", takeId: "take_2", lines, clip: { ...clip, height: 720 }, use: true }, 9);
  assert.equal(used.n, 2);
  assert.equal(used.video.inUseId, "take_2");
  assert.equal(used.video.takes[1].quality, "high");
  assert.equal(used.video.takes[1].toReview, undefined);
  assert.equal(productVideoStatus(used.video, [], 9).state, "ready");
});

test("the Sell / Give readiness counts a kept clip once it is in use, not while it waits for review", () => {
  const clip = { mime: "video/webm", width: 640, height: 480, durationMs: 10_000, bytes: 1000 };
  const lines = ["Lamp Head", "LED head", "Built with IDEEZA"];
  const products = [{ id: "prd_lamp0001", name: "Lamp Head", description: "", dropped: null, built: null }];
  const facts = (video) => ({ products, videos: { version: 1, projectId: "earn2", products: { prd_lamp0001: video } }, jobs: [], now: 10, status: "draft", ownershipConfirmed: true, license: null });
  const later = v.addClipTake(undefined, { productId: "prd_lamp0001", takeId: "take_1", lines, clip, use: false }, 5).video;
  assert.equal(readinessOf(facts(later), "sell").counts.ready, 0);
  assert.equal(readinessOf(facts(later), "sell").counts.review, 1);
  const used = v.addClipTake(later, { productId: "prd_lamp0001", takeId: "take_2", lines, clip, use: true }, 9).video;
  assert.equal(readinessOf(facts(used), "sell").counts.ready, 1);
  assert.equal(readinessOf(facts(used), "give").products[0].video.state, "ready");
});

test("a sixth kept clip evicts the oldest take not in use", () => {
  const clip = { mime: "video/webm", width: 640, height: 480, durationMs: 10_000, bytes: 1000 };
  let video;
  for (let i = 1; i <= 5; i++) video = v.addClipTake(video, { productId: "p", takeId: `t${i}`, lines: ["", "", ""], clip, use: i === 1 }, i).video;
  const out = v.addClipTake(video, { productId: "p", takeId: "t6", lines: ["", "", ""], clip, use: false }, 6);
  assert.deepEqual(out.evicted, ["t2"]);
  assert.equal(out.video.takes.length, 5);
  assert.equal(out.n, 6);
});

test("the phone's addresses for a take", () => {
  assert.equal(v.phoneTakeHref("earn 2", "prd_lamp0001", { review: "take_x" }), "/m/projects/earn%202/products/prd_lamp0001/video?review=take_x");
  assert.equal(v.phoneProjectVideoHref("earn2"), "/m/projects/earn2/video");
});
