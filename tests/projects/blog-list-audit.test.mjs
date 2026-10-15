// Blog list after the UX audit (audit/SYNTHESIS.md, team B): the row's date is its latest status
// event (F41), the search finds words in any order, without hyphens, and by the writer's own name
// (F42, F13 / D-6), a rejected update counts under Rejected and a waiting update says so (F22,
// F57), the row's count is exactly `thingsToFix`'s (F17), the Figma's words (F11 L2), the one-row
// page (F59), the remembered view (F62), the filter typeahead (F90), the calendar's day names and
// day-first range (F51, F11), what the IDEEZA team looks for (F20), and a few source-level facts
// the browser walk proved (F64, F91, F51, F82, F11 L1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EMPTY_BLOG } from "../../.tmp-test/lib/blog/types.js";
import { changeCover, createArticle, decide, findArticle, patchDraft, submit, thingsToFix } from "../../.tmp-test/lib/blog/article.js";
import { REASONS } from "../../.tmp-test/lib/blog/reasons.js";
import { MIN_WORDS } from "../../.tmp-test/lib/blog/demo-review.js";
import {
  countLine,
  filterArticles,
  filterCounts,
  foldText,
  listHref,
  LIST_QUERY_KEY,
  LIVE_UPDATE_NOTE,
  LOOKS_FOR,
  rememberListQuery,
  REUSE_LABEL,
  rowEvent,
  rowNote,
  searchMatch,
  searchWords,
  typeaheadIndex,
  updateRejected,
} from "../../.tmp-test/lib/blog/list.js";
import { dayMonth, dayName, rangeLabel } from "../../.tmp-test/lib/blog/date-range.js";

const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
const DEFAULT = { tab: "all", q: "", page: 1 };
/** Local time, so a day key never depends on the machine's time zone. */
const at = (m, d, h = 10) => new Date(2026, m - 1, d, h, 0, 0).getTime();
const cover = (fileKey) => ({ fileKey, x: 50, y: 50, zoom: 1, alt: "The board" });
const reasons = (...ids) => ids.map((id) => ({ id, detail: "" }));

/** One blog per moment: a draft, pending, rejected, sent again, live, live with an update in review,
 *  live with a rejected update, removed. Each event on its own October day. */
function moments() {
  let d = EMPTY_BLOG;
  const make = (id, title, day) => {
    d = createArticle(d, id, at(9, 1), { title, categoryId: "howto" });
    d = { ...d, articles: d.articles.map((a) => (a.id === id ? { ...a, updatedAt: at(10, day) } : a)) };
  };
  const live = (id, day) => {
    d = decide(submit(d, id, at(10, day, 8), 60_000), id, "approved", [], at(10, day), true);
  };
  make("art_000draft01", "Notes on firmware updates over the air", 1);
  make("art_00pending1", "Choosing a LiPo charger IC", 2);
  d = submit(d, "art_00pending1", at(10, 2), 10 ** 9);
  make("art_0rejected1", "A smart lamp board from breadboard to PCB", 3);
  d = decide(submit(d, "art_0rejected1", at(10, 1), 60_000), "art_0rejected1", "changes", reasons("needs-detail", "off-topic"), at(10, 3), true);
  make("art_000again01", "Re-flowing a QFN by hand without a stencil", 4);
  d = decide(submit(d, "art_000again01", at(10, 1), 60_000), "art_000again01", "changes", reasons("needs-detail"), at(10, 2), true);
  d = submit(d, "art_000again01", at(10, 4), 10 ** 9);
  make("art_00000live1", "What I learned shipping 200 kits", 1);
  live("art_00000live1", 5);
  make("art_00update01", "Designing a low-power sensor node", 1);
  live("art_00update01", 1);
  d = patchDraft(d, "art_00update01", { title: "Designing a low-power sensor node, rev B" }, at(10, 5));
  d = submit(d, "art_00update01", at(10, 6), 10 ** 9);
  make("art_0uprejct01", "Building a smart lamp board with an ESP32", 1);
  live("art_0uprejct01", 1);
  d = decide(submit(d, "art_0uprejct01", at(10, 6), 60_000), "art_0uprejct01", "changes", reasons("reads-like-ad"), at(10, 7), true);
  make("art_00removed1", "The cheapest way to get boards made", 1);
  live("art_00removed1", 1);
  d = { ...d, articles: d.articles.map((a) => (a.id === "art_00removed1" ? { ...a, takenDown: { at: at(10, 8), reasons: [] } } : a)) };
  return d;
}
const byId = (d, id) => findArticle(d, id);

test("L2: the Reuse access choices are the Figma's words", () => {
  assert.deepEqual(REUSE_LABEL, { allowed: "Allow for use", not: "Not allow" });
});

test("F41: a row's date is its latest status event, named", () => {
  const d = moments();
  const ev = (id) => rowEvent(byId(d, id));
  assert.deepEqual(ev("art_000draft01"), { at: at(10, 1), moment: "Last edited" });
  assert.deepEqual(ev("art_00pending1"), { at: at(10, 2), moment: "Sent for review" });
  assert.deepEqual(ev("art_0rejected1"), { at: at(10, 3), moment: "Rejected" });
  assert.deepEqual(ev("art_000again01"), { at: at(10, 4), moment: "Sent again for review" });
  assert.deepEqual(ev("art_00000live1"), { at: at(10, 5), moment: "Live since" });
  assert.deepEqual(ev("art_00update01"), { at: at(10, 6), moment: "Update sent for review" });
  assert.deepEqual(ev("art_0uprejct01"), { at: at(10, 7), moment: "Update rejected" });
  assert.deepEqual(ev("art_00removed1"), { at: at(10, 8), moment: "Removed" });
});

test("F41: the list sorts and the Date range filters by that event, not by the last write", () => {
  let d = moments();
  const order = () => filterArticles(d.articles, DEFAULT).map((a) => a.id);
  assert.deepEqual(order(), [
    "art_00removed1",
    "art_0uprejct01",
    "art_00update01",
    "art_00000live1",
    "art_000again01",
    "art_0rejected1",
    "art_00pending1",
    "art_000draft01",
  ]);
  // A thumbnail swap on a blog in review touches updatedAt, but the blog stays where it was.
  d = changeCover(d, "art_00pending1", cover("file_x"), { reviewed: false }, at(10, 30));
  assert.equal(byId(d, "art_00pending1").updatedAt, at(10, 30));
  assert.equal(order()[6], "art_00pending1");
  // A decision that came in later than the writer's last edit is what the date range sees.
  const range = (from, to) => filterArticles(d.articles, { ...DEFAULT, from, to }).map((a) => a.id);
  assert.deepEqual(range("2026-10-03", "2026-10-03"), ["art_0rejected1"]);
  assert.deepEqual(range("2026-10-30", "2026-10-30"), []);
});

test("F22: a live blog's rejected update counts under Rejected (badge kept); its count follows", () => {
  const d = moments();
  assert.equal(updateRejected(byId(d, "art_0uprejct01")), true);
  assert.equal(updateRejected(byId(d, "art_00000live1")), false);
  assert.equal(updateRejected(byId(d, "art_0rejected1")), false, "not live: it is plainly Rejected");
  const rejected = filterArticles(d.articles, { ...DEFAULT, status: "rejected" }).map((a) => a.id);
  assert.deepEqual(rejected, ["art_0uprejct01", "art_0rejected1"]);
  const counts = filterCounts(d.articles, DEFAULT).status;
  assert.equal(counts.rejected, 2, "the Rejected choice says what it shows");
  assert.equal(counts.approved, 2, "and the blog still counts under its badge");
  assert.deepEqual(filterArticles(d.articles, { ...DEFAULT, status: "approved" }).map((a) => a.id), ["art_0uprejct01", "art_00000live1"]);
});

test("F17 / F22 / F57: the row's second line", () => {
  const d = moments();
  const note = (id, differs = false) => rowNote(byId(d, id), differs);
  assert.equal(note("art_0rejected1"), thingsToFix(byId(d, "art_0rejected1")), "exactly as thingsToFix counts");
  assert.equal(note("art_0rejected1"), "2 things to fix");
  assert.equal(note("art_00update01"), LIVE_UPDATE_NOTE);
  assert.equal(LIVE_UPDATE_NOTE, "Live · update in review");
  assert.equal(note("art_000again01"), null, "a blog that was never live waits without a note");
  assert.match(note("art_0uprejct01"), /^Update rejected( · \d+ things? to fix)?$/, "the live blog's rejected update, in status.ts's words");
  assert.equal(note("art_00000live1"), null);
  assert.equal(note("art_00000live1", true), "Unsent changes");
});

test("F42: search words match in any order, without case, hyphens or punctuation", () => {
  const d = moments();
  const find = (q, writer) => filterArticles(d.articles, { ...DEFAULT, q, writer }).map((a) => a.id);
  assert.deepEqual(find("QFN reflow"), ["art_000again01"]);
  assert.deepEqual(find("reflow"), ["art_000again01"]);
  assert.deepEqual(find("re-flowing"), ["art_000again01"]);
  assert.deepEqual(find("STENCIL, qfn!"), ["art_000again01"]);
  assert.deepEqual(find("ＱＦＮ"), ["art_000again01"], "full-width letters fold (NFKC)");
  assert.deepEqual(find("lamp esp32"), ["art_0uprejct01"]);
  assert.deepEqual(find("lamp"), ["art_0uprejct01", "art_0rejected1"]);
  assert.deepEqual(find("lamp zigbee"), [], "every word must be found");
  assert.equal(foldText("  Re-flowing — a  QFN… "), "reflowing a qfn");
  assert.deepEqual(searchWords(" QFN   re-flow "), ["qfn", "reflow"]);
});

test("F42: a match on the draft's newer title only is told apart", () => {
  const d = moments();
  const a = byId(d, "art_00update01");
  assert.equal(searchMatch(a, searchWords("sensor node")), "title");
  assert.equal(searchMatch(a, searchWords("rev B")), "draft");
  assert.equal(searchMatch(a, searchWords("zigbee")), null);
  assert.equal(searchMatch(a, []), "title", "no search: every row, as shown");
});

test("F13 / D-6: the search also finds the writer's own name, alone or with title words", () => {
  const d = moments();
  const find = (q, writer) => filterArticles(d.articles, { ...DEFAULT, q, writer }).length;
  const writer = ["Nick Rough", "Nick Rough"];
  assert.equal(find("nick", writer), 8, "every blog here is the writer's");
  assert.equal(find("Nick lamp", writer), 2);
  assert.equal(find("rough qfn", writer), 1);
  assert.equal(find("nick", []), 0, "no name given: nothing to match");
  assert.equal(find("nick", ["রাফি", "Rafi"]), 0);
  assert.equal(find("রাফি", ["রাফি", "Rafi"]), 8, "a name in any script");
});

test("F59: a page that holds one row says so plainly", () => {
  assert.equal(countLine({ from: 13, to: 13, total: 13, pageCount: 2, searching: false }), "Showing 13 of 13 blogs");
  assert.equal(countLine({ from: 13, to: 14, total: 14, pageCount: 2, searching: false }), "Showing 13–14 of 14 blogs");
});

test("F62: the tab remembers the last view, and only the list's own keys come back", () => {
  const mem = () => {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), m };
  };
  const s = mem();
  assert.equal(listHref(s), "/blog", "nothing remembered yet");
  rememberListQuery({ tab: "drafts", q: " lamp ", page: 2, status: "rejected", from: "2026-10-01", to: "2026-10-07" }, s);
  assert.equal(s.m.get(LIST_QUERY_KEY), "/blog?q=lamp&status=rejected&from=2026-10-01&to=2026-10-07&page=2");
  assert.equal(listHref(s), "/blog?q=lamp&status=rejected&from=2026-10-01&to=2026-10-07&page=2");
  rememberListQuery(DEFAULT, s);
  assert.equal(listHref(s), "/blog", "a bare list is remembered too (the sidebar's home)");
  s.setItem(LIST_QUERY_KEY, "/blog?status=live&evil=1&reuse=not");
  assert.equal(listHref(s), "/blog?reuse=not", "unknown keys and values are dropped");
  s.setItem(LIST_QUERY_KEY, "https://example.com/blog?q=x");
  assert.equal(listHref(s), "/blog", "never another address");
  const refusing = {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  };
  assert.doesNotThrow(() => rememberListQuery(DEFAULT, refusing));
  assert.equal(listHref(refusing), "/blog");
  assert.equal(listHref(null), "/blog", "no storage at all (node, or a blocked browser)");
});

test("F90: the filters' typeahead walks to the next row that starts with the letters", () => {
  const status = ["All", "Approved", "Featured", "Pending", "Rejected", "Draft", "Removed", "Re-submitted"];
  assert.equal(typeaheadIndex(status, 0, "r"), 4);
  assert.equal(typeaheadIndex(status, 4, "r"), 6, "the same letter again cycles");
  assert.equal(typeaheadIndex(status, 6, "r"), 7);
  assert.equal(typeaheadIndex(status, 7, "r"), 4, "and wraps");
  assert.equal(typeaheadIndex(status, 4, "re-"), 7, "more letters refine from where it is");
  assert.equal(typeaheadIndex(status, -1, "a"), 0, "nothing focused: from the top");
  assert.equal(typeaheadIndex(status, 0, "x"), -1);
  assert.equal(typeaheadIndex(["All", "Allow for use", "Not allow"], 0, "n"), 2);
});

test("F51 / F11: day names carry their place in the range; the range reads day first", () => {
  const band = { from: "2026-10-08", to: "2026-10-23" };
  assert.equal(dayName("2026-10-08", band), "Thursday, October 8, 2026, range start");
  assert.equal(dayName("2026-10-14", band), "Wednesday, October 14, 2026, in range");
  assert.equal(dayName("2026-10-23", band), "Friday, October 23, 2026, range end");
  assert.equal(dayName("2026-10-24", band), "Saturday, October 24, 2026");
  assert.equal(dayName("2026-10-08", null), "Thursday, October 8, 2026");
  assert.equal(dayName("2026-10-08", { from: "2026-10-08", to: "2026-10-08" }), "Thursday, October 8, 2026, the whole range");
  assert.equal(dayMonth("2026-09-03"), "3 Sep", "never 'Sept'");
  assert.equal(rangeLabel({ from: "2026-09-03", to: "2026-09-03" }), "3 Sep 2026");
});

test("F20: what the IDEEZA team looks for is the review's own reasons, and the word count", () => {
  assert.equal(LOOKS_FOR.length, Object.keys(REASONS).length);
  assert.ok(LOOKS_FOR[0].startsWith(REASONS["needs-detail"].fix));
  assert.ok(LOOKS_FOR[0].endsWith(`Write at least ${MIN_WORDS} words.`));
  for (const r of Object.values(REASONS)) assert.ok(LOOKS_FOR.some((l) => l.startsWith(r.fix)), r.fix);
});

test("sources: the Figma placeholder, a full page of skeleton rows, end-aligned filters, the calendar's Tab cycle, Blog after Innovations", () => {
  const list = read("components/blog/list/blog-list.tsx");
  assert.match(list, /placeholder="Search by blog title or user name"/, "L1, frame 01");
  assert.match(list, /Array\.from\(\{ length: PAGE_SIZE \}/, "F91: 12 skeleton rows");
  assert.doesNotMatch(list, /<h1 className="sr-only">/, "F48: the page's name shows");
  assert.match(read("components/blog/list/filter-select.tsx"), /align: "end"/, "F82: frames 03 and 04");
  const cal = read("components/blog/list/date-range-filter.tsx");
  assert.match(cal, /const FOCUSABLE = 'button:not\(\[disabled\]\):not\(\[tabindex="-1"\]\)'/, "F51: only real Tab stops");
  assert.match(cal, /aria-disabled=\{nothingToClear/, "F51: Clear stays in the cycle");
  assert.doesNotMatch(cal, /disabled=\{!value/, "F51: never natively disabled");
  const palette = read("components/dashboard/command-palette.tsx");
  const ids = [...palette.matchAll(/\{ id: "([a-z-]+)", label: "[^"]+", category: "Pages"/g)].map((m) => m[1]);
  assert.equal(ids.indexOf("blog"), ids.indexOf("innovations") + 1, "F64");
});
