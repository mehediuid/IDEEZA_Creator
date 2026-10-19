import type { SettingsRowEntry } from "./types";

// The page's rows in order (components/settings/notifications-page.tsx): the
// ten kinds (each id opens its row), this browser, then the digest, quiet
// hours, the bid threshold and muted projects.
export const notificationsRows: SettingsRowEntry[] = [
  { id: "marketplace", label: "Marketplace", help: "Sales, bids and offers, auctions ending", keywords: ["sale", "sold", "bid", "offer", "auction"] },
  { id: "product", label: "Product", help: "Builds ready, needing a retry or paused; video takes", keywords: ["build", "video", "take", "retry"] },
  { id: "coin", label: "Coin", help: "Credits running low or expiring, plan renewal", keywords: ["credits", "renewal", "plan", "expire", "low"] },
  { id: "comments", label: "Comments", help: "Comments on the projects you shared", keywords: ["reply", "replies", "innovations"] },
  { id: "message", label: "Message", help: "New messages and requests", keywords: ["messages", "requests", "dm", "inbox"] },
  { id: "following", label: "Updates from people you follow", keywords: ["follow", "friends"] },
  { id: "teams", label: "Project teams", help: "Team conversation messages", keywords: ["team", "group", "groups"] },
  { id: "blog", label: "Blog", help: "Review results, featured, removed", keywords: ["article", "review"] },
  { id: "policy", label: "Policy & Community", help: "Reports you made", keywords: ["report"] },
  { id: "other", label: "Other Notification" },
  { id: "where", label: "Where you receive notification", help: "This browser", keywords: ["browser", "email", "push", "mobile", "channel", "web"] },
  { id: "digest", label: "Digest", help: "Right away, daily or weekly summary", keywords: ["summary", "frequency", "daily", "weekly"] },
  { id: "quiet-hours", label: "Quiet hours", help: "No pop-ups and no new count between two times", keywords: ["do not disturb", "dnd", "mute", "sleep", "night"] },
  { id: "bid-threshold", label: "Bids and offers", help: "Only bids and offers above an amount", keywords: ["threshold", "bid", "offer", "amount", "minimum"] },
  { id: "muted-projects", label: "Muted projects", help: "Unmute a project you muted from the bell", keywords: ["mute", "unmute", "silence"] },
];
