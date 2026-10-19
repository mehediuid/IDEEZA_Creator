"use client";

// /settings/language (User Panel V2 Preferences | Language 22048:34238; spec
// §5.7). App Language: English (US); the Select Language modal (22048:34277)
// lists the others as "Not available yet" (D10). Time Formatting: the Date &
// Time Formatting modal (22048:34355) with each region's live example, the
// browser's own and ISO; lib/settings/dates.ts formats every date with it.
// Voice typing (new): the language dictation listens for. Time zone lives in
// Personal Information, so it is a link.

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import { DATE_FORMATS, dateFormatOf } from "@/lib/settings/dates";
import { updateSettings, type DateLocale, type VoiceLang } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";
import { VOICE_CHOICES, voiceLangLabel } from "@/lib/settings/voice";
import { SettingsCard, SettingsRow } from "./settings-card";
import { SettingsChoiceDialog, type ChoiceOption } from "./settings-choice";
import { SettingsFrame } from "./settings-frame";

const NOT_YET = "Not available yet";

/** Figma's Select Language list; English is the only app language so far (D10). */
const APP_LANGUAGES: readonly ChoiceOption<string>[] = [
  { value: "bn", label: "Bangla", disabled: true, reason: NOT_YET },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi", disabled: true, reason: NOT_YET },
  { value: "ar", label: "Arabic", disabled: true, reason: NOT_YET },
  { value: "th", label: "Thai", disabled: true, reason: NOT_YET },
  { value: "es", label: "Español", disabled: true, reason: NOT_YET },
];

type Open = "language" | "date" | "voice" | null;

/** Figma's value-with-chevron trigger on the right of a row; it opens the row's modal. */
function ValueButton({ value, label, onClick }: { value: string; label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      hierarchy="secondary"
      size="sm"
      aria-haspopup="dialog"
      aria-label={`${label}: ${value}. Change`}
      onClick={onClick}
      className="max-w-[min(40vw,280px)] max-md:min-h-[var(--touch-min)]"
    >
      <span className="truncate">{value}</span>
      <Icon icon={ArrowDown01Icon} size={16} />
    </Button>
  );
}

export function LanguagePage() {
  const { language } = useSettings();
  const [open, setOpen] = React.useState<Open>(null);
  const close = () => setOpen(null);
  const dateChoice = dateFormatOf(language.dateLocale);
  // Worked out while the modal is open, so each example is this browser's own.
  const dateOptions = React.useMemo<ChoiceOption<DateLocale>[]>(
    () => (open === "date" ? DATE_FORMATS.map((f) => ({ value: f.value, label: f.label, hint: f.example() })) : []),
    [open],
  );

  return (
    <SettingsFrame page="language">
      <SettingsCard id="app" title="App Language">
        <SettingsRow
          id="app-language"
          label="Account Language"
          help="See buttons, titles and other text in your preferred language."
          control={<ValueButton value="English (US)" label="Account Language" onClick={() => setOpen("language")} />}
        />
      </SettingsCard>

      <SettingsCard id="time" title="Time Formatting">
        <SettingsRow
          id="date-format"
          label="Date & Time Formatting"
          help="Formats for dates and times"
          control={<ValueButton value={dateChoice.name} label="Date & Time Formatting" onClick={() => setOpen("date")} />}
        />
        <SettingsRow
          id="time-zone"
          label="Time zone"
          help="Set in Personal Information. Your profile shows your local time with it."
          href="/settings/personal-information#timezone"
        />
      </SettingsCard>

      <SettingsCard id="voice-typing" title="Voice typing">
        <SettingsRow
          id="voice"
          label="Voice typing language"
          help="The language the mic listens for when you dictate a prompt or an edit."
          control={
            <ValueButton
              value={language.voice === "auto" ? "Same as the app" : voiceLangLabel(language.voice)}
              label="Voice typing language"
              onClick={() => setOpen("voice")}
            />
          }
        />
      </SettingsCard>

      <SettingsChoiceDialog
        open={open === "language"}
        title="Select Language"
        options={APP_LANGUAGES}
        value="en"
        onClose={close}
        onSave={() => true}
      />
      <SettingsChoiceDialog
        open={open === "date"}
        title="Date & Time Formatting"
        options={dateOptions}
        value={language.dateLocale}
        onClose={close}
        onSave={(v) => updateSettings("language", { dateLocale: v })}
      />
      <SettingsChoiceDialog
        open={open === "voice"}
        title="Voice typing language"
        options={VOICE_CHOICES as ChoiceOption<VoiceLang>[]}
        value={language.voice}
        onClose={close}
        onSave={(v) => updateSettings("language", { voice: v })}
      />
    </SettingsFrame>
  );
}
