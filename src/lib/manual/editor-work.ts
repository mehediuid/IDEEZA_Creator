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
//
// Relative imports only: the node:test harness (tests/projects) compiles this
// file with tsc, which leaves `@/…` specifiers unresolved in its output.

import { boardPartsOf } from "../pcb/board-parts";
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
