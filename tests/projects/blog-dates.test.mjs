// Blog dates in the Figma's form: day first, month short, a 12-hour clock with leading zeros.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clockTime, dayDate, dayDateTime } from "../../.tmp-test/lib/blog/dates.js";

test("dates read day first, as frames 01 and 22 draw them", () => {
  const t = new Date(2025, 2, 24, 3, 32).getTime();
  assert.equal(dayDate(t), "24 Mar 2025");
  assert.equal(clockTime(t), "03:32 AM");
  assert.equal(dayDateTime(t), "24 Mar 2025 03:32 AM");
  assert.equal(dayDate(new Date(2025, 7, 28, 15, 5).getTime()), "28 Aug 2025");
  assert.equal(clockTime(new Date(2025, 7, 28, 15, 5).getTime()), "03:05 PM");
  assert.equal(dayDate(new Date(2026, 8, 3).getTime()), "3 Sep 2026", "September is Sep, not Sept");
});
