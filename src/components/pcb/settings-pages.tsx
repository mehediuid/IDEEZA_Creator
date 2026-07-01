"use client";

// IDEEZA PCB Software — Settings overlay page components (Phase B).
// One <…SettingsPage/> per nav item. The overlay shell renders the page
// matching `state.settingsPage`; each page reads/writes its own slice of
// store state so changes round-trip through undo/redo.

import * as React from "react";
import { Button, Checkbox, Select, Toggle } from "@/components/ideeza";
import { Icon } from "@/lib/pcb/icons";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { useTheme } from "@/components/theme-provider";

const PAD_X = "var(--spacing-12)";
const ROW_PAD = "var(--spacing-6) var(--spacing-0)";

const SEARCH_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';

// ── shared atoms ─────────────────────────────────────────────────────────────

function PageScroll({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: `var(--spacing-4) ${PAD_X} var(--spacing-12)` }}>
      {children}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: ROW_PAD,
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        gap: "var(--spacing-6)",
      }}
    >
      <div>
        <div style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-text-primary)" }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
            {hint}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>{children}</div>
    </div>
  );
}

// ── Save Setting ──────────────────────────────────────────────────────────────

const SAVE_INTERVALS = ["1", "5", "10", "15", "30"];
const SAVE_BACKUPS = ["1", "3", "5", "10"];
const SAVE_LOCATIONS = ["Local only", "Cloud only", "Cloud + Local"];

export function SaveSettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const s = state.saveSettings;
  return (
    <PageScroll>
      <Row label="Auto Save Interval" hint="How often the editor saves your project automatically.">
        <Select
          value={String(s.interval)}
          options={SAVE_INTERVALS.map((v) => ({ label: `${v} min`, value: v }))}
          onChange={(v) => actions.setSaveSettings({ interval: Number(v) })}
          minWidth={150}
        />
      </Row>
      <Row label="Backup Copies" hint="Number of timestamped backups kept on disk.">
        <Select
          value={String(s.backups)}
          options={SAVE_BACKUPS.map((v) => ({ label: v, value: v }))}
          onChange={(v) => actions.setSaveSettings({ backups: Number(v) })}
          minWidth={150}
        />
      </Row>
      <Row label="Save Location">
        <Select
          value={s.location}
          options={SAVE_LOCATIONS.map((v) => ({ label: v, value: v }))}
          onChange={(v) => actions.setSaveSettings({ location: v })}
          minWidth={170}
        />
      </Row>
      <Row label="Compress Files" hint="Zips project artifacts on save (smaller, slightly slower).">
        <Toggle
          aria-label="Compress files"
          checked={s.compress}
          onChange={() => actions.setSaveSettings({ compress: !s.compress })}
        />
      </Row>
      <Row label="Save on Exit" hint="Prompts an auto-save when the window closes.">
        <Toggle
          aria-label="Save on exit"
          checked={s.onExit}
          onChange={() => actions.setSaveSettings({ onExit: !s.onExit })}
        />
      </Row>
    </PageScroll>
  );
}

// ── Fonts (Common Font Family) ───────────────────────────────────────────────

export function FontsSettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  return (
    <PageScroll>
      <Row
        label="Selected Font"
        hint="Default font family for designators, labels and title-block text."
      >
        <div
          onClick={() => setPickerOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-3)",
            padding: "var(--spacing-3) var(--spacing-5)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-lg)",
            background: "var(--color-bg-surface)",
            cursor: "pointer",
            minWidth: 220,
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontFamily: state.fonts.selected, fontSize: "var(--font-size-md)" }}>
            {state.fonts.selected}
          </span>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>Browse…</span>
        </div>
      </Row>
      <div style={{ marginTop: "var(--spacing-6)" }}>
        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: "var(--spacing-4)" }}>
          Installed fonts
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-3)" }}>
          {state.fonts.common.map((f) => {
            const active = f === state.fonts.selected;
            return (
              <div
                key={f}
                onClick={() => actions.setSelectedFont(f)}
                style={{
                  padding: "var(--spacing-4) var(--spacing-5)",
                  border: `var(--border-width-1) solid ${active ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                  borderRadius: "var(--radius-md)",
                  background: active ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
                  cursor: "pointer",
                  fontFamily: f,
                  fontSize: "var(--font-size-md)",
                  color: active ? "var(--color-text-brand)" : "var(--color-text-primary)",
                  fontWeight: active ? 700 : 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{f}</span>
                {active && <span style={{ fontSize: "var(--font-size-xs)" }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {pickerOpen && (
        <FontPickerModal
          fonts={state.fonts.common}
          selected={state.fonts.selected}
          onSelect={(f) => {
            actions.setSelectedFont(f);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </PageScroll>
  );
}

function FontPickerModal({
  fonts,
  selected,
  onSelect,
  onClose,
}: {
  fonts: string[];
  selected: string;
  onSelect: (font: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = React.useState("");
  const filtered = fonts.filter((f) => f.toLowerCase().includes(q.toLowerCase()));
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,8,30,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: 520,
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--elevation-6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "var(--spacing-8) var(--spacing-10)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-4)" }}>
            Select Font
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-3)",
              padding: "var(--spacing-3) var(--spacing-4)",
              border: "var(--border-width-1) solid var(--color-border-default)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <span style={{ width: 16, height: 16, color: "var(--color-text-tertiary)", display: "inline-flex" }}>
              <Icon html={SEARCH_SVG} />
            </span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fonts…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-sm)",
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-3) 0" }}>
          {filtered.map((f) => {
            const active = f === selected;
            return (
              <div
                key={f}
                onClick={() => onSelect(f)}
                style={{
                  padding: "var(--spacing-4) var(--spacing-10)",
                  cursor: "pointer",
                  background: active ? "var(--color-bg-brand-subtle)" : "transparent",
                  color: active ? "var(--color-text-brand)" : "var(--color-text-primary)",
                  fontFamily: f,
                  fontSize: "var(--font-size-md)",
                  fontWeight: active ? 700 : 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{f}</span>
                <span style={{ fontFamily: f, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>
                  AaBb 123
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "var(--spacing-8)", textAlign: "center", color: "var(--color-text-tertiary)" }}>
              No fonts match “{q}”.
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--spacing-4)", padding: "var(--spacing-6) var(--spacing-10)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
          <Button hierarchy="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Drawing Setting ───────────────────────────────────────────────────────────

export function DrawingSettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const enabled = state.drawings.filter((d) => d.selected);
  return (
    <PageScroll>
      <Row
        label="Default Drawing Browse Project"
        hint="Browse Project loaded automatically when you open a new project."
      >
        <Button hierarchy="primary" size="md" onClick={() => setPickerOpen(true)}>
          Select Drawing
        </Button>
      </Row>
      <div style={{ marginTop: "var(--spacing-6)" }}>
        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: "var(--spacing-4)" }}>
          {enabled.length} of {state.drawings.length} selected
        </div>
        {state.drawings.map((d) => (
          <div
            key={d.id}
            onClick={() => actions.toggleDrawingSelected(d.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-5)",
              padding: "var(--spacing-4) var(--spacing-0)",
              borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
              cursor: "pointer",
            }}
          >
            <Checkbox checked={d.selected} />
            <span
              style={{
                fontSize: "var(--font-size-md)",
                color: "var(--color-text-primary)",
                fontWeight: d.selected ? 600 : 500,
              }}
            >
              {d.name}
            </span>
          </div>
        ))}
      </div>

      {pickerOpen && (
        <SelectDrawingModal
          drawings={state.drawings}
          onToggle={actions.toggleDrawingSelected}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </PageScroll>
  );
}

function SelectDrawingModal({
  drawings,
  onToggle,
  onClose,
}: {
  drawings: { id: string; name: string; selected: boolean }[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,8,30,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--elevation-6)",
          padding: "var(--spacing-10)",
        }}
      >
        <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "var(--spacing-6)" }}>
          Select Drawing Browse Project
        </div>
        <div style={{ marginBottom: "var(--spacing-8)" }}>
          {drawings.map((d) => (
            <div
              key={d.id}
              onClick={() => onToggle(d.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-5)",
                padding: "var(--spacing-4) var(--spacing-0)",
                cursor: "pointer",
              }}
            >
              <Checkbox checked={d.selected} />
              <span style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>
                {d.name}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--spacing-4)" }}>
          <Button hierarchy="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button hierarchy="primary" size="md" onClick={onClose}>Apply</Button>
        </div>
      </div>
    </div>
  );
}

// ── Hotkey Setting ────────────────────────────────────────────────────────────

export function HotkeySettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [q, setQ] = React.useState("");
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const filtered = state.hotkeys.filter(
    (h) =>
      !q ||
      h.function.toLowerCase().includes(q.toLowerCase()) ||
      h.key.toLowerCase().includes(q.toLowerCase()),
  );

  // Capture a key combo while a row is in edit mode.
  React.useEffect(() => {
    if (editingId == null) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape") {
        setEditingId(null);
        return;
      }
      // Build a stable combo string from modifiers + main key.
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      const main =
        e.key === " " ? "Space" :
          e.key === "Escape" ? "Esc" :
            e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) parts.push(main);
      if (parts.length === 0) return;
      actions.setHotkey(editingId, parts.join("+"));
      setEditingId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingId, actions]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: `var(--spacing-4) ${PAD_X} var(--spacing-4)` }}>
      {/* search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          padding: "var(--spacing-3) var(--spacing-5)",
          border: "var(--border-width-1) solid var(--color-border-default)",
          borderRadius: "var(--radius-lg)",
          marginBottom: "var(--spacing-6)",
          background: "var(--color-bg-surface)",
        }}
      >
        <span style={{ width: 16, height: 16, color: "var(--color-text-tertiary)", display: "inline-flex" }}>
          <Icon html={SEARCH_SVG} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by function or key…"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--color-text-primary)",
            fontSize: "var(--font-size-sm)",
          }}
        />
        <button
          onClick={() => actions.resetHotkeys()}
          style={{
            padding: "var(--spacing-2) var(--spacing-4)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-surface)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
          }}
        >
          Restore defaults
        </button>
      </div>

      {/* table */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 180px 1fr",
            padding: "var(--spacing-3) var(--spacing-5)",
            background: "var(--color-bg-subtle)",
            borderBottom: "var(--border-width-1) solid var(--color-border-default)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 700,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <div>#</div>
          <div>Function</div>
          <div>Hotkey</div>
          <div>Comment</div>
        </div>
        {filtered.map((h) => {
          const editing = editingId === h.id;
          return (
            <div
              key={h.id}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr 180px 1fr",
                padding: "var(--spacing-3) var(--spacing-5)",
                borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                alignItems: "center",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-primary)",
              }}
            >
              <div style={{ color: "var(--color-text-tertiary)" }}>{h.id}</div>
              <div>{h.function}</div>
              <div>
                <button
                  onClick={() => setEditingId(editing ? null : h.id)}
                  style={{
                    padding: "var(--spacing-2) var(--spacing-4)",
                    border: `var(--border-width-1) solid ${editing ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                    borderRadius: "var(--radius-md)",
                    background: editing ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
                    color: editing ? "var(--color-text-brand)" : "var(--color-text-primary)",
                    fontFamily: "var(--font-family-mono), monospace",
                    fontSize: "var(--font-size-xs)",
                    cursor: "pointer",
                    fontWeight: 600,
                    minWidth: 120,
                  }}
                >
                  {editing ? "Press a combo…" : h.key}
                </button>
              </div>
              <div style={{ color: "var(--color-text-tertiary)" }}>{h.comment || "—"}</div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: "var(--spacing-8)", textAlign: "center", color: "var(--color-text-tertiary)" }}>
            No hotkeys match “{q}”.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Theme select for System page (used by SettingsBody dispatch) ─────────────

export function ThemeRow() {
  const { theme, setTheme } = useTheme();
  return (
    <Row label="Theme" hint="Editor color scheme.">
      <Select
        value={theme}
        options={[
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
          { label: "System", value: "system" },
        ]}
        minWidth={150}
        onChange={(v) => setTheme(v as "light" | "dark" | "system")}
      />
    </Row>
  );
}

// ── System Setting (Phase C) ─────────────────────────────────────────────────

const SYSTEM_TABS: { id: "general" | "category" | "libDevice" | "libPanel"; label: string }[] = [
  { id: "general", label: "General" },
  { id: "category", label: "Category" },
  { id: "libDevice", label: "Common Library Device" },
  { id: "libPanel", label: "Common Library Panel" },
];

function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--spacing-2)",
        padding: "var(--spacing-3) 0",
        borderBottom: "var(--border-width-1) solid var(--color-border-default)",
        marginBottom: "var(--spacing-5)",
      }}
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: "var(--spacing-3) var(--spacing-5)",
              border: "none",
              borderBottom: `2px solid ${on ? "var(--color-violet-600)" : "transparent"}`,
              background: "transparent",
              color: on ? "var(--color-text-brand)" : "var(--color-text-secondary)",
              fontSize: "var(--font-size-sm)",
              fontWeight: on ? 700 : 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function GroupHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: "var(--font-size-xs)",
        fontWeight: 700,
        color: "var(--color-text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        padding: "var(--spacing-6) var(--spacing-0) var(--spacing-2)",
      }}
    >
      {title}
    </div>
  );
}

export function SystemSettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const ss = state.systemSettings;
  const sub = ss.subPage;

  // helper to render a toggle row that updates state via setSystemSettings
  const T = (k: keyof typeof ss, label: string, hint?: string) => (
    <Row label={label} hint={hint}>
      <Toggle
        aria-label={label}
        checked={Boolean(ss[k])}
        onChange={() =>
          actions.setSystemSettings({ [k]: !ss[k] } as Partial<typeof ss>)
        }
      />
    </Row>
  );

  return (
    <PageScroll>
      <TabBar tabs={SYSTEM_TABS} active={sub} onChange={actions.setSystemSubPage} />

      {sub === "general" && (
        <>
          <GroupHeader title="System Document Management" />
          <Row
            label="Mode"
            hint="Easy = old-edition menu (simpler); Professional = full Hub interaction."
          >
            <Select
              value={ss.docMode}
              options={[
                { label: "Easy", value: "easy" },
                { label: "Professional", value: "professional" },
              ]}
              onChange={(v) =>
                actions.setSystemSettings({ docMode: v as "easy" | "professional" })
              }
              minWidth={170}
            />
          </Row>
          {T("showWelcomeScreen", "Show Welcome Screen on launch")}
          {T("enableExtension", "Enable plugin extensions")}
          <ThemeRow />

          <GroupHeader title="Project" />
          {T("openProjectsInNewWindow", "Open projects in a new window")}
          {T("duplicateOnOpen", "Duplicate on open (work on a copy)")}
          {T("rememberLastOpen", "Remember last opened project on relaunch")}

          <GroupHeader title="Make Page Duplication" />
          {T("copyTabSwitch", "Switch to copied tab automatically")}
          {T("copyComponentColor", "Copy component color overrides")}
          {T("resetCanvasZoom", "Reset canvas zoom on duplicate")}

          <GroupHeader title="Place" />
          {T("showMouseButton", "Show mouse-button hint while placing")}
          {T("rightClickAsAlt", "Treat right-click as alternate placement")}
          {T("alignSnap", "Align to nearest snap point")}

          <GroupHeader title="Coordinate" />
          {T("showCoordinateRuler", "Show coordinate ruler")}
          {T("yAxisUpward", "Y-axis points upward (math convention)")}

          <GroupHeader title="Object Move" />
          {T("moveDeviceForce", "Force-snap large devices to grid")}
          {T("showMoveGhost", "Show ghost outline while dragging")}
          {T("showGuideLines", "Show alignment guides")}
          {T("alignWhileMoving", "Auto-align to nearest object")}

          <GroupHeader title="Pasting / Update Module" />
          {T("promptOnPaste", "Prompt for confirmation on paste")}
          {T("syncOnPaste", "Sync pasted module with source")}
        </>
      )}

      {sub === "category" && (
        <>
          <GroupHeader title="Library Categories" />
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-3)" }}>
            Toggle which categories appear in the left-panel library filter.
          </div>
          {ss.categories.map((c) => (
            <div
              key={c.id}
              onClick={() => actions.toggleSystemCategory(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-5)",
                padding: "var(--spacing-3) var(--spacing-0)",
                borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                cursor: "pointer",
              }}
            >
              <Checkbox checked={c.on} />
              <span
                style={{
                  fontSize: "var(--font-size-md)",
                  color: "var(--color-text-primary)",
                  fontWeight: c.on ? 600 : 500,
                }}
              >
                {c.label}
              </span>
            </div>
          ))}
        </>
      )}

      {sub === "libDevice" && (
        <>
          <GroupHeader title="Common Library — Device" />
          {T("libDeviceShow", "Show the Device library in the left panel")}
          {T("libDeviceAutoLoad", "Auto-load devices on project open")}
          <Row label="Default Device Source" hint="Where new devices are pulled from.">
            <Select
              value="Cloud + Local"
              options={[
                { label: "Local only", value: "Local only" },
                { label: "Cloud only", value: "Cloud only" },
                { label: "Cloud + Local", value: "Cloud + Local" },
              ]}
              onChange={() => { }}
              minWidth={170}
            />
          </Row>
        </>
      )}

      {sub === "libPanel" && (
        <>
          <GroupHeader title="Common Library — Panel" />
          {T("libPanelShow", "Show the Panel library in the left panel")}
          {T("libPanelAutoLoad", "Auto-load panels on project open")}
          <Row label="Panel Library Format">
            <Select
              value="IDEEZA Panel"
              options={[
                { label: "IDEEZA Panel", value: "IDEEZA Panel" },
                { label: "KiCad Panel", value: "KiCad Panel" },
                { label: "Altium PCB Panel", value: "Altium PCB Panel" },
              ]}
              onChange={() => { }}
              minWidth={170}
            />
          </Row>
        </>
      )}
    </PageScroll>
  );
}

// ── Property Setting (Phase C) ───────────────────────────────────────────────

const PROPERTY_OBJECT_OPTIONS = [
  { label: "Schematic Default", value: "Schematic Default" },
  { label: "PCB Default", value: "PCB Default" },
  { label: "Footprint", value: "Footprint" },
  { label: "Panel Lib", value: "Panel Lib" },
];
const PROPERTY_DISPLAY_OPTIONS = [
  { label: "Show", value: "Show" },
  { label: "Hide", value: "Hide" },
  { label: "Auto", value: "Auto" },
];

export function PropertySettingsPage() {
  const state = usePcbState();
  const actions = usePcbActions();
  const { rows, selectedId } = state.propertySettings;
  const selectedIdx = rows.findIndex((r) => r.id === selectedId);
  const canMoveUp = selectedIdx > 0;
  const canMoveDown = selectedIdx >= 0 && selectedIdx < rows.length - 1;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: `var(--spacing-4) ${PAD_X} var(--spacing-4)` }}>
      {/* Toolbar above table */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          marginBottom: "var(--spacing-5)",
        }}
      >
        <div style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>
          Property Settings
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => selectedId && actions.movePropertyRow(selectedId, -1)}
          disabled={!canMoveUp}
          title="Move up"
          style={iconBtn(canMoveUp)}
        >
          ↑
        </button>
        <button
          onClick={() => selectedId && actions.movePropertyRow(selectedId, 1)}
          disabled={!canMoveDown}
          title="Move down"
          style={iconBtn(canMoveDown)}
        >
          ↓
        </button>
        <button
          onClick={() => selectedId && actions.removePropertyRow(selectedId)}
          disabled={!selectedId}
          title="Remove selected"
          style={iconBtn(Boolean(selectedId), "var(--color-text-error)")}
        >
          −
        </button>
        <button
          onClick={() => actions.addPropertyRow()}
          title="Add row"
          style={iconBtn(true, "var(--color-text-brand)")}
        >
          +
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1.4fr 1fr",
            padding: "var(--spacing-3) var(--spacing-5)",
            background: "var(--color-bg-subtle)",
            borderBottom: "var(--border-width-1) solid var(--color-border-default)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 700,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          <div>Property</div>
          <div>Object</div>
          <div>Display in canvas</div>
        </div>
        {rows.map((r) => {
          const sel = r.id === selectedId;
          return (
            <div
              key={r.id}
              onClick={() => actions.selectPropertyRow(sel ? null : r.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.4fr 1fr",
                padding: "var(--spacing-3) var(--spacing-5)",
                borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
                alignItems: "center",
                gap: "var(--spacing-3)",
                background: sel ? "var(--color-bg-brand-subtle)" : "transparent",
                cursor: "pointer",
              }}
            >
              <input
                value={r.property}
                onChange={(e) => actions.setPropertyRow(r.id, { property: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                style={cellInput()}
              />
              <div onClick={(e) => e.stopPropagation()}>
                <Select
                  value={r.object}
                  options={PROPERTY_OBJECT_OPTIONS}
                  onChange={(v) => actions.setPropertyRow(r.id, { object: v })}
                  minWidth={150}
                />
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Select
                  value={r.displayInCanvas}
                  options={PROPERTY_DISPLAY_OPTIONS}
                  onChange={(v) => actions.setPropertyRow(r.id, { displayInCanvas: v })}
                  minWidth={110}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div style={{ padding: "var(--spacing-8)", textAlign: "center", color: "var(--color-text-tertiary)" }}>
            No properties — click <strong>+</strong> to add one.
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-tertiary)",
          marginTop: "var(--spacing-4)",
        }}
      >
        Click a row to select it, then use ↑ / ↓ to reorder or − to delete.
      </div>
    </div>
  );
}

function iconBtn(enabled: boolean, color = "var(--color-text-primary)"): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "var(--border-width-1) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    background: enabled ? "var(--color-bg-surface)" : "var(--color-bg-subtle)",
    color: enabled ? color : "var(--color-text-disabled)",
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "var(--font-size-md)",
    fontWeight: 700,
    opacity: enabled ? 1 : 0.5,
  };
}

function cellInput(): React.CSSProperties {
  return {
    width: "100%",
    padding: "var(--spacing-2) var(--spacing-3)",
    border: "var(--border-width-1) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    background: "var(--color-bg-surface)",
    color: "var(--color-text-primary)",
    fontSize: "var(--font-size-sm)",
    fontFamily: "inherit",
    outline: "none",
  };
}
