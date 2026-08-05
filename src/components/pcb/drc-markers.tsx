"use client";

// ERC / DRC findings drawn on the canvas.
//
// The checks already report a position for most findings; until now those
// coordinates only fed the bottom panel, so "Free wire" told you *what* was
// wrong but never *where*. This layer paints one severity-coloured marker per
// positioned finding in the same coordinate space as the placed objects, and
// pairs with the DRC tab: clicking a row focuses its marker, clicking a marker
// focuses its row.

import * as React from "react";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { SEV_META, sevKeyOf } from "@/lib/pcb/colors";

// Same offset the placed-object layer uses, so markers land on the geometry.
const OX = 2500;

export function DrcMarkers() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [hover, setHover] = React.useState<number | null>(null);

  const issues = state.mode === "schematic" ? state.ercResults : state.pcbDrcResults;
  const marks = React.useMemo(
    () =>
      issues
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => typeof it.x === "number" && typeof it.y === "number"),
    [issues],
  );
  if (!state.drcMarkers || marks.length === 0) return null;

  return (
    <div style={{ position: "absolute", left: -OX, top: -OX, width: OX * 2, height: OX * 2, pointerEvents: "none", zIndex: 6 }}>
      <div style={{ position: "absolute", left: OX, top: OX }}>
        {marks.map(({ it, i }) => {
          const key = sevKeyOf(it.severity);
          const color = SEV_META[key].color;
          const focused = state.focusedIssue === i;
          const open = focused || hover === i;
          return (
            <div
              key={i}
              style={{ position: "absolute", left: it.x, top: it.y, pointerEvents: "auto" }}
            >
              {/* marker — a severity ring, sized up while focused */}
              <button
                type="button"
                aria-label={`${SEV_META[key].label}: ${it.title}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.focusIssue(focused ? null : i);
                }}
                style={{
                  position: "absolute",
                  left: -9,
                  top: -9,
                  width: 18,
                  height: 18,
                  padding: 0,
                  borderRadius: "50%",
                  cursor: "pointer",
                  background: `color-mix(in srgb, ${color} 22%, transparent)`,
                  border: `2px solid ${color}`,
                  boxShadow: open ? `0 0 0 4px color-mix(in srgb, ${color} 24%, transparent)` : "none",
                  transition: "box-shadow .15s ease-out",
                }}
              />
              {open && (
                <div
                  role="tooltip"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: -8,
                    minWidth: 180,
                    maxWidth: 300,
                    padding: "var(--spacing-4) var(--spacing-5)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-bg-surface)",
                    border: `var(--border-width-1) solid ${color}`,
                    boxShadow: "var(--elevation-5, 0 10px 24px -8px rgba(0,0,0,.35))",
                    pointerEvents: "none",
                    zIndex: 3,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flex: "0 0 auto" }} />
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>{it.title}</span>
                  </div>
                  <div style={{ marginTop: 2, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                    {it.detail}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 10.5, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {SEV_META[key].label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
