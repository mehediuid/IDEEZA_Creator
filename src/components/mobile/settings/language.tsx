"use client";

// Settings › Language & region (ST-40) and its searchable pickers (ST-41 Time
// zone, 41b no results, 41c Date and time format; Voice typing language the
// same way). A picker is its own screen, `?pick=…` on this page, so the
// phone's Back closes it. The logic is the web's
// (components/settings/language-page.tsx): App language is English with
// Bangla coming (no picker); Voice typing (lib/settings/voice.ts, Automatic
// follows the phone's languages); the date and time format (Automatic, every
// region in English, or ISO; lib/settings/dates.ts); the time zone, which is
// the profile's `timeZone` (lib/people/time-zones.ts).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { saveProfile, useMyProfile } from "@/lib/people/profile-store";
import { DEVICE_ZONE, deviceZone, timeZoneChoices, zoneChoiceOf, zoneOffsetOf, zonePatchOf } from "@/lib/people/time-zones";
import { SAMPLE_INSTANT, currentAutoRegion, dateFormatChoices, formatDateTime } from "@/lib/settings/dates";
import { updateSettings, VOICE_LANGS, type VoiceLang } from "@/lib/settings/prefs";
import { regionName } from "@/lib/settings/regions";
import { useSettings } from "@/lib/settings/use-settings";
import { browserLanguages, languageName, resolveVoiceLang } from "@/lib/settings/voice";
import { useOnline } from "../kit/states";
import { SettingsGroup, SettingsRow, SettingsScreen } from "./kit";
import { PickerScreen, type PickOption } from "./language-picker";

const PATH = "/m/settings/language";
const PICKS = ["voice", "date-format", "time-zone"] as const;
type Pick = (typeof PICKS)[number];

/** "Asia/Dhaka · GMT+6". */
const zoneLine = (zone: string, at: number) => `${zone.replace(/_/g, " ")} · ${zoneOffsetOf(zone, at)}`;

/** A format's order and clock, read off how it writes 12 March 2020, 18:09: "Day/month/year · 24-hour". */
function orderHint(choice: string): string {
  const sample = formatDateTime(SAMPLE_INSTANT, choice, { timeZone: DEVICE_ZONE });
  const parts = sample.match(/\d+/g)?.slice(0, 3) ?? [];
  if (parts.length < 3) return "";
  const names = parts.map((p) => (p === "2020" ? "year" : Number(p) === 12 ? "day" : "month"));
  const sep = sample.charAt(parts[0].length);
  const order = names.join(/[/.-]/.test(sep) ? sep : " ");
  const clock = /\b[ap]\.?\s?m/i.test(sample) ? "12-hour" : "24-hour";
  return `${order.charAt(0).toUpperCase()}${order.slice(1)} · ${clock}`;
}

export function LanguageSettings() {
  const params = useSearchParams();
  const raw = params.get("pick");
  const pick = (PICKS as readonly string[]).includes(raw ?? "") ? (raw as Pick) : null;
  const { language } = useSettings();
  const { fields, hydrated } = useMyProfile();
  const now = useMinuteClock();
  const ready = now > 0 && hydrated;

  const device = ready ? deviceZone() : null;
  const zoneChoice = zoneChoiceOf(fields);
  const zone = zoneChoice === DEVICE_ZONE ? device : zoneChoice;

  if (pick && ready) return <Picker pick={pick} now={now} device={device} zoneChoice={zoneChoice} />;
  return <LanguagePage ready={ready} now={now} zone={zone} voice={language.voice} dateLocale={language.dateLocale} />;
}

function LanguagePage({ ready, now, zone, voice, dateLocale }: { ready: boolean; now: number; zone: string | null; voice: VoiceLang; dateLocale: string }) {
  const router = useRouter();
  const online = useOnline();
  const open = (p: Pick) => router.push(`${PATH}?pick=${p}`);
  return (
    <SettingsScreen title="Language & region" loading={!ready}>
      <SettingsGroup label="Language">
        <SettingsRow id="app-language" label="App language" helper="Bangla is coming." value="English" />
        <SettingsRow
          id="voice"
          label="Voice typing language"
          // The disclosure (Chrome sends the audio to Google) is the note on the picker this row opens.
          helper="The language the mic listens for."
          value={voice === "auto" ? "Automatic" : languageName(voice)}
          onClick={() => open("voice")}
          disabled={!online}
        />
      </SettingsGroup>
      <SettingsGroup label="Date and time">
        <SettingsRow
          id="date-format"
          label="Date and time format"
          helper={ready ? formatDateTime(now, dateLocale) : undefined}
          onClick={() => open("date-format")}
          disabled={!online}
        />
        <SettingsRow
          id="time-zone"
          label="Time zone"
          helper={ready && zone ? zoneLine(zone, now) : undefined}
          onClick={() => open("time-zone")}
          disabled={!online}
        />
      </SettingsGroup>
    </SettingsScreen>
  );
}

function Picker({ pick, now, device, zoneChoice }: { pick: Pick; now: number; device: string | null; zoneChoice: string }) {
  const { language } = useSettings();

  // Worked out in the browser: its zones, regions and languages.
  const zones = React.useMemo<PickOption[]>(
    () =>
      pick === "time-zone"
        ? timeZoneChoices(null, now).map((z) => ({ value: z.value, label: z.label.replace(/ \((GMT[^)]*)\)$/, " · $1") }))
        : [],
    [pick, now],
  );
  const autoRegion = React.useMemo(() => (pick === "date-format" ? currentAutoRegion() : null), [pick]);
  const formats = React.useMemo<PickOption[]>(
    () =>
      pick === "date-format"
        ? dateFormatChoices(autoRegion)
            .filter((o) => o.value !== "auto")
            .map((o) => ({ value: o.value, label: o.label, hint: `${formatDateTime(now, o.value)} · ${orderHint(o.value)}` }))
        : [],
    [pick, autoRegion, now],
  );

  if (pick === "time-zone") {
    return (
      <PickerScreen
        title="Time zone"
        placeholder="Search time zones"
        noMatch={(q) => `No time zone matches “${q}”.`}
        autoFocus
        pinned={{ value: DEVICE_ZONE, label: "Automatic", hint: `${device ? device.replace(/_/g, " ") : "This phone’s zone"} · from this phone` }}
        options={zones}
        value={zoneChoice}
        onPick={(v) => saveProfile(zonePatchOf(v, deviceZone())).ok}
        backTo={PATH}
      />
    );
  }

  if (pick === "date-format") {
    return (
      <PickerScreen
        title="Date and time format"
        placeholder="Search formats"
        noMatch={(q) => `No format matches “${q}”.`}
        pinned={{
          value: "auto",
          label: "Automatic",
          hint: `${formatDateTime(now, "auto")} · ${autoRegion ? regionName(autoRegion) : "your region"}, from this phone`,
        }}
        options={formats}
        value={language.dateLocale}
        onPick={(v) => updateSettings("language", { dateLocale: v })}
        backTo={PATH}
      />
    );
  }

  const listening = languageName(resolveVoiceLang("auto", browserLanguages()));
  const voices: PickOption[] = VOICE_LANGS.filter((v) => v !== "auto").map((v) => ({ value: v, label: languageName(v) }));
  return (
    <PickerScreen
      title="Voice typing language"
      placeholder="Search languages"
      noMatch={(q) => `No language matches “${q}”.`}
      pinned={{ value: "auto", label: "Automatic", hint: `${listening} · from this phone` }}
      options={voices}
      value={language.voice}
      onPick={(v) => updateSettings("language", { voice: v as VoiceLang })}
      backTo={PATH}
      note="The language the mic listens for. Your browser turns your speech into text: Chrome sends the audio to Google to do it."
    />
  );
}
