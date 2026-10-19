// /history: deleting a concept chat takes its builds with it, except what a project holds, and
// never while one of them is still building.
import { test } from "node:test";
import assert from "node:assert/strict";

const { chatDeletePlan, projectBuildIds } = await import("../../.tmp-test/lib/create/history-delete.js");

const builds = [
  { id: "b1", chatId: "c1", status: "ready" },
  { id: "b2", chatId: "c1", status: "failed" },
  { id: "b3", chatId: "c1", status: "ready", projectId: "proj_a" },
  { id: "b4", chatId: "c1", status: "partial" },
  { id: "b5", chatId: "c2", status: "running" },
];

test("a project's builds stay; the chat's other builds go with it", () => {
  const held = projectBuildIds([{ buildId: "b9", builds: [{ buildId: "b4" }] }, { products: [{ source: { buildId: "b8" } }, {}] }]);
  assert.deepEqual([...held].sort(), ["b4", "b8", "b9"]);
  assert.deepEqual(chatDeletePlan("c1", builds, held), { busy: false, drop: ["b1", "b2"], kept: 2 });
});

test("a chat whose build is queued or running can't go yet; a chat with no builds just goes", () => {
  assert.equal(chatDeletePlan("c2", builds, new Set()).busy, true);
  assert.equal(chatDeletePlan("c2", [{ id: "q", chatId: "c2", status: "queued" }], new Set()).busy, true);
  assert.deepEqual(chatDeletePlan("c3", builds, new Set()), { busy: false, drop: [], kept: 0 });
});
