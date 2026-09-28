// A7a — lastOpened, the one resume signal (COR-91, §5.1.10). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
//
// P2-EDITOR-7 (spec §3.5.8) replaces the per-project `stampOpened` with the
// per-product `stampEditorOpened` (editor-scope.ts) — its tests live in
// editor-scope.test.mjs, next to the function. `stampOpened` stays here,
// unchanged and @deprecated, until the provider's `touchOpened` (T09) moves
// its one call site over.
import { test } from "node:test";
import assert from "node:assert/strict";
import { OPENED_EVERY_MS, stampOpened } from "../../.tmp-test/lib/manual/project-storage.js";

const project = (over = {}) => ({
  id: "proj_rover",
  slug: "rover-kit",
  name: "Rover Kit",
  productName: "Rover board",
  description: "",
  status: "draft",
  createdAt: 1_000,
  updatedAt: 2_000,
  flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
  ...over,
});

test("stamping records the step and leaves updatedAt alone", () => {
  const p = project();
  const q = stampOpened(p, "wiring", 50_000);
  assert.deepEqual(q.lastOpened, { step: "wiring", at: 50_000 });
  assert.equal(q.updatedAt, 2_000);
  assert.equal(p.lastOpened, undefined, "the input is not mutated");
});

test("the same step under a minute later isn't written again (same object back)", () => {
  const p = project({ lastOpened: { step: "pcb", at: 10_000 } });
  assert.equal(OPENED_EVERY_MS, 60_000);
  assert.equal(stampOpened(p, "pcb", 10_000 + OPENED_EVERY_MS - 1), p);
});

test("a minute later, or another step, is stamped", () => {
  const p = project({ lastOpened: { step: "pcb", at: 10_000 } });
  assert.deepEqual(stampOpened(p, "pcb", 10_000 + OPENED_EVERY_MS).lastOpened, { step: "pcb", at: 70_000 });
  assert.deepEqual(stampOpened(p, "code", 10_001).lastOpened, { step: "code", at: 10_001 });
  assert.equal(stampOpened(p, "code", 10_001).updatedAt, 2_000);
});
