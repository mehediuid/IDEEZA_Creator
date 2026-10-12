# Activity Everywhere Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activity becomes the proof-backed journey of a project, each product, and its Main, Physical and Virtual NFTs.
- Every project and product starts at a synthesized **Planning**.
- Every new entry needs at least one file.
- Outside viewers see a "Now" block with an inline "Earlier ▾" list.

**Architecture:**
- **One journey per project.** It stays in localStorage, in `ideeza:project:journey:<id>`. Every entry gains a `target`.
- **Read-time mapping.** v1 entries are mapped to v2 when read (`normalizeJourney`).
- **Catalogues.** Each target kind has a catalogue of types (`CATALOGUES`).
- **Pure readers.** `historyOf` and `currentOf` add the default Planning for project and product targets.
- **UI.** The owner's drawer is opened per target. A new read-only `ActivityNow` block serves the buyer side. A new `ActivityLine` serves Earn › Sell.

**Tech Stack:**
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4 tokens.
- Tests run on `node:test` over `src/lib` compiled to `.tmp-test` (`pnpm test:projects`).

**Spec:** `docs/superpowers/specs/2026-10-13-activity-everywhere-design.md`. Read it before Task 1.

## Global Constraints

- **Where to work:** worktree `/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/activity-everywhere`, branch `feat/activity-everywhere`.
  - Run every command from that directory.
  - Never touch `/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator`; another session uses it.
- **Commits:** stage only the files the task names, never `git add -A`. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.
- **Tests:** `pnpm test:projects` compiles `src/lib/**` (the subset in `tests/projects/tsconfig.json`) and runs `tests/projects/*.test.mjs`. Tests import `../../.tmp-test/lib/<path>.js`.
- **Imports inside `src/lib`:** value imports must be relative (`./journey`, `../market/types`), never `@/…`, or node can't load them.
- **The commerce boundary:** `lib/manual` must gain **no new value import** from `lib/market`, `lib/wallet` or `lib/commerce` (`tests/projects/commerce-boundary.test.mjs`). Type-only imports that already exist may stay.
- **The full type check is `npx tsc --noEmit -p tsconfig.json`, and lint is `npx eslint <files>`.**
  - From the end of **Task 3** onward, tsc must report 0 errors.
  - Task 2 knowingly leaves component files broken; Task 3 fixes them.
- **Copy:** exact strings are given in each task. Use sentence case for UI labels; type names stay as the catalogue spells them.
- **Phones:** every new tap target uses `max-md:min-h-[var(--touch-min)]` or is at least 44 px.
- **Colours and themes:** use the existing token classes only (`text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `border-border`, `bg-bg-subtle` and so on). No raw hex.
- **Placement change from the session:** the Earn › Sell Activity line sits under each NFT row, not inside Manage. The owner approved this with the spec.

---

### Task 1: The Innovations post is story-only

The post's status will come from the project's current activity (Task 3). This task removes the status field everywhere it is asked or stored. It is independent of the journey model, so the app stays green.

**Files:**
- Modify: `src/lib/manual/share-post.ts` (whole file)
- Modify: `src/lib/brief/mint-flow.ts:26` (import) and `:238-242`
- Modify: `src/components/projects/share-dialog.tsx` (imports, `sharePostStartOf`, `ShareDialog`, `SharePostFields`)
- Modify: `src/components/brief/step-details.tsx` (imports at `:25`, `STAGE_OPTIONS` at `:45`, the "Project status" `SelectMenu` at `:331-338`)
- Modify: `src/components/brief/brief-app.tsx:57` and `:335`
- Modify: `src/components/newsfeed/shared-by-you.tsx` (import and `status`)
- Test: `tests/projects/share-post.test.mjs`, `tests/projects/brief-success.test.mjs:239`

**Interfaces:**
- Produces:
  - `type SharePost = { story: string }`
  - `sharePostIn(raw: unknown): SharePost | undefined` (ignores any stored `stage`)
  - `sharePostBlocker(post: SharePost): string | null`
  - `STORY_MAX`, `STORY_MISSING`
- Removes: `STAGE_MISSING`, `stageWordOf`.

- [ ] **Step 1: Write the failing tests.** Replace the whole of `tests/projects/share-post.test.mjs` with:

```js
// The Innovations post a share carries: the maker's story. Its status is the project's current
// activity, read where it shows (owner, 2026-10-13), so the post never stores or asks for one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STORY_MAX, STORY_MISSING, sharePostBlocker, sharePostIn } from "../../.tmp-test/lib/manual/share-post.js";
import { detailsMissing, DEFAULT_MINT_STATE } from "../../.tmp-test/lib/brief/mint-flow.js";

test("a post needs only its story", () => {
  assert.equal(sharePostBlocker({ story: "  " }), STORY_MISSING);
  assert.equal(sharePostBlocker({ story: "Built for my nephew." }), null);
});

test("sharePostIn keeps the story, drops a stored stage, and refuses what isn't a post", () => {
  assert.deepEqual(sharePostIn({ story: "Hi", stage: "mass-production" }), { story: "Hi" });
  assert.deepEqual(sharePostIn({ story: "Hi" }), { story: "Hi" });
  assert.equal(sharePostIn({ stage: "mass-production" }), undefined);
  assert.equal(sharePostIn(null), undefined);
  assert.equal(sharePostIn({ story: "x".repeat(900) }).story.length, STORY_MAX);
});

test("the mint's Details ask the post's story only when it's shared", () => {
  const base = { ...DEFAULT_MINT_STATE, intent: "save", collection: "Garden", confirmOwnership: true };
  const f = { now: 0, creatorPct: 100, readiness: null };
  assert.equal(detailsMissing(base, f), null);
  assert.equal(detailsMissing({ ...base, shareToNewsfeed: true }, f), STORY_MISSING);
  assert.equal(detailsMissing({ ...base, shareToNewsfeed: true, story: "Why I built it" }, f), null);
});
```

In `tests/projects/brief-success.test.mjs`, replace line 239:

```js
  assert.match(writes, /if \(s\.shareToNewsfeed && shareReady && cur\.showcasedAt == null\) \{\s*setShowcase\(cur\.id, true, at, \{ story: s\.story\.trim\(\) \}\);/);
```

- [ ] **Step 2: Run the tests and watch them fail.**

Run: `pnpm -s test:projects 2>&1 | grep -E "^# (pass|fail)|not ok" | head`
Expected: FAIL. `sharePostIn` still returns `stage`, `detailsMissing` returns `STAGE_MISSING`, and the brief-app regex doesn't match.

- [ ] **Step 3: Rewrite `src/lib/manual/share-post.ts`:**

```ts
// The Innovations post a share carries (owner, 2026-10-12: "it didn't take my
// story"). Every way to share asks for the maker's story before it shares. The
// post's status is the project's current activity, read where it shows
// (owner, 2026-10-13), so it is never asked for or stored here; a stored
// `stage` from before is dropped on read.
//
// Pure, relative imports only.

export const STORY_MAX = 500;

export type SharePost = {
  /** Why it was built, what others should do with it. */
  story: string;
};

/** A stored post, shape-checked; undefined when it isn't one. */
export function sharePostIn(raw: unknown): SharePost | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as { story?: unknown };
  if (typeof r.story !== "string") return undefined;
  return { story: r.story.slice(0, STORY_MAX) };
}

export const STORY_MISSING = "Write a few words for the post — why you built it, what others can do with it.";

/** Why the post can't go out yet; null when it can. */
export function sharePostBlocker(post: SharePost): string | null {
  return post.story.trim() ? null : STORY_MISSING;
}
```

- [ ] **Step 4: Fix `src/lib/brief/mint-flow.ts`.**
  - Delete line 26, `import type { StageId } from "../manual/journey";`.
  - Replace lines 238–242 with:

```ts
  // Shared to Innovations: the post needs its story (owner, 2026-10-12); its status is the project's activity.
  if (s.shareToNewsfeed) {
    const post = sharePostBlocker({ story: s.story });
    if (post) return post;
  }
```

  Leave `"shareStage"` in `MINT_STATE_KEYS` and in `lib/brief/types.ts`. A stored draft keeps the field; nothing reads it.

- [ ] **Step 5: Fix `src/components/projects/share-dialog.tsx`.**
  - Remove the `STAGES`/`StageId` import (line 18) and `STAGE_OPTIONS` (line 24).
  - Change the share-post import to `import { STORY_MAX, sharePostBlocker, type SharePost } from "@/lib/manual/share-post";`.
  - Drop `SelectMenu`/`SelectOption` from the `@/components/ideeza` import if nothing else in the file uses them (check with grep).
  - Then replace `sharePostStartOf`, the body of `ShareDialog` and `SharePostFields` with:

```tsx
/** What the post starts from: the last one shared, else the Brief's story. */
export function sharePostStartOf(project: ManualProject, _view: ProjectView, brief: StoredDraft | null): SharePost {
  return { story: project.post?.story ?? brief?.state.story ?? "" };
}

export function ShareDialog({
  project,
  view,
  brief,
  onShared,
  onClose,
}: {
  project: ManualProject;
  view: ProjectView;
  brief: StoredDraft | null;
  onShared: (post: SharePost) => void;
  onClose: () => void;
}) {
  const [post, setPost] = React.useState<SharePost>(() => sharePostStartOf(project, view, brief));
  const storyRef = React.useRef<HTMLTextAreaElement>(null);
  const blocker = sharePostBlocker(post);

  return (
    <ReadinessDialog
      purpose="showcase"
      project={project}
      view={view}
      brief={brief}
      extraBlocker={blocker}
      onExtraBlocked={() => storyRef.current?.focus()}
      onPass={() => onShared({ story: post.story.trim() })}
      onClose={onClose}
      extra={<SharePostFields post={post} onChange={setPost} storyRef={storyRef} />}
    />
  );
}

export function SharePostFields({
  post,
  onChange,
  storyRef,
}: {
  post: SharePost;
  onChange: (next: SharePost) => void;
  storyRef?: React.Ref<HTMLTextAreaElement>;
}) {
  const storyId = React.useId();
  const countId = React.useId();
  return (
    <section aria-label="The post" className="flex flex-col gap-6 border-t border-solid border-border pt-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={storyId} className="text-md font-semibold text-text-primary">
          Write your story
        </label>
        <Textarea
          ref={storyRef}
          id={storyId}
          rows={3}
          value={post.story}
          maxLength={STORY_MAX}
          onValueChange={(story) => onChange({ story: story.slice(0, STORY_MAX) })}
          placeholder="Why did you build this? What should others do with it?"
          aria-describedby={countId}
        />
        <div id={countId} className="flex justify-between gap-4 text-sm text-text-secondary">
          <span>Shown with your post in Innovations, with the project&apos;s current activity as its status.</span>
          <span className="tabular-nums">
            {post.story.length}/{STORY_MAX}
          </span>
        </div>
      </div>
    </section>
  );
}
```

  If `_view` triggers the lint rule `no-unused-vars`, keep the `_` prefix (the repo's eslint ignores `_`-prefixed args). If it doesn't, drop the parameter and update the one caller.

- [ ] **Step 6: Fix `src/components/brief/step-details.tsx`.**
  - Delete line 25 (`import { STAGES, type StageId } …`) and line 45 (`const STAGE_OPTIONS …`).
  - Delete the comment and the `SelectMenu` block at lines 331–338 (`label="Project status"` … `options={STAGE_OPTIONS}` `/>`).
  - Keep `SelectMenu`/`SelectOption` in the ideeza import: other fields use them.

- [ ] **Step 7: Fix `src/components/brief/brief-app.tsx`.**
  - Delete line 57, `import { sharePostIn } …`, if nothing else uses it (grep).
  - Replace line 335 with:

```tsx
          setShowcase(cur.id, true, at, { story: s.story.trim() });
```

- [ ] **Step 8: Fix `src/components/newsfeed/shared-by-you.tsx` for now.** Remove the `stageWordOf` import and set `status: null as string | null,` in the mapped object. Task 3 fills it from the journey. The existing `{p.status && …}` render then shows nothing.

- [ ] **Step 9: Run the tests, tsc and lint.**

Run: `pnpm -s test:projects 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: `# fail 0`.
Run: `npx tsc --noEmit -p tsconfig.json; echo exit $?`
Expected: `exit 0`.
Run: `npx eslint src/lib/manual/share-post.ts src/lib/brief/mint-flow.ts src/components/projects/share-dialog.tsx src/components/brief/step-details.tsx src/components/brief/brief-app.tsx src/components/newsfeed/shared-by-you.tsx`
Expected: no output.

- [ ] **Step 10: Commit.**

```bash
git add src/lib/manual/share-post.ts src/lib/brief/mint-flow.ts src/components/projects/share-dialog.tsx src/components/brief/step-details.tsx src/components/brief/brief-app.tsx src/components/newsfeed/shared-by-you.tsx tests/projects/share-post.test.mjs tests/projects/brief-success.test.mjs
git commit -m "feat(share): the Innovations post is the story alone — its status will be the project's current activity

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The journey model, and the lib readers that use it

This task covers targets, catalogues, the v2 record and its v1 read, the proof rule, the default Planning, and `historyOf`/`currentOf`. Then it updates every `src/lib` reader (`project-read`, `products-tab-view`, the header meta) and their tests.

**After this task, `pnpm test:projects` passes, but the app-wide tsc fails in component files.** Task 3 owns those files: `activity/*.tsx`, `project-menu.tsx`, `product-menu.tsx`, `header.tsx`, `earn-header.tsx`, `project-page.tsx` and `market-slots.tsx`.

**Files:**
- Modify: `src/lib/manual/journey.ts` (rewrite: keep `MediaRef`, `PriceSnapshot`, `normalizeMedia`, `normalizePriceSnapshot`, `LiveListingFacts`, `snapshotPrices` exactly as they are)
- Create: `src/lib/manual/journey-dates.ts`
- Modify: `src/lib/manual/project-read.ts:49` (import), `:664-666` (`ProjectView`), `:779-792` (`projectView`)
- Modify: `src/lib/manual/products-tab-view.ts:24`, `:184-213`
- Modify: `src/lib/manual/project-summary.ts:612-634` (`HeaderText.stage` → `now`, `HeaderCtx.stage` → `now`), `:708-709`, `:740`
- Modify: `src/lib/manual/project-header.ts:156-167` (`engineeringMetaOf`)
- Test: `tests/projects/journey.test.mjs` (rewrite), `tests/projects/activity-views.test.mjs` (new), `tests/projects/project-header.test.mjs:189-192`, `tests/projects/status-precedence.test.mjs:222-229`, `tests/projects/project-view.test.mjs:83`

**Interfaces:**
- Produces, from `journey.ts`:
  - `WHOLE_PROJECT_SCOPE = "project"`
  - `type ActivityTarget = { kind: "project" } | { kind: "product"; productId: string } | { kind: "main" } | { kind: "physical" | "virtual"; scope: string }`
  - `targetKey(t): string`
  - `targetNameOf(t, { project: string; productName: (id: string) => string }): string`
  - `type TypeDef = { id; label; short; help }`, `CATALOGUES`
  - `catalogueOf(t): readonly TypeDef[]`
  - `typeDefOf(t, typeId): TypeDef | null`
  - `LEGACY_TYPES: ReadonlyMap<string, string>`
  - `type Activity` (v2, with `target`, no `productId`)
  - `type JourneyEntry = Activity & { isDefault?: true }`
  - `type ProjectJourney = { v: 1; activities: Activity[] }`
  - `JOURNEY_KEY`, `normalizeJourney`
  - `type ActivityInput` (`type: string`), `type ActivityErrors`
  - `checkActivity(input): ActivityErrors` (one argument)
  - `PROOF_MISSING`
  - `activitiesOf(j, target): Activity[]`
  - `defaultPlanningOf(projectId, target, at): JourneyEntry`
  - `historyOf(j, projectId, target, defaultAt?): JourneyEntry[]`
  - `currentOf(j, projectId, target, defaultAt?): JourneyEntry | null`
  - `labelOf(e)`, `shortOf(e)`, `helpOf(e)`, each taking `Pick<Activity, "target" | "type" | "customName">`
  - `snapshotPrices`, `type LiveListingFacts`, `type MediaRef`, `type PriceSnapshot`
- Produces, from `journey-dates.ts`: `productAddedAt(project: { createdAt: number }, refs: readonly { chatId: string | null; savedAt: number | null }[], product: { built: { ref: { chatId: string | null } } | null }): number`
- Produces, from `project-read.ts`: `ProjectView.current: JourneyEntry` (replaces `stage` and `activityCount`).
- Produces, from `products-tab-view.ts`: `productsTabView(view, ctx: { owner: boolean; journey: ProjectJourney; project: { id: string; createdAt: number } })`. The view needs `products` (with `built`), `refs` and `videos`.
- Produces, from `project-summary.ts`: `HeaderCtx.now?: { label: string } | null`; `HeaderText.now: string | null`, reading `"Now: {label}"`.
- Produces, from `project-header.ts`: `engineeringMetaOf(s, now: { label: string } | null)`.
- Removes: `StageId`, `StageDef`, `STAGES`, `activitiesFor`, `currentStage`.

- [ ] **Step 1: Write the failing journey tests.** Replace the whole of `tests/projects/journey.test.mjs` with:

```js
// JOURNEY — journey.ts (spec 2026-10-13-activity-everywhere §1–§5).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CATALOGUES,
  LEGACY_TYPES,
  PROOF_MISSING,
  WHOLE_PROJECT_SCOPE,
  activitiesOf,
  catalogueOf,
  checkActivity,
  currentOf,
  historyOf,
  labelOf,
  normalizeJourney,
  shortOf,
  snapshotPrices,
  targetKey,
  targetNameOf,
  typeDefOf,
} from "../../.tmp-test/lib/manual/journey.js";
import { PROJECT_SCOPE } from "../../.tmp-test/lib/market/types.js";

const T = Date.UTC(2026, 8, 22, 9, 0);
const DAY = 86_400_000;
const PROJECT = { kind: "project" };
const FILE = { id: "m1", name: "photo.png", mime: "image/png", kind: "image", size: 100, blobKey: "b1" };

const v2 = (over = {}) => ({
  v: 2,
  id: "act_1",
  projectId: "p1",
  target: PROJECT,
  type: "testing",
  description: "Bench-tested.",
  urls: [],
  media: [FILE],
  createdAt: T,
  updatedAt: T,
  ...over,
});
const v1 = (over = {}) => ({
  v: 1,
  id: "act_1",
  projectId: "p1",
  type: "concept-definition",
  description: "Wrote the idea down.",
  urls: [],
  media: [],
  createdAt: T,
  updatedAt: T,
  ...over,
});

describe("targets", () => {
  it("the whole-project scope literal is lib/market's PROJECT_SCOPE", () => {
    assert.equal(WHOLE_PROJECT_SCOPE, PROJECT_SCOPE);
  });
  it("targetKey names each target once", () => {
    assert.equal(targetKey(PROJECT), "project");
    assert.equal(targetKey({ kind: "product", productId: "prd_1" }), "product:prd_1");
    assert.equal(targetKey({ kind: "main" }), "main");
    assert.equal(targetKey({ kind: "physical", scope: "project" }), "physical:project");
    assert.equal(targetKey({ kind: "virtual", scope: "prd_1" }), "virtual:prd_1");
  });
  it("targetNameOf says whose journey it is", () => {
    const names = { project: "Smart Lamp", productName: (id) => (id === "prd_1" ? "VoxLamp" : "?") };
    assert.equal(targetNameOf(PROJECT, names), "Smart Lamp");
    assert.equal(targetNameOf({ kind: "product", productId: "prd_1" }, names), "VoxLamp");
    assert.equal(targetNameOf({ kind: "main" }, names), "Main NFT");
    assert.equal(targetNameOf({ kind: "physical", scope: "prd_1" }, names), "VoxLamp · Physical NFT");
    assert.equal(targetNameOf({ kind: "virtual", scope: "project" }, names), "Whole project · Virtual NFT");
  });
});

describe("catalogues", () => {
  it("each list is the spec's, in order, ending with Others", () => {
    assert.deepEqual(CATALOGUES.project.map((d) => d.id), [
      "planning", "design", "prototype", "testing", "certification", "ready-for-manufacture",
      "pilot-run", "manufacturing", "launched", "improvement", "others",
    ]);
    assert.deepEqual(CATALOGUES.main.map((d) => d.id), ["ip", "partnership", "sales-report", "milestone", "roadmap", "others"]);
    assert.deepEqual(CATALOGUES.physical.map((d) => d.id), [
      "making", "quality-check", "shipped", "delivered", "delay-notice", "fix-notice", "others",
    ]);
    assert.deepEqual(CATALOGUES.virtual.map((d) => d.id), [
      "files-released", "update-released", "bug-fix", "guide-added", "licence-change", "others",
    ]);
    for (const list of Object.values(CATALOGUES)) assert.ok(list.every((d) => d.label && d.short && d.help));
  });
  it("a product reads the project's list; NFTs read their own", () => {
    assert.equal(catalogueOf({ kind: "product", productId: "x" }), CATALOGUES.project);
    assert.equal(typeDefOf({ kind: "physical", scope: "project" }, "shipped").label, "Shipped");
    assert.equal(typeDefOf({ kind: "physical", scope: "project" }, "testing"), null);
  });
  it("every v1 stage maps to a project type", () => {
    for (const [from, to] of LEGACY_TYPES) assert.ok(typeDefOf(PROJECT, to), `${from} → ${to}`);
    assert.equal(LEGACY_TYPES.get("concept-definition"), "planning");
    assert.equal(LEGACY_TYPES.get("mass-production"), "manufacturing");
    assert.equal(LEGACY_TYPES.get("toString"), undefined);
  });
});

describe("normalizeJourney", () => {
  it("reads a v1 entry as v2: the target from productId, the type through LEGACY_TYPES", () => {
    const j = normalizeJourney({
      v: 1,
      activities: [v1({ id: "a" }), v1({ id: "b", productId: "prd_1", type: "manufacturing-preparation" })],
    });
    assert.deepEqual(
      j.activities.map((a) => [a.v, a.id, targetKey(a.target), a.type, "productId" in a]),
      [
        [2, "a", "project", "planning", false],
        [2, "b", "product:prd_1", "ready-for-manufacture", false],
      ],
    );
  });
  it("keeps a v2 entry of every target kind", () => {
    const j = normalizeJourney({
      v: 1,
      activities: [
        v2({ id: "p" }),
        v2({ id: "m", target: { kind: "main" }, type: "ip" }),
        v2({ id: "ph", target: { kind: "physical", scope: "prd_1" }, type: "shipped" }),
        v2({ id: "vi", target: { kind: "virtual", scope: "project" }, type: "bug-fix" }),
      ],
    });
    assert.deepEqual(j.activities.map((a) => a.id), ["p", "m", "ph", "vi"]);
  });
  it("drops what isn't an entry: a bad target, a type its target doesn't offer, an unknown v1 stage", () => {
    const j = normalizeJourney({
      v: 1,
      activities: [
        v2({ id: "ok" }),
        v2({ id: "bad_target", target: { kind: "physical" } }),
        v2({ id: "wrong_list", target: { kind: "main" }, type: "testing" }),
        v1({ id: "bad_stage", type: "not-a-stage" }),
        { id: "bare" },
        null,
      ],
    });
    assert.deepEqual(j.activities.map((a) => a.id), ["ok"]);
  });
  it("keeps customName, media and pricing, and reads garbage as empty", () => {
    const j = normalizeJourney({
      v: 1,
      activities: [v2({ type: "others", customName: "Trade show", pricing: { at: T, token: "MATIC", main: "0.05", editions: [] } })],
    });
    assert.equal(j.activities[0].customName, "Trade show");
    assert.equal(j.activities[0].media.length, 1);
    assert.equal(j.activities[0].pricing.main, "0.05");
    assert.deepEqual(normalizeJourney(null), { v: 1, activities: [] });
    assert.deepEqual(normalizeJourney({ activities: "nope" }), { v: 1, activities: [] });
  });
});

describe("checkActivity", () => {
  const ok = { type: "testing", customName: "", description: "d", urls: [], attachments: 1 };
  it("needs a type and a description", () => {
    assert.equal(checkActivity({ ...ok, type: "" }).type, "Choose an activity type.");
    assert.equal(checkActivity({ ...ok, description: " " }).description, "Describe this activity.");
  });
  it("needs at least one file: a link alone is not proof", () => {
    const e = checkActivity({ ...ok, attachments: 0, urls: ["https://x.io"] });
    assert.equal(e.attachments, PROOF_MISSING);
    assert.equal(PROOF_MISSING, "Add at least one photo, video, PDF or document.");
    assert.equal(e.ok, false);
  });
  it("keeps the length and https rules", () => {
    assert.equal(checkActivity({ ...ok, type: "others", customName: "x".repeat(41) }).customName, "Maximum 40 characters allowed");
    assert.equal(checkActivity({ ...ok, type: "others", customName: "" }).customName, "Name this activity.");
    assert.equal(checkActivity({ ...ok, description: "d".repeat(401) }).description, "Maximum 400 characters allowed");
    assert.equal(checkActivity({ ...ok, urls: ["http://x.io"] }).urls[0], "Please enter a valid URL starting with https://");
    assert.equal(checkActivity({ ...ok, urls: ["https://x.io"] }).ok, true);
  });
});

describe("history and current", () => {
  const j = {
    v: 1,
    activities: [
      v2({ id: "p1", createdAt: T + DAY }),
      v2({ id: "p2", createdAt: T + 3 * DAY, type: "others", customName: "Trade show" }),
      v2({ id: "x1", createdAt: T + 2 * DAY, target: { kind: "product", productId: "prd_1" }, type: "prototype" }),
      v2({ id: "s1", createdAt: T + 2 * DAY, target: { kind: "physical", scope: "prd_1" }, type: "shipped" }),
      v2({ id: "s0", createdAt: T + 2 * DAY, target: { kind: "physical", scope: "prd_1" }, type: "making" }),
    ],
  };
  it("activitiesOf matches the target exactly, newest first, equal times by id descending", () => {
    assert.deepEqual(activitiesOf(j, PROJECT).map((a) => a.id), ["p2", "p1"]);
    assert.deepEqual(activitiesOf(j, { kind: "product", productId: "prd_1" }).map((a) => a.id), ["x1"]);
    assert.deepEqual(activitiesOf(j, { kind: "physical", scope: "prd_1" }).map((a) => a.id), ["s1", "s0"]);
    assert.deepEqual(activitiesOf(j, { kind: "main" }), []);
  });
  it("a project or product history ends with its default Planning; an NFT has none", () => {
    const h = historyOf(j, "p1", PROJECT, T);
    assert.deepEqual(h.map((e) => e.id), ["p2", "p1", "default:project"]);
    const d = h.at(-1);
    assert.deepEqual([d.type, d.isDefault, d.createdAt, d.description, d.media.length], ["planning", true, T, "Project created.", 0]);
    const product = historyOf({ v: 1, activities: [] }, "p1", { kind: "product", productId: "prd_9" }, T + DAY);
    assert.deepEqual(product.map((e) => [e.id, e.description]), [["default:product:prd_9", "Product added."]]);
    assert.deepEqual(historyOf(j, "p1", { kind: "main" }, T), []);
  });
  it("current is the newest entry, Others included; null for an NFT with nothing", () => {
    const now = currentOf(j, "p1", PROJECT, T);
    assert.equal(now.id, "p2");
    assert.equal(labelOf(now), "Trade show");
    assert.equal(currentOf({ v: 1, activities: [] }, "p1", PROJECT, T).isDefault, true);
    assert.equal(currentOf(j, "p1", { kind: "main" }), null);
  });
  it("labelOf and shortOf read the target's catalogue, Others by its own name", () => {
    assert.equal(labelOf({ target: PROJECT, type: "ready-for-manufacture" }), "Ready for manufacture");
    assert.equal(shortOf({ target: PROJECT, type: "ready-for-manufacture" }), "Mfg ready");
    assert.equal(labelOf({ target: { kind: "virtual", scope: "project" }, type: "licence-change" }), "Licence change");
    assert.equal(shortOf({ target: PROJECT, type: "others", customName: "  " }), "Other");
  });
});

describe("snapshotPrices", () => {
  it("is undefined when nothing is live, and snapshots Main and live editions otherwise", () => {
    assert.equal(snapshotPrices({ editions: [] }), undefined);
    const snap = snapshotPrices({
      main: { token: "MATIC", price: "0.05", at: T },
      editions: [{ productId: "prd_1", kind: "physical", use: "private", regular: "0.01", extended: "0.02" }],
    });
    assert.deepEqual([snap.at, snap.main, snap.editions.length], [T, "0.05", 1]);
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `pnpm -s test:projects 2>&1 | grep -E "^# (pass|fail)|not ok" | head -20`
Expected: FAIL. `CATALOGUES`, `historyOf` and the rest aren't exported yet, so the journey tests error on import.

- [ ] **Step 3: Rewrite `src/lib/manual/journey.ts`.**
  - Keep lines 107–200 as they are: `MediaRef`, `PriceSnapshot`, `str`, `num`, `normalizeMedia`, `normalizePriceSnapshot`.
  - Keep the snapshot section at the bottom (`LiveListingFacts`, `snapshotPrices`) as it is.
  - Replace everything else so the file reads, top to bottom:

```ts
// JOURNEY — a project's Activity: the proof-backed journey of the project, each
// product, and its Main, Physical and Virtual NFTs (spec
// docs/superpowers/specs/2026-10-13-activity-everywhere-design.md; v1 was
// P2-TABS-5…12). Pure: the targets, each target's catalogue, the stored record
// and its v1 read, the form's check, the default Planning, the read helpers and
// the price snapshot. Storage and IndexedDB are journey-store.ts's.
//
// Value imports are relative, so `node --test` loads the compiled module.

import type { EditionKind, EditionUse } from "../market/types";
import type { Token } from "../brief/types";

// ─────────────────────────── targets (spec §1) ───────────────────────────

/** The whole project's copies — lib/market's `PROJECT_SCOPE`, written as a literal so lib/manual
 *  gains no market value import (journey.test.mjs pins the two equal). */
export const WHOLE_PROJECT_SCOPE = "project";

/** Whose activity an entry is. Personal and Business use share one Physical / Virtual target. */
export type ActivityTarget =
  | { kind: "project" }
  | { kind: "product"; productId: string }
  | { kind: "main" }
  | { kind: "physical" | "virtual"; scope: string };

/** One string per target: "project", "product:prd_1", "main", "physical:project", "virtual:prd_1". */
export function targetKey(t: ActivityTarget): string {
  switch (t.kind) {
    case "project":
    case "main":
      return t.kind;
    case "product":
      return `product:${t.productId}`;
    default:
      return `${t.kind}:${t.scope}`;
  }
}

/** Whose journey a drawer or an announcement names: "Smart Lamp", "VoxLamp", "Main NFT",
 *  "VoxLamp · Physical NFT", "Whole project · Virtual NFT". */
export function targetNameOf(t: ActivityTarget, names: { project: string; productName: (id: string) => string }): string {
  switch (t.kind) {
    case "project":
      return names.project;
    case "product":
      return names.productName(t.productId);
    case "main":
      return "Main NFT";
    default: {
      const scope = t.scope === WHOLE_PROJECT_SCOPE ? "Whole project" : names.productName(t.scope);
      return `${scope} · ${t.kind === "physical" ? "Physical NFT" : "Virtual NFT"}`;
    }
  }
}

// ─────────────────────────── catalogues (spec §2) ───────────────────────────

export type TypeDef = { id: string; label: string; short: string; help: string };

const OTHERS: TypeDef = { id: "others", label: "Others", short: "Other", help: "Something that doesn't fit the types above." };

/** Each target kind's types, in order; Others ends every list. A product reads the project's. */
export const CATALOGUES: Readonly<Record<"project" | "main" | "physical" | "virtual", readonly TypeDef[]>> = {
  project: [
    { id: "planning", label: "Planning", short: "Planning", help: "What it is, who it's for, and what it must do." },
    { id: "design", label: "Design", short: "Design", help: "The board, the case and the firmware are drawn up." },
    { id: "prototype", label: "Prototype", short: "Prototype", help: "A first working unit is built." },
    { id: "testing", label: "Testing", short: "Testing", help: "It's been tried out, and problems were found and fixed." },
    { id: "certification", label: "Certification", short: "Certified", help: "Safety and radio approvals, such as CE, FCC or RoHS." },
    {
      id: "ready-for-manufacture",
      label: "Ready for manufacture",
      short: "Mfg ready",
      help: "Files are final; parts and a factory are lined up.",
    },
    { id: "pilot-run", label: "Pilot run", short: "Pilot run", help: "A small first batch, made the way every later one will be." },
    { id: "manufacturing", label: "Manufacturing", short: "Manufacturing", help: "It's being made at volume." },
    { id: "launched", label: "Launched", short: "Launched", help: "It's on sale and reaching buyers." },
    { id: "improvement", label: "Improvement", short: "Improved", help: "A new version or a fix after launch." },
    OTHERS,
  ],
  main: [
    { id: "ip", label: "IP / Patent", short: "IP", help: "A patent, trademark or design right was filed or granted." },
    { id: "partnership", label: "Partnership", short: "Partnership", help: "A deal with a factory, distributor or partner." },
    { id: "sales-report", label: "Sales report", short: "Sales", help: "What sold and what it earned." },
    { id: "milestone", label: "Milestone", short: "Milestone", help: "An award, press, or a goal reached." },
    { id: "roadmap", label: "Roadmap", short: "Roadmap", help: "What's coming next." },
    OTHERS,
  ],
  physical: [
    { id: "making", label: "Making", short: "Making", help: "Units for this batch are being made." },
    { id: "quality-check", label: "Quality check", short: "QC", help: "Units were tested before packing." },
    { id: "shipped", label: "Shipped", short: "Shipped", help: "Units were handed to the courier." },
    { id: "delivered", label: "Delivered", short: "Delivered", help: "Buyers have their units." },
    { id: "delay-notice", label: "Delay notice", short: "Delayed", help: "Something is late, and here's the new date." },
    { id: "fix-notice", label: "Fix notice", short: "Fix", help: "A problem was found in shipped units, and here's the fix." },
    OTHERS,
  ],
  virtual: [
    { id: "files-released", label: "Files released", short: "Released", help: "The first version of the files is out." },
    { id: "update-released", label: "Update released", short: "Updated", help: "A new version, and what changed." },
    { id: "bug-fix", label: "Bug fix", short: "Fix", help: "A problem in the files was fixed." },
    { id: "guide-added", label: "Guide added", short: "Guide", help: "A build guide, video or document was added." },
    { id: "licence-change", label: "Licence change", short: "Licence", help: "What buyers may do with the files changed." },
    OTHERS,
  ],
};

export function catalogueOf(t: ActivityTarget): readonly TypeDef[] {
  return CATALOGUES[t.kind === "product" ? "project" : t.kind];
}

export function typeDefOf(t: ActivityTarget, typeId: string): TypeDef | null {
  return catalogueOf(t).find((d) => d.id === typeId) ?? null;
}

/** v1's stages (Figma's 11 plus Others) → today's project types (spec §2.5). */
export const LEGACY_TYPES: ReadonlyMap<string, string> = new Map([
  ["concept-definition", "planning"],
  ["requirement-gathering", "planning"],
  ["preliminary-architecture", "design"],
  ["digital-design", "design"],
  ["integration-review", "design"],
  ["prototype-development", "prototype"],
  ["testing-refinement", "testing"],
  ["manufacturing-preparation", "ready-for-manufacture"],
  ["pilot-production-run", "pilot-run"],
  ["mass-production", "manufacturing"],
  ["product-launch-feedback", "launched"],
  ["others", "others"],
]);

// ─────────────────────────── the record (spec §3) ───────────────────────────

// MediaRef and PriceSnapshot — keep the existing definitions here unchanged.

export type Activity = {
  v: 2;
  id: string;
  projectId: string;
  target: ActivityTarget;
  /** An id from the target's catalogue. */
  type: string;
  /** Others only. */
  customName?: string;
  description: string;
  urls: string[];
  media: MediaRef[];
  pricing?: PriceSnapshot;
  createdAt: number;
  updatedAt: number;
};

/** A history row: a stored entry, or the synthesized default Planning (spec §4). */
export type JourneyEntry = Activity & { isDefault?: true };

export type ProjectJourney = { v: 1; activities: Activity[] };
export const JOURNEY_KEY = (id: string) => `ideeza:project:journey:${id}`;

// ─────────────────────────── normalize (drops a malformed entry) ───────────────────────────

// str, num, normalizeMedia, normalizePriceSnapshot — keep the existing definitions here unchanged.

function normalizeTarget(raw: unknown): ActivityTarget | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  switch (r.kind) {
    case "project":
      return { kind: "project" };
    case "main":
      return { kind: "main" };
    case "product": {
      const productId = str(r.productId);
      return productId ? { kind: "product", productId } : null;
    }
    case "physical":
    case "virtual": {
      const scope = str(r.scope);
      return scope ? { kind: r.kind, scope } : null;
    }
    default:
      return null;
  }
}

/** A v2 entry as stored, or a v1 entry read as v2: no `target` means v1, whose `productId` names
 *  the product (absent = the project) and whose stage maps through LEGACY_TYPES. A type its
 *  target's catalogue doesn't offer drops the entry. */
function normalizeActivity(raw: unknown): Activity | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  const projectId = str(r.projectId);
  const rawType = str(r.type);
  const description = str(r.description);
  const createdAt = num(r.createdAt);
  const updatedAt = num(r.updatedAt);
  if (!id || !projectId || !rawType || description === null || createdAt === null || updatedAt === null) return null;
  const v1 = r.target === undefined;
  const legacyProduct = str(r.productId);
  const target: ActivityTarget | null = v1
    ? legacyProduct
      ? { kind: "product", productId: legacyProduct }
      : { kind: "project" }
    : normalizeTarget(r.target);
  if (!target) return null;
  const type = v1 ? (LEGACY_TYPES.get(rawType) ?? null) : rawType;
  if (!type || !typeDefOf(target, type)) return null;
  const urls = Array.isArray(r.urls) ? r.urls.filter((u): u is string => typeof u === "string") : [];
  const media = Array.isArray(r.media)
    ? (r.media as unknown[]).map(normalizeMedia).filter((m): m is MediaRef => m !== null)
    : [];
  const out: Activity = { v: 2, id, projectId, target, type, description, urls, media, createdAt, updatedAt };
  const customName = str(r.customName);
  if (customName) out.customName = customName;
  const pricing = normalizePriceSnapshot(r.pricing);
  if (pricing) out.pricing = pricing;
  return out;
}

/** Drops a malformed entry and keeps the rest; a wholly unreadable record reads as an empty journey. */
export function normalizeJourney(raw: unknown): ProjectJourney {
  if (!raw || typeof raw !== "object") return { v: 1, activities: [] };
  const r = raw as Record<string, unknown>;
  const activities = Array.isArray(r.activities)
    ? (r.activities as unknown[]).map(normalizeActivity).filter((a): a is Activity => a !== null)
    : [];
  return { v: 1, activities };
}

// ─────────────────────────── the form's check (spec §5) ───────────────────────────

export type ActivityInput = {
  type: string;
  customName: string;
  description: string;
  urls: string[];
  /** Files attached and saved or saving — real uploads, never a fake percentage (ACT-62). */
  attachments: number;
};

export type ActivityErrors = {
  type: string | null;
  customName: string | null;
  description: string | null;
  /** One entry per `input.urls`, in order. */
  urls: (string | null)[];
  attachments: string | null;
  ok: boolean;
};

const CUSTOM_NAME_MAX = 40;
const DESCRIPTION_MAX = 400;
const HTTPS_ERROR = "Please enter a valid URL starting with https://";
/** Proof is a file (owner, 2026-10-13): a link alone never saves. */
export const PROOF_MISSING = "Add at least one photo, video, PDF or document.";

function isHttpsUrl(u: string): boolean {
  return /^https:\/\//i.test(u.trim());
}

export function checkActivity(input: ActivityInput): ActivityErrors {
  const type = input.type ? null : "Choose an activity type.";

  let customName: string | null = null;
  if (input.type === "others") {
    const n = Array.from(input.customName.trim()).length;
    if (n === 0) customName = "Name this activity.";
    else if (n > CUSTOM_NAME_MAX) customName = "Maximum 40 characters allowed";
  }

  const descLen = Array.from(input.description.trim()).length;
  const description =
    descLen === 0 ? "Describe this activity." : descLen > DESCRIPTION_MAX ? "Maximum 400 characters allowed" : null;

  const urls = input.urls.map((u) => (isHttpsUrl(u) ? null : HTTPS_ERROR));
  const attachments = input.attachments === 0 ? PROOF_MISSING : null;

  const ok = type === null && customName === null && description === null && urls.every((e) => e === null) && attachments === null;
  return { type, customName, description, urls, attachments, ok };
}

// ─────────────────────────── reads (spec §4, §5) ───────────────────────────

/** A target's stored entries, newest first; equal times by id, descending, so the order is stable. */
export function activitiesOf(j: ProjectJourney, target: ActivityTarget): Activity[] {
  const key = targetKey(target);
  return j.activities
    .filter((a) => targetKey(a.target) === key)
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

/** The Planning every project and product starts at: synthesized, never stored, never edited. */
export function defaultPlanningOf(projectId: string, target: ActivityTarget, at: number): JourneyEntry {
  return {
    v: 2,
    id: `default:${targetKey(target)}`,
    projectId,
    target,
    type: "planning",
    description: target.kind === "project" ? "Project created." : "Product added.",
    urls: [],
    media: [],
    createdAt: at,
    updatedAt: at,
    isDefault: true,
  };
}

/** A target's whole history, newest first: its stored entries, then — for the project or a product,
 *  given `defaultAt` (the project's createdAt, or when the product joined) — its default Planning,
 *  always last. An NFT has no default. */
export function historyOf(j: ProjectJourney, projectId: string, target: ActivityTarget, defaultAt?: number): JourneyEntry[] {
  const list: JourneyEntry[] = activitiesOf(j, target);
  if ((target.kind === "project" || target.kind === "product") && defaultAt !== undefined) {
    list.push(defaultPlanningOf(projectId, target, defaultAt));
  }
  return list;
}

/** The target's current activity: its newest entry, the default included; null for an NFT with none. */
export function currentOf(j: ProjectJourney, projectId: string, target: ActivityTarget, defaultAt?: number): JourneyEntry | null {
  return historyOf(j, projectId, target, defaultAt)[0] ?? null;
}

type Named = Pick<Activity, "target" | "type" | "customName">;

export function labelOf(e: Named): string {
  if (e.type === "others") return e.customName?.trim() || OTHERS.label;
  return typeDefOf(e.target, e.type)?.label ?? "Activity";
}

export function shortOf(e: Named): string {
  if (e.type === "others") return e.customName?.trim() || OTHERS.short;
  return typeDefOf(e.target, e.type)?.short ?? "Activity";
}

export function helpOf(e: Named): string {
  return typeDefOf(e.target, e.type)?.help ?? "";
}

// LiveListingFacts and snapshotPrices — keep the existing price-snapshot section here unchanged.
```

  Put the kept blocks exactly where the `// … keep the existing …` comments sit, then delete those comments. `EditionKind`, `EditionUse` and `Token` are still used by `PriceSnapshot` and `LiveListingFacts`.

- [ ] **Step 4: Run the journey tests.**

Run: `pnpm -s test:projects 2>&1 | grep -E "journey|^# (pass|fail)" | head`
Expected: the tsc step of `test:projects` fails in `project-read.ts`, `products-tab-view.ts` and others that import `currentStage`/`STAGES`. Continue: Steps 5–9 fix those.

- [ ] **Step 5: Create `src/lib/manual/journey-dates.ts`:**

```ts
// When a product joined its project (spec §4): the date its default Planning
// carries. The first saved build of the product's lineage (its chat), never
// before the project itself; a hand-made product, or one whose build left
// nothing to read, takes the project's creation.
//
// Pure, type imports only.

import type { BuildRef, ProjectProduct } from "./project-read";

export function productAddedAt(
  project: { createdAt: number },
  refs: readonly Pick<BuildRef, "chatId" | "savedAt">[],
  product: Pick<ProjectProduct, "built">,
): number {
  const chatId = product.built?.ref.chatId ?? null;
  if (chatId === null) return project.createdAt;
  const times = refs.filter((r) => r.chatId === chatId && r.savedAt !== null).map((r) => r.savedAt as number);
  return times.length ? Math.max(project.createdAt, Math.min(...times)) : project.createdAt;
}
```

- [ ] **Step 6: Update `src/lib/manual/project-read.ts`.**
  - Line 49 becomes `import { currentOf, defaultPlanningOf, type JourneyEntry, type ProjectJourney } from "./journey";`.
  - In `ProjectView`, replace the three lines at 664–666 with:

```ts
  /** The project's current activity (spec §4–§5): its newest entry, else its default Planning. */
  current: JourneyEntry;
```

  - In `projectView`, replace `const activities = ctx.journey?.activities ?? [];` (line 779) with:

```ts
  const journey: ProjectJourney = ctx.journey ?? { v: 1, activities: [] };
  const projectTarget = { kind: "project" } as const;
```

  - In `derived`, replace `stage: currentStage(activities),` and `activityCount: activities.length,` with:

```ts
    current: currentOf(journey, p.id, projectTarget, p.createdAt) ?? defaultPlanningOf(p.id, projectTarget, p.createdAt),
```

- [ ] **Step 7: Update `src/lib/manual/products-tab-view.ts`.**
  - Line 24 becomes:

```ts
import { currentOf, labelOf, shortOf, type ProjectJourney } from "./journey";
import { productAddedAt } from "./journey-dates";
import type { BuildRef, ProjectProduct } from "./project-read";
```

  - Replace the block from `/** P2-TABS-10's pill` through the end of `productsTabView` with:

```ts
/** The card's current-activity pill: "{short}", named "Now: {label}" for a screen reader. */
export type StagePill = { short: string; ariaLabel: string };

export type ProductCardView = {
  /** P2-VIDEO-12: the owner's line on a current product; null on a dropped product and in a preview. */
  video: string | null;
  /** The product's current activity (spec §7.2): its newest entry, else "Planning". */
  stage: StagePill | null;
};

/**
 * The Products tab's per-card facts, by row id (P2-VIDEO-12; spec §7.2). The video line reads the
 * page's own readiness (`view.videos.readiness.showcase.products`, the current products only), so a
 * dropped product has none; the pill reads the product's journey, its default Planning dated when
 * the product joined.
 */
export function productsTabView(
  view: {
    products: readonly Pick<ProjectProduct, "id" | "built">[];
    refs: readonly Pick<BuildRef, "chatId" | "savedAt">[];
    videos: { readiness: { showcase: { products: readonly ProductReadiness[] } } };
  },
  ctx: { owner: boolean; journey: ProjectJourney; project: { id: string; createdAt: number } },
): Record<string, ProductCardView> {
  const videoOf = new Map(view.videos.readiness.showcase.products.map((p) => [p.productId, p.video]));
  const out: Record<string, ProductCardView> = {};
  for (const product of view.products) {
    const status = ctx.owner ? videoOf.get(product.id) : undefined;
    const at = productAddedAt(ctx.project, view.refs, product);
    const now = currentOf(ctx.journey, ctx.project.id, { kind: "product", productId: product.id }, at);
    out[product.id] = {
      video: status ? videoLineOf(status) : null,
      stage: now ? { short: shortOf(now), ariaLabel: `Now: ${labelOf(now)}` } : null,
    };
  }
  return out;
}
```

  If tsc reports an import cycle problem (`project-read` → `products-tab-view` → `project-read`), it's fine: both new imports into `products-tab-view` are `import type` or come from `journey-dates`, which only type-imports `project-read`.

- [ ] **Step 8: Update the header meta.**

In `src/lib/manual/project-summary.ts`:
  - In `HeaderText`, replace the `stage` field (lines 620–621) with:

```ts
  /** The project's current activity, "Now: Prototype" (also the last part of `meta`); null when not shown. */
  now: string | null;
```

  - In `HeaderCtx`, replace the `stage` field (lines 633–634) with:

```ts
  /** The project's current activity (`view.current`), for the meta line; null or absent leaves it out. */
  now?: { label: string } | null;
```

  - Replace lines 708–709 with:

```ts
  const now = ctx.now ? `Now: ${ctx.now.label}` : null;
  if (now) meta.push({ kind: "text", text: now });
```

  - In the returned object, replace `stage,` (line 740) with `now,`.
  - Update the COR-10 comment on `meta` (line 612) to `"4 products · Version 2 · Saved Sep 26, 2026[ · Now: Prototype]"`.

In `src/lib/manual/project-header.ts`, replace `engineeringMetaOf` with:

```ts
/** The engineering meta line: the stage line already counts the products and names the
 *  version, so this keeps the rest of COR-10's line — "Saved Sep 26, 2026[ · build not in this
 *  browser][ · Now: Prototype]". No ownership lead: who holds what is Earn › Splits. */
export function engineeringMetaOf(s: Pick<ProjectSummary, "when" | "source">, now: { label: string } | null): MetaPart[] {
  const at = s.when.at;
  const meta: MetaPart[] = [
    { kind: "time", time: { text: `${s.when.label} ${formatDate(at)}`, dateTime: new Date(at).toISOString(), title: formatDateTime(at) } },
  ];
  if (s.source.kind === "build-gone") meta.push({ kind: "text", text: "build not in this browser" });
  if (now) meta.push({ kind: "text", text: `Now: ${now.label}` });
  return meta;
}
```

- [ ] **Step 9: Update the three existing tests and add `activity-views.test.mjs`.**

`tests/projects/project-header.test.mjs` lines 189–192 become:

```js
  const meta = engineeringMetaOf({ when: { label: "Saved", at }, source: BUILD }, { label: "Prototype" });
  assert.deepEqual(
    meta.map((m) => (m.kind === "time" ? m.time.text : m.text)),
    ["Saved Sep 26, 2026", "Now: Prototype"],
  );
```

`tests/projects/status-precedence.test.mjs` lines 222–229 become:

```js
test("headerText · the current activity ends the meta line", () => {
  const s = sum(project(), SAVE);
  const h = headerText(s, { now: { label: "Prototype" } });
  assert.equal(h.now, "Now: Prototype");
  assert.equal(h.meta.at(-1).text, "Now: Prototype");
  assert.ok(h.metaText.endsWith("· Now: Prototype"));
  assert.equal(headerText(s).now, null);
});
```

`tests/projects/project-view.test.mjs` line 83 becomes:

```js
      assert.deepEqual(
        [view.current.type, view.current.isDefault, view.current.createdAt, view.lock, view.marketUnreadable],
        ["planning", true, fx.project.createdAt, null, false],
      );
```

  If the fixture variable there isn't `fx`, use the loop variable's name. Line 83 sits in `for (const fx of ALL)`.

Create `tests/projects/activity-views.test.mjs`:

```js
// The products tab's current-activity pill and a product's join date (spec §4, §7.2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { productsTabView } from "../../.tmp-test/lib/manual/products-tab-view.js";
import { productAddedAt } from "../../.tmp-test/lib/manual/journey-dates.js";

const T = Date.UTC(2026, 8, 22, 9, 0);
const DAY = 86_400_000;
const ref = (chatId, savedAt) => ({ chatId, savedAt });
const built = (chatId) => ({ ref: { chatId } });

test("productAddedAt: the lineage's first save, never before the project; else the project's creation", () => {
  const p = { createdAt: T };
  const refs = [ref("c1", T + 2 * DAY), ref("c1", T + DAY), ref("c2", T + 5 * DAY), ref("c1", null)];
  assert.equal(productAddedAt(p, refs, { built: built("c1") }), T + DAY);
  assert.equal(productAddedAt(p, refs, { built: built("c2") }), T + 5 * DAY);
  assert.equal(productAddedAt(p, refs, { built: null }), T);
  assert.equal(productAddedAt(p, [ref("c1", T - DAY)], { built: built("c1") }), T);
});

test("productsTabView: every product has a pill — its newest entry, else Planning", () => {
  const view = {
    products: [{ id: "prd_a", built: built("c1") }, { id: "prd_b", built: null }],
    refs: [ref("c1", T)],
    videos: { readiness: { showcase: { products: [] } } },
  };
  const journey = {
    v: 1,
    activities: [
      {
        v: 2, id: "a1", projectId: "p1", target: { kind: "product", productId: "prd_a" }, type: "testing",
        description: "d", urls: [], media: [], createdAt: T + DAY, updatedAt: T + DAY,
      },
      {
        v: 2, id: "a2", projectId: "p1", target: { kind: "project" }, type: "launched",
        description: "d", urls: [], media: [], createdAt: T + 2 * DAY, updatedAt: T + 2 * DAY,
      },
    ],
  };
  const cards = productsTabView(view, { owner: false, journey, project: { id: "p1", createdAt: T } });
  assert.deepEqual(cards.prd_a.stage, { short: "Testing", ariaLabel: "Now: Testing" });
  assert.deepEqual(cards.prd_b.stage, { short: "Planning", ariaLabel: "Now: Planning" }, "a project entry never counts for a product");
  assert.equal(cards.prd_a.video, null);
});
```

- [ ] **Step 10: Run the lib tests.**

Run: `pnpm -s test:projects 2>&1 | grep -E "^# (tests|pass|fail)|not ok"`
Expected: `# fail 0`.

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -oE "^src/[^(]+" | sort -u`
Expected: only these files, all of which Task 3 owns:
- `src/components/projects/details/activity/drawer.tsx`
- `src/components/projects/details/activity/entry.tsx`
- `src/components/projects/details/activity/form.tsx`
- `src/components/projects/details/activity/timeline.tsx` (if any)
- `src/components/projects/details/project-menu.tsx`
- `src/components/projects/product/product-menu.tsx`
- `src/components/projects/details/header.tsx`
- `src/components/projects/earn/earn-header.tsx`
- `src/components/projects/details/project-page.tsx`
- `src/components/marketplace/market-slots.tsx`

  Any other file in that list is a miss in this task. Fix it here.

- [ ] **Step 11: Commit.**

```bash
git add src/lib/manual/journey.ts src/lib/manual/journey-dates.ts src/lib/manual/project-read.ts src/lib/manual/products-tab-view.ts src/lib/manual/project-summary.ts src/lib/manual/project-header.ts tests/projects/journey.test.mjs tests/projects/activity-views.test.mjs tests/projects/project-header.test.mjs tests/projects/status-precedence.test.mjs tests/projects/project-view.test.mjs
git commit -m "feat(activity): targets, per-target catalogues, a synthesized Planning and a file as proof — the journey model and its lib readers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The owner's Activity, per target, and every compile consumer

This makes the drawer, form, entry and timeline target-aware. It wires the project and product menus, and updates the header, Earn header, Products tab call sites and Innovations status. **At the end, the whole app type-checks.**

**Files:**
- Modify: `src/components/projects/details/activity/entry.tsx` (imports `:28`; delete `stageMetaOf` `:48-52`; export `MediaTile`; delete `ProductTag`/`productTagOf` `:332-346`; rewrite `ActivityEntry` `:348-430`; add `EntryProof`)
- Modify: `src/components/projects/details/activity/timeline.tsx` (whole file)
- Modify: `src/components/projects/details/activity/drawer.tsx` (props, entries, subtitle, announcements, form props, `stageTitleOf`)
- Modify: `src/components/projects/details/activity/form.tsx` (imports, props, type state, Product select removal, Activity v2, proof label and error placement, focus on first invalid field)
- Modify: `src/components/projects/details/project-menu.tsx:36`, `:86`, `:124-128`, `:235-249`
- Modify: `src/components/projects/product/product-menu.tsx:21`, `:59`, `:64-70`, `:165-177`
- Modify: `src/components/projects/details/header.tsx:102`, `:151`
- Modify: `src/components/projects/earn/earn-header.tsx:45`
- Modify: `src/components/projects/details/project-page.tsx:75-80`
- Modify: `src/components/marketplace/market-slots.tsx:32-38`
- Modify: `src/components/newsfeed/shared-by-you.tsx` (status from the journey)

**Interfaces:**
- Consumes (Task 2): `ActivityTarget`, `JourneyEntry`, `catalogueOf`, `checkActivity(input)`, `historyOf`, `currentOf`, `labelOf`, `helpOf`, `targetNameOf`, `productAddedAt`, `ProjectView.current`, `HeaderCtx.now`, `engineeringMetaOf(s, { label } | null)`, and the new `productsTabView` context.
- Produces:
  - `ActivityDrawer` props: `{ open; onClose; projectId: string; target: ActivityTarget; targetName: string; defaultAt?: number; products: { id: string; name: string }[]; canWrite: boolean; isPreview: boolean; announce: (m: string) => void; now: number }`
  - exported `MediaTile`, `EntryProof({ entry, onOpenMedia, onOpenLink })` and `ActivityLightbox` (unchanged) from `entry.tsx`

  Task 4 uses those exports.

- [ ] **Step 1: `entry.tsx`.**
  - Change line 28 to `import { helpOf, labelOf, type JourneyEntry, type MediaRef } from "@/lib/manual/journey";`.
  - Delete `stageMetaOf` (lines 48–52).
  - Change `function MediaTile(` to `export function MediaTile(`.
  - Change `PricePills`' prop type from `activity: Activity` to `activity: JourneyEntry`.
  - Delete `ProductTag` and `productTagOf` (lines 332–346).
  - Replace the whole `ActivityEntry` function with:

```tsx
/** An entry's proof: its media tiles, then a card per link (opened through the confirm dialog). */
export function EntryProof({
  entry,
  onOpenMedia,
  onOpenLink,
}: {
  entry: JourneyEntry;
  onOpenMedia: (media: MediaRef[], index: number) => void;
  onOpenLink: (url: string) => void;
}) {
  const viewable = entry.media.filter((m) => m.kind === "image" || m.kind === "video");
  return (
    <>
      {entry.media.length > 0 && (
        <ul role="list" className="mt-4 flex flex-wrap gap-2">
          {entry.media.map((m) => (
            <li key={m.id}>
              <MediaTile media={m} onView={() => onOpenMedia(viewable, viewable.indexOf(m))} />
            </li>
          ))}
        </ul>
      )}
      {entry.urls.length > 0 && (
        <ul role="list" className="mt-3 flex flex-col gap-2">
          {entry.urls.map((u, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onOpenLink(u)}
                className="flex w-full items-center gap-2 rounded-lg border border-solid border-border px-4 py-3 text-left text-sm text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Link01Icon} size={16} className="shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1 truncate">{u}</span>
                <Icon icon={SquareArrowUpRightIcon} size={14} className="shrink-0 text-text-tertiary" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function ActivityEntry({
  activity,
  products,
  canWrite,
  onEdit,
  onDeleteRequest,
  onOpenMedia,
  onOpenLink,
}: {
  activity: JourneyEntry;
  products: readonly { id: string; name: string }[];
  /** False for the default Planning: it has no ⋮. */
  canWrite: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onOpenMedia: (media: MediaRef[], index: number) => void;
  onOpenLink: (url: string) => void;
}) {
  const title = labelOf(activity);
  const help = helpOf(activity);

  return (
    <li className="border-b border-solid border-border py-6 first:pt-0 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-md font-semibold text-text-primary">{title}</h3>
          {help && <InfoBubble label={`What is ${title}?`} text={help} />}
        </div>
        {canWrite && <EntryMenu activityId={activity.id} stage={title} onEdit={onEdit} onDelete={onDeleteRequest} />}
      </div>
      <p className="mt-1 text-sm text-text-tertiary">{formatDate(activity.createdAt)}</p>
      {activity.description && <p className="mt-3 line-clamp-4 text-sm text-text-secondary">{activity.description}</p>}
      <EntryProof entry={activity} onOpenMedia={onOpenMedia} onOpenLink={onOpenLink} />
      <PricePills activity={activity} products={products} />
    </li>
  );
}
```

  Update the file's header comment: "the date line" instead of "the date and product-tag line".

- [ ] **Step 2: Replace `timeline.tsx` with:**

```tsx
"use client";

// The Activity History drawer's list view: one target's history, newest first,
// hairline dividers, no stepper dots — `ActivityEntry` rows (entry.tsx), the
// default Planning last and without a ⋮ — and the empty state an NFT target
// shows before its first entry.

import type { JourneyEntry, MediaRef } from "@/lib/manual/journey";
import { ActivityEntry } from "./entry";

export type ActivityTimelineProps = {
  entries: readonly JourneyEntry[];
  products: readonly { id: string; name: string }[];
  canWrite: boolean;
  isPreview: boolean;
  onEdit: (entry: JourneyEntry) => void;
  onDeleteRequest: (entry: JourneyEntry) => void;
  onOpenMedia: (media: MediaRef[], index: number) => void;
  onOpenLink: (url: string) => void;
};

export function ActivityTimeline({
  entries,
  products,
  canWrite,
  isPreview,
  onEdit,
  onDeleteRequest,
  onOpenMedia,
  onOpenLink,
}: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-md font-semibold text-text-primary">{isPreview ? "No journey shared yet." : "No activities yet"}</p>
        {!isPreview && (
          <p className="max-w-[42ch] text-sm text-text-secondary">
            Add the first one with a photo, video or document — buyers see it on this NFT.
          </p>
        )}
      </div>
    );
  }

  return (
    <ul role="list" className="flex flex-col">
      {entries.map((entry) => (
        <ActivityEntry
          key={entry.id}
          activity={entry}
          products={products}
          canWrite={canWrite && !entry.isDefault}
          onEdit={() => onEdit(entry)}
          onDeleteRequest={() => onDeleteRequest(entry)}
          onOpenMedia={onOpenMedia}
          onOpenLink={onOpenLink}
        />
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: `drawer.tsx`.**
  - Replace the journey import with `import { historyOf, labelOf, type Activity, type ActivityTarget, type JourneyEntry, type LiveListingFacts, type MediaRef } from "@/lib/manual/journey";`.
  - In `ActivityDrawerProps`, delete `scope` and add:

```ts
  /** Whose journey this is (spec §6.1): the project, a product, Main, or one Physical / Virtual scope. */
  target: ActivityTarget;
  /** `targetNameOf(target, …)`: the subtitle and the announcements name it. */
  targetName: string;
  /** The default Planning's date — the project's createdAt, or when the product joined; absent for an NFT. */
  defaultAt?: number;
```

  - Destructure `target, targetName, defaultAt` instead of `scope`.
  - Change the `ViewState`/`Overlay` types' `Activity` to `JourneyEntry`, and `openForm`'s `entry` param to `JourneyEntry | null`.
  - Replace `const entries = activitiesFor(record, { productId: scope?.productId });` with:

```ts
  const entries = historyOf(record, projectId, target, defaultAt);
  const stored = entries.filter((e) => !e.isDefault).length;
```

  - In `handleSaved`, the announcement becomes:
    `announce(\`${stageLabel} ${mode === "add" ? "added to" : "updated in"} ${targetName}'s journey.\`);`
  - `handleDelete(entry: JourneyEntry)`'s announcement becomes:
    `announce(\`${labelOf(entry)} deleted from ${targetName}'s journey.\`);`
  - Replace the whole `subtitle` block (including the ⋮-hint comment from `feat/build-log-name`) with:

```tsx
  // The ⋮ hint only once there is an entry to edit, drawn as that button's
  // own icon: the "⋮" character fell back to a colon in the UI font.
  const subtitle = isPreview ? undefined : canWrite && stored > 0 ? (
    <>
      {targetName} · newest first. Use{" "}
      <Icon icon={MoreVerticalIcon} size={14} className="inline-block align-[-2px]" />
      <span className="sr-only">the actions button</span> to edit a stage.
    </>
  ) : (
    `${targetName} · newest first.`
  );
```

  - `ActivityTimeline` loses `scope={scope}`.
  - `ActivityForm` loses `products={products}` and `defaultProductId={scope?.productId}`, and gains `target={target}`.
  - The `ConfirmDialog` title uses `labelOf(overlay.entry)` in place of `stageTitleOf(overlay.entry)`.
  - Delete `stageTitleOf` at the bottom.

- [ ] **Step 4: `form.tsx`.**

  1. Imports: replace the journey import with

```ts
import {
  catalogueOf,
  checkActivity,
  labelOf,
  snapshotPrices,
  type Activity,
  type ActivityInput,
  type ActivityTarget,
  type JourneyEntry,
  type LiveListingFacts,
  type MediaRef,
} from "@/lib/manual/journey";
```

  2. Props: in `ActivityFormProps`:
     - delete `products` and `defaultProductId`;
     - change `entry: Activity | null` to `entry: JourneyEntry | null`;
     - add `/** Whose entry this is: the type list is its catalogue (spec §6.2). */ target: ActivityTarget;`.

     Update the destructuring to match.
  3. State:
     - `React.useState<StageId | "">(entry?.type ?? "")` becomes `React.useState<string>(entry?.type ?? "")`;
     - delete the `productId` state line.
  4. Delete `const typeMeta = …`.
  5. `const errors = checkActivity(input, products.length);` becomes `const errors = checkActivity(input);`.
  6. Replace `stageOptions` and `productOptions` with
     `const typeOptions = catalogueOf(target).map((d) => ({ value: d.id, label: d.label, info: d.help }));`
  7. Add these refs beside `fileInputRef`:

```ts
  const formRef = React.useRef<HTMLFormElement>(null);
  const typeWrapRef = React.useRef<HTMLDivElement>(null);
  const dropRef = React.useRef<HTMLDivElement>(null);

  // After a refused save, the keyboard goes to the first field at fault (spec §6.2).
  function focusFirstInvalid() {
    requestAnimationFrame(() => {
      const form = formRef.current;
      const el: HTMLElement | null | undefined = errors.type
        ? typeWrapRef.current?.querySelector<HTMLElement>("button")
        : errors.customName
          ? form?.querySelector<HTMLElement>("#activity-name")
          : errors.description
            ? form?.querySelector<HTMLElement>("#activity-description")
            : errors.urls.some(Boolean)
              ? form?.querySelector<HTMLElement>('input[aria-invalid="true"]')
              : errors.attachments
                ? dropRef.current
                : null;
      el?.focus();
    });
  }
```

  8. In `handleSubmit`, replace `if (!errors.ok || filesBusy || saving) return;` with

```ts
    if (filesBusy || saving) return;
    if (!errors.ok) {
      focusFirstInvalid();
      return;
    }
```

     Then replace the `activity` object with

```ts
    const activity: Activity = {
      v: 2,
      id: entry?.id ?? randomId("act_"),
      projectId,
      target,
      type,
      ...(isOthers && customName.trim() ? { customName: customName.trim() } : {}),
      description: description.trim(),
      urls: nonBlankUrls,
      media,
      ...(pricing ? { pricing } : {}),
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
    };
```

     and the label line with `const label = labelOf({ target, type, customName });`.
  9. JSX:
     - `<form id={formId} …>` gains `ref={formRef}`.
     - The intro paragraph becomes:

```tsx
        {mode === "add"
          ? "Add at least one photo, video, PDF or document as proof — buyers see it in the journey."
          : "Changes update this entry in the journey. It keeps at least one file."}
```

     - Wrap the type `SelectMenu` in `<div ref={typeWrapRef} className="flex flex-col gap-2">` (replacing the existing wrapper div). Make it `SelectMenu<string>` with `options={typeOptions}` and `placeholder="Choose a type"`.
     - Delete the whole `{products.length >= 2 && (<SelectMenu label="Product" … />)}` block.
     - Pass `error={showAttachError}` and `dropRef={dropRef}` to `<MediaSection …>`.
     - Delete the bottom `{showAttachError && (<p role="alert" …>)}` block. Keep the `saveError` one.
  10. `MediaSection`:
      - Add props `error: string | null` and `dropRef: React.RefObject<HTMLDivElement | null>`.
      - Give the dropzone `ref={dropRef}` and `aria-describedby={error ? errorId : undefined}`, where `const errorId = React.useId();`.
      - Change the label line to

```tsx
      <span className="text-md text-input-label">
        Attach Media <span aria-hidden className="text-text-error">*</span>
        <span className="sr-only">(required)</span>
      </span>
```

      - Directly under the dropzone `div`, add

```tsx
      {error && (
        <p id={errorId} role="alert" className="text-sm text-text-error">
          {error}
        </p>
      )}
```

- [ ] **Step 5: `project-menu.tsx`.**
  - Line 36 becomes `import { currentOf, labelOf, type ActivityTarget } from "@/lib/manual/journey";`.
  - Add a module constant `const PROJECT_TARGET: ActivityTarget = { kind: "project" };`.
  - Replace line 86 with `const current = currentOf(record, project.id, PROJECT_TARGET, project.createdAt);`.
  - The activity item's `sub` becomes `current ? \`Now: ${labelOf(current)}\` : "Notes on its phase and status"`.
  - On `<ActivityDrawer …>`, add

```tsx
        target={PROJECT_TARGET}
        targetName={project.name.trim() || "Untitled project"}
        defaultAt={project.createdAt}
```

- [ ] **Step 6: `product-menu.tsx`.**
  - Line 21 becomes `import { currentOf, labelOf, type ActivityTarget } from "@/lib/manual/journey";` and add `import { productAddedAt } from "@/lib/manual/journey-dates";`.
  - Replace line 59 with

```ts
  const target = React.useMemo<ActivityTarget>(() => ({ kind: "product", productId: product.id }), [product.id]);
  const addedAt = productAddedAt(project, view.refs, product);
  const current = currentOf(record, project.id, target, addedAt);
```

  - The activity item's `sub` becomes `current ? \`Now: ${labelOf(current)}\` : "Notes on its phase and status"`.
  - On `<ActivityDrawer …>`, replace `scope={{ productId: product.id, productName: product.name }}` with

```tsx
        target={target}
        targetName={displayProductName(product.name)}
        defaultAt={addedAt}
```

- [ ] **Step 7: Headers.**
  - `header.tsx` line 102 becomes `const text = headerText(summary, { viewer, now: null, context });`. On the buyer side the "Now" block (Task 4) carries it, so the meta line doesn't say it twice.
  - `header.tsx` line 151's `engineeringMetaOf(summary, view.stage)` becomes `engineeringMetaOf(summary, { label: labelOf(view.current) })`, with `import { labelOf } from "@/lib/manual/journey";`.
  - `earn-header.tsx` line 45 becomes `const text = headerText(summary, { viewer, now: { label: labelOf(view.current) } });`, with the same import.

- [ ] **Step 8: The Products tab call sites.**
  - In `project-page.tsx` (lines 75–80) the memo becomes
    `() => productsTabView(view, { owner, journey, project }),` with deps `[view, owner, journey, project]`.
  - In `market-slots.tsx` (lines 32–38) it becomes
    `() => productsTabView(view, { owner: false, journey, project }),` with deps `[view, journey, project]`.

  In both files `journey` is the `record` from `useJourney(project.id)`. Keep the existing destructuring, which renames it `journey`.

- [ ] **Step 9: Innovations status.** In `shared-by-you.tsx`:
  - add `import { currentOf, labelOf } from "@/lib/manual/journey";` and `import { readJourney } from "@/lib/manual/journey-store";`;
  - replace `status: null as string | null,` (from Task 1) with

```tsx
          status: labelOf(
            currentOf(readJourney(p.id), p.id, { kind: "project" }, p.createdAt) ?? { target: { kind: "project" }, type: "planning" },
          ),
```

  - Update the header comment's "the name with the post's status" to "the name with the project's current activity".

- [ ] **Step 10: Type-check, lint and test.**

Run: `npx tsc --noEmit -p tsconfig.json; echo exit $?`
Expected: `exit 0`.
Run: `npx eslint src/components/projects/details/activity src/components/projects/details/project-menu.tsx src/components/projects/product/product-menu.tsx src/components/projects/details/header.tsx src/components/projects/earn/earn-header.tsx src/components/projects/details/project-page.tsx src/components/marketplace/market-slots.tsx src/components/newsfeed/shared-by-you.tsx`
Expected: no output.
Run: `pnpm -s test:projects 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 0`. If `page-frames.test.mjs` asserts on removed source text (for example `productTagOf` or "Notes on its phase"), update that assertion to the new text and say so in the commit body.

- [ ] **Step 11: Check it in the browser.**
  1. Start the branch's dev server: add a `.claude/launch.json` entry in the session's cwd that runs `npx next dev -p 3000` in this worktree, and use `preview_start`. If another server holds :3000, stop it first, or use :3004.
  2. Open a saved project → ⋯ → Activity.
     - **Check:** the subtitle is "{project} · newest first.", the list ends with **Planning · "Project created."** with no ⋮, and the ⋯ item says "Now: Planning".
  3. Add a **Testing** entry with a description, no file, and press Add Now.
     - **Check:** the error "Add at least one photo, video, PDF or document." sits under Attach Media, and focus is on the dropzone.
  4. Attach a PNG and press Add Now.
     - **Check:** the entry is first, ⋯ says "Now: Testing", and the header meta ends "Now: Testing".
  5. Open a product → ⋯ → Activity.
     - **Check:** the list is that product's own and ends with Planning · "Product added.". The Products tab card pill says "Planning".

- [ ] **Step 12: Commit.**

```bash
git add src/components/projects/details/activity src/components/projects/details/project-menu.tsx src/components/projects/product/product-menu.tsx src/components/projects/details/header.tsx src/components/projects/earn/earn-header.tsx src/components/projects/details/project-page.tsx src/components/marketplace/market-slots.tsx src/components/newsfeed/shared-by-you.tsx
git commit -m "feat(activity): the drawer is one target's journey — its own types, a file required, Planning first, Now in the menus and the header

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Add `tests/projects/page-frames.test.mjs` to the `git add` if Step 10 changed it.

---

### Task 4: The viewer's "Now" block and its placements

**Files:**
- Create: `src/components/projects/details/activity/now-block.tsx`
- Modify: `src/components/projects/details/header.tsx` (after `<ProjectDescription …/>`, around line 228)
- Modify: `src/components/projects/product/product-page.tsx` (after `{description && <ClampedText text={description} />}`, around line 241)
- Modify: `src/components/marketplace/buyer-rail.tsx:195-211` (inside the listing's `RailBlock`)
- Modify: `src/components/marketplace/edition-offers.tsx:84-100` (the group's track list)

**Interfaces:**
- Consumes: `historyOf`, `labelOf`, `activitiesOf`, `WHOLE_PROJECT_SCOPE`, `ActivityTarget`, `JourneyEntry`, `MediaRef`, `productAddedAt`, and from `entry.tsx`: `EntryProof` and `ActivityLightbox`. Also `LinkConfirmDialog` from `../link-confirm`.
- Produces: `ActivityNow({ projectId: string; target: ActivityTarget; defaultAt?: number; compact?: boolean; className?: string })`. It renders nothing until the journey is read, and nothing for a target with no history.

- [ ] **Step 1: Create `now-block.tsx`:**

```tsx
"use client";

// The viewer's Activity (spec §7.1): a target's current entry under "Now" — its
// type, date, description (4 lines, or 2 when compact, then Show more), proof
// tiles and links — then "Earlier ({n})", a disclosure that opens the rest
// inline, newest first, the default Planning last. Read-only: no ⋮, no Add,
// no price snapshot. Nothing renders for a target with no history (an NFT
// before its first entry) or before the journey is read.

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza";
import { historyOf, labelOf, type ActivityTarget, type JourneyEntry, type MediaRef } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { formatDate } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import { LinkConfirmDialog } from "../link-confirm";
import { ActivityLightbox, EntryProof } from "./entry";

type Overlay = { kind: "lightbox"; media: MediaRef[]; index: number } | { kind: "link"; url: string };

const QUIET_BUTTON =
  "inline-flex min-h-[32px] items-center gap-2 self-start rounded-lg text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

export function ActivityNow({
  projectId,
  target,
  defaultAt,
  compact = false,
  className,
}: {
  projectId: string;
  target: ActivityTarget;
  /** The default Planning's date (project or product); absent for an NFT. */
  defaultAt?: number;
  /** The rail's NFT cards: a 2-line description and tighter spacing. */
  compact?: boolean;
  className?: string;
}) {
  const { hydrated, record } = useJourney(projectId);
  const [open, setOpen] = React.useState(false);
  const [overlay, setOverlay] = React.useState<Overlay | null>(null);
  const listId = React.useId();
  const history = historyOf(record, projectId, target, defaultAt);
  if (!hydrated || history.length === 0) return null;
  const [current, ...earlier] = history;
  const openMedia = (media: MediaRef[], index: number) => setOverlay({ kind: "lightbox", media, index });
  const openLink = (url: string) => setOverlay({ kind: "link", url });

  return (
    <section
      aria-label="Activity"
      className={cn("flex flex-col gap-3 rounded-xl border border-solid border-border", compact ? "p-3" : "p-4", className)}
    >
      <NowEntry entry={current} lead compact={compact} onOpenMedia={openMedia} onOpenLink={openLink} />
      {earlier.length > 0 && (
        <>
          <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((v) => !v)} className={QUIET_BUTTON}>
            Earlier ({earlier.length})
            <Icon
              icon={ArrowDown01Icon}
              size={14}
              className={cn("transition-transform duration-fast motion-reduce:transition-none", open && "rotate-180")}
            />
          </button>
          <ol id={listId} hidden={!open} role="list" className={cn("m-0 list-none flex-col p-0", open ? "flex" : "hidden")}>
            {earlier.map((e) => (
              <li key={e.id} className="border-t border-solid border-border py-3 last:pb-0">
                <NowEntry entry={e} compact onOpenMedia={openMedia} onOpenLink={openLink} />
              </li>
            ))}
          </ol>
        </>
      )}
      {overlay?.kind === "lightbox" && (
        <ActivityLightbox
          media={overlay.media}
          index={overlay.index}
          onIndexChange={(index) => setOverlay((o) => (o?.kind === "lightbox" ? { ...o, index } : o))}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "link" && <LinkConfirmDialog url={overlay.url} onClose={() => setOverlay(null)} />}
    </section>
  );
}

function NowEntry({
  entry,
  lead = false,
  compact,
  onOpenMedia,
  onOpenLink,
}: {
  entry: JourneyEntry;
  /** The current entry: "Now" and its type as a pill. */
  lead?: boolean;
  compact: boolean;
  onOpenMedia: (media: MediaRef[], index: number) => void;
  onOpenLink: (url: string) => void;
}) {
  const [more, setMore] = React.useState(false);
  const [clamped, setClamped] = React.useState(false);
  const descRef = React.useRef<HTMLParagraphElement>(null);
  const descId = React.useId();
  React.useLayoutEffect(() => {
    const el = descRef.current;
    if (el && !more) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [entry.description, more]);
  const label = labelOf(entry);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {lead && <span className="text-sm text-text-tertiary">Now</span>}
        {lead ? <Badge tone="brand-outline">{label}</Badge> : <span className="text-sm font-semibold text-text-primary">{label}</span>}
        <time dateTime={new Date(entry.createdAt).toISOString()} className="text-sm text-text-tertiary">
          {formatDate(entry.createdAt)}
        </time>
      </div>
      {entry.description && (
        <p
          ref={descRef}
          id={descId}
          className={cn("m-0 text-sm text-text-primary", !more && (compact ? "line-clamp-2" : "line-clamp-4"))}
        >
          {entry.description}
        </p>
      )}
      {(clamped || more) && (
        <button type="button" aria-controls={descId} aria-expanded={more} onClick={() => setMore((v) => !v)} className={QUIET_BUTTON}>
          {more ? "Show less" : "Show more"}
        </button>
      )}
      <EntryProof entry={entry} onOpenMedia={onOpenMedia} onOpenLink={onOpenLink} />
    </div>
  );
}
```

  The media tiles keep `MediaTile`'s own names ("View photo.png" / "Download spec.pdf") and its 60 px size. Both meet the spec's naming and 44 px intent.

- [ ] **Step 2: The project header (buyer side and preview).** In `header.tsx`, add `import { ActivityNow } from "./activity/now-block";`. Directly after the `<ProjectDescription … />` element, add:

```tsx
          {!engineering && <ActivityNow projectId={project.id} target={{ kind: "project" }} defaultAt={project.createdAt} />}
```

- [ ] **Step 3: The product page (buyer side and preview).**
  - In `product-page.tsx`, add `import { ActivityNow } from "../details/activity/now-block";` and `import { productAddedAt } from "@/lib/manual/journey-dates";`.
  - Directly after `{description && <ClampedText text={description} />}`, add:

```tsx
                    {!ownerFacts && view && (
                      <ActivityNow
                        projectId={project.id}
                        target={{ kind: "product", productId: product.id }}
                        defaultAt={productAddedAt(project, view.refs, product)}
                      />
                    )}
```

  - Confirm `project`, `product` and `view` are non-null at that point in the render (they are inside the ready branch). If TypeScript disagrees, drop the `view &&` guard only when `view` is narrowed already.

- [ ] **Step 4: The Main NFT card.**
  - In `buyer-rail.tsx`, add `import { ActivityNow } from "@/components/projects/details/activity/now-block";`.
  - Inside the listing's `<RailBlock title="Marketplace" …>`, before the `{viewer.kind === "demo-buyer" ? (` line, add:

```tsx
      <ActivityNow compact projectId={project.id} target={{ kind: "main" }} className="mb-6" />
```

- [ ] **Step 5: The Physical and Virtual offers.**
  - In `edition-offers.tsx`, add:

```tsx
import { ActivityNow } from "@/components/projects/details/activity/now-block";
import { activitiesOf } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
```

  - Read the journey at the top of `EditionOffers`, before any early return: `const { record: journey } = useJourney(project.id);`.
  - Replace the `{g.tracks.map((t) => ( <li key={t.id}> … </li> ))}` with:

```tsx
            {g.tracks.map((t, i) => {
              // One activity block per (scope, kind), above that kind's first card (spec §7.2):
              // Personal and Business share the target. `g.productId` is PROJECT_SCOPE or a product id.
              const target = { kind: t.kind, scope: g.productId } as const;
              const first = i === 0 || g.tracks[i - 1].kind !== t.kind;
              return (
                <React.Fragment key={t.id}>
                  {first && activitiesOf(journey, target).length > 0 && (
                    <li>
                      <ActivityNow compact projectId={project.id} target={target} />
                    </li>
                  )}
                  <li>
                    {/* the existing BuyableOffer / OfferFrame branch, unchanged */}
                  </li>
                </React.Fragment>
              );
            })}
```

  Move the existing `<li key={t.id}>` body (the `buyerId ? <BuyableOffer …/> : <OfferFrame …>` expression) into the second `<li>` unchanged, and delete the placeholder comment.

- [ ] **Step 6: Type-check and lint.**

Run: `npx tsc --noEmit -p tsconfig.json; echo exit $?`
Expected: `exit 0`.
Run: `npx eslint src/components/projects/details/activity/now-block.tsx src/components/projects/details/header.tsx src/components/projects/product/product-page.tsx src/components/marketplace/buyer-rail.tsx src/components/marketplace/edition-offers.tsx`
Expected: no output.

- [ ] **Step 7: Check it in the browser.**
  1. On the project from Task 3 (it has Testing and Planning), open **Earn → Preview as buyer**, or the project page with `?view=buyer`.
     - **Check:** under the description, "Now" with a **Testing** pill, the date, the description and the PNG tile.
  2. Press "Earlier (1)".
     - **Check:** Planning · "Project created." appears below, and the button reads `aria-expanded="true"` (`read_page`). Press it again; the list hides.
  3. Click the tile.
     - **Check:** the lightbox opens; Esc closes it.
  4. Open a product in the preview.
     - **Check:** its block shows Planning · "Product added." with no Earlier.
  5. If the project is listed, open `/marketplace/<id>`.
     - **Check:** the same block, and on the Main card no block until Task 5 adds a Main entry.
  6. Resize to 375 px.
     - **Check:** the block is full width with no horizontal scroll, and the "Earlier" button is at least 44 px tall.

- [ ] **Step 8: Commit.**

```bash
git add src/components/projects/details/activity/now-block.tsx src/components/projects/details/header.tsx src/components/projects/product/product-page.tsx src/components/marketplace/buyer-rail.tsx src/components/marketplace/edition-offers.tsx
git commit -m "feat(activity): viewers see Now and Earlier — on the project, each product, the Main NFT and each Physical / Virtual scope

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Earn › Sell — an Activity line under each NFT row

**Files:**
- Create: `src/components/projects/earn/activity-line.tsx`
- Modify: `src/components/projects/earn/sell.tsx` (`MainRow`'s `SellRow` children, around lines 141–149)
- Modify: `src/components/projects/earn/editions.tsx` (`CopyRow`'s `SellRow` children)

**Interfaces:**
- Consumes: `ActivityDrawer` (Task 3 props), `currentOf`, `labelOf`, `targetNameOf`, `ActivityTarget`, `useJourney`, `can`, `isPreview`, `displayProductName`, `formatDate`.
- Produces: `ActivityLine({ ...SlotProps, target: ActivityTarget })`. It renders nothing when there is no entry and the viewer can't write.

- [ ] **Step 1: Create `activity-line.tsx`:**

```tsx
"use client";

// Earn › Sell's Activity line (spec §6.1): under a Main, Physical or Virtual
// row, "Activity · {type} · {date} ›" — or "Activity · Add the first one ›"
// before any — opening that NFT's own Activity History. It sits under the row,
// not inside Manage: the Main row has no Manage before it is listed.

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { currentOf, labelOf, targetNameOf, type ActivityTarget } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { isPreview } from "@/lib/manual/buyer-preview";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { formatDate } from "@/lib/manual/project-summary";
import { ActivityDrawer } from "../details/activity/drawer";
import type { SlotProps } from "../details/slots";

const LINE =
  "inline-flex min-h-[32px] items-center gap-2 self-start rounded-lg text-sm text-text-secondary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

export function ActivityLine({ project, view, viewer, announce, now, target }: SlotProps & { target: ActivityTarget }) {
  const { hydrated, record } = useJourney(project.id);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const canWrite = can(viewer, "activity.write", view.canCtx);
  const current = currentOf(record, project.id, target);
  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  if (!hydrated || (!current && !canWrite)) return null;
  const name = targetNameOf(target, {
    project: project.name.trim() || "Untitled project",
    productName: (id) => displayProductName(view.products.find((p) => p.id === id)?.name ?? "A product"),
  });

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={LINE}>
        <span>
          Activity · {current ? `${labelOf(current)} · ${formatDate(current.createdAt)}` : "Add the first one"}
        </span>
        <Icon icon={ArrowRight01Icon} size={14} />
      </button>
      <ActivityDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          requestAnimationFrame(() => triggerRef.current?.focus());
        }}
        projectId={project.id}
        target={target}
        targetName={name}
        products={products}
        canWrite={canWrite}
        isPreview={isPreview(viewer)}
        announce={announce}
        now={now}
      />
    </>
  );
}
```

  If `isPreview` lives elsewhere, grep for `export function isPreview` and fix the import path. `drawer.tsx` and `product-menu.tsx` already import it, so copy their path.

- [ ] **Step 2: The Main row.**
  - In `sell.tsx`, add `import { ActivityLine } from "./activity-line";`.
  - Inside `MainRow`'s `<SellRow …>`, as its first child (before `{steps && listing && …}`), add:

```tsx
      {view.summary.status !== "draft" && view.mint.status !== "notMinted" && <ActivityLine {...props} target={{ kind: "main" }} />}
```

- [ ] **Step 3: The Physical and Virtual rows.**
  - In `editions.tsx`, add `import { ActivityLine } from "./activity-line";`.
  - In `CopyRow`, find its returned `<SellRow …>`. As the first child inside it, add:

```tsx
      {view.editions.some((t) => t.productId === scope.id && t.kind === kind) && (
        <ActivityLine {...props} target={{ kind, scope: scope.id }} />
      )}
```

  `props` is `CopyRow`'s rest props (`SlotProps`) and `scope.id` is `PROJECT_SCOPE` or a product id. Both are already in scope.

- [ ] **Step 4: Type-check, lint and test.**

Run: `npx tsc --noEmit -p tsconfig.json; echo exit $?`
Expected: `exit 0`.
Run: `npx eslint src/components/projects/earn/activity-line.tsx src/components/projects/earn/sell.tsx src/components/projects/earn/editions.tsx`
Expected: no output.
Run: `pnpm -s test:projects 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 0`.

- [ ] **Step 5: Check it in the browser.**
  1. On a minted project, open Earn › Sell.
     - **Check:** under the Main row, "Activity · Add the first one ›".
  2. Open it.
     - **Check:** the subtitle is "Main NFT · newest first.", the type list is IP / Patent … Others, and there is no Planning row.
  3. Add a **Milestone** with a file.
     - **Check:** the line reads "Activity · Milestone · {date} ›".
  4. If a product has a Physical track, open its line, add **Shipped** with a file, and open Preview as buyer.
     - **Check:** above that product's first Physical card, a compact "Now · Shipped" block, shown once even with Personal and Business cards.
  5. For a project not yet minted:
     - **Check:** no Activity line under Main.

- [ ] **Step 6: Commit.**

```bash
git add src/components/projects/earn/activity-line.tsx src/components/projects/earn/sell.tsx src/components/projects/earn/editions.tsx
git commit -m "feat(activity): Earn › Sell — each NFT's own Activity line, under its row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Docs, and the full verification

**Files:**
- Modify: `docs/guides/features/platform-and-projects.md:37` (the Activity paragraph)
- Modify: `src/lib/manual/journey-store.ts:1-2` (header comment only: "a project's journey — every target's Activity")

- [ ] **Step 1: Replace the Activity bullet in `platform-and-projects.md`:**

```markdown
- **Activity** (`details/activity/*`, `lib/manual/journey*.ts`; spec `docs/superpowers/specs/2026-10-13-activity-everywhere-design.md`): one journey per project, each entry tagged with its **target** — the project, a product, the Main NFT, or one Physical / Virtual scope — and typed from that target's catalogue (`CATALOGUES`). Every project and product starts at a synthesized **Planning** (never stored); after that only the owner adds, each entry needs at least one file (a link alone never saves). The owner opens a target's drawer where it lives: project ⋯ › Activity, product ⋯ › Activity, and the Activity line under each NFT row in Earn › Sell (the Main row once minted, a copy row once it has a track). Viewers (Preview as buyer, Explore marketplace) see `ActivityNow`: "Now" plus the current entry, then "Earlier (n)" opening the rest inline — on the project and product pages, above the Main card, and once per (scope, kind) above the copy cards. The header meta, the ⋯ items, the Products tab pill and the Innovations status all read the current activity (`currentOf`).
```

- [ ] **Step 2: Run the full check.**

Run: `npx tsc --noEmit -p tsconfig.json; echo exit $?`
Expected: `exit 0`.
Run: `npx eslint src/lib/manual src/components/projects src/components/marketplace src/components/newsfeed src/components/brief 2>&1 | tail -3`
Expected: no errors. Warnings that existed on `main` are fine.
Run: `pnpm -s test:projects 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: `# fail 0`. `# tests` is 1,315 + the new tests − the replaced journey/share-post tests.
Run: `npx next build 2>&1 | tail -5` (in the background if it takes over 2 minutes)
Expected: the build completes ("Compiled successfully" / route table), exit 0.

- [ ] **Step 3: The browser journey, start to finish.** Use the built-in browser on the branch's dev server.
  1. A legacy entry reads as v2. In the console, write `localStorage["ideeza:project:journey:<id>"]` with one v1 entry (`type: "mass-production"`, no `target`), then reload.
     - **Check:** the drawer shows **Manufacturing**.
  2. Proof is required on Edit. Edit an entry and remove its only file.
     - **Check:** Update shows the proof error and focus goes to the dropzone.
  3. The Innovations status follows the activity. Share the project to Innovations; the dialog asks only for the story. Then open `/innovations`.
     - **Check:** "Shared by you" shows the project's current activity (for example "Testing"). Add a newer project entry, revisit, and see that it changed.
  4. Check the phone width: set 375 × 812 and repeat the Preview-as-buyer check from Task 4, Step 7. Then reset the viewport.

- [ ] **Step 4: Commit.**

```bash
git add docs/guides/features/platform-and-projects.md src/lib/manual/journey-store.ts
git commit -m "docs(activity): the guide describes targets, Planning, proof and the viewer's Now block

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand off.** Report to the owner, in Bengali:
  - the commits;
  - the test count;
  - the build result;
  - the screenshots: the owner drawer, the proof error, Preview as buyer with Earlier open, an NFT card block, and the phone width.

  The branch stays unpushed until the owner verifies.

---

## Self-review notes (done while writing)

- **Spec coverage:**

  | Spec | Where |
  |---|---|
  | §1, §2, §3 | Task 2 Step 3 |
  | §4 | Task 2 Steps 3, 5 and 6 |
  | §5 | Task 2 Step 3, and Task 3 Step 4 for the form |
  | §6.1 | Task 3 Steps 5–6, and Task 5 |
  | §6.2 | Task 3 Steps 3–4 |
  | §6.3 | Task 2 Step 8, and Task 3 Step 7 |
  | §6.4 | Task 1 |
  | §7.1 | Task 4 Step 1 |
  | §7.2 | Task 4 Steps 2–5, Task 2 Step 7 (the pill) and Task 3 Step 9 (Innovations) |
  | §8 | covered by the exact target match and the history order (tests in Task 2) |
  | §9 | Tasks 2 and 6 |

- **One small difference from the spec:** the spec's §7.1 says tiles are named "Open photo 1 of 3". The plan keeps the existing names, "View {file}" or "Download {file}", which already name each tile. Raise it if the owner wants the counted form.
- **Placeholder scan:** none. Every code step shows its code. The one "existing body, unchanged" move in Task 4 Step 5 names the exact expression to move.
- **Type consistency:**
  - `ActivityTarget`, `JourneyEntry`, `historyOf(j, projectId, target, defaultAt?)` and `currentOf(...)` are used with the same signature in every task.
  - `productAddedAt(project, refs, product)` is the same in Tasks 2, 3 and 4.
  - `headerText`'s `now` and `engineeringMetaOf`'s `{ label }` are the same in Tasks 2 and 3.
