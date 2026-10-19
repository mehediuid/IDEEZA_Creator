import type { SettingsRowEntry } from "./types";

export const blockingRows: SettingsRowEntry[] = [
  { id: "block-users", label: "Block users", help: "Manage all your block list from here", keywords: ["blocked", "unblock"] },
  { id: "block-message", label: "Block message", help: "Manage all your blocked message list from here", keywords: ["blocked conversations"] },
  { id: "hide-words", label: "Hide specific words", help: "Hide words from comments and requests", keywords: ["muted words", "filter", "hidden words"] },
];
