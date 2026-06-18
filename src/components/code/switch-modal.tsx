"use client";

// IDEEZA Code — confirmation when switching between Blockly and Code Development
// (Figma frame 41579:737829). The user has unsaved progress in the current
// editor, so we surface "Switch Anyway" (discard intent → switch) and "Discard"
// (cancel switch, keep current work — destructive label per Figma copy).

import { C } from "@/lib/pcb/colors";

type Target = "blockly" | "develop";

const COPY: Record<Target, { title: string; body: string }> = {
  blockly: {
    title: "Discard code development changes?",
    body: "If you want to switch to Blocky Development your progress will be discard.",
  },
  develop: {
    title: "Discard blockly progress?",
    body: "If you want to switch to Code Development your progress will be discard.",
  },
};

export function SwitchModal({
  target,
  onSwitch,
  onCancel,
}: {
  target: Target;
  onSwitch: () => void;
  onCancel: () => void;
}) {
  const copy = COPY[target];
  return (
    <>
      {/* scrim */}
      <div
        onClick={onCancel}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,.32)",
          zIndex: 60,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 460,
          padding: "var(--spacing-7) var(--spacing-8)",
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--elevation-5)",
          zIndex: 61,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: "var(--color-orange-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "var(--spacing-5)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange-500)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4 M12 16h.01" />
          </svg>
        </div>
        <div style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: C.text, marginBottom: "var(--spacing-3)" }}>
          {copy.title}
        </div>
        <div style={{ fontSize: "var(--font-size-md)", color: C.body, lineHeight: 1.5, marginBottom: "var(--spacing-7)" }}>
          {copy.body}
        </div>
        <div style={{ display: "flex", gap: "var(--spacing-4)", justifyContent: "flex-end" }}>
          <button
            onClick={onSwitch}
            style={{
              padding: "var(--spacing-3) var(--spacing-8)",
              border: "var(--border-width-1-5) solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-bg-surface)",
              color: C.text,
              fontSize: "var(--font-size-md)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Switch Anyway
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: "var(--spacing-3) var(--spacing-8)",
              border: "none",
              borderRadius: "var(--radius-md)",
              background: C.primary,
              color: "var(--color-text-on-brand)",
              fontSize: "var(--font-size-md)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Discard
          </button>
        </div>
      </div>
    </>
  );
}
