# Project Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A project needs N product videos plus 1 project video, joined from them, before it can be sold, given, shared or relisted.

**Architecture:**
- The project video is stored and rendered like a product video, under the reserved key `"project"` in the same record.
- A pure status module (`lib/video/project-video.ts`) feeds a new readiness rule.
- A new browser renderer joins the products' clips.
- The existing rows, dialogs and surfaces gain a project row, a Project video dialog, and the project video first wherever the whole project is shown.

**Tech stack:** Next.js 16 / React 19 / TypeScript, node:test over `src/lib` (`npm run test:projects`), WebCodecs + mp4-muxer (with a MediaRecorder fallback), IndexedDB clip store.

**Spec:** `docs/superpowers/specs/2026-10-21-project-video-design.md`, owner-approved D1–D10.

## Global Constraints

- Branch `feat/project-video`, worktree `~/Downloads/Ideeza/IDEEZA_Creator-wt/project-video`. Stage only your own paths and never use `git add -A`. No push.
- Tokens only. Light and dark. Text sizes come from the DS (body 14 = `text-md`, captions 12 = `text-sm`). No new dependency.
- Copy is word for word from the spec's "Rows and copy" section.
- No stubs. Every control does real work and is browser-verified.
- `npx tsc --noEmit -p tsconfig.json`, `npm run test:projects` and `npm run lint` (on touched files) pass.
- Docs: the area's guide under `docs/guides/features/` is updated in the same change.

---

## Shared interfaces (produced by Task 1 — every later task consumes these)

```ts
// src/lib/video/types.ts
export const PROJECT_VIDEO_KEY = "project";
export type JoinCut = { productId: string; takeId: string; fromMs: number; ms: number; label: string };
export type JoinPlan = { intro: [string, string]; cuts: JoinCut[]; outro: string };
// VideoTake gains:  join?: JoinPlan

// src/lib/video/jobs.ts — VideoJob.render gains:  join?: JoinPlan | null

// src/lib/video/project-video.ts (new, pure)
export const INTRO_MS = 2000, OUTRO_MS = 2000;
export function cutMs(n: number): number;                       // min(10000, max(2000, 15000 / n)), rounded to 100 ms
export function joinLengthMs(plan: JoinPlan): number;           // INTRO + Σ cut.ms + OUTRO
export function isProjectKey(id: string): boolean;
export function defaultJoinPlan(input: {
  projectName: string; description: string;
  products: { id: string; name: string }[];                     // current products, in the order wanted
  videos: ProjectVideos | null;
}): JoinPlan | null;                                            // null unless every product has an in-use ready take with a clip
export type ProjectVideoState = "waiting" | "make" | "rendering" | "ready" | "outdated" | "failed";
export type ProjectVideoStatus = {
  state: ProjectVideoState;
  ok: boolean;                       // counts as made for the gate
  video: ProductVideoStatus;         // the "project" record's own status
  ready: number; total: number;      // current products with a ready video / current products
  missing: string[];                 // current products the in-use take leaves out (names)
  extra: string[];                   // products the in-use take shows that aren't current (names)
  older: string[];                   // products cut from an older take than their in-use one (names)
  lengthMs: number | null;           // the in-use take's length
};
export function projectVideoStatusOf(input: {
  products: ProjectProduct[];        // the full list (dropped included); current = dropped === null
  videos: ProjectVideos | null; jobs: VideoJob[]; now: number;
}): ProjectVideoStatus;
export function describeJoin(plan: JoinPlan): string[];         // transcript lines for the player

// src/lib/manual/p2-types.ts
ReadinessRuleId adds "projectVideo";  Readiness adds  project: ProjectVideoStatus | null;

// src/lib/manual/readiness.ts
export function videoCountOf(r: Readiness): { ready: number; total: number };   // products + project row

// src/lib/video/video-copy.ts
export const PROJECT_VIDEO_TITLE = "Project video";
export const PROJECT_HONESTY: string;
export type ProjectRowCopy = { text: string; sub: string | null; tone: "error" | "neutral" | "success" | "warning";
  icon: "lock" | "check" | "spinner" | "alert" | "info"; action: "make" | "update" | "retry" | null; progress: number | null };
export function projectRowCopy(s: ProjectVideoStatus): ProjectRowCopy;
export function projectActionLabel(a: ProjectRowCopy["action"]): string | null;  // "Make project video" | "Update project video" | "Update" | "Try again"
export function projectStateLine(s: ProjectVideoStatus): string | null;         // screen-reader state changes

// src/components/video-jobs/video-jobs-provider.tsx (Ctx)
export type ProjectVideoSpec = { projectId: string; projectName: string; plan: JoinPlan; quality: VideoQuality; audioPrompt?: string };
startProjectVideo: (spec: ProjectVideoSpec) => StartResult;   // take under PROJECT_VIDEO_KEY, job.productId = PROJECT_VIDEO_KEY, job.render.join = plan
// pickTake / deleteTake / cancelRender / saveDraft already accept PROJECT_VIDEO_KEY as the productId.
```

### Task 1: Model, status, readiness, ladder, copy, provider start (P1)

**Files:**
- Modify: `src/lib/video/types.ts`, `src/lib/video/jobs.ts`, `src/lib/video/product-video.ts`, `src/lib/manual/p2-types.ts`, `src/lib/manual/readiness.ts`, `src/lib/commerce/ladder.ts`, `src/lib/video/video-copy.ts`, `src/components/video-jobs/video-jobs-provider.tsx`
- Create: `src/lib/video/project-video.ts`, `tests/projects/project-video.test.mjs`
- Test: `tests/projects/readiness.test.mjs`, `tests/projects/earn-ladder.test.mjs`, `tests/projects/product-video.test.mjs`

- [ ] Write the failing tests:
  - `project-video.test.mjs`:
    - `cutMs` for 1, 2, 3, 5 and 10 products gives 10000, 7500, 5000, 3000 and 2000.
    - `defaultJoinPlan` returns null when one product lacks a ready video.
    - `defaultJoinPlan` cuts from the end (`fromMs = durationMs - ms`).
    - The status table covers each case: waiting with no project take; make; rendering; ready; ready with `older`; outdated when a product is added; outdated when a product is dropped; failed when products are ready; waiting when failed and a product is missing.
    - `describeJoin` gives one line per segment.
  - `readiness.test.mjs`:
    - sell, showcase, give, relist and videos carry `projectVideo`; edition doesn't.
    - The blocker order is videos first, then projectVideo.
    - A missing project video blocks sell with "Every product has its video. Make the project video to continue."
    - `videoCountOf` gives N+1.
    - The videos reason adds " The project video comes next." while any product is missing, and " Then update the project video." when outdated.
  - `earn-ladder.test.mjs`:
    - `videosReady` is false when only the project video is missing.
    - The label is "Videos ready".
  - `product-video.test.mjs`:
    - `featuredVideoOf` returns the project's in-use take first.
    - `startTake` keeps `join`.
    - `sanitizeProjectVideos` keeps `join`.
- [ ] Run `npm run test:projects`. Expected: the new cases FAIL.
- [ ] Implement the interfaces above. In `startTake`, the input gains `join?: JoinPlan`. `sanitizeTake` keeps a well-formed `join`. In the provider, `startProjectVideo` mirrors `startProductVideo` with productId `PROJECT_VIDEO_KEY`, `source: null`, `lines = [intro[0], intro[1], outro]`, `prompt: ""` and `render: { lines, imageUrl: null, productName: projectName, join: plan }`. `readinessCopy("videos")` becomes title "Videos" and info "Every product needs an AI video. Then the project video is made from them."
- [ ] Run the tests and tsc. Expected: PASS.
- [ ] Commit `feat(video): project video model, status and readiness rule`.

### Task 2: Join renderer and encode branch (P2)

**Files:**
- Modify: `src/components/video-jobs/clip-renderer.ts`, `src/components/video-jobs/video-jobs-provider.tsx` (the encode `run` only), `src/components/video-jobs/global-render-indicator.tsx`

**Interfaces:**
- Consumes: `JoinPlan` and `job.render.join`, `getClip(takeId)` from `lib/video/clip-store` (`ClipRecord.video: Blob`), and `joinLengthMs`.
- Produces: `export async function renderJoin(input: { plan: JoinPlan; projectName: string; quality: VideoQuality }, opts?: { signal?: AbortSignal }): Promise<RenderedClip>`.

Steps:
- [ ] Generalise the two encoders so they take `seconds` and an `async` paint (`paint: (t) => void | Promise<void>`). `renderClip` keeps passing 10 s with its sync painter.
- [ ] Implement `renderJoin`:
  - Load each cut's clip blob with `getClip`. A missing one throws `ClipRenderError("encode")`.
  - Make an object URL and a muted `<video>` per cut.
  - For each frame at time t:
    - Intro: a brand-gradient card with `intro[0]` big and `intro[1]` small. Use `makePainter`'s title-band and gradient helpers, refactored so both painters share them.
    - Each cut: seek its video to `fromMs + local`, await `seeked`, `drawImage` cover-fit, plus a top-left chapter label (the cut's `label`) on a scrim.
    - Outro: a gradient card with `outro`.
    - 250 ms cross-fades between segments.
  - The poster is taken at 1.5 s into the first cut.
  - Revoke the URLs in `finally`.
- [ ] In the provider's `run`, call `renderJoin({ plan: render.join, projectName: render.productName, quality: job.quality })` when `render.join` is set. Everything after it (putClip, finishTake, lock) stays the same.
- [ ] In the global render indicator, a job with `productId === PROJECT_VIDEO_KEY` resolves to a project target. Its title is "Project video · {project}". "Try again" opens the Project video dialog from Task 3 through `openProjectVideoDialog(projectId)` (exported by Task 3). Until that export exists, Try again for a project job is hidden. Never use a dead button.
- [ ] Verify in the browser with a seeded 3-product project. Make the product videos, then call `startProjectVideo`: the file plays, is 19 s long, and shows each product in order.
- [ ] Commit `feat(video): join renderer for the project video`.

### Task 3: Rows, Project video dialog, review, Media tab (P3)

**Files:**
- Modify: `src/components/projects/details/readiness-dialog.tsx`, `src/components/brief/step-review.tsx`, `src/components/projects/details/media-tab.tsx`, `src/components/projects/videos-dialog.tsx` (copy only, if needed)
- Create: `src/components/video-jobs/project-video-dialog.tsx`, `src/components/video-jobs/project-video-row.tsx`

**Interfaces:**
- Consumes: `projectVideoStatusOf`, `readiness.project`, `videoCountOf`, `projectRowCopy`, `projectActionLabel`, `projectStateLine`, `defaultJoinPlan`, `cutMs`, `joinLengthMs`, `startProjectVideo`, `qualityOpen`, `PROJECT_HONESTY`.
- Produces:
  - `<ProjectVideoRow status={…} projectName thumbs onAction? />`, which renders as an `<li>` in a `ul.rows`.
  - `<ProjectVideoDialog project view onClose back? />`.
  - `export function openProjectVideoDialog(projectId: string)`, a root host like `make-videos.tsx` mounted once in `app/layout.tsx`, used by Task 2's Try again.

Steps:
- [ ] `ReadinessDialog`:
  - Add a "Project video" group under the products when `readiness.project` isn't null.
  - The row action opens `ProjectVideoDialog` on top, with ← Back, like Generate.
  - `dialogBlockerOf` also counts `projectVideo`.
  - Live state changes use `projectStateLine`.
- [ ] `StepReview`: add the same two groups. The count is `videoCountOf`. The line is the first failing reason of videos/projectVideo, or "Every video is ready." The Make videos button shows while either rule fails.
- [ ] `ProjectVideoDialog`, from the mockup:
  - A timeline strip.
  - Scenes: intro (2 inputs ≤ 60), product cuts with ↑ ↓ and a label input ≤ 60, and outro (1 input).
  - Quality (720p locked by plan with "720p comes with the Disruptor plan."), optional Sound, `PROJECT_HONESTY`, and Cancel / Generate project video.
  - Its draft is saved through `saveDraft(projectId, PROJECT_VIDEO_KEY, …)`.
- [ ] Media tab: a "Project video" section above the product videos. It has the player, "Take n · 480p · 19 s", Regenerate (opens the dialog) and Takes (pick or delete through the provider with `PROJECT_VIDEO_KEY`). The player transcript uses `describeJoin`. Owner only; a buyer sees the player only.
- [ ] Browser-verify all spec states, both themes, and 390 px.
- [ ] Commit `feat(projects): project video row, dialog and Media section`.

### Task 4: Where the whole project is shown (P4)

**Files:**
- Modify: `src/lib/innovations/mine-post.ts`, `src/components/innovations/post-media.tsx`, `src/components/brief/step-success.tsx`, `src/lib/market/sell-flow.ts` (or wherever "Each product has its AI video" lives), `src/components/projects/earn/sell/sell-flow-dialog.tsx` (the fix for a missing project video opens the Make videos dialog), `docs/guides/features/*` (the projects/video guide)
- Test: `tests/projects/innovations-sample.test.mjs` or a new `tests/projects/mine-post.test.mjs`, and `tests/projects/sell-flow.test.mjs`

**Interfaces:**
- Consumes: `PROJECT_VIDEO_KEY`, `isProjectKey`, `featuredVideoOf` (now project first), `readiness.project`, `PROJECT_VIDEO_TITLE`.

Steps:
- [ ] Test first:
  - A shared project's post media lists the project video first, then the product videos in product order.
  - The sell checks read "Each product has its AI video, and the project video is made" and fail when only the project video is missing.
- [ ] Implement. `post-media.tsx` labels the project item with the project's name, never a product lookup. `step-success.tsx` shows the project video's poster first.
- [ ] Update the feature guide entries.
- [ ] Commit `feat(projects): project video first where the whole project shows`.

### Task 5: Verify (P5)

- [ ] `npx tsc --noEmit -p tsconfig.json`, `npm run test:projects`, `npm run lint`, `next build`.
- [ ] Run the browser journey on this worktree's dev server, seeding a 3-product project:
  - Review step: 0 of 4, then 3 of 4, the project row unlocks with a toast and live text, Generate, 4 of 4, and Sign is enabled.
  - Scenarios: 1 product; a product added after; a product take re-made; private.
  - Media tab and Innovations post.
  - Phone at 390 px, light and dark.
- [ ] Measure font sizes against Home (14/12).
