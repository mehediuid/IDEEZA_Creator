"use client";

// Code page left icon rail — same five items as the PCB rail (PCB Design /
// Code / 3D Module / Product Preview / Add Brief), but standalone (no PcbProvider).
// Clicking "PCB Design" navigates to /pcb; clicking "Code" is a no-op.

import { DsIcon } from "@/lib/pcb/icons";
import { buildRail } from "@/lib/pcb/data";
import { useStepNav, RAIL_KEY_TO_STEP } from "@/components/manual/use-step-nav";

export function CodeRail({ topOffset = 152 }: { topOffset?: number } = {}) {
  const items = buildRail(null, "code");
  const { go: goStep, activeProject } = useStepNav();

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 36,
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
            const step = RAIL_KEY_TO_STEP[r.key];
            if (step && r.key !== "code" && activeProject) goStep(step);
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
