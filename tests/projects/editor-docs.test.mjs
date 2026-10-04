// T15 — the product-scoped editor's documents in storage (P2-EDITOR-3, 4, 5
// as BUILDLOAD C6 changes them): the read order scoped → legacy-not-pristine
// → default, adopt-once as a move, the save queue that writes to the key it
// was scheduled for, and "Bring it in", which appends and never replaces.
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  BRING_IN_DOCS,
  DocSaveQueue,
  GLOBAL_DOC_KEY,
  appendBlocklyXml,
  bringIn,
  bringInOfferOf,
  earlierName,
  legacyIsPristine,
  readEditorDoc,
  writeEditorDoc,
} from "../../.tmp-test/lib/manual/editor-docs.js";
import { editorDocKey } from "../../.tmp-test/lib/manual/editor-scope.js";
import { fingerprintOf } from "../../.tmp-test/lib/manual/build-load.js";
import { DEFAULT_FILES } from "../../.tmp-test/lib/code/files.js";
import { DEFAULT_SHAPES } from "../../.tmp-test/lib/three/scene.js";
import { DEMO_SCHEM_OBJECTS } from "../../.tmp-test/lib/pcb/types.js";

class MemStorage {
  constructor(entries = {}, { refuse = () => false } = {}) {
    this.map = new Map(Object.entries(entries));
    this.refuse = refuse;
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    if (this.refuse(k, v)) throw new Error("QuotaExceededError");
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
}

const A = { projectId: "proj_car", productId: "prd_a" };
const B = { projectId: "proj_car", productId: "prd_b" };
const LEGACY_PCB = "ideeza:pcb:doc:proj_car";
const text = (t) => ({ id: "obj_1", kind: "text", x: 10, y: 20, text: t });
const pcbDoc = (objects) => JSON.stringify({ objects });

// ───────────────────────────── the read order ─────────────────────────────

test("the product's own key wins the read", () => {
  const s = new MemStorage({ [editorDocKey("pcb", A)]: pcbDoc([text("MINE")]), [LEGACY_PCB]: pcbDoc([text("LEGACY")]) });
  const r = readEditorDoc("pcb", A, "prd_a", s);
  assert.equal(r.from, "scoped");
  assert.match(r.raw, /MINE/);
  assert.equal(r.settle, null, "a legacy doc with work isn't removed from under its reader");
});

test("the first row adopts a legacy doc the maker changed; its first write moves it", () => {
  const s = new MemStorage({ [LEGACY_PCB]: pcbDoc([text("LEGACY")]) });
  const r = readEditorDoc("pcb", A, "prd_a", s);
  assert.equal(r.from, "legacy");
  assert.match(r.raw, /LEGACY/);
  assert.equal(r.key, "ideeza:pcb:doc:proj_car:prd_a");
  assert.equal(r.settle, LEGACY_PCB);

  assert.equal(writeEditorDoc(r, pcbDoc([text("LEGACY moved")]), s), true);
  assert.equal(s.getItem(LEGACY_PCB), null, "the legacy key is gone — a move, not a copy");
  assert.match(s.getItem("ideeza:pcb:doc:proj_car:prd_a"), /LEGACY moved/);
  assert.equal(r.settle, null);
});

test("another row never reads the legacy doc", () => {
  const s = new MemStorage({ [LEGACY_PCB]: pcbDoc([text("LEGACY")]) });
  const r = readEditorDoc("pcb", B, "prd_a", s);
  assert.deepEqual({ from: r.from, raw: r.raw, settle: r.settle }, { from: "default", raw: null, settle: null });
});

test("a pristine legacy PCB doc (the demo only) isn't adopted, and the first write removes it", () => {
  const s = new MemStorage({ [LEGACY_PCB]: pcbDoc(DEMO_SCHEM_OBJECTS) });
  const r = readEditorDoc("pcb", A, "prd_a", s);
  assert.deepEqual({ from: r.from, raw: r.raw, settle: r.settle }, { from: "default", raw: null, settle: LEGACY_PCB });
  writeEditorDoc(r, pcbDoc([text("new")]), s);
  assert.equal(s.getItem(LEGACY_PCB), null);
});

test("a pristine legacy doc beside the product's own key is removed on its next write", () => {
  const s = new MemStorage({ [editorDocKey("pcb", A)]: pcbDoc([text("SEEDED")]), [LEGACY_PCB]: pcbDoc(DEMO_SCHEM_OBJECTS) });
  const r = readEditorDoc("pcb", A, "prd_a", s);
  assert.equal(r.settle, LEGACY_PCB);
});

test("legacy pristine rules: an empty wiring, nothing checked off; an AI model never", () => {
  assert.equal(legacyIsPristine("wiring", JSON.stringify({ parts: [], wires: [] })), true);
  assert.equal(legacyIsPristine("wiring", JSON.stringify({ parts: [{ id: "wp_1" }], wires: [] })), false);
  assert.equal(legacyIsPristine("assembly", JSON.stringify({ obj_3: false })), true);
  assert.equal(legacyIsPristine("assembly", JSON.stringify({ obj_3: true })), false);
  assert.equal(legacyIsPristine("three.ai", JSON.stringify({ glbUrl: null })), false);
});

test("the AI model's legacy doc is adopted by the first row", () => {
  const s = new MemStorage({ "ideeza:three:aimodel:proj_car": JSON.stringify({ prompt: "car", glbUrl: "https://x/y.glb" }) });
  const r = readEditorDoc("three.ai", A, "prd_a", s);
  assert.equal(r.from, "legacy");
  assert.equal(r.key, "ideeza:three:aimodel:proj_car:prd_a");
});

test("a refused write keeps the legacy key", () => {
  const s = new MemStorage({ [LEGACY_PCB]: pcbDoc([text("LEGACY")]) }, { refuse: (k) => k.endsWith(":prd_a") });
  const r = readEditorDoc("pcb", A, "prd_a", s);
  assert.equal(writeEditorDoc(r, pcbDoc([text("x")]), s), false);
  assert.notEqual(s.getItem(LEGACY_PCB), null);
  assert.equal(r.settle, LEGACY_PCB);
});

// ───────────────────────────── the save queue ─────────────────────────────

function fakeTimers() {
  const live = new Map();
  let n = 0;
  return {
    set: (fn) => {
      live.set(++n, fn);
      return n;
    },
    clear: (h) => live.delete(h),
    fireAll: () => [...live.entries()].forEach(([h, fn]) => (live.delete(h), fn())),
    get size() {
      return live.size;
    },
  };
}

test("the queue writes the newest value, once, after the pause", () => {
  const t = fakeTimers();
  const writes = [];
  const q = new DocSaveQueue(300, (target, v) => (writes.push([target, v]), true), t);
  q.schedule("A", "1");
  q.schedule("A", "2");
  assert.equal(t.size, 1, "a newer value supersedes the pending one");
  t.fireAll();
  assert.deepEqual(writes, [["A", "2"]]);
  assert.equal(q.pendingTarget(), null);
});

test("flush writes to the target it was scheduled for — never the one the caller moved to (COR-94)", () => {
  const t = fakeTimers();
  const s = new MemStorage();
  const q = new DocSaveQueue(300, (key, v) => writeEditorDoc({ key, settle: null }, v, s), t);
  q.schedule(editorDocKey("pcb", A), pcbDoc([text("A-EDIT")]));
  // The editor switches to B: the pending A save is flushed first.
  assert.equal(q.flush(), true);
  assert.equal(t.size, 0);
  assert.match(s.getItem(editorDocKey("pcb", A)), /A-EDIT/);
  assert.equal(s.getItem(editorDocKey("pcb", B)), null);
  assert.equal(q.flush(), null, "nothing pending twice");
});

test("cancel drops a pending write unwritten", () => {
  const t = fakeTimers();
  const writes = [];
  const q = new DocSaveQueue(300, (target, v) => (writes.push(v), true), t);
  q.schedule("A", "1");
  q.cancel();
  t.fireAll();
  assert.deepEqual(writes, []);
});

// ───────────────────────────── Bring it in ─────────────────────────────

test("every global key is the base of the product's own key", () => {
  for (const [doc, key] of Object.entries(GLOBAL_DOC_KEY)) {
    assert.equal(editorDocKey(doc, B), `${key}:proj_car:prd_b`);
  }
  assert.deepEqual([...BRING_IN_DOCS.code, ...BRING_IN_DOCS.three].sort(), Object.keys(GLOBAL_DOC_KEY).sort());
});

const botPy = { name: "bot.py", language: "python", content: "print('mine')\n" };
const oldPy = { name: "old.py", language: "python", content: "x = 1\n" };
const ino = { name: "rc_car.ino", language: "cpp", content: "void setup() {}\n" };

test("the offer shows while the globals hold work and the product has none of its own", () => {
  const g = { [GLOBAL_DOC_KEY["code.files"]]: JSON.stringify([oldPy]) };
  assert.equal(bringInOfferOf("code", B, new MemStorage(g), null), true, "absent");
  assert.equal(
    bringInOfferOf("code", B, new MemStorage({ ...g, [editorDocKey("code.files", B)]: JSON.stringify(DEFAULT_FILES) }), null),
    true,
    "pristine",
  );
  const seeded = JSON.stringify([ino]);
  const seed = { seeded: { "code.files": fingerprintOf("code.files", seeded) } };
  assert.equal(
    bringInOfferOf("code", B, new MemStorage({ ...g, [editorDocKey("code.files", B)]: seeded }), seed),
    true,
    "still what the build seeded",
  );
  const edited = JSON.stringify([{ ...ino, content: "void loop() {}\n" }]);
  assert.equal(
    bringInOfferOf("code", B, new MemStorage({ ...g, [editorDocKey("code.files", B)]: edited }), seed),
    false,
    "the maker's own work",
  );
});

test("no offer when the globals are only the samples", () => {
  assert.equal(bringInOfferOf("code", B, new MemStorage({ "ideeza:code:files": JSON.stringify(DEFAULT_FILES) }), null), false);
  assert.equal(bringInOfferOf("three", B, new MemStorage({ "ideeza:3d:shapes": JSON.stringify(DEFAULT_SHAPES) }), null), false);
  assert.equal(
    bringInOfferOf("code", B, new MemStorage({ "ideeza:code:blockly-workspace": '<xml xmlns="https://developers.google.com/blockly/xml"></xml>' }), null),
    false,
  );
  assert.equal(bringInOfferOf("three", B, new MemStorage({ "ideeza:preview:mates": JSON.stringify({ c1: { axis: "z" } }) }), null), true);
});

test("P2-EDITOR-5: Bring it in moves the globals into an empty product and removes them", () => {
  const s = new MemStorage({ "ideeza:code:files": JSON.stringify([oldPy]) });
  const r = bringIn("code", B, s);
  assert.deepEqual(r, { ok: true, moved: ["code.files"] });
  assert.equal(s.getItem("ideeza:code:files"), null);
  assert.deepEqual(JSON.parse(s.getItem("ideeza:code:files:proj_car:prd_b")), [oldPy]);
  assert.equal(bringInOfferOf("code", A, s, null), false, "a second product can't take them");
});

test("Bring it in appends to the build's firmware, renaming a clash", () => {
  const s = new MemStorage({
    "ideeza:code:files": JSON.stringify([botPy]),
    [editorDocKey("code.files", A)]: JSON.stringify([ino]),
  });
  bringIn("code", A, s);
  assert.deepEqual(JSON.parse(s.getItem(editorDocKey("code.files", A))).map((f) => f.name), ["rc_car.ino", "bot.py"]);

  const clash = new MemStorage({
    "ideeza:code:files": JSON.stringify([botPy]),
    [editorDocKey("code.files", A)]: JSON.stringify([ino, { ...botPy, content: "print('build')\n" }]),
  });
  bringIn("code", A, clash);
  const files = JSON.parse(clash.getItem(editorDocKey("code.files", A)));
  assert.deepEqual(files.map((f) => f.name), ["rc_car.ino", "bot.py", "bot (earlier).py"]);
  assert.equal(files[1].content, "print('build')\n", "the product's own file is never replaced");
  assert.equal(files[2].content, "print('mine')\n");
});

test("earlierName counts up and keeps dotfiles whole", () => {
  assert.equal(earlierName("bot.py", new Set(["bot.py"])), "bot (earlier).py");
  assert.equal(earlierName("bot.py", new Set(["bot.py", "bot (earlier).py"])), "bot (earlier 2).py");
  assert.equal(earlierName(".env", new Set([".env"])), ".env (earlier)");
  assert.equal(earlierName("README", new Set(["README"])), "README (earlier)");
});

test("3D appends shapes, carries Preview's mates and canvas, and removes all five globals", () => {
  const cube = { ...DEFAULT_SHAPES[0] };
  const mine = { id: "sphere-1", type: "sphere", position: [2, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], hidden: false, locked: false };
  const seededShape = { ...mine, id: "enclosure", type: "box", name: "Enclosure base" };
  const s = new MemStorage({
    "ideeza:3d:shapes": JSON.stringify([cube, mine]),
    "ideeza:3d:right": JSON.stringify({ viewOption: "Earlier" }),
    "ideeza:3d:sketches": JSON.stringify([{ id: "sk1" }]),
    "ideeza:preview:canvas": JSON.stringify({ zoom: 2 }),
    "ideeza:preview:mates": JSON.stringify({ c1: { axis: "z" } }),
    [editorDocKey("three.shapes", B)]: JSON.stringify([seededShape]),
    [editorDocKey("preview.mates", B)]: JSON.stringify({ c1: { axis: "x" } }),
  });
  const r = bringIn("three", B, s);
  assert.equal(r.ok, true);
  assert.deepEqual(JSON.parse(s.getItem(editorDocKey("three.shapes", B))).map((x) => x.id), ["enclosure", "default-cube", "sphere-1"]);
  assert.deepEqual(JSON.parse(s.getItem(editorDocKey("three.sketches", B))), [{ id: "sk1" }]);
  assert.deepEqual(JSON.parse(s.getItem(editorDocKey("preview.canvas", B))), { zoom: 2 });
  assert.deepEqual(JSON.parse(s.getItem(editorDocKey("preview.mates", B))), { c1: { axis: "x" } }, "the product's own mate wins");
  for (const doc of BRING_IN_DOCS.three) assert.equal(s.getItem(GLOBAL_DOC_KEY[doc]), null);
});

test("a clashing shape id is re-issued", () => {
  const cube = { ...DEFAULT_SHAPES[0], position: [3, 0, 0] };
  const s = new MemStorage({
    "ideeza:3d:shapes": JSON.stringify([cube]),
    [editorDocKey("three.shapes", A)]: JSON.stringify([{ ...DEFAULT_SHAPES[0], position: [9, 9, 9] }]),
  });
  bringIn("three", A, s);
  assert.deepEqual(JSON.parse(s.getItem(editorDocKey("three.shapes", A))).map((x) => x.id), ["default-cube", "default-cube-earlier"]);
});

test("a refused write puts every product key back and keeps the globals", () => {
  const s = new MemStorage(
    {
      "ideeza:code:files": JSON.stringify([oldPy]),
      "ideeza:code:blockly-workspace": '<xml><block type="x"></block></xml>',
      [editorDocKey("code.files", B)]: JSON.stringify([ino]),
    },
    { refuse: (k) => k.startsWith("ideeza:code:blockly-workspace:") },
  );
  const r = bringIn("code", B, s);
  assert.equal(r.ok, false);
  assert.deepEqual(JSON.parse(s.getItem(editorDocKey("code.files", B))), [ino]);
  assert.notEqual(s.getItem("ideeza:code:files"), null);
  assert.notEqual(s.getItem("ideeza:code:blockly-workspace"), null);
});

test("Blockly: an empty product takes the earlier workspace; one with blocks gets them appended", () => {
  const earlier =
    '<xml xmlns="https://developers.google.com/blockly/xml"><variables><variable id="v1">count</variable><variable id="v2">speed</variable></variables><block type="a" id="b1"></block></xml>';
  const own = '<xml xmlns="https://developers.google.com/blockly/xml"><variables><variable id="v1">count</variable></variables><block type="b" id="b9"></block></xml>';
  const merged = appendBlocklyXml(own, earlier);
  assert.equal(
    merged,
    '<xml xmlns="https://developers.google.com/blockly/xml"><variables><variable id="v1">count</variable><variable id="v2">speed</variable></variables><block type="b" id="b9"></block><block type="a" id="b1"></block></xml>',
  );
  const s = new MemStorage({
    "ideeza:code:blockly-workspace": earlier,
    [editorDocKey("code.blockly", B)]: '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
  });
  bringIn("code", B, s);
  assert.equal(s.getItem(editorDocKey("code.blockly", B)), earlier);
});

// ── C2 · Bring it in never loses Blockly work ─────────────────────────────
// Blockly's createVariable throws when a name is already declared with
// another id, so two workspaces that each hold a for-loop ("i", random ids)
// must come out with ONE "i" — the product's — and every earlier block
// pointing at it. Checked on the real Blockly, headless.

const require = createRequire(import.meta.url);
const Blockly = require("blockly");
const XMLNS = 'xmlns="https://developers.google.com/blockly/xml"';

/** A workspace made in Blockly itself: `build(ws)` adds its blocks. */
function blocklyXml(build) {
  const ws = new Blockly.Workspace();
  build(ws);
  const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws));
  ws.dispose();
  return xml;
}
/** Loads `xml` into a fresh headless workspace — throws as the editor would. */
function load(xml) {
  const ws = new Blockly.Workspace();
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ws);
  return ws;
}
const varOf = (block) => block.getField("VAR").getVariable();

test("C2: two workspaces with a for-loop each merge into one that loads, with one shared i", () => {
  const own = blocklyXml((ws) => ws.newBlock("controls_for", "own_for"));
  const earlier = blocklyXml((ws) => ws.newBlock("controls_for", "earlier_for"));
  const ownId = /<variable\b[^>]*\bid="([^"]*)"/.exec(own)[1];
  assert.notEqual(ownId, /<variable\b[^>]*\bid="([^"]*)"/.exec(earlier)[1], "Blockly gave each i its own random id");
  assert.throws(() => load(own.replace("</variables>", /<variables>([\s\S]*)<\/variables>/.exec(earlier)[1] + "</variables>")), /already in use/, "the clash the old merge wrote");

  const merged = appendBlocklyXml(own, earlier);
  const ws = load(merged);
  const loops = ws.getBlocksByType("controls_for", false);
  assert.equal(loops.length, 2, "both loops are there");
  assert.deepEqual(ws.getVariableMap().getAllVariables().map((v) => [v.getName(), v.getId()]), [["i", ownId]]);
  for (const b of loops) assert.equal(varOf(b).getId(), ownId, `${b.id} counts with the product's i`);
  assert.ok(ws.getBlockById("own_for") && ws.getBlockById("earlier_for"));
});

test("C2: a same-name variable with another id is matched by name and type (any case)", () => {
  const own = `<xml ${XMLNS}><variables><variable id="o1">Item</variable></variables><block type="variables_set" id="s1"><field name="VAR" id="o1">Item</field></block></xml>`;
  const earlier = `<xml ${XMLNS}><variables><variable id="e1">item</variable><variable id="e2">speed</variable></variables><block type="variables_set" id="s2"><field name="VAR" id="e1">item</field></block><block type="variables_get" id="g2"><field name="VAR" id="e2">speed</field></block></xml>`;
  const merged = appendBlocklyXml(own, earlier);
  assert.equal(
    merged,
    `<xml ${XMLNS}><variables><variable id="o1">Item</variable><variable id="e2">speed</variable></variables><block type="variables_set" id="s1"><field name="VAR" id="o1">Item</field></block><block type="variables_set" id="s2"><field name="VAR" id="o1">Item</field></block><block type="variables_get" id="g2"><field name="VAR" id="e2">speed</field></block></xml>`,
  );
  const ws = load(merged);
  assert.equal(varOf(ws.getBlockById("s2")).getId(), "o1");
  assert.equal(varOf(ws.getBlockById("g2")).getName(), "speed");

  // Another type is another variable: both are kept.
  const typed = `<xml ${XMLNS}><variables><variable type="Number" id="e1">item</variable></variables><block type="variables_get" id="g3"><field name="VAR" id="e1" variabletype="Number">item</field></block></xml>`;
  const both = load(appendBlocklyXml(own, typed));
  assert.deepEqual(both.getVariableMap().getAllVariables().map((v) => [v.getName(), v.type, v.getId()]).sort(), [["Item", "", "o1"], ["item", "Number", "e1"]]);
});

test("C2: an earlier variable whose id the product already uses for another name gets a new id", () => {
  const own = `<xml ${XMLNS}><variables><variable id="v1">count</variable></variables><block type="variables_get" id="g1"><field name="VAR" id="v1">count</field></block></xml>`;
  const earlier = `<xml ${XMLNS}><variables><variable id="v1">speed</variable></variables><block type="variables_get" id="g2"><field name="VAR" id="v1">speed</field></block></xml>`;
  const ws = load(appendBlocklyXml(own, earlier));
  assert.deepEqual(ws.getVariableMap().getAllVariables().map((v) => v.getName()).sort(), ["count", "speed"]);
  assert.equal(varOf(ws.getBlockById("g1")).getName(), "count");
  assert.equal(varOf(ws.getBlockById("g2")).getName(), "speed");
  assert.notEqual(varOf(ws.getBlockById("g2")).getId(), "v1");
});

test("C2: a function's argument follows its variable to the product's id", () => {
  const own = blocklyXml((ws) => {
    ws.getVariableMap().createVariable("x", "", "own_x");
    ws.newBlock("variables_get", "own_get").getField("VAR").setValue("own_x");
  });
  const earlier = `<xml ${XMLNS}><variables><variable id="e_x">x</variable></variables><block type="procedures_defnoreturn" id="fn"><mutation><arg name="x" varid="e_x"></arg></mutation><field name="NAME">drive</field></block></xml>`;
  const merged = appendBlocklyXml(own, earlier);
  assert.match(merged, /<arg name="x" varid="own_x"><\/arg>/);
  const ws = load(merged);
  assert.deepEqual(ws.getVariableMap().getAllVariables().map((v) => v.getId()), ["own_x"]);
  assert.deepEqual(ws.getBlockById("fn").getVarModels().map((v) => v.getId()), ["own_x"]);
});

test("C2: Bring it in keeps both for-loops, and the product's own workspace", () => {
  const own = blocklyXml((ws) => ws.newBlock("controls_for", "own_for"));
  const earlier = blocklyXml((ws) => ws.newBlock("controls_for", "earlier_for"));
  const s = new MemStorage({ "ideeza:code:blockly-workspace": earlier, [editorDocKey("code.blockly", B)]: own });
  assert.equal(bringIn("code", B, s).ok, true);
  assert.equal(s.getItem("ideeza:code:blockly-workspace"), null, "the global moved");
  const ws = load(s.getItem(editorDocKey("code.blockly", B)));
  assert.deepEqual(ws.getBlocksByType("controls_for", false).map((b) => b.id).sort(), ["earlier_for", "own_for"]);
});
