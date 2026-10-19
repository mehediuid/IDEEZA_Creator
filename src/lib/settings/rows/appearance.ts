import type { SettingsRowEntry } from "./types";

export const appearanceRows: SettingsRowEntry[] = [
  { id: "theme", label: "Theme", help: "Light, dark or match system: in the account menu", keywords: ["dark mode", "light mode"] },
  { id: "text-size", label: "Text size", help: "Default or Large", keywords: ["font size", "bigger text", "zoom"] },
  { id: "contrast", label: "High contrast", keywords: ["contrast", "readability"] },
  { id: "motion", label: "Reduce motion", help: "Match system or Reduce", keywords: ["animation", "motion"] },
  { id: "single-key", label: "Single-key shortcuts", help: "Letter and number keys in the editors", keywords: ["keyboard", "shortcuts", "hotkeys", "speech input"] },
  { id: "units", label: "Units, grid and hotkeys", help: "In the PCB editor's Setting menu", keywords: ["mm", "mil", "inch", "grid", "snap", "measurement unit"] },
  { id: "keep-notices", label: "Keep notices until I close them", keywords: ["toast", "notice", "screen reader"] },
  { id: "data-saver", label: "Data saver", help: "Post videos load only when you press play", keywords: ["autoplay", "mobile data", "bandwidth", "video"] },
];
