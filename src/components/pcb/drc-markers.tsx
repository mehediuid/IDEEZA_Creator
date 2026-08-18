"use client";

// ERC / DRC findings drawn on the canvas.
//
// The checks already report a position for most findings; until now those
// coordinates only fed the bottom panel, so "Free wire" told you *what* was
// wrong but never *where*. This layer paints one severity-coloured marker per
// positioned finding in the same coordinate space as the placed objects, and
// pairs with the DRC tab: clicking a row focuses its marker, clicking a marker
// focuses its row.
//
// UIUX-81 — a finding that names its objects (`issue.ids`) is drawn as a
// **dashed ring around the offending element**, sized to that element's real
// bounds and coloured by severity, so the ERC points at the wire/pin/part it
// is talking about rather than dropping a dot nearby. A finding with only a
// position keeps the small ring.

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
  // Bounds of the objects a finding names, padded so the ring sits clear of
  // the glyph. Falls back to the finding's own point when it names nothing.
  const boundsOf = React.useCallback(
    (ids: string[] | undefined) => {
      if (!ids?.length) return null;
      const set = new Set(ids);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let n = 0;
      for (const o of state.objects) {
        if (!set.has(o.id)) continue;
        n++;
        const xs = [o.x, o.endX ?? o.x], ys = [o.y, o.endY ?? o.y];
        minX = Math.min(minX, ...xs); maxX = Math.max(maxX, ...xs);
        minY = Math.min(minY, ...ys); maxY = Math.max(maxY, ...ys);
      }
      if (!n) return null;
      const M = 16;
      return { x: minX - M, y: minY - M, w: maxX - minX + M * 2, h: maxY - minY + M * 2 };
    },
    [state.objects],
  );
  const marks = React.useMemo(
    () =>
      issues
        .map((it, i) => ({ it, i, box: boundsOf(it.ids) }))
        .filter(({ it, box }) => box !== null || (typeof it.x === "number" && typeof it.y === "number")),
    [issues, boundsOf],
  );
  if (!state.drcMarkers || marks.length === 0) return null;

  return (
    <div style={{ position: "absolute", left: -OX, top: -OX, width: OX * 2, height: OX * 2, pointerEvents: "none", zIndex: 6 }}>
      <div style={{ position: "absolute", left: OX, top: OX }}>
        {marks.map(({ it, i, box }) => {
          const key = sevKeyOf(it.severity);
          const color = SEV_META[key].color;
          const focused = state.focusedIssue === i;
          const open = focused || hover === i;
          return (
            <div
              key={i}
              style={{ position: "absolute", left: box ? box.x + box.w / 2 : it.x, top: box ? box.y + box.h / 2 : it.y, pointerEvents: "auto" }}
            >
              {/* the offending element, ringed — dashed and severity-coloured */}
              {box && (
                <div
                  data-erc-ring={key}
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: -box.w / 2,
                    top: -box.h / 2,
                    width: box.w,
                    height: box.h,
                    borderRadius: "50%",
                    border: `2px dashed ${color}`,
                    background: open ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
                    pointerEvents: "none",
                    transition: "background .15s ease-out",
                  }}
                />
              )}
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
                  left: box ? box.w / 2 - 9 : -9,
                  top: box ? -box.h / 2 - 9 : -9,
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
                    left: box ? box.w / 2 + 16 : 14,
                    top: box ? -box.h / 2 - 8 : -8,
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
