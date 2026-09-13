# Ai-Flow parity · Plan 1 — Foundation + AI concept chat + Home

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the shared data foundation (credits ledger, 5-artifact build model with queue, concept summary, concept numbering, pending progress, shared voice hook) and bring the dashboard Home + concept chat to Figma parity (audit §1).

**Architecture:** All state stays client-side in React context providers persisted to `localStorage` (existing pattern in `src/lib/create/history.tsx`). New providers mount in the same tree as `CreateHistoryProvider`. UI is rewritten in place in the existing components — no parallel component trees.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, Tailwind preset + `src/styles/tokens.css` tokens, `@hugeicons/react`, Pollinations text/image endpoints (already used by `/api/refine`, `/api/concept/generate`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-13-ai-flow-figma-parity-design.md`; copy source: `docs/superpowers/specs/2026-09-13-ai-flow-figma-audit.md` §1 and §5 — quote design copy **verbatim** from there. Screenshots of each frame are in the session scratchpad (`f00.png`…`f10.png`, `voice*.png`) and can be re-fetched with the Figma MCP `get_screenshot` (file `gb4w7Tq7nnqM6V72CWQWjO`).
- Tokens only (`--color-*`, `--spacing-*`, `--radius-*`); both themes. Brand accent for selection/active/primary only.
- No new npm dependencies. No `flashToast`-only stubs; grey with a reason instead.
- `npx tsc --noEmit -p tsconfig.json` must pass before every commit. Browser verification over CDP (headless Chrome at `http://localhost:3000`, `npm run dev`) before a task is called done.
- Remove what Figma lacks (spec Decision 1): `ChatHeader`, "Click to refine" overlay, disabled-while-pending composer, `refineOn` toggle, mode-toggle icons, `Reassurance` line.
- Commit after every task with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never commit `AGENTS.md`, `README.md`, `docs/agent-rules/` (pre-existing unrelated changes).

---

### Task 1: Credits ledger provider

**Files:**
- Create: `src/lib/create/credits.tsx`
- Modify: the provider tree where `CreateHistoryProvider` is mounted (find with `grep -rn "CreateHistoryProvider" src/app src/components`) — wrap children in `CreditsProvider` next to it.
- Modify: `src/components/create/history-page.tsx` — add a `CreditsCard` beside `QuotaCard` with `id="credits"`.

**Interfaces (produces):**
```ts
export const BUILD_COST = 4;
export type CreditEntry = { id: string; delta: number; reason: "seed" | "build" | "refund" | "topup"; buildId?: string; ts: number };
export type CreditsState = { balance: number; ledger: CreditEntry[] };
export function useCredits(): {
  hydrated: boolean;
  balance: number;
  ledger: CreditEntry[];
  canAfford: (cost?: number) => boolean;
  charge: (buildId: string, cost?: number) => boolean;   // false when balance < cost; idempotent per buildId
  refund: (buildId: string) => boolean;                   // true once per charged buildId
  topUp: (n: number) => void;
};
```
Storage key `ideeza:create:credits`; first run seeds `{ balance: 8, ledger: [{reason:"seed", delta: 8}] }`. Follow the hydrate/persist pattern of `plan.tsx` exactly (hydrate once, persist post-hydration).

- [ ] **Step 1: Write `credits.tsx`** with the provider, hook and pure helper `applyEntry(state, entry)`; export `creditsReducerForTest = { charge, refund }` is unnecessary — keep helpers pure and exported (`chargeState(state, buildId, cost)`, `refundState(state, buildId)`) so they can be exercised from a node script.
- [ ] **Step 2: Sanity-run the pure helpers** with `npx tsx -e` (or a `node --experimental-strip-types` one-liner) importing the two helpers: charge 4 from 8 → 4; second charge for the same build → unchanged; refund → 8; second refund → unchanged; charge with balance 1 → returns unchanged state and `ok:false`.
- [ ] **Step 3: Mount `CreditsProvider`** beside `CreateHistoryProvider`.
- [ ] **Step 4: `CreditsCard`** in `history-page.tsx`: eyebrow "CREDITS", big balance, "Each full-product build uses 4 credits. Exploring and refining concepts stays free.", the last 3 ledger lines (`+8 Starting balance`, `−4 Build · <title>`), and a **Top up** button that calls `topUp(10)` with the honest line beneath: "No payments are wired yet — this adds to your local balance." Card element has `id="credits"` so `/history#credits` lands on it.
- [ ] **Step 5: tsc + browser check**: open `/history`, read the card, click Top up → balance 8 → 18 and `localStorage["ideeza:create:credits"]` reflects it.
- [ ] **Step 6: Commit** `feat(create): local credits ledger + Credits card`.

---

### Task 2: Build model — five artifacts, queue, system failure, summary

**Files:**
- Modify: `src/lib/create/history.tsx`
- Create: `src/app/api/concept/summarize/route.ts`
- Create: `src/lib/create/build-artifacts.ts`
- Modify: `src/app/api/build/start/route.ts`, `src/app/api/build/[id]/retry/route.ts` (accept `kind?: BuildItemKind | "all"`)
- Modify: the build simulator (the tick loop that advances `items[].progress` — `grep -rn "FAIL_AT\|updateBuildItem" src/components/create src/lib/create`).

**Interfaces (produces):**
```ts
export type BuildItemKind = "3d" | "pcb" | "code" | "wiring" | "parts";
export type BuildItemStatus = "pending" | "building" | "ready" | "failed" | "skipped";
export type BuildStatus = "queued" | "running" | "ready" | "partial" | "failed";
export type ConceptPart = { name: string; role: string; category: "Microcontroller" | "Sensor" | "Actuator" | "Power Management" | "Display & I/O" | "Connectivity" | "Passive" | "Connector & mech" };
export type BuildJob = { /* existing */
  title: string;            // "Gesture-controlled LED strip"
  summary: string;          // "ESP32 · APDS-9960 gesture sensor · WS2812B RGB strip · printed ABS enclosure"
  parts: ConceptPart[];
  conceptNumber: string;    // "2" or "1.1"
  status: BuildStatus;
  startedAt?: number; endedAt?: number;
  estimateMin: number;      // 10
  creditsCharged: boolean; creditsRefunded: boolean;
  failure?: "system";
  projectId?: string;       // set by Plan 2 when Save Project / Advance Edit creates the ManualProject
};
export const ITEM_LABELS: Record<BuildItemKind,string>   // 3D model · PCB · Firmware code · Wiring · Parts
export const ITEM_SUBTITLES: Record<BuildItemKind,string> // Printable enclosure with mount points · Schematic, layout and BOM · Starter firmware for the parts used · Harness and pin-to-pin connections · Bill of materials with suppliers
export function statusOf(job: BuildJob): BuildStatus;   // derives from items when job.status is running
export function elapsedMinutes(job: BuildJob, now?: number): number;
export function minutesLeft(job: BuildJob, now?: number): number; // estimateMin scaled by remaining progress, min 1
// ctx additions
startBuild(input: { chatId; turnId; imageUrl; prompt; conceptNumber: string; title: string; summary: string; parts: ConceptPart[] }): BuildJob; // queued if another job is running
retryBuild(buildId: string): void;          // whole-build retry after failure === "system"
failBuildSystem(buildId: string): void;     // every item → failed, status failed, failure "system", refund
```
```ts
// POST /api/concept/summarize  { prompt } → { title: string; summary: string; parts: ConceptPart[] }
// build-artifacts.ts (pure, deterministic from job.parts)
export function bomFor(job): { rows: {category; name; ref; qty}[]; unique: number; units: number; active: number; passives: number; connectors: number };
export function netsFor(job): { nodes: {id; label}[]; wires: {from; to; label; cls: "power"|"ground"|"signal"}[]; nets: number; connections: number; classes: number };
export function firmwareFor(job): { filename: string; lines: string[] };   // "gesture_led.ino"-style, from title slug
export function pcbMetaFor(job): { layers: 2; widthMm: number; heightMm: number; partCount: number };
```

- [ ] **Step 1: Types + labels** in `history.tsx`; migrate stored jobs on hydrate (`normalizeJob`): missing `title` → `deriveTitle(conceptPrompt)`, `summary` → "", `parts` → `[]`, `status` → derived from items, `estimateMin` → 10, `conceptNumber` → "1", credits flags false; items missing `wiring`/`parts` are appended as `skipped` so old builds still render five rows honestly.
- [ ] **Step 2: Queue.** `startBuild` sets `status: "queued"` and items `pending` when any job has `status === "running"`; otherwise `running` + `startedAt` + items `building`. The simulator, on each tick after a job leaves `running`, promotes the oldest `queued` job to running. Credits: the component that owns the simulator calls `useCredits().charge(job.id)` when a job becomes running and sets `creditsCharged` (history exposes `markCharged(buildId)`).
- [ ] **Step 3: System failure.** `failBuildSystem` + `retryBuild`. Dev trigger: in the simulator, `window.__ideezaFailBuild = (id) => failBuildSystem(id)` exposed only when `process.env.NODE_ENV !== "production"` (replace the current `FAIL_AT` PCB@60% partial-failure injection with a similar dev hook `__ideezaFailItem(id, kind)` so both states are reachable for verification without random failures in normal runs).
- [ ] **Step 4: `/api/concept/summarize`.** Copy the Pollinations text client from `api/refine/route.ts`; system prompt: return strict JSON `{title, summary, parts:[{name, role, category}]}` with 4–6 parts, title ≤ 40 chars, summary = parts joined by " · ". Fallback (network fail / bad JSON): `deriveTitle(prompt)`, parts `[ESP32 (Microcontroller), USB-C connector (Connector & mech), 3V3 LDO (Power Management), Sensor named from the prompt's first noun (Sensor)]`.
- [ ] **Step 5: `build-artifacts.ts`** — deterministic: refs by category (U for MCU/Power ICs, J for connectors, D for LEDs, S for sensors, DSP for displays), qty 1 except passives (2–4); nets: VBUS 5V (USB-C→LDO), 5V/3V3 (LDO→MCU, LDO→sensor), GND to all, SDA/SCL (MCU→sensor), DIN (MCU→actuator); firmware lines: `#include` per part family, `#define <PART>_PIN <n>` per non-power part, `// pins match the PCB layout in the previous tab`, `setup()`/`loop()` skeleton; pcbMeta: width = 32 + 4·parts, height = 24 + 2·parts (mm), partCount = bom.unique.
- [ ] **Step 6: API stubs** accept the new kinds and `kind: "all"` for retry.
- [ ] **Step 7: tsc**; node-script check of `bomFor/netsFor/firmwareFor` on a 5-part fixture (unique = 5, connections ≥ parts, firmware contains `#define`).
- [ ] **Step 8: Commit** `feat(create): five-artifact build model with queue, system failure, concept summary`.

---

### Task 3: Concept numbering + pending progress + shared voice hook

**Files:**
- Modify: `src/components/create/chat-thread.tsx` — export `conceptLabels(turns: ChatTurn[]): Map<string,string>`.
- Modify: `src/lib/create/history.tsx` — assistant turn gains `progress?: number`; ctx `setTurnProgress(chatId, turnId, progress)`.
- Modify: `src/components/create/concept-chat.tsx` — while a turn is pending, tick progress every 700 ms: `p = min(90, p + max(1, (90-p)*0.12))`; resolve sets 100.
- Create: `src/lib/voice/use-voice-input.ts` (extract from `workspace-prompt.tsx:341-390` and `image-editor-modal.tsx:83-131`; delete both copies).

**Interfaces (produces):**
```ts
// conceptLabels: fresh assistant turns → "1","2",…; refine → `${label(parent)}.${k}` where k counts refines of that parent in order.
export type VoiceStatus = "idle" | "listening" | "unsupported" | "denied" | "failed";
export function useVoiceInput(opts: { onFinal: (text: string) => void }): {
  status: VoiceStatus;
  interim: string;              // live partial transcript
  levels: number[];             // last 78 samples 0..1, newest last (empty when idle)
  start: () => void;            // continuous recognition + getUserMedia analyser
  stop: () => void;             // ends session, fires onFinal(full transcript) once
  cancel: () => void;           // ends session, discards
  supported: boolean;
};
```
- [ ] **Step 1: `conceptLabels`** + use it in `image-turn.tsx` `ConceptHeader` (chip text `CONCEPT ${label}`) and in `image-editor-modal.tsx` title (`Refining Concept ${label}`, subtitle `The result lands in your chat as Concept ${label}.${nextChild} — the original stays untouched.`).
- [ ] **Step 2: progress** ticking + `progress` rendering hook-up point (`PendingImageTurn` receives `progress`).
- [ ] **Step 3: `useVoiceInput`** — `continuous = true`, `interimResults = true`; levels from `AnalyserNode.getByteTimeDomainData` RMS at ~30 fps via `requestAnimationFrame`, capped to 78 entries; `stop()` stops both recognition and tracks and closes the `AudioContext`; permission errors → `denied`. Replace the two inline hooks with it (behaviour identical for now: mic button toggles, final text appended).
- [ ] **Step 4: tsc** + browser check: chat pending card shows an increasing percentage (read the DOM twice 1.5 s apart); a refine child of Concept 1 reads "CONCEPT 1.1".
- [ ] **Step 5: Commit** `feat(create): concept lineage labels, live render progress, shared voice hook`.

---

### Task 4: Home hero + sidebar copy (frames 00/01, voice-1)

**Files:**
- Modify: `src/components/dashboard/workspace-prompt.tsx`
- Modify: `src/components/dashboard/sidebar.tsx`

Design facts (audit §1 frames 46527:81883 / 81941, §5 idle): subtitle **"Turn your electronics idea into a buildable design — with AI or on your own. No wallet or KYC to start."**; placeholder **"Describe your electronics project..."**; chips `Voice-controlled lamp · NFC crypto tap card · Solar-powered charger` with a working shuffle (rotate through a 9-item pool); segmented mode toggle without icons; toolbar `+` (add, opens the same attachment picker) · mic │ **Enhance** text button · **send**: empty → square ai-magic icon button using `--color-button-disabled-bg/-text`, disabled; text present → violet labelled **"Generate ✨"** (`--color-button-primary-bg`); examples heading **"Get inspired"** with **"Browse all ›"** → `/innovations`, cards with the Minted badge overlaid top-left on the image and a stats row `Product Name · 2 Products · 3.9k · 142 · 142` (use each card's real fields: name · N products · views · likes · comments from the feed data the cards already read; omit a stat when the source has none); a soft violet radial gradient behind the hero (`--gradient-ai` at low opacity, both themes). Remove `Reassurance` line. Sidebar: "Upgrade to Builder" / "Unlock more features"; Support block (Help Center • Tutorial • Tour Guide / Report a Problem) — reuse the existing Tutorial/Help/Report handlers; profile row gains wallet + bell icon buttons: wallet → `/history#credits`, bell → opens the existing attention banner list (or, when none, tooltip "No notifications yet").

- [ ] **Step 1: Copy, placeholder, chips + shuffle, toggle without icons.**
- [ ] **Step 2: Toolbar + send button states** (`SendButton` takes `hasText`).
- [ ] **Step 3: "Get inspired" cards** (badge overlay, stats row, Browse all link).
- [ ] **Step 4: BG effect + sidebar copy/support block/wallet+bell.**
- [ ] **Step 5: tsc + CDP**: home renders design copy; send disabled while empty (`aria-disabled`), typing 3 chars turns it into a button whose text is "Generate"; shuffle changes the three chips; both themes screenshot.
- [ ] **Step 6: Commit** `feat(home): hero, composer send states, Get inspired cards, sidebar copy (Figma Ai-Flow 00/01)`.

---

### Task 5: Chat shell + composer (frames 02, voice-4)

**Files:**
- Modify: `src/components/create/concept-chat.tsx` (remove `ChatHeader`; column `max-w-[640px]`; composer never disabled while pending; placeholder "Describe your electronics project..."; hint "Start by describing the concept. Refine and regenerate as many times as you like."; focus ring `--color-border-brand`).
- Modify: `src/components/create/prompt-bar.tsx` (toolbar `+` attach with a real chip like Home's, mic wired to `useVoiceInput`, **Enhance** text button calling `/api/refine` on the draft, ai-magic send disabled while empty; delete `refineOn` + its storage key).
- Modify: `src/components/create/chat-thread.tsx` (`UserBubble`: white surface `--color-bg-surface`, 1 px `--color-border-default`, `rounded-2xl rounded-br-[4px]`, 456 px max, `--color-text-secondary`).

- [ ] **Step 1: Remove header, set column width, bubble style.**
- [ ] **Step 2: Composer rework** (attach chip, mic, Enhance, send states, never disabled while a turn is pending — submitting while pending queues a new user turn exactly as it does today when idle).
- [ ] **Step 3: tsc + CDP**: no `Concept chat` header text; column width 640; while a pending turn exists the textarea is not disabled; Enhance rewrites the draft (mock by asserting the request fires and the textarea changes).
- [ ] **Step 4: Commit** `feat(chat): header-less 640px shell, real composer controls (Figma Ai-Flow 02)`.

---

### Task 6: Concept cards — pending / failed / ready / regenerate (frames 02–08)

**Files:**
- Modify: `src/components/create/image-turn.tsx`

Design facts: **pending** = bare 640×530 tile, `--color-glass-fill-brand` border, dotted gradient texture (CSS radial-gradient dots at 40 %), centred pill `Rendering concept ${label} · ${progress}%` (`--color-text-secondary`); no header chip. **failed** = red triangle in a circle (`--color-bg-error-subtle` / `--color-icon-error`), title **"Couldn't draft that concept"**, body **"The request didn't reach the model. Nothing was charged — your credit balance is unchanged."**, outlined **"↻ Try again"**. **ready** = header row (chip `CONCEPT ${label}` · relative time), image, line `Prompt: <one line, truncated>` with a copy-to-clipboard icon button (writes `prompt`, tooltip "Copy prompt", success state "Copied" for 1.2 s), divider, action row: left **Refine** · **Regenerate** · `Cost: 4 credits ⓘ` (ⓘ tooltip "Generating the full product uses 4 credits. Refining stays free."), right primary **"Use this concept"**. Regenerate shows `aria-pressed` + filled style while a fresh child turn spawned by it is pending (track `regeneratingFrom` in `concept-chat.tsx` state). Remove the "Click to refine" overlay and "Change:" label variant (refines show `Prompt:` too).

- [ ] **Step 1: Pending tile with progress.**
- [ ] **Step 2: Failed card copy + icon.**
- [ ] **Step 3: Ready card anatomy** (copy button, divider, split actions, cost label).
- [ ] **Step 4: Regenerate pressed state.**
- [ ] **Step 5: tsc + CDP** with a seeded chat containing one pending, one failed and two ready turns: assert texts, copy button writes clipboard (`navigator.clipboard` mocked), pressed state toggles.
- [ ] **Step 6: Commit** `feat(chat): concept card states to Figma (Ai-Flow 02–08)`.

---

### Task 7: Insufficient credits + sent-to-build row (frames 04, 10/19)

**Files:**
- Modify: `src/components/create/image-turn.tsx`, `src/components/create/concept-chat.tsx`

Design facts: when `!canAfford(BUILD_COST)` every ready card's cost label reads **`Cost: 4 credits · you have ${balance} ⓘ`** in `--color-text-error` and **"Use this concept"** is disabled (`aria-disabled`, tooltip "Not enough credits"); a yellow banner (`--color-bg-warning-subtle`, `--color-border-warning`) renders under the newest ready card: coin icon · **"Not enough credits to build this"** · **"Generating the full product costs 4 credits. Exploring and refining concepts stays free."** · link **"Top up credits →"** → `/history#credits`. Sent-to-build (`usedForBuild`): action row replaced by green chip **"SENT TO BUILD"** (`--color-bg-success-subtle`/`--color-text-success`), status text from the job: queued → `Queued · starts when the current build finishes`; running → `Building now · about ${minutesLeft} minutes left`; ready → `Build ready · review your deliverables`; partial → `Needs a retry · open the build`; failed → `Build failed · open the build`; right outlined **"View build ›"** → `/build/${id}`. Prompt line untruncated on this card.

- [ ] **Step 1: Credit-gated cost label + disabled Use + banner.**
- [ ] **Step 2: Sent-to-build row** reading the job via `useCreateHistory().getBuild`.
- [ ] **Step 3: tsc + CDP**: set `ideeza:create:credits` balance to 1 → red label "you have 1", disabled Use, banner present; balance 8 → normal. Seed a running build → "Building now · about N minutes left" and a link to `/build/<id>`.
- [ ] **Step 4: Commit** `feat(chat): insufficient-credits state and live sent-to-build row (Ai-Flow 04/10)`.

---

### Task 8: Refine overlay + Generate-full-product modal (frames 05, 09)

**Files:**
- Modify: `src/components/create/image-editor-modal.tsx`
- Modify: `src/components/create/confirm-build-dialog.tsx`

Refine overlay: header × · **"Refining Concept ${label}"** · subtitle from Task 3; chip `CONCEPT ${label}` top-right; composer placeholder **"Describe a change to this image…"**, mic (`useVoiceInput`), violet square ai-magic send; hint **"Refining evolves the same concept. To start over from your prompt, use Regenerate instead."**; overlay `backdrop-blur` over the whole page including the sidebar (portal to body, `fixed inset-0`).

Generate modal (560 px): ⓘ glyph (`--color-bg-info-subtle`/`--color-icon-info` — add the icon token if missing, sourced from the info palette), title **"Generate the full product"**, body **"We'll engineer five deliverables from this concept. The build runs in the background — you can leave and we'll notify you when each piece is ready."**; concept summary row: thumb · chip `CONCEPT ${label}` · title · meta (fetched from `/api/concept/summarize` on open; skeleton lines while loading; fallback used on error); eyebrow **"WHAT WE'LL GENERATE"** with five tiles — 3D enclosure "Printable enclosure with mount points" · PCB design "Schematic, layout and BOM" · Firmware code "Starter firmware for the parts used" · Wiring "Peripheral harness with pin-to-pin labels and wire colours" · Parts "Every component with quantity, footprint and where to buy it"; chips **"About 8–12 minutes" · "Uses 4 credits" · "No wallet or KYC yet"** (violet); footer **"Keep refining"** · **"⚡ Generate full product"** (disabled with tooltip "Not enough credits" when `!canAfford`). Confirm → `startBuild({... conceptNumber: label, title, summary, parts})`; when the job comes back `queued` toast "Queued — one build ahead of you".

- [ ] **Step 1: Refine overlay copy/composer/blur.**
- [ ] **Step 2: Modal rebuild** + summarize fetch + startBuild wiring.
- [ ] **Step 3: tsc + CDP**: open overlay from a card → title reads "Refining Concept 1"; open modal → five tiles, chips, width 560; confirm → a build with 5 items and `title` set appears in `ideeza:create:builds`.
- [ ] **Step 4: Update CLAUDE.md §5 "AI create & build flow"** (credits ledger, five deliverables + queue, concept lineage labels, live render progress, card states, header-less chat, home hero) and STRUCTURE.md (new files: `lib/create/credits.tsx`, `lib/create/build-artifacts.ts`, `lib/voice/use-voice-input.ts`, `api/concept/summarize`).
- [ ] **Step 5: Commit** `feat(create): refine overlay + Generate-full-product modal to Figma (Ai-Flow 05/09); docs`.
