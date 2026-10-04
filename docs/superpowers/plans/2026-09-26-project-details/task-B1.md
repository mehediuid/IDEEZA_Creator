### Task B1: My projects — the header, the toolbar and the list state

**Spec delta check (commit e599fcf):** I read `.superpowers/pd/plan/spec-delta.md` in full, including "## Harness notes". Here is what it changes for this task:
- The tabs are exactly **All · Draft · Private · Given · Listed ┊ Showcase**. Showcase comes last, after a divider, and is not counted in the outcome tabs' total.
- Showcase membership reads `showcasedAt` on the project record, never the draft.
- The list's draft pass runs the one-time Showcase backfill.
- `matchProject`, `ListQuery` and `PAGE_SIZE` go into A3's `src/lib/manual/project-summary.ts`, and they belong to this task.
- Lib modules use relative imports only.
- The test command uses the quoted glob.

This task formats no dates and no product counts. It reuses A3's summary as it is.

**Requirements:**
- LST-1, LST-2 (owner decision O11), LST-3.
- LST-4, LST-6, LST-7, LST-8, LST-9, LST-10.
- LST-13, LST-14 (the `via` value, plus an interim hint on today's card), LST-15, LST-17.
- LST-18: the removable chip. **Clear filters** waits for a second facet; see decision 2.
- LST-23, LST-26, LST-27, LST-28, LST-31 (clamp to the last page), LST-60 (h1, and the results h2 that takes focus).
- LST-59 for the controls this task draws. LST-57 for the toolbar: at phone width the tabs wrap, search takes a row, and Source and Sort share one.
- LST-61: the list reads records, builds, video jobs and one draft per project, on hydration, on focus and on `storage`.
- COM-1: the list reads drafts through `readBriefDraft`.
- COR-105: the list's one-time backfill of `showcasedAt` (spec §5.1.7, row "Showcase, once for older mints").

**Depends on:**
- Task 0: `npm install` and the dev server on :3002.
- A1: `ManualProject.showcasedAt` and product `id`s, plus `tests/projects/tsconfig.json`.
- A3: `project-summary.ts`.
- A4: `project-brief.ts`.

**Runs before:** B2, the card. B2 replaces `ProjectCard`, the `Loading…` line, `NoProjectsState`, `NoMatchState` and the grid classes inside the tabpanel this task builds. See "Hand-off to B2" at the end.

**Files:**
- Modify `src/lib/manual/project-summary.ts` (A3 creates it). Append `matchProject`, `ListQuery` and `PAGE_SIZE` after `headerText()`, which ends the file as A3's Step 3 writes it.
- Create `src/lib/manual/project-list.ts`. It holds the list state: tabs, facets, sort, page, the URL codec and `filterProjects`.
- Modify `src/components/projects/my-projects.tsx`, current file of 660 lines:
  - `:1-334` (header comment, imports, tabs and sorts, `MyProjects`): replaced;
  - `:338-346` (`ProjectCard` props): replaced;
  - `:396-398` (the product line): replaced;
  - `:449-580` (`Select`, `Pagination`, `pageItemsFor`): replaced;
  - `:648-660` (`NftEmptyState`): deleted.
- Modify `src/app/(create)/projects/page.tsx`, lines `:1-10`, the whole file. It adds the Suspense boundary that `useSearchParams` needs in a production build (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`, "Prerendering"), and the LST-1 title.
- Modify `src/components/ideeza/search-input.tsx`, line `:61`, the clear button's class. Its target is 13 px and it has no focus ring (see decision 8).
- Test: create `tests/projects/project-list.test.mjs`.

**Interfaces**

Consumes (exact):
- A1, `src/lib/manual/projects.tsx`:
  - `ManualProject` with `showcasedAt?: number | null` and `products?: ManualProduct[]` whose rows carry `id`;
  - existing, unchanged: `useManualProjects(): { hydrated, projects, selectProject, updateProject, … }`, `stepHref`, `firstIncompleteStep`, `productLabel`, `completedCount`, `FLOW_STEPS` and `STEP_LABELS`. The last five are still used by today's card.
- A3, `src/lib/manual/project-summary.ts`:
  - `projectSummary(p: ManualProject, ctx: { builds: BuildJob[]; brief: StoredDraft | null; videoJobs: ClipJob[]; now: number }): ProjectSummary`;
  - `type ProjectSummary`. The fields read here are `id`, `name`, `status`, `showcase`, `products`, `source`, `sortKey` and `cover`;
  - `STATUS_WORD: Record<ProjectStatus, string>`;
  - `SHOWCASE_BADGE: { word: string; icon: IconName; ariaLabel: string }`.
- A4, `src/lib/brief/project-brief.ts`: `readBriefDraft(projectId: string): StoredDraft | null`.
- Existing, unchanged:
  - `useCreateHistory(): { hydrated, builds, … }`;
  - `useVideoJobs(): { hydrated, jobs, … }`;
  - `useMinuteClock(): number` (`src/components/create/build-status.tsx:293`);
  - `briefDraftKey` (`src/lib/brief/types.ts:23`);
  - `SearchInput`, `SelectMenu` and `buttonVariants` from `@/components/ideeza`.

Produces:
```ts
// src/lib/manual/project-summary.ts (appended; spec §5.1.3 verbatim)
export function matchProject(s: ProjectSummary, description: string, q: string): { hit: boolean; via?: string };
export type ListQuery = {
  tab: "all" | "draft" | "private" | "given" | "listed" | "showcase";
  q: string;
  sort: "updated" | "newest" | "oldest" | "name";
  source: "any" | "build" | "hand";
  page: number;
};
export const PAGE_SIZE = 12;

// src/lib/manual/project-list.ts (new, pure)
export type ListTab = ListQuery["tab"];
export type ListSort = ListQuery["sort"];
export type ListSource = ListQuery["source"];
export type ListCounts = Record<ListTab, number>;
export type ListItem = { project: ManualProject; summary: ProjectSummary };
export type ListRow = ListItem & { via?: string };
export type ListResult = {
  counts: ListCounts; total: number; matched: number; narrowed: boolean;
  page: number; pageCount: number; rows: ListRow[];
};
export const DEFAULT_LIST_QUERY: ListQuery;                 // { tab: "all", q: "", sort: "updated", source: "any", page: 1 }
export const LIST_TABS: readonly { id: ListTab; label: string; divider: boolean }[];
export const SORT_OPTIONS: { value: ListSort; label: string }[];
export const SOURCE_OPTIONS: { value: ListSource; label: string }[];
export function filterProjects(items: ListItem[], q: ListQuery): ListResult;
export function parseListQuery(params: { get(name: string): string | null }): ListQuery;
export function listQueryString(q: ListQuery): string;      // "" | "?tab=draft&q=remote&sort=name&source=hand&page=2"
export function searchInUrl(text: string): string;          // the q the URL carries: "" when blank
export function countLine(r: Pick<ListResult, "matched" | "total" | "narrowed">): string;
export function tabCountLabel(n: number): string;           // "1 project" · "9 projects"
export function pageItemsFor(page: number, pageCount: number): Array<number | "ellipsis">;
```
In `my-projects.tsx`, the page renders `ProjectCard` with `{ project: ManualProject; image?: string; via?: string; onOpen: () => void }`. That is the seam B2 replaces.

**Decisions.** Each is stated once, so a reviewer can object.
1. **Tab counts cover every project.** The search and the Source facet narrow the rows and the count line, not the tab numbers. The tabs describe the collection, so "4 of 38 projects" and the tab totals (which add up to All, LST-4) never contradict each other.
2. **No "Clear filters" while Source is the only facet.** With one facet it would be a second control for the chip's ×. That goes against "one control, one home". The button arrives with the second facet (Stage, LST-19, NEXT).
3. **When `via` is set.** It names a product only when the words are not all in the name, the description or the first product, and one other product holds all of them (LST-14, "the only match"). When the words are split across fields, no product is named.
4. **Scroll restore.** It happens only when this mount is the target of Back or Forward to the same view URL. A fresh visit, such as the sidebar, starts at the top. The offset is saved when a click inside the list leaves the page.
5. **The one-time Showcase backfill** uses `updateProject`, which stamps `updatedAt` once for each legacy project.
6. **A `?page=` past the end** shows the last page, and the URL is corrected with `replace` (LST-31).
7. **Motion.** It uses `duration-normal` (200 ms) with `ease-decelerate`, and `motion-reduce:transition-none`. `duration-fast` is 100 ms, which is under the house range of 150–250 ms.
8. **The `SearchInput` clear button.** It gets a 24 px hit area from a `::before` pad, with no layout change, plus the app's focus ring. That fixes every use of the atom. This page raises the pad to 44 px inside its 44 px field.

---

- [ ] **Step 1: Write the failing test**

Create `tests/projects/project-list.test.mjs`:

```js
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
const WORD = { draft: "Draft", private: "Private", given: "Given", listed: "Listed", minted: "Minted" };

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
  assert.deepEqual(r.counts, { all: 8, draft: 4, private: 1, given: 1, listed: 1, showcase: 2 });
  assert.equal(r.counts.draft + r.counts.private + r.counts.given + r.counts.listed, r.counts.all - 1);
  assert.equal(r.total, 8);
  assert.equal(r.matched, 8);
  assert.equal(r.narrowed, false);
  assert.equal(countLine(r), "8 projects");
});

test("LST-4 / LST-10 · the tab row: the outcome words, then Showcase after the divider", () => {
  assert.deepEqual(LIST_TABS.map((t) => t.id), ["all", "draft", "private", "given", "listed", "showcase"]);
  assert.deepEqual(LIST_TABS.map((t) => t.label), ["All", "Draft", "Private", "Given", "Listed", "Showcase"]);
  assert.deepEqual(LIST_TABS.filter((t) => t.divider).map((t) => t.id), ["showcase"]);
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
```

- [ ] **Step 2: Run it. It is expected to FAIL.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

What to expect:
- `tsc` exits 0. Nothing references the new code yet.
- `project-list.test.mjs` fails before any `test()` runs: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/manual/project-list.js' imported from …/tests/projects/project-list.test.mjs`.
- The earlier tasks' test files still pass.
- `node --test` exits 1.

- [ ] **Step 3: Implement**

**3a. Append to `src/lib/manual/project-summary.ts`**, after `headerText()`, the last function A3's Step 3 writes. Nothing above it changes. `ProjectSummary` is already declared earlier in the file.

```ts
// ─────────────────────────── the list's search and view (B1) ───────────────────────────
// The three names spec §5.1.3 keeps beside the summary. The list state only
// /projects needs — the tabs, the order, the page and the URL codec — is
// src/lib/manual/project-list.ts.

/** Case- and accent-insensitive: NFKD splits "é" into "e" and a combining mark, which is dropped. */
function fold(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Search (LST-13/14): NFKD, drop diacritics, lowercase; every whitespace token must be found in
 * the name, a product name, the description or a product description. `via` names the product
 * the match lies in when the name, the description and the first product don't hold every word
 * and one other product does (LST-14, "the only match").
 */
export function matchProject(
  s: ProjectSummary,
  description: string,
  q: string,
): { hit: boolean; via?: string } {
  const tokens = fold(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return { hit: true };
  const [first, ...rest] = s.products;
  const head = fold([s.name, description, first?.name ?? "", first?.description ?? ""].join("\n"));
  const others = rest.map((x) => ({ name: x.name.trim(), text: fold(`${x.name}\n${x.description}`) }));
  const everything = [head, ...others.map((o) => o.text)].join("\n");
  if (!tokens.every((t) => everything.includes(t))) return { hit: false };
  if (tokens.every((t) => head.includes(t))) return { hit: true };
  const only = others.find((o) => o.name && tokens.every((t) => o.text.includes(t)));
  return only ? { hit: true, via: only.name } : { hit: true };
}

/** List view state in the URL (LST-28): written with `replace`, defaults left out. */
export type ListQuery = {
  tab: "all" | "draft" | "private" | "given" | "listed" | "showcase"; // showcase = membership (LST-10)
  q: string;
  sort: "updated" | "newest" | "oldest" | "name";
  source: "any" | "build" | "hand";
  page: number; // 1-based
};
export const PAGE_SIZE = 12;
// e.g. /projects?tab=draft&q=remote&sort=name&source=hand&page=2
```

**3b. Create `src/lib/manual/project-list.ts`:**

```ts
// My projects' list state (spec §5.2): which tab a project sits under, what
// the search and the Source facet keep, the order, the page, and the URL that
// carries all of it (LST-4, LST-8, LST-13, LST-17, LST-23, LST-26–28, LST-31).
//
// Pure. The page derives each project's summary (projectSummary, §5.1.3) and
// hands the pairs in, so the tab counts, the order and the cards come from one
// pass, and a test can hold all of it.
//
// Value imports are relative: tsc leaves `@/` as it is in the node:test build.

import type { ManualProject } from "./projects";
import {
  PAGE_SIZE,
  SHOWCASE_BADGE,
  STATUS_WORD,
  matchProject,
  type ListQuery,
  type ProjectSummary,
} from "./project-summary";

export type ListTab = ListQuery["tab"];
export type ListSort = ListQuery["sort"];
export type ListSource = ListQuery["source"];
export type ListCounts = Record<ListTab, number>;

export const DEFAULT_LIST_QUERY: ListQuery = { tab: "all", q: "", sort: "updated", source: "any", page: 1 };

/** The tab row, in order (LST-4). The outcome tabs read the status table, so a word
 *  changed there changes the tab too. Showcase is membership and sits after the divider (LST-10). */
export const LIST_TABS: readonly { id: ListTab; label: string; divider: boolean }[] = [
  { id: "all", label: "All", divider: false },
  { id: "draft", label: STATUS_WORD.draft, divider: false },
  { id: "private", label: STATUS_WORD.private, divider: false },
  { id: "given", label: STATUS_WORD.given, divider: false },
  { id: "listed", label: STATUS_WORD.listed, divider: false },
  { id: "showcase", label: SHOWCASE_BADGE.word, divider: true },
];

/** LST-23. */
export const SORT_OPTIONS: { value: ListSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "newest", label: "Newest to oldest" },
  { value: "oldest", label: "Oldest to newest" },
  { value: "name", label: "Name A–Z" },
];

/** LST-17: "AI build" = the project holds a build (buildsOf), still in this browser or not. */
export const SOURCE_OPTIONS: { value: ListSource; label: string }[] = [
  { value: "any", label: "Any source" },
  { value: "build", label: "AI build" },
  { value: "hand", label: "By hand" },
];

/** One project as the list holds it: the record (its createdAt and description) and its summary. */
export type ListItem = { project: ManualProject; summary: ProjectSummary };
/** A card to render. `via` names the product the search matched when it isn't the first (LST-14). */
export type ListRow = ListItem & { via?: string };

export type ListResult = {
  /** Per tab, over every project: the search and the facets narrow the rows, not the tabs. */
  counts: ListCounts;
  /** Every project. */
  total: number;
  /** After the tab, the search and the Source facet. */
  matched: number;
  /** A tab, search or facet narrows the view — the count line says "4 of 38" (LST-26). */
  narrowed: boolean;
  /** 1-based, clamped to the last page (LST-31). */
  page: number;
  /** At least 1. */
  pageCount: number;
  /** This page's rows, PAGE_SIZE at most. */
  rows: ListRow[];
};

function inTab(s: ProjectSummary, tab: ListTab): boolean {
  if (tab === "all") return true;
  if (tab === "showcase") return s.showcase !== null;
  return s.status === tab; // an unreadable mint ("minted", LST-9) is in no outcome tab
}

function inSource(s: ProjectSummary, source: ListSource): boolean {
  if (source === "any") return true;
  return (s.source.kind === "hand") === (source === "hand");
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** Name A–Z, then id — the tie-break every order ends on (LST-23). */
function byName(a: ListRow, b: ListRow): number {
  const named = collator.compare(a.summary.name, b.summary.name);
  if (named) return named;
  return a.summary.id < b.summary.id ? -1 : a.summary.id > b.summary.id ? 1 : 0;
}

const ORDER: Record<ListSort, (a: ListRow, b: ListRow) => number> = {
  updated: (a, b) => b.summary.sortKey - a.summary.sortKey || byName(a, b),
  newest: (a, b) => b.project.createdAt - a.project.createdAt || byName(a, b),
  oldest: (a, b) => a.project.createdAt - b.project.createdAt || byName(a, b),
  name: byName,
};

/** The list's one pass: tab counts, then the tab, the Source facet and the search, the order and the page. */
export function filterProjects(items: ListItem[], q: ListQuery): ListResult {
  const counts: ListCounts = { all: 0, draft: 0, private: 0, given: 0, listed: 0, showcase: 0 };
  for (const { summary } of items) {
    for (const t of LIST_TABS) if (inTab(summary, t.id)) counts[t.id] += 1;
  }

  const needle = q.q.trim();
  const kept: ListRow[] = [];
  for (const item of items) {
    if (!inTab(item.summary, q.tab) || !inSource(item.summary, q.source)) continue;
    if (!needle) {
      kept.push(item);
      continue;
    }
    const m = matchProject(item.summary, item.project.description, needle);
    if (m.hit) kept.push(m.via ? { ...item, via: m.via } : item);
  }
  kept.sort(ORDER[q.sort]);

  const pageCount = Math.max(1, Math.ceil(kept.length / PAGE_SIZE));
  const want = Number.isInteger(q.page) && q.page >= 1 ? q.page : 1;
  const page = Math.min(want, pageCount);
  return {
    counts,
    total: items.length,
    matched: kept.length,
    narrowed: q.tab !== "all" || needle !== "" || q.source !== "any",
    page,
    pageCount,
    rows: kept.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

// ─────────────────────────── the URL (LST-28) ───────────────────────────

/** The search text as the URL carries it: left out when blank. */
export function searchInUrl(text: string): string {
  return text.trim() ? text : "";
}

function oneOf<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T {
  return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Reads /projects?tab=&q=&sort=&source=&page=. An unknown value reads as its default. */
export function parseListQuery(params: { get(name: string): string | null }): ListQuery {
  const page = Number(params.get("page"));
  return {
    tab: oneOf(params.get("tab"), LIST_TABS.map((t) => t.id), DEFAULT_LIST_QUERY.tab),
    q: params.get("q") ?? "",
    sort: oneOf(params.get("sort"), SORT_OPTIONS.map((o) => o.value), DEFAULT_LIST_QUERY.sort),
    source: oneOf(params.get("source"), SOURCE_OPTIONS.map((o) => o.value), DEFAULT_LIST_QUERY.source),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** "" for the default view, else "?tab=…&q=…&sort=…&source=…&page=…" in that order, defaults left out. */
export function listQueryString(q: ListQuery): string {
  const out = new URLSearchParams();
  if (q.tab !== DEFAULT_LIST_QUERY.tab) out.set("tab", q.tab);
  if (searchInUrl(q.q)) out.set("q", q.q);
  if (q.sort !== DEFAULT_LIST_QUERY.sort) out.set("sort", q.sort);
  if (q.source !== DEFAULT_LIST_QUERY.source) out.set("source", q.source);
  if (q.page > 1) out.set("page", String(q.page));
  const s = out.toString();
  return s ? `?${s}` : "";
}

// ─────────────────────────── the words ───────────────────────────

function projectsWord(n: number): string {
  return n === 1 ? "project" : "projects";
}

/** A tab's accessible count (LST-8): "Draft, 9 projects". */
export function tabCountLabel(n: number): string {
  return `${n} ${projectsWord(n)}`;
}

/** LST-26: "38 projects", or "4 of 38 projects" when a tab, search or facet narrows the view. */
export function countLine(r: Pick<ListResult, "matched" | "total" | "narrowed">): string {
  return r.narrowed ? `${r.matched} of ${r.total} ${projectsWord(r.total)}` : tabCountLabel(r.total);
}

/** LST-27: 1 … n-1 n n+1 … last. Every rendered number is a page that exists. */
export function pageItemsFor(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: Array<number | "ellipsis"> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);
  if (from > 2) out.push("ellipsis");
  for (let i = from; i <= to; i++) out.push(i);
  if (to < pageCount - 1) out.push("ellipsis");
  out.push(pageCount);
  return out;
}
```

**3c. `src/components/projects/my-projects.tsx`: replace lines `:1-334`** (from `"use client";` through the closing `}` of `MyProjects`) with:

```tsx
"use client";

// MyProjects — /projects, the only index of projects (spec §3.2, §5.2). The
// shell follows User Panel V2's "My project" section (Figma 16838:392921):
// header, tab row, toolbar, card grid, pagination. Every value comes from the
// real stores — the project records (`useManualProjects`), their builds
// (`useCreateHistory`), the preview clips (`useVideoJobs`) and one brief draft
// per project (`readBriefDraft`) — through one derivation, `projectSummary()`,
// which the details header shares (LST-32). One pure pass, `filterProjects()`,
// turns the summaries into the tab counts, the search, the Source facet, the
// order and the page.
//
// The tabs are the outcome — All · Draft · Private · Given · Listed — then
// Showcase, which is membership, not a state (owner decision O5, LST-4).
//
// The view lives in the URL (LST-28): tab, q, sort, source and page, written
// with replaceState and defaults left out. The scroller is the (create)
// layout's <main>, which Next's own restoration doesn't cover, so the list
// also puts its scroll offset back when Back returns to it.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CpuIcon,
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  PencilEdit01Icon,
  File01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { SearchInput, SelectMenu, buttonVariants } from "@/components/ideeza";
import { useMinuteClock } from "@/components/create/build-status";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useCreateHistory } from "@/lib/create/history";
import { readBriefDraft } from "@/lib/brief/project-brief";
import { briefDraftKey } from "@/lib/brief/types";
import { projectSummary, type ListQuery } from "@/lib/manual/project-summary";
import {
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
  type ListCounts,
  type ListItem,
  type ListTab,
} from "@/lib/manual/project-list";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  firstIncompleteStep,
  productLabel,
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import { cn, formatRelativeTime } from "@/lib/utils";

const TOTAL_STEPS = FLOW_STEPS.length;

const PANEL_ID = "projects-panel";
const SOURCE_ID = "projects-source";
const tabId = (tab: ListTab) => `projects-tab-${tab}`;

// ───────────────────────── brief drafts ─────────────────────────

// The drafts are read in render, keyed on a version this store bumps on
// window focus and on another tab's draft write (LST-7), so a mint finished
// in another tab moves its card here. The server snapshot is -1: the first
// frame renders the counts as "—" and the reads happen on the client only.
const DRAFT_PREFIX = briefDraftKey("");
let draftsVersion = 0;

function subscribeDrafts(onChange: () => void): () => void {
  const bump = () => {
    draftsVersion += 1;
    onChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(DRAFT_PREFIX)) bump();
  };
  window.addEventListener("focus", bump);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("focus", bump);
    window.removeEventListener("storage", onStorage);
  };
}
const draftsSnapshot = () => draftsVersion;
const draftsServerSnapshot = () => -1;

// ───────────────────────── scroll memory ─────────────────────────

// Back from a project returns the same view at the same scroll position
// (LST-28). The offset is kept per view URL when a click in the list leaves
// the page, and put back only when this mount is the target of a history
// traversal, so a fresh visit (the sidebar, a link) starts at the top.
const SCROLL_KEY = "ideeza:projects:scroll";
let popTarget: string | null = null;

function here(): string {
  return window.location.pathname + window.location.search;
}

if (typeof window !== "undefined") {
  // Capture: it records the target before the router's own listener renders the list.
  window.addEventListener(
    "popstate",
    () => {
      popTarget = here();
    },
    { capture: true },
  );
}

function rememberScroll(): void {
  const main = document.getElementById("main-content");
  if (!main) return;
  try {
    window.sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ url: here(), top: main.scrollTop }));
  } catch {
    // Storage blocked: Back starts at the top, as a fresh visit does.
  }
}

function restoreScrollAfterTraversal(): void {
  const url = here();
  if (popTarget !== url) return;
  popTarget = null;
  const main = document.getElementById("main-content");
  try {
    const raw = window.sessionStorage.getItem(SCROLL_KEY);
    const saved = raw ? (JSON.parse(raw) as { url?: unknown; top?: unknown }) : null;
    if (main && saved?.url === url && typeof saved.top === "number") main.scrollTop = saved.top;
  } catch {
    // A corrupt entry is ignored.
  }
}

/** "/" focuses search unless focus is already somewhere that takes typing (LST-15). */
function isTypingTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el.closest('[role="dialog"], [role="listbox"], [role="menu"]')) return true;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

// ───────────────────────── page ─────────────────────────

export function MyProjects() {
  const { hydrated, projects, selectProject, updateProject } = useManualProjects();
  const { hydrated: buildsHydrated, builds } = useCreateHistory();
  const { hydrated: jobsHydrated, jobs } = useVideoJobs();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = useMinuteClock();

  // ── the view ──
  const query = React.useMemo(() => parseListQuery(params), [params]);
  // The field keeps its own copy of q, so a keystroke never waits on the
  // router. A navigation that changes q (a pasted link, the sidebar's bare
  // /projects) is adopted; our own echo of what was typed is not.
  const [text, setText] = React.useState(query.q);
  const [seenQ, setSeenQ] = React.useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    if (searchInUrl(text) !== query.q) setText(query.q);
  }
  const view = React.useMemo<ListQuery>(() => ({ ...query, q: text }), [query, text]);

  // replaceState: a tab, a sort or a typed word is not a history step, so Back
  // leaves the list rather than undoing it one keystroke at a time. Next keeps
  // useSearchParams in step with it (docs: "Native History API").
  const write = React.useCallback(
    (next: ListQuery) => {
      window.history.replaceState(null, "", `${pathname}${listQueryString(next)}`);
    },
    [pathname],
  );
  // Every change but a page turn goes back to page 1; the rest of the view stays (LST-8).
  const changeView = (patch: Partial<Omit<ListQuery, "page">>) => write({ ...view, ...patch, page: 1 });
  const changeQuery = (next: string) => {
    setText(next);
    write({ ...view, q: next, page: 1 });
  };

  // ── the data ──
  const draftsTick = React.useSyncExternalStore(subscribeDrafts, draftsSnapshot, draftsServerSnapshot);
  const storesReady = hydrated && buildsHydrated && jobsHydrated;
  const drafts = React.useMemo(
    () =>
      storesReady && draftsTick >= 0
        ? new Map(projects.map((p) => [p.id, readBriefDraft(p.id)] as const))
        : null,
    [storesReady, draftsTick, projects],
  );

  // Showcase, once, for a project minted with Share to Innovations before the
  // flag existed (COR-105): it gets showcasedAt = mintedAt the first time its
  // draft is read. null — the maker stopped showcasing — is never overwritten.
  React.useEffect(() => {
    if (!drafts) return;
    for (const p of projects) {
      const b = drafts.get(p.id)?.state;
      if (p.showcasedAt === undefined && b?.mintedAt != null && b.shareToNewsfeed) {
        updateProject(p.id, { showcasedAt: b.mintedAt });
      }
    }
  }, [drafts, projects, updateProject]);

  const items = React.useMemo<ListItem[] | null>(
    () =>
      drafts
        ? projects.map((project) => ({
            project,
            summary: projectSummary(project, {
              builds,
              brief: drafts.get(project.id) ?? null,
              videoJobs: jobs,
              now,
            }),
          }))
        : null,
    [drafts, projects, builds, jobs, now],
  );
  const result = React.useMemo(() => (items ? filterProjects(items, view) : null), [items, view]);

  // Back to this view puts the scroll offset back, once the cards are there.
  const restored = React.useRef(false);
  React.useEffect(() => {
    if (!result || restored.current) return;
    restored.current = true;
    restoreScrollAfterTraversal();
  }, [result]);

  // A page the list no longer reaches — a delete emptied it, or a stale link —
  // shows the last page, and the URL follows so Back lands there too (LST-31).
  React.useEffect(() => {
    if (result && result.page !== view.page) write({ ...view, page: result.page });
  }, [result, view, write]);

  // ── "/" focuses search; ⌘K stays with the command palette (LST-15) ──
  const searchRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const input = searchRef.current;
      if (!input || isTypingTarget(document.activeElement)) return;
      e.preventDefault();
      input.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── a page turn goes to the results and focuses their heading (LST-27) ──
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const changePage = (page: number) => {
    write({ ...view, page });
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  };

  const open = (project: ManualProject) => {
    selectProject(project.id);
    router.push(stepHref(project, firstIncompleteStep(project)));
  };

  const tabLabel = LIST_TABS.find((t) => t.id === view.tab)?.label ?? "All";
  const sourceLabel = SOURCE_OPTIONS.find((o) => o.value === view.source)?.label ?? "";
  const noProjects = result !== null && result.total === 0;

  return (
    // The content box is the container the toolbar, the chips and the
    // pagination ask about: layout switches read the page, never the window.
    <div
      onClickCapture={rememberScroll}
      className="mx-auto w-full max-w-[1280px] px-[16px] py-[28px] [container-type:inline-size] min-[640px]:px-[32px]"
    >
      <header className="mb-[20px] flex flex-col gap-[4px]">
        <div className="flex items-center justify-between gap-[12px]">
          <h1 className="text-xl font-bold tracking-tight text-text-primary">My projects</h1>
          {/* Creation lives on Home (owner decision O11): a link, not a flow on this page. */}
          <Link
            href="/"
            className={cn(
              buttonVariants({ hierarchy: "secondary", size: "md" }),
              "shrink-0 [@container(max-width:559px)]:min-h-[44px]",
            )}
          >
            <span aria-hidden className="inline-flex size-[16px] shrink-0 items-center justify-center">
              <Icon icon={PlusSignIcon} size={16} />
            </span>
            New project
          </Link>
        </div>
        <p className="max-w-[62ch] text-md text-text-secondary">
          Every project you&apos;ve saved — from an AI build or started by hand. They&apos;re stored in this
          browser.
        </p>
      </header>

      {noProjects ? (
        <NoProjectsState />
      ) : (
        <>
          <ProjectTabs tab={view.tab} counts={result?.counts ?? null} onChange={(tab) => changeView({ tab })} />

          <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(view.tab)}>
            {/* The results heading (LST-60): the focus target after a page turn. */}
            <h2 ref={headingRef} tabIndex={-1} className="sr-only">
              {tabLabel} projects
            </h2>

            {/* Toolbar: search, then Source and Sort. Below a 720 px content box
                search takes the row and the two menus share the next (LST-57). */}
            <div className="mt-[16px] grid grid-cols-2 gap-[12px] [@container(min-width:720px)]:flex [@container(min-width:720px)]:items-center">
              <form
                role="search"
                onSubmit={(e) => e.preventDefault()}
                className="col-span-2 [@container(min-width:720px)]:max-w-[420px] [@container(min-width:720px)]:flex-1"
              >
                <SearchInput
                  ref={searchRef}
                  value={text}
                  onValueChange={changeQuery}
                  onClear={() => searchRef.current?.focus()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && text) {
                      e.preventDefault();
                      changeQuery("");
                    }
                  }}
                  placeholder="Search projects and products"
                  aria-label="Search projects and products"
                  aria-keyshortcuts="/"
                  enterKeyHint="search"
                  className="text-[length:var(--font-size-md)]"
                  containerClassName="min-h-[44px] [&>button]:before:-inset-[15.5px]"
                />
              </form>
              <SelectMenu
                id={SOURCE_ID}
                ariaLabel="Source"
                value={view.source}
                onChange={(source) => changeView({ source })}
                options={SOURCE_OPTIONS}
                placeholder="Any source"
                className="[&>button]:min-h-[44px] [@container(min-width:720px)]:ml-auto [@container(min-width:720px)]:w-[176px] [@container(min-width:720px)]:shrink-0"
              />
              <SelectMenu
                ariaLabel="Sort"
                value={view.sort}
                onChange={(sort) => changeView({ sort })}
                options={SORT_OPTIONS}
                placeholder="Recently updated"
                className="[&>button]:min-h-[44px] [@container(min-width:720px)]:w-[200px] [@container(min-width:720px)]:shrink-0"
              />
            </div>

            {/* The count line on the left, the active facet as a removable chip on the right (LST-18, LST-26). */}
            <div
              ref={resultsRef}
              className="mt-[16px] flex scroll-mt-[16px] flex-wrap items-center justify-between gap-x-[12px] gap-y-[8px]"
            >
              <p aria-live="polite" aria-atomic="true" className="text-md font-medium text-text-secondary">
                {result ? countLine(result) : "—"}
              </p>
              {view.source !== "any" ? (
                <button
                  type="button"
                  aria-label={`Remove the Source filter: ${sourceLabel}`}
                  onClick={() => {
                    changeView({ source: "any" });
                    document.getElementById(SOURCE_ID)?.focus();
                  }}
                  className="inline-flex h-[28px] items-center gap-[6px] rounded-full border border-solid border-border bg-bg-surface pl-[10px] pr-[8px] text-sm font-semibold text-text-primary outline-none transition-colors duration-normal ease-decelerate hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(max-width:559px)]:h-[44px]"
                >
                  Source: {sourceLabel}
                  <Icon icon={Cancel01Icon} size={14} />
                </button>
              ) : null}
            </div>

            {!result ? (
              <p className="mt-[24px] text-md text-text-tertiary">Loading…</p>
            ) : result.rows.length === 0 ? (
              <NoMatchState
                onClear={() => {
                  setText("");
                  write({ ...view, tab: "all", q: "", source: "any", page: 1 });
                }}
              />
            ) : (
              <>
                <ul
                  role="list"
                  className="mt-[16px] grid grid-cols-1 gap-[24px] min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3"
                >
                  {result.rows.map((row) => (
                    <li key={row.project.id}>
                      <ProjectCard
                        project={row.project}
                        image={row.summary.cover ?? undefined}
                        via={row.via}
                        onOpen={() => open(row.project)}
                      />
                    </li>
                  ))}
                </ul>

                {result.pageCount > 1 ? (
                  <Pagination page={result.page} pageCount={result.pageCount} onChange={changePage} />
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ───────────────────────── tabs ─────────────────────────

// A real ARIA tablist (LST-8): one Tab stop, ← → Home End move and select,
// every tab names its count, and all of them control the one panel.
function ProjectTabs({
  tab,
  counts,
  onChange,
}: {
  tab: ListTab;
  counts: ListCounts | null;
  onChange: (tab: ListTab) => void;
}) {
  const refs = React.useRef(new Map<ListTab, HTMLButtonElement>());
  const ids = LIST_TABS.map((t) => t.id);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, from: ListTab) => {
    const i = ids.indexOf(from);
    const to =
      e.key === "ArrowRight"
        ? ids[(i + 1) % ids.length]
        : e.key === "ArrowLeft"
          ? ids[(i - 1 + ids.length) % ids.length]
          : e.key === "Home"
            ? ids[0]
            : e.key === "End"
              ? ids[ids.length - 1]
              : null;
    if (!to) return;
    e.preventDefault();
    onChange(to);
    refs.current.get(to)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Projects by outcome"
      className="flex flex-wrap items-center gap-[8px] border-b border-solid border-border pb-[16px]"
    >
      {LIST_TABS.map((t) => {
        const active = t.id === tab;
        // "—" until the projects and every brief draft have been read (LST-7).
        const n = counts ? counts[t.id] : null;
        return (
          <React.Fragment key={t.id}>
            {t.divider ? <span aria-hidden className="mx-[4px] h-[20px] w-px shrink-0 bg-border" /> : null}
            <button
              ref={(el) => {
                if (el) refs.current.set(t.id, el);
                else refs.current.delete(t.id);
              }}
              id={tabId(t.id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={PANEL_ID}
              aria-label={`${t.label}, ${n === null ? "not counted yet" : tabCountLabel(n)}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKeyDown(e, t.id)}
              className={cn(
                "inline-flex h-[36px] items-center gap-[8px] rounded-full border border-solid px-[14px] text-md font-semibold outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(max-width:559px)]:h-[44px]",
                active
                  ? "border-transparent bg-bg-brand-subtle text-text-brand"
                  : "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary",
              )}
            >
              {t.label}
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-[6px] text-sm font-semibold tabular-nums",
                  active ? "bg-bg-brand text-text-on-brand" : "bg-bg-subtle text-text-secondary",
                )}
              >
                {n ?? "—"}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

**3d. Replace lines `:338-346`** (the `ProjectCard` signature). The current code:
```tsx
function ProjectCard({
  project,
  image,
  onOpen,
}: {
  project: ManualProject;
  image?: string;
  onOpen: () => void;
}) {
```
becomes:
```tsx
function ProjectCard({
  project,
  image,
  via,
  onOpen,
}: {
  project: ManualProject;
  image?: string;
  /** The product the search matched when it isn't the first (LST-14). */
  via?: string;
  onOpen: () => void;
}) {
```

**3e. Replace lines `:396-398`** (the product line). The current code:
```tsx
            <p className="mt-[2px] truncate text-sm text-text-tertiary">
              {productLabel(project)}
            </p>
```
becomes:
```tsx
            <p className="mt-[2px] truncate text-sm text-text-tertiary">
              {productLabel(project)}
              {via ? ` · matches ${via}` : null}
            </p>
```

**3f. Replace lines `:449-580`**, which run from `// ───────────────────────── shared bits ─────────────────────────` through the closing `}` of `pageItemsFor`. The page no longer uses `Select`, and `pageItemsFor` has moved to `project-list.ts`. The new block:

```tsx
// ───────────────────────── pagination ─────────────────────────

// LST-27: ‹ 1 … n-1 n n+1 … last ›, the current page marked. Below a 480 px
// content box the numbers give way to "Page 2 of 4". Hidden on a single page
// (the caller doesn't render it).
function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  const btn =
    "inline-flex h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-solid px-[8px] text-md font-medium outline-none transition-colors duration-normal ease-decelerate focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page motion-reduce:transition-none [@container(max-width:559px)]:h-[44px] [@container(max-width:559px)]:min-w-[44px]";
  const idle =
    "border-border bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary";
  const numbersOnly = "[@container(max-width:479px)]:hidden";

  return (
    <nav aria-label="Pagination" className="mt-[28px] flex items-center justify-end gap-[6px]">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={cn(btn, idle, "disabled:cursor-not-allowed disabled:opacity-40")}
      >
        <Icon icon={ArrowLeft01Icon} size={16} />
      </button>

      <p className="px-[8px] text-md font-medium text-text-secondary [@container(min-width:480px)]:hidden">
        Page {page} of {pageCount}
      </p>

      {pageItemsFor(page, pageCount).map((it, i) =>
        it === "ellipsis" ? (
          <span
            key={`e-${i}`}
            aria-hidden
            className={cn(
              "inline-flex h-[36px] min-w-[24px] items-center justify-center text-md text-text-tertiary",
              numbersOnly,
            )}
          >
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-label={`Page ${it}`}
            aria-current={it === page ? "page" : undefined}
            onClick={() => onChange(it)}
            className={cn(
              btn,
              numbersOnly,
              it === page ? "border-transparent bg-bg-brand-subtle font-semibold text-text-brand" : idle,
            )}
          >
            {it}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={cn(btn, idle, "disabled:cursor-not-allowed disabled:opacity-40")}
      >
        <Icon icon={ArrowRight01Icon} size={16} />
      </button>
    </nav>
  );
}
```

**3g. Delete lines `:648-660`**: the blank line before `function NftEmptyState() {` and the whole function. The Utility NFT tab it served is removed (LST-6). `EmptyShell`, `NoProjectsState` and `NoMatchState` (`:582-647`) stay unchanged for B2.

**3h. Replace `src/app/(create)/projects/page.tsx`, lines `:1-10`, the whole file,** with:

```tsx
// /projects — "My projects" (spec §3.2, §5.2). MyProjects reads its view —
// tab, search, sort, source and page — from the URL with `useSearchParams`,
// so it sits in a Suspense boundary: the route shell still prerenders, and a
// production build refuses the hook without one.

import * as React from "react";
import type { Metadata } from "next";
import { MyProjects } from "@/components/projects/my-projects";

export const metadata: Metadata = {
  title: "My projects · IDEEZA",
};

export default function ProjectsPage() {
  return (
    <React.Suspense
      fallback={<div className="mx-auto w-full max-w-[1280px] px-[16px] py-[28px] min-[640px]:px-[32px]" />}
    >
      <MyProjects />
    </React.Suspense>
  );
}
```

**3i. `src/components/ideeza/search-input.tsx`: replace line `:61`.** The current line:
```tsx
            className="inline-flex shrink-0 items-center justify-center text-[color:var(--color-text-tertiary)] transition-colors hover:text-[color:var(--color-text-primary)]"
```
becomes:
```tsx
            // The glyph is 13 px. The ::before pad makes the target 24 px
            // without moving anything (WCAG 2.5.8), and the ring shows focus.
            className="relative inline-flex shrink-0 items-center justify-center rounded-full text-[color:var(--color-text-tertiary)] outline-none transition-colors before:absolute before:-inset-[5.5px] before:content-[''] hover:text-[color:var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
```

- [ ] **Step 4: Run it. It is expected to PASS.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

What to expect:
- `tsc` exits 0.
- `project-list.test.mjs` reports 12 passing tests.
- The earlier tasks' files, including A3's `project-summary.test.mjs`, still pass.
- The run ends with `# fail 0`.

- [ ] **Step 5: Browser check**

The dev server is `http://localhost:3002`, started by Task 0. Open `http://localhost:3002/projects`.

1. **Back up, then seed.** Run this in the DevTools console. It keeps any real projects in `sessionStorage` and reloads the page.
   ```js
   (() => {
     sessionStorage.setItem("b1-backup", localStorage.getItem("ideeza:manual:projects") ?? "[]");
     const now = Date.now(), H = 36e5, D = 24 * H;
     const flowState = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
     const mk = (i, name, products, extra = {}) => ({
       id: `seed_${i}`, slug: `seed-${i}`, name, productName: products[0].name, description: "",
       products: products.map((p, k) => ({ id: `p${k + 1}`, description: "", ...p })),
       status: "draft", createdAt: now - (20 - i) * D, updatedAt: now - i * H, flowState, ...extra,
     });
     localStorage.setItem("ideeza:manual:projects", JSON.stringify([
       mk(1, "Car", [{ name: "RC Car Controller" }, { name: "Remote Controller", description: "Hand-held transmitter" }, { name: "Battery Charger" }, { name: "Spare Battery Pack" }], { buildId: "seed_gone_1" }),
       mk(2, "Plant Soil Monitor", [{ name: "Soil Probe" }], { buildId: "seed_gone_2", status: "completed", showcasedAt: now - 2 * D }),
       mk(3, "Desk Lamp", [{ name: "Lamp Head" }], { status: "completed", showcasedAt: null }),
       mk(4, "Café Timer", [{ name: "Timer Board" }], { status: "completed" }),
       mk(5, "Old Vault", [{ name: "Vault Lock" }], { status: "completed" }),
       ...Array.from({ length: 9 }, (_, k) => mk(6 + k, `Sensor Node ${k + 1}`, [{ name: `Node Board ${k + 1}` }])),
     ]));
     const draft = (id, state) => localStorage.setItem(`ideeza:brief:draft:${id}`, JSON.stringify({ state, step: "success" }));
     draft("seed_2", { intent: "sell", mintedAt: now - 3 * D });
     draft("seed_3", { intent: "save", mintedAt: now - 2 * D, shareToNewsfeed: true });
     draft("seed_4", { intent: "give", mintedAt: now - 4 * D, shareToNewsfeed: true });
     location.assign("/projects");
   })();
   ```
2. **Header (LST-1, LST-2, LST-3).**
   - The browser tab reads "My projects · IDEEZA".
   - The h1 "My projects" is on the left and a secondary **New project** button with a + icon is on the right.
   - Below them is the intro: "Every project you've saved — from an AI build or started by hand. They're stored in this browser."
   - No violet appears except the selected tab.
3. **Tabs and counts (LST-4, LST-7, LST-9, LST-10).**
   - Right after the reload, the counts may flash "—".
   - They then read **All 14 · Draft 10 · Private 1 · Given 1 · Listed 1 ┊ Showcase 2**, with a hairline before Showcase.
   - The count line reads "14 projects". There are 12 cards and a `‹ 1 2 ›` pagination.
   - **Showcase** lists Plant Soil Monitor and Café Timer:
     - Café Timer was added by the one-time backfill.
     - Desk Lamp is absent, because its `null` is kept.
     - The URL is `/projects?tab=showcase` and the count line reads "2 of 14 projects".
   - Old Vault appears under **All** only. It is absent from Draft, Private, Given, Listed and Showcase.
   - In the console, `JSON.parse(localStorage.getItem("ideeza:manual:projects")).filter(p => ["seed_3","seed_4"].includes(p.id)).map(p => [p.id, p.showcasedAt])` shows `seed_3` → `null`, and `seed_4` → the number it was seeded with (its draft's `mintedAt`).
4. **Keyboard on the tabs (LST-8).**
   - Click **All**, then press Shift+Tab and Tab: one stop lands on the selected tab.
   - → selects Draft, and the URL becomes `/projects?tab=draft`. ← goes back. End selects Showcase. Home selects All.
   - The next Tab goes to the search field.
   - VoiceOver (⌘F5) reads a tab as "Draft, 10 projects, tab, 2 of 6".
5. **Search (LST-13, LST-14, LST-15).** On **All**:
   - Click the page background and press `/`. The search field takes focus.
   - Type `remote`:
     - one card, Car, remains;
     - its product line reads "RC Car Controller · matches Remote Controller";
     - the count line reads "1 of 14 projects";
     - the URL is `/projects?q=remote`.
   - Press Esc. The field empties, 14 cards come back, and the URL is `/projects`.
   - Type `cafe`: Café Timer remains. Type `sensor 3`: only Sensor Node 3 remains.
   - Click the × in the field. It empties and focus stays in the field.
   - Search stays enabled on every tab.
6. **Source (LST-17, LST-18).**
   - Choose Source → **AI build**:
     - Car and Plant Soil Monitor remain;
     - the count line reads "2 of 14 projects";
     - the chip "Source: AI build ×" appears on the right;
     - the URL is `/projects?source=build`.
   - Activate the chip. The facet returns to Any source, the chip goes, and focus moves to the Source menu.
7. **Sort (LST-23).**
   - **Name A–Z**: Café Timer, Car, Desk Lamp, Old Vault, Plant Soil Monitor, Sensor Node 1 … The URL is `?sort=name`.
   - **Newest to oldest**: Sensor Node 9 is first.
   - **Oldest to newest**: Car is first.
   - **Recently updated**: Café Timer is first, because the backfill stamped it. Car is next.
   - Changing the sort while on page 2 returns to page 1.
8. **Pagination (LST-27).**
   - Click **2**. Two cards show, the URL gains `page=2`, and the page scrolls smoothly to the count line (instantly under reduced motion).
   - `document.activeElement.textContent` in the console reads "All projects".
   - Page 2 carries `aria-current="page"`.
9. **Back restores the view (LST-28).**
   - Set **Name A–Z** on page 1. Scroll `<main>` to the last row and note `document.getElementById("main-content").scrollTop`.
   - Click that card's **Details**, then press the browser's Back.
   - The URL is `/projects?sort=name`, Name A–Z is selected, and `scrollTop` equals the noted value.
   - Now click **My projects** in the sidebar. The list opens at `/projects` at the top, with the defaults.
10. **Stale page (LST-31).**
    - Run `const a = JSON.parse(localStorage.getItem("ideeza:manual:projects")); localStorage.setItem("ideeza:manual:projects", JSON.stringify(a.slice(0, 12))); location.assign("/projects?page=2")`.
    - Page 1 shows 12 cards, with no pagination, and the URL is corrected to `/projects`.
    - Restore the 14 projects by running step 1's seed again.
11. **Another tab (LST-7).**
    - Open a second tab at `http://localhost:3002/` and run `localStorage.setItem("ideeza:brief:draft:seed_6", JSON.stringify({ state: { intent: "give", mintedAt: Date.now() }, step: "success" }))`.
    - Without reloading, the first tab reads Draft 9 and Given 2. Sensor Node 1 is under Given.
12. **Phone width (LST-3, LST-57).** Set the device toolbar to 400 × 800.
    - The gutters are 16 px and the tabs wrap onto two or three rows.
    - Search takes a full row, and Source and Sort share the next.
    - Tabs, menus, the chip and the page buttons are at least 44 px tall.
    - Pagination reads "‹ Page 1 of 2 ›".
    - `document.documentElement.scrollWidth === document.documentElement.clientWidth` is `true`.
13. **New project (LST-2).** Clicking it goes to `/`.
14. **No projects (LST-52 shell).**
    - Run `localStorage.setItem("ideeza:manual:projects", "[]"); location.reload()`.
    - "No projects yet" shows, and the tabs and toolbar are hidden.
15. **Clean up.** Run `localStorage.setItem("ideeza:manual:projects", sessionStorage.getItem("b1-backup") ?? "[]"); Object.keys(localStorage).filter(k => k.startsWith("ideeza:brief:draft:seed_")).forEach(k => localStorage.removeItem(k)); sessionStorage.removeItem("ideeza:projects:scroll"); location.reload()`.

- [ ] **Step 6: tsc + eslint + commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
npx eslint src/lib/manual/project-summary.ts src/lib/manual/project-list.ts src/components/projects/my-projects.tsx "src/app/(create)/projects/page.tsx" src/components/ideeza/search-input.tsx tests/projects/project-list.test.mjs
git add src/lib/manual/project-summary.ts src/lib/manual/project-list.ts src/components/projects/my-projects.tsx "src/app/(create)/projects/page.tsx" src/components/ideeza/search-input.tsx tests/projects/project-list.test.mjs
git commit -F - <<'EOF'
feat(projects): My projects toolbar — outcome tabs, search across products, Source, sort, pages, view in the URL

The tab row is All · Draft · Private · Given · Listed, then Showcase after a
divider, each with a live count that waits for every brief draft and moves
when another tab mints. Search reaches every product and says which one
matched; Source splits AI builds from hand-made projects; four sorts; twelve
a page. The whole view lives in the URL, so Back from a project returns to
the same tab, search, sort, page and scroll position. The header gains New
project, which goes to Home.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

What to expect:
- `tsc` and `eslint` print nothing and exit 0. The old file's `react-hooks/set-state-in-effect` error at `my-projects.tsx:140` is gone, because the drafts are now read through `useSyncExternalStore`.
- The commit contains exactly the six files.

---

**Hand-off to B2 (the card task, which runs after this one)**

- **Card.** Render each `row` of `result.rows`:
  - `row.summary` goes through A3's `cardText(row.summary, now)`, where `now` is the page's `useMinuteClock()` value;
  - `row.via`, when set, is appended to `cardText().productLine` as ` · matches {via}` (LST-14). That replaces this task's interim hint in `ProjectCard`;
  - `row.project` is kept for anything the summary doesn't carry.
- **Result states.** Inside `#projects-panel`, replace:
  - the `Loading…` line with the LST-51 skeletons;
  - `NoMatchState` with LST-53/54. It receives `view`, and resets through `write` and `setText` as today's `onClear` does;
  - `NoProjectsState` with the LST-52 `StateCard`;
  - the grid's viewport breakpoints with LST-56's container queries. The content box already has `container-type: inline-size`.
- **Keep unchanged:**
  - the tabs, the toolbar, the count row and the pagination;
  - the `onClickCapture={rememberScroll}` on the root;
  - `headingRef`, which is the h2 LST-60 names.
