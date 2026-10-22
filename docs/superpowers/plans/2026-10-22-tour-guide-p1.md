# Tour Guide P1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Welcome, the first three chapters (Start here, Find your way, Your account) and the Tour Guide panel, on a new DS M10 Popover.

**Architecture:** Pure rules and content in `src/lib/tour/` (tested with node:test); one `TourHost` mounted at the root (like `ReportProblemHost`) listens for `ideeza:tour` window events, shows the Welcome on Home, runs a chapter step by step over `data-tour` anchors, and renders the panel. `@floating-ui/dom` places the popup.

**Tech Stack:** Next.js 16 / React 19, Tailwind preset over DS tokens, `@floating-ui/dom` 1.7.6 (already installed), node:test.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-22-tour-guide-design.md`.
- DS tokens and A01/A03/M07/M10 only; text 14/20 body, 12 captions; no new dependency.
- Popup copy is English, exactly as in `src/lib/tour/chapters.ts`; credit costs come from `CONCEPT_COST` / `BUILD_COST`.
- `tsc --noEmit`, `npm run lint`, `npm run test:projects` pass; behaviour verified in a real browser.

---

### Task 1: Tour content and rules (`src/lib/tour/`)

**Files:**
- Create: `src/lib/tour/types.ts`, `src/lib/tour/chapters.ts`, `src/lib/tour/state.ts`
- Modify: `tests/projects/tsconfig.json` (include `src/lib/tour/**/*`)
- Test: `tests/projects/tour.test.mjs`

**Produces:**
- `type TourStep = { target: string | string[]; title: string; body: string }`
- `type TourChapter = { id: ChapterId; name: string; where: string; route?: string; steps: TourStep[]; phoneSteps?: TourStep[] }`
- `TOUR_CHAPTERS: TourChapter[]`, `chapterById(id)`, `stepsFor(chapter, phone: boolean)`, `nextChapterOf(id)`
- `TOUR_KEY = "ideeza:tour"`, `type TourRecord`, `emptyTour()`, `normalizeTour(raw)`, `shouldWelcome(rec | null, { pathname, hasActivity })`, `withWelcome(rec, choice)`, `withChapter(rec, id, state, step)`, `chapterStatus(rec, id) → { kind: "new" | "done" | "resume", step }`

- [ ] Write `tour.test.mjs`: Welcome only on `/`, only with no record and no activity, or after a reset; withChapter keeps others; resume for paused/skipped past step 1; normalizeTour drops junk; every chapter has 1–5 steps, unique ids, non-empty copy ≤ 25 words a body; phone steps only target `menu`; nextChapterOf chains start → way → acct → null.
- [ ] Run `npm run test:projects` → fails (module missing).
- [ ] Implement the three files.
- [ ] Run → passes. Commit `feat(tour): chapters and rules for the tour guide`.

### Task 2: DS M10 Popover (`src/components/ideeza/popover.tsx`)

**Produces:** `Popover` — `{ placement: "top" | "right" | "bottom" | "left"; title; titleId?; header?; actions?; arrowRef?; children }`, 280 wide, radius lg (8), border, `shadow-3`, `p-4` (8), title Body/SM Medium, body Body/SM secondary, gap 2 then 6, `_Modal actions` row (top border, 16 / 24 / 24, gap 12, A01 MD buttons), 12×8 arrow on the side facing the anchor. Exported from `components/ideeza/index.ts`.

- [ ] Build it; `tsc`. Commit `feat(ds): M10 Popover`.

### Task 3: The engine (`src/components/tour/`)

**Files:** `open-tour.ts` (window events: `openTourGuide()`, `startTourChapter(id)`), `use-tour.ts` (useSyncExternalStore on `ideeza:tour`, `updateTour`), `targets.ts` (first visible `[data-tour]`, union rect), `tour-step.tsx` (spotlight + M10 popup placed by floating-ui, keys, focus, live region), `welcome-dialog.tsx` (ModalFrame sm), `tour-guide-panel.tsx`, `tour-host.tsx` (mounted in `app/layout.tsx` beside `ReportProblemHost`).

- [ ] Build; `tsc`; drive in the browser: Welcome on a fresh browser at `/`, five steps, Next part, Skip, Escape, Resume from the panel, phone width. Commit `feat(tour): welcome, step popup and Tour Guide panel`.

### Task 4: Anchors and ways in

**Files:** `workspace-prompt.tsx` (`home-composer`, `home-mode`, `home-examples`, `home-get`), `sidebar.tsx` (`nav-*`, `plan`, `account`, `wallet`, `support-tutorial`, `support-tour`, `menu`; Tour Guide becomes a live button), `command-palette.tsx` ("Open Tour Guide" under Resources, header comment).

- [ ] Add anchors and entries; `tsc`, lint; browser check. Commit `feat(tour): anchors, Support › Tour Guide and ⌘K`.

### Task 5: Docs and verification

- [ ] `docs/guides/features/tour-guide.md` (+ index in `docs/guides/features/README.md`), `docs/map/PRODUCT.md`, `STRUCTURE.md` if it lists component folders.
- [ ] Full check: tsc, lint, tests; headless Chrome (fresh profile) through Welcome → Start here → Find your way → Your account; collapsed sidebar; phone 375; dark; keyboard only; reduced motion; font sizes 14/12.
- [ ] Commit `docs(tour): feature guide`.
