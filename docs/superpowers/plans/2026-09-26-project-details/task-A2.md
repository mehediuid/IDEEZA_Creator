### Task A2: Backward-compatible reads — `src/lib/manual/project-read.ts`

**Spec delta check (commit e599fcf):** read `.superpowers/pd/plan/spec-delta.md` in full, harness notes included. What touches this task:
- **Dropped products:** `productsOfProject()` marks a row whose source is an older version `dropped: { lastIn, current }`, and the card's page opens at `lastIn`.
- **Version history:** `versionsOf()` feeds the Versions block and the product page's select.
- **Project log:** it keeps only created, minted and showcased.
- **Showcase:** it comes from `showcasedAt` only.
- **Harness:** relative value imports, the quoted-glob test command, and tests importing `../../.tmp-test/lib/...`.

**Controller contract (added after the delta):** `coverOf()` checks `p.cover` (`ManualProject.cover?: ProductSource | null`, from A1) first. It falls back to the default order when that pick is null, gone or has no image. A unit test covers this; C5's "Use as cover" and the My projects card rely on it.

**Requirements:**
- COR-86: `buildsOf`.
- COR-39: versions and lineages.
- COR-42 and COR-108: the products across builds. A product a rebuild dropped stays in the list, marked.
- COR-24: the four card states, as data.
- COR-106: `versionsOf`, the version history.
- COR-18: `pendingVersionsOf`, the data only.
- COR-89: `lineageProjectOf`.
- COR-52: `projectLogOf`.
- COR-96, CNT-14 and the `p.cover` contract: `coverOf`.
- COR-12 and COR-64: `resumeStepOf`.
- COR-90: `productsOf` carries the primary's description.
- COR-74: `projectView`, in A2b.

The task is split in two, so each half is a 30–90 minute unit:
- **A2a** — every reader in §5.1.2, plus COR-90. It depends on **A1** only.
- **A2b** — `projectView()`. It composes §5.1.3 and §5.1.4, so it lands **after A4a (`project-brief.ts`, `src/lib/video/jobs.ts`) and A3 (`project-summary.ts`)**. In the merge order (0 → A1 → A2 → A4a → A3 → A4b → …) it goes right after A3.

A3 depends on A2a only.

---

### Task A2a: The reads — builds, lineages, products, versions, log, cover

**Files:**
- **Create:**
  - `src/lib/manual/project-read.ts`
  - `tests/projects/fixtures/projects.mjs`: the six spec fixtures, plus a rebuild that drops a product. A5 already uses `tests/projects/fixtures/` for its JSON fixtures.
  - `tests/projects/project-read.test.mjs`
- **Modify:**
  - `src/lib/create/history.tsx:393-411`, `productsOf`, for COR-90. The exact block is in Step 3a.
  - `tests/projects/tsconfig.json` (A1): add `"../../src/lib/manual/project-read.ts"` to `include`. Skip this if an entry there already matches `src/lib/manual/*.ts`, for example `../../src/lib/**/*.ts`.
- **Test:** `tests/projects/project-read.test.mjs`, 48 tests.
- `project-details.tsx` is **not** touched. It keeps its private `conceptOf` (`:521-542`) until the page task rewires the file and imports this one.

**Interfaces**

Consumes:
- **A1**, `src/lib/manual/projects.tsx` (§5.1.1):
  - `ProductSource = { buildId: string; productId: string }`
  - `ManualProduct = { id: string; name: string; description: string; source?: ProductSource; updatedAt?: number }`
  - `ProjectBuildRef = { buildId: string; chatId: string | null; version: number; savedAt: number | null }`
  - `ProjectStep = keyof ManualFlowState`
  - on `ManualProject`: `builds?: ProjectBuildRef[]`, `lastOpened?: { step: ProjectStep; at: number }`, `showcasedAt?: number | null`, and `cover?: ProductSource | null`
- **A1**, `tests/projects/tsconfig.json`, as the harness notes set it:
  - `rootDir: "../../src"` and `outDir: "../../.tmp-test"`
  - `jsx: "react-jsx"`
  - `module: commonjs`, `target: ES2022`, `strict`, `esModuleInterop`, `skipLibCheck`
- **Existing, unchanged:**
  - `allItems(job)`, `productsOf(job)` (changed here, COR-90), `statusOf(job)`, and the types `BuildJob`, `BuildProduct`, `BuildStatus`, `ChatSession`: `src/lib/create/history.tsx`
  - `ConceptPart`, `ConceptSummary`: `src/lib/create/concept.ts`
  - `BriefState`, `Intent`, `Network` and `normalizeBrief` (tests only): `src/lib/brief/types.ts`
  - `qtyOf(name)` and `unitName(name)`: `src/lib/spec/bodies.ts`
  - `specKey(spec)`: `src/lib/spec/derive.ts`
  - `asConceptSummary(raw)`: `src/lib/spec/hints.ts`
  - `ResolvedSpec`: `src/lib/spec/types.ts`

Produces (all from `src/lib/manual/project-read.ts`):
```ts
export type BuildRef = ProjectBuildRef & { job: BuildJob | null };
export const norm: (s: string) => string;                                  // trim + lowercase: the one name comparison
export function modelNameOf(bp: BuildProduct, job: BuildJob): string;      // attach()'s modelName
export function buildsOf(p: ManualProject, all: BuildJob[]): BuildRef[];
export type Lineage = { chatId: string | null; title: string; chat: ChatSession | null; refs: BuildRef[]; latest: BuildRef };
export function lineagesOf(refs: BuildRef[], chats: ChatSession[]): Lineage[];
export function productRowsOf(p: ManualProject): ManualProduct[];          // products[], or [{ id: "p1", productName, description }]
export function sourceOf(row: ManualProduct, refs: BuildRef[], claimed?: ReadonlySet<string>):
  { ref: BuildRef; product: BuildProduct } | null;
export type ProjectProduct = {
  id: string; name: string; description: string;
  built: { ref: BuildRef; product: BuildProduct } | null;
  state: "built" | "build-gone" | "unmatched" | "hand";
  version: { current: number; count: number } | null;
  dropped: { lastIn: number; current: number } | null;
};
export function productsOfProject(p: ManualProject, refs: BuildRef[]): ProjectProduct[];
export function piecesOf(job: BuildJob): { ready: number; total: number; retry: boolean };
export type VersionProduct = { rowId: string | null; productId: string; name: string };
export type ProjectVersion = {
  chatId: string | null; lineage: string; version: number; current: boolean;
  buildId: string; job: BuildJob | null; savedAt: number | null;
  pieces: { ready: number; total: number; retry: boolean } | null;
  products: VersionProduct[];
  diff: { added: string[]; dropped: string[]; changed: string[] } | null;
};
export function versionsOf(refs: BuildRef[], lineages: Lineage[], rows: ManualProduct[]): ProjectVersion[][];
export type PendingBuild = { chatId: string; job: BuildJob; version: number; status: BuildStatus };
export function pendingVersionsOf(refs: BuildRef[], all: BuildJob[]): PendingBuild[];
export function lineageProjectOf(job: BuildJob, all: BuildJob[], projects: ManualProject[]): ManualProject | null;
export type ProjectLogEntry =
  | { kind: "created"; at: number }
  | { kind: "minted"; at: number; intent: Intent; network: Network }
  | { kind: "showcased"; at: number };
export function projectLogOf(p: ManualProject, brief: BriefState | null): ProjectLogEntry[];
export function coverOf(p: ManualProject, refs: BuildRef[]): string | null;
export function resumeStepOf(p: ManualProject): ProjectStep;
export function conceptOf(chat: ChatSession | null | undefined, build: BuildJob, product: BuildProduct): ConceptSummary | undefined;
```
In `src/lib/create/history.tsx`, `productsOf(job)[0]` now carries `description` when `job.description` is set (COR-90).

**Where this differs from the §5.1.2 sketch, on purpose.** The controller merges these; every other signature is §5.1.2's.
1. **Imports are relative** (`../create/history`, not `@/lib/create/history`), as the harness notes require.
2. **`versionsOf(refs, lineages, rows): ProjectVersion[][]`**, as §5.1.2 and `ProjectView.versions` fix it. It returns one list per lineage, each newest first. The brief's shorthand `versionsOf(project, builds, chats) → ProjectVersion[]` is `versionsOf(refs, lineagesOf(refs, chats), productRowsOf(p)).flat()`, with `refs = buildsOf(p, builds)`. Every version carries:
   - its date (`savedAt`);
   - its chat (`chatId`, `lineage`);
   - its build (`buildId`, `job`);
   - its pieces;
   - its products tied to rows;
   - `diff.added` / `dropped` / `changed`.
3. **`sourceOf`: a row with a stored `source` never falls back to a name join.** In the sketch, a row whose v2 build is gone would name-join v1 and read "Not in version 2 · from version 1", which is false; here it reads build-gone. The optional `claimed` set stops a legacy name join from taking a product a stored source already holds, so two cards can't open one product.
4. **`productsOfProject` state.** In the sketch, a sourceless row on a project that has any ref reads "unmatched". Here a sourceless row on a project **made by hand** (no `buildId`) reads **"hand"**, even after a build joined: the maker typed it, and it never had a build. "unmatched" stays for legacy rows of a project a build created.
5. **`projectLogOf` "created".** The entry is written when `!p.buildId` (made by hand), instead of "no build ref", so a hand-made project a build joined still logs "Created by hand". "showcased" is logged only on a minted project, which agrees with `showcaseOf()`. At the same moment Showcased sorts above Minted.
6. **`resumeStepOf`** never returns `"brief"`, because the Brief has its own header door (§3.6). It falls back to PCB.
7. **Additive.** `Lineage.chat` exists so the Versions heading can go plain when the chat is gone. Also added: `norm`, `modelNameOf`, `productRowsOf` (`attach()` imports `norm` and `modelNameOf`, so reads and writes match on one rule), `piecesOf` (COR-18, COR-22, COR-23), the named types `VersionProduct` and `PendingBuild`, and `conceptOf`, which moves here from `project-details.tsx:521-542` (§5.1.7, "The page" row). The pending type is `PendingBuild`, not `PendingVersion`, because A3 exports `PendingVersion = { buildId; n; status }` from `project-summary.ts`.
8. **`diff` is null** for version 1, and also when this build or the one before it is gone, because there is nothing to compare. Each entry is the row id when a row matches, else the product name. A dropped entry's row links to the version before.
9. **"Changed"** compares three things:
   - the normalized model name;
   - `specKey()` of the two booked specs, only when both have one;
   - the parts as a multiset of `unitName` × `qtyOf`, so "TT motor (x4)" and "4 x TT motor" compare equal.

   `specKey` compares only what the maker decided, so a rule change between app versions can't read as "Changed".

**Notes for the tasks that read this:**
- **Product page (COR-41):**
  - The version select is the lineage's `ProjectVersion[]` from `versionsOf`.
  - The product at version *n* is the entry in `v.products` with `rowId === productId`, then `productsOf(v.job).find(x => x.id === entry.productId)`.
  - A dropped product opens at `products[i].dropped.lastIn`, which equals `version.current`.
- **Versions block (COR-107):**
  - `lineages[i].chat === null` means the heading is plain text.
  - Pieces are `v.pieces` ("needs a retry" when `retry`); `v.job === null` reads "build not in this browser".
- **Pending banner (COR-18):** there is one `PendingBuild` per lineage, and `piecesOf(job)` gives "{k} of {m} pieces".

- [ ] **Step 1: Write the failing tests**

Add the include entry to `tests/projects/tsconfig.json`, or skip it if a glob already covers `src/lib/manual/*.ts`:
```jsonc
  "include": [
    // …A1's entries, unchanged…
    "../../src/lib/manual/project-read.ts"
  ]
```

Create `tests/projects/fixtures/projects.mjs`:
```js
// The spec's six project fixtures (§5 step 2, LST-32), plus a rebuild that
// drops a product. Plain data in the stored shapes: BuildJob, ChatSession,
// ManualProject — projects saved from now on hold `builds` and product
// sources exactly as attach() (§5.1.8) writes them; legacy ones don't.
// Each fixture: { name, project, builds, chats, draft } — `draft` is the
// StoredDraft the Brief keeps at ideeza:brief:draft:<id>, or null.

import { normalizeBrief } from "../../../.tmp-test/lib/brief/types.js";

export const MIN = 60_000;
export const DAY = 86_400_000;
/** Sep 22, 2026 · 9:00 UTC. */
export const T = Date.UTC(2026, 8, 22, 9, 0);

const KINDS = ["3d", "pcb", "code", "wiring", "parts"];

/** The five pieces, all `status` unless `only` says otherwise per kind. */
export function items(status = "ready", only = {}) {
  return KINDS.map((kind) => {
    const s = only[kind] ?? status;
    return { kind, status: s, progress: s === "ready" ? 100 : 0 };
  });
}

export const part = (name, category = "Microcontroller") => ({ name, role: "", category });

/** A booked spec with the fields specKey() reads; `o` overrides them. */
export function spec(o = {}) {
  return {
    kind: "electronic",
    size: { l: 120, w: 60, h: 25 },
    sizeSource: "calc",
    minSize: { l: 100, w: 50, h: 20 },
    fits: true,
    draftAtSize: false,
    draftChosen: false,
    board: { w: 50, h: 40, parts: 4, layers: 2 },
    battery: "li-1s-400",
    batterySource: "rule",
    noUsbPort: false,
    material: "PLA",
    materialSource: "rule",
    wallMm: 2,
    wallSource: "rule",
    drawMa: 120,
    budgetMa: 500,
    choices: {},
    ...o,
  };
}

export function companion(o) {
  return {
    id: o.id,
    name: o.name,
    conceptImageUrl: o.image ?? `https://img.test/${o.id}.png`,
    conceptPrompt: `${o.name} prompt`,
    title: o.title ?? o.name,
    summary: o.summary ?? "nRF24L01 · 2 x AA holder",
    ...(o.description ? { description: o.description } : {}),
    parts: o.parts ?? [part("nRF24L01", "Connectivity"), part("2 x AA holder", "Power Management")],
    ...(o.spec ? { spec: o.spec } : {}),
    items: o.items ?? items(),
  };
}

export function build(o) {
  return {
    id: o.id,
    chatId: o.chatId,
    conceptImageUrl: o.image ?? `https://img.test/${o.id}.png`,
    conceptPrompt: `${o.title} prompt`,
    title: o.title,
    summary: o.summary ?? "ESP32-WROOM-32 · L298N motor driver",
    ...(o.description ? { description: o.description } : {}),
    parts: o.parts ?? [part("ESP32-WROOM-32"), part("L298N motor driver", "Actuator")],
    ...(o.spec ? { spec: o.spec } : {}),
    ...(o.projectChoiceId ? { projectChoiceId: o.projectChoiceId } : {}),
    conceptNumber: o.conceptNumber ?? "1",
    status: o.status ?? "running",
    estimateMin: 1,
    creditsCharged: true,
    creditsRefunded: false,
    ...(o.projectId ? { projectId: o.projectId } : {}),
    items: o.items ?? items(),
    companions: o.companions ?? [],
    createdAt: o.createdAt,
    updatedAt: o.createdAt,
  };
}

export function chat(id, title, createdAt, turns = []) {
  return { id, title, turns, createdAt, updatedAt: createdAt };
}

export function project(o) {
  return {
    id: o.id,
    slug: o.slug ?? o.id,
    name: o.name,
    productName: o.productName ?? "",
    description: o.description ?? "",
    ...(o.products ? { products: o.products } : {}),
    status: o.status ?? "draft",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt ?? o.createdAt,
    flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
    ...(o.buildId ? { buildId: o.buildId } : {}),
    ...(o.builds ? { builds: o.builds } : {}),
    ...(o.lastOpened ? { lastOpened: o.lastOpened } : {}),
    ...("showcasedAt" in o ? { showcasedAt: o.showcasedAt } : {}),
    ...("cover" in o ? { cover: o.cover } : {}),
  };
}

/** A product row as attach() writes it. */
export const row = (id, name, description, buildId, productId, updatedAt) => ({
  id,
  name,
  description,
  source: { buildId, productId },
  updatedAt,
});

// ── 1. A 4-product build ────────────────────────────────────────────────
const SAVED_FOUR = T + 5 * MIN;
export const four = {
  name: "a 4-product build",
  project: project({
    id: "p-four",
    name: "Survey Drone",
    productName: "Survey Drone",
    description: "A quadcopter that maps a field from 60 m up.",
    buildId: "b-drone",
    createdAt: SAVED_FOUR,
    builds: [{ buildId: "b-drone", chatId: "c-drone", version: 1, savedAt: SAVED_FOUR }],
    products: [
      row("prd_drone001", "Survey Drone", "A quadcopter that maps a field from 60 m up.", "b-drone", "primary", SAVED_FOUR),
      row("prd_drone002", "Remote Controller", "A two-stick 2.4 GHz remote.", "b-drone", "remote-controller", SAVED_FOUR),
      row("prd_drone003", "Battery Charger", "Charges two packs at once.", "b-drone", "battery-charger", SAVED_FOUR),
      row("prd_drone004", "Landing Pad", "A folding pad with a beacon.", "b-drone", "landing-pad", SAVED_FOUR),
    ],
  }),
  builds: [
    build({
      id: "b-drone",
      chatId: "c-drone",
      title: "Survey Drone",
      description: "A quadcopter that maps a field from 60 m up.",
      projectId: "p-four",
      createdAt: T,
      companions: [
        companion({ id: "remote-controller", name: "Remote Controller", description: "A two-stick 2.4 GHz remote." }),
        companion({ id: "battery-charger", name: "Battery Charger", description: "Charges two packs at once." }),
        companion({ id: "landing-pad", name: "Landing Pad", description: "A folding pad with a beacon." }),
      ],
    }),
  ],
  chats: [chat("c-drone", "Survey drone", T - 10 * MIN)],
  draft: null,
};

// ── 2. A legacy hand-made project: no products[], no builds ─────────────
export const legacyHand = {
  name: "a legacy hand-made project",
  project: project({
    id: "p-hand",
    name: "Desk Lamp",
    productName: "Desk Lamp",
    description: "A lamp that dims itself after sunset.",
    createdAt: T - 30 * DAY,
  }),
  builds: [],
  chats: [],
  draft: null,
};

// ── 3. Minted to sell, and showcased (a legacy build-made project) ──────
export const MINT = T + 2 * DAY;
export const mintedSell = {
  name: "a project minted to sell and showcased",
  project: project({
    id: "p-sell",
    name: "Smart Plant Pot",
    productName: "Smart Plant Pot",
    description: "A pot that waters itself.",
    buildId: "b-pot",
    status: "completed",
    createdAt: T - DAY + 3 * MIN,
    updatedAt: MINT,
    showcasedAt: MINT,
    // Legacy: ids from normalizeProjects, no sources, no `builds`.
    products: [{ id: "p1", name: "Smart Plant Pot", description: "A pot that waters itself." }],
  }),
  builds: [
    build({
      id: "b-pot",
      chatId: "c-pot",
      title: "Smart Plant Pot",
      description: "A pot that waters itself.",
      projectId: "p-sell",
      createdAt: T - DAY,
      image: "https://img.test/pot.png",
    }),
  ],
  chats: [chat("c-pot", "Plant pot", T - DAY - 10 * MIN)],
  draft: {
    state: normalizeBrief({
      projectId: "p-sell",
      projectChoice: "p-sell",
      intent: "sell",
      network: "baseSepolia",
      token: "ETH",
      price: "0.05",
      shareToNewsfeed: true,
      mintedAt: MINT,
    }),
    step: "success",
  },
};

// ── 4. A hand-made project a build joined ───────────────────────────────
const SAVED_GARDEN = T + DAY + 5 * MIN;
export const handJoined = {
  name: "a hand-made project a build joined",
  project: project({
    id: "p-garden",
    name: "Garden Kit",
    productName: "Rain Gauge",
    description: "Sensors for a raised bed.",
    createdAt: T,
    updatedAt: SAVED_GARDEN,
    // No buildId: a join never stamps the origin.
    builds: [{ buildId: "b-garden", chatId: "c-garden", version: 1, savedAt: SAVED_GARDEN }],
    products: [
      { id: "p1", name: "Rain Gauge", description: "A tipping-bucket gauge." },
      row("prd_gard0001", "Garden Hub", "A hub that reads every sensor in the bed.", "b-garden", "primary", SAVED_GARDEN),
      row("prd_gard0002", "Soil Sensor", "A probe that reads moisture.", "b-garden", "soil-sensor", SAVED_GARDEN),
    ],
  }),
  builds: [
    build({
      id: "b-garden",
      chatId: "c-garden",
      title: "Garden Hub",
      description: "A hub that reads every sensor in the bed.",
      projectChoiceId: "p-garden",
      projectId: "p-garden",
      createdAt: T + DAY,
      companions: [companion({ id: "soil-sensor", name: "Soil Sensor", description: "A probe that reads moisture." })],
    }),
  ],
  chats: [chat("c-garden", "Garden hub", T + DAY - 10 * MIN)],
  draft: null,
};

// ── 5. A project whose build was purged ─────────────────────────────────
export const purged = {
  name: "a project whose build was purged",
  project: project({
    id: "p-purged",
    name: "Pocket Weather Station",
    productName: "Pocket Weather Station",
    description: "Reads temperature, humidity and pressure.",
    buildId: "b-purged",
    createdAt: T - 10 * DAY,
    builds: [{ buildId: "b-purged", chatId: "c-weather", version: 1, savedAt: T - 10 * DAY }],
    products: [
      row("prd_wthr0001", "Pocket Weather Station", "Reads temperature, humidity and pressure.", "b-purged", "primary", T - 10 * DAY),
      row("prd_wthr0002", "Display Dock", "A dock with an e-ink screen.", "b-purged", "display-dock", T - 10 * DAY),
    ],
  }),
  builds: [], // the builds store no longer has it
  chats: [chat("c-weather", "Weather station", T - 10 * DAY - 10 * MIN)],
  draft: null,
};

// ── 6. A chat rebuilt twice: versions 1, 2 and 3 of one lineage ─────────
const botParts1 = [part("ESP32-WROOM-32"), part("TCRT5000 sensor (x4)", "Sensor"), part("N20 gear motor (x2)", "Actuator")];
const botParts2 = [...botParts1, part("HC-SR04 ultrasonic sensor", "Sensor")];
export const rebuiltTwice = {
  name: "a chat rebuilt twice",
  project: project({
    id: "p-bot",
    name: "Line Follower",
    productName: "Line Follower",
    description: "A robot that follows a taped line.",
    buildId: "b-bot-1",
    createdAt: T + 5 * MIN,
    updatedAt: T + 2 * DAY + 5 * MIN,
    builds: [
      { buildId: "b-bot-1", chatId: "c-bot", version: 1, savedAt: T + 5 * MIN },
      { buildId: "b-bot-2", chatId: "c-bot", version: 2, savedAt: T + DAY + 5 * MIN },
      { buildId: "b-bot-3", chatId: "c-bot", version: 3, savedAt: T + 2 * DAY + 5 * MIN },
    ],
    products: [
      row("prd_bot00001", "Line Follower", "A robot that follows a taped line.", "b-bot-3", "primary", T + 2 * DAY + 5 * MIN),
      row("prd_bot00002", "Charging Dock", "A dock it drives onto to charge.", "b-bot-3", "charging-dock", T + 2 * DAY + 5 * MIN),
    ],
  }),
  builds: [
    build({ id: "b-bot-1", chatId: "c-bot", title: "Line Follower", description: "A robot that follows a taped line.", projectId: "p-bot", createdAt: T, parts: botParts1, spec: spec() }),
    build({
      id: "b-bot-2",
      chatId: "c-bot",
      title: "Line Follower",
      description: "A robot that follows a taped line.",
      projectId: "p-bot",
      createdAt: T + DAY,
      parts: botParts2,
      spec: spec(),
      companions: [companion({ id: "charging-dock", name: "Charging Dock", description: "A dock it drives onto to charge.", spec: spec() })],
    }),
    build({
      id: "b-bot-3",
      chatId: "c-bot",
      title: "Line Follower",
      description: "A robot that follows a taped line.",
      projectId: "p-bot",
      createdAt: T + 2 * DAY,
      parts: botParts2,
      spec: spec(),
      companions: [
        companion({
          id: "charging-dock",
          name: "Charging Dock",
          description: "A dock it drives onto to charge.",
          spec: spec({ size: { l: 140, w: 80, h: 30 }, sizeSource: "you" }),
        }),
      ],
    }),
  ],
  chats: [chat("c-bot", "Line-following robot", T - 10 * MIN)],
  draft: null,
};

// ── 7. A rebuild that drops a product (the spec's "Car", §3.3) ──────────
const SAVED_CAR_1 = T + 5 * MIN;
const SAVED_CAR_2 = T + 4 * DAY + 5 * MIN;
export const dropsOne = {
  name: "a rebuild that drops a product",
  project: project({
    id: "p-car",
    name: "Car",
    productName: "RC Car Controller",
    description: "A two-motor RC car with an ESP32 brain and a 2.4 GHz remote.",
    buildId: "b-car-1",
    createdAt: SAVED_CAR_1,
    updatedAt: SAVED_CAR_2,
    builds: [
      { buildId: "b-car-1", chatId: "c-car", version: 1, savedAt: SAVED_CAR_1 },
      { buildId: "b-car-2", chatId: "c-car", version: 2, savedAt: SAVED_CAR_2 },
    ],
    products: [
      row("prd_car00001", "RC Car Controller", "Drives two motors from the remote's commands.", "b-car-2", "primary", SAVED_CAR_2),
      row("prd_car00002", "Remote Controller", "A handheld 2.4 GHz remote with two thumb sticks.", "b-car-2", "remote-controller", SAVED_CAR_2),
      // Version 2 dropped it: its source still names version 1 (COR-108).
      row("prd_car00003", "Battery Charger", "Charges the car's pack from USB.", "b-car-1", "battery-charger", SAVED_CAR_1),
      row("prd_car00004", "Spare Battery Pack", "A second pack that swaps in.", "b-car-2", "spare-battery-pack", SAVED_CAR_2),
    ],
  }),
  builds: [
    build({
      id: "b-car-1",
      chatId: "c-car",
      title: "RC Car Controller",
      description: "Drives two motors from the remote's commands.",
      projectId: "p-car",
      createdAt: T,
      companions: [
        companion({ id: "remote-controller", name: "Remote Controller", description: "A handheld 2.4 GHz remote with two thumb sticks." }),
        companion({ id: "battery-charger", name: "Battery Charger", description: "Charges the car's pack from USB." }),
      ],
    }),
    build({
      id: "b-car-2",
      chatId: "c-car",
      title: "RC Car Controller",
      description: "Drives two motors from the remote's commands.",
      projectId: "p-car",
      createdAt: T + 4 * DAY,
      companions: [
        companion({
          id: "remote-controller",
          name: "Remote Controller",
          description: "A handheld 2.4 GHz remote with two thumb sticks.",
          parts: [part("nRF24L01", "Connectivity"), part("2 x AA holder", "Power Management"), part("HC-SR04 ultrasonic sensor", "Sensor")],
        }),
        companion({ id: "spare-battery-pack", name: "Spare Battery Pack", description: "A second pack that swaps in." }),
      ],
    }),
  ],
  chats: [chat("c-car", "Car", T - 10 * MIN)],
  draft: null,
};

/** The spec's six (§5 build order, step 2). */
export const SIX = [four, legacyHand, mintedSell, handJoined, purged, rebuiltTwice];
/** The six plus the rebuild that drops a product. */
export const ALL = [...SIX, dropsOne];
```

Create `tests/projects/project-read.test.mjs`:
```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { productsOf } from "../../.tmp-test/lib/create/history.js";
import {
  buildsOf,
  conceptOf,
  coverOf,
  lineageProjectOf,
  lineagesOf,
  pendingVersionsOf,
  piecesOf,
  productRowsOf,
  productsOfProject,
  projectLogOf,
  resumeStepOf,
  versionsOf,
} from "../../.tmp-test/lib/manual/project-read.js";
import {
  DAY,
  MIN,
  MINT,
  T,
  build,
  chat,
  companion,
  dropsOne,
  four,
  handJoined,
  items,
  legacyHand,
  mintedSell,
  project,
  purged,
  rebuiltTwice,
} from "./fixtures/projects.mjs";

const refsOf = (fx) => buildsOf(fx.project, fx.builds);
const productsFor = (fx) => productsOfProject(fx.project, refsOf(fx));
const versionsFor = (fx) => {
  const refs = refsOf(fx);
  return versionsOf(refs, lineagesOf(refs, fx.chats), productRowsOf(fx.project));
};
/** A version without its job, for readable deepEqual. */
const plain = (v) => ({
  version: v.version,
  current: v.current,
  buildId: v.buildId,
  savedAt: v.savedAt,
  pieces: v.pieces,
  products: v.products,
  diff: v.diff,
});

describe("productsOf (COR-90)", () => {
  it("gives the primary the job's own description", () => {
    const [primary] = productsOf(four.builds[0]);
    assert.equal(primary.id, "primary");
    assert.equal(primary.description, "A quadcopter that maps a field from 60 m up.");
    assert.equal(primary.summary, "ESP32-WROOM-32 · L298N motor driver");
  });
  it("leaves the key out when the job has none", () => {
    const job = build({ id: "b-nodesc", chatId: "c-x", title: "Thing", createdAt: T });
    assert.equal("description" in productsOf(job)[0], false);
  });
});

describe("buildsOf (COR-86)", () => {
  it("reads stored refs with their jobs", () => {
    const refs = refsOf(four);
    assert.equal(refs.length, 1);
    assert.deepEqual(
      { buildId: refs[0].buildId, chatId: refs[0].chatId, version: refs[0].version, savedAt: refs[0].savedAt },
      { buildId: "b-drone", chatId: "c-drone", version: 1, savedAt: T + 5 * MIN },
    );
    assert.equal(refs[0].job, four.builds[0]);
  });
  it("keeps a stored ref whose build is gone, with job null", () => {
    const [ref] = refsOf(purged);
    assert.equal(ref.buildId, "b-purged");
    assert.equal(ref.job, null);
  });
  it("numbers legacy links per lineage by createdAt; only the origin has a save time", () => {
    const p = project({ id: "p-leg", name: "Legacy", productName: "Rover", buildId: "b-l1", createdAt: T + MIN });
    const all = [
      build({ id: "b-m1", chatId: "c-m", title: "Mast", projectId: "p-leg", createdAt: T + 2 * DAY }),
      build({ id: "b-l2", chatId: "c-l", title: "Rover", projectId: "p-leg", createdAt: T + DAY }),
      build({ id: "b-l1", chatId: "c-l", title: "Rover", projectId: "p-leg", createdAt: T }),
      build({ id: "b-other", chatId: "c-l", title: "Rover", createdAt: T + 3 * DAY }),
    ];
    assert.deepEqual(
      buildsOf(p, all).map(({ buildId, chatId, version, savedAt }) => ({ buildId, chatId, version, savedAt })),
      [
        { buildId: "b-l1", chatId: "c-l", version: 1, savedAt: T + MIN },
        { buildId: "b-l2", chatId: "c-l", version: 2, savedAt: null },
        { buildId: "b-m1", chatId: "c-m", version: 1, savedAt: null },
      ],
    );
  });
  it("sorts a gone origin build first, with no chat", () => {
    const p = project({ id: "p-g", name: "Gone", buildId: "b-gone", createdAt: T });
    const all = [build({ id: "b-x", chatId: "c-x", title: "X", projectId: "p-g", createdAt: T + DAY })];
    assert.deepEqual(
      buildsOf(p, all).map(({ buildId, chatId, version, job }) => ({ buildId, chatId, version, gone: job === null })),
      [
        { buildId: "b-gone", chatId: null, version: 1, gone: true },
        { buildId: "b-x", chatId: "c-x", version: 1, gone: false },
      ],
    );
  });
  it("appends a legacy link after its lineage's stored versions", () => {
    const p = { ...rebuiltTwice.project, builds: rebuiltTwice.project.builds.slice(0, 2) };
    const refs = buildsOf(p, rebuiltTwice.builds);
    assert.deepEqual(
      refs.map((r) => [r.buildId, r.version]),
      [
        ["b-bot-1", 1],
        ["b-bot-2", 2],
        ["b-bot-3", 3],
      ],
    );
    assert.equal(refs[2].savedAt, null);
  });
});

describe("lineagesOf", () => {
  it("groups one chat's versions, oldest first, titled by the chat", () => {
    const [l, ...rest] = lineagesOf(refsOf(rebuiltTwice), rebuiltTwice.chats);
    assert.equal(rest.length, 0);
    assert.equal(l.chatId, "c-bot");
    assert.equal(l.title, "Line-following robot");
    assert.equal(l.chat, rebuiltTwice.chats[0]);
    assert.deepEqual(l.refs.map((r) => r.version), [1, 2, 3]);
    assert.equal(l.latest.buildId, "b-bot-3");
  });
  it("falls back to the build's title when the chat is gone, then to \"Build\"", () => {
    const [l] = lineagesOf(refsOf(rebuiltTwice), []);
    assert.equal(l.chat, null);
    assert.equal(l.title, "Line Follower");
    const [gone] = lineagesOf(refsOf(purged), []);
    assert.equal(gone.title, "Build");
  });
  it("keeps the chat title while the build is gone", () => {
    assert.equal(lineagesOf(refsOf(purged), purged.chats)[0].title, "Weather station");
  });
  it("is empty for a hand-made project", () => {
    assert.deepEqual(lineagesOf(refsOf(legacyHand), legacyHand.chats), []);
  });
});

describe("productsOfProject (COR-42, COR-108)", () => {
  const brief = (list) =>
    list.map((x) => ({ id: x.id, name: x.name, state: x.state, version: x.version, dropped: x.dropped, from: x.built?.ref.buildId ?? null }));

  it("lists all four products of a 4-product build", () => {
    assert.deepEqual(brief(productsFor(four)), [
      { id: "prd_drone001", name: "Survey Drone", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-drone" },
      { id: "prd_drone002", name: "Remote Controller", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-drone" },
      { id: "prd_drone003", name: "Battery Charger", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-drone" },
      { id: "prd_drone004", name: "Landing Pad", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-drone" },
    ]);
    assert.equal(productsFor(four)[1].built.product.id, "remote-controller");
  });
  it("gives a legacy hand-made project its one product, as p1", () => {
    assert.deepEqual(productsFor(legacyHand), [
      {
        id: "p1",
        name: "Desk Lamp",
        description: "A lamp that dims itself after sunset.",
        built: null,
        state: "hand",
        version: null,
        dropped: null,
      },
    ]);
  });
  it("joins a legacy row to its origin build by name", () => {
    assert.deepEqual(brief(productsFor(mintedSell)), [
      { id: "p1", name: "Smart Plant Pot", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-pot" },
    ]);
  });
  it("keeps the typed product hand-made after a build joins", () => {
    assert.deepEqual(brief(productsFor(handJoined)), [
      { id: "p1", name: "Rain Gauge", state: "hand", version: null, dropped: null, from: null },
      { id: "prd_gard0001", name: "Garden Hub", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-garden" },
      { id: "prd_gard0002", name: "Soil Sensor", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-garden" },
    ]);
  });
  it("keeps every product of a purged build, not linked", () => {
    const list = productsFor(purged);
    assert.deepEqual(list.map((x) => [x.name, x.state, x.built, x.version]), [
      ["Pocket Weather Station", "build-gone", null, null],
      ["Display Dock", "build-gone", null, null],
    ]);
  });
  it("reads a legacy row as build-gone when none of its builds is here", () => {
    const p = project({ id: "p-old", name: "Old", productName: "Kite", buildId: "b-old", createdAt: T, products: [{ id: "p1", name: "Kite", description: "" }] });
    assert.equal(productsOfProject(p, buildsOf(p, [])).at(0).state, "build-gone");
  });
  it("reads a renamed legacy row as unmatched", () => {
    const p = { ...mintedSell.project, products: [{ id: "p1", name: "Self-watering Pot", description: "" }] };
    assert.equal(productsOfProject(p, buildsOf(p, mintedSell.builds)).at(0).state, "unmatched");
  });
  it("never lets a name join take a product a stored source holds", () => {
    const p = {
      ...four.project,
      products: [...four.project.products, { id: "p9", name: "Landing Pad", description: "" }],
    };
    const list = productsOfProject(p, buildsOf(p, four.builds));
    assert.equal(list.at(3).state, "built");
    assert.equal(list.at(4).state, "unmatched");
  });
  it("keeps a product the rebuild dropped, marked, at the last version that had it", () => {
    assert.deepEqual(brief(productsFor(dropsOne)), [
      { id: "prd_car00001", name: "RC Car Controller", state: "built", version: { current: 2, count: 2 }, dropped: null, from: "b-car-2" },
      { id: "prd_car00002", name: "Remote Controller", state: "built", version: { current: 2, count: 2 }, dropped: null, from: "b-car-2" },
      { id: "prd_car00003", name: "Battery Charger", state: "built", version: { current: 1, count: 2 }, dropped: { lastIn: 1, current: 2 }, from: "b-car-1" },
      { id: "prd_car00004", name: "Spare Battery Pack", state: "built", version: { current: 2, count: 2 }, dropped: null, from: "b-car-2" },
    ]);
  });
  it("shows a chat rebuilt twice at version 3 of 3", () => {
    assert.deepEqual(productsFor(rebuiltTwice).map((x) => [x.name, x.version, x.dropped]), [
      ["Line Follower", { current: 3, count: 3 }, null],
      ["Charging Dock", { current: 3, count: 3 }, null],
    ]);
  });
});

describe("versionsOf (COR-106)", () => {
  it("says what a rebuild added, dropped and changed", () => {
    const [car] = versionsFor(dropsOne);
    assert.deepEqual(car.map(plain), [
      {
        version: 2,
        current: true,
        buildId: "b-car-2",
        savedAt: T + 4 * DAY + 5 * MIN,
        pieces: { ready: 15, total: 15, retry: false },
        products: [
          { rowId: "prd_car00001", productId: "primary", name: "RC Car Controller" },
          { rowId: "prd_car00002", productId: "remote-controller", name: "Remote Controller" },
          { rowId: "prd_car00004", productId: "spare-battery-pack", name: "Spare Battery Pack" },
        ],
        diff: { added: ["prd_car00004"], dropped: ["prd_car00003"], changed: ["prd_car00002"] },
      },
      {
        version: 1,
        current: false,
        buildId: "b-car-1",
        savedAt: T + 5 * MIN,
        pieces: { ready: 15, total: 15, retry: false },
        products: [
          { rowId: "prd_car00001", productId: "primary", name: "RC Car Controller" },
          { rowId: "prd_car00002", productId: "remote-controller", name: "Remote Controller" },
          { rowId: "prd_car00003", productId: "battery-charger", name: "Battery Charger" },
        ],
        diff: null,
      },
    ]);
    assert.equal(car[0].lineage, "Car");
    assert.equal(car[0].chatId, "c-car");
    assert.equal(car[0].job, dropsOne.builds[1]);
  });
  it("lists a chat rebuilt twice newest first, each against the version before", () => {
    const [bot] = versionsFor(rebuiltTwice);
    assert.deepEqual(
      bot.map((v) => [v.version, v.current, v.diff]),
      [
        [3, true, { added: [], dropped: [], changed: ["prd_bot00002"] }],
        [2, false, { added: ["prd_bot00002"], dropped: [], changed: ["prd_bot00001"] }],
        [1, false, null],
      ],
    );
    assert.deepEqual(bot[2].products, [{ rowId: "prd_bot00001", productId: "primary", name: "Line Follower" }]);
  });
  it("lists no products for a version whose build is gone", () => {
    const [[v]] = versionsFor(purged);
    assert.deepEqual(plain(v), {
      version: 1,
      current: true,
      buildId: "b-purged",
      savedAt: T - 10 * DAY,
      pieces: null,
      products: [],
      diff: null,
    });
    assert.equal(v.job, null);
    assert.equal(v.lineage, "Weather station");
  });
  it("can't diff against a version whose build is gone", () => {
    const fx = { ...dropsOne, builds: [dropsOne.builds[1]] };
    const [car] = versionsFor(fx);
    assert.equal(car[0].diff, null);
    assert.equal(car[0].products.length, 3);
  });
  it("ties a joined build's products to their rows and leaves the typed one out", () => {
    const [[v]] = versionsFor(handJoined);
    assert.deepEqual(v.products, [
      { rowId: "prd_gard0001", productId: "primary", name: "Garden Hub" },
      { rowId: "prd_gard0002", productId: "soil-sensor", name: "Soil Sensor" },
    ]);
  });
  it("ties legacy rows by name", () => {
    const [[v]] = versionsFor(mintedSell);
    assert.deepEqual(v.products, [{ rowId: "p1", productId: "primary", name: "Smart Plant Pot" }]);
    assert.equal(v.savedAt, mintedSell.project.createdAt);
  });
  it("gives a 4-product build one version with its four products", () => {
    const [[v]] = versionsFor(four);
    assert.equal(v.products.length, 4);
    assert.deepEqual(v.pieces, { ready: 20, total: 20, retry: false });
  });
  it("is empty for a hand-made project", () => {
    assert.deepEqual(versionsFor(legacyHand), []);
  });
});

describe("piecesOf", () => {
  it("counts every product's pieces, skipped ones left out, and says when one needs a retry", () => {
    const job = build({
      id: "b-p",
      chatId: "c-p",
      title: "P",
      createdAt: T,
      items: items("ready", { code: "failed", wiring: "skipped" }),
      companions: [companion({ id: "dock", name: "Dock" })],
    });
    assert.deepEqual(piecesOf(job), { ready: 8, total: 9, retry: true });
  });
});

describe("pendingVersionsOf (COR-18)", () => {
  const b4 = build({ id: "b-bot-4", chatId: "c-bot", title: "Line Follower", createdAt: T + 3 * DAY, items: items("building") });
  it("finds the unsaved newer build of a lineage as its next version", () => {
    const all = [...rebuiltTwice.builds, b4];
    const pending = pendingVersionsOf(buildsOf(rebuiltTwice.project, all), all);
    assert.deepEqual(
      pending.map(({ chatId, job, version, status }) => ({ chatId, id: job.id, version, status })),
      [{ chatId: "c-bot", id: "b-bot-4", version: 4, status: "running" }],
    );
  });
  it("ignores a build saved elsewhere and one older than the latest version", () => {
    const elsewhere = { ...b4, projectId: "p-other" };
    const older = build({ id: "b-bot-0", chatId: "c-bot", title: "Line Follower", createdAt: T + DAY + 1 });
    const all = [...rebuiltTwice.builds, elsewhere, older];
    assert.deepEqual(pendingVersionsOf(buildsOf(rebuiltTwice.project, all), all), []);
  });
  it("is empty when nothing newer waits", () => {
    assert.deepEqual(pendingVersionsOf(refsOf(four), four.builds), []);
  });
});

describe("lineageProjectOf (COR-89)", () => {
  const b3 = build({ id: "b-car-3", chatId: "c-car", title: "RC Car Controller", createdAt: T + 6 * DAY });
  it("returns the live project another build of the chat became", () => {
    assert.equal(lineageProjectOf(b3, [...dropsOne.builds, b3], [dropsOne.project, four.project]), dropsOne.project);
  });
  it("returns null once that project is deleted, and for a chat's first build", () => {
    assert.equal(lineageProjectOf(b3, [...dropsOne.builds, b3], [four.project]), null);
    const first = build({ id: "b-new", chatId: "c-new", title: "New", createdAt: T });
    assert.equal(lineageProjectOf(first, [first, ...dropsOne.builds], [dropsOne.project]), null);
  });
});

describe("projectLogOf (COR-52)", () => {
  it("logs a hand-made project's creation", () => {
    assert.deepEqual(projectLogOf(legacyHand.project, null), [{ kind: "created", at: T - 30 * DAY }]);
    assert.deepEqual(projectLogOf(handJoined.project, null), [{ kind: "created", at: T }]);
  });
  it("logs nothing for a built, unminted project — its saves are versions", () => {
    assert.deepEqual(projectLogOf(four.project, null), []);
    assert.deepEqual(projectLogOf(rebuiltTwice.project, null), []);
  });
  it("logs the mint and the showcase, Showcased first at the same moment", () => {
    assert.deepEqual(projectLogOf(mintedSell.project, mintedSell.draft.state), [
      { kind: "showcased", at: MINT },
      { kind: "minted", at: MINT, intent: "sell", network: "baseSepolia" },
    ]);
  });
  it("drops the showcase once it stops, and never shows one on a Draft", () => {
    const stopped = { ...mintedSell.project, showcasedAt: null };
    assert.deepEqual(projectLogOf(stopped, mintedSell.draft.state).map((e) => e.kind), ["minted"]);
    const draft = { ...four.project, showcasedAt: T + DAY };
    assert.deepEqual(projectLogOf(draft, null), []);
  });
});

describe("coverOf (COR-96)", () => {
  it("takes the newest saved version's primary image", () => {
    assert.equal(coverOf(four.project, refsOf(four)), "https://img.test/b-drone.png");
    assert.equal(coverOf(dropsOne.project, refsOf(dropsOne)), "https://img.test/b-car-2.png");
    assert.equal(coverOf(rebuiltTwice.project, refsOf(rebuiltTwice)), "https://img.test/b-bot-3.png");
  });
  it("falls back to any product image", () => {
    const job = build({
      id: "b-noimg",
      chatId: "c-n",
      title: "N",
      createdAt: T,
      image: "",
      companions: [companion({ id: "dock", name: "Dock", image: "https://img.test/dock.png" })],
    });
    const p = project({ id: "p-n", name: "N", buildId: "b-noimg", createdAt: T });
    assert.equal(coverOf(p, buildsOf(p, [job])), "https://img.test/dock.png");
  });
  it("is null with no image to show", () => {
    assert.equal(coverOf(legacyHand.project, refsOf(legacyHand)), null);
    assert.equal(coverOf(purged.project, refsOf(purged)), null);
  });
  it("takes the maker's pick first — even a product a later version dropped", () => {
    const p = { ...dropsOne.project, cover: { buildId: "b-car-1", productId: "battery-charger" } };
    assert.equal(coverOf(p, buildsOf(p, dropsOne.builds)), "https://img.test/battery-charger.png");
  });
  it("falls back to the default once the pick is cleared, gone, imageless or not this project's", () => {
    const fallback = "https://img.test/b-car-2.png";
    const at = (cover, builds = dropsOne.builds) => {
      const p = { ...dropsOne.project, cover };
      return coverOf(p, buildsOf(p, builds));
    };
    assert.equal(at(null), fallback);
    assert.equal(at(undefined), fallback);
    // Its build left this browser.
    assert.equal(at({ buildId: "b-car-1", productId: "battery-charger" }, [dropsOne.builds[1]]), fallback);
    // Its product has no image.
    const bare = { ...dropsOne.builds[0], companions: dropsOne.builds[0].companions.map((c) => ({ ...c, conceptImageUrl: "" })) };
    assert.equal(at({ buildId: "b-car-1", productId: "battery-charger" }, [bare, dropsOne.builds[1]]), fallback);
    // A product id the build doesn't have, and a build that isn't this project's.
    assert.equal(at({ buildId: "b-car-2", productId: "battery-charger" }), fallback);
    assert.equal(at({ buildId: "b-drone", productId: "primary" }, [...dropsOne.builds, ...four.builds]), fallback);
  });
});

describe("resumeStepOf (COR-12)", () => {
  it("resumes the editor step last opened, else PCB — never the Brief", () => {
    assert.equal(resumeStepOf(legacyHand.project), "pcb");
    assert.equal(resumeStepOf({ ...legacyHand.project, lastOpened: { step: "wiring", at: T } }), "wiring");
    assert.equal(resumeStepOf({ ...legacyHand.project, lastOpened: { step: "brief", at: T } }), "pcb");
  });
});

describe("conceptOf", () => {
  const concept = (title) => ({ title, summary: "", description: "", parts: [{ name: "ESP32", role: "", category: "Microcontroller" }] });
  const job = dropsOne.builds[1];
  const turns = [
    { id: "t1", role: "assistant", prompt: "car", kind: "fresh", status: "ready", imageUrl: job.conceptImageUrl, usedForBuild: job.id, concept: concept("Car"), ts: T },
    {
      id: "t2",
      role: "assistant",
      prompt: "remote",
      kind: "fresh",
      status: "ready",
      companionOf: "remote-controller",
      imageUrl: job.companions[0].conceptImageUrl,
      concept: concept("Remote"),
      ts: T + 1,
    },
  ];
  const c = chat("c-car", "Car", T, turns);
  it("finds the primary's concept by the turn that started the build", () => {
    assert.equal(conceptOf(c, job, productsOf(job)[0])?.title, "Car");
  });
  it("finds a companion's concept by its drawing", () => {
    assert.equal(conceptOf(c, job, productsOf(job)[1])?.title, "Remote");
  });
  it("finds nothing once the chat is gone", () => {
    assert.equal(conceptOf(null, job, productsOf(job)[0]), undefined);
  });
});
```

- [ ] **Step 2: Run it — expected FAIL**

```bash
cd /Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test tests/projects/project-read.test.mjs
```
Expected:
- `tsc` exits 0. The include entry names a file that doesn't exist yet, and tsc ignores it.
- node fails before any test runs:
  ```
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/project-details/.tmp-test/lib/manual/project-read.js' imported from …/project-details/tests/projects/project-read.test.mjs
  ```

- [ ] **Step 3: Implement**

**3a. `src/lib/create/history.tsx:393-411`** (COR-90). Replace this block:
```ts
/** The products a build covers, primary first. §4.7 opens each into its
 *  own tabs, and §4.4.9 gives each its own badge, so both surfaces walk
 *  this rather than special-casing the primary. */
export function productsOf(job: BuildJob): BuildProduct[] {
  return [
    {
      id: "primary",
      name: job.title,
      conceptImageUrl: job.conceptImageUrl,
      conceptPrompt: job.conceptPrompt,
      title: job.title,
      summary: job.summary,
      parts: job.parts,
      ...(job.spec ? { spec: job.spec } : null),
      items: job.items,
    },
    ...(job.companions ?? []),
  ];
}
```
with:
```ts
/** The products a build covers, primary first. §4.7 opens each into its
 *  own tabs, and §4.4.9 gives each its own badge, so both surfaces walk
 *  this rather than special-casing the primary. The primary carries the
 *  job's own description, as a companion carries its own (COR-90): without
 *  it every reader fell back to `summary`, which is the parts line. */
export function productsOf(job: BuildJob): BuildProduct[] {
  return [
    {
      id: "primary",
      name: job.title,
      conceptImageUrl: job.conceptImageUrl,
      conceptPrompt: job.conceptPrompt,
      title: job.title,
      summary: job.summary,
      ...(job.description ? { description: job.description } : null),
      parts: job.parts,
      ...(job.spec ? { spec: job.spec } : null),
      items: job.items,
    },
    ...(job.companions ?? []),
  ];
}
```
Callers that read `description || summary` now get the model's sentence for the primary instead of the parts line:
- `brief-app.tsx:536-541`, the Brief's `buildProducts`;
- `network/products.ts:27`, a project without `products[]`.

That is COR-90's intent. No caller depends on the primary lacking the key.

**3b. Create `src/lib/manual/project-read.ts`:**
```ts
// Backward-compatible reads over a project and the builds behind it
// (spec §5.1.2). Pure: every store comes in as an argument, because
// CreateHistoryProvider sits inside ManualProjectsProvider
// (app/layout.tsx:80-91), so the projects store can't read the builds.
//
// Value imports are relative on purpose: the unit tests run the tsc output
// under plain node, and tsc does not rewrite the `@/*` paths.

import {
  allItems,
  productsOf,
  statusOf,
  type BuildJob,
  type BuildProduct,
  type BuildStatus,
  type ChatSession,
} from "../create/history";
import type { ConceptPart, ConceptSummary } from "../create/concept";
import type { BriefState, Intent, Network } from "../brief/types";
import { qtyOf, unitName } from "../spec/bodies";
import { specKey } from "../spec/derive";
import { asConceptSummary } from "../spec/hints";
import type { ResolvedSpec } from "../spec/types";
import type { ManualProduct, ManualProject, ProjectBuildRef, ProjectStep } from "./projects";

/** A build the project holds, with the job itself — null once the build is
 *  no longer in this browser. */
export type BuildRef = ProjectBuildRef & { job: BuildJob | null };

/** The one name comparison every join uses — attach() (§5.1.8) reads the same. */
export const norm = (s: string) => s.trim().toLowerCase();

/** What a build product is called on a project row: the job's title for the
 *  primary, the classifier's name for a companion. attach()'s `modelName`. */
export function modelNameOf(bp: BuildProduct, job: BuildJob): string {
  return (bp.id === "primary" ? job.title : bp.name || bp.title).trim();
}

const claimKey = (buildId: string, productId: string) => `${buildId}\u0000${productId}`;

// ───────────────────────── builds and lineages ─────────────────────────

/** Every build behind a project: stored refs first, then legacy links
 *  (`project.buildId`, `build.projectId`) numbered per lineage by createdAt
 *  (COR-86). No surface reads `project.buildId` alone. */
export function buildsOf(p: ManualProject, all: BuildJob[]): BuildRef[] {
  const byId = new Map(all.map((b) => [b.id, b]));
  const out: BuildRef[] = (p.builds ?? []).map((r) => ({ ...r, job: byId.get(r.buildId) ?? null }));
  const seen = new Set(out.map((r) => r.buildId));
  const top = new Map<string | null, number>();
  for (const r of out) top.set(r.chatId, Math.max(top.get(r.chatId) ?? 0, r.version));
  const legacy = [
    ...(p.buildId && !seen.has(p.buildId) ? [p.buildId] : []),
    ...all
      .filter((b) => b.projectId === p.id && b.id !== p.buildId && !seen.has(b.id))
      .map((b) => b.id),
  ]
    .map((id) => ({ id, job: byId.get(id) ?? null }))
    // A gone origin build sorts first: it was the project's first build.
    .sort((a, b) => (a.job?.createdAt ?? -1) - (b.job?.createdAt ?? -1));
  for (const { id, job } of legacy) {
    const chatId = job?.chatId ?? null;
    const version = (top.get(chatId) ?? 0) + 1;
    top.set(chatId, version);
    // The origin build and its project were written in the same call
    // (projects.tsx:331-343), so the project's createdAt is its save time.
    out.push({ buildId: id, chatId, version, savedAt: id === p.buildId ? p.createdAt : null, job });
  }
  return out;
}

/** One chat's builds inside a project: its versions, oldest first. */
export type Lineage = {
  chatId: string | null;
  /** The chat's title, else the newest version's build title, else "Build". */
  title: string;
  /** The chat, or null once it's gone (or was never recorded): the Versions
   *  heading is then plain text, not a link. */
  chat: ChatSession | null;
  /** Version ascending. */
  refs: BuildRef[];
  /** The highest version — the lineage's current one. */
  latest: BuildRef;
};

/** The refs grouped by chat, in the order each chat first joined the project. */
export function lineagesOf(refs: BuildRef[], chats: ChatSession[]): Lineage[] {
  const groups = new Map<string | null, BuildRef[]>();
  for (const r of refs) {
    const g = groups.get(r.chatId);
    if (g) g.push(r);
    else groups.set(r.chatId, [r]);
  }
  return [...groups].map(([chatId, list]) => {
    const sorted = [...list].sort((a, b) => a.version - b.version);
    const latest = sorted[sorted.length - 1];
    const chat = chatId === null ? null : (chats.find((c) => c.id === chatId) ?? null);
    const title = (chat?.title ?? "").trim() || (latest.job?.title ?? "").trim() || "Build";
    return { chatId, title, chat, refs: sorted, latest };
  });
}

// ───────────────────────── products ─────────────────────────

/** The rows the project lists: its products, or — on a legacy or hand-made
 *  project that never had a list — the one headline product, as "p1". */
export function productRowsOf(p: ManualProject): ManualProduct[] {
  return p.products?.length
    ? p.products
    : [{ id: "p1", name: p.productName, description: p.description }];
}

/** The build product a project row is.
 *  - A row with a stored `source` is that product of that build, or nothing
 *    once the build is gone. It never falls back to a name join: an older
 *    version with the same name would read as "dropped" when it wasn't.
 *  - A row without one (legacy) is joined by name, newest build first,
 *    skipping any product `claimed` already names — so two cards never open
 *    the same product. */
export function sourceOf(
  row: ManualProduct,
  refs: BuildRef[],
  claimed?: ReadonlySet<string>,
): { ref: BuildRef; product: BuildProduct } | null {
  if (row.source) {
    const { buildId, productId } = row.source;
    const ref = refs.find((r) => r.buildId === buildId);
    const product = ref?.job ? productsOf(ref.job).find((x) => x.id === productId) : undefined;
    return ref && product ? { ref, product } : null;
  }
  const want = norm(row.name);
  if (!want) return null;
  const newest = [...refs].sort((a, b) => (b.job?.createdAt ?? 0) - (a.job?.createdAt ?? 0));
  for (const ref of newest) {
    if (!ref.job) continue;
    const product = productsOf(ref.job).find(
      (x) =>
        !claimed?.has(claimKey(ref.buildId, x.id)) &&
        (norm(x.name) === want || norm(x.title) === want),
    );
    if (product) return { ref, product };
  }
  return null;
}

export type ProjectProduct = {
  id: string;
  name: string;
  description: string;
  built: { ref: BuildRef; product: BuildProduct } | null;
  /** built → a link. build-gone → "Its build isn't in this browser any more."
   *  unmatched → "Its build can't be matched to this name." hand → "Made by
   *  hand — its work is in the editor." (COR-24) */
  state: "built" | "build-gone" | "unmatched" | "hand";
  /** Within its lineage: the version it is shown at, and the lineage's newest. */
  version: { current: number; count: number } | null;
  /** COR-108: its lineage's current version doesn't include it —
   *  "Not in version {current} · from version {lastIn}". */
  dropped: { lastIn: number; current: number } | null;
};

/** The Products list (COR-42): every row, in `products[]` order — each
 *  lineage's current version, plus the products a later version dropped,
 *  each once. */
export function productsOfProject(p: ManualProject, refs: BuildRef[]): ProjectProduct[] {
  const rows = productRowsOf(p);
  // Stored sources claim their build products first; name joins take what's left.
  const exact = rows.map((row) => (row.source ? sourceOf(row, refs) : null));
  const claimed = new Set(exact.flatMap((b) => (b ? [claimKey(b.ref.buildId, b.product.id)] : [])));
  const anyJob = refs.some((r) => r.job);
  return rows.map((row, i) => {
    let built = exact[i];
    if (!row.source) {
      built = sourceOf(row, refs, claimed);
      if (built) claimed.add(claimKey(built.ref.buildId, built.product.id));
    }
    const at = built?.ref;
    const count = at ? Math.max(...refs.filter((r) => r.chatId === at.chatId).map((r) => r.version)) : 0;
    // A row with no source on a project made by hand was typed by hand, even
    // after a build joined; on a project a build created it is a legacy
    // build row whose name no longer matches (or whose builds are all gone).
    const state: ProjectProduct["state"] = built
      ? "built"
      : row.source
        ? "build-gone"
        : !p.buildId
          ? "hand"
          : anyJob
            ? "unmatched"
            : "build-gone";
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      built,
      state,
      version: at ? { current: at.version, count } : null,
      dropped: at && at.version < count ? { lastIn: at.version, current: count } : null,
    };
  });
}

// ───────────────────────── versions ─────────────────────────

/** A build's pieces across every product, skipped ones left out. */
export function piecesOf(job: BuildJob): { ready: number; total: number; retry: boolean } {
  const live = allItems(job).filter((i) => i.status !== "skipped");
  const status = statusOf(job);
  return {
    ready: live.filter((i) => i.status === "ready").length,
    total: live.length,
    retry: status === "partial" || status === "failed",
  };
}

/** One product of one saved version, tied to the project row it is. */
export type VersionProduct = { rowId: string | null; productId: string; name: string };

/** One saved version of one lineage, with what it changed (COR-106). */
export type ProjectVersion = {
  chatId: string | null;
  /** The lineage's title, as lineagesOf() names it. */
  lineage: string;
  version: number;
  /** The lineage's newest saved version. */
  current: boolean;
  buildId: string;
  /** Null → "build not in this browser". */
  job: BuildJob | null;
  savedAt: number | null;
  /** "{ready} of {total} pieces ready", or "needs a retry" when `retry`. Null when the build is gone. */
  pieces: { ready: number; total: number; retry: boolean } | null;
  /** [] when the build is gone. */
  products: VersionProduct[];
  /** Against the version before: each entry is the product's row id when it
   *  has one, else its name. Null for version 1 (its `products` are listed),
   *  and when this or the version before is no longer in this browser. */
  diff: { added: string[]; dropped: string[]; changed: string[] } | null;
};

/** Ties a version's products to project rows by attach()'s rule: the row's
 *  own source, then a row of this lineage with the same product id, then the
 *  name among rows of this lineage or with no source. */
function tieRows(ref: BuildRef, job: BuildJob, lineageIds: ReadonlySet<string>, rows: ManualProduct[]): VersionProduct[] {
  const bps = productsOf(job);
  const rowOf = new Map<string, string>();
  const used = new Set<string>();
  const ofLineage = (r: ManualProduct) => !!r.source && lineageIds.has(r.source.buildId);
  const pass = (match: (r: ManualProduct, bp: BuildProduct) => boolean) => {
    for (const bp of bps) {
      if (rowOf.has(bp.id)) continue;
      const r = rows.find((x) => !used.has(x.id) && match(x, bp));
      if (r) {
        rowOf.set(bp.id, r.id);
        used.add(r.id);
      }
    }
  };
  pass((r, bp) => r.source?.buildId === ref.buildId && r.source.productId === bp.id);
  pass((r, bp) => ofLineage(r) && r.source?.productId === bp.id);
  pass((r, bp) => {
    if (r.source && !ofLineage(r)) return false;
    const want = norm(r.name);
    return !!want && (want === norm(modelNameOf(bp, job)) || want === norm(bp.title));
  });
  return bps.map((bp) => ({ rowId: rowOf.get(bp.id) ?? null, productId: bp.id, name: modelNameOf(bp, job) }));
}

function partsKey(parts: ConceptPart[] | undefined): string {
  return (parts ?? [])
    .map((x) => `${norm(unitName(x.name))}×${qtyOf(x.name)}`)
    .sort()
    .join("|");
}

function specKeyOf(spec: ResolvedSpec | undefined): string | null {
  if (!spec) return null;
  try {
    return specKey(spec);
  } catch {
    return null;
  }
}

/** A matched product changed when its name, its booked spec (as the maker
 *  decided it — specKey) or its parts (name and quantity) differ. A spec
 *  only one side has booked is not compared: an older build never had one. */
function productChanged(a: BuildProduct, aj: BuildJob, b: BuildProduct, bj: BuildJob): boolean {
  if (norm(modelNameOf(a, aj)) !== norm(modelNameOf(b, bj))) return true;
  const ka = specKeyOf(a.spec);
  const kb = specKeyOf(b.spec);
  if (ka !== null && kb !== null && ka !== kb) return true;
  return partsKey(a.parts) !== partsKey(b.parts);
}

/** What a version added, dropped and changed against the one before —
 *  matched as attach() matches: product id first, then normalized name. */
function diffOf(
  prevJob: BuildJob,
  prev: VersionProduct[],
  curJob: BuildJob,
  cur: VersionProduct[],
): { added: string[]; dropped: string[]; changed: string[] } {
  const prevBps = productsOf(prevJob);
  const curBps = productsOf(curJob);
  const label = (vp: VersionProduct) => vp.rowId ?? vp.name;
  const pairOf = new Map<number, number>(); // cur index → prev index
  const takenPrev = new Set<number>();
  const pass = (match: (c: number, q: number) => boolean) => {
    curBps.forEach((_, c) => {
      if (pairOf.has(c)) return;
      const q = prevBps.findIndex((__, k) => !takenPrev.has(k) && match(c, k));
      if (q >= 0) {
        pairOf.set(c, q);
        takenPrev.add(q);
      }
    });
  };
  pass((c, q) => curBps[c].id === prevBps[q].id);
  pass((c, q) => norm(cur[c].name) === norm(prev[q].name));
  const added = cur.filter((_, c) => !pairOf.has(c)).map(label);
  const dropped = prev.filter((_, q) => !takenPrev.has(q)).map(label);
  const changed = [...pairOf]
    .filter(([c, q]) => productChanged(prevBps[q], prevJob, curBps[c], curJob))
    .sort(([a], [b]) => a - b)
    .map(([c]) => label(cur[c]));
  return { added, dropped, changed };
}

/** The version history (COR-106), per lineage in lineagesOf() order, each
 *  lineage's versions newest first. Never capped — the Versions block shows
 *  five and a Show all (COR-107); the product page's select reads the same
 *  list (COR-41). */
export function versionsOf(refs: BuildRef[], lineages: Lineage[], rows: ManualProduct[]): ProjectVersion[][] {
  return lineages.map((l) => {
    const mine = refs.filter((r) => r.chatId === l.chatId).sort((a, b) => a.version - b.version);
    const ids = new Set(mine.map((r) => r.buildId));
    const top = mine.length ? mine[mine.length - 1].version : 0;
    const tied = mine.map((r) => (r.job ? tieRows(r, r.job, ids, rows) : []));
    const out = mine.map((r, i): ProjectVersion => {
      const before = i > 0 ? mine[i - 1] : null;
      return {
        chatId: r.chatId,
        lineage: l.title,
        version: r.version,
        current: r.version === top,
        buildId: r.buildId,
        job: r.job,
        savedAt: r.savedAt,
        pieces: r.job ? piecesOf(r.job) : null,
        products: tied[i],
        diff: before?.job && r.job ? diffOf(before.job, tied[i - 1], r.job, tied[i]) : null,
      };
    });
    return out.reverse();
  });
}

/** A newer build of a lineage that isn't saved anywhere yet (COR-18). */
export type PendingBuild = { chatId: string; job: BuildJob; version: number; status: BuildStatus };

/** Per lineage with a chat: its newest build with no project, made after the
 *  lineage's latest saved version — that version's build time, else its save
 *  time, else the newest build time the lineage still has. */
export function pendingVersionsOf(refs: BuildRef[], all: BuildJob[]): PendingBuild[] {
  const saved = new Set(refs.map((r) => r.buildId));
  const chatIds = [...new Set(refs.map((r) => r.chatId))].filter((c): c is string => c !== null);
  const out: PendingBuild[] = [];
  for (const chatId of chatIds) {
    const mine = refs.filter((r) => r.chatId === chatId);
    const latest = mine.reduce((a, b) => (b.version > a.version ? b : a));
    const known = mine.flatMap((r) => (r.job ? [r.job.createdAt] : []));
    const after = latest.job?.createdAt ?? latest.savedAt ?? (known.length ? Math.max(...known) : -Infinity);
    const next = all
      .filter((b) => b.chatId === chatId && !b.projectId && !saved.has(b.id) && b.createdAt > after)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (next) out.push({ chatId, job: next, version: latest.version + 1, status: statusOf(next) });
  }
  return out;
}

/** The project another build of this chat already became — the v2 target (COR-89). */
export function lineageProjectOf(job: BuildJob, all: BuildJob[], projects: ManualProject[]): ManualProject | null {
  const live = new Map(projects.map((p) => [p.id, p]));
  const sib = all
    .filter((b) => b.chatId === job.chatId && b.id !== job.id && b.projectId && live.has(b.projectId))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  return sib?.projectId ? (live.get(sib.projectId) ?? null) : null;
}

// ───────────────────────── log, cover, resume ─────────────────────────

/** The events that aren't versions — saves and builds are in versionsOf() (COR-52, COR-107). */
export type ProjectLogEntry =
  | { kind: "created"; at: number } // made by hand
  | { kind: "minted"; at: number; intent: Intent; network: Network }
  | { kind: "showcased"; at: number }; // while showcasedAt is a time

const LOG_RANK: Record<ProjectLogEntry["kind"], number> = { showcased: 2, minted: 1, created: 0 };

/** Newest first; at the same moment Showcased sits above Minted (the Brief's
 *  commit sets both at the mint time). A project a build created has no
 *  "created" entry — its first save is version 1. A Draft is never showcased. */
export function projectLogOf(p: ManualProject, brief: BriefState | null): ProjectLogEntry[] {
  const out: ProjectLogEntry[] = [];
  if (!p.buildId) out.push({ kind: "created", at: p.createdAt });
  const mintedAt = brief?.mintedAt ?? null;
  if (mintedAt !== null && brief?.intent) {
    out.push({ kind: "minted", at: mintedAt, intent: brief.intent, network: brief.network });
  }
  const minted = mintedAt !== null || p.status === "completed";
  if (minted && typeof p.showcasedAt === "number" && Number.isFinite(p.showcasedAt)) {
    out.push({ kind: "showcased", at: p.showcasedAt });
  }
  return out.sort((a, b) => b.at - a.at || LOG_RANK[b.kind] - LOG_RANK[a.kind]);
}

/** The project's cover (COR-96, CNT-14). The maker's pick first (`p.cover`,
 *  "Use as cover"), while it still names an image of one of this project's
 *  builds; once it's null, gone or imageless, the default: the newest saved
 *  version's primary image, else any product image, newest version first,
 *  else null. */
export function coverOf(p: ManualProject, refs: BuildRef[]): string | null {
  const pick = p.cover;
  if (pick) {
    const job = refs.find((r) => r.buildId === pick.buildId)?.job;
    const img = job ? productsOf(job).find((x) => x.id === pick.productId)?.conceptImageUrl : undefined;
    if (img) return img;
  }
  const when = (r: BuildRef) => r.savedAt ?? r.job?.createdAt ?? 0;
  const newest = refs.filter((r) => r.job).sort((a, b) => when(b) - when(a));
  const primary = newest[0]?.job?.conceptImageUrl;
  if (primary) return primary;
  for (const r of newest) {
    const img = r.job ? productsOf(r.job).find((x) => x.conceptImageUrl)?.conceptImageUrl : undefined;
    if (img) return img;
  }
  return null;
}

/** Open in editor's target: the editor step last opened, else PCB (COR-12,
 *  COR-64). The Brief is never it — the Brief has its own door in the header. */
export function resumeStepOf(p: ManualProject): ProjectStep {
  const step = p.lastOpened?.step;
  return step && step !== "brief" ? step : "pcb";
}

/** The concept a booked product was drawn from, as its chat still has it —
 *  the primary's by the turn that started this build, a companion's by its
 *  drawing. None once the chat is gone, and then nothing is compared.
 *  (Moved from project-details.tsx:524-542.) */
export function conceptOf(
  chat: ChatSession | null | undefined,
  build: BuildJob,
  product: BuildProduct,
): ConceptSummary | undefined {
  const primary = product.id === "primary";
  let drawn: ConceptSummary | undefined;
  for (const t of chat?.turns ?? []) {
    if (t.role !== "assistant" || t.status !== "ready" || !t.concept) continue;
    if (primary ? t.companionOf : t.companionOf !== product.id) continue;
    // Read back the way every other reader takes a stored concept: one an
    // older build of the app kept without its parts is no concept at all,
    // and comparing its parts would throw.
    if (primary && t.usedForBuild === build.id) return asConceptSummary(t.concept);
    // The latest drawing with this image, should a regenerate repeat one.
    if (product.conceptImageUrl && t.imageUrl === product.conceptImageUrl) drawn = asConceptSummary(t.concept);
  }
  return drawn;
}
```

- [ ] **Step 4: Run — expected PASS**

```bash
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test tests/projects/project-read.test.mjs
```
Expected tail:
```
# tests 48
# pass 48
# fail 0
```
Then run the whole folder, glob quoted as the harness notes require, and expect every file to pass:
```bash
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```

- [ ] **Step 5: Browser check** — none. This task adds no UI. The surfaces that print these reads get their browser checks in their own tasks.

- [ ] **Step 6: tsc + eslint + commit**

```bash
npx tsc --noEmit
npx eslint src/lib/manual/project-read.ts src/lib/create/history.tsx tests/projects/project-read.test.mjs tests/projects/fixtures/projects.mjs
```
Expected:
- `tsc`: no output.
- `eslint`: exactly **one** error, and it was already there: `history.tsx:825:5 react-hooks/set-state-in-effect`, the hydration effect's `setChats`, which read `:822` before this change added three comment lines. This task doesn't touch that effect. Every other file and line is clean.

```bash
git add src/lib/manual/project-read.ts src/lib/create/history.tsx \
  tests/projects/project-read.test.mjs tests/projects/fixtures/projects.mjs tests/projects/tsconfig.json
git commit -m "$(cat <<'MSG'
feat(projects): read every build, version and product behind a project

project-read.ts derives a project's builds (stored refs, then legacy links),
its lineages and version history (added, dropped and changed per version),
the Products list with dropped products kept and marked, pending versions,
the v2 target, the project log, the cover (the maker's pick first) and the
editor resume step. productsOf gives the primary its own description.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
)"
```

---

### Task A2b: `projectView()` — the one derivation the project page reads

**Depends on:** A2a, **A4a** (`src/lib/brief/project-brief.ts` and `src/lib/video/jobs.ts`) and **A3** (`src/lib/manual/project-summary.ts`). Run it after all three have landed, right after A3.

**Files:**
- **Modify:** `src/lib/manual/project-read.ts`, as A2a creates it:
  - its import block ends at line 24 (`import type { ManualProduct, … } from "./projects";`); add three imports after it;
  - append after the file's last line (470).
- **Test:** `tests/projects/project-view.test.mjs` (new). No tsconfig change: the new imports pull `project-summary.ts`, `project-brief.ts` and `video/jobs.ts` into the program.

**Interfaces**

Consumes (exact):
- **A3**, `./project-summary`:
  - `type ProjectSummary`
  - `projectSummary(p: ManualProject, ctx: { builds: BuildJob[]; brief: StoredDraft | null; videoJobs: ClipJob[]; now: number }): ProjectSummary`, where `ClipJob = { id: string; stage: string }`, which a `VideoJob` satisfies.
- **A4a**, `../brief/project-brief`:
  - `type StoredDraft = { state: BriefState; step: BriefStepId }`
  - `type ProjectCommerce`
  - `commerceOf(p: ManualProject, d: StoredDraft | null, jobs: VideoJob[], now: number): ProjectCommerce`
- **A4a**, `../video/jobs`: `type VideoJob`, moved there from `video-jobs-provider.tsx`, which re-exports it. The import is type-only, so no component file joins the program.

Produces:
```ts
export type ProjectView = {
  refs: BuildRef[]; lineages: Lineage[]; products: ProjectProduct[];
  versions: ProjectVersion[][];   // COR-106
  pending: PendingBuild[];        // = ReturnType<typeof pendingVersionsOf>
  log: ProjectLogEntry[];
  summary: ProjectSummary;        // §5.1.3
  commerce: ProjectCommerce;      // §5.1.4
};
export function projectView(p: ManualProject, ctx: {
  builds: BuildJob[]; chats: ChatSession[]; brief: StoredDraft | null; videoJobs: VideoJob[]; now: number;
}): ProjectView;
```

A3's `project-summary.ts` imports `buildsOf`, `productsOfProject`, `coverOf`, `pendingVersionsOf` and `resumeStepOf` from this module, and this module now imports `projectSummary` back. The cycle is safe, because each side calls the other only from inside a function, never while the module loads. It was verified under tsc's CommonJS output with node, and ES modules hoist function declarations. No ESLint rule in this repo flags import cycles.

- [ ] **Step 1: Write the failing test** — create `tests/projects/project-view.test.mjs`:
```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { commerceOf } from "../../.tmp-test/lib/brief/project-brief.js";
import { projectSummary } from "../../.tmp-test/lib/manual/project-summary.js";
import {
  buildsOf,
  coverOf,
  lineagesOf,
  pendingVersionsOf,
  productRowsOf,
  productsOfProject,
  projectLogOf,
  projectView,
  versionsOf,
} from "../../.tmp-test/lib/manual/project-read.js";
import { ALL, DAY, MINT, T, dropsOne, mintedSell } from "./fixtures/projects.mjs";

const NOW = T + 10 * DAY;
const ctxOf = (fx) => ({ builds: fx.builds, chats: fx.chats, brief: fx.draft, videoJobs: [], now: NOW });

describe("projectView (COR-74)", () => {
  for (const fx of ALL) {
    it(`derives every section from the one set of reads — ${fx.name}`, () => {
      const p = fx.project;
      const view = projectView(p, ctxOf(fx));
      const refs = buildsOf(p, fx.builds);
      const lineages = lineagesOf(refs, fx.chats);
      assert.deepEqual(view.refs, refs);
      assert.deepEqual(view.lineages, lineages);
      assert.deepEqual(view.products, productsOfProject(p, refs));
      assert.deepEqual(view.versions, versionsOf(refs, lineages, productRowsOf(p)));
      assert.deepEqual(view.pending, pendingVersionsOf(refs, fx.builds));
      assert.deepEqual(view.log, projectLogOf(p, fx.draft?.state ?? null));
      assert.deepEqual(view.summary, projectSummary(p, { builds: fx.builds, brief: fx.draft, videoJobs: [], now: NOW }));
      assert.deepEqual(view.commerce, commerceOf(p, fx.draft, [], NOW));
    });
    it(`gives the card the page's products and cover — ${fx.name}`, () => {
      const view = projectView(fx.project, ctxOf(fx));
      assert.deepEqual(
        view.summary.products,
        view.products.map(({ id, name, description }) => ({ id, name, description })),
      );
      assert.equal(view.summary.productCount, view.products.length);
      assert.equal(view.summary.cover, coverOf(fx.project, view.refs));
    });
  }
  it("keeps the dropped product on the card too (COR-42)", () => {
    const view = projectView(dropsOne.project, ctxOf(dropsOne));
    assert.deepEqual(
      view.summary.products.map((x) => x.name),
      ["RC Car Controller", "Remote Controller", "Battery Charger", "Spare Battery Pack"],
    );
  });
  it("reads a project minted to sell as Listed and showcased, from its draft and its record", () => {
    const view = projectView(mintedSell.project, ctxOf(mintedSell));
    assert.equal(view.summary.status, "listed");
    assert.deepEqual(view.summary.showcase, { at: MINT });
    assert.equal(view.commerce.outcome, "listed");
    assert.deepEqual(view.log.map((e) => e.kind), ["showcased", "minted"]);
  });
});
```

- [ ] **Step 2: Run it — expected FAIL**

```bash
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test tests/projects/project-view.test.mjs
```
Expected: `tsc` exits 0, then:
```
SyntaxError: Named export 'projectView' not found. The requested module '../../.tmp-test/lib/manual/project-read.js' is a CommonJS module, which may not support all module.exports as named exports.
```

- [ ] **Step 3: Implement**

In `src/lib/manual/project-read.ts`, after line 24:
```ts
import type { ManualProduct, ManualProject, ProjectBuildRef, ProjectStep } from "./projects";
```
add:
```ts
import { commerceOf, type ProjectCommerce, type StoredDraft } from "../brief/project-brief";
import type { VideoJob } from "../video/jobs";
// project-summary.ts reads this module too. The cycle is safe: neither side
// calls the other while the modules load, only from inside functions.
import { projectSummary, type ProjectSummary } from "./project-summary";
```
Then append at the end of the file:
```ts
// ───────────────────────── the page's one derivation ─────────────────────────

/** Everything the project page reads, derived once (COR-74). No section
 *  derives state on its own; the product page reads `products` and
 *  `versions` from the same object. */
export type ProjectView = {
  refs: BuildRef[];
  lineages: Lineage[];
  products: ProjectProduct[];
  /** COR-106 — the Versions block and the product page's version select. */
  versions: ProjectVersion[][];
  pending: PendingBuild[];
  log: ProjectLogEntry[];
  /** §5.1.3 — the same object the My projects card renders. */
  summary: ProjectSummary;
  /** §5.1.4 — the Outcome block. */
  commerce: ProjectCommerce;
};

export function projectView(
  p: ManualProject,
  ctx: { builds: BuildJob[]; chats: ChatSession[]; brief: StoredDraft | null; videoJobs: VideoJob[]; now: number },
): ProjectView {
  const refs = buildsOf(p, ctx.builds);
  const lineages = lineagesOf(refs, ctx.chats);
  return {
    refs,
    lineages,
    products: productsOfProject(p, refs),
    versions: versionsOf(refs, lineages, productRowsOf(p)),
    pending: pendingVersionsOf(refs, ctx.builds),
    log: projectLogOf(p, ctx.brief?.state ?? null),
    summary: projectSummary(p, { builds: ctx.builds, brief: ctx.brief, videoJobs: ctx.videoJobs, now: ctx.now }),
    commerce: commerceOf(p, ctx.brief, ctx.videoJobs, ctx.now),
  };
}
```

- [ ] **Step 4: Run — expected PASS**

```bash
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test tests/projects/project-view.test.mjs
```
Expected tail:
```
# tests 16
# pass 16
# fail 0
```
Then run `rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"`. Every file passes, `project-read.test.mjs` still at 48 of 48.

If a fixture fails only on `summary.products`, `productCount` or `cover`, then A3's summary and this page disagree about COR-42 or CNT-14. The Products list is `productsOfProject`, dropped rows included, and the cover is `coverOf`. Fix it at the source, not in this test.

- [ ] **Step 5: Browser check** — none. The page task renders `projectView()` and carries its own browser check.

- [ ] **Step 6: tsc + eslint + commit**

```bash
npx tsc --noEmit
npx eslint src/lib/manual/project-read.ts tests/projects/project-view.test.mjs
git add src/lib/manual/project-read.ts tests/projects/project-view.test.mjs
git commit -m "$(cat <<'MSG'
feat(projects): projectView, the one derivation the project page reads

Refs, lineages, products, versions, pending versions, the log, the shared
summary and the commerce facts, derived once from one set of reads.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
)"
```
Expected: `tsc` and `eslint` print nothing.
