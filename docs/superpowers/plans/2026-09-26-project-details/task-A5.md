### Task A5: Editor facts — `src/lib/manual/editor-work.ts`

**Spec delta check (commit e599fcf):** read `.superpowers/pd/plan/spec-delta.md` in full. It amends Showcase, status badges, the Showcase tab, dropped products, version history and delete — none of it touches §5.1.6, COR-59/60/61/65, or the PCB/Assembly/Wiring/3D stores this task reads. No change to this task from the delta.

**Requirements:** COR-59, COR-60, COR-61, COR-65 (§5.10 "Editor" rail block — owner decision 4, "Editor progress comes from real data"); the `StepFact`/`EditorWork`/`editorWorkOf` shapes are §5.1.6 verbatim.

**Files:**
- Create `src/lib/pcb/board-parts.ts`
- Create `src/lib/manual/editor-work.ts`
- Create `tests/projects/fixtures/editor-work/pcb-sample.json`
- Create `tests/projects/fixtures/editor-work/pcb-work.json`
- Create `tests/projects/fixtures/editor-work/assembly-progress.json`
- Create `tests/projects/fixtures/editor-work/wiring-doc.json`
- Create `tests/projects/fixtures/editor-work/three-aimodel-ready.json`
- Create `tests/projects/fixtures/editor-work/three-aimodel-empty.json`
- Create `tests/projects/board-parts.test.mjs`
- Create `tests/projects/editor-work.test.mjs`
- Modify `src/components/assembly/assembly-app.tsx:15` (add an import), `:21-59` (replace the inline filter with `boardPartsOf`), `:75` and `:236` (retype `AssemblyPart` → `BoardPart`) — current code below, read from the file as it stands today.

**Interfaces:**
- Consumes: `ProjectStep = keyof ManualFlowState` from `src/lib/manual/projects.tsx` (Task A1, §5.1.1 — lands before this task per the build order in §5).
- Produces:
  ```ts
  // src/lib/pcb/board-parts.ts
  export interface BoardPart { id: string; designator: string; footprint: string; side: "top" | "bottom"; }
  export function boardPartsOf(doc: { objects?: unknown } | null | undefined): BoardPart[];

  // src/lib/manual/editor-work.ts
  export type StepFact =
    | { state: "not-opened" }
    | { state: "sample" }
    | { state: "work"; text: string }
    | { state: "none" };
  export type EditorWork = Record<Exclude<ProjectStep, "brief">, StepFact>;
  export const EDITOR_GLOBAL_NOTE: string;
  export function editorWorkOf(projectId: string): EditorWork;
  ```
  These are consumed by the rail's Editor block (§5.10, a later task) and, for `boardPartsOf`, by `assembly-app.tsx` itself (this task rewires it).

---

#### Background — the real stores read here

Verified directly against the current code:

- **PCB** (`src/lib/pcb/store.tsx:503,506-511`): key is `PCB_DOC_PREFIX + <projectId>` = `` `ideeza:pcb:doc:${projectId}` ``. The persisted doc (`:517-545`) carries `objects: CanvasObject[]` among other settings. Sample-circuit objects (`src/lib/pcb/types.ts:1502-1508`, `so()`/`sw()`) are built as `` `sch-${kind}-${x}-${y}` `` / `` `sch-w-${x}-${y}-${endX}-${endY}` `` — every seeded object's id starts with `sch-`, and nothing else in the app produces that prefix.
- **Assembly** (`src/components/assembly/assembly-app.tsx:21-59`): progress key `` `ideeza:assembly:${projectId}` `` → `Record<string, boolean>`. Board parts are read by parsing the *same* PCB doc key and filtering `objects` for `scope === "pcb" && text && footprint` (`:41-55`) — this filter is what moves into `boardPartsOf`.
- **Wiring** (`src/components/wiring/wiring-context.tsx:77-83,86-89,105-119`): key `` `ideeza:wiring:doc:${projectId}` `` (read directly by id here — the context itself resolves `pid` from the *active* project, which this reader must not depend on). Doc shape `{ parts: WirePart[], wires: WireObj[] }`; missing key ⇒ both empty (`useState<WirePart[]>([])` / `useState<WireObj[]>([])`, `:86-87`).
- **3D** (`src/components/3d/ai-generate-modal.tsx:21-30`): key `` `ideeza:three:aimodel:${projectId}` `` → `Persisted = { prompt, imageUrl, glbUrl, provider }`. "AI model generated" ⇔ `glbUrl` is a non-empty string.
- **Code / Preview**: no per-project store exists anywhere in the codebase (grepped — nothing under `ideeza:code:` or `ideeza:preview:`). Always `{ state: "none" }`.

**Perf (COR-61, `a11y-perf.md` §4 Impl 8):** the live `PcbProvider` (`store.tsx:672-705`) unconditionally reads and runs the *entire* PCB doc through `sanitizePcbDoc()` (validates/clamps DRC rules, panels, render settings — none of which this reader needs) on every route in the app. This file must not do that and must not go through `PcbProvider` at all: `editorWorkOf` does its own single, targeted `JSON.parse` of the PCB doc and only ever touches the `objects` field. It is a plain function with no subscription — the caller (the rail's Editor block, a later task) is responsible for calling it lazily, once per visit, from an idle callback after first paint, per COR-61. Fixing `PcbProvider`'s own eager global read is a separate, out-of-scope task.

**Sample vs. work, decided precisely:** "every object is a `sch-` sample" is read as `objects.length > 0 && objects.every(o => id(o).startsWith("sch-"))` — an *empty* `objects` array is treated as `work` ("0 objects · 0 on the board"), not `sample`, since nothing seeded is actually present to call a sample. This is a plan-writer decision (not spelled out byte-for-byte in the spec) and is covered by a fixture/test below.

---

#### Step 1: Write the failing tests (full code)

`tests/projects/fixtures/editor-work/pcb-sample.json`:
```json
{
  "objects": [
    { "id": "sch-text-112-116", "kind": "text", "x": 112, "y": 116, "scope": "schematic", "text": "Vbus" },
    { "id": "sch-currentSource-140-180", "kind": "currentSource", "x": 140, "y": 180, "scope": "schematic", "text": "I_LOAD" },
    { "id": "sch-w-140-160-140-132", "kind": "wire", "x": 140, "y": 160, "endX": 140, "endY": 132, "scope": "schematic" }
  ]
}
```

`tests/projects/fixtures/editor-work/pcb-work.json`:
```json
{
  "objects": [
    { "id": "sch-text-112-116", "kind": "text", "x": 112, "y": 116, "scope": "schematic", "text": "Vbus" },
    { "id": "u1", "kind": "resistorBox", "x": 200, "y": 200, "scope": "schematic", "text": "R1" },
    { "id": "fp-r1", "kind": "footprint", "x": 40, "y": 60, "scope": "pcb", "text": "R1", "footprint": "R_0603", "side": "top" },
    { "id": "fp-u1", "kind": "footprint", "x": 80, "y": 60, "scope": "pcb", "text": "U1", "footprint": "SOIC-8" },
    { "id": "trk-1", "kind": "track", "x": 10, "y": 10, "scope": "pcb", "net": "GND", "width": 10 }
  ]
}
```
(5 objects total, 1 `sch-`-prefixed ⇒ not sample; 4 placed; 2 board parts — `trk-1` has no `text`/`footprint` so it's copper, not a part; `u1` is `scope: "schematic"` so it never counts as a board part either.)

`tests/projects/fixtures/editor-work/assembly-progress.json`:
```json
{ "fp-r1": true, "fp-u1": false, "ghost-part": true }
```
(`ghost-part` is a stale id no longer on the board — must not be counted.)

`tests/projects/fixtures/editor-work/wiring-doc.json`:
```json
{
  "parts": [
    { "id": "part_1", "kind": "led", "x": 10, "y": 10 },
    { "id": "part_2", "kind": "button", "x": 40, "y": 10 },
    { "id": "part_3", "kind": "buzzer", "x": 70, "y": 10 }
  ],
  "wires": [
    { "id": "wire_1", "fromPart": "part_1", "fromPin": "a", "toPart": "part_2", "toPin": "b" },
    { "id": "wire_2", "fromPart": "part_2", "fromPin": "a", "toPart": "part_3", "toPin": "b" }
  ]
}
```

`tests/projects/fixtures/editor-work/three-aimodel-ready.json`:
```json
{
  "prompt": "a small drone chassis",
  "imageUrl": "/api/concept/image/abc123",
  "glbUrl": "/api/three/model/abc123.glb",
  "provider": "meshy"
}
```

`tests/projects/fixtures/editor-work/three-aimodel-empty.json`:
```json
{ "prompt": "a small drone chassis", "imageUrl": "/api/concept/image/abc123", "glbUrl": null, "provider": null }
```

`tests/projects/board-parts.test.mjs`:
```js
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
```

`tests/projects/editor-work.test.mjs`:
```js
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
```

#### Step 2: Run it, expected FAIL

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test tests/projects/
```
Neither `src/lib/pcb/board-parts.ts` nor `src/lib/manual/editor-work.ts` exists yet, so `tsc` compiles everything else cleanly but emits nothing for those paths, and the top-level `await import(...)` in each test file throws before any `test()` callback runs:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../.tmp-test/lib/pcb/board-parts.js' imported from tests/projects/board-parts.test.mjs
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../.tmp-test/lib/manual/editor-work.js' imported from tests/projects/editor-work.test.mjs
```
`node --test` reports both files as failing, exit code 1.

#### Step 3: Implement (COMPLETE code)

Create `src/lib/pcb/board-parts.ts`:
```ts
// Board parts — one rule for what counts as a part "on the board": a
// PCB-scoped object that carries a designator and a footprint (a converted
// schematic symbol, or one dropped straight from the parts picker). Pads,
// vias, tracks and copper regions are geometry, not parts to place, so they
// stay out. Shared by Assembly's checklist (assembly-app.tsx) and the
// editor-work reader (src/lib/manual/editor-work.ts, the rail's Editor
// block, COR-60) so the two can't disagree on the count.

export interface BoardPart {
  id: string;
  designator: string;
  footprint: string;
  side: "top" | "bottom";
}

export function boardPartsOf(doc: { objects?: unknown } | null | undefined): BoardPart[] {
  const objects = doc && Array.isArray(doc.objects) ? doc.objects : [];
  return (objects as Array<Record<string, unknown>>)
    .filter(
      (o) =>
        !!o &&
        typeof o === "object" &&
        o.scope === "pcb" &&
        typeof o.text === "string" &&
        !!o.text &&
        typeof o.footprint === "string" &&
        !!o.footprint,
    )
    .map((o) => ({
      id: String(o.id),
      designator: String(o.text),
      footprint: String(o.footprint),
      side: o.side === "bottom" ? ("bottom" as const) : ("top" as const),
    }));
}
```

Create `src/lib/manual/editor-work.ts`:
```ts
// Editor facts (§5.1.6, owner decision 4: "Editor progress comes from real
// data"). One pure reader per editor step — a fact about THIS project's own
// work, read straight from the step's own localStorage key. No React, no
// global state, no writes.
//
// Cheap on purpose (COR-61; a11y-perf.md §4 Impl 8): the PCB document is the
// one large blob among these four keys (schematic + board + DRC config can
// run to hundreds of KB), so this reads it with one targeted JSON.parse and
// only ever looks at `objects` — never the full `sanitizePcbDoc()` pipeline
// (src/lib/pcb/store.tsx) that also validates and clamps rule sets, panel
// sizes and render settings nothing here needs, and never through
// `PcbProvider`, which hydrates the *active* project's doc on every route in
// the app regardless of whether that route reads it (scoping that provider
// is its own, separate task). The parsed object list is reused for both the
// PCB and the Assembly facts, so one visit costs one parse of that key, not
// two. Call `editorWorkOf` from an idle callback after first paint (COR-61)
// — never from a provider mounted at the app root.

import { boardPartsOf } from "@/lib/pcb/board-parts";
import type { ProjectStep } from "./projects";

export type StepFact =
  | { state: "not-opened" } // no doc for this project
  | { state: "sample" } // PCB: only `sch-` sample objects
  | { state: "work"; text: string } // "42 objects · 12 on the board", "6 parts · 9 wires", "8 of 12 parts checked", "AI model generated"
  | { state: "none" }; // nothing attributable (Code, Preview; 3D without an AI model)

export type EditorWork = Record<Exclude<ProjectStep, "brief">, StepFact>;

/** Code, 3D shapes (the manual 3D scene — as opposed to the per-project AI
 *  model below) and Preview have no per-project store: every project in this
 *  browser shares the one editor, so there's no per-project progress to read.
 *  The rail's Editor block shows this instead of a fact for those rows, word
 *  for word (COR-60) — exported so it can't drift from this string. */
export const EDITOR_GLOBAL_NOTE =
  "Code, 3D shapes and Preview are shared by every project in this browser for now, so they show no progress here.";

function readJSON(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function idOf(o: unknown): string {
  return o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string"
    ? (o as { id: string }).id
    : "";
}

function pcbAndAssemblyFacts(projectId: string): { pcb: StepFact; assembly: StepFact } {
  const parsed = readJSON(`ideeza:pcb:doc:${projectId}`) as { objects?: unknown } | null;
  if (parsed === null) {
    // No PCB doc at all: PCB reads "Not opened". Assembly never reads "Not
    // opened" itself (COR-60) — with no doc there are no board parts, so
    // it's nothing attributable.
    return { pcb: { state: "not-opened" }, assembly: { state: "none" } };
  }
  const objects = Array.isArray(parsed.objects) ? parsed.objects : [];
  const isSample = objects.length > 0 && objects.every((o) => idOf(o).startsWith("sch-"));
  const placed = objects.filter((o) => !idOf(o).startsWith("sch-")).length;
  const board = boardPartsOf({ objects });
  const pcb: StepFact = isSample
    ? { state: "sample" }
    : { state: "work", text: `${placed} objects · ${board.length} on the board` };

  if (board.length === 0) {
    return { pcb, assembly: { state: "none" } };
  }
  const progress = (readJSON(`ideeza:assembly:${projectId}`) as Record<string, unknown> | null) ?? {};
  const checked = board.filter((p) => progress[p.id] === true).length;
  return { pcb, assembly: { state: "work", text: `${checked} of ${board.length} parts checked` } };
}

function wiringFact(projectId: string): StepFact {
  const parsed = readJSON(`ideeza:wiring:doc:${projectId}`) as { parts?: unknown; wires?: unknown } | null;
  if (parsed === null) return { state: "not-opened" };
  const parts = Array.isArray(parsed.parts) ? parsed.parts.length : 0;
  const wires = Array.isArray(parsed.wires) ? parsed.wires.length : 0;
  return { state: "work", text: `${parts} parts · ${wires} wires` };
}

function threeFact(projectId: string): StepFact {
  const parsed = readJSON(`ideeza:three:aimodel:${projectId}`) as { glbUrl?: unknown } | null;
  const glb = parsed?.glbUrl;
  return typeof glb === "string" && glb ? { state: "work", text: "AI model generated" } : { state: "none" };
}

/** Per-project editor facts (§5.1.6) — every step but Brief, which has its
 *  own read (`project-brief.ts`, COM-1). Pure: reads up to four localStorage
 *  keys once and returns; never writes, never caches, never subscribes. */
export function editorWorkOf(projectId: string): EditorWork {
  const { pcb, assembly } = pcbAndAssemblyFacts(projectId);
  return {
    pcb,
    assembly,
    wiring: wiringFact(projectId),
    three: threeFact(projectId),
    code: { state: "none" },
    preview: { state: "none" },
  };
}
```

Modify `src/components/assembly/assembly-app.tsx`. Current code (verified in the repo today):
```
10: import * as React from "react";
11: import { useStepNav } from "@/components/manual/use-step-nav";
12: import { EditorShell } from "@/components/pcb/editor-shell";
13: import { TopBar } from "@/components/pcb/top-bar";
14: import { LeftRail } from "@/components/pcb/left-rail";
15: import { Button, Checkbox } from "@/components/ideeza";
16:
17: const TOP = 62; // TopBar height
```
Replace line 15 with:
```
import { Button, Checkbox } from "@/components/ideeza";
import { boardPartsOf, type BoardPart } from "@/lib/pcb/board-parts";
```

Current lines 21-59:
```
21: const PCB_DOC_PREFIX = "ideeza:pcb:doc:";
22: const PROGRESS_PREFIX = "ideeza:assembly:";
23:
24: interface AssemblyPart {
25:   id: string;
26:   designator: string;
27:   footprint: string;
28:   side: "top" | "bottom";
29: }
30:
31: // The board's parts: PCB-scoped objects that carry a designator and a land
32: // pattern (converted footprints and picker-placed parts alike). Pads, vias,
33: // tracks and regions are copper, not parts to place, so they stay out.
34: function readParts(projectId: string | null): AssemblyPart[] {
35:   if (!projectId || typeof window === "undefined") return [];
36:   try {
37:     const raw = window.localStorage.getItem(PCB_DOC_PREFIX + projectId);
38:     if (!raw) return [];
39:     const doc = JSON.parse(raw) as { objects?: Array<Record<string, unknown>> };
40:     if (!Array.isArray(doc.objects)) return [];
41:     return doc.objects
42:       .filter(
43:         (o) =>
44:           o.scope === "pcb" &&
45:           typeof o.text === "string" &&
46:           o.text &&
47:           typeof o.footprint === "string" &&
48:           o.footprint,
49:       )
50:       .map((o) => ({
51:         id: String(o.id),
52:         designator: String(o.text),
53:         footprint: String(o.footprint),
54:         side: o.side === "bottom" ? ("bottom" as const) : ("top" as const),
55:       }));
56:   } catch {
57:     return [];
58:   }
59: }
```
Replace with:
```ts
const PCB_DOC_PREFIX = "ideeza:pcb:doc:";
const PROGRESS_PREFIX = "ideeza:assembly:";

// The board's parts, read from the project's PCB doc. `boardPartsOf` is the
// one rule for what counts as a part "on the board" — shared with the rail's
// Editor block (src/lib/manual/editor-work.ts) so the checklist and the
// progress fact can't disagree.
function readParts(projectId: string | null): BoardPart[] {
  if (!projectId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PCB_DOC_PREFIX + projectId);
    if (!raw) return [];
    return boardPartsOf(JSON.parse(raw) as { objects?: unknown });
  } catch {
    return [];
  }
}
```

Current line 75:
```
  const [parts, setParts] = React.useState<AssemblyPart[]>([]);
```
Replace with:
```
  const [parts, setParts] = React.useState<BoardPart[]>([]);
```

Current line 236:
```
  parts: AssemblyPart[];
```
Replace with:
```
  parts: BoardPart[];
```

#### Step 4: Run, expected PASS

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test tests/projects/
```
Expected: `tsc` exits 0; `node --test` reports both `board-parts.test.mjs` (2 tests) and `editor-work.test.mjs` (10 tests) passing, 0 failures.

#### Step 5: N/A

Pure `src/lib/**` reader task — no UI surface to browser-check. (`editorWorkOf` gets a consumer, and a browser check, in the rail's Editor block task, §5.10.)

#### Step 6: tsc + eslint + commit

```
npx tsc --noEmit
npx eslint src/lib/pcb/board-parts.ts src/lib/manual/editor-work.ts src/components/assembly/assembly-app.tsx tests/projects/board-parts.test.mjs tests/projects/editor-work.test.mjs
git add src/lib/pcb/board-parts.ts src/lib/manual/editor-work.ts src/components/assembly/assembly-app.tsx tests/projects/board-parts.test.mjs tests/projects/editor-work.test.mjs tests/projects/fixtures/editor-work
git commit -m "feat(projects): add editor-work pure readers and shared board-parts rule

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
