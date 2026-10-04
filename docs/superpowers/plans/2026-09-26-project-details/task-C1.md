### Task C1: The project page shell, its states and the tab strip

**Spec delta check (commit e599fcf, and its "Harness notes"):** applied.
- The test command is the quoted glob.
- Tests import from `../../.tmp-test/lib/...`.
- Both new `src/lib/**` modules have no value imports at all.
- The only date formatter used is A3's `formatDateTime`, in the interim Details block.
- `headerText()` belongs to the header task. This task writes no header strings of its own.

The delta's points about Showcase, Listed, versions, delete and the buyer view belong to the data layer, the header, the rail and Preview as buyer. This task only carries them through: `SlotProps.viewer`, and `?view=buyer` kept across tab changes.

**Order:** after A1 → A2 → A4a → A3 → A4b → A5 → A6 → A7 → B1 → B2, and before C2–C8 (merge-notes.md). C1 deletes `project-details.tsx`. Every later page task plugs into `SLOTS` in `project-page.tsx` instead; see **Hand-off** at the end, which re-targets C3's, C5's and C6's wiring.

Split in two:
- **C1a** — the pure route and keyboard modules, and the `moveTab` extraction (about 30 min).
- **C1b** — the shell, the states, the tab strip, the rail frame and the composition root (about 90 min).

---

### Task C1a: The page's URL state, and the shared tab keys

**Requirements:** COR-1 (id, then slug), COR-3 (the two title strings), COR-19 (the tab set and its order), COR-20 (`?tab=` parsing, Products omitted, roving keys through the shared `moveTab`), COR-21 (the reveal maths for a scrolling strip).

**Files:**
- Create `src/lib/manual/project-route.ts` (pure, no imports).
- Create `src/lib/ui/tab-keys.ts`. Its only import is a type-only import from `react`.
- Modify `src/components/create/review-outputs.tsx`:
  - after `:55`, the last import (`import { OPEN_IN_EDITOR_ID } from "./anchors";`), add one import;
  - delete `:589-612`, the private `moveTab` and its doc comment.
  - A5 and C9a also edit this file, so find both places by their text, not by line number.
- Modify `tests/projects/tsconfig.json` (A1): add the two new files to `include`. Skip an entry if a glob there already covers it.
- Test: `tests/projects/project-route.test.mjs` (new).

**Interfaces:**
- Consumes: nothing from other tasks. The test tsconfig is A1's: `rootDir ../../src`, `outDir ../../.tmp-test`.
- Produces:
```ts
// src/lib/manual/project-route.ts
export const PROJECT_TABS: readonly ["products", "media", "network"];
export type ProjectTabId = "products" | "media" | "network";
export const PROJECT_TAB_LABEL: Record<ProjectTabId, string>;   // "Products" · "Media" · "Network"
export function parseProjectTab(raw: string | null): ProjectTabId;          // media | network, else products
export function resolveTab(asked: ProjectTabId, shown: readonly ProjectTabId[]): ProjectTabId;
export function withTab(search: string, tab: ProjectTabId): string;        // no leading "?", like C6's withView
export function resolveProject<T extends { id: string; slug: string }>(list: readonly T[], key: string): T | null;
export function projectDocTitle(project: string): string;                  // "{project} · My projects · IDEEZA"
export function productDocTitle(product: string, project: string): string; // "{product} · {project} · IDEEZA"

// src/lib/ui/tab-keys.ts
export function nextTabIndex(key: string, at: number, count: number): number | null;
export function moveTab<T extends string>(e: React.KeyboardEvent<HTMLElement>, ids: readonly T[], current: T, select: (id: T) => void): void;
export function revealDelta(item: { left: number; right: number }, view: { left: number; right: number }, pad?: number): number;
```
`?view=buyer` is not parsed here. Preview as buyer owns that parameter: C6's `viewerFromParam` and `withView` in `src/lib/manual/buyer-preview.ts`. `withTab` keeps whatever else is in the query, so it carries `view=buyer` through every tab change.

- [ ] **Step 1: Write the failing test**

Add the two entries to `tests/projects/tsconfig.json`'s `include`, unless a glob such as `../../src/lib/**/*.ts` already covers them:
```jsonc
  "include": [
    // …the entries earlier tasks added, unchanged…
    "../../src/lib/manual/project-route.ts",
    "../../src/lib/ui/tab-keys.ts"
  ]
```

Create `tests/projects/project-route.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROJECT_TABS,
  PROJECT_TAB_LABEL,
  parseProjectTab,
  resolveTab,
  withTab,
  resolveProject,
  projectDocTitle,
  productDocTitle,
} from "../../.tmp-test/lib/manual/project-route.js";
import { nextTabIndex, revealDelta } from "../../.tmp-test/lib/ui/tab-keys.js";

test("the strip is Products · Media · Network, in that order (COR-19)", () => {
  assert.deepEqual([...PROJECT_TABS], ["products", "media", "network"]);
  assert.deepEqual(
    PROJECT_TABS.map((id) => PROJECT_TAB_LABEL[id]),
    ["Products", "Media", "Network"],
  );
});

test("?tab= reads media and network; anything else is Products (COR-20)", () => {
  assert.equal(parseProjectTab("media"), "media");
  assert.equal(parseProjectTab("network"), "network");
  assert.equal(parseProjectTab("products"), "products");
  assert.equal(parseProjectTab(null), "products");
  assert.equal(parseProjectTab(""), "products");
  assert.equal(parseProjectTab("Network"), "products");
  assert.equal(parseProjectTab("contributors"), "products");
});

test("a tab the strip doesn't list falls back to Products (COR-19, COR-49)", () => {
  assert.equal(resolveTab("network", ["products", "network"]), "network");
  assert.equal(resolveTab("network", ["products", "media"]), "products");
  assert.equal(resolveTab("media", ["products"]), "products");
  assert.equal(resolveTab("products", ["products"]), "products");
});

test("choosing a tab rewrites ?tab= only, and Products is never written (COR-20)", () => {
  assert.equal(withTab("", "media"), "tab=media");
  assert.equal(withTab("?tab=media", "products"), "");
  assert.equal(withTab("view=buyer", "network"), "view=buyer&tab=network");
  assert.equal(withTab("?view=buyer", "media"), "view=buyer&tab=media");
  assert.equal(withTab("tab=media&view=buyer", "network"), "tab=network&view=buyer");
  assert.equal(withTab("tab=media&view=buyer", "products"), "view=buyer");
});

test("an address resolves by id first, then by slug (COR-1)", () => {
  const list = [
    { id: "proj_a", slug: "car" },
    { id: "car", slug: "car-2" },
    { id: "proj_b", slug: "garden-weather-station" },
  ];
  assert.equal(resolveProject(list, "car")?.id, "car"); // an id beats another project's slug
  assert.equal(resolveProject(list, "garden-weather-station")?.id, "proj_b");
  assert.equal(resolveProject(list, "proj_a")?.id, "proj_a");
  assert.equal(resolveProject(list, "nope"), null);
  assert.equal(resolveProject([], "car"), null);
});

test("document titles (COR-3)", () => {
  assert.equal(projectDocTitle("Car"), "Car · My projects · IDEEZA");
  assert.equal(productDocTitle("Remote Controller", "Car"), "Remote Controller · Car · IDEEZA");
});

test("arrows wrap, Home and End jump, other keys aren't the strip's (COR-20)", () => {
  assert.equal(nextTabIndex("ArrowRight", 0, 3), 1);
  assert.equal(nextTabIndex("ArrowRight", 2, 3), 0);
  assert.equal(nextTabIndex("ArrowLeft", 0, 3), 2);
  assert.equal(nextTabIndex("ArrowLeft", 2, 3), 1);
  assert.equal(nextTabIndex("ArrowDown", 1, 3), 2);
  assert.equal(nextTabIndex("ArrowUp", 1, 3), 0);
  assert.equal(nextTabIndex("Home", 2, 3), 0);
  assert.equal(nextTabIndex("End", 0, 3), 2);
  assert.equal(nextTabIndex("Enter", 0, 3), null);
  assert.equal(nextTabIndex("Tab", 0, 3), null);
  assert.equal(nextTabIndex("ArrowRight", 0, 0), null);
});

test("a tab past either edge of the strip scrolls just into view (COR-21)", () => {
  const view = { left: 0, right: 400 };
  assert.equal(revealDelta({ left: 100, right: 200 }, view, 8), 0);
  assert.equal(revealDelta({ left: 350, right: 460 }, view, 8), 68);
  assert.equal(revealDelta({ left: -40, right: 60 }, view, 8), -48);
  assert.equal(revealDelta({ left: 4, right: 100 }, view, 8), -4);
  assert.equal(revealDelta({ left: 350, right: 460 }, view), 60);
});
```

- [ ] **Step 2: Run it. Expected: FAIL**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected:
- `tsc` exits 0. An `include` entry naming a missing file is ignored.
- `project-route.test.mjs` fails with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../.tmp-test/lib/manual/project-route.js' imported from '.../tests/projects/project-route.test.mjs'
```
- Every earlier task's test file still passes.

- [ ] **Step 3: Implement**

**3.1 Create `src/lib/manual/project-route.ts`:**
```ts
// The project page's URL state and names (spec §5.3, §5.5): which tab the
// address asks for, which record it names, and the document titles. Pure and
// import-free, so node:test covers it (tests/projects/project-route.test.mjs).
// `?view=buyer` is Preview as buyer's own parameter (§5.11,
// lib/manual/buyer-preview.ts); withTab keeps it, like every other parameter.

/** The page tabs, in strip order (COR-19). LATER, "contributors" and
 *  "customers" are appended, so a tab a maker has learned never moves. */
export const PROJECT_TABS = ["products", "media", "network"] as const;
export type ProjectTabId = (typeof PROJECT_TABS)[number];

export const PROJECT_TAB_LABEL: Record<ProjectTabId, string> = {
  products: "Products",
  media: "Media",
  network: "Network",
};

/** `?tab=` → the tab it asks for. Products is the default, so it is never
 *  written (COR-20), and an unknown value reads as Products. */
export function parseProjectTab(raw: string | null): ProjectTabId {
  return raw === "media" || raw === "network" ? raw : "products";
}

/** The tab to show: the one asked for when the strip lists it, else Products.
 *  A tab with no real home is not in the strip (COR-19; COR-49 in Preview as
 *  buyer), so an address naming one lands on Products. */
export function resolveTab(asked: ProjectTabId, shown: readonly ProjectTabId[]): ProjectTabId {
  return shown.includes(asked) ? asked : "products";
}

/** The query string after choosing `tab`, with every other parameter kept
 *  (`view=buyer` above all). Returned without the "?", like buyer-preview's
 *  withView; "" when nothing is left. */
export function withTab(search: string, tab: ProjectTabId): string {
  const params = new URLSearchParams(search);
  if (tab === "products") params.delete("tab");
  else params.set("tab", tab);
  return params.toString();
}

/** The record an address names: by id first, then by slug, so a hand-typed
 *  /projects/<slug> finds the same project (COR-1). */
export function resolveProject<T extends { id: string; slug: string }>(
  list: readonly T[],
  key: string,
): T | null {
  return list.find((p) => p.id === key) ?? list.find((p) => p.slug === key) ?? null;
}

/** "{project} · My projects · IDEEZA" (COR-3). */
export function projectDocTitle(project: string): string {
  return `${project} · My projects · IDEEZA`;
}

/** "{product} · {project} · IDEEZA": the product page's title (COR-3). */
export function productDocTitle(product: string, project: string): string {
  return `${product} · ${project} · IDEEZA`;
}
```

**3.2 Create `src/lib/ui/tab-keys.ts`:**
```ts
// The keyboard and scroll rules every tablist in the app shares (spec COR-20,
// COR-21): one Tab stop, the arrows move the selection and focus with it, Home
// and End jump to the ends. Extracted from review-outputs.tsx, where the build
// review's product and deliverable tabs first got it; the project page's
// Products · Media · Network strip and the product page's deliverable tabs use
// the same one. Every tab used to be its own Tab stop and the arrows did nothing.

import type { KeyboardEvent } from "react";

/** Where `key` moves the selection among `count` tabs, from `at`; null for a
 *  key tabs don't take. Wraps at both ends. */
export function nextTabIndex(key: string, at: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowRight" || key === "ArrowDown") return (at + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (((at - 1) % count) + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/** A tablist's onKeyDown. Each tab carries `data-tab={id}`; focus follows the
 *  selection on the next frame, once the new selection has rendered. */
export function moveTab<T extends string>(
  e: KeyboardEvent<HTMLElement>,
  ids: readonly T[],
  current: T,
  select: (id: T) => void,
): void {
  const next = nextTabIndex(e.key, ids.indexOf(current), ids.length);
  if (next === null) return;
  e.preventDefault();
  const list = e.currentTarget;
  const id = ids[next];
  select(id);
  requestAnimationFrame(() => list.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.focus());
}

/** How far to scroll a horizontal strip so `item` is wholly in view, `pad` px
 *  clear of the edge it crossed; 0 when it already is (COR-21). */
export function revealDelta(
  item: { left: number; right: number },
  view: { left: number; right: number },
  pad = 0,
): number {
  if (item.left < view.left + pad) return item.left - view.left - pad;
  if (item.right > view.right - pad) return item.right - view.right + pad;
  return 0;
}
```

**3.3 `src/components/create/review-outputs.tsx`.** Both call sites (`:336`, `:383`) stay as they are.

Add the import after the file's last import (`:55` today):
```tsx
import { OPEN_IN_EDITOR_ID } from "./anchors";
import { moveTab } from "@/lib/ui/tab-keys";
```

Delete the private copy, `:589-612` today. The exact block to remove:
```tsx
/** The tab pattern a tablist announces: one Tab stop (the selected tab), the
 *  arrows move the selection and focus with it, Home and End jump to the
 *  ends. Every tab used to be its own Tab stop and the arrows did nothing. */
function moveTab(
  e: React.KeyboardEvent<HTMLElement>,
  ids: string[],
  current: string,
  select: (id: string) => void,
) {
  const at = ids.indexOf(current);
  let next = -1;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (at + 1) % ids.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
    next = (at - 1 + ids.length) % ids.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = ids.length - 1;
  if (next < 0) return;
  e.preventDefault();
  const list = e.currentTarget;
  select(ids[next]);
  requestAnimationFrame(() =>
    list.querySelector<HTMLElement>(`[data-tab="${ids[next]}"]`)?.focus(),
  );
}

```
The shared version behaves the same:
- Its `ArrowLeft` formula gives the same index for every `at ≥ -1`.
- It returns early for an empty list, where the old one computed `NaN`.
- `T` infers `string` at the product switcher and `BuildItemKind` at the deliverable tabs. The existing `kind as BuildItemKind` there stays valid.

- [ ] **Step 4: Run. Expected: PASS**

```bash
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected:
- `project-route.test.mjs` reports 8 passing tests.
- Every earlier file still passes.
- The run ends with `# fail 0`.

- [ ] **Step 5: Browser check.** The build review's tabs must be unchanged.

On `http://localhost:3002`, open any chat whose build has finished: History → Project/Product Generations, then a ready build. Its review shows.
1. Press Tab until focus lands on the selected deliverable tab ("3D model"). Only that tab is a Tab stop.
2. Press → : "PCB" is selected and focused. Press End: "Parts". Press Home: "3D model". Press ←: "Parts" (it wraps).
3. On a multi-product build, the product switcher row above it does the same.

If this browser holds no finished build, skip this step. C1b's check exercises the same `moveTab` on the project page.

- [ ] **Step 6: tsc, eslint, commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
npx eslint src/lib/manual/project-route.ts src/lib/ui/tab-keys.ts src/components/create/review-outputs.tsx tests/projects/project-route.test.mjs
git add src/lib/manual/project-route.ts src/lib/ui/tab-keys.ts src/components/create/review-outputs.tsx tests/projects/project-route.test.mjs tests/projects/tsconfig.json
git commit -F - <<'EOF'
feat(projects): the project page's URL state, and one shared tab keyboard

project-route.ts holds the page's tab set (Products · Media · Network),
?tab= parsing with Products left out of the URL, the id-then-slug lookup and
both document titles. tab-keys.ts is the roving-tabindex rule the build
review already had, extracted so the project page and the product page use
the same one, plus the maths that scrolls a phone-width strip's tab into view.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task C1b: The shell, its states, the breadcrumb, the layout and the tab strip

**Requirements:**
- **ACT-2** — the page sits in the `(create)` shell, with "My projects" as the active nav item.
- **COR-1** — not found: `StateCard` and a token button.
- **COR-2** — loading: a skeleton in the final shape, `role="status"`, "Loading project"; no section flashes an empty state before the stores are read.
- **COR-3** — the document title, which follows a rename.
- **COR-4** — the breadcrumb:
  - links ≥ 24 px tall (44 px on touch);
  - the current crumb is plain text with `aria-current="page"`, truncated, with its `title`;
  - the product page's middle crumb collapses to "…".
- **COR-5** — the 1280 px cap and 16/32 px gutters; from a 1024 px page container, a fluid main column and a 360 px rail 28 px apart; a container query.
- **COR-6** — tokens only in every new file.
- **COR-7** — on arrival the h1 takes focus and a polite region says "{project}"; the tab is URL state.
- **COR-19** — the strip lists only tabs with a real home.
- **COR-20** — ARIA tablist, roving tabindex, ←/→/Home/End, one `tabpanel`, neutral selection, a history entry per tab, ≥ 36 px (44 on touch).
- **COR-21** — one row that scrolls and never wraps; the selected tab is scrolled into view.
- **COR-54 / COR-56** (the frame only):
  - one rail surface with hairlines and an h2 per block, not sticky;
  - below 1024 px the blocks follow the panel in rail order, each a disclosure closed by default;
  - in the rail they are always open.
- **COR-79** — the shell renders no LATER state.
- **COR-86** — the page reads builds through `projectView().refs`, never `project.buildId` alone.
- **COR-99** — the landmarks: the breadcrumb `nav`, `main` (the layout's), the rail `aside` labelled "Project record", and an h2 per rail block.
- **PPL-2** — every slot renders from one `SlotProps`, `viewer` included.
- **§5.13 verification, "a legacy project"** — a project with no `builds`, no slug and id-less products renders the same page, with its ids given once (A1).

**Files:**
- Create in `src/components/projects/details/`:
  - `slots.ts` — the slot contract;
  - `frame.tsx` — the page container, `ProjectFrame`, `RAIL_SURFACE`, `RailBlock`;
  - `breadcrumb.tsx`;
  - `tab-strip.tsx`;
  - `arrival.tsx` — `usePageArrival`, `LiveRegion`;
  - `page-states.tsx` — `ProjectSkeleton`, `ProjectNotFound`;
  - `shell.tsx` — `ProjectShell`;
  - `legacy.tsx` — today's sections, moved, as interim slot fillers;
  - `project-page.tsx` — `ProjectPage`, the stores and `SLOTS`.
- Modify `src/app/(create)/projects/[id]/page.tsx`, the whole file (`:1-15`).
- Modify `src/components/ideeza/state-card.tsx`:
  - `:6-20`, the props: add `titleAs` and `titleRef`;
  - `:39`, the title element.
- Delete `src/components/projects/project-details.tsx` (`:1-542`). Its sections move to `legacy.tsx`. Its private `conceptOf` (`:521-542`) is already exported from `project-read.ts` by A2.
- Test: no new `node:test` file. This half is React components; its pure logic was tested in C1a. The red/green here is `tsc` (Steps 1–4), then the browser check (Step 5).

`STRUCTURE.md` and `CLAUDE.md` (§3/§5, now `docs/guides/app-map.md` and `docs/guides/features/platform-and-projects.md`) are C9d's. That task's docs line should name `projects/details/`, the shell and its slots, in place of `project-details`.

**Interfaces:**
- Consumes (exact):
  - **A1** `src/lib/manual/projects.tsx`:
    - `type ManualProject`, normalized: products carry `id`, slug backfilled;
    - `useManualProjects(): { hydrated; projects; selectProject; … }`;
    - `stepHref(project, step)`;
    - `STEP_LABELS`, `FLOW_STEPS`, `completedCount(p)`, `productLabel(p)`, which are existing and unchanged.
  - **A2** `src/lib/manual/project-read.ts`:
    - `type BuildRef`, `type ProjectView`;
    - `projectView(p: ManualProject, ctx: { builds: BuildJob[]; chats: ChatSession[]; brief: StoredDraft | null; videoJobs: VideoJob[]; now: number }): ProjectView`;
    - `resumeStepOf(p: ManualProject): ProjectStep`;
    - `conceptOf(chat: ChatSession | null | undefined, build: BuildJob, product: BuildProduct): ConceptSummary | undefined`.
  - **A3** `src/lib/manual/project-summary.ts`: `formatDateTime(at: number): string`. It is used only by the interim Details rows.
  - **A4a** `src/lib/brief/project-brief.ts`:
    - `type StoredDraft`;
    - `useProjectBrief(projectId: string): StoredDraft | null | undefined`, where `undefined` means not read yet.
  - **A4b** `src/lib/manual/permissions.ts`: `type Viewer = { kind: "local-owner" } | { kind: "owner-preview" }`.
  - **C1a**: `parseProjectTab`, `resolveTab`, `withTab`, `resolveProject`, `projectDocTitle`, `PROJECT_TABS`, `PROJECT_TAB_LABEL`, `type ProjectTabId`, `moveTab`, `revealDelta`.
  - Existing, unchanged:
    - `useCreateHistory(): { hydrated; builds; chats; … }`;
    - `useVideoJobs(): { hydrated; jobs; … }`;
    - `NetworkSection({ project, build })`;
    - `StateCard`, `buttonVariants` (`@/components/ideeza`);
    - `Icon`;
    - `bomFor`, `bookedSpec`, `partChangesOf`, `partChangesText`, `specOfSource`;
    - `specLine`;
    - `ITEM_LABELS`, `ITEM_SUBTITLES`, `productsOf`.
- Produces:
```ts
// src/components/projects/details/slots.ts — the contract C2–C8 fill
export type SlotProps = {
  project: ManualProject;
  view: ProjectView;                   // the one derivation (COR-74)
  viewer: Viewer;                      // PPL-1; owner-only controls ask can(viewer, …)
  brief: StoredDraft | null;           // already read; the page waits for it (COR-2)
  now: number;                         // the minute clock `view` was derived at
  announce: (message: string) => void; // the page's one polite live region (COR-101)
};
export type HeaderSlotProps = SlotProps & { titleRef: React.RefObject<HTMLHeadingElement | null> };
export type PanelSlot = React.ComponentType<SlotProps>;
export const RAIL_ORDER: readonly ["outcome", "editor", "details", "versions", "log", "manage"];
export type RailBlockId = (typeof RAIL_ORDER)[number];
export type ProjectSlots = {
  banner?: React.ComponentType<SlotProps>;                 // above the breadcrumb (PPL-5)
  header: React.ComponentType<HeaderSlotProps>;            // breadcrumb → tab strip (COR-8…18)
  tabs: { products: PanelSlot; media?: PanelSlot; network?: PanelSlot };
  rail: Partial<Record<RailBlockId, React.ComponentType<SlotProps>>>;
};

// frame.tsx
export const PAGE_CONTAINER: string;   // "[container-type:inline-size]": the container queries read it
export const PAGE_CONTENT: string;     // the 1280 px cap and the 16 / 32 px gutters
export const RAIL_SURFACE: string;
export function ProjectFrame(p: { banner?: React.ReactNode; breadcrumb: React.ReactNode; main: React.ReactNode; rail?: React.ReactNode }): React.JSX.Element;
export function RailBlock(p: { id: string; title: string; summary?: string; collapsible?: boolean; children: React.ReactNode }): React.JSX.Element;

// breadcrumb.tsx
export type Crumb = { label: string; href?: string };
export function Breadcrumb(p: { trail: readonly Crumb[] }): React.JSX.Element;

// tab-strip.tsx
export function TabStrip(p: { tabs: readonly ProjectTabId[]; active: ProjectTabId; onSelect: (id: ProjectTabId) => void }): React.JSX.Element;
// tabs are id="tab-{id}", the one panel is id="panel-{id}" (the ids C6's NetworkTab chose)

// arrival.tsx
export function usePageArrival(key: string, name: string, title: string): {
  titleRef: React.RefObject<HTMLHeadingElement | null>; live: string; announce: (message: string) => void;
};
export function LiveRegion(p: { text: string }): React.JSX.Element;

// page-states.tsx
export function ProjectSkeleton(): React.JSX.Element;
export function ProjectNotFound(p: { id: string }): React.JSX.Element;

// shell.tsx
export function ProjectShell(p: {
  project: ManualProject; view: ProjectView; viewer: Viewer; brief: StoredDraft | null; now: number;
  asked: ProjectTabId; hiddenTabs: readonly ProjectTabId[]; slots: ProjectSlots;
}): React.JSX.Element;

// project-page.tsx
export function ProjectPage(p: { id: string }): React.JSX.Element;

// src/components/ideeza/state-card.tsx (additive)
//   titleAs?: "p" | "h1"   (default "p")
//   titleRef?: React.Ref<HTMLHeadingElement>   (with "h1"; the h1 takes tabIndex -1)
```

**Decisions (each stated once, so the merge doesn't read them as gaps):**
1. **Tab changes use Next's router-integrated `window.history.pushState`, not `router.push`.** COR-20 asks for a push so that Back returns to the previous tab. The pushState form gives exactly that:
   - `useSearchParams` follows it (`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`, "Native History API");
   - it skips a server round trip for a page whose server half ignores the query;
   - it doesn't re-render the route's metadata over the title the page set.
2. **The container query measures `main`'s width, not the padded content box** (§7 X6). `PAGE_CONTAINER` is an unpadded wrapper as wide as `main`, so 1366 px with the sidebar open (1086 px) keeps the rail.
3. **The rail blocks switch mode by the same container query, not by JS.** A block's h2 holds both:
   - a plain title, shown from 1024 px;
   - a disclosure button, shown below.

   Its body is hidden only below 1024 px while closed. Nothing renders twice, and the hidden variant is out of the accessibility tree (`display: none`).
4. **The viewer is resolved inline in `project-page.tsx`,** as `?view=buyer` → `owner-preview`. C6 replaces those two lines with its `useViewer()` (see Hand-off). Tab visibility that needs a hook (COR-49's "no network in preview") comes in through `hiddenTabs`, computed in `project-page.tsx` where hooks can run. It is not a predicate on the slot.
5. **`legacy.tsx` keeps today's page on screen while C2–C8 land** ("each step leaves the app working"). It is today's code, moved, with two changes the data layer forces:
   - "the" build is the newest one in `view.refs`, where the old page read `project.buildId` alone (COR-86);
   - Open in editor resumes `resumeStepOf()`.

   Dates use A3's `formatDateTime`. Its raw `bg-violet-600`, "Done / Not started" and uppercase pills are today's, and go with the task that replaces each piece.
6. **Arbitrary px appear only where the scale has no token.**
   - Layout sizes: the 1280 px cap, the 360 px rail, the container thresholds, 36 px tab height, 24 px link height.
   - The 28 px gap is `calc(var(--spacing-7)*2)`.
   - Spacing, type, radius, colour and motion are all tokens.
7. **The skeleton is also the Suspense fallback** that `useSearchParams` needs, and it is what the server renders, since the stores haven't hydrated there. The page therefore never changes shape at hydration.

- [ ] **Step 1: Write the failing check.** The route asks for the new entry point first.

Replace `src/app/(create)/projects/[id]/page.tsx` (`:1-15`) with:
```tsx
// /projects/[id] — one project's page. A thin server wrapper: the id is
// resolved against the ManualProjects store inside ProjectPage, which shows the
// loading skeleton until every store is read, a not-found state when nothing
// matches, and otherwise the page's shell (spec §5.3).

import type { Metadata } from "next";
import * as React from "react";
import { ProjectPage } from "@/components/projects/details/project-page";

// Before the store is read the page can't know the project's name; the client
// sets "{project} · My projects · IDEEZA" once it does (COR-3).
export const metadata: Metadata = { title: "My projects · IDEEZA" };

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectPage id={id} />;
}
```

- [ ] **Step 2: Run it. Expected: FAIL**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
```
Expected:
```
src/app/(create)/projects/[id]/page.tsx(8,29): error TS2307: Cannot find module '@/components/projects/details/project-page' or its corresponding type declarations.
```

- [ ] **Step 3: Implement**

**3.1 `src/components/ideeza/state-card.tsx`.**

Replace `:6-20`:
```tsx
export function StateCard({
  tone,
  icon,
  title,
  body,
  action,
  className,
}: {
  tone: "empty" | "error";
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
```
with:
```tsx
export function StateCard({
  tone,
  icon,
  title,
  body,
  action,
  className,
  titleAs = "p",
  titleRef,
}: {
  tone: "empty" | "error";
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
  /** "h1" when the card is the whole page (a not-found state), so the page
   *  keeps its one h1. */
  titleAs?: "p" | "h1";
  /** With titleAs="h1": the page moves focus to the title on arrival, so the
   *  h1 takes tabIndex -1. */
  titleRef?: React.Ref<HTMLHeadingElement>;
}) {
  const titleClass = "text-3xl font-semibold leading-3xl tracking-slight text-text-primary";
```

Replace `:39`:
```tsx
        <p className="text-3xl font-semibold leading-3xl tracking-slight text-text-primary">{title}</p>
```
with:
```tsx
        {titleAs === "h1" ? (
          <h1 ref={titleRef} tabIndex={-1} className={cn(titleClass, "outline-none")}>
            {title}
          </h1>
        ) : (
          <p className={titleClass}>{title}</p>
        )}
```
Both existing callers (`model-states.tsx:41`, `:57`) pass neither prop and render as before.

**3.2 Create `src/components/projects/details/slots.ts`:**
```ts
// The project page's slots (spec §5.3, §5.5). The shell (./shell.tsx) owns the
// frame every state shares: the breadcrumb, the layout, route focus, the title,
// the tab strip and its URL, and the rail's order. Each section of the page is
// a component plugged in through ProjectSlots, in project-page.tsx's SLOTS.
// Every slot renders from the same SlotProps, so the owner's page and Preview
// as buyer are one tree and can't drift apart (PPL-2).

import type * as React from "react";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { Viewer } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import type { ManualProject } from "@/lib/manual/projects";

/** What every slot is rendered with. */
export type SlotProps = {
  project: ManualProject;
  /** The one derivation (COR-74): refs, lineages, products, versions, pending,
   *  log, summary and commerce. No slot derives project state of its own. */
  view: ProjectView;
  /** Who is looking (PPL-1). Owner-only controls ask can(viewer, …); in Preview
   *  as buyer they are absent, not disabled (PPL-6). */
  viewer: Viewer;
  /** The project's Brief draft, already read: the page shows its skeleton
   *  until it is (COR-2). */
  brief: StoredDraft | null;
  /** The minute clock `view` was derived at. */
  now: number;
  /** Says `message` in the page's one polite live region (COR-101): a rename,
   *  showcasing, a save. */
  announce: (message: string) => void;
};

/** The header also gets the h1's ref. Put it on the h1 with tabIndex={-1} and
 *  outline-none; the shell focuses it on arrival (COR-7). */
export type HeaderSlotProps = SlotProps & {
  titleRef: React.RefObject<HTMLHeadingElement | null>;
};

/** A tab panel's body. The shell draws the tabpanel element around it (and its
 *  20 px under the strip); a panel starts with its own h2 (COR-99) and never
 *  renders role="tabpanel" itself. */
export type PanelSlot = React.ComponentType<SlotProps>;

/** The rail's blocks, in order (COR-54). NEXT: "businessPlan" goes after "outcome". */
export const RAIL_ORDER = ["outcome", "editor", "details", "versions", "log", "manage"] as const;
export type RailBlockId = (typeof RAIL_ORDER)[number];

export type ProjectSlots = {
  /** First in the content, above the breadcrumb: the Preview-as-buyer banner (PPL-5). */
  banner?: React.ComponentType<SlotProps>;
  /** Everything between the breadcrumb and the tab strip (COR-8…18, CNT-1…7). */
  header: React.ComponentType<HeaderSlotProps>;
  /** One panel per tab (COR-19). A tab without a panel is not in the strip. */
  tabs: { products: PanelSlot; media?: PanelSlot; network?: PanelSlot };
  /** Rendered in RAIL_ORDER inside the rail surface. Each block wraps itself in
   *  <RailBlock>; a block with nothing real in it returns null, which leaves no
   *  divider behind (COR-54). */
  rail: Partial<Record<RailBlockId, React.ComponentType<SlotProps>>>;
};
```

**3.3 Create `src/components/projects/details/frame.tsx`:**
```tsx
"use client";

// The page's frame (spec COR-5, COR-54, COR-56): the page container that the
// layout's container queries read, the two columns, the rail's one surface and
// one rail block. The skeleton draws the same frame, so the page never changes
// shape when the stores arrive (COR-2).

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";

/** The page container: as wide as `main`, and that width is what the container
 *  queries measure (§7 X6). At 1366 px with the sidebar open it is 1086 px, so
 *  the rail stays beside the tabs. */
export const PAGE_CONTAINER = "[container-type:inline-size]";

/** The content box: capped at 1280 px, 16 px gutters, 32 px from a 640 px page
 *  container (spacing tokens). */
export const PAGE_CONTENT =
  "mx-auto w-full max-w-[1280px] px-8 pb-24 pt-10 [@container(min-width:640px)]:px-16";

/** The rail's one surface: hairlines between blocks, no card in a card
 *  (COR-54). Stacked after the tab panel it is a hairline-topped run of blocks
 *  (COR-56); beside it, from a 1024 px page container, a bordered surface. */
export const RAIL_SURFACE =
  "min-w-0 divide-y divide-border border-t border-solid border-border [@container(min-width:1024px)]:rounded-2xl [@container(min-width:1024px)]:border [@container(min-width:1024px)]:bg-bg-surface";

export function ProjectFrame({
  banner,
  breadcrumb,
  main,
  rail,
}: {
  banner?: React.ReactNode;
  breadcrumb: React.ReactNode;
  main: React.ReactNode;
  rail?: React.ReactNode;
}) {
  return (
    <div className={PAGE_CONTAINER}>
      <div className={PAGE_CONTENT}>
        {banner}
        {breadcrumb}
        {/* One column; from a 1024 px page container a fluid main column
            (min-width 0) and the 360 px rail, 28 px apart (2 × --spacing-7),
            both top-aligned under the breadcrumb. The rail is not sticky: it
            is taller than the viewport. The Figma's fixed 633 / 482 split is
            not reproduced. */}
        <div className="mt-10 grid grid-cols-1 gap-y-16 [@container(min-width:1024px)]:grid-cols-[minmax(0,1fr)_360px] [@container(min-width:1024px)]:items-start [@container(min-width:1024px)]:gap-x-[calc(var(--spacing-7)*2)]">
          <div className="min-w-0">{main}</div>
          {rail}
        </div>
      </div>
    </div>
  );
}

/**
 * One rail block (COR-54, COR-56): a section under its own h2. Beside the tabs,
 * from a 1024 px page container, it is always open. Stacked under the tab
 * panel, it is a disclosure that stays closed until pressed. It is the same
 * element either way, switched by the container query, so nothing renders
 * twice and the hidden variant is out of the accessibility tree.
 *
 * - `summary` rides on the closed row: "Outcome · Listed · Showcased" (COM-55).
 * - `collapsible={false}` keeps a block open at every width: Manage, whose
 *   Delete is the last thing on the page at 400 px.
 */
export function RailBlock({
  id,
  title,
  summary,
  collapsible = true,
  children,
}: {
  id: string;
  title: string;
  summary?: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const headingId = `rail-${id}-heading`;
  const bodyId = `rail-${id}-body`;
  return (
    <section aria-labelledby={headingId} className="py-4 [@container(min-width:1024px)]:p-10">
      <h2 id={headingId} className="text-lg font-bold leading-lg text-text-primary">
        {collapsible ? (
          <>
            <span className="hidden [@container(min-width:1024px)]:inline">{title}</span>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((v) => !v)}
              className="flex min-h-[var(--touch-min)] w-full items-center justify-between gap-6 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus [@container(min-width:1024px)]:hidden"
            >
              <span className="min-w-0">
                {title}
                {summary ? (
                  <span className="font-medium text-text-secondary"> · {summary}</span>
                ) : null}
              </span>
              <span
                aria-hidden
                className={cn(
                  "inline-flex shrink-0 text-text-tertiary transition-transform duration-normal ease-out motion-reduce:transition-none",
                  open && "rotate-90",
                )}
              >
                <Icon icon={ArrowRight01Icon} size={18} />
              </span>
            </button>
          </>
        ) : (
          title
        )}
      </h2>
      <div
        id={bodyId}
        className={cn(
          "mt-6",
          collapsible && !open && "hidden [@container(min-width:1024px)]:block",
        )}
      >
        {children}
      </div>
    </section>
  );
}
```

**3.4 Create `src/components/projects/details/breadcrumb.tsx`:**
```tsx
// Breadcrumb (COR-4): "My projects › {project}", and on the product page
// "My projects › {project} › {product}".
// - Links are ≥ 24 px tall, 44 px on touch.
// - The last crumb is the page: plain text, aria-current, truncated with its
//   full name in `title`.
// - A crumb between the first and the last reads "…" below a 640 px page
//   container (§3.4), and keeps its name for assistive tech.
// It needs a PAGE_CONTAINER ancestor, which both pages have.

import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

export type Crumb = { label: string; href?: string };

const LINK =
  "inline-flex min-h-[24px] items-center rounded-sm font-medium text-text-secondary outline-none transition-colors duration-normal ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function Breadcrumb({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-3 text-sm leading-sm">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          const middle = i > 0 && !last;
          return (
            <li
              key={`${i}:${crumb.label}`}
              className={last ? "flex min-w-0 items-center gap-3" : "flex shrink-0 items-center gap-3"}
            >
              {i > 0 && (
                <span aria-hidden className="text-text-tertiary">
                  <Icon icon={ArrowRight01Icon} size={14} />
                </span>
              )}
              {last || !crumb.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  title={crumb.label}
                  className="truncate font-semibold text-text-primary"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} aria-label={middle ? crumb.label : undefined} className={LINK}>
                  {middle ? (
                    <>
                      <span className="hidden [@container(min-width:640px)]:inline">{crumb.label}</span>
                      <span aria-hidden className="[@container(min-width:640px)]:hidden">
                        …
                      </span>
                    </>
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

**3.5 Create `src/components/projects/details/tab-strip.tsx`:**
```tsx
"use client";

// The Products · Media · Network strip (COR-19, COR-20, COR-21).
// - It is an ARIA tablist with one Tab stop, the selected tab.
// - ←/→/Home/End go through the shared moveTab.
// - The selected style is neutral: the subtle fill plus a text-primary
//   underline, which is ≥ 3:1 where the fill alone isn't. Never violet.
// - It is one row that scrolls and never wraps, and a tab it has to scroll to
//   is brought into view.
// - The shell owns the URL and the one tabpanel: tabs are id="tab-{id}" and
//   the panel is id="panel-{id}".

import * as React from "react";
import { PROJECT_TAB_LABEL, type ProjectTabId } from "@/lib/manual/project-route";
import { moveTab, revealDelta } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";

const TAB =
  "inline-flex h-[36px] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-8 text-md font-semibold leading-md outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";

export function TabStrip({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly ProjectTabId[];
  active: ProjectTabId;
  onSelect: (id: ProjectTabId) => void;
}) {
  const stripRef = React.useRef<HTMLDivElement | null>(null);

  // COR-21: keep the selected tab in view when the strip is scrolled at phone
  // width, on arrival (a deep link to ?tab=network) and on every change. Only
  // the strip scrolls sideways; the page never moves.
  React.useEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!strip || !tab) return;
    const delta = revealDelta(tab.getBoundingClientRect(), strip.getBoundingClientRect(), 8);
    if (delta === 0) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollBy({ left: delta, behavior: still ? "auto" : "smooth" });
  }, [active]);

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label="Project sections"
      onKeyDown={(e) => moveTab(e, tabs, active, onSelect)}
      className="flex flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden border-b border-solid border-border"
    >
      {tabs.map((id) => {
        const on = id === active;
        return (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={on ? `panel-${id}` : undefined}
            tabIndex={on ? 0 : -1}
            data-tab={id}
            onClick={() => onSelect(id)}
            className={cn(TAB, on ? TAB_ON : TAB_OFF)}
          >
            {PROJECT_TAB_LABEL[id]}
          </button>
        );
      })}
    </div>
  );
}
```

**3.6 Create `src/components/projects/details/arrival.tsx`:**
```tsx
"use client";

// Route focus and the document title for a page that finds its record in the
// browser (COR-7, COR-3). The project page and the product page use it.

import * as React from "react";

/**
 * When `key` changes, which means arriving and not switching tab:
 * - focus moves to the h1 (give it `ref={titleRef}`, `tabIndex={-1}` and
 *   `outline-none`);
 * - the polite region says `name`.
 *
 * The document title follows `title`, a rename included, and the previous
 * title comes back on the way out. `announce` is the page's one polite voice
 * for everything after (COR-101). It speaks on the next frame, so a call from
 * an effect never sets state inside it. The same sentence twice gets a
 * zero-width space, so the region still changes and is read.
 */
export function usePageArrival(key: string, name: string, title: string) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  const [live, setLive] = React.useState("");

  const announce = React.useCallback((message: string) => {
    window.requestAnimationFrame(() =>
      setLive((prev) => (prev === message ? `${message}​` : message)),
    );
  }, []);

  const arrive = React.useEffectEvent(() => {
    titleRef.current?.focus({ preventScroll: true });
    announce(name);
  });
  React.useEffect(() => {
    arrive();
  }, [key]);

  React.useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return { titleRef, live, announce };
}

/** The page's one polite live region. It mounts empty, so whatever `announce`
 *  puts in it is a change, and gets read. */
export function LiveRegion({ text }: { text: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}
```

**3.7 Create `src/components/projects/details/page-states.tsx`:**
```tsx
"use client";

// The page's two states before there is a project to show (spec §5.3).
// - COR-2, loading: a skeleton in the page's final shape, inside the same
//   frame: header lines, the tab strip, two cards and the rail blocks. It is
//   also the Suspense fallback and what the server renders.
// - COR-1, not found: StateCard with today's honest body, and a token button
//   back to the list.

import * as React from "react";
import Link from "next/link";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { StateCard, buttonVariants } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { PAGE_CONTAINER, ProjectFrame, RAIL_SURFACE } from "./frame";

function Bone({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn("block rounded-md bg-bg-subtle motion-safe:animate-pulse", className)}
    />
  );
}

export function ProjectSkeleton() {
  return (
    <div role="status" aria-label="Loading project">
      <span className="sr-only">Loading project</span>
      <ProjectFrame
        breadcrumb={<Bone className="h-6 w-[180px]" />}
        main={
          <div aria-hidden>
            <Bone className="h-12 w-2/5" />
            <Bone className="mt-6 h-6 w-1/3" />
            <Bone className="mt-4 h-6 w-1/2" />
            <Bone className="mt-8 h-6 w-full max-w-[62ch]" />
            <Bone className="mt-3 h-6 w-4/5 max-w-[62ch]" />
            <div className="mt-16 flex items-end gap-2 border-b border-solid border-border">
              <Bone className="h-[36px] w-[96px] rounded-b-none" />
              <Bone className="h-[36px] w-[72px] rounded-b-none" />
              <Bone className="h-[36px] w-[88px] rounded-b-none" />
            </div>
            <div className="mt-10 grid grid-cols-1 gap-8 [@container(min-width:640px)]:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-2xl border border-solid border-border bg-bg-surface p-6">
                  <Bone className="aspect-[16/10] w-full rounded-lg" />
                  <Bone className="mt-6 h-8 w-3/5" />
                  <Bone className="mt-4 h-6 w-2/5" />
                </div>
              ))}
            </div>
          </div>
        }
        rail={
          <div aria-hidden className={RAIL_SURFACE}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="py-4 [@container(min-width:1024px)]:p-10">
                <Bone className="h-8 w-1/3" />
                <Bone className="mt-6 hidden h-6 w-full [@container(min-width:1024px)]:block" />
                <Bone className="mt-3 hidden h-6 w-3/4 [@container(min-width:1024px)]:block" />
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
}

export function ProjectNotFound({ id }: { id: string }) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  // The card is the whole page, so its title is the h1 that route focus lands
  // on (COR-7).
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [id]);
  return (
    <div className={PAGE_CONTAINER}>
      <div className="flex justify-center px-8 py-40">
        <StateCard
          tone="empty"
          titleAs="h1"
          titleRef={titleRef}
          icon={<Icon icon={HelpCircleIcon} size={32} />}
          title="We couldn't find this project"
          body={`Nothing in this browser matches ${id}. It may have been deleted, or saved in a different browser.`}
          action={
            <Link
              href="/projects"
              // The reset colours every a:hover as a link; the page's one
              // button keeps its own text colour.
              className={cn(
                buttonVariants({ hierarchy: "primary", size: "lg" }),
                "hover:text-[color:var(--color-button-primary-text)]",
              )}
            >
              Back to My projects
            </Link>
          }
        />
      </div>
    </div>
  );
}
```

**3.8 Create `src/components/projects/details/shell.tsx`:**
```tsx
"use client";

// ProjectShell is the frame every state of /projects/[id] shares once the
// project is known (spec §5.3, §5.5). It owns:
// - the breadcrumb;
// - the page container and its two columns;
// - route focus and the document title;
// - the one polite live region;
// - the Products · Media · Network strip and its URL;
// - the rail, in its order.
// What fills it comes in as slots (./slots.ts), all rendered from the same
// props, so the owner's page and Preview as buyer are one tree (PPL-2).

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { Viewer } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import {
  PROJECT_TABS,
  projectDocTitle,
  resolveTab,
  withTab,
  type ProjectTabId,
} from "@/lib/manual/project-route";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { LiveRegion, usePageArrival } from "./arrival";
import { Breadcrumb } from "./breadcrumb";
import { ProjectFrame, RAIL_SURFACE } from "./frame";
import { RAIL_ORDER, type ProjectSlots, type SlotProps } from "./slots";
import { TabStrip } from "./tab-strip";

export function ProjectShell({
  project,
  view,
  viewer,
  brief,
  now,
  asked,
  hiddenTabs,
  slots,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  brief: StoredDraft | null;
  now: number;
  /** The tab the address asks for (`?tab=`). */
  asked: ProjectTabId;
  /** Tabs with a panel but nothing real to show to this viewer (COR-49). */
  hiddenTabs: readonly ProjectTabId[];
  slots: ProjectSlots;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  // COR-7 on arriving at a project (not on changing tab), and COR-3,
  // following a rename at once.
  const { titleRef, live, announce } = usePageArrival(
    project.id,
    project.name,
    projectDocTitle(project.name),
  );

  const props = React.useMemo<SlotProps>(
    () => ({ project, view, viewer, brief, now, announce }),
    [project, view, viewer, brief, now, announce],
  );

  // COR-19: only tabs with a real home, in strip order.
  const shown = PROJECT_TABS.filter(
    (id) => slots.tabs[id] !== undefined && !hiddenTabs.includes(id),
  );
  const active = resolveTab(asked, shown);
  const Panel = slots.tabs[active] ?? slots.tabs.products;
  const Header = slots.header;
  const Banner = slots.banner;

  // COR-20: a history entry per tab, so Back returns to the previous one.
  // Next's router-integrated pushState: useSearchParams follows it, with no
  // server round trip, and `?view=buyer` rides along.
  const select = (id: ProjectTabId) => {
    if (id === active) return;
    const qs = withTab(search.toString(), id);
    window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <>
      <ProjectFrame
        banner={Banner ? <Banner {...props} /> : null}
        breadcrumb={
          <Breadcrumb trail={[{ label: "My projects", href: "/projects" }, { label: project.name }]} />
        }
        main={
          <>
            <Header {...props} titleRef={titleRef} />
            <div className="mt-16">
              <TabStrip tabs={shown} active={active} onSelect={select} />
              <div
                id={`panel-${active}`}
                role="tabpanel"
                aria-labelledby={`tab-${active}`}
                tabIndex={0}
                className="rounded-lg pt-10 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Panel {...props} />
              </div>
            </div>
          </>
        }
        rail={
          // COR-99: the rail landmark. `empty:hidden` drops the surface when
          // every block is absent.
          <aside aria-label="Project record" className={cn(RAIL_SURFACE, "empty:hidden")}>
            {RAIL_ORDER.map((id) => {
              const Block = slots.rail[id];
              return Block ? <Block key={id} {...props} /> : null;
            })}
          </aside>
        }
      />
      <LiveRegion text={live} />
    </>
  );
}
```

**3.9 Create `src/components/projects/details/legacy.tsx`.** These are today's sections, moved from `project-details.tsx`:
```tsx
"use client";

// Interim sections: today's project page (project-details.tsx before Task C1),
// moved here when the page became a shell with slots, so the page keeps
// showing all it did while the real slots land. Each fills one slot in
// project-page.tsx until its task replaces it, and that task deletes it here:
//   LegacyHeader                           → the header task (§5.4)
//   LegacyProducts                         → the Products tab task (§5.6)
//   LegacyNetwork                          → the Network tab task (§5.9, C6)
//   LegacyEditorBlock, LegacyDetailsBlock  → the rail task (§5.10)
// The task that removes the last export deletes this file.
//
// Changes from the old page, each forced by the data layer:
// - "the" build is the newest one the project holds; the old page read
//   `project.buildId` alone (COR-86);
// - Open in editor resumes `resumeStepOf()`;
// - dates use the one formatter (A3's formatDateTime).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  CheckmarkBadge01Icon,
  CpuIcon,
  File01Icon,
  HelpCircleIcon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { NetworkSection } from "@/components/network/network-section";
import {
  bomFor,
  bookedSpec,
  partChangesOf,
  partChangesText,
  specOfSource,
} from "@/lib/create/build-artifacts";
import {
  ITEM_LABELS,
  ITEM_SUBTITLES,
  productsOf,
  useCreateHistory,
  type BuildItem,
  type BuildJob,
} from "@/lib/create/history";
import { conceptOf, resumeStepOf, type ProjectView } from "@/lib/manual/project-read";
import { formatDateTime } from "@/lib/manual/project-summary";
import {
  FLOW_STEPS,
  STEP_LABELS,
  completedCount,
  productLabel,
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import { specLine } from "@/lib/spec/format";
import { RailBlock } from "./frame";
import type { HeaderSlotProps, SlotProps } from "./slots";

/** The newest build this project holds that is still in this browser. */
function legacyBuild(view: ProjectView): BuildJob | null {
  let newest: BuildJob | null = null;
  for (const ref of view.refs) {
    if (ref.job && (!newest || ref.job.createdAt > newest.createdAt)) newest = ref.job;
  }
  return newest;
}

export function LegacyHeader({ project, view, titleRef }: HeaderSlotProps) {
  const router = useRouter();
  const { selectProject } = useManualProjects();
  const { chats } = useCreateHistory();
  const build = legacyBuild(view);

  // Each product the maker changed on the spec sheet before it was built,
  // and how. The description above is the concept's, written before any
  // edit, so a buzzer taken out still "beeps when dry" there (e2e #2).
  const changes = React.useMemo(() => {
    if (!build) return [];
    const chat = chats.find((c) => c.id === build.chatId);
    return productsOf(build).flatMap((p) => {
      const concept = conceptOf(chat, build, p);
      const c = concept ? partChangesOf(p, concept) : null;
      return c ? [{ id: p.id, name: p.name, text: partChangesText(c) }] : [];
    });
  }, [build, chats]);

  const open = () => {
    selectProject(project.id);
    router.push(stepHref(project, resumeStepOf(project)));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-[12px]">
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight text-text-primary outline-none"
        >
          {project.name}
        </h1>
        <StatusBadge status={project.status} />
        <button
          type="button"
          onClick={open}
          className="ml-auto inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-violet-600 px-[16px] text-sm font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={CpuIcon} size={18} />
          Open in editor
        </button>
      </div>
      <p className="mt-[6px] text-sm text-text-secondary">
        Product:{" "}
        <span className="font-semibold text-text-primary">{productLabel(project)}</span>
      </p>

      {build && (
        <ul role="list" aria-label="What each product is" className="mt-[6px] flex flex-col gap-[2px]">
          {productsOf(build).map((p) => (
            <li key={p.id} className="text-sm text-text-secondary">
              {specLine(p.name, specOfSource(p))}
              {/* A build that predates spec booking has this number worked
                  out from its parts just now, not a decision the maker made
                  at booking time (Minor 10). */}
              {!bookedSpec(p) ? " · worked out from the parts" : ""}
            </li>
          ))}
        </ul>
      )}

      {build?.conceptImageUrl && (
        <div className="mt-[18px] overflow-hidden rounded-[12px] border border-border bg-bg-surface-raised">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={build.conceptImageUrl}
            alt={`Concept image for ${project.name}`}
            className="block max-h-[360px] w-full object-cover"
          />
        </div>
      )}

      <p className="mt-[18px] max-w-[68ch] text-sm leading-relaxed text-text-secondary">
        {project.description || "No description yet."}
      </p>
      {changes.length > 0 && (
        <ul role="list" aria-label="Part changes" className="mt-[8px] flex max-w-[68ch] flex-col gap-[4px]">
          {changes.map((c) => (
            <li key={c.id} className="text-sm leading-relaxed text-text-secondary">
              {/* One product needs no name; in a system the line says which
                  of them it is about. */}
              {build && productsOf(build).length > 1 ? (
                <>
                  <span className="font-semibold text-text-primary">{c.name}</span> — built
                  with your part changes: {c.text}
                </>
              ) : (
                <>Built with your part changes: {c.text}</>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LegacyProducts({ view }: SlotProps) {
  const build = legacyBuild(view);
  return (
    <section aria-labelledby="deliverables-heading">
      <h2 id="deliverables-heading" className="text-lg font-bold text-text-primary">
        Build deliverables
      </h2>
      {build ? (
        <Deliverables build={build} />
      ) : view.refs.length > 0 ? (
        <EmptyNote
          icon={HelpCircleIcon}
          title="The build behind this project is gone"
          body="This project was saved from an AI build, but that build is no longer in this browser's history — its deliverables can't be shown."
        />
      ) : (
        <EmptyNote
          icon={PencilEdit01Icon}
          title="Started by hand"
          body="This project wasn't generated from a concept, so there are no AI deliverables to review. Everything is authored in the editor modules."
        />
      )}
    </section>
  );
}

export function LegacyNetwork({ project, view }: SlotProps) {
  return <NetworkSection project={project} build={legacyBuild(view)} />;
}

export function LegacyEditorBlock({ project }: SlotProps) {
  const { selectProject } = useManualProjects();
  const done = completedCount(project);
  const summary = `${done} of ${FLOW_STEPS.length} steps complete`;
  return (
    <RailBlock id="editor" title="Editor progress" summary={summary}>
      <p className="text-sm tabular-nums text-text-secondary">{summary}</p>
      <ul role="list" className="mt-[14px] flex flex-col gap-[6px]">
        {FLOW_STEPS.map((step) => {
          const stepDone = project.flowState[step];
          return (
            <li key={step}>
              <Link
                href={stepHref(project, step)}
                onClick={() => selectProject(project.id)}
                className="flex items-center gap-[12px] rounded-lg border border-border bg-bg-surface px-[14px] py-[10px] outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span aria-hidden className={stepDone ? "text-text-success" : "text-text-tertiary"}>
                  <Icon icon={stepDone ? CheckmarkBadge01Icon : File01Icon} size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-md font-medium text-text-primary">
                  {STEP_LABELS[step]}
                </span>
                <span className="shrink-0 text-2xs font-bold uppercase tracking-wider text-text-tertiary">
                  {stepDone ? "Done" : "Not started"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </RailBlock>
  );
}

export function LegacyDetailsBlock({ project, view }: SlotProps) {
  const build = legacyBuild(view);
  return (
    <RailBlock id="details" title="Details">
      <dl className="flex flex-col gap-[14px] text-sm">
        <Row label="Status">{project.status === "completed" ? "Completed" : "Draft"}</Row>
        <Row label="Product">{productLabel(project)}</Row>
        <Row label="Created">{formatDateTime(project.createdAt)}</Row>
        <Row label="Last updated">{formatDateTime(project.updatedAt)}</Row>
        <Row label="Address">
          <span className="font-mono text-xs">/{project.slug}</span>
        </Row>
        <Row label="Source">
          {build ? (
            <Link
              href={`/build/${build.id}`}
              className="inline-flex items-center gap-[4px] rounded-sm font-semibold text-text-brand no-underline outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              AI build
              <Icon icon={ArrowUpRight01Icon} size={14} />
            </Link>
          ) : view.refs.length > 0 ? (
            "AI build · not in this browser"
          ) : (
            "Built manually"
          )}
        </Row>
      </dl>
    </RailBlock>
  );
}

// ───────────────────────── deliverables ─────────────────────────

function Deliverables({ build }: { build: BuildJob }) {
  const bom = React.useMemo(() => bomFor(build), [build]);

  return (
    <>
      <p className="mt-[6px] text-sm text-text-secondary">
        Saved from the build of{" "}
        <span className="font-semibold text-text-primary">{build.title}</span> —{" "}
        {bom.unique} unique {bom.unique === 1 ? "part" : "parts"}, {bom.units}{" "}
        {bom.units === 1 ? "unit" : "units"} in the bill of materials.
      </p>

      <ul role="list" className="mt-[14px] flex flex-col gap-[8px]">
        {build.items.map((item) => {
          const content = (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-semibold text-text-primary">
                  {ITEM_LABELS[item.kind]}
                </p>
                <p className="mt-[2px] truncate text-sm text-text-tertiary">
                  {ITEM_SUBTITLES[item.kind]}
                </p>
              </div>
              <ItemStatus item={item} />
            </>
          );
          return (
            <li key={item.kind}>
              {item.status === "skipped" ? (
                <div className="flex items-center gap-[14px] rounded-xl border border-border bg-bg-surface p-[14px] opacity-70">
                  {content}
                </div>
              ) : (
                <Link
                  href={`/build/${build.id}?tab=${item.kind}`}
                  className="flex items-center gap-[14px] rounded-xl border border-border bg-bg-surface p-[14px] outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {content}
                  <span aria-hidden className="shrink-0 text-text-tertiary">
                    <Icon icon={ArrowRight01Icon} size={18} />
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
        <Link
          href={`/build/${build.id}`}
          className="inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Open the build
          <Icon icon={ArrowUpRight01Icon} size={16} />
        </Link>
        <Link
          href={`/build/${build.id}?tab=parts`}
          className="inline-flex h-[36px] items-center gap-[8px] rounded-lg border border-border bg-bg-surface px-[14px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:border-border-strong focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Bill of materials
          <Icon icon={ArrowUpRight01Icon} size={16} />
        </Link>
      </div>
    </>
  );
}

function ItemStatus({ item }: { item: BuildItem }) {
  const pill =
    "inline-flex h-[26px] shrink-0 items-center gap-[6px] rounded-full px-[10px] text-2xs font-bold uppercase tracking-wider";
  if (item.status === "ready") {
    return (
      <span className={`${pill} bg-bg-success-subtle text-text-success`}>
        <Icon icon={CheckmarkBadge01Icon} size={13} />
        Ready
      </span>
    );
  }
  if (item.status === "failed") {
    return (
      <span className={`${pill} bg-bg-error-subtle text-text-error`}>
        <Icon icon={AlertCircleIcon} size={13} />
        Failed
      </span>
    );
  }
  if (item.status === "skipped") {
    return <span className={`${pill} bg-bg-surface-raised text-text-tertiary`}>Not produced</span>;
  }
  return (
    <span className={`${pill} bg-bg-brand-subtle text-text-brand tabular-nums`}>
      <Icon icon={ActivityIcon} size={13} />
      {Math.round(item.progress)}%
    </span>
  );
}

// ───────────────────────── pieces ─────────────────────────

function StatusBadge({ status }: { status: ManualProject["status"] }) {
  const completed = status === "completed";
  return (
    <span
      className={[
        "inline-flex h-[26px] items-center gap-[6px] rounded-full px-[12px] text-2xs font-bold uppercase tracking-wide",
        completed ? "bg-bg-success-subtle text-text-success" : "bg-bg-brand-subtle text-text-brand",
      ].join(" ")}
    >
      <Icon icon={completed ? CheckmarkBadge01Icon : PencilEdit01Icon} size={13} />
      {completed ? "Completed" : "Draft"}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-[16px]">
      <dt className="shrink-0 font-medium text-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text-primary">{children}</dd>
    </div>
  );
}

function EmptyNote({ icon, title, body }: { icon: IconValue; title: string; body: string }) {
  return (
    <div className="mt-[14px] flex flex-col items-center gap-[8px] rounded-[12px] border border-dashed border-border px-[24px] py-[36px] text-center">
      <span
        aria-hidden
        className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-full bg-bg-surface-raised text-text-tertiary"
      >
        <Icon icon={icon} size={18} />
      </span>
      <p className="text-md font-semibold text-text-primary">{title}</p>
      <p className="max-w-[420px] text-sm text-text-secondary">{body}</p>
    </div>
  );
}
```

**3.10 Create `src/components/projects/details/project-page.tsx`:**
```tsx
"use client";

// ProjectPage is /projects/[id] (spec §5.3).
// - It reads the four stores the page derives from: projects, history, video
//   jobs and the project's Brief draft.
// - It resolves the address to a project, by id and then by slug.
// - It shows one of three states: the skeleton until every read is in
//   (COR-2), not found (COR-1), or the shell with SLOTS.
// - `?tab=` and `?view=buyer` are URL state, so a reload and Back keep them
//   (COR-7, PPL-5).
//
// SLOTS is the one place the page is composed. Each later page task swaps its
// entry for the real section (see task-C1.md, "Hand-off"). A section written
// with its own props mounts through a one-line adapter component here.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useProjectBrief } from "@/lib/brief/project-brief";
import { useCreateHistory } from "@/lib/create/history";
import type { Viewer } from "@/lib/manual/permissions";
import { projectView } from "@/lib/manual/project-read";
import {
  parseProjectTab,
  resolveProject,
  type ProjectTabId,
} from "@/lib/manual/project-route";
import { useManualProjects } from "@/lib/manual/projects";
import {
  LegacyDetailsBlock,
  LegacyEditorBlock,
  LegacyHeader,
  LegacyNetwork,
  LegacyProducts,
} from "./legacy";
import { ProjectNotFound, ProjectSkeleton } from "./page-states";
import { ProjectShell } from "./shell";
import type { ProjectSlots } from "./slots";

const SLOTS: ProjectSlots = {
  header: LegacyHeader,
  tabs: {
    products: LegacyProducts,
    network: LegacyNetwork,
  },
  rail: {
    editor: LegacyEditorBlock,
    details: LegacyDetailsBlock,
  },
};

const NO_HIDDEN_TABS: readonly ProjectTabId[] = [];

export function ProjectPage({ id }: { id: string }) {
  // useSearchParams needs a boundary so the route can still be pre-rendered.
  // Its fallback is the same skeleton, so nothing changes shape at hydration.
  return (
    <React.Suspense fallback={<ProjectSkeleton />}>
      <ProjectPageInner id={id} />
    </React.Suspense>
  );
}

const MINUTE = 60_000;

/** The wall clock to the minute, read through useSyncExternalStore (the
 *  pattern of step-3-mint.tsx): an auction end or a clip ETA that passes while
 *  the page is open moves on its own, and render stays pure. */
function useMinuteClock(): number {
  const subscribe = React.useCallback((onChange: () => void) => {
    const timer = window.setInterval(onChange, MINUTE);
    return () => window.clearInterval(timer);
  }, []);
  return React.useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}

function ProjectPageInner({ id }: { id: string }) {
  const search = useSearchParams();
  const { hydrated, projects } = useManualProjects();
  const { hydrated: historyHydrated, builds, chats } = useCreateHistory();
  const { hydrated: videoHydrated, jobs: videoJobs } = useVideoJobs();
  const project = resolveProject(projects, id);
  const brief = useProjectBrief(project?.id ?? "");
  const now = useMinuteClock();

  // Preview as buyer's own hook (C6's useViewer) replaces these two lines.
  const buyer = search.get("view") === "buyer";
  const viewer = React.useMemo<Viewer>(
    () => (buyer ? { kind: "owner-preview" } : { kind: "local-owner" }),
    [buyer],
  );

  const view = React.useMemo(
    () =>
      project && brief !== undefined
        ? projectView(project, { builds, chats, brief, videoJobs, now })
        : null,
    [project, brief, builds, chats, videoJobs, now],
  );

  if (!hydrated || !historyHydrated || !videoHydrated) return <ProjectSkeleton />;
  if (!project) return <ProjectNotFound id={id} />;
  // The Brief draft is read one render after the stores. Until then the page
  // keeps its skeleton rather than flash a Draft it may not be.
  if (!view || brief === undefined) return <ProjectSkeleton />;

  return (
    <ProjectShell
      project={project}
      view={view}
      viewer={viewer}
      brief={brief}
      now={now}
      asked={parseProjectTab(search.get("tab"))}
      hiddenTabs={NO_HIDDEN_TABS}
      slots={SLOTS}
    />
  );
}
```

**3.11 Delete the old file:**
```bash
git rm src/components/projects/project-details.tsx
```

- [ ] **Step 4: Run. Expected: PASS**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected:
- `npx tsc --noEmit` exits 0, and nothing imports `project-details` any more.
- The unit run ends `# fail 0`, with C1a's 8 tests among the passes.

- [ ] **Step 5: Browser check.** Use the dev server `http://localhost:3002` (Task 0, `npx next dev -p 3002` in the worktree). The desktop viewport is 1440 × 900, with the sidebar open.

1. **Seed** two projects. On `http://localhost:3002/projects`, run in the console:
   ```js
   (() => {
     const KEY = "ideeza:manual:projects";
     const now = Date.now();
     const list = JSON.parse(localStorage.getItem(KEY) || "[]").filter((p) => !String(p.id).startsWith("proj_c1"));
     list.push(
       // Saved before this feature: no slug, no productName, no builds, a flowState
       // without assembly/wiring, and products without ids.
       { id: "proj_c1legacy", name: "Garden Weather Station", description: "Logs temperature, humidity and rain from the back garden.",
         status: "draft", createdAt: now - 30 * 864e5, updatedAt: now - 30 * 864e5,
         flowState: { pcb: true, code: false, three: false, preview: false, brief: false },
         products: [{ name: "Weather Node", description: "The outdoor sensor box." }] },
       // A 79-character name, for truncation.
       { id: "proj_c1long", slug: "greenhouse-vent", productName: "Vent Opener", description: "",
         name: "A remote-controlled greenhouse vent opener with a solar charger and backup cell",
         status: "draft", createdAt: now, updatedAt: now,
         flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false } },
     );
     localStorage.setItem(KEY, JSON.stringify(list));
     location.reload();
   })();
   ```
2. **Loading (COR-2).** Run in a terminal:

   `curl -s http://localhost:3002/projects/proj_c1legacy | grep -o 'aria-label="Loading project"\|<title>[^<]*</title>'`

   Expected: `aria-label="Loading project"` and `<title>My projects · IDEEZA</title>`. The server renders the skeleton, because the stores are browser-only.
3. **Arrival (COR-3, COR-7, ACT-2).** Open `http://localhost:3002/projects/proj_c1legacy`. Then:
   - For a moment the skeleton shows in the page's shape (header lines, the strip, two cards, rail blocks). No "No network yet" or "Started by hand" flashes before it.
   - `document.title` is `"Garden Weather Station · My projects · IDEEZA"`.
   - `document.activeElement.tagName + ":" + document.activeElement.textContent` is `"H1:Garden Weather Station"`.
   - `[...document.querySelectorAll('p[role="status"]')].map((p) => p.textContent)` includes `"Garden Weather Station"`.
   - The sidebar's "My projects" link has `aria-current="page"`.
4. **Legacy (§5.13).** `JSON.parse(localStorage.getItem("ideeza:manual:projects")).find((p) => p.id === "proj_c1legacy")` shows:
   - `slug: "garden-weather-station"`;
   - `products[0].id: "p1"`;
   - a `flowState` with `assembly` and `wiring` keys.

   The page itself shows:
   - "Build deliverables" with the "Started by hand" note;
   - the rail's Details with Source "Built manually" and Created "{Mon D, YYYY · h:mm AM}";
   - "Editor progress · 1 of 7 steps complete".
5. **Slug (COR-1).** Open `http://localhost:3002/projects/garden-weather-station`. The same page renders, and focus is on its h1.
6. **Breadcrumb (COR-4).**
   - `document.querySelector('nav[aria-label="Breadcrumb"]').innerText` reads "My projects" › "Garden Weather Station".
   - The last crumb has `aria-current="page"`.
   - `document.querySelector('nav[aria-label="Breadcrumb"] a').getBoundingClientRect().height >= 24` is `true`.
7. **Layout at desktop (COR-5, COR-54).** Run:
   ```js
   const a = document.querySelector('aside[aria-label="Project record"]').getBoundingClientRect();
   const p = document.querySelector('[role="tabpanel"]').getBoundingClientRect();
   [Math.round(a.width), Math.round(a.left - p.right), Math.round(a.top - p.top) < 0]
   ```
   Expected: `[360, 28, true]`, with the rail beside the column and its top above the panel's (both are top-aligned under the breadcrumb). The rail is one bordered surface, with a hairline between "Editor progress" and "Details". Its h2s are plain text, and `[...document.querySelectorAll('aside button[aria-expanded]')].every((b) => getComputedStyle(b).display === "none")` is `true`. Scrolling `main` scrolls the rail away with it (not sticky).
8. **Tabs by mouse (COR-19, COR-20).**
   - The strip reads Products · Network. Media joins when its task lands.
   - Products is selected, with the subtle fill and a dark underline, and not violet.
   - Click Network:
     - the URL becomes `/projects/proj_c1legacy?tab=network`;
     - the panel shows the "Network" h2 and "No network yet";
     - focus stays on the Network tab, not the h1;
     - `document.title` is unchanged.
   - Browser Back: the URL has no `?tab` and Products shows. Forward: Network again.
   - Reload on `?tab=network`: Network is still selected.
9. **Tabs by keyboard (COR-20).** Click Products, then:
   - → selects and focuses Network, and the URL updates;
   - ← goes back to Products;
   - End selects Network; Home selects Products;
   - Tab from the strip goes to the panel, which shows a focus ring (one Tab stop for the whole strip).
10. **URL edge cases.**
    - `?tab=media` shows Products, because there is no Media panel yet.
    - `?tab=bogus` shows Products.
    - Open `?view=buyer&tab=network`, then click Products: the URL becomes `/projects/proj_c1legacy?view=buyer` (`view` kept, `tab` dropped).
11. **The 1024 px threshold (COR-5, COR-56, §7 X6).** Emulate 1366 × 900 and run `document.getElementById("main-content").clientWidth`. Expected: ≈ 1086, with two columns. Emulate 1280 × 900: `main` is ≈ 1000, and there is one column:
    - the rail follows the panel;
    - each block is a row with a ▸ button, `aria-expanded="false"`, and its body hidden;
    - pressing "Editor progress" opens it: `aria-expanded="true"`, the ▸ turns down, the list shows;
    - pressing again closes it.
12. **Phone, 400 × 844, touch emulated (COR-21, COR-56).** Use the device toolbar or `resize_window` mobile, then reload.
    - One column, and the strip is one row: `new Set([...document.querySelectorAll('[role="tab"]')].map((t) => t.offsetTop)).size === 1`.
    - Each tab is 44 px tall: `document.querySelector('[role="tab"]').getBoundingClientRect().height === 44`.
    - Each rail row is ≥ 44 px.
    - There is no horizontal page scroll: with `const m = document.getElementById("main-content")`, `m.scrollWidth <= m.clientWidth` is `true`.
    - The gutters are 16 px: the breadcrumb's `getBoundingClientRect().left` is 16.
    - Open `/projects/proj_c1long`: the breadcrumb's last crumb ends in "…" on one line, and its `title` holds the full 79-character name.
13. **Not found (COR-1).** Open `http://localhost:3002/projects/nope-c1`:
    - the card reads "We couldn't find this project";
    - the body reads "Nothing in this browser matches nope-c1. It may have been deleted, or saved in a different browser.";
    - `document.activeElement.tagName` is `"H1"`;
    - "Back to My projects" is the token primary button, and its text stays white on hover. It goes to `/projects`.
14. **Title restore.** From `/projects/proj_c1legacy`, click the breadcrumb's "My projects". `document.title` is no longer the project's.
15. **Dark theme.** Switch with the sidebar's theme control (Use dark theme) and repeat steps 3, 7 and 12 by eye. All of these read, with no raw-palette colour:
    - the skeleton bones;
    - the rail surface and its hairlines;
    - the selected tab's fill and underline;
    - the focus rings.
16. **Reduced motion.** In DevTools → Rendering, set `prefers-reduced-motion: reduce`. At 1280 px the ▸ flips without a transition, and the skeleton doesn't pulse.
17. **Clean up.** Run:
    ```js
    const KEY = "ideeza:manual:projects";
    localStorage.setItem(KEY, JSON.stringify(JSON.parse(localStorage.getItem(KEY) || "[]").filter((p) => !String(p.id).startsWith("proj_c1"))));
    ```
    Then restore the desktop viewport.

- [ ] **Step 6: tsc, eslint, commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
npx eslint src/components/projects/details "src/app/(create)/projects/[id]/page.tsx" src/components/ideeza/state-card.tsx
git add \
  src/components/projects/details/slots.ts \
  src/components/projects/details/frame.tsx \
  src/components/projects/details/breadcrumb.tsx \
  src/components/projects/details/tab-strip.tsx \
  src/components/projects/details/arrival.tsx \
  src/components/projects/details/page-states.tsx \
  src/components/projects/details/shell.tsx \
  src/components/projects/details/legacy.tsx \
  src/components/projects/details/project-page.tsx \
  "src/app/(create)/projects/[id]/page.tsx" \
  src/components/ideeza/state-card.tsx
git commit -F - <<'EOF'
feat(projects): the project page becomes a shell with slots

/projects/[id] now resolves the project by id, then by slug, and shows one of
three states: a skeleton in the page's final shape until every store is read,
a not-found card with a token button, or the shell. The shell owns:
- the breadcrumb;
- the 1280 px frame, with a 360 px rail from a 1024 px page container
  (a container query);
- route focus on the h1 and the document title;
- one polite live region;
- the Products · Media · Network tab strip, whose ?tab= history entries make
  Back return to the previous tab;
- the rail's order. Below 1024 px the rail blocks follow the panel as
  disclosures, closed by default.

Today's sections move into legacy.tsx as interim slot fillers, so the page
shows everything it did until each real section lands.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
`git rm` in Step 3.11 already staged the deletion of `project-details.tsx`.

---

### Hand-off: the slots C2–C8 fill

Every page task plugs in by editing `SLOTS` (and, where it needs a hook, `ProjectPageInner`) in `src/components/projects/details/project-page.tsx`. It then deletes the `legacy.tsx` export it supersedes. None of them renders its own `role="tabpanel"`, breadcrumb, h1 focus, title or live region: the shell does.

| Slot | Section (task) | Gets | Its contract | Deletes from `legacy.tsx` |
|---|---|---|---|---|
| `header` | the header, §5.4 | `HeaderSlotProps` | <ul><li>Puts `titleRef` on the h1, with `tabIndex={-1}` and `outline-none`. The rename input swaps in place of it (CNT-1).</li><li>Renders `headerText(view.summary)` (A3).</li><li>Speaks through `announce` ("Renamed to “{name}”").</li><li>Everything between the breadcrumb and the tab strip is here, including COR-18's pending banners and the Preview-as-buyer entry (`id={PREVIEW_TRIGGER_ID}`, C6's contract).</li></ul> | `LegacyHeader`, `StatusBadge` |
| `tabs.products` | the Products tab, §5.6 (C3) | `SlotProps` | Starts with its h2 "Products". The shell adds the 20 px under the strip. | `LegacyProducts`, `Deliverables`, `ItemStatus`, `EmptyNote` |
| `tabs.media` | the Media tab, §5.8 (C5) | `SlotProps` | The adapter below. | nothing (new) |
| `tabs.network`, `banner`, viewer, `hiddenTabs` | the Network tab and Preview as buyer, §5.9 and §5.11 (C6) | `SlotProps` | The adapters below. | `LegacyNetwork` |
| `rail.outcome` … `rail.manage` | the rail, §5.10 | `SlotProps` | <ul><li>Each block returns `<RailBlock id title summary? collapsible?>`, or `null` when it has nothing real (COR-54).</li><li>Outcome passes `summary` ("Listed · Showcased", COM-55).</li><li>Manage passes `collapsible={false}`.</li><li>RailBlock supplies the h2 and `section aria-labelledby` (COM-22).</li></ul> | `LegacyEditorBlock`, `LegacyDetailsBlock`, `Row`; the last one deletes the file |
| (none) | the product page, §5.7 | — | Reuses:<ul><li>`Breadcrumb` with three crumbs;</li><li>`usePageArrival(product.id, product.name, productDocTitle(product.name, project.name))` and `LiveRegion`;</li><li>`PAGE_CONTAINER`/`PAGE_CONTENT`;</li><li>`moveTab`;</li><li>`StateCard titleAs="h1"` for "This product isn't in {project}".</li></ul> | — |

**C3's wiring.** It was written as "modifies nothing". Add to `project-page.tsx`:
```tsx
import { ProductsTab } from "./products-tab";
import { can } from "@/lib/manual/permissions";

function ProductsSlot({ project, view, viewer }: SlotProps) {
  const { chats } = useCreateHistory();
  return (
    <ProductsTab
      projectId={project.id}
      products={view.products}
      chats={chats}
      showOwnerOnlyFacts={can(viewer, "facts.seeOwnerOnly")}
    />
  );
}
// SLOTS.tabs.products: LegacyProducts → ProductsSlot
```

**C5's wiring.** C5 says the shell task wires it. The page renders only after every store is read, so `hydrated` is `true`:
```tsx
import { MediaTab } from "./media-tab";

function MediaSlot({ project, view, brief, viewer }: SlotProps) {
  return <MediaTab project={project} refs={view.refs} hydrated draft={brief} viewer={viewer} />;
}
// SLOTS.tabs: add  media: MediaSlot,
```

**C6's wiring.** C6's Step 3.6 edits `project-details.tsx`, which C1 deletes, and its Step 3.7 adds a Suspense boundary that `ProjectPage` already has. Both are replaced by the following.
- `NetworkTab` must drop its own `<div id="panel-network" role="tabpanel" …>` wrapper, in both branches. The shell draws that element with the same ids (`panel-network`, `aria-labelledby="tab-network"`).
- It should drop `NetworkSection`'s `mt-16` inside the tab.
- Then add to `project-page.tsx`:
```tsx
import { BuyerPreviewBanner, isBuyerPreview, useViewer } from "./buyer-preview";
import { NetworkTab, useNetworkTabVisible } from "./network-tab";
import type { BuildJob } from "@/lib/create/history";

function NetworkSlot({ project, view, viewer }: SlotProps) {
  // NetworkTab takes one build today; COR-48 moves it to every ref.
  const build = view.refs.reduce<BuildJob | null>(
    (newest, r) => (r.job && (!newest || r.job.createdAt > newest.createdAt) ? r.job : newest),
    null,
  );
  return <NetworkTab project={project} build={build} viewer={viewer} />;
}
function PreviewBannerSlot({ viewer }: SlotProps) {
  return isBuyerPreview(viewer) ? <BuyerPreviewBanner /> : null;
}
const NETWORK_HIDDEN: readonly ProjectTabId[] = ["network"];
// SLOTS: tabs.network: LegacyNetwork → NetworkSlot;  add  banner: PreviewBannerSlot,
// ProjectPageInner: replace the `buyer` / `viewer` lines with
//   const viewer = useViewer();
//   const networkShown = useNetworkTabVisible(project?.id ?? "", viewer);
// and pass  hiddenTabs={networkShown ? NO_HIDDEN_TABS : NETWORK_HIDDEN}
```
- C6's own `withView` (`buyer-preview.ts`) and C1a's `withTab` both return the query without "?", and each keeps the other's parameter.
- C6's browser step 6 (`?view=buyer&tab=network`, then Exit preview keeps `tab=network`) then runs against the shell unchanged.
