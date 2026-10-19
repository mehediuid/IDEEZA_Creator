import type { SettingsRowEntry } from "./types";

export const notificationsRows: SettingsRowEntry[] = [
  { id: "marketplace", label: "Marketplace", help: "Sales, bids and offers", keywords: ["sale", "bid", "offer", "auction"] },
  { id: "product", label: "Product", help: "Builds and videos", keywords: ["build", "video"] },
  { id: "coin", label: "Coin", help: "Credits and payments", keywords: ["credits", "renewal", "payout"] },
  { id: "comments", label: "Comments", help: "Comments, replies and mentions", keywords: ["reply", "mention"] },
  { id: "message", label: "Message", help: "New messages and requests", keywords: ["messages", "requests", "dm"] },
  { id: "following", label: "Updates from people you follow", keywords: ["follow"] },
  { id: "teams", label: "Project teams", keywords: ["team", "invite"] },
  { id: "blog", label: "Blog", help: "Review results", keywords: ["article"] },
  { id: "policy", label: "Policy & Community", help: "Reports you made", keywords: ["report"] },
  { id: "other", label: "Other Notification" },
  { id: "digest", label: "Digest", help: "Right away, daily or weekly", keywords: ["summary", "frequency"] },
  { id: "quiet-hours", label: "Quiet hours", keywords: ["do not disturb", "mute", "sleep"] },
  { id: "bid-threshold", label: "Bids and offers above an amount", keywords: ["threshold", "bid"] },
  { id: "muted-projects", label: "Muted projects", keywords: ["mute", "unmute"] },
  { id: "where", label: "Where you receive notification", keywords: ["browser", "email", "push", "channel"] },
];
