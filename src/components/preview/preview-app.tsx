"use client";

// Product Preview (the Assembly + Wiring plan D3, P3): the finished product
// to look at — the assembly exactly as Assembly placed it, never changed
// here. Explode it along its stacking axis with each part named (F32), cut a
// section, hide the lid, turn it, look from a side (F33); read the fit report
// and the wire list (F34); keep a snapshot in the project's Media (F35).
// Editing lives in Assembly: one control, one home. The flow ends here with
// Finish (EditorSave's saved dialog).

import * as React from "react";
import { Camera01Icon, Layers01Icon, Rotate360Icon, ScissorIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useEditorScope, useStepNav } from "@/components/manual/use-step-nav";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { LeftRail } from "@/components/pcb/left-rail";
import { LeftPanel } from "@/components/pcb/left-panel";
import { Button, Segmented, Slider } from "@/components/ideeza";
import { AssemblyProvider, useAssembly } from "@/components/assembly/assembly-store";
import { AssemblyCanvas } from "@/components/assembly/assembly-canvas";
import type { CanvasView } from "@/components/assembly/assembly-canvas-impl";
import { describeIssue } from "@/lib/assembly/scene";
import { addSnapshot } from "@/lib/manual/snapshots";
import { cn } from "@/lib/utils";

const TOOLBAR_H = 44;
const TOP = 62 + TOOLBAR_H;
const RAIL = 74;
const LEFT = 292;
const RIGHT = 292;
const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function PreviewApp() {
  return (
    <AssemblyProvider readOnly>
      <PreviewBody />
    </AssemblyProvider>
  );
}

function PreviewBody() {
  const a = useAssembly();
  const { go: goStep, activeProject } = useStepNav();
  const editor = useEditorScope();
  const { scene, doc } = a;
  const [explode, setExplode] = React.useState(0);
  const [hideLid, setHideLid] = React.useState(false);
  const [turntable, setTurntable] = React.useState(false);
  const [view, setView] = React.useState<{ name: CanvasView; tick: number }>({ name: "iso", tick: 0 });
  const [selected, setSelected] = React.useState<string | null>(null);
  const canvasBox = React.useRef<HTMLDivElement>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Explode / Collapse ease over 240 ms (none with reduced motion); the slider is direct.
  const animateTo = (to: number) => {
    if (reduced) {
      setExplode(to);
      return;
    }
    const from = explode;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 240);
      setExplode(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const snapshot = () => {
    const canvas = canvasBox.current?.querySelector("canvas");
    if (!canvas || !activeProject || !editor) return;
    const png = canvas.toDataURL("image/png");
    const name = (editor.productName || activeProject.name || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
    const link = document.createElement("a");
    link.href = png;
    link.download = `${name}-preview.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // A smaller JPEG copy goes to the project's Media.
    const w = Math.min(960, canvas.width);
    const h = Math.round((canvas.height * w) / canvas.width);
    const small = document.createElement("canvas");
    small.width = w;
    small.height = h;
    small.getContext("2d")?.drawImage(canvas, 0, 0, w, h);
    const r = addSnapshot(
      activeProject.id,
      { id: `snap-${Date.now().toString(36)}`, productId: editor.scope.productId, productName: editor.productName || "Main product", dataUrl: small.toDataURL("image/jpeg", 0.82), at: Date.now() },
      window.localStorage,
    );
    a.flash(r.kept ? `Saved ${name}-preview.png, and a copy in the project's Media${r.dropped ? ` (the oldest ${r.dropped === 1 ? "one" : r.dropped} made room)` : ""}.` : `Saved ${name}-preview.png. The Media copy didn't fit in this browser's storage.`);
  };

  const fit = scene.fit;
  const lid = scene.items.some((i) => i.part.enclosure?.role === "lid");
  const unplaced = scene.items.filter((i) => !i.placed).length;
  const pct = Math.round(explode * 100);

  return (
    <EditorShell>
      <TopBar />
      <div role="toolbar" aria-label="Preview tools" className="absolute inset-x-0 z-[16] flex items-center gap-2 overflow-x-auto border-b border-solid border-border-subtle bg-bg-surface px-4" style={{ top: 62, height: TOOLBAR_H }}>
        <Button hierarchy={explode > 0.5 ? "tonal" : "ghost"} size="sm" aria-pressed={explode > 0.5} iconLeading={<Icon icon={Layers01Icon} size={16} />} onClick={() => animateTo(explode > 0.5 ? 0 : 1)} className="shrink-0 px-3">
          {explode > 0.5 ? "Collapse" : "Explode"}
        </Button>
        <div className="w-[180px] shrink-0">
          <Slider value={pct} min={0} max={100} step={1} onValueChange={(v) => setExplode(v / 100)} valueLabel={(v) => `${v}% apart`} />
        </div>
        <span className="w-10 shrink-0 font-mono text-xs leading-xs text-text-secondary">{pct}%</span>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border-default" />
        <Button hierarchy={a.section.on ? "tonal" : "ghost"} size="sm" aria-pressed={a.section.on} iconLeading={<Icon icon={ScissorIcon} size={16} />} onClick={() => a.setSection({ on: !a.section.on })} className="shrink-0 px-3">
          Section
        </Button>
        <Button
          hierarchy={hideLid ? "tonal" : "ghost"}
          size="sm"
          aria-pressed={hideLid}
          aria-disabled={!lid || undefined}
          title={lid ? "Hide the lid" : "There is no lid in the assembly"}
          iconLeading={<Icon icon={ViewOffIcon} size={16} />}
          onClick={() => (lid ? setHideLid((v) => !v) : a.flash("There is no lid in the assembly."))}
          className={cn("shrink-0 px-3", !lid && "opacity-50")}
        >
          Hide lid
        </Button>
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border-default" />
        <Segmented
          label="View from"
          size="sm"
          value={view.name}
          onChange={(name) => setView((v) => ({ name, tick: v.tick + 1 }))}
          options={[
            { value: "iso", label: "Iso" },
            { value: "front", label: "Front" },
            { value: "top", label: "Top" },
            { value: "right", label: "Right" },
          ]}
          className="shrink-0"
        />
        <Button hierarchy={turntable ? "tonal" : "ghost"} size="sm" aria-pressed={turntable} iconLeading={<Icon icon={Rotate360Icon} size={16} />} onClick={() => setTurntable((v) => !v)} className="shrink-0 px-3">
          Turn
        </Button>
        <span className="flex-1" />
        <Button hierarchy="secondary" size="sm" iconLeading={<Icon icon={Camera01Icon} size={16} />} onClick={snapshot} className="shrink-0">
          Snapshot
        </Button>
        <Button hierarchy="ghost" size="sm" onClick={() => goStep("assembly")} className="shrink-0">
          Edit in Assembly
        </Button>
      </div>

      <LeftRail topOffset={TOP} bottomOffset={0} activeKey="preview" />
      <LeftPanel
        topOffset={TOP}
        bottomOffset={0}
        hideProjectTree
        aiContext="preview"
        moduleSlot={
          <div className="flex flex-col gap-1 pb-6">
            <h3 className="px-3 pb-2 pt-5 text-xs font-semibold uppercase leading-xs tracking-caps text-text-tertiary">Parts</h3>
            {scene.items.length === 0 && <p className="px-3 text-xs leading-xs text-text-tertiary">Nothing assembled yet. Bring parts in and place them in Assembly.</p>}
            {scene.items.map((i) => (
              <button
                key={i.rec.id}
                type="button"
                aria-pressed={selected === i.rec.id}
                onClick={() => setSelected((s) => (s === i.rec.id ? null : i.rec.id))}
                className={cn("flex items-center gap-3 rounded-md border-0 px-3 py-2 text-left", selected === i.rec.id ? "bg-bg-brand-subtle" : "bg-transparent hover:bg-bg-subtle")}
              >
                <span aria-hidden className="size-[9px] shrink-0 rounded-full border border-solid border-border-strong" style={{ background: i.part.solids[0]?.color }} />
                <span className={cn("min-w-0 flex-1 truncate text-sm leading-xs", selected === i.rec.id ? "font-semibold text-text-brand" : "text-text-primary")}>{i.part.name}</span>
                {!i.placed && <span className="text-xs leading-xs text-text-warning">not placed</span>}
              </button>
            ))}
            <h3 className="px-3 pb-2 pt-5 text-xs font-semibold uppercase leading-xs tracking-caps text-text-tertiary">Fit report</h3>
            <div className="mx-3 flex flex-col gap-2 rounded-lg border border-solid border-border-subtle p-4">
              {!doc.brought ? (
                <p className="text-sm leading-xs text-text-secondary">Not assembled yet.</p>
              ) : fit.problems.length ? (
                <>
                  <p className="text-sm font-semibold leading-xs text-text-error">
                    {fit.problems.length} {fit.problems.length === 1 ? "problem" : "problems"}
                  </p>
                  {fit.problems.slice(0, 3).map((p, k) => (
                    <p key={k} className="text-xs leading-xs text-text-secondary">
                      {describeIssue(p, doc.clearanceMm)}
                    </p>
                  ))}
                </>
              ) : (
                <p className="text-sm font-semibold leading-xs text-text-success">{unplaced ? `${unplaced} not placed yet` : "Everything fits"}</p>
              )}
              {scene.lid && <p className="text-xs leading-xs text-text-secondary">{scene.lid.gap >= 0 ? `The lid closes, ${r1(scene.lid.gap)} mm over ${scene.lid.part}.` : `The lid can't close: ${scene.lid.part} is ${r1(-scene.lid.gap)} mm too tall.`}</p>}
              <div>
                <Button hierarchy="secondary" size="sm" onClick={() => goStep("assembly")}>
                  {fit.problems.length || unplaced ? "Fix in Assembly" : "Open Assembly"}
                </Button>
              </div>
            </div>
          </div>
        }
      />

      <div ref={canvasBox} className="absolute overflow-hidden bg-bg-page" style={{ top: TOP, left: RAIL + LEFT, right: RIGHT, bottom: 0 }} onContextMenu={(e) => e.preventDefault()}>
        {a.hydrated && (
          <AssemblyCanvas
            scene={scene}
            wires={doc.wires.map((rec) => ({ rec, geom: a.wires.get(rec.id)! })).filter((w) => w.geom)}
            mode="preview"
            selectedInst={selected}
            selectedWire={null}
            problemSolids={[]}
            tool={null}
            snapFrom={null}
            wireFrom={null}
            measure={[]}
            section={a.section}
            explode={explode}
            hideLid={hideLid}
            labels
            fitTick={a.fitTick}
            view={view}
            turntable={turntable}
            onSelectInst={setSelected}
            onSelectWire={() => {}}
            onPickFeature={() => {}}
            onPickPin={() => {}}
            onMeasurePoint={() => {}}
            onWirePoint={() => {}}
            onMovePreview={() => {}}
            onMoveCommit={() => {}}
          />
        )}
        {a.hydrated && scene.items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="flex max-w-[380px] flex-col items-center gap-3 rounded-xl border border-solid border-border-default bg-bg-surface p-6 text-center shadow-3">
              <p className="text-md font-semibold leading-md text-text-primary">Nothing to preview yet</p>
              <p className="text-sm leading-sm text-text-secondary">Bring the board and the case into Assembly and place them; they show here, ready to explode, cut and photograph.</p>
              <Button hierarchy="primary" size="md" onClick={() => goStep("assembly")}>
                Open Assembly
              </Button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => goStep("assembly")}
          className="absolute bottom-5 left-5 z-[6] inline-flex items-center gap-3 rounded-3xl border border-solid border-border-default bg-bg-surface px-8 py-3 text-md font-semibold leading-md text-text-primary shadow-2 hover:bg-bg-subtle"
        >
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back to Assembly
        </button>
        <button
          type="button"
          onClick={() => goStep("brief")}
          className="absolute bottom-5 right-5 z-[6] inline-flex items-center gap-3 rounded-3xl border-0 bg-bg-brand px-8 py-3 text-md font-bold leading-md text-text-on-brand shadow-3 hover:bg-bg-brand-hover"
        >
          Finish
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <aside aria-label="Details" className="absolute bottom-0 right-0 overflow-y-auto border-l border-solid border-border-subtle bg-bg-surface" style={{ top: TOP, width: RIGHT }}>
        <section className="flex flex-col gap-3 border-b border-solid border-border-subtle px-6 py-5">
          <h3 className="text-sm font-semibold leading-xs text-text-primary">Wire list</h3>
          {doc.wires.length === 0 ? (
            <p className="text-xs leading-xs text-text-tertiary">No wires yet. They are drawn in Assembly › Wiring.</p>
          ) : (
            <table className="w-full border-collapse text-xs leading-xs">
              <thead>
                <tr className="text-left text-text-tertiary">
                  <th className="py-1 pr-2 font-medium">From → To</th>
                  <th className="py-1 pr-2 font-medium">AWG</th>
                  <th className="py-1 text-right font-medium">Cut mm</th>
                </tr>
              </thead>
              <tbody>
                {doc.wires.map((w) => {
                  const g = a.wires.get(w.id);
                  return (
                    <tr key={w.id} className="border-t border-solid border-border-subtle text-text-primary">
                      <td className="py-1 pr-2">
                        <span aria-hidden className="mr-2 inline-block size-[8px] rounded-full" style={{ background: w.color }} />
                        {g?.from?.pin.label ?? "?"} → {g?.to?.pin.label ?? "?"}
                      </td>
                      <td className="py-1 pr-2 font-mono">{w.gauge}</td>
                      <td className="py-1 text-right font-mono">{g ? r1(g.cut) : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {explode > 0 && doc.wires.length > 0 && <p className="text-xs leading-xs text-text-tertiary">Wires hide while the product is exploded.</p>}
        </section>
        <section className="flex flex-col gap-2 px-6 py-5">
          <h3 className="text-sm font-semibold leading-xs text-text-primary">{selected ? (scene.items.find((i) => i.rec.id === selected)?.part.name ?? "Part") : "View only"}</h3>
          <p className="text-xs leading-xs text-text-tertiary">
            {selected ? scene.items.find((i) => i.rec.id === selected)?.part.origin : "This is the product as Assembly placed it. Nothing moves here: edit it in Assembly."}
          </p>
        </section>
      </aside>

      {a.toast && (
        <div role="status" aria-live="polite" className="absolute bottom-20 left-1/2 z-toast max-w-[560px] -translate-x-1/2 rounded-lg bg-bg-toast px-6 py-3 text-center text-sm font-medium leading-sm text-text-on-toast shadow-4">
          {a.toast}
        </div>
      )}
    </EditorShell>
  );
}
