// Settings › Language › Date & Time Formatting: one formatter for every date
// the app shows, per region (Figma 22048:34355), the browser's own, and ISO.
import { test } from "node:test";
import assert from "node:assert/strict";

const { formatDate, formatDateTime, formatTime, formatStamp, DATE_FORMATS, dateFormatOf, SAMPLE_INSTANT } = await import(
  "../../.tmp-test/lib/settings/dates.js"
);

const T = new Date(2020, 2, 12, 18, 9, 5).getTime();

test("United States: month first, 12-hour clock (Figma's own example)", () => {
  assert.equal(formatDateTime(T, "en-US"), "3/12/2020, 06:09 PM");
  assert.equal(formatDate(T, "en-US", { style: "numeric" }), "3/12/2020");
  assert.equal(formatDate(T, "en-US"), "Mar 12, 2020");
  assert.equal(formatTime(T, "en-US"), "06:09 PM");
});

test("India: day first, 12-hour clock", () => {
  assert.match(formatDateTime(T, "en-IN"), /^12\/0?3\/2020, 06:09 (pm|PM)$/);
  assert.equal(formatDate(T, "en-IN"), "12 Mar 2020");
});

test("Austria, Belgium, Español: day first, 24-hour clock", () => {
  assert.equal(formatDateTime(T, "de-AT"), "12.3.2020, 18:09");
  assert.match(formatDateTime(T, "nl-BE"), /^12\/0?3\/2020,? 18:09$/);
  assert.match(formatDateTime(T, "es-ES"), /^12\/0?3\/2020,? 18:09$/);
  assert.equal(formatTime(T, "de-AT"), "18:09");
});

test("Thailand counts years in the Buddhist era, as Thai dates do", () => {
  assert.match(formatDate(T, "th-TH", { style: "numeric" }), /2563$/);
  assert.equal(formatTime(T, "th-TH"), "18:09");
});

test("ISO: year-month-day and a 24-hour clock, whatever the style", () => {
  assert.equal(formatDateTime(T, "iso"), "2020-03-12 18:09");
  for (const style of ["numeric", "medium", "long", "day", "weekday"]) assert.equal(formatDate(T, "iso", { style }), "2020-03-12");
  assert.equal(formatTime(T, "iso"), "18:09");
  assert.equal(formatTime(T, "iso", { seconds: true }), "18:09:05");
  assert.equal(formatDateTime(T, "iso", { seconds: true }), "2020-03-12 18:09:05");
});

test("auto follows the browser (this runtime's default locale)", () => {
  const browser = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(T);
  assert.equal(formatDate(T, "auto"), browser);
  assert.equal(formatDate(T, "not-a-locale"), browser, "an unknown value reads as auto");
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

test("the dialog's options: the browser first, the six Figma regions, ISO last, each with its live example", () => {
  assert.deepEqual(
    DATE_FORMATS.map((f) => f.value),
    ["auto", "en-US", "en-IN", "de-AT", "nl-BE", "th-TH", "es-ES", "iso"],
  );
  assert.deepEqual(
    DATE_FORMATS.slice(1, 7).map((f) => f.label),
    ["United States", "India", "Austria", "Belgium", "Thailand", "Español"],
  );
  assert.equal(dateFormatOf("en-US").name, "United States (English)", "the row's value, as Figma writes it");
  assert.equal(dateFormatOf("iso").example(), "2020-03-12 18:09");
  assert.equal(dateFormatOf("en-US").example(), formatDateTime(SAMPLE_INSTANT, "en-US"));
  assert.equal(dateFormatOf("bogus").value, "auto");
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
  assert.equal(dayLabelOf(now, now, "de-AT"), "Today");
  assert.equal(dayLabelOf(sep2, now, "en-US"), "Wed, Sep 2");
  assert.equal(clockOf(T, "de-AT"), "18:09");
  assert.equal(clockOf(T), "6:09 PM", "no format given: the fixed English form");
  assert.equal(localTimeOf("Asia/Dhaka", Date.UTC(2026, 9, 14, 15, 40), "iso"), "21:40");
  assert.equal(localTimeOf(null, 0, "iso"), null);
});
