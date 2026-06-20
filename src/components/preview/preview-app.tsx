"use client";

// Preview — the 4th step in the product creation flow (PCB → Code → 3D →
// Preview → Brief). Final-merge view that lets the creator see all three
// modules stitched together before they write the brief.
//
// This page is intentionally a stub for now — the real merge view (canvas
// preview, code repl, 3D viewer composited) is a larger build. The page still
// exists so the FlowStepper has the full 5-step structure and "Continue to
// Brief" lives in its rightful place.

import * as React from "react";
import { useRouter } from "next/navigation";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { C } from "@/lib/pcb/colors";
import { useProductFlow } from "@/components/product-flow/product-flow-provider";

export function PreviewApp() {
  const router = useRouter();
  const { state, hydrated } = useProductFlow();

  const upstreamPieces: { key: string; label: string; done: boolean }[] = [
    { key: "pcb", label: "PCB", done: state.pcb },
    { key: "code", label: "Code", done: state.code },
    { key: "three", label: "3D model", done: state.three },
  ];
  const upstreamReady = upstreamPieces.every((p) => p.done);

  return (
    <EditorShell>
      <TopBar />

      <div
        style={{
          position: "absolute",
          top: 62,
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--color-bg-page)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            minHeight: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "64px 32px 120px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  background: "var(--color-bg-brand-subtle)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-violet-600)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: C.text,
                  margin: 0,
                  letterSpacing: -0.5,
                }}
              >
                Product preview
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: C.body,
                  marginTop: 6,
                  maxWidth: 460,
                  marginInline: "auto",
                  lineHeight: 1.5,
                }}
              >
                See your PCB, code, and 3D model composited together before you
                write the brief. The merged view is on its way — for now, jump
                straight to the brief.
              </p>
            </div>

            {/* Upstream-step recap card */}
            <div
              style={{
                background: "var(--color-bg-surface)",
                border:
                  "var(--border-width-1) solid var(--color-border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Pieces you&rsquo;ve made
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {upstreamPieces.map((p) => (
                  <UpstreamTile
                    key={p.key}
                    label={p.label}
                    done={hydrated ? p.done : false}
                  />
                ))}
              </div>
              {hydrated && !upstreamReady && (
                <div
                  style={{
                    fontSize: 12,
                    color: C.body,
                    background: "var(--color-bg-page)",
                    border:
                      "var(--border-width-1) solid var(--color-border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 12px",
                    lineHeight: 1.5,
                  }}
                >
                  Some upstream steps aren&rsquo;t marked complete yet —
                  you can still continue to brief, or hop back via the
                  stepper above to finish them first.
                </div>
              )}
            </div>

            {/* Placeholder canvas */}
            <div
              style={{
                aspectRatio: "16 / 9",
                background:
                  "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 38%, #831843 76%, #fb923c 100%)",
                borderRadius: "var(--radius-lg)",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 12px 40px -10px rgba(124, 45, 185, .35)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "rgba(255,255,255,0.95)",
                  textAlign: "center",
                  padding: 24,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    background: "rgba(0,0,0,.35)",
                    borderRadius: 999,
                  }}
                >
                  Coming soon
                </span>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  Composited product preview
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, maxWidth: 360 }}>
                  Live merge of your PCB layout, code behavior, and 3D enclosure
                  — playable, rotatable, embeddable.
                </div>
              </div>
            </div>

            {/* Forward + back actions. Mirrors the canvas pill pattern used
                by the PCB / Code / 3D modules — destination-labeled, sat at
                the bottom-right of the page. Preview's stub doesn't have a
                canvas of its own yet, so we render them as page content. */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 8,
              }}
            >
              <button
                onClick={() => router.push("/3d")}
                style={{
                  padding: "14px 22px",
                  background: "var(--color-bg-surface)",
                  color: "var(--color-text-primary)",
                  border:
                    "var(--border-width-1) solid var(--color-border-default)",
                  borderRadius: "var(--radius-3xl)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 6l-6 6 6 6" />
                </svg>
                Back to 3D
              </button>
              <button
                onClick={() => router.push("/brief")}
                style={{
                  padding: "14px 26px",
                  background: "var(--color-violet-600)",
                  color: "var(--color-text-on-brand)",
                  border: "none",
                  borderRadius: "var(--radius-3xl)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 26px -8px rgba(124, 45, 185, .4)",
                }}
              >
                Continue to Brief
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </EditorShell>
  );
}

function UpstreamTile({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: done
          ? "var(--color-bg-brand-subtle)"
          : "var(--color-bg-page)",
        border: `var(--border-width-1) solid ${
          done ? "var(--color-border-brand)" : "var(--color-border-subtle)"
        }`,
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "background .14s, border-color .14s",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: done
            ? "var(--color-violet-600)"
            : "var(--color-bg-surface-raised)",
          color: done
            ? "var(--color-text-on-brand)"
            : "var(--color-text-tertiary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 22px",
        }}
      >
        {done ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4 10-10" />
          </svg>
        ) : (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
        )}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: done
            ? "var(--color-violet-600)"
            : "var(--color-text-primary)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
