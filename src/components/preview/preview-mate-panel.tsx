"use client";

// MateSection — SolidWorks-style "Mate Type" property group for the Product
// Preview right panel. Appears only while an instance is selected; records
// the designer's mate intent per instance (type, distance, angle, alignment)
// via PreviewContext. Pure UI state for now — no constraint solving.
//
// Interaction notes:
//   • Mate list is a roving-tabindex radiogroup (↑/↓ moves selection).
//   • Distance/Angle only apply to some mate types; inapplicable fields are
//     disabled (not hidden) so the layout never jumps.
//   • Values clamp + reformat on blur, not per keystroke.

import * as React from "react";
import {
  usePreview,
  DEFAULT_MATE,
  type MateAlignment,
  type MateType,
} from "./preview-context";
import { NumberInput } from "@/components/ideeza/number-input";

// Which numeric fields each mate type uses.
const USES_DISTANCE: ReadonlyArray<MateType> = ["parallel", "tangent", "concentric"];
const USES_ANGLE: ReadonlyArray<MateType> = ["parallel", "perpendicular"];

type MateDef = { type: MateType; label: string; icon: React.ReactNode };

// 20px stroke glyphs matching the app icon language (1.8 stroke, round caps).
const G = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const MATE_DEFS: MateDef[] = [
  {
    type: "coincident",
    label: "Coincident",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
        <path d="M5 19L11 7M19 16l-7.5-8.5" />
        <circle cx="11" cy="7" r="1.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    type: "parallel",
    label: "Parallel",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
        <path d="M6 19L14 5M12 19L20 5" />
      </svg>
    ),
  },
  {
    type: "perpendicular",
    label: "Perpendicular",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
        <path d="M4 19h16M12 19V5" />
      </svg>
    ),
  },
  {
    type: "tangent",
    label: "Tangent",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
        <circle cx="12" cy="15" r="4.5" />
        <path d="M4 10.5h16" />
      </svg>
    ),
  },
  {
    type: "concentric",
    label: "Concentric",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ),
  },
  {
    type: "lock",
    label: "Lock",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
        <rect x="6" y="11" width="12" height="9" rx="2" />
        <path d="M9 11V8a3 3 0 0 1 6 0v3" />
      </svg>
    ),
  },
];

const DistanceIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
    <path d="M4 5v14M20 5v14M8 12h8M8 12l2.5-2.5M8 12l2.5 2.5M16 12l-2.5-2.5M16 12l-2.5 2.5" />
  </svg>
);

const AngleIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
    <path d="M5 19h14M5 19L15 6M11.5 19a7 7 0 0 0-2.3-5.2" />
  </svg>
);

const AlignedIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
    <path d="M8 5v13M8 18l-3-3M8 18l3-3M16 5v13M16 18l-3-3M16 18l3-3" />
  </svg>
);

const AntiAlignedIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" {...G}>
    <path d="M8 5v13M8 18l-3-3M8 18l3-3M16 19V6M16 6l-3 3M16 6l3 3" />
  </svg>
);

export function MateSection({ id }: { id: string }) {
  const { mates, setMate } = usePreview();
  const mate = mates[id] ?? DEFAULT_MATE;
  const [open, setOpen] = React.useState(true);
  const listRef = React.useRef<HTMLDivElement>(null);

  const distanceEnabled = USES_DISTANCE.includes(mate.type);
  const angleEnabled = USES_ANGLE.includes(mate.type);

  // ↑/↓ roving selection inside the radiogroup.
  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const idx = MATE_DEFS.findIndex((d) => d.type === mate.type);
    const next =
      MATE_DEFS[(idx + (e.key === "ArrowDown" ? 1 : -1) + MATE_DEFS.length) % MATE_DEFS.length];
    setMate(id, { type: next.type });
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-mate="${next.type}"]`,
    );
    el?.focus();
  };

  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          Mate Type
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-tertiary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform .15s",
          }}
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>

      {open && (
        <>
          {/* Mate type list (radiogroup) */}
          <div
            ref={listRef}
            role="radiogroup"
            aria-label="Mate type"
            onKeyDown={onListKeyDown}
            style={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {MATE_DEFS.map((d) => {
              const selected = mate.type === d.type;
              return (
                <div
                  key={d.type}
                  data-mate={d.type}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setMate(id, { type: d.type })}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setMate(id, { type: d.type });
                    }
                  }}
                  className="ix-mate-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    height: 30,
                    padding: "0 8px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    background: selected
                      ? "var(--color-bg-brand-subtle)"
                      : "transparent",
                    transition: "background .15s, color .15s",
                  }}
                  onMouseEnter={(e) => {
                    if (selected) return;
                    e.currentTarget.style.background =
                      "var(--color-bg-surface-raised)";
                  }}
                  onMouseLeave={(e) => {
                    if (selected) return;
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      color: selected
                        ? "var(--color-violet-600)"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    {d.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: selected ? 600 : 500,
                      color: selected
                        ? "var(--color-violet-600)"
                        : "var(--color-text-primary)",
                    }}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Distance / Angle */}
          <MateNumberRow
            icon={DistanceIcon}
            label="Mate distance"
            unit="mm"
            value={mate.distance}
            enabled={distanceEnabled}
            step={0.25}
            min={0}
            onCommit={(v) => setMate(id, { distance: v })}
          />
          <MateNumberRow
            icon={AngleIcon}
            label="Mate angle"
            unit="deg"
            value={mate.angle}
            enabled={angleEnabled}
            step={5}
            min={0}
            max={360}
            onCommit={(v) => setMate(id, { angle: v })}
          />

          {/* Alignment */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              paddingTop: 2,
            }}
          >
            <span
              style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}
            >
              Mate alignment:
            </span>
            <div
              role="radiogroup"
              aria-label="Mate alignment"
              style={{ display: "flex", gap: 4 }}
            >
              <AlignButton
                label="Aligned"
                icon={AlignedIcon}
                selected={mate.alignment === "aligned"}
                onClick={() => setMate(id, { alignment: "aligned" })}
              />
              <AlignButton
                label="Anti-aligned"
                icon={AntiAlignedIcon}
                selected={mate.alignment === "anti-aligned"}
                onClick={() => setMate(id, { alignment: "anti-aligned" })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Numeric row: [type glyph] [NumberInput] [unit]. Keeps a local string while
// typing; clamps + reformats on blur so keystrokes are never fought.
function MateNumberRow({
  icon,
  label,
  unit,
  value,
  enabled,
  step,
  min,
  max,
  onCommit,
}: {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: number;
  enabled: boolean;
  step: number;
  min: number;
  max?: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = React.useState(value.toFixed(2));
  // Re-sync from the committed value (instance switch, external change) — but
  // never while the user is typing, or the field would fight keystrokes.
  const focused = React.useRef(false);
  React.useEffect(() => {
    if (!focused.current) setText(value.toFixed(2));
  }, [value]);

  const clamp = (n: number) =>
    Math.max(min, max !== undefined ? Math.min(max, n) : n);

  const commit = (raw: string) => {
    let n = parseFloat(raw);
    if (isNaN(n)) n = value;
    n = clamp(n);
    onCommit(n);
    setText(n.toFixed(2));
  };

  return (
    <div
      title={enabled ? undefined : `${label} doesn't apply to this mate type`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: enabled ? 1 : 0.5,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          color: "var(--color-text-secondary)",
          flex: "0 0 auto",
        }}
      >
        {icon}
      </span>
      <div
        style={{ flex: 1, minWidth: 0 }}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={(e) => {
          // Ignore focus moves within the row (input ↔ stepper buttons).
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          focused.current = false;
          commit(text);
        }}
      >
        <NumberInput
          size="sm"
          value={text}
          step={step}
          min={min}
          max={max}
          disabled={!enabled}
          onChange={(v) => {
            setText(v);
            // Clean numeric strings (stepper clicks, plain typing) commit
            // live — clamped; partial input ("1.", "") waits for blur.
            const n = parseFloat(v);
            if (!isNaN(n) && String(n) === v) onCommit(clamp(n));
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          width: 26,
          flex: "0 0 auto",
        }}
      >
        {unit}
      </span>
    </div>
  );
}

function AlignButton({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 36,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-md)",
        border: `var(--border-width-1) solid ${
          selected ? "var(--color-violet-600)" : "var(--color-border-default)"
        }`,
        background: selected
          ? "var(--color-bg-brand-subtle)"
          : "var(--color-bg-surface)",
        color: selected
          ? "var(--color-violet-600)"
          : "var(--color-text-secondary)",
        cursor: "pointer",
        transition: "background .15s, border-color .15s, color .15s",
      }}
    >
      {icon}
    </button>
  );
}
