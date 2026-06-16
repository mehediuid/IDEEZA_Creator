"use client";

// IDEEZA PCB Software — left icon rail (PCB Design / Code / 3D Module / …).

import { DsIcon } from "@/lib/pcb/icons";
import { buildRail } from "@/lib/pcb/data";
import { usePcbState } from "@/lib/pcb/store";

export function LeftRail() {
  const state = usePcbState();
  const items = buildRail(state);

  return (
    <div
      style={{
        position: "absolute",
        top: state.viewTog["Top Toolbar"] !== false ? 225 : 142,
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
