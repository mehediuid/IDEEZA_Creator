"use client";

// IDEEZA Code — Blockly mode (Figma frames 41579:736835 / 737032 / 737137 /
// 737242 / 737354). Three tabs in the left library (Common Library / Arduino /
// Raspberry Pi), expandable categories with sample blocks, plus right-side
// Block Preview / Code Preview tabs. Pins a "+" FAB at the panel's bottom-right
// (the "Create New Part Or Component" entry point).

import * as React from "react";
import { C } from "@/lib/pcb/colors";

type LibTab = "common" | "arduino" | "raspberry";
type PreviewTab = "blocks" | "code";

const CATEGORIES_COMMON = ["Logic", "Loops", "Math", "Text", "Lists", "Color", "Function"];
const CATEGORIES_CUSTOM = ["Base", "GPIO In", "GPIO Out", "Digital Tube", "Lists", "Color", "Function"];

const SAMPLE_CODE = `const pluckDeep = key => obj => key.split('.').reduce((accum, key) => accum[key], obj)

const compose = (...fns) => res => fns.reduce((accum, next) => next(accum), res)

const unfold = (f, seed) => {
  const go = (f, seed, acc) => {
    const res = f(seed)
    return res ? go(f, res[1], acc.concat([res[0]])) : acc
  }
}`;

function ChevronRight({ down }: { down?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.4" style={{ transform: down ? "rotate(90deg)" : undefined, transition: "transform .12s" }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function SearchInput() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        padding: "var(--spacing-2) var(--spacing-3)",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.9" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        placeholder="Search parts & compo.."
        style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "var(--font-size-sm)", color: C.body }}
      />
    </div>
  );
}

function LibTabs({ value, onChange }: { value: LibTab; onChange: (v: LibTab) => void }) {
  const tabs: { id: LibTab; label: React.ReactNode }[] = [
    { id: "common", label: "Common Library" },
    {
      id: "arduino",
      label: (
        <svg width="20" height="14" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="6" cy="8" r="5" />
          <circle cx="18" cy="8" r="5" />
          <path d="M3 8h6 M6 5v6 M15 8h6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "raspberry",
      label: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-2 2-3 3-3 5 0 1 .5 2 1 2.5-2 .5-3 2-3 4 0 2.5 2 4.5 5 4.5s5-2 5-4.5c0-2-1-3.5-3-4 .5-.5 1-1.5 1-2.5 0-2-1-3-3-5z" />
        </svg>
      ),
    },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", padding: "var(--spacing-3)" }}>
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: t.id === "common" ? "var(--spacing-2) var(--spacing-5)" : "var(--spacing-2) var(--spacing-4)",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: active ? C.primary : "transparent",
              color: active ? "var(--color-text-on-brand)" : C.body,
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function SampleBlock({ faded }: { faded?: boolean }) {
  return (
    <div
      style={{
        width: 124,
        height: 44,
        background: faded ? "var(--color-green-200)" : "var(--color-green-500)",
        borderRadius: "var(--radius-sm)",
        position: "relative",
        opacity: faded ? 0.5 : 1,
        boxShadow: "inset 0 -2px 0 rgba(0,0,0,.08)",
      }}
    >
      <div style={{ position: "absolute", top: 4, left: 6, display: "flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>repeat</span>
        <span style={{ padding: "1px 6px", borderRadius: 2, background: "var(--color-green-700)", color: "#fff", fontSize: 10, fontWeight: 600 }}>while ▾</span>
      </div>
      <div style={{ position: "absolute", bottom: 4, left: 6, display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>do</span>
        <div style={{ width: 60, height: 8, background: "#fff", borderRadius: 2, opacity: 0.9 }} />
      </div>
    </div>
  );
}

function CategoryRow({ name, open, onToggle, faded }: { name: string; open: boolean; onToggle: () => void; faded?: boolean }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "var(--spacing-3) var(--spacing-4)",
        cursor: "pointer",
        fontSize: "var(--font-size-sm)",
        fontWeight: 500,
        color: faded ? "var(--color-text-tertiary)" : C.text,
      }}
    >
      <ChevronRight down={open} />
      <span>{name}</span>
    </div>
  );
}

function PreviewTabs({ value, onChange }: { value: PreviewTab; onChange: (v: PreviewTab) => void }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 24,
        display: "inline-flex",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        zIndex: 5,
      }}
    >
      {(["blocks", "code"] as PreviewTab[]).map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            style={{
              padding: "var(--spacing-2) var(--spacing-6)",
              border: "none",
              background: active ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
              color: active ? C.primary : C.body,
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t === "blocks" ? "Block Preview" : "Code Preview"}
          </button>
        );
      })}
    </div>
  );
}

function CodePreviewCard() {
  return (
    <div
      style={{
        margin: "60px auto 0",
        maxWidth: 900,
        background: "var(--color-bg-surface-raised)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--spacing-8) var(--spacing-10)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "var(--font-size-sm)",
        lineHeight: 1.6,
        color: C.text,
        whiteSpace: "pre",
        boxShadow: "var(--elevation-1)",
      }}
    >
      {SAMPLE_CODE}
    </div>
  );
}

export function BlocklyEditor({ topOffset = 172, leftOffset = 74 }: { topOffset?: number; leftOffset?: number }) {
  const [libTab, setLibTab] = React.useState<LibTab>("common");
  const [previewTab, setPreviewTab] = React.useState<PreviewTab>("blocks");
  const [openCats, setOpenCats] = React.useState<Record<string, boolean>>({ Logic: true });

  const categories = libTab === "raspberry" ? CATEGORIES_CUSTOM : CATEGORIES_COMMON;

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 36,
        left: leftOffset,
        right: 0,
        background: "var(--color-bg-page)",
        display: "flex",
      }}
    >
      {/* LEFT LIBRARY PANEL */}
      <div
        style={{
          width: 254,
          margin: "var(--spacing-4)",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--elevation-1)",
          position: "relative",
        }}
      >
        <LibTabs value={libTab} onChange={setLibTab} />
        <div style={{ padding: "0 var(--spacing-3)" }}>
          <SearchInput />
        </div>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 60 }}>
          {categories.map((cat) => {
            const open = !!openCats[cat];
            return (
              <div key={cat}>
                <CategoryRow name={cat} open={open} onToggle={() => setOpenCats((s) => ({ ...s, [cat]: !s[cat] }))} />
                {open && (
                  <div style={{ padding: "var(--spacing-2) var(--spacing-4) var(--spacing-3)" }}>
                    {cat === "Base" && libTab === "raspberry" && (
                      <div style={{ display: "flex", gap: "var(--spacing-5)", marginBottom: "var(--spacing-3)" }}>
                        <span style={{ padding: "2px 10px", borderRadius: 12, background: "var(--color-bg-brand-subtle)", color: C.primary, fontSize: 11, fontWeight: 700 }}>Public</span>
                        <span style={{ padding: "2px 10px", borderRadius: 12, background: "transparent", color: C.body, fontSize: 11, fontWeight: 600 }}>Private</span>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-2)" }}>
                      <SampleBlock />
                      <SampleBlock />
                      <SampleBlock />
                      <SampleBlock />
                      <SampleBlock faded />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* "+" FAB */}
        <button
          aria-label="Create New Part Or Component"
          title="Create New Part Or Component"
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: 16,
            border: "none",
            background: C.primary,
            color: "var(--color-text-on-brand)",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--elevation-3)",
          }}
        >
          +
        </button>
      </div>

      {/* CANVAS / PREVIEW AREA */}
      <div style={{ flex: 1, position: "relative" }}>
        <PreviewTabs value={previewTab} onChange={setPreviewTab} />
        {previewTab === "code" ? <CodePreviewCard /> : (
          /* Empty canvas + collapse-panel chevron handle on the left edge */
          <div
            style={{
              position: "absolute",
              left: -6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 28,
              height: 28,
              borderRadius: 14,
              background: C.primary,
              color: "var(--color-text-on-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--elevation-2)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
