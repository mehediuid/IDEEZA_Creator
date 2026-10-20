// /history: one list, one row per chat, its status read off the chat's newest build; a build
// whose chat is gone keeps a row of its own. Filters and search narrow it.
import { test } from "node:test";
import assert from "node:assert/strict";

const { historyEntries, filterCounts, narrowHistory, parseFilter } = await import(
  "../../.tmp-test/lib/create/history-list.js"
);

const chat = (id, updatedAt, extra = {}) => ({ id, title: `Chat ${id}`, prompt: `prompt ${id}`, imageUrl: `/${id}.png`, updatedAt, ...extra });
const build = (id, chatId, createdAt, extra = {}) => ({
  id,
  chatId,
  title: `Build ${id}`,
  prompt: `build prompt ${id}`,
  imageUrl: `/${id}.png`,
  createdAt,
  updatedAt: createdAt,
  queued: false,
  blocked: false,
  rollup: "ready",
  progress: 100,
  attention: false,
  ...extra,
});

test("a chat's row takes its newest build's status, picture and project, and the later of the two times", () => {
  const rows = historyEntries(
    [chat("c1", 100)],
    [
      build("old", "c1", 10, { rollup: "failed", progress: 0, attention: true }),
      build("new", "c1", 50, { updatedAt: 300, projectId: "p1", projectName: "Smart Lamp" }),
    ],
  );
  assert.equal(rows.length, 1);
  const [r] = rows;
  assert.equal(r.status, "ready");
  assert.equal(r.buildId, "new");
  assert.equal(r.imageUrl, "/new.png");
  assert.equal(r.projectId, "p1");
  assert.equal(r.projectName, "Smart Lamp");
  assert.equal(r.attention, false);
  assert.equal(r.ts, 300);
  assert.equal(r.href, "/chat/c1");
  assert.equal(r.name, "Chat c1");
  assert.equal(r.prompt, "prompt c1");
  assert.equal(r.deletable, true);
});

test("each build state reads as one status", () => {
  const status = (extra) => historyEntries([chat("c", 1)], [build("b", "c", 1, extra)])[0];
  assert.equal(historyEntries([chat("c", 1)], [])[0].status, "concept");
  assert.equal(status({ queued: true, rollup: "building", progress: 0 }).status, "waiting");
  assert.equal(status({ queued: true, blocked: true, rollup: "building", progress: 0 }).status, "paused");
  const running = status({ rollup: "building", progress: 42 });
  assert.equal(running.status, "building");
  assert.equal(running.progress, 42);
  assert.equal(status({ rollup: "partial", progress: 80 }).status, "failed");
  assert.equal(status({ rollup: "failed", progress: 0 }).status, "failed");
  assert.equal(status({ rollup: "ready" }).progress, undefined);
});

test("a chat without a build keeps its own picture; a build whose chat is gone is its own row on /build", () => {
  const rows = historyEntries(
    [chat("c1", 500, { imageUrl: undefined })],
    [build("orphan", "gone", 200, { projectId: "p2", projectName: "Drone" })],
  );
  assert.deepEqual(rows.map((r) => r.key), ["chat:c1", "build:orphan"]);
  assert.equal(rows[0].imageUrl, undefined);
  const orphan = rows[1];
  assert.equal(orphan.href, "/build/orphan");
  assert.equal(orphan.name, "Build orphan");
  assert.equal(orphan.prompt, "build prompt orphan");
  assert.equal(orphan.deletable, false);
  assert.equal(orphan.chatId, undefined);
});

test("newest first", () => {
  const rows = historyEntries([chat("a", 10), chat("b", 30)], [build("x", "a", 5, { updatedAt: 40 })]);
  assert.deepEqual(rows.map((r) => r.key), ["chat:a", "chat:b"]);
});

const sample = historyEntries(
  [
    chat("lamp", 6, { title: "Smart desk lamp", prompt: "dims by ambient light" }),
    chat("lora", 5, { title: "LoRa weather station", prompt: "solar and wind" }),
    chat("watch", 4, { title: "E-ink watch", prompt: "heart rate" }),
    chat("synth", 3, { title: "Pocket synth", prompt: "16-step sequencer" }),
    chat("green", 2, { title: "Greenhouse node", prompt: "soil moisture" }),
    chat("queue", 1, { title: "Queued thing", prompt: "waits" }),
  ],
  [
    build("b1", "lamp", 1, { projectId: "p1", projectName: "Bedroom Kit" }),
    build("b2", "lora", 1, { rollup: "building", progress: 60 }),
    build("b3", "watch", 1, { rollup: "partial", progress: 70, attention: true }),
    build("b5", "green", 1, { queued: true, blocked: true, rollup: "building", progress: 0, attention: true }),
    build("b6", "queue", 1, { queued: true, rollup: "building", progress: 0 }),
  ],
);

test("filters: in progress is waiting or building; ready; needs attention follows the build's attention", () => {
  assert.deepEqual(filterCounts(sample), { all: 6, progress: 2, ready: 1, attention: 2 });
  assert.deepEqual(narrowHistory(sample, "progress", "").map((r) => r.chatId), ["lora", "queue"]);
  assert.deepEqual(narrowHistory(sample, "ready", "").map((r) => r.chatId), ["lamp"]);
  assert.deepEqual(narrowHistory(sample, "attention", "").map((r) => r.chatId), ["watch", "green"]);
});

test("search matches the name, the prompt or the project, any case, inside the filter", () => {
  assert.deepEqual(narrowHistory(sample, "all", "  SOIL ").map((r) => r.chatId), ["green"]);
  assert.deepEqual(narrowHistory(sample, "all", "bedroom").map((r) => r.chatId), ["lamp"]);
  assert.deepEqual(narrowHistory(sample, "all", "synth").map((r) => r.chatId), ["synth"]);
  assert.deepEqual(narrowHistory(sample, "progress", "synth"), []);
});

test("an unknown filter in the address is All", () => {
  assert.equal(parseFilter("ready"), "ready");
  assert.equal(parseFilter("builds"), "all");
  assert.equal(parseFilter(null), "all");
});
