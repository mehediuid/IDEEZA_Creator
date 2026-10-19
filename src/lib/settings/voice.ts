// Settings › Language › Voice typing: the language the mic listens for
// (spec §5.7). "auto" is the app's own language, English (US) while English
// is the only one (D10). Names come from the browser's Intl.DisplayNames, so
// no list of language names is kept here. Relative imports only (node:test
// loads this).

import { VOICE_LANGS, readSettings, type VoiceLang } from "./prefs";

/** What dictation listens for when nothing is chosen: the app's language. */
export const APP_VOICE_LANG = "en-US";

/** The BCP 47 tag the recogniser gets. */
export function resolveVoiceLang(pref: unknown): string {
  if (typeof pref !== "string" || pref === "auto" || !(VOICE_LANGS as readonly string[]).includes(pref)) return APP_VOICE_LANG;
  return pref;
}

/** The stored choice, resolved (the default when there is no browser storage). */
export function currentVoiceLang(): string {
  return resolveVoiceLang(readSettings().language.voice);
}

let names: Intl.DisplayNames | null | undefined;

/** "Bangla (Bangladesh)", "British English"…; the app's own for auto. */
export function voiceLangLabel(v: VoiceLang): string {
  if (v === "auto") return "Same as the app (English)";
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(["en"], { type: "language" });
    } catch {
      names = null;
    }
  }
  return names?.of(v) ?? v;
}

export const VOICE_CHOICES: readonly { value: VoiceLang; label: string }[] = VOICE_LANGS.map((value) => ({
  value,
  label: voiceLangLabel(value),
}));
