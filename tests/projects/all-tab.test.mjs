// My projects' All tab holds everything (owner, 2026-11-19: "All should have everything in it — why are the
// purchased ones somewhere else?"): the maker's projects and the purchases in one order, search and set of pages;
// the outcome tabs and Shared only keep the maker's own; a whole project bought shows once, as the buyer's project.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const A = await import("../../.tmp-test/components/projects/all-tab.js");
const L = await import("../../.tmp-test/lib/manual/project-list.js");
const read = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 19, 9);
const Q = { tab: "all", q: "", sort: "updated", showcase: false, page: 1 };

const own = (id, name, status, ago, extra = {}) => ({
  project: { id, name, description: "", createdAt: NOW - ago * DAY - DAY },
  summary: { id, name, status, showcase: null, sortKey: NOW - ago * DAY, products: [], ...extra },
});
const bought = (id, name, ago, lines = [{ kind: "virtual", copies: [{ at: NOW - ago * DAY }] }], source = "sample") => ({
  id,
  source,
  name,
  creator: "Aiko Tanaka",
  products: ["Watering Hub", "Soil Probe"],
  lines,
  sold: [],
  lastAt: NOW - ago * DAY,
  count: 1,
});

const items = [own("proj_a", "Smart Plant Pot", "listed", 1), own("proj_b", "Heart Rate Band", "minted", 5), own("proj_bought_p28", "Sleep-stage ring", "minted", 6)];
const purchases = [bought("p12", "Smart plant watering hub", 2), bought("p7", "Air quality room sensor", 4), bought("p28", "Sleep-stage ring", 6, [{ kind: "main", copies: [{ at: NOW - 6 * DAY }] }])];

test("All holds the maker's projects and the purchases, in one order, and counts both", () => {
  const r = A.allTabOf(items, purchases, Q);
  assert.deepEqual(
    r.entries.map((e) => e.key),
    ["own:proj_a", "bought:sample:p12", "bought:sample:p7", "own:proj_b", "own:proj_bought_p28"],
    "newest activity first; the Sleep-stage ring shows once, as the buyer's own project",
  );
  assert.equal(r.counts.all, 5);
  assert.equal(r.counts.listed, 1, "the outcome tabs count the maker's own");
  assert.equal(r.total, 5);
  assert.equal(L.countLine(r), "5 projects");
});

test("search finds a purchase by name, creator or product; sort by name mixes both", () => {
  assert.deepEqual(A.allTabOf(items, purchases, { ...Q, q: "soil" }).entries.map((e) => e.key), ["bought:sample:p12", "bought:sample:p7"]);
  assert.deepEqual(A.allTabOf(items, purchases, { ...Q, q: "air quality" }).entries.map((e) => e.key), ["bought:sample:p7"]);
  const byName = A.allTabOf(items, purchases, { ...Q, sort: "name" }).entries.map((e) => e.key);
  assert.deepEqual(byName, ["bought:sample:p7", "own:proj_b", "own:proj_bought_p28", "own:proj_a", "bought:sample:p12"]);
  assert.equal(L.countLine(A.allTabOf(items, purchases, { ...Q, q: "soil" })), "2 of 5 projects");
});

test("an outcome tab and Shared only keep the maker's own; a purchase that also holds copies keeps its card", () => {
  assert.deepEqual(A.allTabOf(items, purchases, { ...Q, tab: "minted" }).entries.map((e) => e.key), ["own:proj_b", "own:proj_bought_p28"]);
  assert.deepEqual(A.allTabOf(items, purchases, { ...Q, showcase: true }).entries.map((e) => e.key), []);
  const both = [bought("p28", "Sleep-stage ring", 6, [{ kind: "main", copies: [{ at: NOW - 6 * DAY }] }, { kind: "physical", copies: [{ at: NOW - 3 * DAY }] }])];
  assert.equal(A.boughtForAll(both, new Set(["proj_bought_p28"])).length, 1);
});

test("pages run over both; the list the phone shares stays its own", () => {
  const many = Array.from({ length: 10 }, (_, i) => own(`proj_${i}`, `Project ${i}`, "draft", i + 10));
  const r = A.allTabOf(many, purchases, Q);
  assert.equal(r.pageCount, 2);
  assert.equal(r.entries.length, 12);
  // 10 own + 3 purchases (here no project stands for the Sleep-stage ring, so its purchase shows): 13, so page 2 has 1.
  assert.equal(A.allTabOf(many, purchases, { ...Q, page: 2 }).entries.length, 1);
  assert.deepEqual(L.filterProjects(many, Q).rows.length, 10, "the shared list is unchanged");
  assert.doesNotMatch(read("lib/manual/project-list.ts"), /purchased/i);
  const page = read("components/projects/my-projects.tsx");
  assert.match(page, /allTabOf\(items, bought\.purchases, view\)/);
  assert.match(page, /<PurchasedListCard p=\{e\.bought\} now=\{now\} \/>/, "in the list's own card frame");
});
