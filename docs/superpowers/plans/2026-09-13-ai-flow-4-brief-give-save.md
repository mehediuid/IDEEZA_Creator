# Ai-Flow parity · Plan 4 — Brief: Give to community + Save privately

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-sequence the Brief for Give/Save (form first, video only when posting to Innovations), rebuild the Give and Save forms with the License field, story panel and final CTAs, and restyle the Auto-Generated Preview modal (audit §4).

**Architecture:** `brief-app.tsx` gains a `stepsFor(intent, shareToInnovations)` sequence the rail and navigation read; one `commit()` finishes whichever step is last. Forms reuse Plan 3's `SelectMenu`, `wallet.ts`, story panel and product card.

**Tech Stack:** as Plan 1.

## Global Constraints

Same as Plan 1. Copy source: audit §4 — verbatim. Screenshots `gc_*.png`, `sp_*.png`. **Depends on Plan 3** (state, `SelectMenu`, card frame, story panel, AR panel). Remove per Decision 1: Give's Recipient community + Distribution rule, Give/Save cost box + gas checkbox, Save's "Mint on blockchain?" toggle.

---

### Task 1: Step sequencing

**Files:** `src/components/brief/brief-app.tsx`, `src/components/brief/brief-rail.tsx`

**Interfaces (produces):**
```ts
export type BriefStepId = "idea" | "preview" | "form" | "success";
export function stepsFor(intent: Intent | null, share: boolean): BriefStepId[];
// sell → ["idea","preview","form","success"]
// give|save, share=false → ["idea","form","success"]
// give|save, share=true  → ["idea","form","preview","success"]
// null → ["idea"]
```
`step` state becomes a `BriefStepId` (migrate stored numeric step: 1→idea, 2→preview, 3→form, 4→success). `next()`/`back()` walk `stepsFor`. `commit()` = the existing mint/finish logic (sets `minting`, writes the project outcome, goes to success). The rail lists the current sequence with the design's names: Idea · Preview · (Sell: "Ready to sell" · Give: "Give to community" · Save: "Save as Private") · Done. Draft persistence unchanged (`{state, step}`).

- [ ] **Step 1: `stepsFor` + migration + navigation.**
- [ ] **Step 2: Rail reads the sequence.**
- [ ] **Step 3: tsc + CDP**: intent give, share off → after Step 1 the form shows; share on → the form's CTA leads to Preview; sell → preview first (unchanged).
- [ ] **Step 4: Commit** `feat(brief): intent-aware step sequence — form first for Give/Save, video only with Innovations`.

---

### Task 2: Give form + License (Give to community 3, GV-01 dropdown)

**Files:** `src/components/brief/step-3-mint.tsx` (`GiveFields`)

Design: heading **"Give to community"**, sub **"Anyone can use and build on this, for free. Minting keeps your name on it — and this cannot be undone."**; product card (Plan 3's, opens the preview modal); **Blockchain Mint** (`NETWORKS`), **Choose collection** (`readCollections`), **License** `SelectMenu` placeholder **"Select a license"** with options + ⓘ info:
- `boost1` **Boost Software License — Version 1.0** — "Permissive; no attribution required in binaries."
- `bsd2` **BSD 2-Clause License** — "Permissive; keep the copyright notice."
- `bsd3` **BSD 3-Clause License** — "Permissive; no endorsement using the author's name."
- `cc` **Creative Commons Legal Code** — "For documentation and media; choose the variant when you publish."
- `gpl2` **GNU General Public License — Version 2** — "Copyleft; derivatives must stay open under GPL."
- `lgpl21` **GNU Lesser General Public License — Version 2.1** — "Copyleft for the library only; linking apps may stay closed."
- `mit` **MIT License** — "Permissive; keep the notice, no warranty."
Checkboxes: **"I confirm I am the rightful owner of this idea"** · **"Share to Innovations"** → story panel (Plan 3) plus the brand-coloured note **"Next you will make a short clip — Innovations posts need one."** CTA: share off → **"Give to the community"** (`commit`); share on → **"Continue to video ›"** (`next`). Disabled with the first missing field named (chain · collection · license · owner). No cost box, no gas checkbox, no recipient/distribution fields.

- [ ] **Step 1: Rebuild `GiveFields`.**
- [ ] **Step 2: tsc + CDP**: License dropdown lists seven rows with ⓘ tooltips; CTA label flips with the Share checkbox; committing without video lands on Success.
- [ ] **Step 3: Commit** `feat(brief): Give to community form with License and Innovations story (Ai-Flow GC)`.

---

### Task 3: Save form (Save as Private, Checkmark on)

**Files:** `src/components/brief/step-3-mint.tsx` (`SaveFields`)

Design: heading **"Save as Private"**, sub **"Only you can see this. Minting keeps your name on it — you can share or sell it later."** (spec's resolution of the copy-paste); product card; **Blockchain Mint** · **Choose collection**; checkboxes **"I confirm I am the rightful owner of this idea"** · **"Share to Innovations"** → story panel + note; CTA share off → **"Save as Private"** (`commit`), on → **"Continue to video ›"**. Remove the mint toggle, cost box and gas checkbox.

- [ ] **Step 1: Rebuild `SaveFields`.**
- [ ] **Step 2: tsc + CDP** as Task 2.
- [ ] **Step 3: Commit** `feat(brief): Save as Private form to Figma`.

---

### Task 4: Preview step final CTAs + Auto-Generated Preview modal

**Files:** `src/components/brief/step-2-video.tsx`, `src/components/brief/review-modal.tsx`, `src/components/brief/step-4-success.tsx`

Preview step footer CTA when it is the last step before success (`stepsFor` says so): give → **"Give to community and post to Innovations"**, save → **"Save as Private"** (both `commit`, enabled when the video is ready or, as today, allowed to continue with the render in flight — keep the existing rule); sell keeps "Continue to mint setup". Empty placeholders per design: video **"Write here your description for your new product video"**, audio **"Describe soundscape - ambient noise, music mood, speech tone..."**.

`ReviewModal` gains `variant: "approve" | "preview"`: **preview** (opened from a product card) = title **"Auto-Generated Preview"** + green **"Ready"** badge (or amber "Rendering" when not ready), 16:9 clip with play, body "Watch the full clip before approving. Once you mint, this is the version that ships with the listing.", footer **"Made from your 3D model"** + outlined **"Regenerate"** (opens `RegenerateConfirm`); **approve** = the existing modal (from the render indicator). Success step: copy per intent reviewed against the new order ("Drop is live" / "Saved" / listing live) — no structural change.

- [ ] **Step 1: Final CTAs + placeholders.**
- [ ] **Step 2: Modal variants + product-card entry point.**
- [ ] **Step 3: tsc + CDP**: give + share → Preview's CTA text; click → Success; product card click → modal titled "Auto-Generated Preview".
- [ ] **Step 4: Update CLAUDE.md §5 "Add Brief"** (sequence, Give/Save forms, License, preview modal) and STRUCTURE.md.
- [ ] **Step 5: Commit** `feat(brief): Innovations flow CTAs and Auto-Generated Preview modal; docs`.
