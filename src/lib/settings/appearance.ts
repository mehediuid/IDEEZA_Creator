// Settings › Appearance & accessibility — what <html> carries for the
// choices that change the whole app (spec §5.8), read by globals.css and
// reset.css:
//   data-text-size="large"  every type size and its line height one DS step up
//   data-contrast="high"    secondary and tertiary text in the primary ink,
//                           borders in the strong border
//   data-motion="reduce"    the app's reduced-motion rules, whatever the system says
// APPEARANCE_PREPAINT runs in <head> before the body paints (as the sidebar's
// SIDEBAR_PREPAINT does), so a large-text page never paints small first;
// AppearanceSync keeps the attributes in step after a change. No "use
// client": the root layout is a server component.

import { SETTINGS_KEY, type SettingsV1 } from "./prefs";

export interface AppearanceAttrs {
  textSize: "large" | null;
  contrast: "high" | null;
  motion: "reduce" | null;
}

export function appearanceAttrs(a: SettingsV1["appearance"]): AppearanceAttrs {
  return {
    textSize: a.textSize === "large" ? "large" : null,
    contrast: a.contrast === "high" ? "high" : null,
    motion: a.motion === "reduce" ? "reduce" : null,
  };
}

/** Copies the stored choices onto <html> before the first paint. */
export const APPEARANCE_PREPAINT = `try{var a=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)})||"{}").appearance||{},d=document.documentElement.dataset;if(a.textSize==="large")d.textSize="large";if(a.contrast==="high")d.contrast="high";if(a.motion==="reduce")d.motion="reduce"}catch(e){}`;

/** Motion should stay still: the system asks for it, or Settings does. For
 *  the scripted motion CSS can't reach (smooth scrolling, auto-rotation). */
export function motionReduced(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
