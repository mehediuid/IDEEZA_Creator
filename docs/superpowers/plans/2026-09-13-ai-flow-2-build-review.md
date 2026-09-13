# Ai-Flow parity · Plan 2 — Build states, Review shell, Wiring/Parts, `/parts`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the AI build page (queued · running · partial · system failure), the ready toast, the "Review your deliverables" shell with five tabs (incl. new Wiring and Parts previews) and the `/parts` page to Figma parity (audit §2).

**Architecture:** Reads the Plan 1 build model (`BuildJob.status/title/summary/parts`, `ITEM_SUBTITLES`, `build-artifacts.ts`). All per-state copy lives in one table in `build-status.tsx`. Previews are pure SVG/JSX derived from `build-artifacts.ts` so PCB · Wiring · Firmware · Parts agree. Save Project / Advance Edit create a `ManualProject` from the job once and navigate.

**Tech Stack:** as Plan 1.

## Global Constraints

Same as Plan 1 (spec + audit paths, tokens, no deps, tsc + CDP, commit trailer, don't commit unrelated files). **Depends on Plan 1 Tasks 1–3** (credits, build model, artifacts). Remove per Decision 1: `Header` bar with "PROJECT BUILD"/"Source chat", the Review page's outcome picker + `OutcomeDialog`, "What is this?" blurbs, "Download .glb", the red retry toast variant (failure states are page banners).

---

### Task 1: Build page shell + per-state table (frames 11–14)

**Files:**
- Modify: `src/components/create/build-shell.tsx` — replace `Header` with a "← Back" text link (`router.back()`, falls back to `/chat/${job.chatId}`) above one centred card `max-w-[580px]`.
- Modify: `src/components/create/build-status.tsx`

**Interfaces (produces):**
```ts
type StateRow = {
  badge: { text: string; tone: "neutral" | "brand" | "warning" | "error" | "success" };
  banner?: { tone: "info" | "warning" | "error"; title: string; body: string };
  meta: string;                          // clock line
  footer: string;
  actions?: "retryAll";                  // system failure only
};
export function stateRowFor(job: BuildJob, now: number): StateRow;
```
Copy (verbatim, audit §2):
- **queued** — badge "Queued" (neutral); banner info **"Your build starts shortly"** / **"One build ahead of you. Credits are only charged once your build starts."**; meta **"Free plan runs one build at a time"**; footer **"You're next in the queue. We'll start automatically and notify you — no need to wait here."**
- **running** — badge `Building · ${progress}%` (brand); meta `About 8–12 minutes · ${elapsed} minutes elapsed`; footer **"You can leave — the build keeps running and we'll notify you when each piece is ready."**
- **partial** — badge **"Partial — retry needed"** (warning); banner warning `The ${labels of failed} step failed` (one failed: "The PCB step failed"; several: "The PCB and Wiring steps failed") / `Your ${ready labels joined with commas and "and"} are safe. Retrying the ${failed label} will not cost additional credits.`; meta `${readyCount} of 5 pieces finished · retry costs no extra credits`; footer `The finished pieces are saved. Only the ${failed label} needs another attempt.`
- **failed** (system) — badge **"Build failed"** (error); banner error **"A system error stopped this build"** / **"This was our fault, not yours. All 4 credits have been refunded automatically — your balance is unchanged."**; meta `Stopped after ${elapsed} minutes · nothing was delivered`; footer **"Nothing about your concept was lost — it stays in the chat exactly as you left it."**; actions: primary **"↻ Try this build again"** (`retryBuild`) + secondary **"Back to chat"**.
- **ready** — badge "Ready" (success); meta `Finished in ${elapsed} minutes`; footer **"All five pieces are ready. Choose what happens to this build next."** (the shell then shows `ReviewOutputs`, as today).

Concept header: thumb 56 px · violet chip `CONCEPT ${job.conceptNumber} · IN BUILD` (ready: `· READY`) · title `job.title` · spec line `job.summary` · badge right. Rows: icon tile · label + `ITEM_SUBTITLES` · right status text — `Waiting` (pending) · `${progress}%` · `Ready` · `Couldn't generate` (`--color-text-error`) · `Didn't run` (skipped, `--color-text-tertiary`); progress bar only for building/ready; failed row shows outlined **"↻ Retry ${label}"** under the title. Every state ends with a "Back to home" link.

- [ ] **Step 1: `stateRowFor` table + unit check** (node script over five fixture jobs → badge texts as above).
- [ ] **Step 2: Shell + header + rows + banner + meta + footer + actions.**
- [ ] **Step 3: tsc + CDP**: seed one job per state into `ideeza:create:builds`, visit `/build/<id>` for each, assert badge/banner/meta/footer text and that failed rows have no `<progress>`/bar element; system-failed page has "Try this build again"; click → status becomes running and credits re-charged once.
- [ ] **Step 4: Commit** `feat(build): Figma build states — queued, running, partial, system failure (Ai-Flow 11–14)`.

---

### Task 2: Ready toast (frame 20)

**Files:** `src/components/create/attention-banner.tsx`

Design: `fixed top-[16px] left-1/2 -translate-x-1/2`, width 540, surface card with `--elevation-*` shadow; bell tile; eyebrow **"BUILD READY TO REVIEW"**; message `${job.title} is ready`; primary **"Open build"**; ×. Retry variant → same shape with eyebrow "BUILD NEEDS A RETRY", message `${job.title} · the ${failed label} step failed`, button "Open build" (page banner explains the rest). Respect `prefers-reduced-motion` on the enter transition.

- [ ] **Step 1: Restyle + copy.**
- [ ] **Step 2: tsc + CDP**: seeded ready job with no outcome → toast at top-centre reading the title.
- [ ] **Step 3: Commit** `feat(build): top-centre ready toast with product title (Ai-Flow 20)`.

---

### Task 3: Deliverable previews (frames 15, DL-02, DL-03, Wiring, Parts)

**Files:**
- Create: `src/components/create/deliverable-previews.tsx`

**Interfaces (produces):**
```tsx
export function PcbPreview({ job }: { job: BuildJob }): JSX.Element;      // SVG block diagram + meta "2-layer · W x H mm · N parts · Gerber + KiCad"
export function FirmwarePreview({ job }): JSX.Element;                    // code card: header bar with filename, highlighted lines
export function WiringPreview({ job }): JSX.Element;                      // SVG map + legend + meta "N nets · N connections · N net classes · Netlist + Harness CSV"
export function PartsPreview({ job }): JSX.Element;                       // header "PARTS IN THIS BUILD" + mono "N unique parts · N units", table CATEGORY · COMPONENT NAME · REF · QTY, footer mono "Grouped by function · quantities are per board"
export function PartsSummary({ job }): JSX.Element;                       // "PARTS SUMMARY": Unique parts · Total units · Active devices · Passives · Connectors & mech
export const WHAT_SHIPS: Record<BuildItemKind, string[]>;                 // 3d: STL + STEP files · Print settings: PETG, 0.2 mm layer · Mount points sized for the PCB; pcb: Schematic (PDF + KiCad) · 2-layer layout · Gerber bundle · Bill of materials with stock links; code: Arduino-style sketch, fully commented · Library list pinned to versions · Wiring map to the PCB pins; wiring: Netlist + pin-to-pin table · Wire colors per net class · Harness lengths, 22 AWG · Connector pinouts: USB-C, JST-PH · Continuity test checklist; parts: Bill of materials (CSV) · Reference designators · Footprints and 3D models · Datasheet links · Supplier part numbers
```
PCB SVG: pale violet ground (`--color-bg-brand-subtle`), board outline with four corner holes, one block per part (label = short name), net lines from `netsFor`. Wiring SVG: nodes laid out left→right by role (connector → power → MCU → peripherals), wires labelled from `netsFor().wires[].label`, stroke by class: power dashed `--color-text-secondary`, ground solid `--color-text-primary`, signal solid `--color-bg-brand`; legend row `- - - POWER   —— GROUND   —— SIGNAL`. Firmware: header bar tinted, mono body, minimal token colouring (keywords/strings/comments via three tokens). All text sized with `--font-size-*`, both themes.

- [ ] **Step 1: `WHAT_SHIPS` + `PartsPreview` + `PartsSummary`.**
- [ ] **Step 2: `PcbPreview` + `WiringPreview` SVGs.**
- [ ] **Step 3: `FirmwarePreview`.**
- [ ] **Step 4: tsc**; render check happens in Task 4.
- [ ] **Step 5: Commit** `feat(build): derived PCB, firmware, wiring and parts previews`.

---

### Task 4: Review shell + Save Project / Advance Edit (frames 15–DL)

**Files:**
- Modify: `src/components/create/review-outputs.tsx`
- Modify: `src/lib/manual/projects.tsx` — add `projectFromBuild(job: BuildJob): ManualProject` on the ctx (`createProject` + `updateProject` productName = title, description = conceptPrompt, `buildId`), returns the existing one when `job.projectId` is set.
- Modify: `src/lib/create/history.tsx` — `setBuildProject(buildId, projectId)`.

Design: card eyebrow **"BUILD READY"**, h2 **"Review your deliverables"**; pill tab row ×5 (`ITEM_LABELS` order 3D model · PCB · Firmware code · Wiring · Parts; active = `--color-bg-brand` pill with `--color-text-on-brand`, others `.ix-pill`-like ghost); body grid `minmax(0,1fr) 260px`: left preview panel (3D → existing `ModelViewer` / generating state; others → Task 3 components), right card eyebrow **"WHAT SHIPS"** + chips with check icon (Parts tab: `PartsSummary` first, then WHAT SHIPS). Footer: left text **"All five pieces are ready. Choose what happens to this build next."**; right **"Save Project"** (primary, save icon) → `projectFromBuild` + `setBuildProject` + `router.push("/projects")`; **"Advance Edit"** (secondary, pencil) → same creation + set `ideeza:manual:active` + `router.push(`/project/${slug}/pcb`)`. Remove outcome picker, `OutcomeDialog`, `KIND_BLURB`, Download .glb, and the `/api/projects` outcome POST from this file (the Brief module owns outcomes; keep the API route untouched).

- [ ] **Step 1: `projectFromBuild` + `setBuildProject`.**
- [ ] **Step 2: Shell rebuild** with tabs, previews, footer actions.
- [ ] **Step 3: tsc + CDP**: seeded ready 5-item job → 5 tabs; clicking Wiring shows the legend text; Parts shows the table with `unique` rows; Save Project creates exactly one project in `ideeza:manual:projects` (click twice → still one) and lands on `/projects`; Advance Edit lands on `/project/<slug>/pcb`.
- [ ] **Step 4: Commit** `feat(build): Review your deliverables shell with five tabs, Save Project / Advance Edit (Ai-Flow 15–DL)`.

---

### Task 5: `/parts` page

**Files:**
- Create: `src/app/(dashboard)/parts/page.tsx`
- Create: `src/components/create/parts-page.tsx`

Design intent: the sidebar's **Parts & agile module** link. Page title "Parts & agile module", sub "Every part the AI builds specified, grouped per build." For each `BuildJob` with a ready `parts` item: a card with the build title, `bomFor(job).unique` unique parts · units, the `PartsPreview` table, and a link **"Open build ›"** → `/build/${id}?tab=parts` (Review shell reads `tab` from the query to preselect). Empty state: "No parts yet — generate a full product from a concept and its bill of materials lands here." + link to `/`.

- [ ] **Step 1: Page + component + `tab` query support in `review-outputs.tsx`.**
- [ ] **Step 2: tsc + CDP**: with no builds → empty state; with a ready build → one card, table rows, link works.
- [ ] **Step 3: Update CLAUDE.md §5** ("AI create & build flow": build states, toast, Review shell + Save/Advance Edit, five previews; "Platform & shell": `/parts`) and STRUCTURE.md; App map §3 add `/parts`.
- [ ] **Step 4: Commit** `feat(parts): Parts & agile module page over the builds' bills of materials; docs`.
