"use client";

// Step 2 — "Create your video"
//
// AR / AI / Skip selector at top. AI mode shows video prompt + audio prompt
// (with Auto-Generate toggle) + quality + length pills + Generate button.
// After Generate, scenes appear inline below with edit popovers — same step,
// progressive disclosure, no screen change.
//
// AR mode shows a phone-camera instruction card. Skip jumps straight to mint.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import type { BriefState, Scene, MediaType, Quality, VideoLength } from "./brief-app";

export function Step2Video({
  state,
  generating,
  onChange,
  onSceneChange,
  onGenerate,
  onRegenerate,
  onContinue,
  onSkip,
  onBack,
}: {
  state: BriefState;
  generating: boolean;
  onChange: (patch: Partial<BriefState>) => void;
  onSceneChange: (id: string, patch: Partial<Scene>) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const canGenerate = state.videoPrompt.trim().length > 0 && !generating;
  const canContinue =
    state.mediaType === "ar" ||
    state.mediaType === "skip" ||
    (state.mediaType === "ai" && state.mediaGenerated);

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
          Create your video
        </h1>
        <p style={{ fontSize: 14, color: C.body, marginTop: 6 }}>
          Pick how you want to record — or skip it for now.
        </p>
      </div>

      {/* Media type tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <TypeCard
          id="ar"
          label="AR"
          sub="Record from your phone"
          recommended
          selected={state.mediaType === "ar"}
          onClick={() => onChange({ mediaType: "ar" })}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="3" width="12" height="18" rx="2" />
              <circle cx="12" cy="17" r="1" />
              <path d="M9 7h6" />
            </svg>
          }
        />
        <TypeCard
          id="ai"
          label="AI"
          sub="Generate from a prompt"
          selected={state.mediaType === "ai"}
          onClick={() => onChange({ mediaType: "ai" })}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 12a3 3 0 0 1 6 0z M12 7v2 M12 15v2 M7 12h2 M15 12h2" />
            </svg>
          }
        />
        <TypeCard
          id="skip"
          label="Skip"
          sub="Add later"
          selected={state.mediaType === "skip"}
          onClick={() => onChange({ mediaType: "skip" })}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l7 5-7 5 M13 8l7 5-7 5" />
            </svg>
          }
        />
      </div>

      {/* AI mode — prompts + controls + generate */}
      {state.mediaType === "ai" && (
        <>
          <FieldGroup label="What should the video show?">
            <textarea
              value={state.videoPrompt}
              onChange={(e) => onChange({ videoPrompt: e.target.value })}
              placeholder="Aerial cinematic of a Discord bot ping notification floating over a cityscape at dusk."
              rows={3}
              style={textareaStyle}
            />
          </FieldGroup>

          <FieldGroup
            label="Audio prompt"
            right={
              <Toggle
                small
                label="Auto-generate"
                on={state.audioAutoGenerate}
                onChange={(v) => onChange({ audioAutoGenerate: v })}
              />
            }
          >
            <textarea
              value={state.audioPrompt}
              onChange={(e) => onChange({ audioPrompt: e.target.value })}
              placeholder={state.audioAutoGenerate ? "Auto: ambient + soft synth (override if you want)" : "Describe the soundscape, mood, instruments"}
              rows={2}
              style={{ ...textareaStyle, opacity: state.audioAutoGenerate ? 0.7 : 1 }}
            />
          </FieldGroup>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FieldGroup label="Quality">
              <div style={{ display: "flex", gap: 8 }}>
                <Pill selected={state.quality === "low"} onClick={() => onChange({ quality: "low" })}>Low · 480p</Pill>
                <Pill selected={state.quality === "high"} onClick={() => onChange({ quality: "high" })}>High · 720p</Pill>
              </div>
            </FieldGroup>
            <FieldGroup label="Length">
              <div style={{ display: "flex", gap: 8 }}>
                <Pill selected={state.length === 10} onClick={() => onChange({ length: 10 as VideoLength })}>10s</Pill>
                <Pill selected={state.length === 30} onClick={() => onChange({ length: 30 as VideoLength })}>30s</Pill>
              </div>
            </FieldGroup>
          </div>

          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            style={{
              padding: "14px 24px",
              background: canGenerate ? C.primary : "var(--color-bg-surface-raised)",
              color: canGenerate ? "var(--color-text-on-brand)" : "var(--color-text-tertiary)",
              border: "none",
              borderRadius: "var(--radius-3xl)",
              fontSize: 14,
              fontWeight: 700,
              cursor: canGenerate ? "pointer" : "default",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background .14s",
            }}
          >
            {generating ? (
              <>
                <Spinner />
                Generating storyboard…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
                </svg>
                {state.mediaGenerated ? "Regenerate storyboard" : "Generate storyboard"}
              </>
            )}
          </button>

          {/* Storyboard scenes appear INLINE here after generation */}
          {state.mediaGenerated && !generating && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Storyboard</div>
              <div style={{ fontSize: 12, color: C.body, marginTop: -6 }}>AI drafted 3 scenes — edit any of them.</div>
              {state.scenes.map((s) => (
                <SceneRow
                  key={s.id}
                  scene={s}
                  editing={editingId === s.id}
                  onToggleEdit={() => setEditingId(editingId === s.id ? null : s.id)}
                  onChange={(patch) => onSceneChange(s.id, patch)}
                  onRegenerate={onRegenerate}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* AR mode */}
      {state.mediaType === "ar" && (
        <div
          style={{
            padding: 24,
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-subtle)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-violet-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="2" width="12" height="20" rx="2.5" />
            <circle cx="12" cy="17.5" r="1" />
            <path d="M9 6h6" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Record from your phone</div>
          <div style={{ fontSize: 13, color: C.body, maxWidth: 340 }}>
            Open the IDEEZA app on your phone and scan the QR code at the next step to start recording.
          </div>
        </div>
      )}

      {/* Skip mode */}
      {state.mediaType === "skip" && (
        <div style={{ fontSize: 13, color: C.body }}>
          You can add media later from the project dashboard. Continue to set up the mint.
        </div>
      )}

      {/* Footer — Continue */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <button
          onClick={onSkip}
          style={{ background: "transparent", border: "none", color: C.body, fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          {state.mediaType === "skip" ? "" : "Skip media"}
        </button>
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

// ── helpers ─────────────────────────────────────────────────────────────

function TypeCard({
  label,
  sub,
  icon,
  selected,
  recommended,
  onClick,
}: {
  id: MediaType;
  label: string;
  sub: string;
  icon: React.ReactNode;
  selected: boolean;
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        padding: "16px 12px",
        background: selected ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
        border: `var(--border-width-1-5) solid ${selected ? "var(--color-border-brand)" : "var(--color-border-subtle)"}`,
        borderRadius: "var(--radius-lg)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        color: selected ? C.primary : C.text,
        transition: "background .14s, border-color .14s",
      }}
    >
      {recommended && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 6px",
            background: "var(--color-green-100)",
            color: "var(--color-green-700)",
            borderRadius: 999,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          Recommended
        </span>
      )}
      {icon}
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 11, color: selected ? C.primary : C.body, opacity: selected ? 0.85 : 1, fontWeight: 500, textAlign: "center" }}>{sub}</div>
    </button>
  );
}

function FieldGroup({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
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
              ↻ Regenerate
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

function Toggle({ on, onChange, label, small }: { on: boolean; onChange: (v: boolean) => void; label?: string; small?: boolean }) {
  const w = small ? 28 : 34;
  const h = small ? 16 : 20;
  const knob = small ? 12 : 16;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
      {label}
      <span
        onClick={(e) => { e.preventDefault(); onChange(!on); }}
        style={{ width: w, height: h, borderRadius: h / 2, background: on ? "var(--color-violet-600)" : "var(--color-bg-surface-raised)", position: "relative", cursor: "pointer", transition: "background .14s", flex: `0 0 ${w}px` }}
      >
        <span style={{ position: "absolute", top: 2, left: on ? w - knob - 2 : 2, width: knob, height: knob, background: "var(--color-bg-surface)", borderRadius: "50%", boxShadow: "0 1px 2px rgba(0,0,0,.2)", transition: "left .14s" }} />
      </span>
    </span>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.45)",
        borderTopColor: "currentColor",
        animation: "ix-brief-spin .8s linear infinite",
        display: "inline-block",
      }}
    >
      <style>{`@keyframes ix-brief-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

const textareaStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "var(--color-bg-surface)",
  border: "var(--border-width-1) solid var(--color-border-subtle)",
  borderRadius: "var(--radius-lg)",
  fontSize: 14,
  color: "var(--color-text-primary)",
  resize: "vertical",
  outline: "none",
  fontFamily: "inherit",
};
