"use client";

// Keeps <html>'s data-text-size / data-contrast / data-motion in step with
// Settings › Appearance (lib/settings/appearance.ts). The root layout's
// pre-paint script set them before the first paint; this follows changes,
// from this tab or another. It writes what the store holds, never the
// hydration pass's defaults, so the pre-painted attributes never blink off.
// Renders nothing.

import * as React from "react";
import { appearanceAttrs } from "@/lib/settings/appearance";
import { readSettings } from "@/lib/settings/prefs";
import { useSettings } from "@/lib/settings/use-settings";

export function AppearanceSync() {
  const { appearance } = useSettings();
  React.useEffect(() => {
    const attrs = appearanceAttrs(readSettings().appearance);
    const d = document.documentElement.dataset;
    for (const k of ["textSize", "contrast", "motion"] as const) {
      const v = attrs[k];
      if (v) d[k] = v;
      else delete d[k];
    }
  }, [appearance]);
  return null;
}
