"use client";

// IDEEZA Creator Panel — app menu bar.
// Presents the IDEEZA-native menu shape rather than the EasyEDA-style
// File/Edit/View/Place/Design/Layout/Export/Setting/Help row:
//   left  →  Project · Edit · Insert · Design · [Route] · Arrange · View
//   right →  ⌘K command search · ⚙ Settings · ? Help
// The raw, spec-complete menus come from the PCB data layer (buildMenus*);
// regroupMenus() folds File+Export → Project, renames Place → Insert and
// Layout → Arrange, and lifts Setting/Help into the right icon cluster. Every
// original item + handler is preserved (see data.tsx). Top-level Alt-access
// letters (F/E/V…) are gone; per-item accelerators (⌘Z…) stay inside the
// dropdowns.

import * as React from "react";
import { DsIcon } from "@/lib/pcb/icons";
import {
  buildMenus2D,
  buildMenus3D,
  buildMenusSchematic,
  regroupMenus,
  flattenCommands,
} from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

type MenuSub = {
  divider?: boolean;
  label?: string;
  k?: string;
  icon?: string;
  fg?: string;
  flagged?: boolean;
  note?: string;
  onClick?: () => void;
};
type MenuItem = {
  divider?: boolean;
  label?: string;
  k?: string;
  icon?: string;
  submenu?: boolean;
  hasSub?: boolean;
  sub?: MenuSub[];
  flagged?: boolean;
  note?: string;
  onClick?: () => void;
};
type MenuGroup = {
  id: string;
  label: string;
  key?: string;
  items: MenuItem[];
  open?: boolean;
  toggle?: () => void;
};
type Command = { group: string; trail: string; label: string; icon?: string; onClick: () => void };

// Small ⚑ glyph appended to items flagged for possible removal but kept in
// scope. Muted amber so it reads as "attention / provisional".
const flagGlyph = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-warning, #C77700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "0 0 auto" }}>
    <path d="M4 21V4a1 1 0 0 1 1-1h11l-2 4 2 4H5" />
  </svg>
);
const FLAG_NOTE = "Flagged for removal — kept pending team confirmation";

const chevron = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.4">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

// One dropdown leaf / submenu row — shared by top-level items and their
// hover flyouts. Pure: every handler is already baked into the item.
function renderMenuItem(it: MenuItem, idx: number) {
  if (it.divider) {
    return (
      <div
        key={idx}
        style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-5)" }}
      />
    );
  }
  return (
    <div
      key={idx}
      role="menuitem"
      className="ix-mi"
      onClick={it.onClick}
      title={it.flagged ? it.note || FLAG_NOTE : undefined}
      style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "var(--spacing-4) var(--spacing-6)", borderRadius: "var(--radius-lg)", cursor: "pointer" }}
    >
      <span style={{ width: 17, height: 17, flex: "0 0 auto", color: "var(--color-text-secondary)", display: "inline-flex" }}>
        <DsIcon name={it.icon} size={16} />
      </span>
      <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: it.flagged ? "var(--color-text-tertiary)" : "var(--color-text-primary)", fontStyle: it.flagged ? "italic" : undefined, fontWeight: 500 }}>
        {it.label}
      </span>
      {it.flagged && flagGlyph}
      {it.submenu && chevron}
      <span className="ix-mi-k" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
        {it.k}
      </span>

      {it.hasSub && (
        <div
          className="ix-submenu"
          style={{ display: "none", position: "absolute", left: "100%", top: -8, marginLeft: "var(--spacing-2)", minWidth: 232, background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-xl)", boxShadow: "var(--elevation-6, 0 16px 40px -8px rgba(0,0,0,.22))", padding: "var(--spacing-3)", zIndex: 62 }}
        >
          {it.sub?.map((su, j) =>
            su.divider ? (
              <div key={j} style={{ height: 1, background: "var(--color-border-subtle)", margin: "var(--spacing-2) var(--spacing-5)" }} />
            ) : (
              <div
                key={j}
                className="ix-mi"
                onClick={su.onClick}
                title={su.flagged ? su.note || FLAG_NOTE : undefined}
                style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", padding: "var(--spacing-4) var(--spacing-6)", borderRadius: "var(--radius-lg)", cursor: "pointer" }}
              >
                <span style={{ width: 17, height: 17, flex: "0 0 auto", color: "var(--color-text-secondary)", display: "inline-flex" }}>
                  <DsIcon name={su.icon} size={16} />
                </span>
                <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: su.flagged ? "var(--color-text-tertiary)" : su.fg, fontStyle: su.flagged ? "italic" : undefined, fontWeight: 500, whiteSpace: "nowrap" }}>
                  {su.label}
                </span>
                {su.flagged && flagGlyph}
                <span className="ix-mi-k" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                  {su.k}
                </span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// The floating panel for an open menu. `alignRight` opens it flush to the
// trigger's right edge (used by the Settings / Help icon cluster near the
// window edge) instead of the left.
function MenuPanel({ m, alignRight }: { m: MenuGroup; alignRight?: boolean }) {
  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        ...(alignRight ? { right: 0 } : { left: 0 }),
        minWidth: 262,
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--elevation-6, 0 16px 40px -8px rgba(0,0,0,.22))",
        padding: "var(--spacing-3)",
        zIndex: 60,
        animation: "ideeza-pop .16s cubic-bezier(.2,.9,.3,1.2)",
      }}
    >
      {m.items.map((it, idx) => renderMenuItem(it, idx))}
    </div>
  );
}

export function MenuBar() {
  const state = usePcbState();
  const actions = usePcbActions();
  // PCB tab (mode "pcb") now shares the finalized 2D/PCB menu with the 2D
  // render mode — the "2D" tab was merged into PCB, so both use buildMenus2D.
  const raw = (state.mode === "3d"
    ? buildMenus3D(state, actions)
    : state.mode === "schematic"
    ? buildMenusSchematic(state, actions)
    : buildMenus2D(state, actions)) as MenuGroup[];
  const { primary, settings, help } = regroupMenus(raw) as {
    primary: MenuGroup[];
    settings: MenuGroup | null;
    help: MenuGroup | null;
  };
  const commands = flattenCommands({ primary, settings, help }) as Command[];

  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Click-outside + Esc → close any open menu.
  React.useEffect(() => {
    if (!state.openMenu) return;
    const onDoc = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) actions.closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.closeAll();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [state.openMenu, actions]);

  // ⌘K / Ctrl+K → open the command search from anywhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={containerRef}
      role="menubar"
      style={{ display: "flex", alignItems: "center", gap: 0, marginLeft: "var(--spacing-12)" }}
    >
      {primary.map((m) => (
        <div key={m.id} style={{ position: "relative" }}>
          <button
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={!!m.open}
            className="ix-menu"
            onClick={m.toggle}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              background: m.open ? "var(--color-bg-brand-subtle)" : "transparent",
              border: "none",
              color: m.open ? "var(--color-violet-600)" : "var(--color-text-primary)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 0.1,
              fontFamily: "inherit",
              transition: "background .14s, color .14s",
            }}
            onMouseEnter={(e) => {
              if (m.open) return;
              (e.currentTarget as HTMLButtonElement).style.background = "var(--color-bg-surface-raised)";
            }}
            onMouseLeave={(e) => {
              if (m.open) return;
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            {m.label}
          </button>
          {m.open && <MenuPanel m={m} />}
        </div>
      ))}

      {/* right utility cluster — separated from the workflow menus */}
      <div style={{ width: 1, height: 20, background: "var(--color-border-subtle)", margin: "0 var(--spacing-4)" }} />

      {/* ⌘K command search — reads as a real search field (icon · label ·
          keycap) rather than a bare icon, so the affordance is unambiguous. */}
      <button
        type="button"
        aria-label="Search commands"
        title="Search commands (⌘K)"
        onClick={() => setPaletteOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-4)",
          height: 32,
          minWidth: 172,
          padding: "0 6px 0 var(--spacing-5)",
          marginRight: "var(--spacing-2)",
          borderRadius: "var(--radius-lg)",
          cursor: "pointer",
          background: "var(--color-bg-subtle)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          fontFamily: "inherit",
          transition: "background .14s, border-color .14s",
        }}
        onMouseEnter={(e) => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = "var(--color-bg-surface-raised)";
          b.style.borderColor = "var(--color-border-default)";
        }}
        onMouseLeave={(e) => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = "var(--color-bg-subtle)";
          b.style.borderColor = "var(--color-border-subtle)";
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }} aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 500, color: "var(--color-text-tertiary)" }}>
          Search
        </span>
        <kbd style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 20, padding: "0 6px", borderRadius: "var(--radius-sm)", background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-default)", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "var(--font-family-mono), monospace", flex: "0 0 auto" }}>
          ⌘K
        </kbd>
      </button>

      {/* ⚙ Settings */}
      {settings && (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="ix-menu"
            aria-haspopup="menu"
            aria-expanded={!!settings.open}
            aria-label="Settings"
            title="Settings"
            onClick={settings.toggle}
            style={iconTriggerStyle(!!settings.open)}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {settings.open && <MenuPanel m={settings} alignRight />}
        </div>
      )}

      {/* ? Help */}
      {help && (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="ix-menu"
            aria-haspopup="menu"
            aria-expanded={!!help.open}
            aria-label="Help"
            title="Help"
            onClick={help.toggle}
            style={iconTriggerStyle(!!help.open)}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
              <path d="M12 17h.01" />
            </svg>
          </button>
          {help.open && <MenuPanel m={help} alignRight />}
        </div>
      )}

      {paletteOpen && <CommandPalette commands={commands} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

function iconTriggerStyle(open: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    background: open ? "var(--color-bg-brand-subtle)" : "transparent",
    border: "none",
    color: open ? "var(--color-violet-600)" : "var(--color-text-secondary)",
    transition: "background .14s, color .14s",
  };
}

// Highlight the matched substring in a label (case-insensitive, first match).
function highlightMatch(text: string, q: string): React.ReactNode {
  const needle = q.trim();
  if (!needle) return text;
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color: "var(--color-violet-600)", fontWeight: 700 }}>{text.slice(i, i + needle.length)}</span>
      {text.slice(i + needle.length)}
    </>
  );
}

function FooterKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{ display: "inline-flex", alignItems: "center", minWidth: 18, height: 18, padding: "0 5px", justifyContent: "center", borderRadius: "var(--radius-sm)", background: "var(--color-bg-subtle)", border: "var(--border-width-1) solid var(--color-border-subtle)", fontSize: 10.5, fontWeight: 600, color: "var(--color-text-secondary)", fontFamily: "var(--font-family-mono), monospace" }}>
      {children}
    </kbd>
  );
}

// ⌘K command palette — premium, grouped command search over every menu action.
// Results are sectioned by their source menu, the matched text is highlighted,
// arrow keys move a single selection across the flat result set, and a footer
// carries the keyboard legend. Mounted fresh each open (parent gates on
// `paletteOpen`), so initial state IS the reset — no reset-in-effect.
function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(0);
  const [focused, setFocused] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.group} ${c.trail} ${c.label}`.toLowerCase().includes(q));
  }, [commands, query]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSelected((i) => Math.min(i + 1, Math.max(0, filtered.length - 1))); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selected];
        if (cmd) { cmd.onClick(); onClose(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filtered, selected, onClose]);

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-cmd="${selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search commands"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "0 16px", paddingTop: "13vh" }}
    >
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "color-mix(in srgb, var(--color-bg-page) 58%, transparent)", backdropFilter: "blur(4px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxWidth: 624, display: "flex", flexDirection: "column", maxHeight: "70vh", overflow: "hidden", borderRadius: 18, border: "var(--border-width-1) solid var(--color-border-default)", background: "var(--color-bg-surface)", boxShadow: "0 32px 80px -20px rgba(0,0,0,.5), 0 0 0 1px color-mix(in srgb, var(--color-violet-600) 8%, transparent)", animation: "ideeza-pop .18s cubic-bezier(.2,.9,.3,1.2)" }}
      >
        {/* search header — icon accents violet while focused */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", height: 58, padding: "0 var(--spacing-7)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={focused ? "var(--color-violet-600)" : "var(--color-text-tertiary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke .15s", flex: "0 0 auto" }} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); listRef.current?.scrollTo({ top: 0 }); }}
            placeholder="Search actions…"
            aria-label="Search actions"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "var(--font-size-lg)", fontWeight: 500, color: "var(--color-text-primary)", fontFamily: "inherit" }}
          />
          <kbd style={{ fontSize: 10.5, fontWeight: 600, color: "var(--color-text-tertiary)", border: "var(--border-width-1) solid var(--color-border-default)", borderRadius: "var(--radius-sm)", padding: "2px 7px", fontFamily: "var(--font-family-mono), monospace" }}>
            ESC
          </kbd>
        </div>

        {/* results */}
        <div ref={listRef} role="listbox" aria-label="Commands" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "var(--spacing-3) var(--spacing-3) var(--spacing-4)" }}>
          {filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-4)", padding: "48px 20px", textAlign: "center" }}>
              <span style={{ display: "inline-flex", width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-full)", background: "var(--color-bg-subtle)", color: "var(--color-text-tertiary)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              </span>
              <div style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-text-secondary)" }}>No actions for “{query}”</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)" }}>Try a different word — e.g. “export”, “grid”, “annotate”.</div>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const active = selected === idx;
              const newGroup = idx === 0 || filtered[idx - 1].group !== cmd.group;
              return (
                <React.Fragment key={`${cmd.group}/${cmd.trail}/${cmd.label}`}>
                  {newGroup && (
                    <div style={{ padding: "var(--spacing-4) var(--spacing-5) var(--spacing-2)", marginTop: idx === 0 ? 0 : "var(--spacing-2)", fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)" }}>
                      {cmd.group}
                    </div>
                  )}
                  <button
                    type="button"
                    role="option"
                    data-cmd={idx}
                    aria-selected={active}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => { cmd.onClick(); onClose(); }}
                    style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", width: "100%", height: 46, padding: "0 var(--spacing-5)", borderRadius: "var(--radius-lg)", border: "none", cursor: "pointer", textAlign: "left", background: active ? "var(--color-bg-brand-subtle)" : "transparent", transition: "background .1s" }}
                  >
                    <span style={{ width: 30, height: 30, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", background: active ? "var(--color-violet-600)" : "var(--color-bg-subtle)", color: active ? "#fff" : "var(--color-text-secondary)", transition: "background .1s, color .1s" }}>
                      <DsIcon name={cmd.icon} size={16} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: "var(--spacing-4)", whiteSpace: "nowrap", overflow: "hidden" }}>
                      <span style={{ fontSize: "var(--font-size-sm)", fontWeight: active ? 600 : 500, color: active ? "var(--color-text-brand)" : "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {highlightMatch(cmd.label, query)}
                      </span>
                      {cmd.trail && (
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", flex: "0 0 auto" }}>in {cmd.trail}</span>
                      )}
                    </span>
                    {active && (
                      <kbd style={{ flex: "0 0 auto", fontSize: 11, fontWeight: 600, color: "var(--color-violet-600)", fontFamily: "var(--font-family-mono), monospace" }}>↵</kbd>
                    )}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* footer — result count + keyboard legend */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 40, padding: "0 var(--spacing-7)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)", background: "var(--color-bg-subtle)" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
            {filtered.length} {filtered.length === 1 ? "action" : "actions"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FooterKey>↑</FooterKey><FooterKey>↓</FooterKey> navigate</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FooterKey>↵</FooterKey> open</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FooterKey>esc</FooterKey> close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
