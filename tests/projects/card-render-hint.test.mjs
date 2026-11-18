// The My projects card's hint while a video renders (owner, 2026-11-15): `renderHintOf` stands in
// for the normal hint until every render for the project or its products has finished or failed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderHintOf } from "../../.tmp-test/lib/manual/project-summary.js";
import { DEMO_SPEED, TOTAL_RENDER_SECONDS, progressOf } from "../../.tmp-test/lib/video/jobs.js";
import { PROJECT_VIDEO_KEY } from "../../.tmp-test/lib/video/types.js";

const NOW = 1_800_000_000_000;
/** Wall-clock ms after which a job started `now` reads `pct` percent. */
const ago = (pct) => ((pct / 100) * TOTAL_RENDER_SECONDS * 1000) / DEMO_SPEED;

const job = (o = {}) => ({
  id: "take_aaaaaaaa",
  title: "Rider · Car",
  prompt: "p",
  quality: "low",
  stage: "rendering",
  startedAt: NOW - ago(40),
  stageStartedAt: NOW - 1000,
  emailReminder: null,
  browserNotify: false,
  minted: false,
  projectId: "prj_car",
  productId: "prd_rider",
  render: { lines: ["a", "b", "c"], imageUrl: null, productName: "Rider" },
  ...o,
});

test("nothing renders: null, so the normal hint shows", () => {
  assert.equal(renderHintOf("prj_car", [], NOW), null);
  assert.equal(renderHintOf("prj_car", [job({ projectId: "prj_other" })], NOW), null);
});

test("a running render: its percent, from the toast's own progress maths", () => {
  const j = job();
  assert.equal(renderHintOf("prj_car", [j], NOW), "Video rendering · 40%");
  assert.equal(renderHintOf("prj_car", [j], NOW), `Video rendering · ${Math.round(progressOf(j, NOW).total)}%`);
});

test("it follows the clock it is given (the provider's 500 ms tick)", () => {
  const j = job({ startedAt: NOW });
  assert.equal(renderHintOf("prj_car", [j], NOW + ago(12)), "Video rendering · 12%");
  assert.equal(renderHintOf("prj_car", [j], NOW + ago(13)), "Video rendering · 13%");
});

test("queued: waiting to render, with no percent", () => {
  assert.equal(renderHintOf("prj_car", [job({ stage: "queued", startedAt: NOW })], NOW), "Video waiting to render");
});

test("done or failed: the normal hint returns", () => {
  assert.equal(renderHintOf("prj_car", [job({ stage: "done" })], NOW), null);
  assert.equal(renderHintOf("prj_car", [job({ stage: "failed" })], NOW), null);
  assert.equal(renderHintOf("prj_car", [job({ stage: "failed" }), job({ id: "take_b", stage: "done" })], NOW), null);
});

test("the last stage holds at 99 % until the file is stored", () => {
  assert.equal(renderHintOf("prj_car", [job({ stage: "encoding", startedAt: NOW - ago(150) })], NOW), "Video rendering · 99%");
});

test("several renders (products and the project video): the one furthest behind", () => {
  const jobs = [
    job({ id: "take_a", startedAt: NOW - ago(70) }),
    job({ id: "take_b", productId: "prd_lamp", startedAt: NOW - ago(25) }),
    job({ id: "take_c", productId: PROJECT_VIDEO_KEY, startedAt: NOW - ago(55) }),
  ];
  assert.equal(renderHintOf("prj_car", jobs, NOW), "Video rendering · 25%");
});

test("one queued beside one running: rendering, and the queued one holds the percent down", () => {
  const jobs = [job({ id: "take_a", startedAt: NOW - ago(60) }), job({ id: "take_b", stage: "queued", startedAt: NOW - ago(1) })];
  assert.equal(renderHintOf("prj_car", jobs, NOW), "Video rendering · 1%");
});

test("a finished render beside a running one doesn't end the line", () => {
  const jobs = [job({ id: "take_a", stage: "done" }), job({ id: "take_b", startedAt: NOW - ago(30) })];
  assert.equal(renderHintOf("prj_car", jobs, NOW), "Video rendering · 30%");
});

test("a hidden toast (acknowledged) still renders, so the line stays", () => {
  assert.equal(renderHintOf("prj_car", [job({ acknowledged: true })], NOW), "Video rendering · 40%");
});

test("a v1 Brief job names no project: never the card's", () => {
  assert.equal(renderHintOf("prj_car", [job({ projectId: undefined, productId: undefined, render: undefined })], NOW), null);
});
