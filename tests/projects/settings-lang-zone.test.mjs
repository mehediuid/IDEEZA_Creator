// Settings › Language & region › Time zone: the one zone the app shows times
// in. A zone you chose wins; "This device" leaves each formatter on the
// device's own zone. Formatters read it from the stored profile.
import { test } from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.window = { localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null) } };

const { appZoneOf, DEVICE_ZONE } = await import("../../.tmp-test/lib/people/time-zones.js");
const { formatTime, formatDate, formatStamp } = await import("../../.tmp-test/lib/settings/dates.js");
const { PROFILE_KEY } = await import("../../.tmp-test/lib/people/fields.js");

const UTC_1540 = Date.UTC(2026, 9, 14, 15, 40);
const deviceClock = (ts) => formatTime(ts, "iso", { timeZone: DEVICE_ZONE });

test("the app's zone: the one you chose, or none while it follows this device", () => {
  assert.equal(appZoneOf({ timeZone: "Asia/Tokyo", timeZoneManual: true }), "Asia/Tokyo");
  assert.equal(appZoneOf({ timeZone: "Asia/Tokyo", timeZoneManual: false }), null);
  assert.equal(appZoneOf({ timeZone: null, timeZoneManual: false }), null);
});

test("nothing chosen: times are the device's", () => {
  store.clear();
  assert.equal(formatTime(UTC_1540, "iso"), deviceClock(UTC_1540));
});

test("a chosen zone moves every formatted time", () => {
  store.set(PROFILE_KEY, JSON.stringify({ v: 2, timeZone: "Asia/Tokyo", timeZoneManual: true }));
  assert.equal(formatTime(UTC_1540, "iso"), "00:40", "15:40 UTC is 00:40 next day in Tokyo");
  assert.equal(formatDate(UTC_1540, "iso"), "2026-10-15");
  assert.equal(formatTime(UTC_1540, "iso", { timeZone: "Asia/Dhaka" }), "21:40", "an explicit zone still wins");
  store.set(PROFILE_KEY, JSON.stringify({ v: 2, timeZone: "Asia/Tokyo", timeZoneManual: false }));
  assert.equal(formatTime(UTC_1540, "iso"), deviceClock(UTC_1540), "following the device ignores the saved zone");
  store.clear();
});

test("a row's stamp decides 'today' in the zone too", () => {
  const now = Date.UTC(2026, 9, 14, 20, 0); // 02:00 on the 15th in Dhaka
  const lateOn14 = Date.UTC(2026, 9, 14, 17, 0); // 23:00 on the 14th in Dhaka
  const earlyOn15 = Date.UTC(2026, 9, 14, 19, 0); // 01:00 on the 15th in Dhaka
  assert.equal(formatStamp(earlyOn15, "iso", now, { timeZone: "Asia/Dhaka" }), "01:00");
  assert.equal(formatStamp(lateOn14, "US", now, { timeZone: "Asia/Dhaka" }), "Oct 14");
  assert.equal(formatStamp(lateOn14, "iso", now, { timeZone: "UTC" }), "17:00", "the same instant is today in UTC");
});
