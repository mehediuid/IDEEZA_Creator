### Task A6: The writers — one merge, a rebuild saved as v2, and the Brief's Step 1

**Spec delta check (commit e599fcf, with its "Harness notes"):** applied.
- "The headline product never becomes a dropped row": `attach()` picks the headline from the rows this version still holds (Step 3b).
- The dropped row keeps its old source: `attach()` pushes it unchanged.
- Harness notes: every `src/lib/**` value import this task adds is relative, the test imports `../../.tmp-test/lib/...`, and the run uses the quoted glob.

**Requirements:**
- **COR-88**: one writer for "a build joins a project", `attachBuild()`, idempotent by build id. Save, Open in editor and the Brief's Step 1 all use it. The Brief's own merge (`brief-app.tsx:809-859`) goes.
- **COR-89**: a rebuild is v2 at Save. `projectFromBuild(job, lineage)` attaches the build to the live project another build of its chat went into. The Brief's Step 1 defaults its project choice to that project.
- **COR-95**: the editor chrome's headline rename also renames `products[0]`, and the Brief's product count counts products, not builds.
- These §5.1.7 rows: "Pure attach", "A build joins a project", "Save / Open in editor", "Its callers pass the lineage", "Brief Step 1 default", "The Brief attaches a build", "Brief text edits", "Brief product count", and "Headline rename in the editor chrome".
- §5.1.8 in full, including the writer half of COR-39 (versions are appended, never renumbered) and of COR-108 (a dropped product stays).

**Not in this task:**
- The review footer's new copy, "Save it as version {n} of {project}." (**COR-40**, §5.12). This task only hands the lineage to `projectFromBuild`. It leaves a `lineage` memo in `ReviewPanel` that the COR-40 task can reuse with `lineageProjectOf()`.
- `setShowcase` (C7), `deleteProject` / `touchOpened` / `writeError` (A7), and the primary's description in `productsOf`, COR-90 (A2).

**Files:**
- Modify `src/lib/manual/projects.tsx`. The line numbers are today's. A1 and A4a edit this file first, so apply each change at the text anchor quoted in Step 3.
  - `:22`: the history import;
  - before `type Ctx = {` (`:173`): the pure writers;
  - `:185-188`: the `projectFromBuild` member of `Ctx`;
  - `:210`: after the `builtFrom` ref;
  - `:231-234`: after the active-id save effect;
  - `:250`: in `createProject`;
  - `:273-346`: `projectFromBuild`, replaced whole, A1's id edits inside it included;
  - `:397`: the context value.
- Modify `src/components/create/review-outputs.tsx`: `:14-16`, `:101-103`, `:224-238`.
- Modify `src/components/brief/brief-app.tsx`: `:41-45`, `:180-221` (and a new block after it), `:513-522`, `:528-542`, `:609`, `:744-755`, `:809-828`, `:847-859`, `:910-915`.
- Modify `src/components/manual/product-name-field.tsx`: `:10`, `:42-45`.
- Create `tests/projects/writers.test.mjs`.
- Test: `tests/projects/writers.test.mjs`, 11 tests.

**Interfaces:**
- **Consumes:**
  - **A1**, `src/lib/manual/projects.tsx`:
    - `ProductSource`, `ManualProduct { id; name; description; source?; updatedAt? }`, `ProjectBuildRef`, and `ManualProject.builds?`.
    - `ProjectPatch`, and `updateProject(id, patch: ProjectPatch)`, which runs `keepProductIds`. Rows handed over with ids keep them.
    - `export function newProductId(): string`.
    - The module-local `const norm = (s: string) => s.trim().toLowerCase()`.
    - `tests/projects/tsconfig.json`, whose `include` already covers `src/lib/manual/**/*`.
  - **A2**, `src/lib/manual/project-read.ts`:
    - `lineageProjectOf(job: BuildJob, all: BuildJob[], projects: ManualProject[]): ManualProject | null`
    - `modelNameOf(bp: BuildProduct, job: BuildJob): string`, which is attach()'s `modelName`
    - `buildsOf(p: ManualProject, all: BuildJob[]): BuildRef[]`
    - `productsOfProject(p: ManualProject, refs: BuildRef[]): ProjectProduct[]`
    - project-read.ts imports only types from `./projects`, so importing it back is not a runtime cycle.
  - **A2**, COR-90: `productsOf(job)[0].description` is `job.description` when that is set.
  - **Existing:**
    - `productsOf`, `BuildJob`, `BuildProduct`, and `useCreateHistory()` with `builds` and `setBuildProject(buildId, projectId)`: `src/lib/create/history.tsx`;
    - `BRIEF_DESC_MAX`: `src/lib/brief/types.ts`.
- **Produces:**
  ```ts
  // src/lib/manual/projects.tsx
  export function attach(p: ManualProject, job: BuildJob, lineage: BuildJob[], now: number,
                         opts?: { origin?: boolean }): ManualProject;
  export function saveTargetOf(job: BuildJob, lineage: BuildJob[], projects: ManualProject[]):
    { project: ManualProject; via: "saved" | "lineage" | "chosen" } | null;
  export type ProductEdit = { name: string; description: string; rowId?: string };
  export function mergeProductEdits(prev: ManualProduct[], edits: ProductEdit[], now: number): ManualProduct[];
  export function renameHeadline(p: ManualProject, name: string, now: number):
    Pick<ManualProject, "productName"> & Partial<Pick<ManualProject, "products">>;
  // Ctx, changed and new:
  projectFromBuild: (job: BuildJob, lineage?: BuildJob[]) => ManualProject;
  attachBuild: (projectId: string, job: BuildJob, lineage?: BuildJob[], opts?: { origin?: boolean }) => ManualProject | null;
  ```

**Decisions beyond the §5.1.8 sketch (each is tested, or checked in the browser):**
1. **`saveTargetOf()`** is steps 1, 3 and 4 of `projectFromBuild` as a pure function, so a unit test can run "rebuild twice, save each time" end to end. The in-session guard (step 2) and the create (step 5) stay in the provider.
2. **The headline's row is the first row not dropped by this version.** Every row the loop leaves out is recorded in a `dropped` set. The set also catches a sourceless legacy row that this version doesn't have, which the sketch's `source && priorIds.has(...)` test misses.
3. **Freezing legacy builds** also takes `b.id === p.buildId`, and keeps only `b.chatId === job.chatId`. `buildsOf()` treats both links alike, so the stored numbers match what the page showed before.
4. **"The previous version's words"** are looked up in the row's own source build, not in the first earlier build that has the same product id.
5. **`ProductEdit.rowId`** pins an edit to its row. Without one, the spec's rule applies: by position when the lengths match, else by name.
6. **The Brief writes only what the maker changed.** Step 1 opens on the build's own words (`buildWords`), and writing those back unchanged would undo a rename that `attach()` kept. So:
   - an unchanged field keeps the row's text;
   - a join keeps the project's headline unless the maker typed a new product name;
   - a project the Brief creates always takes the typed name.
   The target's draft is then seeded in the project's shape: the headline description, then the project's other rows. Each later Continue therefore lines Step 1 up with the rows it shows.
7. **The kept-brief branch writes no product text.** The notice there tells the maker their Step 1 wasn't carried over, so it must be true. The build still joins through `attachBuild`, with every product.
8. **`attachBuild` stores exactly the record it returns**, product ids included. A `made` ref lets it find a project that `createProject` made earlier in the same press. The Brief's "+ Create new project" creates and attaches in one handler, while `projects` still holds the list from before the create.

---

- [ ] **Step 1: Write the failing test**

  `tests/projects/writers.test.mjs` (new):
```js
// Task A6 — the writers (spec §5.1.7, §5.1.8): attach(), the Save target,
// the Brief's text edits and the headline rename. Pure functions only; the
// provider applies exactly these.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  attach,
  mergeProductEdits,
  renameHeadline,
  saveTargetOf,
} from "../../.tmp-test/lib/manual/projects.js";
import { buildsOf, productsOfProject } from "../../.tmp-test/lib/manual/project-read.js";

// ── fixtures ────────────────────────────────────────────────────────────────

const ITEMS = ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: "ready", progress: 100 }));
const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };

const companion = (id, name, description) => ({
  id, name, title: name, conceptImageUrl: "", conceptPrompt: name, summary: "", description, parts: [], items: ITEMS,
});
const REMOTE = companion("remote", "Remote controller", "Steers the car.");
const CHARGER = companion("charger", "Charger", "Charges the pack.");

function build({ id, createdAt, chatId = "chat_car", title = "RC car", description = "A small remote-controlled car.",
  companions = [], projectId, projectChoiceId, projectChoiceName = "Car" }) {
  return {
    id, chatId, conceptImageUrl: "", conceptPrompt: "a small rc car", title, summary: "ESP32-C3 · LiPo Battery",
    description, parts: [], conceptNumber: "1", status: "ready", estimateMin: 1, creditsCharged: true,
    creditsRefunded: false, items: ITEMS, companions, createdAt, updatedAt: createdAt,
    ...(projectId ? { projectId } : {}),
    ...(projectChoiceId ? { projectChoiceId } : {}),
    ...(projectChoiceName ? { projectChoiceName } : {}),
  };
}

function project(id, { name = "Car", productName = "", description = "", createdAt = 1, ...rest } = {}) {
  return { id, slug: id, name, productName, description, status: "draft", createdAt, updatedAt: createdAt,
    flowState: { ...FLOW }, ...rest };
}

// What Save does, without React: the provider's projectFromBuild (§5.1.8) over
// plain lists — minus its in-session double-press guard — followed by the
// review's setBuildProject.
function save(state, jobId, now) {
  const job = state.builds.find((b) => b.id === jobId);
  const lineage = state.builds.filter((b) => b.chatId === job.chatId && b.id !== job.id);
  const target = saveTargetOf(job, lineage, state.projects);
  const p = target?.via === "saved" ? target.project
    : target ? attach(target.project, job, lineage, now)
    : attach(project(`proj_${job.id}`, { name: job.projectChoiceName || job.title, createdAt: now }), job, [], now, { origin: true });
  return {
    project: p,
    projects: state.projects.some((x) => x.id === p.id)
      ? state.projects.map((x) => (x.id === p.id ? p : x))
      : [p, ...state.projects],
    builds: state.builds.map((b) => (b.id === job.id ? { ...b, projectId: p.id } : b)),
  };
}

// ── rebuild → v2 ─────────────────────────────────────────────────────────────

test("a chat rebuilt twice and saved each time is one project, at versions 1, 2 and 3", () => {
  let s = { projects: [], builds: [build({ id: "b1", createdAt: 100, companions: [REMOTE] })] };
  s = save(s, "b1", 1000);
  const ids = s.projects[0].products.map((r) => r.id);

  s = { ...s, builds: [...s.builds, build({ id: "b2", createdAt: 200, companions: [REMOTE] })] };
  s = save(s, "b2", 2000);
  s = { ...s, builds: [...s.builds, build({ id: "b3", createdAt: 300, companions: [REMOTE] })] };
  s = save(s, "b3", 3000);

  assert.equal(s.projects.length, 1);
  const [p] = s.projects;
  assert.equal(p.name, "Car");
  assert.deepEqual(p.builds, [
    { buildId: "b1", chatId: "chat_car", version: 1, savedAt: 1000 },
    { buildId: "b2", chatId: "chat_car", version: 2, savedAt: 2000 },
    { buildId: "b3", chatId: "chat_car", version: 3, savedAt: 3000 },
  ]);
  assert.equal(p.buildId, "b1"); // the origin, never re-stamped by a join
  assert.deepEqual(p.products.map((r) => r.id), ids); // same rows, same ids
  assert.deepEqual(p.products.map((r) => [r.name, r.source]), [
    ["RC car", { buildId: "b3", productId: "primary" }],
    ["Remote controller", { buildId: "b3", productId: "remote" }],
  ]);
  assert.equal(p.productName, "RC car");
  assert.deepEqual(buildsOf(p, s.builds).map((r) => r.version), [1, 2, 3]);
  // Every build points at the one project.
  assert.deepEqual([...new Set(s.builds.map((b) => b.projectId))], [p.id]);
});

test("saving the same build again changes nothing", () => {
  let s = { projects: [], builds: [build({ id: "b1", createdAt: 100 })] };
  s = save(s, "b1", 1000);
  const p = s.projects[0];
  assert.equal(attach(p, s.builds[0], [], 5000), p);
  const again = save(s, "b1", 5000);
  assert.equal(again.project, p);
  assert.equal(again.projects.length, 1);
});

test("the chat's saved project wins over the setup answer; a gone one does not count", () => {
  const chosen = project("proj_other", { name: "Other" });
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_car" });
  const car = project("proj_car", { builds: [{ buildId: "b1", chatId: "chat_car", version: 1, savedAt: 50 }] });
  const v2 = build({ id: "b2", createdAt: 200, projectChoiceId: "proj_other" });
  assert.deepEqual(saveTargetOf(v2, [v1], [car, chosen]), { project: car, via: "lineage" });
  // The chat's project is gone from this browser: the maker's choice stands.
  assert.deepEqual(saveTargetOf(v2, [v1], [chosen]), { project: chosen, via: "chosen" });
  // Nothing to join: Save makes a new project.
  assert.equal(saveTargetOf(build({ id: "b9", createdAt: 1 }), [], [chosen]), null);
  // Already saved: that project, as it is.
  assert.deepEqual(saveTargetOf({ ...v2, projectId: "proj_other" }, [v1], [car, chosen]), { project: chosen, via: "saved" });
});

// ── a dropped product stays (owner answer 5, COR-108) ───────────────────────

test("a product version 2 drops stays listed from version 1, and version 3 brings the same row back", () => {
  let s = { projects: [], builds: [build({ id: "b1", createdAt: 100, companions: [REMOTE, CHARGER] })] };
  s = save(s, "b1", 1000);
  const charger = s.projects[0].products.find((r) => r.name === "Charger");
  assert.match(charger.id, /^prd_[0-9a-z]{8}$/);

  s = { ...s, builds: [...s.builds, build({ id: "b2", createdAt: 200, companions: [REMOTE] })] };
  s = save(s, "b2", 2000);
  const v2 = s.projects[0];
  assert.equal(v2.products.length, 3);
  // The same row, untouched: its id, its words, its source (still version 1) and its time.
  assert.equal(v2.products.find((r) => r.id === charger.id), charger);
  const listed = productsOfProject(v2, buildsOf(v2, s.builds));
  assert.deepEqual(listed.map((x) => [x.name, x.dropped]), [
    ["RC car", null],
    ["Remote controller", null],
    ["Charger", { lastIn: 1, current: 2 }],
  ]);

  s = { ...s, builds: [...s.builds, build({ id: "b3", createdAt: 300, companions: [REMOTE, CHARGER] })] };
  s = save(s, "b3", 3000);
  const v3 = s.projects[0];
  assert.equal(v3.products.length, 3);
  const back = v3.products.find((r) => r.id === charger.id);
  assert.deepEqual(back.source, { buildId: "b3", productId: "charger" });
  assert.equal(back.updatedAt, 3000);
  assert.ok(productsOfProject(v3, buildsOf(v3, s.builds)).every((x) => x.dropped === null));
});

test("the headline is never a dropped row: it moves to the first row the new version still has", () => {
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_car", companions: [REMOTE] });
  const car = project("proj_car", {
    productName: "Remote controller",
    buildId: "b1",
    builds: [{ buildId: "b1", chatId: "chat_car", version: 1, savedAt: 1 }],
    products: [
      { id: "p1", name: "Remote controller", description: "Steers the car.", source: { buildId: "b1", productId: "remote" } },
      { id: "p2", name: "RC car", description: "A small remote-controlled car.", source: { buildId: "b1", productId: "primary" } },
    ],
  });
  const next = attach(car, build({ id: "b2", createdAt: 200 }), [v1], 2000);
  assert.equal(next.productName, "RC car");
  assert.deepEqual(next.products.map((r) => [r.id, r.source.buildId]), [["p1", "b1"], ["p2", "b2"]]);
});

test("the maker's own words survive a rebuild; untouched rows take the model's new words", () => {
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_car", companions: [REMOTE] });
  const car = project("proj_car", {
    productName: "RC car",
    buildId: "b1",
    builds: [{ buildId: "b1", chatId: "chat_car", version: 1, savedAt: 1 }],
    products: [
      { id: "p1", name: "RC car", description: "A small remote-controlled car.", source: { buildId: "b1", productId: "primary" } },
      { id: "p2", name: "Handset", description: "Steers the car.", source: { buildId: "b1", productId: "remote" }, updatedAt: 50 },
    ],
  });
  const v2 = build({ id: "b2", createdAt: 200, title: "Rally car", description: "A faster car.",
    companions: [companion("remote", "Remote controller", "Steers it, now with trim.")] });
  const next = attach(car, v2, [v1], 2000);
  assert.deepEqual(next.products.map((r) => [r.id, r.name, r.description]), [
    ["p1", "Rally car", "A faster car."],
    ["p2", "Handset", "Steers it, now with trim."],
  ]);
  assert.equal(next.productName, "Rally car"); // the headline follows its row
});

test("a legacy project's first build is frozen as version 1 when its chat is rebuilt", () => {
  const v1 = build({ id: "b1", createdAt: 100, projectId: "proj_old", companions: [REMOTE] });
  const old = project("proj_old", {
    productName: "RC car",
    buildId: "b1",
    createdAt: 500,
    products: [
      { id: "p1", name: "RC car", description: "A small remote-controlled car." },
      { id: "p2", name: "Remote controller", description: "Steers the car." },
    ],
  });
  const s = save({ projects: [old], builds: [v1, build({ id: "b2", createdAt: 200, companions: [REMOTE] })] }, "b2", 2000);
  assert.equal(s.projects.length, 1);
  const [p] = s.projects;
  assert.deepEqual(p.builds, [
    { buildId: "b1", chatId: "chat_car", version: 1, savedAt: 500 },
    { buildId: "b2", chatId: "chat_car", version: 2, savedAt: 2000 },
  ]);
  assert.deepEqual(p.products.map((r) => [r.id, r.source]), [
    ["p1", { buildId: "b2", productId: "primary" }],
    ["p2", { buildId: "b2", productId: "remote" }],
  ]);
});

// ── joining an existing project ──────────────────────────────────────────────

test("a build joining a hand-made project adopts the row it names, adds the rest, and keeps the headline", () => {
  const hand = project("proj_hand", { name: "Garden", productName: "Plant waterer", description: "Waters my ficus." });
  const b = build({ id: "bj", chatId: "chat_plant", createdAt: 100, title: "Plant waterer", description: "Model words.",
    companions: [companion("sensor", "Soil sensor", "Reads the soil.")], projectChoiceId: "proj_hand", projectChoiceName: "" });
  const s = save({ projects: [hand], builds: [b] }, "bj", 1000);
  assert.equal(s.projects.length, 1);
  const [p] = s.projects;
  assert.equal(p.id, "proj_hand");
  assert.equal(p.buildId, undefined); // a join is never the origin
  assert.equal(p.productName, "Plant waterer");
  assert.deepEqual(p.builds, [{ buildId: "bj", chatId: "chat_plant", version: 1, savedAt: 1000 }]);
  assert.deepEqual(p.products[0], {
    id: "p1", name: "Plant waterer", description: "Waters my ficus.",
    source: { buildId: "bj", productId: "primary" }, updatedAt: 1000,
  });
  assert.equal(p.products[1].name, "Soil sensor");
  assert.match(p.products[1].id, /^prd_[0-9a-z]{8}$/);
  assert.deepEqual(p.products[1].source, { buildId: "bj", productId: "sensor" });
});

test("a build from another chat joins as its own lineage at version 1 and leaves the first chat's rows alone", () => {
  let s = { projects: [], builds: [build({ id: "b1", createdAt: 100, companions: [REMOTE] })] };
  s = save(s, "b1", 1000);
  const car = s.projects[0];
  const dock = build({ id: "d1", chatId: "chat_dock", createdAt: 400, title: "Charging dock", description: "Charges the car.",
    projectChoiceId: car.id, projectChoiceName: "" });
  s = { ...s, builds: [...s.builds, dock] };
  s = save(s, "d1", 4000);
  assert.equal(s.projects.length, 1);
  const [p] = s.projects;
  assert.deepEqual(p.builds.map((r) => [r.chatId, r.version]), [["chat_car", 1], ["chat_dock", 1]]);
  assert.deepEqual(p.products.slice(0, 2), car.products); // untouched
  assert.deepEqual(p.products.map((r) => r.name), ["RC car", "Remote controller", "Charging dock"]);
  assert.equal(p.productName, "RC car"); // the headline stays the project's own
  assert.equal(p.buildId, "b1");
});

// ── the Brief's Step 1 words (mergeProductEdits) ─────────────────────────────

test("Step 1's words land on their rows: by row id, then by position, then by name — none added or dropped", () => {
  const rows = [
    { id: "p1", name: "RC car", description: "A car.", source: { buildId: "b1", productId: "primary" }, updatedAt: 1 },
    { id: "p2", name: "Remote controller", description: "Steers.", source: { buildId: "b1", productId: "remote" }, updatedAt: 1 },
    { id: "p3", name: "Charger", description: "Charges.", updatedAt: 1 },
  ];
  // By row id: only the rows named change, and only the changed one is stamped.
  const byId = mergeProductEdits(rows, [
    { name: "Rally car ", description: "A car.", rowId: "p1" },
    { name: "Remote controller", description: "Steers.", rowId: "p2" },
  ], 9);
  assert.deepEqual(byId[0], { ...rows[0], name: "Rally car", updatedAt: 9 });
  assert.equal(byId[1], rows[1]);
  assert.equal(byId[2], rows[2]);
  // Same length: by position.
  const byPos = mergeProductEdits(rows, [
    { name: "A", description: "a" }, { name: "B", description: "b" }, { name: "C", description: "c" },
  ], 9);
  assert.deepEqual(byPos.map((r) => [r.id, r.name, r.source]), [
    ["p1", "A", rows[0].source], ["p2", "B", rows[1].source], ["p3", "C", undefined],
  ]);
  // Different length: by name; an edit naming no row changes nothing.
  const byName = mergeProductEdits(rows, [
    { name: "charger", description: "Charges fast." }, { name: "Nothing here", description: "x" },
  ], 9);
  assert.equal(byName.length, 3);
  assert.deepEqual(byName[2], { ...rows[2], name: "charger", description: "Charges fast.", updatedAt: 9 });
  assert.equal(byName[0], rows[0]);
  // An empty name keeps the row's own.
  assert.equal(mergeProductEdits(rows, [{ name: "  ", description: "A car.", rowId: "p1" }], 9)[0], rows[0]);
});

// ── the editor chrome's headline rename (COR-95) ─────────────────────────────

test("renaming the headline renames the first product while they agree", () => {
  const p = project("proj_car", { productName: "RC car", products: [
    { id: "p1", name: "RC car", description: "A car." },
    { id: "p2", name: "Remote controller", description: "Steers." },
  ] });
  const patch = renameHeadline(p, "Rally car", 7);
  assert.equal(patch.productName, "Rally car");
  assert.deepEqual(patch.products, [{ id: "p1", name: "Rally car", description: "A car.", updatedAt: 7 }, p.products[1]]);
  // The first row was renamed on its own before: it keeps its name.
  assert.deepEqual(renameHeadline({ ...p, productName: "Car" }, "Rally car", 7), { productName: "Rally car" });
  // Clearing the headline never blanks a product.
  assert.deepEqual(renameHeadline(p, "", 7), { productName: "" });
  // A hand-made project with no list has nothing else to rename.
  assert.deepEqual(renameHeadline(project("proj_hand", { productName: "Lamp" }), "Desk lamp", 7), { productName: "Desk lamp" });
});
```

- [ ] **Step 2: Run it. Expected FAIL**
```bash
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
  tsc exits 0. Every earlier task's test file passes. `writers.test.mjs` fails at its import, because none of the four functions exists yet:
```
# SyntaxError: Named export 'attach' not found. The requested module '../../.tmp-test/lib/manual/projects.js' is a CommonJS module, which may not support all module.exports as named exports.
```
  The summary shows `# fail 1`, and that one failure is this file.

- [ ] **Step 3: Implement**

  **3a. `src/lib/manual/projects.tsx`, the import.** Today this is `:22`, and A1 made it relative. Replace
```ts
import type { BuildJob } from "../create/history";
```
  with
```ts
import { productsOf, type BuildJob, type BuildProduct } from "../create/history";
// project-read.ts imports only types from this file, so this is no runtime cycle.
import { lineageProjectOf, modelNameOf } from "./project-read";
```

  **3b. `projects.tsx`, the pure writers.** Insert this block immediately before `type Ctx = {` (today `:173`). It sits after A1's `norm`, `newProductId`, `keepProductIds` and `heldProducts`, and it uses the first two.
```ts
// ─────────────── The writers' pure core (§5.1.7, §5.1.8) ───────────────
//
// No hooks and no storage in here: the provider below applies these to its
// state, and the node:test harness runs them exactly as they are.

/** The sentence the model wrote for a build product — its description, else
 *  its parts line. modelNameOf() (project-read.ts) is the name beside it. */
function modelDescOf(bp: BuildProduct): string {
  return (bp.description || bp.summary || "").trim();
}

/**
 * A build joins a project — the one merge (§5.1.8). Pure: the provider's
 * `attachBuild` runs it on the stored record, and so does every test.
 *
 * `lineage` is the OTHER builds of `job.chatId`. The build is recorded as the
 * next version of its chat inside this project; its products replace the rows
 * the lineage's earlier version made (matched by product id, then by name), a
 * row this version doesn't have stays listed with its old source (COR-108), and
 * every product the project didn't have yet becomes a new row. The maker's own
 * words on a row survive: the model's new words land only where the row still
 * holds the previous version's. Rows from another chat, and hand-made rows, are
 * left alone — except that a hand-made row named like one of this build's
 * products adopts it, which is a build joining a hand-made project.
 */
export function attach(
  p: ManualProject,
  job: BuildJob,
  lineage: BuildJob[],
  now: number,
  opts: { origin?: boolean } = {},
): ManualProject {
  const refs0 = p.builds ?? [];
  // One build, one attach: saving the same build again changes nothing.
  if (refs0.some((r) => r.buildId === job.id)) return p;

  // Freeze this lineage's legacy links first — builds that joined before
  // `builds` was recorded — numbered by age after the refs already stored, the
  // way buildsOf() numbers them, so the numbering can never shift later.
  const frozenJobs = lineage
    .filter(
      (b) =>
        b.id !== job.id &&
        b.chatId === job.chatId &&
        (b.projectId === p.id || b.id === p.buildId) &&
        !refs0.some((r) => r.buildId === b.id),
    )
    .sort((a, b) => a.createdAt - b.createdAt);
  let v = Math.max(0, ...refs0.filter((r) => r.chatId === job.chatId).map((r) => r.version));
  const frozen: ProjectBuildRef[] = frozenJobs.map((b) => ({
    buildId: b.id,
    chatId: b.chatId,
    version: ++v,
    // The origin build and its project were written in the same call, so that
    // time is true; any other legacy join time was never recorded.
    savedAt: b.id === p.buildId ? p.createdAt : null,
  }));
  const builds: ProjectBuildRef[] = [
    ...refs0,
    ...frozen,
    { buildId: job.id, chatId: job.chatId, version: ++v, savedAt: now },
  ];

  // The builds of this lineage the project already held, newest first.
  const priorIds = new Set(
    builds.filter((r) => r.chatId === job.chatId && r.buildId !== job.id).map((r) => r.buildId),
  );
  const prior = lineage
    .filter((b) => priorIds.has(b.id))
    .sort((a, b) => b.createdAt - a.createdAt);
  const incoming = productsOf(job).map((bp) => ({
    bp,
    name: modelNameOf(bp, job),
    description: modelDescOf(bp),
  }));
  const rows: ManualProduct[] = p.products?.length
    ? p.products
    : p.productName.trim()
      ? [{ id: "p1", name: p.productName, description: p.description }]
      : [];

  const used = new Set<string>();
  const take = (pred: (x: (typeof incoming)[number]) => boolean) => {
    const m = incoming.find((x) => !used.has(x.bp.id) && pred(x));
    if (m) used.add(m.bp.id);
    return m;
  };
  // The build product a row last came from, inside the earlier build that made
  // it: its stored source, else (a legacy row) the newest earlier build naming it.
  const earlier = (row: ManualProduct): { bp: BuildProduct; j: BuildJob } | null => {
    const src = row.source;
    if (src) {
      const j = prior.find((b) => b.id === src.buildId);
      const bp = j ? productsOf(j).find((x) => x.id === src.productId) : undefined;
      return j && bp ? { bp, j } : null;
    }
    for (const j of prior) {
      const bp = productsOf(j).find((x) => norm(modelNameOf(x, j)) === norm(row.name));
      if (bp) return { bp, j };
    }
    return null;
  };

  const next: ManualProduct[] = [];
  const dropped = new Set<string>();
  for (const row of rows) {
    const inLineage = row.source ? priorIds.has(row.source.buildId) : earlier(row) !== null;
    if (!inLineage) {
      // Another lineage's product, or a hand-made one. A sourceless row named
      // like one of this build's products adopts it — only while this chat
      // has no earlier version here, so a rebuild never steals a row.
      const m =
        !row.source && priorIds.size === 0
          ? take((x) => norm(x.name) === norm(row.name))
          : undefined;
      next.push(m ? { ...row, source: { buildId: job.id, productId: m.bp.id }, updatedAt: now } : row);
      continue;
    }
    // Same lineage: this version replaces the row — by product id, then name.
    const m =
      take((x) => x.bp.id === row.source?.productId) ??
      take((x) => norm(x.name) === norm(row.name));
    if (!m) {
      // Not in this version: it stays listed, its source still the last
      // version that had it (COR-108).
      dropped.add(row.id);
      next.push(row);
      continue;
    }
    // Keep the maker's own words; take the model's new words only where the
    // row still holds the previous version's.
    const before = earlier(row);
    const keepName = !before || row.name !== modelNameOf(before.bp, before.j);
    const keepDesc = !before || row.description !== modelDescOf(before.bp);
    next.push({
      ...row,
      name: keepName ? row.name : m.name,
      description: keepDesc ? row.description : m.description,
      source: { buildId: job.id, productId: m.bp.id },
      updatedAt: now,
    });
  }
  // A new row's id is never one the project already holds.
  const taken = new Set(rows.map((r) => r.id));
  for (const x of incoming) {
    if (used.has(x.bp.id)) continue;
    let id = newProductId();
    while (taken.has(id)) id = newProductId();
    taken.add(id);
    next.push({
      id,
      name: x.name,
      description: x.description,
      source: { buildId: job.id, productId: x.bp.id },
      updatedAt: now,
    });
  }

  // The headline follows the current version, and is never a dropped row: a
  // headline this version left out hands the name to the first row still in.
  const headMoved = !p.productName.trim() || p.productName === rows[0]?.name;
  const head = next.find((r) => !dropped.has(r.id)) ?? next[0];
  return {
    ...p,
    builds,
    products: next,
    ...(headMoved && head ? { productName: head.name } : null),
    // Only the project this build CREATES records it as its origin; a join
    // never stamps it.
    ...(opts.origin && !p.buildId ? { buildId: job.id } : null),
    updatedAt: now,
  };
}

/**
 * Where Save puts a build (§5.1.8 steps 1, 3 and 4), read from the list alone:
 * the live project the build is already in — returned as it is; else the live
 * project another build of its chat was saved into, which this build joins as
 * the next version (COR-89); else the live project the maker chose at the setup
 * question. Null: nothing to join, so a new project is made. The provider's
 * in-session guard (step 2) sits between the first answer and the other two.
 */
export function saveTargetOf(
  job: BuildJob,
  lineage: BuildJob[],
  projects: ManualProject[],
): { project: ManualProject; via: "saved" | "lineage" | "chosen" } | null {
  const live = (id: string | undefined) =>
    id ? (projects.find((p) => p.id === id) ?? null) : null;
  const saved = live(job.projectId);
  if (saved) return { project: saved, via: "saved" };
  const sibling = lineageProjectOf(job, lineage, projects);
  if (sibling) return { project: sibling, via: "lineage" };
  const chosen = live(job.projectChoiceId);
  return chosen ? { project: chosen, via: "chosen" } : null;
}

/** Words for one product, typed in the Brief's Step 1. `rowId` ties it to a
 *  row outright; without one it is matched by position or name. */
export type ProductEdit = { name: string; description: string; rowId?: string };

/**
 * Step 1's words laid over a project's rows (§5.1.7, "Brief text edits"). An
 * edit that names its row goes there; the rest go by position when the two
 * lists are the same length, else by normalized name. Each row keeps its id and
 * source, a row whose text really changed is stamped `updatedAt`, and no row is
 * ever added or dropped — attach() decides the rows, the Brief only words them.
 * An empty name keeps the row's own: a product always has one.
 */
export function mergeProductEdits(
  prev: ManualProduct[],
  edits: ProductEdit[],
  now: number,
): ManualProduct[] {
  const byRow = new Map<number, ProductEdit>();
  const placed = new Set<number>();
  const place = (row: number, edit: number) => {
    byRow.set(row, edits[edit]);
    placed.add(edit);
  };
  edits.forEach((e, j) => {
    if (!e.rowId) return;
    const i = prev.findIndex((r) => r.id === e.rowId);
    if (i >= 0 && !byRow.has(i)) place(i, j);
  });
  const loose = edits.flatMap((e, j) => (e.rowId ? [] : [j]));
  if (edits.length === prev.length) {
    for (const j of loose) if (!byRow.has(j)) place(j, j);
  }
  for (const j of loose) {
    if (placed.has(j)) continue;
    const i = prev.findIndex((r, n) => !byRow.has(n) && norm(r.name) === norm(edits[j].name));
    if (i >= 0) place(i, j);
  }
  return prev.map((row, i) => {
    const e = byRow.get(i);
    if (!e) return row;
    const name = e.name.trim() || row.name;
    const description = e.description.trim();
    return name === row.name && description === row.description
      ? row
      : { ...row, name, description, updatedAt: now };
  });
}

/** The editor chrome's headline rename (COR-95): the new `productName`, and
 *  the first product renamed with it while that row still carried the old
 *  headline — they are one product, so the list must not go on calling it by
 *  its old name. An empty name clears the headline ("Untitled product") and
 *  leaves the row named. */
export function renameHeadline(
  p: ManualProject,
  name: string,
  now: number,
): Pick<ManualProject, "productName"> & Partial<Pick<ManualProject, "products">> {
  const clean = name.trim();
  const first = p.products?.[0];
  if (!p.products || !first || !clean || first.name !== p.productName || first.name === clean)
    return { productName: clean };
  return {
    productName: clean,
    products: [{ ...first, name: clean, updatedAt: now }, ...p.products.slice(1)],
  };
}

```

  **3c. `projects.tsx`, `Ctx`** (today `:185-188`). Replace
```ts
  // The project a finished AI build becomes. One project per build: a
  // build that already carries a live `projectId` gets that project
  // back rather than a second copy of itself.
  projectFromBuild: (job: BuildJob) => ManualProject;
```
  with
```ts
  // The project a finished AI build becomes (§5.1.8): the project it is
  // already in; else the one another build of its chat was saved into, as that
  // chat's next version (COR-89); else the one chosen at the setup question;
  // else a new one. `lineage` = the OTHER builds of job.chatId — the caller
  // has the builds store; this provider sits outside it (app/layout.tsx).
  projectFromBuild: (job: BuildJob, lineage?: BuildJob[]) => ManualProject;
  // A build joins a project (COR-88): attach() on the stored record,
  // idempotent by build id — the one writer Save, Open in editor and the
  // Brief's Step 1 share. `origin` only for the project this build creates.
  // Null when there is no such project.
  attachBuild: (
    projectId: string,
    job: BuildJob,
    lineage?: BuildJob[],
    opts?: { origin?: boolean },
  ) => ManualProject | null;
```

  **3d. `projects.tsx`, the `made` ref** (today `:210`). Replace
```ts
  const builtFrom = React.useRef(new Map<string, ManualProject>());
```
  with
```ts
  const builtFrom = React.useRef(new Map<string, ManualProject>());
  // Projects created in the current event, by id, until `projects` holds them:
  // the Brief creates a project and attaches its build in one press, and
  // `projects` is still the list from before the create.
  const made = React.useRef(new Map<string, ManualProject>());
```

  **3e. `projects.tsx`, clearing it** (today `:231-234`). Replace
```ts
  React.useEffect(() => {
    if (!hydrated) return;
    saveActiveId(activeProjectId);
  }, [activeProjectId, hydrated]);
```
  with
```ts
  React.useEffect(() => {
    if (!hydrated) return;
    saveActiveId(activeProjectId);
  }, [activeProjectId, hydrated]);
  // Once a render holds them, the projects made above are read from `projects`.
  React.useEffect(() => {
    made.current.clear();
  }, [projects]);
```

  **3f. `projects.tsx`, `createProject`** (today `:250`). Replace
```ts
      setProjects((arr) => [project, ...arr]);
      return project;
```
  with
```ts
      made.current.set(project.id, project);
      setProjects((arr) => [project, ...arr]);
      return project;
```

  **3g. `projects.tsx`, `projectFromBuild`** (today `:273-346`). Replace the whole callback: from the comment `// The project a finished build becomes — the one the maker already chose.` through its closing `[projects, createProject, updateProject],` and `);`. A1's `id: newProductId()` and `id: "p1"` edits inside it go too. Put this in its place:
```ts
  // A build joins a project — attach() on the record as it stands, written
  // back to the list. Idempotent by build id: a build already in the project
  // hands the record back unchanged and writes nothing.
  const attachBuild = React.useCallback(
    (
      projectId: string,
      job: BuildJob,
      lineage: BuildJob[] = [],
      opts: { origin?: boolean } = {},
    ): ManualProject | null => {
      const base =
        projects.find((p) => p.id === projectId) ?? made.current.get(projectId);
      if (!base) return null;
      const now = Date.now();
      const next = attach(base, job, lineage, now, opts);
      if (next === base) return base;
      // The record this computed is the one stored, product ids and all. Only a
      // record another write in this same event already changed is merged
      // again, onto that newer copy.
      setProjects((arr) =>
        arr.map((p) =>
          p.id !== projectId
            ? p
            : p === base
              ? next
              : attach(p, job, lineage, now, opts),
        ),
      );
      return next;
    },
    [projects],
  );

  // The project a finished build becomes (§5.1.8), in order:
  //   1. the project the build is already in, unchanged;
  //   2. the one this session already made or joined for it;
  //   3. the project another build of its chat was saved into — a rebuild is
  //      that project's next version, never a second project of the same
  //      name (COR-89);
  //   4. the project the maker chose at the setup question;
  //   5. else a new one, named as the setup answer named it.
  // Every join and every new project goes through attachBuild, so a build
  // lands with all of its products, each tied to the build product it is.
  // Making the record is all this does — the caller decides whether the
  // editor should switch to it.
  const projectFromBuild = React.useCallback(
    (job: BuildJob, lineage: BuildJob[] = []) => {
      const target = saveTargetOf(job, lineage, projects);
      if (target?.via === "saved") return target.project;
      // `projects` is React state, so two presses inside one tick would both
      // read the list from before the first one and attach — or create —
      // twice. This is what keeps one build to one project.
      const already = builtFrom.current.get(job.id);
      if (already) return already;
      let project: ManualProject;
      if (target) {
        project = attachBuild(target.project.id, job, lineage) ?? target.project;
      } else {
        const created = createProject({
          name: job.projectChoiceName?.trim() || job.title,
          description: (job.description || job.conceptPrompt).trim(),
        });
        // Its origin: `buildId`, the headline, version 1, and every product
        // with the build product it came from.
        project = attachBuild(created.id, job, [], { origin: true }) ?? created;
      }
      builtFrom.current.set(job.id, project);
      return project;
    },
    [projects, createProject, attachBuild],
  );
```

  **3h. `projects.tsx`, the context value** (today `:397`). Replace
```ts
    projectFromBuild,
    selectProject,
```
  with
```ts
    projectFromBuild,
    attachBuild,
    selectProject,
```

  **3i. `src/components/create/review-outputs.tsx`.** The header comment, `:14-16`. Replace
```ts
// One project per build: `projectFromBuild` hands the same one back on every
// later press. A piece that failed is retried from its own panel, here, rather
// than from a page of its own.
```
  with
```ts
// One project per build: `projectFromBuild` hands the same one back on every
// later press, and a rebuild of a chat already saved joins that project as its
// next version. A piece that failed is retried from its own panel, here, rather
// than from a page of its own.
```
  The hooks, `:101-103`. Replace
```ts
  const { setBuildProject, retryBuildItem, setBuildModelFailed } =
    useCreateHistory();
  const { projects, projectFromBuild, selectProject } = useManualProjects();
```
  with
```ts
  const { builds, setBuildProject, retryBuildItem, setBuildModelFailed } =
    useCreateHistory();
  const { projects, projectFromBuild, selectProject } = useManualProjects();
  // The other builds of this chat — its lineage. Save and Open in editor hand
  // it over so a rebuild joins the project the chat already became, as its
  // next version, instead of making a second project of the same name
  // (COR-89).
  const lineage = React.useMemo(
    () => builds.filter((b) => b.chatId === job.chatId && b.id !== job.id),
    [builds, job.chatId, job.id],
  );
```
  The two presses, `:224-238`. Replace
```ts
  const openInEditor = React.useCallback(() => {
    setLeaving("editor");
    const project = projectFromBuild(job);
    if (project.id !== job.projectId) setBuildProject(job.id, project.id);
    selectProject(project.id);
    router.push(stepHref(project, "pcb"));
  }, [job, projectFromBuild, setBuildProject, selectProject, router]);

  // Saving is the save — it used to open the Brief and ask "What's your idea?"
  // and "sell, give or keep private?" before anything was saved at all. Which
  // project it lands in was answered at the setup question.
  const saveProject = React.useCallback(() => {
    const project = projectFromBuild(job);
    if (project.id !== job.projectId) setBuildProject(job.id, project.id);
  }, [job, projectFromBuild, setBuildProject]);
```
  with
```ts
  const openInEditor = React.useCallback(() => {
    setLeaving("editor");
    const project = projectFromBuild(job, lineage);
    if (project.id !== job.projectId) setBuildProject(job.id, project.id);
    selectProject(project.id);
    router.push(stepHref(project, "pcb"));
  }, [job, lineage, projectFromBuild, setBuildProject, selectProject, router]);

  // Saving is the save — it used to open the Brief and ask "What's your idea?"
  // and "sell, give or keep private?" before anything was saved at all. Which
  // project it lands in was answered at the setup question — or, for a
  // rebuild, by the chat's earlier save: it becomes that project's next version.
  const saveProject = React.useCallback(() => {
    const project = projectFromBuild(job, lineage);
    if (project.id !== job.projectId) setBuildProject(job.id, project.id);
  }, [job, lineage, projectFromBuild, setBuildProject]);
```

  **3j. `src/components/brief/brief-app.tsx`, the imports** (`:41-45`). Replace
```ts
import {
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
```
  with
```ts
import {
  mergeProductEdits,
  stepHref,
  useManualProjects,
  type ManualProduct,
  type ManualProject,
  type ProductEdit,
} from "@/lib/manual/projects";
import {
  buildsOf,
  lineageProjectOf,
  productsOfProject,
} from "@/lib/manual/project-read";
```

  **3k. `brief-app.tsx`, `seedFromBuild`** (`:180-221`). Replace
```ts
function seedFromBuild(
  s: BriefState,
  job: BuildJob,
  stored: boolean,
  projects: ManualProject[],
): BriefState {
  // The description the model wrote, not the parts line. `summary` is
  // "ATmega328P · GPS Receiver · IMU · ESC · LiPo Battery", which answered
  // "one line · what does it do?" with an inventory.
  const oneLine = (job.description || job.summary || job.conceptPrompt).trim();

  // The project was already chosen, at the setup question, before a single
  // concept was drawn: an existing one by id, or a name for the new one every
  // multi-product build gets. Opening this step with an empty chooser asked
  // the maker the same question a second time and threw the first answer
  // away. An id whose project is gone from this browser falls back to making
  // a new one under the same name rather than pointing at nothing.
  const chosenExists =
    !!job.projectChoiceId && projects.some((p) => p.id === job.projectChoiceId);
  const decided = chosenExists
    ? job.projectChoiceId!
    : job.projectChoiceName?.trim()
      ? "new"
      : "";

  return {
    ...s,
    projectChoice: stored ? s.projectChoice : decided,
    newProjectName: s.newProjectName.trim()
      ? s.newProjectName
      : job.projectChoiceName?.trim() || job.title,
    productName: s.productName.trim() ? s.productName : job.title,
    productDescription: s.productDescription.trim()
      ? s.productDescription
      : oneLine.slice(0, BRIEF_DESC_MAX),
    // Seeded once, then the maker's own. Their edits are the draft's, so a
    // reload or a step back does not put the model's wording back.
    otherProducts: s.otherProducts.length
      ? s.otherProducts
      : (job.companions ?? []).map((x) => ({
          name: (x.title || x.name).trim(),
          description: (x.description || x.summary || "").trim(),
        })),
  };
}
```
  with
```ts
function seedFromBuild(
  s: BriefState,
  job: BuildJob,
  stored: boolean,
  projects: ManualProject[],
  builds: BuildJob[],
): BriefState {
  const [head, ...others] = buildWords(job);

  // The project was already chosen, at the setup question, before a single
  // concept was drawn: an existing one by id, or a name for the new one every
  // multi-product build gets. Opening this step with an empty chooser asked
  // the maker the same question a second time and threw the first answer
  // away. An id whose project is gone from this browser falls back to making
  // a new one under the same name rather than pointing at nothing.
  // A rebuild of a chat that was already saved goes where that chat's builds
  // went: it is that project's next version (COR-89), whatever the setup
  // question answered before the first build existed.
  const lineageProject = lineageProjectOf(job, builds, projects);
  const chosenExists =
    !!job.projectChoiceId && projects.some((p) => p.id === job.projectChoiceId);
  const decided =
    lineageProject?.id ??
    (chosenExists
      ? job.projectChoiceId!
      : job.projectChoiceName?.trim()
        ? "new"
        : "");

  return {
    ...s,
    projectChoice: stored ? s.projectChoice : decided,
    newProjectName: s.newProjectName.trim()
      ? s.newProjectName
      : job.projectChoiceName?.trim() || job.title,
    productName: s.productName.trim() ? s.productName : head.name,
    productDescription: s.productDescription.trim()
      ? s.productDescription
      : head.description,
    // Seeded once, then the maker's own. Their edits are the draft's, so a
    // reload or a step back does not put the model's wording back.
    otherProducts: s.otherProducts.length ? s.otherProducts : others,
  };
}

// The words Step 1 opens on for a build, in productsOf() order: the build's
// title and the description the model wrote — not the parts line: `summary`
// is "ATmega328P · GPS Receiver · IMU · ESC · LiPo Battery", which answered
// "one line · what does it do?" with an inventory — then each companion.
function buildWords(job: BuildJob): { name: string; description: string }[] {
  return [
    {
      name: job.title,
      description: (job.description || job.summary || job.conceptPrompt)
        .trim()
        .slice(0, BRIEF_DESC_MAX),
    },
    ...(job.companions ?? []).map((x) => ({
      name: (x.title || x.name).trim(),
      description: (x.description || x.summary || "").trim(),
    })),
  ];
}

// What the maker changed in Step 1, as edits to the rows the build was just
// attached to (COR-88). Each product's words go to the row that product
// became — tied by the row's source, not by name, so a companion the project
// calls "Remote controller" and Step 1 shows by its concept title is still the
// one row. Only a field the maker really changed travels: Step 1 opens on the
// build's own words (buildWords), and writing those back would undo a name the
// maker gave the row before this rebuild, which attach() kept for them.
function buildEdits(
  s: BriefState,
  rows: ManualProduct[],
  job: BuildJob,
): ProductEdit[] {
  const seeded = buildWords(job);
  const typed = [
    { name: s.productName, description: s.productDescription },
    ...s.otherProducts,
  ];
  return productsOf(job).flatMap((bp, i) => {
    const row = rows.find(
      (r) => r.source?.buildId === job.id && r.source.productId === bp.id,
    );
    const words = typed[i];
    if (!row || !words) return [];
    const same = (a: string, b: string | undefined) => a.trim() === (b ?? "").trim();
    return [
      {
        rowId: row.id,
        name: same(words.name, seeded[i]?.name) ? row.name : words.name,
        description: same(words.description, seeded[i]?.description)
          ? row.description
          : words.description,
      },
    ];
  });
}
```

  **3l. `brief-app.tsx`, the hooks** (`:513-522` and `:528-542`). In the `useManualProjects()` destructure, replace
```ts
    setStatus,
    updateProject,
  } = useManualProjects();
```
  with
```ts
    setStatus,
    updateProject,
    attachBuild,
  } = useManualProjects();
```
  Then replace the `buildProducts` memo. Its only readers are the `productList` lines deleted in 3o.
```ts
  // Every product this build made, named and described by the model. The
  // first is the headline one the Step 1 fields edit; the rest are shown
  // beside them and saved onto the project with it — §4.4.8 puts a whole
  // system in one project, and `productName` alone could record only the
  // first of them.
  const buildProducts = React.useMemo(
    () =>
      job
        ? productsOf(job).map((x) => ({
            name: (x.title || x.name).trim(),
            description: (x.description || x.summary || "").trim(),
          }))
        : [],
    [job],
  );
```
  with
```ts
  // The other builds of this build's chat — its lineage. A rebuild joins the
  // project that chat already became, as its next version (COR-89).
  const lineage = React.useMemo(
    () =>
      job
        ? builds.filter((b) => b.chatId === job.chatId && b.id !== job.id)
        : [],
    [builds, job],
  );
```

  **3m. `brief-app.tsx`, the Step 1 default** (`:609`). Replace
```ts
      normalized = seedFromBuild(normalized, job, stored, projects);
```
  with
```ts
      normalized = seedFromBuild(normalized, job, stored, projects, builds);
```

  **3n. `brief-app.tsx`, the product count** (`:744-755`). Replace
```ts
  // Products already inside a project: its own, plus every AI build saved into
  // it. A project always holds at least the one it was made for — and when the
  // project WAS made from a build, that build is the project's own product, so
  // counting it again would report two products where there is one.
  const productCount = (projectId: string) => {
    const originBuildId = projects.find((p) => p.id === projectId)?.buildId;
    return (
      1 +
      builds.filter((b) => b.projectId === projectId && b.id !== originBuildId)
        .length
    );
  };
```
  with
```ts
  // Products already inside a project — the list its page shows: every row it
  // holds, a product a later version dropped included, each once (COR-95). It
  // used to count builds, which said one for a build that made four products
  // and two for a rebuild of one.
  const productCount = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    return p ? productsOfProject(p, buildsOf(p, builds)).length : 0;
  };
```

  **3o. `brief-app.tsx`, the old merge** (`:809-828`). Delete this block, and the blank line after it:
```ts
    // What the project should record. The COUNT comes from the job, which is
    // the only thing that knows how many products this build really made;
    // the maker's edits are laid over it where they exist. Reading the list
    // straight off the draft meant that a press after the draft had been
    // re-seeded wrote a one-product project over a three-product one.
    // A project that already records its products is the list: its brief
    // opened on them, so the maker's edits are laid over the project's own
    // list rather than over this build's alone, which would drop whatever
    // the project held before the build joined it.
    const head = { name: next.productName, description: next.productDescription };
    const productList = scopeProject?.products?.length
      ? [head, ...next.otherProducts]
      : buildProducts.length
        ? [
            head,
            ...buildProducts
              .slice(1)
              .map((p, i) => next.otherProducts[i] ?? p),
          ]
        : null;
```

  **3p. `brief-app.tsx`, the build's attach** (`:847-859`). The `else` branch after it (`:860-875`, the kept brief) is unchanged. Replace
```ts
    if (buildId && job?.projectId !== targetId) {
      if (seedDraft(targetId, next, afterIdea, targetProductName)) {
        updateProject(targetId, {
          productName: next.productName,
          // The whole system, not just its headline. The maker's own edits to
          // the first product win over what the model called it; the rest are
          // as the concepts named them.
          ...(productList ? { products: productList } : null),
          // Only a project made from this build carries it as its origin:
          // stamping an existing project would claim it was this build's all
          // along, and its product count would drop by one.
          ...(created ? { buildId } : null),
        });
      } else {
```
  with
```ts
    if (buildId && job?.projectId !== targetId) {
      // The build joins first, whichever way the brief goes (COR-88): as the
      // next version of its chat in that project, with every product it made
      // — the same writer Save uses. Only a project made here records it as
      // its origin: stamping an existing one would claim it was this build's
      // all along.
      const attached = job
        ? attachBuild(targetId, job, lineage, { origin: created })
        : null;
      // The maker's Step 1 edits over the rows the build became. The rows
      // themselves are attach()'s: nothing is added or dropped here.
      const products =
        attached?.products?.length && job
          ? mergeProductEdits(
              attached.products,
              buildEdits(next, attached.products, job),
              Date.now(),
            )
          : null;
      // From here the brief is the project's, so its draft opens on the
      // project's own list — headline first, then every other row — exactly as
      // the project's brief would have. Every later Continue then lines Step
      // 1 up with the rows it shows.
      const onProject: BriefState = products
        ? {
            ...next,
            productDescription: products[0].description.slice(0, BRIEF_DESC_MAX),
            otherProducts: products
              .slice(1)
              .map((r) => ({ name: r.name, description: r.description })),
          }
        : next;
      if (seedDraft(targetId, onProject, afterIdea, targetProductName)) {
        updateProject(targetId, {
          // The headline the maker typed. Left as the build named it, a join
          // keeps the headline attach() gave the project; a new project takes it.
          ...(created || !job || next.productName.trim() !== job.title.trim()
            ? { productName: next.productName }
            : null),
          ...(products ? { products } : null),
        });
      } else {
```

  **3q. `brief-app.tsx`, the ordinary advance** (`:910-915`). Replace
```ts
    // The ordinary advance — and, for a build already attached, every press
    // after the first. An edit made on the way back belongs to the project.
    updateProject(targetId, {
      productName: next.productName,
      ...(productList ? { products: productList } : null),
    });
```
  with
```ts
    // The ordinary advance — and, for a build already attached, every press
    // after the first. An edit made on the way back belongs to the project.
    // This brief opened on the project's own rows, headline first, so Step 1's
    // words line up with them by position — or by name, once the list has
    // grown under a draft saved before it did. No row comes or goes.
    const rows = target.products ?? [];
    updateProject(targetId, {
      productName: next.productName,
      ...(rows.length
        ? {
            products: mergeProductEdits(
              rows,
              [
                { name: next.productName, description: next.productDescription },
                ...next.otherProducts,
              ],
              Date.now(),
            ),
          }
        : null),
    });
```

  **3r. `src/components/manual/product-name-field.tsx`.** The import, `:10`. Replace
```ts
import { useManualProjects, productLabel } from "@/lib/manual/projects";
```
  with
```ts
import {
  productLabel,
  renameHeadline,
  useManualProjects,
} from "@/lib/manual/projects";
```
  The commit, `:42-45`. Replace
```ts
  const commit = () => {
    updateProject(activeProject.id, { productName: draft.trim() });
    setEditing(false);
  };
```
  with
```ts
  const commit = () => {
    // The headline and the list's first product are one product, so renaming
    // one renames the other while they still agree (COR-95).
    updateProject(
      activeProject.id,
      renameHeadline(activeProject, draft.trim(), Date.now()),
    );
    setEditing(false);
  };
```

- [ ] **Step 4: Run it. Expected PASS**
```bash
npm run test:projects
```
  Expected: `writers.test.mjs` passes 11 of 11, every earlier file still passes, and the summary shows `# fail 0`.

- [ ] **Step 5: Browser check** on `http://localhost:3002` (Task 0's server), in a window at least 1440 × 900.
  - Snippets run with the Browser pane's JavaScript tool, on any page of the origin.
  - The stores keep their own copy in memory and write it back on their next change. So after a seed snippet, always do a full load (navigate) to the next URL. Don't click there.

  **Snippets:**
  - **CLEAN** removes this check's data:
```js
(() => {
  const read = (k) => JSON.parse(localStorage.getItem(k) || "[]");
  for (const p of read("ideeza:manual:projects")) if (p.name.startsWith("A6 ")) localStorage.removeItem(`ideeza:brief:draft:${p.id}`);
  for (const b of read("ideeza:create:builds")) if (String(b.chatId).startsWith("chat_a6_")) localStorage.removeItem(`ideeza:brief:draft:build:${b.id}`);
  localStorage.setItem("ideeza:manual:projects", JSON.stringify(read("ideeza:manual:projects").filter((p) => !p.name.startsWith("A6 "))));
  localStorage.setItem("ideeza:create:builds", JSON.stringify(read("ideeza:create:builds").filter((b) => !String(b.chatId).startsWith("chat_a6_"))));
  localStorage.removeItem("ideeza:manual:active");
  return "clean";
})()
```
  - **SEED(id, chatId, projectName, title, description, companions)** adds one finished build that hasn't been saved. The chat itself is deliberately absent, so `/build/<id>` shows the review instead of redirecting to a chat. The lineage is the shared `chatId`. The 3D model is marked failed, so nothing calls the 3D API. Example call:
```js
((id, chatId, projectName, title, description, companionIds) => {
  const items = ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: "ready", progress: 100 }));
  const parts = [
    { name: "ESP32-C3", role: "Main controller", category: "Microcontroller" },
    { name: "LiPo Battery", role: "Power", category: "Power Management" },
  ];
  const img = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='4'%20height='3'/%3E";
  const COMPANIONS = { remote: ["Remote controller", "Steers the car."], charger: ["Charger", "Charges the pack."] };
  const t = Date.now();
  const job = {
    id, chatId, title, description, parts, items, conceptImageUrl: img, conceptPrompt: description,
    summary: "ESP32-C3 · LiPo Battery", projectChoiceName: projectName, conceptNumber: "1", status: "ready",
    estimateMin: 1, creditsCharged: true, creditsRefunded: false, modelFailed: true,
    companions: companionIds.map((c) => ({ id: c, name: COMPANIONS[c][0], title: COMPANIONS[c][0], description: COMPANIONS[c][1],
      conceptImageUrl: img, conceptPrompt: COMPANIONS[c][0], summary: "ESP32-C3 · LiPo Battery", parts, items })),
    createdAt: t, updatedAt: t, startedAt: t - 60000, endedAt: t,
  };
  const rest = JSON.parse(localStorage.getItem("ideeza:create:builds") || "[]").filter((b) => b.id !== id);
  localStorage.setItem("ideeza:create:builds", JSON.stringify([job, ...rest]));
  return `${id} seeded`;
})("build_a6_v1", "chat_a6_car", "A6 Car", "RC car", "A small remote-controlled car.", ["remote", "charger"])
```
    The other calls change only the argument list on the last line.
  - **READ** prints this check's projects:
```js
JSON.stringify(JSON.parse(localStorage.getItem("ideeza:manual:projects") || "[]").filter((p) => p.name.startsWith("A6 ")).map((p) => ({
  name: p.name, productName: p.productName, buildId: p.buildId,
  builds: (p.builds || []).map((r) => `${r.buildId} v${r.version}`),
  products: (p.products || []).map((r) => `${r.id} | ${r.name} | ${r.description} | from ${r.source ? r.source.buildId : "-"}`),
})), null, 1)
```

  **Steps:**
  1. **Version 1.**
     - On `http://localhost:3002/projects`, run CLEAN, then SEED as printed above.
     - Navigate to `http://localhost:3002/build/build_a6_v1`. The review's footer reads *"All 15 pieces are ready. Save it to the project you chose, or open it in the editor."*
     - Press **Save Project**. The footer reads *"Saved to A6 Car. Add a brief to sell, give or keep it private — or open the project to keep editing."*
     - READ shows one project:
       - `A6 Car`, `productName` `RC car`, `buildId` `build_a6_v1`;
       - `builds` `["build_a6_v1 v1"]`;
       - three rows with `prd_` ids, `RC car`, `Remote controller` and `Charger`, each `from build_a6_v1`.
     - Note the three ids.
  2. **Rebuild, then Save: one project at version 2.**
     - Run SEED with `("build_a6_v2", "chat_a6_car", "A6 Car", "RC car", "A small remote-controlled car.", ["remote"])`.
     - Navigate to `http://localhost:3002/build/build_a6_v2`. The footer reads *"All 10 pieces are ready. Save it to the project you chose, …"*
     - Press **Save Project**. The footer reads *"Saved to A6 Car. …"*
     - READ shows still **one** A6 Car:
       - `builds` is `["build_a6_v1 v1","build_a6_v2 v2"]`;
       - the same three ids, in the same order;
       - `RC car` and `Remote controller` are `from build_a6_v2`;
       - `Charger` is still `from build_a6_v1`. It is the dropped product, kept (owner answer 5).
       - `buildId` is still `build_a6_v1`.

     Before this task, that press made a second "A6 Car".
  3. **Idempotent, and one card.**
     - Reload `/build/build_a6_v2`. The footer still reads *"Saved to A6 Car."*, and READ is unchanged.
     - On `http://localhost:3002/projects`, type `A6` in the search box. Exactly one card shows, **A6 Car**.
  4. **The Brief's text edit keeps identity** (COR-88, "Brief text edits").
     - On `/build/build_a6_v2`, press **Add Brief**.
     - Step 1 shows the callout **Adding to A6 Car**, *"That project already has 3 products. Its name and description stay as they are."* Before this task it said 2, because it counted builds. "Also in this project" lists **Remote controller** and **Charger**.
     - Press **Edit** on Charger. Replace its one-liner with `Charges the pack in 40 minutes.` and press **Save**.
     - Click the **Save as Private** card, then **Continue**. The next step is headed **Save as Private**.
     - READ:
       - Charger reads `Charges the pack in 40 minutes.`, with the same id and still `from build_a6_v1`;
       - the other two rows are unchanged;
       - there are still 3 rows.
  5. **The headline rename** (COR-95).
     - Navigate to `http://localhost:3002/project/a6-car/pcb`.
     - Click the product name **RC car** in the top bar. The field opens with the text selected.
     - Type `Rally car` and press Enter.
     - READ: `productName` is `Rally car`, and the first row is `Rally car`, with the same id.
  6. **A rebuild through the Brief defaults to its project** (COR-89, Step 1 default).
     - Run SEED with `("build_a6_v3", "chat_a6_car", "A6 Car", "RC car", "A small remote-controlled car.", ["remote", "charger"])`.
     - Navigate to `http://localhost:3002/build/build_a6_v3/brief`. Step 1 reads **Project**, **A6 Car**, *"Existing project · already has 3 products"*, with no new-project panel.
     - Click **Save as Private**, then **Continue**.
     - The next step opens under the notice *"That project already had a brief of its own, so this build joined it rather than replacing it. …"*
     - READ shows one A6 Car:
       - `builds` ends with `"build_a6_v3 v3"`;
       - `Charger` is `from build_a6_v3`: back in the current version, same id, and its `Charges the pack in 40 minutes.` kept;
       - the first row is still `Rally car` (`from build_a6_v3`), and `productName` is still `Rally car`. The maker's words survive the rebuild.
  7. **A new project from the Brief** (`made` + `origin`).
     - Run SEED with `("build_a6_lamp", "chat_a6_lamp", "A6 Lamp", "Desk lamp", "A lamp that dims itself.", [])`.
     - Navigate to `http://localhost:3002/build/build_a6_lamp/brief`. Step 1 reads **A6 Lamp**, *"New project · created when you continue"*.
     - Click **Save as Private**, then **Continue**.
     - READ shows **A6 Lamp**:
       - `buildId` `build_a6_lamp`;
       - `builds` `["build_a6_lamp v1"]`;
       - one row, `Desk lamp | A lamp that dims itself. | from build_a6_lamp`.
  8. `read_console_messages` with `onlyErrors` shows no errors from these pages. Run CLEAN.

- [ ] **Step 6: tsc, eslint, commit**
```bash
npx tsc --noEmit
npx eslint src/lib/manual/projects.tsx src/components/create/review-outputs.tsx src/components/brief/brief-app.tsx src/components/manual/product-name-field.tsx tests/projects/writers.test.mjs
```
  Expected:
  - tsc has no output and exits 0.
  - ESLint reports only `brief-app.tsx`'s two baseline `react-hooks/set-state-in-effect` errors from Task 0's table (`633:5`, `681:5` today). They are the hydration effect's `setState(normalized)` and the adopt effect's `setState((s) =>`, lines this task doesn't edit, so they now sit about 57 lines lower.
  - `projects.tsx` is clean, since A1 fixed its baseline error. `review-outputs.tsx`, `product-name-field.tsx` and the test have no problems.
```bash
git add src/lib/manual/projects.tsx src/components/create/review-outputs.tsx src/components/brief/brief-app.tsx src/components/manual/product-name-field.tsx tests/projects/writers.test.mjs
git commit -F - <<'EOF'
fix(projects): a rebuilt chat saves as the next version of its project

attach() is the one merge for a build joining a project: it records the
build as its chat's next version, lays its products over the rows the last
version made, keeps a product the new version dropped, and keeps the
maker's own words. Save, Open in editor and the Brief's Step 1 all go
through attachBuild, and the Brief defaults a rebuild to its project. Step
1 writes only the words the maker changed; its product count counts
products; renaming the headline renames the first product with it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git status --short   # → nothing from this task left unstaged
```
  Never push.
