import test from "node:test";
import assert from "node:assert/strict";
import { nextVersionOf } from "../../.tmp-test/lib/create/save-footer.js";

test("nextVersionOf starts a lineage at 1", () => {
  const job = { id: "b3", chatId: "c1" };
  assert.equal(nextVersionOf(job, []), 1);
});

test("nextVersionOf continues the same chat's highest version", () => {
  const job = { id: "b3", chatId: "c1" };
  const refs = [
    { buildId: "b1", chatId: "c1", version: 1, savedAt: 1, job: null },
    { buildId: "b2", chatId: "c1", version: 2, savedAt: 2, job: null },
  ];
  assert.equal(nextVersionOf(job, refs), 3);
});

test("nextVersionOf ignores another chat's versions", () => {
  const job = { id: "b3", chatId: "c1" };
  const refs = [{ buildId: "b9", chatId: "c9", version: 5, savedAt: 1, job: null }];
  assert.equal(nextVersionOf(job, refs), 1);
});
