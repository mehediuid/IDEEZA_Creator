"use client";

// RegenerateConfirm — small modal confirming the (~20 min, 1 credit) cost
// before kicking off a fresh render job. Sits on top of the ReviewModal stack.

import { C } from "@/lib/pcb/colors";

export function RegenerateConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(2px)",
        zIndex: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="regen-title"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-xl)",
          padding: 24,
          boxShadow: "0 30px 80px -20px rgba(0,0,0,.6)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: "var(--color-orange-100, var(--color-bg-brand-subtle))",
              color: "var(--color-orange-600, var(--color-violet-600))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 36px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5" />
            </svg>
          </span>
          <h2 id="regen-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>
            Regenerate from scratch?
          </h2>
        </div>

        <p style={{ margin: 0, fontSize: 14, color: C.body, lineHeight: 1.5 }}>
          We&rsquo;ll send you back to your prompt — edit it, generate a new
          storyboard, then start the render. The full flow takes about{" "}
          <strong style={{ color: C.text }}>20 minutes</strong> once you hit
          Continue, and uses{" "}
          <strong style={{ color: C.text }}>1 video credit</strong>.
        </p>

        <p style={{ margin: 0, fontSize: 13, color: C.body, lineHeight: 1.5 }}>
          Your current video is discarded. You can keep editing the mint
          fields while the new render runs.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 18px",
              background: "transparent",
              border: "var(--border-width-1) solid var(--color-border-default)",
              borderRadius: 999,
              color: C.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              background: "var(--color-violet-600)",
              color: "var(--color-text-on-brand)",
              border: "none",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5" />
            </svg>
            Edit prompt
          </button>
        </div>
      </div>
    </div>
  );
}
