"use client";

// The build review's 3D tab — the Figma "3D Module" (Creator Panel V3.0,
// 47167:21997), eleven states over one assembly (lib/three/assembly.ts).
// This file owns the view state — explode, which systems show, hover,
// selection, isolation, fullscreen, the camera — and lays the viewer, its
// controls and the rail out; the WebGL scene only draws what it is told and
// reports what is under the pointer. Nothing here is persisted: a view is
// how you are looking, not something the build is.

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Assembly, SystemId } from "@/lib/three/assembly";
import { AssemblyViewer } from "./assembly-viewer";
import { OverviewRail, PartRail, SkeletonRail, type ShellNote } from "./model-rail";
import { Grounds, IsolatedBadge, Rings } from "./model-overlays";
import { LoadingCard, NothingToShow, ViewerFailed } from "./model-states";
import { ExitFullscreen, ExplodeCard, Hint, Presets, Toolbar } from "./viewer-controls";
import type { CameraCommand, ScreenBox, ViewPreset } from "./viewer-types";

export type View = {
  explode: number;
  hidden: ReadonlySet<SystemId>;
  hoverId: string | null;
  selectedId: string | null;
  isolatedId: string | null;
  fullscreen: boolean;
  preset: ViewPreset;
  cameraNonce: number;
  cameraCommand: CameraCommand | null;
};

export type ViewAction =
  | { t: "explode"; v: number }
  | { t: "toggleSystem"; id: SystemId }
  | { t: "showAll" }
  | { t: "hover"; id: string | null }
  | { t: "select"; id: string | null }
  | { t: "isolate" }
  | { t: "exitIsolation" }
  | { t: "wholeModel" }
  | { t: "fullscreen"; on: boolean }
  | { t: "preset"; p: ViewPreset }
  | { t: "camera"; c: CameraCommand }
  | { t: "reset" }
  | { t: "escape" };

export const INITIAL_VIEW: View = {
  explode: 0,
  hidden: new Set(),
  hoverId: null,
  selectedId: null,
  isolatedId: null,
  fullscreen: false,
  preset: "iso",
  cameraNonce: 0,
  cameraCommand: null,
};

/** The panel's rules, kept pure so they can be read at a glance and driven
 *  from a test. `systemOf` answers which system a part id belongs to. */
export function viewReducer(v: View, a: ViewAction, systemOf: (id: string) => SystemId | undefined): View {
  switch (a.t) {
    case "explode":
      return { ...v, explode: Math.min(100, Math.max(0, a.v)) };
    case "toggleSystem": {
      const hidden = new Set(v.hidden);
      if (hidden.has(a.id)) hidden.delete(a.id);
      else hidden.add(a.id);
      // Hiding the system a picked part is in takes the pick with it.
      const gone = (id: string | null) => !!id && hidden.has(systemOf(id) as SystemId);
      return {
        ...v,
        hidden,
        selectedId: gone(v.selectedId) ? null : v.selectedId,
        isolatedId: gone(v.isolatedId) ? null : v.isolatedId,
        hoverId: gone(v.hoverId) ? null : v.hoverId,
      };
    }
    case "showAll":
      return { ...v, hidden: new Set() };
    case "hover":
      return v.hoverId === a.id ? v : { ...v, hoverId: a.id };
    case "select":
      return { ...v, selectedId: a.id, isolatedId: a.id === null ? null : v.isolatedId === a.id ? v.isolatedId : null };
    case "isolate":
      return v.selectedId ? { ...v, isolatedId: v.selectedId, hoverId: null } : v;
    case "exitIsolation":
      return { ...v, isolatedId: null };
    case "wholeModel":
      return { ...v, isolatedId: null, selectedId: null };
    case "fullscreen":
      return { ...v, fullscreen: a.on };
    case "preset":
      return { ...v, preset: a.p };
    case "camera":
      return {
        ...v,
        cameraCommand: a.c,
        cameraNonce: v.cameraNonce + 1,
        preset: a.c === "home" ? "iso" : v.preset,
      };
    case "reset":
      return { ...v, explode: 0, preset: "iso", cameraCommand: "home", cameraNonce: v.cameraNonce + 1 };
    case "escape":
      if (v.isolatedId) return { ...v, isolatedId: null };
      if (v.selectedId) return { ...v, selectedId: null };
      if (v.fullscreen) return { ...v, fullscreen: false };
      return v;
  }
}

// In fullscreen the rail floats inside the viewer (258 wide, 16 in), and the
// presets and the explode card centre on the room to its right. Offsets
// inside the viewer are one less than Figma's: they are measured from inside
// its 1 px border, and Figma's stroke sits within the frame.
const FLOAT_RAIL = "w-[258px]";
const RIGHT_OF_RAIL = "left-[calc(273px+(100%-273px)/2)] -translate-x-1/2";

export function ModelPanel({
  assembly,
  shellNote = null,
  onRetryMesh,
}: {
  assembly: Assembly;
  shellNote?: ShellNote;
  onRetryMesh?: () => void;
}) {
  const systemOf = React.useCallback(
    (id: string) => assembly.parts.find((p) => p.id === id)?.system,
    [assembly.parts],
  );
  const [view, dispatch] = React.useReducer(
    (v: View, a: ViewAction) => viewReducer(v, a, systemOf),
    INITIAL_VIEW,
  );
  const [boxes, setBoxes] = React.useState<{ hover?: ScreenBox; selected?: ScreenBox }>({});
  const [ready, setReady] = React.useState(false);
  // The viewer's code arrives in its own chunk before the scene can draw:
  // the bar says which of the two it is waiting on.
  const [mounted, setMounted] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [overlayFs, setOverlayFs] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const viewerRef = React.useRef<HTMLDivElement>(null);

  const partById = React.useMemo(() => new Map(assembly.parts.map((p) => [p.id, p])), [assembly.parts]);
  const visibleParts = assembly.parts.filter((p) => !view.hidden.has(p.system));
  const allHidden = visibleParts.length === 0;
  const selected = view.selectedId ? partById.get(view.selectedId) ?? null : null;
  const hovered = view.hoverId ? partById.get(view.hoverId) ?? null : null;
  const loading = !ready && !failed && !allHidden;

  // ── Fullscreen: the browser's own when it allows it, else a fixed overlay
  // over the viewport. Leaving it either way (Esc, the ×, the browser's own
  // gesture) lands back in the same state.
  const enterFullscreen = React.useCallback(async () => {
    dispatch({ t: "fullscreen", on: true });
    const el = panelRef.current;
    try {
      if (!el?.requestFullscreen) throw new Error("no fullscreen");
      await el.requestFullscreen();
      setOverlayFs(false);
    } catch {
      setOverlayFs(true);
    }
  }, []);
  const exitFullscreen = React.useCallback(() => {
    dispatch({ t: "fullscreen", on: false });
  }, []);
  // The overlay only counts while fullscreen is on; a stale flag from last
  // time is simply not read.
  const overlayActive = view.fullscreen && overlayFs;
  React.useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement && !overlayActive) dispatch({ t: "fullscreen", on: false });
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [overlayActive]);
  React.useEffect(() => {
    if (!view.fullscreen && document.fullscreenElement === panelRef.current) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [view.fullscreen]);

  // ── Esc, wherever focus is on the page: isolated → selected → fullscreen.
  // A field being typed in keeps its own Esc.
  const hasEscape = Boolean(view.isolatedId || view.selectedId || view.fullscreen);
  React.useEffect(() => {
    if (!hasEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (t?.closest('[role="dialog"]')) return;
      dispatch({ t: "escape" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasEscape]);

  // ── The viewer from the keyboard: ←/→ step through the visible parts in
  // the rail's order, Enter picks the one named.
  const onViewerKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const list = view.isolatedId ? visibleParts.filter((p) => p.id === view.isolatedId) : visibleParts;
    if (!list.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const at = list.findIndex((p) => p.id === view.hoverId);
      const step = e.key === "ArrowRight" ? 1 : -1;
      const next = list[(at + step + list.length) % list.length] ?? list[0];
      dispatch({ t: "hover", id: next.id });
    } else if (e.key === "Enter" && view.hoverId) {
      e.preventDefault();
      dispatch({ t: "select", id: view.hoverId });
    }
  };

  const hint = (() => {
    if (loading) return "This usually takes a few seconds";
    if (view.isolatedId) return "Isolated view · Esc to return to the model";
    if (allHidden) return `0 of ${assembly.parts.length} parts visible`;
    if (view.selectedId) return "1 part selected · Esc to clear";
    if (view.fullscreen) return "Fullscreen · press Esc to exit";
    if (view.hidden.size > 0) {
      const k = view.hidden.size;
      return `${k} ${k === 1 ? "system" : "systems"} hidden · ${visibleParts.length} parts visible`;
    }
    if (view.explode === 100)
      return (
        <>
          PARTS INVENTORY · {assembly.parts.length} ·{" "}
          <span className="text-xs font-normal leading-xs tracking-normal">
            Every part separated · hover to identify
          </span>
        </>
      );
    if (view.explode > 0) return "Drag to pan · Click a part to inspect";
    return "Click a part to inspect it";
  })();

  const fullscreen = view.fullscreen;
  // The picked part is named in the rail; the tooltip is for the one the
  // pointer is on otherwise (3D-04 shows none over the selection).
  const tooltip = hovered && hovered.id !== view.selectedId ? `${hovered.name} · ${hovered.ref}` : undefined;
  const announced = hovered ? `${hovered.name} · ${hovered.ref}` : "";

  const rail = (face: "side" | "float") => {
    const cls =
      face === "float"
        ? cn(FLOAT_RAIL, "max-h-[calc(100%-72px)]")
        : "w-full [@container(min-width:880px)]:h-[522px] [@container(min-width:880px)]:w-[282px] [@container(min-width:880px)]:shrink-0";
    if (loading) return <SkeletonRail className={cls} />;
    if (selected && face === "side")
      return (
        <PartRail
          assembly={assembly}
          part={selected}
          isolated={view.isolatedId === selected.id}
          shellNote={shellNote}
          onRetryMesh={onRetryMesh}
          onClose={() => dispatch({ t: "select", id: null })}
          onIsolate={() => dispatch({ t: "isolate" })}
          onExitIsolation={() => dispatch({ t: "exitIsolation" })}
          onWholeModel={() => dispatch({ t: "wholeModel" })}
          onSelect={(id) => dispatch({ t: "select", id })}
          className={cls}
        />
      );
    return (
      <OverviewRail
        assembly={assembly}
        hidden={view.hidden}
        onToggle={(id) => dispatch({ t: "toggleSystem", id })}
        compact={face === "float"}
        className={cls}
      />
    );
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "flex gap-[14px] border border-solid border-card-border bg-bg-surface p-[14px]",
        fullscreen
          ? cn("h-full w-full rounded-none", overlayActive && "fixed inset-0 z-modal")
          : "flex-col rounded-2xl [@container(min-width:880px)]:flex-row",
      )}
    >
      <div
        ref={viewerRef}
        tabIndex={0}
        role="application"
        aria-label={`3D model of ${assembly.title}`}
        onKeyDown={onViewerKey}
        className={cn(
          "relative min-w-0 overflow-hidden rounded-xl border border-solid border-border bg-bg-subtle outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          // Stacked, the viewer keeps its height: flex-1 in a column would
          // set its basis to 0 and collapse it to its border.
          fullscreen
            ? "h-full flex-1"
            : "h-[522px] w-full [@container(min-width:880px)]:w-auto [@container(min-width:880px)]:flex-1",
        )}
      >
        {/* Behind the model: the grounds under a hovered or picked part. */}
        {/* Isolated, the part is the whole view: no rings round it (3D-07). */}
        {ready && !allHidden && !view.isolatedId && <Grounds hover={boxes.hover} selected={boxes.selected} />}

        {!allHidden && !failed && (
          <AssemblyViewer
            key={attempt}
            assembly={assembly}
            explode={view.explode}
            hidden={view.hidden}
            isolatedId={view.isolatedId}
            hoverId={view.hoverId}
            selectedId={view.selectedId}
            preset={view.preset}
            cameraNonce={view.cameraNonce}
            cameraCommand={view.cameraCommand}
            panWithLeft={view.explode > 0 && !view.isolatedId}
            onHover={(id) => dispatch({ t: "hover", id })}
            onPick={(id) => dispatch({ t: "select", id })}
            onBoxes={setBoxes}
            onMounted={() => setMounted(true)}
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        )}

        {/* In front of it: the rings, the tooltip, the isolated badge. */}
        {ready && !allHidden && !view.isolatedId && (
          <Rings hover={boxes.hover} selected={boxes.selected} tooltip={tooltip} />
        )}
        {view.isolatedId && (
          // Figma puts the badge under the toolbar; it sits beside it here,
          // top-aligned, so neither covers the other.
          <div className="pointer-events-none absolute left-[67px] top-[21px]">
            <IsolatedBadge of={assembly.parts.length} />
          </div>
        )}

        {!fullscreen && !loading && !failed && (
          <div className="absolute left-[15px] top-[15px]">
            <Toolbar onCamera={(c) => dispatch({ t: "camera", c })} onFullscreen={enterFullscreen} />
          </div>
        )}

        {fullscreen && (
          <>
            {!loading && (
              <div className="absolute left-[15px] top-[51px] flex">{rail("float")}</div>
            )}
            <div className={cn("absolute top-[15px]", RIGHT_OF_RAIL)}>
              <Presets value={view.preset} onChange={(p) => dispatch({ t: "preset", p })} />
            </div>
            <div className="absolute right-[15px] top-[15px]">
              <ExitFullscreen onExit={exitFullscreen} />
            </div>
          </>
        )}

        {/* The explode card and the hint, bottom-centre. Isolation hides the
            card (one part has nothing to spread) and keeps the hint. */}
        {!failed && (
          <div
            className={cn(
              "absolute bottom-[7px] flex flex-col items-center gap-[8px]",
              fullscreen ? RIGHT_OF_RAIL : "inset-x-[15px]",
            )}
          >
            {!loading && !view.isolatedId && (
              <ExplodeCard
                value={view.explode}
                onChange={(v) => dispatch({ t: "explode", v })}
                onReset={() => dispatch({ t: "reset" })}
              />
            )}
            {!loading && <Hint>{hint}</Hint>}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[20px] px-[16px]">
            <LoadingCard parts={assembly.parts.length} progress={mounted ? 70 : 20} />
            <Hint>{hint}</Hint>
          </div>
        )}
        {allHidden && !failed && (
          <div className="absolute inset-0 flex items-center justify-center px-[16px]">
            <NothingToShow onShowAll={() => dispatch({ t: "showAll" })} />
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center px-[16px]">
            <ViewerFailed
              onRetry={() => {
                setFailed(false);
                setReady(false);
                setMounted(false);
                setAttempt((n) => n + 1);
              }}
            />
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {announced}
        </span>
      </div>

      {!fullscreen && rail("side")}
    </div>
  );
}
