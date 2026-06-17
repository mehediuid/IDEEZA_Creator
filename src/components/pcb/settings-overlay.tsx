"use client";

// IDEEZA PCB Software — Settings overlay.
// Opened from the Setting menu. Left nav (10 pages) + page-aware body built from
// real IDEEZA DS atoms (Toggle / Select) + Cancel / Save Changes footer (Button).

import * as React from "react";
import { Button, IconButton, Toggle, Select } from "@/components/ideeza";
import { DsIcon, Icon } from "@/lib/pcb/icons";
import { buildSettingsNav, settingsTitle } from "@/lib/pcb/data";
import type { SettingsPage } from "@/lib/pcb/types";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { useTheme } from "@/components/theme-provider";
import {
  SaveSettingsPage,
  FontsSettingsPage,
  DrawingSettingsPage,
  HotkeySettingsPage,
  SystemSettingsPage,
  PropertySettingsPage,
} from "@/components/pcb/settings-pages";
import {
  SchematicSymbolSettingsPage,
  PcbFootprintSettingsPage,
  PanelLibSettingsPage,
  TopToolsBarSettingsPage,
} from "@/components/pcb/settings-pages-deep";

const THEME_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

type Field = { label: string } & ({ kind: "toggle"; on: boolean } | { kind: "select"; value: string });

const SETTINGS: Record<string, Field[]> = {
  system: [
    { label: "Language", kind: "select", value: "English" },
    { label: "Auto Save", kind: "toggle", on: true },
    { label: "Crash Recovery", kind: "toggle", on: true },
    { label: "Theme", kind: "select", value: "Light" },
    { label: "Default Unit", kind: "select", value: "mil" },
    { label: "Show Welcome Screen", kind: "toggle", on: false },
  ],
  drawing: [
    { label: "Grid Style", kind: "select", value: "Dotted" },
    { label: "Grid Size", kind: "select", value: "5 mil" },
    { label: "Snap to Grid", kind: "toggle", on: true },
    { label: "Show Rulers", kind: "toggle", on: true },
    { label: "Wire Width", kind: "select", value: "0.254mm" },
    { label: "Auto Junction", kind: "toggle", on: true },
  ],
  hotkey: [
    { label: "Undo", kind: "select", value: "Ctrl + Z" },
    { label: "Redo", kind: "select", value: "Ctrl + Y" },
    { label: "Place Wire", kind: "select", value: "W" },
    { label: "Place Net Label", kind: "select", value: "N" },
    { label: "Zoom Fit", kind: "select", value: "Ctrl + 0" },
    { label: "Delete", kind: "select", value: "Del" },
  ],
  property: [
    { label: "Show Designators", kind: "toggle", on: true },
    { label: "Designator Size", kind: "select", value: "1.5mm" },
    { label: "Show Pin Numbers", kind: "toggle", on: true },
    { label: "Show Net Names", kind: "toggle", on: false },
    { label: "Color Theme", kind: "select", value: "Default" },
  ],
  save: [
    { label: "Auto Save Interval", kind: "select", value: "5 min" },
    { label: "Backup Copies", kind: "select", value: "3" },
    { label: "Save Location", kind: "select", value: "Cloud + Local" },
    { label: "Compress Files", kind: "toggle", on: true },
    { label: "Save on Exit", kind: "toggle", on: true },
  ],
};

function SettingsBody({ page }: { page: SettingsPage }) {
  // Phase B — simple pages.
  if (page === "save") return <SaveSettingsPage />;
  if (page === "font") return <FontsSettingsPage />;
  if (page === "drawing") return <DrawingSettingsPage />;
  if (page === "hotkey") return <HotkeySettingsPage />;
  // Phase C — System + Property.
  if (page === "system") return <SystemSettingsPage />;
  if (page === "property") return <PropertySettingsPage />;
  // Phase D — deep tabbed pages.
  if (page === "symbol") return <SchematicSymbolSettingsPage />;
  if (page === "footprint") return <PcbFootprintSettingsPage />;
  if (page === "panel") return <PanelLibSettingsPage />;
  // Phase E — Top Toolbar customization.
  if (page === "toptools") return <TopToolsBarSettingsPage />;
  return <LegacyFlatFields page={page} />;
}

// Legacy flat-field rendering for pages still on the SETTINGS map
// (system / property — get replaced in Phase C).
function LegacyFlatFields({ page }: { page: SettingsPage }) {
  const fields = SETTINGS[page] ?? SETTINGS.system;
  const [toggles, setToggles] = React.useState<Record<string, boolean>>({});
  const isOn = (f: Extract<Field, { kind: "toggle" }>) => toggles[f.label] ?? f.on;
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-4) var(--spacing-12) var(--spacing-12)" }}>
      {fields.map((f) => {
        const isTheme = page === "system" && f.label === "Theme";
        return (
          <div
            key={f.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--spacing-6) var(--spacing-0)",
              borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
            }}
          >
            <span style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-text-primary)" }}>{f.label}</span>
            {isTheme ? (
              <Select
                value={theme}
                options={THEME_OPTIONS}
                minWidth={160}
                onChange={(v) => setTheme(v as "light" | "dark" | "system")}
              />
            ) : f.kind === "toggle" ? (
              <Toggle
                aria-label={f.label}
                checked={isOn(f)}
                onChange={() => setToggles((t) => ({ ...t, [f.label]: !isOn(f) }))}
              />
            ) : (
              <Select value={f.value} options={[{ label: f.value, value: f.value }]} minWidth={160} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Phase F — footer footer with wired Export / Import / Restore Default / Apply / Confirm.
function SettingsFooter() {
  const state = usePcbState();
  const actions = usePcbActions();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleExport = () => {
    const json = actions.exportSettingsJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ideeza-settings.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash("Settings exported");
  };

  const handleImport = () => fileInputRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = actions.importSettingsJson(String(reader.result ?? ""));
      flash(ok ? "Settings imported" : "Invalid settings file");
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-selecting the same file
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-5)",
        padding: "var(--spacing-8) var(--spacing-12)",
        borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
      }}
    >
      <Button hierarchy="secondary" size="lg" onClick={actions.closeSettings}>
        Cancel
      </Button>
      <Button hierarchy="ghost" size="md" onClick={handleExport}>
        Export config
      </Button>
      <Button hierarchy="ghost" size="md" onClick={handleImport}>
        Import Config
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        style={{ display: "none" }}
      />
      {feedback && (
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
          {feedback}
        </span>
      )}
      <div style={{ marginLeft: "auto", display: "flex", gap: "var(--spacing-3)" }}>
        <Button
          hierarchy="secondary"
          size="md"
          onClick={() => actions.resetSettingsPage(state.settingsPage)}
        >
          Restore Default
        </Button>
        <Button hierarchy="secondary" size="md" onClick={actions.closeSettings}>
          Apply
        </Button>
        <Button hierarchy="primary" size="md" onClick={actions.closeSettings}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

export function SettingsOverlay() {
  const state = usePcbState();
  const actions = usePcbActions();
  if (!state.settingsOpen) return null;
  const nav = buildSettingsNav(state, actions);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "rgba(20,8,30,.34)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1040,
          height: 660,
          background: "var(--color-bg-surface)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--elevation-6)",
          overflow: "hidden",
          display: "flex",
          animation: "ideeza-rise .26s cubic-bezier(.2,.9,.3,1.1)",
        }}
      >
        {/* nav */}
        <div
          style={{
            width: 264,
            background: "var(--color-bg-subtle)",
            borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
            padding: "var(--spacing-10) var(--spacing-6)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)", padding: "var(--spacing-0) var(--spacing-5) var(--spacing-8)" }}>Settings</div>
          {nav.map((sn) => (
            <div
              key={sn.label}
              className="ix-row"
              onClick={sn.onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-5)",
                padding: "var(--spacing-5) var(--spacing-6)",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                background: sn.bg,
              }}
            >
              <span style={{ width: 17, height: 17, color: sn.fg, display: "inline-flex" }}>
                <DsIcon name={sn.icon} size={17} />
              </span>
              <span style={{ fontSize: "var(--font-size-md)", fontWeight: Number(sn.weight), color: sn.fg }}>{sn.label}</span>
            </div>
          ))}
        </div>

        {/* body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--spacing-10) var(--spacing-12)",
              borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
            }}
          >
            <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: "var(--color-text-primary)" }}>{settingsTitle(state)}</span>
            <IconButton hierarchy="ghost" size="md" aria-label="Close" onClick={actions.closeSettings} icon={<Icon html={CLOSE_SVG} />} />
          </div>

          <SettingsBody page={state.settingsPage} />

          <SettingsFooter />
        </div>
      </div>
    </div>
  );
}
