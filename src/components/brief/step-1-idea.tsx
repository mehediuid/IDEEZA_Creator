"use client";

// Step 1 — "What's your idea?"
// 2 fields (product name + one-line description) + 3 intent cards.
// Centered max-w 560, breathing whitespace, one Continue CTA.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import { type Intent } from "./brief-app";

const MAX_DESC = 140;

const INTENTS: { id: Intent; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    id: "sell",
    label: "Sell Your Idea",
    sub: "Mint as NFT and list",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10 M9 9.5h4.5a2 2 0 0 1 0 4H9h4.5a2 2 0 0 1 0 4H9" />
      </svg>
    ),
  },
  {
    id: "give",
    label: "Give to Community",
    sub: "Free distribute / drop",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.4" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6 M14 20c0-2.5 1.6-4.5 3-4.5s3 2 3 4.5" />
      </svg>
    ),
  },
  {
    id: "save",
    label: "Save as Private",
    sub: "Keep in your library",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M12 11v5 M10 13l2-2 2 2" />
      </svg>
    ),
  },
];

export function Step1Idea({
  activeProjectName,
  productName,
  productDescription,
  intent,
  onChange,
  onContinue,
}: {
  activeProjectName: string;
  productName: string;
  productDescription: string;
  intent: Intent | null;
  onChange: (patch: { productName?: string; productDescription?: string; intent?: Intent }) => void;
  onContinue: () => void;
}) {
  const canContinue =
    productName.trim().length > 0 &&
    productDescription.trim().length > 0 &&
    !!intent;

  return (
    <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.5 }}>
          What&rsquo;s your idea?
        </h1>
        <p style={{ fontSize: 15, color: C.body, marginTop: 8 }}>
          A name and one line. Quick.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <FieldLabel label="Project">
          <>
            <div
              style={{
                height: 48,
                width: "100%",
                padding: "0 16px",
                background: "var(--color-bg-surface-raised)",
                border: "var(--border-width-1) solid var(--color-border-subtle)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeProjectName || "Active project"}
              </span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <span style={{ fontSize: 12, color: C.body }}>
              This brief belongs to your active project.
            </span>
          </>
        </FieldLabel>

        <FieldLabel label="Product name">
          <input
            value={productName}
            onChange={(e) => onChange({ productName: e.target.value })}
            placeholder="Discord Bot"
            autoFocus
            style={inputStyle}
          />
        </FieldLabel>

        <FieldLabel
          label="One line · what does it do?"
          right={
            <span style={{ fontSize: 12, color: C.body, fontVariantNumeric: "tabular-nums" }}>
              {productDescription.length} / {MAX_DESC}
            </span>
          }
        >
          <textarea
            value={productDescription}
            onChange={(e) => onChange({ productDescription: e.target.value.slice(0, MAX_DESC) })}
            placeholder="A discord bot that pings on every command."
            rows={2}
            style={{ ...inputStyle, height: 64, resize: "none", paddingTop: 14, paddingBottom: 14, fontFamily: "inherit" }}
          />
        </FieldLabel>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>
          How do you want to share it?
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {INTENTS.map((i) => {
            const sel = intent === i.id;
            return (
              <button
                key={i.id}
                onClick={() => onChange({ intent: i.id })}
                style={{
                  padding: "20px 16px",
                  background: sel ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
                  border: `var(--border-width-1-5) solid ${sel ? "var(--color-border-brand)" : "var(--color-border-subtle)"}`,
                  borderRadius: "var(--radius-lg)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  color: sel ? C.primary : C.text,
                  transition: "background .14s, border-color .14s, color .14s",
                }}
              >
                {i.icon}
                <div style={{ fontSize: 13, fontWeight: 700 }}>{i.label}</div>
                <div style={{ fontSize: 11, color: sel ? C.primary : C.body, opacity: sel ? 0.85 : 1, fontWeight: 500 }}>{i.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          style={{
            padding: "14px 32px",
            background: canContinue ? C.primary : "var(--color-bg-surface-raised)",
            color: canContinue ? "var(--color-text-on-brand)" : "var(--color-text-tertiary)",
            border: "none",
            borderRadius: "var(--radius-3xl)",
            fontSize: 15,
            fontWeight: 700,
            cursor: canContinue ? "pointer" : "default",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "background .14s",
          }}
        >
          Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 48,
  width: "100%",
  padding: "0 16px",
  background: "var(--color-bg-surface)",
  border: "var(--border-width-1) solid var(--color-border-subtle)",
  borderRadius: "var(--radius-lg)",
  fontSize: 15,
  color: "var(--color-text-primary)",
  outline: "none",
  fontFamily: "inherit",
};

function FieldLabel({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>{label}</span>
        {right}
      </span>
      {children}
    </label>
  );
}
