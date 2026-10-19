import type { SettingsRowEntry } from "./types";

export const notificationsRows: SettingsRowEntry[] = [
  { id: "popups", label: "Show pop-ups", help: "Right away, once a day, or paused", keywords: ["digest", "summary", "daily", "toast", "interrupt", "pause", "popup"] },
  { id: "quiet-hours", label: "Quiet hours", help: "Let sales through", keywords: ["night", "sleep", "do not disturb", "silence", "mute", "sales"] },
  { id: "keep-notices", label: "Keep notices until I close them", keywords: ["toast", "dismiss", "stay", "timeout", "popup"] },
  { id: "browser-popups", label: "Pop-ups outside this tab", keywords: ["browser notification", "desktop notification", "push", "permission", "allow"] },
  { id: "sales", label: "Sales and bids", help: "With a minimum bid", keywords: ["sale", "sold", "bid", "offer", "auction", "marketplace", "threshold"] },
  { id: "builds", label: "Builds and videos", keywords: ["build", "ready", "failed", "video", "render"] },
  { id: "credits", label: "Credits and plan", keywords: ["credits", "low", "expire", "renewal", "plan"] },
  { id: "messages", label: "Messages and requests", keywords: ["message", "dm", "request", "chat"] },
  { id: "comments", label: "Comments and replies", keywords: ["comment", "reply", "mention"] },
  { id: "teams", label: "Team conversations", keywords: ["team", "group"] },
  { id: "blog", label: "Blog reviews", keywords: ["blog", "article", "review"] },
  { id: "email", label: "Email and phone", help: "Come with sign-in", keywords: ["email", "emails", "phone", "sms", "mobile", "text message"] },
  { id: "muted-projects", label: "Muted projects", keywords: ["mute", "unmute", "noisy project"] },
];
