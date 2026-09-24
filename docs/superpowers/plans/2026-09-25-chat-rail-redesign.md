# Concept Chat Rail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The chat's left rail becomes the project's status board — header with stepper and balance, one next-step line that points at the canvas control, selectable product rows (thumbnail, live status, one-line spec, build progress), and the history folded into an Activity disclosure — with a root-level screen-reader announcer.

**Architecture:** All derivation moves into one pure module, `src/lib/create/project-state.ts`, read by both the canvas (`chat-thread.tsx`, replacing its inline memos with no behaviour change) and the rewritten rail (`chat-rail.tsx`). The host (`concept-chat.tsx`) owns selection, jump/focus rules and the announcer. Canvas anchors live in `src/components/create/anchors.ts`.

**Tech Stack:** Next.js 16 (modified — read `node_modules/next/dist/docs/` before any Next API), React 19, TypeScript strict, Tailwind over `src/styles/tokens.css`, Hugeicons via `Icon`, `node:test` in the scratchpad for the pure module.

**Spec:** `docs/superpowers/specs/2026-09-25-chat-rail-redesign-design.md` — its §2 (sections, exact copy, classes), §3 (states), §4 (interactions), §5 (data and function signatures), §6 (accessibility), §7 (motion), §8 (unchanged), §9 (file list) and §11 (amendments A1–A5) are the requirements. Copy strings verbatim from it.

## Global Constraints

- Worktree `/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator-wt/spec-sheet`, branch `feat/spec-sheet`. Never touch `/Users/ideeza/Downloads/Ideeza/IDEEZA_Creator`. Dev server http://localhost:3001 (already running).
- Tokens only (no hex, no new tokens); brand violet only for selection (selected row fill `bg-bg-brand-subtle`, focused card edge `border-border-brand`, current step dot) and the Build button; one control, one home (spec A4); keyboard operable; ≥ 24 px targets; ≥ 4.5:1 contrast; motion 150–250 ms ease-out with reduced-motion fallbacks; reuse `components/ideeza/` controls.
- `BuildRail` stays for the `/build` page unchanged; the chat stops rendering it and reuses its exported `PipelineRow` and `STATE_WORD`.
- Commits: only your task's files; trailer exactly `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; never push.
- Every task ends with `npx tsc --noEmit` clean and `npx eslint <touched files>` clean (the one pre-existing `history.tsx` `react-hooks/set-state-in-effect` error excepted).
- Screenshot tool: `SP=/private/tmp/claude-502/-Users-ideeza-Downloads-IDEEZA-Creator/6baaa1e4-70b3-41c1-8f4f-b57ac5b3bc98/scratchpad; node $SP/cdp/shot.mjs <out.png> --origin http://localhost:3001 [--theme dark|light] [--width 400 --height 860] [--step "<js>"]` (seeds the 4-product "Car" chat with read concepts; steps are awaited). Build-state seed: `node $SP/rail-buildseed.cjs` (written by the designer; read it before use).

---

### Task R1: One model for rail and canvas (no visual change)

**Files:**
- Create: `src/lib/create/project-state.ts`
- Create: `src/components/create/anchors.ts`
- Modify: `src/lib/spec/derive.ts` (add `blocksBuild`), `src/lib/spec/format.ts` (add `specFacts`), `src/components/create/spec-panel.tsx` (`SpecFacts` renders `specFacts()`; conflict uses `blocksBuild`), `src/components/create/use-clock.ts` (add `relativeLabel`), `src/components/create/image-turn.tsx` (uses `relativeLabel`), `src/components/create/chat-thread.tsx` (reads `projectState()`; uses `blocksBuild`)
- Test: `$SP/railtest/rail.test.js`

**Interfaces (spec §5, exact):** `projectState(chat, job)`, `productIdOf(t)`, `productNameOf(setup, t)`, `railRows(state, labels, job)`, `stageOf(chat, job)`, `nextStep({ state, rows, job, balance, hydrated, projectName, savedName })`, `activityOf(chat, labels, names, job, projectName)`, `announcementFor(prev, next)`; types `RailRow`, `RailPhase`, `Stage`, `NextStep`, `JumpTarget`, `ActivityEntry`; `blocksBuild(spec)`; `specFacts(spec, parts) → { key, text, tone }[]`; `relativeLabel(ts, now)`; anchor ids `productCardId(id)`, `productRetryId(id)`, `SETUP_QUESTION_ID`, `BUILD_ACTION_ID`, `CREDITS_NOTICE_ID`, `BUILD_REVIEW_ID`, `ADD_PRODUCT_ID`.

- [ ] **Step 1:** Write `$SP/railtest/rail.test.js` first (RED): the seed's failed-then-ready Remote Controller → its row is *ready* and its activity entry reads `Couldn't draw · redrawn as Concept 4` with a neutral tone; every `nextStep` rule of spec §2.3 in table order (one assertion per rule, exact sentence); `stageOf` for each stage of §2.2; `announcementFor` returns `null` for identical snapshots and the exact sentences of §6 for each transition; `blocksBuild` true only for `!fits && !draftAtSize`.
- [ ] **Step 2:** Create `project-state.ts` by **moving** chat-thread's derivation block (products, leftOut, selected, specs, specBlock, builtImages, inBuild, conceptChanged, specChanged, changedSinceBuild, available, removed, allReady, failedChoice) — not rewriting it — then add the new functions per spec §2–§6. Relative imports only inside `src/lib` (the harness compiles it with plain `tsc`).
- [ ] **Step 3:** Compile and run: `cd <worktree> && rm -rf $SP/railtest/out && npx tsc src/lib/create/project-state.ts --outDir $SP/railtest/out --rootDir src --module commonjs --target es2020 --strict --skipLibCheck --esModuleInterop --jsx react-jsx --moduleResolution node && NODE_PATH=<worktree>/node_modules node --test $SP/railtest/rail.test.js` → all pass (GREEN). If `@/` path imports inside modules it pulls in break the node run, report NEEDS_CONTEXT instead of rewriting unrelated files.
- [ ] **Step 4:** Switch `chat-thread.tsx`, `spec-panel.tsx`, `image-turn.tsx` to the moved helpers. Proof of no visual change: screenshot the seeded canvas at 1440 × 900 dark before and after (`$SP/shots/r1-before.png`, `r1-after.png`) and confirm they match (compare visually; list any pixel-visible difference as a bug).
- [ ] **Step 5:** tsc + eslint; commit `refactor(create): one project model for the rail and the canvas`.

### Task R2: The rail UI

**Files:** Modify `src/components/create/chat-rail.tsx` (rewrite), `src/components/create/build-rail.tsx` (export `PipelineRow`, `STATE_WORD` only).

- [ ] **Step 1:** Rewrite `chat-rail.tsx` exactly to spec §2.2–§2.5 and §6–§7: `ChatRail({ model, focusedProduct, onSelectProduct, onJump })` with `RailHeader`, `Stepper`, `NextStepLine`, `ProductList`/`ProductRow` (thumbnail, status line, spec line, tag, build progress + pipeline rule for 1–2 vs 3+ products), `SuggestedLine`, `Activity` (open before the setup is answered, a disclosure after); export `RailAnnouncer({ model })` and `useRailModel(chat, job, labels, projectName, savedName)`. The next-step slot accepts a `slot?: React.ReactNode` so the host can pass `BuildStatus statesOnly` into it.
- [ ] **Step 2:** Mount it temporarily in `concept-chat.tsx` with minimal wiring (model + current `focusedProduct`/`setFocusedProduct`, `onJump` = no-op) only if needed to render; R3 does the real wiring. Screenshot desktop and phone, dark and light.
- [ ] **Step 3:** Invoke `/impeccable` (product register) and `/ui-ux-pro-max` on the rendered rail; apply findings that fit the spec and constraints; list them with actions in the report.
- [ ] **Step 4:** tsc + eslint; commit `feat(create): the rail is the project's status board`.

### Task R3: Wiring, anchors, focus, announcer

**Files:** Modify `src/components/create/concept-chat.tsx`, `src/components/create/image-turn.tsx`, `src/components/create/chat-thread.tsx`.

- [ ] **Step 1:** `concept-chat.tsx`: build the rail model once; `selectProduct(id)` and `jumpTo(target, { focus })` per spec §4 (pane switch on phones, `scrollIntoView` smooth/auto by reduced motion, 1.2 s `data-arrived` ring, desktop focus stays on the row, phone focuses the card root / the target control; spec targets go through the existing `focusSpec`); render `RailAnnouncer` at the root outside both panes; `BuildStatus statesOnly inChat` moves into the rail's next-step slot; stop rendering `BuildRail` in the chat; composer hint copy per §2.6; `LoadingShell` rail shape per §2.7.
- [ ] **Step 2:** `image-turn.tsx`: card roots (ready, pending, failed) get `id={productCardId(id)}`, `tabIndex={-1}`, `scroll-mt-[16px]`, the arrival-ring classes, and a `focused` prop that draws `border-border-brand`; Try again gets `id={productRetryId(id)}`. `chat-thread.tsx`: pass `focused={products.length > 1 && idOf(turn) === focusedProduct}` and put the anchor ids on the setup question wrapper, the review wrapper (`tabIndex={-1}`), the Build button, the credits notice wrapper and the Add-a-product section.
- [ ] **Step 3:** Browser: row click retargets the composer placeholder and selects the card edge; Show on canvas focuses Build / Try again / size field / review; phone switches to Canvas and focuses the card; the announcer's text changes when a render lands while the Canvas tab shows (read `document.querySelector('[role=status]').textContent`).
- [ ] **Step 4:** tsc + eslint; commit `feat(create): the rail picks the product and takes you to its card`.

### Task R4: Browser matrix and docs

**Files:** Modify `CLAUDE.md` (own hunk only — stage via `git show HEAD:CLAUDE.md` → edit → `git hash-object -w` → `git update-index --cacheinfo`; in the worktree the file has no one else's edits, so a plain edit + `git add CLAUDE.md` is fine there), plus fixes found by the matrix in the files above.

- [ ] **Step 1:** CDP matrix per spec §10 Task 4 (desktop 1440 and phone 400, dark and light; setup loading/asking; drawing, failed, failed-then-redrawn; conflict, draft, left out; short of credits; build queued, running with 1, 2 and 4 products, partial, ready, saved; changed after build) → `$SP/shots/rail-new-*.png`. Read the DOM for exact strings; check computed contrast ≥ 4.5:1; `prefers-reduced-motion: reduce` gives instant scroll and no transitions.
- [ ] **Step 2:** Fix what the matrix finds (in scope: the files of R1–R3).
- [ ] **Step 3:** CLAUDE.md §5: rewrite the rail half of the decision about the rail being a transcript / `role="log"` and the "pipeline joins the rail" clause to describe the new rail.
- [ ] **Step 4:** tsc + eslint on all touched files + `npx next build`; commit `fix(create): the rail, checked across its states` (and `docs: …` for CLAUDE.md).
