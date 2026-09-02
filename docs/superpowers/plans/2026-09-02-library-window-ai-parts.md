# Library Window Redesign (Verified / Unverified / AI-Generated) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the All-Library window per the IDEEZA PRD (2026-08-30): origin filter (Human vs AI-Generated), verification filter (Verified / Not Verified), both AND-combinable with Price + search, with per-row badges — after first delivering the PRD §10 UI mockup for review.

**Architecture:** Everything lives in the existing Library surfaces: `AllLibraryFlyout` in `src/components/pcb/library-panel.tsx` (UI + demo rows), `LibFilter`/`LibVerif` types + session state in `src/lib/pcb/types.ts`, setters in `src/lib/pcb/store.tsx`. No backend — the marketplace rows are demo data; the redesign makes the filter model and badges real over that data so the future data layer only swaps the row source. Filter state stays session-only in `PcbState` (FR-8 exactly: survives view switches and panel reopen, resets on reload).

**Tech Stack:** Next.js 16 / React 19 / TypeScript, inline-token styling (`--color-*`), no new dependencies.

## Global Constraints

- **PRD §10 gate:** a UI mockup must be produced and shared for review BEFORE implementation starts. Task 1 is that deliverable; Tasks 2–5 wait for approval.
- **PRD §5:** filter model — Row 1 tabs `All | Public | Private | AI-Generated`; Row 2 Verification segmented control `All | Verified | Not Verified` (next to Price); Row 3 Price unchanged. All filters AND-combine (FR-3), search respects them (FR-9).
- **PRD FR-7:** default filter state is "All" for both origin and verification (today's default `libFilter: "verified"` must change to `"all"`).
- **PRD FR-4/5/6:** verification badge (green check kept; new low-weight amber icon for Not Verified) + a visually distinct AI badge (violet, brand accent) that can co-exist on one row; tooltips explain each state.
- **PRD §11 out of scope:** AI generation flow, automated QA, changes to Public/Private/Price *logic* beyond adding the new controls beside them.
- **Open question 9.1 — decided (flag in the mockup for Sohaib):** "Verified" leaves the top tab row, fully replaced by the Row-2 segmented control — the repo's one-home-per-control rule forbids the same filter in two rows. The other §9 answers to state in the review: 9.2 — no origin field exists; this plan adds `origin` + `verified` to the row model (schema addition). 9.3 — origin is immutable here. 9.4 — labeling/filtering only for now, no usage restriction.
- Repo rules: tokens only, no stubs (the flyout's search/Price/tabs must actually filter — today they render `ALL_ROWS` unfiltered), `npx tsc --noEmit` must pass, browser-verify via CDP, update CLAUDE.md §5 in the same change.
- Per user workflow memory: push to main only after the user verifies.

---

### Task 1: PRD §10 UI mockup deliverable (BLOCKS all other tasks)

**Files:**
- Create: `/private/tmp/…scratchpad/library-redesign-mockup.html` (scratchpad — not committed)

**Interfaces:**
- Produces: a published artifact URL for Sohaib/Mehedi review; approval unblocks Tasks 2–5.

- [ ] **Step 1: Load the `artifact-design` skill** (mandatory before authoring any artifact).

- [ ] **Step 2: Build the mockup page.** One HTML page (IDEEZA tokens: violet `#7c2db9` accents, light+dark) containing exactly the PRD §10 minimum:
  1. **Default "All" view** of the redesigned flyout — tabs `All | Public | Private | AI-Generated`, Verification segmented control beside Price, results table with example rows covering all four combinations (Human+Verified, Human+Not Verified, AI+Verified, AI+Not Verified) so the badge layout reads side by side.
  2. **One filtered state** — `AI-Generated` tab + `Not Verified` toggle active, showing the narrowed result list AND the zero-result empty state ("No AI-generated unverified parts match — clear a filter to widen").
  3. **Badge close-up strip** — the three icons at 2× with labels + tooltip copy: green filled check "Verified — symbol, footprint and metadata reviewed"; amber hollow clock "Not verified yet — no quality guarantee" (low visual weight, must not read as an error); violet sparkle chip "AI-Generated — produced by IDEEZA part generation", plus the combined-row example ("AI-Generated — not yet human-verified").
  4. A **decision callout**: "Verified" tab replaced by the segmented control (answer to §9.1), so redundancy is avoided — flagged per §10's "flag it rather than silently deviating".

- [ ] **Step 3: Publish as an artifact** (favicon 📚, title "Library Redesign Mockup") and hand the link to the user for Sohaib's review.

- [ ] **Step 4: STOP.** Do not start Task 2 until the user confirms the design is approved (PRD §10 requires review before implementation).

---

### Task 2: Types + session state (`LibFilter` rework, `LibVerif`, FR-7 default)

**Files:**
- Modify: `src/lib/pcb/types.ts:119-120` (types), `src/lib/pcb/types.ts:746-750` + `:1796-1800` (state + initialState)
- Modify: `src/lib/pcb/store.tsx:153-154` area (action type) and `:1003-1004` area (impl)

**Interfaces:**
- Produces: `type LibFilter = "all" | "public" | "private" | "ai"`, `type LibVerif = "all" | "verified" | "unverified"`, `PcbState.libVerif: LibVerif`, `PcbActions.setLibVerif(v: LibVerif): void`.

- [ ] **Step 1: Rework the types** in `types.ts`:

```ts
export type LibFilter = "all" | "public" | "private" | "ai";
export type LibVerif = "all" | "verified" | "unverified";
```

- [ ] **Step 2: State field + defaults.** In `PcbState` (next to `libFilter`): `libVerif: LibVerif;`. In `initialState`: change `libFilter: "verified"` → `libFilter: "all"` (FR-7) and add `libVerif: "all",`. Session-only — deliberately NOT a doc key (FR-8 wants session persistence, not document persistence), so no sanitizer change.

- [ ] **Step 3: Store setter.** In `store.tsx`, to `PcbActions`: `setLibVerif: (v: LibVerif) => void;` (import the type), and beside `setLibPrice`:

```ts
setLibVerif: (v) => merge({ libVerif: v }),
```

- [ ] **Step 4: Typecheck.** Run `npx tsc --noEmit -p tsconfig.json` — expect existing `library-panel.tsx` to now FAIL on `"verified"` in `FILTER_ITEMS` (proof the type rework bites). Task 3 fixes it; if working solo, do Tasks 2+3 in one commit so `main` never breaks.

---

### Task 3: Filter UI + real AND filtering (FR-1/2/3/7/8/9)

**Files:**
- Modify: `src/components/pcb/library-panel.tsx:136-160` (items + row data), `:602-724` (flyout)

**Interfaces:**
- Consumes: `state.libVerif`, `actions.setLibVerif` from Task 2.
- Produces: `Row` gains `origin: "human" | "ai"; verified: boolean; access: "public" | "private"`; a `visibleRows` memo used by both the table and Task 4's empty state.

- [ ] **Step 1: Rework the filter data.**

```ts
const FILTER_ITEMS: { label: string; value: LibFilter }[] = [
  { label: "All", value: "all" },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
  { label: "AI-Generated", value: "ai" },
];

const VERIF_ITEMS: { label: string; value: LibVerif }[] = [
  { label: "All", value: "all" },
  { label: "Verified", value: "verified" },
  { label: "Not Verified", value: "unverified" },
];
```

- [ ] **Step 2: Extend the demo rows** so every combination exists (this is also what the reviewer sees):

```ts
type Row = { id: string; title: string; author: string; desc: string; paid: boolean;
  origin: "human" | "ai"; verified: boolean; access: "public" | "private" };
```

Spread across the 8 existing `ALL_ROWS`: r1 human+verified+public, r2 human+verified+public, r3 ai+verified+public, r4 human+unverified+public, r5 ai+unverified+public, r6 human+verified+private (paid), r7 ai+unverified+private, r8 ai+verified+private (paid). AI rows get `author: "IDEEZA AI"`-style attribution kept plausible (keep existing names for human rows).

- [ ] **Step 3: Make filtering real.** In `AllLibraryFlyout`, replace the direct `ALL_ROWS.map` with a memo — tabs, verification, price AND search all reach it (FR-3/FR-9; today none of them filter anything):

```ts
const q = query.trim().toLowerCase();
const visibleRows = ALL_ROWS.filter((r) =>
  (state.libFilter === "all" || (state.libFilter === "ai" ? r.origin === "ai" : r.access === state.libFilter)) &&
  (state.libVerif === "all" || (state.libVerif === "verified") === r.verified) &&
  (state.libPrice === "all" || (state.libPrice === "premium") === r.paid) &&
  (q === "" || r.title.toLowerCase().includes(q) || r.author.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)),
);
```

If the selected row is filtered out, keep the table honest: `const sel = visibleRows.find((r) => r.id === state.libSelected) || null;`.

- [ ] **Step 4: Render the Verification segmented control** on the Price row (PRD §7.2 "Row 2, next to Price"), before the Price radios, using the same radio idiom the Price group already uses but as a segmented pill group (matches the repo's `.ix-seg` pattern):

```tsx
<span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>Verification</span>
{VERIF_ITEMS.map((v) => {
  const active = state.libVerif === v.value;
  return (
    <button key={v.value} type="button" aria-pressed={active} onClick={() => actions.setLibVerif(v.value)}
      style={{ padding: "var(--spacing-1) var(--spacing-4)", borderRadius: "var(--radius-full)", fontFamily: "inherit",
        fontSize: "var(--font-size-xs)", fontWeight: 600, cursor: "pointer",
        border: `var(--border-width-1) solid ${active ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
        background: active ? "var(--color-bg-brand-subtle)" : "transparent",
        color: active ? "var(--color-text-brand)" : "var(--color-text-tertiary)" }}>
      {v.label}
    </button>
  );
})}
```

Layout: Verification and Price share one row when width allows (`display:flex; flexWrap:wrap; gap`), Verification group first.

- [ ] **Step 5: Empty state.** When `visibleRows.length === 0`, render inside the table body: `No parts match these filters — clear a filter or the search to widen.` (`--color-text-tertiary`, centered, `--spacing-8` padding).

- [ ] **Step 6: Typecheck + lint.** `npx tsc --noEmit -p tsconfig.json` → PASS. `npx eslint src/components/pcb/library-panel.tsx src/lib/pcb/types.ts src/lib/pcb/store.tsx` → no NEW errors.

- [ ] **Step 7: Commit** (Tasks 2+3 together): `git add -A && git commit -m "feat(library): origin + verification filters are real (PRD FR-1/2/3/7/9)"`.

---

### Task 4: Row badges + tooltips (FR-4/5/6)

**Files:**
- Modify: `src/components/pcb/library-panel.tsx:704-724` (row render), `:166-169` (svg constants)

**Interfaces:**
- Consumes: `Row.origin` / `Row.verified` from Task 3.

- [ ] **Step 1: Badge glyphs.** Keep `CHECK_SVG` (green check unchanged, FR-4). Add:

```ts
// Not Verified — a hollow clock, low visual weight so it never reads as an error (PRD §8).
const UNVERIFIED_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
// AI-Generated — sparkle in the brand accent, distinct from the verification badge (PRD §8).
const AI_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z"/></svg>';
```

- [ ] **Step 2: Row icon cluster.** Replace the unconditional green check (line ~717) with the pair — both can co-exist on one row (FR-5), each with a tooltip (FR-6):

```tsx
{r.verified ? (
  <span title="Verified — symbol, footprint and metadata reviewed"
    style={{ width: 14, height: 14, flex: "0 0 auto", borderRadius: "var(--radius-full)", background: "var(--color-text-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Icon html={CHECK_SVG} size={10} />
  </span>
) : (
  <span title={r.origin === "ai" ? "AI-Generated — not yet human-verified" : "Not verified yet — no quality guarantee"}
    style={{ width: 14, height: 14, flex: "0 0 auto", color: "var(--color-text-warning, #b45309)", display: "flex" }}>
    <Icon html={UNVERIFIED_SVG} size={14} />
  </span>
)}
{r.origin === "ai" && (
  <span title="AI-Generated — produced by IDEEZA part generation"
    style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 6px", borderRadius: "var(--radius-full)", background: "var(--color-bg-brand-subtle)", color: "var(--color-text-brand)", fontSize: "var(--font-size-2xs, 10px)", fontWeight: 700 }}>
    <Icon html={AI_SVG} size={10} /> AI
  </span>
)}
```

(If `--color-text-warning` doesn't exist in `tokens.css`, use the amber the ERC severity scale already defines — check `tokens.css` first, never hardcode without a fallback token.)

- [ ] **Step 3: Typecheck + lint** as in Task 3 Step 6 → PASS.

- [ ] **Step 4: Commit:** `git commit -am "feat(library): verification + AI-origin badges with tooltips (PRD FR-4/5/6)"`.

---

### Task 5: Browser verification + CLAUDE.md + handoff

**Files:**
- Modify: `CLAUDE.md` (§5, the "library window" entry)

- [ ] **Step 1: Drive the real app over CDP** (seed `ideeza:manual:projects` + `ideeza:manual:active`, open `/project/verify-board/pcb`, Library tab → All Library). Assert, reading the DOM:
  1. Tabs read `All · Public · Private · AI-Generated`; default active = All; Verification control reads `All · Verified · Not Verified` with All active (FR-7).
  2. 8 rows visible; rows carry the expected badge mix (count green checks = 4-ish per seed, hollow clocks for unverified, `AI` chips on ai rows; at least one row shows clock+AI together — FR-5).
  3. Click `AI-Generated` + `Not Verified` → only the ai+unverified rows remain; add Price `Free` → subset again (FR-3); type a title fragment into search → narrows within that subset (FR-9); clear → back.
  4. A combination with no rows shows the empty-state line.
  5. Switch Schematic↔PCB view, reopen the Library panel → filter selections unchanged (FR-8).
  6. Screenshot light + dark for the report.

- [ ] **Step 2: Update CLAUDE.md §5** — extend the library entry with one accurate sentence, e.g.: "**All Library filters are real** (PRD 2026-08-30): tabs All · Public · Private · AI-Generated + a Verification segmented control (All / Verified / Not Verified) + Price + search AND-combine over the rows; each row carries a verification badge (green check / amber clock) and a violet AI chip with explanatory tooltips; defaults are All/All, selections persist for the session."

- [ ] **Step 3: Commit:** `git commit -am "docs: CLAUDE.md §5 library filter redesign"`.

- [ ] **Step 4: Report to the user** with screenshots; mark Ready for Testing. **Push to main only after the user verifies** (per workflow memory).

---

## Self-Review (done)

- **Spec coverage:** FR-1 (Task 3 Step 1/3), FR-2 (VERIF_ITEMS "Not Verified"), FR-3 (Step 3 AND memo), FR-4/5/6 (Task 4), FR-7 (Task 2 Step 2), FR-8 (session `PcbState`, verified Task 5), FR-9 (search in memo), §7.2 layout (Task 3 Step 4), §8 treatments (Task 4 Step 1), §10 deliverable (Task 1, gating), §9.1 decision flagged (Task 1 Step 2.4). §11 respected: Public/Private *logic* untouched in meaning — the `access` field only makes the existing tabs honest, flagged in the mockup review.
- **Placeholders:** none — every code step carries the code.
- **Type consistency:** `LibVerif` values `"all"|"verified"|"unverified"` used identically in types, store, VERIF_ITEMS and the memo; `Row.origin` `"human"|"ai"` everywhere.
