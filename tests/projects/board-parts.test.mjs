import { test } from "node:test";
import assert from "node:assert/strict";

const { boardPartsOf } = await import("../../.tmp-test/lib/pcb/board-parts.js");

test("keeps only pcb-scoped objects with both a designator and a footprint", () => {
  const doc = {
    objects: [
      { id: "fp-r1", kind: "footprint", x: 0, y: 0, scope: "pcb", text: "R1", footprint: "R_0603", side: "top" },
      { id: "fp-u1", kind: "footprint", x: 0, y: 0, scope: "pcb", text: "U1", footprint: "SOIC-8" },
      { id: "trk-1", kind: "track", x: 0, y: 0, scope: "pcb", net: "GND" },
      { id: "sch-r2", kind: "resistorBox", x: 0, y: 0, scope: "schematic", text: "R2" },
    ],
  };
  const parts = boardPartsOf(doc);
  assert.deepEqual(parts, [
    { id: "fp-r1", designator: "R1", footprint: "R_0603", side: "top" },
    { id: "fp-u1", designator: "U1", footprint: "SOIC-8", side: "top" },
  ]);
});

test("defaults an unmarked side to top, and a missing/malformed objects array to no parts", () => {
  assert.deepEqual(boardPartsOf({}), []);
  assert.deepEqual(boardPartsOf(null), []);
  assert.deepEqual(boardPartsOf(undefined), []);
});
