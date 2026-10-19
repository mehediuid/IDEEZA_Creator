// Settings › Your activity: the search and watch log (`ideeza:activity`) — caps,
// 90-day retention, typing coalesced into one search, a rewatch moving up, and
// lists grouped by day.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  EMPTY_LOG,
  KEEP_DAYS,
  MAX_ENTRIES,
  normalizeActivityLog,
  withSearch,
  withWatch,
  pruneLog,
  groupByDay,
  searchHref,
} = await import("../../.tmp-test/lib/data/activity-log.js");

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 19, 15, 0).getTime();
let n = 0;
const id = () => `a${++n}`;

test("nothing stored, or junk, reads as an empty log", () => {
  for (const raw of [null, undefined, 3, "x", [], {}, { v: 2, searches: [] }]) assert.deepEqual(normalizeActivityLog(raw, NOW), EMPTY_LOG);
});

test("bad entries are dropped, good ones kept, newest first", () => {
  const log = normalizeActivityLog(
    {
      v: 1,
      searches: [
        { id: "s1", at: NOW - 1000, source: "palette", query: "plan", opened: "Plan & pricing" },
        { id: "s2", at: NOW - 10, source: "innovations", query: "drone", opened: null },
        { id: "s3", at: NOW, source: "nowhere", query: "x" },
        { id: "s4", at: "today", source: "explore", query: "x" },
        { id: "s5", at: NOW, source: "explore", query: "   " },
      ],
      watches: [{ id: "w1", at: NOW - 5, postId: "sample:1", postTitle: "Lamp", href: "/innovations/lamp", video: "Lamp" }, { id: "w2" }],
    },
    NOW,
  );
  assert.deepEqual(log.searches.map((s) => s.id), ["s2", "s1"]);
  assert.deepEqual(log.watches.map((w) => w.id), ["w1"]);
});

test("a search is trimmed, kept newest first, and an empty one is ignored", () => {
  let log = withSearch(EMPTY_LOG, { source: "explore", query: "  sensor  " }, NOW, id());
  assert.equal(log.searches[0].query, "sensor");
  assert.equal(log.searches[0].opened, null);
  assert.equal(withSearch(log, { source: "explore", query: "   " }, NOW, id()), log);
  log = withSearch(log, { source: "palette", query: "theme", opened: "Switch to Dark theme" }, NOW + 1, id());
  assert.deepEqual(log.searches.map((s) => s.query), ["theme", "sensor"]);
});

test("typing one search is one entry: a longer or shorter form within minutes replaces it", () => {
  let log = EMPTY_LOG;
  for (const [i, q] of ["a", "ar", "ard", "ardu", "arduino"].entries()) log = withSearch(log, { source: "explore", query: q }, NOW + i * 300, id());
  assert.deepEqual(log.searches.map((s) => s.query), ["arduino"]);
  assert.equal(log.searches[0].at, NOW + 1200);
  // Another source, or a new word, is a new entry.
  log = withSearch(log, { source: "innovations", query: "arduino" }, NOW + 2000, id());
  log = withSearch(log, { source: "explore", query: "lamp" }, NOW + 3000, id());
  assert.equal(log.searches.length, 3);
  // The same words much later are a new search.
  log = withSearch(log, { source: "explore", query: "lamp" }, NOW + 3000 + 10 * 60 * 1000, id());
  assert.equal(log.searches.length, 4);
});

test("at most 200 searches; the oldest go first", () => {
  let log = EMPTY_LOG;
  for (let i = 0; i < MAX_ENTRIES + 15; i++) log = withSearch(log, { source: "palette", query: `q${i} word`, opened: "Home" }, NOW + i * 10 * 60 * 1000, id());
  assert.equal(log.searches.length, MAX_ENTRIES);
  assert.equal(log.searches[0].query, `q${MAX_ENTRIES + 14} word`);
  assert.equal(log.searches.at(-1).query, "q15 word");
});

test("anything older than 90 days goes, on read and on write", () => {
  const old = { id: "o", at: NOW - (KEEP_DAYS + 1) * DAY, source: "explore", query: "old", opened: null };
  const fresh = { id: "f", at: NOW - (KEEP_DAYS - 1) * DAY, source: "explore", query: "fresh", opened: null };
  const log = normalizeActivityLog({ v: 1, searches: [old, fresh], watches: [] }, NOW);
  assert.deepEqual(log.searches.map((s) => s.id), ["f"]);
  const pruned = pruneLog({ v: 1, searches: [fresh, old], watches: [] }, NOW);
  assert.deepEqual(pruned.searches.map((s) => s.id), ["f"]);
});

test("a video watched again the same day moves up instead of repeating; another day is a new line", () => {
  const v = { postId: "sample:7", postTitle: "Plant monitor", href: "/innovations/plant", video: "Plant monitor" };
  let log = withWatch(EMPTY_LOG, v, NOW, id());
  log = withWatch(log, { ...v, postId: "sample:8", postTitle: "Lamp", video: "Lamp" }, NOW + 1000, id());
  log = withWatch(log, v, NOW + 2000, id());
  assert.deepEqual(log.watches.map((w) => [w.postId, w.at]), [["sample:7", NOW + 2000], ["sample:8", NOW + 1000]]);
  log = withWatch(log, v, NOW + DAY, id());
  assert.equal(log.watches.length, 3);
});

test("lists group by local day: Today, Yesterday, then the date", () => {
  const items = [
    { at: new Date(2026, 9, 19, 9, 0).getTime(), k: 1 },
    { at: new Date(2026, 9, 19, 0, 5).getTime(), k: 2 },
    { at: new Date(2026, 9, 18, 23, 59).getTime(), k: 3 },
    { at: new Date(2026, 9, 2, 12, 0).getTime(), k: 4 },
  ];
  const groups = groupByDay(items, NOW);
  assert.deepEqual(
    groups.map((g) => [g.label, g.items.map((i) => i.k)]),
    [
      ["Today", [1, 2]],
      ["Yesterday", [3]],
      ["2 Oct 2026", [4]],
    ],
  );
});

test("a search links back to where it ran; ⌘K's doesn't", () => {
  assert.equal(searchHref({ source: "innovations", query: "smart lamp" }), "/innovations?q=smart+lamp");
  assert.equal(searchHref({ source: "explore", query: "a&b" }), "/marketplace?q=a%26b");
  assert.equal(searchHref({ source: "palette", query: "plan" }), null);
});
