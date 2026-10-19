"use client";

// /settings/language (Settings v2). Every control saves as it changes.
// Language: the app is English (one line, no picker of languages that don't
// exist yet) and the voice typing language (lib/settings/voice.ts; Automatic
// follows the browser). Date and time: the format (a region's conventions
// in English, Automatic or ISO; lib/settings/regions.ts + dates.ts) and the
// time zone. The time zone has its only editor here: it is the profile's
// `timeZone` (lib/people/time-zones.ts), read by every date the app formats
// and by the profile's local time.

import * as React from "react";
import { SelectMenu, type SelectOption } from "@/components/ideeza";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { saveProfile, useMyProfile } from "@/lib/people/profile-store";
import { DEVICE_ZONE, deviceZone, timeZoneChoices, zoneChoiceOf, zonePatchOf } from "@/lib/people/time-zones";
import { currentAutoRegion, dateFormatChoices, formatDateTime, formatTime } from "@/lib/settings/dates";
import { updateSettings, type SettingsV1, type VoiceLang } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { VOICE_CHOICES, browserLanguages, languageName, resolveVoiceLang } from "@/lib/settings/voice";
import { SAVE_FAILED, SettingsCard, SettingsRow } from "./settings-card";
import { SettingsFrame } from "./settings-frame";

/** A select on the right of a row; under its label when the page is narrow. */
const STACK = "[@container(max-width:639px)]:flex-col [@container(max-width:639px)]:items-stretch [@container(max-width:639px)]:gap-[8px]";
const SELECT_BOX = "w-[280px] [@container(max-width:639px)]:w-full [@media(pointer:coarse)]:[&_[role=combobox]]:min-h-[var(--touch-min)]";

/** The select's place before the browser is known: its size, nothing in it. */
function Pending() {
  return <div aria-hidden className="h-[44px] w-full rounded-lg border border-solid border-border bg-bg-subtle" />;
}

export function LanguagePage() {
  const { language } = useSettings();
  const { fields } = useMyProfile();
  const now = useMinuteClock();
  const ready = now > 0;
  const [failed, setFailed] = React.useState(false);

  // Worked out in the browser: its zones, regions and languages.
  const device = ready ? deviceZone() : null;
  const zoneOptions = React.useMemo<SelectOption[]>(() => (ready ? timeZoneChoices(device, now) : []), [ready, device, now]);
  const zoneChoice = zoneChoiceOf(fields);
  const zone = zoneChoice === DEVICE_ZONE ? device : zoneChoice;
  // Automatic's region moves with the zone chosen here.
  const autoRegion = React.useMemo(() => (ready && zone ? currentAutoRegion() : null), [ready, zone]);
  const dateOptions = React.useMemo<SelectOption[]>(() => (ready ? dateFormatChoices(autoRegion) : []), [ready, autoRegion]);
  const browserVoice = ready ? languageName(resolveVoiceLang("auto", browserLanguages())) : null;
  const listening = ready ? languageName(resolveVoiceLang(language.voice, browserLanguages())) : null;
  const voiceOptions = React.useMemo<SelectOption<VoiceLang>[]>(
    () => VOICE_CHOICES.map((c) => (c.value === "auto" && browserVoice ? { ...c, sub: browserVoice } : { ...c })),
    [browserVoice],
  );

  const saveLanguage = (patch: Partial<SettingsV1["language"]>) => setFailed(!updateSettings("language", patch));
  const saveZone = (choice: string) => setFailed(!saveProfile(zonePatchOf(choice, deviceZone())).ok);

  return (
    <SettingsFrame page="language">
      {failed && (
        <p role="alert" className="m-0 text-md leading-md text-text-error">
          {SAVE_FAILED}
        </p>
      )}

      <SettingsCard id="language-card" title="Language">
        <SettingsRow id="app-language" label="App language" help="English. Bangla is coming." />
        <SettingsRow
          id="voice"
          className={STACK}
          label="Voice typing language"
          help={
            <>
              {listening ? `The mic listens for ${listening}. ` : "The language the mic listens for. "}
              Your browser turns your speech into text: Chrome sends the audio to Google to do it.
            </>
          }
          control={
            <div className={SELECT_BOX}>
              {ready ? (
                <SelectMenu
                  ariaLabel="Voice typing language"
                  placeholder="Choose a language"
                  options={voiceOptions}
                  value={language.voice}
                  onChange={(v) => saveLanguage({ voice: v })}
                />
              ) : (
                <Pending />
              )}
            </div>
          }
        />
      </SettingsCard>

      <SettingsCard id="date-time" title="Date and time">
        <SettingsRow
          id="date-format"
          className={STACK}
          label="Date and time format"
          help={ready ? `Now: ${formatDateTime(now, language.dateLocale)}. Automatic follows your region.` : "Automatic follows your region."}
          control={
            <div className={SELECT_BOX}>
              {ready ? (
                <SelectMenu
                  ariaLabel="Date and time format"
                  placeholder="Choose a format"
                  options={dateOptions}
                  value={language.dateLocale}
                  onChange={(v) => saveLanguage({ dateLocale: v })}
                />
              ) : (
                <Pending />
              )}
            </div>
          }
        />
        <SettingsRow
          id="time-zone"
          className={STACK}
          label="Time zone"
          help={
            <>
              {ready && zone ? `It's ${formatTime(now, language.dateLocale, { timeZone: zone })} there now. ` : ""}
              Dates and times in your format use it, and so does the local time on your profile.
            </>
          }
          control={
            <div className={SELECT_BOX}>
              {ready ? (
                <SelectMenu ariaLabel="Time zone" placeholder="Choose a time zone" options={zoneOptions} value={zoneChoice} onChange={saveZone} />
              ) : (
                <Pending />
              )}
            </div>
          }
        />
      </SettingsCard>
    </SettingsFrame>
  );
}
