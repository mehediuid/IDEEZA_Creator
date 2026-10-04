### Task A3: The shared summary — `src/lib/manual/project-summary.ts`

**Requirements:** LST-32, COR-11, LST-5, LST-9, COR-105 (the read side: `showcaseOf`), LST-35 / COR-9 / COR-19 (the word and icon table), LST-65 (the badge constant), LST-37 (product line), LST-38 / COR-55 (source tag), LST-39 / COR-75 / COR-76 / COR-77 (status line, §4.1), LST-40 (the card's button = `next.first`), LST-41 / COR-10 (the date fact and the one formatter), LST-42, LST-43, COR-12 (Open in editor label and target), §3.5 (the action table, "Listed" in place of "Ready to sell").

**Depends on:** A1 (shapes, `tests/projects/tsconfig.json`), A2 (`project-read.ts`), A4 (`project-brief.ts`). Run it after all three have landed.

**Files:**
- Create: `src/lib/manual/project-summary.ts`
- Test: `tests/projects/project-summary.test.mjs` (new)
- Modify: none. The card (`my-projects.tsx`) and the header (`project-details.tsx`) switch to this module in their own tasks.

**Interfaces**

Consumes (exact, as spec §5.1 names them):
- A1, `src/lib/manual/projects.tsx`:
  - `ManualProject` with `builds?: ProjectBuildRef[]`, `lastOpened?: { step: ProjectStep; at: number }`, `showcasedAt?: number | null`, and `products?: ManualProduct[]` whose rows carry `id`.
  - Existing, unchanged: `stepHref(project: ManualProject | string, step: keyof ManualFlowState): string` (`projects.tsx:461-467`) and `STEP_LABELS` (`:469-477`).
- A2, `src/lib/manual/project-read.ts`:
  - `type BuildRef = ProjectBuildRef & { job: BuildJob | null }`
  - `buildsOf(p: ManualProject, all: BuildJob[]): BuildRef[]`
  - `productsOfProject(p: ManualProject, refs: BuildRef[]): ProjectProduct[]`
  - `pendingVersionsOf(refs: BuildRef[], all: BuildJob[]): { chatId: string; job: BuildJob; version: number; status: BuildStatus }[]`
  - `coverOf(p: ManualProject, refs: BuildRef[]): string | null`
  - `resumeStepOf(p: ManualProject): ProjectStep`
- A4, `src/lib/brief/project-brief.ts`:
  - `type StoredDraft = { state: BriefState; step: BriefStepId }`
  - `readBriefDraft(projectId: string): StoredDraft | null`. Only the test calls it: it is the My projects read path.
- Existing, unchanged:
  - `LICENSES`, `normalizeBrief`, `normalizeStep` and `briefDraftKey` from `src/lib/brief/types.ts`.
  - `BuildJob` and `BuildStatus` from `src/lib/create/history.tsx`.

Produces (all exported from `src/lib/manual/project-summary.ts`):
```ts
export type IconName = "circle" | "lock" | "hand-heart" | "tag" | "hexagon" | "eye";
export type ProjectStatus = "draft" | "private" | "given" | "listed" | "minted";
export const STATUS_WORD: Record<ProjectStatus, string>;
export const STATUS_ICON: Record<ProjectStatus, IconName>;
export const LISTED_SUBLINE: "Goes on sale when the marketplace opens";
export type ShowcaseBadge = { word: string; icon: IconName; ariaLabel: string };
export const SHOWCASE_BADGE: ShowcaseBadge;              // { word: "Showcase", icon: "eye", ariaLabel: "Showcased" }
export function projectStatus(p: ManualProject, draft: StoredDraft | null): ProjectStatus;
export function showcaseOf(p: ManualProject, status: ProjectStatus): { at: number } | null;
export type ProjectSource = { kind: "build"; builds: number } | { kind: "build-gone" } | { kind: "hand" };
export function projectSourceOf(refs: BuildRef[]): ProjectSource;
export const BUILD_GONE_TIP: string;
export function sourceTag(source: ProjectSource): { label: string; tip: string | null };
export type NextAction = /* spec §5.1.3, verbatim */;
export type ActionPair = { first: NextAction; second: NextAction | null; violet: boolean };
export type PendingVersion = { buildId: string; n: number; status: BuildStatus };
export function nextAction(p: ManualProject, facts: {
  status: ProjectStatus; brief: StoredDraft | null; source: ProjectSource; pending: PendingVersion | null;
}): ActionPair;
export type ClipJob = { id: string; stage: string };      // a VideoJob satisfies it
export type ProjectSummary = /* spec §5.1.3, verbatim; pendingVersion: PendingVersion | null */;
export function projectSummary(p: ManualProject, ctx: {
  builds: BuildJob[]; brief: StoredDraft | null; videoJobs: ClipJob[]; now: number;
}): ProjectSummary;
export function formatShortDate(at: number, now: number): string;   // "4:12 PM" · "Sep 22" · "Dec 5, 2025"
export function formatDate(at: number): string;                     // "Sep 22, 2026"
export function formatDateTime(at: number): string;                 // "Sep 22, 2026 · 9:09 PM"
export function countLabel(n: number): string;                      // "1 product" · "4 products"
export function productLine(s: Pick<ProjectSummary, "products">): string;
export function versionLabel(v: ProjectSummary["version"]): string | null;
export type TimeText = { text: string; dateTime: string; title: string };
export type MetaPart = { kind: "text"; text: string } | { kind: "time"; time: TimeText };
export type ChipText = { word: string; icon: IconName; badge: ShowcaseBadge | null; line: string };
export type CardText = { chip: ChipText; count: string; productLine: string; meta: MetaPart[]; metaText: string;
  sourceTip: string | null; version: string | null; action: NextAction & { ariaLabel: string } };
export type HeaderText = { chip: ChipText; count: string; meta: MetaPart[]; metaText: string;
  version: string | null; pair: ActionPair };
export function cardText(s: ProjectSummary, now: number): CardText;   // everything the My projects card prints
export function headerText(s: ProjectSummary): HeaderText;           // everything the details header prints under the h1
```

**Notes for the other tasks:**
- The card renders `cardText()` and the header renders `headerText()`. Neither builds any of these strings itself; that rule is what LST-32 and COR-11 test.
- `meta` is a list of parts, joined with " · ". A `time` part renders as `<time dateTime={time.dateTime} title={time.title}>{time.text}</time>`.
- `IconName` is defined here, because the repo has no such type. The chip and badge component maps each name to its Hugeicons glyph, which keeps this module free of React and the icon package.
- The date formatters here are "the one formatter" (COR-10, COM-7, COR-52, COR-107). They are fixed English, so the two surfaces and the tests agree. They replace `formatDate` at `project-details.tsx:511-519` when the header task rewires that file.
- The search helpers stay out of this task: `matchProject`, `ListQuery` and `PAGE_SIZE` (LST-13/14/28). The My projects task adds them to this same file.
- A2's `ProjectView.summary` imports `ProjectSummary`. If `projectView()` calls `projectSummary()`, the two modules import each other. That is safe: tsc's CommonJS output reads imported functions at call time, never at load time.
- A4's agreement test ("projectStatus() and commerceOf() agree") meets one edge case. A project with `status: "completed"` whose draft is readable but has `mintedAt: null` reads `"minted"` here (the §5.1.3 code, verbatim), while it reads `"briefing"` or `"none"` from commerceOf. Either A4 treats that case as `mintedUnreadable`, or the test leaves it out.
- **Imports are relative** (`../create/history`, `./project-read`), like `src/lib/spec/*`. tsc does not rewrite `@/` in its output, and `node --test` would fail on `require("@/…")`. A2's and A4's modules need relative value imports for the same reason.
- **Node 22 and `node --test <dir>`.** The machine runs Node v22.21.0, where `node --test tests/projects/` tries to load the directory as a module and fails with `MODULE_NOT_FOUND`. This task therefore runs `node --test "tests/projects/*.test.mjs"` (Node 22 expands the quoted glob itself). A1's `test:projects` script and the other tasks' commands need the same form.
- **Test paths** assume A1 emits `src/X.ts` to `.tmp-test/X.js` (`rootDir: "../../src"`), so `src/lib/manual/project-summary.ts` becomes `.tmp-test/lib/manual/project-summary.js`. A1's tsconfig also needs `jsx: "react-jsx"`, because `projects.tsx` and `history.tsx` are in the import graph.

**Decisions (each stated once, so the reviewer can object):**
1. **The status line date.** It uses the short form (`formatShortDate`) on both surfaces, so the string is identical (§4: "the same string on the card and under the chip"). The header's meta line uses `formatDate`. Every `<time>` has `formatDateTime` in its `title`.
2. **Listed with a clip still rendering.** The line keeps the sale subline and adds the clip note: "Minted Sep 22 · goes on sale when the marketplace opens · preview clip still rendering". COR-76 says "Listed" never stands without its subline.
3. **A stamp of the Brief.** `project-workspace.tsx` also wraps `/brief`, so `lastOpened.step` can be `"brief"`. Such a stamp resumes PCB, with the plain label "Open in editor". Open in editor never lands in the Brief, because the Brief has its own button.
4. **"Saved" vs "Created".** The date reads "Saved {latest savedAt}" when any ref has a save time, else "Created {createdAt}". A hand-made project that a legacy build joined has no recorded save, so it reads "Created Aug 3", which is true.
5. **Which pending version.** When several lineages wait, `pendingVersion` is the first ready one, else the first one. Only a ready one moves a Draft to row 1 (§4.1). A running build stays in the COR-18 banner.
6. **`videoJobs` type.** It is typed structurally (`ClipJob`). This lib module then never imports a component file, and a `VideoJob[]` passes as it is.

---

- [ ] **Step 1: Write the failing test**

Create `tests/projects/project-summary.test.mjs`:

```js
// A3 — the shared summary (spec §5.1.3): LST-32, COR-11, LST-5, LST-9, COR-105, §3.5, §4.1.
// Compiled by tests/projects/tsconfig.json (A1) into .tmp-test, then run by node:test:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILD_GONE_TIP,
  LISTED_SUBLINE,
  SHOWCASE_BADGE,
  STATUS_ICON,
  STATUS_WORD,
  cardText,
  formatDate,
  formatDateTime,
  formatShortDate,
  headerText,
  nextAction,
  productLine,
  projectSummary,
  sourceTag,
} from "../../.tmp-test/lib/manual/project-summary.js";
import { briefDraftKey, normalizeBrief, normalizeStep } from "../../.tmp-test/lib/brief/types.js";
import { readBriefDraft } from "../../.tmp-test/lib/brief/project-brief.js";

// ── A localStorage for readBriefDraft: the way My projects reads a draft ──
const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => {
      storage.set(k, String(v));
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  },
};

// ── Clock (local time, so the formatter round-trips in any timezone) ──
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MIN = 60_000;
const NOW = at(2026, 9, 26, 16, 30);
const TODAY_412 = at(2026, 9, 26, 16, 12); // "4:12 PM"
const SEP20 = at(2026, 9, 20, 10, 0);
const SEP22_AM = at(2026, 9, 22, 9, 2);
const MINTED = at(2026, 9, 22, 21, 9); // "Sep 22" · "Sep 22, 2026 · 9:09 PM"
const AUG3 = at(2026, 8, 3, 11, 0);
const DEC5_2025 = at(2025, 12, 5, 9, 0);

// ── Factories ──
const KINDS = ["3d", "pcb", "code", "wiring", "parts"];
const items = (status = "ready") =>
  KINDS.map((kind) => ({ kind, status, progress: status === "ready" ? 100 : 40 }));
const companion = (id, name) => ({
  id,
  name,
  conceptImageUrl: `https://img.test/${id}.png`,
  conceptPrompt: name,
  title: name,
  summary: "",
  description: `${name}.`,
  parts: [],
  items: items(),
});
const build = (id, chatId, createdAt, companions = [], over = {}) => ({
  id,
  chatId,
  conceptImageUrl: `https://img.test/${id}.png`,
  conceptPrompt: "concept",
  title: "RC Car Controller",
  summary: "ESP32 · L298N",
  parts: [],
  conceptNumber: "1",
  status: "running",
  estimateMin: 1,
  creditsCharged: true,
  creditsRefunded: false,
  items: items(),
  companions,
  createdAt,
  updatedAt: createdAt,
  ...over,
});
const FLOW = { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false };
const project = (over) => ({
  id: "proj_x",
  slug: "x",
  name: "X",
  productName: "",
  description: "",
  status: "draft",
  createdAt: SEP20,
  updatedAt: SEP20,
  flowState: { ...FLOW },
  ...over,
});
const row = (id, name, source) => ({ id, name, description: `${name}.`, ...(source ? { source } : null) });
const draft = (state, step = "idea") => ({ state: normalizeBrief(state), step: normalizeStep(step) });

// ── The six fixtures (spec §5 build order, step 2), plus an unreadable mint record ──
// 1. A 4-product build.
const bCar = build(
  "b_car",
  "chat_car",
  TODAY_412 - 2 * MIN,
  [companion("remote", "Remote Controller"), companion("charger", "Battery Charger"), companion("spare", "Spare Battery Pack")],
  { projectId: "proj_car" },
);
const car4 = project({
  id: "proj_car",
  slug: "car",
  name: "Car",
  productName: "RC Car Controller",
  buildId: "b_car",
  createdAt: TODAY_412,
  updatedAt: TODAY_412,
  builds: [{ buildId: "b_car", chatId: "chat_car", version: 1, savedAt: TODAY_412 }],
  products: [
    row("prd_car00001", "RC Car Controller", { buildId: "b_car", productId: "primary" }),
    row("prd_car00002", "Remote Controller", { buildId: "b_car", productId: "remote" }),
    row("prd_car00003", "Battery Charger", { buildId: "b_car", productId: "charger" }),
    row("prd_car00004", "Spare Battery Pack", { buildId: "b_car", productId: "spare" }),
  ],
});

// 2. A legacy hand-made project: no products array, no product name.
const legacyHand = project({
  id: "proj_hand",
  slug: "garden-weather-station",
  name: "Garden Weather Station",
  createdAt: AUG3,
  updatedAt: AUG3,
});

// 3. A project minted to sell, and showcased.
const bSoil = build("b_soil", "chat_soil", SEP20 - 2 * MIN, [], { title: "Soil Probe", projectId: "proj_soil" });
const listedShowcased = project({
  id: "proj_soil",
  slug: "plant-soil-monitor",
  name: "Plant Soil Monitor",
  productName: "Soil Probe",
  status: "completed",
  buildId: "b_soil",
  createdAt: SEP20,
  updatedAt: MINTED,
  builds: [{ buildId: "b_soil", chatId: "chat_soil", version: 1, savedAt: SEP20 }],
  products: [row("prd_soil0001", "Soil Probe", { buildId: "b_soil", productId: "primary" })],
  showcasedAt: NOW - 60 * MIN,
});
const soilDraft = draft({ intent: "sell", mintedAt: MINTED, price: "0.05", network: "baseSepolia" }, "success");

// 4. A hand-made project a build joined (the legacy link only: build.projectId).
const bRain = build("b_rain", "chat_rain", SEP20, [], { title: "Rain Gauge", projectId: "proj_ws" });
const handJoined = project({
  id: "proj_ws",
  slug: "weather-station",
  name: "Weather Station",
  productName: "Station Hub",
  createdAt: AUG3,
  updatedAt: SEP20,
  products: [row("p1", "Station Hub"), row("prd_ws000001", "Rain Gauge", { buildId: "b_rain", productId: "primary" })],
});

// 5. A project whose build was purged from this browser.
const purged = project({
  id: "proj_gone",
  slug: "desk-lamp",
  name: "Desk Lamp",
  productName: "Lamp Base",
  buildId: "b_gone",
  createdAt: DEC5_2025,
  updatedAt: DEC5_2025,
  products: [row("prd_gone0001", "Lamp Base", { buildId: "b_gone", productId: "primary" })],
});

// 6. A chat rebuilt twice: version 2 drops Battery Charger (it stays, COR-108), version 3 waits unsaved.
const bV1 = build(
  "b_v1",
  "chat_rc",
  SEP22_AM - 2 * MIN,
  [companion("remote", "Remote Controller"), companion("charger", "Battery Charger")],
  { projectId: "proj_rc" },
);
const bV2 = build(
  "b_v2",
  "chat_rc",
  TODAY_412 - 2 * MIN,
  [companion("remote", "Remote Controller"), companion("spare", "Spare Battery Pack")],
  { projectId: "proj_rc" },
);
const bV3 = build("b_v3", "chat_rc", TODAY_412 + 5 * MIN, [
  companion("remote", "Remote Controller"),
  companion("spare", "Spare Battery Pack"),
]);
const rebuilt = project({
  id: "proj_rc",
  slug: "rc-car",
  name: "RC Car",
  productName: "RC Car Controller",
  buildId: "b_v1",
  createdAt: SEP22_AM,
  updatedAt: TODAY_412,
  builds: [
    { buildId: "b_v1", chatId: "chat_rc", version: 1, savedAt: SEP22_AM },
    { buildId: "b_v2", chatId: "chat_rc", version: 2, savedAt: TODAY_412 },
  ],
  products: [
    row("prd_rc000001", "RC Car Controller", { buildId: "b_v2", productId: "primary" }),
    row("prd_rc000002", "Remote Controller", { buildId: "b_v2", productId: "remote" }),
    row("prd_rc000003", "Battery Charger", { buildId: "b_v1", productId: "charger" }),
    row("prd_rc000004", "Spare Battery Pack", { buildId: "b_v2", productId: "spare" }),
  ],
});

// 7. Minted (status "completed"), but the brief record is corrupt, and it is showcased.
const lost = project({
  id: "proj_lost",
  slug: "pet-feeder",
  name: "Pet Feeder",
  productName: "Feeder",
  status: "completed",
  createdAt: AUG3,
  updatedAt: MINTED,
  showcasedAt: MINTED,
});

// A hand-made project, used for the minted rows.
const minted = project({
  id: "proj_lamp",
  slug: "night-light",
  name: "Night Light",
  productName: "Lamp",
  status: "completed",
  createdAt: AUG3,
  updatedAt: MINTED,
});

const BUILDS = [bCar, bSoil, bRain, bV1, bV2, bV3];
const sum = (p, brief = null, over = {}) =>
  projectSummary(p, { builds: BUILDS, brief, videoJobs: [], now: NOW, ...over });

const editor = (slug, label = "Open in editor", seg = "pcb") => ({ kind: "open-editor", label, href: `/project/${slug}/${seg}` });
const addBrief = (slug) => ({ kind: "add-brief", label: "Add Brief", href: `/project/${slug}/brief` });
const viewBrief = (slug) => ({ kind: "view-brief", label: "View brief", href: `/project/${slug}/brief` });
const DRAFT_CHIP = (line) => ({ word: "Draft", icon: "circle", badge: null, line });

// ── LST-32 / COR-11: the card and the header derive identical strings ──
const FIXTURES = [
  {
    name: "a 4-product build",
    p: car4,
    draft: null,
    chip: DRAFT_CHIP("Not briefed yet"),
    productLine: "4 products · RC Car Controller, Remote Controller +2",
    card: "AI build · Saved 4:12 PM",
    header: "4 products · Saved Sep 26, 2026",
    pair: { first: addBrief("car"), second: editor("car"), violet: true },
    cover: "https://img.test/b_car.png",
  },
  {
    name: "a legacy hand-made project",
    p: legacyHand,
    draft: null,
    chip: DRAFT_CHIP("Not briefed yet"),
    productLine: "1 product · not named yet",
    card: "By hand · Created Aug 3",
    header: "1 product · Made by hand · Created Aug 3, 2026",
    pair: { first: editor("garden-weather-station"), second: addBrief("garden-weather-station"), violet: true },
    cover: null,
  },
  {
    name: "a project minted to sell and showcased",
    p: listedShowcased,
    draft: soilDraft,
    chip: { word: "Listed", icon: "tag", badge: SHOWCASE_BADGE, line: "Minted Sep 22 · goes on sale when the marketplace opens" },
    productLine: "1 product · Soil Probe",
    card: "AI build · Saved Sep 20",
    header: "1 product · Saved Sep 20, 2026",
    pair: { first: editor("plant-soil-monitor"), second: viewBrief("plant-soil-monitor"), violet: false },
    cover: "https://img.test/b_soil.png",
  },
  {
    name: "a hand-made project a build joined",
    p: handJoined,
    draft: null,
    chip: DRAFT_CHIP("Not briefed yet"),
    productLine: "2 products · Station Hub, Rain Gauge",
    card: "AI build · Created Aug 3",
    header: "2 products · Created Aug 3, 2026",
    pair: { first: addBrief("weather-station"), second: editor("weather-station"), violet: true },
    cover: "https://img.test/b_rain.png",
  },
  {
    name: "a project whose build was purged",
    p: purged,
    draft: null,
    chip: DRAFT_CHIP("Not briefed yet"),
    productLine: "1 product · Lamp Base",
    card: "AI build · not in this browser · Saved Dec 5, 2025",
    header: "1 product · Saved Dec 5, 2025 · build not in this browser",
    pair: { first: addBrief("desk-lamp"), second: editor("desk-lamp"), violet: true },
    cover: null,
  },
  {
    name: "a chat rebuilt twice whose second version drops a product",
    p: rebuilt,
    draft: null,
    chip: DRAFT_CHIP("Version 3 is ready to save"),
    productLine: "4 products · RC Car Controller, Remote Controller +2",
    card: "AI build · Saved 4:12 PM · Version 2",
    header: "4 products · Version 2 · Saved Sep 26, 2026",
    pair: { first: { kind: "review-version", label: "Review version 3", href: "/build/b_v3" }, second: editor("rc-car"), violet: true },
    cover: "https://img.test/b_v2.png",
  },
  {
    name: "a minted project whose brief record is unreadable",
    p: lost,
    draft: null,
    raw: "{not json",
    chip: { word: "Minted", icon: "hexagon", badge: SHOWCASE_BADGE, line: "Minted · the brief record isn't in this browser" },
    productLine: "1 product · Feeder",
    card: "By hand · Created Aug 3",
    header: "1 product · Made by hand · Created Aug 3, 2026",
    pair: { first: editor("pet-feeder"), second: null, violet: false },
    cover: null,
  },
];

for (const f of FIXTURES) {
  test(`LST-32 · the card and the header derive identical strings — ${f.name}`, () => {
    storage.clear();
    if (f.raw !== undefined) storage.set(briefDraftKey(f.p.id), f.raw);
    else if (f.draft) storage.set(briefDraftKey(f.p.id), JSON.stringify(f.draft));

    // My projects reads the draft from storage; the page is handed the same draft by useProjectBrief.
    const listSide = projectSummary(f.p, { builds: BUILDS, brief: readBriefDraft(f.p.id), videoJobs: [], now: NOW });
    const pageSide = projectSummary(f.p, { builds: BUILDS, brief: f.draft, videoJobs: [], now: NOW });
    assert.deepEqual(listSide, pageSide);

    const card = cardText(listSide, NOW);
    const header = headerText(pageSide);

    // What both surfaces print is the same string.
    assert.deepEqual(card.chip, header.chip);
    assert.equal(card.count, header.count);
    assert.equal(card.version, header.version);
    const { ariaLabel, ...cardButton } = card.action;
    assert.deepEqual(cardButton, header.pair.first);
    assert.equal(ariaLabel, `${header.pair.first.label} for ${f.p.name}`);
    const cardTime = card.meta.find((m) => m.kind === "time").time;
    const headerTime = header.meta.find((m) => m.kind === "time").time;
    assert.equal(cardTime.dateTime, headerTime.dateTime);
    assert.equal(cardTime.title, headerTime.title);
    assert.equal(cardTime.text.split(" ")[0], headerTime.text.split(" ")[0]); // "Saved" | "Created"
    assert.ok(card.productLine.startsWith(`${header.count} · `));

    // …and it is exactly this.
    assert.deepEqual(header.chip, f.chip);
    assert.equal(card.productLine, f.productLine);
    assert.equal(card.metaText, f.card);
    assert.equal(header.metaText, f.header);
    assert.deepEqual(header.pair, f.pair);
    assert.equal(pageSide.cover, f.cover);
  });
}

// ── §4.1, one test per state ──
test("§4.1 row 1 · Draft, a newer version waiting → ★ Review version {n} · Open in editor", () => {
  const s = sum(rebuilt);
  assert.equal(s.status, "draft");
  assert.deepEqual(s.pendingVersion, { buildId: "b_v3", n: 3, status: "ready" });
  assert.equal(s.statusLine, "Version 3 is ready to save");
  assert.deepEqual(s.next, {
    first: { kind: "review-version", label: "Review version 3", href: "/build/b_v3" },
    second: editor("rc-car"),
    violet: true,
  });
});

test("§4.1 row 1 · a build still running doesn't take the primary (it stays in the COR-18 banner)", () => {
  const running = { ...bV3, items: items("building") };
  const s = sum(rebuilt, null, { builds: [bV1, bV2, running] });
  assert.equal(s.pendingVersion.status, "running");
  assert.equal(s.statusLine, "Not briefed yet");
  assert.equal(s.next.first.kind, "add-brief");
});

test("§4.1 row 2 · Draft, Brief in progress → ★ Continue Brief · Open in editor", () => {
  const s = sum(car4, draft({ intent: "sell" }, "preview"));
  assert.equal(s.statusWord, "Draft");
  assert.equal(s.statusLine, "Brief in progress · to sell · Preview step");
  assert.deepEqual(s.next, {
    first: { kind: "continue-brief", label: "Continue Brief", href: "/project/car/brief" },
    second: editor("car"),
    violet: true,
  });
  assert.equal(sum(car4, draft({ intent: "give" }, "idea")).statusLine, "Brief in progress · to give · Idea step");
  // The step is left out at the form step.
  assert.equal(sum(car4, draft({ intent: "save" }, "form")).statusLine, "Brief in progress · to keep");
});

test("§4.1 row 3 · Draft, Brief started → ★ Continue Brief", () => {
  const s = sum(car4, draft({}, "idea"));
  assert.equal(s.statusLine, "Brief started");
  assert.equal(s.next.first.kind, "continue-brief");
  assert.equal(s.next.violet, true);
});

test("§4.1 row 4 · Draft from a build, not briefed → ★ Add Brief · Open in editor (also when the build is gone)", () => {
  for (const p of [car4, handJoined, purged]) {
    const s = sum(p);
    assert.equal(s.statusLine, "Not briefed yet");
    assert.deepEqual([s.next.first.kind, s.next.second.kind, s.next.violet], ["add-brief", "open-editor", true]);
  }
});

test("§4.1 row 5 · Draft by hand, not briefed → ★ Open in editor · Add Brief", () => {
  const s = sum(legacyHand);
  assert.equal(s.statusLine, "Not briefed yet");
  assert.deepEqual(s.next, { first: editor("garden-weather-station"), second: addBrief("garden-weather-station"), violet: true });
});

test("§4.1 row 6 · Private, and its showcased form; showcasing never changes the pair", () => {
  const d = draft({ intent: "save", mintedAt: MINTED }, "success");
  const s = sum(minted, d);
  assert.equal(s.status, "private");
  assert.equal(s.statusWord, "Private");
  assert.equal(STATUS_ICON[s.status], "lock");
  assert.equal(s.statusLine, "Minted Sep 22 · kept private");
  assert.equal(s.showcase, null);
  assert.equal(s.mintedAt, MINTED);
  assert.deepEqual(s.next, { first: editor("night-light"), second: viewBrief("night-light"), violet: false });

  const shown = sum({ ...minted, showcasedAt: NOW }, d);
  assert.deepEqual(shown.showcase, { at: NOW });
  assert.equal(shown.statusLine, "Minted Sep 22 · kept by you");
  assert.deepEqual(shown.next, s.next);
});

test("§4.1 row 7 · Given, under its licence", () => {
  const s = sum(minted, draft({ intent: "give", license: "mit", mintedAt: MINTED }, "success"));
  assert.equal(s.status, "given");
  assert.equal(s.statusWord, "Given");
  assert.equal(STATUS_ICON[s.status], "hand-heart");
  assert.equal(s.statusLine, "Minted Sep 22 · given to the community under MIT License");
  assert.deepEqual(s.next, { first: editor("night-light"), second: viewBrief("night-light"), violet: false });
});

test("§4.1 row 8 · Listed, never without its subline; the record's own status is never read alone (LST-5)", () => {
  const s = sum(listedShowcased, soilDraft);
  assert.equal(s.status, "listed");
  assert.equal(s.statusWord, "Listed");
  assert.equal(STATUS_ICON[s.status], "tag");
  assert.equal(LISTED_SUBLINE, "Goes on sale when the marketplace opens");
  assert.equal(s.statusLine, "Minted Sep 22 · goes on sale when the marketplace opens");
  assert.deepEqual(s.showcase, { at: NOW - 60 * MIN });
  assert.equal(s.next.violet, false);
  assert.equal(sum({ ...listedShowcased, status: "draft" }, soilDraft).status, "listed");
});

test("§4.1 row 9 · Minted, the brief record unreadable (LST-9) → Open in editor only", () => {
  const s = sum(lost, null);
  assert.equal(s.status, "minted");
  assert.equal(s.statusWord, "Minted");
  assert.equal(STATUS_ICON[s.status], "hexagon");
  assert.equal(s.statusLine, "Minted · the brief record isn't in this browser");
  assert.equal(s.mintedAt, null);
  assert.deepEqual(s.showcase, { at: MINTED });
  assert.deepEqual(s.next, { first: editor("pet-feeder"), second: null, violet: false });
});

// ── Modifiers and the rules around them ──
test("Showcase is never on a Draft, and only a time counts (COR-105)", () => {
  assert.equal(sum({ ...car4, showcasedAt: NOW }).showcase, null);
  assert.equal(sum({ ...listedShowcased, showcasedAt: null }, soilDraft).showcase, null);
  const never = { ...listedShowcased };
  delete never.showcasedAt;
  assert.equal(sum(never, soilDraft).showcase, null);
  assert.deepEqual(SHOWCASE_BADGE, { word: "Showcase", icon: "eye", ariaLabel: "Showcased" });
});

test("Modifier · preview clip still rendering (rows 6–8)", () => {
  const d = draft({ intent: "save", mintedAt: MINTED, videoJobId: "vj_1" }, "success");
  const rendering = [{ id: "vj_1", stage: "rendering" }];
  assert.equal(sum(minted, d, { videoJobs: rendering }).statusLine, "Minted Sep 22 · preview clip still rendering");
  assert.equal(sum(minted, d, { videoJobs: [{ id: "vj_1", stage: "done" }] }).statusLine, "Minted Sep 22 · kept private");
  assert.equal(sum(minted, d, { videoJobs: [{ id: "vj_1", stage: "failed" }] }).statusLine, "Minted Sep 22 · kept private");
  assert.equal(sum(minted, d, { videoJobs: [] }).statusLine, "Minted Sep 22 · kept private");
  const sell = draft({ intent: "sell", mintedAt: MINTED, videoJobId: "vj_1" }, "success");
  assert.equal(
    sum(listedShowcased, sell, { videoJobs: rendering }).statusLine,
    "Minted Sep 22 · goes on sale when the marketplace opens · preview clip still rendering",
  );
});

test("Modifier · a newer version waiting on a minted project changes neither the line nor the pair (X14)", () => {
  const bSoil2 = build("b_soil2", "chat_soil", SEP20 + 24 * 60 * MIN, [], { title: "Soil Probe" });
  const before = sum(listedShowcased, soilDraft);
  const after = sum(listedShowcased, soilDraft, { builds: [...BUILDS, bSoil2] });
  assert.deepEqual(after.pendingVersion, { buildId: "b_soil2", n: 2, status: "ready" });
  assert.equal(after.statusLine, before.statusLine);
  assert.deepEqual(after.next, before.next);
});

test("Open in editor resumes the step opened last (COR-12); a Brief stamp never makes it the Brief", () => {
  const s = sum({ ...car4, lastOpened: { step: "three", at: NOW } });
  assert.deepEqual(s.next.second, editor("car", "Open in editor · 3D Module", "3d"));
  const hand = sum({ ...legacyHand, lastOpened: { step: "wiring", at: NOW } });
  assert.deepEqual(hand.next.first, editor("garden-weather-station", "Open in editor · Peripheral Wiring", "wiring"));
  const brief = sum({ ...car4, lastOpened: { step: "brief", at: NOW } });
  assert.deepEqual(brief.next.second, editor("car"));
});

test("nextAction() is the one chooser the summary uses (COR-11)", () => {
  const s = sum(car4);
  assert.deepEqual(nextAction(car4, { status: "draft", brief: null, source: s.source, pending: null }), s.next);
  assert.equal(nextAction(car4, { status: "draft", brief: null, source: { kind: "hand" }, pending: null }).first.kind, "open-editor");
});

test("Products, not builds; a dropped product stays (LST-37, COR-42, COR-108)", () => {
  const s = sum(rebuilt);
  assert.equal(s.productCount, 4);
  assert.deepEqual(
    s.products.map((x) => x.name),
    ["RC Car Controller", "Remote Controller", "Battery Charger", "Spare Battery Pack"],
  );
  assert.deepEqual(s.version, { kind: "single", v: 2 });
  assert.deepEqual(s.when, { label: "Saved", at: TODAY_412 });
  assert.equal(productLine({ products: [{ id: "p1", name: "  ", description: "" }] }), "1 product · not named yet");
  assert.equal(
    productLine({ products: [{ id: "a", name: "A", description: "" }, { id: "b", name: "B", description: "" }] }),
    "2 products · A, B",
  );
});

test("Several lineages read as builds (LST-42)", () => {
  const other = build("b_other", "chat_other", SEP20, [], { title: "Extra", projectId: "proj_car" });
  const s = sum(car4, null, { builds: [...BUILDS, other] });
  assert.deepEqual(s.version, { kind: "builds", k: 2 });
  assert.equal(cardText(s, NOW).version, "2 builds");
  assert.equal(headerText(s).metaText, "4 products · 2 builds · Saved Sep 26, 2026");
});

test("The source tag (LST-38, COR-55)", () => {
  assert.deepEqual(sourceTag({ kind: "build", builds: 1 }), { label: "AI build", tip: null });
  assert.deepEqual(sourceTag({ kind: "hand" }), { label: "By hand", tip: null });
  assert.deepEqual(sourceTag({ kind: "build-gone" }), { label: "AI build · not in this browser", tip: BUILD_GONE_TIP });
  assert.deepEqual(sum(car4).source, { kind: "build", builds: 1 });
  assert.deepEqual(sum(purged).source, { kind: "build-gone" });
  assert.deepEqual(sum(legacyHand).source, { kind: "hand" });
  assert.equal(cardText(sum(purged), NOW).sourceTip, BUILD_GONE_TIP);
});

test("The one date formatter (LST-41, COM-7)", () => {
  assert.equal(formatShortDate(TODAY_412, NOW), "4:12 PM");
  assert.equal(formatShortDate(at(2026, 9, 26, 0, 5), NOW), "12:05 AM");
  assert.equal(formatShortDate(at(2026, 9, 26, 12, 0), NOW), "12:00 PM");
  assert.equal(formatShortDate(MINTED, NOW), "Sep 22");
  assert.equal(formatShortDate(DEC5_2025, NOW), "Dec 5, 2025");
  assert.equal(formatDate(MINTED), "Sep 22, 2026");
  assert.equal(formatDateTime(MINTED), "Sep 22, 2026 · 9:09 PM");
});

test("One word table: Draft · Private · Given · Listed · Minted, and no 'Ready to sell' (O6)", () => {
  assert.deepEqual(STATUS_WORD, { draft: "Draft", private: "Private", given: "Given", listed: "Listed", minted: "Minted" });
  assert.deepEqual(STATUS_ICON, { draft: "circle", private: "lock", given: "hand-heart", listed: "tag", minted: "hexagon" });
  assert.ok(!Object.values(STATUS_WORD).includes("Ready to sell"));
});
```

- [ ] **Step 2: Run it. It is expected to FAIL.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test tests/projects/project-summary.test.mjs
```

Expected: tsc exits 0, because nothing under `src/` imports the missing module yet. Then node fails to load the file:

```
✖ tests/projects/project-summary.test.mjs
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details/.tmp-test/lib/manual/project-summary.js' imported from /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details/tests/projects/project-summary.test.mjs
# fail 1
```

- [ ] **Step 3: Implement**

Create `src/lib/manual/project-summary.ts`:

```ts
// The shared summary (spec §5.1.3). One derivation of what a project is, so
// the My projects card and the project page's header print the same words
// (LST-32) and offer the same next step (COR-11, §3.5).
//
// Pure: no React, no storage and no clock of its own. The callers pass the
// builds, the project's brief draft (`readBriefDraft` on the list,
// `useProjectBrief` on the page), the video jobs and `now`.
//
// Value imports are relative, like src/lib/spec/*: tsc leaves `@/` as it is
// in its output, and `node --test` loads the compiled module without a
// bundler.

import type { BuildJob, BuildStatus } from "../create/history";
import { LICENSES, type BriefStepId, type Intent } from "../brief/types";
import type { StoredDraft } from "../brief/project-brief";
import { STEP_LABELS, stepHref, type ManualProject } from "./projects";
import {
  buildsOf,
  coverOf,
  pendingVersionsOf,
  productsOfProject,
  resumeStepOf,
  type BuildRef,
} from "./project-read";

// ─────────────────────────── the status ───────────────────────────

/** The glyph a status chip or the Showcase badge carries. The chip component
 *  maps each name to its Hugeicons glyph. The names live here so this module
 *  imports neither React nor the icon package. */
export type IconName = "circle" | "lock" | "hand-heart" | "tag" | "hexagon" | "eye";

/** The status is the outcome (owner decisions O5, O6). Showcase is not one of them. */
export type ProjectStatus = "draft" | "private" | "given" | "listed" | "minted";
// LATER: | "lazyMinted" | "auction" | "paused" | "sold" — a live Buy-now listing stays "listed", with live facts

/** One table. Changing a word here changes the list tab, the card chip and the details chip together. */
export const STATUS_WORD: Record<ProjectStatus, string> = {
  draft: "Draft",
  private: "Private",
  given: "Given",
  listed: "Listed",
  minted: "Minted",
};

export const STATUS_ICON: Record<ProjectStatus, IconName> = {
  draft: "circle",
  private: "lock",
  given: "hand-heart",
  listed: "tag",
  minted: "hexagon",
};

/** "Listed" never stands alone before a marketplace exists (§4.1). */
export const LISTED_SUBLINE = "Goes on sale when the marketplace opens";
/** The same words mid-sentence, for the status line. */
const LISTED_IN_LINE = LISTED_SUBLINE.charAt(0).toLowerCase() + LISTED_SUBLINE.slice(1);

export type ShowcaseBadge = { word: string; icon: IconName; ariaLabel: string };
/** The Showcase badge: its own word and icon, info tone, beside the chip
 *  (LST-65, COR-9). It is not a control; its accessible name is "Showcased". */
export const SHOWCASE_BADGE: ShowcaseBadge = { word: "Showcase", icon: "eye", ariaLabel: "Showcased" };

export function projectStatus(p: ManualProject, draft: StoredDraft | null): ProjectStatus {
  const b = draft?.state;
  if (b?.mintedAt != null) {
    if (b.intent === "sell") return "listed";
    if (b.intent === "give") return "given";
    return "private";
  }
  return p.status === "completed" ? "minted" : "draft"; // "minted" = the record is unreadable (LST-9)
}

/** Showcase, from the project record only (COR-105). Null on a Draft, whatever the record holds. */
export function showcaseOf(p: ManualProject, status: ProjectStatus): { at: number } | null {
  return status !== "draft" && typeof p.showcasedAt === "number" ? { at: p.showcasedAt } : null;
}

// ─────────────────────────── the source ───────────────────────────

export type ProjectSource =
  | { kind: "build"; builds: number } // buildsOf(p).length, at least one job still in this browser
  | { kind: "build-gone" } // refs exist, none in this browser
  | { kind: "hand" };

export function projectSourceOf(refs: BuildRef[]): ProjectSource {
  if (!refs.length) return { kind: "hand" };
  return refs.some((r) => r.job) ? { kind: "build", builds: refs.length } : { kind: "build-gone" };
}

export const BUILD_GONE_TIP =
  "The build this project came from isn't stored in this browser any more. Its products are still listed.";

/** LST-38 / COR-55: the card's meta tag and the rail's Source row, the same words. */
export function sourceTag(source: ProjectSource): { label: string; tip: string | null } {
  switch (source.kind) {
    case "build":
      return { label: "AI build", tip: null };
    case "build-gone":
      return { label: "AI build · not in this browser", tip: BUILD_GONE_TIP };
    case "hand":
      return { label: "By hand", tip: null };
  }
}

// ─────────────────────────── the next step ───────────────────────────

export type NextAction =
  | { kind: "review-version"; label: string; href: string } // "Review version 3" → /build/<id>
  | { kind: "continue-brief"; label: "Continue Brief"; href: string }
  | { kind: "add-brief"; label: "Add Brief"; href: string }
  | { kind: "open-editor"; label: string; href: string } // "Open in editor" | "Open in editor · PCB Design"
  | { kind: "view-brief"; label: "View brief"; href: string };

/** The header pair; the My projects card shows `first` (LST-40). */
export type ActionPair = { first: NextAction; second: NextAction | null; violet: boolean };

/** A newer build of the project's chat, not saved anywhere yet (COR-18). */
export type PendingVersion = { buildId: string; n: number; status: BuildStatus };

/**
 * The one next-step chooser (§3.5). The header shows the pair and the card
 * shows `first`, so the two can't differ (COR-11). Showcase never changes it
 * (§3.8). At most one violet, and none once minted.
 */
export function nextAction(
  p: ManualProject,
  facts: {
    status: ProjectStatus;
    brief: StoredDraft | null;
    source: ProjectSource;
    pending: PendingVersion | null;
  },
): ActionPair {
  const recorded = resumeStepOf(p);
  // The Brief is not an editor step. The workspace also wraps /brief, so a
  // stamp of it resumes PCB: Open in editor never lands in the Brief, which
  // has its own button.
  const step = recorded === "brief" ? "pcb" : recorded;
  const editor: NextAction = {
    kind: "open-editor",
    label: p.lastOpened && recorded !== "brief" ? `Open in editor · ${STEP_LABELS[step]}` : "Open in editor",
    href: stepHref(p, step),
  };
  const briefHref = stepHref(p, "brief");

  if (facts.status === "minted") return { first: editor, second: null, violet: false };
  if (facts.status !== "draft") {
    return { first: editor, second: { kind: "view-brief", label: "View brief", href: briefHref }, violet: false };
  }
  if (facts.pending?.status === "ready") {
    return {
      first: {
        kind: "review-version",
        label: `Review version ${facts.pending.n}`,
        href: `/build/${facts.pending.buildId}`,
      },
      second: editor,
      violet: true,
    };
  }
  if (facts.brief) {
    return { first: { kind: "continue-brief", label: "Continue Brief", href: briefHref }, second: editor, violet: true };
  }
  const add: NextAction = { kind: "add-brief", label: "Add Brief", href: briefHref };
  return facts.source.kind === "hand"
    ? { first: editor, second: add, violet: true }
    : { first: add, second: editor, violet: true };
}

// ─────────────────────────── the one date formatter ───────────────────────────
// Fixed English, local time. The card, the header and every <time> read it,
// so the two surfaces can't disagree on a date.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function clock(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "Sep 22, 2026" — the header's meta line (COR-10). */
export function formatDate(at: number): string {
  const d = new Date(at);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Sep 22, 2026 · 9:09 PM" — the full form (COM-7, COR-52, COR-107), and every <time>'s title. */
export function formatDateTime(at: number): string {
  return `${formatDate(at)} · ${clock(new Date(at))}`;
}

/** LST-41's short form: the time today, "Sep 22" this year, "Sep 22, 2025" earlier. */
export function formatShortDate(at: number, now: number): string {
  const d = new Date(at);
  const n = new Date(now);
  const sameYear = d.getFullYear() === n.getFullYear();
  if (sameYear && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()) return clock(d);
  return sameYear ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : formatDate(at);
}

// ─────────────────────────── the status line (§4.1) ───────────────────────────

const INTENT_PHRASE: Record<Intent, string> = { sell: "to sell", give: "to give", save: "to keep" };
/** The Brief step the line names. None at the form step (§4.1 row 2), nor at success. */
const STEP_PHRASE: Record<BriefStepId, string | null> = {
  idea: "Idea step",
  preview: "Preview step",
  form: null,
  success: null,
};

/** The part of a VideoJob (components/video-jobs/video-jobs-provider.tsx) this module reads.
 *  Structural, so a lib module never imports a component file; a VideoJob[] passes as it is. */
export type ClipJob = { id: string; stage: string };

function clipStillRendering(brief: StoredDraft | null, jobs: ClipJob[]): boolean {
  const id = brief?.state.videoJobId;
  const job = id ? jobs.find((j) => j.id === id) : undefined;
  return !!job && job.stage !== "done" && job.stage !== "failed";
}

function statusLineOf(
  status: ProjectStatus,
  f: { brief: StoredDraft | null; showcased: boolean; pending: PendingVersion | null; clip: boolean; now: number },
): string {
  if (status === "draft") {
    if (f.pending?.status === "ready") return `Version ${f.pending.n} is ready to save`;
    const brief = f.brief;
    if (!brief) return "Not briefed yet";
    const intent = brief.state.intent;
    if (!intent) return "Brief started";
    const step = STEP_PHRASE[brief.step];
    return ["Brief in progress", INTENT_PHRASE[intent], ...(step ? [step] : [])].join(" · ");
  }
  if (status === "minted") return "Minted · the brief record isn't in this browser";

  const mintedAt = f.brief?.state.mintedAt ?? null;
  const minted = mintedAt !== null ? `Minted ${formatShortDate(mintedAt, f.now)}` : "Minted";
  const clip = f.clip ? " · preview clip still rendering" : "";
  // "Listed" never stands without its subline (COR-76), so a rendering clip is added to it, not swapped in.
  if (status === "listed") return `${minted} · ${LISTED_IN_LINE}${clip}`;
  if (f.clip) return `${minted}${clip}`;
  if (status === "given") {
    const license = f.brief?.state.license ?? null;
    const licence = license ? LICENSES.find((l) => l.value === license) : undefined;
    return licence ? `${minted} · given to the community under ${licence.label}` : `${minted} · given to the community`;
  }
  return f.showcased ? `${minted} · kept by you` : `${minted} · kept private`;
}

// ─────────────────────────── the summary ───────────────────────────

export type ProjectSummary = {
  id: string;
  name: string;
  status: ProjectStatus;
  statusWord: string; // STATUS_WORD[status]
  statusLine: string; // §4.1
  showcase: { at: number } | null; // showcaseOf() — the badge and the Showcase tab
  products: { id: string; name: string; description: string }[]; // the current version + products a later version dropped (COR-42)
  productCount: number; // products.length — never a count of builds
  source: ProjectSource;
  next: ActionPair;
  when: { label: "Saved" | "Created"; at: number }; // latest savedAt, else createdAt (COR-10, §7)
  version: { kind: "single"; v: number } | { kind: "builds"; k: number } | null; // "Version 2" | "3 builds" | none
  pendingVersion: PendingVersion | null;
  cover: string | null; // coverOf()
  mintedAt: number | null;
  sortKey: number; // "Recently updated": updatedAt NOW, lastActivityAt NEXT (LST-24)
};

function pendingOf(refs: BuildRef[], all: BuildJob[]): PendingVersion | null {
  const waiting = pendingVersionsOf(refs, all);
  const pick = waiting.find((w) => w.status === "ready") ?? waiting[0];
  return pick ? { buildId: pick.job.id, n: pick.version, status: pick.status } : null;
}

/** "Saved" when any build has a save time; otherwise "Created" (a hand-made project, or one a build joined
 *  before save times were recorded — it was created then, and its save time is unknown). */
function whenOf(p: ManualProject, refs: BuildRef[]): ProjectSummary["when"] {
  const saved = refs.map((r) => r.savedAt).filter((t): t is number => typeof t === "number");
  return saved.length ? { label: "Saved", at: Math.max(...saved) } : { label: "Created", at: p.createdAt };
}

/** LST-42 / COR-10: one lineage past version 1 → its version; several lineages → the build count. */
function versionOf(refs: BuildRef[]): ProjectSummary["version"] {
  const lineages = new Set(refs.map((r) => r.chatId));
  if (lineages.size > 1) return { kind: "builds", k: refs.length };
  const top = Math.max(0, ...refs.map((r) => r.version));
  return top > 1 ? { kind: "single", v: top } : null;
}

export function projectSummary(
  p: ManualProject,
  ctx: { builds: BuildJob[]; brief: StoredDraft | null; videoJobs: ClipJob[]; now: number },
): ProjectSummary {
  const refs = buildsOf(p, ctx.builds);
  const status = projectStatus(p, ctx.brief);
  const showcase = showcaseOf(p, status);
  const source = projectSourceOf(refs);
  const pendingVersion = pendingOf(refs, ctx.builds);
  const products = productsOfProject(p, refs).map(({ id, name, description }) => ({ id, name, description }));
  return {
    id: p.id,
    name: p.name,
    status,
    statusWord: STATUS_WORD[status],
    statusLine: statusLineOf(status, {
      brief: ctx.brief,
      showcased: showcase !== null,
      pending: pendingVersion,
      clip: clipStillRendering(ctx.brief, ctx.videoJobs),
      now: ctx.now,
    }),
    showcase,
    products,
    productCount: products.length,
    source,
    next: nextAction(p, { status, brief: ctx.brief, source, pending: pendingVersion }),
    when: whenOf(p, refs),
    version: versionOf(refs),
    pendingVersion,
    cover: coverOf(p, refs),
    mintedAt: ctx.brief?.state.mintedAt ?? null,
    sortKey: p.updatedAt,
  };
}

// ─────────────────────────── what each surface prints ───────────────────────────
// The card renders cardText(), the header renders headerText(). Neither builds
// these strings itself: the LST-32 test compares them.

export function countLabel(n: number): string {
  return `${n} ${n === 1 ? "product" : "products"}`;
}

/** LST-37: "4 products · RC Car Controller, Remote Controller +2". An unnamed
 *  product reads "not named yet", never "Untitled product". */
export function productLine(s: Pick<ProjectSummary, "products">): string {
  const n = s.products.length;
  const names = s.products.slice(0, 2).map((x) => x.name.trim() || "not named yet");
  if (!names.length) return countLabel(n);
  const more = n - names.length;
  return `${countLabel(n)} · ${names.join(", ")}${more > 0 ? ` +${more}` : ""}`;
}

/** "Version 2" · "3 builds" · null. */
export function versionLabel(v: ProjectSummary["version"]): string | null {
  if (!v) return null;
  return v.kind === "single" ? `Version ${v.v}` : `${v.k} builds`;
}

export type TimeText = { text: string; dateTime: string; title: string };
/** One segment of a meta line; the surface joins them with " · " and renders a time part in <time>. */
export type MetaPart = { kind: "text"; text: string } | { kind: "time"; time: TimeText };
export type ChipText = { word: string; icon: IconName; badge: ShowcaseBadge | null; line: string };

export type CardText = {
  chip: ChipText;
  count: string;
  productLine: string; // LST-37
  meta: MetaPart[]; // LST-38 · LST-41 · LST-42: "AI build · Saved 4:12 PM · Version 2"
  metaText: string;
  sourceTip: string | null; // the tooltip on "AI build · not in this browser"
  version: string | null;
  action: NextAction & { ariaLabel: string }; // LST-40: next.first, "{label} for {project}"
};

export type HeaderText = {
  chip: ChipText;
  count: string;
  meta: MetaPart[]; // COR-10: "4 products · Version 2 · Saved Sep 26, 2026"
  metaText: string;
  version: string | null;
  pair: ActionPair; // COR-11
};

function chipOf(s: ProjectSummary): ChipText {
  return { word: s.statusWord, icon: STATUS_ICON[s.status], badge: s.showcase ? SHOWCASE_BADGE : null, line: s.statusLine };
}

function timeOf(s: ProjectSummary, date: string): TimeText {
  return { text: `${s.when.label} ${date}`, dateTime: new Date(s.when.at).toISOString(), title: formatDateTime(s.when.at) };
}

function metaTextOf(parts: MetaPart[]): string {
  return parts.map((m) => (m.kind === "time" ? m.time.text : m.text)).join(" · ");
}

export function cardText(s: ProjectSummary, now: number): CardText {
  const tag = sourceTag(s.source);
  const version = versionLabel(s.version);
  const meta: MetaPart[] = [
    { kind: "text", text: tag.label },
    { kind: "time", time: timeOf(s, formatShortDate(s.when.at, now)) },
  ];
  if (version) meta.push({ kind: "text", text: version });
  return {
    chip: chipOf(s),
    count: countLabel(s.productCount),
    productLine: productLine(s),
    meta,
    metaText: metaTextOf(meta),
    sourceTip: tag.tip,
    version,
    action: { ...s.next.first, ariaLabel: `${s.next.first.label} for ${s.name}` },
  };
}

export function headerText(s: ProjectSummary): HeaderText {
  const version = versionLabel(s.version);
  const meta: MetaPart[] = [{ kind: "text", text: countLabel(s.productCount) }];
  if (s.source.kind === "hand") meta.push({ kind: "text", text: "Made by hand" });
  else if (version) meta.push({ kind: "text", text: version });
  meta.push({ kind: "time", time: timeOf(s, formatDate(s.when.at)) });
  if (s.source.kind === "build-gone") meta.push({ kind: "text", text: "build not in this browser" });
  return {
    chip: chipOf(s),
    count: countLabel(s.productCount),
    meta,
    metaText: metaTextOf(meta),
    version,
    pair: s.next,
  };
}
```

- [ ] **Step 4: Run it. It is expected to PASS.**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

Expected: tsc exits 0. Node lists 27 passing tests from `project-summary.test.mjs`: 7 "LST-32 · the card and the header derive identical strings — …", 10 "§4.1 row …" and 10 rule tests. The earlier tasks' files pass alongside them, and the run ends with `# fail 0`.

This exact test and module were already run once, while this plan was being written. They ran on Node 22 with `--experimental-strip-types`, against stubs of A2's readers and A4's `readBriefDraft` written from §5.1.2 and §5.1.4: 27 of 27 passed.

If a fixture fails on `cover` or `pendingVersion`, the fault is in the A2 reader it passes through (`coverOf`, `pendingVersionsOf`), measured against §5.1.2. Fix it there, not here.

- [ ] **Step 5: Browser check**

Not applicable. This is a pure module with no UI. The browser checks for the card (the My projects task) and the header (the project-page task) cover how these strings render.

- [ ] **Step 6: tsc + eslint + commit**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
npx tsc --noEmit
npx eslint src/lib/manual/project-summary.ts tests/projects/project-summary.test.mjs
git add src/lib/manual/project-summary.ts tests/projects/project-summary.test.mjs
git commit -F - <<'EOF'
feat(projects): one summary for the card and the page — status, Showcase badge, next step

projectSummary() and nextAction() work out, once, the status word (Draft ·
Private · Given · Listed · Minted), the status line, the Showcase badge,
the product line, the source tag, the date, the version and the action
pair. My projects and the project header print the same words, and a test
holds them to it on the six fixtures and on an unreadable mint record.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: `tsc` and `eslint` print nothing and exit 0. The commit contains exactly the two files.
