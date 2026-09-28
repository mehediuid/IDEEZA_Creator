// B1 — My projects list state (spec §5.2): LST-4, LST-8, LST-9, LST-10, LST-13, LST-14,
// LST-17, LST-23, LST-26, LST-27, LST-28, LST-31. filterProjects() is the one pass the page runs.
// Compiled by tests/projects/tsconfig.json (A1) into .tmp-test, then:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGE_SIZE, matchProject } from "../../.tmp-test/lib/manual/project-summary.js";
import {
  DEFAULT_LIST_QUERY,
  LIST_TABS,
  SORT_OPTIONS,
  SOURCE_OPTIONS,
  countLine,
  filterProjects,
  listQueryString,
  pageItemsFor,
  parseListQuery,
  searchInUrl,
  tabCountLabel,
} from "../../.tmp-test/lib/manual/project-list.js";

const D = 86_400_000;
const T0 = Date.UTC(2026, 8, 1);
const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const WORD = { draft: "Draft", private: "Private", given: "Given", listed: "Listed", paused: "Paused", sold: "Sold", minted: "Minted" };

/** A project record and the summary projectSummary() gives it. Only the fields the list reads vary. */
function item({ id, name, status = "draft", showcase = null, source = { kind: "hand" }, products, description = "", createdAt, updatedAt }) {
  const rows = products.map((p, i) => ({ id: `p${i + 1}`, name: p.name, description: p.description ?? "" }));
  const project = {
    id,
    slug: id,
    name,
    productName: rows[0].name,
    description,
    products: rows,
    status: status === "draft" ? "draft" : "completed",
    createdAt,
    updatedAt,
    flowState: FLOW,
  };
  const editor = { kind: "open-editor", label: "Open in editor", href: `/project/${id}/pcb` };
  const summary = {
    id,
    name,
    status,
    statusWord: WORD[status],
    statusLine: "",
    showcase,
    products: rows,
    productCount: rows.length,
    source,
    next: { first: editor, second: null, violet: status === "draft" },
    when: { label: "Created", at: createdAt },
    version: null,
    pendingVersion: null,
    cover: null,
    mintedAt: status === "draft" || status === "minted" ? null : createdAt,
    sortKey: updatedAt,
  };
  return { project, summary };
}

// Eight projects: every outcome, two showcased (on two outcomes), an unreadable mint (LST-9),
// a build gone from this browser, and two same-named projects fed in id-reversed order.
const ITEMS = [
  item({
    id: "car", name: "Car", source: { kind: "build", builds: 2 }, createdAt: T0, updatedAt: T0 + 9 * D,
    products: [
      { name: "RC Car Controller", description: "Steers the car" },
      { name: "Remote Controller", description: "Hand-held transmitter" },
      { name: "Battery Charger" },
      { name: "Spare Battery Pack" },
    ],
  }),
  item({
    id: "soil", name: "Plant Soil Monitor", status: "listed", showcase: { at: T0 + 2 * D },
    source: { kind: "build", builds: 1 }, createdAt: T0 + D, updatedAt: T0 + 3 * D,
    products: [{ name: "Soil Probe", description: "Reads moisture" }],
  }),
  item({
    id: "garden", name: "Garden Weather Station", createdAt: T0 + 2 * D, updatedAt: T0 + 5 * D,
    products: [{ name: "Weather Node", description: "Logs rain and wind" }],
  }),
  item({
    id: "lamp", name: "Desk Lamp", status: "private", showcase: { at: T0 + 3 * D },
    createdAt: T0 + 3 * D, updatedAt: T0 + 4 * D, products: [{ name: "Lamp Head" }],
  }),
  item({
    id: "kit", name: "Café Timer", status: "given", source: { kind: "build-gone" },
    createdAt: T0 + 4 * D, updatedAt: T0 + 6 * D, products: [{ name: "Timer Board" }],
  }),
  item({
    id: "vault", name: "Old Vault", status: "minted", source: { kind: "build", builds: 1 },
    createdAt: T0 + 5 * D, updatedAt: T0 + 2 * D, products: [{ name: "Vault Lock" }],
  }),
  item({ id: "b2", name: "Beacon", createdAt: T0 + 6 * D, updatedAt: T0 + D, products: [{ name: "Beacon Tag" }] }),
  item({ id: "b1", name: "Beacon", createdAt: T0 + 6 * D, updatedAt: T0 + D, products: [{ name: "Beacon Tag" }] }),
];

const view = (patch) => ({ ...DEFAULT_LIST_QUERY, ...patch });
const ids = (r) => r.rows.map((row) => row.project.id);

test("LST-4 · the outcome tabs add up to All but for an unreadable mint; Showcase is membership", () => {
  const r = filterProjects(ITEMS, DEFAULT_LIST_QUERY);
  assert.deepEqual(r.counts, { all: 8, draft: 4, private: 1, given: 1, listed: 1, sold: 0, showcase: 2 });
  assert.equal(r.counts.draft + r.counts.private + r.counts.given + r.counts.listed + r.counts.sold, r.counts.all - 1);
  assert.equal(r.total, 8);
  assert.equal(r.matched, 8);
  assert.equal(r.narrowed, false);
  assert.equal(countLine(r), "8 projects");
});

test("LST-4 / LST-10 · the tab row: the outcome words, Sold after Listed, then Showcase after the divider (P2-LISTING-18)", () => {
  assert.deepEqual(LIST_TABS.map((t) => t.id), ["all", "draft", "private", "given", "listed", "sold", "showcase"]);
  assert.deepEqual(LIST_TABS.map((t) => t.label), ["All", "Draft", "Private", "Given", "Listed", "Sold", "Showcase"]);
  assert.deepEqual(LIST_TABS.filter((t) => t.divider).map((t) => t.id), ["showcase"]);
});

test("P2-LISTING-18 / P2-CUSTOMERS-14 · Listed holds live and paused; Sold is its own tab; ?tab=sold survives a reload", () => {
  const withMarket = [
    ...ITEMS,
    item({ id: "live", name: "Live One", status: "listed", createdAt: T0, updatedAt: T0, products: [{ name: "A" }] }),
    item({ id: "held", name: "Paused One", status: "paused", createdAt: T0, updatedAt: T0, products: [{ name: "B" }] }),
    item({ id: "gone", name: "Sold One", status: "sold", createdAt: T0, updatedAt: T0, products: [{ name: "C" }] }),
  ];
  const r = filterProjects(withMarket, DEFAULT_LIST_QUERY);
  assert.equal(r.counts.listed, 3); // soil, live and the paused one
  assert.equal(r.counts.sold, 1);
  assert.deepEqual(ids(filterProjects(withMarket, view({ tab: "listed", sort: "name" }))), ["live", "held", "soil"]);
  assert.deepEqual(ids(filterProjects(withMarket, view({ tab: "sold" }))), ["gone"]);
  assert.ok(!ids(filterProjects(withMarket, view({ tab: "listed" }))).includes("gone"), "a sold project isn't under Listed");
  assert.equal(listQueryString(view({ tab: "sold" })), "?tab=sold");
  assert.equal(parseListQuery(new URLSearchParams("tab=sold")).tab, "sold");
  assert.equal(parseListQuery(new URLSearchParams("tab=paused")).tab, "all", "there is no Paused tab");
});

test("LST-9 / LST-10 · a tab keeps its own projects; Showcase spans outcomes; an unreadable mint is under All only", () => {
  assert.deepEqual(ids(filterProjects(ITEMS, view({ tab: "draft", sort: "name" }))), ["b1", "b2", "car", "garden"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ tab: "showcase" }))), ["lamp", "soil"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ tab: "listed" }))), ["soil"]);
  for (const tab of ["draft", "private", "given", "listed", "showcase"]) {
    assert.ok(!ids(filterProjects(ITEMS, view({ tab }))).includes("vault"), tab);
  }
  assert.ok(ids(filterProjects(ITEMS, view({ tab: "all" }))).includes("vault"));
  const draft = filterProjects(ITEMS, view({ tab: "draft" }));
  assert.equal(draft.narrowed, true);
  assert.equal(countLine(draft), "4 of 8 projects");
});

test("LST-13 / LST-14 · search reaches every product and names the one that matched", () => {
  const r = filterProjects(ITEMS, view({ q: "remote" }));
  assert.deepEqual(ids(r), ["car"]);
  assert.equal(r.rows[0].via, "Remote Controller");
  assert.equal(countLine(r), "1 of 8 projects");
  // The tabs count the collection; the search narrows the rows (decision 1).
  assert.deepEqual(r.counts, filterProjects(ITEMS, DEFAULT_LIST_QUERY).counts);

  const byDescription = filterProjects(ITEMS, view({ q: "transmitter" }));
  assert.deepEqual(ids(byDescription), ["car"]);
  assert.equal(byDescription.rows[0].via, "Remote Controller");

  const byName = filterProjects(ITEMS, view({ q: "car" }));
  assert.deepEqual(ids(byName), ["car"]);
  assert.equal(byName.rows[0].via, undefined);
});

test("LST-13 · every word must match, ignoring case and accents; a blank search narrows nothing", () => {
  assert.deepEqual(ids(filterProjects(ITEMS, view({ q: "SOIL probe" }))), ["soil"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ q: "cafe" }))), ["kit"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ q: "  wind  " }))), ["garden"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ q: "soil remote" }))), []);
  const blank = filterProjects(ITEMS, view({ q: "   " }));
  assert.equal(blank.matched, 8);
  assert.equal(blank.narrowed, false);
});

test("matchProject · via only when the match lies wholly in a product other than the first", () => {
  const car = ITEMS[0].summary;
  assert.deepEqual(matchProject(car, "", "remote"), { hit: true, via: "Remote Controller" });
  assert.deepEqual(matchProject(car, "", "spare battery"), { hit: true, via: "Spare Battery Pack" });
  assert.deepEqual(matchProject(car, "", "rc car"), { hit: true });
  assert.deepEqual(matchProject(car, "", "car transmitter"), { hit: true });
  assert.deepEqual(matchProject(car, "An RC car with a remote", "remote"), { hit: true });
  assert.deepEqual(matchProject(car, "", "drone"), { hit: false });
  assert.deepEqual(matchProject(car, "", ""), { hit: true });
});

test("LST-17 · Source: AI build includes a build gone from this browser; By hand is the rest", () => {
  assert.deepEqual(SOURCE_OPTIONS.map((o) => o.label), ["Any source", "AI build", "By hand"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ source: "build" }))), ["car", "kit", "soil", "vault"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ source: "hand" }))), ["garden", "lamp", "b1", "b2"]);
  const both = filterProjects(ITEMS, view({ source: "build", tab: "showcase" }));
  assert.deepEqual(ids(both), ["soil"]);
  assert.equal(countLine(both), "1 of 8 projects");
  const none = filterProjects(ITEMS, view({ tab: "listed", q: "battery" }));
  assert.deepEqual([none.matched, none.page, none.pageCount, none.rows.length], [0, 1, 1, 0]);
});

test("LST-23 · the four orders, ties broken by name and then id", () => {
  assert.deepEqual(SORT_OPTIONS.map((o) => o.label), ["Recently updated", "Newest to oldest", "Oldest to newest", "Name A–Z"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ sort: "updated" }))), ["car", "kit", "garden", "lamp", "soil", "vault", "b1", "b2"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ sort: "newest" }))), ["b1", "b2", "vault", "kit", "lamp", "garden", "soil", "car"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ sort: "oldest" }))), ["car", "soil", "garden", "lamp", "kit", "vault", "b1", "b2"]);
  assert.deepEqual(ids(filterProjects(ITEMS, view({ sort: "name" }))), ["b1", "b2", "kit", "car", "lamp", "garden", "vault", "soil"]);
  // The input order is the caller's; filterProjects never reorders it.
  assert.deepEqual(ITEMS.map((i) => i.project.id), ["car", "soil", "garden", "lamp", "kit", "vault", "b2", "b1"]);
});

test("LST-27 / LST-31 · twelve a page; a page past the end shows the last one", () => {
  const many = Array.from({ length: 30 }, (_, i) =>
    item({ id: `n${String(i).padStart(2, "0")}`, name: `Node ${i}`, createdAt: T0 + i, updatedAt: T0 + i, products: [{ name: `Board ${i}` }] }),
  );
  assert.equal(PAGE_SIZE, 12);
  const p1 = filterProjects(many, DEFAULT_LIST_QUERY);
  assert.deepEqual([p1.page, p1.pageCount, p1.rows.length], [1, 3, 12]);
  assert.equal(p1.rows[0].project.id, "n29");
  assert.equal(countLine(p1), "30 projects"); // matches, not this page's cards
  const p3 = filterProjects(many, view({ page: 3 }));
  assert.equal(p3.rows.length, 6);
  assert.equal(p3.rows.at(-1).project.id, "n00");
  assert.equal(filterProjects(many, view({ page: 9 })).page, 3);
  assert.equal(filterProjects(many, view({ page: 0 })).page, 1);
  assert.equal(filterProjects(many.slice(0, 24), view({ page: 3 })).page, 2); // a delete emptied page 3
  const empty = filterProjects([], DEFAULT_LIST_QUERY);
  assert.deepEqual([empty.page, empty.pageCount, empty.rows.length, empty.total], [1, 1, 0, 0]);
});

test("LST-28 · the URL carries the view, defaults left out, unknown values read as defaults", () => {
  assert.equal(listQueryString(DEFAULT_LIST_QUERY), "");
  const full = { tab: "draft", q: "remote", sort: "name", source: "hand", page: 2 };
  assert.equal(listQueryString(full), "?tab=draft&q=remote&sort=name&source=hand&page=2");
  assert.deepEqual(parseListQuery(new URLSearchParams(listQueryString(full))), full);
  assert.equal(listQueryString(view({ q: "   " })), "");
  assert.equal(listQueryString(view({ q: "rc car" })), "?q=rc+car");
  assert.equal(parseListQuery(new URLSearchParams("q=rc+car")).q, "rc car");
  assert.equal(parseListQuery(new URLSearchParams("tab=showcase")).tab, "showcase");
  assert.deepEqual(parseListQuery(new URLSearchParams("")), DEFAULT_LIST_QUERY);
  assert.deepEqual(parseListQuery(new URLSearchParams("tab=completed&sort=views&source=ai&page=abc")), DEFAULT_LIST_QUERY);
  for (const bad of ["0", "-2", "2.5", ""]) {
    assert.equal(parseListQuery(new URLSearchParams(`page=${bad}`)).page, 1, bad);
  }
  assert.equal(searchInUrl("   "), "");
  assert.equal(searchInUrl("remote "), "remote ");
});

test("LST-26 / LST-8 · the count words", () => {
  assert.equal(countLine({ matched: 38, total: 38, narrowed: false }), "38 projects");
  assert.equal(countLine({ matched: 1, total: 1, narrowed: false }), "1 project");
  assert.equal(countLine({ matched: 4, total: 38, narrowed: true }), "4 of 38 projects");
  assert.equal(countLine({ matched: 0, total: 1, narrowed: true }), "0 of 1 project");
  assert.equal(tabCountLabel(0), "0 projects");
  assert.equal(tabCountLabel(1), "1 project");
  assert.equal(tabCountLabel(9), "9 projects");
});

test("LST-27 · page numbers: 1 … n-1 n n+1 … last", () => {
  assert.deepEqual(pageItemsFor(1, 1), [1]);
  assert.deepEqual(pageItemsFor(3, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(pageItemsFor(5, 10), [1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  assert.deepEqual(pageItemsFor(1, 10), [1, 2, "ellipsis", 10]);
  assert.deepEqual(pageItemsFor(10, 10), [1, "ellipsis", 9, 10]);
});
