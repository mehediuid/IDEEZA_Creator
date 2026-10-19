import type { SettingsRowEntry } from "./types";

export const notificationsRows: SettingsRowEntry[] = [
  { id: "sales", label: "Sales and bids", help: "With a minimum bid", keywords: ["sale", "sold", "bid", "offer", "auction", "marketplace", "threshold"] },
  { id: "builds", label: "Builds and videos", keywords: ["build", "ready", "failed", "video", "render"] },
  { id: "credits", label: "Credits and plan", keywords: ["credits", "low", "expire", "renewal", "plan"] },
  { id: "messages", label: "Messages and requests", keywords: ["message", "dm", "request", "chat"] },
  { id: "comments", label: "Comments and mentions", keywords: ["comment", "reply", "mention"] },
  { id: "teams", label: "Team conversations", keywords: ["team", "group"] },
  { id: "blog", label: "Blog reviews", keywords: ["blog", "article", "review"] },
  { id: "popups", label: "Pop-ups", help: "Right away, once a day, or paused", keywords: ["digest", "summary", "toast", "interrupt", "pause"] },
  { id: "quiet-hours", label: "Quiet hours", keywords: ["night", "sleep", "do not disturb", "silence", "mute"] },
  { id: "browser-popups", label: "Pop-ups outside this tab", keywords: ["browser notification", "desktop notification", "push", "permission"] },
  { id: "muted-projects", label: "Muted projects", keywords: ["mute", "unmute", "noisy project"] },
];
