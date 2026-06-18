"use client";

// IDEEZA Code section — entry shell + state machine. Lands on "Choose One to
// continue"; tap one of the pills to switch into Blockly or Code Development.
// Mode-aware chrome (the menu/tool strip only appears in Blockly mode), shared
// rail, and a switch confirmation modal when the user wants to flip between
// modes after having made progress.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/pcb/breadcrumb";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { CodeRail } from "@/components/code/code-rail";
import { CodeMenuStrip } from "@/components/code/code-menu-strip";
import { BlocklyEditor } from "@/components/code/blockly-editor";
import { DevEditor } from "@/components/code/dev-editor";
import { SwitchModal } from "@/components/code/switch-modal";
import { C } from "@/lib/pcb/colors";

type CodeMode = "blockly" | "develop";

function Pill({
  children,
  selected,
  onClick,
  trailing,
  leading,
  tone = "neutral",
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  tone?: "neutral" | "brand";
}) {
  const isBrand = tone === "brand" || selected;
  return (
    <div
      className="ix-btn"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "var(--spacing-3) var(--spacing-8)",
        background: selected ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
        border: `var(--border-width-1-5) solid ${isBrand ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
        borderRadius: "var(--radius-3xl)",
        cursor: "pointer",
        boxShadow: selected ? "var(--elevation-2)" : "var(--elevation-1)",
        color: isBrand ? C.primary : C.body,
        fontWeight: 600,
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

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
      <span style={{ fontSize: "var(--font-size-sm)", color: C.body }}>
        Price For Premium Parts:{" "}
        <span style={{ color: C.primary, fontWeight: 700 }}>$0.00</span>
      </span>
    </div>
  );
}

export function CodeApp() {
  const router = useRouter();
  const [mode, setMode] = React.useState<CodeMode | null>(null);
  const [pendingMode, setPendingMode] = React.useState<CodeMode | null>(null);

  // Layout offsets driven by mode:
  //   - landing: chrome ends at 152 (price strip)
  //   - blockly: chrome ends at 172 (menu strip + tool row)
  //   - develop: chrome ends at 152 (price strip only; IDE renders inside)
  const railTop = mode === "blockly" ? 172 : 152;
  const contentTop = railTop;

  const requestMode = (next: CodeMode) => {
    if (mode === null) {
      setMode(next);
      return;
    }
    if (mode === next) return;
    setPendingMode(next);
  };

  const confirmSwitch = () => {
    if (pendingMode) setMode(pendingMode);
    setPendingMode(null);
  };
  const cancelSwitch = () => setPendingMode(null);

  return (
    <EditorShell>
      <TopBar />
      <Breadcrumb />

      {mode === "blockly" ? <CodeMenuStrip /> : <PriceStrip />}

      <CodeRail topOffset={railTop} />

      {mode === null && (
        <LandingCanvas
          contentTop={contentTop}
          onPick={(m) => setMode(m)}
        />
      )}
      {mode === "blockly" && <BlocklyEditor topOffset={contentTop} />}
      {mode === "develop" && <DevEditor topOffset={contentTop} />}

      {/* Previous / Next pills — fixed bottom-right */}
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
        <Pill
          tone="brand"
          leading={<Caret dir="left" />}
          onClick={() => (mode === null ? router.push("/pcb") : setMode(null))}
        >
          Previous
        </Pill>
        <Pill tone="brand" trailing={<Caret dir="right" />}>
          Next
        </Pill>
      </div>

      {/* Bottom-bar style placeholder so EditorShell looks balanced */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 36,
          background: "var(--color-bg-surface)",
          borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
          zIndex: 12,
        }}
      />

      {pendingMode && (
        <SwitchModal
          target={pendingMode}
          onSwitch={confirmSwitch}
          onCancel={cancelSwitch}
        />
      )}

      {/* Quick mode-switch helper while landing has both pills visible: when
          a Blockly/Develop view is active, render a tiny floating action that
          opens the other side via the confirmation modal. */}
      {mode !== null && (
        <div
          style={{
            position: "absolute",
            left: 90,
            bottom: 56,
            display: "flex",
            gap: "var(--spacing-2)",
            zIndex: 18,
          }}
        >
          <Pill
            selected={mode === "blockly"}
            onClick={() => requestMode("blockly")}
          >
            Blockly development
          </Pill>
          <Pill
            selected={mode === "develop"}
            onClick={() => requestMode("develop")}
          >
            Code Development
          </Pill>
        </div>
      )}
    </EditorShell>
  );
}

function LandingCanvas({ contentTop, onPick }: { contentTop: number; onPick: (m: CodeMode) => void }) {
  const [hover, setHover] = React.useState<CodeMode | null>(null);
  return (
    <div
      style={{
        position: "absolute",
        top: contentTop,
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
      <div style={{ fontSize: "var(--font-size-lg)", color: C.text, fontWeight: 500 }}>
        Choose One to continue
      </div>
      <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
        <Pill selected={hover === "blockly"} onClick={() => onPick("blockly")}>
          <span onMouseEnter={() => setHover("blockly")} onMouseLeave={() => setHover(null)}>Blockly development</span>
        </Pill>
        <Pill selected={hover === "develop"} onClick={() => onPick("develop")}>
          <span onMouseEnter={() => setHover("develop")} onMouseLeave={() => setHover(null)}>Code Development</span>
        </Pill>
      </div>
    </div>
  );
}
