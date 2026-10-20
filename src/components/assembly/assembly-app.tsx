"use client";

// Assembly (the Assembly + Wiring plan, owner-approved 2026-10-19 with every
// D1–D16 default): where the maker brings in the PCB's 3D and the 3D Module's
// bodies and puts them together — places, snaps, checks the fit, measures,
// cuts a section — and, in Wiring mode (D1/D2: the old Peripheral Wiring
// step, now a mode here), wires the off-board parts to the board in 3D.
// The old parts checklist is gone (D4).

import * as React from "react";
import { useStepNav } from "@/components/manual/use-step-nav";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { LeftRail } from "@/components/pcb/left-rail";
import { LeftPanel } from "@/components/pcb/left-panel";
import { cn } from "@/lib/utils";
import { describeIssue } from "@/lib/assembly/scene";
import { AssemblyProvider, useAssembly } from "./assembly-store";
import { AssemblyCanvas } from "./assembly-canvas";
import { AssemblyToolbar, TOOLBAR_H } from "./assembly-toolbar";
import { AssemblyTree } from "./assembly-tree";
import { AssemblyProps } from "./assembly-props";
import { BringInCard } from "./bring-in";
import { exportGlb } from "./assembly-export";

const TOP = 62 + TOOLBAR_H;
const RAIL = 74;
const LEFT = 292;
const RIGHT = 292;
const STATUS = 32;

export function AssemblyApp() {
  return (
    <AssemblyProvider>
      <AssemblyBody />
    </AssemblyProvider>
  );
}

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

function AssemblyBody() {
  const a = useAssembly();
  const { go, activeProject } = useStepNav();
  const [bringOpen, setBringOpen] = React.useState(false);
  const [view] = React.useState({ name: "iso" as const, tick: 0 });
  const { doc, scene, selection, tool } = a;

  // The old /wiring address opens here in Wiring mode (D1).
  const wantsWiring = React.useRef(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "wiring");
  React.useEffect(() => {
    if (!a.hydrated || !wantsWiring.current) return;
    wantsWiring.current = false;
    a.setMode("wiring");
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [a, a.hydrated]);

  // Keys: Esc leaves a tool, Delete removes the selected wire or snap, ⌘Z / ⇧⌘Z. Ctrl+S is EditorSave's.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "Escape") {
        if (a.tool) a.setTool(null);
        else a.select({ kind: "none" });
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) a.redo();
        else a.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        a.redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selection.kind === "wire") a.deleteWire(selection.id);
        else if (selection.kind === "mate") a.deleteMate(selection.id);
        else return;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [a, selection]);

  const problemSolids = React.useMemo(
    () => scene.fit.problems.flatMap((p) => (p.kind === "outside" ? [] : [{ inst: p.a.inst, solid: p.a.solid }, { inst: p.b.inst, solid: p.b.solid }])),
    [scene.fit.problems],
  );
  const wires = React.useMemo(() => doc.wires.map((rec) => ({ rec, geom: a.wires.get(rec.id)! })).filter((w) => w.geom), [doc.wires, a.wires]);

  const onExport = async () => {
    const name = (activeProject?.name ?? "assembly").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "assembly";
    try {
      const bytes = await exportGlb(scene, `${name}-assembly.glb`);
      a.flash(`Exported ${name}-assembly.glb (${Math.max(1, Math.round(bytes / 1024))} KB): every visible part, in millimetres.`);
    } catch {
      a.flash("The 3D file couldn't be made. Nothing was downloaded.");
    }
  };

  const fitChip = (() => {
    if (!doc.brought) return { tone: "plain" as const, text: "Fit · nothing to check yet" };
    const unplaced = scene.items.filter((i) => !i.placed).length;
    if (scene.fit.problems.length) return { tone: "bad" as const, text: `Fit · ${scene.fit.problems.length} problem${scene.fit.problems.length > 1 ? "s" : ""}: ${describeIssue(scene.fit.problems[0], doc.clearanceMm)}` };
    if (unplaced) return { tone: "plain" as const, text: `Fit · ${unplaced} not placed yet` };
    return { tone: "ok" as const, text: "Fit · OK" };
  })();
  const hint =
    tool === "snap"
      ? a.snapFrom
        ? "Snap: now click where it goes, on another part. Esc cancels."
        : "Snap: click a face or a hole on the part you want to move."
      : tool === "measure"
        ? "Measure: click two points."
        : tool === "wire"
          ? a.wireFrom
            ? "Add wire: pick the second pin."
            : "Add wire: pick the first pin (a dot)."
          : tool === "move" || tool === "rotate"
            ? selection.kind === "inst"
              ? "Drag the handles: 1 mm and 15° steps."
              : "Select a part to move it."
            : doc.mode === "wiring"
              ? "Wiring: dots are pins. Double-click a wire to add a point."
              : doc.brought && scene.items.some((i) => !i.placed)
                ? "New parts wait above the case: select one, then Snap or Place inside."
                : "";

  return (
    <EditorShell>
      <TopBar />
      <AssemblyToolbar onBringIn={() => setBringOpen((v) => !v)} onExport={onExport} />
      <LeftRail topOffset={TOP} bottomOffset={STATUS} activeKey="assembly" />
      <LeftPanel topOffset={TOP} bottomOffset={STATUS} hideProjectTree aiContext="preview" moduleSlot={<AssemblyTree />} />

      <div className="absolute overflow-hidden bg-bg-page" style={{ top: TOP, left: RAIL + LEFT, right: RIGHT, bottom: STATUS }} onContextMenu={(e) => e.preventDefault()}>
        {a.hydrated && (
          <AssemblyCanvas
            scene={scene}
            wires={wires}
            mode={doc.mode}
            selectedInst={selection.kind === "inst" ? selection.id : null}
            selectedWire={selection.kind === "wire" ? selection.id : null}
            problemSolids={problemSolids}
            tool={tool}
            snapFrom={a.snapFrom}
            wireFrom={a.wireFrom}
            measure={a.measure}
            section={a.section}
            explode={0}
            hideLid={false}
            labels={false}
            fitTick={a.fitTick}
            view={view}
            turntable={false}
            onSelectInst={(id) => a.select(id ? { kind: "inst", id } : { kind: "none" })}
            onSelectWire={(id) => a.select({ kind: "wire", id })}
            onPickFeature={a.pickFeature}
            onPickPin={a.pickPin}
            onMeasurePoint={a.addMeasurePoint}
            onWirePoint={a.addWirePoint}
            onMovePreview={a.movePreview}
            onMoveCommit={a.moveCommit}
          />
        )}
        {a.hydrated && (!doc.brought || bringOpen) && (
          <div className={cn("absolute inset-0 z-[5] flex items-center justify-center p-8", bringOpen && doc.brought && "items-start justify-start")}>
            <BringInCard onClose={doc.brought ? () => setBringOpen(false) : undefined} />
          </div>
        )}
        {hint && (
          <div className="pointer-events-none absolute left-4 top-4 z-[4] max-w-[440px] rounded-lg border border-solid border-border-default bg-bg-surface px-4 py-2 text-sm font-medium leading-xs text-text-primary shadow-2">{hint}</div>
        )}
        <FlowPills onBack={() => go("three")} onNext={() => go("preview")} />
      </div>

      <aside aria-label="Properties" className="absolute right-0 overflow-y-auto border-l border-solid border-border-subtle bg-bg-surface" style={{ top: TOP, width: RIGHT, bottom: STATUS }}>
        {a.hydrated && <AssemblyProps />}
      </aside>

      <div className="absolute inset-x-0 bottom-0 z-[12] flex items-center gap-4 border-t border-solid border-border-subtle bg-bg-surface px-6" style={{ height: STATUS }}>
        <button
          type="button"
          disabled={!scene.fit.problems.length}
          onClick={() => a.select({ kind: "problem", index: 0 })}
          className={cn(
            "max-w-[60%] truncate rounded-full border-0 px-4 py-1 text-xs font-semibold leading-xs",
            fitChip.tone === "bad" ? "cursor-pointer bg-bg-error-subtle text-text-error" : fitChip.tone === "ok" ? "bg-bg-success-subtle text-text-success" : "bg-bg-subtle text-text-secondary",
          )}
        >
          {fitChip.text}
        </button>
        <span className="min-w-0 flex-1 truncate text-xs leading-xs text-text-tertiary">
          {doc.mode === "wiring" ? `${doc.wires.length} ${doc.wires.length === 1 ? "wire" : "wires"} · ${(Math.round(doc.wires.reduce((s, w) => s + (a.wires.get(w.id)?.cut ?? 0), 0) * 10) / 10).toFixed(1)} mm to cut` : `${scene.items.length} parts · ${doc.mates.length} snaps`}
        </span>
        <span className="font-mono text-xs leading-xs text-text-tertiary">mm</span>
      </div>

      {a.toast && (
        <div role="status" aria-live="polite" className="absolute bottom-16 left-1/2 z-toast max-w-[560px] -translate-x-1/2 rounded-lg bg-bg-toast px-6 py-3 text-center text-sm font-medium leading-sm text-text-on-toast shadow-4">
          {a.toast}
        </div>
      )}
    </EditorShell>
  );
}

function FlowPills({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const pill =
    "absolute bottom-5 z-[6] inline-flex items-center gap-3 rounded-3xl border-1-5 border-solid border-border-brand bg-bg-surface px-8 py-3 text-md font-semibold leading-md text-text-brand shadow-2 hover:bg-bg-brand-subtle";
  return (
    <>
      <button type="button" className={cn(pill, "left-5")} onClick={onBack}>
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to 3D Module
      </button>
      <button type="button" className={cn(pill, "right-5")} onClick={onNext}>
        Continue to Product Preview
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </>
  );
}
