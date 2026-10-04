### Task A4a: The Brief read and the Outcome — `src/lib/brief/project-brief.ts`

**Spec delta check (commit e599fcf, and its "Harness notes"):** applied. `showcasedAt` is a number / `null` / absent, and the one-time backfill for projects minted with Share to Innovations ticked is done here, at read time (COR-105, X37). The test command is the quoted glob. Every `src/lib/**` module this task writes or pulls into a test uses relative imports only. Tests import from `../../.tmp-test/lib/...`. The case A3 flagged is handled as `mintedUnreadable`: `status: "completed"` with a readable draft and `mintedAt: null` gives that outcome (see `commerceOf`'s rule order and the A4b agreement test).

**Requirements:**
- COM-1: one Brief read, `readBriefDraft` + `useProjectBrief`.
- COM-2: one commerce derivation, `commerceOf`.
- LST-61, the draft half: a corrupt draft reads as `null`, and the draft is re-read on `focus` and `storage`.
- COR-105, the read-time half: the one-time Showcase backfill, `showcaseBackfillOf` + `backfillShowcase`.
- The facts that COM-4, COM-5, COM-6, COM-7, COM-8, COM-9, COM-10, COM-13 and COM-15 print. The Outcome card itself is a rail task.

**Order:**
- Runs after A1, which brings `ManualProject.showcasedAt` and `tests/projects/tsconfig.json`.
- Runs before A3, which imports `StoredDraft` and `readBriefDraft`, and before A2's `projectView`, which imports `commerceOf` and `ProjectCommerce`.
- Task A4b, below, runs after A3.

**Files:**
- Create `src/lib/video/jobs.ts`. The preview-clip job model and its progress maths move here, verbatim from `video-jobs-provider.tsx:17-112`, so `commerceOf` (a lib module) never imports a component file.
- Modify `src/components/video-jobs/video-jobs-provider.tsx:11-112`. Replace the moved block with an import and a re-export; every importer is unchanged.
- Modify `src/lib/brief/types.ts:14-15`. Insert `ROYALTY_MIN` / `ROYALTY_MAX` after `BRIEF_DESC_MAX`.
- Modify `src/components/brief/step-3-mint.tsx`:
  - `:21-33`: import the two constants;
  - `:61-69`: delete the private copies.
- Modify `src/lib/manual/projects.tsx`:
  - `Ctx` `:173-194`: one member after `setStatus`, `:192`;
  - `:365-378`: one callback between `setStatus` and `clearActive`;
  - the value object `:390-403`.

  These line numbers are from today's file. A1 edits it first, so apply each change at its text anchor, given in Step 3e.
- Create `src/lib/brief/project-brief.ts`.
- Test: `tests/projects/project-brief.test.mjs` (new).

**Interfaces:**
- Consumes:
  - A1, `src/lib/manual/projects.tsx`: `ManualProject` with `showcasedAt?: number | null` (§5.1.1, COR-105), and `status: ManualProjectStatus`. Existing: `useManualProjects(): Ctx`, with `hydrated`, `projects`, and the `backfillShowcase` this task adds.
  - Existing, `src/lib/brief/types.ts`:
    - `briefDraftKey(scope: string): string`
    - `normalizeBrief(parsed: unknown): BriefState`
    - `normalizeStep(v: unknown): BriefStepId`
    - `NETWORKS`, `LICENSES`, and the types `BriefState`, `BriefStepId`, `Intent`, `Network`, `Token`, `License`
  - Existing (moved by this task): `progressOf(job: VideoJob | null, now?: number)` and `etaLabel(etaSec: number): string`.
  - A1's harness: `tests/projects/tsconfig.json`, which uses `rootDir ../../src`, `outDir ../../.tmp-test`, `jsx react-jsx` and `module commonjs`.
- Produces:
  ```ts
  // src/lib/brief/project-brief.ts
  export type StoredDraft = { state: BriefState; step: BriefStepId };
  export function parseBriefDraft(raw: string | null): StoredDraft | null;      // pure; corrupt → null
  export function readBriefDraft(projectId: string): StoredDraft | null;         // reads ideeza:brief:draft:<id>
  export function useProjectBrief(projectId: string): StoredDraft | null | undefined; // undefined = not read yet
  export function showcaseBackfillOf(p: ManualProject, d: StoredDraft | null): number | null;
  export type Outcome = "none" | "briefing" | "private" | "given" | "listed" | "mintedUnreadable";
  export type MintStatus = "notMinted" | "minted";
  export type SaleTerms =
    | { kind: "buyNow"; token: Token; price: string }
    | { kind: "auction"; token: Token; minBid: string; buyNow?: string; endsAt: number; ended: boolean };
  export type ProjectCommerce = { /* §5.1.4 verbatim; `step` is also set on "none" when a Brief was opened */ };
  export function commerceOf(p: ManualProject, d: StoredDraft | null, jobs: VideoJob[], now: number): ProjectCommerce;

  // src/lib/manual/projects.tsx — new Ctx member
  backfillShowcase: (id: string, at: number) => void;   // sets showcasedAt only while absent; never bumps updatedAt

  // src/lib/video/jobs.ts — moved, unchanged; also re-exported from video-jobs-provider.tsx
  export type VideoJobStage; export type VideoJob;
  export const STAGE_BUDGETS_SEC, STAGE_LABELS, STAGE_ORDER, TOTAL_RENDER_SECONDS, DEMO_SPEED;
  export function progressOf(job: VideoJob | null, now?: number): { total: number; stageElapsedSec: number; stageBudget: number; etaSec: number };
  export function etaLabel(etaSec: number): string;

  // src/lib/brief/types.ts
  export const ROYALTY_MIN = 2; export const ROYALTY_MAX = 10;
  ```
- Notes for other tasks:
  - The My projects task's draft pass must call `readBriefDraft(p.id)`. For each project where `showcaseBackfillOf(p, draft)` returns a number, it calls `backfillShowcase(p.id, at)`. That is the list half of COR-105's backfill; `useProjectBrief` does the page half.
  - `commerceOf` takes `jobs: VideoJob[]`. `projectView()` (A2) passes the `useVideoJobs().jobs` it already has. A3's structural `ClipJob` can stay as it is; `VideoJob` is now importable from `src/lib/video/jobs.ts` without touching a component file.
  - "Is it live?" There is no `live` field, and there must not be one. The Brief's "live" means "minted, and no clip still rendering". The page reads that as `mint === "minted"` plus `clip.state`. It never says "live", because nothing is on a marketplace or on Innovations (CNT-41, COM-12).

**Decisions (each stated once, so the reviewer can object):**
1. **Where `step` appears.** §5.1.4 says `step` is present "when outcome === briefing". This task also sets it on `"none"` when a Brief was opened with no intent. That is the only way the Outcome card can tell COM-4's two sublines apart:
   - "Nothing decided yet…" when there is no draft;
   - "The Brief is open — no outcome chosen yet." when there is an opened draft.

   `step` stays absent when there is no draft.
2. **Rule order.** The rules run in this order:
   1. a mint in the draft;
   2. `status: "completed"` → `mintedUnreadable`;
   3. an intent → `briefing`;
   4. otherwise `none`.

   Putting rule 2 before rule 3 is what makes `commerceOf` agree with §5.1.3's `projectStatus()`, which reads a completed project with no mint in its draft as "minted". `mintedUnreadable` returns no intent and no clip: nothing from a record without the mint is claimed (COM-15).
3. **A minted draft with an unreadable intent** reads as `private`. That is `projectStatus()`'s rule, mirrored so the two agree, and the agreement test covers it.
4. **Terms are returned only when they are ones the form accepts.** The price, minimum bid and buy-now must be positive amounts (the form's `isAmount`). An auction needs a readable end. Royalties must be within `ROYALTY_MIN`–`ROYALTY_MAX`. Otherwise the fact is absent rather than wrong. The royalty bounds move to `types.ts`, so the form and this read share one rule.
5. **The backfill never bumps `updatedAt`.** Going through `updateProject` would stamp `updatedAt = now` on every old showcased project at its first read. My projects' "Recently updated" order would then reshuffle with no maker action. So `backfillShowcase` is its own writer: idempotent, a no-op once `showcasedAt` is recorded either way, and returning the same array so nothing re-saves.
6. **`useProjectBrief` uses `useSyncExternalStore`, not an effect with `setState`.** This is the repo's pattern for client-only values (`step-3-mint.tsx:145-159`, `parts-library.tsx:423-425`). The raw string is the snapshot. The server snapshot is `undefined`, so "undefined until read" holds on the server and on the hydrating render. The draft is re-read on `storage` and `focus` (LST-61). There is no `react-hooks/set-state-in-effect` exposure.

- [ ] **Step 1: Write the failing test**

`tests/projects/project-brief.test.mjs`:
```js
// Task A4a — the Brief read and the Outcome (spec §5.1.4, COM-1, COM-2).
import { test } from "node:test";
import assert from "node:assert/strict";

const { parseBriefDraft, readBriefDraft, commerceOf, showcaseBackfillOf } = await import(
  "../../.tmp-test/lib/brief/project-brief.js"
);
const { briefDraftKey } = await import("../../.tmp-test/lib/brief/types.js");

const NOW = Date.UTC(2026, 8, 26, 12, 0);
const MINTED = Date.UTC(2026, 8, 22, 21, 9);

const project = (over = {}) => ({
  id: "proj_a",
  slug: "garden-sensors",
  name: "Garden sensors",
  productName: "Soil probe",
  description: "",
  status: "draft",
  createdAt: 1,
  updatedAt: 1,
  flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
  ...over,
});
/** A draft as the Brief stores it, read back through the one parser. */
const draft = (state, step = "form") => parseBriefDraft(JSON.stringify({ state, step }));
const job = (over = {}) => ({
  id: "vj_1",
  title: "Soil probe",
  prompt: "",
  quality: "low",
  stage: "rendering",
  startedAt: NOW,
  stageStartedAt: NOW,
  emailReminder: null,
  browserNotify: false,
  acknowledged: false,
  minted: true,
  ...over,
});
const NONE = { state: "none" };

test("parseBriefDraft: no draft, and every corrupt draft, reads as null", () => {
  const corrupt = [
    null,
    "",
    "{not json",
    "null",
    "42",
    "[]",
    JSON.stringify({ step: "form" }),
    JSON.stringify({ state: "sell", step: "form" }),
    JSON.stringify({ state: [1, 2], step: "form" }),
  ];
  for (const raw of corrupt) assert.equal(parseBriefDraft(raw), null, String(raw));
});

test("parseBriefDraft runs normalizeBrief and normalizeStep, so an older draft reads on today's model", () => {
  const d = parseBriefDraft(
    JSON.stringify({
      state: { intent: "sell", network: "polygon", token: "ETH", royalties: 0, mintedAt: MINTED },
      step: 3,
    }),
  );
  assert.equal(d.step, "form"); // a draft from before the steps had names stored 1–4
  assert.equal(d.state.network, "mumbai"); // the testnet migration
  assert.equal(d.state.token, "MATIC"); // ETH isn't carried on Mumbai
  assert.equal(d.state.royalties, ""); // an old 0 meant "nothing typed"
  assert.equal(d.state.mintedAt, MINTED);
  assert.equal(d.state.shareToNewsfeed, false); // defaults fill what the draft never had
  assert.equal(parseBriefDraft(JSON.stringify({ state: {}, step: "nope" })).step, "idea");
});

test("readBriefDraft reads the project's own key; no browser, or a throwing storage, reads as null", () => {
  assert.equal(readBriefDraft("proj_a"), null); // node has no window
  assert.equal(briefDraftKey("proj_a"), "ideeza:brief:draft:proj_a");
  const store = new Map([
    ["ideeza:brief:draft:proj_a", JSON.stringify({ state: { intent: "give" }, step: "idea" })],
  ]);
  globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null } };
  try {
    assert.equal(readBriefDraft("proj_a").state.intent, "give");
    assert.equal(readBriefDraft("proj_a").step, "idea");
    assert.equal(readBriefDraft("proj_b"), null);
    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
      },
    };
    assert.equal(readBriefDraft("proj_a"), null);
  } finally {
    delete globalThis.window;
  }
});

test("commerceOf: no draft → none, no step (COM-4, first subline)", () => {
  assert.deepEqual(commerceOf(project(), null, [], NOW), {
    outcome: "none",
    intent: null,
    mint: "notMinted",
    clip: NONE,
  });
});

test("commerceOf: a Brief opened with no outcome chosen → none, with its step (COM-4, second subline)", () => {
  assert.deepEqual(commerceOf(project(), draft({}, "idea"), [], NOW), {
    outcome: "none",
    intent: null,
    step: "idea",
    mint: "notMinted",
    clip: NONE,
  });
});

test("commerceOf: an unminted intent → briefing, and typed terms are not returned (COM-5)", () => {
  const d = draft({ intent: "give", license: "mit", collection: "Garden Sensors", network: "mumbai", price: "0.05" });
  assert.deepEqual(commerceOf(project(), d, [], NOW), {
    outcome: "briefing",
    intent: "give",
    step: "form",
    mint: "notMinted",
    clip: NONE,
  });
});

test("commerceOf: minted save → private, with the minted facts and no sale or licence terms", () => {
  const d = draft(
    { intent: "save", mintedAt: MINTED, collection: "  Garden Sensors ", price: "0.05", license: "mit" },
    "success",
  );
  assert.deepEqual(commerceOf(project({ status: "completed" }), d, [], NOW), {
    outcome: "private",
    intent: "save",
    mint: "minted",
    mintedAt: MINTED,
    network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
    collection: "Garden Sensors",
    clip: NONE,
  });
});

test("commerceOf: minted give → given, with the licence and its one-line terms (COM-10)", () => {
  const d = draft({ intent: "give", mintedAt: MINTED, network: "mumbai", license: "mit", price: "0.05" }, "success");
  assert.deepEqual(commerceOf(project({ status: "completed" }), d, [], NOW), {
    outcome: "given",
    intent: "give",
    mint: "minted",
    mintedAt: MINTED,
    network: { id: "mumbai", label: "Mumbai Testnet (Polygon)" },
    license: { id: "mit", label: "MIT License", info: "Permissive; keep the notice, no warranty." },
    clip: NONE,
  });
});

test("commerceOf: minted sell at a fixed price → listed, with its price, token and royalties (COM-9)", () => {
  const d = draft(
    { intent: "sell", mintedAt: MINTED, listingType: "buyNow", token: "USDC", price: " 0.05 ", royalties: "10", collection: "Garden Sensors" },
    "success",
  );
  assert.deepEqual(commerceOf(project({ status: "completed" }), d, [], NOW), {
    outcome: "listed",
    intent: "sell",
    mint: "minted",
    mintedAt: MINTED,
    network: { id: "baseSepolia", label: "Base Sepolia (Testnet)" },
    collection: "Garden Sensors",
    sale: { kind: "buyNow", token: "USDC", price: "0.05" },
    royaltiesPct: 10,
    clip: NONE,
  });
});

test("commerceOf: a listing's price is returned only when one is set", () => {
  for (const price of ["", "   ", "0", "abc"]) {
    const c = commerceOf(project(), draft({ intent: "sell", mintedAt: MINTED, price }), [], NOW);
    assert.equal(c.outcome, "listed");
    assert.equal("sale" in c, false, JSON.stringify(price));
  }
});

test("commerceOf: an auction carries its bids and end, and says when the end has passed (COM-9)", () => {
  const endsAt = new Date("2026-10-03T14:30").getTime(); // datetime-local: local wall-clock time
  const d = draft({
    intent: "sell",
    mintedAt: MINTED,
    listingType: "auction",
    minBid: "0.02",
    auctionBuyNow: "0.10",
    expiresAt: "2026-10-03T14:30",
    royalties: "2.5",
  });
  const before = commerceOf(project(), d, [], endsAt - 1);
  assert.deepEqual(before.sale, { kind: "auction", token: "ETH", minBid: "0.02", buyNow: "0.10", endsAt, ended: false });
  assert.equal(before.royaltiesPct, 2.5);
  assert.equal(commerceOf(project(), d, [], endsAt).sale.ended, true);

  const noBuyNow = draft({ intent: "sell", mintedAt: MINTED, listingType: "auction", minBid: "0.02", expiresAt: "2026-10-03T14:30" });
  assert.equal("buyNow" in commerceOf(project(), noBuyNow, [], NOW).sale, false);

  const noEnd = draft({ intent: "sell", mintedAt: MINTED, listingType: "auction", minBid: "0.02", expiresAt: "" });
  assert.equal("sale" in commerceOf(project(), noEnd, [], NOW), false);
});

test("commerceOf: royalties outside the form's range are not shown", () => {
  for (const royalties of ["15", "1", "", "ten"]) {
    const c = commerceOf(project(), draft({ intent: "sell", mintedAt: MINTED, price: "1", royalties }), [], NOW);
    assert.equal("royaltiesPct" in c, false, royalties);
  }
});

test("commerceOf: completed with no mint in the draft → mintedUnreadable, claiming nothing else (COM-15)", () => {
  const expected = { outcome: "mintedUnreadable", intent: null, mint: "minted", clip: NONE };
  assert.deepEqual(commerceOf(project({ status: "completed" }), null, [], NOW), expected);
  const reopened = draft({ intent: "sell", videoJobId: "vj_1" }, "preview");
  assert.deepEqual(commerceOf(project({ status: "completed" }), reopened, [job()], NOW), expected);
});

test("commerceOf: the preview clip, from the render store (COM-13)", () => {
  const minted = draft({ intent: "save", mintedAt: MINTED, videoJobId: "vj_1" }, "success");
  const clip = (jobs, now = NOW) => commerceOf(project(), minted, jobs, now).clip;
  assert.deepEqual(clip([job()]), { state: "rendering", progress: 0, eta: "under a minute" });
  // 15 s in at the demo speed (×40) is 600 of the 1,200 budgeted seconds.
  assert.deepEqual(clip([job({ startedAt: NOW - 15_000, stageStartedAt: NOW - 15_000 })]), {
    state: "rendering",
    progress: 50,
    eta: "under a minute",
  });
  assert.deepEqual(clip([job({ stage: "done" })]), { state: "ready" });
  assert.deepEqual(clip([job({ stage: "failed" })]), { state: "failed" });
  assert.deepEqual(clip([job({ id: "vj_other" })]), NONE); // a job the store no longer has
  assert.deepEqual(commerceOf(project(), draft({ intent: "save", mintedAt: MINTED }), [job()], NOW).clip, NONE);
});

test("showcaseBackfillOf: an older mint with Share to Innovations gets the mint time once; null is never overwritten", () => {
  const ticked = draft({ intent: "save", mintedAt: MINTED, shareToNewsfeed: true }, "success");
  assert.equal(showcaseBackfillOf(project({ status: "completed" }), ticked), MINTED);
  assert.equal(showcaseBackfillOf(project({ status: "completed", showcasedAt: null }), ticked), null);
  assert.equal(showcaseBackfillOf(project({ status: "completed", showcasedAt: NOW }), ticked), null);
  const unticked = draft({ intent: "save", mintedAt: MINTED, shareToNewsfeed: false }, "success");
  assert.equal(showcaseBackfillOf(project({ status: "completed" }), unticked), null);
  assert.equal(showcaseBackfillOf(project(), draft({ intent: "save", shareToNewsfeed: true })), null); // not minted
  assert.equal(showcaseBackfillOf(project({ status: "completed" }), null), null);
});
```

- [ ] **Step 2: Run it — expected FAIL**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/project-brief.test.mjs"
```
Expected: tsc passes, because nothing new is compiled yet. Node then fails the file with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/brief/project-brief.js' imported from …/tests/projects/project-brief.test.mjs
```

- [ ] **Step 3: Implement**

**3a. Create `src/lib/video/jobs.ts`.** Everything below the header comment is `video-jobs-provider.tsx:17-112` verbatim. The one change: `const DEMO_SPEED` becomes `export const DEMO_SPEED`, because the provider's ticker still reads it.
```ts
// The preview-clip job: its model and its progress maths. Pure — no React, no
// storage — so everything that turns a job into "{n} %, about {eta} left" does
// it with the same numbers: the Brief's render step, the global indicator, and
// the project page's Outcome read (`commerceOf`, COM-13), which a node test
// runs. The store and the ticker stay in
// `components/video-jobs/video-jobs-provider.tsx`, which re-exports all of
// this, so its importers are unchanged.

export type VideoJobStage =
  | "queued"
  | "drafting"
  | "rendering"
  | "audio"
  | "encoding"
  | "done"
  | "failed";

export type VideoJob = {
  id: string;
  title: string;
  prompt: string;
  quality: "low" | "high";
  stage: VideoJobStage;
  startedAt: number;
  stageStartedAt: number;
  emailReminder: string | null;
  browserNotify: boolean;
  acknowledged: boolean;
  // True once the brief that owns this job completes its mint step. Once
  // minted, the user's regenerate flow takes a different path: in-place modal
  // (no /brief navigation) since the brief is "done" and they're just swapping
  // the listing's video.
  minted: boolean;
};

export const STAGE_BUDGETS_SEC: Record<
  Exclude<VideoJobStage, "done" | "failed">,
  number
> = {
  queued: 30,
  drafting: 90,
  rendering: 600,
  audio: 300,
  encoding: 180,
};

export const STAGE_LABELS: Record<VideoJobStage, string> = {
  queued: "Queued",
  drafting: "Drafting visual sequences",
  rendering: "Rendering frames",
  audio: "Synthesizing audio",
  encoding: "Encoding & finalising",
  done: "Ready",
  failed: "Failed",
};

export const STAGE_ORDER: VideoJobStage[] = [
  "queued",
  "drafting",
  "rendering",
  "audio",
  "encoding",
];

export const TOTAL_RENDER_SECONDS = Object.values(STAGE_BUDGETS_SEC).reduce(
  (a, b) => a + b,
  0,
);

// Demo speed: scales the 20-min flow to ~30s. Set to 1 for real backend.
export const DEMO_SPEED = 40;

export function progressOf(
  job: VideoJob | null,
  now: number = Date.now(),
): {
  total: number;
  stageElapsedSec: number;
  stageBudget: number;
  etaSec: number;
} {
  if (!job || job.stage === "done")
    return { total: 100, stageElapsedSec: 0, stageBudget: 1, etaSec: 0 };
  if (job.stage === "failed")
    return { total: 0, stageElapsedSec: 0, stageBudget: 1, etaSec: 0 };
  const elapsedSec = ((now - job.startedAt) / 1000) * DEMO_SPEED;
  const total = Math.min(99, (elapsedSec / TOTAL_RENDER_SECONDS) * 100);
  const stageBudget = STAGE_BUDGETS_SEC[job.stage];
  const stageElapsedSec = Math.min(
    stageBudget,
    ((now - job.stageStartedAt) / 1000) * DEMO_SPEED,
  );
  // Wall-clock seconds, which is what a reader waits in. The budgets are in
  // the full-length flow's seconds, so the remainder has to come back down
  // through the demo speed — without it a 30-second render said "18 min left".
  const etaSec = Math.max(0, (TOTAL_RENDER_SECONDS - elapsedSec) / DEMO_SPEED);
  return { total, stageElapsedSec, stageBudget, etaSec };
}

/** "under a minute", "about 3 min" — the time left, in words. */
export function etaLabel(etaSec: number): string {
  if (etaSec < 60) return "under a minute";
  return `about ${Math.ceil(etaSec / 60)} min`;
}
```

**3b. `src/components/video-jobs/video-jobs-provider.tsx`.** Replace lines 11–112 with the block below. Line 11 is `// The ticker advances stages on a fixed 500ms cadence. A demo speed multiplier`. Lines 17–112 run from `export type VideoJobStage =` to the closing `}` of `etaLabel`, and are exactly the code 3a moved. Lines 1–10 and everything from `type Ctx = {` (today :114) on are unchanged. The provider still uses `DEMO_SPEED`, `STAGE_BUDGETS_SEC`, `STAGE_ORDER`, `VideoJob` and `VideoJobStage` locally. `step-2-video.tsx`, `step-4-success.tsx`, `regenerate-flow.tsx` and `global-render-indicator.tsx` keep importing `progressOf`, `etaLabel`, `STAGE_LABELS`, `STAGE_ORDER` and `VideoJob` from here, through the re-export.
```tsx
// The ticker advances stages on a fixed 500ms cadence. A demo speed multiplier
// turns the production budget (20 min) into a ~30-second demo for testing —
// flip `DEMO_SPEED` (in `lib/video/jobs`) to 1 for real backend integration.

import * as React from "react";
// The job model and its progress maths live in `lib/video/jobs` — pure, so the
// project page's Outcome read computes the same progress this ticker drives.
// Re-exported here, so every `video-jobs-provider` import keeps working.
import {
  DEMO_SPEED,
  STAGE_BUDGETS_SEC,
  STAGE_ORDER,
  type VideoJob,
  type VideoJobStage,
} from "@/lib/video/jobs";

export {
  STAGE_BUDGETS_SEC,
  STAGE_LABELS,
  STAGE_ORDER,
  TOTAL_RENDER_SECONDS,
  etaLabel,
  progressOf,
  type VideoJob,
  type VideoJobStage,
} from "@/lib/video/jobs";
```

**3c. `src/lib/brief/types.ts`.** After line 15 (`export const BRIEF_DESC_MAX = 140;`), insert:
```ts

/**
 * What a royalty may be, in one place: the form's hint, its validation, the
 * reason under its CTA and the project page's Outcome read all use these, so
 * none of them can disagree the way the hint ("2 – 100"), the placeholder
 * ("Maximum is 10%") and the clamp (100) once did. One decimal place, because
 * 2.5% is a rate makers really set.
 */
export const ROYALTY_MIN = 2;
export const ROYALTY_MAX = 10;
```

**3d. `src/components/brief/step-3-mint.tsx`.**
Lines 21–33 today:
```ts
import {
  BRIEF_FORM_LABEL,
  LICENSES,
  LISTING_TYPES,
  NETWORKS,
  TOKENS_BY_NETWORK,
  stepsFor,
  type BriefState,
  type Intent,
  type License,
  type Network,
  type Token,
} from "@/lib/brief/types";
```
become:
```ts
import {
  BRIEF_FORM_LABEL,
  LICENSES,
  LISTING_TYPES,
  NETWORKS,
  ROYALTY_MAX,
  ROYALTY_MIN,
  TOKENS_BY_NETWORK,
  stepsFor,
  type BriefState,
  type Intent,
  type License,
  type Network,
  type Token,
} from "@/lib/brief/types";
```
Delete lines 61–69 (the doc comment, the two constants and the blank line after them); the comment now lives beside the constants in `types.ts`:
```ts
/**
 * What a royalty may be, in one place: the field's hint, its validation and the
 * reason under the CTA all read these, so the three can't disagree the way the
 * hint ("2 – 100"), the placeholder ("Maximum is 10%") and the clamp (100) did.
 * One decimal place, because 2.5% is a rate makers really set.
 */
const ROYALTY_MIN = 2;
const ROYALTY_MAX = 10;

```
Every other use (`:183-184`, `:783`) is unchanged: it reads the imported names.

**3e. `src/lib/manual/projects.tsx` — the backfill writer.** Apply these three edits at their text anchors.

In `type Ctx`, directly after the line `  setStatus: (id: string, status: ManualProjectStatus) => void;`, insert:
```ts
  /** COR-105's one-time backfill: a project minted with Share to Innovations
   *  before Showcase shipped gets `showcasedAt = at` — only while it has none
   *  recorded (absent), so a `null` "stopped showcasing" is never overwritten.
   *  Never bumps `updatedAt`: it records an old fact, not a change the maker
   *  made. Called with `showcaseBackfillOf()`'s answer (lib/brief/project-brief). */
  backfillShowcase: (id: string, at: number) => void;
```
Directly after the `setStatus` callback, which ends in `    [],\n  );` just before `const clearActive = React.useCallback(() => {`, insert:
```ts

  const backfillShowcase = React.useCallback((id: string, at: number) => {
    if (!Number.isFinite(at)) return;
    setProjects((arr) => {
      const i = arr.findIndex((p) => p.id === id && p.showcasedAt === undefined);
      if (i < 0) return arr; // already recorded, either way: nothing to write, no save
      const next = arr.slice();
      next[i] = { ...arr[i], showcasedAt: at };
      return next;
    });
  }, []);
```
In `const value: Ctx = { … }`, directly after `    setStatus,`, insert:
```ts
    backfillShowcase,
```

**3f. Create `src/lib/brief/project-brief.ts`:**
```ts
// A project's Brief, read — the one parse of `ideeza:brief:draft:<id>` (COM-1)
// and the one derivation of what became of the project (COM-2).
//
// My projects and the project page read a project's Brief through here and
// nowhere else, so the two can't disagree about a draft: the same JSON.parse,
// the same `normalizeBrief` / `normalizeStep` migration, the same "a corrupt
// draft reads as null". `commerceOf` is pure: the Outcome card, the status
// line and the unit tests get the same facts from the same inputs.
//
// Nothing here says "live". The Brief's own word for "minted, and no clip still
// rendering" is live; the project page states those two facts (`mint`,
// `clip`) instead, because nothing is on a marketplace or on Innovations yet
// (CNT-41, COM-12).
//
// Imports are relative, like `lib/create/history.tsx` and `lib/spec/*`, so the
// node test build resolves them without the `@/` alias.

import * as React from "react";
import {
  LICENSES,
  NETWORKS,
  ROYALTY_MAX,
  ROYALTY_MIN,
  briefDraftKey,
  normalizeBrief,
  normalizeStep,
  type BriefState,
  type BriefStepId,
  type Intent,
  type License,
  type Network,
  type Token,
} from "./types";
import { useManualProjects, type ManualProject } from "../manual/projects";
import { etaLabel, progressOf, type VideoJob } from "../video/jobs";

// ── The read ─────────────────────────────────────────────────────────────────

/** A project's stored Brief, as the Brief writes it: `ideeza:brief:draft:<projectId>`. */
export type StoredDraft = { state: BriefState; step: BriefStepId };

const isDict = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/**
 * One stored draft, parsed. Pure. No draft, JSON that doesn't parse, or a
 * record whose `state` isn't an object → `null`: a corrupt draft is unreadable,
 * never a default draft. Otherwise the state runs through `normalizeBrief` and
 * the step through `normalizeStep`, so an older draft reads on today's model.
 */
export function parseBriefDraft(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isDict(parsed) || !isDict(parsed.state)) return null;
  return { state: normalizeBrief(parsed.state), step: normalizeStep(parsed.step) };
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The project's draft, read now. Outside a browser, or when storage throws → `null`. */
export function readBriefDraft(projectId: string): StoredDraft | null {
  return parseBriefDraft(readRaw(briefDraftKey(projectId)));
}

/**
 * COR-105's one-time backfill. A project minted with "Share to Innovations"
 * ticked before Showcase shipped has no `showcasedAt`; its first read gives it
 * the mint time. Returns that time, or `null` when nothing is to be written:
 * a time already set, a `null` (the maker stopped showcasing — never
 * overwritten), an unminted draft, or no tick. After this, nothing reads
 * `shareToNewsfeed` to decide Showcase.
 */
export function showcaseBackfillOf(p: ManualProject, d: StoredDraft | null): number | null {
  if (p.showcasedAt !== undefined) return null;
  const s = d?.state;
  return s && s.mintedAt !== null && s.shareToNewsfeed ? s.mintedAt : null;
}

/**
 * The project's draft, for a component (COM-1): `undefined` until this
 * browser's storage has been read — on the server and on the hydrating render —
 * then the draft or `null`. It is read through `useSyncExternalStore`, the
 * repo's way to read a client-only value (step-3-mint's clock, parts-library):
 * the raw string is the snapshot, so an unchanged draft never re-renders, and
 * a mint in another tab (`storage`) or on coming back to this one (`focus`)
 * shows without polling (LST-61).
 *
 * It also runs the Showcase backfill above, once the projects store has
 * hydrated, through `backfillShowcase` (which never bumps `updatedAt`).
 */
export function useProjectBrief(projectId: string): StoredDraft | null | undefined {
  const key = briefDraftKey(projectId);
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener("focus", onChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("focus", onChange);
      };
    },
    [key],
  );
  const raw = React.useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => readRaw(key),
    () => undefined,
  );
  const draft = React.useMemo(
    () => (raw === undefined ? undefined : parseBriefDraft(raw)),
    [raw],
  );

  const { hydrated, projects, backfillShowcase } = useManualProjects();
  const project = hydrated ? projects.find((p) => p.id === projectId) : undefined;
  const backfill = project && draft !== undefined ? showcaseBackfillOf(project, draft) : null;
  React.useEffect(() => {
    if (backfill !== null) backfillShowcase(projectId, backfill);
  }, [backfill, backfillShowcase, projectId]);

  return draft;
}

// ── The Outcome ──────────────────────────────────────────────────────────────

export type Outcome =
  | "none" | "briefing" | "private" | "given" | "listed"
  | "mintedUnreadable";                                                  // status completed, no mint in the draft
export type MintStatus = "notMinted" | "minted";                         // LATER: "lazyMinted" | "mintedOnChain"
export type SaleTerms =
  | { kind: "buyNow"; token: Token; price: string }
  | { kind: "auction"; token: Token; minBid: string; buyNow?: string; endsAt: number; ended: boolean };

export type ProjectCommerce = {
  outcome: Outcome;
  intent: Intent | null;
  /** The step an unminted draft is at: set on "briefing", and on "none" when a
   *  Brief was opened with no outcome chosen — which is how the Outcome card
   *  tells COM-4's two sublines apart (absent = no draft at all). */
  step?: BriefStepId;
  mint: MintStatus;
  mintedAt?: number;
  network?: { id: Network; label: string };  // the NETWORKS label, e.g. "Base Sepolia (Testnet)"
  collection?: string;
  sale?: SaleTerms;                          // sell + minted only, and only when its amounts are set
  royaltiesPct?: number;                     // sell only, ROYALTY_MIN–ROYALTY_MAX
  license?: { id: License; label: string; info: string };   // give only
  // No Innovations field: Showcase is the project's own flag (summary.showcase, COR-105), not a Brief term.
  clip: { state: "none" | "rendering" | "ready" | "failed"; progress?: number; eta?: string };
};

/** A positive amount as it was typed, trimmed — the form's own test (`isAmount`, step-3-mint) — or null. */
function amountOf(v: string): string | null {
  const t = v.trim();
  return t && Number(t) > 0 ? t : null;
}

/** The terms a minted sale was listed with; undefined when its amounts were never set. */
function saleOf(s: BriefState, now: number): SaleTerms | undefined {
  if (s.listingType === "auction") {
    const minBid = amountOf(s.minBid);
    // A datetime-local value: local wall-clock time, read the way the form reads it.
    const endsAt = new Date(s.expiresAt).getTime();
    if (!minBid || !Number.isFinite(endsAt)) return undefined;
    const buyNow = amountOf(s.auctionBuyNow);
    return {
      kind: "auction",
      token: s.token,
      minBid,
      ...(buyNow ? { buyNow } : null),
      endsAt,
      ended: now >= endsAt,
    };
  }
  const price = amountOf(s.price);
  return price ? { kind: "buyNow", token: s.token, price } : undefined;
}

/** The royalty rate, when it is one the form accepts. */
function royaltiesOf(v: string): number | undefined {
  const t = v.trim();
  const n = t ? Number(t) : NaN;
  return Number.isFinite(n) && n >= ROYALTY_MIN && n <= ROYALTY_MAX ? n : undefined;
}

/** The preview clip the draft started, as the render store has it now (COM-13). */
function clipOf(jobId: string | null, jobs: VideoJob[], now: number): ProjectCommerce["clip"] {
  const job = jobId ? jobs.find((j) => j.id === jobId) : undefined;
  if (!job) return { state: "none" };
  if (job.stage === "done") return { state: "ready" };
  if (job.stage === "failed") return { state: "failed" };
  const { total, etaSec } = progressOf(job, now);
  return { state: "rendering", progress: Math.round(total), eta: etaLabel(etaSec) };
}

/**
 * What became of the project, and every fact the Outcome card shows (COM-2).
 * Pure. The first rule that matches wins:
 * - the draft holds a mint → "listed" / "given" / "private" by its intent, with
 *   the minted facts: network, collection, and the terms of that intent only;
 * - the project is "completed" with no mint in its draft (missing, corrupt, or
 *   re-seeded) → "mintedUnreadable": minted, and nothing else is claimed (COM-15);
 * - a draft with an intent → "briefing", with its step; typed but uncommitted
 *   terms are not returned (COM-5);
 * - otherwise → "none" (with `step` when a Brief was opened).
 * `projectStatus()` maps none|briefing → draft and mintedUnreadable → minted;
 * a test asserts the two agree.
 */
export function commerceOf(
  p: ManualProject,
  d: StoredDraft | null,
  jobs: VideoJob[],
  now: number,
): ProjectCommerce {
  const s = d?.state ?? null;
  if (s && s.mintedAt !== null) {
    // An unreadable intent on a minted draft reads as private — projectStatus()'s rule.
    const outcome: Outcome =
      s.intent === "sell" ? "listed" : s.intent === "give" ? "given" : "private";
    const network = NETWORKS.find((n) => n.value === s.network);
    const collection = s.collection.trim();
    const sale = outcome === "listed" ? saleOf(s, now) : undefined;
    const royaltiesPct = outcome === "listed" ? royaltiesOf(s.royalties) : undefined;
    const license = outcome === "given" ? LICENSES.find((l) => l.value === s.license) : undefined;
    return {
      outcome,
      intent: s.intent,
      mint: "minted",
      mintedAt: s.mintedAt,
      ...(network ? { network: { id: network.value, label: network.label } } : null),
      ...(collection ? { collection } : null),
      ...(sale ? { sale } : null),
      ...(royaltiesPct !== undefined ? { royaltiesPct } : null),
      ...(license ? { license: { id: license.value, label: license.label, info: license.info } } : null),
      clip: clipOf(s.videoJobId, jobs, now),
    };
  }
  if (p.status === "completed") {
    return { outcome: "mintedUnreadable", intent: null, mint: "minted", clip: { state: "none" } };
  }
  if (!d) return { outcome: "none", intent: null, mint: "notMinted", clip: { state: "none" } };
  return {
    outcome: d.state.intent ? "briefing" : "none",
    intent: d.state.intent,
    step: d.step,
    mint: "notMinted",
    clip: clipOf(d.state.videoJobId, jobs, now),
  };
}
```

- [ ] **Step 4: Run — expected PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/project-brief.test.mjs"
```
Expected: `# tests 15`, `# pass 15`, `# fail 0`. Then the whole suite, to show that A1's tests and every earlier test still pass with the moved video module:
```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: `# fail 0`.

- [ ] **Step 5: Browser check — the two UI files this task touched still behave**

No page renders `useProjectBrief` or `commerceOf` yet. The rail's Outcome task and the My projects task verify those on screen. This check covers the two refactors: the royalty bounds (`step-3-mint.tsx`) and the ticker's constants (`video-jobs-provider.tsx`).

1. Start the dev server from Task 0 (`npx next dev -p 3002` in the worktree), and open `http://localhost:3002/`. Port 3002 is its own origin, so this does not touch the :3000 data.
2. In DevTools → Console, paste:
   ```js
   const now = Date.now();
   localStorage.setItem("ideeza:manual:projects", JSON.stringify([{
     id: "proj_a4", slug: "garden-sensors", name: "Garden sensors", productName: "Soil probe",
     description: "Soil moisture probes for raised beds", status: "draft", createdAt: now, updatedAt: now,
     flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
   }]));
   localStorage.setItem("ideeza:brief:draft:proj_a4", JSON.stringify({
     state: { projectId: "proj_a4", projectChoice: "proj_a4", productName: "Soil probe",
       productDescription: "Reads soil moisture", intent: "sell", network: "baseSepolia",
       collection: "Garden Sensors", listingType: "buyNow", token: "ETH", price: "0.05", royalties: "15" },
     step: "form",
   }));
   localStorage.setItem("ideeza:videoJobs", JSON.stringify([{
     id: "vj_a4", title: "Soil probe", prompt: "a soil probe on a bench", quality: "low", stage: "queued",
     startedAt: now, stageStartedAt: now, emailReminder: null, browserNotify: false, acknowledged: false, minted: false,
   }]));
   location.href = "/project/garden-sensors/brief";
   ```
3. Expect:
   - The Brief opens on the Sell form.
   - The **Royalties (%)** field holds `15`, and its hint reads *"Between 2 and 10% — one decimal place."*
   - The reason under the mint button reads *"Royalties must be between 2 and 10%."*
4. Change Royalties to `10`. Expect the reason to become *"Confirm you understand the network gas fee."*
5. Check the render toast. It first reads *"Video rendering · under a minute left"*, and within about 30 seconds it turns to *"Video ready"*. That shows the ticker still advances on `DEMO_SPEED`, `STAGE_BUDGETS_SEC` and `STAGE_ORDER` from `lib/video/jobs`.
6. The console shows no new errors.
7. Clean up: `localStorage.clear()`.

- [ ] **Step 6: tsc, eslint, commit**

```
npx tsc --noEmit
npx eslint src/lib/video/jobs.ts src/components/video-jobs/video-jobs-provider.tsx src/lib/brief/types.ts src/components/brief/step-3-mint.tsx src/lib/manual/projects.tsx src/lib/brief/project-brief.ts tests/projects/project-brief.test.mjs
git add src/lib/video/jobs.ts src/components/video-jobs/video-jobs-provider.tsx src/lib/brief/types.ts src/components/brief/step-3-mint.tsx src/lib/manual/projects.tsx src/lib/brief/project-brief.ts tests/projects/project-brief.test.mjs
git commit -F - <<'EOF'
feat(projects): one Brief read and the Outcome facts behind a project

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Both checks must be clean before the commit. Don't push.

---

### Task A4b: Permissions — `src/lib/manual/permissions.ts`

**Spec delta check (commit e599fcf):** applied.
- The delete block returns the delta's exact copy. The control stays, `aria-disabled`.
- The LATER co-owner, contributor-share and sold blocks (PPL-22, COR-83) have their slot in `DELETE_RULES` and `DeleteBlockId`.
- Preview as buyer depends on Showcase (`hasAudience`, PPL-9, X26).
- The Harness notes apply: the quoted-glob test command, and a type-only import of `ProjectStatus`, so there is no `@/` at runtime.

**Requirements:**
- PPL-1: one permission source, `can(viewer, action, ctx)`.
- PPL-2: the `Viewer` the page renders from.
- PPL-3: no people, customers or report actions NOW.
- PPL-6 and PPL-7: the visitor set is empty, so every write, authoring control, owner-only fact and download is absent in preview.
- PPL-9: `hasAudience`.
- COR-67: Delete is owner-only and stays present when blocked.
- COR-70: `deleteBlockOf`, with a Listed project blocked by the owner's copy.
- COR-105, COM-55 and §7 X41: Showcase only on a minted project.
- §5.1.4 / LST-5: the test that `commerceOf`'s outcome and `projectStatus()` agree.
- Owner answer 6: shaped for co-owners and a sold state LATER.

**Order:** runs after A3, which brings `ProjectStatus` and `projectStatus` in `src/lib/manual/project-summary.ts`, and after A4a.

**Files:**
- Create `src/lib/manual/permissions.ts`.
- Test: `tests/projects/permissions.test.mjs` (new).

**Interfaces:**
- Consumes:
  - A3: `export type ProjectStatus = "draft" | "private" | "given" | "listed" | "minted"` and `projectStatus(p: ManualProject, draft: StoredDraft | null): ProjectStatus` from `src/lib/manual/project-summary.ts`. Test only for `projectStatus`.
  - A4a: `commerceOf` and `parseBriefDraft` from `src/lib/brief/project-brief.ts`. Test only.
- Produces:
  ```ts
  // src/lib/manual/permissions.ts
  export type Viewer = { kind: "local-owner" } | { kind: "owner-preview" };
  export const ACTIONS: readonly [/* the 24 names of §5.1.5, in its order */];
  export type Action = (typeof ACTIONS)[number];   // exactly §5.1.5's union
  export type CanContext = { status?: ProjectStatus };
  export function can(viewer: Viewer, action: Action, ctx?: CanContext): boolean;
  export function hasAudience(status: ProjectStatus, showcase: { at: number } | null): boolean;
  export type DeleteBlockId = "listed";            // LATER: "sold" | "otherOwners" | "restricted" | "inManufacture"
  export type DeleteBlock = { id: DeleteBlockId; reason: string; detail: string };
  export function deleteBlockOf(status: ProjectStatus): DeleteBlock | null;   // a superset of §5.1.5's { reason; detail } | null
  ```
- How callers use it:
  - Controls ask `can(viewer, "project.showcase", { status })` and so on, and render nothing when it is false (PPL-6).
  - The Manage block asks `can(viewer, "project.delete")` for presence, then `deleteBlockOf(status)` for the block. It renders the reason and detail beside an `aria-disabled` button named by `aria-describedby` (COR-67).
  - The page asks `can(viewer, "preview.enter") && hasAudience(status, showcase)` for Preview as buyer.

**Decisions (each stated once, so the reviewer can object):**
1. **`CanContext` is `{ status?: ProjectStatus }`.** §5.1.5 names `CanContext` but gives no shape. Only `project.showcase` depends on state NOW. Without a status it answers `false`: a caller that doesn't say the project is minted doesn't get a Showcase control.
2. **What a maker can't do yet.**
   - The local owner has every creator action, including the LATER `listing.manage`, `share.newsfeed` and `premiumParts.manage` — the spec says "every creator action except the people ones".
   - "The people ones" are read as `people.*`, `ownership.listShare` and `customers.see`, all from the People area.
   - `project.report` is a visitor's action, and PPL-3 says there is no Report action NOW.
   - All six are false for every viewer, because a `true` would put a control over invented data.
3. **The visitor set is empty NOW.** PPL-6 and PPL-7 and owner decision O12 leave a buyer no write, no authoring control, no owner-only fact and no download. Previews aren't actions. `preview.enter` is false inside the preview, so the button is absent there. LATER, `project.report` joins the visitor set.
4. **`deleteBlockOf` adds an `id`** to §5.1.5's `{ reason; detail }`. It is a superset: callers that read only the two strings are unaffected. The LATER Manage block needs the id to pick copy and order.
5. **The LATER shape is a pure addition:**
   - a new `Viewer` kind maps to a new role row in `GRANTS`;
   - a new block is a new `DELETE_RULES` entry, at its place in §4.2's order (sold · listed · other owners · restricted · in manufacture);
   - its facts come in through an optional second argument to `deleteBlockOf`;
   - `ProjectStatus` gains `"sold"` (COR-83).

   No NOW caller changes.

- [ ] **Step 1: Write the failing test**

`tests/projects/permissions.test.mjs`:
```js
// Task A4b — permissions (spec §5.1.5, PPL-1, COR-70) and the outcome ↔ status agreement (§5.1.4).
import { test } from "node:test";
import assert from "node:assert/strict";

const { ACTIONS, can, hasAudience, deleteBlockOf } = await import("../../.tmp-test/lib/manual/permissions.js");
const { commerceOf, parseBriefDraft } = await import("../../.tmp-test/lib/brief/project-brief.js");
const { projectStatus } = await import("../../.tmp-test/lib/manual/project-summary.js");

const OWNER = { kind: "local-owner" };
const PREVIEW = { kind: "owner-preview" };
const STATUSES = ["draft", "private", "given", "listed", "minted"];
const NOT_YET = ["people.seeRoster", "people.invite", "people.manage", "ownership.listShare", "customers.see", "project.report"];

test("the action list is exactly §5.1.5's", () => {
  assert.deepEqual([...ACTIONS].sort(), [
    "activity.seeListedMarker", "activity.write", "app.manage", "customers.see",
    "deliverables.download", "facts.seeOwnerOnly", "listing.manage", "network.manage",
    "ownership.listShare", "people.invite", "people.manage", "people.seeRoster",
    "premiumParts.manage", "preview.enter", "product.add", "product.edit",
    "project.brief", "project.delete", "project.editDescription", "project.openEditor",
    "project.rename", "project.report", "project.showcase", "share.newsfeed",
  ]);
});

test("the maker may take every creator action; nobody has the people, customers or report actions yet (PPL-3)", () => {
  for (const action of ACTIONS) {
    assert.equal(can(OWNER, action, { status: "private" }), !NOT_YET.includes(action), action);
  }
});

test("Preview as buyer gets the visitor set, which is empty NOW (PPL-6, PPL-7)", () => {
  for (const status of STATUSES) {
    for (const action of ACTIONS) assert.equal(can(PREVIEW, action, { status }), false, `${action} · ${status}`);
  }
  assert.equal(can(PREVIEW, "project.rename"), false);
});

test("Showcase needs a mint: never on a Draft, never without the status (COR-105, X41)", () => {
  assert.equal(can(OWNER, "project.showcase", { status: "draft" }), false);
  assert.equal(can(OWNER, "project.showcase"), false);
  for (const status of ["private", "given", "listed", "minted"]) {
    assert.equal(can(OWNER, "project.showcase", { status }), true, status);
  }
});

test("a Listed project keeps its Delete control — can() says yes, deleteBlockOf() says why it is blocked (COR-67, COR-70)", () => {
  assert.equal(can(OWNER, "project.delete", { status: "listed" }), true);
  assert.deepEqual(deleteBlockOf("listed"), {
    id: "listed",
    reason: "A listed project can't be deleted.",
    detail: "There's no way to withdraw a listing yet — that comes with the marketplace.",
  });
});

test("every other state is deletable, the unreadable Minted record included", () => {
  for (const status of ["draft", "private", "given", "minted"]) assert.equal(deleteBlockOf(status), null, status);
});

test("hasAudience: only a Private project that isn't showcased has nobody to preview for (PPL-9, X26)", () => {
  assert.equal(hasAudience("private", null), false);
  assert.equal(hasAudience("private", { at: 1 }), true);
  for (const status of ["draft", "given", "listed", "minted"]) assert.equal(hasAudience(status, null), true, status);
});

test("commerceOf's outcome and projectStatus() never disagree (§5.1.4)", () => {
  const MINTED = Date.UTC(2026, 8, 22, 21, 9);
  const NOW = Date.UTC(2026, 8, 26, 12, 0);
  const EXPECTED = {
    none: "draft",
    briefing: "draft",
    private: "private",
    given: "given",
    listed: "listed",
    mintedUnreadable: "minted",
  };
  const project = (status = "draft") => ({
    id: "proj_a", slug: "a", name: "A", productName: "", description: "", status,
    createdAt: 1, updatedAt: 1,
    flowState: { pcb: false, code: false, three: false, assembly: false, wiring: false, preview: false, brief: false },
  });
  const draft = (state, step = "form") => parseBriefDraft(JSON.stringify({ state, step }));
  const cases = [
    [project(), null],
    [project(), draft({}, "idea")],
    [project(), draft({ intent: "sell" }, "preview")],
    [project(), draft({ intent: "save", mintedAt: MINTED }, "success")],
    [project("completed"), draft({ intent: "save", mintedAt: MINTED }, "success")],
    [project("completed"), draft({ intent: "give", mintedAt: MINTED, license: "mit" }, "success")],
    [project("completed"), draft({ intent: "sell", mintedAt: MINTED, price: "0.05" }, "success")],
    [project("completed"), draft({ mintedAt: MINTED }, "success")], // minted, its intent unreadable
    [project("completed"), null],
    [project("completed"), draft({ intent: "give" }, "form")],
  ];
  for (const [p, d] of cases) {
    const outcome = commerceOf(p, d, [], NOW).outcome;
    assert.equal(projectStatus(p, d), EXPECTED[outcome], `${p.status} · ${JSON.stringify(d?.state.intent)} · ${outcome}`);
  }
});
```

- [ ] **Step 2: Run it — expected FAIL**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/permissions.test.mjs"
```
Expected:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/.tmp-test/lib/manual/permissions.js' imported from …/tests/projects/permissions.test.mjs
```

- [ ] **Step 3: Implement — create `src/lib/manual/permissions.ts`**

```ts
// Permissions — the one place a control asks whether the viewer may act
// (PPL-1). No control checks ownership inline: the page renders from
// (project, viewer), and `can()` answers for the two viewers there are today —
// the maker in this browser, and the maker previewing as a buyer (PPL-2).
//
// Shaped for LATER (owner decision O10) without changing a signature or a
// caller: accounts add viewer kinds, each mapped to a role row in `GRANTS`
// (co-owner, editor, viewer — PPL-30); a sold project and co-owners add rules
// to `DELETE_RULES`, in the order §4.2 fixes — sold · listed · other owners ·
// restricted · in manufacture — the first that applies being the reason shown.

import type { ProjectStatus } from "./project-summary";

export type Viewer =
  | { kind: "local-owner" }        // whoever opens the page in this browser
  | { kind: "owner-preview" };     // ?view=buyer: visitor permissions
// LATER, with accounts: | { kind: "member"; role: "coOwner" | "editor" | "viewer" } | { kind: "visitor" }

/** Every action a control can ask about. The LATER ones are declared now, so their controls call can() from day one. */
export const ACTIONS = [
  "project.rename", "project.editDescription", "project.delete",
  "project.openEditor", "project.brief", "project.showcase",   // showcase: minted projects only
  "product.add", "product.edit", "network.manage", "app.manage",
  "activity.write", "activity.seeListedMarker",
  "facts.seeOwnerOnly",                                        // Outcome, Built in, Stored, part changes
  "deliverables.download",
  "preview.enter",
  // LATER
  "listing.manage", "share.newsfeed", "premiumParts.manage",
  "people.seeRoster", "people.invite", "people.manage", "ownership.listShare",
  "customers.see", "project.report",
] as const;
export type Action = (typeof ACTIONS)[number];

/** What an answer may depend on besides who asks. LATER: the viewer's share, a restriction. */
export type CanContext = { status?: ProjectStatus };

type Role = "owner" | "visitor";
const ROLE_OF: Record<Viewer["kind"], Role> = {
  "local-owner": "owner",
  "owner-preview": "visitor",
};

/** Nobody has these NOW: they need people, buyers or a place for reports, and none exist yet
 *  (PPL-3) — a `true` would put a control on the page over invented data. */
const NOT_YET: ReadonlySet<Action> = new Set<Action>([
  "people.seeRoster", "people.invite", "people.manage", "ownership.listShare",
  "customers.see", "project.report",
]);

/** Per role, what it may do before the project's state is asked. */
const GRANTS: Record<Role, (action: Action) => boolean> = {
  // The maker: every creator action there is data for.
  owner: (action) => !NOT_YET.has(action),
  // A buyer — and the maker previewing as one. Every write, authoring control,
  // owner-only fact and download is absent for them (PPL-6, PPL-7, owner
  // decision O12), so NOW the set is empty. LATER: "project.report".
  visitor: () => false,
};

/** Actions whose answer also depends on the project's state. */
const NEEDS: Partial<Record<Action, (ctx: CanContext) => boolean>> = {
  // COR-105, COM-55, §7 X41: only a minted project can be showcased — never a
  // Draft, and never when the caller didn't say which state the project is in.
  "project.showcase": (ctx) => ctx.status !== undefined && ctx.status !== "draft",
};

export function can(viewer: Viewer, action: Action, ctx: CanContext = {}): boolean {
  if (!GRANTS[ROLE_OF[viewer.kind]](action)) return false;
  const need = NEEDS[action];
  return need ? need(ctx) : true;
}

/** Is there an audience at all? Gates Preview as buyer (PPL-9, §7 X26): false only for a
 *  Private project that isn't showcased — nobody but the maker will ever see that page. */
export function hasAudience(status: ProjectStatus, showcase: { at: number } | null): boolean {
  return !(status === "private" && showcase === null);
}

/** What decides whether a project can be deleted. NOW its status alone. LATER (O10) it gains
 *  who else holds ownership (PPL-22) and the restricted / in-manufacture flags, passed as an
 *  optional second argument to deleteBlockOf; ProjectStatus gains "sold" (COR-83). */
type DeleteFacts = { status: ProjectStatus };

export type DeleteBlockId = "listed"; // LATER: "sold" | "otherOwners" | "restricted" | "inManufacture"
export type DeleteBlock = { id: DeleteBlockId; reason: string; detail: string };

/** First match wins; each LATER rule goes in at its place in §4.2's order. */
const DELETE_RULES: readonly (DeleteBlock & { applies: (f: DeleteFacts) => boolean })[] = [
  {
    id: "listed",
    applies: (f) => f.status === "listed",
    reason: "A listed project can't be deleted.",
    // Honest that no way out exists yet: the Brief can't withdraw a listing
    // (COR-70). LATER, with a marketplace, this points at "remove the listing first".
    detail: "There's no way to withdraw a listing yet — that comes with the marketplace.",
  },
];

/**
 * Why Delete is blocked, or `null` (COR-67, COR-70). A block keeps the control
 * where it is — `aria-disabled`, focusable, with `reason` and `detail` beside
 * it and named by `aria-describedby` — and pressing it opens nothing. The
 * Minted record that can't be read stays deletable: its outcome isn't known to
 * be a listing.
 */
export function deleteBlockOf(status: ProjectStatus): DeleteBlock | null {
  const facts: DeleteFacts = { status };
  const rule = DELETE_RULES.find((r) => r.applies(facts));
  return rule ? { id: rule.id, reason: rule.reason, detail: rule.detail } : null;
}
```

- [ ] **Step 4: Run — expected PASS**

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/permissions.test.mjs"
```
Expected: `# tests 8`, `# pass 8`, `# fail 0`. Then the whole suite:
```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: `# fail 0`.

- [ ] **Step 5: Browser check** — none. This task adds a pure module with no caller yet. The Manage block, the Outcome row's Showcase control and Preview as buyer verify `can()`, `deleteBlockOf()` and `hasAudience()` on screen in their own tasks.

- [ ] **Step 6: tsc, eslint, commit**

```
npx tsc --noEmit
npx eslint src/lib/manual/permissions.ts tests/projects/permissions.test.mjs
git add src/lib/manual/permissions.ts tests/projects/permissions.test.mjs
git commit -F - <<'EOF'
feat(projects): one permission source, and a listed project can't be deleted

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
Both checks must be clean before the commit. Don't push.

