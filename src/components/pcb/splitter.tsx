"use client";

// Panel splitters. The editor's three panels were fixed at 292/292/248 px, so a
// small screen could not give the canvas more room. Dragging an edge writes the
// new size to the store (clamped there), and the canvas + toolbar read the same
// numbers, so nothing can go out of step.

import * as React from "react";
import { usePcbActions } from "@/lib/pcb/store";
import { PANEL_LIMITS } from "@/lib/pcb/types";

const HIT = 6;
/** How much one arrow key moves the edge, and one Page key. */
const STEP = 16;
const PAGE = 64;

export function Splitter({
  side, size, label,
}: {
  /** Which edge this handle drags. */
  side: "left" | "right" | "bottom";
  /** The panel's current size, so the drag starts from the truth. */
  size: number;
  label: string;
}) {
  const actions = usePcbActions();
  const [active, setActive] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const start = side === "bottom" ? e.clientY : e.clientX;
    const from = size;
    setActive(true);
    const move = (ev: MouseEvent) => {
      const now = side === "bottom" ? ev.clientY : ev.clientX;
      // left grows right, right and bottom grow the other way
      const delta = side === "left" ? now - start : side === "right" ? start - now : start - now;
      actions.setPanelSize(side, from + delta);
    };
    const up = () => {
      setActive(false);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // Keyboard: a separator that can only be dragged is unreachable without a
  // mouse, so the handle takes focus and the arrows move it by a real step.
  const lim = PANEL_LIMITS[side];
  const nudge = (by: number) => actions.setPanelSize(side, size + by);
  const onKey = (e: React.KeyboardEvent) => {
    const vert = side !== "bottom";
    const grow = side === "left" ? 1 : -1;
    const keys: Record<string, () => void> = vert
      ? { ArrowRight: () => nudge(STEP * grow), ArrowLeft: () => nudge(-STEP * grow) }
      : { ArrowUp: () => nudge(STEP), ArrowDown: () => nudge(-STEP) };
    const extra: Record<string, () => void> = {
      PageUp: () => nudge(PAGE),
      PageDown: () => nudge(-PAGE),
      Home: () => actions.setPanelSize(side, lim.min),
      End: () => actions.setPanelSize(side, lim.max),
    };
    const run = keys[e.key] ?? extra[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  const vertical = side !== "bottom";
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-label={label}
      aria-valuenow={Math.round(size)}
      aria-valuemin={lim.min}
      aria-valuemax={lim.max}
      tabIndex={0}
      data-splitter={side}
      onKeyDown={onKey}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseDown={onDown}
      style={{
        position: "absolute",
        zIndex: 20,
        ...(vertical
          ? { top: 0, bottom: 0, width: HIT * 2, cursor: "col-resize", ...(side === "left" ? { right: -HIT } : { left: -HIT }) }
          : { left: 0, right: 0, height: HIT * 2, top: -HIT, cursor: "row-resize" }),
        background: "transparent",
      }}
    >
      {/* the visible hairline only appears while dragging or on hover */}
      <div
        style={{
          position: "absolute",
          ...(vertical ? { top: 0, bottom: 0, left: HIT - 1, width: 2 } : { left: 0, right: 0, top: HIT - 1, height: 2 }),
          background: active || focused ? "var(--color-canvas-select)" : "transparent",
          transition: "background .12s ease-out",
        }}
      />
    </div>
  );
}
