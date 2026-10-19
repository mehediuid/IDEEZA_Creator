import type { SettingsRowEntry } from "./types";

export const profileShareRows: SettingsRowEntry[] = [
  { id: "add-to-team", label: "Who can add you to a project team", help: "Control who can invite you to work on their project.", keywords: ["contribution request", "invite", "team"] },
  { id: "see-following", label: "Who can see who you follow", help: "Control who can see the people you follow.", keywords: ["following list", "friend list"] },
  { id: "link-save", label: "Allow others to save and link your shared projects", keywords: ["share", "save", "copy link", "newsfeed"] },
  { id: "local-time", label: "Show my location and local time on my profile", keywords: ["location", "time zone", "city", "privacy"] },
  { id: "view-public", label: "View as public", help: "See your profile as others see it.", href: "/creators/me?view=public", keywords: ["preview", "how others see me"] },
  { id: "follow", label: "Who can follow you", help: "Control who can follow you.", keywords: ["followers", "friend request"] },
  { id: "team-conversation", label: "Who can invite you to a team conversation", keywords: ["group request", "group chat"] },
  { id: "message", label: "Who can message you", help: "Control who can start a conversation with you.", keywords: ["messages", "requests", "dm", "message settings"] },
  { id: "comment", label: "Who can comment on your shared projects", keywords: ["comments", "innovations"] },
  { id: "quiet-mode", label: "Quiet mode", help: "Pause new message requests, and let only people you work with comment.", keywords: ["harassment", "pause", "break", "do not disturb"] },
];
