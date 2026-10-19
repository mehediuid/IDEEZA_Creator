import type { SettingsRowEntry } from "./types";

export const appearanceRows: SettingsRowEntry[] = [
  { id: "theme", label: "Theme", help: "Light, dark or match system: in the account menu", keywords: ["dark mode", "light mode"] },
  { id: "text-size", label: "Text size", keywords: ["font size", "bigger text", "zoom"] },
  { id: "contrast", label: "High contrast", keywords: ["contrast", "readability"] },
  { id: "motion", label: "Reduce motion", keywords: ["animation", "motion"] },
  { id: "keep-notices", label: "Keep notices until I close them", keywords: ["toast", "notice", "screen reader"] },
  { id: "single-key", label: "Single-key shortcuts", keywords: ["keyboard", "shortcuts", "hotkeys"] },
  { id: "data-saver", label: "Data saver", help: "Videos don't play by themselves", keywords: ["autoplay", "mobile data", "bandwidth"] },
  { id: "units", label: "Units, grid and hotkeys", help: "In the PCB editor's Setting menu", keywords: ["mm", "mil", "inch", "grid", "snap", "measurement unit"] },
];
