"use client";

// Assembly's state (the Assembly + Wiring plan, owner-approved 2026-10-19):
// the product's assembly document, saved as it changes (D3 save status:
// `reportSave("assembly")`, flushed by Ctrl+S / Finish), with undo; the live
// parts it places — this product's PCB from the PCB store, the 3D Module's
// shapes, the off-board library (D9: always the current ones); and the
// composed scene everyone draws and checks from (lib/assembly/scene.ts).
//
// Product Preview reads the same scene read-only (useAssemblyView).

import * as React from "react";
import { useEditorScope } from "@/components/manual/use-step-nav";
import { usePcbState } from "@/lib/pcb/store";
import { buildNetlist } from "@/lib/pcb/nets";
import { DocSaveQueue, globalTimers, readEditorDoc, writeEditorDoc, type DocHandle } from "@/lib/manual/editor-docs";
import { editorDocKey } from "@/lib/manual/editor-scope";
import { registerSaveFlusher, reportSave } from "@/lib/manual/save-status";
import type { EditorScope } from "@/lib/manual/p2-types";
import { DEFAULT_SHAPES, type SceneShape } from "@/lib/three/scene";
import { parseAsmDoc, serializeAsmDoc, nextId, wireName, mateName } from "@/lib/assembly/doc";
import { pcbPart, type PcbDocLike } from "@/lib/assembly/model-pcb";
import { threeParts, threeInstanceId, isPristineScene } from "@/lib/assembly/model-three";
import { LIBRARY_BY_KIND, libraryKindOf, nextLabel, type LibraryKind } from "@/lib/assembly/library";
import { fingerprintOf } from "@/lib/manual/build-load";
import { readSeed } from "@/lib/manual/build-load-io";
import { composeScene, summarize, type AsmScene, type Sources } from "@/lib/assembly/scene";
import { applyPlan, lidPlan, placeInsidePlan, snapPlan, type Plan } from "@/lib/assembly/place";
import { suggestWires, wireGeometry, pointOn, type WireGeom } from "@/lib/assembly/wiring";
import { DEFAULT_AWG } from "@/lib/assembly/wires";
import { relativePose } from "@/lib/assembly/solve";
import { worldAabbOf } from "@/lib/assembly/fit";
import type { Pose, Vec3 } from "@/lib/assembly/math";
import type { AsmDoc, AsmMode, InstanceRec, MateEnd, MateRec, NewPattern, PatternRec, WireEnd, WireRec } from "@/lib/assembly/types";

export type Selection =
  | { kind: "none" }
  | { kind: "inst"; id: string }
  | { kind: "mate"; id: string }
  | { kind: "wire"; id: string }
  | { kind: "problem"; index: number }
  | { kind: "pattern"; id: string };

export type Tool = null | "move" | "rotate" | "snap" | "measure" | "wire";

/** What the maker can bring in that isn't in the assembly yet (F4). */
export type Available = {
  pcb: { ready: boolean; parts: number; size: [number, number]; boxOnly: number; inAssembly: boolean };
  three: Array<{ id: string; name: string; enclosure: "base" | "lid" | null }>;
  library: Array<{ kind: LibraryKind; label: string; from: string }>;
};

type Store = {
  scope: EditorScope | null;
  hydrated: boolean;
  doc: AsmDoc;
  scene: AsmScene;
  wires: Map<string, WireGeom>;
  available: Available;
  oldWiring: { parts: number; wires: number } | null;
  selection: Selection;
  tool: Tool;
  snapFrom: MateEnd | null;
  measure: Vec3[];
  wireFrom: WireEnd | null;
  section: { on: boolean; axis: "x" | "y" | "z"; at: number };
  toast: string | null;
  fitTick: number;
  canUndo: boolean;
  canRedo: boolean;
  // ── actions
  setMode: (m: AsmMode) => void;
  select: (s: Selection) => void;
  setTool: (t: Tool) => void;
  flash: (msg: string) => void;
  fitView: () => void;
  undo: () => void;
  redo: () => void;
  bringIn: (opts: { pcb: boolean; three: string[]; library: Array<{ kind: LibraryKind; label: string }> }) => void;
  insertLibrary: (kind: LibraryKind) => void;
  removeInstance: (id: string) => void;
  setGrounded: (id: string, on: boolean) => void;
  setHidden: (id: string, hidden: boolean) => void;
  movePreview: (id: string, pose: Pose) => void;
  moveCommit: (id: string, pose: Pose) => void;
  pickFeature: (end: MateEnd) => void;
  placeInside: (id: string) => void;
  closeLid: (id: string) => void;
  placeAll: () => void;
  updateMate: (id: string, patch: Partial<MateRec>) => void;
  deleteMate: (id: string) => void;
  addPattern: (p: NewPattern) => void;
  updatePattern: (id: string, patch: Partial<PatternRec>) => void;
  deletePattern: (id: string) => void;
  addMeasurePoint: (p: Vec3) => void;
  pickPin: (end: WireEnd) => void;
  addWire: (from: WireEnd, to: WireEnd, color?: string) => void;
  updateWire: (id: string, patch: Partial<WireRec>) => void;
  deleteWire: (id: string) => void;
  addWirePoint: (id: string, world: Vec3) => void;
  removeWirePoint: (id: string, index: number) => void;
  setClearance: (mm: number) => void;
  setSection: (s: Partial<Store["section"]>) => void;
  dismissOldWiring: () => void;
};

const AssemblyContext = React.createContext<Store | null>(null);

const HISTORY = 50;
const WIRE_COLORS = { supply: "#dc2626", ground: "#111827", signal: "#eab308" };

function readShapes(scope: EditorScope): SceneShape[] {
  try {
    const raw = window.localStorage.getItem(editorDocKey("three.shapes", scope));
    const v = raw ? (JSON.parse(raw) as SceneShape[]) : null;
    return Array.isArray(v) && v.length ? v : DEFAULT_SHAPES;
  } catch {
    return DEFAULT_SHAPES;
  }
}

/** The maker's own 2D wiring from before Wiring moved into Assembly (D14) —
 *  not the copy a build seeded, which is the build's record, not their work. */
function readOldWiring(scope: EditorScope): { parts: number; wires: number } | null {
  try {
    const raw = window.localStorage.getItem(editorDocKey("wiring", scope));
    const seeded = readSeed(scope, window.localStorage)?.seeded.wiring;
    if (raw !== null && seeded !== undefined && seeded === fingerprintOf("wiring", raw)) return null;
    const v = raw ? JSON.parse(raw) : null;
    const parts = Array.isArray(v?.parts) ? v.parts.length : 0;
    const wires = Array.isArray(v?.wires) ? v.wires.length : 0;
    return parts || wires ? { parts, wires } : null;
  } catch {
    return null;
  }
}

// A built product's off-board parts (F3): the ones its seed placed in the old
// wiring document, and the ones it had no wiring part for, as library parts.
const WIRING_KIND: Record<string, LibraryKind> = { led: "led-5", button: "tactile-6", motor: "vibration-motor", connector: "jst-ph-2" };
function readBuildParts(scope: EditorScope): Array<{ kind: LibraryKind; label: string }> {
  try {
    const seed = readSeed(scope, window.localStorage);
    if (!seed) return [];
    const out: Array<{ kind: LibraryKind; label: string }> = [];
    const doc = JSON.parse(window.localStorage.getItem(editorDocKey("wiring", scope)) ?? "null");
    for (const part of Array.isArray(doc?.parts) ? doc.parts : []) {
      const kind = WIRING_KIND[String(part?.kind)];
      if (kind && typeof part.name === "string") out.push({ kind, label: part.name });
    }
    for (const entry of seed.reports.wiring?.noPart ?? []) {
      const [ref, ...rest] = entry.split(" ");
      const kind = libraryKindOf(ref, rest.join(" "));
      if (kind) out.push({ kind, label: ref });
    }
    return out.filter((p, i) => out.findIndex((q) => q.label === p.label) === i);
  } catch {
    return [];
  }
}

/** The PCB store's live state, as the part builder reads it. */
function usePcbSource() {
  const pcb = usePcbState();
  const doc: PcbDocLike = React.useMemo(() => ({ objects: pcb.objects, pcbBoard: pcb.pcbBoard, threeD: pcb.threeD }), [pcb.objects, pcb.pcbBoard, pcb.threeD]);
  const netlist = React.useMemo(() => {
    try {
      return buildNetlist(pcb.objects, pcb.schematicSheets);
    } catch {
      return [];
    }
  }, [pcb.objects, pcb.schematicSheets]);
  const part = React.useMemo(() => pcbPart(doc, netlist), [doc, netlist]);
  const ready = React.useMemo(() => pcb.objects.some((o) => (o.scope ?? "schematic") === "pcb"), [pcb.objects]);
  return { part, ready };
}

export function AssemblyProvider({ children, readOnly = false }: { children: React.ReactNode; readOnly?: boolean }) {
  const editor = useEditorScope();
  const scope = editor?.scope ?? null;
  const headRowId = editor?.headRowId ?? "";
  const [doc, setDoc] = React.useState<AsmDoc>(() => parseAsmDoc(null));
  const [hydrated, setHydrated] = React.useState(false);
  const [shapes, setShapes] = React.useState<SceneShape[]>(DEFAULT_SHAPES);
  const [oldWiring, setOldWiring] = React.useState<{ parts: number; wires: number } | null>(null);
  const [buildParts, setBuildParts] = React.useState<Array<{ kind: LibraryKind; label: string }>>([]);
  const past = React.useRef<AsmDoc[]>([]);
  const future = React.useRef<AsmDoc[]>([]);
  const [, bump] = React.useState(0);
  const handleRef = React.useRef<DocHandle | null>(null);
  const [selection, setSelection] = React.useState<Selection>({ kind: "none" });
  const [tool, setToolState] = React.useState<Tool>(null);
  const [snapFrom, setSnapFrom] = React.useState<MateEnd | null>(null);
  const [measure, setMeasure] = React.useState<Vec3[]>([]);
  const [wireFrom, setWireFrom] = React.useState<WireEnd | null>(null);
  const [section, setSectionState] = React.useState<Store["section"]>({ on: false, axis: "z", at: 0 });
  const [toast, setToast] = React.useState<string | null>(null);
  const [fitTick, setFitTick] = React.useState(0);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = React.useState<{ id: string; pose: Pose } | null>(null);

  const flash = React.useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // One read per product; the 3D Module's shapes again whenever the window comes back
  // (another tab may have changed them).
  /* eslint-disable react-hooks/set-state-in-effect -- the documents are external state, read once per product */
  React.useEffect(() => {
    if (!scope) return;
    const read = readEditorDoc("assembly", scope, headRowId, window.localStorage);
    handleRef.current = { key: read.key, settle: read.settle };
    setDoc(parseAsmDoc(read.raw));
    setShapes(readShapes(scope));
    setOldWiring(readOldWiring(scope));
    setBuildParts(readBuildParts(scope));
    past.current = [];
    future.current = [];
    setHydrated(true);
    setFitTick((t) => t + 1);
  }, [scope, headRowId]);
  /* eslint-enable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (!scope) return;
    const onFocus = () => setShapes(readShapes(scope));
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [scope]);

  const pcb = usePcbSource();
  const three = React.useMemo(() => threeParts(shapes), [shapes]);
  const sources: Sources = React.useMemo(() => ({ pcb: pcb.ready || doc.instances.some((i) => i.source === "pcb") ? pcb.part : null, three }), [pcb.ready, pcb.part, three, doc.instances]);

  // A gizmo drag shows the part moving before it is written.
  const shown = React.useMemo(() => {
    if (!preview) return doc;
    return { ...doc, instances: doc.instances.map((i) => (i.id === preview.id ? { ...i, pose: preview.pose } : i)) };
  }, [doc, preview]);
  const scene = React.useMemo(() => composeScene(shown, sources), [shown, sources]);
  const wires = React.useMemo(() => new Map(shown.wires.map((w) => [w.id, wireGeometry(scene, w)])), [shown.wires, scene]);

  // Saving: a short pause after the last change, reported to the top bar's status.
  const [queue] = React.useState(
    () =>
      new DocSaveQueue<DocHandle, AsmDoc>(
        250,
        (handle, value) => {
          const json = serializeAsmDoc(value);
          const write = () => writeEditorDoc(handle, json, window.localStorage);
          const ok = write();
          reportSave("assembly", ok, write);
          return ok;
        },
        globalTimers,
      ),
  );
  React.useEffect(() => registerSaveFlusher("assembly", () => queue.flush()), [queue]);
  React.useEffect(() => () => void queue.flush(), [queue]);
  const sceneRef = React.useRef(scene);
  React.useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  const commit = React.useCallback(
    (next: AsmDoc | ((d: AsmDoc) => AsmDoc), opts: { history?: boolean } = {}) => {
      if (readOnly) return;
      setDoc((cur) => {
        const value = typeof next === "function" ? next(cur) : next;
        if (value === cur) return cur;
        if (opts.history !== false) {
          past.current = [...past.current.slice(-(HISTORY - 1)), cur];
          future.current = [];
        }
        const handle = handleRef.current;
        if (handle) {
          const withSummary = { ...value, summary: summarize(value, composeScene(value, sources), Date.now()) };
          queue.schedule(handle, withSummary);
        }
        return value;
      });
      bump((n) => n + 1);
    },
    [queue, readOnly, sources],
  );

  const undo = React.useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    setDoc((cur) => {
      future.current.push(cur);
      if (handleRef.current) queue.schedule(handleRef.current, prev);
      return prev;
    });
    bump((n) => n + 1);
  }, [queue]);
  const redo = React.useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    setDoc((cur) => {
      past.current.push(cur);
      if (handleRef.current) queue.schedule(handleRef.current, next);
      return next;
    });
    bump((n) => n + 1);
  }, [queue]);

  const available: Available = React.useMemo(() => {
    const inDoc = new Set(doc.instances.map((i) => i.id));
    const board = pcb.part.solids[0]?.slab;
    let w = 0, d = 0;
    if (board) {
      const xs = board.outline.map((p) => p[0]), zs = board.outline.map((p) => p[1]);
      w = Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10;
      d = Math.round((Math.max(...zs) - Math.min(...zs)) * 10) / 10;
    }
    return {
      pcb: {
        ready: pcb.ready,
        parts: pcb.part.solids.filter((s) => s.id.startsWith("part:")).length,
        size: [w, d],
        boxOnly: pcb.part.boxOnly?.length ?? 0,
        inAssembly: inDoc.has("pcb"),
      },
      three: isPristineScene(shapes)
        ? []
        : three.filter((p) => !inDoc.has(p.id)).map((p) => ({ id: p.ref, name: p.name, enclosure: p.enclosure?.role ?? null })),
      library: buildParts
        .filter((b) => !doc.instances.some((i) => i.source === "library" && i.label === b.label))
        .map((b) => ({ ...b, from: "From the build's parts list" })),
    };
  }, [buildParts, doc.instances, pcb.part, pcb.ready, shapes, three]);

  // ── the actions ──
  const select = React.useCallback((s: Selection) => setSelection(s), []);
  const setTool = React.useCallback((t: Tool) => {
    setToolState(t);
    setSnapFrom(null);
    setMeasure([]);
    setWireFrom(null);
  }, []);
  const setMode = React.useCallback(
    (m: AsmMode) => {
      setToolState(null);
      setSnapFrom(null);
      setWireFrom(null);
      setSelection({ kind: "none" });
      commit((d) => (d.mode === m ? d : { ...d, mode: m }), { history: false });
    },
    [commit],
  );

  /** A lifted spot above everything, for a part that has just come in. */
  const liftAbove = React.useCallback((sceneNow: AsmScene, step: number): Pose => {
    let top = 0;
    for (const i of sceneNow.items) {
      const box = worldAabbOf(i.part.solids, i.pose);
      if (box) top = Math.max(top, box.max[1]);
    }
    return { p: [0, top + 25 + step * 20, 0], q: [0, 0, 0, 1] };
  }, []);

  const bringIn: Store["bringIn"] = React.useCallback(
    ({ pcb: withPcb, three: threeIds, library }) => {
      commit((d) => {
        const instances: InstanceRec[] = [...d.instances];
        const has = (id: string) => instances.some((i) => i.id === id);
        for (const ref of threeIds) {
          const id = threeInstanceId(ref);
          if (has(id)) continue;
          instances.push({ id, source: "three", ref });
        }
        // The case is the ground: the first enclosure base, else the first 3D part.
        if (!instances.some((i) => i.grounded)) {
          const parts = threeParts(shapes);
          const k = instances.findIndex((i) => i.source === "three" && parts.find((p) => p.ref === i.ref)?.enclosure?.role === "base");
          const at = k >= 0 ? k : instances.findIndex((i) => i.source === "three");
          if (at >= 0) instances[at] = { ...instances[at], grounded: true };
        }
        const draft: AsmDoc = { ...d, instances };
        const lifted = composeScene(draft, sources);
        let step = 0;
        if (withPcb && !has("pcb")) instances.push({ id: "pcb", source: "pcb", ref: "board", pose: liftAbove(lifted, step++) });
        for (const l of library) {
          const id = nextId("lib:", instances.map((i) => i.id));
          instances.push({ id, source: "library", ref: l.kind, label: l.label, pose: liftAbove(lifted, step++) });
        }
        return { ...d, instances, brought: true };
      });
      setFitTick((t) => t + 1);
      flash("Brought in. New parts wait above the case: select one, then Snap or Place inside.");
    },
    [commit, flash, liftAbove, shapes, sources],
  );

  const insertLibrary = React.useCallback(
    (kind: LibraryKind) => {
      const item = LIBRARY_BY_KIND[kind];
      commit((d) => {
        const id = nextId("lib:", d.instances.map((i) => i.id));
        const label = nextLabel(kind, d.instances.map((i) => i.label ?? ""));
        return { ...d, brought: true, instances: [...d.instances, { id, source: "library", ref: kind, label, pose: liftAbove(sceneRef.current, 0) }] };
      });
      flash(`${item?.name ?? "Part"} added above the case. Snap it or Place inside.`);
    },
    [commit, flash, liftAbove],
  );

  const removeInstance = React.useCallback(
    (id: string) => {
      commit((d) => ({
        ...d,
        instances: d.instances.filter((i) => i.id !== id),
        mates: d.mates.filter((m) => m.a.inst !== id && m.b.inst !== id),
        wires: d.wires.filter((w) => w.from.inst !== id && w.to.inst !== id),
        patterns: d.patterns.filter((p) => p.seed !== id),
      }));
      setSelection({ kind: "none" });
      flash("Taken out of the assembly, with its snaps and wires. Undo brings it back.");
    },
    [commit, flash],
  );

  const setGrounded = React.useCallback(
    (id: string, on: boolean) => {
      const item = sceneRef.current.items.find((i) => i.rec.id === id);
      commit((d) => ({ ...d, instances: d.instances.map((i) => (i.id === id ? { ...i, grounded: on || undefined, pose: on ? (item?.pose ?? i.pose) : i.pose, placed: on || i.placed } : i)) }));
    },
    [commit],
  );
  const setHidden = React.useCallback(
    (id: string, hidden: boolean) => commit((d) => ({ ...d, instances: d.instances.map((i) => (i.id === id ? { ...i, hidden: hidden || undefined } : i)) }), { history: false }),
    [commit],
  );
  const movePreview = React.useCallback((id: string, pose: Pose) => setPreview({ id, pose }), []);
  const moveCommit = React.useCallback(
    (id: string, pose: Pose) => {
      setPreview(null);
      commit((d) => ({ ...d, instances: d.instances.map((i) => (i.id === id ? { ...i, pose, placed: true } : i)) }));
    },
    [commit],
  );

  const runPlan = React.useCallback(
    (id: string, plan: Plan) => {
      if (!plan.ok) {
        flash(plan.error);
        return false;
      }
      commit((d) => applyPlan(d, id, plan));
      flash(plan.message);
      return true;
    },
    [commit, flash],
  );

  const pickFeature = React.useCallback(
    (end: MateEnd) => {
      if (!snapFrom) {
        const item = sceneRef.current.items.find((i) => i.rec.id === end.inst);
        if (item?.rec.grounded) {
          flash(`${item.part.name} is fixed in place. Pick the part you want to move first.`);
          return;
        }
        setSnapFrom(end);
        return;
      }
      if (end.inst === snapFrom.inst) {
        setSnapFrom(end);
        return;
      }
      if (runPlan(snapFrom.inst, snapPlan(sceneRef.current, snapFrom.inst, snapFrom.feature, end.inst, end.feature))) {
        setSelection({ kind: "inst", id: snapFrom.inst });
        setToolState(null);
      }
      setSnapFrom(null);
    },
    [flash, runPlan, snapFrom],
  );

  const placeInside = React.useCallback((id: string) => void runPlan(id, placeInsidePlan(sceneRef.current, id)), [runPlan]);
  const closeLid = React.useCallback((id: string) => void runPlan(id, lidPlan(sceneRef.current, id)), [runPlan]);

  // Place all (F39): the board first, then each off-board part, then the lid, one after another.
  const placeAll = React.useCallback(() => {
    let d = doc;
    const placedNow: string[] = [];
    const errors: string[] = [];
    const order = [...d.instances].sort((a, b) => (a.source === "pcb" ? -1 : b.source === "pcb" ? 1 : 0));
    for (const rec of order) {
      const s = composeScene(d, sources);
      const item = s.items.find((i) => i.rec.id === rec.id);
      if (!item || item.placed || item.rec.grounded) continue;
      const plan = item.part.enclosure?.role === "lid" ? lidPlan(s, rec.id) : placeInsidePlan(s, rec.id);
      if (plan.ok) {
        d = applyPlan(d, rec.id, plan);
        placedNow.push(item.part.name);
      } else errors.push(plan.error);
    }
    if (!placedNow.length) {
      flash(errors[0] ?? "Everything is already placed.");
      return;
    }
    commit(d);
    flash(`Placed ${placedNow.length}: ${placedNow.join(", ")}${errors.length ? `. ${errors[0]}` : ""}`);
  }, [commit, doc, flash, sources]);

  const updateMate = React.useCallback(
    (id: string, patch: Partial<MateRec>) => {
      commit((d) => ({
        ...d,
        mates: d.mates.map((m) => {
          if (m.id !== id) return m;
          const next = { ...m, ...patch };
          // A lock re-made from where the parts are now.
          if (patch.type === "lock" && m.type !== "lock") {
            const a = sceneRef.current.items.find((i) => i.rec.id === m.a.inst);
            const b = sceneRef.current.items.find((i) => i.rec.id === m.b.inst);
            if (a && b) next.rel = relativePose(a.pose, b.pose);
          }
          if (patch.type && patch.type !== m.type && !patch.name) next.name = mateName(patch.type, d.mates.filter((x) => x.id !== id));
          return next;
        }),
      }));
    },
    [commit],
  );
  const deleteMate = React.useCallback(
    (id: string) => {
      // The parts it held keep the place it gave them, until moved.
      commit((d) => {
        const m = d.mates.find((x) => x.id === id);
        const held = new Set(m ? [m.a.inst, m.b.inst] : []);
        return {
          ...d,
          mates: d.mates.filter((x) => x.id !== id),
          instances: d.instances.map((i) => (held.has(i.id) && !i.grounded ? { ...i, pose: sceneRef.current.items.find((x) => x.rec.id === i.id)?.pose ?? i.pose, placed: true } : i)),
        };
      });
      setSelection({ kind: "none" });
      flash("Snap deleted. The parts stay where they are until you move them.");
    },
    [commit, flash],
  );

  const addPattern = React.useCallback(
    (p: NewPattern) => {
      const id = nextId("pat", doc.patterns.map((x) => x.id));
      commit((d) => ({ ...d, patterns: [...d.patterns, { ...p, id } as PatternRec] }));
      setSelection({ kind: "pattern", id });
    },
    [commit, doc.patterns],
  );
  const updatePattern = React.useCallback(
    (id: string, patch: Partial<PatternRec>) => commit((d) => ({ ...d, patterns: d.patterns.map((p) => (p.id === id ? ({ ...p, ...patch } as PatternRec) : p)) })),
    [commit],
  );
  const deletePattern = React.useCallback(
    (id: string) => {
      commit((d) => ({ ...d, patterns: d.patterns.filter((p) => p.id !== id) }));
      setSelection({ kind: "none" });
    },
    [commit],
  );

  const addMeasurePoint = React.useCallback((p: Vec3) => setMeasure((m) => (m.length >= 2 ? [p] : [...m, p])), []);

  const addWire = React.useCallback(
    (from: WireEnd, to: WireEnd, color?: string) => {
      let made = "";
      commit((d) => {
        const id = nextId("w", d.wires.map((w) => w.id));
        const name = wireName(d.wires);
        made = id;
        return { ...d, wires: [...d.wires, { id, name, from, to, gauge: DEFAULT_AWG, color: color ?? WIRE_COLORS.signal, sleeveMm: 0.5, slackPct: 10, points: [] }] };
      });
      if (made) setSelection({ kind: "wire", id: made });
    },
    [commit],
  );
  const pickPin = React.useCallback(
    (end: WireEnd) => {
      if (!wireFrom) {
        setWireFrom(end);
        return;
      }
      if (wireFrom.inst === end.inst && wireFrom.pin === end.pin) return;
      const used = doc.wires.some((w) => [w.from, w.to].some((e) => (e.inst === end.inst && e.pin === end.pin) || (e.inst === wireFrom.inst && e.pin === wireFrom.pin)));
      const geom = wireGeometry(sceneRef.current, { id: "_", name: "_", from: wireFrom, to: end, gauge: DEFAULT_AWG, color: "", sleeveMm: 0.5, slackPct: 10, points: [] });
      const net = (geom.nets.from ?? geom.nets.to ?? "").toUpperCase();
      const color = /GND|VSS|-$/.test(net) ? WIRE_COLORS.ground : /V|BAT|\+/.test(net) ? WIRE_COLORS.supply : WIRE_COLORS.signal;
      addWire(wireFrom, end, color);
      setWireFrom(null);
      if (geom.nets.same === false) flash(`These pins are on different nets (${geom.nets.from} and ${geom.nets.to}). The wire is made; check it.`);
      else if (used) flash("One of these pins already has a wire. Two wires on one pin is allowed, but check it.");
      else flash(geom.ok ? `Wire made: ${geom.from?.pin.label} → ${geom.to?.pin.label}` : `${geom.reason} The wire runs straight for now; add a point or use a thinner wire.`);
    },
    [addWire, doc.wires, flash, wireFrom],
  );
  const updateWire = React.useCallback((id: string, patch: Partial<WireRec>) => commit((d) => ({ ...d, wires: d.wires.map((w) => (w.id === id ? { ...w, ...patch } : w)) })), [commit]);
  const deleteWire = React.useCallback(
    (id: string) => {
      commit((d) => ({ ...d, wires: d.wires.filter((w) => w.id !== id) }));
      setSelection({ kind: "none" });
      flash("Wire deleted. Undo brings it back.");
    },
    [commit, flash],
  );
  const addWirePoint = React.useCallback(
    (id: string, world: Vec3) => {
      const g = wires.get(id);
      commit((d) => ({
        ...d,
        wires: d.wires.map((w) => {
          if (w.id !== id) return w;
          const pt = pointOn(sceneRef.current, world);
          // Insert where it falls along the current path, between the fixed points it lies between.
          const fixed = [g?.from?.point, ...w.points.map((p) => (p.inst ? null : p.local)), g?.to?.point];
          let at = w.points.length;
          if (g && fixed.every(Boolean)) {
            let best = Infinity;
            for (let k = 0; k <= w.points.length; k++) {
              const a = k === 0 ? g.from!.point : fixed[k]!;
              const b = k === w.points.length ? g.to!.point : fixed[k + 1]!;
              const dd = Math.hypot(world[0] - a[0], world[1] - a[1], world[2] - a[2]) + Math.hypot(world[0] - b[0], world[1] - b[1], world[2] - b[2]);
              if (dd < best) {
                best = dd;
                at = k;
              }
            }
          }
          const points = [...w.points];
          points.splice(at, 0, pt);
          return { ...w, points };
        }),
      }));
      flash("Point added. The wire now passes through it.");
    },
    [commit, flash, wires],
  );
  const removeWirePoint = React.useCallback(
    (id: string, index: number) => commit((d) => ({ ...d, wires: d.wires.map((w) => (w.id === id ? { ...w, points: w.points.filter((_, k) => k !== index) } : w)) })),
    [commit],
  );
  const setClearance = React.useCallback((mm: number) => commit((d) => ({ ...d, clearanceMm: Math.min(20, Math.max(0, mm)) })), [commit]);
  const setSection = React.useCallback((s: Partial<Store["section"]>) => setSectionState((cur) => ({ ...cur, ...s })), []);
  const dismissOldWiring = React.useCallback(() => commit((d) => ({ ...d, oldWiringSeen: true }), { history: false }), [commit]);

  const value: Store = {
    scope,
    hydrated,
    doc: shown,
    scene,
    wires,
    available,
    oldWiring: doc.oldWiringSeen ? null : oldWiring,
    selection,
    tool,
    snapFrom,
    measure,
    wireFrom,
    section,
    toast,
    fitTick,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    setMode,
    select,
    setTool,
    flash,
    fitView: () => setFitTick((t) => t + 1),
    undo,
    redo,
    bringIn,
    insertLibrary,
    removeInstance,
    setGrounded,
    setHidden,
    movePreview,
    moveCommit,
    pickFeature,
    placeInside,
    closeLid,
    placeAll,
    updateMate,
    deleteMate,
    addPattern,
    updatePattern,
    deletePattern,
    addMeasurePoint,
    pickPin,
    addWire,
    updateWire,
    deleteWire,
    addWirePoint,
    removeWirePoint,
    setClearance,
    setSection,
    dismissOldWiring,
  };
  // Deterministic test hook (mirrors what the pointer does), as Wiring had.
  React.useEffect(() => {
    (window as unknown as { __assembly?: unknown }).__assembly = {
      state: () => ({
        doc: value.doc,
        items: value.scene.items.map((i) => ({ id: i.rec.id, name: i.part.name, placed: i.placed, p: i.pose.p })),
        mates: Object.fromEntries(value.scene.mates),
        problems: value.scene.fit.problems.length,
        holes: value.scene.holes,
        lid: value.scene.lid,
        wires: [...value.wires.entries()].map(([id, g]) => ({ id, ok: g.ok, length: g.length, cut: g.cut, tight: g.tight, through: g.through })),
      }),
      features: (inst: string) => value.scene.items.find((i) => i.rec.id === inst)?.part.features.map((f) => f.id) ?? [],
      pins: (inst: string) => value.scene.items.find((i) => i.rec.id === inst)?.part.pins.map((f) => ({ id: f.id, label: f.label, net: f.net, netHint: f.netHint })) ?? [],
      setTool: value.setTool,
      setMode: value.setMode,
      select: value.select,
      pickFeature: value.pickFeature,
      placeInside: value.placeInside,
      closeLid: value.closeLid,
      placeAll: value.placeAll,
      insertLibrary: value.insertLibrary,
      pickPin: value.pickPin,
      addWire: value.addWire,
      undo: value.undo,
      redo: value.redo,
    };
  });
  return <AssemblyContext.Provider value={value}>{children}</AssemblyContext.Provider>;
}

export function useAssembly(): Store {
  const ctx = React.useContext(AssemblyContext);
  if (!ctx) throw new Error("useAssembly must be used inside AssemblyProvider");
  return ctx;
}

/** The suggested wires for the open scene (F23). */
export function useSuggestions() {
  const { scene, doc } = useAssembly();
  return React.useMemo(() => suggestWires(scene, doc), [scene, doc]);
}
