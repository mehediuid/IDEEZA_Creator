### Task C8: The rest of the rail — Editor, Versions, Project log and Manage, and the rail's composition

**Spec delta check (commit e599fcf, and its "Harness notes"):** applied.
- The test command is the quoted glob. Tests import from `../../.tmp-test/lib/...`. The one new `src/lib/**` module uses relative value imports only. Dates use A3's `formatDateTime` through C7a's `timePart`.
- **Versions carries what Details' "Built in" used to say.** Each lineage is headed by its chat link, and each version carries its build link (COR-107, amended COR-55, §7 X39).
- **The Project log keeps only non-version events:** created by hand, minted and showcased (amended COR-52). This task's brief said "system events derived from builds, saves and versions". The amended spec supersedes that: every save and every build is a row of the Versions block, and repeating them in the log would state each fact twice (§7 X39).
- **Rename, "where it is recorded".** Nothing records a rename NOW. `updateProject` only bumps `updatedAt`, and every other edit bumps it too, so there is no rename time to show. The stored log that records renames is COR-53, which is NEXT. So the log has no rename line; absent beats invented (O3). `logLinesOf`'s comment says so, so that the next writer doesn't fake one from `updatedAt`.
- **The delete block's copy comes from `deleteBlockOf()`** (A4b), and it renders inside A7's `DeleteProjectControl`. This task writes neither reason string itself.

**Requirements:**
- Editor: COR-59, COR-60 (rendering; the derivations are A5's), COR-61, COR-65 (the Editor part).
- Versions: COR-106 (rendering), COR-107, COR-78 (the Versions part), COR-55 (the "Built in" half that moves into Versions).
- Project log: COR-50, COR-52.
- Manage: COR-67, COR-70 (the block's frame and presence; the control is A7's).
- The rail as a whole: COR-54 (all six blocks mounted in order, and a block with nothing real is absent), COR-56 (Manage never folds), COR-99 (an h2 per block via `RailBlock`, then h3 and h4 inside Versions), COR-100.
- Preview as buyer: PPL-6 (Editor and Manage absent), PPL-7 (Versions absent).

Not in this task:
- COR-68, COR-69, COR-71 and COR-92: A7's dialog, typed confirmation, after-delete and `deleteProject`.
- The Outcome and Details blocks' own contents: C7. This task only mounts them.
- COR-18: pending builds stay in the header banner, never in Versions.

**Files:**
- Create: `src/lib/manual/rail-rows.ts` — the words the three read-only blocks print. The strings are unit-tested, and the blocks only render them.
- Create: `src/components/projects/details/rail-editor.tsx`
- Create: `src/components/projects/details/rail-versions.tsx`
- Create: `src/components/projects/details/rail-log.tsx`
- Create: `src/components/projects/details/rail-manage.tsx`
- Modify: `src/components/projects/details/rail-block.tsx` (C7b, "Create `src/components/projects/details/rail-block.tsx`"). Replace the whole `RailBlock` function; the old and new code are quoted in Step 3f.
- Modify: `src/components/projects/details/project-page.tsx` (C1b step 3.10, as C2–C7 left it). Change the `./legacy` and `./slots` imports, add the rail imports and two adapters, and replace `SLOTS.rail` (Step 3g).
- Delete: `src/components/projects/details/legacy.tsx` (C1b step 3.9). Its rail exports are the last ones left (Step 3h).
- Test: `tests/projects/rail-rows.test.mjs` (new). A1's `tests/projects/tsconfig.json` already includes `../../src/lib/manual/**/*`, so no include entry is needed.

**Interfaces:**

Consumes (exact, as the earlier tasks produce them):
- **A1**, `src/lib/manual/projects.tsx`:
  - `export type ProjectStep = keyof ManualFlowState` and `ManualProject`.
  - Unchanged: `FLOW_STEPS` (`projects.tsx:426-434` today), `stepHref(project, step)` (`:461-467`), `STEP_LABELS` (`:469-477`) and `useManualProjects().selectProject`.
- **A2**, `src/lib/manual/project-read.ts`:
  - `ProjectVersion` = `{ chatId, lineage, version, current, buildId, job, savedAt, pieces: { ready; total; retry } | null, products: VersionProduct[], diff: { added; dropped; changed } | null }`.
    - `diff` is null for version 1, and also when this build or the one before it is gone.
    - Each diff entry is a row id where a row matched, else the product name.
  - `VersionProduct` = `{ rowId: string | null; productId: string; name: string }`.
  - `Lineage` = `{ chatId, title, chat: ChatSession | null, refs, latest }`.
  - `ProjectLogEntry` = `created` · `minted { intent, network }` · `showcased`.
  - `ProjectView` = `{ refs, lineages, products, versions: ProjectVersion[][], pending, log, summary, commerce }`.
  - `versionsOf()` returns one list per lineage, **each newest first**. This task relies on that order: the version before `lineage[i]` is `lineage[i + 1]`.
- **A3**, `src/lib/manual/project-summary.ts`: `type ProjectStatus`, `STATUS_WORD`, `LISTED_SUBLINE`, `formatDateTime`, `type MetaPart`, and `ProjectSummary`'s `status`, `showcase` and `productCount`.
- **A4a**, `src/lib/brief/project-brief.ts`: `type StoredDraft` (types only, through `SlotProps`).
- **A4b**, `src/lib/manual/permissions.ts`: `can(viewer, action)` with the actions `"project.openEditor"`, `"facts.seeOwnerOnly"` and `"project.delete"` (owner true, visitor false).
- **A5**, `src/lib/manual/editor-work.ts`: `type StepFact`, `type EditorWork`, `EDITOR_GLOBAL_NOTE` and `editorWorkOf(projectId)`.
- **A7**, `src/components/projects/delete-project-dialog.tsx`: `DeleteProjectControl(props: { project; viewer; status: ProjectStatus | undefined; draft: StoredDraft | null; showcased: boolean; productCount: number; refs: BuildRef[] })`. It holds the owner check, the `aria-disabled` Listed block with its reason named by `aria-describedby`, and the dialog. A7's "For later tasks" names this Manage block as its home.
- **C1**:
  - From `src/components/projects/details/slots.ts`: `SlotProps` = `{ project, view, viewer, brief: StoredDraft | null, now, announce }`, plus `ProjectSlots` and `RAIL_ORDER`.
  - From `project-page.tsx`: `SLOTS`.
  - From `legacy.tsx`: `LegacyEditorBlock` and `LegacyDetailsBlock`.
  - From `frame.tsx`: `RAIL_SURFACE`, a bordered card from a 1024 px page container. The page container is the only size container above the rail.
- **C7**:
  - From `rail-block.tsx`: `RailBlock({ title, meta?, busy?, children })`, `useRailStacked()`, `RailFacts`, `RailFact({ label, children })` and `RailValue({ parts })`.
  - From `rail-outcome.tsx`: `RailOutcome({ summary, commerce, draft, viewer })`.
  - From `rail-details.tsx`: `RailDetails({ project, summary, viewer })`.
  - From `showcase-copy.ts`: `timePart(at, text): MetaPart`.
- **Existing:**
  - `NETWORKS` and `type Intent` (`src/lib/brief/types.ts:10`, `:35-38`);
  - `Icon` (`src/components/dashboard/icon.tsx`);
  - `cn` (`src/lib/utils.ts:4`);
  - `ArrowRight01Icon`, `ArrowUpRight01Icon` and `Refresh01Icon` (`@hugeicons/core-free-icons`);
  - `next/link` with `onNavigate`. In Next 16 it runs only for an in-app navigation, never for a Cmd/Ctrl-click into a new tab (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`, §onNavigate).

Produces:
```ts
// src/lib/manual/rail-rows.ts (pure; relative value imports only)
export const NOT_READ: "—";
export const VERSIONS_SHOWN: 5;
export const LOG_SHOWN: 6;
export function stepFactText(fact: StepFact | undefined): string | null;   // undefined = not read yet → "—"
export type LogLine = { key: string; title: string; note: string | null; when: MetaPart[] };
export function logLinesOf(entries: ProjectLogEntry[]): LogLine[];
export type VersionItem = { name: string; href: string | null };
export type VersionLine = { label: "Products" | "Added" | "Dropped" | "Changed"; items: VersionItem[] };
export type VersionRow = { key: string; title: string; saved: MetaPart[] | null; pieces: string | null;
  buildHref: string | null; gone: boolean; lines: VersionLine[] };
export type VersionGroup = { key: string; heading: string; chatHref: string | null; rows: VersionRow[] };
export function productAtVersionHref(projectId: string, rowId: string, version: number): string;
export function versionGroupsOf(versions: ProjectVersion[][], lineages: Lineage[], projectId: string): VersionGroup[];
export function versionCountOf(groups: VersionGroup[]): number;
export function firstVersions(groups: VersionGroup[], limit: number): VersionGroup[];

// src/components/projects/details/rail-*.tsx — rail slots (C1's contract): SlotProps in, a RailBlock or null out
export function RailEditor(props: SlotProps): React.JSX.Element | null;    // null: !can(viewer, "project.openEditor")
export function RailVersions(props: SlotProps): React.JSX.Element | null;  // null: !can(viewer, "facts.seeOwnerOnly") or no version
export function RailLog(props: SlotProps): React.JSX.Element | null;       // null: no log entry
export function RailManage(props: SlotProps): React.JSX.Element | null;    // null: !can(viewer, "project.delete")
export const RAIL_LINK: string;   // rail-versions.tsx: a link in the rail's text (ink + quiet underline)
export const SHOW_ALL: string;    // rail-versions.tsx: the quiet in-place "Show all ({n})"

// src/components/projects/details/rail-block.tsx (C7b, extended)
export function RailBlock(props: { title: string; meta?: string; busy?: boolean; collapsible?: boolean; children: React.ReactNode }): React.JSX.Element;
```

**Decisions (each stated once, so the reviewer can object):**
1. **The blocks are C1's rail slots.** Each takes `SlotProps` and reads `view` (COR-74), so none derives state on its own and the owner's page and Preview as buyer are one tree (PPL-2). `SLOTS.rail` then lists all six in COR-54's order. C7's two blocks, written with their own props, mount through one-line adapters, as C1's hand-off prescribes. **C7 changed nothing in `project-page.tsx`**, and C1 couldn't import files that didn't exist yet, so until this task the page still shows C1's legacy Editor and Details. The Delete control is missing too: A7's interim `ManageBlock` lived in `project-details.tsx`, which C1 deleted.
2. **One frame: C7's `RailBlock`, with two additions.**
   - **`collapsible`.** Manage passes `false`. Once stacked, it keeps a plain h2 and stays open, because at 400 px "Delete project…" is the last thing on the page, not a title to open first (§3.3's phone sketch; C1's hand-off asked the same of its own frame).
   - **Horizontal padding `[@container(min-width:1024px)]:px-10`.** C1's `RAIL_SURFACE` is a bordered card from 1024 px. C1's own `RailBlock` padded itself (`[@container(min-width:1024px)]:p-10`), but C7's replaced it with `py-10` only, so every block's text would touch the border. Stacked, the page gutter pads it, as before.
3. **One press state per block.** An Editor row uses `LeaveButton`'s press state (`review-outputs.tsx`: "Opening…", a spinning `Refresh01Icon`, siblings shut). `LeaveButton` is a private `<button>`, while these rows are links (`stepHref`), so the state is rebuilt on `next/link`:
   - `onNavigate` presses the row, and a new-tab click never does;
   - `onClick` refuses every row while one is leaving.

   "Siblings" are the other five rows. The header pair keeps its own press state; B2's card does the same, locally.
4. **Before the idle read**, every row's fact is "—" (COR-61), Code and Product Preview included. After it, Code and Preview show nothing, and the caption under the rows (`EDITOR_GLOBAL_NOTE`) says why.
5. **Show all moves focus** to the first entry it reveals, since the button leaves with the press. The keyboard never falls to `<body>`.
6. **The five-version cap counts the whole project** (§5.1.10, "5 per project"). It walks the groups in order, and a group past the cap is left out whole, heading and all.
7. **Chat headings** (from `Lineage.chat`, per A2's note):
   - A live chat is a link: `Chat “{lineage}”` ↗ → `/chat/<id>`.
   - A chat gone from this browser is plain text: `Chat “{lineage}” · not in this browser`. COR-78 asks for plain text, and the suffix says why it isn't a link.
   - A lineage with no recorded chat (`chatId: null`) reads `Chat not in this browser`.
8. **Links are ink, not violet.** Chat, Open build and product names are `text-text-primary` with a quiet `decoration-border-strong` underline that darkens on hover. Violet stays the header primary's (house rule).
9. **A Listed mint's log line** carries the Listed subline as its note, "Goes on sale when the marketplace opens.", because "Listed" never stands alone before a marketplace exists (COM-19, COR-76).
10. **Target sizes.**
    - Editor rows and Show all are 32 px (`min-h-16`) beside the page.
    - They are `--touch-min` (44 px) once stacked (`useRailStacked()`, C7's switch) and under `pointer: coarse`.
    - Open build is 44 px once stacked.
    - Product names inside a sentence are inline links (WCAG 2.5.8's inline exception).
    - No arbitrary px (COR-6).
11. **The Project log stays in Preview as buyer.** PPL-6 and PPL-7 drop Editor, Versions, Manage, Outcome and Stored, not the log. Its entries (created, minted, showcased) are what a buyer's page shows anyway: the chip, the badge and the dates.

- [ ] **Step 1: Write the failing test** — create `tests/projects/rail-rows.test.mjs`:

```js
// C8 — the words the rail's Editor, Versions and Project log blocks print
// (spec §5.10: COR-52, COR-59/60/61, COR-78, COR-106/107). Compiled by A1's
// tests/projects/tsconfig.json:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  NOT_READ,
  VERSIONS_SHOWN,
  LOG_SHOWN,
  stepFactText,
  logLinesOf,
  productAtVersionHref,
  versionGroupsOf,
  versionCountOf,
  firstVersions,
} = await import("../../.tmp-test/lib/manual/rail-rows.js");

// ── Clock: local time, as A3's formatter reads it, so this passes in any timezone ──
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const SEP20_1005 = at(2026, 9, 20, 10, 5); // "Sep 20, 2026 · 10:05 AM"
const SEP22_902 = at(2026, 9, 22, 9, 2); // "Sep 22, 2026 · 9:02 AM"
const SEP22_2109 = at(2026, 9, 22, 21, 9); // "Sep 22, 2026 · 9:09 PM"
const SEP26_1000 = at(2026, 9, 26, 10, 0); // "Sep 26, 2026 · 10:00 AM"
const SEP26_1612 = at(2026, 9, 26, 16, 12); // "Sep 26, 2026 · 4:12 PM"
/** A MetaPart time, as C7a's timePart() builds it. */
const time = (ts, text) => ({ kind: "time", time: { text, dateTime: new Date(ts).toISOString(), title: text } });

// ── Fixtures: rows exactly as A2's versionsOf() and lineagesOf() return them ──
// The Car example of spec §3.3: version 2 of chat "Car" dropped Battery
// Charger, added Spare Battery Pack and changed Remote Controller.
const job = (id) => ({ id }); // the block only asks whether the build is in this browser
const v1 = {
  chatId: "chat_car", lineage: "Car", version: 1, current: false,
  buildId: "b_car_1", job: job("b_car_1"), savedAt: SEP22_902,
  pieces: { ready: 15, total: 15, retry: false },
  products: [
    { rowId: "p1", productId: "primary", name: "RC Car Controller" },
    { rowId: "p2", productId: "remote", name: "Remote Controller" },
    { rowId: "p3", productId: "charger", name: "Battery Charger" },
  ],
  diff: null,
};
const v2 = {
  chatId: "chat_car", lineage: "Car", version: 2, current: true,
  buildId: "b_car_2", job: job("b_car_2"), savedAt: SEP26_1612,
  pieces: { ready: 15, total: 15, retry: false },
  products: [
    { rowId: "p1", productId: "primary", name: "RC Car Controller" },
    { rowId: "p2", productId: "remote", name: "Remote Controller" },
    { rowId: "prd_spare001", productId: "spare", name: "Spare Battery Pack" },
  ],
  diff: { added: ["prd_spare001"], dropped: ["p3"], changed: ["p2"] },
};
const lineage = (chatId, chat) => ({ chatId, title: "Car", chat, refs: [], latest: null });
const LINEAGES = [lineage("chat_car", { id: "chat_car", title: "Car" })];

test("stepFactText: a derived fact or nothing — never a status word (COR-59, COR-60, COR-61)", () => {
  assert.equal(NOT_READ, "—");
  assert.equal(stepFactText(undefined), "—");
  assert.equal(stepFactText({ state: "not-opened" }), "Not opened");
  assert.equal(stepFactText({ state: "sample" }), "Sample circuit only");
  assert.equal(stepFactText({ state: "work", text: "42 objects · 12 on the board" }), "42 objects · 12 on the board");
  assert.equal(stepFactText({ state: "none" }), null);
});

test("logLinesOf: created, minted and showcased only, each over its date (COR-52)", () => {
  const lines = logLinesOf([
    { kind: "showcased", at: SEP26_1000 },
    { kind: "minted", at: SEP22_2109, intent: "sell", network: "baseSepolia" },
    { kind: "created", at: SEP20_1005 },
  ]);
  assert.deepEqual(lines, [
    { key: `showcased:${SEP26_1000}`, title: "Showcased", note: null, when: [time(SEP26_1000, "Sep 26, 2026 · 10:00 AM")] },
    {
      key: `minted:${SEP22_2109}`,
      title: "Minted · Listed · Base Sepolia (Testnet)",
      // "Listed" never stands alone before a marketplace exists (COM-19).
      note: "Goes on sale when the marketplace opens.",
      when: [time(SEP22_2109, "Sep 22, 2026 · 9:09 PM")],
    },
    { key: `created:${SEP20_1005}`, title: "Created by hand", note: null, when: [time(SEP20_1005, "Sep 20, 2026 · 10:05 AM")] },
  ]);
});

test("logLinesOf: each intent mints into its status word; only Listed carries a note", () => {
  const [give, save] = logLinesOf([
    { kind: "minted", at: 2, intent: "give", network: "mumbai" },
    { kind: "minted", at: 1, intent: "save", network: "baseSepolia" },
  ]);
  assert.equal(give.title, "Minted · Given · Mumbai Testnet (Polygon)");
  assert.equal(give.note, null);
  assert.equal(save.title, "Minted · Private · Base Sepolia (Testnet)");
  assert.equal(save.note, null);
  assert.deepEqual(logLinesOf([]), []);
});

test("productAtVersionHref: a product's page at one version (COR-41)", () => {
  assert.equal(productAtVersionHref("proj_car", "p2", 2), "/projects/proj_car/products/p2?v=2");
  assert.equal(productAtVersionHref("a b", "p/1", 1), "/projects/a%20b/products/p%2F1?v=1");
});

test("versionGroupsOf: the Car example — one lineage, newest first, Added / Dropped / Changed (COR-107)", () => {
  const groups = versionGroupsOf([[v2, v1]], LINEAGES, "proj_car");
  assert.equal(groups.length, 1);
  const [g] = groups;
  assert.equal(g.key, "chat_car");
  assert.equal(g.heading, "Chat “Car”");
  assert.equal(g.chatHref, "/chat/chat_car");
  assert.deepEqual(g.rows.map((r) => r.title), ["Version 2 · current", "Version 1"]);
  const [r2, r1] = g.rows;
  assert.equal(r2.key, "b_car_2");
  assert.deepEqual(r2.saved, [{ kind: "text", text: "Saved " }, time(SEP26_1612, "Sep 26, 2026 · 4:12 PM")]);
  assert.deepEqual(r1.saved, [{ kind: "text", text: "Saved " }, time(SEP22_902, "Sep 22, 2026 · 9:02 AM")]);
  assert.equal(r2.pieces, "15 of 15 pieces ready");
  assert.equal(r2.buildHref, "/build/b_car_2");
  assert.equal(r2.gone, false);
  assert.deepEqual(r2.lines, [
    { label: "Added", items: [{ name: "Spare Battery Pack", href: "/projects/proj_car/products/prd_spare001?v=2" }] },
    // A dropped product isn't in version 2: its link opens version 1, the last that had it.
    { label: "Dropped", items: [{ name: "Battery Charger", href: "/projects/proj_car/products/p3?v=1" }] },
    { label: "Changed", items: [{ name: "Remote Controller", href: "/projects/proj_car/products/p2?v=2" }] },
  ]);
  // Version 1 lists its products.
  assert.deepEqual(r1.lines, [
    {
      label: "Products",
      items: [
        { name: "RC Car Controller", href: "/projects/proj_car/products/p1?v=1" },
        { name: "Remote Controller", href: "/projects/proj_car/products/p2?v=1" },
        { name: "Battery Charger", href: "/projects/proj_car/products/p3?v=1" },
      ],
    },
  ]);
});

test("versionGroupsOf: an empty diff line is left out; a name with no row is plain text", () => {
  const v3 = {
    ...v2, version: 3, buildId: "b_car_3", job: job("b_car_3"),
    products: [...v2.products, { rowId: null, productId: "buzzer", name: "Buzzer" }],
    diff: { added: ["Buzzer"], dropped: [], changed: [] },
  };
  const [g] = versionGroupsOf([[v3, { ...v2, current: false }, v1]], LINEAGES, "proj_car");
  assert.deepEqual(g.rows[0].lines, [{ label: "Added", items: [{ name: "Buzzer", href: null }] }]);
  assert.equal(g.rows[1].title, "Version 2");
});

test("versionGroupsOf: nothing to compare against lists the version's products (A2: diff null)", () => {
  // v2's build is here but v1's is gone, so versionsOf() gives v2 no diff.
  const gone1 = { ...v1, job: null, pieces: null, products: [] };
  const [g] = versionGroupsOf([[{ ...v2, diff: null }, gone1]], LINEAGES, "proj_car");
  assert.deepEqual(g.rows[0].lines.map((l) => l.label), ["Products"]);
  assert.equal(g.rows[0].lines[0].items.length, 3);
  assert.deepEqual(g.rows[1], {
    key: "b_car_1", title: "Version 1",
    saved: [{ kind: "text", text: "Saved " }, time(SEP22_902, "Sep 22, 2026 · 9:02 AM")],
    pieces: null, buildHref: null, gone: true, lines: [],
  });
});

test("versionGroupsOf: a chat not in this browser is a plain heading (COR-78)", () => {
  const old = {
    chatId: "chat_old", lineage: "Old car", version: 1, current: true,
    buildId: "b_gone", job: null, savedAt: null, pieces: null, products: [], diff: null,
  };
  const [g] = versionGroupsOf([[old]], [lineage("chat_old", null)], "proj_car");
  assert.equal(g.heading, "Chat “Old car” · not in this browser");
  assert.equal(g.chatHref, null);
  assert.deepEqual(g.rows[0], {
    key: "b_gone", title: "Version 1 · current", saved: null, pieces: null,
    buildHref: null, gone: true, lines: [],
  });
  const [orphan] = versionGroupsOf([[{ ...old, chatId: null, lineage: "Build" }]], [lineage(null, null)], "proj_car");
  assert.equal(orphan.heading, "Chat not in this browser");
  assert.equal(orphan.key, "no-chat:b_gone");
  assert.equal(orphan.chatHref, null);
});

test("versionGroupsOf: a build that needs a retry says so; empty lineages are skipped", () => {
  const retry = { ...v1, current: true, pieces: { ready: 12, total: 15, retry: true } };
  const groups = versionGroupsOf([[], [retry]], LINEAGES, "proj_car");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].rows[0].pieces, "Needs a retry");
  assert.deepEqual(versionGroupsOf([], [], "proj_car"), []);
});

test("firstVersions: five versions per project across lineages, then Show all (§5.1.10)", () => {
  assert.equal(VERSIONS_SHOWN, 5);
  assert.equal(LOG_SHOWN, 6);
  const run = (chatId, n) =>
    Array.from({ length: n }, (_, i) => ({
      ...v1, chatId, lineage: chatId, version: n - i, current: i === 0, buildId: `${chatId}_${n - i}`, diff: null,
    }));
  const groups = versionGroupsOf(
    [run("a", 4), run("b", 3)],
    [lineage("a", { id: "a" }), lineage("b", { id: "b" })],
    "proj_car",
  );
  assert.equal(versionCountOf(groups), 7);
  const shown = firstVersions(groups, VERSIONS_SHOWN);
  assert.deepEqual(shown.map((g) => g.rows.map((r) => r.key)), [["a_4", "a_3", "a_2", "a_1"], ["b_3"]]);
  assert.equal(versionCountOf(shown), 5);
  // Under the cap nothing is cut; a group past the cap is left out whole.
  assert.deepEqual(firstVersions(groups, 20), groups);
  assert.deepEqual(firstVersions(groups, 4).map((g) => g.key), ["a"]);
});
```

- [ ] **Step 2: Run it, expected FAIL**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
`src/lib/manual/rail-rows.ts` doesn't exist yet. `tsc` compiles everything else and emits nothing for that path, so the top-level `await import(...)` throws before any test runs:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/manual/rail-rows.js' imported from …/tests/projects/rail-rows.test.mjs
```
`node --test` reports `rail-rows.test.mjs` as failed (exit 1). Every earlier task's test file still passes.

- [ ] **Step 3: Implement**

**3a.** Create `src/lib/manual/rail-rows.ts`:

```ts
// The words the rail's Editor, Versions and Project log blocks print, worked
// out from the page's one derivation (COR-74) so the blocks render strings and
// never decide them. Pure — no React, no storage. Value imports are relative:
// tsc leaves `@/` as it is in its output, and node:test loads the compiled
// module without a bundler.

import { NETWORKS, type Intent } from "../brief/types";
import type { StepFact } from "./editor-work";
import type { Lineage, ProjectLogEntry, ProjectVersion } from "./project-read";
import {
  LISTED_SUBLINE,
  STATUS_WORD,
  formatDateTime,
  type MetaPart,
  type ProjectStatus,
} from "./project-summary";
import { timePart } from "./showcase-copy";

/** What a fact reads before the idle read has run (COR-61), and nowhere else. */
export const NOT_READ = "—";

/** The Versions block shows this many versions, then "Show all ({n})" (§5.1.10). */
export const VERSIONS_SHOWN = 5;

/** The Project log shows this many entries, then "Show all ({n})" (COR-52). */
export const LOG_SHOWN = 6;

/** A date in the one formatter, "Sep 26, 2026 · 9:09 PM", inside `<time>` (COR-52, COR-107). */
function when(at: number): MetaPart {
  return timePart(at, formatDateTime(at));
}

// ───────────────────────── Editor (COR-59, COR-60) ─────────────────────────

/** One editor step's fact: what the project's own document says, or nothing
 *  at all. Never a status word — no "Done", "Not started" or "{n} of 7".
 *  `undefined` is "not read yet" (COR-61). */
export function stepFactText(fact: StepFact | undefined): string | null {
  if (!fact) return NOT_READ;
  switch (fact.state) {
    case "not-opened":
      return "Not opened";
    case "sample":
      return "Sample circuit only";
    case "work":
      return fact.text;
    case "none":
      return null;
  }
}

// ───────────────────────── Project log (COR-52) ─────────────────────────

export type LogLine = {
  key: string;
  /** "Created by hand" · "Minted · Listed · Base Sepolia (Testnet)" · "Showcased" */
  title: string;
  /** A second line only where the title can't stand alone: a Listed mint
   *  carries its subline until a marketplace exists (COM-19, COR-76). */
  note: string | null;
  /** The entry's date, in `<time>`. */
  when: MetaPart[];
};

/** What each intent mints into — the status words' own table, so the log can
 *  never name an outcome the chip doesn't. */
const MINTED_AS: Record<Intent, ProjectStatus> = {
  save: "private",
  give: "given",
  sell: "listed",
};

/** The log's lines, in projectLogOf()'s order (newest first). Only events that
 *  aren't versions: every save and build is the Versions block's (COR-107,
 *  §7 X39). A rename isn't recorded anywhere yet — `updatedAt` moves on every
 *  edit, so it can't stand in for one — and has no line until the stored log
 *  that records it (COR-53, NEXT). */
export function logLinesOf(entries: ProjectLogEntry[]): LogLine[] {
  return entries.map((e) => {
    if (e.kind === "created") {
      return { key: `created:${e.at}`, title: "Created by hand", note: null, when: [when(e.at)] };
    }
    if (e.kind === "showcased") {
      return { key: `showcased:${e.at}`, title: "Showcased", note: null, when: [when(e.at)] };
    }
    const status = MINTED_AS[e.intent];
    const network = NETWORKS.find((n) => n.value === e.network)?.label ?? e.network;
    return {
      key: `minted:${e.at}`,
      title: `Minted · ${STATUS_WORD[status]} · ${network}`,
      note: status === "listed" ? `${LISTED_SUBLINE}.` : null,
      when: [when(e.at)],
    };
  });
}

// ───────────────────────── Versions (COR-106, COR-107) ─────────────────────────

/** A product name in a version row: a link to its page at that version, or
 *  plain text when no project row stands behind it. */
export type VersionItem = { name: string; href: string | null };

export type VersionLine = {
  label: "Products" | "Added" | "Dropped" | "Changed";
  items: VersionItem[];
};

export type VersionRow = {
  /** The build id: one build is one version. */
  key: string;
  /** "Version 2 · current" */
  title: string;
  /** "Saved Sep 26, 2026 · 4:12 PM"; null when the save time was never recorded. */
  saved: MetaPart[] | null;
  /** "15 of 15 pieces ready" · "Needs a retry"; null when the build is gone. */
  pieces: string | null;
  /** Open build ↗; null when the build isn't in this browser. */
  buildHref: string | null;
  /** The build isn't in this browser: the row says so and lists no products. */
  gone: boolean;
  /** "Products" when there is nothing to compare against (version 1, or the
   *  build before is gone); otherwise the Added, Dropped and Changed lines,
   *  each only when it names something. */
  lines: VersionLine[];
};

export type VersionGroup = {
  key: string;
  /** Chat “Car” · Chat “Car” · not in this browser · Chat not in this browser */
  heading: string;
  /** /chat/<id> while the chat is in this browser; plain text otherwise (COR-78). */
  chatHref: string | null;
  rows: VersionRow[];
};

/** A product's page at one version (COR-41): `/projects/[id]/products/[productId]?v={n}`. */
export function productAtVersionHref(projectId: string, rowId: string, version: number): string {
  return `/projects/${encodeURIComponent(projectId)}/products/${encodeURIComponent(rowId)}?v=${version}`;
}

/** A diff entry is a row id, or the product's name where no row matched
 *  (versionsOf). It is resolved against the version that holds the product. */
function itemOf(v: ProjectVersion | null, entry: string, projectId: string): VersionItem {
  const p =
    v?.products.find((x) => x.rowId === entry) ??
    v?.products.find((x) => x.rowId === null && x.name === entry);
  if (!v || !p) return { name: entry, href: null };
  return { name: p.name, href: p.rowId ? productAtVersionHref(projectId, p.rowId, v.version) : null };
}

/** The Versions block: one group per lineage, each newest first — versionsOf()'s
 *  own order, so the block and the product page's version select read one
 *  list (COR-106). A lineage whose chat is gone (`Lineage.chat === null`) has a
 *  plain heading. */
export function versionGroupsOf(
  versions: ProjectVersion[][],
  lineages: Lineage[],
  projectId: string,
): VersionGroup[] {
  return versions
    .filter((lineage) => lineage.length > 0)
    .map((lineage) => {
      const head = lineage[0];
      const chat = lineages.find((l) => l.chatId === head.chatId)?.chat ?? null;
      const heading =
        head.chatId === null
          ? "Chat not in this browser"
          : chat
            ? `Chat “${head.lineage}”`
            : `Chat “${head.lineage}” · not in this browser`;
      return {
        key: head.chatId ?? `no-chat:${head.buildId}`,
        heading,
        chatHref: chat ? `/chat/${encodeURIComponent(chat.id)}` : null,
        rows: lineage.map((v, i): VersionRow => {
          // Newest first, so the version before this one is the next entry.
          const before = lineage[i + 1] ?? null;
          const gone = v.job === null;
          const lines: VersionLine[] = [];
          if (!gone && v.diff) {
            const push = (label: VersionLine["label"], entries: string[], at: ProjectVersion | null) => {
              if (entries.length) lines.push({ label, items: entries.map((e) => itemOf(at, e, projectId)) });
            };
            push("Added", v.diff.added, v);
            // A dropped product isn't in this version: its link opens the version before.
            push("Dropped", v.diff.dropped, before);
            push("Changed", v.diff.changed, v);
          } else if (!gone && v.products.length) {
            lines.push({
              label: "Products",
              items: v.products.map((p) => ({
                name: p.name,
                href: p.rowId ? productAtVersionHref(projectId, p.rowId, v.version) : null,
              })),
            });
          }
          return {
            key: v.buildId,
            title: `Version ${v.version}${v.current ? " · current" : ""}`,
            saved: v.savedAt === null ? null : [{ kind: "text", text: "Saved " }, when(v.savedAt)],
            pieces: v.pieces
              ? v.pieces.retry
                ? "Needs a retry"
                : `${v.pieces.ready} of ${v.pieces.total} pieces ready`
              : null,
            buildHref: gone ? null : `/build/${encodeURIComponent(v.buildId)}`,
            gone,
            lines,
          };
        }),
      };
    });
}

/** How many versions the groups hold, across every lineage. */
export function versionCountOf(groups: VersionGroup[]): number {
  return groups.reduce((n, g) => n + g.rows.length, 0);
}

/** The first `limit` versions in block order, each group keeping its heading
 *  over what of it is shown. The cap counts the whole project (§5.1.10); a
 *  group past it is left out whole. */
export function firstVersions(groups: VersionGroup[], limit: number): VersionGroup[] {
  const out: VersionGroup[] = [];
  let left = limit;
  for (const g of groups) {
    if (left <= 0) break;
    const rows = g.rows.slice(0, left);
    out.push({ ...g, rows });
    left -= rows.length;
  }
  return out;
}
```

**3b.** Create `src/components/projects/details/rail-editor.tsx`:

```tsx
"use client";

// The rail's Editor block (COR-59…61, COR-65). Six rows — PCB Design · Code ·
// 3D Module · Assembly · Peripheral Wiring · Product Preview — each a link to
// its editor step with the one fact the project's own documents support, and
// never a status word: the old "Done / Not started" read `flowState`, which
// nothing but the Brief's mint ever writes (owner decision O4). The Brief is
// not a row; its door is the header.
//
// The facts are read once per visit, in an idle callback after the first
// paint, so arriving on a project never parses its PCB doc before the page
// has drawn; until then each row reads "—". Owner only: a buyer's preview
// has no Editor block at all (PPL-6).

import * as React from "react";
import NextLink from "next/link";
import { ArrowRight01Icon, Refresh01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { EDITOR_GLOBAL_NOTE, editorWorkOf, type EditorWork } from "@/lib/manual/editor-work";
import { can } from "@/lib/manual/permissions";
import {
  FLOW_STEPS,
  STEP_LABELS,
  stepHref,
  useManualProjects,
  type ManualProject,
  type ProjectStep,
} from "@/lib/manual/projects";
import { stepFactText } from "@/lib/manual/rail-rows";
import { cn } from "@/lib/utils";
import { RailBlock, useRailStacked } from "./rail-block";
import type { SlotProps } from "./slots";

type EditorStep = Exclude<ProjectStep, "brief">;

/** The editor's own order (UIUX-80), without the Brief. */
const STEPS = FLOW_STEPS.filter((s): s is EditorStep => s !== "brief");

export function RailEditor({ project, viewer }: SlotProps) {
  if (!can(viewer, "project.openEditor")) return null;
  return (
    <RailBlock title="Editor">
      <EditorRows project={project} />
      <p className="m-0 max-w-[62ch] text-sm leading-sm text-text-secondary">{EDITOR_GLOBAL_NOTE}</p>
    </RailBlock>
  );
}

/** COR-61: one read per visit, after first paint, when the browser is idle.
 *  `undefined` until it has run. The reader never writes. */
function useEditorWork(projectId: string): EditorWork | undefined {
  const [read, setRead] = React.useState<{ id: string; work: EditorWork } | null>(null);
  React.useEffect(() => {
    const run = () => setRead({ id: projectId, work: editorWorkOf(projectId) });
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }
    // No requestIdleCallback (Safari): a macrotask still lands after paint.
    const timer = window.setTimeout(run, 1);
    return () => window.clearTimeout(timer);
  }, [projectId]);
  return read?.id === projectId ? read.work : undefined;
}

function EditorRows({ project }: { project: ManualProject }) {
  const { selectProject } = useManualProjects();
  const work = useEditorWork(project.id);
  const stacked = useRailStacked();
  // LeaveButton's press state (review-outputs.tsx): the pressed row says
  // "Opening…" and every row is shut until the editor takes over — two
  // navigations at once is not a thing the maker can have meant.
  const [leaving, setLeaving] = React.useState<EditorStep | null>(null);

  return (
    <ul role="list" className="-mx-3 flex flex-col">
      {STEPS.map((step) => {
        const busy = leaving === step;
        const blocked = leaving !== null && !busy;
        const fact = busy ? "Opening…" : stepFactText(work?.[step]);
        return (
          <li key={step}>
            <NextLink
              href={stepHref(project, step)}
              aria-busy={busy || undefined}
              aria-disabled={blocked || undefined}
              onClick={(e) => {
                // Shut while any row is already leaving, the pressed one too.
                if (leaving !== null) e.preventDefault();
              }}
              onNavigate={() => {
                // Only an in-app navigation presses the row: a Cmd/Ctrl-click
                // opens a tab and leaves this page as it was.
                selectProject(project.id);
                setLeaving(step);
              }}
              className={cn(
                "group flex min-h-16 items-start gap-4 rounded-md px-3 py-3 outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
                stacked && "min-h-[var(--touch-min)] items-center",
                busy && "cursor-wait",
                blocked && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="shrink-0 text-md font-medium leading-md text-text-primary">
                {STEP_LABELS[step]}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-right text-sm leading-md tabular-nums",
                  busy ? "text-text-primary" : "text-text-secondary",
                )}
              >
                {fact}
              </span>
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-[var(--line-height-md)] shrink-0 items-center text-text-tertiary transition-colors duration-normal ease-decelerate group-hover:text-text-primary",
                  busy && "motion-safe:animate-spin",
                )}
              >
                <Icon icon={busy ? Refresh01Icon : ArrowRight01Icon} size={16} />
              </span>
            </NextLink>
          </li>
        );
      })}
    </ul>
  );
}
```

**3c.** Create `src/components/projects/details/rail-versions.tsx`:

```tsx
"use client";

// The rail's Versions block (COR-107, owner decision O9) — the project's one
// version history. One group per chat lineage, headed by its chat; under it
// every saved version, newest first: its number, when it was saved, how many
// pieces it has ready and a link to its build, then what it added, dropped
// and changed against the version before (version 1 lists its products).
// Every product name opens that product's page at that version.
//
// It reads versionsOf() (COR-106) — the list the product page's version
// select reads — so the two can't disagree, and it holds what Details' "Built
// in" used to say (COR-55): each lineage's chat and build links live here now.
// Pending builds stay in the header's banner (COR-18), not here. Owner only:
// the chat and build links are the maker's own record (PPL-7).

import * as React from "react";
import NextLink from "next/link";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { can } from "@/lib/manual/permissions";
import {
  VERSIONS_SHOWN,
  firstVersions,
  versionCountOf,
  versionGroupsOf,
  type VersionGroup,
  type VersionItem,
} from "@/lib/manual/rail-rows";
import { cn } from "@/lib/utils";
import { RailBlock, RailFact, RailFacts, RailValue, useRailStacked } from "./rail-block";
import type { SlotProps } from "./slots";

/** A link in the rail's text: the page's own ink with a quiet underline that
 *  darkens on hover — never the brand colour, which is the header primary's. */
export const RAIL_LINK =
  "rounded-sm text-text-primary underline decoration-border-strong underline-offset-2 outline-none transition-colors duration-normal ease-decelerate hover:decoration-current focus-visible:ring-2 focus-visible:ring-border-focus";

/** "Show all ({n})" under a capped list — quiet, in place, no inner scroller. */
export const SHOW_ALL =
  "-mx-3 inline-flex min-h-16 items-center self-start rounded-md px-3 text-sm font-semibold leading-sm text-text-secondary outline-none transition-colors duration-normal ease-decelerate hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function RailVersions({ project, view, viewer }: SlotProps) {
  const groups = React.useMemo(
    () => versionGroupsOf(view.versions, view.lineages, project.id),
    [view.versions, view.lineages, project.id],
  );
  const total = versionCountOf(groups);
  // A hand-made project with no build has nothing to list.
  if (!can(viewer, "facts.seeOwnerOnly") || total === 0) return null;
  return (
    <RailBlock title="Versions">
      <VersionList groups={groups} total={total} />
    </RailBlock>
  );
}

function VersionList({ groups, total }: { groups: VersionGroup[]; total: number }) {
  const stacked = useRailStacked();
  const [all, setAll] = React.useState(false);
  const firstRevealed = React.useRef<HTMLHeadingElement>(null);
  const shown = all ? groups : firstVersions(groups, VERSIONS_SHOWN);
  // Where each group starts in the block's one running count, so the first
  // version "Show all" reveals can take the focus.
  const starts = shown.map((_, gi) => shown.slice(0, gi).reduce((n, g) => n + g.rows.length, 0));

  return (
    <>
      <div className="flex flex-col gap-10">
        {shown.map((g, gi) => (
          <div key={g.key} className="flex flex-col gap-6">
            <h3 className="text-sm font-medium leading-sm text-text-secondary">
              {g.chatHref ? (
                <NextLink href={g.chatHref} className={cn(RAIL_LINK, "inline-flex items-center gap-2")}>
                  {g.heading}
                  <Icon icon={ArrowUpRight01Icon} size={14} />
                </NextLink>
              ) : (
                g.heading
              )}
            </h3>
            <ol role="list" className="flex flex-col gap-8">
              {g.rows.map((r, ri) => {
                const revealed = all && starts[gi] + ri === VERSIONS_SHOWN;
                return (
                  <li key={r.key} className="flex flex-col gap-2">
                    <h4
                      ref={revealed ? firstRevealed : undefined}
                      tabIndex={revealed ? -1 : undefined}
                      className="rounded-sm text-md font-semibold leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      {r.title}
                    </h4>
                    {r.saved && (
                      <p className="text-sm leading-sm text-text-secondary">
                        <RailValue parts={r.saved} />
                      </p>
                    )}
                    <p className="text-sm leading-sm text-text-secondary">
                      {r.gone ? (
                        "Build not in this browser"
                      ) : (
                        <>
                          {r.pieces}
                          {r.pieces && r.buildHref ? " · " : null}
                          {r.buildHref && (
                            <NextLink
                              href={r.buildHref}
                              className={cn(
                                RAIL_LINK,
                                "inline-flex items-center gap-2 font-medium",
                                stacked && "min-h-[var(--touch-min)]",
                              )}
                            >
                              Open build
                              <Icon icon={ArrowUpRight01Icon} size={14} />
                            </NextLink>
                          )}
                        </>
                      )}
                    </p>
                    {r.lines.length > 0 && (
                      <div className="mt-2">
                        <RailFacts>
                          {r.lines.map((line) => (
                            <RailFact key={line.label} label={line.label}>
                              <Names items={line.items} />
                            </RailFact>
                          ))}
                        </RailFacts>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      {!all && total > VERSIONS_SHOWN && (
        <button
          type="button"
          onClick={() => {
            setAll(true);
            // The button leaves with the press: focus moves to the first
            // version it revealed, so the keyboard doesn't fall to <body>.
            requestAnimationFrame(() => firstRevealed.current?.focus());
          }}
          className={cn(SHOW_ALL, stacked && "min-h-[var(--touch-min)]")}
        >
          Show all ({total})
        </button>
      )}
    </>
  );
}

/** "RC Car Controller, Remote Controller" — each a link when a project row
 *  stands behind it, plain text when none does. */
function Names({ items }: { items: VersionItem[] }) {
  return (
    <>
      {items.map((it, i) => (
        <React.Fragment key={`${i}:${it.name}`}>
          {i > 0 ? ", " : null}
          {it.href ? (
            <NextLink href={it.href} className={RAIL_LINK}>
              {it.name}
            </NextLink>
          ) : (
            it.name
          )}
        </React.Fragment>
      ))}
    </>
  );
}
```

**3d.** Create `src/components/projects/details/rail-log.tsx`:

```tsx
"use client";

// The rail's Project log (COR-50, COR-52): the project's system events that
// aren't versions — created by hand, minted, showcased — newest first, each
// over its date. Every saved version and its build is the Versions block's
// (§7 X39), so no save is said twice. Derived only; nothing here is stored.
// A project with no such event has no block (a built, unminted one).

import * as React from "react";
import { LOG_SHOWN, logLinesOf, type LogLine } from "@/lib/manual/rail-rows";
import { cn } from "@/lib/utils";
import { RailBlock, RailValue, useRailStacked } from "./rail-block";
import { SHOW_ALL } from "./rail-versions";
import type { SlotProps } from "./slots";

export function RailLog({ view }: SlotProps) {
  const lines = React.useMemo(() => logLinesOf(view.log), [view.log]);
  if (lines.length === 0) return null;
  return (
    <RailBlock title="Project log">
      <LogList lines={lines} />
    </RailBlock>
  );
}

function LogList({ lines }: { lines: LogLine[] }) {
  const stacked = useRailStacked();
  const [all, setAll] = React.useState(false);
  const firstRevealed = React.useRef<HTMLLIElement>(null);
  const shown = all ? lines : lines.slice(0, LOG_SHOWN);
  return (
    <>
      <ol role="list" className="flex flex-col gap-8">
        {shown.map((l, i) => {
          const revealed = all && i === LOG_SHOWN;
          return (
            <li
              key={l.key}
              ref={revealed ? firstRevealed : undefined}
              tabIndex={revealed ? -1 : undefined}
              className="flex flex-col gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <p className="text-md font-medium leading-md text-text-primary">{l.title}</p>
              {l.note && <p className="text-sm leading-sm text-text-secondary">{l.note}</p>}
              <p className="text-sm leading-sm text-text-secondary">
                <RailValue parts={l.when} />
              </p>
            </li>
          );
        })}
      </ol>
      {!all && lines.length > LOG_SHOWN && (
        <button
          type="button"
          onClick={() => {
            setAll(true);
            // The button leaves with the press: focus moves to the first
            // entry it revealed rather than falling to <body>.
            requestAnimationFrame(() => firstRevealed.current?.focus());
          }}
          className={cn(SHOW_ALL, stacked && "min-h-[var(--touch-min)]")}
        >
          Show all ({lines.length})
        </button>
      )}
    </>
  );
}
```

**3e.** Create `src/components/projects/details/rail-manage.tsx`:

```tsx
"use client";

// The rail's Manage block (COR-67, COR-70): the rail's last block and the
// page's one home for "Delete project…" (the Figma's ⋮ → Delete Project,
// §3.7). Its one control is DeleteProjectControl — the owner-only button, the
// Listed block with its reason beside it, and the dialog behind it — framed
// apart from everything else. It never folds: at 400 px Delete is the last
// thing on the page, not a title to open first (§3.3). Absent in Preview as
// buyer, because the control is (PPL-6).

import { DeleteProjectControl } from "@/components/projects/delete-project-dialog";
import { can } from "@/lib/manual/permissions";
import { RailBlock } from "./rail-block";
import type { SlotProps } from "./slots";

export function RailManage({ project, view, viewer, brief }: SlotProps) {
  if (!can(viewer, "project.delete")) return null;
  return (
    <RailBlock title="Manage" collapsible={false}>
      <DeleteProjectControl
        project={project}
        viewer={viewer}
        status={view.summary.status}
        draft={brief}
        showcased={view.summary.showcase !== null}
        productCount={view.summary.productCount}
        refs={view.refs}
      />
    </RailBlock>
  );
}
```

**3f.** Modify `src/components/projects/details/rail-block.tsx` (C7b). Replace the whole `RailBlock` function. Old (C7b's code, verbatim):

```tsx
export function RailBlock({
  title,
  meta,
  busy = false,
  children,
}: {
  /** The block's h2: "Outcome", "Details", … */
  title: string;
  /** Said after the title on the stacked toggle — the block's state in a few words. */
  meta?: string;
  /** The block's own read hasn't finished; it shows "—" meanwhile (COM-22, COR-2). */
  busy?: boolean;
  children: React.ReactNode;
}) {
  const { probe, stacked } = useStackedProbe();
  const [open, setOpen] = React.useState(false);
  const headingId = React.useId();
  const panelId = React.useId();
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className="relative flex flex-col gap-6 py-10"
    >
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-0 w-px [@container(max-width:1023px)]:w-[2px]"
      />
      {stacked ? (
        <h2 id={headingId} className="m-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-[44px] w-full items-center gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <span className="shrink-0 text-lg font-bold text-text-primary">{title}</span>
            {meta && (
              <span className="min-w-0 truncate text-md font-medium text-text-secondary">· {meta}</span>
            )}
            <span
              aria-hidden
              className={cn(
                "ml-auto inline-flex shrink-0 text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
                open && "rotate-180",
              )}
            >
              <Icon icon={ArrowDown01Icon} size={18} />
            </span>
          </button>
        </h2>
      ) : (
        <h2 id={headingId} className="m-0 text-lg font-bold text-text-primary">
          {title}
        </h2>
      )}
      <div id={panelId} className={cn("flex flex-col gap-6", stacked && !open && "hidden")}>
        <StackedContext.Provider value={stacked}>{children}</StackedContext.Provider>
      </div>
    </section>
  );
}
```

New:

```tsx
export function RailBlock({
  title,
  meta,
  busy = false,
  collapsible = true,
  children,
}: {
  /** The block's h2: "Outcome", "Details", … */
  title: string;
  /** Said after the title on the stacked toggle — the block's state in a few words. */
  meta?: string;
  /** The block's own read hasn't finished; it shows "—" meanwhile (COM-22, COR-2). */
  busy?: boolean;
  /** False keeps the block open once stacked, under a plain h2: Manage, whose
   *  Delete is the last thing on the page at 400 px (§3.3, COR-67). */
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const { probe, stacked } = useStackedProbe();
  const [open, setOpen] = React.useState(false);
  const headingId = React.useId();
  const panelId = React.useId();
  const folds = stacked && collapsible;
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className="relative flex flex-col gap-6 py-10 [@container(min-width:1024px)]:px-10"
    >
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-0 w-px [@container(max-width:1023px)]:w-[2px]"
      />
      {folds ? (
        <h2 id={headingId} className="m-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-[44px] w-full items-center gap-4 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <span className="shrink-0 text-lg font-bold text-text-primary">{title}</span>
            {meta && (
              <span className="min-w-0 truncate text-md font-medium text-text-secondary">· {meta}</span>
            )}
            <span
              aria-hidden
              className={cn(
                "ml-auto inline-flex shrink-0 text-text-tertiary transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
                open && "rotate-180",
              )}
            >
              <Icon icon={ArrowDown01Icon} size={18} />
            </span>
          </button>
        </h2>
      ) : (
        <h2 id={headingId} className="m-0 text-lg font-bold text-text-primary">
          {title}
        </h2>
      )}
      <div id={panelId} className={cn("flex flex-col gap-6", folds && !open && "hidden")}>
        <StackedContext.Provider value={stacked}>{children}</StackedContext.Provider>
      </div>
    </section>
  );
}
```

Nothing else in the file changes. `RailOutcome` and `RailDetails` pass no `collapsible`, so they fold as before.

**3g.** Modify `src/components/projects/details/project-page.tsx` (C1b step 3.10, with C2–C7's edits in it).

(1) **Imports.** Delete the `./legacy` import. After C2, C3 and C6 it is down to `LegacyDetailsBlock` and `LegacyEditorBlock`; C1b's original was:
```tsx
import {
  LegacyDetailsBlock,
  LegacyEditorBlock,
  LegacyHeader,
  LegacyNetwork,
  LegacyProducts,
} from "./legacy";
```
If a sibling task left another `Legacy*` export mounted (see 3h), keep only that name in the import. In its place, add:
```tsx
import { RailDetails } from "./rail-details";
import { RailEditor } from "./rail-editor";
import { RailLog } from "./rail-log";
import { RailManage } from "./rail-manage";
import { RailOutcome } from "./rail-outcome";
import { RailVersions } from "./rail-versions";
```
and make the `./slots` import read exactly:
```tsx
import type { ProjectSlots, SlotProps } from "./slots";
```

(2) **Adapters.** Insert these immediately above `const SLOTS: ProjectSlots = {`:
```tsx
// C7's two rail blocks take their own props; they mount through these, as the
// slot contract asks. The other four rail blocks are SlotProps components.
function OutcomeSlot({ view, brief, viewer }: SlotProps) {
  return <RailOutcome summary={view.summary} commerce={view.commerce} draft={brief} viewer={viewer} />;
}
function DetailsSlot({ project, view, viewer }: SlotProps) {
  return <RailDetails project={project} summary={view.summary} viewer={viewer} />;
}

```

(3) **`SLOTS.rail`.** Old (C1b):
```tsx
  rail: {
    editor: LegacyEditorBlock,
    details: LegacyDetailsBlock,
  },
```
New (COR-54's order, the order `RAIL_ORDER` renders them in):
```tsx
  rail: {
    outcome: OutcomeSlot,
    editor: RailEditor,
    details: DetailsSlot,
    versions: RailVersions,
    log: RailLog,
    manage: RailManage,
  },
```

**3h.** Delete `src/components/projects/details/legacy.tsx`. C1's hand-off gives each legacy export to one task: `LegacyHeader` and `StatusBadge` to the header task (C2); `LegacyProducts`, `Deliverables`, `ItemStatus` and `EmptyNote` to C3; `LegacyNetwork` to C6; and `LegacyEditorBlock`, `LegacyDetailsBlock` and `Row` to the rail, "the last one deletes the file". Check before deleting:
```
grep -n "^export function" src/components/projects/details/legacy.tsx
```
Expected, exactly two lines: `export function LegacyEditorBlock` and `export function LegacyDetailsBlock`. Then:
```
git rm -q src/components/projects/details/legacy.tsx
```
If any other export is still printed, a sibling task hasn't removed its own yet. In that case don't delete the file. Remove only:
- the `LegacyEditorBlock` function;
- the `LegacyDetailsBlock` function;
- `Row`;
- from the imports, `File01Icon`, `FLOW_STEPS`, `STEP_LABELS` and `completedCount`, the `import { formatDateTime } from "@/lib/manual/project-summary";` line and the `import { RailBlock } from "./frame";` line. Nothing else in the file uses them.

In that case, keep the remaining `Legacy*` name in 3g's import. `npx eslint` on the file then reports no unused import.

- [ ] **Step 4: Run, expected PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected:
- `tsc` exits 0.
- `rail-rows.test.mjs` reports 10 passing tests, every other file in `tests/projects/` still passes, and there are 0 failures.
- The dates are built in local time, so the run passes in any timezone. It was checked under `TZ=UTC`, `America/Los_Angeles` and `Asia/Kolkata`.

Also run C7b's source test, which reads `rail-block.tsx`. It stays green, because the probe class and `RAIL_MIN` are untouched:
```
node --test "tests/projects/rail-blocks.test.mjs"
```

- [ ] **Step 5: Browser check.** Use the dev server from Task 0 on `http://localhost:3002`, in light and dark, at 1440 × 900 and at 400 × 860.

Run these steps only on your own dev server at `http://localhost:3002` (Task 0). The seed script refuses to run on any other origin: the browser may be shared with other sessions, and a seed that runs on someone else's port wipes their data.

**Seed.** Open `http://localhost:3002/projects`, open DevTools → Console, paste the script below and press Enter. It writes four projects, then reloads:
- **C8 Car**: a chat rebuilt once. Version 2 dropped Battery Charger, added Spare Battery Pack and changed Remote Controller's parts. Its editor docs have work in them.
- **C8 Soil Monitor**: made by hand, minted to sell, and showcased.
- **C8 Bench Lamp**: made by hand, a draft.
- **C8 Desk Fan**: one chat saved six times.

It replaces only its own ids, so it is safe to run twice.

```js
(() => {
  if (location.origin !== "http://localhost:3002") throw new Error("C8 seed: run this on http://localhost:3002 only");
  const now = Date.now(), H = 36e5, T1 = now - 96 * H, T2 = now - 2 * H;
  const flow = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
  const items = () => ["3d", "pcb", "code", "wiring", "parts"].map((kind) => ({ kind, status: "ready", progress: 100 }));
  const part = (name) => ({ name, role: "Obstacle sensing", category: "Sensor" });
  const companion = (id, name, parts = []) => ({ id, name, title: name, conceptImageUrl: "", conceptPrompt: name,
    summary: "", description: `${name}.`, parts, items: items() });
  const build = (id, chatId, projectId, title, at, companions) => ({ id, chatId, conceptImageUrl: "", conceptPrompt: title,
    title, summary: "", description: `${title}.`, parts: [], conceptNumber: "1", status: "ready", estimateMin: 12,
    creditsCharged: true, creditsRefunded: false, projectId, items: items(), companions,
    createdAt: at, updatedAt: at, startedAt: at, endedAt: at + 6e5 });
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
  const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const without = (arr, ids) => arr.filter((x) => !ids.includes(x.id));
  const sixAt = [6, 5, 4, 3, 2, 1].map((d) => now - d * 24 * H);   // versions 1…6, a day apart
  const six = sixAt.map((at, i) => build(`b_c8six_${i + 1}`, "chat_c8six", "proj_c8six", "Desk Fan", at, []));

  put("ideeza:create:chats", [...without(read("ideeza:create:chats"), ["chat_c8car", "chat_c8six"]),
    { id: "chat_c8car", title: "C8 Car", turns: [], createdAt: T1 - H, updatedAt: T2 },
    { id: "chat_c8six", title: "C8 Desk Fan", turns: [], createdAt: sixAt[0] - H, updatedAt: sixAt[5] }]);
  put("ideeza:create:builds", [
    ...without(read("ideeza:create:builds"), ["b_c8car_1", "b_c8car_2", ...six.map((b) => b.id)]),
    build("b_c8car_1", "chat_c8car", "proj_c8car", "RC Car Controller", T1,
      [companion("remote", "Remote Controller"), companion("charger", "Battery Charger")]),
    build("b_c8car_2", "chat_c8car", "proj_c8car", "RC Car Controller", T2,
      [companion("remote", "Remote Controller", [part("HC-SR04 ultrasonic sensor")]), companion("spare", "Spare Battery Pack")]),
    ...six]);
  const car = { id: "proj_c8car", slug: "c8-car", name: "C8 Car", productName: "RC Car Controller",
    description: "A two-motor RC car.", status: "draft", createdAt: T1, updatedAt: T2, flowState: flow, buildId: "b_c8car_1",
    builds: [{ buildId: "b_c8car_1", chatId: "chat_c8car", version: 1, savedAt: T1 },
             { buildId: "b_c8car_2", chatId: "chat_c8car", version: 2, savedAt: T2 }],
    products: [
      { id: "p1", name: "RC Car Controller", description: "RC Car Controller.", source: { buildId: "b_c8car_2", productId: "primary" }, updatedAt: T2 },
      { id: "p2", name: "Remote Controller", description: "Remote Controller.", source: { buildId: "b_c8car_2", productId: "remote" }, updatedAt: T2 },
      { id: "p3", name: "Battery Charger", description: "Battery Charger.", source: { buildId: "b_c8car_1", productId: "charger" }, updatedAt: T1 },
      { id: "prd_c8spare1", name: "Spare Battery Pack", description: "Spare Battery Pack.", source: { buildId: "b_c8car_2", productId: "spare" }, updatedAt: T2 },
    ] };
  const soil = { id: "proj_c8soil", slug: "c8-soil", name: "C8 Soil Monitor", productName: "Soil probe", description: "",
    status: "completed", createdAt: now - 200 * H, updatedAt: now - 50 * H, flowState: { ...flow, brief: true },
    products: [{ id: "p1", name: "Soil probe", description: "" }], showcasedAt: now - 50 * H };
  const lamp = { id: "proj_c8lamp", slug: "c8-lamp", name: "C8 Bench Lamp", productName: "Lamp", description: "",
    status: "draft", createdAt: now - 30 * H, updatedAt: now - 30 * H, flowState: flow,
    products: [{ id: "p1", name: "Lamp", description: "" }] };
  const fan = { id: "proj_c8six", slug: "c8-desk-fan", name: "C8 Desk Fan", productName: "Desk Fan", description: "",
    status: "draft", createdAt: sixAt[0], updatedAt: sixAt[5], flowState: flow, buildId: "b_c8six_1",
    builds: six.map((b, i) => ({ buildId: b.id, chatId: "chat_c8six", version: i + 1, savedAt: b.createdAt })),
    products: [{ id: "p1", name: "Desk Fan", description: "Desk Fan.", source: { buildId: "b_c8six_6", productId: "primary" }, updatedAt: sixAt[5] }] };
  put("ideeza:manual:projects", [...without(read("ideeza:manual:projects"), [car.id, soil.id, lamp.id, fan.id]), car, soil, lamp, fan]);
  put("ideeza:brief:draft:proj_c8soil", { state: { intent: "sell", mintedAt: now - 100 * H, network: "baseSepolia" }, step: "success" });
  // A5's own fixtures: 4 placed objects, 2 on the board, 1 of them checked; 3 parts and 2 wires; a generated model.
  put("ideeza:pcb:doc:proj_c8car", { objects: [
    { id: "sch-text-112-116", kind: "text", x: 112, y: 116, scope: "schematic", text: "Vbus" },
    { id: "u1", kind: "resistorBox", x: 200, y: 200, scope: "schematic", text: "R1" },
    { id: "fp-r1", kind: "footprint", x: 40, y: 60, scope: "pcb", text: "R1", footprint: "R_0603", side: "top" },
    { id: "fp-u1", kind: "footprint", x: 80, y: 60, scope: "pcb", text: "U1", footprint: "SOIC-8" },
    { id: "trk-1", kind: "track", x: 10, y: 10, scope: "pcb", net: "GND", width: 10 } ] });
  put("ideeza:assembly:proj_c8car", { "fp-r1": true, "fp-u1": false });
  put("ideeza:wiring:doc:proj_c8car", {
    parts: [{ id: "part_1", kind: "led", x: 10, y: 10 }, { id: "part_2", kind: "button", x: 40, y: 10 }, { id: "part_3", kind: "buzzer", x: 70, y: 10 }],
    wires: [{ id: "wire_1", fromPart: "part_1", fromPin: "a", toPart: "part_2", toPin: "b" },
            { id: "wire_2", fromPart: "part_2", fromPin: "a", toPart: "part_3", toPin: "b" }] });
  put("ideeza:three:aimodel:proj_c8car", { prompt: "an RC car body", imageUrl: "", glbUrl: "/api/three/model/c8car.glb", provider: "meshy" });
  location.reload();
})();
```

**1. C8 Car at 1440 × 900, light.** Go to `http://localhost:3002/projects/proj_c8car`. The rail (`aside[aria-label="Project record"]`) reads, in order: **Outcome · Editor · Details · Versions · Manage**. There is **no Project log**, because a built, unminted project has no event that isn't a version.
- **Editor.** For a moment after load every fact reads "—". Then:
  - PCB Design: "4 objects · 2 on the board"
  - Code: nothing
  - 3D Module: "AI model generated"
  - Assembly: "1 of 2 parts checked"
  - Peripheral Wiring: "3 parts · 2 wires"
  - Product Preview: nothing

  No row says Done, Not started or "{n} of 7". Under the rows it reads: *"Code, 3D shapes and Preview are shared by every project in this browser for now, so they show no progress here."*
- **Versions**, in this order:
  ```
  Chat “C8 Car” ↗
  Version 2 · current
  Saved {the seed's time minus 2 h, e.g. "Sep 26, 2026 · 2:12 PM"}
  15 of 15 pieces ready · Open build ↗
  Added    Spare Battery Pack
  Dropped  Battery Charger
  Changed  Remote Controller
  Version 1
  Saved {the seed's time minus 4 days}
  15 of 15 pieces ready · Open build ↗
  Products RC Car Controller, Remote Controller, Battery Charger
  ```
  - There is no "Show all", because there are only 2 versions.
  - None of these links is violet. Hovering one darkens its underline.
- **Links.** Hover each one and read its URL in the status bar:
  - "Chat “C8 Car”" → `/chat/chat_c8car`
  - the two Open build links → `/build/b_c8car_2` and `/build/b_c8car_1`
  - Spare Battery Pack → `/projects/proj_c8car/products/prd_c8spare1?v=2`
  - Battery Charger (under Dropped) → `/projects/proj_c8car/products/p3?v=1`
  - Remote Controller (under Changed) → `…/products/p2?v=2`
  - each of the three version-1 names → its product at `?v=1`

  Click **Battery Charger**. The product page opens on version 1 (C4's select reads "Version 1 of 2"). Press Back.
- **Manage.** "Delete project…" is quiet and in the danger tone: red text on the surface with a hairline border, not filled. No reason line sits under it.
- **Press state.**
  - Click **PCB Design**. That row reads "Opening…" and its icon spins, the other five dim, and the page lands on `/project/c8-car/pcb`. Press Back: the rail returns and the facts are read again.
  - Cmd-click (Ctrl-click) **Code**. A new tab opens on `/project/c8-car/code`, and no row in this tab says "Opening…".
- **Keyboard.** Tab through the rail. The six Editor rows come in order, then Chat “C8 Car”, Open build, Spare Battery Pack, Battery Charger, Remote Controller, Open build, the three version-1 names, and last Delete project…. Each one shows the focus ring.
- **Target sizes.** In the console, run `[...document.querySelectorAll('a[href^="/project/c8-car/"]')].map((a) => Math.round(a.getBoundingClientRect().height))`. It returns six numbers, each ≥ 32.
- **Surface.** The rail blocks' text sits inside the rail's rounded border with a gutter. The Editor rows' hover fill stays inside the border.

**2. Orphans (COR-78)**, still on C8 Car. Remove the chat:
```js
if (location.origin === "http://localhost:3002") { localStorage.setItem("ideeza:create:chats", JSON.stringify(JSON.parse(localStorage.getItem("ideeza:create:chats")).filter((c) => c.id !== "chat_c8car"))); location.reload(); }
```
The Versions heading becomes the plain text **"Chat “RC Car Controller” · not in this browser"**, because the lineage now takes the latest build's title. It is not a link and has no ↗.

Then remove version 1's build:
```js
if (location.origin === "http://localhost:3002") { localStorage.setItem("ideeza:create:builds", JSON.stringify(JSON.parse(localStorage.getItem("ideeza:create:builds")).filter((b) => b.id !== "b_c8car_1"))); location.reload(); }
```
- Version 1 reads its Saved date, then **"Build not in this browser"**. It has no Open build and no Products line.
- Version 2 has nothing to compare against now, so it lists **Products: RC Car Controller, Remote Controller, Spare Battery Pack**, each at `?v=2`. It still reads "15 of 15 pieces ready · Open build ↗".

Re-run the seed to restore both.

**3. C8 Soil Monitor** (Listed, showcased, made by hand). Go to `http://localhost:3002/projects/proj_c8soil`.
- There is **no Versions block**, because the project has no build.
- **Editor:** PCB Design and Peripheral Wiring read "Not opened". The other four rows show no fact.
- **Project log**, newest first, each entry over its date:
  ```
  Showcased
  {the seed's time minus 50 h}
  Minted · Listed · Base Sepolia (Testnet)
  Goes on sale when the marketplace opens.
  {minus 100 h}
  Created by hand
  {minus 200 h}
  ```
  - There is no "Show all" (3 entries).
  - In Elements, each date is `<time datetime="2026-…Z" title="Sep …, 2026 · … PM">` with the same text.
- **Manage, blocked.**
  - "Delete project…" is in the disabled ink. Under it: *"A listed project can't be deleted."* and *"There's no way to withdraw a listing yet — that comes with the marketplace."*
  - Tab to it: it takes focus and the ring shows.
  - Press Enter, press Space, then click it. No dialog opens.
  - With it focused, run in the console:
    - `document.activeElement.getAttribute("aria-disabled")` → `"true"`
    - `document.getElementById(document.activeElement.getAttribute("aria-describedby")).textContent` → both sentences

**4. C8 Bench Lamp** (a draft, made by hand). Go to `http://localhost:3002/projects/proj_c8lamp`.
- The Project log has one entry, "Created by hand". There is no Versions block.
- Press **Delete project…**. A7's dialog opens with Cancel focused.
- Press Escape. The dialog closes, focus is back on **Delete project…**, and nothing is deleted.

**5. C8 Desk Fan**: the five-version cap. Go to `http://localhost:3002/projects/proj_c8six`.
- Versions shows "Chat “C8 Desk Fan” ↗", then Version 6 · current, 5, 4, 3 and 2. Versions 2–6 each read "5 of 5 pieces ready · Open build ↗" with no product lines, because nothing changed between them. Then comes **Show all (6)**.
- Press it with the keyboard (Tab to it, then Enter):
  - Version 1 appears, with "Products Desk Fan";
  - the button is gone;
  - focus is on the "Version 1" heading, with its ring visible.
- The Project log's "Show all" can't appear NOW, because a project has at most three log events. The unit test pins `LOG_SHOWN`.

**6. Preview as buyer.**
- `http://localhost:3002/projects/proj_c8car?view=buyer`: the rail has **no Editor, no Versions and no Manage** block. They are absent, not disabled, and nothing on the page is violet.
- `http://localhost:3002/projects/proj_c8soil?view=buyer`: the Project log stays, with its three entries. Editor and Manage are absent.

**7. Phone, 400 × 860.** In the DevTools device toolbar, set 400 wide, and open C8 Car and then C8 Soil Monitor.
- The rail blocks follow the tab panel in rail order.
  - Outcome, Editor, Details, Versions and the Project log are each a closed disclosure (C7's `RailBlock`).
  - **Manage is not a disclosure.** Its "Delete project…" is visible and is the last control on the page.
- Open Editor. `[...document.querySelectorAll('a[href^="/project/c8-car/"]')].map((a) => Math.round(a.getBoundingClientRect().height))` returns six numbers, each ≥ 44. "Delete project…" and each Open build are ≥ 44 px tall too.
- Nothing scrolls sideways: `document.documentElement.scrollWidth <= 400`.
- Long product lists wrap inside the Versions row, and no name is cut off.

**8. Dark.** Run `document.documentElement.setAttribute("data-theme", "dark")` and repeat steps 1 and 3 at 1440.
- Every line is legible. Check one fact and one date with DevTools' contrast picker: each is ≥ 4.5:1 on the rail surface.
- Delete's red reads clearly on the dark surface, and the blocked one reads as disabled.

**9. Reduced motion.** In DevTools → Rendering, set "Emulate CSS prefers-reduced-motion" to reduce, then click an Editor row. It says "Opening…", but its icon does not spin (`motion-safe:animate-spin`).

- [ ] **Step 6: tsc + eslint + commit**

```
npx tsc --noEmit
npx eslint src/lib/manual/rail-rows.ts src/components/projects/details/rail-editor.tsx src/components/projects/details/rail-versions.tsx src/components/projects/details/rail-log.tsx src/components/projects/details/rail-manage.tsx src/components/projects/details/rail-block.tsx src/components/projects/details/project-page.tsx tests/projects/rail-rows.test.mjs
git add src/lib/manual/rail-rows.ts src/components/projects/details/rail-editor.tsx src/components/projects/details/rail-versions.tsx src/components/projects/details/rail-log.tsx src/components/projects/details/rail-manage.tsx src/components/projects/details/rail-block.tsx src/components/projects/details/project-page.tsx tests/projects/rail-rows.test.mjs
git status --short src/components/projects/details/legacy.tsx
git commit -m "feat(projects): the rail's Editor, Versions, Project log and Manage blocks, and the whole rail mounted

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
- `tsc` is clean.
- ESLint is clean, apart from the pre-existing baseline errors in Task 0's table; none of them is in these files.
- `git status` shows `D  src/components/projects/details/legacy.tsx`, which 3h's `git rm` staged. In the fallback case it shows `M` instead; then add the file by path before committing.
