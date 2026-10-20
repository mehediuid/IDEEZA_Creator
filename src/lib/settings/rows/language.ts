import type { SettingsRowEntry } from "./types";

export const languageRows: SettingsRowEntry[] = [
  { id: "app-language", label: "App language", keywords: ["language", "bangla", "bengali", "english", "translate"] },
  { id: "date-format", label: "Date and time format", keywords: ["date", "time", "format", "24 hour", "day first", "region"] },
  { id: "time-zone", label: "Time zone", keywords: ["timezone", "local time", "clock", "gmt"] },
  { id: "voice", label: "Voice typing language", keywords: ["voice", "dictation", "microphone", "mic", "speech", "bangla"] },
];
