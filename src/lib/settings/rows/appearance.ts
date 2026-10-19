import type { SettingsRowEntry } from "./types";

export const appearanceRows: SettingsRowEntry[] = [
  { id: "theme", label: "Theme", help: "Light, dark or match system", keywords: ["dark mode", "light mode", "night mode", "colors"] },
  { id: "text-size", label: "Text size", keywords: ["font size", "bigger text", "larger text", "zoom", "fonts"] },
  { id: "contrast", label: "High contrast", keywords: ["contrast", "readability", "low vision"] },
  { id: "motion", label: "Reduce motion", keywords: ["animation", "motion", "vestibular"] },
  { id: "single-key", label: "Single-key shortcuts", keywords: ["keyboard", "shortcuts", "hotkeys", "screen reader"] },
  { id: "data-saver", label: "Data saver", help: "Videos don't load by themselves", keywords: ["autoplay", "mobile data", "bandwidth"] },
  { id: "units", label: "Default units", help: "mm, mil or inch for new boards and parts", keywords: ["mm", "mil", "inch", "units", "measurement", "grid", "snap", "pcb"] },
];
