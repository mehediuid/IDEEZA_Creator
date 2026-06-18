"use client";

// IDEEZA Code section — landing state (Figma 41579:737862 from file
// HDtWAU2PSbjQKlEWgHI3ev). "Choose One to continue" prompt with two pills:
// Blockly development / Code Development. The user lands here from the PCB
// page's Next pill; Previous returns to /pcb.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/pcb/breadcrumb";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { CodeRail } from "@/components/code/code-rail";

type CodeMode = "blockly" | "develop";

const PINK = "#fe2ad4";
const PINK_BORDER = "#fbd5f3";

function Pill({
  children,
  selected,
  onClick,
  trailing,
  leading,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <div
      className="ix-btn"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "var(--spacing-3) var(--spacing-8)",
        background: "var(--color-bg-surface)",
        border: `var(--border-width-1-5) solid ${PINK_BORDER}`,
        borderRadius: "var(--radius-3xl)",
        cursor: "pointer",
        boxShadow: selected ? "0 4px 12px rgba(254,42,212,.18)" : "0 1px 4px rgba(0,0,0,.04)",
        color: selected ? PINK : "var(--color-text-secondary)",
        fontWeight: selected ? 600 : 500,
        fontSize: "var(--font-size-md)",
      }}
    >
      {leading}
      <span>{children}</span>
      {trailing}
    </div>
  );
}

function Caret({ dir }: { dir: "left" | "right" }) {
  const d = dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6";
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// Below the breadcrumb: a thin strip that only carries the "Price For Premium
// Parts" label on the right (Figma landing frame).
function PriceStrip() {
  return (
    <div
      style={{
        position: "absolute",
        top: 104,
        left: 0,
        right: 0,
        height: 48,
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        background: "var(--color-bg-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 var(--spacing-10)",
        zIndex: 15,
      }}
    >
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
        Price For Premium Parts:{" "}
        <span style={{ color: PINK, fontWeight: 700 }}>$0.00</span>
      </span>
    </div>
  );
}

export function CodeApp() {
  const router = useRouter();
  const [mode, setMode] = React.useState<CodeMode | null>(null);

  return (
    <EditorShell>
      <TopBar />
      <Breadcrumb />
      <PriceStrip />
      <CodeRail topOffset={152} />

      {/* Canvas area — empty, with the "Choose One to continue" prompt vertically centered. */}
      <div
        style={{
          position: "absolute",
          top: 152,
          bottom: 36,
          left: 74,
          right: 0,
          background: "var(--color-bg-page)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--spacing-5)",
        }}
      >
        <div style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-primary)", fontWeight: 500 }}>
          Choose One to continue
        </div>
        <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
          <Pill selected={mode === "blockly"} onClick={() => setMode("blockly")}>
            Blockly development
          </Pill>
          <Pill selected={mode === "develop"} onClick={() => setMode("develop")}>
            Code Development
          </Pill>
        </div>
      </div>

      {/* Previous / Next pills */}
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 56,
          display: "flex",
          gap: "var(--spacing-3)",
          zIndex: 18,
        }}
      >
        <Pill leading={<Caret dir="left" />} onClick={() => router.push("/pcb")}>
          <span style={{ color: PINK, fontWeight: 600 }}>Previous</span>
        </Pill>
        <Pill trailing={<Caret dir="right" />}>
          <span style={{ color: PINK, fontWeight: 600 }}>Next</span>
        </Pill>
      </div>
    </EditorShell>
  );
}
