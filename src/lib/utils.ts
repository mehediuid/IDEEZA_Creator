import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's default scale, so the design system's
// own names (src/styles/tailwind-preset.ts) read as something else: `font-regular`
// as a font family (a `font-mono` beside it was dropped), `leading-xs` and
// `tracking-near` as unknown, `shadow-depth` as a shadow colour. And it drops a
// line height written before a font size, because Tailwind's `text-sm` sets
// one — the preset's sizes don't, which is how the Button lost its line height.
const twMerge = extendTailwindMerge({
  override: { conflictingClassGroups: { "font-size": [] } },
  extend: {
    theme: {
      "font-weight": ["regular"],
      leading: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl"],
      tracking: ["snug", "close", "near", "slight", "caps"],
      shadow: ["1", "2", "3", "4", "5", "6", "inner", "depth", "modal", "overlay", "tooltip", "focus-brand", "focus-on-fill", "focus-danger", "focus-inverse", "depth-focus-on-fill", "depth-focus-danger"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
