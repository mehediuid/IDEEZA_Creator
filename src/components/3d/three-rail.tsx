"use client";

// 3D Module left icon rail — same five items as the PCB/Code rails, with
// "3D Module" highlighted. Click another item to navigate cross-section.

import { useRouter } from "next/navigation";
import { DsIcon } from "@/lib/pcb/icons";
import { buildRail } from "@/lib/pcb/data";

export function ThreeRail({ topOffset = 132 }: { topOffset?: number } = {}) {
  const items = buildRail(null, "3d");
  const router = useRouter();

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
            if (r.href && r.key !== "3d") router.push(r.href);
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
