"use client";

// IDEEZA Wiring module — shared state.
// Holds placed peripheral parts, finished wires, the active Draw tool, the
// in-progress draft (a small step machine: pick pin → set height → pick pin →
// set height → auto-route), and the selected wire. Parts + wires persist per
// project in localStorage. A window.__wiring hook mirrors the key actions for
// deterministic verification.

import * as React from "react";
import {
  DEFAULT_WIRE_PARAMS,
  PERIPHERAL_BY_KIND,
  buildWirePoints,
  pinPos,
  type WireObj,
  type WirePart,
  type WirePoint,
  type WireTool,
} from "@/lib/wiring/types";

type DraftStage = "idle" | "pin1" | "height1" | "pin2" | "height2" | "sketch";

interface WireDraft {
  tool: WireTool;
  stage: DraftStage;
  fromPart?: string;
  fromPin?: string;
  height1: number;
  toPart?: string;
  toPin?: string;
  height2: number;
  sketchPoints: WirePoint[];
  // live cursor in canvas coords for previewing the current segment
  cursor: WirePoint | null;
}

const EMPTY_DRAFT: WireDraft = {
  tool: "twoPoint",
  stage: "idle",
  height1: 60,
  height2: 60,
  sketchPoints: [],
  cursor: null,
};

interface Ctx {
  parts: WirePart[];
  wires: WireObj[];
  tool: WireTool | null;
  draft: WireDraft;
  selectedWireId: string | null;
  hydrated: boolean;
  // tools
  setTool: (t: WireTool | null) => void;
  // parts
  placePart: (kind: string) => void;
  removePart: (id: string) => void;
  // wire drawing
  pickPin: (partId: string, pinId: string) => void;
  setCursor: (p: WirePoint | null) => void;
  setDraftHeight: (h: number) => void;
  confirmHeight: () => void;
  addSketchPoint: (p: WirePoint) => void;
  cancelDraft: () => void;
  // wires
  selectWire: (id: string | null) => void;
  updateWire: (id: string, patch: Partial<WireObj>) => void;
  deleteWire: (id: string) => void;
  // ui
  toast: string | null;
  flashToast: (m: string) => void;
}

const WiringContext = React.createContext<Ctx | null>(null);

function docKey(): string {
  let pid = "default";
  try {
    pid = window.localStorage.getItem("ideeza:manual:active") || "default";
  } catch {}
  return `ideeza:wiring:doc:${pid}`;
}

export function WiringProvider({ children }: { children: React.ReactNode }) {
  const [parts, setParts] = React.useState<WirePart[]>([]);
  const [wires, setWires] = React.useState<WireObj[]>([]);
  const [tool, setToolState] = React.useState<WireTool | null>(null);
  const [draft, setDraft] = React.useState<WireDraft>(EMPTY_DRAFT);
  const [selectedWireId, setSelectedWireId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const counter = React.useRef(1);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashToast = React.useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // One-time hydrate from the external store (localStorage). This is exactly
  // what an effect is for; the strict cascading-render lint doesn't apply.
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(docKey());
      if (raw) {
        const doc = JSON.parse(raw);
        if (Array.isArray(doc.parts)) setParts(doc.parts);
        if (Array.isArray(doc.wires)) setWires(doc.wires);
        const ids = [...(doc.parts ?? []), ...(doc.wires ?? [])]
          .map((o: { id: string }) => parseInt(String(o.id).replace(/\D/g, ""), 10))
          .filter((n) => !Number.isNaN(n));
        counter.current = Math.max(1, ...ids) + 1;
      }
    } catch {}
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // persist (debounced) after hydration
  React.useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(docKey(), JSON.stringify({ parts, wires }));
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [parts, wires, hydrated]);

  const nextId = (prefix: string) => `${prefix}_${counter.current++}`;

  // Synchronous mirrors so multi-step actions in one tick read fresh values
  // and so side-effects never run inside a setState updater (which React
  // double-invokes and would create duplicate wires).
  const draftRef = React.useRef(draft);
  const partsRef = React.useRef(parts);
  const toolRef = React.useRef(tool);
  React.useEffect(() => { partsRef.current = parts; }, [parts]);
  React.useEffect(() => { toolRef.current = tool; }, [tool]);
  const commitDraft = React.useCallback((next: WireDraft) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const setTool = React.useCallback((t: WireTool | null) => {
    toolRef.current = t;
    setToolState(t);
    setSelectedWireId(null);
    commitDraft(t ? { ...EMPTY_DRAFT, tool: t, stage: "pin1" } : EMPTY_DRAFT);
    if (t) flashToast("Select the first pin");
  }, [flashToast, commitDraft]);

  const placePart = React.useCallback((kind: string) => {
    const def = PERIPHERAL_BY_KIND[kind];
    if (!def) return;
    setParts((arr) => {
      const same = arr.filter((p) => p.kind === kind).length;
      const id = nextId("wp");
      const col = arr.length % 3;
      const row = Math.floor(arr.length / 3);
      const next = [
        ...arr,
        { id, kind, name: `${def.label}${same + 1}`, x: 320 + col * 220, y: 240 + row * 170 },
      ];
      partsRef.current = next;
      return next;
    });
    flashToast(`${def.label} placed`);
  }, [flashToast]);

  const removePart = React.useCallback((id: string) => {
    setParts((arr) => { const n = arr.filter((p) => p.id !== id); partsRef.current = n; return n; });
    setWires((arr) => arr.filter((w) => w.fromPart !== id && w.toPart !== id));
  }, []);

  // Create the wire from a finished draft. Pure of updaters — called directly.
  const finish = React.useCallback((d: WireDraft) => {
    const src = partsRef.current;
    const fp = src.find((p) => p.id === d.fromPart);
    const tp = src.find((p) => p.id === d.toPart);
    if (!fp || !tp) return;
    const fDef = PERIPHERAL_BY_KIND[fp.kind]?.pins.find((p) => p.id === d.fromPin);
    const tDef = PERIPHERAL_BY_KIND[tp.kind]?.pins.find((p) => p.id === d.toPin);
    if (!fDef || !tDef) return;
    const from = pinPos(fp, fDef);
    const to = pinPos(tp, tDef);
    const points = buildWirePoints(d.tool, from, to, d.height1, d.height2, d.sketchPoints);
    const id = nextId("w");
    const wire: WireObj = {
      id, tool: d.tool,
      fromPart: d.fromPart!, fromPin: d.fromPin!,
      toPart: d.toPart!, toPin: d.toPin!,
      points, height1: d.height1, height2: d.height2,
      ...DEFAULT_WIRE_PARAMS,
    };
    setWires((arr) => [...arr, wire]);
    setSelectedWireId(id);
    const t = toolRef.current;
    commitDraft(t ? { ...EMPTY_DRAFT, tool: t, stage: "pin1" } : EMPTY_DRAFT);
    flashToast("Wire created");
  }, [flashToast, commitDraft]);

  const pickPin = React.useCallback((partId: string, pinId: string) => {
    const d = draftRef.current;
    if (d.stage === "idle") return;
    if (d.stage === "pin1") {
      if (d.tool === "air" || d.tool === "ai") {
        commitDraft({ ...d, fromPart: partId, fromPin: pinId, stage: "pin2" });
        flashToast("Select the second pin");
      } else if (d.tool === "sketch") {
        commitDraft({ ...d, fromPart: partId, fromPin: pinId, stage: "sketch" });
        flashToast("Click points to draw the path, then click the second pin");
      } else {
        commitDraft({ ...d, fromPart: partId, fromPin: pinId, stage: "height1" });
        flashToast("Set lamination height, then click to confirm");
      }
      return;
    }
    if (d.stage === "pin2" || d.stage === "sketch") {
      if (partId === d.fromPart && pinId === d.fromPin) return; // no self-connect
      const next = { ...d, toPart: partId, toPin: pinId };
      if (d.tool === "air" || d.tool === "ai" || d.tool === "sketch") {
        finish(next);
      } else {
        commitDraft({ ...next, stage: "height2" });
        flashToast("Set the second lamination height, then click to confirm");
      }
    }
  }, [finish, flashToast, commitDraft]);

  const setCursor = React.useCallback((p: WirePoint | null) => {
    const d = draftRef.current;
    if (d.stage === "idle") return;
    commitDraft({ ...d, cursor: p });
  }, [commitDraft]);

  // During a height stage, the cursor Y sets the rise above the pin.
  const setDraftHeight = React.useCallback((h: number) => {
    const d = draftRef.current;
    const v = Math.max(0, Math.round(h));
    if (d.stage === "height1") commitDraft({ ...d, height1: v });
    else if (d.stage === "height2") commitDraft({ ...d, height2: v });
  }, [commitDraft]);

  const confirmHeight = React.useCallback(() => {
    const d = draftRef.current;
    if (d.stage === "height1") {
      commitDraft({ ...d, stage: "pin2" });
      flashToast("Select the second pin");
    } else if (d.stage === "height2") {
      finish(d);
    }
  }, [finish, flashToast, commitDraft]);

  const addSketchPoint = React.useCallback((p: WirePoint) => {
    const d = draftRef.current;
    if (d.stage === "sketch") commitDraft({ ...d, sketchPoints: [...d.sketchPoints, p] });
  }, [commitDraft]);

  const cancelDraft = React.useCallback(() => {
    const t = toolRef.current;
    commitDraft(t ? { ...EMPTY_DRAFT, tool: t, stage: "pin1" } : EMPTY_DRAFT);
  }, [commitDraft]);

  const selectWire = React.useCallback((id: string | null) => {
    setSelectedWireId(id);
    if (id) { toolRef.current = null; setToolState(null); commitDraft(EMPTY_DRAFT); }
  }, [commitDraft]);

  const updateWire = React.useCallback((id: string, patch: Partial<WireObj>) => {
    setWires((arr) => arr.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  const deleteWire = React.useCallback((id: string) => {
    setWires((arr) => arr.filter((w) => w.id !== id));
    setSelectedWireId((cur) => (cur === id ? null : cur));
    flashToast("Wire deleted");
  }, [flashToast]);

  const value: Ctx = {
    parts, wires, tool, draft, selectedWireId, hydrated,
    setTool, placePart, removePart,
    pickPin, setCursor, setDraftHeight, confirmHeight, addSketchPoint, cancelDraft,
    selectWire, updateWire, deleteWire,
    toast, flashToast,
  };

  // Deterministic test hook (mirrors the pointer flow the UI drives).
  React.useEffect(() => {
    (window as unknown as { __wiring?: unknown }).__wiring = {
      state: () => ({ parts, wires, tool, stage: draft.stage, selectedWireId }),
      setTool, placePart, pickPin, setDraftHeight, confirmHeight, addSketchPoint,
      cancelDraft, selectWire, updateWire, deleteWire,
    };
  });

  return <WiringContext.Provider value={value}>{children}</WiringContext.Provider>;
}

export function useWiring(): Ctx {
  const ctx = React.useContext(WiringContext);
  if (!ctx) throw new Error("useWiring must be used inside WiringProvider");
  return ctx;
}
