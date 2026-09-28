// The words every video surface shares (Phase 2 VIDEO P2-VIDEO-2, 4, 6, 8,
// 9, 10, 14).
import { test } from "node:test";
import assert from "node:assert/strict";

const copy = await import("../../.tmp-test/lib/video/video-copy.js");

const take = (o = {}) => ({
  id: "take_aaaaaaaa",
  productId: "prd_a",
  n: 2,
  prompt: "p",
  lines: ["a", "b", "c"],
  quality: "low",
  source: null,
  createdAt: 1,
  ...o,
});

test("FAILURE_COPY: P2-VIDEO-2's six kinds, word for word", () => {
  assert.equal(copy.FAILURE_COPY.unsupported, "This browser can't make video files. Try a recent Chrome, Edge or Safari.");
  assert.equal(
    copy.FAILURE_COPY.storage,
    "There's no room to store the video in this browser. Free some space, then try again.",
  );
  assert.equal(copy.FAILURE_COPY.encode, "The video couldn't be made. Try again.");
  assert.equal(copy.FAILURE_COPY.interrupted, "The render stopped before it finished.");
  assert.equal(copy.FAILURE_COPY.cancelled, "You cancelled this render.");
  assert.equal(copy.FAILURE_COPY.lost, "This video isn't stored in this browser any more.");
});

test("honestyLine names the product", () => {
  assert.equal(
    copy.honestyLine("Rider"),
    "Made in this browser from Rider's image and on-screen text — the AI video model isn't connected yet. Your prompt is kept with the video.",
  );
});

test("statusCopy: P2-VIDEO-4's table", () => {
  assert.deepEqual(copy.statusCopy({ state: "none" }), {
    text: "No video yet",
    sub: null,
    tone: "error",
    icon: "cross",
    action: "generate",
    progress: null,
  });
  const r = copy.statusCopy({ state: "rendering", take: take(), stage: "rendering", progress: 40.4, eta: "about 1 min" });
  assert.equal(r.text, "Rendering · 40 %");
  assert.equal(r.sub, "about 1 min left");
  assert.equal(r.icon, "spinner");
  assert.equal(r.action, null);
  assert.equal(copy.statusCopy({ state: "ready", take: take() }).text, "Video ready");
  const next = copy.statusCopy({
    state: "ready",
    take: take(),
    next: { take: take({ n: 3 }), progress: 12.6, eta: "under a minute" },
  });
  assert.equal(next.text, "Video ready · Take 3 rendering 13 %");
  assert.equal(next.tone, "success");
  const f = copy.statusCopy({ state: "failed", take: take(), failure: "cancelled" });
  assert.equal(f.text, "Render failed");
  assert.equal(f.sub, "You cancelled this render.");
  assert.equal(f.action, "retry");
  assert.equal(copy.actionLabel("generate"), "Generate AI video");
  assert.equal(copy.actionLabel("retry"), "Try again");
  assert.equal(copy.actionLabel(null), null);
});

test("lines: meta, take label, stage line, title", () => {
  assert.equal(copy.clipMetaLine(take(), "29 Sep 2026"), "10-second silent clip · 360p · Take 2 · Made 29 Sep 2026");
  assert.equal(copy.clipMetaLine(take({ quality: "high" }), "x"), "10-second silent clip · 720p · Take 2 · Made x");
  assert.equal(copy.takeLabel(take(), "29 Sep 2026"), "Take 2 · 360p · 29 Sep 2026");
  assert.equal(copy.stageLine(2, "queued"), "Take 2 · Stage 1 of 5 · Queued");
  assert.equal(copy.stageLine(2, "encoding"), "Take 2 · Stage 5 of 5 · Encoding & finalising");
  assert.equal(copy.renderTitle("Rider", "Car"), "Rider · Car");
});

test("readinessCopy: P2-VIDEO-14's table with relist and edition", () => {
  assert.deepEqual(copy.readinessCopy("showcase"), {
    title: "Showcase project",
    info: "To showcase this project, every product needs an AI video.",
    cta: "Showcase project",
  });
  assert.equal(copy.readinessCopy("sell").cta, "Continue to listing");
  assert.equal(copy.readinessCopy("sell").title, "Add to marketplace");
  assert.equal(copy.readinessCopy("give").title, "Give to community");
  assert.equal(copy.readinessCopy("relist").info, "To relist, every product needs an AI video.");
  assert.deepEqual(copy.readinessCopy("edition", "Rider"), {
    title: "Add Rider NFTs to the marketplace",
    info: "Rider needs an AI video first.",
    cta: "Continue",
  });
});

test("counts and state changes", () => {
  assert.equal(copy.readyCountLine(1, 2), "1 of 2 ready");
  assert.equal(copy.videosGroupMeta(1, 2), "1 of 2 products have a video");
  assert.equal(copy.videosGroupMeta(1, 1), "1 of 1 product has a video");
  assert.equal(copy.stateChangeLine("Rider", { state: "ready", take: take() }), "Rider video is ready.");
  assert.equal(copy.stateChangeLine("Rider", { state: "none" }), null);
  assert.equal(copy.toastHeading("rendering", "under a minute"), "Video rendering · under a minute left");
  assert.equal(copy.toastHeading("ready", ""), "Video ready");
  assert.equal(copy.toastHeading("failed", ""), "Video render failed");
});
