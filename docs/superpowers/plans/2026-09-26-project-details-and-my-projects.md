# Project details and My projects — NOW phase: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to carry out this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** build the NOW phase of `docs/superpowers/specs/2026-09-26-project-details-and-my-projects-design.md` (commit e599fcf, 180 requirements). A saved project lands in My projects, its card and its details page tell the same story, and the details page reads every build and version of the project honestly.

**Architecture:** the pure readers in `src/lib/manual/*` and `src/lib/brief/project-brief.ts` derive everything:
- `project-read.ts` gives builds, lineages, products, versions and the log;
- `project-summary.ts` gives the status, next action and card/header text;
- `permissions.ts` says who may do what and when a project can be deleted;
- `editor-work.ts` gives the editor facts.

The writers live in the `useManualProjects` context: attach and the rebuild→v2 save, cover, showcase, delete, and quota-aware writes. The UI renders only what the readers return. Two pages use it: My projects (`/projects`) and a slot-based project page (`/projects/[id]`) with a new per-product page (`/projects/[id]/products/[productId]`).

**Tech stack:**
- Next.js 16 (modified: read `node_modules/next/dist/docs/` before using any Next API), React 19, TypeScript strict.
- Tailwind over `src/styles/tokens.css`.
- `node:test` for the pure modules, compiled by `tests/projects/tsconfig.json`.

## Global constraints

- Worktree `/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/project-details`, branch `feat/project-details`. Never touch `/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator`, the main checkout, where another session's work is live.
- Styling: tokens only, no hex, no new tokens. Reuse the `src/components/ideeza/*` controls.
- Brand violet appears once per page, on its one primary action, plus selection.
- One control, one home. No kebab menu on the project page (D10).
- No fake data. A row, tab or control with nothing real behind it is absent: not "coming soon", and not disabled without a reason.
- Build-lock: a built product's spec is read-only, and the product page shows the booked snapshot.
- Status words are Draft · Private · Given · Listed · Minted. Listed carries "Goes on sale when the marketplace opens". Showcase is a separate badge and tab, set by `showcasedAt`.
- A11y: keyboard-operable, targets ≥ 24 px (≥ 44 px at phone width), text contrast ≥ 4.5:1, focus visible. Motion 150–250 ms ease-out, with a reduced-motion fallback. The pages work at 400 px, and layout switches use container queries on the page container.
- Tests:
  - run `rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"`, which is also `npm run test:projects`, and keep the glob quoted;
  - tested `src/lib/**` modules use relative imports only;
  - tests import from `../../.tmp-test/lib/...`.
- Every task ends with:
  - `npx tsc --noEmit` clean;
  - `npx eslint <touched files>` clean, except the pre-existing baseline errors listed in Task 0 (a task that edits one of those lines fixes it);
  - a commit that stages only the task's files. The message style is `feat(projects): …` / `fix(projects): …`, the trailer is exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, and nothing is pushed.
- Browser checks:
  - Use the task's own dev server (Task 0: :3002). Use a headless CDP script or a tab you opened yourself, never a shared Browser-pane tab another session may be using.
  - Every seed script checks `location.origin` before it writes storage. A seed script once wiped another session's data on `localhost:3047`.

## Task files and order

Each task lives in its own file under `docs/superpowers/plans/2026-09-26-project-details/`. The file is the task's complete brief: its requirements, files, interfaces, steps with full code, tests, the browser check and the commit. Carry out the tasks in this order; each one leaves the app working.

| # | Task | File | Builds |
|---|---|---|---|
| 1 | 0 | `task-A1.md` (first section) | `pnpm install`, dev server :3002, and the baseline ESLint table |
| 2 | A1 | `task-A1.md` | New `ManualProject` fields, `normalizeProjects` keeps them, product ids, `cover`/`setCover`, the test harness |
| 3 | A2a | `task-A2.md` (A2a) | `project-read.ts`: builds, lineages, products (dropped rows kept), versions, pending, log, cover, resume step; `productsOf` carries the description |
| 4 | A4a | `task-A4.md` (A4a) | `project-brief.ts`: the Brief read, Outcome/commerce, the showcase backfill, and `VideoJob` moved to `lib/video/jobs.ts` |
| 5 | A3 | `task-A3.md` | `project-summary.ts`: status, Showcase badge, `nextAction`, card/header text, date formatters |
| 6 | A4b | `task-A4.md` (A4b) | `permissions.ts`: `Viewer`, `can`, `hasAudience`, `deleteBlockOf` (a Listed project can't be deleted) |
| 7 | A2b | `task-A2.md` (A2b) | `projectView()`, which bundles the readers for the pages |
| 8 | A5 | `task-A5.md` | `editor-work.ts`, plus `boardPartsOf()` extracted to `lib/pcb/board-parts.ts` |
| 9 | A6 | `task-A6.md` | Writers: `attach`, `attachBuild`, `projectFromBuild(job, lineage)`, and the rebuild → v2 fix at save; Brief Step 1 |
| 10 | A7 | `task-A7.md` | Quota-aware writes and the storage error banner, `lastOpened`, `deleteProject` with the key sweep, the delete dialog, `ConfirmDialog` moved to `ideeza/dialog.tsx` |
| 11 | B1 | `task-B1.md` | My projects toolbar: tabs, Source, sort, search incl. products, URL state, 12 per page, New project → Home, the list's Showcase backfill |
| 12 | B2 | `task-B2.md` | My projects card, skeleton, empty states |
| 13 | C1 | `task-C1.md` (C1a, C1b) | Project page shell, states, breadcrumb, tab strip, slots, arrival focus, legacy fillers |
| 14 | C2 | `task-C2.md` | Header: rename, status/Showcase chips, meta, description editor, action pair, editor hint, pending-version banner, Preview as buyer trigger |
| 15 | C3 | `task-C3.md` | Products tab |
| 16 | C4 | `task-C4.md` | Product page: version select, deliverable tabs, booked snapshot, lazy 3D |
| 17 | C5 | `task-C5.md` | Media tab: tiles, Cover chip, Use as cover, lightbox |
| 18 | C6 | `task-C6.md` | Network tab and Preview as buyer |
| 19 | C7 | `task-C7.md` (C7a–c) | Rail primitives (`RailBlock`…), Outcome block with Showcase, Details block, Brief success-step Showcase CTA |
| 20 | C8 | `task-C8.md` | Rail Editor, Versions, Project log, Manage (Delete); removes the legacy fillers |
| 21 | C9 | `task-C9.md` (C9a–c) | Touch points outside the pages, a11y/perf fixes (the focus ring on violet), docs |
| 22 | Z | `task-C9.md` (Task Z) | Full verification matrix, `npm run test:projects`, `npx next build` |

## Amendments — they override the task files where the two differ

The 18 task files were written in parallel. These amendments settle where they overlap. When you carry out a task, apply its amendments first.

- **Task 0**
  - Install with `pnpm install --frozen-lockfile --offline`, because the repo's lockfile is pnpm's. Fall back to `npm install --no-audit --no-fund --no-package-lock`.
  - The ESLint baseline has pre-existing errors at: `brief-app.tsx` 633 and 681, `step-2-video.tsx` 484, `project-info-modal.tsx` 63 and 83, `my-projects.tsx` 140, `history.tsx` 822, and `projects.tsx` 214. A1 fixes `projects.tsx` 214.
- **A3** consumes `StoredDraft` from A4a, which is why A4a comes before A3.
- **A2b** runs after A3 and A4b, since `projectView()` needs `projectSummary` and `commerceOf`.
- **A5** owns the `boardPartsOf()` extraction and the `assembly-app.tsx` rewire. C9 does not repeat it.
- **B1**
  - B1 owns the list's one-time `showcasedAt` backfill (COR-105): `showcaseBackfillOf` + `backfillShowcase` in the brief-draft pass.
  - Until B2 lands, B1 renders today's card.
- **B2**
  - B2 creates the shared `src/components/projects/status-chip.tsx` (`StatusChip`, `ShowcaseChip`) and the new `Badge` tones ("neutral", "success", "info") in `ideeza/badge.tsx`. C2 reuses them rather than creating them again.
  - B2b does **not** add its own tab bar or search, and does not repeat the backfill. It swaps only the card grid, the loading state and the empty states into B1's toolbar and `filterProjects` result.
  - It renders `ProjectCard({ summary: row.summary, matchedProductName: row.via, onBeforeNavigate: onOpen })`.
- **C1**
  - C1 comes before C2–C8. It deletes `project-details.tsx`; every later page task follows C1's hand-off table, not the old file.
  - C1's `frame.tsx` `RailBlock` serves the legacy fillers until C8.
- **C2**
  - C2 reuses B2's `status-chip.tsx` and its Badge tones.
  - C2 defines `PREVIEW_TRIGGER_ID` in `header.tsx`, and C6 imports it.
  - C2 adds the `Banner` `action?` slot, and C6 skips it.
  - `LeaveButton` moves to `src/components/create/leave-button.tsx`.
  - `ProjectHeader({ project, view, viewer })` mounts through an adapter in C1's header slot, which passes `titleRef` to `ProjectTitle`.
  - CNT-7 ("Draft from products") is not built, and moves to NEXT.
- **C3** uses A2's `piecesOf(job)`. If a per-item count is still needed, name it `piecesOfItems` so the two don't clash.
- **C4**
  - C4 creates `ModelPanelLazy` in `src/components/create/model-panel/model-panel-lazy.tsx`, and C9 reuses it.
  - It uses A2's `versionsOf` (grouped; flatten with `.flat()`), `productsOfProject` and `conceptOf`.
  - In buyer view there is no Firmware tab.
- **C4, continued.**
  - C4a Step 3.8 changes C1's `usePageArrival` title effect. Next 16 rewrites `<title>` after page effects, so the title is re-applied through a MutationObserver.
  - C4's `productPiecesOf(items)` is the per-item counter. It is distinct from A2's `piecesOf(job)`, and C3 can use it in place of its own.
- **C6**
  - C6 follows C1's hand-off instead of its steps 3.6–3.7, which edit the deleted `project-details.tsx`.
  - `NetworkTab` drops its own `role="tabpanel"`, because C1's shell draws the panel (`tab-{id}` / `panel-{id}`).
  - C6 imports `PREVIEW_TRIGGER_ID` from C2 and skips the `Banner` slot.
- **C7** creates `rail-block.tsx` (`RailBlock`, `RailFacts`, `RailFact`, `RailValue`, `useRailStacked`, `RAIL_MIN`). C7c owns the Brief success step (`step-4-success.tsx`, `brief-app.tsx` 1146–1151, and `lib/brief/success-copy.ts` with C9a's signatures).
- **C8**
  - C8 unifies on C7's `RailBlock`, adding `collapsible?` and padding.
  - It deletes C1's `RailBlock` from `frame.tsx`, together with `legacy.tsx`.
  - It mounts C7's Outcome and Details blocks through adapters in `SLOTS.rail`.
  - It mounts A7's `DeleteProjectControl` in Manage.
- **C9**
  - Drop the `boardPartsOf` extraction, which A5 did.
  - Drop the success-copy / `step-4-success.tsx` / `brief-app.tsx` edits, which C7c did.
  - Reuse C4's `ModelPanelLazy`.
  - `<StorageErrorBanner />` (A7) sits at the top of both pages, and `<ProjectNotice />` at the top of My projects.
- **Task Z**
  - No `Legacy*` names are left.
  - `npm run test:projects` is green.
  - `npx next build` passes.
  - Run the browser matrix (1440 and 400, dark and light, both pages, the seeded fixtures) on :3002 only.

## Out of scope — found while planning, reported, not built here

- **Sub-project B.** "Open in editor" should load the build's own PCB, 3D and firmware, and the PCB provider should rehydrate when the project switches (spec §11).
- **Brief Step 1 "Change".** For a multi-product rebuild joining its own project, the button does nothing useful. This needs a UI decision.
- **Editor chrome.** The product name field renders 0 px wide at a 1024 px window.
