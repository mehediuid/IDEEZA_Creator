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

const { editorWorkOf } = await import("../../.tmp-test/lib/manual/editor-work.js");

const PID = "proj_test1";

// ───────────────────── the deprecated 1-arg form (legacy per-project keys) ─────────────────────

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

test("Code and Preview never carry a fact through the deprecated 1-arg form (no legacy key to adopt)", () => {
  setStorage({});
  const work = editorWorkOf(PID);
  assert.deepEqual(work.code, { state: "none" });
  assert.deepEqual(work.preview, { state: "none" });
});

// ───────────────────── the scoped 2-arg form (P2-EDITOR-8) ─────────────────────

test("the scoped form on the first row still adopts the legacy per-project PCB/Wiring/Assembly/3D-AI keys", () => {
  setStorage({ [`ideeza:pcb:doc:${PID}`]: fixture("pcb-work.json") });
  const work = editorWorkOf({ projectId: PID, productId: "p1" }, "p1");
  assert.deepEqual(work.pcb, { state: "work", text: "4 objects · 2 on the board" });
});

test("the scoped form on a NON-first row never reads the legacy per-project key", () => {
  setStorage({ [`ideeza:pcb:doc:${PID}`]: fixture("pcb-work.json") });
  const work = editorWorkOf({ projectId: PID, productId: "prd_b" }, "p1");
  assert.deepEqual(work.pcb, { state: "not-opened" });
});

test("Code gains a real fact once the product has its own scoped Code document", () => {
  setStorage({ [`ideeza:code:files:${PID}:prd_a`]: [{ name: "a.py" }, { name: "b.py" }] });
  const work = editorWorkOf({ projectId: PID, productId: "prd_a" }, "p1");
  assert.deepEqual(work.code, { state: "work", text: "2 files" });
});

test("Code never reads the global ideeza:code:files key, even for the first row (P2-EDITOR-4/C4)", () => {
  setStorage({ "ideeza:code:files": [{ name: "old.py" }] });
  const work = editorWorkOf({ projectId: PID, productId: "p1" }, "p1");
  assert.deepEqual(work.code, { state: "none" });
});

test("3D gains shape and AI-model facts, joined when both exist", () => {
  setStorage({ [`ideeza:3d:shapes:${PID}:prd_a`]: [{ id: "s1" }, { id: "s2" }, { id: "s3" }] });
  assert.deepEqual(editorWorkOf({ projectId: PID, productId: "prd_a" }, "p1").three, { state: "work", text: "3 shapes" });

  setStorage({
    [`ideeza:3d:shapes:${PID}:prd_a`]: [{ id: "s1" }],
    [`ideeza:three:aimodel:${PID}:prd_a`]: fixture("three-aimodel-ready.json"),
  });
  assert.deepEqual(editorWorkOf({ projectId: PID, productId: "prd_a" }, "p1").three, {
    state: "work",
    text: "1 shapes · AI model generated",
  });
});

test("Preview reads the mate count once the product has its own scoped mates", () => {
  setStorage({ [`ideeza:preview:mates:${PID}:prd_a`]: { i1: {}, i2: {} } });
  assert.deepEqual(editorWorkOf({ projectId: PID, productId: "prd_a" }, "p1").preview, { state: "work", text: "2 mates set" });
  setStorage({});
  assert.deepEqual(editorWorkOf({ projectId: PID, productId: "prd_a" }, "p1").preview, { state: "none" });
});
