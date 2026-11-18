"use client";

// Settings › Appearance & accessibility (ST-50) and its sheets: Theme (ST-51,
// applied to the whole app on Done), Text size (52), Reduce motion (53),
// Default units (54). The logic is the web's
// (components/settings/appearance-page.tsx): Theme is the app's one theme
// (`ideeza-theme`, ThemeProvider); Text size, High contrast and Reduce motion
// put an attribute on <html> (lib/settings/appearance.ts); Default units is the
// PCB editor's default for new boards and parts (`ideeza:pcb:appSettings`,
// through the PCB store); Data saver keeps post videos from loading until
// play. Single-key shortcuts isn't here: a phone has no keyboard for them.

import * as React from "react";
import { useTheme } from "@/components/theme-provider";
import { MEASUREMENT_UNITS, type MeasurementUnit } from "@/lib/pcb/measurement-unit";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { useOnline } from "../kit/states";
import { ChoiceSheet, SaveFailed, SettingsGroup, SettingsRow, SettingsScreen, useSaver, type ChoiceOption } from "./kit";

type Appearance = SettingsV1["appearance"];
type ThemeChoice = "light" | "dark" | "system";

const THEMES: ChoiceOption<ThemeChoice>[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match system", hint: "Follows your phone’s setting." },
];

const TEXT_SIZES: ChoiceOption<Appearance["textSize"]>[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large", hint: "Bigger text across the app." },
];

const MOTION: ChoiceOption<Appearance["motion"]>[] = [
  { value: "system", label: "Match system", hint: "Follows your phone’s setting." },
  { value: "reduce", label: "Reduce", hint: "Stops animations and smooth scrolling." },
];

const UNIT_HINTS: Record<MeasurementUnit, string | undefined> = { mm: "Millimetres", mil: "Thousandths of an inch", inch: undefined };
const UNITS: ChoiceOption<MeasurementUnit>[] = MEASUREMENT_UNITS.map((u) => ({ value: u, label: u, hint: UNIT_HINTS[u] }));

const labelOf = <T extends string>(options: readonly ChoiceOption<T>[], v: T) => options.find((o) => o.value === v)?.label;

const noSubscribe = () => () => {};

type Open = null | "theme" | "text-size" | "motion" | "units";

export function AppearanceSettings() {
  const { appearance } = useSettings();
  const { theme, setTheme } = useTheme();
  const pcb = usePcbState();
  const { setDefaultMeasurementUnit } = usePcbActions();
  // The stored theme is only known in the browser: the server renders none chosen.
  const running = React.useSyncExternalStore(noSubscribe, () => true, () => false);
  const online = useOnline();
  const saver = useSaver();
  const [open, setOpen] = React.useState<Open>(null);
  const close = () => setOpen(null);
  const save = (patch: Partial<Appearance>) => updateSettings("appearance", patch);
  const off = !online;

  return (
    <SettingsScreen title="Appearance & accessibility" loading={!running}>
      <SettingsGroup label="Display">
        <SettingsRow id="theme" label="Theme" value={labelOf(THEMES, theme)} onClick={() => setOpen("theme")} disabled={off} />
        <SettingsRow id="text-size" label="Text size" value={labelOf(TEXT_SIZES, appearance.textSize)} onClick={() => setOpen("text-size")} disabled={off} />
        <SettingsRow
          id="contrast"
          label="High contrast"
          toggle={{
            checked: appearance.contrast === "high",
            onChange: () => saver.run("display", () => save({ contrast: appearance.contrast === "high" ? "default" : "high" })),
          }}
          disabled={off}
        />
        <SettingsRow id="motion" label="Reduce motion" value={labelOf(MOTION, appearance.motion)} onClick={() => setOpen("motion")} disabled={off} />
      </SettingsGroup>
      <SaveFailed saver={saver} group="display" />

      <SettingsGroup label="Editors">
        <SettingsRow
          id="units"
          label="Default units"
          helper="For new boards and parts."
          value={pcb.appSettingsLoaded ? pcb.measurementUnit : undefined}
          onClick={() => setOpen("units")}
          disabled={off || !pcb.appSettingsLoaded}
          reason={pcb.appSettingsLoaded ? undefined : "Reading the editor’s settings…"}
        />
      </SettingsGroup>

      <SettingsGroup label="Videos">
        <SettingsRow
          id="data-saver"
          label="Data saver"
          helper="Post videos don’t load until you press play."
          toggle={{ checked: appearance.dataSaver, onChange: () => saver.run("videos", () => save({ dataSaver: !appearance.dataSaver })) }}
          disabled={off}
        />
      </SettingsGroup>
      <SaveFailed saver={saver} group="videos" />

      <ChoiceSheet
        open={open === "theme"}
        onClose={close}
        title="Theme"
        options={THEMES}
        value={theme}
        onSave={(t) => {
          try {
            setTheme(t);
            return true;
          } catch {
            return false;
          }
        }}
      />
      <ChoiceSheet open={open === "text-size"} onClose={close} title="Text size" options={TEXT_SIZES} value={appearance.textSize} onSave={(textSize) => save({ textSize })} />
      <ChoiceSheet open={open === "motion"} onClose={close} title="Reduce motion" options={MOTION} value={appearance.motion} onSave={(motion) => save({ motion })} />
      <ChoiceSheet
        open={open === "units"}
        onClose={close}
        title="Default units"
        description="For new boards and parts."
        options={UNITS}
        value={pcb.measurementUnit}
        onSave={(u) => {
          setDefaultMeasurementUnit(u);
          return true;
        }}
      />
    </SettingsScreen>
  );
}
