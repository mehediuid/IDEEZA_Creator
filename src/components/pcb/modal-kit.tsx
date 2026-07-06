"use client";

// Shared primitives for the PDF-spec menu popups (Popups 1–6): tab bar,
// severity chip with picker, filter input, empty state, transfer list,
// direction tiles. Token-driven, dark-theme, keyboard accessible. Used by
// modals.tsx and pcb-manager-modals.tsx.

import * as React from "react";
import {
  SEVERITIES,
  SEVERITY_COLOR,
  SEVERITY_SHORT,
  type Severity,
} from "@/lib/pcb/design-rules-data";

// ── Tab bar (role=tablist, ←/→ moves) ───────────────────────────────────
export function ModalTabBar({
  tabs,
  active,
  onChange,
  badges,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
  // Optional per-tab count badge, e.g. Net (20) — PDF parameter #1.
  badges?: Record<string, number>;
}) {
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = tabs.indexOf(active);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    onChange(next);
  };
  return (
    <div
      role="tablist"
      onKeyDown={onKey}
      style={{
        display: "flex",
        gap: "var(--spacing-2)",
        padding: "0 24px",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        flex: "0 0 auto",
      }}
    >
      {tabs.map((t) => {
        const on = t === active;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t)}
            style={{
              padding: "10px 14px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${on ? "var(--color-violet-600)" : "transparent"}`,
              marginBottom: -1,
              color: on ? "var(--color-violet-600)" : "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
              fontWeight: on ? 700 : 500,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "color .15s, border-color .15s",
            }}
          >
            {t}
            {badges?.[t] !== undefined && (
              <span
                style={{
                  marginLeft: 6,
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: on ? "var(--color-bg-brand-subtle)" : "var(--color-bg-subtle)",
                  color: on ? "var(--color-violet-600)" : "var(--color-text-tertiary)",
                }}
              >
                {badges[t]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Severity chip + picker ──────────────────────────────────────────────
export function SeverityChip({
  value,
  onChange,
  disabled,
}: {
  value: Severity;
  onChange?: (s: Severity) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const c = SEVERITY_COLOR[value];
  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Severity: ${value}`}
        disabled={disabled}
        onClick={() => onChange && setOpen((v) => !v)}
        style={{
          minWidth: 68,
          padding: "3px 10px",
          borderRadius: 999,
          border: `var(--border-width-1) solid ${c.fg}`,
          background: c.bg,
          color: c.fg,
          fontSize: "var(--font-size-xs)",
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: onChange && !disabled ? "pointer" : "default",
          opacity: disabled ? 0.45 : 1,
          transition: "background .15s",
        }}
      >
        {SEVERITY_SHORT[value]}
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Severity"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 30,
            minWidth: 130,
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--elevation-6, 0 12px 30px -6px rgba(0,0,0,.3))",
            padding: "var(--spacing-2)",
          }}
        >
          {SEVERITIES.map((s) => {
            const sc = SEVERITY_COLOR[s];
            const sel = s === value;
            return (
              <div
                key={s}
                role="option"
                aria-selected={sel}
                onClick={() => {
                  onChange?.(s);
                  setOpen(false);
                }}
                className="ix-mi"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  background: sel ? "var(--color-bg-brand-subtle)" : "transparent",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: sc.fg }} />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{s}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Cycle helper for matrix cells (spec: click a cell to cycle its severity).
export function nextSeverity(s: Severity): Severity {
  return SEVERITIES[(SEVERITIES.indexOf(s) + 1) % SEVERITIES.length];
}

// ── Filter input ────────────────────────────────────────────────────────
export function FilterInput({
  value,
  onChange,
  placeholder = "Filter…",
  ariaLabel = "Filter",
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type="search"
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "6px 10px",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        fontFamily: "inherit",
        color: "var(--color-text-primary)",
        background: "var(--color-bg-surface)",
        outline: "none",
        ...style,
      }}
    />
  );
}

// ── Empty state — the spec's literal "No Results!" ──────────────────────
export function EmptyResults({ label = "No Results!" }: { label?: string }) {
  return (
    <div
      style={{
        padding: "36px 0",
        textAlign: "center",
        color: "var(--color-text-tertiary)",
        fontSize: "var(--font-size-sm)",
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
}

// ── List panel (titled selectable list with filter) ─────────────────────
export function ListPanel({
  title,
  items,
  selected,
  onSelect,
  height = 260,
  headerRight,
}: {
  title: string;
  items: string[];
  selected?: string | null;
  onSelect?: (item: string) => void;
  height?: number;
  headerRight?: React.ReactNode;
}) {
  const [filter, setFilter] = React.useState("");
  const shown = items.filter((i) => i.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 10px",
          borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
          background: "var(--color-bg-subtle)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {title}
        </span>
        {headerRight}
      </div>
      <div style={{ padding: "8px 10px 4px" }}>
        <FilterInput value={filter} onChange={setFilter} ariaLabel={`Filter ${title}`} />
      </div>
      <div style={{ height, overflowY: "auto", padding: "4px 6px 8px" }}>
        {shown.length === 0 ? (
          <EmptyResults />
        ) : (
          shown.map((item) => {
            const on = item === selected;
            return (
              <div
                key={item}
                role={onSelect ? "option" : undefined}
                aria-selected={onSelect ? on : undefined}
                onClick={() => onSelect?.(item)}
                className="ix-mi"
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  color: on ? "var(--color-violet-600)" : "var(--color-text-primary)",
                  fontWeight: on ? 600 : 500,
                  background: on ? "var(--color-bg-brand-subtle)" : "transparent",
                  cursor: onSelect ? "pointer" : "default",
                }}
              >
                {item}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Transfer arrows (Popup 6) ───────────────────────────────────────────
export function TransferArrows({
  onRight,
  onLeft,
  rightLabel = "Add to selected",
  leftLabel = "Remove from selected",
}: {
  onRight: () => void;
  onLeft: () => void;
  rightLabel?: string;
  leftLabel?: string;
}) {
  const btn = (label: string, glyph: string, onClick: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 34,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-bg-surface)",
        color: "var(--color-text-secondary)",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {glyph}
    </button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center", flex: "0 0 auto" }}>
      {btn(rightLabel, ">", onRight)}
      {btn(leftLabel, "<", onLeft)}
    </div>
  );
}

// ── Order direction tiles (Popups 2 & 5): ↘ ↗ ↙ ↖ ───────────────────────
export const ORDER_OPTIONS = [
  { value: "Across then down", glyph: "↘" },
  { value: "Across then up", glyph: "↗" },
  { value: "Down then across", glyph: "↙" },
  { value: "Up then across", glyph: "↖" },
] as const;

export function DirectionTiles({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Numbering order" style={{ display: "flex", gap: 8 }}>
      {ORDER_OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.value}
            title={o.value}
            onClick={() => onChange(o.value)}
            style={{
              width: 52,
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              border: `var(--border-width-1-5) solid ${on ? "var(--color-violet-600)" : "var(--color-border-default)"}`,
              borderRadius: "var(--radius-lg)",
              background: on ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
              color: on ? "var(--color-violet-600)" : "var(--color-text-secondary)",
              cursor: "pointer",
              transition: "background .15s, border-color .15s, color .15s",
            }}
          >
            {o.glyph}
          </button>
        );
      })}
    </div>
  );
}

// ── Section label ───────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "var(--font-size-xs)",
        fontWeight: 700,
        color: "var(--color-text-secondary)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        margin: "var(--spacing-7) 0 var(--spacing-4)",
      }}
    >
      {children}
    </div>
  );
}
