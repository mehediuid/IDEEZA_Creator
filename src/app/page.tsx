"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useProductFlow,
  FLOW_ORDER,
  FLOW_LABELS,
  FLOW_HREFS,
  type FlowStep,
} from "@/components/product-flow/product-flow-provider";

export default function Home() {
  const router = useRouter();
  const { state, hydrated, isAnyStarted, firstIncomplete, resetFlow } =
    useProductFlow();

  const anyStarted = hydrated && isAnyStarted();
  const resumeStep = hydrated ? firstIncomplete() : "pcb";
  const completedCount = FLOW_ORDER.filter(
    (s) => state[s as keyof typeof state] === true,
  ).length;
  const total = FLOW_ORDER.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-page)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-family-body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          gap: 28,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: "var(--color-violet-600)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              width: 0,
              height: 0,
              borderLeft:
                "16px solid var(--color-text-on-brand)",
              borderTop: "11px solid transparent",
              borderBottom: "11px solid transparent",
              marginLeft: 4,
            }}
          />
        </div>

        <div>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary)",
              margin: 0,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            IDEEZA Creator Panel
          </p>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: "8px 0 0",
              letterSpacing: -0.6,
              lineHeight: 1.1,
            }}
          >
            {anyStarted ? "Welcome back" : "Build your product"}
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--color-text-secondary)",
              marginTop: 12,
              lineHeight: 1.55,
              maxWidth: 460,
              marginInline: "auto",
            }}
          >
            Five connected steps — PCB, code, 3D, preview, brief. Make each
            piece, then add a brief to publish or save your product.
          </p>
        </div>

        {/* Resume / start CTA */}
        {anyStarted ? (
          <div
            style={{
              width: "100%",
              background: "var(--color-bg-surface)",
              border:
                "var(--border-width-1) solid var(--color-border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  In progress
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {completedCount} of {total} steps complete
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                }}
              >
                {Math.round((completedCount / total) * 100)}%
              </span>
            </div>

            <div
              style={{
                height: 6,
                background: "var(--color-bg-page)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(completedCount / total) * 100}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, var(--color-violet-500), var(--color-violet-600))",
                  transition: "width .3s ease-out",
                }}
              />
            </div>

            <ChipRow state={state} />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => router.push(FLOW_HREFS[resumeStep])}
                style={primaryButton}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="6,4 22,12 6,20" />
                </svg>
                Continue · {FLOW_LABELS[resumeStep]}
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Discard the current product draft and start a new one?",
                    )
                  ) {
                    resetFlow();
                    router.push("/pcb");
                  }
                }}
                style={ghostButton}
              >
                Start fresh
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              background: "var(--color-bg-surface)",
              border:
                "var(--border-width-1) solid var(--color-border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              textAlign: "left",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Steps
              </div>
              <ChipRow state={state} />
            </div>
            <button
              onClick={() => router.push("/pcb")}
              style={primaryButton}
            >
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
                <path d="M12 5v14 M5 12h14" />
              </svg>
              Start a new product
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
          <a
            onClick={() => router.push("/pcb")}
            style={miniLink}
          >
            PCB
          </a>
          <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
          <a
            onClick={() => router.push("/code")}
            style={miniLink}
          >
            Code
          </a>
          <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
          <a
            onClick={() => router.push("/3d")}
            style={miniLink}
          >
            3D
          </a>
          <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
          <a
            onClick={() => router.push("/preview")}
            style={miniLink}
          >
            Preview
          </a>
          <span style={{ color: "var(--color-text-tertiary)" }}>·</span>
          <a
            onClick={() => router.push("/brief")}
            style={miniLink}
          >
            Brief
          </a>
        </div>
      </div>
    </main>
  );
}

function ChipRow({
  state,
}: {
  state: ReturnType<typeof useProductFlow>["state"];
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
      }}
    >
      {FLOW_ORDER.map((step, idx) => {
        const done = state[step as keyof typeof state] === true;
        return (
          <span
            key={step}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              background: done
                ? "var(--color-bg-brand-subtle)"
                : "var(--color-bg-page)",
              color: done
                ? "var(--color-violet-600)"
                : "var(--color-text-tertiary)",
              border: `var(--border-width-1) solid ${
                done
                  ? "var(--color-border-brand)"
                  : "var(--color-border-subtle)"
              }`,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                background: done
                  ? "var(--color-violet-600)"
                  : "var(--color-bg-surface-raised)",
                color: done
                  ? "var(--color-text-on-brand)"
                  : "var(--color-text-tertiary)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {done ? (
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4 10-10" />
                </svg>
              ) : (
                idx + 1
              )}
            </span>
            {FLOW_LABELS[step as FlowStep]}
          </span>
        );
      })}
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  flex: 1,
  padding: "14px 22px",
  background: "var(--color-violet-600)",
  color: "var(--color-text-on-brand)",
  border: "none",
  borderRadius: "var(--radius-3xl)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 8px 26px -8px rgba(124, 45, 185, .4)",
};

const ghostButton: React.CSSProperties = {
  padding: "14px 18px",
  background: "transparent",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-3xl)",
  color: "var(--color-text-primary)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const miniLink: React.CSSProperties = {
  color: "var(--color-violet-600)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};
