"use client";

// IDEEZA PCB Software — left icon rail (PCB Design / Code / 3D Module / …).
//
// Default offsets + active key match the PCB module (so existing call sites
// keep working with no args). Other modules (e.g. /preview) pass their own
// topOffset + activeKey so the rail sits below their custom chrome and the
// active item highlight points to the right route.

import { DsIcon } from "@/lib/pcb/icons";
import { buildRail } from "@/lib/pcb/data";
import { usePcbState } from "@/lib/pcb/store";
import { useStepNav, RAIL_KEY_TO_STEP } from "@/components/manual/use-step-nav";

export function LeftRail({
  topOffset,
  bottomOffset = 36,
  activeKey = "pcb",
}: {
  topOffset?: number;
  bottomOffset?: number;
  activeKey?: string;
} = {}) {
  const state = usePcbState();
  const items = buildRail(state, activeKey);
  const { go: goStep, activeProject } = useStepNav();
  const resolvedTop =
    topOffset ?? (state.viewTog["Top Toolbar"] !== false ? 108 : 62);

  return (
    <div
      style={{
        position: "absolute",
        top: resolvedTop,
        bottom: bottomOffset,
        left: 0,
        width: 74,
        background: "var(--color-bg-surface)",
        borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "var(--spacing-8)",
        zIndex: 16,
      }}
    >
      {items.map((r) => (
        <div
          key={r.key}
          className="ix-nav"
          onClick={() => {
            // Skip the active item (already here) and unknown keys. Navigation
            // is project-scoped through the active project.
            const step = RAIL_KEY_TO_STEP[r.key];
            if (step && r.key !== activeKey && activeProject) goStep(step);
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--spacing-2)",
            padding: "var(--spacing-4) var(--spacing-0)",
            width: "100%",
            cursor: r.cursor,
            opacity: r.opacity,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-xl)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: r.bg,
              color: r.fg,
            }}
          >
            <DsIcon name={r.icon} size={20} />
          </div>
          <span
            style={{
              fontSize: "var(--font-size-2xs)",
              fontWeight: 600,
              textAlign: "center",
              lineHeight: 1.15,
              color: r.fg,
              maxWidth: 64,
            }}
          >
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}
