"use client";

// IDEEZA PCB Software — Settings overlay.
// Opened from the Setting menu. Left nav (10 pages) + page-aware body built from
// real IDEEZA DS atoms (Toggle / Select) + Cancel / Save Changes footer (Button).

import * as React from "react";
import { Button, IconButton } from "@/components/ideeza";
import { DsIcon, Icon } from "@/lib/pcb/icons";
import { buildSettingsNav, settingsTitle } from "@/lib/pcb/data";
import type { PcbState, SettingsPage } from "@/lib/pcb/types";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { overlayTruth } from "@/lib/pcb/app-settings";
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

const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

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
  return <TopToolsBarSettingsPage />;
}

/** The open tab of a page that has tabs — the line over it can differ by tab. */
function openTab(state: PcbState): string {
  switch (state.settingsPage) {
    case "system": return state.systemSettings.subPage;
    case "footprint": return state.pcbFootprintSettings.subPage;
    case "symbol": return state.schemSymbolSettings.subPage;
    case "panel": return state.panelLibSettings.subPage;
    case "toptools": return state.toolbarCustomization.scope;
    default: return "";
  }
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
  // What this page's values do today (lib/pcb/app-settings.ts): no silent controls.
  const truth = overlayTruth(state.settingsPage, openTab(state));

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

          {truth && (
            <p className="px-[var(--spacing-12)] pt-[var(--spacing-6)] text-sm leading-sm text-text-tertiary">{truth}</p>
          )}
          <SettingsBody page={state.settingsPage} />

          <SettingsFooter />
        </div>
      </div>
    </div>
  );
}
