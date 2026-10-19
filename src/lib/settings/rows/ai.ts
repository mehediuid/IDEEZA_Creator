import type { SettingsRowEntry } from "./types";

export const aiRows: SettingsRowEntry[] = [
  { id: "where", label: "Where your AI requests go", help: "Text, images and 3D models", keywords: ["ai", "pollinations", "ai horde", "meshy", "privacy", "data"] },
  { id: "volunteer-pool", label: "Use the volunteer GPU pool for images", keywords: ["ai horde", "images", "gpu"] },
  { id: "editor-assist", label: "AI help in the editors", help: "Code editor's AI chat and 3D AI Generate", keywords: ["assistant", "ai chat", "code", "3d"] },
];
