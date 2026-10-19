import type { SettingsRowEntry } from "./types";

export const privacyRows: SettingsRowEntry[] = [
  { id: "view-public", label: "View as public", help: "See your profile as others see it", href: "/creators/me?view=public", keywords: ["preview", "stranger", "how others see me"] },
  { id: "lock", label: "Lock your profile", keywords: ["private profile", "hide profile", "lock"] },
  { id: "local-time", label: "Show my location and local time", keywords: ["location", "time zone", "where I am", "city"] },
  { id: "search-engines", label: "Search engines", help: "Let search engines link to your profile", keywords: ["google", "index", "seo"] },
  { id: "message", label: "Who can message you", keywords: ["messages", "requests", "dm", "strangers", "message settings"] },
  { id: "comment", label: "Who can comment on your shared projects", keywords: ["comments", "innovations"] },
  { id: "take-a-break", label: "Take a break", help: "Pause new requests and comments for a while", keywords: ["quiet mode", "harassment", "pause", "pile on", "viral"] },
  { id: "blocked", label: "Blocked people", keywords: ["block", "unblock", "blocked users", "blocked conversations"] },
  { id: "hidden-words", label: "Hidden words", keywords: ["muted words", "filter", "hide words", "abuse"] },
  { id: "reports", label: "Your reports", help: "Reports you made and what to do now", keywords: ["report", "reported", "harassment", "help", "abuse"] },
];
