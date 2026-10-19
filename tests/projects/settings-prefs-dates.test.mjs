// Settings › Language & region › Date and time format: one formatter for
// every date the app shows: a region's conventions in English, Automatic (your
// region), and ISO. The region list itself: settings-lang-regions.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";

const { formatDate, formatDateTime, formatTime, formatStamp, dateFormatName } = await import("../../.tmp-test/lib/settings/dates.js");
const { autoRegion } = await import("../../.tmp-test/lib/settings/regions.js");

const T = new Date(2020, 2, 12, 18, 9, 5).getTime();

test("United States: month first, 12-hour clock (Figma's own example)", () => {
  assert.equal(formatDateTime(T, "en-US"), "3/12/2020, 06:09 PM");
  assert.equal(formatDate(T, "en-US", { style: "numeric" }), "3/12/2020");
  assert.equal(formatDate(T, "en-US"), "Mar 12, 2020");
  assert.equal(formatTime(T, "en-US"), "06:09 PM");
});

test("India: day first, 12-hour clock", () => {
  assert.match(formatDateTime(T, "IN"), /^12\/0?3\/2020, 06:09 (pm|PM)$/);
  assert.equal(formatDate(T, "IN"), "12 Mar 2020");
});

test("Austria, Belgium, Spain: day first, 24-hour clock, English month words", () => {
  assert.equal(formatDateTime(T, "AT"), "12/03/2020, 18:09");
  assert.match(formatDateTime(T, "BE"), /^12\/0?3\/2020,? 18:09$/);
  assert.match(formatDateTime(T, "ES"), /^12\/0?3\/2020,? 18:09$/);
  assert.equal(formatTime(T, "de-AT"), "18:09", "an old stored locale reads as its region");
  assert.equal(formatDate(T, "AT"), "12 Mar 2020");
});

test("ISO: year-month-day and a 24-hour clock, whatever the style", () => {
  assert.equal(formatDateTime(T, "iso"), "2020-03-12 18:09");
  for (const style of ["numeric", "medium", "long", "day", "weekday"]) assert.equal(formatDate(T, "iso", { style }), "2020-03-12");
  assert.equal(formatTime(T, "iso"), "18:09");
  assert.equal(formatTime(T, "iso", { seconds: true }), "18:09:05");
  assert.equal(formatDateTime(T, "iso", { seconds: true }), "2020-03-12 18:09:05");
});

test("auto follows your region (this runtime's zone and languages)", () => {
  const region = autoRegion(Intl.DateTimeFormat().resolvedOptions().timeZone, globalThis.navigator?.languages ?? []);
  const expected = region
    ? formatDate(T, region)
    : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(T);
  assert.equal(formatDate(T, "auto"), expected);
  assert.equal(formatDate(T, "not-a-locale"), expected, "an unknown value reads as auto");
});

test("styles: no year, weekday, long month", () => {
  assert.equal(formatDate(T, "en-US", { style: "day" }), "Mar 12");
  assert.equal(formatDate(T, "en-US", { style: "weekday" }), "Thu, Mar 12");
  assert.equal(formatDate(T, "en-US", { style: "long" }), "March 12, 2020");
  assert.equal(formatTime(T, "en-US", { seconds: true }), "06:09:05 PM");
});

test("English dates say Sep, never Sept", () => {
  const sep = new Date(2020, 8, 3).getTime();
  assert.equal(formatDate(sep, "en-IN"), "3 Sep 2020");
});

test("a time zone moves the clock (the profile's local time)", () => {
  const utc = Date.UTC(2026, 9, 14, 15, 40);
  assert.equal(formatTime(utc, "en-US", { timeZone: "Asia/Dhaka" }), "09:40 PM");
  assert.equal(formatTime(utc, "iso", { timeZone: "Asia/Dhaka" }), "21:40");
  assert.equal(formatTime(utc, "iso", { timeZone: "Not/AZone" }), null, "a zone the browser can't read gives nothing");
});

test("formatStamp: a time today, a date before", () => {
  const now = new Date(2020, 2, 12, 20, 0).getTime();
  assert.equal(formatStamp(T, "en-US", now), "06:09 PM");
  assert.equal(formatStamp(new Date(2020, 2, 2, 9).getTime(), "en-US", now), "Mar 2");
  assert.equal(formatStamp(new Date(2019, 2, 2, 9).getTime(), "en-US", now), "Mar 2, 2019");
});

test("a choice's name: the region, ISO, or Automatic with the region it found", () => {
  assert.equal(dateFormatName("BD", null), "Bangladesh");
  assert.equal(dateFormatName("en-US", null), "United States");
  assert.equal(dateFormatName("iso", null), "ISO (2020-03-12)");
  assert.equal(dateFormatName("auto", "BD"), "Automatic (Bangladesh)");
  assert.equal(dateFormatName("auto", null), "Automatic (your browser)");
});

test("Messages, the profile's local time: dated parts follow the format, relative words stay", async () => {
  const { shortTimeOf, dayLabelOf, clockOf } = await import("../../.tmp-test/lib/messages/rules.js");
  const { localTimeOf } = await import("../../.tmp-test/lib/people/portfolio.js");
  const now = new Date(2026, 9, 14, 12).getTime();
  const sep2 = new Date(2026, 8, 2, 9).getTime();
  assert.equal(shortTimeOf(now - 5 * 60_000, now, "iso"), "5m");
  assert.equal(shortTimeOf(sep2, now, "iso"), "2026-09-02");
  assert.equal(shortTimeOf(sep2, now, "en-US"), "Sep 2");
  assert.equal(shortTimeOf(new Date(2025, 8, 2).getTime(), now, "en-US"), "Sep 2, 2025");
  assert.equal(dayLabelOf(now, now, "AT"), "Today");
  assert.equal(dayLabelOf(sep2, now, "en-US"), "Wed, Sep 2");
  assert.equal(clockOf(T, "AT"), "18:09");
  assert.equal(clockOf(T), "6:09 PM", "no format given: the fixed English form");
  assert.equal(localTimeOf("Asia/Dhaka", Date.UTC(2026, 9, 14, 15, 40), "iso"), "21:40");
  assert.equal(localTimeOf(null, 0, "iso"), null);
});
