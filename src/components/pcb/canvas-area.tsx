"use client";

// IDEEZA PCB Software — canvas area.
// Rulers, the Schematic⇄PCB(⇄2D⇄3D) mode segmented control, the mode-specific
// drawing (via buildCanvas), the draggable Floating Tools, and the Plane / Next
// pills. Right-clicking the canvas opens the context menu (Phase 3).

import { Icon } from "@/lib/pcb/icons";
import { buildCanvas } from "@/lib/pcb/content";
import { buildModeTabs } from "@/lib/pcb/data";
import { AXIS_SVG, FLOAT_SVGS, NEXT_SVG, PLANE_SVG } from "@/lib/pcb/markup";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

export function CanvasArea() {
  const state = usePcbState();
  const actions = usePcbActions();
  const modeTabs = buildModeTabs(state, actions);
  const v = state.viewTog;
  // canvas bounds reflow with the View ▸ panel toggles
  const top = v["Top Toolbar"] !== false ? 225 : 142;
  const left = v["Left-Side panel"] !== false ? 366 : 74;
  const right = v["Right-Side Panel"] !== false ? 292 : 0;

  return (
    <div
      onContextMenu={actions.openCanvasCtx}
      style={{
        position: "absolute",
        top,
        bottom: 36,
        left,
        right,
        background: "var(--color-bg-subtle)",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* rulers */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 30,
          right: 0,
          height: 22,
          background: "var(--color-bg-subtle)",
          borderBottom: "var(--border-width-1) solid var(--color-border-default)",
          backgroundImage:
            "repeating-linear-gradient(to right, var(--color-border-strong) 0, var(--color-border-strong) 1px, transparent 1px, transparent 12px)",
          backgroundPosition: "0 14px",
          backgroundSize: "12px 8px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 22,
          bottom: 0,
          left: 0,
          width: 30,
          background: "var(--color-bg-subtle)",
          borderRight: "var(--border-width-1) solid var(--color-border-default)",
          backgroundImage:
            "repeating-linear-gradient(to bottom, var(--color-border-strong) 0, var(--color-border-strong) 1px, transparent 1px, transparent 12px)",
          backgroundPosition: "14px 0",
          backgroundSize: "8px 12px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 30,
          height: 22,
          background: "var(--color-bg-subtle)",
          borderRight: "var(--border-width-1) solid var(--color-border-default)",
          borderBottom: "var(--border-width-1) solid var(--color-border-default)",
        }}
      />

      {/* canvas label */}
      <div style={{ position: "absolute", top: 34, left: 46, fontSize: "var(--font-size-lg)", color: "var(--color-text-secondary)", fontWeight: 500 }}>
        Seetings
      </div>

      {/* mode segmented control */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-default)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--spacing-2)",
          boxShadow: "var(--elevation-3)",
          zIndex: 12,
        }}
      >
        {modeTabs.map((mt) => (
          <div
            key={mt.label}
            className="ix-seg"
            onClick={mt.onClick}
            style={{
              padding: "var(--spacing-3) var(--spacing-10)",
              borderRadius: "var(--radius-lg)",
              fontSize: "var(--font-size-md)",
              fontWeight: 600,
              cursor: "pointer",
              background: mt.bg,
              color: mt.fg,
            }}
          >
            {mt.label}
          </div>
        ))}
      </div>

      {/* 3D axis glyph */}
      <div style={{ position: "absolute", top: 34, right: 24, color: "var(--color-text-tertiary)", width: 26, height: 26 }}>
        <Icon html={AXIS_SVG} />
      </div>

      {/* mode-specific drawing */}
      <div style={{ position: "absolute", top: 22, left: 30, right: 0, bottom: 0, overflow: "auto" }}>
        <div
          style={{ position: "relative", minWidth: "100%", minHeight: "100%" }}
          onClick={() => actions.selectObject("none")}
        >
          <div style={{ minWidth: "100%", minHeight: "100%" }} dangerouslySetInnerHTML={{ __html: buildCanvas(state.mode) }} />
          {state.mode === "schematic" && <CanvasObjects />}
        </div>
      </div>

      {/* floating tools (schematic only · View ▸ Floating Tool) */}
      {state.mode === "schematic" && v["Floating Tool"] !== false && (
        <div
          style={{
            position: "absolute",
            top: state.floatPos.y,
            left: state.floatPos.x,
            display: "flex",
            gap: "var(--spacing-7)",
            zIndex: 13,
          }}
        >
          <div
            style={{
              background: "var(--color-bg-surface)",
              border: "var(--border-width-1) solid var(--color-border-default)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--elevation-4)",
              width: 166,
            }}
          >
            <div
              onMouseDown={actions.startFloatDrag}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--spacing-3) var(--spacing-5)",
                borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                cursor: "move",
                userSelect: "none",
              }}
            >
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontWeight: 600 }}>Floating Tools</span>
              <svg width="14" height="14" viewBox="0 0 24 24" stroke="var(--color-text-tertiary)" strokeWidth="2.5">
                <path d="M6 12h12" />
              </svg>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "var(--spacing-1)", padding: "var(--spacing-3)" }}>
              {FLOAT_SVGS.map((svg, i) => (
                <div
                  key={i}
                  className="ix-tool"
                  style={{
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-md)",
                    color: "var(--color-text-primary)",
                    cursor: "pointer",
                  }}
                >
                  <Icon html={svg} size={16} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Plane pill */}
      <div
        className="ix-btn"
        style={{
          position: "absolute",
          bottom: 24,
          left: 50,
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-4)",
          padding: "var(--spacing-4) var(--spacing-8)",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1-5) solid #fbd5f3",
          borderRadius: "var(--radius-3xl)",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(254,42,212,.12)",
        }}
      >
        <Icon html={PLANE_SVG} size={16} />
        <span style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "#fe2ad4" }}>Plane</span>
      </div>

      {/* Next pill */}
      <div
        className="ix-btn"
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-4)",
          padding: "var(--spacing-4) var(--spacing-10)",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1-5) solid #fbd5f3",
          borderRadius: "var(--radius-3xl)",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(254,42,212,.12)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "#fe2ad4" }}>Next</span>
        <Icon html={NEXT_SVG} size={16} />
      </div>
    </div>
  );
}

// Sample on-canvas objects (schematic): a component (U12) + a wire.
// Click selects → right panel shows object/wire properties. Double-click the
// designator → inline text editor. Mirrors the Figma double-click + connection-
// line editing flows.
function CanvasObjects() {
  const state = usePcbState();
  const actions = usePcbActions();
  const selComp = state.selected === "comp";
  const selWire = state.selected === "wire";

  return (
    <div style={{ position: "absolute", top: 150, left: 250, width: 360, height: 220 }}>
      {/* wire (elbow) */}
      <svg
        width="360"
        height="220"
        style={{ position: "absolute", inset: 0, overflow: "visible", cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          actions.selectObject("wire");
        }}
      >
        <path
          d="M0 120 H70 V60 H120"
          fill="none"
          stroke={selWire ? "var(--color-violet-600)" : "var(--color-text-secondary)"}
          strokeWidth={selWire ? 2.5 : 1.6}
        />
        {selWire && (
          <>
            <circle cx="0" cy="120" r="3.5" fill="var(--color-violet-600)" />
            <circle cx="70" cy="60" r="3.5" fill="var(--color-violet-600)" />
            <circle cx="120" cy="60" r="3.5" fill="var(--color-violet-600)" />
          </>
        )}
      </svg>

      {/* component U12 */}
      <div style={{ position: "absolute", left: 120, top: 30 }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            actions.selectObject("comp");
          }}
          style={{
            width: 70,
            height: 64,
            background: "var(--color-bg-surface)",
            border: `${selComp ? "var(--border-width-2)" : "var(--border-width-1)"} solid ${selComp ? "var(--color-violet-600)" : "var(--color-text-primary)"}`,
            borderRadius: "var(--radius-xs)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            position: "relative",
            cursor: "pointer",
            boxShadow: selComp ? "0 0 0 3px rgba(124,45,185,.15)" : "none",
          }}
        >
          U12
          {/* pins */}
          {[14, 28, 42, 56].map((y, i) => (
            <span key={i} style={{ position: "absolute", right: -10, top: y, width: 10, height: 1.5, background: "var(--color-text-primary)" }} />
          ))}
          {[14, 28, 42, 56].map((y, i) => (
            <span key={"n" + i} style={{ position: "absolute", right: -16, top: y - 6, fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)" }}>{i + 1}</span>
          ))}
        </div>

        {/* designator (double-click to edit) */}
        {state.editingText ? (
          <textarea
            autoFocus
            value={state.editText}
            onChange={(e) => actions.setEditText(e.target.value)}
            onBlur={actions.stopTextEdit}
            onClick={(e) => e.stopPropagation()}
            className="ix-arr-input"
            style={{
              position: "absolute",
              top: 70,
              left: -10,
              width: 150,
              height: 40,
              padding: "var(--spacing-2) var(--spacing-3)",
              border: "var(--border-width-1) solid var(--color-border-focus)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-2xs)",
              fontFamily: "var(--font-family-body)",
              color: "var(--color-text-primary)",
              background: "var(--color-bg-surface)",
              resize: "none",
              outline: "none",
              boxShadow: "var(--elevation-3)",
            }}
          />
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              actions.startTextEdit();
            }}
            style={{
              position: "absolute",
              top: 70,
              left: -10,
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-error)",
              whiteSpace: "nowrap",
              cursor: "text",
              fontWeight: 600,
            }}
          >
            {state.editText}
          </div>
        )}
      </div>
    </div>
  );
}
