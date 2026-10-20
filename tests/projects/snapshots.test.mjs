// Product Preview's snapshots (the Assembly + Wiring plan F35): kept newest
// first, at most MAX_SNAPSHOTS, the oldest dropped when storage is short.
// Compiled by tests/projects/tsconfig.json (npm run test:projects).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_SNAPSHOTS, addSnapshot, readSnapshots, removeSnapshot, snapshotsKey } from "../../.tmp-test/lib/manual/snapshots.js";

/** A Storage stand-in that refuses a value longer than `limit` characters. */
function store(limit = Infinity, entries = {}) {
  const m = new Map(Object.entries(entries));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (v.length > limit) throw new Error("QuotaExceededError");
      m.set(k, v);
    },
    raw: (k) => m.get(k),
  };
}

const snap = (id, at = 1, size = 10) => ({ id, productId: "p1", productName: "Lamp", dataUrl: "data:image/jpeg;base64," + "A".repeat(size), at });

test("snapshotsKey is per project", () => {
  assert.equal(snapshotsKey("proj_a"), "ideeza:project:snapshots:proj_a");
});

test("addSnapshot keeps the newest first and at most MAX_SNAPSHOTS", () => {
  const s = store();
  for (let i = 0; i < MAX_SNAPSHOTS + 2; i++) addSnapshot("p", snap(`s${i}`, i), s);
  const list = readSnapshots("p", s);
  assert.equal(list.length, MAX_SNAPSHOTS);
  assert.equal(list[0].id, `s${MAX_SNAPSHOTS + 1}`);
  assert.equal(list.at(-1).id, "s2");
});

test("addSnapshot drops the oldest until it fits; nothing changes when even the new one won't", () => {
  const one = JSON.stringify([snap("x", 1, 100)]).length;
  const s = store(one * 2 + 1);
  addSnapshot("p", snap("a", 1, 100), s);
  addSnapshot("p", snap("b", 2, 100), s);
  const r = addSnapshot("p", snap("c", 3, 100), s);
  assert.equal(r.kept, true);
  assert.equal(r.dropped, 1);
  assert.deepEqual(readSnapshots("p", s).map((x) => x.id), ["c", "b"]);

  const before = s.raw(snapshotsKey("p"));
  const big = addSnapshot("p", snap("huge", 4, one * 3), s);
  assert.equal(big.kept, false);
  assert.equal(s.raw(snapshotsKey("p")), before, "the list is left as it was");
});

test("readSnapshots drops junk and anything that isn't an image data URL", () => {
  const s = store(Infinity, {
    [snapshotsKey("p")]: JSON.stringify([snap("ok"), { ...snap("bad"), dataUrl: "https://example.com/a.png" }, null, "x"]),
    [snapshotsKey("q")]: "{not json",
  });
  assert.deepEqual(readSnapshots("p", s).map((x) => x.id), ["ok"]);
  assert.deepEqual(readSnapshots("q", s), []);
});

test("removeSnapshot removes one by id", () => {
  const s = store();
  addSnapshot("p", snap("a", 1), s);
  addSnapshot("p", snap("b", 2), s);
  assert.deepEqual(removeSnapshot("p", "a", s).map((x) => x.id), ["b"]);
  assert.deepEqual(readSnapshots("p", s).map((x) => x.id), ["b"]);
});
