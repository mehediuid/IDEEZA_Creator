"use client";

// One bar at a time on a hackathon page (owner 2026-11-17: with the site's
// top bar and the page's section bar both stuck to the top there were too
// many buttons). Once the section bar has reached the top and the page
// scrolls on down, the site's bar slides away and the section bar takes the
// very top; the moment the page scrolls back up, the site's bar slides back.
// Above the point where the section bar sticks, the site's bar always shows.
// Only the hackathon pages do this; every other page keeps its fixed bar.

import * as React from "react";
import { LandingNav } from "@/components/landing/nav";

/** The section bar's id: the store reads where it is. */
export const SECTION_BAR_ID = "hk-section-bar";
/** The site bar's height: the section bar sticks this far down while the site bar shows. */
const SITE_BAR = 80;
/** Scroll steps smaller than this (px) change nothing, so a trackpad's jitter does not flicker the bar. */
const STEP = 6;

let hidden = false;
let lastY = 0;
const subscribers = new Set<() => void>();

function onScroll() {
  const y = window.scrollY;
  const bar = document.getElementById(SECTION_BAR_ID);
  // Stuck: the section bar has reached its place under the site bar (or the very top, once that has gone).
  const stuck = bar ? bar.getBoundingClientRect().top <= SITE_BAR + 1 : false;
  const d = y - lastY;
  let next = hidden;
  if (!stuck) next = false;
  else if (d > STEP) next = true;
  else if (d < -STEP) next = false;
  if (Math.abs(d) > STEP || !stuck) lastY = y;
  if (next !== hidden) {
    hidden = next;
    subscribers.forEach((f) => f());
  }
}

function subscribe(onChange: () => void) {
  if (subscribers.size === 0) {
    lastY = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0) {
      window.removeEventListener("scroll", onScroll);
      hidden = false;
    }
  };
}

/** Whether the site's bar is out of the way right now (never on the server). */
export function useSiteBarHidden(): boolean {
  return React.useSyncExternalStore(subscribe, () => hidden, () => false);
}

/** The site's top bar on a hackathon page: it gives way to the section bar while the page scrolls down. */
export function HackathonSiteNav() {
  return <LandingNav hidden={useSiteBarHidden()} />;
}
