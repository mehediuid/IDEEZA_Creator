import type { SettingsRowEntry } from "./types";

export const languageRows: SettingsRowEntry[] = [
  { id: "app-language", label: "Account Language", help: "See buttons, titles and other text in your preferred language", keywords: ["language", "bangla", "english", "translate"] },
  { id: "date-format", label: "Date & Time Formatting", help: "Formats for dates, times and numbers", keywords: ["date", "time", "format", "24 hour", "region"] },
  { id: "voice", label: "Voice typing language", help: "The language you speak to the mic", keywords: ["voice", "dictation", "microphone", "speech"] },
];
