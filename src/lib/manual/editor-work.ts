// Editor facts (spec §3.5.8, owner decision 4: "Editor progress comes from
// real data" — now per product, P2-EDITOR-8). One pure reader per editor
// step — a fact about THIS PRODUCT's own work, read straight from its
// scoped localStorage key (with the first row's legacy-key fallback,
// P2-EDITOR-3). No React, no global state, no writes.
//
// Cheap on purpose (COR-61; a11y-perf.md §4 Impl 8): the PCB document is the
// one large blob among these keys (schematic + board + DRC config can run to
// hundreds of KB), so this reads it with one targeted JSON.parse and only
// ever looks at `objects` — never the full `sanitizePcbDoc()` pipeline
// (src/lib/pcb/store.tsx) that also validates and clamps rule sets, panel
// sizes and render settings nothing here needs, and never through
// `PcbProvider`, which hydrates the *scoped* product's doc on every route in
// the app regardless of whether that route reads it. Assembly and Preview read
// the summary the Assembly editor saves with its document, never re-solving the
// assembly here. Call `editorWorkOf` from an idle callback
// after first paint (COR-61) — never from a provider mounted at the app root.
//
// Relative imports only: the node:test harness (tests/projects) compiles this
// file with tsc, which leaves `@/…` specifiers unresolved in its output.

import { parseAsmDoc } from "../assembly/doc";
import { boardPartsOf } from "../pcb/board-parts";
import { docReadKeys } from "./editor-scope";
import type { EditorDoc, EditorScope, EditorStep } from "./p2-types";
import { sweepRowIdsOf, type ManualProject } from "./projects";

export type StepFact =
  | { state: "not-opened" } // no doc for this product
  | { state: "sample" } // PCB: only `sch-` sample objects
  | { state: "work"; text: string } // "42 objects · 12 on the board", "4 of 4 placed · Fit OK · 2 wires", "3 shapes · AI model generated"
  | { state: "none" }; // nothing attributable (a doc that was never opened, and isn't PCB or Wiring)

export type EditorWork = Record<EditorStep, StepFact>;

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readJSON(key: string): unknown {
  try {
    const raw = readRaw(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** The scoped document, falling back to the legacy per-project key on the
 *  first row only (P2-EDITOR-3) — the same read order `docReadKeys`
 *  documents. This reader doesn't gate the fallback on the legacy doc being
 *  pristine (BUILDLOAD C6): it only reports a fact about whatever the maker
 *  can currently see, and the seeding pass (TB1/TB2) is what decides
 *  ownership of that key. */
function readDoc(doc: EditorDoc, scope: EditorScope, headRowId: string): unknown {
  const { key, adoptFrom } = docReadKeys(doc, scope, headRowId);
  const own = readJSON(key);
  if (own !== null) return own;
  return adoptFrom ? readJSON(adoptFrom) : null;
}

function idOf(o: unknown): string {
  return o && typeof o === "object" && typeof (o as { id?: unknown }).id === "string"
    ? (o as { id: string }).id
    : "";
}

function pcbFact(scope: EditorScope, headRowId: string): StepFact {
  const parsed = readDoc("pcb", scope, headRowId) as { objects?: unknown } | null;
  if (parsed === null) return { state: "not-opened" };
  const objects = Array.isArray(parsed.objects) ? parsed.objects : [];
  const isSample = objects.length > 0 && objects.every((o) => idOf(o).startsWith("sch-"));
  const placed = objects.filter((o) => !idOf(o).startsWith("sch-")).length;
  const board = boardPartsOf({ objects });
  return isSample ? { state: "sample" } : { state: "work", text: `${placed} objects · ${board.length} on the board` };
}

/** The assembly as its editor last saved it (the doc's summary, written with
 *  every save): "4 of 4 placed · Fit OK · 2 wires". Nothing brought in yet
 *  (or the old parts checklist, D4) is nothing attributable. */
function assemblyFacts(scope: EditorScope, headRowId: string): { assembly: StepFact; preview: StepFact } {
  const raw = readRaw(docReadKeys("assembly", scope, headRowId).key) ?? readRaw(docReadKeys("assembly", scope, headRowId).adoptFrom ?? "");
  const doc = parseAsmDoc(raw);
  if (!doc.brought && doc.instances.length === 0) return { assembly: { state: "none" }, preview: { state: "none" } };
  const s = doc.summary;
  const parts = s ? s.parts : doc.instances.length;
  const fit = s ? (s.problems ? `${s.problems} fit ${s.problems === 1 ? "problem" : "problems"}` : "Fit OK") : null;
  const wires = doc.wires.length ? ` · ${doc.wires.length} ${doc.wires.length === 1 ? "wire" : "wires"}` : "";
  const text = s ? `${s.placed} of ${parts} placed · ${fit}${wires}` : `${parts} parts${wires}`;
  return {
    assembly: { state: "work", text },
    preview: parts ? { state: "work", text: `${parts} ${parts === 1 ? "part" : "parts"} to view` } : { state: "none" },
  };
}

function wiringFact(scope: EditorScope, headRowId: string): StepFact {
  const parsed = readDoc("wiring", scope, headRowId) as { parts?: unknown; wires?: unknown } | null;
  if (parsed === null) return { state: "not-opened" };
  const parts = Array.isArray(parsed.parts) ? parsed.parts.length : 0;
  const wires = Array.isArray(parsed.wires) ? parsed.wires.length : 0;
  return { state: "work", text: `${parts} parts · ${wires} wires` };
}

/** "{n} files", "{n} blocks", or both joined by " · ", once the product has
 *  its own scoped Code document or Blockly workspace (P2-EDITOR-8). The
 *  workspace is stored as XML, not JSON; each `<block>` counts (a shadow
 *  isn't one). Global `ideeza:code:files` and the global workspace are never
 *  read here (C4): they aren't this product's until the maker brings them
 *  in (P2-EDITOR-5). */
function codeFact(scope: EditorScope, headRowId: string): StepFact {
  const files = readDoc("code.files", scope, headRowId);
  const xml = readRaw(docReadKeys("code.blockly", scope, headRowId).key) ?? "";
  const blocks = (xml.match(/<block[\s>]/g) ?? []).length;
  const parts: string[] = [];
  if (Array.isArray(files) && files.length > 0) parts.push(`${files.length} ${files.length === 1 ? "file" : "files"}`);
  if (blocks > 0) parts.push(`${blocks} ${blocks === 1 ? "block" : "blocks"}`);
  return parts.length > 0 ? { state: "work", text: parts.join(" · ") } : { state: "none" };
}

/** "{n} shapes", "AI model generated", or both joined by " · " (P2-EDITOR-8).
 *  Global `ideeza:3d:shapes` is never read here either, for the same reason. */
function threeFact(scope: EditorScope, headRowId: string): StepFact {
  const ai = readDoc("three.ai", scope, headRowId) as { glbUrl?: unknown } | null;
  const shapes = readDoc("three.shapes", scope, headRowId);
  const hasAi = typeof ai?.glbUrl === "string" && ai.glbUrl !== "";
  const shapeList = Array.isArray(shapes) ? shapes : [];

  const parts: string[] = [];
  if (shapeList.length > 0) parts.push(`${shapeList.length} shapes`);
  if (hasAi) parts.push("AI model generated");
  return parts.length > 0 ? { state: "work", text: parts.join(" · ") } : { state: "none" };
}

/** Per-product editor facts (P2-EDITOR-8) — every step but Brief, which has
 *  its own read (`project-brief.ts`, COM-1). `headRowId` is the project's
 *  first row, the one that adopts the legacy per-project keys. Pure: reads
 *  up to eight localStorage keys once and returns; never writes, never
 *  caches, never subscribes. */
export function editorWorkOf(scope: EditorScope, headRowId: string): EditorWork {
  const { assembly, preview } = assemblyFacts(scope, headRowId);
  return {
    pcb: pcbFact(scope, headRowId),
    assembly,
    wiring: wiringFact(scope, headRowId),
    three: threeFact(scope, headRowId),
    code: codeFact(scope, headRowId),
    preview,
  };
}

/** One row the delete sweep removes, with its editor facts and the name the plan gives it. */
export type RowWork = { rowId: string; name: string; work: EditorWork };

/** Every product row's editor facts — exactly the rows the delete sweep removes
 *  (`sweepRowIdsOf`), the first adopting the legacy per-project keys — so the
 *  delete plan counts the work that really goes (R2-C1). A row the project
 *  no longer lists (an id only its editor stamps name) reads "An earlier
 *  product". Reads storage: call it when the dialog opens, never at render. */
export function editorWorkOfProject(p: ManualProject): RowWork[] {
  const rows = p.products?.length ? p.products : [{ id: "p1", name: p.productName }];
  const head = rows[0].id;
  return sweepRowIdsOf(p).map((rowId) => {
    const row = rows.find((r) => r.id === rowId);
    const name = row ? row.name.trim() || "Untitled product" : "An earlier product";
    return { rowId, name, work: editorWorkOf({ projectId: p.id, productId: rowId }, head) };
  });
}
