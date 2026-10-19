import type { SettingsRowEntry } from "./types";

export const languageRows: SettingsRowEntry[] = [
  { id: "app-language", label: "Account Language", help: "See buttons, titles and other text in your preferred language", keywords: ["language", "bangla", "english", "translate"] },
  { id: "date-format", label: "Date & Time Formatting", help: "Formats for dates and times", keywords: ["date", "time", "format", "24 hour", "region", "iso"] },
  { id: "time-zone", label: "Time zone", help: "Set in Personal Information", keywords: ["timezone", "local time", "clock"] },
  { id: "voice", label: "Voice typing language", help: "The language the mic listens for", keywords: ["voice", "dictation", "microphone", "speech"] },
];
