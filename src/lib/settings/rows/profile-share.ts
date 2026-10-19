import type { SettingsRowEntry } from "./types";

export const profileShareRows: SettingsRowEntry[] = [
  { id: "add-to-team", label: "Who can add you to a project team", keywords: ["contribution request", "invite"] },
  { id: "see-following", label: "Who can see who you follow", keywords: ["following list", "friend list"] },
  { id: "link-save", label: "Allow others to save and link your shared projects", keywords: ["share", "save"] },
  { id: "follow", label: "Who can follow you", keywords: ["followers", "friend request"] },
  { id: "team-conversation", label: "Who can invite you to a team conversation", keywords: ["group request"] },
  { id: "message", label: "Who can message you", keywords: ["messages", "requests", "dm", "message settings"] },
  { id: "local-time", label: "Show my location and local time", keywords: ["location", "time zone", "privacy"] },
  { id: "comment", label: "Who can comment on your shared projects", keywords: ["comments"] },
  { id: "quiet-mode", label: "Quiet mode", help: "Pause new requests and comments for a while", keywords: ["harassment", "pause", "break"] },
  { id: "view-public", label: "View as public", help: "See your profile as others see it", href: "/creators/me?view=public", keywords: ["preview"] },
];
