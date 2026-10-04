// BUILDLOAD (P2-BUILDLOAD-1…5, 7…13; spec §3.4): a built product opens in the
// editor with its own board, 3D and firmware. The transforms, the
// never-overwrite rule, the seed IO on a Map shim, Load and Restore, and the
// maker-facing copy — all on real build shapes (fixtures/build-load.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CAR_GLB,
  MIN,
  T,
  ALL,
  b1,
  b2,
  b2NoRemote,
  battery,
  carBooked,
  carProject,
  clocked,
  lamp,
  legacy,
  plate,
  wide,
} from "./fixtures/build-load.mjs";

const L = "../../.tmp-test/lib/";
const {
  SEED_KEYS,
  SEED_FAILED_MESSAGE,
  decideSeed,
  fingerprintOf,
  importNoticeOf,
  isPristine,
  joinList,
  loadOfferOf,
  normalizeSeed,
  pendingNoticeOf,
  piecesOf,
  replaceLabelOf,
  seedCaptionOf,
  seedPlanOf,
} = await import(L + "manual/build-load.js");
const { dismissImportNotice, ensureSeeded, loadVersion, readSeed, restoreBackup } = await import(
  L + "manual/build-load-io.js"
);
const { editorDocKey, editorKeysOf, legacyDocKey, prevKey, seedRecordKey } = await import(L + "manual/editor-scope.js");
const { buildsOf, productsOfProject } = await import(L + "manual/project-read.js");
const { attach } = await import(L + "manual/projects.js");
const { productsOf } = await import(L + "create/history.js");
const { firmwareFor } = await import(L + "create/build-artifacts.js");
const { IC_SLOTS, netNameOf, schematicFromBuild, symbolKindOf } = await import(L + "pcb/from-build.js");
const { convertSchematicToPcb, planImportChanges, routeRatsnest } = await import(L + "pcb/schematic-to-pcb.js");
const { buildNetlist, computeNets, runErc } = await import(L + "pcb/nets.js");
const { DEFAULT_SCHEM_OBJECTS, DEMO_SCHEM_OBJECTS } = await import(L + "pcb/types.js");
const { deriveAssembly } = await import(L + "three/assembly.js");
const { aiModelFromBuild, sceneFromAssembly } = await import(L + "three/from-build.js");
const { DEFAULT_SHAPES } = await import(L + "three/scene.js");
const { DEFAULT_FILES, firmwareFilesOf, langForFile } = await import(L + "code/files.js");
const { wiringFromBuild } = await import(L + "wiring/from-build.js");

// ── helpers ─────────────────────────────────────────────────────────────────

const primaryOf = (job) => productsOf(job)[0];
const productOf = (job, id) => productsOf(job).find((p) => p.id === id);
const srcOf = (p) => ({ title: p.title, parts: p.parts, spec: p.spec });
const sheetOf = (objects) => objects.filter((o) => (o.scope ?? "schematic") === "schematic");
const boardOf = (objects) => objects.filter((o) => o.scope === "pcb");
const NET_NAME_RE = /^[A-Za-z0-9_.+\-]+$/;

/** localStorage over a Map; `fail(key)` → true makes that setItem throw. */
function shim(init = {}) {
  const map = new Map(Object.entries(init));
  const s = {
    map,
    fail: null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (s.fail?.(k)) throw Object.assign(new Error("QuotaExceededError"), { name: "QuotaExceededError" });
      map.set(k, String(v));
    },
    removeItem: (k) => void map.delete(k),
  };
  return s;
}
const snap = (s) => JSON.stringify([...s.map].sort(([a], [b]) => (a < b ? -1 : 1)));

const scopeA = { projectId: "proj_car", productId: "prd_a" };
const scopeB = { projectId: "proj_car", productId: "prd_b" };

function rowsOf(p, jobs) {
  return productsOfProject(p, buildsOf(p, jobs));
}
const builtOf = (p, jobs, rowId) => rowsOf(p, jobs).find((r) => r.id === rowId);

// FNV-1a over a JSON string — the Convert digests below were taken from the
// converter as it stood before it learned net labels.
function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ── P2-BUILDLOAD-1 · the schematic ─────────────────────────────────────────

test("P2-BUILDLOAD-1: one symbol per on-board unit, with the build's designators", () => {
  const { objects } = schematicFromBuild(srcOf(primaryOf(b1)));
  const symbols = objects.filter((o) => o.props?.source === "build" && o.kind !== "pin");
  assert.deepEqual(new Set(symbols.map((o) => o.text)), new Set(["U1", "J1", "U2", "M1", "M2", "U3", "S1", "C1"]));
  assert.equal(symbols.length, 8);
  assert.ok(!objects.some((o) => /^H\d/.test(o.text ?? "")), "no hardware on the sheet");

  const u1 = symbols.find((o) => o.text === "U1");
  assert.equal(u1.kind, "ic");
  assert.equal(u1.comment, "ESP32");
  assert.deepEqual(u1.props, { source: "build", category: "Microcontroller", value: "ESP32" });
  const c1 = symbols.find((o) => o.text === "C1");
  assert.equal(c1.kind, "capacitor");
  assert.equal(c1.props.qty, 2, "a passive keeps one designator and carries its estimate");
  assert.deepEqual(
    symbols.filter((o) => o.text === "M1" || o.text === "M2").map((o) => o.comment),
    ["TT gear motor", "TT gear motor"],
    "a counted row is one symbol per unit",
  );

  // Ids obj_1…obj_N, all on Sheet 1, so the store's counter re-seeds past them.
  assert.deepEqual(objects.map((o) => o.id), objects.map((_, i) => `obj_${i + 1}`));
  assert.ok(objects.every((o) => o.sheetId === "sheet-1" && o.scope === "schematic"));
});

test("P2-BUILDLOAD-1: computeNets names exactly the build's six nets, on the right parts", () => {
  const { objects } = schematicFromBuild(srcOf(primaryOf(b1)));
  const nets = computeNets(objects);
  assert.deepEqual(
    new Set(nets.nets.filter((n) => n.named).map((n) => n.name)),
    new Set(["VBUS", "+3V3", "GND", "SDA", "SCL", "DIN"]),
  );
  const byId = new Map(objects.map((o) => [o.id, o]));
  const partsOn = (name) =>
    new Set(
      nets
        .membersOf(name)
        .map((id) => byId.get(id))
        .flatMap((o) => (o.kind === "pin" ? [byId.get(o.props.owner).text] : o.props?.source === "build" ? [o.text] : [])),
    );
  assert.deepEqual(partsOn("SDA"), new Set(["U1", "S1"]));
  assert.deepEqual(partsOn("SCL"), new Set(["U1", "S1"]));
  assert.deepEqual(partsOn("DIN"), new Set(["U1", "M1", "M2"]));
  assert.deepEqual(partsOn("VBUS"), new Set(["J1", "U2", "M1", "M2"]));
  assert.deepEqual(partsOn("+3V3"), new Set(["U2", "U1", "S1"]));
  for (const n of nets.nets) assert.match(n.name, NET_NAME_RE);
});

test("P2-BUILDLOAD-1: ERC's only finding is C1's second pin, which the build connects to nothing", () => {
  const { objects } = schematicFromBuild(srcOf(primaryOf(b1)));
  const issues = runErc(objects);
  assert.ok(!issues.some((i) => i.severity === "error" || i.severity === "fatal"));
  assert.deepEqual(
    issues.map((i) => [i.severity, i.rule, i.detail]),
    [["warning", "floatingPin", "C1 pin 2 has no connection"]],
  );
  // The lamp's D1 carries three nets, so it is an IC, and its sheet is clean.
  const lampSheet = schematicFromBuild(srcOf(primaryOf(lamp)));
  assert.equal(lampSheet.objects.find((o) => o.text === "D1").kind, "ic");
  assert.deepEqual(runErc(lampSheet.objects), []);
});

test("P2-BUILDLOAD-1: net names, symbol kinds and IC slots", () => {
  assert.equal(netNameOf("VBUS 5V"), "VBUS");
  assert.equal(netNameOf("3V3"), "+3V3");
  for (const l of ["VBAT", "GND", "SDA", "SCL", "DIN"]) assert.equal(netNameOf(l), l);
  assert.match(netNameOf("weird / name #1"), NET_NAME_RE);

  assert.equal(symbolKindOf("R1", 2), "resistorBox");
  assert.equal(symbolKindOf("C3", 1), "capacitor");
  assert.equal(symbolKindOf("L1", 2), "inductor");
  assert.equal(symbolKindOf("FB1", 2), "inductor");
  assert.equal(symbolKindOf("D1", 2), "diode");
  assert.equal(symbolKindOf("Y1", 1), "crystal");
  assert.equal(symbolKindOf("D1", 3), "ic", "any part with more than two nets is an IC");
  assert.equal(symbolKindOf("U1", 1), "ic");
  assert.equal(symbolKindOf("SW1", 2), "ic");

  // Every slot is a pin of its IC for Convert (≤ 30 px), and no two slots
  // short in ERC (> 13 px apart).
  for (const s of IC_SLOTS) assert.ok(s.dx ** 2 + s.dy ** 2 <= 30 ** 2);
  for (const a of IC_SLOTS)
    for (const b of IC_SLOTS) if (a !== b) assert.ok((a.dx - b.dx) ** 2 + (a.dy - b.dy) ** 2 > 13 ** 2);
});

test("P2-BUILDLOAD-1: layout by the Wiring order, overflow and the A4 frame", () => {
  const car = schematicFromBuild(srcOf(primaryOf(b1)));
  const at = (ref) => car.objects.find((o) => o.text === ref && o.props?.source === "build");
  // Connector & mech · Power Management · Microcontroller · the rest, 200 × 110 from (110, 110).
  assert.deepEqual([at("J1").x, at("J1").y], [110, 110]);
  assert.deepEqual([at("U2").x, at("U2").y, at("U3").x, at("U3").y], [310, 110, 310, 220]);
  assert.deepEqual([at("U1").x, at("U1").y], [510, 110]);
  assert.deepEqual(["M1", "M2", "S1", "C1"].map((r) => [at(r).x, at(r).y]), [[710, 110], [710, 220], [710, 330], [710, 440]]);
  assert.equal(car.report.outsideFrame, 0);

  const w = schematicFromBuild(srcOf(primaryOf(wide)));
  assert.equal(w.objects.find((o) => o.text === "S5").x, 910, "a fifth unit in a group starts the next column");
  assert.equal(w.report.outsideFrame, 1);

  // A pack that feeds 3V3 and VBAT has one supply slot, so VBAT isn't drawn there.
  const bat = schematicFromBuild(srcOf(primaryOf(battery)));
  assert.deepEqual(bat.report.overflow, [
    { ref: "BT1", nets: ["VBAT"] },
    { ref: "BT2", nets: ["VBAT"] },
  ]);
  assert.ok(!runErc(bat.objects).some((i) => i.severity === "error" || i.severity === "fatal"));
});

test("P2-BUILDLOAD-1: a hardware-only product gets an empty sheet, not the demo", () => {
  const plan = seedPlanOf(plate, primaryOf(plate), 1);
  assert.deepEqual(plan.docs.pcb, { objects: [] });
  assert.equal(plan.reports.pcb.units, 0);
  assert.deepEqual(plan.reports.pcb.offBoard, ["H1 Printed plate", "H2–H5 Rubber feet"]);
});

// ── P2-BUILDLOAD-2 · the board is the editor's own Convert ─────────────────

test("P2-BUILDLOAD-2: the seeded board is Convert's output, verbatim", () => {
  const plan = seedPlanOf(b1, primaryOf(b1), 1);
  const objects = plan.docs.pcb.objects;
  const sheet = sheetOf(objects);
  const board = boardOf(objects);
  assert.deepEqual(board, convertSchematicToPcb(sheet).objects);
  assert.ok(board.every((o) => o.props?.gen === "convert" && /^pcb-(fp|rats)-/.test(o.id)));

  const fps = board.filter((o) => o.kind !== "ratsnest");
  assert.equal(fps.length, 8);
  assert.equal(fps.filter((o) => o.kind === "fpSOIC8").length, 7);
  assert.equal(fps.filter((o) => o.kind === "fp0805").length, 1);

  const rats = board.filter((o) => o.kind === "ratsnest");
  assert.equal(rats.length, 4);
  assert.deepEqual(rats.map((r) => r.net).sort(), ["DIN", "DIN", "SCL", "SDA"]);
  assert.deepEqual(convertSchematicToPcb(objects).plan.powerNets, ["+3V3", "GND", "VBUS"]);
  assert.equal(plan.reports.pcb.airwires, 4);

  // Generate PCB / Import Changes on the seeded doc reproduce it.
  assert.deepEqual(convertSchematicToPcb(objects).objects, board);
  const ic = planImportChanges(objects);
  assert.equal(ic.kept, 8);
  assert.deepEqual(ic.added, []);
  assert.deepEqual(ic.removedDesignators, []);
  // And Auto-Route routes the four airwires.
  assert.equal(routeRatsnest(objects, 8).routed, 4);
});

// ── P2-BUILDLOAD-3 · 3D ────────────────────────────────────────────────────

test("P2-BUILDLOAD-3: one shape per assembly part, only the enclosure showing", () => {
  const p = primaryOf(b1);
  const shapes = sceneFromAssembly(deriveAssembly({ title: p.title, parts: p.parts, spec: p.spec }));
  assert.equal(shapes.length, 16);
  const shown = shapes.filter((s) => !s.hidden);
  assert.deepEqual(shown.map((s) => s.name), ["Enclosure base", "Enclosure lid"]);
  assert.ok(shapes.some((s) => s.name === "U1 · ESP32"));
  assert.ok(shapes.some((s) => s.name === "Main board" && s.hidden));
  assert.equal(new Set(shapes.map((s) => s.id)).size, 16);
  assert.ok(shapes.every((s) => s.id.startsWith("bld-")));

  // 1 unit = 10 mm; the box is 2 units, so scale = [l, h, w] / 20; a can is a cylinder.
  const a = deriveAssembly({ title: p.title, parts: p.parts, spec: p.spec });
  const u1 = a.parts.find((x) => x.ref === "U1");
  const s1 = shapes.find((s) => s.name === "U1 · ESP32");
  assert.deepEqual(s1.position, u1.at.map((v) => Math.round((v / 10) * 1000) / 1000));
  assert.deepEqual(s1.scale, [u1.body.l / 20, u1.body.h / 20, u1.body.w / 20].map((v) => Math.round(v * 1000) / 1000));
  assert.equal(shapes.find((s) => s.name === "U2 · 3V3 LDO").type, "cylinder");
  assert.equal(s1.type, "box");
});

test("P2-BUILDLOAD-3: the AI model is the primary's alone", () => {
  assert.deepEqual(aiModelFromBuild(b1, "primary"), {
    prompt: "RC Car prompt",
    imageUrl: "https://img.test/b1.png",
    glbUrl: CAR_GLB,
    provider: "meshy",
  });
  assert.equal(aiModelFromBuild(b1, "remote"), null);
  assert.equal(aiModelFromBuild(carBooked, "primary").provider, "demo", "the sample model is demo mode");
  assert.equal(aiModelFromBuild(lamp, "primary"), null, "no GLB, no model");
  assert.equal(seedPlanOf(b1, productOf(b1, "remote"), 1).docs["three.ai"], undefined);
});

// ── P2-BUILDLOAD-4 · firmware ──────────────────────────────────────────────

test("P2-BUILDLOAD-4: the build's sketch is Code Development's one file", () => {
  const files = firmwareFilesOf(srcOf(primaryOf(b1)));
  assert.equal(files.length, 1);
  assert.equal(files[0].name, "rc_car.ino");
  assert.equal(files[0].language, "cpp");
  assert.equal(files[0].content, firmwareFor(srcOf(primaryOf(b1))).lines.join("\n") + "\n");
  assert.equal(files[0].content.split("\n").filter((l) => l.startsWith("#define")).length, 3);
  assert.equal(firmwareFilesOf(srcOf(productOf(b1, "remote"))), null, "no MCU, no file");
  assert.equal(langForFile("sketch.ino"), "cpp");
  assert.equal(langForFile("bot.py"), "python");
  assert.equal(langForFile("notes"), "plaintext");
});

test("C7: no firmwareFor output claims its pins match the PCB layout", () => {
  for (const job of Object.values(ALL)) {
    for (const p of productsOf(job)) {
      const text = firmwareFor(srcOf(p)).lines.join("\n");
      assert.ok(!text.includes("match the PCB layout"), `${job.id}/${p.id}`);
      assert.ok(text.includes("// pin numbers are placeholders: match them to your board"));
    }
  }
});

// ── P2-BUILDLOAD-5 · wiring ────────────────────────────────────────────────

test("P2-BUILDLOAD-5: Wiring places the parts it has a part for, and no wires", () => {
  const car = wiringFromBuild(srcOf(primaryOf(b1)));
  assert.deepEqual(car.report.placed, ["J1", "M1", "M2", "S1"]);
  assert.deepEqual(car.report.noPart, []);
  assert.deepEqual(car.wires, []);
  assert.deepEqual(
    car.parts.map((p) => [p.id, p.kind, p.name, p.x, p.y]),
    [
      ["wp_1", "connector", "J1", 320, 240],
      ["wp_2", "motor", "M1", 540, 240],
      ["wp_3", "motor", "M2", 760, 240],
      ["wp_4", "sensor", "S1", 320, 410],
    ],
  );
  const remote = wiringFromBuild(srcOf(productOf(b1, "remote")));
  assert.deepEqual(remote.report, { placed: ["SW1"], noPart: ["BT1–BT2 AA holder"] });
  assert.equal(remote.parts[0].kind, "button");
  assert.equal(wiringFromBuild(srcOf(primaryOf(lamp))).parts.find((p) => p.name === "D1").kind, "led");
  assert.deepEqual(wiringFromBuild(srcOf(primaryOf(plate))).parts, []);
});

// ── determinism ────────────────────────────────────────────────────────────

test("every transform is deterministic", () => {
  for (const job of Object.values(ALL)) {
    for (const p of productsOf(job)) {
      const src = srcOf(p);
      assert.deepEqual(schematicFromBuild(src), schematicFromBuild(src));
      const sheet = schematicFromBuild(src).objects;
      assert.deepEqual(convertSchematicToPcb(sheet), convertSchematicToPcb(sheet));
      const a = () => deriveAssembly({ title: p.title, parts: p.parts, spec: p.spec });
      assert.deepEqual(sceneFromAssembly(a()), sceneFromAssembly(a()));
      assert.deepEqual(aiModelFromBuild(job, p.id), aiModelFromBuild(job, p.id));
      assert.deepEqual(firmwareFilesOf(src), firmwareFilesOf(src));
      assert.deepEqual(wiringFromBuild(src), wiringFromBuild(src));
      assert.deepEqual(seedPlanOf(job, p, 1), seedPlanOf(job, p, 1));
    }
  }
});

// ── the plan and the pieces ────────────────────────────────────────────────

test("seedPlanOf: each document behind its gate; pieces for the caption", () => {
  const a = seedPlanOf(b1, primaryOf(b1), 1);
  assert.deepEqual(Object.keys(a.docs), ["pcb", "three.shapes", "three.ai", "code.files", "wiring"]);
  assert.deepEqual(a.from, { buildId: "b1", productId: "primary", version: 1 });
  assert.deepEqual(a.pieces, ["board", "3D model", "firmware", "wiring parts"]);

  const b = seedPlanOf(b1, productOf(b1, "remote"), 1);
  assert.deepEqual(Object.keys(b.docs), ["pcb", "three.shapes", "wiring"]);
  assert.deepEqual(b.reports.code, { noMcu: true });
  assert.deepEqual(piecesOf(productOf(b1, "remote")), ["board", "3D model", "wiring parts"]);

  const old = seedPlanOf(legacy, primaryOf(legacy), 1);
  assert.equal(old.docs["code.files"], undefined, "a skipped code item seeds no firmware");
  assert.equal(old.reports.code, undefined, "…and says nothing about it");
  assert.deepEqual(old.pieces, ["board", "3D model", "wiring parts"]);

  assert.deepEqual(seedPlanOf(plate, primaryOf(plate), 1).pieces, ["board", "3D model"]);
  assert.deepEqual(seedPlanOf(plate, primaryOf(plate), 1).reports.wiring, { placed: [], noPart: [] });
});

// ── P2-BUILDLOAD-8 · never over the maker's work ───────────────────────────

const DEMO = JSON.stringify({ objects: DEMO_SCHEM_OBJECTS, gridSize: "0.1" });
const MINE = JSON.stringify({ objects: [...DEMO_SCHEM_OBJECTS, { id: "obj_9", kind: "text", x: 10, y: 10, text: "MINE" }] });

test("decideSeed: the five rows", () => {
  assert.deepEqual(decideSeed("pcb", MINE, null), { action: "keep", dropLegacy: false, why: "work" });
  assert.deepEqual(decideSeed("pcb", DEMO, MINE), { action: "seed", dropLegacy: false, why: "pristine" });
  assert.deepEqual(decideSeed("pcb", null, MINE), { action: "keep", dropLegacy: false, why: "legacy-work" });
  assert.deepEqual(decideSeed("pcb", null, DEMO), { action: "seed", dropLegacy: true, why: "legacy-pristine" });
  assert.deepEqual(decideSeed("pcb", null, null), { action: "seed", dropLegacy: false, why: "absent" });
  // three.ai is never pristine: a stored model is the maker's own.
  const model = JSON.stringify({ prompt: "x", imageUrl: null, glbUrl: "/m.glb", provider: "meshy" });
  assert.equal(decideSeed("three.ai", model, null).action, "keep");
  assert.equal(decideSeed("three.ai", null, model).action, "keep");
});

test("isPristine: the demo, the default cube, the sample files, an empty wiring doc", () => {
  assert.equal(isPristine("pcb", JSON.stringify({ objects: DEMO_SCHEM_OBJECTS })), true);
  assert.equal(isPristine("pcb", DEMO), true, "settings don't make the objects the maker's");
  // Field order doesn't matter, only the values.
  const reordered = DEMO_SCHEM_OBJECTS.map((o) => Object.fromEntries(Object.entries(o).reverse()));
  assert.equal(isPristine("pcb", JSON.stringify({ objects: reordered })), true);
  const moved = DEMO_SCHEM_OBJECTS.map((o, i) => (i === 1 ? { ...o, x: o.x + 10 } : o));
  assert.equal(isPristine("pcb", JSON.stringify({ objects: moved })), false, "a moved demo object is work");
  assert.equal(isPristine("pcb", MINE), false);
  assert.equal(isPristine("pcb", JSON.stringify({ objects: [] })), false, "an emptied sheet is the maker's");

  assert.equal(isPristine("three.shapes", JSON.stringify(DEFAULT_SHAPES)), true);
  assert.equal(isPristine("three.shapes", "[]"), true, "an empty list opens on the cube");
  const nudged = [{ ...DEFAULT_SHAPES[0], position: [1, 0, 0] }];
  assert.equal(isPristine("three.shapes", JSON.stringify(nudged)), false);

  assert.equal(isPristine("code.files", JSON.stringify(DEFAULT_FILES)), true);
  const edited = [{ ...DEFAULT_FILES[0], content: "print(1)\n" }, ...DEFAULT_FILES.slice(1)];
  assert.equal(isPristine("code.files", JSON.stringify(edited)), false);

  assert.equal(isPristine("wiring", JSON.stringify({ parts: [], wires: [] })), true);
  assert.equal(isPristine("wiring", JSON.stringify({ parts: [{ id: "wp_1", kind: "led", name: "LED1", x: 1, y: 1 }], wires: [] })), false);

  assert.equal(isPristine("three.ai", JSON.stringify({ prompt: "", imageUrl: null, glbUrl: null, provider: null })), false);
  for (const k of SEED_KEYS) assert.equal(isPristine(k, null), false, "absent is its own case");
});

test("fingerprintOf reads the work, not the settings", () => {
  const a = JSON.stringify({ objects: DEMO_SCHEM_OBJECTS, gridSize: "0.1" });
  const b = JSON.stringify({ gridSize: "0.5", objects: DEMO_SCHEM_OBJECTS });
  assert.equal(fingerprintOf("pcb", a), fingerprintOf("pcb", b));
  assert.notEqual(fingerprintOf("pcb", a), fingerprintOf("pcb", MINE));
  assert.match(fingerprintOf("wiring", JSON.stringify({ parts: [], wires: [] })), /^[0-9a-f]{8}$/);
  assert.equal(fingerprintOf("pcb", null), null);
});

// ── P2-BUILDLOAD-7 · seeding on first open (Map shim) ──────────────────────

test("ensureSeeded: the primary's documents, then the record; the second call writes nothing", () => {
  const store = shim();
  const A = builtOf(carProject, [b1], "prd_a");
  const r = ensureSeeded(scopeA, A.built, T, store, "prd_a");
  assert.equal(r.status, "seeded");
  assert.deepEqual(r.written, ["pcb", "three.shapes", "three.ai", "code.files", "wiring"]);
  const keys = [...store.map.keys()].sort();
  assert.deepEqual(
    keys,
    [...SEED_KEYS.map((k) => editorDocKey(k, scopeA)), seedRecordKey(scopeA)].sort(),
    "the four editors' five documents and the record",
  );
  const rec = readSeed(scopeA, store);
  assert.deepEqual(rec.from, { buildId: "b1", productId: "primary", version: 1 });
  assert.deepEqual(rec.kept, []);
  assert.deepEqual(Object.keys(rec.seeded), r.written);
  for (const k of r.written) assert.equal(rec.seeded[k], fingerprintOf(k, store.getItem(editorDocKey(k, scopeA))));
  assert.equal(JSON.parse(store.getItem(editorDocKey("pcb", scopeA))).objects.find((o) => o.text === "U1").kind, "ic");

  const before = snap(store);
  const again = ensureSeeded(scopeA, A.built, T + MIN, store, "prd_a");
  assert.equal(again.status, "exists");
  assert.equal(snap(store), before);
});

test("ensureSeeded: opening prd_b first decides all its documents; no firmware for a product with no MCU", () => {
  const store = shim();
  const B = builtOf(carProject, [b1], "prd_b");
  ensureSeeded(scopeB, B.built, T, store, "prd_a");
  for (const k of ["pcb", "three.shapes", "wiring"]) assert.ok(store.getItem(editorDocKey(k, scopeB)), k);
  assert.equal(store.getItem(editorDocKey("code.files", scopeB)), null);
  assert.equal(store.getItem(editorDocKey("three.ai", scopeB)), null);
  const raw = store.getItem(seedRecordKey(scopeB));
  assert.ok(raw);
  ensureSeeded(scopeB, B.built, T + 5 * MIN, store, "prd_a");
  assert.equal(store.getItem(seedRecordKey(scopeB)), raw, "reopen: the record is unchanged");
});

test("ensureSeeded: a refused write leaves no document and no record", () => {
  const A = builtOf(carProject, [b1], "prd_a");
  for (const failing of [editorDocKey("code.files", scopeA), seedRecordKey(scopeA)]) {
    const store = shim({ [editorDocKey("pcb", scopeA)]: DEMO });
    const before = snap(store);
    store.fail = (k) => k === failing;
    const r = ensureSeeded(scopeA, A.built, T, store, "prd_a");
    assert.equal(r.status, "failed");
    assert.equal(r.message, SEED_FAILED_MESSAGE);
    assert.equal(snap(store), before, `refused at ${failing}: everything as it was`);
    // The next open tries again.
    store.fail = null;
    assert.equal(ensureSeeded(scopeA, A.built, T, store, "prd_a").status, "seeded");
  }
});

test("ensureSeeded: the maker's PCB is kept; a demo-only PCB is seeded", () => {
  const A = builtOf(carProject, [b1], "prd_a");
  const kept = shim({ [editorDocKey("pcb", scopeA)]: MINE });
  const r = ensureSeeded(scopeA, A.built, T, kept, "prd_a");
  assert.equal(kept.getItem(editorDocKey("pcb", scopeA)), MINE, "MINE is still there");
  assert.deepEqual(r.record.kept, ["pcb"]);
  assert.equal(r.record.seeded.pcb, undefined);

  const demo = shim({ [editorDocKey("pcb", scopeA)]: DEMO });
  ensureSeeded(scopeA, A.built, T, demo, "prd_a");
  const doc = JSON.parse(demo.getItem(editorDocKey("pcb", scopeA)));
  assert.ok(doc.objects.some((o) => o.text === "U1"), "U1 shows");
  assert.equal(doc.gridSize, "0.1", "the replaced doc's settings stay");
});

test("ensureSeeded: legacy per-project docs — first row only, pristine taken, work adopted", () => {
  const A = builtOf(carProject, [b1], "prd_a");
  const legacyPcb = legacyDocKey("pcb", "proj_car");
  const legacyWiring = legacyDocKey("wiring", "proj_car");
  const work = JSON.stringify({ parts: [{ id: "wp_1", kind: "led", name: "LED1", x: 5, y: 5 }], wires: [] });
  const store = shim({ [legacyPcb]: DEMO, [legacyWiring]: work });
  const r = ensureSeeded(scopeA, A.built, T, store, "prd_a");
  assert.equal(store.getItem(legacyPcb), null, "a pristine legacy doc gives its key to the seed");
  assert.ok(store.getItem(editorDocKey("pcb", scopeA)));
  assert.equal(store.getItem(legacyWiring), work, "the maker's legacy work stays for EDITOR to adopt");
  assert.equal(store.getItem(editorDocKey("wiring", scopeA)), null);
  assert.deepEqual(r.record.kept, ["wiring"]);

  // Off the first row the legacy docs are not this product's.
  const other = shim({ [legacyPcb]: MINE });
  const B = builtOf(carProject, [b1], "prd_b");
  ensureSeeded(scopeB, B.built, T, other, "prd_a");
  assert.equal(other.getItem(legacyPcb), MINE);
  assert.ok(other.getItem(editorDocKey("pcb", scopeB)));
});

test("ensureSeeded: nothing for a row that isn't built; a corrupt record is never rewritten", () => {
  const store = shim();
  assert.equal(ensureSeeded(scopeA, null, T, store, "prd_a").status, "skipped");
  assert.equal(store.map.size, 0);

  const corrupt = JSON.stringify({ v: 2, from: { buildId: "b1" } });
  const s2 = shim({ [seedRecordKey(scopeA)]: corrupt, [editorDocKey("pcb", scopeA)]: MINE });
  const A = builtOf(carProject, [b1], "prd_a");
  const r = ensureSeeded(scopeA, A.built, T, s2, "prd_a");
  assert.equal(r.status, "seeded");
  assert.equal(r.stored, false);
  assert.equal(s2.getItem(seedRecordKey(scopeA)), corrupt, "not rewritten");
  assert.equal(s2.getItem(editorDocKey("pcb", scopeA)), MINE, "the per-key rule still keeps the work");
  assert.equal(normalizeSeed(corrupt), null);
  assert.equal(normalizeSeed("{not json"), null);
  assert.equal(normalizeSeed({ v: 1 }), null, "no from");
});

test("every key the seed, Load and Restore write is swept with the project", () => {
  const store = shim();
  ensureSeeded(scopeA, builtOf(carProject, [b1], "prd_a").built, T, store, "prd_a");
  ensureSeeded(scopeB, builtOf(carProject, [b1], "prd_b").built, T, store, "prd_a");
  const p2 = attach(carProject, b2, [b1], T + 61 * MIN);
  const A2 = builtOf(p2, [b1, b2], "prd_a");
  loadVersion(scopeA, seedPlanOf(A2.built.ref.job, A2.built.product, 2), SEED_KEYS, T + 62 * MIN, store);
  const swept = new Set(editorKeysOf("proj_car", ["prd_a", "prd_b"]));
  for (const k of store.map.keys()) assert.ok(swept.has(k), k);
});

// ── P2-BUILDLOAD-9, 10 · Load version m, Restore ───────────────────────────

function seededCar() {
  const store = shim();
  ensureSeeded(scopeA, builtOf(carProject, [b1], "prd_a").built, T, store, "prd_a");
  ensureSeeded(scopeB, builtOf(carProject, [b1], "prd_b").built, T, store, "prd_a");
  // The maker moves a wiring part.
  const wKey = editorDocKey("wiring", scopeA);
  const w = JSON.parse(store.getItem(wKey));
  w.parts[0].x += 40;
  store.setItem(wKey, JSON.stringify(w));
  const p2 = attach(carProject, b2, [b1], T + 61 * MIN);
  const A2 = builtOf(p2, [b1, b2], "prd_a");
  const plan2 = seedPlanOf(A2.built.ref.job, A2.built.product, A2.built.ref.version);
  const current = () => Object.fromEntries(SEED_KEYS.map((k) => [k, store.getItem(editorDocKey(k, scopeA))]));
  return { store, p2, A2, plan2, current };
}

test("P2-BUILDLOAD-9: the Load dialog for version 2", () => {
  const { store, A2, plan2, current } = seededCar();
  assert.equal(A2.built.ref.version, 2);
  const rec = readSeed(scopeA, store);
  const cap = seedCaptionOf("built", rec, 2, plan2.pieces);
  assert.deepEqual(cap.lines, ["Loaded from version 1. Version 2 is ready to load."]);
  assert.deepEqual(cap.load, { version: 2, label: "Load version 2…" });

  const offer = loadOfferOf(plan2, rec, current());
  assert.equal(offer.title, "Load version 2 into the editor");
  assert.equal(
    offer.intro,
    "Pick what to replace with version 2's. What you replace is kept, so you can restore it from this block.",
  );
  assert.deepEqual(
    offer.rows.map((r) => [r.label, r.checked, r.hint]),
    [
      ["PCB — schematic and board", true, null],
      ["3D — enclosure and AI model", true, null],
      ["Code — rc_car.ino", true, null],
      ["Wiring — 5 parts", false, "Changed since version 1"],
    ],
  );
  assert.deepEqual(offer.rows[1].keys, ["three.shapes", "three.ai"]);
  assert.equal(replaceLabelOf(offer.rows.filter((r) => r.checked).length), "Replace 3 documents");
  assert.equal(replaceLabelOf(1), "Replace 1 document");
  assert.equal(replaceLabelOf(0), null, "none ticked: unavailable");
});

test("P2-BUILDLOAD-9/10: Load keeps a backup; Restore swaps it back, and again", () => {
  const { store, plan2, current } = seededCar();
  const v1 = current();
  const v1Objects = JSON.parse(v1.pcb).objects;
  const rec1 = readSeed(scopeA, store);
  const offer = loadOfferOf(plan2, rec1, v1);
  const keys = offer.rows.filter((r) => r.checked).flatMap((r) => r.keys);

  // Dismissed notices show again for what is replaced.
  assert.equal(dismissImportNotice(scopeA, "pcb", store), true);
  assert.equal(dismissImportNotice(scopeA, "wiring", store), true);

  const res = loadVersion(scopeA, plan2, keys, T + 62 * MIN, store);
  assert.equal(res.ok, true);
  assert.equal(res.message, "Version 2 loaded into the editor.");
  const pcbPrev = store.getItem(prevKey(editorDocKey("pcb", scopeA)));
  assert.equal(pcbPrev, v1.pcb);
  assert.deepEqual(JSON.parse(pcbPrev).objects, v1Objects, "the :prev slot holds version 1's objects");
  assert.ok(JSON.parse(store.getItem(editorDocKey("pcb", scopeA))).objects.some((o) => o.text === "D1"));
  assert.equal(store.getItem(editorDocKey("wiring", scopeA)), v1.wiring, "an unticked document is left alone");
  assert.equal(store.getItem(prevKey(editorDocKey("wiring", scopeA))), null);
  assert.deepEqual(res.record.from, { buildId: "b2", productId: "primary", version: 2 });
  assert.deepEqual(res.record.dismissed, ["wiring"]);
  assert.deepEqual(res.record.backup.keys, keys);
  assert.equal(res.record.backup.version, 1);

  // Wiring was left at version 1, so it keeps its way to version 2 (R3-35).
  const cap = seedCaptionOf("built", res.record, 2, plan2.pieces);
  assert.deepEqual(cap.lines, ["Loaded from version 2. Wiring is still version 1's.", "Version 1's documents are kept."]);
  assert.deepEqual(cap.load, { version: 2, label: "Load version 2…" });
  assert.deepEqual(cap.restore, { version: 1, label: "Restore version 1" });

  const v2 = current();
  const back = restoreBackup(scopeA, T + 63 * MIN, store);
  assert.equal(back.ok, true);
  assert.equal(back.message, "Version 1 restored.");
  for (const k of SEED_KEYS) assert.equal(store.getItem(editorDocKey(k, scopeA)), v1[k], `${k} is version 1's again`);
  assert.deepEqual(back.record.from, rec1.from);
  for (const k of keys) assert.equal(back.record.seeded[k], rec1.seeded[k]);
  const cap2 = seedCaptionOf("built", back.record, 2, plan2.pieces);
  assert.deepEqual(cap2.lines, ["Loaded from version 1. Version 2 is ready to load.", "Version 2's documents are kept."]);
  assert.deepEqual(cap2.load, { version: 2, label: "Load version 2…" });
  assert.deepEqual(cap2.restore, { version: 2, label: "Restore version 2" });

  // Pressing again swaps back: the round trip returns the raw strings exactly.
  const again = restoreBackup(scopeA, T + 64 * MIN, store);
  assert.equal(again.message, "Version 2 restored.");
  for (const k of SEED_KEYS) assert.equal(store.getItem(editorDocKey(k, scopeA)), v2[k]);
  const thrice = restoreBackup(scopeA, T + 65 * MIN, store);
  assert.equal(thrice.ok, true);
  for (const k of SEED_KEYS) assert.equal(store.getItem(editorDocKey(k, scopeA)), v1[k]);
});

test("P2-BUILDLOAD-9: a refused backup is undone, then Replace without keeping", () => {
  const { store, plan2 } = seededCar();
  const before = snap(store);
  store.fail = (k) => k.endsWith(":prev");
  const res = loadVersion(scopeA, plan2, ["pcb", "code.files"], T + 62 * MIN, store);
  assert.deepEqual(res, { ok: false, reason: "backup" });
  assert.equal(snap(store), before);
  const res2 = loadVersion(scopeA, plan2, ["pcb", "code.files"], T + 62 * MIN, store, { keep: false });
  assert.equal(res2.ok, true);
  assert.equal(res2.record.backup, null);
  assert.ok(![...store.map.keys()].some((k) => k.endsWith(":prev")));
  const cap = seedCaptionOf("built", res2.record, 2, plan2.pieces);
  assert.equal(cap.restore, null);
});

test("P2-BUILDLOAD-9: a refused document write puts every key back", () => {
  const { store, plan2 } = seededCar();
  const before = snap(store);
  store.fail = (k) => k === editorDocKey("code.files", scopeA);
  assert.deepEqual(loadVersion(scopeA, plan2, SEED_KEYS, T + 62 * MIN, store), { ok: false, reason: "write" });
  assert.equal(snap(store), before);
  store.fail = (k) => k === seedRecordKey(scopeA);
  assert.deepEqual(loadVersion(scopeA, plan2, SEED_KEYS, T + 62 * MIN, store), { ok: false, reason: "write" });
  assert.equal(snap(store), before);
  store.fail = null;
  assert.deepEqual(loadVersion(scopeA, plan2, [], T, store), { ok: false, reason: "none" });
});

test("P2-BUILDLOAD-9/10: loading over kept work backs it up as your earlier work", () => {
  const store = shim({ [editorDocKey("pcb", scopeA)]: MINE });
  const A = builtOf(carProject, [b1], "prd_a");
  const r = ensureSeeded(scopeA, A.built, T, store, "prd_a");
  const plan1 = seedPlanOf(b1, A.built.product, 1);
  const cap = seedCaptionOf("built", r.record, 1, plan1.pieces);
  assert.deepEqual(cap.lines, ["Loaded from version 1. Your earlier PCB work was kept."]);
  assert.deepEqual(cap.load, { version: 1, label: "Load version 1…" });
  const offer = loadOfferOf(plan1, r.record, { pcb: MINE });
  assert.deepEqual(offer.rows[0].hint, "Holds your earlier work");
  assert.equal(offer.rows[0].checked, false);

  const res = loadVersion(scopeA, plan1, ["pcb"], T + MIN, store);
  assert.equal(res.record.backup.version, null);
  assert.deepEqual(res.record.kept, []);
  const after = seedCaptionOf("built", res.record, 1, plan1.pieces);
  assert.deepEqual(after.lines, ["Loaded from version 1.", "Your earlier documents are kept."]);
  assert.deepEqual(after.restore, { version: null, label: "Restore earlier work" });

  const back = restoreBackup(scopeA, T + 2 * MIN, store);
  assert.equal(back.message, "Earlier work restored.");
  assert.equal(store.getItem(editorDocKey("pcb", scopeA)), MINE);
  assert.deepEqual(back.record.kept, ["pcb"]);
  assert.equal(back.record.seeded.pcb, undefined);
  assert.deepEqual(back.record.backup.version, 1);
  assert.equal(restoreBackup({ projectId: "proj_car", productId: "nope" }, T, store).ok, false);
});

// ── P2-BUILDLOAD-11, 13 · the caption, by row state ────────────────────────

test("P2-BUILDLOAD-13: before any open", () => {
  const rows = rowsOf(carProject, [b1]);
  const [a, b] = rows;
  assert.deepEqual(seedCaptionOf(a.state, null, a.built.ref.version, piecesOf(a.built.product)).lines, [
    "Opens with version 1's board, 3D model, firmware and wiring parts.",
  ]);
  assert.deepEqual(seedCaptionOf(b.state, null, b.built.ref.version, piecesOf(b.built.product)).lines, [
    "Opens with version 1's board, 3D model and wiring parts.",
  ]);
  assert.deepEqual(seedCaptionOf("built", null, 3, []).lines, [
    "Version 3 has no finished pieces to load, so the editor starts from its samples.",
  ]);
  for (const s of ["hand", "build-gone", "unmatched"]) assert.equal(seedCaptionOf(s, null, null, []), null);
});

test("P2-BUILDLOAD-13: after opening, all kept, and a dropped product", () => {
  const store = shim();
  const A = builtOf(carProject, [b1], "prd_a");
  const r = ensureSeeded(scopeA, A.built, T, store, "prd_a");
  const cap = seedCaptionOf("built", r.record, 1, piecesOf(A.built.product));
  assert.deepEqual(cap, { lines: ["Loaded from version 1."], load: null, restore: null });

  // A hand row that adopts a build, with the maker's own docs everywhere.
  const all = shim({
    [editorDocKey("pcb", scopeA)]: MINE,
    [editorDocKey("three.shapes", scopeA)]: JSON.stringify([{ ...DEFAULT_SHAPES[0], position: [2, 0, 0] }]),
    [editorDocKey("three.ai", scopeA)]: JSON.stringify({ prompt: "mine", imageUrl: null, glbUrl: "/mine.glb", provider: "meshy" }),
    [editorDocKey("code.files", scopeA)]: JSON.stringify([{ name: "main.py", language: "python", content: "x\n" }]),
    [editorDocKey("wiring", scopeA)]: JSON.stringify({ parts: [{ id: "wp_1", kind: "led", name: "LED1", x: 1, y: 1 }], wires: [] }),
  });
  const k = ensureSeeded(scopeA, A.built, T, all, "prd_a");
  assert.deepEqual(k.written, []);
  const kc = seedCaptionOf("built", k.record, 1, piecesOf(A.built.product));
  assert.deepEqual(kc.lines, ["Your earlier editor work was kept, so version 1 isn't loaded."]);
  assert.deepEqual(kc.load, { version: 1, label: "Load version 1…" });
  for (const e of ["pcb", "three", "code", "wiring"]) assert.equal(pendingNoticeOf(k.record, e), null, `kept ${e}: no notice`);

  // P2-BUILDLOAD-11: attach b2 without the remote, so prd_b is dropped.
  const s3 = shim();
  ensureSeeded(scopeB, builtOf(carProject, [b1], "prd_b").built, T, s3, "prd_a");
  const p2 = attach(carProject, b2NoRemote, [b1], T + 61 * MIN);
  const B2 = builtOf(p2, [b1, b2NoRemote], "prd_b");
  assert.deepEqual(B2.dropped, { lastIn: 1, current: 2 });
  const dc = seedCaptionOf(B2.state, readSeed(scopeB, s3), B2.built.ref.version, piecesOf(B2.built.product));
  assert.deepEqual(dc, { lines: ["Loaded from version 1."], load: null, restore: null });
});

// ── P2-BUILDLOAD-12 · the import notices ───────────────────────────────────

test("P2-BUILDLOAD-12: the PCB notice, line by line", () => {
  const car = importNoticeOf("pcb", seedPlanOf(b1, primaryOf(b1), 1).reports.pcb, 1);
  assert.equal(car.title, "Board loaded from version 1");
  const text = car.lines.join("\n");
  assert.ok(text.includes("8 parts and 6 nets"));
  assert.ok(text.includes("SOIC-8"));
  assert.ok(text.includes("H1–H4 M3 screws aren't on the board"));
  assert.ok(text.includes("Quantities for C1 are the build's estimates."));
  assert.ok(!text.includes("outline"), "no booked spec, no outline line");
  assert.ok(!text.includes("outside the sheet"));
  assert.ok(!text.includes("no free pin"));
  assert.ok(!text.includes("schematic only"));

  const booked = importNoticeOf("pcb", seedPlanOf(carBooked, primaryOf(carBooked), 1).reports.pcb, 1).lines;
  assert.ok(booked.includes("The board outline is the editor's default, not the spec's 50 × 40 mm."));

  const bat = importNoticeOf("pcb", seedPlanOf(battery, primaryOf(battery), 1).reports.pcb, 1).lines;
  assert.ok(bat.includes("BT1: VBAT has no free pin, so it isn't drawn."));

  const w = importNoticeOf("pcb", seedPlanOf(wide, primaryOf(wide), 1).reports.pcb, 1).lines;
  assert.ok(w.includes("1 part sits outside the sheet's frame."));

  const clk = importNoticeOf("pcb", seedPlanOf(clocked, primaryOf(clocked), 1).reports.pcb, 1).lines;
  assert.ok(clk.includes("Y1 16MHz crystal has no footprint in the library yet, so it's on the schematic only."));
  assert.ok(clk[0].startsWith("3 parts and 1 net from the build"));

  const none = importNoticeOf("pcb", seedPlanOf(plate, primaryOf(plate), 2).reports.pcb, 2);
  assert.deepEqual(none, {
    title: "No board in version 2",
    lines: ["Its parts are all hardware, so there's nothing to place: H1 Printed plate and H2–H5 Rubber feet."],
  });
});

test("P2-BUILDLOAD-12: the 3D, Code and Wiring notices", () => {
  const three = importNoticeOf("three", seedPlanOf(b1, primaryOf(b1), 1).reports.three, 1);
  assert.equal(three.title, "Enclosure loaded from version 1");
  assert.deepEqual(three.lines, [
    "A 310 × 52 × 25 mm enclosure in PETG. The board and its 13 parts are inside it, hidden — show them from the shape list.",
    "The build's AI model is in Generate with AI — the scene can't hold a mesh, so the boxes stand in for its shape.",
    "Shapes are plain boxes sized to the spec; the 2 mm wall and the mount points aren't modelled.",
  ]);
  const model = (job, p) => importNoticeOf("three", seedPlanOf(job, p, 1).reports.three, 1).lines[1];
  assert.equal(model(carBooked, primaryOf(carBooked)), "The build used the sample model (demo mode); it's in Generate with AI and isn't this product's shape.");
  assert.equal(model(b1, productOf(b1, "remote")), "The build made one AI model, for RC Car; this product has none.");
  assert.equal(model(lamp, primaryOf(lamp)), "The build's AI model didn't finish, so Generate with AI starts empty.");
  assert.ok(importNoticeOf("three", seedPlanOf(plate, primaryOf(plate), 1).reports.three, 1).lines[0].includes("Its 5 parts are inside it"));

  assert.deepEqual(importNoticeOf("code", seedPlanOf(b1, primaryOf(b1), 1).reports.code, 1), {
    title: "Firmware loaded from version 1",
    lines: [
      "rc_car.ino is in Code Development, with a pin for each of the 3 parts it drives.",
      "Pin numbers are placeholders from 2 up — match them to your board before you flash.",
      "Blockly starts empty; the firmware is text only.",
    ],
  });
  assert.deepEqual(importNoticeOf("code", { noMcu: true }, 1), {
    title: "No firmware in version 1",
    lines: ["This product has no microcontroller, so there's no code to run. Code opens on its sample."],
  });
  assert.deepEqual(importNoticeOf("code", { filename: "clock.ino", pins: 0 }, 1).lines, [
    "clock.ino is in Code Development.",
    "Blockly starts empty; the firmware is text only.",
  ]);

  assert.deepEqual(importNoticeOf("wiring", { placed: ["SW1"], noPart: ["BT1–BT2 AA holder"] }, 1), {
    title: "Parts loaded from version 1",
    lines: [
      "SW1 is on the canvas.",
      "Wires aren't drawn: every connection in the build runs through the main board, and the wiring editor has no part for it yet.",
      "BT1–BT2 AA holder have no wiring part yet.",
    ],
  });
  assert.deepEqual(importNoticeOf("wiring", { placed: [], noPart: [] }, 1), {
    title: "No wiring parts in version 1",
    lines: ["None of this product's parts has a wiring part yet, so the canvas starts empty."],
  });
  assert.equal(joinList(["a", "b", "c"]), "a, b and c");
});

test("P2-BUILDLOAD-12: Got it hides a notice for good; prd_b's Code says it has no firmware", () => {
  const store = shim();
  ensureSeeded(scopeB, builtOf(carProject, [b1], "prd_b").built, T, store, "prd_a");
  assert.equal(pendingNoticeOf(readSeed(scopeB, store), "code").title, "No firmware in version 1");
  assert.equal(pendingNoticeOf(readSeed(scopeB, store), "pcb").title, "Board loaded from version 1");
  assert.equal(dismissImportNotice(scopeB, "pcb", store), true);
  // "Reload": read the record again.
  assert.equal(pendingNoticeOf(readSeed(scopeB, store), "pcb"), null);
  assert.ok(pendingNoticeOf(readSeed(scopeB, store), "three"));
  assert.equal(dismissImportNotice({ projectId: "proj_car", productId: "none" }, "pcb", store), false);
});

// ── C2 · Convert learns net labels ─────────────────────────────────────────

const HAND = [
  { id: "r1", kind: "resistorBox", x: 200, y: 200, scope: "schematic", text: "R1" },
  { id: "r2", kind: "resistorBox", x: 400, y: 200, scope: "schematic", text: "R2" },
  { id: "c1", kind: "capacitor", x: 300, y: 300, scope: "schematic", text: "C1" },
  { id: "w1", kind: "wire", x: 224, y: 200, endX: 376, endY: 200, scope: "schematic" },
  { id: "w2", kind: "wire", x: 300, y: 200, endX: 300, endY: 282, scope: "schematic" },
  { id: "w3", kind: "wire", x: 176, y: 200, endX: 150, endY: 200, scope: "schematic" },
  { id: "g1", kind: "gnd", x: 150, y: 208, scope: "schematic" },
  { id: "v1", kind: "vcc5v", x: 424, y: 170, scope: "schematic" },
  { id: "w4", kind: "wire", x: 424, y: 200, endX: 424, endY: 176, scope: "schematic" },
];

test("Convert is unchanged on label-free sheets (digests from before the label merge)", () => {
  const cases = [
    ["demo", DEMO_SCHEM_OBJECTS, "7f111c61", "cb72cf7f", ["GND"]],
    ["sample", DEFAULT_SCHEM_OBJECTS, "29118bac", "a773065b", ["+5V", "GND"]],
    ["hand", HAND, "3a362334", "e673286a", ["+5V", "GND"]],
  ];
  for (const [name, objs, convertDigest, importDigest, power] of cases) {
    const r = convertSchematicToPcb(objs);
    assert.equal(fnv(JSON.stringify(r)), convertDigest, `${name}: convert`);
    assert.equal(fnv(JSON.stringify(planImportChanges([...objs, ...r.objects]))), importDigest, `${name}: import changes`);
    assert.deepEqual(r.plan.powerNets, power);
  }
});

test("C2: two same-named labels on a hand-drawn sheet are one net, with an airwire named by it", () => {
  // R1 and R2 are not wired to each other; each reaches a "SIG" label.
  const sheet = (a, b) => [
    { id: "r1", kind: "resistorBox", x: 200, y: 200, scope: "schematic", text: "R1" },
    { id: "r2", kind: "resistorBox", x: 400, y: 200, scope: "schematic", text: "R2" },
    { id: "w1", kind: "wire", x: 224, y: 200, endX: 260, endY: 200, scope: "schematic" },
    { id: "l1", kind: "netLabel", x: 260, y: 200, text: a, scope: "schematic" },
    { id: "w2", kind: "wire", x: 376, y: 200, endX: 340, endY: 200, scope: "schematic" },
    { id: "l2", kind: "net", x: 340, y: 200, text: b, scope: "schematic" },
  ];
  const joined = convertSchematicToPcb(sheet("SIG", "SIG"));
  const rats = joined.objects.filter((o) => o.kind === "ratsnest");
  assert.equal(rats.length, 1);
  assert.equal(rats[0].net, "SIG");
  assert.equal(joined.airwires, 1);
  // ERC's netlist agrees: both resistors sit on SIG.
  const erc = computeNets(sheet("SIG", "SIG"));
  assert.ok(erc.membersOf("SIG").includes("r1") && erc.membersOf("SIG").includes("r2"));

  // Different names stay apart.
  assert.equal(convertSchematicToPcb(sheet("A", "B")).airwires, 0);

  // A label dropped on a wire's middle names that wire too.
  const mid = sheet("SIG", "SIG").map((o) => (o.id === "l1" ? { ...o, x: 245, y: 204 } : o));
  assert.equal(convertSchematicToPcb(mid).objects.find((o) => o.kind === "ratsnest").net, "SIG");

  // A supply's own text names its power net.
  const named = HAND.map((o) => (o.id === "v1" ? { ...o, text: "VBUS" } : o));
  assert.deepEqual(convertSchematicToPcb(named).plan.powerNets, ["GND", "VBUS"]);
});

// ── R3-34 · Convert keeps local labels on their own sheet ──────────────────

test("R3-34: a local SDA on each of two sheets is two nets; a global one is one", () => {
  // Each sheet: two resistors, each wired to its own "SDA" label — so each
  // sheet has one SDA net joining its two parts. The sheets sit apart, so no
  // wire end of one sheet is near the other's.
  const half = (sheetId, dy, kind, n) => [
    { id: `r${n}a`, kind: "resistorBox", x: 200, y: 200 + dy, scope: "schematic", text: `R${n}A`, sheetId },
    { id: `r${n}b`, kind: "resistorBox", x: 400, y: 200 + dy, scope: "schematic", text: `R${n}B`, sheetId },
    { id: `w${n}a`, kind: "wire", x: 224, y: 200 + dy, endX: 260, endY: 200 + dy, scope: "schematic", sheetId },
    { id: `l${n}a`, kind, x: 260, y: 200 + dy, text: "SDA", scope: "schematic", sheetId },
    { id: `w${n}b`, kind: "wire", x: 376, y: 200 + dy, endX: 340, endY: 200 + dy, scope: "schematic", sheetId },
    { id: `l${n}b`, kind, x: 340, y: 200 + dy, text: "SDA", scope: "schematic", sheetId },
  ];
  const sheets = [{ id: "sheet-1", name: "Sheet 1" }, { id: "sheet-2", name: "Sheet 2" }];
  const nets = (r) => [...new Set(r.objects.filter((o) => o.kind === "ratsnest").map((o) => o.net))].sort();

  const local = convertSchematicToPcb([...half("sheet-1", 0, "netLabel", 1), ...half("sheet-2", 300, "netLabel", 2)], sheets);
  assert.equal(local.airwires, 2, "one airwire per sheet — not three over all four parts");
  assert.equal(local.nets, 2);
  assert.deepEqual(nets(local), ["1:SDA", "2:SDA"], "two nets, named per sheet as the netlist names them");

  // Every local kind stays on its sheet; a sheet-1 object with no sheetId is
  // on the first sheet.
  for (const kind of ["net", "netBusLabel", "netFlag"]) {
    const bare = half("sheet-1", 0, kind, 1).map(({ sheetId, ...o }) => o);
    assert.equal(convertSchematicToPcb([...bare, ...half("sheet-2", 300, kind, 2)], sheets).airwires, 2, kind);
  }

  // A global label joins across sheets, and keeps its plain name.
  const global = convertSchematicToPcb([...half("sheet-1", 0, "globalLabel", 1), ...half("sheet-2", 300, "globalLabel", 2)], sheets);
  assert.equal(global.airwires, 3);
  assert.deepEqual(nets(global), ["SDA"]);
  // The netlist agrees on both.
  const sda = (objs) => buildNetlist(objs, sheets).map((n) => n.name).filter((n) => n.endsWith("SDA"));
  assert.deepEqual(sda([...half("sheet-1", 0, "globalLabel", 1), ...half("sheet-2", 300, "globalLabel", 2)]), ["SDA"]);
  assert.deepEqual(sda([...half("sheet-1", 0, "netLabel", 1), ...half("sheet-2", 300, "netLabel", 2)]), ["1:SDA", "2:SDA"]);

  // One sheet alone keeps the plain name, as before.
  assert.deepEqual(nets(convertSchematicToPcb(half("sheet-1", 0, "netLabel", 1), sheets)), ["SDA"]);
});

test("R3-34: a label names only a wire on its own sheet", () => {
  // Sheet 1: R1 and R2, each with a stub wire, not joined. Sheet 2: two
  // "SIG" labels sitting exactly on sheet 1's wire ends, with no wire of
  // their own — they name nothing.
  const objs = [
    { id: "r1", kind: "resistorBox", x: 200, y: 200, scope: "schematic", text: "R1", sheetId: "sheet-1" },
    { id: "r2", kind: "resistorBox", x: 400, y: 200, scope: "schematic", text: "R2", sheetId: "sheet-1" },
    { id: "w1", kind: "wire", x: 224, y: 200, endX: 260, endY: 200, scope: "schematic", sheetId: "sheet-1" },
    { id: "w2", kind: "wire", x: 376, y: 200, endX: 340, endY: 200, scope: "schematic", sheetId: "sheet-1" },
    { id: "g1", kind: "globalLabel", x: 260, y: 200, text: "SIG", scope: "schematic", sheetId: "sheet-2" },
    { id: "g2", kind: "globalLabel", x: 300, y: 204, text: "SIG", scope: "schematic", sheetId: "sheet-2" },
    { id: "g3", kind: "globalLabel", x: 340, y: 200, text: "SIG", scope: "schematic", sheetId: "sheet-2" },
  ];
  const sheets = [{ id: "sheet-1", name: "Sheet 1" }, { id: "sheet-2", name: "Sheet 2" }];
  assert.equal(convertSchematicToPcb(objs, sheets).airwires, 0);
  // On sheet 1 the same labels do join the two stubs.
  const same = objs.map((o) => (o.kind === "globalLabel" ? { ...o, sheetId: "sheet-1" } : o));
  assert.equal(convertSchematicToPcb(same, sheets).airwires, 1);
});

// ── R3-35 · a partial Load remembers each document's own version ───────────

test("R3-35: after a partial Load, each editor names its own version, and the rest can still load", () => {
  const { store, plan2, current } = seededCar();
  const keys = ["pcb", "three.shapes", "three.ai", "code.files"]; // Wiring left at version 1
  const res = loadVersion(scopeA, plan2, keys, T + 62 * MIN, store);
  assert.equal(res.ok, true);
  const rec = readSeed(scopeA, store);
  assert.deepEqual(rec.versions, { wiring: 1 }, "stored, and read back");

  assert.equal(pendingNoticeOf(rec, "pcb").title, "Board loaded from version 2");
  assert.equal(pendingNoticeOf(rec, "code").title, "Firmware loaded from version 2");
  assert.equal(pendingNoticeOf(rec, "wiring").title, "Parts loaded from version 1", "Wiring wasn't replaced");

  const offer = loadOfferOf(plan2, rec, current());
  assert.deepEqual(
    offer.rows.map((r) => [r.editor, r.checked, r.hint]),
    [
      ["pcb", true, null],
      ["three", true, null],
      ["code", true, null],
      ["wiring", false, "Changed since version 1"],
    ],
  );

  const cap = seedCaptionOf("built", rec, 2, plan2.pieces);
  assert.deepEqual(cap.lines, ["Loaded from version 2. Wiring is still version 1's.", "Version 1's documents are kept."]);
  assert.deepEqual(cap.load, { version: 2, label: "Load version 2…" }, "the unticked piece keeps its way to version 2");

  // Loading the rest brings every editor to version 2.
  const rest = loadVersion(scopeA, plan2, ["wiring"], T + 63 * MIN, store);
  assert.equal(rest.record.versions, undefined);
  assert.equal(pendingNoticeOf(rest.record, "wiring").title, "Parts loaded from version 2");
  assert.equal(rest.record.backup.version, 1, "the backup holds version 1's wiring");
  const done = seedCaptionOf("built", rest.record, 2, plan2.pieces);
  assert.deepEqual(done.lines, ["Loaded from version 2.", "Version 1's documents are kept."]);
  assert.equal(done.load, null);
});

test("R3-35: Restore puts each document's version back with it", () => {
  const { store, plan2 } = seededCar();
  loadVersion(scopeA, plan2, ["pcb"], T + 62 * MIN, store);
  const mixed = readSeed(scopeA, store);
  assert.deepEqual(mixed.versions, { "three.shapes": 1, "three.ai": 1, "code.files": 1, wiring: 1 });
  // A second partial Load backs up a version-1 document although the record says 2.
  const res = loadVersion(scopeA, plan2, ["code.files"], T + 63 * MIN, store);
  assert.equal(res.record.backup.version, 1, "the code it replaced was version 1's");
  assert.deepEqual(res.record.versions, { "three.shapes": 1, "three.ai": 1, wiring: 1 });

  const back = restoreBackup(scopeA, T + 64 * MIN, store);
  assert.equal(back.message, "Version 1 restored.");
  assert.deepEqual(back.record.versions, { "three.shapes": 1, "three.ai": 1, "code.files": 1, wiring: 1 });
  assert.equal(pendingNoticeOf(back.record, "code").title, "Firmware loaded from version 1");
  assert.equal(pendingNoticeOf(back.record, "pcb").title, "Board loaded from version 2");
  assert.equal(back.record.backup.version, 2, "the slot now holds version 2's code");

  // A version the row's build doesn't supply is never offered.
  const cap = seedCaptionOf("built", back.record, 2, ["board"]);
  assert.equal(cap.load, null);
  assert.deepEqual(cap.lines, ["Loaded from version 2.", "Version 2's documents are kept."]);
});
