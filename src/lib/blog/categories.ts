// The Blog's categories (owner decision D4, 2026-10-14): a hardware maker's
// list, stored by id so a renamed label never orphans an article.

export type BlogCategory = { id: string; label: string };

export const BLOG_CATEGORIES: readonly BlogCategory[] = [
  { id: "story", label: "Build story" },
  { id: "howto", label: "How-to" },
  { id: "pcb", label: "Electronics & PCB" },
  { id: "firmware", label: "Firmware & code" },
  { id: "mech", label: "3D & mechanical" },
  { id: "robotics", label: "Robotics" },
  { id: "mfg", label: "Manufacturing" },
  { id: "selling", label: "Selling hardware" },
];

export function categoryLabel(id: string | null): string | null {
  return BLOG_CATEGORIES.find((c) => c.id === id)?.label ?? null;
}

export const isCategoryId = (id: unknown): id is string => typeof id === "string" && BLOG_CATEGORIES.some((c) => c.id === id);

/** Suggestions for the Topics field; a writer may type any topic. */
export const TOPIC_SUGGESTIONS: readonly string[] = [
  "PCB layout",
  "ESP32",
  "Power",
  "Batteries",
  "Sensors",
  "Motors",
  "LED drivers",
  "Thermal",
  "USB-C",
  "Enclosures",
  "3D printing",
  "Firmware updates",
  "Wireless",
  "Prototyping",
  "Small batch",
];
