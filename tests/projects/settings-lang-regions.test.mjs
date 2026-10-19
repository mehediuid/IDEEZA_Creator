// Settings › Language & region › Date and time format: every region the
// browser knows (built at runtime, never typed out), the region worked out
// for "Automatic", and each region's conventions written in English.
import { test } from "node:test";
import assert from "node:assert/strict";

const { regionCodes, regionName, regionOfZone, autoRegion, dateChoiceFrom, englishFormatFor } = await import(
  "../../.tmp-test/lib/settings/regions.js"
);
const { formatDate, formatDateTime, formatTime, dateFormatChoices } = await import("../../.tmp-test/lib/settings/dates.js");

const T = new Date(2020, 2, 12, 18, 9, 5).getTime();

test("the region list is every place the browser knows, Bangladesh among them, A to Z, once each", () => {
  const codes = regionCodes();
  assert.ok(codes.length > 200, `${codes.length} regions`);
  assert.ok(codes.includes("BD"));
  assert.equal(regionName("BD"), "Bangladesh");
  assert.equal(new Set(codes).size, codes.length, "no region twice (UK and GB are one)");
  for (const notAPlace of ["EU", "UN", "ZZ", "XA", "EZ", "QO"]) assert.ok(!codes.includes(notAPlace), notAPlace);
  const names = codes.map(regionName);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
});

test("a time zone names its region; UTC and junk name none", () => {
  assert.equal(regionOfZone("Asia/Dhaka"), "BD");
  assert.equal(regionOfZone("America/New_York"), "US");
  assert.equal(regionOfZone("Europe/London"), "GB");
  assert.equal(regionOfZone("UTC"), null);
  assert.equal(regionOfZone("Not/AZone"), null);
  assert.equal(regionOfZone(null), null);
});

test("Automatic: a browser language that names a region wins, else the time zone's region", () => {
  assert.equal(autoRegion("Asia/Dhaka", ["en-US"]), "BD", "plain en-US is the browser default, not a choice");
  assert.equal(autoRegion("UTC", ["bn-BD"]), "BD");
  assert.equal(autoRegion("America/New_York", ["bn"]), "BD", "Bangla on its own means Bangladesh");
  assert.equal(autoRegion("Asia/Dhaka", ["en-GB"]), "GB");
  assert.equal(autoRegion("UTC", ["en-US"]), "US");
  assert.equal(autoRegion(null, []), null);
});

test("a stored choice: auto, ISO, a region, or an old locale read as its region", () => {
  assert.equal(dateChoiceFrom("auto"), "auto");
  assert.equal(dateChoiceFrom("iso"), "iso");
  assert.equal(dateChoiceFrom("BD"), "BD");
  assert.equal(dateChoiceFrom("en-IN"), "IN");
  assert.equal(dateChoiceFrom("de-AT"), "AT");
  assert.equal(dateChoiceFrom("th-TH"), "TH");
  for (const bad of ["EU", "ZZ", "xx", "klingon", 5, null, undefined]) assert.equal(dateChoiceFrom(bad), "auto", String(bad));
});

test("a region with its own English uses it; one without borrows English with its order and clock", () => {
  assert.deepEqual(englishFormatFor("GB"), { locale: "en-GB" });
  assert.deepEqual(englishFormatFor("BD"), { locale: "en-IN" }, "day first, 12-hour");
  assert.deepEqual(englishFormatFor("TH"), { locale: "en-GB" }, "day first, 24-hour");
  assert.deepEqual(englishFormatFor("JP"), { locale: "en-SE" }, "year first, 24-hour");
  assert.deepEqual(englishFormatFor("KR"), { locale: "en-SE", hourCycle: "h12" }, "year first, 12-hour");
});

test("Bangladesh: day first, 12-hour clock, English words", () => {
  assert.equal(formatDateTime(T, "BD"), "12/3/2020, 06:09 pm");
  assert.equal(formatDate(T, "BD"), "12 Mar 2020");
  assert.equal(formatTime(T, "BD"), "06:09 pm");
});

test("other regions keep their own order and clock", () => {
  assert.equal(formatDateTime(T, "US"), "3/12/2020, 06:09 PM");
  assert.equal(formatDateTime(T, "en-US"), "3/12/2020, 06:09 PM", "an old stored locale still works");
  assert.equal(formatDateTime(T, "TH"), "12/03/2020, 18:09", "Gregorian years, in English");
  assert.equal(formatDateTime(T, "JP"), "2020-03-12, 18:09");
  assert.equal(formatDate(T, "DE"), "12 Mar 2020");
});

test("the choices: Automatic (naming the region it found) first, every region, ISO last, each with its example", () => {
  const opts = dateFormatChoices("BD");
  assert.equal(opts[0].value, "auto");
  assert.equal(opts[0].label, "Automatic (Bangladesh)");
  assert.equal(opts[0].sub, "12/3/2020, 06:09 pm", "Automatic shows the format it found");
  assert.equal(opts.at(-1).value, "iso");
  assert.equal(opts.at(-1).sub, "2020-03-12 18:09");
  const bd = opts.find((o) => o.value === "BD");
  assert.equal(bd.label, "Bangladesh");
  assert.equal(bd.sub, "12/3/2020, 06:09 pm");
  assert.equal(opts.length, regionCodes().length + 2);
  assert.equal(dateFormatChoices(null)[0].label, "Automatic (your browser)");
});
