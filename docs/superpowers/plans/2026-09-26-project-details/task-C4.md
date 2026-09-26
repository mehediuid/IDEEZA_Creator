### Task C4: The product page and its versions

**Spec delta check (commit e599fcf, and its "Harness notes"):** applied.
- The test command is the quoted glob, and tests import from `../../.tmp-test/lib/...`.
- The one new `src/lib/**` module (`product-page.ts`) has type-only imports, so it runs under `node --test` on its own.
- Dates use A3's `formatDate` / `formatDateTime`. The page builds no date strings of its own.
- From the delta: a dropped product opens at its last version (COR-108, amended COR-41). The version select reads `versionsOf()`, the same list as the rail's Versions block. The buyer view shows 3D, PCB, Wiring and Parts only (PPL-7).

**Split.** Two parts, run in order, each about 60–90 minutes:
- **C4a** — the route, the pure version reader, and the page without its tabs: breadcrumb, header, Build check, version select, notices, identity row, states, buyer banner.
- **C4b** — the deliverable tabs, their panels and the "What this covers" aside, with the 3D viewer loaded on demand (`ModelPanelLazy`).

**Order:** after C3 (merge-notes: … C1 → C2 → C3 → C4 → C5 …). C4 reuses C1's route helpers, breadcrumb, arrival hook, frame and not-found card, and C3's facts helper. C4 runs before C9, so it creates `ModelPanelLazy` itself, and C9 then reuses it (controller, 2026-09-26).

**Requirements:** COR-30, COR-31, COR-32, COR-33, COR-34, COR-36, COR-37, COR-41, COR-108 (the product page half), COR-3 (the product title), COR-4 (the three-crumb trail), COR-7 (route focus; `?v`, `?tab` and `?view` as URL state), COR-102 (the 3D viewer only on demand), PPL-6 and PPL-7 (the product page slice), H-5, H-7, H-8, and the build-lock rule (§2: only the booked snapshot is shown).

**Files**

C4a:
- Create `src/app/(create)/projects/[id]/products/[productId]/page.tsx`
- Create `src/lib/manual/product-page.ts` (pure, type-only imports)
- Create `src/components/projects/product/product-page.tsx`
- Create `src/components/projects/product/product-identity.tsx`
- Create `src/components/projects/product/product-version.tsx`
- Create `src/components/projects/product/product-states.tsx`
- Create `src/components/projects/product/when.tsx`
- Modify `src/components/projects/details/arrival.tsx` (C1's file): the title effect in `usePageArrival`. The exact block is quoted in Step 3.
- Test: `tests/projects/product-page.test.mjs` (new)

C4b:
- Modify `src/lib/manual/product-page.ts` (C4a's file): add the tabs section.
- Create `src/components/create/model-panel/model-panel-lazy.tsx`
- Create `src/components/projects/product/product-deliverables.tsx`
- Modify `src/components/projects/product/product-page.tsx` (C4a's file): mount the tabs.
- Test: `tests/projects/product-tabs.test.mjs` (new)

`tests/projects/tsconfig.json` needs no change: A1's `include` already covers `src/lib/manual/**`.

**Interfaces**

Consumes (exact, as the earlier tasks produce them):
- **A1** `src/lib/manual/projects.tsx`: `useManualProjects()` → `{ hydrated, projects }`. `ManualProject` has `builds?: ProjectBuildRef[]` and `products?: ManualProduct[]`, and every row carries `id` and `source?`.
- **A2** `src/lib/manual/project-read.ts`:
  - `buildsOf(p, builds): BuildRef[]`
  - `lineagesOf(refs, chats): Lineage[]`
  - `productRowsOf(p): ManualProduct[]`
  - `productsOfProject(p, refs): ProjectProduct[]`. Each has `built: { ref, product } | null`, `state` and `dropped: { lastIn, current } | null`.
  - `versionsOf(refs, lineages, rows): ProjectVersion[][]`. Groups are per lineage, newest first. Each version has `version`, `buildId`, `job`, `savedAt` and `products: { rowId, productId, name }[]`.
  - `conceptOf(chat, build, product): ConceptSummary | undefined`
  - `productsOf(job)[0].description` is the primary's description (COR-90).
- **A3** `src/lib/manual/project-summary.ts`: `formatDate(at): string` ("Sep 22, 2026") and `formatDateTime(at): string` ("Sep 22, 2026 · 9:09 PM").
- **A4b** `src/lib/manual/permissions.ts`: `type Viewer` and `can(viewer, action, ctx?)`. The actions used are `"facts.seeOwnerOnly"` (the part-changes line and the chat link) and `"deliverables.download"` (the Firmware code tab, which PPL-7 puts with the downloads, after purchase). C6 names the same action for the product page.
- **C1**:
  - `resolveProject(list, key)` and `productDocTitle(product, project)`, from `src/lib/manual/project-route.ts`.
  - `moveTab(e, ids, current, select)` and `revealDelta(item, view, pad?)`, from `src/lib/ui/tab-keys.ts`.
  - `Breadcrumb({ trail })`, from `src/components/projects/details/breadcrumb.tsx`. The middle crumb reads "…" below a 640 px container.
  - `usePageArrival(key, name, title)` → `{ titleRef, live, announce }`, and `LiveRegion({ text })`, from `details/arrival.tsx`.
  - `PAGE_CONTAINER` and `PAGE_CONTENT`, from `details/frame.tsx`.
  - `ProjectNotFound({ id })`, from `details/page-states.tsx`.
  - `StateCard`'s `titleAs="h1"` and `titleRef` props.
- **C3** `src/lib/manual/products-tab-view.ts`:
  - `productFacts(spec, parts): { label: "Size" | "Board" | "Power" | "Radio"; value: string }[]`: the card's facts. The page shows the same words.
  - `displayProductName(name)`, which returns "Not named yet" for an empty name.
- **Existing, unchanged:**
  - From `history.tsx`: `productsOf`, `useCreateHistory` (`hydrated`, `builds`, `chats`), `ITEM_KINDS` and `ITEM_LABELS`.
  - From `confidence.ts`: `confidenceFor`.
  - From `confidence-badge.tsx`: `ConfidenceBadge` and `ConfidenceIssuesPanel`.
  - From `build-artifacts.ts`: `partChangesOf`, `partChangesText`, `bookedSpec`, `specOfSource` and `isSampleModel`.
  - From `lib/three/assembly.ts`: `deriveAssembly`.
  - From `deliverable-previews.tsx`: `PcbPreview`, `WiringPreview`, `FirmwarePreview`, `PartsPreview`, `PartsSummary` and `coversFor`.
  - `ModelPanel`, and the atoms `Banner`, `Button`, `buttonVariants`, `SelectMenu` and `StateCard`.

Produces:
```ts
// src/lib/manual/product-page.ts
export type VersionOption = { n: number; at: number | null; current: boolean; has: boolean; gone: boolean };
export type VersionNotice =
  | { kind: "older"; n: number; at: number | null; latest: number }
  | { kind: "dropped"; n: number; latest: number }
  | { kind: "absent"; n: number; nearest: number }
  | { kind: "gone"; n: number; nearest: number };
export type ProductVersionView = {
  options: VersionOption[]; latest: number; home: number; shown: number;
  build: { buildId: string; job: BuildJob | null }; productId: string | null; notice: VersionNotice | null;
};
export function parseVersionParam(v: string | null): number | null;
export function productVersionView(product: ProjectProduct, versions: ProjectVersion[][], v: string | null): ProductVersionView | null;
export function productPiecesOf(items: BuildItem[]): { ready: number; total: number };
export function withQuery(search: string, patch: Record<string, string | null>): string;   // "?a=1" or ""
// C4b
export function deliverableTabs(items: BuildItem[], order: readonly BuildItemKind[], opts: { firmware: boolean }): BuildItem[];
export function pickTab(tabs: BuildItem[], asked: string | null): BuildItemKind | null;

// src/components/projects/product/product-page.tsx
export function ProductPage(p: { id: string; productId: string }): React.JSX.Element;
// src/components/projects/product/product-identity.tsx
export function ProductIdentity(p: { product: BuildProduct; name: string; description: string; version: number; partChanges: string | null }): React.JSX.Element;
export function ConceptImage(p: { src: string; alt: string; className: string }): React.JSX.Element;
// src/components/projects/product/product-version.tsx
export function VersionSelect(p: { view: ProductVersionView; onPick: (n: number) => void }): React.JSX.Element;
export function VersionNoticeBlock(p: { notice: VersionNotice; name: string; home: number; hrefFor: (n: number) => string }): React.JSX.Element;
// src/components/projects/product/product-states.tsx
export function ProductLoading(): React.JSX.Element;
export function ProductMissing(p: { projectName: string; href: string }): React.JSX.Element;
export function UnbuiltNote(p: { state: ProjectProduct["state"] }): React.JSX.Element | null;
export function PreviewBanner(p: { onExit: () => void }): React.JSX.Element;
// src/components/projects/product/when.tsx
export function When(p: { at: number }): React.JSX.Element;
// C4b — src/components/create/model-panel/model-panel-lazy.tsx (C9 reuses it)
export const ModelPanelLazy: React.ComponentType<React.ComponentProps<typeof ModelPanel>>;
// C4b — src/components/projects/product/product-deliverables.tsx
export function ProductDeliverables(p: {
  job: BuildJob; product: BuildProduct; firmware: boolean; chatHref: string | null;
  tab: string | null; onTab: (kind: BuildItemKind) => void;
}): React.JSX.Element;
```
Links into this page, from C3's cards and C8's Versions block: `/projects/{projectId}/products/{rowId}`, plus `?v={n}` for a specific version.

**Decisions (each stated once, so the reviewer can object):**
1. **Which version opens.**
   - With no `?v`, the page opens at the product's own source version, `built.ref.version`. That is the current version, or `lastIn` for a dropped product.
   - A `?v` that names no saved version of the lineage is ignored. So is a `?v` equal to that home version.
   - Choosing the home version in the select removes `?v`, so the URL stays canonical. Every other choice pushes `?v={n}`.
2. **Notices** (COR-41, COR-108). There is one at most, above the content:
   - *older*: "You're viewing version {n} ({date}). The project now uses version {m}." with **Back to latest**, which goes to the home version.
   - *dropped*: "Version {m} doesn't include {product} — this is version {n}, the last one that did." There is no Back to latest.
   - *absent*: title "Not in version {n}", body "{product} isn't part of version {n} of this project." and **Open version {nearest}**.
   - *gone*, for a version whose build left this browser: title "Version {n} isn't in this browser", body "Its build isn't stored here any more, so nothing of it can be shown." and **Open version {nearest}**.
   - "Nearest" means the closest version that has the product; a tie goes to the newer one. On *absent* and *gone* the identity row and the tabs are absent.
3. **The buyer preview** hides the version select and ignores `?v`. The Versions history is owner-only in the rail (PPL-7), so a buyer sees the product as the project has it now. The dropped notice stays, because it is a fact about the product.
4. **Dates.** The select's "{date}" and the older notice's date are the version's `savedAt`. For a version saved before `savedAt` was recorded, they fall back to its build's `endedAt ?? createdAt`. The meta line's "Built {date}" is the build's own `endedAt ?? createdAt`.
5. **Facts.** They are C3's `productFacts(specOfSource(bp), bp.parts)`, the card's own words. When `bookedSpec(bp)` is null, one line under them reads "These facts are worked out from the parts — this build has no booked spec." (H-8).
6. **Deliverable tabs.**
   - They take C1's TabStrip look: neutral, the subtle fill plus an underline, never violet. The product page has no violet at all, because it has no action.
   - `?tab=` is written with `replace` (COR-32).
   - A failed piece keeps its tab (COR-32). A `building` or `pending` piece says so, with no action.
   - The tabs component is keyed by `{buildId}:{productId}`, so a new version starts from its own first tab and the 3D resting state.
7. **3D.**
   - `meshUrl` goes to the primary only. A companion gets `shellNote: null`, and `onRetryMesh` is omitted (COR-33).
   - The primary's `shellNote` follows the review's formula: `modelFailed` gives `"failed"`, no GLB gives `"pending"`, else null.
   - Note for the owner: a saved build's GLB is made only while its build review is open, so on this page "pending" can last until the maker opens that build again.
8. **Document title.**
   - C1's `usePageArrival` sets `document.title` in an effect. On a hard load of the product page (Next 16.2.9, webpack dev), Next writes the layout's metadata `<title>` into `<head>` after the page's effects. The tab then read "IDEEZA Creator Panel" again.
   - C4a Step 3 changes that one effect so it re-applies the title whenever `<head>` changes. This was observed in a scratch run of this code, and the observer version held the title.
   - The same fix covers the project page's title.
9. **Viewer.** It is parsed inline from `?view=buyer`, and the page has its own small `PreviewBanner`, with the PPL-5 copy and Exit preview moving focus to the h1. The reason is order: C6's `useViewer()` and `BuyerPreviewBanner` (`buyer-preview.ts`) land after C4. **Hand-off to C6:** swap the product page to `useViewer()` and `<BuyerPreviewBanner />` when it lands. The banner's Exit should then focus the h1, because this page has no Preview as buyer trigger.

**Verification note (2026-09-26):**
- This exact code was type-checked, linted and unit-tested in a scratch copy of the worktree. That copy had A1's shapes, stand-ins for A2 and A4b with §5.1's signatures, and C1's and C3's modules taken from their task files.
- C4a on its own: `tsc` clean in these files, eslint clean, 13/13 tests.
- With C4b: 16/16 tests.
- An earlier build of this page ran in a browser from that scratch copy. It still had its own breadcrumb and facts, and it confirmed every state in the Step 5 lists: versions, dropped, absent, the buyer view, 3D on demand, keyboard tabs, 400 px, and light and dark.
- After the switch to C1's and C3's modules, the code was re-checked with tsc, eslint and the tests only. The Browser pane is shared, so there was no second run.
- The Step 5 checks are written for the worktree's own server on `:3002`.

---

## C4a — the route, the version reader, and the page shell

- [ ] **Step 1: Write the failing test**

Create `tests/projects/product-page.test.mjs`:
```js
// Task C4 — the product page's pure readers (src/lib/manual/product-page.ts):
// which version a product opens at, its select, its notices (COR-41,
// COR-108), its pieces (COR-31) and its URL.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseVersionParam,
  productPiecesOf,
  productVersionView,
  withQuery,
} from "../../.tmp-test/lib/manual/product-page.js";

// ── fixtures: "Car", one chat built twice. Version 2 dropped Battery Charger
// and added Spare Battery Pack (spec §3.3).
const SEP22 = Date.UTC(2026, 8, 22, 9, 2);
const SEP26 = Date.UTC(2026, 8, 26, 16, 12);
const job = (id, endedAt) => ({ id, chatId: "chat_car", createdAt: endedAt - 60_000, endedAt, conceptNumber: "1" });
const J1 = job("bld_v1", SEP22);
const J2 = job("bld_v2", SEP26);

const version = (n, j, savedAt, products) => ({
  chatId: "chat_car", lineage: "Car", version: n, current: n === 2,
  buildId: j ? j.id : `bld_v${n}`, job: j, savedAt,
  pieces: null, products: j ? products : [], diff: null,
});
const V1 = version(1, J1, SEP22, [
  { rowId: "prd_ctrl", productId: "primary", name: "RC Car Controller" },
  { rowId: "prd_remote", productId: "remote", name: "Remote Controller" },
  { rowId: "prd_charger", productId: "charger", name: "Battery Charger" },
]);
const V2 = version(2, J2, SEP26, [
  { rowId: "prd_ctrl", productId: "primary", name: "RC Car Controller" },
  { rowId: "prd_remote", productId: "remote", name: "Remote Controller" },
  { rowId: "prd_spare", productId: "spare", name: "Spare Battery Pack" },
]);
const VERSIONS = [[V2, V1]]; // versionsOf(): per lineage, newest first

const ref = (j, n) => ({ buildId: j.id, chatId: "chat_car", version: n, savedAt: null, job: j });
const REMOTE = {
  id: "prd_remote", name: "Remote Controller", description: "",
  built: { ref: ref(J2, 2), product: { id: "remote" } },
  state: "built", version: { current: 2, count: 2 }, dropped: null,
};
const CHARGER = {
  id: "prd_charger", name: "Battery Charger", description: "",
  built: { ref: ref(J1, 1), product: { id: "charger" } },
  state: "built", version: { current: 1, count: 2 }, dropped: { lastIn: 1, current: 2 },
};
const HAND = { id: "p1", name: "Desk Lamp", description: "", built: null, state: "hand", version: null, dropped: null };

// ── versions

test("a built product opens at its current version, with no notice", () => {
  const view = productVersionView(REMOTE, VERSIONS, null);
  assert.equal(view.shown, 2);
  assert.equal(view.home, 2);
  assert.equal(view.latest, 2);
  assert.equal(view.productId, "remote");
  assert.equal(view.build.buildId, "bld_v2");
  assert.equal(view.notice, null);
  assert.deepEqual(view.options, [
    { n: 1, at: SEP22, current: false, has: true, gone: false },
    { n: 2, at: SEP26, current: true, has: true, gone: false },
  ]);
});

test("?v=1 shows version 1 under the older-version notice", () => {
  const view = productVersionView(REMOTE, VERSIONS, "1");
  assert.equal(view.shown, 1);
  assert.equal(view.productId, "remote");
  assert.equal(view.build.buildId, "bld_v1");
  assert.deepEqual(view.notice, { kind: "older", n: 1, at: SEP22, latest: 2 });
});

test("?v naming the version the page opens at is the plain page", () => {
  assert.equal(productVersionView(REMOTE, VERSIONS, "2").notice, null);
});

test("?v that names no saved version is ignored", () => {
  for (const v of ["7", "0", "abc", "1.5", "", "-1"]) {
    const view = productVersionView(REMOTE, VERSIONS, v);
    assert.equal(view.shown, 2, `?v=${v}`);
    assert.equal(view.notice, null, `?v=${v}`);
  }
});

test("a dropped product opens at the last version that had it, with no Back to latest", () => {
  const view = productVersionView(CHARGER, VERSIONS, null);
  assert.equal(view.home, 1);
  assert.equal(view.shown, 1);
  assert.equal(view.productId, "charger");
  assert.deepEqual(view.notice, { kind: "dropped", n: 1, latest: 2 });
  assert.equal(view.options[1].has, false);
  assert.equal(view.options[1].current, true);
});

test("a version without the product says so and points at the nearest one that has it", () => {
  const view = productVersionView(CHARGER, VERSIONS, "2");
  assert.equal(view.shown, 2);
  assert.equal(view.productId, null);
  assert.deepEqual(view.notice, { kind: "absent", n: 2, nearest: 1 });
});

test("a version whose build is gone shows nothing of it and points at one that is here", () => {
  const gone = [[V2, version(1, null, SEP22, [])]];
  const view = productVersionView(REMOTE, gone, "1");
  assert.equal(view.productId, null);
  assert.equal(view.build.job, null);
  assert.deepEqual(view.notice, { kind: "gone", n: 1, nearest: 2 });
  assert.deepEqual(view.options[0], { n: 1, at: SEP22, current: false, has: false, gone: true });
});

test("a version saved before savedAt was recorded is dated by its build", () => {
  const legacy = [[V2, { ...V1, savedAt: null }]];
  assert.equal(productVersionView(REMOTE, legacy, null).options[0].at, SEP22);
});

test("the product's own build stands in when versionsOf() has no row for it", () => {
  const view = productVersionView(REMOTE, [], null);
  assert.equal(view.options.length, 1);
  assert.equal(view.shown, 2);
  assert.equal(view.productId, "remote");
  assert.equal(view.options[0].at, SEP26);
});

test("a product no build stands behind has no version view", () => {
  assert.equal(productVersionView(HAND, VERSIONS, null), null);
});

test("parseVersionParam reads whole numbers from 1 only", () => {
  assert.equal(parseVersionParam("3"), 3);
  assert.equal(parseVersionParam(null), null);
  assert.equal(parseVersionParam("03"), null);
  assert.equal(parseVersionParam("2x"), null);
});

// ── pieces

const item = (kind, status) => ({ kind, status, progress: status === "ready" ? 100 : 40 });

test("productPiecesOf counts what the build made for this product", () => {
  const items = [item("3d", "ready"), item("pcb", "ready"), item("code", "skipped"), item("wiring", "failed"), item("parts", "ready")];
  assert.deepEqual(productPiecesOf(items), { ready: 3, total: 4 });
});

// ── URL

test("withQuery sets and removes keys and keeps the rest", () => {
  assert.equal(withQuery("tab=pcb&view=buyer", { v: "1" }), "?tab=pcb&view=buyer&v=1");
  assert.equal(withQuery("v=1&view=buyer", { v: null }), "?view=buyer");
  assert.equal(withQuery("tab=pcb", { tab: "3d" }), "?tab=3d");
  assert.equal(withQuery("", { tab: null }), "");
});
```

- [ ] **Step 2: Run it. Expected: FAIL**
```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
`src/lib/manual/product-page.ts` doesn't exist yet. tsc compiles the rest, and the new file fails before any of its tests run:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../.tmp-test/lib/manual/product-page.js' imported from .../tests/projects/product-page.test.mjs
```
The other test files still pass, and the run exits 1.

- [ ] **Step 3: Implement**

**3.1 Create `src/lib/manual/product-page.ts`:**
```ts
// The product page's pure readers — /projects/[id]/products/[productId]
// (spec §3.4, §5.7). Which saved version of one product the page shows, what
// its version select lists and which notice sits above it (COR-41, COR-108),
// how many of its pieces are ready (COR-31), and its URL with one key
// changed. The booked facts are the Products tab's own `productFacts()`
// (products-tab-view.ts), so the card and this page word them the same way.
//
// No React and no storage: the page hands in what project-read.ts derived —
// `productsOfProject()` and `versionsOf()` — so the version select and the
// rail's Versions block read one list and can't disagree (COR-106). Its only
// imports are type-only, so it compiles and runs under `node --test` alone.

import type { BuildItem, BuildJob } from "../create/history";
import type { ProjectProduct, ProjectVersion } from "./project-read";

// ───────────────────────────── versions ─────────────────────────────

/** One row of the version select. */
export type VersionOption = {
  n: number;
  /** When the version was saved into the project; for one saved before that
   *  was recorded, when its build ran; null when neither is known. */
  at: number | null;
  /** The lineage's newest saved version. */
  current: boolean;
  /** This product is in that version's build. */
  has: boolean;
  /** That version's build isn't in this browser any more. */
  gone: boolean;
};

export type VersionNotice =
  /** "You're viewing version {n} ({at}). The project now uses version {latest}." + Back to latest (COR-41) */
  | { kind: "older"; n: number; at: number | null; latest: number }
  /** "Version {latest} doesn't include {product} — this is version {n}, the last one that did." No Back to latest (COR-108) */
  | { kind: "dropped"; n: number; latest: number }
  /** "Not in version {n}", with a link to the nearest version that has it (COR-41) */
  | { kind: "absent"; n: number; nearest: number }
  /** The version's build is gone from this browser, so nothing of it can be shown */
  | { kind: "gone"; n: number; nearest: number };

export type ProductVersionView = {
  /** Oldest first. The select shows only when there is more than one. */
  options: VersionOption[];
  /** The lineage's newest saved version. */
  latest: number;
  /** Where the page opens with no `?v`: the last version that has this
   *  product — the current one, or for a dropped product the last it was in. */
  home: number;
  /** The version on screen. */
  shown: number;
  /** The build behind the version on screen. */
  build: { buildId: string; job: BuildJob | null };
  /** This product's `BuildProduct.id` inside that build; null when the
   *  version doesn't have it or its build is gone. */
  productId: string | null;
  notice: VersionNotice | null;
};

/** "?v=2" → 2. Anything that isn't a whole number from 1 reads as no `?v`. */
export function parseVersionParam(v: string | null): number | null {
  if (v === null || !/^[1-9]\d{0,5}$/.test(v)) return null;
  return Number(v);
}

const builtAt = (job: BuildJob | null) => (job ? job.endedAt ?? job.createdAt : null);

type Slot = {
  n: number;
  buildId: string;
  job: BuildJob | null;
  at: number | null;
  productId: string | null;
};

/** Which version of `product` the page shows for `?v=` (COR-41, COR-108).
 *  Null for a product no build stands behind — made by hand, its build gone,
 *  or unmatched — which has no deliverables to show at any version. */
export function productVersionView(
  product: ProjectProduct,
  versions: ProjectVersion[][],
  v: string | null,
): ProductVersionView | null {
  const built = product.built;
  if (!built) return null;
  const home = built.ref.version;

  // The lineage is the group that holds the product's own build.
  const group = versions.find((g) => g.some((x) => x.buildId === built.ref.buildId)) ?? [];
  const slots: Slot[] = group.map((x) => {
    const entry = x.products.find((p) => p.rowId === product.id);
    const productId = !x.job
      ? null
      : entry
        ? entry.productId
        : x.buildId === built.ref.buildId
          ? built.product.id
          : null;
    return { n: x.version, buildId: x.buildId, job: x.job, at: x.savedAt ?? builtAt(x.job), productId };
  });
  // versionsOf() always holds the product's own build; should it ever not,
  // the page still shows that one version rather than nothing.
  if (!slots.some((s) => s.n === home)) {
    slots.push({
      n: home,
      buildId: built.ref.buildId,
      job: built.ref.job,
      at: built.ref.savedAt ?? builtAt(built.ref.job),
      productId: built.product.id,
    });
  }
  slots.sort((a, b) => a.n - b.n);
  const latest = slots[slots.length - 1].n;

  const asked = parseVersionParam(v);
  const shown = asked !== null && slots.some((s) => s.n === asked) ? asked : home;
  const slot = slots.find((s) => s.n === shown)!;

  // The closest version that has the product; a tie goes to the newer one.
  const nearest = slots
    .filter((s) => s.productId !== null)
    .reduce<Slot | null>((best, s) => {
      if (!best) return s;
      const d = Math.abs(s.n - shown);
      const bd = Math.abs(best.n - shown);
      return d < bd || (d === bd && s.n > best.n) ? s : best;
    }, null);
  const near = nearest?.n ?? home;

  let notice: VersionNotice | null = null;
  if (shown === home) {
    notice = product.dropped ? { kind: "dropped", n: home, latest } : null;
  } else if (!slot.job) {
    notice = { kind: "gone", n: shown, nearest: near };
  } else if (!slot.productId) {
    notice = { kind: "absent", n: shown, nearest: near };
  } else if (shown !== latest) {
    notice = { kind: "older", n: shown, at: slot.at, latest };
  }

  return {
    options: slots.map((s) => ({
      n: s.n,
      at: s.at,
      current: s.n === latest,
      has: s.productId !== null,
      gone: !s.job,
    })),
    latest,
    home,
    shown,
    build: { buildId: slot.buildId, job: slot.job },
    productId: slot.productId,
    notice,
  };
}

// ───────────────────────────── pieces ─────────────────────────────

/** "{ready} of {total} pieces ready" for ONE product — A2's `piecesOf(job)`
 *  counts the whole build. A piece the build never made isn't one. */
export function productPiecesOf(items: BuildItem[]): { ready: number; total: number } {
  const live = items.filter((i) => i.status !== "skipped");
  return { ready: live.filter((i) => i.status === "ready").length, total: live.length };
}

// ───────────────────────────── URL ─────────────────────────────

/** The page's query with some keys set or (null) removed — every other key,
 *  `view=buyer` among them, carried as it was (COR-37). "" when empty. */
export function withQuery(search: string, patch: Record<string, string | null>): string {
  const q = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) q.delete(key);
    else q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
```

**3.2 Create `src/app/(create)/projects/[id]/products/[productId]/page.tsx`.** This is a thin server page like `projects/[id]/page.tsx`. `params` is a Promise in Next 16 (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`). The query is read on the client, with `useSearchParams` inside a Suspense boundary (`use-search-params.md`, "Prerendering").
```tsx
// /projects/[id]/products/[productId] — one product's deliverables, per saved
// version (spec §3.4, §5.7). Thin server wrapper like /projects/[id]: the
// project and the product are resolved against this browser's stores inside
// ProductPage, which shows its own loading and not-found states. `?v=`,
// `?tab=` and `?view=buyer` are read there, on the client.

import * as React from "react";
import { ProductPage } from "@/components/projects/product/product-page";

export default async function ProjectProductPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id, productId } = await params;
  return <ProductPage id={id} productId={productId} />;
}
```

**3.3 Create `src/components/projects/product/when.tsx`:**
```tsx
// A date on the product page, the way every date on the two project pages is
// printed: the one formatter (A3's `formatDate`) inside a <time>, with the
// full date and time in its title (COR-10, COR-107).

import * as React from "react";
import { formatDate, formatDateTime } from "@/lib/manual/project-summary";

export function When({ at }: { at: number }) {
  return (
    <time dateTime={new Date(at).toISOString()} title={formatDateTime(at)}>
      {formatDate(at)}
    </time>
  );
}
```

**3.4 Create `src/components/projects/product/product-states.tsx`:**
```tsx
"use client";

// The product page's states around its content: the loading shape (COR-2),
// "This product isn't in {project}" (COR-30), the note for a product no build
// stands behind (COR-24's words), and the buyer-preview banner (PPL-5). An
// unknown project is the project page's own ProjectNotFound (COR-1).

import * as React from "react";
import Link from "next/link";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, StateCard, buttonVariants } from "@/components/ideeza";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { cn } from "@/lib/utils";
import { PAGE_CONTAINER, PAGE_CONTENT } from "../details/frame";

function Bone({ className }: { className: string }) {
  return <span aria-hidden className={cn("block rounded-md bg-bg-subtle motion-safe:animate-pulse", className)} />;
}

/** The page's final shape while the two stores hydrate — crumbs, the h1 and
 *  its meta, the identity row, the tab strip, a panel — so no state flashes a
 *  not-found before its read completes. Also the Suspense fallback. */
export function ProductLoading() {
  return (
    <div className={PAGE_CONTAINER}>
      <div role="status" aria-label="Loading product" className={cn(PAGE_CONTENT, "flex flex-col gap-10")}>
        <Bone className="h-[16px] w-[240px] max-w-full" />
        <div className="flex flex-col gap-4">
          <Bone className="h-[32px] w-[320px] max-w-full" />
          <Bone className="h-[16px] w-[420px] max-w-full" />
        </div>
        <div className="grid gap-8 [@container(min-width:640px)]:grid-cols-[240px_minmax(0,1fr)] [@container(min-width:640px)]:gap-12">
          <Bone className="aspect-[16/10] w-full [@container(min-width:640px)]:aspect-[4/3]" />
          <div className="flex flex-col gap-4">
            <Bone className="h-[16px] w-full" />
            <Bone className="h-[16px] w-4/5" />
            <Bone className="h-[16px] w-3/5" />
          </div>
        </div>
        <Bone className="h-[36px] w-full" />
        <Bone className="h-[320px] w-full" />
      </div>
    </div>
  );
}

/** The project is here, but none of its products has this id (COR-30). The
 *  card is the whole page, so its title is the h1 route focus lands on. */
export function ProductMissing({ projectName, href }: { projectName: string; href: string }) {
  const titleRef = React.useRef<HTMLHeadingElement | null>(null);
  React.useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [href]);
  return (
    <div className={PAGE_CONTAINER}>
      <div className="flex justify-center px-8 py-40">
        <StateCard
          tone="empty"
          titleAs="h1"
          titleRef={titleRef}
          icon={<Icon icon={HelpCircleIcon} size={32} />}
          title={`This product isn't in ${projectName}`}
          body="Its link doesn't match any product saved in this project — it may have come from another browser."
          action={
            <Link
              href={href}
              className={cn(
                buttonVariants({ hierarchy: "secondary", size: "lg" }),
                "hover:text-[color:var(--color-button-secondary-text)]",
              )}
            >
              Back to the project
            </Link>
          }
        />
      </div>
    </div>
  );
}

const UNBUILT: Record<Exclude<ProjectProduct["state"], "built">, string> = {
  "build-gone": "Its build isn't in this browser any more.",
  unmatched: "Its build can't be matched to this name.",
  hand: "Made by hand — its work is in the editor.",
};

/** A product no build stands behind has no version and no deliverables — the
 *  card's own words say why (COR-24), where the tabs would be. */
export function UnbuiltNote({ state }: { state: ProjectProduct["state"] }) {
  if (state === "built") return null;
  return (
    <p className="rounded-xl border border-dashed border-border px-10 py-12 text-center text-md text-text-secondary">
      {UNBUILT[state]}
    </p>
  );
}

/** PPL-5 — the preview's banner, sticky at the top of the content, with the
 *  way out. The preview carries through from the project page (COR-37). */
export function PreviewBanner({ onExit }: { onExit: () => void }) {
  return (
    <div className="sticky top-0 z-sticky flex flex-col gap-4 bg-bg-page py-4 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:items-center">
      <Banner tone="info" title="Previewing as a buyer" className="min-w-0 flex-1">
        This is your page without your editing controls. Nothing is published — it&apos;s saved only in this browser.
      </Banner>
      <Button
        hierarchy="secondary"
        size="md"
        onClick={onExit}
        className="shrink-0 [@media(pointer:coarse)]:min-h-[var(--touch-min)]"
      >
        Exit preview
      </Button>
    </div>
  );
}
```

**3.5 Create `src/components/projects/product/product-version.tsx`:**
```tsx
"use client";

// The product page's version select and the one notice above the content
// (COR-41, COR-108). Both read `productVersionView()`, which reads
// `versionsOf()` — the same list the rail's Versions block prints (COR-106),
// so the two can't disagree. Choosing a version pushes `?v=`, so Back
// returns to the version before (COR-7).

import * as React from "react";
import Link from "next/link";
import { Banner, SelectMenu, buttonVariants, type SelectOption } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/manual/project-summary";
import type { ProductVersionView, VersionNotice } from "@/lib/manual/product-page";

/** "Version 2 of 2 ▾" — newest first, each "{date} · current", "not in this
 *  version" or "build not in this browser". Shown only when the lineage has
 *  more than one version; full width below a 560 px page, 44 px tall. */
export function VersionSelect({ view, onPick }: { view: ProductVersionView; onPick: (n: number) => void }) {
  const count = view.options.length;
  const options: SelectOption[] = [...view.options].reverse().map((o) => {
    const sub = [
      o.at !== null ? formatDate(o.at) : null,
      o.current ? "current" : null,
      o.gone ? "build not in this browser" : o.has ? null : "not in this version",
    ]
      .filter(Boolean)
      .join(" · ");
    return { value: String(o.n), label: `Version ${o.n} of ${count}`, ...(sub ? { sub } : null) };
  });
  return (
    <SelectMenu
      value={String(view.shown)}
      onChange={(v) => onPick(Number(v))}
      options={options}
      placeholder={`Version ${view.shown} of ${count}`}
      ariaLabel="Version"
      className="w-full [&>button]:min-h-[var(--touch-min)] [@container(min-width:560px)]:w-56"
    />
  );
}

// A link dressed as the quiet button. The reset colours every a:hover as a
// link, so the hover keeps the button's own text colour.
const LINK_BUTTON = cn(
  buttonVariants({ hierarchy: "secondary", size: "md" }),
  "shrink-0 hover:text-[color:var(--color-button-secondary-text)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
);

/** The notice for the version on screen. `hrefFor(n)` is this page at that
 *  version, every other query key kept; `home` is where the page opens with
 *  no `?v`. */
export function VersionNoticeBlock({
  notice,
  name,
  home,
  hrefFor,
}: {
  notice: VersionNotice;
  name: string;
  home: number;
  hrefFor: (n: number) => string;
}) {
  let body: React.ReactNode;
  let title: string | undefined;
  let link: { n: number; label: string } | null = null;
  switch (notice.kind) {
    case "older":
      body = `You're viewing version ${notice.n}${notice.at !== null ? ` (${formatDate(notice.at)})` : ""}. The project now uses version ${notice.latest}.`;
      link = { n: home, label: "Back to latest" };
      break;
    case "dropped":
      body = `Version ${notice.latest} doesn't include ${name} — this is version ${notice.n}, the last one that did.`;
      break;
    case "absent":
      title = `Not in version ${notice.n}`;
      body = `${name} isn't part of version ${notice.n} of this project.`;
      link = { n: notice.nearest, label: `Open version ${notice.nearest}` };
      break;
    case "gone":
      title = `Version ${notice.n} isn't in this browser`;
      body = "Its build isn't stored here any more, so nothing of it can be shown.";
      link = { n: notice.nearest, label: `Open version ${notice.nearest}` };
      break;
  }
  return (
    <div className="flex flex-col gap-4 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:items-center">
      <Banner tone="info" title={title} className="min-w-0 flex-1">
        {body}
      </Banner>
      {link && (
        <Link href={hrefFor(link.n)} scroll={false} className={LINK_BUTTON}>
          {link.label}
        </Link>
      )}
    </div>
  );
}
```

**3.6 Create `src/components/projects/product/product-identity.tsx`:**
```tsx
"use client";

// The product page's identity row (COR-31): the concept image, the frozen
// concept description (H-7), the part-changes line (owner only), and the
// labelled facts from the booked snapshot — the build-lock rule's numbers,
// never the chat's later answer. Read-only: nothing here edits a thing.

import * as React from "react";
import { bookedSpec, specOfSource } from "@/lib/create/build-artifacts";
import type { BuildProduct } from "@/lib/create/history";
import { productFacts } from "@/lib/manual/products-tab-view";
import { cn } from "@/lib/utils";

export function ProductIdentity({
  product,
  name,
  description,
  version,
  partChanges,
}: {
  /** This product inside the build of the version on screen. */
  product: BuildProduct;
  name: string;
  /** The concept's description, frozen before any edit (H-7). */
  description: string;
  version: number;
  /** "added HC-SR04 ultrasonic sensor" — null when nothing changed, the
   *  chat is gone, or the viewer isn't the owner (PPL-7). */
  partChanges: string | null;
}) {
  // The card's own facts (COR-23), from this version's booked snapshot. A
  // build that predates spec booking has them worked out from its parts (H-8).
  const facts = productFacts(specOfSource(product), product.parts);
  const worked = !bookedSpec(product);
  const image = product.conceptImageUrl;
  return (
    <section
      aria-label="About this product"
      className={cn(
        "grid gap-8",
        image && "[@container(min-width:640px)]:grid-cols-[240px_minmax(0,1fr)] [@container(min-width:640px)]:gap-12",
      )}
    >
      {image ? (
        <ConceptImage
          key={image}
          src={image}
          alt={`${name} concept image, v${version}`}
          className="aspect-[16/10] w-full [@container(min-width:640px)]:aspect-[4/3]"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-6">
        {description ? <ClampedText text={description} /> : null}
        {partChanges ? (
          <p className="max-w-[68ch] text-md leading-relaxed text-text-secondary">
            Built with your part changes: {partChanges}
          </p>
        ) : null}
        <dl className="grid w-fit grid-cols-[max-content_minmax(0,1fr)] gap-x-10 gap-y-3 text-md">
          {facts.map((f) => (
            <React.Fragment key={f.label}>
              <dt className="text-text-secondary">{f.label}</dt>
              <dd className="min-w-0 break-words text-text-primary">{f.value}</dd>
            </React.Fragment>
          ))}
        </dl>
        {worked ? (
          <p className="text-sm text-text-tertiary">
            These facts are worked out from the parts — this build has no booked spec.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** A concept image in a reserved box, loaded lazily. A failed load says so
 *  on the placeholder rather than leaving a blank frame (COR-23). Keyed by
 *  `src` at the call site, so a new image starts from "loading" again. */
export function ConceptImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [failed, setFailed] = React.useState(false);
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-bg-subtle", className)}>
      {failed ? (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-text-secondary">
          Image didn&apos;t load
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="block h-full w-full object-cover"
        />
      )}
    </div>
  );
}

/** Three lines, then "Show more" — only when the text really runs past them,
 *  measured by a ResizeObserver (its first callback is the first measure). */
function ClampedText({ text }: { text: string }) {
  const id = React.useId();
  const ref = React.useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = React.useState(false);
  const [clips, setClips] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const ro = new ResizeObserver(() => setClips(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  return (
    <div className="flex flex-col items-start gap-2">
      <p
        id={id}
        ref={ref}
        className={cn("max-w-[68ch] text-md leading-relaxed text-text-primary", !open && "line-clamp-3")}
      >
        {text}
      </p>
      {clips || open ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="min-h-[24px] rounded-sm text-sm font-semibold text-text-link outline-none transition-colors duration-fast ease-standard hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
```

**3.7 Create `src/components/projects/product/product-page.tsx`:**
```tsx
"use client";

// ProductPage — /projects/[id]/products/[productId] (spec §3.4, §5.7). One
// product of one project, at one saved version: the breadcrumb, the header
// with its Build check, the version select and the one notice above the
// content (COR-31, COR-41, COR-108), and the identity row — the image, the
// frozen description, the part changes (owner only) and the booked facts.
//
// Everything on it is the booked snapshot the build was made from (the
// build-lock rule), so nothing here edits a thing: the page has no action
// buttons (COR-36). Open in editor, the Brief door and Network live on the
// project page. `?v=`, `?tab=` and `?view=buyer` are URL state (COR-7).

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConfidenceBadge, ConfidenceIssuesPanel } from "@/components/create/confidence-badge";
import { partChangesOf, partChangesText } from "@/lib/create/build-artifacts";
import { confidenceFor } from "@/lib/create/confidence";
import { productsOf, useCreateHistory } from "@/lib/create/history";
import { can, type Viewer } from "@/lib/manual/permissions";
import { productPiecesOf, productVersionView, withQuery } from "@/lib/manual/product-page";
import { displayProductName } from "@/lib/manual/products-tab-view";
import {
  buildsOf,
  conceptOf,
  lineagesOf,
  productRowsOf,
  productsOfProject,
  versionsOf,
} from "@/lib/manual/project-read";
import { productDocTitle, resolveProject } from "@/lib/manual/project-route";
import { useManualProjects } from "@/lib/manual/projects";
import { LiveRegion, usePageArrival } from "../details/arrival";
import { Breadcrumb } from "../details/breadcrumb";
import { PAGE_CONTAINER, PAGE_CONTENT } from "../details/frame";
import { ProjectNotFound } from "../details/page-states";
import { ProductIdentity } from "./product-identity";
import { PreviewBanner, ProductLoading, ProductMissing, UnbuiltNote } from "./product-states";
import { VersionNoticeBlock, VersionSelect } from "./product-version";
import { When } from "./when";

export function ProductPage({ id, productId }: { id: string; productId: string }) {
  // useSearchParams needs a boundary so the route can still be pre-rendered.
  // The body renders only once the stores hydrate in the browser, so the
  // fallback is the loading shape itself.
  return (
    <React.Suspense fallback={<ProductLoading />}>
      <ProductPageBody id={id} productId={productId} />
    </React.Suspense>
  );
}

function ProductPageBody({ id, productId }: { id: string; productId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const search = query.toString();
  const { hydrated, projects } = useManualProjects();
  const { hydrated: buildsHydrated, builds, chats } = useCreateHistory();

  // The one permission source (PPL-1): the preview is the owner looking with
  // a visitor's permissions (PPL-2).
  const buyer = query.get("view") === "buyer";
  const viewer: Viewer = buyer ? { kind: "owner-preview" } : { kind: "local-owner" };
  const ownerFacts = can(viewer, "facts.seeOwnerOnly");

  // By id, then by slug — the project page's own rule (COR-1).
  const project = resolveProject(projects, id);

  const derived = React.useMemo(() => {
    if (!project) return null;
    const refs = buildsOf(project, builds);
    return {
      products: productsOfProject(project, refs),
      versions: versionsOf(refs, lineagesOf(refs, chats), productRowsOf(project)),
    };
  }, [project, builds, chats]);

  const product = derived?.products.find((p) => p.id === productId) ?? null;
  // The buyer sees the product as the project has it now: older versions are
  // the owner's history, like the rail's Versions block (PPL-7).
  const asked = buyer ? null : query.get("v");
  const view = React.useMemo(
    () => (product && derived ? productVersionView(product, derived.versions, asked) : null),
    [product, derived, asked],
  );
  const job = view?.build.job ?? null;
  const shownId = view?.productId ?? null;
  const bp = React.useMemo(
    () => (job && shownId ? productsOf(job).find((x) => x.id === shownId) ?? null : null),
    [job, shownId],
  );

  // §4.4.9 — this product's own tier, from the build it belongs to.
  const confidence = React.useMemo(
    () => (job && bp ? confidenceFor(job, productsOf(job)).byProduct.find((c) => c.productId === bp.id) ?? null : null),
    [job, bp],
  );
  const issuesKey = `${view?.build.buildId ?? ""}:${bp?.id ?? ""}`;
  const [issues, setIssues] = React.useState({ key: "", open: false });
  const issuesOpen = issues.key === issuesKey && issues.open;

  // What the maker changed on the spec sheet before the build (owner only).
  // The description beside it is the concept's, frozen before any edit (H-7).
  const partChanges = React.useMemo(() => {
    if (!job || !bp || !ownerFacts) return null;
    const concept = conceptOf(chats.find((c) => c.id === job.chatId), job, bp);
    const changes = concept ? partChangesOf(bp, concept) : null;
    return changes ? partChangesText(changes) : null;
  }, [job, bp, chats, ownerFacts]);

  const name = product ? displayProductName(product.name) : "";
  // COR-7 — focus to the h1 and a polite "{product}" on arrival, once per
  // product (a version or tab change keeps focus where the maker put it);
  // COR-3 — the document title.
  const { titleRef, live } = usePageArrival(
    project && product ? `${project.id}/${product.id}` : "",
    name,
    project && product ? productDocTitle(name, project.name) : "",
  );

  if (!hydrated || !buildsHydrated) return <ProductLoading />;
  if (!project) return <ProjectNotFound id={id} />;
  const projectHref = `/projects/${project.id}${buyer ? "?view=buyer" : ""}`;
  if (!product) return <ProductMissing projectName={project.name} href={projectHref} />;

  const home = view?.home ?? 1;
  const hrefFor = (n: number) => `${pathname}${withQuery(search, { v: n === home ? null : String(n) })}`;
  const pieces = bp ? productPiecesOf(bp.items) : null;
  const description = bp?.description?.trim() || product.description.trim();

  return (
    <div className={PAGE_CONTAINER}>
      <div className={`${PAGE_CONTENT} flex flex-col gap-10`}>
        {buyer && (
          <PreviewBanner
            onExit={() => {
              // The banner and its button leave with the preview; focus lands on the h1.
              router.push(`${pathname}${withQuery(search, { view: null })}`);
              titleRef.current?.focus({ preventScroll: true });
            }}
          />
        )}

        <Breadcrumb
          trail={[
            { label: "My projects", href: "/projects" },
            { label: project.name, href: projectHref },
            { label: name },
          ]}
        />

        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
            <h1
              ref={titleRef}
              tabIndex={-1}
              className="min-w-0 break-words text-3xl font-bold tracking-tight text-text-primary outline-none"
            >
              {name}
            </h1>
            {confidence && (
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-text-secondary">Build check</span>
                <ConfidenceBadge
                  confidence={confidence}
                  open={issuesOpen}
                  onOpenChange={(open) => setIssues({ key: issuesKey, open })}
                />
              </div>
            )}
          </div>
          {/* The disclosure's text — what Draft means and the credit note —
              gets the header's full width, not the badge's corner (L1). */}
          {issuesOpen && confidence?.tier === "draft" && <ConfidenceIssuesPanel confidence={confidence} />}

          {view && (
            <div className="flex flex-col gap-4 [@container(min-width:560px)]:flex-row [@container(min-width:560px)]:flex-wrap [@container(min-width:560px)]:items-center">
              {!buyer && view.options.length > 1 && (
                <VersionSelect view={view} onPick={(n) => router.push(hrefFor(n), { scroll: false })} />
              )}
              {job && pieces && (
                <p className="text-sm text-text-secondary">
                  Built <When at={job.endedAt ?? job.createdAt} /> · Concept {job.conceptNumber} ·{" "}
                  {pieces.ready} of {pieces.total} pieces ready
                </p>
              )}
            </div>
          )}
          {view?.notice && (
            <VersionNoticeBlock notice={view.notice} name={name} home={home} hrefFor={hrefFor} />
          )}
        </header>

        {!view ? (
          <UnbuiltNote state={product.state} />
        ) : job && bp ? (
          <ProductIdentity
            product={bp}
            name={name}
            description={description}
            version={view.shown}
            partChanges={partChanges}
          />
        ) : null}
        <LiveRegion text={live} />
      </div>
    </div>
  );
}
```

**3.8 Modify `src/components/projects/details/arrival.tsx`** (C1). This is the title effect inside `usePageArrival`. Find it by its text; C1 creates the file, so there are no line numbers today. Replace:
```tsx
  React.useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
```
with:
```tsx
  React.useEffect(() => {
    if (!title) return;
    const previous = document.title;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    // Next writes the layout's metadata <title> into <head> after the page's
    // own effects have run (seen on a hard load of the product page, Next
    // 16.2.9), which put "IDEEZA Creator Panel" back. So the title is applied
    // again whenever <head> changes; setting it changes <head> too, and the
    // equality check ends that loop at once.
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      watch.disconnect();
      document.title = previous;
    };
  }, [title]);
```
`if (!title) return;` lets the product page pass `""` while its record is still unresolved.

- [ ] **Step 4: Run. Expected: PASS**
```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
`product-page.test.mjs` shows 13 passing tests, and every earlier test file still passes.

- [ ] **Step 5: Browser check** (dev server `http://localhost:3002`, Task 0; desktop 1440 × 900 with the sidebar open, then 400 px).

**Seed.** Open `http://localhost:3002/file.svg`. It is a static file, so no app provider is running to rewrite storage while you write it. Run this in its console:
- It refuses any other origin.
- It merges by id, so other data in this browser stays.
- It writes the post-A1 shapes: `builds` refs, and product rows with `id` and `source`.
```js
(() => {
  if (location.origin !== "http://localhost:3002") throw new Error(`Refusing to seed ${location.origin}`);
  const now = Date.now(), day = 864e5;
  const items = (skip = [], failed = []) =>
    ["3d", "pcb", "code", "wiring", "parts"].filter((k) => !skip.includes(k))
      .map((k) => ({ kind: k, status: failed.includes(k) ? "failed" : "ready", progress: 100 }));
  const spec = (l, w, h, board, battery, runtimeH, batterySource) => ({
    kind: "electronic", size: { l, w, h }, minSize: { l, w, h }, battery, batterySource,
    material: "PETG", drawMa: 120, budgetMa: 1000, board, runtimeH,
  });
  const esp = { name: "ESP32-WROOM-32", role: "Runs the car", category: "Microcontroller" };
  const driver = { name: "L298N motor driver", role: "Drives both motors", category: "Actuator" };
  const nrf = { name: "nRF24L01+ 2.4 GHz module", role: "Talks to the remote", category: "Connectivity" };
  const atmega = { name: "ATmega328P", role: "Reads the sticks", category: "Microcontroller" };
  const sticks = { name: "Dual-axis joystick", role: "Steering and throttle", category: "Display & I/O" };
  const sonar = { name: "HC-SR04 ultrasonic sensor", role: "Stops before walls", category: "Sensor" };
  const tp = { name: "TP4056 charger", role: "Charges the pack", category: "Power Management" };
  const remote = (parts) => ({
    id: "remote", name: "Remote Controller", title: "Remote Controller",
    conceptImageUrl: "/images/browse-project/ble-logger.png", conceptPrompt: "a remote",
    summary: parts.map((p) => p.name).join(" · "),
    description: "A handheld 2.4 GHz remote with two thumb sticks that drives the car from 50 m away.",
    parts, spec: spec(120, 60, 25, { w: 50, h: 40, parts: parts.length }, "aa-2", 5, "you"), items: items(),
  });
  const charger = {
    id: "charger", name: "Battery Charger", title: "Battery Charger",
    conceptImageUrl: "/api/concept/image/seed-missing", conceptPrompt: "a charger",
    summary: "TP4056 charger", description: "A small USB charger for the car's pack.",
    parts: [tp], items: items(["code"]),
  };
  const primary = {
    title: "RC Car Controller", conceptImageUrl: "/images/browse-project/gesture-led.png", conceptPrompt: "an RC car",
    summary: "ESP32 · L298N · nRF24L01", description: "A two-motor RC car with an ESP32 brain.", parts: [esp, driver, nrf],
  };
  const base = { chatId: "chat_seed_car", status: "ready", estimateMin: 1, creditsCharged: true, creditsRefunded: false,
    projectId: "proj_seed_car", attentionDismissedAt: now };
  const b1 = { ...base, ...primary, id: "bld_seed_car_v1", conceptNumber: "1", items: items(),
    companions: [remote([atmega, sticks, nrf]), charger],
    startedAt: now - 4 * day, endedAt: now - 4 * day + 6e4, createdAt: now - 4 * day, updatedAt: now - 4 * day };
  const b2 = { ...base, ...primary, id: "bld_seed_car_v2", conceptNumber: "2", items: items([], ["wiring"]),
    companions: [remote([atmega, sticks, nrf, sonar])],
    startedAt: now - day, endedAt: now - day + 6e4, createdAt: now - day, updatedAt: now - day };
  const chat = { id: "chat_seed_car", title: "Car", createdAt: now - 5 * day, updatedAt: now - day, turns: [
    { id: "t_seed_remote", role: "assistant", prompt: "a remote", kind: "fresh", status: "ready",
      imageUrl: "/images/browse-project/ble-logger.png", companionOf: "remote",
      concept: { title: "Remote Controller", summary: "", description: "", parts: [atmega, sticks, nrf] }, ts: now - 5 * day },
  ] };
  const flowState = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
  const car = { id: "proj_seed_car", slug: "car-seed", name: "Car", productName: "RC Car Controller",
    description: "A two-motor RC car with an ESP32 brain and a 2.4 GHz remote.", status: "draft",
    createdAt: now - 4 * day, updatedAt: now - day, flowState, buildId: "bld_seed_car_v1",
    builds: [
      { buildId: "bld_seed_car_v1", chatId: "chat_seed_car", version: 1, savedAt: now - 4 * day },
      { buildId: "bld_seed_car_v2", chatId: "chat_seed_car", version: 2, savedAt: now - day },
    ],
    products: [
      { id: "prd_seedctrl", name: "RC Car Controller", description: "A two-motor RC car with an ESP32 brain.",
        source: { buildId: "bld_seed_car_v2", productId: "primary" }, updatedAt: now - day },
      { id: "prd_seedremo", name: "Remote Controller", description: "A handheld remote.",
        source: { buildId: "bld_seed_car_v2", productId: "remote" }, updatedAt: now - day },
      { id: "prd_seedchrg", name: "Battery Charger", description: "A small USB charger for the car's pack.",
        source: { buildId: "bld_seed_car_v1", productId: "charger" }, updatedAt: now - 4 * day },
    ] };
  const lamp = { id: "proj_seed_lamp", slug: "desk-lamp-seed", name: "Desk Lamp", productName: "Desk Lamp",
    description: "", status: "draft", createdAt: now - 2 * day, updatedAt: now - 2 * day, flowState,
    products: [{ id: "p1", name: "Desk Lamp", description: "" }] };
  const put = (key, add, ids) => {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
    if (!Array.isArray(list)) list = [];
    localStorage.setItem(key, JSON.stringify([...add, ...list.filter((x) => !ids.includes(x.id))]));
  };
  put("ideeza:create:builds", [b2, b1], ["bld_seed_car_v1", "bld_seed_car_v2"]);
  put("ideeza:create:chats", [chat], ["chat_seed_car"]);
  put("ideeza:manual:projects", [car, lamp], ["proj_seed_car", "proj_seed_lamp"]);
  return "seeded";
})();
```
In the results below, "D−1" means yesterday's date and "D−4" four days ago, both as A3's `formatDate` prints them ("Sep 25, 2026").

1. **Open `/projects/proj_seed_car/products/prd_seedremo`.**
   - The skeleton shows first, then the page. The page never shows a not-found state.
   - After about 2 s the tab title still reads **"Remote Controller · Car · IDEEZA"**. This checks the 3.8 fix.
   - Focus is on the h1 "Remote Controller".
   - The breadcrumb reads "My projects › Car › Remote Controller". "Car" links to `/projects/proj_seed_car`, and the last crumb has `aria-current="page"`.
2. **The header.**
   - "Build check" is followed by the Draft badge and "2 passed · 1 not run". Pressing the badge opens a full-width panel. It starts "Power and fit were checked and passed…" and ends with the credit note ("… no credits are refunded …").
   - The select reads **"Version 2 of 2"**. Opened, it lists "Version 2 of 2 · D−1 · current", then "Version 1 of 2 · D−4".
   - The meta line reads "Built D−1 · Concept 2 · 5 of 5 pieces ready".
   - Hovering the date shows the full date and time.
3. **The identity row.**
   - The concept image (4:3) sits left, and the text sits right.
   - The text: "A handheld 2.4 GHz remote with two thumb sticks that drives the car from 50 m away."
   - Then: **"Built with your part changes: swapped 1S Li-Po 400 mAh → 2 × AA"**.
   - Then the facts: Size "120 × 60 × 25 mm", Board "2-layer 50 × 40 mm", Power "2 × AA · ~5 h per battery", Radio "nRF24L01". These are the same words the Remote Controller card on the Products tab prints.
   - There is no "worked out" line.
   - The page has no action buttons: no Open in editor, Save, Retry or Brief.
4. **Choose "Version 1 of 2".**
   - The URL becomes `…/prd_seedremo?v=1`, and the page stays scrolled where it was.
   - An info notice reads "You're viewing version 1 (D−4). The project now uses version 2.", with **Back to latest** beside it.
   - The meta line reads "Built D−4 · Concept 1 · 5 of 5 pieces ready".
   - Press Back to latest: the URL loses `?v` and the notice goes. The browser's Back returns to `?v=1`.
5. **Open `/projects/proj_seed_car/products/prd_seedchrg`.**
   - The select reads "Version 1 of 2". Opened, its Version 2 row says "D−1 · current · not in this version".
   - The notice reads "Version 2 doesn't include Battery Charger — this is version 1, the last one that did.", with no Back to latest.
   - The image box reads "Image didn't load".
   - The facts start "Size 86 × 39 × 12 mm" and "Board 2-layer 43 × 33 mm". Under them: "These facts are worked out from the parts — this build has no booked spec."
6. **Add `?v=2` to that URL.**
   - The notice is titled "Not in version 2", with "Battery Charger isn't part of version 2 of this project." and **Open version 1**, which goes to the URL without `?v`.
   - There is no image, no facts and no Build check.
7. **`/projects/proj_seed_lamp/products/p1`** reads "Made by hand — its work is in the editor.", with no select and no Build check.
8. **`/projects/proj_seed_car/products/nope`** shows the h1 "This product isn't in Car", focused. **Back to the project** goes to `/projects/proj_seed_car`.
9. **`/projects/nope/products/x`** shows "We couldn't find this project", which is C1's card.
10. **`/projects/proj_seed_car/products/prd_seedremo?view=buyer&v=1`.**
    - The sticky banner "Previewing as a buyer" shows, with **Exit preview**.
    - There is no select and no part-changes line. The meta line says "Concept 2", so `?v` is ignored.
    - The "Car" crumb links to `/projects/proj_seed_car?view=buyer`.
    - Press Exit preview: the URL becomes `…?v=1`, the banner goes, the select comes back, and focus is on the h1.
11. **At 400 px** (the viewport set to 400 × 860, light, then dark):
    - The breadcrumb reads "My projects › … › Remote Controller". The "…" is a link whose accessible name is "Car".
    - The select is full width and 44 px tall. Back to latest (on `?v=1`) is full width.
    - `document.documentElement.scrollWidth === document.documentElement.clientWidth`, so nothing scrolls sideways.
    - Every text is readable in both themes. The notice uses the info tone.

- [ ] **Step 6: tsc, eslint, commit**
```
npx tsc --noEmit
npx eslint "src/app/(create)/projects/[id]/products/[productId]/page.tsx" src/lib/manual/product-page.ts src/components/projects/product/product-page.tsx src/components/projects/product/product-identity.tsx src/components/projects/product/product-version.tsx src/components/projects/product/product-states.tsx src/components/projects/product/when.tsx src/components/projects/details/arrival.tsx
git add "src/app/(create)/projects/[id]/products/[productId]/page.tsx" src/lib/manual/product-page.ts tests/projects/product-page.test.mjs src/components/projects/product/product-page.tsx src/components/projects/product/product-identity.tsx src/components/projects/product/product-version.tsx src/components/projects/product/product-states.tsx src/components/projects/product/when.tsx src/components/projects/details/arrival.tsx
git commit -m "$(cat <<'EOF'
feat(projects): the product page — its versions, their notices and the booked snapshot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
Both are clean, apart from the baseline errors in Task 0's table, none of which are in these files.

---

## C4b — the deliverable tabs, and the 3D viewer on demand

- [ ] **Step 1: Write the failing test**

Create `tests/projects/product-tabs.test.mjs`:
```js
// Task C4b — the product page's deliverable tabs (src/lib/manual/product-page.ts):
// the app's order, no tab for a piece the build never made (H-5), none for the
// firmware source in the buyer preview (PPL-7, COR-37), and which one opens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverableTabs, pickTab } from "../../.tmp-test/lib/manual/product-page.js";

const ORDER = ["3d", "pcb", "code", "wiring", "parts"];
const item = (kind, status) => ({ kind, status, progress: status === "ready" ? 100 : 40 });

test("a skipped piece has no tab, and the rest keep the app's order", () => {
  const items = [item("parts", "ready"), item("3d", "ready"), item("code", "skipped"), item("pcb", "failed"), item("wiring", "ready")];
  assert.deepEqual(deliverableTabs(items, ORDER, { firmware: true }).map((i) => i.kind), ["3d", "pcb", "wiring", "parts"]);
});

test("the buyer preview has no Firmware code tab", () => {
  const items = ORDER.map((k) => item(k, "ready"));
  assert.deepEqual(deliverableTabs(items, ORDER, { firmware: false }).map((i) => i.kind), ["3d", "pcb", "wiring", "parts"]);
  assert.equal(deliverableTabs(items, ORDER, { firmware: true }).length, 5);
});

test("pickTab takes ?tab= when it is a tab, else the first finished piece", () => {
  const tabs = [item("3d", "failed"), item("pcb", "ready"), item("parts", "ready")];
  assert.equal(pickTab(tabs, "parts"), "parts");
  assert.equal(pickTab(tabs, "code"), "pcb");
  assert.equal(pickTab(tabs, null), "pcb");
  assert.equal(pickTab([item("3d", "failed")], null), "3d");
  assert.equal(pickTab([], "pcb"), null);
});
```

- [ ] **Step 2: Run it. Expected: FAIL**
```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
The module exists but doesn't export the two functions yet:
```
SyntaxError: Named export 'deliverableTabs' not found. The requested module '../../.tmp-test/lib/manual/product-page.js' is a CommonJS module, which may not support all module.exports as named exports.
```
`product-tabs.test.mjs` fails, and `product-page.test.mjs` still passes 13/13.

- [ ] **Step 3: Implement**

**3.1 Modify `src/lib/manual/product-page.ts`** (C4a's file). There are three edits.

In the header comment, replace:
```ts
// how many of its pieces are ready (COR-31), and its URL with one key
// changed. The booked facts are the Products tab's own `productFacts()`
// (products-tab-view.ts), so the card and this page word them the same way.
```
with:
```ts
// which deliverable tabs it has (COR-32, COR-37), how many of its pieces are
// ready (COR-31), and its URL with one key changed. The booked facts are the
// Products tab's own `productFacts()` (products-tab-view.ts), so the card and
// this page word them the same way.
```

Replace the type import:
```ts
import type { BuildItem, BuildJob } from "../create/history";
```
with:
```ts
import type { BuildItem, BuildItemKind, BuildJob } from "../create/history";
```

Replace the section rule `// ───────────────────────────── pieces ─────────────────────────────` with the tabs section below. `productPiecesOf` and everything after it stay as they are, with no rule of their own.
```ts
// ───────────────────────────── tabs ─────────────────────────────

/** The deliverable tabs, in the app's order (`ITEM_KINDS`, passed in). A
 *  piece this build never made has no tab (H-5); the firmware source is kept
 *  back when `firmware` is false — the buyer preview, where it comes after
 *  purchase (PPL-7, COR-37). */
export function deliverableTabs(
  items: BuildItem[],
  order: readonly BuildItemKind[],
  opts: { firmware: boolean },
): BuildItem[] {
  return order
    .map((kind) => items.find((i) => i.kind === kind))
    .filter(
      (i): i is BuildItem =>
        !!i && i.status !== "skipped" && (opts.firmware || i.kind !== "code"),
    );
}

/** The tab on screen: the one `?tab=` names when it is there, else the first
 *  finished piece, else the first tab. Null when there is no tab at all. */
export function pickTab(tabs: BuildItem[], asked: string | null): BuildItemKind | null {
  return (
    tabs.find((i) => i.kind === asked)?.kind ??
    tabs.find((i) => i.status === "ready")?.kind ??
    tabs[0]?.kind ??
    null
  );
}
```

**3.2 Create `src/components/create/model-panel/model-panel-lazy.tsx`.** C9 reuses it for the build review, so C9's own copy of this file is dropped. C9 had `loading: () => null`; this one says what it is waiting for, because a press followed by a blank pause reads as a click that missed.
```tsx
"use client";

// ModelPanel, loaded on demand. The panel's code — and three.js behind it —
// arrives in its own chunk the first time this renders, never with the page
// that holds it (COR-33, COR-102). A page mounts it only once the maker asks
// for the model (the product page's View in 3D). Props are ModelPanel's own.

import * as React from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ideeza";

export const ModelPanelLazy = dynamic(
  () => import("./model-panel").then((m) => m.ModelPanel),
  { ssr: false, loading: () => <ViewerLoading /> },
);

function ViewerLoading() {
  return (
    <div
      role="status"
      className="flex h-[420px] items-center justify-center gap-4 rounded-xl border border-border bg-bg-subtle text-md text-text-secondary"
    >
      <Spinner />
      Loading the 3D viewer…
    </div>
  );
}
```
(`next/dynamic` in a client component, `ssr: false`: `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`.)

**3.3 Create `src/components/projects/product/product-deliverables.tsx`:**
```tsx
"use client";

// The product page's deliverable tabs (COR-32…34, COR-37): 3D model · PCB ·
// Firmware code · Wiring · Parts, in the app's order and with its labels, one
// panel at a time. Each panel is the build review's own preview component
// over this product at this version, with the review's "What this covers"
// aside beside it (artifact + a 260 px aside from a 640 px page), so the two
// surfaces say the same thing about the same product.
//
// No review controls live here (COR-36): no Retry, Save, Refine or spec edit.
// A failed piece says where it can be retried and links to the chat. The 3D
// viewer and three.js load only when the maker asks for the model (COR-33,
// COR-102), and only the primary product wears the generated mesh.

import * as React from "react";
import Link from "next/link";
import { ThreeDViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  coversFor,
  FirmwarePreview,
  PartsPreview,
  PartsSummary,
  PcbPreview,
  WiringPreview,
} from "@/components/create/deliverable-previews";
import { ModelPanelLazy } from "@/components/create/model-panel/model-panel-lazy";
import { Button, buttonVariants } from "@/components/ideeza";
import { isSampleModel } from "@/lib/create/build-artifacts";
import {
  ITEM_KINDS,
  ITEM_LABELS,
  type BuildItem,
  type BuildItemKind,
  type BuildJob,
  type BuildProduct,
} from "@/lib/create/history";
import { deliverableTabs, pickTab } from "@/lib/manual/product-page";
import { deriveAssembly } from "@/lib/three/assembly";
import { moveTab, revealDelta } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";
import { ConceptImage } from "./product-identity";

/** Each preview under its own h3, in a named scroll region the keyboard can
 *  reach (COR-34). The Parts table carries its own h3. */
const PREVIEW: Record<Exclude<BuildItemKind, "3d">, { heading: string | null; region: string }> = {
  pcb: { heading: "PCB layout", region: "PCB layout, scrollable" },
  code: { heading: "Firmware code", region: "Firmware code, scrollable" },
  wiring: { heading: "Wiring map", region: "Wiring map, scrollable" },
  parts: { heading: null, region: "Parts list, scrollable" },
};

// The project page's tab look (C1's TabStrip): neutral, the subtle fill plus
// a text-primary underline — never violet; 44 px on touch.
const TAB =
  "inline-flex h-[36px] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-8 text-md font-semibold leading-md outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";

// A link dressed as the quiet button; the hover keeps the button's text colour.
const LINK_BUTTON = cn(
  buttonVariants({ hierarchy: "secondary", size: "md" }),
  "hover:text-[color:var(--color-button-secondary-text)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
);

export function ProductDeliverables({
  job,
  product,
  firmware,
  chatHref,
  tab,
  onTab,
}: {
  /** The build of the version on screen. */
  job: BuildJob;
  /** This product inside it. */
  product: BuildProduct;
  /** False in the buyer preview: the firmware source comes after purchase (PPL-7). */
  firmware: boolean;
  /** The chat a failed piece is retried in; null in the preview or when the chat is gone. */
  chatHref: string | null;
  /** `?tab=` as the URL has it. */
  tab: string | null;
  /** Writes `?tab=` (replace, not push — COR-32). */
  onTab: (kind: BuildItemKind) => void;
}) {
  const tabs = React.useMemo(
    () => deliverableTabs(product.items, ITEM_KINDS, { firmware }),
    [product.items, firmware],
  );
  // The pick shows at once; the URL follows it by replace. The parent keys
  // this component by version and product, so a new version starts over.
  const [picked, setPicked] = React.useState<BuildItemKind | null>(null);
  const shown = pickTab(tabs, picked ?? tab);
  const item = tabs.find((i) => i.kind === shown) ?? null;
  const uid = React.useId();
  const tabId = (kind: BuildItemKind) => `${uid}-tab-${kind}`;
  const panelId = `${uid}-panel`;
  const listRef = React.useRef<HTMLDivElement>(null);

  const select = (kind: BuildItemKind) => {
    setPicked(kind);
    onTab(kind);
  };

  // At phone width the strip is one row that scrolls sideways (COR-21): keep
  // the selected tab in view — only the strip moves, never the page.
  React.useEffect(() => {
    const list = listRef.current;
    const el = shown ? list?.querySelector<HTMLElement>(`[data-tab="${shown}"]`) : null;
    if (!list || !el) return;
    const delta = revealDelta(el.getBoundingClientRect(), list.getBoundingClientRect(), 8);
    if (delta === 0) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: delta, behavior: still ? "auto" : "smooth" });
  }, [shown]);

  if (!shown || !item) {
    return (
      <p className="rounded-xl border border-dashed border-border px-10 py-12 text-center text-md text-text-secondary">
        This build made no deliverables for this product.
      </p>
    );
  }

  return (
    <section aria-labelledby={`${uid}-heading`} className="flex flex-col gap-8">
      <h2 id={`${uid}-heading`} className="sr-only">
        Deliverables
      </h2>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Deliverables"
        onKeyDown={(e) => moveTab(e, tabs.map((i) => i.kind), shown, select)}
        className="flex flex-nowrap items-end gap-2 overflow-x-auto overflow-y-hidden border-b border-solid border-border"
      >
        {tabs.map((i) => {
          const on = i.kind === shown;
          return (
            <button
              key={i.kind}
              id={tabId(i.kind)}
              role="tab"
              type="button"
              data-tab={i.kind}
              aria-selected={on}
              aria-controls={panelId}
              tabIndex={on ? 0 : -1}
              onClick={() => select(i.kind)}
              className={cn(TAB, on ? TAB_ON : TAB_OFF)}
            >
              {ITEM_LABELS[i.kind]}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(shown)}>
        {item.status !== "ready" ? (
          <Split
            artifact={<PieceNotReady item={item} chatHref={chatHref} />}
            aside={<Covers kind={item.kind} job={job} product={product} />}
          />
        ) : item.kind === "3d" ? (
          <ModelTab job={job} product={product} />
        ) : (
          <Split
            artifact={<Preview kind={item.kind} product={product} />}
            aside={<Covers kind={item.kind} job={job} product={product} />}
          />
        )}
      </div>
    </section>
  );
}

/** The review's layout: the artifact, and the 260 px aside beside it once the
 *  page is 640 px wide; below that the aside stacks under it, full width. */
function Split({ artifact, aside }: { artifact: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="grid gap-8 [@container(min-width:640px)]:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">{artifact}</div>
      <div className="[@container(min-width:640px)]:border-l [@container(min-width:640px)]:border-solid [@container(min-width:640px)]:border-border [@container(min-width:640px)]:pl-8">
        {aside}
      </div>
    </div>
  );
}

function Preview({ kind, product }: { kind: Exclude<BuildItemKind, "3d">; product: BuildProduct }) {
  const { heading, region } = PREVIEW[kind];
  return (
    <>
      {heading && <h3 className="sr-only">{heading}</h3>}
      <div
        role="region"
        aria-label={region}
        tabIndex={0}
        className="max-h-[520px] overflow-auto rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {kind === "pcb" && <PcbPreview job={product} />}
        {kind === "code" && <FirmwarePreview job={product} />}
        {kind === "wiring" && <WiringPreview job={product} />}
        {kind === "parts" && <PartsPreview job={product} />}
      </div>
    </>
  );
}

/** "What this covers" — `coversFor` verbatim, the review's honesty rules
 *  with it: the sample mesh, a companion's borrowed shape, a booked spec or
 *  one worked out from the parts. */
function Covers({ kind, job, product }: { kind: BuildItemKind; job: BuildJob; product: BuildProduct }) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-8">
      {kind === "parts" && <PartsSummary job={product} />}
      <section aria-labelledby={id}>
        <h3 id={id} className="text-sm font-semibold text-text-primary">
          What this covers
        </h3>
        <ul
          role="list"
          className="mt-3 flex list-disc flex-col gap-2 pl-5 text-md leading-relaxed text-text-secondary marker:text-text-tertiary"
        >
          {coversFor(kind, product, isSampleModel(job.modelGlbUrl), product.id !== "primary").map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** A piece that isn't there to look at says what happened to it (COR-32). */
function PieceNotReady({ item, chatHref }: { item: BuildItem; chatHref: string | null }) {
  const text =
    item.status === "failed"
      ? `This piece failed in this build.${chatHref ? " Retry it in the chat." : ""}`
      : item.status === "building"
        ? `This piece is still being built — ${Math.round(item.progress)}%.`
        : "This piece is waiting to be built.";
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-6 rounded-xl border border-border bg-bg-subtle p-10 text-center">
      <p className="max-w-[44ch] text-md text-text-secondary">{text}</p>
      {item.status === "failed" && chatHref && (
        <Link href={chatHref} className={LINK_BUTTON}>
          Open chat
        </Link>
      )}
    </div>
  );
}

/** COR-33 — the resting state is the concept image and View in 3D; the viewer
 *  mounts only then. Only the primary gets the generated mesh: the job makes
 *  one, from the primary's concept image, so a companion wearing it would
 *  claim a shape it never had. No retry here (`onRetryMesh` is omitted). */
function ModelTab({ job, product }: { job: BuildJob; product: BuildProduct }) {
  const [open, setOpen] = React.useState(false);
  const viewerRef = React.useRef<HTMLDivElement>(null);
  const primary = product.id === "primary";
  const assembly = React.useMemo(
    () =>
      open
        ? deriveAssembly({
            title: product.title,
            parts: product.parts,
            spec: product.spec,
            meshUrl: primary ? job.modelGlbUrl : undefined,
          })
        : null,
    [open, product.title, product.parts, product.spec, primary, job.modelGlbUrl],
  );
  const shellNote = !primary ? null : job.modelFailed ? "failed" : !job.modelGlbUrl ? "pending" : null;

  // The button that opened it is gone; focus moves into the viewer's region.
  React.useEffect(() => {
    if (open) viewerRef.current?.focus();
  }, [open]);

  if (!open || !assembly) {
    return (
      <Split
        artifact={
          <div className="flex flex-col items-start gap-6">
            <h3 className="sr-only">3D model</h3>
            {product.conceptImageUrl ? (
              <ConceptImage
                key={product.conceptImageUrl}
                src={product.conceptImageUrl}
                alt={`${product.name} concept image`}
                className="aspect-[4/3] w-full max-w-[360px]"
              />
            ) : null}
            <p className="text-md text-text-secondary">The 3D model loads when you open it.</p>
            <Button
              hierarchy="secondary"
              size="md"
              onClick={() => setOpen(true)}
              iconLeading={<Icon icon={ThreeDViewIcon} size={16} />}
              className="[@media(pointer:coarse)]:min-h-[var(--touch-min)]"
            >
              View in 3D
            </Button>
          </div>
        }
        aside={<Covers kind="3d" job={job} product={product} />}
      />
    );
  }

  // The model carries its own rail, so it takes the whole width and the
  // aside follows it below.
  return (
    <div className="flex flex-col gap-10">
      <div ref={viewerRef} tabIndex={-1} role="region" aria-label={`3D model of ${product.name}`} className="outline-none">
        <h3 className="sr-only">3D model</h3>
        <ModelPanelLazy key={product.id} assembly={assembly} shellNote={shellNote} />
      </div>
      <Covers kind="3d" job={job} product={product} />
    </div>
  );
}
```

**3.4 Modify `src/components/projects/product/product-page.tsx`** (C4a's file). There are four edits.

In the header comment, replace:
```tsx
// content (COR-31, COR-41, COR-108), and the identity row — the image, the
// frozen description, the part changes (owner only) and the booked facts.
```
with:
```tsx
// content (COR-31, COR-41, COR-108), the identity row — the image, the
// frozen description, the part changes (owner only) and the booked facts —
// and the deliverable tabs (COR-32…34).
```

Add the import above `import { ProductIdentity } from "./product-identity";`:
```tsx
import { ProductDeliverables } from "./product-deliverables";
```

Hoist the second permission beside the first. Keeping every `can(viewer, …)` above the memos keeps the React Compiler lint's `preserve-manual-memoization` rule quiet. Replace:
```tsx
  const ownerFacts = can(viewer, "facts.seeOwnerOnly");
```
with:
```tsx
  const ownerFacts = can(viewer, "facts.seeOwnerOnly");
  // The firmware source and every download come after purchase (PPL-7).
  const firmware = can(viewer, "deliverables.download");
```

Mount the tabs under the identity row. Replace:
```tsx
        ) : job && bp ? (
          <ProductIdentity
            product={bp}
            name={name}
            description={description}
            version={view.shown}
            partChanges={partChanges}
          />
        ) : null}
```
with:
```tsx
        ) : job && bp ? (
          <>
            <ProductIdentity
              product={bp}
              name={name}
              description={description}
              version={view.shown}
              partChanges={partChanges}
            />
            <ProductDeliverables
              key={`${job.id}:${bp.id}`}
              job={job}
              product={bp}
              firmware={firmware}
              chatHref={ownerFacts && chats.some((c) => c.id === job.chatId) ? `/chat/${job.chatId}` : null}
              tab={query.get("tab")}
              onTab={(kind) => router.replace(`${pathname}${withQuery(search, { tab: kind })}`, { scroll: false })}
            />
          </>
        ) : null}
```

- [ ] **Step 4: Run. Expected: PASS**
```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
`product-tabs.test.mjs` passes 3/3 and `product-page.test.mjs` 13/13. Every earlier file still passes.

- [ ] **Step 5: Browser check** (same server and seed as C4a Step 5; re-run the seed if storage was cleared.)

1. **`/projects/proj_seed_car/products/prd_seedremo`.**
   - The tabs read **3D model · PCB · Firmware code · Wiring · Parts**. 3D model is selected, with the neutral fill and underline and no violet.
   - The panel shows the concept image, "The 3D model loads when you open it." and **View in 3D**.
   - The aside is titled "What this covers" and includes "Shape: the primary's model — this product has no mesh of its own".
2. **The viewer loads only on demand.**
   - Before pressing, `performance.getEntriesByType("resource").filter(e => /model-panel/.test(e.name)).length` is `0`.
   - Press View in 3D. "Loading the 3D viewer…" appears, then the viewer with its canvas.
   - Focus is on the region "3D model of Remote Controller", and the resource count is now > 0.
   - "What this covers" follows the viewer below it, full width.
3. **Keyboard.**
   - Tab to the selected tab and press → : PCB is selected, the URL gains `?tab=pcb`, and `history.length` hasn't changed (the write is a replace).
   - End selects Parts, and Home selects 3D model. Only the selected tab is a Tab stop.
4. **PCB.** Its board diagram sits in a region named "PCB layout, scrollable", which Tab reaches (focus ring visible) and the arrow keys scroll. The aside includes "Fab profile: Standard 2-layer — 0.15 mm track/space, …".
5. **Parts.** The BOM table ("Parts in this build") shows, with "Parts summary" above "What this covers" in the aside.
6. **`/projects/proj_seed_car/products/prd_seedctrl?tab=wiring`.**
   - The meta line reads "4 of 5 pieces ready".
   - The panel reads "This piece failed in this build. Retry it in the chat." with **Open chat**, which links to `/chat/chat_seed_car`.
   - There is no Retry button.
7. **`/projects/proj_seed_car/products/prd_seedchrg`.** The tabs are 3D model · PCB · Wiring · Parts. There is no Firmware code tab, because the piece was skipped (H-5).
8. **Choose version 1 on the remote while its viewer is open.** The panel returns to the 3D resting state, because the tabs remount for the new build.
9. **Buyer view.**
   - `/projects/proj_seed_car/products/prd_seedremo?view=buyer&tab=code` shows the tabs 3D model · PCB · Wiring · Parts, with 3D model selected (`code` is not a tab there).
   - `/projects/proj_seed_car/products/prd_seedctrl?view=buyer&tab=wiring` reads "This piece failed in this build." with no Open chat.
10. **At 400 px** (light, then dark):
    - The tab strip is one row that scrolls sideways. Selecting Parts scrolls the strip, not the page.
    - With touch emulation each tab is 44 px tall.
    - The aside stacks under the panel.
    - `scrollWidth === clientWidth` on the document.

- [ ] **Step 6: tsc, eslint, commit**
```
npx tsc --noEmit
npx eslint src/lib/manual/product-page.ts src/components/create/model-panel/model-panel-lazy.tsx src/components/projects/product/product-deliverables.tsx src/components/projects/product/product-page.tsx
git add src/lib/manual/product-page.ts tests/projects/product-tabs.test.mjs src/components/create/model-panel/model-panel-lazy.tsx src/components/projects/product/product-deliverables.tsx src/components/projects/product/product-page.tsx
git commit -m "$(cat <<'EOF'
feat(projects): the product page's deliverable tabs, with the 3D viewer on demand

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

**Hand-offs to other tasks (for the controller):**
- **C6:** switch the product page from its inline viewer parse and `PreviewBanner` to `useViewer()` and `<BuyerPreviewBanner />`. This page has no `PREVIEW_TRIGGER_ID` button, so Exit preview should focus the h1 here.
- **C3:** in the buyer preview, the product card's link must keep `?view=buyer` (COR-37). Today it is `/projects/${projectId}/products/${pp.id}`.
- **C3 / A2:** `productPiecesOf(items)` here counts one product's pieces. It is the same rule as C3's `piecesOf(items)` (merge-notes: renamed `piecesOfItems`). Keep one of the two.
- **C9:** reuse this `ModelPanelLazy` and drop its own copy of the file.
- **C1:** C4a Step 3.8 changes `arrival.tsx`'s title effect. If C1 takes that fix into its own task, drop Step 3.8 here.
