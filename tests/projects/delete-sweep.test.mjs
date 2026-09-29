// A7b / T07 — the delete sweep (COR-92, spec §3.2, §3.4, §3.5.8). Compiled by
// tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { projectStorageKeys, sweepProjectKeys } from "../../.tmp-test/lib/manual/project-storage.js";
import { editorDocKey, editorKeysOf, seedRecordKey } from "../../.tmp-test/lib/manual/editor-scope.js";

/** A Storage stand-in: getItem / removeItem, plus keys() for the assertions. */
function memoryStore(entries) {
  const m = new Map(Object.entries(entries));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    removeItem: (k) => {
      m.delete(k);
    },
    keys: () => [...m.keys()].sort(),
  };
}

const ROWS = ["p1", "prd_a"];

test("projectStorageKeys(id, rowIds) holds the scoped editor keys, the 4 legacy keys, the brief draft, and the video/journey/bizplan/editions keys — and no global key", () => {
  const keys = projectStorageKeys("proj_a", ROWS);

  // every scoped editor key (11 docs × 2 rows, plus the 5 :prev backups and
  // the seed record per row — BUILDLOAD C6) comes from editorKeysOf verbatim
  for (const k of editorKeysOf("proj_a", ROWS)) assert.ok(keys.includes(k), `missing ${k}`);
  assert.equal(keys.filter((k) => editorKeysOf("proj_a", ROWS).includes(k)).length, editorKeysOf("proj_a", ROWS).length);

  // the 4 legacy per-project keys, once each — not per row
  for (const k of [
    "ideeza:pcb:doc:proj_a",
    "ideeza:wiring:doc:proj_a",
    "ideeza:assembly:proj_a",
    "ideeza:three:aimodel:proj_a",
  ]) {
    assert.equal(keys.filter((x) => x === k).length, 1, k);
  }

  // the brief draft, and P2's own per-project stores
  for (const k of [
    "ideeza:brief:draft:proj_a",
    "ideeza:video:proj_a",
    "ideeza:project:journey:proj_a",
    "ideeza:project:bizplan:proj_a",
    "ideeza:project:editions:proj_a",
  ]) {
    assert.ok(keys.includes(k), k);
  }

  // never a global key (P2-EDITOR-4/C4 — nothing ONE project can claim)
  for (const g of ["ideeza:code:files", "ideeza:3d:shapes", "ideeza:3d:right", "ideeza:3d:sketches", "ideeza:code:blockly-workspace", "ideeza:preview:canvas", "ideeza:preview:mates"]) {
    assert.ok(!keys.includes(g), g);
  }

  // a scoped key never equals a legacy key or another project's key
  const pcbP1 = editorDocKey("pcb", { projectId: "proj_a", productId: "p1" });
  assert.notEqual(pcbP1, "ideeza:pcb:doc:proj_a");
  assert.notEqual(pcbP1, editorDocKey("pcb", { projectId: "proj_ab", productId: "p1" }));
  assert.notEqual(pcbP1, editorDocKey("pcb", { projectId: "proj_a", productId: "prd_a" }));

  // exact keys, never a prefix: a longer project id never collides
  assert.ok(!keys.some((k) => k.includes("proj_ab")));
});

test("the sweep removes exactly the project's P2 keys and nothing else", () => {
  const scopedPcb = editorDocKey("pcb", { projectId: "proj_a", productId: "p1" });
  // Only what this project's first row actually holds — a project never has
  // every possible document key, so `removed` is checked against this exact
  // set, not the full theoretical list `projectStorageKeys` could sweep.
  const present = [
    scopedPcb,
    `${scopedPcb}:prev`,
    seedRecordKey({ projectId: "proj_a", productId: "p1" }),
    "ideeza:pcb:doc:proj_a", // legacy, not yet adopted
    "ideeza:wiring:doc:proj_a",
    "ideeza:assembly:proj_a",
    "ideeza:three:aimodel:proj_a",
    "ideeza:brief:draft:proj_a",
    "ideeza:video:proj_a",
    "ideeza:project:journey:proj_a",
    "ideeza:project:bizplan:proj_a",
    "ideeza:project:editions:proj_a",
  ];
  const store = memoryStore({
    "ideeza:manual:projects": "[]",
    "ideeza:manual:active": "proj_a", // the provider clears it through its own state
    ...Object.fromEntries(present.map((k) => [k, "{}"])),
    "ideeza:network:proj_a": "{}", // deleteNetwork(id) removes it, so its subscribers hear
    "ideeza:brief:draft:build:b1": "{}", // the build's own draft stays with the build
    "ideeza:pcb:doc:proj_ab": "{}", // a longer id: exact keys, never a prefix match
    "ideeza:brief:draft:proj_ab": "{}",
    "ideeza:pcb:doc:proj_b": "{}",
    "ideeza:code:files": "{}", // global, shared by every project today
    "ideeza:3d:shapes": "[]",
    "ideeza:3d:right": "{}",
    "ideeza:preview:canvas": "{}",
    "ideeza:market:listings": "[]", // MarketProvider drops its own rows on the event
    "ideeza:create:builds": "[]", // builds keep their dangling projectId
    "ideeza:create:chats": "[]",
  });
  const removed = sweepProjectKeys("proj_a", ROWS, store);
  assert.deepEqual([...removed].sort(), [...present].sort());
  // every key actually removed is one projectStorageKeys claims for this project
  const claimed = new Set(projectStorageKeys("proj_a", ROWS));
  for (const k of removed) assert.ok(claimed.has(k), k);
  assert.deepEqual(store.keys(), [
    "ideeza:3d:right",
    "ideeza:3d:shapes",
    "ideeza:brief:draft:build:b1",
    "ideeza:brief:draft:proj_ab",
    "ideeza:code:files",
    "ideeza:create:builds",
    "ideeza:create:chats",
    "ideeza:manual:active",
    "ideeza:manual:projects",
    "ideeza:market:listings",
    "ideeza:network:proj_a",
    "ideeza:pcb:doc:proj_ab",
    "ideeza:pcb:doc:proj_b",
    "ideeza:preview:canvas",
  ]);
});

test("a key the browser refuses to remove is skipped, never thrown", () => {
  const refusing = {
    getItem: () => "{}",
    removeItem: () => {
      throw new Error("SecurityError");
    },
  };
  assert.deepEqual(sweepProjectKeys("proj_a", ["p1"], refusing), []);
});
