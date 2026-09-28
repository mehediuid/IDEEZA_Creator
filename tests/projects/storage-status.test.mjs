// A7a — writes that fail say so (COR-93). Compiled by tests/projects/tsconfig.json (A1):
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WRITE_ERROR_MESSAGE,
  currentWriteError,
  lastFailure,
  recordWrite,
  reportWrite,
  subscribeWriteError,
} from "../../.tmp-test/lib/storage-status.js";

const PROJECTS = "ideeza:manual:projects";
const BUILDS = "ideeza:create:builds";

test("a failed write is recorded under its key; the newest failure is the one shown", () => {
  let f = {};
  f = recordWrite(f, PROJECTS, false, 10);
  f = recordWrite(f, BUILDS, false, 20);
  assert.deepEqual(lastFailure(f), { key: BUILDS, at: 20 });
});

test("a later success clears only its own key — another key still failing stays failing", () => {
  let f = recordWrite(recordWrite({}, PROJECTS, false, 10), BUILDS, false, 20);
  f = recordWrite(f, BUILDS, true, 30);
  assert.deepEqual(lastFailure(f), { key: PROJECTS, at: 10 });
  f = recordWrite(f, PROJECTS, true, 40);
  assert.equal(lastFailure(f), null);
});

test("a success on a key that never failed changes nothing (same object back)", () => {
  const f = recordWrite({}, PROJECTS, false, 10);
  assert.equal(recordWrite(f, BUILDS, true, 20), f);
  const none = {};
  assert.equal(recordWrite(none, PROJECTS, true, 20), none);
});

test("reportWrite notifies only when the failure set changes, with a stable snapshot", () => {
  let calls = 0;
  const off = subscribeWriteError(() => {
    calls += 1;
  });
  reportWrite(PROJECTS, true, 1);
  assert.equal(calls, 0);
  assert.equal(currentWriteError(), null);

  reportWrite(PROJECTS, false, 2);
  assert.equal(calls, 1);
  assert.deepEqual(currentWriteError(), { key: PROJECTS, at: 2 });

  const snapshot = currentWriteError();
  reportWrite(BUILDS, true, 3);
  assert.equal(calls, 1);
  assert.equal(currentWriteError(), snapshot, "useSyncExternalStore needs the same object while nothing changed");

  reportWrite(PROJECTS, true, 4);
  assert.equal(calls, 2);
  assert.equal(currentWriteError(), null);

  off();
  reportWrite(PROJECTS, false, 5);
  assert.equal(calls, 2, "an unsubscribed listener hears nothing");
  reportWrite(PROJECTS, true, 6);
  assert.equal(currentWriteError(), null);
});

test("the banner copy is the spec's (COR-93)", () => {
  assert.equal(WRITE_ERROR_MESSAGE, "This browser's storage is full — your last change wasn't saved.");
});
