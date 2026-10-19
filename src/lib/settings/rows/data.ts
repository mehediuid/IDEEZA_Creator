import type { SettingsRowEntry } from "./types";

export const dataRows: SettingsRowEntry[] = [
  { id: "where", label: "Where your data goes", keywords: ["ai", "privacy", "pollinations", "ai horde", "meshy", "server", "prompts", "who sees", "voice typing", "google"] },
  { id: "training", label: "Training", help: "IDEEZA doesn't train AI on your designs", keywords: ["train", "training", "ai training", "my designs"] },
  { id: "ai", label: "Use the volunteer GPU pool for images", keywords: ["ai horde", "images", "gpu", "volunteer"] },
  { id: "editor-assist", label: "AI help in the editors", keywords: ["assistant", "ai chat", "code ai", "copilot"] },
  { id: "activity", label: "Search history", keywords: ["history", "searches", "keep my search history", "clear search history", "activity"] },
  { id: "blog-reuse", label: "Blog reuse", keywords: ["consent", "future use", "revoke", "blog"] },
  { id: "download", label: "Download your information", keywords: ["export", "backup", "download", "zip", "my data", "copy of my work"] },
  { id: "storage", label: "Keep this browser from clearing it", keywords: ["storage", "persist", "space", "evict", "quota", "lose my data"] },
  { id: "restore", label: "Restore from a backup", keywords: ["import", "restore", "load backup", "new laptop", "another browser"] },
  { id: "erase", label: "Erase IDEEZA from this browser", keywords: ["delete", "clear", "erase", "remove data", "shared computer", "delete my data"] },
  { id: "cookies", label: "Cookies and analytics", help: "IDEEZA sets no cookies and has no analytics or advertising trackers", keywords: ["tracking", "cookies", "analytics"] },
];
