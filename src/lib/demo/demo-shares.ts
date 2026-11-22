// The clips every account has already shared to its Feed with its own words (owner, 2026-11-22: "one
// post can't show the idea — show several"), so the profile's Timeline always reads like a feed of
// shared work: a two-product project of Aiko's, a product of Priya's, an Only me project of Tomas's and
// a product of Aiko's, beside the account's own shared projects (demo-projects.ts: Smart Plant Pot and
// Gesture LED Lamp). They lead the phone's Feed as any share does, and ⋯ › Remove from your Feed takes
// each off. Prototype only, as the rest of the demo data.
//
// Planted once per account with the demo projects (seed version 8); a share already there, or removed
// after planting, is never written again by a later start. Pure: no storage, no clock. Relative
// imports only (node:test loads the compiled module).

import { feedPrefsIn, type FeedPrefs, type FeedShare } from "../innovations/feed-prefs";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The shares, timed against `now`: [clip id, caption, audience, how long ago]. Every clip id is a
 *  sample clip on the marketplace (clips.ts FEED_CLIPS). */
const SHARES: readonly [string, string, FeedShare["audience"], number][] = [
  ["p12", "Two products in one project: the hub and its soil probe. Exactly the setup I want beside my Smart Plant Pot.", "public", 3 * HOUR],
  ["p22~display", "A display that reads the weather station without a phone. Clean idea.", "public", 2 * DAY],
  ["p7", "Saving this one for the office. Worth a Physical NFT later.", "only-me", 4 * DAY],
  ["p28~cradle", "Even the charging cradle got its own video. Nice touch.", "public", 9 * DAY],
];

export const demoShareId = (clipId: string) => `share_demo_${clipId}`;

export function demoSharesOf(now: number): FeedShare[] {
  return SHARES.map(([clipId, caption, audience, ago]) => ({ id: demoShareId(clipId), clipId, caption, audience, at: now - ago }));
}

/** The stored Feed prefs with the demo shares they lack; null when nothing is added (or the value
 *  doesn't read as prefs at all: an object is required, a missing key reads as none). */
export function withDemoShares(stored: unknown, now: number): FeedPrefs | null {
  if (stored !== undefined && (typeof stored !== "object" || stored === null || Array.isArray(stored))) return null;
  const prefs = feedPrefsIn(stored ?? {});
  const add = demoSharesOf(now).filter((s) => !prefs.shares.some((x) => x.id === s.id));
  return add.length ? { ...prefs, shares: [...prefs.shares, ...add] } : null;
}
