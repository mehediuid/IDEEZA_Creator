// A7b — the delete sweep (COR-92, spec §5.1.9). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { projectStorageKeys, sweepProjectKeys } from "../../.tmp-test/lib/manual/project-storage.js";

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

test("the per-project keys are exactly the five §5.1.9 lists", () => {
  assert.deepEqual(projectStorageKeys("proj_a"), [
    "ideeza:pcb:doc:proj_a",
    "ideeza:wiring:doc:proj_a",
    "ideeza:assembly:proj_a",
    "ideeza:three:aimodel:proj_a",
    "ideeza:brief:draft:proj_a",
  ]);
});

test("the sweep removes the project's keys and nothing else", () => {
  const store = memoryStore({
    "ideeza:manual:projects": "[]",
    "ideeza:manual:active": "proj_a", // the provider clears it through its own state
    "ideeza:pcb:doc:proj_a": "{}",
    "ideeza:wiring:doc:proj_a": "{}",
    "ideeza:assembly:proj_a": "{}",
    "ideeza:three:aimodel:proj_a": "{}",
    "ideeza:brief:draft:proj_a": "{}",
    "ideeza:network:proj_a": "{}", // deleteNetwork(id) removes it, so its subscribers hear
    "ideeza:brief:draft:build:b1": "{}", // the build's own draft stays with the build
    "ideeza:pcb:doc:proj_ab": "{}", // a longer id: exact keys, never a prefix match
    "ideeza:brief:draft:proj_ab": "{}",
    "ideeza:pcb:doc:proj_b": "{}",
    "ideeza:code:files": "{}", // shared by every project today
    "ideeza:3d:shapes": "[]",
    "ideeza:3d:right": "{}",
    "ideeza:preview:canvas": "{}",
    "ideeza:create:builds": "[]", // builds keep their dangling projectId
    "ideeza:create:chats": "[]",
  });
  const removed = sweepProjectKeys("proj_a", store);
  assert.deepEqual([...removed].sort(), [...projectStorageKeys("proj_a")].sort());
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
    "ideeza:network:proj_a",
    "ideeza:pcb:doc:proj_ab",
    "ideeza:pcb:doc:proj_b",
    "ideeza:preview:canvas",
  ]);
});

test("only keys that exist are reported, and a store that refuses never throws", () => {
  const store = memoryStore({ "ideeza:pcb:doc:proj_a": "{}" });
  assert.deepEqual(sweepProjectKeys("proj_a", store), ["ideeza:pcb:doc:proj_a"]);
  const refusing = {
    getItem: () => "{}",
    removeItem: () => {
      throw new Error("SecurityError");
    },
  };
  assert.deepEqual(sweepProjectKeys("proj_a", refusing), []);
});
