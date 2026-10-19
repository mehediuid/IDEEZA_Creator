// The languages Settings › Personal Information offers for "Language" (the
// ones you speak, Figma Select Language 22048:30021): Figma's six first, then
// other widely spoken ones, each named in English by `Intl` rather than typed
// in. Pure, no imports.

const CODES = ["bn", "en", "hi", "ar", "th", "es", "zh", "fr", "de", "id", "it", "ja", "ko", "ms", "nl", "fa", "pl", "pt", "pa", "ru", "sw", "ta", "te", "tr", "uk", "ur", "vi"];

function languageNames(): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" });
  } catch {
    return null;
  }
}

/** "Bangla", "English", … in the order Select Language lists them. */
export function spokenLanguageOptions(): string[] {
  const names = languageNames();
  if (!names) return ["English"];
  const out: string[] = [];
  for (const code of CODES) {
    try {
      const name = names.of(code);
      if (name && name !== code && !out.includes(name)) out.push(name);
    } catch {
      // A code this runtime can't name is left out.
    }
  }
  return out;
}
