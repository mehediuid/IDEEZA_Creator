# Task C9: Outside-the-pages touch points, accessibility & performance, and docs

C9 is the last implementation step (spec §5 "Build order", step 7): it runs
after every other NOW task (the data layer, My projects, Project details, the
product page) has landed, because its four sub-tasks touch files those tasks
don't own (the build review surface, the Brief, a dashboard modal, the shared
button atom, the root toast layer, the PCB assembly module) plus the docs that
describe all of it. Split into C9a–C9d in this one file, per the writer's
instructions.

**Depends on** (produced by earlier tasks, per spec §5.1 — consumed here, not
re-implemented):
- `ManualProject.builds`, `ManualProject.showcasedAt`, `setShowcase(id, on)`
  (`src/lib/manual/projects.tsx`);
- `buildsOf(p, all)`, `lineageProjectOf(job, all, projects)`, `type BuildRef`
  (`src/lib/manual/project-read.ts`).

---

## Task C9a: Save/Brief copy touch points outside the two pages

**Requirements:** COR-40, COM-21, COM-56, CNT-6

**Files:**
- Create: `src/lib/create/save-footer.ts`, `src/lib/brief/success-copy.ts`,
  `tests/projects/save-footer.test.mjs`, `tests/projects/success-copy.test.mjs`
- Modify: `src/components/create/review-outputs.tsx` (imports `:18–55`,
  hook destructure `:101–103`, footer `:513–582`), `src/components/brief/step-4-success.tsx`
  (whole file — imports, the three copy helpers, `Step4Success`'s props and
  body, the trailing `<style>`), `src/components/brief/brief-app.tsx`
  (`:1146–1151`, the `<Step4Success>` call), `src/components/dashboard/project-info-modal.tsx`
  (top comment `:6–10`, hook destructure `:47–48`, `handleSubmit`'s existing-project
  branch `:109–119`, the Description field `:207–223`)
- Test: `tests/projects/save-footer.test.mjs`, `tests/projects/success-copy.test.mjs`

**Interfaces:**
- Consumes: `buildsOf(p: ManualProject, all: BuildJob[]): BuildRef[]` and
  `lineageProjectOf(job: BuildJob, all: BuildJob[], projects: ManualProject[]): ManualProject | null`
  from `src/lib/manual/project-read.ts`; `setShowcase(id: string, on: boolean): void`
  from `useManualProjects()` (`src/lib/manual/projects.tsx`); `Intent` from
  `src/lib/brief/types.ts`.
- Produces: `nextVersionOf(job: BuildJob, refs: BuildRef[]): number`
  (`src/lib/create/save-footer.ts`); `liveSubline(intent: Intent, hasClip: boolean): string`,
  `pendingSubline(intent: Intent): string`, `pendingCardLine(intent: Intent, quality: string): string`
  (`src/lib/brief/success-copy.ts`); `Step4Success` gains a `projectId: string | null` prop.

### Background — what's real today, read from the current files

The review footer (`review-outputs.tsx:513–582`) has two branches. Unsaved
(`saved` is `null`): *"All {n} pieces are ready. Save it [to the project you
chose|as a project], or open it in the editor."* over **Save Project** and
**Open in editor**. Saved: *"Saved to {saved.name}. Add a brief to sell, give
or keep it private — or open the project to keep editing."* over **Add
Brief** and, today, a button labelled **Open Project** (`:544`). Neither
paragraph is a live region, and `saved.name` is plain text.

`step-4-success.tsx` has three pure copy helpers — `liveSubline` (`:36–48`),
`pendingSubline` (`:51–63`), `pendingCardLine` (`:72–79`) — and a `POSTED`
constant (`:28–29`, `" Your post is up on Innovations."`). All three read
`state.shareToNewsfeed` and, when it's ticked, append or substitute a promise
of an Innovations post; Give's live copy (`:44–45`) says *"Your community can
claim it."* None of this is real (COM-21): nothing posts anywhere, and
Showcase (COR-105) is an orthogonal project flag with its own row, not a
Brief-tick outcome. The step never offers Showcase itself — it stops at **Go
to My Projects** / **Back to home** (`:234–261`), so COM-56's own entry point
doesn't exist yet.

`project-info-modal.tsx`'s existing-project submit branch (`:109–119`)
persists a description edit through `updateProject`, unconditionally except
for a same-text guard — a second write path for a field CNT-1…7 (elsewhere,
NOW) gives its own inline editor with its own limit (1,000 chars, CNT-5) and
its own confirm/cancel flow. CNT-6's fix removes the second path.

### Step 1: Write the failing tests

`tests/projects/save-footer.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { nextVersionOf } from "../../.tmp-test/lib/create/save-footer.js";

test("nextVersionOf starts a lineage at 1", () => {
  const job = { id: "b3", chatId: "c1" };
  assert.equal(nextVersionOf(job, []), 1);
});

test("nextVersionOf continues the same chat's highest version", () => {
  const job = { id: "b3", chatId: "c1" };
  const refs = [
    { buildId: "b1", chatId: "c1", version: 1, savedAt: 1, job: null },
    { buildId: "b2", chatId: "c1", version: 2, savedAt: 2, job: null },
  ];
  assert.equal(nextVersionOf(job, refs), 3);
});

test("nextVersionOf ignores another chat's versions", () => {
  const job = { id: "b3", chatId: "c1" };
  const refs = [{ buildId: "b9", chatId: "c9", version: 5, savedAt: 1, job: null }];
  assert.equal(nextVersionOf(job, refs), 1);
});
```

`tests/projects/success-copy.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  liveSubline,
  pendingSubline,
  pendingCardLine,
} from "../../.tmp-test/lib/brief/success-copy.js";

const BANNED = /Innovations|claim it/i;

test("live/pending copy never claims an Innovations post or a claimable drop (COM-21)", () => {
  for (const intent of ["sell", "give", "save"]) {
    for (const hasClip of [true, false]) {
      assert.ok(!BANNED.test(liveSubline(intent, hasClip)), `liveSubline(${intent}, ${hasClip})`);
    }
    assert.ok(!BANNED.test(pendingSubline(intent)), `pendingSubline(${intent})`);
    assert.ok(!BANNED.test(pendingCardLine(intent, "720p")), `pendingCardLine(${intent})`);
  }
});

test("liveSubline names the sale/give facts honestly", () => {
  assert.equal(
    liveSubline("sell", true),
    "Your video is final and your listing is minted. It goes on sale when the marketplace opens.",
  );
  assert.equal(liveSubline("give", false), "The drop is open.");
  assert.equal(liveSubline("save", false), "Stored in your library. Pick it up any time.");
});

test("pendingCardLine no longer branches on sharing", () => {
  assert.equal(
    pendingCardLine("save", "480p"),
    "It is replaced by your 480p 10s video as soon as that finishes.",
  );
});
```

### Step 2: Run it, expected FAIL

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: `tsc` fails — `Cannot find module '../../.tmp-test/lib/create/save-footer.js'`
and `'../../.tmp-test/lib/brief/success-copy.js'` (neither source file exists
yet).

### Step 3: Implement

**New `src/lib/create/save-footer.ts`** (relative imports only — a test pulls
this in, and tsc's output doesn't rewrite `@/`, per the harness notes):
```ts
// save-footer.ts — COR-40's version arithmetic for the review footer's
// unsaved copy ("Save it as version {n} of {project}."): the version number
// the NEXT press of Save Project would give this build, worked out the same
// way attach() numbers a lineage (project-read.ts), so the footer's guess
// can't disagree with what Save actually writes.
import type { BuildJob } from "./history";
import type { BuildRef } from "../manual/project-read";

export function nextVersionOf(job: BuildJob, refs: BuildRef[]): number {
  const v = Math.max(0, ...refs.filter((r) => r.chatId === job.chatId).map((r) => r.version));
  return v + 1;
}
```

**New `src/lib/brief/success-copy.ts`** (relative import, same reason):
```ts
// success-copy.ts — Step 4's pure copy (COM-21). Showcase, including any
// Innovations post, is the project's own flag (COR-105, set from the
// Outcome row or this step's own Showcase control); neither the live nor
// the pending line claims a post that hasn't happened, and Give's "Your
// community can claim it." is dropped — nothing here promises what the app
// can't back yet.
import type { Intent } from "./types";

export function liveSubline(intent: Intent, hasClip: boolean): string {
  return intent === "sell"
    ? hasClip
      ? "Your video is final and your listing is minted. It goes on sale when the marketplace opens."
      : "Your listing is minted. It goes on sale when the marketplace opens."
    : intent === "give"
      ? hasClip
        ? "Your video is final and the drop is open."
        : "The drop is open."
      : "Stored in your library. Pick it up any time.";
}

/** Minted, with the render still running — what happens without you. */
export function pendingSubline(intent: Intent): string {
  return intent === "sell"
    ? "Your listing is minted. It goes on sale, with the video, when the marketplace opens."
    : intent === "give"
      ? "We’ll open the drop the moment the video finishes — no extra action needed."
      : "Stored in your library. Pick it up any time.";
}

/** The line under the storyboard, while the render is still running. */
export function pendingCardLine(intent: Intent, quality: string): string {
  const clip = `your ${quality} 10s video`;
  if (intent === "sell") return `Your listing is minted — its video lands as soon as ${clip} finishes.`;
  if (intent === "give") return `The drop opens as soon as ${clip} finishes.`;
  return `It is replaced by ${clip} as soon as that finishes.`;
}
```

**Modify `review-outputs.tsx` imports** (`:18–55`) — add `Link` and the two
new reads, drop the direct `ModelPanel` import (C9b replaces it with a lazy
one, so make this edit after C9b lands, or leave the old import in place
until then — the two edits touch adjacent but distinct lines and don't
conflict). Replace:
```ts
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
```
with:
```ts
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
```
and replace (`:42`):
```ts
import { stepHref, useManualProjects } from "@/lib/manual/projects";
```
with:
```ts
import { stepHref, useManualProjects } from "@/lib/manual/projects";
import { buildsOf, lineageProjectOf } from "@/lib/manual/project-read";
import { nextVersionOf } from "@/lib/create/save-footer";
```

**Modify the hook destructure** (`:101–103`) — add `builds`:
```ts
  const { setBuildProject, retryBuildItem, setBuildModelFailed, builds } =
    useCreateHistory();
  const { projects, projectFromBuild, selectProject } = useManualProjects();
```

**Modify — add the version computations**, right after the existing `saved`
memo (after `:202`):
```ts
  // COR-40 — the footer's own copy. Unsaved: the version this press of
  // Save Project would give the build, when a sibling build of the same
  // chat already lives in a project (lineageProjectOf — the same project
  // Save would attach to, COR-89). Saved: the version this build already
  // got.
  const lineageProject = React.useMemo(
    () => (saved ? null : lineageProjectOf(job, builds, projects)),
    [saved, job, builds, projects],
  );
  const nextVersion = React.useMemo(
    () => (lineageProject ? nextVersionOf(job, buildsOf(lineageProject, builds)) : null),
    [lineageProject, job, builds],
  );
  const savedVersion = React.useMemo(
    () => (saved ? (buildsOf(saved, builds).find((r) => r.buildId === job.id)?.version ?? null) : null),
    [saved, job, builds],
  );
  const unsavedCopy =
    lineageProject && nextVersion != null
      ? `Save it as version ${nextVersion} of ${lineageProject.name}.`
      : job.projectChoiceName?.trim() || job.projectChoiceId
        ? "Save it to the project you chose, or open it in the editor."
        : "Save it as a project, or open it in the editor.";
```

**Modify the footer** (`:513–582`), replace the whole block:
```tsx
          {!building && (
          <footer className="flex flex-wrap items-center justify-between gap-8 border-t border-solid border-border px-10 py-8">
            {saved ? (
              <>
                <p role="status" className="inline-flex items-center gap-4 text-sm text-text-secondary">
                  <Icon
                    icon={CheckmarkCircle02Icon}
                    size={16}
                    className="shrink-0 text-text-success"
                  />
                  <span>
                    Saved to{" "}
                    <Link
                      href={`/projects/${saved.id}`}
                      className="rounded-sm font-semibold text-text-primary underline decoration-dotted underline-offset-2 outline-none ring-offset-background transition-colors duration-fast hover:text-text-brand focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus"
                    >
                      {saved.name}
                    </Link>
                    {savedVersion != null ? ` as version ${savedVersion}.` : "."} Add a
                    brief to sell, give or keep it private — or open the
                    project to keep editing.
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-6">
                  <LeaveButton
                    tone="primary"
                    busy={leaving === "brief"}
                    blocked={leaving !== null}
                    onClick={openBrief}
                    icon={ArrowRight02Icon}
                  >
                    Add Brief
                  </LeaveButton>
                  <LeaveButton
                    id={OPEN_IN_EDITOR_ID}
                    tone="quiet"
                    busy={leaving === "editor"}
                    blocked={leaving !== null}
                    onClick={openInEditor}
                    icon={PencilEdit02Icon}
                  >
                    Open in editor
                  </LeaveButton>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary">
                  {pieceCount === ITEM_KINDS.length
                    ? "All five pieces are ready."
                    : `All ${pieceCount} pieces are ready.`}{" "}
                  {unsavedCopy}
                </p>
                <div className="flex flex-wrap items-center gap-6">
                  <button
                    type="button"
                    onClick={saveProject}
                    disabled={leaving !== null}
                    className="inline-flex h-[40px] shrink-0 items-center gap-4 whitespace-nowrap rounded-lg bg-bg-brand px-8 text-md font-semibold text-text-on-brand outline-none ring-offset-background transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus disabled:opacity-60"
                  >
                    <Icon icon={FloppyDiskIcon} size={18} />
                    Save Project
                  </button>
                  <LeaveButton
                    id={OPEN_IN_EDITOR_ID}
                    tone="quiet"
                    busy={leaving === "editor"}
                    blocked={leaving !== null}
                    onClick={openInEditor}
                    icon={PencilEdit02Icon}
                  >
                    Open in editor
                  </LeaveButton>
                </div>
              </>
            )}
          </footer>
          )}
```
(`role="status"` on the saved paragraph is COR-101 — the save announces
politely; the two `ring-offset-*` additions are C9b's COR-100 fix, folded in
here since it's the same lines — see C9b for why.)

**Modify `LeaveButton`'s base class** (`:653`) — same COR-100 fix, folded in
because C9b's Step 3 touches this file too:
```ts
  const base =
    "inline-flex h-[40px] shrink-0 items-center gap-4 whitespace-nowrap rounded-lg px-8 text-md font-semibold outline-none ring-offset-background transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus";
```

**Modify `step-4-success.tsx`** — replace the whole file with:
```tsx
"use client";

// Step 4 — Mint Success
//
// Reached after Pay succeeds. The project is only considered "live" when BOTH
// the mint is complete AND the linked video job has finished rendering. While
// the render is still in flight, this screen shows "Mint complete · pending"
// with progress; once the render flips to done (potentially while the user is
// here OR on another page via the global indicator), the screen morphs into
// its finished heading ("Listing is minted" for a sale: the marketplace is not
// open yet, so nothing claims buyers can see it).
//
// Showcase (COM-56, owner decision O5) lives here too, under Go to My
// Projects, for every intent: it's a flag on the project (COR-105), not a
// Brief outcome, so it shows the same way whether the render is done or
// still going, and it never claims a post exists — nothing does, while
// Innovations is a mock feed (COM-21).

import * as React from "react";
import { type BriefState, type Intent } from "./brief-app";
import { useManualProjects } from "@/lib/manual/projects";
import {
  liveSubline,
  pendingSubline,
  pendingCardLine,
} from "@/lib/brief/success-copy";
import {
  useVideoJobs,
  progressOf,
  etaLabel,
  STAGE_LABELS,
} from "@/components/video-jobs/video-jobs-provider";

const HEADING_LIVE_BY_INTENT: Record<Intent, string> = {
  sell: "Listing is minted",
  give: "Drop is live",
  save: "Saved",
};

export function Step4Success({
  state,
  onBrowse,
  projectName,
  projectId,
}: {
  state: BriefState;
  onBrowse: (href: string) => void;
  projectName: string;
  /** COM-56 — Showcase reads and writes this project's own `showcasedAt`
   *  (COR-105); null only if the scope somehow has no live project, which
   *  hides the whole control rather than acting on nothing. */
  projectId: string | null;
}) {
  const { jobs } = useVideoJobs();
  const { projects, setShowcase } = useManualProjects();
  const intent = (state.intent || "sell") as Intent;
  const job = state.videoJobId
    ? jobs.find((j) => j.id === state.videoJobId) || null
    : null;
  const willRenderVideo = !!state.videoJobId;
  const videoDone = job?.stage === "done";
  // The project is live when mint is complete AND (no video required OR video done).
  const isLive = !willRenderVideo || videoDone;

  const heading = isLive
    ? HEADING_LIVE_BY_INTENT[intent]
    : "Mint complete";
  const subline = isLive
    ? liveSubline(intent, willRenderVideo || !!state.arClip)
    : pendingSubline(intent);

  // Showcase — a project flag, read fresh on every render so Undo flips it
  // straight back (COM-55 and this step write the same field).
  const project = projectId ? (projects.find((p) => p.id === projectId) ?? null) : null;
  const showcased = typeof project?.showcasedAt === "number";
  const [showcaseAnnouncement, setShowcaseAnnouncement] = React.useState("");
  const [justToggledShowcase, setJustToggledShowcase] = React.useState(false);
  const showcaseBtnRef = React.useRef<HTMLButtonElement>(null);
  const undoBtnRef = React.useRef<HTMLButtonElement>(null);
  const name = projectName || "your project";

  const onShowcase = () => {
    if (!projectId) return;
    setShowcase(projectId, true);
    setShowcaseAnnouncement(`Showcased ${name}.`);
    setJustToggledShowcase(true);
  };
  const onUndoShowcase = () => {
    if (!projectId) return;
    setShowcase(projectId, false);
    setShowcaseAnnouncement(`Stopped showcasing ${name}.`);
    setJustToggledShowcase(true);
  };
  // Focus follows a PRESS, not the mount — a mint whose Share-to-Innovations
  // tick already showcased the project (COR-105, brief-app.tsx commit())
  // opens straight on the status row without stealing focus from anywhere.
  React.useEffect(() => {
    if (!justToggledShowcase) return;
    (showcased ? undoBtnRef : showcaseBtnRef).current?.focus();
    setJustToggledShowcase(false);
  }, [justToggledShowcase, showcased]);

  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-[24px] text-center">
      <div
        className={[
          "flex h-[64px] w-[64px] items-center justify-center rounded-full shadow-2",
          isLive ? "bg-bg-success-subtle" : "bg-bg-brand-subtle",
        ].join(" ")}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={
            isLive
              ? "var(--color-text-success)"
              : "var(--color-text-brand)"
          }
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4 10-10" />
        </svg>
      </div>

      <div>
        <h1 className="m-0 text-5xl font-bold tracking-tight text-text-primary">
          {heading}
        </h1>
        <p className="mt-[6px] max-w-[460px] text-md text-text-secondary">
          {subline}
        </p>
      </div>

      {/* Inline progress while we wait for the video to finalize */}
      {willRenderVideo && !isLive && job && (
        <PendingCard job={job} />
      )}

      {state.scenes.length > 0 && (
        <div className="flex w-full flex-col gap-[14px] rounded-lg border border-solid border-border-subtle bg-bg-surface p-[18px] text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-[2px] text-sm font-medium text-text-tertiary">
                {projectName || "Listing"}
              </div>
              <div className="text-lg font-bold text-text-primary">
                {state.productName || "Untitled"}
              </div>
            </div>
            {willRenderVideo && (
              <span
                className={[
                  "inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] text-sm font-semibold",
                  isLive
                    ? "bg-bg-success-subtle text-text-success"
                    : "bg-bg-brand-subtle text-text-brand",
                ].join(" ")}
              >
                {isLive ? (
                  <>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 13l4 4 10-10" />
                    </svg>
                    Live
                  </>
                ) : (
                  <>
                    <span
                      className="ix-s4-pulse h-[6px] w-[6px] rounded-full bg-bg-brand"
                    />
                    Pending video
                  </>
                )}
              </span>
            )}
          </div>

          {/* Storyboard scenes — internal-only preview while we wait, full
              video replaces it once live. */}
          <div className="grid grid-cols-3 gap-[8px]">
            {state.scenes.map((scene, i) => (
              <SceneCard key={scene.id} scene={scene} index={i} />
            ))}
          </div>

          {willRenderVideo && !isLive && (
            <div className="flex items-center gap-[8px] rounded-md border border-solid border-border-subtle bg-bg-page px-[12px] py-[10px] text-sm leading-relaxed text-text-secondary">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4 M12 16h.01" />
              </svg>
              <span>
                Storyboard is your private preview for now.{" "}
                {pendingCardLine(
                  intent,
                  state.quality === "low" ? "480p" : "720p",
                )}{" "}
                We&rsquo;ll tell you here when it lands — and email you, if you
                asked for that when the render started.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex w-full flex-col items-stretch gap-[10px]">
        <button
          onClick={() => onBrowse("/projects")}
          className="inline-flex items-center justify-center gap-[8px] rounded-3xl border-none bg-bg-brand px-[24px] py-[14px] text-md font-bold text-text-on-brand ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          Go to My Projects
        </button>

        {/* COM-56 — Showcase, for any intent, while a clip still renders too.
            Quiet: the step's one violet is Go to My Projects. */}
        {projectId && (
          <div className="flex flex-col items-center gap-[6px] pt-[2px]">
            {showcased ? (
              <>
                <p className="text-sm font-semibold text-text-primary">
                  Showcased — it&rsquo;s under Showcase in My projects.
                </p>
                <button
                  ref={undoBtnRef}
                  type="button"
                  onClick={onUndoShowcase}
                  className="rounded-full px-[12px] py-[6px] text-sm font-semibold text-text-secondary underline decoration-dotted underline-offset-4 outline-none ring-offset-background transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus"
                >
                  Undo
                </button>
              </>
            ) : (
              <>
                <button
                  ref={showcaseBtnRef}
                  type="button"
                  onClick={onShowcase}
                  className="inline-flex items-center justify-center gap-[8px] rounded-3xl border border-solid border-border bg-bg-surface px-[18px] py-[10px] text-sm font-bold text-text-primary outline-none ring-offset-background transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus"
                >
                  Showcase this project
                </button>
                <p className="max-w-[380px] text-sm text-text-secondary">
                  It goes under Showcase in My projects now, and on Innovations
                  once the feed opens.
                </p>
              </>
            )}
            <p role="status" aria-live="polite" className="sr-only">
              {showcaseAnnouncement}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center">
          <a
            onClick={() => onBrowse("/")}
            className="cursor-pointer rounded-full bg-bg-brand-subtle px-[12px] py-[6px] text-sm font-bold text-text-brand no-underline"
          >
            Back to home
          </a>
        </div>
      </div>

      <style>{`
        @keyframes ix-s4-pulse-kf { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
        .ix-s4-pulse { animation: ix-s4-pulse-kf 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ix-s4-pulse { animation: none; opacity: .7; }
        }
      `}</style>
    </div>
  );
}

function PendingCard({
  job,
}: {
  job: NonNullable<ReturnType<typeof useVideoJobs>["jobs"][number]>;
}) {
  const { total, etaSec } = progressOf(job);
  // COR-101 — the render's progress announces at 10% steps, not every tick:
  // `total` changes far more often than that (the global indicator polls
  // the job), so the live region only writes when a new ten is crossed.
  const lastAnnouncedDecile = React.useRef(-1);
  const [announced, setAnnounced] = React.useState("");
  React.useEffect(() => {
    const decile = Math.floor(total / 10);
    if (decile === lastAnnouncedDecile.current) return;
    lastAnnouncedDecile.current = decile;
    setAnnounced(`Video rendering — ${total} percent, ${etaLabel(etaSec)} left`);
  }, [total, etaSec]);
  return (
    <div className="flex w-full flex-col gap-[10px] rounded-lg border border-solid border-border-brand bg-bg-brand-subtle p-[16px] text-left">
      <div className="flex items-center justify-between">
        <div className="text-md font-bold text-text-brand">
          Video is rendering · {STAGE_LABELS[job.stage]}
        </div>
        <div className="tabular-nums text-sm font-semibold text-text-brand">
          {etaLabel(etaSec)} left
        </div>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-bg-surface">
        <div
          // Scaled, not resized: a transform moves on the compositor, where an
          // animated width re-lays the row out every half second.
          className="h-full w-full origin-left bg-bg-brand transition-transform duration-slower ease-linear motion-reduce:transition-none"
          style={{ transform: `scaleX(${total / 100})` }}
        />
      </div>
      <p role="status" aria-live="polite" className="sr-only">{announced}</p>
    </div>
  );
}

function SceneCard({
  scene,
  index,
}: {
  scene: BriefState["scenes"][number];
  index: number;
}) {
  // Only the brand gradient tokens exist (AGENTS.md, UI/UX hard rules — an
  // agent never mints a design token), so the three-tone poster art becomes an
  // alternation of the two rather than a third invented ramp.
  const gradientClass =
    index % 2 === 0 ? "bg-[image:var(--gradient-brand)]" : "bg-[image:var(--gradient-ai)]";
  return (
    <div
      className={[
        "relative aspect-[9/16] overflow-hidden rounded-md shadow-3",
        gradientClass,
      ].join(" ")}
    >
      {/* A dark scrim behind the caption instead of a text-shadow — the
          caption is white regardless of theme, since it sits on imagery. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-bg-overlay)_70%,transparent),transparent)]" />
      <div className="absolute left-[6px] top-[6px] rounded-sm bg-[color-mix(in_srgb,var(--color-bg-overlay)_70%,transparent)] px-[6px] py-[2px] text-xs font-semibold text-[var(--color-white)]">
        {scene.timeRange}
      </div>
      <div className="absolute bottom-[6px] left-[6px] right-[6px] line-clamp-3 text-xs font-medium leading-[1.3] text-[var(--color-white)]">
        {scene.visual}
      </div>
    </div>
  );
}
```

**Modify `brief-app.tsx`** — the `<Step4Success>` call (`:1146–1150`):
```tsx
            {step === "success" && (
              <Step4Success
                state={state}
                onBrowse={(href) => router.push(href)}
                projectName={scopeProject?.name ?? ""}
                projectId={scopeProjectId}
              />
            )}
```

**Modify `project-info-modal.tsx`** — top comment (`:6–10`):
```ts
//   1. Existing project picked   → Name field hidden; Description
//                                  pre-fills with that project's saved
//                                  description, read-only (CNT-6 — its one
//                                  home is the project's own inline editor
//                                  now); submit sets it as the active
//                                  project and routes to the next
//                                  incomplete step.
```

Hook destructure (`:47–48`), drop the now-unused `updateProject`:
```ts
  const { projects, createProject, selectProject } = useManualProjects();
```

`handleSubmit`'s existing-project branch (`:109–119`):
```ts
    // Existing project: set it active and route to the next incomplete
    // step so the user resumes where they left off. Its description is
    // shown for context only (CNT-6, "One home for the description") — this
    // modal picks or creates a project, it doesn't edit one, so it never
    // writes over what the project's own inline editor holds (CNT-1…7).
    const existing = projects.find((p) => p.id === choice);
    if (!existing) return;
    selectProject(existing.id);
    onClose();
    router.push(stepHref(existing, firstIncompleteStep(existing)));
```

The Description field (`:207–223`):
```tsx
          {/* Project Description */}
          <FieldLabel
            label="Project Description"
            htmlFor="project-description"
          >
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={!isNew}
              aria-readonly={!isNew}
              placeholder="Write description"
              rows={4}
              className={[
                "w-full resize-y rounded-lg border border-border bg-bg-page px-[14px] py-[12px] text-md leading-relaxed text-text-primary outline-none transition-colors duration-fast placeholder:text-text-tertiary",
                isNew
                  ? "hover:border-border-strong focus:border-border-focus focus:bg-bg-surface"
                  : "cursor-not-allowed text-text-secondary",
              ].join(" ")}
            />
            <p className="mt-[4px] text-2xs text-text-tertiary">
              {isNew ? "Optional." : "From the project's own page — edit it there."}
            </p>
          </FieldLabel>
```

### Step 4: Run, expected PASS

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
All `save-footer.test.mjs` and `success-copy.test.mjs` cases pass; `tsc`
reports no errors.

### Step 5: Browser check (`http://localhost:3002`)

1. Seed a build mid-review with no saved project (clear
   `ideeza:create:builds`/`ideeza:manual:projects` or use a fresh chat, build
   to ready). Confirm the footer reads *"All 5 pieces are ready. Save it as a
   project, or open it in the editor."* — press **Save Project**; the
   paragraph becomes *"Saved to **{name}**. Add a brief …"* with the name a
   link to `/projects/<id>`; the second button now reads **Open in editor**.
   Reload a screen reader (or the accessibility tree via `read_page`) and
   confirm the "Saved to…" paragraph has `role="status"`.
2. From that same chat, rebuild and Save again: the paragraph before the
   second Save reads *"Save it as version 2 of {name}."*; after saving,
   *"Saved to **{name}** as version 2."*
3. In the Brief, complete a mint (any intent) with **Share to Innovations**
   off: on the success step, under **Go to My Projects**, see **Showcase this
   project** and the line *"It goes under Showcase in My projects now, and on
   Innovations once the feed opens."* Press it: focus moves to **Undo**, the
   row becomes *"Showcased — it's under Showcase in My projects."*, and a
   screen reader announces "Showcased {name}." Press **Undo**: focus returns
   to **Showcase this project**, the announcement fires again. Confirm no
   copy anywhere on the step says "Innovations post is up" or "can claim it."
4. Repeat with **Share to Innovations** ticked: the step opens directly on
   the *"Showcased…"* row (no focus steal on mount).
5. From the dashboard hero, **Build manually** → pick an existing project
   with a saved description: the Description field shows the text but typing
   into it does nothing (it's read-only) and the helper line reads *"From the
   project's own page — edit it there."* Submit; reload the project's editor
   and confirm its description is unchanged.

### Step 6: tsc + eslint + commit

```
npx tsc --noEmit
npx eslint src/lib/create/save-footer.ts src/lib/brief/success-copy.ts src/components/create/review-outputs.tsx src/components/brief/step-4-success.tsx src/components/brief/brief-app.tsx src/components/dashboard/project-info-modal.tsx
git add src/lib/create/save-footer.ts src/lib/brief/success-copy.ts tests/projects/save-footer.test.mjs tests/projects/success-copy.test.mjs src/components/create/review-outputs.tsx src/components/brief/step-4-success.tsx src/components/brief/brief-app.tsx src/components/dashboard/project-info-modal.tsx
git commit -m "feat(projects): save/brief copy and one home for the description (COR-40, COM-21, COM-56, CNT-6)"
```

---

## Task C9b: Accessibility and performance

**Requirements:** COR-99 (verified only — see Step 5), COR-100, COR-101 (the
save/progress halves not already covered by C9a), COR-102, COR-103, plus the
"no whole-PCB parse" prerequisite for COR-60/61 (owned by the data-layer's
`editor-work.ts` task) and the reduced-motion house rule.

**Files:**
- Create: `src/lib/pcb/board-parts.ts`, `src/components/create/model-panel/model-panel-lazy.tsx`,
  `tests/projects/board-parts.test.mjs`
- Modify: `src/components/ideeza/button.tsx` (`:14`), `src/components/assembly/assembly-app.tsx`
  (imports `:10–16`, the `AssemblyPart` interface + `readParts` `:24–59`, and
  its three other usages `:75`, `:236`), `src/components/create/review-outputs.tsx`
  (the `ModelPanel` import at `:32`, the mount at `:419–435`), `src/app/layout.tsx`
  (`:30–37`)
- Test: `tests/projects/board-parts.test.mjs`

**Interfaces:**
- Produces: `boardPartsOf(doc): BoardPart[]` (`src/lib/pcb/board-parts.ts`) —
  the shared reader the spec's COR-60 names as a prerequisite for
  `editor-work.ts`'s PCB fact ("extract assembly-app.tsx's filter into
  src/lib/pcb/board-parts.ts so Assembly and this read one rule"); the
  data-layer task that builds `editor-work.ts` imports this instead of
  re-parsing the doc. `ModelPanelLazy` (`src/components/create/model-panel/model-panel-lazy.tsx`) —
  the same dynamic-import wrapper the product-page task (§5.7, COR-33) should
  reuse for its own 3D tab rather than importing `ModelPanel` directly.

### Background — four small, real gaps

**COR-100 (ring contrast).** `--color-button-primary-bg` and
`--color-border-focus` are BOTH `var(--color-violet-600)` in light mode
(`src/styles/tokens.css:297,356,468`; `#7c2db9` at `:28`). Every filled brand
button's focus ring (`src/components/ideeza/button.tsx:14`, and the
brand-filled controls in `review-outputs.tsx`) is drawn in the exact colour
of its own fill: 1.00:1, the spec's own measurement. The fix is the one this
codebase's shadcn `Button` already uses one file over
(`src/components/ui/button.tsx:8`, `ring-offset-background
focus-visible:ring-offset-2`) — `background` is `var(--color-bg-page)`
(`tailwind.config.ts:9`), theme-aware. `src/components/ideeza/button.tsx`
never adopted it because it predates that convention and uses arbitrary-value
`[var(--color-…)]` syntax throughout rather than the extended colour keys.

**COR-102 ("lazy 3D").** `review-outputs.tsx:32` imports `ModelPanel` (the
view-state reducer, rail, overlays and viewer controls) as a static import,
so it ships in the review surface's own chunk even on a build the maker never
opens the 3D tab on — only the WebGL implementation one level inside it
(`assembly-viewer.tsx`) is already behind `next/dynamic({ssr:false})`. The
fix mirrors that exact, already-established pattern one level out.

**COR-103 (toast over the header).** `src/app/layout.tsx:36` docks the
attention toast at `top-[16px]` (desktop) via `#ideeza-toast-layer`. Today's
`project-details.tsx` header puts its one primary action
(`bg-violet-600`, `:143`) on the h1's own row, `py-[28px]` down from the top
of `main` (`:107`) — inside the toast's own vertical band once its message
wraps to two lines. The render toast was already moved off top-centre for
this identical reason (`layout.tsx:23–26`, "it sat over every page's heading
and Back link"); the redesigned project-details header (spec §3.3, COR-8)
keeps its action pair on the h1's row too, so the fix is the same kind of
clearance, sized generously for that taller header.

**"No whole-PCB parse."** `assembly-app.tsx:34–59`'s `readParts` is a
hand-rolled filter over the PCB doc's `objects` — designator + footprint,
side. COR-60 (`editor-work.ts`, the rail's Editor block) needs the identical
board-parts count and explicitly names this exact extraction as its own
prerequisite, so that Assembly and the rail's derived PCB fact read one rule
instead of two independently-maintained parses of the same document.

### Step 1: Write the failing test

`tests/projects/board-parts.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { boardPartsOf } from "../../.tmp-test/lib/pcb/board-parts.js";

test("boardPartsOf keeps only parts with a designator and a footprint", () => {
  const doc = {
    objects: [
      { id: "1", scope: "pcb", text: "R1", footprint: "0402", side: "top" },
      { id: "2", scope: "pcb", text: "", footprint: "0603" },
      { id: "3", scope: "pcb", text: "C1" },
      { id: "4", scope: "sch", text: "U1", footprint: "SOIC-8" },
      { id: "5", scope: "pcb", text: "U2", footprint: "SOIC-8", side: "bottom" },
    ],
  };
  assert.deepEqual(boardPartsOf(doc), [
    { id: "1", designator: "R1", footprint: "0402", side: "top" },
    { id: "5", designator: "U2", footprint: "SOIC-8", side: "bottom" },
  ]);
});

test("boardPartsOf is safe against a missing or malformed doc", () => {
  assert.deepEqual(boardPartsOf(null), []);
  assert.deepEqual(boardPartsOf(undefined), []);
  assert.deepEqual(boardPartsOf({}), []);
});

test("boardPartsOf defaults a missing side to top", () => {
  const doc = { objects: [{ id: "9", scope: "pcb", text: "R9", footprint: "0402" }] };
  assert.equal(boardPartsOf(doc)[0].side, "top");
});
```

### Step 2: Run it, expected FAIL

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
Expected: `tsc` fails — `Cannot find module '../../.tmp-test/lib/pcb/board-parts.js'`.

### Step 3: Implement

**New `src/lib/pcb/board-parts.ts`** (no cross-module imports, so alias vs.
relative doesn't matter — kept import-free for that reason):
```ts
// board-parts.ts — the board's placed parts, read once and shared (COR-60):
// Assembly's checklist and the Editor rail's PCB fact both need "which
// objects are parts to place", and used to answer that with two different
// filters. PCB-scoped objects that carry a designator and a land pattern
// (converted footprints and picker-placed parts alike) are parts; pads,
// vias, tracks and regions are copper, not parts, so they stay out.
export type BoardPart = {
  id: string;
  designator: string;
  footprint: string;
  side: "top" | "bottom";
};

export function boardPartsOf(
  doc: { objects?: Array<Record<string, unknown>> } | null | undefined,
): BoardPart[] {
  if (!doc || !Array.isArray(doc.objects)) return [];
  return doc.objects
    .filter(
      (o) =>
        o.scope === "pcb" &&
        typeof o.text === "string" &&
        o.text &&
        typeof o.footprint === "string" &&
        o.footprint,
    )
    .map((o) => ({
      id: String(o.id),
      designator: String(o.text),
      footprint: String(o.footprint),
      side: o.side === "bottom" ? ("bottom" as const) : ("top" as const),
    }));
}
```

**Modify `assembly-app.tsx` imports** (`:10–16`), add the import:
```ts
import * as React from "react";
import { useStepNav } from "@/components/manual/use-step-nav";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { LeftRail } from "@/components/pcb/left-rail";
import { Button, Checkbox } from "@/components/ideeza";
import { boardPartsOf, type BoardPart } from "@/lib/pcb/board-parts";
```

**Modify — delete the local type and rewrite `readParts`** (`:24–59`):
```ts
const PCB_DOC_PREFIX = "ideeza:pcb:doc:";
const PROGRESS_PREFIX = "ideeza:assembly:";

// The board's parts, shared with the Editor rail's PCB fact (board-parts.ts).
function readParts(projectId: string | null): BoardPart[] {
  if (!projectId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PCB_DOC_PREFIX + projectId);
    if (!raw) return [];
    return boardPartsOf(JSON.parse(raw));
  } catch {
    return [];
  }
}
```

**Modify the two remaining `AssemblyPart` references** — `:75` and `:236`
(now `:65` and `:226` after the eleven deleted lines above; count from the
`boardPartsOf` import onward when applying), replace `AssemblyPart` with
`BoardPart` in both:
```ts
  const [parts, setParts] = React.useState<BoardPart[]>([]);
```
and
```ts
function SideSection({
  title,
  parts,
  done,
  onToggle,
}: {
  title: string;
  parts: BoardPart[];
  done: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
```

**New `src/components/create/model-panel/model-panel-lazy.tsx`** (COR-102 —
mirrors `assembly-viewer.tsx`'s own dynamic-import wrapper one level out):
```tsx
"use client";

// ModelPanelLazy — COR-33/COR-102 ("mounts ModelPanel lazily"). ModelPanel
// carries the 3D tab's view-state reducer, rail, overlays and viewer
// controls; none of it is needed until the resting state's "View in 3D" is
// pressed, so it ships in its own chunk behind a dynamic import instead of
// its caller's bundle — the same pattern assembly-viewer.tsx already uses
// for the WebGL implementation one level inside this.
import dynamic from "next/dynamic";

export const ModelPanelLazy = dynamic(
  () => import("./model-panel").then((m) => m.ModelPanel),
  { ssr: false, loading: () => null },
);
```

**Modify `review-outputs.tsx`** — replace the `ModelPanel` import (`:32`):
```ts
import { ModelPanelLazy } from "./model-panel/model-panel-lazy";
```

and the mount (`:429–434`):
```tsx
              <ModelPanelLazy
                key={product.id}
                assembly={assembly}
                shellNote={shellNote}
                onRetryMesh={() => setBuildModelFailed(job.id, false)}
              />
```

**Modify `src/components/ideeza/button.tsx`** — the base class (`:14`),
COR-100:
```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap select-none font-[family-name:var(--font-family-display)] font-[var(--font-weight-semibold)] tracking-[0.1px] leading-[16px] transition-[background-color,filter,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)] cursor-pointer outline-none ring-offset-[var(--color-bg-page)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-border-focus)] disabled:cursor-not-allowed",
  {
```
(every hierarchy and size inherits this, so the fix covers every `Button` the
other NOW tasks build the two pages with, not only the primary variant.)

**Modify `src/app/layout.tsx`** — the toast layer (`:30–37`), COR-103:
```tsx
      {/* At phone width it docks at the foot instead: top-centre it covered
          the menu button and the Canvas/Chat tabs, so nothing could be
          reached until the toast was dismissed. There it shares the foot
          with a render toast, so it stands on top of one when one is up.
          From `md` it used to sit at top-16px, which the project page's own
          header then had to fit under — its title, action pair and Preview
          as buyer all sit on that same first row (spec §3.3, COR-8), and a
          two-line attention message reached as far as the button (COR-103,
          "the attention toast never covers the header primary"). No
          (create) page has a separate app bar above its own header (the
          shell is sidebar + `main`, `(create)/layout.tsx`), so 132px clears
          every page's first row instead of measuring one page at a time. */}
      <div
        id="ideeza-toast-layer"
        className="pointer-events-none fixed bottom-[16px] left-1/2 z-toast flex -translate-x-1/2 flex-col items-center gap-[8px] max-md:[body:has(.ix-render-toast)_&]:bottom-[88px] md:bottom-auto md:top-[132px]"
      >
```

### Step 4: Run, expected PASS

```
rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
```
`board-parts.test.mjs` passes; `tsc` clean.

### Step 5: Browser check (`http://localhost:3002`)

1. Open Assembly on any project with a real board (`/project/<slug>/assembly`);
   the checklist is unchanged (same rows, same check-off persistence) —
   confirms the extraction didn't change behaviour.
2. Open a build's review, Tab to **Save Project** (or any brand-filled
   button): with dark mode off, `zoom` on the button's edge and confirm a
   visible ring around the violet fill (previously invisible). Repeat in dark
   mode. Repeat on a `Button hierarchy="primary"` instance anywhere the app
   already uses it (e.g. the Brief's mint button) — same visible ring.
3. On a build with a finished 3D piece, open Network tab (Chrome DevTools) →
   confirm no `model-panel` chunk loads until the 3D tab is opened and the
   product's mesh is ready; press **View in 3D** and confirm the chunk loads
   then, with the panel behaving exactly as before (explode, presets,
   fullscreen).
4. Trigger an attention toast (start a build, background it, let it finish
   building while on `/projects/<id>` for that same chat's OTHER build, or
   simulate via `dismissAttention`/`topAttention` state) at 1440 px: confirm
   the toast sits clear of the page's own header row, in both themes.
   Confirm it still shows at phone width, foot-docked, unchanged.
5. `read_page` the review surface and the Brief's success step; confirm one
   h1 each, landmarks (`nav`, `main`) present, no heading level skipped —
   spot-checks toward COR-99 (owned in full by the page-building tasks).

### Step 6: tsc + eslint + commit

```
npx tsc --noEmit
npx eslint src/lib/pcb/board-parts.ts src/components/assembly/assembly-app.tsx src/components/create/model-panel/model-panel-lazy.tsx src/components/create/review-outputs.tsx src/components/ideeza/button.tsx src/app/layout.tsx
git add src/lib/pcb/board-parts.ts tests/projects/board-parts.test.mjs src/components/assembly/assembly-app.tsx src/components/create/model-panel/model-panel-lazy.tsx src/components/create/review-outputs.tsx src/components/ideeza/button.tsx src/app/layout.tsx
git commit -m "fix(a11y): visible focus rings on filled buttons, lazy 3D panel, clear the attention toast, share the board-parts reader (COR-100, COR-102, COR-103, COR-60)"
```

---

## Task C9c: Docs — CLAUDE.md and STRUCTURE.md

**Requirements:** none of its own (CLAUDE.md §0's standing rule, now `AGENTS.md` › Keeping docs current: "treat
'update CLAUDE.md' as part of the definition of done"); written last, once
every other NOW task in this plan is in and browser-verified, so every bullet
below stays true to §0's "never list something that isn't actually working
and browser-verified."

**Files:** Modify `CLAUDE.md` (§3 `:84`; §5 `:171–172`, `:216` — line numbers of the old file; now `docs/guides/app-map.md`, `docs/guides/features/ai-create-flow.md` and `docs/guides/features/platform-and-projects.md`), `STRUCTURE.md`
(`:32–34`, `:58`, `:105–107`, `:110`, and the PCB tree `:139` area)

**Interfaces:** none (prose only).

### Step 1 / Step 2

Not applicable — a docs-only change has no unit test. Its "failing" state is
the stale text itself, and Step 4 (below) is a manual read-through against
the finished app rather than an automated pass.

### Step 3: Implement

**Modify `CLAUDE.md` §3** (now `docs/guides/app-map.md`) — replace the one stale line (`:84`):
```
- `/projects` — **My projects** (filters: All · Public · Contributed · Private · Draft · Utility NFT).
```
with three lines (the index, the details page, the new product page):
```
- `/projects` — **My projects**: the only project index — tabs **All · Draft · Private · Given · Listed**, then a **Showcase** membership tab after a divider (a project's own `showcasedAt` flag, not a status); search, a Source facet (AI build · By hand), sort and pagination (12 per page).
- `/projects/[id]` (`?tab=media|network`, `?view=buyer`) — **Project details**: one project's dossier and the home of every project action — inline rename/description, one action pair from `nextAction()`, **Preview as buyer**; tabs **Products · Media · Network**; the rail carries Outcome (incl. the Showcase row), Editor progress, Details, **Versions** (the one version history) and Manage (Delete, blocked with its reason on a Listed project).
- `/projects/[id]/products/[productId]` (`?tab=`, `?v=`) — **Product page**: one product's deliverables at a chosen version — **3D model · PCB · Firmware code · Wiring · Parts** — the booked, read-only snapshot (the build-lock rule); no action buttons.
```

**Modify CLAUDE.md §5** (now `docs/guides/features/ai-create-flow.md`) — the review-outputs bullet's stale copy fragment
inside the long paragraph at `:171–172` (only the quoted fragment changes;
leave the rest of that paragraph as is):
- find: `*Saved to \`<name>\`. Add a brief to sell, give or keep it private — or open the project to keep editing.* over **Add Brief** (\`/build/<id>/brief\`, which then runs on the project's own draft and opens on its products) and **Open Project**`
- replace with: `*Saved to `<name>` as version {n} of its chat, once it has more than one — the name a link to \`/projects/<id>\`.* over **Add Brief** (\`/build/<id>/brief\`, which then runs on the project's own draft and opens on its products) and **Open in editor** (COR-40)`

Replace the stale "My projects" bullet (`:216`):
```
- **My projects** (`projects/my-projects`, `project-details`) with filters: All · Public · Contributed · Private · Draft · **Utility NFT**; pagination.
```
with:
```
- **My projects and Project details** (`projects/my-projects`, `project-details`, and the new `projects/[id]/products/[productId]` product page) — the status is the Brief's own outcome (Draft · Private · Given · **Listed** · Minted; `project-summary.ts`); tabs **All · Draft · Private · Given · Listed**, then **Showcase** as a membership tab, not a status (a project's own `showcasedAt` flag, `project-read.ts`); search, a Source facet, sort and 12-per-page pagination — the old **Public · Contributed · Utility NFT** filters are gone (no auth yet, and nothing here is a real benefit NFT). Project details reads one shared derivation (`projectView()`) for its header (inline rename/description, one action pair from `nextAction()`), **Products · Media · Network** tabs and its rail (**Outcome · Editor · Details · Versions · Manage**). A rebuilt chat becomes the same project's next **version** (not a same-named twin); a product a rebuild drops stays listed, marked "Not in version n · from version m", and its page opens at the version it was last in. **Showcase** (`setShowcase`) is a flag, not a Brief outcome — a badge beside the status chip and its own My-projects tab, honest that nothing posts anywhere while Innovations is a mock feed. **Preview as buyer** shows the read-only page a buyer would see: 3D, PCB, wiring and parts previews only, no firmware source, no downloads.
```

**Modify `STRUCTURE.md`** — the app routes tree (`:32–34`):
```
   │  ├─ (create)/           AI create flow
   │  │   ├─ projects/                    "/projects" — My projects (index)
   │  │   │   └─ [id]/                    "/projects/<id>" — Project details
   │  │   │       ├─ network/             "/projects/<id>/network" — the Connection Map
   │  │   │       └─ products/[productId]/  "/projects/<id>/products/<productId>" — the product page
   │  │   ├─ history/                 "/history"  — past generations
```

The `components/projects` line (`:58`):
```
   │  ├─ projects/           my-projects, project-details, and the product page (deliverable tabs, version switcher — see docs/guides/features/platform-and-projects.md)
```

The `lib/brief` line (`:105–107`), add the new pure module:
```
   │  ├─ brief/              types.ts (BriefState + `stepsFor` / STEP_ORDER — the sequence
   │  │                      the wizard and the rail both read — + the stored-draft
   │  │                      migration), project-brief.ts (the Brief read + the Outcome
   │  │                      card's derivation — see docs/guides/features/platform-and-projects.md), success-copy.ts (Step
   │  │                      4's pure copy), gas.ts, wallet.ts, video-prompt.ts, qr.ts
```

The `lib/manual` line (`:110`):
```
   │  ├─ manual/             projects.tsx (manual project store), project-read.ts
   │  │                      (backward-compatible pure readers — versions, sourceOf,
   │  │                      coverOf), project-summary.ts (the one card/details
   │  │                      derivation), permissions.ts (can/deleteBlockOf), editor-work.ts
   │  │                      (editor progress facts)
```

The PCB module tree, after `route-path.ts` (in the `## ★ PCB module` section):
```
├─ route-path.ts        Track path planner — corner style + obstacle policy
├─ board-parts.ts        Board's placed parts, shared by Assembly and the Editor
│                        rail's PCB fact (`boardPartsOf(doc)` — designator + footprint,
│                        top/bottom side)
├─ inspector-schema.ts  Schema-driven Properties inspector (panels + typed fields)
```

### Step 4: Verify

Read every edited section back against the FINISHED app (once C9a, C9b and
every My-projects/Project-details/product-page task have landed and passed
their own browser checks): each bullet must describe real, working,
browser-verified behaviour, per CLAUDE.md §0 (now `AGENTS.md` › Keeping docs current). If any bullet describes
something not yet true at the moment this task actually runs, cut it back to
what is — never leave a "coming soon" bullet in §5 (§0's own rule).

### Step 5

Not applicable (no UI of its own).

### Step 6: commit

```
git add CLAUDE.md STRUCTURE.md
git commit -m "docs: My projects, Project details and the product page (CLAUDE.md §3/§5, STRUCTURE.md)"
```

---

## Task Z: Full browser verification matrix

**Requirements:** the §5.13 "Verification for NOW" list in full, plus a
final build.

**Files:** none (verification only).

**Interfaces:** none.

Run every check below at **1440 px** and **400 px**, in **light** and **dark**
(`resize_window` + the theme toggle), on **My projects** (`/projects`) and
**Project details** (`/projects/<id>`) — 8 combinations per fixture — with
the seeded fixtures the spec's own build order names (§5, step 2): (1) a
4-product build; (2) a legacy hand-made project; (3) a project minted to sell
and showcased; (4) a hand-made project a build joined; (5) a project whose
build was purged; (6) a chat rebuilt twice whose second version drops a
product.

- [ ] Step 1: Seed the six fixtures in `localStorage` (`ideeza:manual:projects`,
  `ideeza:create:builds`/`ideeza:create:chats`, one `ideeza:brief:draft:<id>`
  for the minted/showcased fixture) via a small script run in the browser
  console on `http://localhost:3002`, or by driving the real flows (rebuild a
  chat twice and Save twice for fixture 6, mint fixture 3 to Sell with Share
  to Innovations ticked, delete a build's job from `ideeza:create:builds` for
  fixture 5).
- [ ] Step 2: **Rebuild → v2.** Rebuild fixture 1's chat and Save: one
  project, "Version 2", both versions listed on the product page's version
  select and in the rail's Versions block, at 1440 and 400, both themes.
- [ ] Step 3: **Dropped product.** Rebuild fixture 6's chat so the new
  version drops a product: that product stays on the Products tab, reads
  "Not in version {n} · from version {m}", its page opens at version {m},
  and Versions lists it under Dropped.
- [ ] Step 4: **Legacy project.** Fixture 2 (no `builds` field) renders the
  same page as any other project, with ids given once (no console error, no
  duplicate-key warning).
- [ ] Step 5: **Delete with editor work.** Open fixture 4 in the PCB editor,
  place an object, then Delete from the rail: the typed-name confirmation
  appears, confirms, and every per-project key is gone afterward
  (`ideeza:pcb:doc:<id>`, etc.) and the build's review offers **Save Project**
  again.
- [ ] Step 6: **Mint to sell, cross-tab.** With fixture 1 open on My projects
  in one tab, mint it to Sell in a second tab: the card moves to **Listed**
  without a reload (on window focus / `storage` event), and its Delete
  control is blocked with *"A listed project can't be deleted."*
- [ ] Step 7: **Showcase.** From the Brief's success step (C9a), press
  **Showcase this project**: the badge appears on the My-projects card and
  the details header, the project appears under the **Showcase** tab, and
  **Undo** reverses all three. Repeat from the rail's Outcome block
  (Showcase project / Stop showcasing) on fixture 3.
- [ ] Step 8: **Stop showcasing a Private project.** Un-showcase a minted,
  Private, previously-showcased project: **Preview as buyer** disappears
  from its header (PPL-9, `hasAudience`).
- [ ] Step 9: **Preview as buyer.** Enter Preview as buyer on any minted,
  visible project: no write control anywhere on the page (no pencil, no
  Manage block, no Showcase control, no Network create/view beyond a
  read-only summary); **Exit preview** returns focus to the entry button.
- [ ] Step 10: **Accessibility spot check.** `read_page` both pages at both
  widths: one h1, an h2 per tab panel and rail block, the breadcrumb `nav`,
  the rail `aside` labelled "Project record"; tab through the header's action
  pair and confirm a visible focus ring on the primary button in both themes
  (C9b).
- [ ] Step 11: **Reduced-motion.** With `prefers-reduced-motion: reduce`
  emulated, confirm the attention toast's enter transition, the Step 4
  pending-video pulse and its progress-bar fill all skip their animation
  (C9a/C9b).
- [ ] Step 12: Run the project test suite:
  ```
  npm run test:projects
  ```
  (defined by Task A1 as `rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"`)
  — every test across every NOW task passes, including the six-fixture
  `projectSummary`/card-vs-header string-identity test (LST-32) the spec
  calls out by name.
- [ ] Step 13: Run the production build:
  ```
  npx next build
  ```
  clean, no type or lint errors, no route missing. (Prerequisite: Task 0's
  `npm install` has been run in this worktree — a plan-writing/inspection
  checkout of this repo has no `node_modules` and `npx next build` fails with
  "Could not find the Next.js package" until that install has happened; this
  step runs in the integration environment where Task 0 already ran, not in
  isolation.)
- [ ] Step 14: File one follow-up per failure found (there is no code change
  in this task beyond what C9a–C9c already made) rather than patching another
  task's files directly, unless the fix is a one-line, unambiguous typo in
  copy this task's own files own.
