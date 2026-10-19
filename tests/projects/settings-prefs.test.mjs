// Settings › the preferences record: defaults, field-by-field repair, patches,
// quiet hours and quiet mode.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  DEFAULT_SETTINGS,
  NOTICE_KINDS,
  normalizeSettings,
  patchSettings,
  inQuietHours,
  quietModeOn,
  cleanWords,
  HIDDEN_WORDS_MAX,
} = await import("../../.tmp-test/lib/settings/prefs.js");

test("nothing stored reads as the defaults", () => {
  for (const raw of [null, undefined, "x", 4, [], {}]) assert.deepEqual(normalizeSettings(raw), DEFAULT_SETTINGS);
});

test("defaults: web on, email and mobile off for every kind; private by default", () => {
  for (const k of NOTICE_KINDS) assert.deepEqual(DEFAULT_SETTINGS.notifications.channels[k], { web: true, email: false, mobile: false });
  assert.equal(DEFAULT_SETTINGS.audience.showLocalTime, false);
  assert.equal(DEFAULT_SETTINGS.privacy.searchEngines, false);
  assert.equal(DEFAULT_SETTINGS.credits.autoTopUp.on, false);
});

test("a broken field falls back alone; the rest is kept", () => {
  const s = normalizeSettings({
    notifications: { digest: "hourly", channels: { marketplace: { web: false, email: "yes" } } },
    language: { dateLocale: "en-IN", voice: "klingon" },
    credits: { lowAt: -5, monthlyCap: 200, confirmAbove: 0 },
    audience: { comment: "work", quietUntil: "soon" },
  });
  assert.equal(s.notifications.digest, "instant");
  assert.deepEqual(s.notifications.channels.marketplace, { web: false, email: false, mobile: false });
  assert.equal(s.language.dateLocale, "en-IN");
  assert.equal(s.language.voice, "auto");
  assert.equal(s.credits.lowAt, 10);
  assert.equal(s.credits.monthlyCap, 200);
  assert.equal(s.credits.confirmAbove, null);
  assert.equal(s.audience.comment, "work");
  assert.equal(s.audience.quietUntil, null);
});

test("patching one section leaves the others alone", () => {
  const s = patchSettings(DEFAULT_SETTINGS, "appearance", { dataSaver: true });
  assert.equal(s.appearance.dataSaver, true);
  assert.equal(s.appearance.textSize, "default");
  assert.deepEqual(s.notifications, DEFAULT_SETTINGS.notifications);
});

test("quiet hours wrap past midnight and are off when switched off or empty", () => {
  const on = patchSettings(DEFAULT_SETTINGS, "notifications", { quietHours: { on: true, from: "22:00", to: "07:00", urgentBreaksThrough: true } });
  assert.equal(inQuietHours(on, 23 * 60), true);
  assert.equal(inQuietHours(on, 3 * 60), true);
  assert.equal(inQuietHours(on, 7 * 60), false);
  assert.equal(inQuietHours(on, 12 * 60), false);
  const day = patchSettings(DEFAULT_SETTINGS, "notifications", { quietHours: { on: true, from: "09:00", to: "18:00", urgentBreaksThrough: false } });
  assert.equal(inQuietHours(day, 10 * 60), true);
  assert.equal(inQuietHours(day, 20 * 60), false);
  assert.equal(inQuietHours(DEFAULT_SETTINGS, 23 * 60), false);
  const same = patchSettings(DEFAULT_SETTINGS, "notifications", { quietHours: { on: true, from: "08:00", to: "08:00", urgentBreaksThrough: true } });
  assert.equal(inQuietHours(same, 8 * 60), false);
});

test("quiet mode is on until its end time", () => {
  const s = patchSettings(DEFAULT_SETTINGS, "audience", { quietUntil: 1_000 });
  assert.equal(quietModeOn(s, 999), true);
  assert.equal(quietModeOn(s, 1_000), false);
  assert.equal(quietModeOn(DEFAULT_SETTINGS, 0), false);
});

test("hidden words: trimmed, lower-cased, unique, capped", () => {
  assert.deepEqual(cleanWords([" NFT ", "nft", "#Tree", "", 4]), ["nft", "#tree"]);
  const many = Array.from({ length: HIDDEN_WORDS_MAX + 20 }, (_, i) => `w${i}`);
  assert.equal(cleanWords(many).length, HIDDEN_WORDS_MAX);
});
