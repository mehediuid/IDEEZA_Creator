"use client";

// /settings/appearance (Settings v2). Every control saves as it changes.
// Display: Theme is the app's one theme (`ideeza-theme`, ThemeProvider); the
// account menu's theme icons are a shortcut to the same value. Text size,
// High contrast and Reduce motion put an attribute on <html>
// (lib/settings/appearance.ts) that the tokens and reset.css answer.
// Keyboard and editors: Single-key shortcuts (lib/settings/keys.ts) with the
// keys listed from the tables the editors run (lib/settings/shortcuts.ts),
// and Default units, the PCB editor's default for new boards and parts
// (`ideeza:pcb:appSettings`, through the PCB store). Videos: Data saver.

import * as React from "react";
import { Segmented, Toggle } from "@/components/ideeza";
import { useTheme } from "@/components/theme-provider";
import { MEASUREMENT_UNITS, type MeasurementUnit } from "@/lib/pcb/measurement-unit";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { SHORTCUT_EDITORS } from "@/lib/settings/shortcuts";
import { useSettings } from "@/lib/settings/use-settings";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

/** A 44 px touch target round the 24 px switch on phones (its hit area, not its look). */
const TOGGLE_TAP = "max-md:after:absolute max-md:after:-inset-[10px] max-md:after:content-['']";
const SEG_TAP = "max-md:!h-[var(--touch-min)]";
/** A row whose control is a segmented choice: the control goes under its label when the page is narrow. */
const STACK = "[@container(max-width:639px)]:flex-col [@container(max-width:639px)]:items-stretch [@container(max-width:639px)]:gap-[8px]";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match system" },
] as const;
type ThemeChoice = (typeof THEMES)[number]["value"];

const UNIT_LABELS: Record<MeasurementUnit, string> = { mm: "mm", mil: "mil", inch: "inch" };

const noSubscribe = () => () => {};

type Appearance = SettingsV1["appearance"];

export function AppearancePage() {
  const { appearance } = useSettings();
  const { theme, setTheme } = useTheme();
  const pcb = usePcbState();
  const { setDefaultMeasurementUnit } = usePcbActions();
  // The stored theme is only known in the browser: the server renders none chosen.
  const running = React.useSyncExternalStore(noSubscribe, () => true, () => false);
  const [failed, setFailed] = React.useState(false);
  const save = (patch: Partial<Appearance>) => setFailed(!updateSettings("appearance", patch));
  const keysOn = appearance.singleKeyShortcuts;

  return (
    <SettingsFrame page="appearance">
      {failed && (
        <p role="alert" className="m-0 text-md leading-md text-text-error">
          {SAVE_FAILED}
        </p>
      )}

      <SettingsCard id="display" title="Display">
        <SettingsRow
          id="theme"
          className={STACK}
          label="Theme"
          help="Match system follows your device. The theme icons in the account menu change it too."
          control={
            <Segmented
              className={SEG_TAP}
              label="Theme"
              size="sm"
              value={(running ? theme : "") as ThemeChoice}
              options={THEMES}
              onChange={setTheme}
            />
          }
        />
        <SettingsRow
          id="text-size"
          className={STACK}
          label="Text size"
          help="Large makes every size of text one step bigger, everywhere in IDEEZA."
          control={
            <Segmented
              className={SEG_TAP}
              label="Text size"
              size="sm"
              value={appearance.textSize}
              options={[
                { value: "default", label: "Default" },
                { value: "large", label: "Large" },
              ]}
              onChange={(v) => save({ textSize: v })}
            />
          }
        />
        <SettingsRow
          id="contrast"
          label="High contrast"
          help="Grey text turns full strength; borders, switches and dimmed text get darker."
          control={
            <Toggle
              className={TOGGLE_TAP}
              checked={appearance.contrast === "high"}
              aria-label="High contrast"
              onChange={() => save({ contrast: appearance.contrast === "high" ? "default" : "high" })}
            />
          }
        />
        <SettingsRow
          id="motion"
          className={STACK}
          label="Reduce motion"
          help="Match system follows your device. Reduce stops animations and smooth scrolling in IDEEZA."
          control={
            <Segmented
              className={SEG_TAP}
              label="Reduce motion"
              size="sm"
              value={appearance.motion}
              options={[
                { value: "system", label: "Match system" },
                { value: "reduce", label: "Reduce" },
              ]}
              onChange={(v) => save({ motion: v })}
            />
          }
        />
      </SettingsCard>

      <SettingsCard id="keyboard" title="Keyboard and editors">
        <SettingsRow
          id="single-key"
          label="Single-key shortcuts"
          help="Letter and number keys work the editors' tools. Turn them off if you use speech input or press keys by accident. ⌘ and Ctrl shortcuts, Escape, Delete and Space keep working."
          control={
            <Toggle
              className={TOGGLE_TAP}
              checked={keysOn}
              aria-label="Single-key shortcuts"
              onChange={() => save({ singleKeyShortcuts: !keysOn })}
            />
          }
        />
        <ShortcutList on={keysOn} />
        <SettingsRow
          id="units"
          className={STACK}
          label="Default units"
          help="For new boards and parts. A board you already have keeps its own unit. Grid, snap and the rest are in the PCB editor's Setting."
          control={
            <Segmented
              className={SEG_TAP}
              label="Default units"
              size="sm"
              disabled={!pcb.appSettingsLoaded}
              value={pcb.measurementUnit}
              options={MEASUREMENT_UNITS.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
              onChange={setDefaultMeasurementUnit}
            />
          }
        />
      </SettingsCard>

      <SettingsCard id="videos" title="Videos">
        <SettingsRow
          id="data-saver"
          label="Data saver"
          help="Post videos don't load until you press play. Videos never play by themselves."
          control={
            <Toggle
              className={TOGGLE_TAP}
              checked={appearance.dataSaver}
              aria-label="Data saver"
              onChange={() => save({ dataSaver: !appearance.dataSaver })}
            />
          }
        />
      </SettingsCard>
    </SettingsFrame>
  );
}

/** The keys Single-key shortcuts turns on and off, per editor, from the tables the editors run. */
function ShortcutList({ on }: { on: boolean }) {
  return (
    <div className="flex flex-col gap-[12px] border-b border-solid border-border py-[12px]">
      {!on && <p className="m-0 text-sm leading-sm text-text-tertiary">Off: these keys do nothing now.</p>}
      <div className="grid gap-[16px] [@container(min-width:640px)]:grid-cols-3">
        {SHORTCUT_EDITORS.map((ed) => (
          <ShortcutGroup key={ed.name} name={ed.name} keys={ed.keys} />
        ))}
      </div>
    </div>
  );
}

function ShortcutGroup({ name, keys }: (typeof SHORTCUT_EDITORS)[number]) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-[8px]">
      <h3 id={headingId} className="m-0 text-sm font-semibold leading-sm text-text-secondary">
        {name}
      </h3>
      <dl className="m-0 flex flex-col gap-[6px]">
        {keys.map((s) => (
          <div key={s.id} className="flex items-start gap-[8px]">
            <dt className="shrink-0">
              <kbd className="inline-flex h-[24px] min-w-[24px] items-center justify-center gap-[4px] rounded-md border border-solid border-border bg-bg-subtle px-[6px] font-mono text-sm leading-sm font-medium text-text-primary">
                {s.shift && <span>Shift</span>}
                {s.key}
              </kbd>
            </dt>
            <dd className="m-0 min-w-0 text-md leading-md text-text-primary">{s.does}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
