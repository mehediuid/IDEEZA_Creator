import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures", "editor-work");

function fixture(name) {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

class FakeStorage {
  constructor(initial = {}) {
    this.store = { ...initial };
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
}

// Every entry that isn't already a raw string is JSON-stringified, so a test
// can pass a fixture object directly.
function setStorage(entries) {
  const store = {};
  for (const [key, value] of Object.entries(entries)) {
    store[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  globalThis.window = { localStorage: new FakeStorage(store) };
}

const { editorWorkOf, EDITOR_GLOBAL_NOTE } = await import("../../.tmp-test/lib/manual/editor-work.js");

const PID = "proj_test1";

test("no docs at all: PCB and Wiring read not-opened, everything else reads none", () => {
  setStorage({});
  const work = editorWorkOf(PID);
  assert.deepEqual(work.pcb, { state: "not-opened" });
  assert.deepEqual(work.wiring, { state: "not-opened" });
  assert.deepEqual(work.assembly, { state: "none" });
  assert.deepEqual(work.three, { state: "none" });
  assert.deepEqual(work.code, { state: "none" });
  assert.deepEqual(work.preview, { state: "none" });
});

test("PCB doc holding only the sch- sample: PCB reads sample, Assembly reads none (no board parts)", () => {
  setStorage({ [`ideeza:pcb:doc:${PID}`]: fixture("pcb-sample.json") });
  const work = editorWorkOf(PID);
  assert.deepEqual(work.pcb, { state: "sample" });
  assert.deepEqual(work.assembly, { state: "none" });
});

test("PCB doc with real objects and board parts, some checked off", () => {
  setStorage({
    [`ideeza:pcb:doc:${PID}`]: fixture("pcb-work.json"),
    [`ideeza:assembly:${PID}`]: fixture("assembly-progress.json"),
  });
  const work = editorWorkOf(PID);
  assert.deepEqual(work.pcb, { state: "work", text: "4 objects · 2 on the board" });
  assert.deepEqual(work.assembly, { state: "work", text: "1 of 2 parts checked" });
});

test("PCB doc with board parts but no assembly progress key yet: 0 checked, not none", () => {
  setStorage({ [`ideeza:pcb:doc:${PID}`]: fixture("pcb-work.json") });
  const work = editorWorkOf(PID);
  assert.deepEqual(work.assembly, { state: "work", text: "0 of 2 parts checked" });
});

test("a checked-off id no longer on the board doesn't count (stale progress entry)", () => {
  setStorage({
    [`ideeza:pcb:doc:${PID}`]: fixture("pcb-work.json"),
    [`ideeza:assembly:${PID}`]: { "ghost-part": true },
  });
  const work = editorWorkOf(PID);
  assert.deepEqual(work.assembly, { state: "work", text: "0 of 2 parts checked" });
});

test("an empty PCB objects array is work, not sample", () => {
  setStorage({ [`ideeza:pcb:doc:${PID}`]: { objects: [] } });
  const work = editorWorkOf(PID);
  assert.deepEqual(work.pcb, { state: "work", text: "0 objects · 0 on the board" });
});

test("Wiring doc present: parts and wires counted", () => {
  setStorage({ [`ideeza:wiring:doc:${PID}`]: fixture("wiring-doc.json") });
  const work = editorWorkOf(PID);
  assert.deepEqual(work.wiring, { state: "work", text: "3 parts · 2 wires" });
});

test("3D AI model with a glbUrl reads work; without one reads none", () => {
  setStorage({ [`ideeza:three:aimodel:${PID}`]: fixture("three-aimodel-ready.json") });
  assert.deepEqual(editorWorkOf(PID).three, { state: "work", text: "AI model generated" });

  setStorage({ [`ideeza:three:aimodel:${PID}`]: fixture("three-aimodel-empty.json") });
  assert.deepEqual(editorWorkOf(PID).three, { state: "none" });
});

test("corrupt PCB and wiring JSON degrade to not-opened instead of throwing", () => {
  setStorage({ [`ideeza:pcb:doc:${PID}`]: "{not json", [`ideeza:wiring:doc:${PID}`]: "{not json" });
  const work = editorWorkOf(PID);
  assert.deepEqual(work.pcb, { state: "not-opened" });
  assert.deepEqual(work.wiring, { state: "not-opened" });
});

test("Code and Preview never carry a per-project fact, and the honest note matches the spec verbatim", () => {
  setStorage({});
  const work = editorWorkOf(PID);
  assert.deepEqual(work.code, { state: "none" });
  assert.deepEqual(work.preview, { state: "none" });
  assert.equal(
    EDITOR_GLOBAL_NOTE,
    "Code, 3D shapes and Preview are shared by every project in this browser for now, so they show no progress here.",
  );
});
