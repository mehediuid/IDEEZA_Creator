// Blog "Your blogs" list (spec 2026-10-14-blog-figma-requirements.md L1–L4, L15): the polite count
// line, the Status / Reuse access / Date range filters and their counts, the URL that carries
// them, the calendar's days, and when a live blog's draft differs from what readers see.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_BLOG } from "../../.tmp-test/lib/blog/types.js";
import { changeCover, createArticle, decide, discardChanges, findArticle, patchDraft, setReuse, submit } from "../../.tmp-test/lib/blog/article.js";
import {
  blogQueryHref,
  blogsLabel,
  countLine,
  draftMetaChanged,
  filterArticles,
  filterCounts,
  hasFilters,
  pageOf,
  parseBlogQuery,
} from "../../.tmp-test/lib/blog/list.js";
import {
  addDays,
  addMonths,
  dayKey,
  dayLabel,
  inRange,
  isDayKey,
  monthGrid,
  monthLabel,
  pickDay,
  rangeLabel,
  shiftMonth,
  weekEnd,
  weekStart,
} from "../../.tmp-test/lib/blog/date-range.js";

const T0 = Date.UTC(2026, 9, 14, 10, 0, 0);
const ID = "art_abc123xyz9";
const cover = (fileKey) => ({ fileKey, x: 50, y: 50, zoom: 1, alt: "The board" });
/** Local time, so a day key never depends on the machine's time zone. */
const at = (m, d, h = 10) => new Date(2026, m - 1, d, h, 0, 0).getTime();

function liveArticle() {
  const data = createArticle(EMPTY_BLOG, ID, T0, { title: "Smart lamp board", categoryId: "pcb", topics: ["ESP32"], cover: cover("file_a") });
  return decide(submit(data, ID, T0 + 1), ID, "approved", [], T0 + 2, true);
}

/** Seven blogs, one per Figma status, each on its own October day; reuse allowed on three. */
function sevenStatuses() {
  const ids = ["art_000000feat", "art_00000appr", "art_0000draft", "art_00000resb", "art_00000remv", "art_00000pend", "art_00000rejc"];
  let d = EMPTY_BLOG;
  ids.forEach((id, i) => {
    d = createArticle(d, id, at(10, 1 + i), { title: `Blog ${i}`, categoryId: "howto" });
  });
  const approve = (id, day) => {
    d = submit(d, id, at(10, day), 60_000);
    d = decide(d, id, "approved", [], at(10, day, 11), true);
  };
  approve(ids[0], 1);
  approve(ids[1], 2);
  d = { ...d, articles: d.articles.map((a) => (a.id === ids[0] ? { ...a, featured: true } : a)) };
  // Re-submitted: sent back once, then sent again.
  d = decide(submit(d, ids[3], at(10, 4), 60_000), ids[3], "changes", [{ id: "needs-detail", detail: "" }], at(10, 4, 11), true);
  d = submit(d, ids[3], at(10, 4, 12), 10 ** 9);
  // Removed by the IDEEZA team.
  approve(ids[4], 5);
  d = { ...d, articles: d.articles.map((a) => (a.id === ids[4] ? { ...a, takenDown: { at: at(10, 5, 12), reasons: [] } } : a)) };
  d = submit(d, ids[5], at(10, 6), 10 ** 9);
  d = decide(submit(d, ids[6], at(10, 7), 60_000), ids[6], "changes", [{ id: "off-topic", detail: "" }], at(10, 7, 11), true);
  for (const id of [ids[0], ids[1], ids[6]]) d = setReuse(d, id, true, at(10, 8));
  // Every row's date is its own day: Oct 1 … Oct 7.
  d = { ...d, articles: d.articles.map((a) => ({ ...a, updatedAt: at(10, 1 + ids.indexOf(a.id), 9) })) };
  return { d, ids };
}

const DEFAULT = { tab: "all", q: "", page: 1 };

test("the count line says how many rows are on screen, and of how many, in blogs", () => {
  let data = EMPTY_BLOG;
  for (let i = 0; i < 14; i++) data = createArticle(data, `art_${String(i).padStart(10, "0")}`, T0 + i, { title: `Blog ${i}` });
  const all = filterArticles(data.articles, DEFAULT);
  const line = (page, searching = false) => {
    const p = pageOf(all, page);
    return countLine({ from: p.from, to: p.to, total: all.length, pageCount: p.pageCount, searching });
  };
  assert.equal(line(1), "Showing 1–12 of 14 blogs");
  assert.equal(line(2), "Showing 13–14 of 14 blogs");
  assert.equal(countLine({ from: 1, to: 3, total: 3, pageCount: 1, searching: false }), "3 blogs");
  assert.equal(countLine({ from: 1, to: 1, total: 1, pageCount: 1, searching: false }), "1 blog");
  assert.equal(countLine({ from: 1, to: 3, total: 3, pageCount: 1, searching: true }), "3 blogs match");
  assert.equal(countLine({ from: 1, to: 1, total: 1, pageCount: 1, searching: true }), "1 blog matches");
  assert.equal(countLine({ from: 0, to: 0, total: 0, pageCount: 1, searching: true }), "No blogs match");
  assert.equal(countLine({ from: 0, to: 0, total: 0, pageCount: 1, searching: false }), "No blogs");
});

test("a count reads out in words", () => {
  assert.equal(blogsLabel(0), "0 blogs");
  assert.equal(blogsLabel(1), "1 blog");
  assert.equal(blogsLabel(14), "14 blogs");
});

test("the Status filter shows one of the Figma's seven statuses", () => {
  const { d, ids } = sevenStatuses();
  const only = (status) => filterArticles(d.articles, { ...DEFAULT, status }).map((a) => a.id);
  assert.deepEqual(only("featured"), [ids[0]]);
  assert.deepEqual(only("approved"), [ids[1]]);
  assert.deepEqual(only("draft"), [ids[2]]);
  assert.deepEqual(only("resubmitted"), [ids[3]]);
  assert.deepEqual(only("removed"), [ids[4]]);
  assert.deepEqual(only("pending"), [ids[5]]);
  assert.deepEqual(only("rejected"), [ids[6]]);
  const all = filterArticles(d.articles, DEFAULT);
  assert.equal(all.length, 7, "All: every blog");
  assert.equal(all[0].id, ids[6], "newest change first");
});

test("the Reuse access filter reads reuse.allowed", () => {
  const { d, ids } = sevenStatuses();
  const allowed = filterArticles(d.articles, { ...DEFAULT, reuse: "allowed" }).map((a) => a.id);
  assert.deepEqual(allowed.sort(), [ids[0], ids[1], ids[6]].sort());
  assert.equal(filterArticles(d.articles, { ...DEFAULT, reuse: "not" }).length, 4);
});

test("the Date range keeps the rows whose date falls on or between the two days", () => {
  const { d, ids } = sevenStatuses();
  const range = (from, to) => filterArticles(d.articles, { ...DEFAULT, from, to }).map((a) => a.id);
  assert.deepEqual(range("2026-10-02", "2026-10-04"), [ids[3], ids[2], ids[1]], "both ends count");
  assert.deepEqual(range("2026-10-07", "2026-10-07"), [ids[6]], "a one-day range");
  assert.deepEqual(range("2026-11-01", "2026-11-30"), []);
});

test("filters combine with each other and with the search", () => {
  const { d, ids } = sevenStatuses();
  const q = { ...DEFAULT, reuse: "allowed", from: "2026-10-01", to: "2026-10-03" };
  assert.deepEqual(filterArticles(d.articles, q).map((a) => a.id), [ids[1], ids[0]]);
  assert.deepEqual(filterArticles(d.articles, { ...q, status: "approved" }).map((a) => a.id), [ids[1]]);
  assert.deepEqual(filterArticles(d.articles, { ...q, q: "blog 0" }).map((a) => a.id), [ids[0]]);
  assert.deepEqual(filterArticles(d.articles, { ...q, status: "draft" }), []);
});

test("each filter's counts say what choosing it would show, given the rest", () => {
  const { d } = sevenStatuses();
  const all = filterCounts(d.articles, DEFAULT);
  assert.deepEqual(all.status, { all: 7, featured: 1, approved: 1, draft: 1, resubmitted: 1, removed: 1, pending: 1, rejected: 1 });
  assert.deepEqual(all.reuse, { all: 7, allowed: 3, not: 4 });

  const allowed = filterCounts(d.articles, { ...DEFAULT, reuse: "allowed" });
  assert.deepEqual(allowed.status, { all: 3, featured: 1, approved: 1, draft: 0, resubmitted: 0, removed: 0, pending: 0, rejected: 1 });
  assert.deepEqual(allowed.reuse, { all: 7, allowed: 3, not: 4 }, "a filter's own choice doesn't narrow its counts");

  const rejected = filterCounts(d.articles, { ...DEFAULT, status: "rejected", from: "2026-10-01", to: "2026-10-03" });
  assert.deepEqual(rejected.reuse, { all: 0, allowed: 0, not: 0 }, "the dates narrow the other counts");
  assert.equal(rejected.status.approved, 1);
});

test("the URL carries the search, every filter and the page; defaults stay out", () => {
  const q = parseBlogQuery(new URLSearchParams("q=lamp&status=rejected&reuse=allowed&from=2026-10-08&to=2026-10-23&page=2"));
  assert.deepEqual(q, { tab: "all", q: "lamp", page: 2, status: "rejected", reuse: "allowed", from: "2026-10-08", to: "2026-10-23" });
  assert.equal(blogQueryHref(q), "/blog?q=lamp&status=rejected&reuse=allowed&from=2026-10-08&to=2026-10-23&page=2");
  assert.equal(blogQueryHref({ ...DEFAULT, status: "resubmitted" }), "/blog?status=resubmitted");
  assert.equal(blogQueryHref({ ...DEFAULT, reuse: "not" }), "/blog?reuse=not");
  assert.equal(blogQueryHref(DEFAULT), "/blog");
  assert.deepEqual(parseBlogQuery(new URLSearchParams("")), DEFAULT, "a bare /blog adds no keys");
});

test("a bad filter in the URL is dropped; the dates are put in order and one end is one day", () => {
  assert.deepEqual(parseBlogQuery(new URLSearchParams("status=live&reuse=maybe&from=2026-02-30")), DEFAULT);
  assert.deepEqual(parseBlogQuery(new URLSearchParams("from=2026-10-23&to=2026-10-08")), { ...DEFAULT, from: "2026-10-08", to: "2026-10-23" });
  assert.deepEqual(parseBlogQuery(new URLSearchParams("to=2026-10-08")), { ...DEFAULT, from: "2026-10-08", to: "2026-10-08" });
  assert.equal(hasFilters(DEFAULT), false);
  assert.equal(hasFilters({ status: "draft" }), true);
  assert.equal(hasFilters({ from: "2026-10-08" }), true);
});

test("days: local keys, real dates only, moves by day, week and month", () => {
  assert.equal(dayKey(new Date(2026, 9, 4, 23, 59)), "2026-10-04");
  assert.equal(isDayKey("2026-10-14"), true);
  assert.equal(isDayKey("2026-02-29"), false, "2026 is not a leap year");
  assert.equal(isDayKey("2028-02-29"), true);
  assert.equal(isDayKey("2026-13-01"), false);
  assert.equal(isDayKey("14/10/2026"), false);
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2026-10-14", 7), "2026-10-21");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28", "kept inside the shorter month");
  assert.equal(addMonths("2026-12-15", 1), "2027-01-15");
  assert.deepEqual(shiftMonth({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
  assert.equal(weekStart("2026-10-14"), "2026-10-12", "weeks start on Monday");
  assert.equal(weekEnd("2026-10-14"), "2026-10-18");
  assert.equal(weekStart("2026-10-18"), "2026-10-12", "Sunday ends the week");
});

test("a month is six Monday-first weeks, the neighbours' days greyed", () => {
  const grid = monthGrid({ year: 2026, month: 9 });
  assert.equal(grid.length, 6);
  assert.ok(grid.every((w) => w.length === 7));
  assert.deepEqual(grid[0].map((d) => d.day), [28, 29, 30, 1, 2, 3, 4], "Oct 1, 2026 is a Thursday");
  assert.deepEqual(grid[0].map((d) => d.inMonth), [false, false, false, true, true, true, true]);
  assert.equal(grid.flat().filter((d) => d.inMonth).length, 31);
  assert.equal(grid[5][6].key, "2026-11-08");
  assert.equal(monthLabel({ year: 2026, month: 9 }), "October 2026");
  assert.equal(dayLabel("2026-10-14"), "Wednesday, October 14, 2026");
});

test("picking: a start, then an end in either order; the range holds both ends", () => {
  let s = pickDay(null, "2026-10-23");
  assert.deepEqual(s, { pending: "2026-10-23", range: null }, "the first pick only starts it");
  s = pickDay(s.pending, "2026-10-08");
  assert.deepEqual(s, { pending: null, range: { from: "2026-10-08", to: "2026-10-23" } });
  assert.deepEqual(pickDay("2026-10-08", "2026-10-08").range, { from: "2026-10-08", to: "2026-10-08" }, "the same day twice is one day");
  assert.equal(inRange("2026-10-08", s.range), true);
  assert.equal(inRange("2026-10-23", s.range), true);
  assert.equal(inRange("2026-10-24", s.range), false);
  assert.equal(inRange("2026-10-10", null), false);
});

test("the trigger names the range briefly", () => {
  assert.equal(rangeLabel({ from: "2026-10-14", to: "2026-10-14" }), "Oct 14, 2026");
  assert.equal(rangeLabel({ from: "2026-10-08", to: "2026-10-23" }), "Oct 8 – 23, 2026");
  assert.equal(rangeLabel({ from: "2026-09-28", to: "2026-10-03" }), "Sep 28 – Oct 3, 2026");
  assert.equal(rangeLabel({ from: "2025-12-30", to: "2026-01-04" }), "Dec 30, 2025 – Jan 4, 2026");
});

test("a live blog's draft details differ from the live ones only after a real change", () => {
  let data = liveArticle();
  const now = () => findArticle(data, ID);
  assert.equal(draftMetaChanged(now()), false, "just approved: the draft is what readers see");

  data = patchDraft(data, ID, { title: "Smart lamp board, rev B" }, T0 + 3);
  assert.equal(draftMetaChanged(now()), true, "a new title waits for review");
  data = discardChanges(data, ID, T0 + 4);
  assert.equal(draftMetaChanged(now()), false, "discarding puts the live details back");

  data = patchDraft(data, ID, { topics: ["ESP32", "Power"] }, T0 + 5);
  assert.equal(draftMetaChanged(now()), true, "a topic added");
  data = discardChanges(data, ID, T0 + 6);

  data = patchDraft(data, ID, { categoryId: "howto" }, T0 + 7);
  assert.equal(draftMetaChanged(now()), true, "another category");
  data = discardChanges(data, ID, T0 + 8);

  data = changeCover(data, ID, cover("file_b"), { reviewed: true }, T0 + 9);
  assert.equal(draftMetaChanged(now()), false, "one of the blog's own images applies to both at once");
  data = changeCover(data, ID, cover("file_new"), { reviewed: false }, T0 + 10);
  assert.equal(draftMetaChanged(now()), true, "a new upload waits in the draft");
});

test("a blog that was never live has nothing to differ from", () => {
  const data = createArticle(EMPTY_BLOG, ID, T0, { title: "Draft only" });
  assert.equal(draftMetaChanged(findArticle(data, ID)), false);
});
