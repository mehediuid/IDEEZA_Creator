"use client";

// ReviewModal — full-screen overlay for the final video approval step.
// Primary CTA "Looks good · continue to mint" sets videoReviewed=true and
// closes the modal so the Pay button can light up. Secondary CTA opens the
// regenerate-confirm dialog.

import * as React from "react";
import { C } from "@/lib/pcb/colors";

export function ReviewModal({
  open,
  prompt,
  quality,
  onApprove,
  onRegenerate,
  onClose,
}: {
  open: boolean;
  prompt: string;
  quality: "low" | "high";
  onApprove: () => void;
  onRegenerate: () => void;
  onClose: () => void;
}) {
  const [playing, setPlaying] = React.useState(false);
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(2px)",
        zIndex: 100,
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
        aria-labelledby="review-title"
        style={{
          width: "100%",
          maxWidth: 640,
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-xl)",
          padding: 24,
          boxShadow: "0 30px 80px -20px rgba(0,0,0,.6)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 id="review-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>
            Review your video
          </h2>
          <button
            onClick={onClose}
            aria-label="Close review"
            style={{ background: "transparent", border: "none", color: C.body, fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div
          onClick={() => setPlaying((p) => !p)}
          style={{
            position: "relative",
            aspectRatio: "16 / 9",
            background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 38%, #831843 76%, #fb923c 100%)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            cursor: "pointer",
            boxShadow: "0 8px 32px -8px rgba(124, 45, 185, .4)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 30% 40%, rgba(255,255,255,.18), transparent 50%), radial-gradient(circle at 70% 70%, rgba(255,255,255,.10), transparent 60%)",
              animation: "ix-rm-pulse 3.5s ease-in-out infinite",
            }}
          />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                transition: "transform .15s",
                transform: playing ? "scale(.92)" : "scale(1)",
              }}
            >
              {playing ? (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="var(--color-violet-600)">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--color-violet-600)">
                  <polygon points="7,4 21,12 7,20" />
                </svg>
              )}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 14,
              bottom: 12,
              right: 14,
              color: "rgba(255,255,255,0.95)",
              fontSize: 12,
              fontWeight: 600,
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {prompt.slice(0, 110) || "AI-generated demo"}
          </div>
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 14,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              background: "rgba(0,0,0,.55)",
              color: "white",
              borderRadius: 999,
              letterSpacing: 0.4,
            }}
          >
            {quality === "low" ? "480p" : "720p"} · 10s
          </div>
        </div>

        <div style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>
          Watch the full clip before approving. Once you mint, this is the version that ships with the listing.
        </div>

        <button
          onClick={() => { onApprove(); onClose(); }}
          style={{
            padding: "14px 24px",
            background: "var(--color-violet-600)",
            color: "var(--color-text-on-brand)",
            border: "none",
            borderRadius: "var(--radius-3xl)",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 6px 24px -6px rgba(124, 45, 185, .4)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4 10-10" />
          </svg>
          Looks good · continue to mint
        </button>

        <div
          style={{
            paddingTop: 14,
            borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, color: C.body }}>Not happy with the result?</div>
          <button
            onClick={onRegenerate}
            style={{
              padding: "10px 18px",
              background: "transparent",
              border: "var(--border-width-1) solid var(--color-border-default)",
              borderRadius: 999,
              color: C.text,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5" />
            </svg>
            Edit prompt &amp; regenerate
          </button>
        </div>

        <style>{`@keyframes ix-rm-pulse { 0%,100% { opacity:1 } 50% { opacity:.6 } }`}</style>
      </div>
    </div>
  );
}
