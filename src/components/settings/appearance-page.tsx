"use client";

// /settings/appearance (new page; spec §5.8). Display: Theme is in the
// account menu (D11), so its row explains that and opens the menu; Text size,
// High contrast and Reduce motion put an attribute on <html>
// (lib/settings/appearance.ts) that the tokens and reset.css answer.
// Keyboard and editors: Single-key shortcuts (lib/settings/keys.ts, read by
// the PCB, 3D and Connection Map editors); units, grid and hotkeys live in
// the PCB editor's Setting menu (D12), so that row is a link. Notices and
// videos: Keep notices until I close them, Data saver (post videos don't
// preload). Every control saves as it changes (spec §1.7).

import * as React from "react";
import { Button, Segmented, Toggle } from "@/components/ideeza";
import { stepHrefFor } from "@/components/manual/use-step-nav";
import { openAccountMenu } from "@/components/dashboard/sidebar-account";
import { useManualProjects } from "@/lib/manual/projects";
import { updateSettings, type SettingsV1 } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

/** A 44 px touch target round the 24 px switch on phones (its hit area, not its look). */
const TOGGLE_TAP = "max-md:after:absolute max-md:after:-inset-[10px] max-md:after:content-['']";

type Appearance = SettingsV1["appearance"];

export function AppearancePage() {
  const { appearance } = useSettings();
  const { hydrated, activeProject } = useManualProjects();
  const [failed, setFailed] = React.useState(false);
  const save = (patch: Partial<Appearance>) => setFailed(!updateSettings("appearance", patch));
  const pcbHref = hydrated && activeProject ? stepHrefFor(activeProject, null, "pcb") : null;

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
          label="Theme"
          help="Light, dark or match system. It's in the account menu, under your name."
          control={
            <Button type="button" hierarchy="secondary" size="sm" onClick={openAccountMenu} className="max-md:min-h-[var(--touch-min)]">
              Open account menu
            </Button>
          }
        />
        <SettingsRow
          id="text-size"
          label="Text size"
          help="Large makes every size of text one step bigger, everywhere in IDEEZA."
          control={
            <Segmented
              className="max-md:!h-[var(--touch-min)]"
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
          help="Grey text turns full strength and borders get darker."
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
          label="Reduce motion"
          help="Match system follows your device. Reduce stops animations and smooth scrolling in IDEEZA."
          control={
            <Segmented
              className="max-md:!h-[var(--touch-min)]"
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
          help="Letter and number keys pick tools in the PCB, 3D and Connection Map editors (H, V, R…). Turn them off if you use speech input or press keys by accident. ⌘ and Ctrl shortcuts keep working."
          control={
            <Toggle
              className={TOGGLE_TAP}
              checked={appearance.singleKeyShortcuts}
              aria-label="Single-key shortcuts"
              onChange={() => save({ singleKeyShortcuts: !appearance.singleKeyShortcuts })}
            />
          }
        />
        <SettingsRow
          id="units"
          label="Units, grid and hotkeys"
          help="In the PCB editor's Setting menu."
          href={pcbHref ?? undefined}
          disabled={!pcbHref}
          reason="Open a project first: they're in its PCB editor."
        />
      </SettingsCard>

      <SettingsCard id="notices-media" title="Notices and videos">
        <SettingsRow
          id="keep-notices"
          label="Keep notices until I close them"
          help="Notices stay on screen until you close them instead of hiding after a few seconds."
          control={
            <Toggle
              className={TOGGLE_TAP}
              checked={appearance.keepNotices}
              aria-label="Keep notices until I close them"
              onChange={() => save({ keepNotices: !appearance.keepNotices })}
            />
          }
        />
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
