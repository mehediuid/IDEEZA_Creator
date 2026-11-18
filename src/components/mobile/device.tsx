"use client";

// Where the mobile prototype is running. On a phone it fills the screen; on a
// desktop the /m layout draws a phone (375 × 812, the Figma frame) holding
// the same page in an iframe, so the page inside always has a phone's width —
// the DS tokens' phone values, real `position: fixed`, real scrolling — and
// what the desktop shows is exactly what the phone shows.
//
// `framed` (inside that iframe) also draws the phone's own chrome the OS draws
// on a real device: the status bar and the home indicator.

import * as React from "react";

export type DeviceMode = "pending" | "desktop" | "framed" | "phone";

/** The web's own phone/desktop switch (tokens.css overrides below 768 px). */
const WIDE = "(min-width: 768px)";

/** The iframe tells the desktop page its path, so the address bar follows it. */
export const PATH_MESSAGE = "ideeza:m:path";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function inFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function snapshot(): DeviceMode {
  if (inFrame()) return "framed";
  return window.matchMedia(WIDE).matches ? "desktop" : "phone";
}

export function useDeviceMode(): DeviceMode {
  return React.useSyncExternalStore(subscribe, snapshot, () => "pending");
}

const FramedContext = React.createContext(false);
export const FramedProvider = FramedContext.Provider;

/** True inside the desktop's phone frame: draw the status bar and home indicator. */
export function useFramed(): boolean {
  return React.useContext(FramedContext);
}

/** Set by the tab layout: the tab bar sits at the foot, so a screen draws no
 *  home indicator of its own and a toast stands above the bar. */
const TabBarContext = React.createContext(false);
export const TabBarProvider = TabBarContext.Provider;

export function useHasTabBar(): boolean {
  return React.useContext(TabBarContext);
}

function subscribeViewport(onChange: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onChange);
  vv?.addEventListener("scroll", onChange);
  document.addEventListener("focusin", onChange);
  document.addEventListener("focusout", onChange);
  return () => {
    vv?.removeEventListener("resize", onChange);
    vv?.removeEventListener("scroll", onChange);
    document.removeEventListener("focusin", onChange);
    document.removeEventListener("focusout", onChange);
  };
}

/** Where the keyboard leaves the page to type into (KIT-KB-01). */
export type VisibleViewport = { height: number; top: number };

function editing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
  return el.tagName === "INPUT" && !/^(button|checkbox|radio|range|color|file|submit|reset|image)$/i.test((el as HTMLInputElement).type);
}

/** The part of the screen above the on-screen keyboard (iOS keeps the layout
 *  behind it and may pan the view), so a screen's foot or a sheet's actions
 *  ride on the keyboard. Null while no field has focus — a pinch zoom shrinks
 *  the visual viewport too, and that is not a keyboard. */
export function useVisibleViewport(): VisibleViewport | null {
  const key = React.useSyncExternalStore(
    subscribeViewport,
    () => {
      const vv = window.visualViewport;
      if (!vv || !editing() || vv.height >= window.innerHeight - 1) return "";
      return `${Math.round(vv.height)}:${Math.round(vv.offsetTop)}`;
    },
    () => "",
  );
  return React.useMemo(() => {
    if (!key) return null;
    const [height, top] = key.split(":").map(Number);
    return { height, top };
  }, [key]);
}

/** On <body> while the app is open (MobileRoot), so portalled sheets have it too:
 *  XL and 2XL buttons keep the DS default side padding (20 / 24, Kit 10605:2786)
 *  — owner rule "DS default modes" — while /m's spacing tokens take phone values. */
export const DS_DEFAULT_BUTTON_PAD = ["[--btn-px-xl:var(--spacing-12)]", "[--btn-px-2xl:var(--spacing-16)]"] as const;
