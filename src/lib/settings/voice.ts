// Settings › Language & region › Voice typing: the language the mic listens
// for. "auto" follows the browser's own languages (navigator.languages),
// mapped onto VOICE_LANGS: the first one the list has, by its exact tag or by
// its language ("bn" → bn-BD, "en-AU" → en-US). Names come from the
// browser's Intl.DisplayNames, so no list of language names is kept here.
// Relative imports only (node:test loads this).

import { VOICE_LANGS, readSettings, type VoiceLang } from "./prefs";

/** What dictation listens for when no browser language is on the list. */
export const FALLBACK_VOICE_LANG = "en-US";

const LISTED = VOICE_LANGS.filter((v) => v !== "auto");

/** The list's language for the browser's `languages`, in their order. */
export function voiceLangFor(languages: readonly string[]): string {
  for (const tag of languages) {
    const exact = LISTED.find((v) => v.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const lang = tag.split("-")[0].toLowerCase();
    const same = LISTED.find((v) => v.split("-")[0] === lang);
    if (same) return same;
  }
  return FALLBACK_VOICE_LANG;
}

/** The browser's own languages, most wanted first; none outside a browser. */
export function browserLanguages(): readonly string[] {
  try {
    if (typeof navigator === "undefined") return [];
    if (navigator.languages?.length) return navigator.languages;
    return navigator.language ? [navigator.language] : [];
  } catch {
    return [];
  }
}

/** The BCP 47 tag the recogniser gets for a stored choice. */
export function resolveVoiceLang(pref: unknown, languages: readonly string[] = browserLanguages()): string {
  if (typeof pref === "string" && pref !== "auto" && (LISTED as readonly string[]).includes(pref)) return pref;
  return voiceLangFor(languages);
}

/** The stored choice, resolved (the browser's language when there is no browser storage). */
export function currentVoiceLang(): string {
  return resolveVoiceLang(readSettings().language.voice);
}

let names: Intl.DisplayNames | null | undefined;

/** A tag's name for people: "Bangla (Bangladesh)", "British English"… */
export function languageName(tag: string): string {
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(["en"], { type: "language" });
    } catch {
      names = null;
    }
  }
  return names?.of(tag) ?? tag;
}

export function voiceLangLabel(v: VoiceLang): string {
  return v === "auto" ? "Same as your browser" : languageName(v);
}

export const VOICE_CHOICES: readonly { value: VoiceLang; label: string }[] = VOICE_LANGS.map((value) => ({
  value,
  label: voiceLangLabel(value),
}));
