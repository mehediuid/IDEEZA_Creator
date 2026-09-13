# "Ai - Flow" Figma parity — design

**Goal:** make the AI create → build → deliverables → Brief → voice surfaces
match the Figma section `46527:81259` "Ai - Flow" (Creator Panel V3.0).
The gap inventory is in
[2026-09-13-ai-flow-figma-audit.md](2026-09-13-ai-flow-figma-audit.md); this
document records the decisions and the architecture, split into five
sub-projects that ship in order, each with its own plan and commit(s).

## Decisions (user-approved 2026-09-13)

1. **Figma is final.** Where the code carries something the design doesn't
   (Bundle/Offers listing types, Solana, Give's Recipient community +
   Distribution rule, Give/Save cost box + gas checkbox, Save's "Mint on
   blockchain?" toggle, the chat's `ChatHeader`, the Review page's outcome
   picker, "Click to refine" overlay, disabled composer while generating) it is
   **removed**, not kept alongside.
2. **Brief step order follows the design, per intent.** Sell: Idea → Pick your
   preview → Ready to sell (video first, as today). Give / Save: Idea → form;
   the form's own CTA commits — unless *Share to Innovations* is ticked, in
   which case the CTA becomes *Continue to video ›*, the preview step follows,
   and its final CTA commits ("Give to community and post to Innovations" /
   "Save as Private").
3. **No backend yet → honest local models.** Credits are a real local ledger
   (charged, refunded, topped up); wallet collections are a per-chain local
   list; the AR QR encodes a real deep link and the panel waits honestly (no
   phone app exists, so it never completes on its own — *Switch to AI instead*
   is the way out); gas is an *estimate* from a fixed per-chain rate table and
   labelled so; the voice waveform reads real microphone levels.
4. **All five flows, in this order:** (1) AI concept chat + Home · (2) build
   states + Review shell + Wiring/Parts tabs + `/parts` page · (3) Brief: Sell
   · (4) Brief: Give + Save · (5) Voice.

Design inconsistencies (audit §"Design inconsistencies") are resolved as noted
there: PCB/Firmware "What ships" keep the code's own lists; Save gets its own
sub-line; frame 84364 is treated as the Save flow; the Auction cost row reads
"Listing (Auction)".

## Shared foundation (lands with sub-project 1 and 2)

### Credits ledger — `src/lib/create/credits.tsx`
`CreditsProvider` + `useCredits()`. State `{ balance, ledger: {id, delta, reason, buildId?, ts}[] }`
persisted at `ideeza:create:credits`; first run seeds **8** credits.
`BUILD_COST = 4`. `charge(buildId)` (refuses below cost), `refund(buildId)`
(idempotent per build), `topUp(n)`. Concept generation and refining never
charge. The `/history` page gains a **Credits** card beside the QuotaCard
(balance, last movements, **Top up** → adds 10 with the honest line "No
payments are wired yet — this adds to your local balance"). "Top up credits →"
links in the chat point at `/history#credits`.

### Build model — `src/lib/create/history.tsx`
- `BuildItemKind = "3d" | "pcb" | "code" | "wiring" | "parts"`; `ITEM_LABELS`
  gains Wiring · Parts; new `ITEM_SUBTITLES` (audit §2 cross-cutting).
- `BuildJob` gains `title`, `summary` (spec line), `parts: ConceptPart[]`
  (name · role · category), `conceptNumber`, `status: "queued" | "running" |
  "ready" | "partial" | "failed"`, `startedAt?`, `endedAt?`, `estimateMin: 10`,
  `creditsCharged`, `creditsRefunded`, `failure?: "system"`.
- `BuildItemStatus` gains `"skipped"` (rendered *Didn't run*).
- **Queue:** the Free plan runs one build at a time. `startBuild` creates the
  job `queued` when another job is `running`; the simulator promotes the next
  queued job when a run ends, charging credits at start (not at queue time,
  matching "Credits are only charged once your build starts").
- `retryBuild(id)` — whole-build retry after a system failure (all items reset,
  charged again only if the refund happened). `retryBuildItem` unchanged.
- System failure = every item failed in one tick (simulator exposes it via a
  dev-only trigger, as `FAIL_AT` does today); on entry the ledger refunds and
  `failure = "system"`.
- `computeRollup` reads `status`; badge/banner/meta/footer copy per state is a
  table in `build-status.tsx`, not scattered conditionals.

### Concept summary — `POST /api/concept/summarize`
Pollinations text (same client as `/api/refine`) → `{ title, parts:
[{name, role, category}] }` with a deterministic template fallback. Called
when a build starts; result stored on the job. Used by the modal, build
header, toast, chat row, and by `build-artifacts.ts`.

### Derived artifacts — `src/lib/create/build-artifacts.ts`
Pure functions over `job.parts`: `bomFor()` (category · name · ref · qty,
summary counts), `netsFor()` (power/ground/signal nets between parts),
`firmwareFor()` (an `.ino` skeleton whose `#define`s name the parts' pins),
`pcbMetaFor()` ("2-layer · W x H mm · N parts"). One source, so the PCB
diagram, wiring map, firmware card and parts table agree.

### Concept numbering — `chat-thread.tsx` `conceptLabels(turns)`
Fresh assistant turns count 1…N in order; a refine is `parent.k`
("Concept 1.1", "1.2"). Used by cards, the refine overlay title and the build
chip ("CONCEPT 2 · IN BUILD").

### Pending-turn progress
Assistant turns gain `progress?: number`; the chat ticks it while the image
warms (asymptotic to 90, jumps to 100 on resolve) so "Rendering concept 2 ·
10%" is live.

### Shared voice hook — `src/lib/voice/use-voice-input.ts`
Extracted from `workspace-prompt.tsx` / `image-editor-modal.tsx`. Continuous
recognition with interim results, `getUserMedia` + `AnalyserNode` level
samples (for the waveform), `start / cancel / stop`, `error` surfaced
(`unsupported | denied | failed`). Sub-project 1 wires the composers to it;
sub-project 5 builds the listening UI on top.

### Custom select — `src/components/ideeza/select-menu.tsx`
The design's dropdowns are custom panels (check-mark on the selected row,
optional section headers, optional trailing ⓘ with tooltip). One component,
portalled to `<body>` and clamped to the viewport (project rule), keyboard
operable. Used by Brief Step 1 (Choose Project), Step 3 (Blockchain ·
Collection · Listing type · Token · License).

## Sub-project 1 — AI concept chat + Home

Files: `dashboard/workspace-prompt.tsx`, `dashboard/sidebar.tsx`,
`create/prompt-bar.tsx`, `concept-chat.tsx`, `chat-thread.tsx`,
`image-turn.tsx`, `image-editor-modal.tsx`, `confirm-build-dialog.tsx`.

- **Home:** subtitle, placeholder, chips (+ working shuffle), plain segmented
  toggle, `+` add + mic │ **Enhance** text button + square ai-magic send that
  is disabled while empty and becomes the labelled violet **Generate ✨**
  button once there is text; "Get inspired" cards with image-overlaid Minted
  badge + stats row; violet radial BG effect. Sidebar: "Upgrade to Builder /
  Unlock more features", Support block, wallet + bell on the profile row.
- **Chat shell:** no header; 640 px column; white bordered 456 px user bubble;
  composer stays active while generating; composer = `+` · mic · Enhance ·
  ai-magic send; the dead `refineOn` toggle and the self-clearing attach input
  go (attach becomes a real image attachment chip, as Home already has).
- **Cards:** pending = bare tile + "Rendering concept N · X%"; failed = icon +
  design copy; ready = header chip, prompt line with copy button, divider,
  Refine · Regenerate · "Cost: 4 credits ⓘ" left / "Use this concept" right;
  Regenerate shows pressed while its child renders; insufficient credits =
  red cost line, disabled Use, yellow banner with "Top up credits →";
  sent-to-build = green chip + live "Building now · about N minutes left" (from
  the job's estimate and progress) + "View build ›" → `/build/[id]`.
- **Refine overlay:** "Refining Concept N" / "…lands in your chat as Concept
  N.k…" header, design composer + hint, page-wide blur.
- **Generate modal:** 560 px, ⓘ glyph, design copy, concept chip + title +
  parts meta (from `/api/concept/summarize`, fetched when the modal opens),
  five tiles, three chips, footer. Confirm → `startBuild` (queued or running).

## Sub-project 2 — Build states, Review shell, Wiring/Parts, `/parts`

Files: `create/build-shell.tsx`, `build-status.tsx`, `attention-banner.tsx`,
`review-outputs.tsx`, new `create/deliverable-previews.tsx`,
`app/(dashboard)/parts/page.tsx`, `lib/manual/projects.tsx` (hand-off).

- **Build page:** "← Back" link over one centred ~580 px card; concept header
  (thumb · "CONCEPT N · IN BUILD" · title · spec line · badge); five rows with
  subtitles and the state vocabulary Waiting · NN% · Ready · Couldn't generate
  · Didn't run (no bar on failed/skipped; inline outlined Retry under the
  title); a banner slot (info / warning / error) and a clock meta line, both
  driven by the per-state table; footers per state; system failure shows
  "Try this build again" + "Back to chat".
- **Toast:** top-centre, product title, "Open build".
- **Review shell:** pill tabs ×5, wide preview + "WHAT SHIPS" chip card,
  footer "All five pieces are ready…" + **Save Project** + **Advance Edit**.
  Both create a `ManualProject` from the job (`projectFromBuild`: name = title,
  description = prompt, productName = title, `buildId` back-reference, status
  draft) exactly once per build (`job.projectId`), then Save → `/projects`,
  Advance Edit → `/project/<slug>/pcb`. The outcome picker, `OutcomeDialog`,
  "What is this?" and "Download .glb" are removed (the Brief module owns
  outcomes).
- **Previews** (`deliverable-previews.tsx`, all from `build-artifacts.ts`):
  3D = existing `ModelViewer`; PCB = SVG block diagram + meta line; Firmware =
  code card with filename + highlighted skeleton; Wiring = SVG map with
  labelled wires + legend + meta; Parts = table + "PARTS SUMMARY" + chips.
- **`/parts`:** "Parts & agile module" page listing parts across the user's
  ready builds (grouped per build, linking to its Parts tab) with a teaching
  empty state; it is what the sidebar link already points at.

## Sub-project 3 — Brief: Sell on marketplace

Files: `brief/brief-app.tsx`, `step-1-idea.tsx`, `step-2-video.tsx`,
`step-3-mint.tsx`, new `brief/prompt-help-modal.tsx`, new
`brief/ar-record-panel.tsx`, new `lib/brief/{wallet.ts, gas.ts, qr.ts}`,
`video-jobs/global-render-indicator.tsx`, `api/refine/route.ts` (video mode).

- **State migration:** `Network = "baseSepolia" | "mumbai"` (stored
  ethereum/solana → baseSepolia, polygon → mumbai); `ListingType = "buyNow" |
  "auction"` (bundle/offers → buyNow); tokens per chain (Base Sepolia: ETH ·
  WETH · USDC · USDT; Mumbai: MATIC · WETH · USDC · USDT). New fields:
  `projectChoice: "new" | id`, `newProjectName`, `newProjectDescription`,
  `autoGenerateVideo`, `instantMint`, `understandGas`, `minBid`,
  `auctionBuyNow`, `expiresAt`, `story`, `license` (sub-project 4).
- **Step 1:** card frame + Back link; **Choose Project** (`SelectMenu`: "+
  Create new project" default, "EXISTING PROJECTS" header, `Name · Draft`);
  new → "NEW PROJECT DETAILS" panel, existing → hint + "Adding to <name>"
  callout (product count = projects' builds/products sharing the id; 1 when
  unknown); intent cards with requirement pills; counter below the textarea.
  Continue creates the project when "new" and makes it active.
- **Step 2:** header-band cards (Available · Recommended · Locked); AR
  available for every intent; "Need to prompt help?" → **Prompt Help modal**
  (`/api/refine` with `mode: "video"` → a scene prompt; Use this prompt writes
  the field); **Auto Generate Video** toggle (on → the video prompt is written
  from product name + one-liner, editable, mirroring the audio toggle);
  placeholders, quality tabs with "· 10 sec", outline "Regenerate storyboard";
  **AR panel** (QR from `lib/brief/qr.ts`, an in-house byte-mode encoder —
  no dependency — encoding `<origin>/brief/ar/<projectId>`; "Waiting for
  phone"; HOW IT WORKS; "Switch to AI instead"; Continue disabled while
  waiting). Storyboard callout copy per design.
- **Step 3 (Sell):** thumbnail product card (opens the Auto-Generated Preview
  modal); Blockchain select; collections from `lib/brief/wallet.ts` (local
  per-chain list seeded with the design's four names, persisted at
  `ideeza:brief:wallet`); Listing type Buy Now / Auction with the auction
  fields; Token · Price columns; royalties hint + placeholder; four
  checkboxes; cost box with `lib/brief/gas.ts` estimate (native fee + "≈ $")
  and total "4 IDZ + 0.00104 ETH"; "Nothing is charged…" callout; story panel
  under Share to Innovations; CTA "Pay 4 IDZ and go live".
- **Render toast:** dark, top-centre, "Video rendering · ~12m remaining.
  Project goes live when done." + CANCEL + ×; ready → "Video ready · <name>.
  Tap to review." + REVIEW. Multi-job logic kept.

## Sub-project 4 — Brief: Give to community + Save privately

Files: `brief-app.tsx` (sequencing), `step-3-mint.tsx` (`GiveFields`,
`SaveFields`), `step-2-video.tsx` (final CTAs), `review-modal.tsx`,
`step-4-success.tsx`.

- **Sequencing:** `stepsFor(intent, shareToInnovations)` returns the ordered
  step list; the rail and Back/Continue read it. Give/Save: idea → form →
  (preview) → success. `commit()` is one function called from whichever CTA is
  last.
- **Give form:** design heading/sub, thumbnail card, Blockchain · Collection ·
  **License** (`SelectMenu` with ⓘ rows, seven licences), ownership check +
  Share to Innovations, CTA "Give to the community" / "Continue to video ›".
- **Save form:** heading "Save as Private", own sub-line, thumbnail card,
  Blockchain · Collection, checks, CTA "Save as Private" / "Continue to video
  ›". Mint toggle, cost box, gas check removed.
- **Story panel** shared with Sell: textarea, hint, 0/500, brand note "Next
  you will make a short clip — Innovations posts need one." (Give/Save only).
- **Preview modal:** "Auto-Generated Preview" + Ready badge + "Made from your
  3D model" + Regenerate when opened from a product card; the approve variant
  stays for the render indicator path.
- **Success:** copy per intent unchanged in structure; CTAs verified against
  the new order.

## Sub-project 5 — Voice

Files: `lib/voice/use-voice-input.ts`, new `components/voice/voice-listening.tsx`,
`workspace-prompt.tsx`, `prompt-bar.tsx`, `image-editor-modal.tsx`.

- **Listening view** replaces the prompt-card body: brand dot + "Listening…",
  78-bar waveform (3 px bars, 3 px gap, 48 px tall, heights from the level
  history, trailing 24 bars at 20 %), "Tap Stop when you're done", **Cancel**
  (discard, restore previous text) and **Stop & review** (commit transcript to
  the textarea, focus it). Motion 150–250 ms, reduced-motion respected.
- Errors: unsupported → mic disabled with tooltip (kept); denied → inline
  line "Microphone access was blocked — allow it in the browser to use voice."
- Same component in all three composers.

## Cross-cutting rules
- Tokens only (`--color-*`, `--spacing-*` …), both themes; the Brief's card
  frame, banners (info/warning/error subtle tokens) and toasts are checked in
  light and dark.
- Every dropdown portals + clamps. Every control does real work or is greyed
  with a reason.
- `npx tsc --noEmit` passes and each sub-project is browser-verified over CDP
  (seed localStorage → drive the flow → read DOM/screenshot) before its commit.
- CLAUDE.md §5 "AI create & build flow", "Projects, history & community" and
  "Other editor modules ▸ Add Brief" entries are revised in the same commits;
  STRUCTURE.md gains the new files.
