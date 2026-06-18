"use client";

// 3D Module — right Settings panel (Figma 33552:188795 / 22106:128568 et al).
// Four collapsible sections:
//   1. Canvas Settings — View Option + Mouse Information row + Snap + Grid Size
//      + 9-cell resolution grid.
//   2. Scene Settings  — Environment + Background dropdowns.
//   3. Materials       — Surface dropdown + 3 material chips with thumbnails.
//   4. Effects         — eight named sliders (Color / Vivid / Fitting /
//      Striking / Glamorous / Color Balance / Add / Mineral) each with a
//      colour swatch and a 0-100% value.
// All state lives in the parent (ThreeApp) and is plumbed through props so
// the live 3D scene (Phase D) can read it.

import * as React from "react";
import { C } from "@/lib/pcb/colors";

export type Snap = { x: boolean; y: boolean; z: boolean };
export type Effect = { id: string; label: string; color: string; value: number };

export const DEFAULT_EFFECTS: Effect[] = [
  { id: "color",       label: "Color",         color: "#ef4444", value: 40 },
  { id: "vivid",       label: "Vivid",         color: "#f97316", value: 40 },
  { id: "fitting",     label: "Fitting",       color: "#eab308", value: 40 },
  { id: "striking",    label: "Striking",      color: "#22c55e", value: 40 },
  { id: "glamorous",   label: "Glamorous",     color: "#3b82f6", value: 40 },
  { id: "colorBalance",label: "Color Balance", color: "#a855f7", value: 40 },
  { id: "add",         label: "Add",           color: "#ec4899", value: 40 },
  { id: "mineral",     label: "Mineral",       color: "#0ea5e9", value: 40 },
];

export type RightPanelState = {
  viewOption: string;        // "Full View Mode" / "100%" / "90%" / …
  mouseInfo: { d: string; xa: string; xb: string; xc: string };
  snap: Snap;
  gridSize: string;          // "IDEEZA-100"
  resolution: string[];      // length 9 (3×3 dropdowns)
  environment: string;
  background: string;
  surface: string;
  material: "antimony" | "tin" | "iron";
  effects: Effect[];
};

export const DEFAULT_RIGHT_STATE: RightPanelState = {
  viewOption: "Full View Mode",
  mouseInfo: { d: "5", xa: "0", xb: "0", xc: "0" },
  snap: { x: true, y: true, z: false },
  gridSize: "IDEEZA-100",
  resolution: Array(9).fill("Auto"),
  environment: "Plain",
  background: "Texture",
  surface: "Antimony",
  material: "antimony",
  effects: DEFAULT_EFFECTS,
};

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-tertiary)"
      strokeWidth="2.6"
      style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform .12s" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div style={{ borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
      <div
        onClick={onToggle}
        className="ix-nav"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-2)",
          padding: "var(--spacing-3) var(--spacing-4)",
          cursor: "pointer",
          fontSize: "var(--font-size-sm)",
          fontWeight: 600,
          color: C.text,
        }}
      >
        <Chevron open={open} />
        <span>{title}</span>
      </div>
      {open && <div style={{ padding: "var(--spacing-2) var(--spacing-4) var(--spacing-4)" }}>{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-1)", fontSize: "var(--font-size-xs)", color: C.body, fontWeight: 500 }}>
      {label}
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none",
        padding: "var(--spacing-2) var(--spacing-3)",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        color: C.text,
        cursor: "pointer",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.4'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        paddingRight: 28,
      }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function NumberInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "var(--spacing-2) var(--spacing-3)",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        color: C.text,
        textAlign: "center",
        width: "100%",
      }}
    />
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--spacing-2) var(--spacing-3)",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        fontSize: "var(--font-size-xs)",
        color: C.text,
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          width: 26,
          height: 14,
          borderRadius: 7,
          background: on ? C.primary : "var(--color-bg-surface-raised)",
          position: "relative",
          transition: "background .12s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 14 : 2,
            width: 10,
            height: 10,
            background: "var(--color-bg-surface)",
            borderRadius: "50%",
            transition: "left .12s",
            boxShadow: "0 1px 2px rgba(0,0,0,.2)",
          }}
        />
      </span>
    </div>
  );
}

function EffectRow({ effect, onChange }: { effect: Effect; onChange: (val: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-2) 0" }}>
      <span style={{ width: 12, height: 12, borderRadius: 6, background: effect.color, flex: "0 0 auto" }} />
      <span style={{ flex: 1, fontSize: "var(--font-size-xs)", color: C.text, fontWeight: 500 }}>{effect.label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={effect.value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: "0 0 70px", accentColor: "var(--color-violet-600)" }}
      />
      <span style={{ width: 30, textAlign: "right", fontSize: "var(--font-size-xs)", color: C.body, fontWeight: 600 }}>{effect.value}%</span>
    </div>
  );
}

const MATERIAL_CHIPS: { id: "antimony" | "tin" | "iron"; label: string; gradient: string }[] = [
  { id: "antimony", label: "Antimony", gradient: "linear-gradient(135deg,#9ca3af,#374151)" },
  { id: "tin",      label: "Tin",      gradient: "linear-gradient(135deg,#e5e7eb,#94a3b8)" },
  { id: "iron",     label: "Iron",     gradient: "linear-gradient(135deg,#52525b,#18181b)" },
];

export function ThreeRightPanel({
  topOffset = 132,
  width = 292,
  state,
  onChange,
  mouseInfo,
  transformMode = "none",
  onTransformMode,
}: {
  topOffset?: number;
  width?: number;
  state: RightPanelState;
  onChange: (next: Partial<RightPanelState>) => void;
  mouseInfo?: { x: number; y: number; z: number; distance: number } | null;
  transformMode?: "none" | "translate" | "rotate" | "scale";
  onTransformMode?: (m: "none" | "translate" | "rotate" | "scale") => void;
}) {
  const [open, setOpen] = React.useState({ canvas: true, scene: true, materials: false, effects: true });
  const toggle = (k: keyof typeof open) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  const setEffect = (id: string, value: number) =>
    onChange({ effects: state.effects.map((e) => (e.id === id ? { ...e, value } : e)) });

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 36,
        right: 0,
        width,
        background: "var(--color-bg-surface)",
        borderLeft: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        zIndex: 14,
      }}
    >
      {/* Header — single "Settings" tab indicator */}
      <div style={{ display: "flex", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", padding: "0 var(--spacing-4)" }}>
        <span
          style={{
            padding: "var(--spacing-3) var(--spacing-4)",
            borderBottom: `2px solid ${C.primary}`,
            fontSize: "var(--font-size-sm)",
            fontWeight: 700,
            color: C.text,
          }}
        >
          Settings
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Canvas Settings */}
        <Section title="Canvas Settings" open={open.canvas} onToggle={() => toggle("canvas")}>
          <Field label="View Option">
            <Select
              value={state.viewOption}
              onChange={(v) => onChange({ viewOption: v })}
              options={["Full View Mode", "100%", "90%", "80%", "70%", "60%"]}
            />
          </Field>
          <div style={{ marginTop: "var(--spacing-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", color: C.body, fontWeight: 500, marginBottom: 4 }}>Mouse Information</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
              <NumberInput value={mouseInfo ? mouseInfo.distance.toFixed(1) : state.mouseInfo.d} onChange={(v) => onChange({ mouseInfo: { ...state.mouseInfo, d: v } })} />
              <NumberInput value={mouseInfo ? mouseInfo.x.toFixed(1) : state.mouseInfo.xa} onChange={(v) => onChange({ mouseInfo: { ...state.mouseInfo, xa: v } })} />
              <NumberInput value={mouseInfo ? mouseInfo.y.toFixed(1) : state.mouseInfo.xb} onChange={(v) => onChange({ mouseInfo: { ...state.mouseInfo, xb: v } })} />
              <NumberInput value={mouseInfo ? mouseInfo.z.toFixed(1) : state.mouseInfo.xc} onChange={(v) => onChange({ mouseInfo: { ...state.mouseInfo, xc: v } })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, marginTop: 2, fontSize: "10px", color: "var(--color-text-tertiary)", textAlign: "center" }}>
              <span>Distance</span><span>X</span><span>Y</span><span>Z</span>
            </div>
          </div>
          {onTransformMode && (
            <div style={{ marginTop: "var(--spacing-4)" }}>
              <div style={{ fontSize: "var(--font-size-xs)", color: C.body, fontWeight: 500, marginBottom: 4 }}>Transform</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
                {(["none", "translate", "rotate", "scale"] as const).map((m) => {
                  const sel = transformMode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => onTransformMode(m)}
                      style={{
                        padding: "var(--spacing-2) 0",
                        background: sel ? "var(--color-bg-brand-subtle)" : "var(--color-bg-page)",
                        border: `var(--border-width-1) solid ${sel ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                        color: sel ? C.primary : C.text,
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 600,
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {m === "none" ? "Off" : m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ marginTop: "var(--spacing-4)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", color: C.body, fontWeight: 500, marginBottom: 4 }}>Snap</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
              <Toggle label="X" on={state.snap.x} onChange={(v) => onChange({ snap: { ...state.snap, x: v } })} />
              <Toggle label="Y" on={state.snap.y} onChange={(v) => onChange({ snap: { ...state.snap, y: v } })} />
              <Toggle label="Z" on={state.snap.z} onChange={(v) => onChange({ snap: { ...state.snap, z: v } })} />
            </div>
          </div>
          <div style={{ marginTop: "var(--spacing-4)" }}>
            <Field label="Grid Size">
              <Select value={state.gridSize} onChange={(v) => onChange({ gridSize: v })} options={["IDEEZA-100", "IDEEZA-50", "IDEEZA-25", "IDEEZA-10"]} />
            </Field>
          </div>
          <div style={{ marginTop: "var(--spacing-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", color: C.body, fontWeight: 500, marginBottom: 4 }}>Resolution</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
              {state.resolution.map((r, i) => (
                <Select
                  key={i}
                  value={r}
                  onChange={(v) => onChange({ resolution: state.resolution.map((x, j) => j === i ? v : x) })}
                  options={["Auto", "Low", "Medium", "High", "Ultra"]}
                />
              ))}
            </div>
          </div>
        </Section>

        {/* Scene Settings */}
        <Section title="Scene Settings" open={open.scene} onToggle={() => toggle("scene")}>
          <Field label="Environment">
            <Select value={state.environment} onChange={(v) => onChange({ environment: v })} options={["Studio", "Sunset", "Park", "Warehouse", "Plain"]} />
          </Field>
          <div style={{ marginTop: "var(--spacing-3)" }}>
            <Field label="Background">
              <Select value={state.background} onChange={(v) => onChange({ background: v })} options={["Texture", "Solid", "Gradient", "Transparent"]} />
            </Field>
          </div>
        </Section>

        {/* Materials */}
        <Section title="Materials" open={open.materials} onToggle={() => toggle("materials")}>
          <Field label="Surface">
            <Select value={state.surface} onChange={(v) => onChange({ surface: v })} options={["Antimony", "Tin", "Iron", "Copper", "Glass"]} />
          </Field>
          <div style={{ display: "flex", gap: "var(--spacing-3)", marginTop: "var(--spacing-3)" }}>
            {MATERIAL_CHIPS.map((m) => (
              <button
                key={m.id}
                onClick={() => onChange({ material: m.id })}
                style={{
                  flex: 1,
                  padding: "var(--spacing-2)",
                  background: "transparent",
                  border: `var(--border-width-1-5) solid ${state.material === m.id ? "var(--color-border-brand)" : "transparent"}`,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--spacing-1)",
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 14, background: m.gradient }} />
                <span style={{ fontSize: "var(--font-size-xs)", color: C.text, fontWeight: 600 }}>{m.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Effects */}
        <Section title="Effects" open={open.effects} onToggle={() => toggle("effects")}>
          {state.effects.map((eff) => (
            <EffectRow key={eff.id} effect={eff} onChange={(v) => setEffect(eff.id, v)} />
          ))}
        </Section>
      </div>
    </div>
  );
}
