"use client";

// IDEEZA PCB Software — color picker popover (Photoshop-style).
// SV gradient square + hue bar + Hex / R / G / B / A readout. Used for the
// net/wire color change flow. Interactive: drag the SV square / hue bar, or
// type a hex value.

import * as React from "react";

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 24, g: 144, b: 255 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const h = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}
function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { r, g, b } = hexToRgb(value);
  const { h, s, v } = rgbToHsv(r, g, b);

  // Capture the target rect at pointer-down and track until release (no refs).
  const onSvDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const apply = (cx: number, cy: number) => {
      const ns = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
      const nv = Math.max(0, Math.min(1, 1 - (cy - rect.top) / rect.height));
      const c = hsvToRgb(h, ns, nv);
      onChange(rgbToHex(c.r, c.g, c.b));
    };
    apply(e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => apply(ev.clientX, ev.clientY);
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const onHueDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const apply = (cx: number) => {
      const nh = Math.max(0, Math.min(360, ((cx - rect.left) / rect.width) * 360));
      const c = hsvToRgb(nh, s || 1, v || 1);
      onChange(rgbToHex(c.r, c.g, c.b));
    };
    apply(e.clientX);
    const mv = (ev: PointerEvent) => apply(ev.clientX);
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };

  const cell = (label: string, val: string | number) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-primary)", fontWeight: 600 }}>{val}</div>
      <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-tertiary)" }}>{label}</div>
    </div>
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 240,
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-5)",
        padding: "var(--spacing-3)",
        userSelect: "none",
      }}
    >
      {/* SV square */}
      <div
        onPointerDown={onSvDown}
        style={{
          position: "relative",
          width: "100%",
          height: 150,
          borderRadius: "var(--radius-sm)",
          cursor: "crosshair",
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h},100%,50%))`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `calc(${s * 100}% - 6px)`,
            top: `calc(${(1 - v) * 100}% - 6px)`,
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,.4)",
          }}
        />
      </div>

      {/* hue bar */}
      <div
        onPointerDown={onHueDown}
        style={{
          position: "relative",
          width: "100%",
          height: 12,
          margin: "var(--spacing-4) 0 var(--spacing-3)",
          borderRadius: "var(--radius-full)",
          cursor: "pointer",
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <div style={{ position: "absolute", left: `calc(${(h / 360) * 100}% - 6px)`, top: -2, width: 12, height: 16, borderRadius: "var(--radius-sm)", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,.4)" }} />
      </div>

      {/* hex + rgba */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", justifyContent: "space-between" }}>
        <input
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="ix-arr-input"
          style={{ width: 92, padding: "var(--spacing-2) var(--spacing-3)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-family-mono)", color: "var(--color-text-primary)", background: "var(--color-bg-surface)", outline: "none" }}
        />
        {cell("R", Math.round(r))}
        {cell("G", Math.round(g))}
        {cell("B", Math.round(b))}
        {cell("A", 100)}
      </div>
    </div>
  );
}
