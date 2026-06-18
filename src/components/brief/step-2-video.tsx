"use client";

// Step 2 — "Here's your video"
// Video preview + 3 scene cards (edit popover with Visual/BgAudio/Music/Speech) +
// Quality toggle. Auto-starts generation when this step mounts.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import type { Scene, Quality } from "./brief-app";

export function Step2Video({
  scenes,
  quality,
  generating,
  onSceneChange,
  onRegenerate,
  onQualityChange,
  onContinue,
  onSkip,
  onBack,
}: {
  scenes: Scene[];
  quality: Quality;
  generating: boolean;
  onSceneChange: (id: string, patch: Partial<Scene>) => void;
  onRegenerate: () => void;
  onQualityChange: (q: Quality) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <div onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.body, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Back
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.5 }}>
          Here&rsquo;s your video
        </h1>
        <p style={{ fontSize: 14, color: C.body, marginTop: 6 }}>
          AI drafted 3 scenes. Edit any of them — or move on.
        </p>
      </div>

      {/* Preview */}
      <div
        style={{
          aspectRatio: "16 / 9",
          background: "var(--color-bg-surface-raised)",
          borderRadius: "var(--radius-lg)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {generating ? (
          <Shimmer label={`Generating ${quality === "low" ? "480p" : "720p"}…`} />
        ) : (
          <PlayPreview />
        )}
      </div>

      {/* Scenes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {scenes.map((s) => (
          <SceneRow
            key={s.id}
            scene={s}
            editing={editingId === s.id}
            onToggleEdit={() => setEditingId(editingId === s.id ? null : s.id)}
            onChange={(patch) => onSceneChange(s.id, patch)}
            onRegenerate={() => onRegenerate()}
          />
        ))}
      </div>

      {/* Quality */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Quality</span>
        <Pill selected={quality === "low"} onClick={() => onQualityChange("low")}>Low · 480p</Pill>
        <Pill selected={quality === "high"} onClick={() => onQualityChange("high")}>High · 720p</Pill>
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <button
          onClick={onSkip}
          style={{ background: "transparent", border: "none", color: C.body, fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Skip media
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onRegenerate}
            disabled={generating}
            style={{
              padding: "12px 20px",
              background: "var(--color-bg-surface)",
              color: C.text,
              border: "var(--border-width-1) solid var(--color-border-default)",
              borderRadius: "var(--radius-3xl)",
              fontSize: 14,
              fontWeight: 600,
              cursor: generating ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5" />
            </svg>
            Regenerate
          </button>
          <button
            onClick={onContinue}
            style={{
              padding: "14px 32px",
              background: C.primary,
              color: "var(--color-text-on-brand)",
              border: "none",
              borderRadius: "var(--radius-3xl)",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Looks good
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SceneRow({
  scene,
  editing,
  onToggleEdit,
  onChange,
  onRegenerate,
}: {
  scene: Scene;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (patch: Partial<Scene>) => void;
  onRegenerate: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${editing ? "var(--color-border-brand)" : "var(--color-border-subtle)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transition: "border-color .14s",
      }}
    >
      <div
        onClick={onToggleEdit}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{scene.label}</span>
          <span style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>{scene.timeRange}</span>
        </div>
        <span style={{ fontSize: 12, color: C.body, display: "inline-flex", alignItems: "center", gap: 4 }}>
          {editing ? "Done" : "Edit"}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: editing ? "rotate(180deg)" : undefined, transition: "transform .14s" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
      {editing && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <SceneField label="Visual description" value={scene.visual} onChange={(v) => onChange({ visual: v })} rows={2} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <SceneField label="Background audio" value={scene.bgAudio} onChange={(v) => onChange({ bgAudio: v })} rows={1} />
            <SceneField label="Music cue" value={scene.musicCue} onChange={(v) => onChange({ musicCue: v })} rows={1} />
          </div>
          <SceneField label="Speech / Dialogue" value={scene.speech} onChange={(v) => onChange({ speech: v })} rows={1} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onRegenerate}
              style={{ background: "transparent", border: "none", color: C.primary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              ↻ Regenerate this scene
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SceneField({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.body }}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          padding: "8px 10px",
          background: "var(--color-bg-page)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          color: "var(--color-text-primary)",
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: selected ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
        border: `var(--border-width-1) solid ${selected ? "var(--color-border-brand)" : "var(--color-border-subtle)"}`,
        borderRadius: 999,
        color: selected ? C.primary : C.body,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "background .14s, border-color .14s",
      }}
    >
      {children}
    </button>
  );
}

function Shimmer({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "3px solid var(--color-border-subtle)",
          borderTopColor: "var(--color-violet-600)",
          animation: "ix-spin 0.9s linear infinite",
        }}
      />
      <div style={{ fontSize: 13, color: C.body, fontWeight: 500 }}>{label}</div>
      <style>{`@keyframes ix-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function PlayPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: C.body }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--color-bg-brand-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--color-violet-600)">
          <polygon points="6,4 22,12 6,20" />
        </svg>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>3 scenes · 10s</div>
    </div>
  );
}
