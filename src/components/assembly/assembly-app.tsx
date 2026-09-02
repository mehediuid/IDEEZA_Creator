"use client";

// Assembly — the module between 3D Module and Peripheral Wiring (UIUX-80).
// It reads the project's real PCB document and turns the board's placed parts
// into an assembly checklist: designator + footprint per row, grouped by the
// side of the board each part sits on, with check-off progress persisted per
// project. The wider assembly workflow is still being scoped with the client;
// what ships here is real — the list is the board, not a mock.

import * as React from "react";
import { useStepNav } from "@/components/manual/use-step-nav";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { LeftRail } from "@/components/pcb/left-rail";
import { Button, Checkbox } from "@/components/ideeza";

const TOP = 62; // TopBar height
const LEFT_RAIL = 74;
const BOTTOM = 36;

const PCB_DOC_PREFIX = "ideeza:pcb:doc:";
const PROGRESS_PREFIX = "ideeza:assembly:";

interface AssemblyPart {
  id: string;
  designator: string;
  footprint: string;
  side: "top" | "bottom";
}

// The board's parts: PCB-scoped objects that carry a designator and a land
// pattern (converted footprints and picker-placed parts alike). Pads, vias,
// tracks and regions are copper, not parts to place, so they stay out.
function readParts(projectId: string | null): AssemblyPart[] {
  if (!projectId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PCB_DOC_PREFIX + projectId);
    if (!raw) return [];
    const doc = JSON.parse(raw) as { objects?: Array<Record<string, unknown>> };
    if (!Array.isArray(doc.objects)) return [];
    return doc.objects
      .filter(
        (o) =>
          o.scope === "pcb" &&
          typeof o.text === "string" &&
          o.text &&
          typeof o.footprint === "string" &&
          o.footprint,
      )
      .map((o) => ({
        id: String(o.id),
        designator: String(o.text),
        footprint: String(o.footprint),
        side: o.side === "bottom" ? ("bottom" as const) : ("top" as const),
      }));
  } catch {
    return [];
  }
}

function readProgress(projectId: string | null): Record<string, boolean> {
  if (!projectId || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_PREFIX + projectId);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function AssemblyApp() {
  const { go, activeProject } = useStepNav();
  const projectId = activeProject?.id ?? null;

  const [parts, setParts] = React.useState<AssemblyPart[]>([]);
  const [done, setDone] = React.useState<Record<string, boolean>>({});

  // The doc lives in localStorage (written by the PCB editor), so read it on
  // mount — this module opens after the board work, not alongside it.
  React.useEffect(() => {
    setParts(readParts(projectId));
    setDone(readProgress(projectId));
  }, [projectId]);

  const toggle = (id: string) => {
    setDone((d) => {
      const next = { ...d, [id]: !d[id] };
      try {
        if (projectId) window.localStorage.setItem(PROGRESS_PREFIX + projectId, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const resetProgress = () => {
    setDone({});
    try {
      if (projectId) window.localStorage.removeItem(PROGRESS_PREFIX + projectId);
    } catch {}
  };

  const placed = parts.filter((p) => done[p.id]).length;
  const top = parts.filter((p) => p.side === "top");
  const bottom = parts.filter((p) => p.side === "bottom");

  return (
    <EditorShell>
      <TopBar />
      <LeftRail topOffset={TOP} bottomOffset={BOTTOM} activeKey="assembly" />

      <div
        style={{
          position: "absolute",
          top: TOP,
          left: LEFT_RAIL,
          right: 0,
          bottom: BOTTOM,
          overflowY: "auto",
          background: "var(--color-bg-page)",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "var(--spacing-12) var(--spacing-10) var(--spacing-16)" }}>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
            Assembly
          </h1>
          <div style={{ marginTop: "var(--spacing-2)", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>
            Place the board&apos;s parts and check each one off — the list is read from this project&apos;s PCB.
          </div>

          {parts.length === 0 ? (
            <div
              style={{
                marginTop: "var(--spacing-12)",
                padding: "var(--spacing-12)",
                border: "var(--border-width-1) dashed var(--color-border-strong)",
                borderRadius: "var(--radius-xl)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-text-primary)" }}>
                No parts on the board yet
              </div>
              <div style={{ marginTop: "var(--spacing-3)", fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", lineHeight: 1.6 }}>
                Draw the circuit in PCB Design and convert it (Design ▸ Generate PCB) — the parts land here as an
                assembly checklist.
              </div>
              <div style={{ marginTop: "var(--spacing-8)" }}>
                <Button hierarchy="primary" size="md" onClick={() => go("pcb")}>
                  Open PCB Design
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Progress — a count and a filled track: state feedback, not decoration. */}
              <div style={{ marginTop: "var(--spacing-10)", display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
                <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                  {placed} of {parts.length} placed
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={placed}
                  aria-valuemin={0}
                  aria-valuemax={parts.length}
                  aria-label="Assembly progress"
                  style={{ flex: 1, height: 6, borderRadius: "var(--radius-full)", background: "var(--color-bg-subtle)", overflow: "hidden" }}
                >
                  <div
                    style={{
                      width: `${parts.length ? Math.round((placed / parts.length) * 100) : 0}%`,
                      height: "100%",
                      borderRadius: "var(--radius-full)",
                      background: "var(--color-violet-600)",
                    }}
                  />
                </div>
                {placed > 0 && (
                  <button
                    className="ix-btn"
                    onClick={resetProgress}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-tertiary)",
                      padding: "var(--spacing-2) var(--spacing-3)",
                    }}
                  >
                    Reset progress
                  </button>
                )}
              </div>

              <SideSection title="Top side" parts={top} done={done} onToggle={toggle} />
              <SideSection title="Bottom side" parts={bottom} done={done} onToggle={toggle} />
            </>
          )}
        </div>
      </div>

      {/* flow pills — Assembly sits between 3D Module and Peripheral Wiring. */}
      <FlowPill kind="back" label="Back to 3D" onClick={() => go("three")} style={{ left: LEFT_RAIL + 20, bottom: BOTTOM + 16 }} />
      <FlowPill kind="forward" label="Continue to Peripheral Wiring" onClick={() => go("wiring")} style={{ right: 20, bottom: BOTTOM + 16 }} />

      {/* bottom bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: BOTTOM,
          background: "var(--color-bg-surface)",
          borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
          zIndex: 12,
          display: "flex",
          alignItems: "center",
          padding: "0 var(--spacing-8)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-tertiary)",
        }}
      >
        Assembly · check parts off as they go onto the board
      </div>
    </EditorShell>
  );
}

function SideSection({
  title,
  parts,
  done,
  onToggle,
}: {
  title: string;
  parts: AssemblyPart[];
  done: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  if (parts.length === 0) return null;
  return (
    <div style={{ marginTop: "var(--spacing-10)" }}>
      <div
        style={{
          fontSize: "var(--font-size-xs)",
          fontWeight: 700,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          paddingBottom: "var(--spacing-3)",
          borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        }}
      >
        {title} · {parts.length}
      </div>
      {parts.map((p) => {
        const checked = !!done[p.id];
        return (
          <button
            key={p.id}
            role="checkbox"
            aria-checked={checked}
            onClick={() => onToggle(p.id)}
            className="ix-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-5)",
              width: "100%",
              minHeight: 40,
              padding: "var(--spacing-3) var(--spacing-4)",
              background: "none",
              border: "none",
              borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Checkbox checked={checked} decorative size="md" />
            <span
              style={{
                fontWeight: 600,
                fontSize: "var(--font-size-sm)",
                color: checked ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                textDecoration: checked ? "line-through" : "none",
                minWidth: 64,
              }}
            >
              {p.designator}
            </span>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
              {p.footprint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Same pill the neighbouring modules draw — each app carries its own copy of
// this tiny presentational piece (see wiring-app.tsx).
function FlowPill({
  kind,
  label,
  onClick,
  style,
}: {
  kind: "back" | "forward";
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  const fwd = kind === "forward";
  return (
    <button
      onClick={onClick}
      className="ix-btn"
      style={{
        position: "absolute",
        zIndex: 18,
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "var(--spacing-3) var(--spacing-8)",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1-5) solid var(--color-border-brand)",
        borderRadius: "var(--radius-3xl)",
        cursor: "pointer",
        color: "var(--color-violet-600)",
        fontWeight: 600,
        fontSize: "var(--font-size-md)",
        boxShadow: "var(--elevation-2)",
        ...style,
      }}
    >
      {!fwd && <Caret dir="left" />}
      {label}
      {fwd && <Caret dir="right" />}
    </button>
  );
}

function Caret({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}
