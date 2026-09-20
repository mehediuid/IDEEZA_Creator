# Part 4 AI Flow v1.1 — Implementation Plan

> **Status, 2026-09-18.** This plan was first written around the three
> peripheral tasks below, with §4.3 and §4.4 — the two additions the spec
> exists for — deferred. That was wrong: §4.4's "automatic classification"
> was called blocked without checking, and `/api/concept/summarize`
> already carried the exact pattern it needed. **Both are now built.** The
> three tasks below are done too. What remains is listed at the end.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `docs/IDEEZA-Part4-AI-Flow-Spec-v1.1.md` — both additions it exists for, plus the supporting sections — without inventing an engine or a price that has not been decided.

**Architecture:** Two subsystems and three smaller changes. **Companion products** (§4.4) branch the flow after a concept is accepted: a classifier decides whether the prompt describes a system, the user picks the other products, each gets its own concept in the same thread, and one build carries them all. **Confidence tiering** (§4.3) labels every product with what checking it passed, and the cross-product compatibility pass (§4.4.10) is the part of that which can really run today. The gate, the queued cancel and the overrun offer are the three smaller ones.

**Tech Stack:** Next.js 16.2.9 App Router, React 19, TypeScript. No test runner in this repo: a change is done when `npx tsc --noEmit -p tsconfig.json` passes, `npm run lint` shows no new problems against the 54-problem baseline, and the behaviour is driven in headless Chrome over CDP (see `CLAUDE.md` §2).

## Global Constraints

- Design tokens only. Never hardcode colour, spacing, radius, shadow or type. Both themes.
- An opacity modifier on a token colour compiles to nothing (`bg-bg-page/60`). Use `color-mix` or a token that already means it.
- No stubs. A control either does real work or is greyed with the reason.
- Never commit `AGENTS.md`, `README.md` or `docs/agent-rules/`.
- Never push. Commit only; the user pushes.
- Commit trailer: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- Update `CLAUDE.md` §5 in the same commit as the feature it describes.
- Spec copy is quoted verbatim where the spec gives wording (§4.5).

## What was built

| Spec | Where |
| --- | --- |
| §4.3 confidence tiering | `lib/create/confidence.ts`, `create/confidence-badge.tsx` |
| §4.4 companion products | `lib/create/companions.ts`, `api/concept/companions`, `create/companion-picker.tsx` |
| §4.4.8 one project, many products | `BuildJob.companions`, `productsOf`, `allItems` in `lib/create/history.tsx` |
| §4.4.9 a badge per product, lowest tier as headline | `checkBuild` |
| §4.4.10 cross-product compatibility | `compatibilityIssues` |
| §4.5 gate copy + dismissal | Task 1 |
| §4.6 cancel, overrun | Tasks 2 and 3 |
| §4.7 per-product tabs | the product switcher in `review-outputs.tsx` |

## The finding that shaped the confidence work

**A build does not produce a board.** `src/lib/create/build-artifacts.ts` derives the PCB artifact as `PcbMeta = { layers: 2, widthMm, heightMm, partCount }` plus a logical net graph (`NetNode[]` / `NetWire[]`). There is no `CanvasObject[]`, no copper, no clearances. `PcbPreview` in `deliverable-previews.tsx` draws a block diagram on a grid, not a layout.

`runDrc(objects, cfg)` in `src/lib/pcb/drc.ts` checks real geometry. With no geometry, it has nothing to consume.

So **`Checked` is unreachable today**: every product carries `Draft` for the spec's own second trigger, "checks could not be run". That is built and stated plainly in the issue list rather than skipped — the earlier decision to defer §4.3 over it was a design opinion standing in for a requirement. What makes the badge mean something is **wave 2 below**, which gives a build a real board for `runDrc` to measure.

---

## File structure

| File | Responsibility in this plan |
| --- | --- |
| `src/components/create/confirm-build-dialog.tsx` | The generation gate: the two paragraphs the spec adds, and the dismissal checkbox |
| `src/lib/create/gate-preference.ts` (new) | Reads and writes the "don't show this again" preference; one small module so the dialog and its caller share one key |
| `src/lib/create/history.tsx` | `cancelBuild(buildId)` — removes a queued job; `isOverrunning(job, now)` — whether a running job has passed twice its estimate |
| `src/components/create/build-status.tsx` | The Cancel action on a queued build, and the overrun offer on a running one |
| `src/components/create/concept-chat.tsx` | Skips the gate when the preference says so |
| `CLAUDE.md` | §5 inventory entries |

---

## Task 1: The generation gate says what a Draft result is

Spec §4.5. The dialog currently carries the concept summary, the five deliverables, a time chip, a credits chip and a no-wallet chip. It is missing the two paragraphs that exist to pre-empt the refund dispute, and the dismissal checkbox.

**Files:**
- Create: `src/lib/create/gate-preference.ts`
- Modify: `src/components/create/confirm-build-dialog.tsx`
- Modify: `src/components/create/concept-chat.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `readGateDismissed(): boolean`, `writeGateDismissed(v: boolean): void`, `GATE_DISMISSED_KEY = "ideeza:create:gate-dismissed"` from `gate-preference.ts`.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: The preference module**

Create `src/lib/create/gate-preference.ts`:

```ts
// Whether the user ticked "I understand, don't show this again" on the
// generation gate (spec §4.5). Kept out of the credits and history stores
// on purpose: it is a UI preference, not part of the ledger or the job
// record, and it is read by the dialog and by the chat that opens it.
//
// The spec is explicit that dismissal hides the dialog but never the
// price: the concept card's own "Cost: N credits" line carries that, and
// it is not conditional on this flag.

const GATE_DISMISSED_KEY = "ideeza:create:gate-dismissed";

export function readGateDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GATE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGateDismissed(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (v) window.localStorage.setItem(GATE_DISMISSED_KEY, "1");
    else window.localStorage.removeItem(GATE_DISMISSED_KEY);
  } catch {}
}
```

- [ ] **Step 2: The two paragraphs, verbatim from the spec**

In `confirm-build-dialog.tsx`, after the deliverables section and before the chips row, add:

```tsx
{/* Spec §4.5 — both paragraphs exist to pre-empt the Draft refund
    dispute: the user is told BEFORE paying that engineered output may
    differ from the picture, and that a Draft result is a legitimate
    outcome rather than a failure to refund. */}
<p className="mt-[16px] text-sm leading-relaxed text-text-secondary">
  Your concept images are a visual reference. The engineered output may
  differ from them.
</p>
<p className="mt-[8px] text-sm leading-relaxed text-text-secondary">
  Automated design rule checks run on completion. If issues are found,
  you&apos;ll still receive the full output with a{" "}
  <strong className="font-semibold text-text-primary">Draft</strong> label
  and a list of what needs review.
</p>
```

- [ ] **Step 3: The dismissal checkbox**

Import the design-system `Checkbox` and the preference module, hold the tick in local state seeded from the stored value, and write it when the user confirms:

```tsx
const [dismiss, setDismiss] = React.useState(false);
```

Render it in the footer row, left of the buttons:

```tsx
<label className="mr-auto flex cursor-pointer items-center gap-[8px] text-sm text-text-secondary">
  <Checkbox checked={dismiss} onChange={() => setDismiss((v) => !v)} size="sm" />
  I understand, don&apos;t show this again
</label>
```

In the confirm handler, persist before calling `onConfirm`:

```tsx
onClick={() => {
  if (dismiss) writeGateDismissed(true);
  if (concept) onConfirm(concept);
}}
```

- [ ] **Step 4: The chat skips the gate when it has been dismissed**

In `concept-chat.tsx`, `handleUseTurn` currently sets `confirmFor`. Read the preference and, when set, go straight to the build the gate would have started. The build call already lives in `handleConfirmBuild`, so the skip must reuse it rather than duplicating the fetch.

- [ ] **Step 5: Verify in the browser**

Drive `/chat/<id>` over CDP with a concept ready:
1. Press **Use this concept** — the dialog opens and contains both new paragraphs.
2. Tick the checkbox, press **Generate full product** — `localStorage` holds `ideeza:create:gate-dismissed === "1"`.
3. Return to the chat, press **Use this concept** on another concept — no dialog, the build starts.
4. The concept card still shows `Cost: 4 credits`, because dismissal never hides the price.

- [ ] **Step 6: `tsc`, lint, CLAUDE.md, commit**

```
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Commit subject: `feat(create): the gate says what a Draft result is, and can be dismissed`

---

## Task 2: A queued build can be cancelled

Spec §4.6 — *"Cancellation: allowed only in `Queued` state, with full credit return."* Our simulator charges when a build **starts**, not when it is booked (`build-simulator.tsx`, the charge effect), so a queued build has never been charged and there is nothing to return. The control is still needed; the copy must not promise a refund that has no charge behind it.

**Files:**
- Modify: `src/lib/create/history.tsx`
- Modify: `src/components/create/build-status.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `cancelBuild(buildId: string): void` on the history context. Removes the job when, and only when, `statusOf(job) === "queued"`.
- Consumes: `statusOf` from `history.tsx`, `stateRowFor` from `build-status.tsx`.

- [ ] **Step 1: The action**

In `history.tsx`, beside `retryBuild`:

```tsx
// Spec §4.6 — cancellation is a queued-only action. Once generation
// starts it is unavailable, because cancel-then-refund would be a
// farming loop. A queued job has not been charged (the simulator
// charges on start), so there is nothing to return and the copy says
// so rather than promising a refund.
const cancelBuild = React.useCallback((buildId: string) => {
  setBuilds((arr) => {
    const b = arr.find((x) => x.id === buildId);
    if (!b || statusOf(b) !== "queued") return arr;
    return arr.filter((x) => x.id !== buildId);
  });
}, []);
```

Add `cancelBuild: (buildId: string) => void;` to the context type and to the returned value.

- [ ] **Step 2: The control**

In `build-status.tsx`, the queued branch of `stateRowFor` already carries `footerLink: HOME_LINK`. Add a secondary action beside it that calls `cancelBuild` and routes back to the source chat. Give it the honest tooltip: *Nothing has been charged yet — credits are taken when a build starts.*

- [ ] **Step 3: Verify in the browser**

Seed two builds so the second is queued, open `/build/<second>`, press Cancel: the job is gone from `ideeza:create:builds`, the balance is unchanged, and the page has navigated away. Then open a **running** build and confirm no Cancel is offered.

- [ ] **Step 4: `tsc`, lint, CLAUDE.md, commit**

Commit subject: `feat(create): a queued build can be cancelled, and says why nothing is refunded`

---

## Task 3: A build that overruns offers a way out

Spec §4.6 — *"If the job exceeds roughly twice expected duration, the status card offers cancellation with full refund."* Here a refund **is** owed, because the job is running and has been charged.

**Files:**
- Modify: `src/lib/create/history.tsx`
- Modify: `src/components/create/build-status.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `cancelBuild` from Task 2, `elapsedMinutes(job, now)` and `BUILD_ESTIMATE_MIN` from `history.tsx`.
- Produces: `isOverrunning(job: BuildJob, now: number): boolean`, and `abandonBuild(buildId: string): void` — stops a running job and refunds its open charge.

- [ ] **Step 1: The predicate**

In `history.tsx`, beside `elapsedMinutes`:

```tsx
/** Spec §4.6 — "roughly twice expected duration". A running job past
 *  that has stopped behaving like a job that is going to finish, so the
 *  card stops waiting quietly and offers the way out. */
export function isOverrunning(job: BuildJob, now: number = Date.now()): boolean {
  return statusOf(job) === "running" && elapsedMinutes(job, now) > job.estimateMin * 2;
}
```

- [ ] **Step 2: Abandon with a refund**

`abandonBuild` marks the job `failed` with `failure: "system"`. The simulator's existing refund effect then returns the credits, because that effect already refunds any failed job with an open charge — reuse it rather than writing a second refund path.

- [ ] **Step 3: The offer on the card**

In `build-status.tsx`, when `isOverrunning(job, now)` the running row gains a banner (`tone="attention"`, the design-system `Banner`) reading *This build is taking much longer than expected* over *You can stop it and get your credits back.*, with **Stop and refund** calling `abandonBuild`. The minute clock the card already uses (`useMinuteClock`) drives the check, so no new timer.

- [ ] **Step 4: Verify in the browser**

Seed a running job with `startedAt` set to 25 minutes ago against a 10-minute estimate. The card shows the overrun banner. Press **Stop and refund**: the job reads as failed, and the balance is back up by `BUILD_COST`. Seed one at 12 minutes and confirm no banner.

- [ ] **Step 5: `tsc`, lint, CLAUDE.md, commit**

Commit subject: `feat(create): a build past twice its estimate offers a stop with a refund`

---

## Deferred, with the decision each one waits on

These are real spec requirements. They are not in this wave because each needs something that does not exist yet, and guessing would ship a lie.

| Spec | Waits on |
| --- | --- |
| §4.3 `Checked` meaning something | **Wave 2 below.** The badge and its list are built; with no board geometry every product is `Draft` for "checks could not be run" |
| §4.3.5 assembly issues | An engine for dimensional fit and power budget. The parts list carries no current draw or body size, so neither can be computed from what we store. The issue list says so rather than skipping the group |
| §4.4.10 physical fit and control mapping | Radio protocol and charging connector are checked for real. Fit and control-count need geometry and a pin map, which do not exist |
| §4.6 the phase list | Our job model is five artifacts in parallel per product, not the spec's five sequential phases. Two different models; changing ours is its own decision |
| §4.6 email / push notification | A backend. In-app notification is all this app can do today |
| §4.7 `Files` tab | Something to hand over. The review surface offers no download |
| §4.8 content-policy block | A moderation call on the prompt |

**Spec §4.0 says draft-project creation is "already solved — a draft project exists from the first prompt". It is not.** A project is created at Save Project, at Advance Edit, or at the Brief's step 1. Three of §4.8's edge cases rest on that premise (*"Completed concepts persist in the draft project"*, *"All state preserved in the draft project"*). This needs answering before §4.4 can be planned.

### Wave 2 — a build produces a real board

The prerequisite for §4.3, and the fix for a known gap: **Advance Edit** opens the demo RC circuit rather than the build's own parts. The editor already owns the pipeline (`convertSchematicToPcb`, `routeRatsnest` in `src/lib/pcb/`); what is missing is the step that turns a build's logical net graph into schematic `CanvasObject[]` for it to consume. Its own plan.

### Wave 3 — confidence tiering (§4.3)

Once wave 2 lands, `runDrc` has geometry, `Checked` becomes reachable, and the badge means something. Per-artifact tier, the project's headline state as the lowest tier (§4.4.9), and the grouped issue list in plain language (§4.3.5).
