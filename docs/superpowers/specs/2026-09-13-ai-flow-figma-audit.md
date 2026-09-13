# "Ai - Flow" Figma section → code audit (2026-09-13)

Source: Figma `gb4w7Tq7nnqM6V72CWQWjO` (Creator Panel V3.0), section
`46527:81259` "Ai - Flow" — ~80 desktop frames (1440×900) covering
AI concept → build → deliverables → Brief (Sell / Give / Save) → voice.
Audited read-only against the code at commit `33a38d2`. Screenshots of every
frame were saved to the session scratchpad; design copy below is quoted
verbatim where `get_design_context` returned, transcribed from 1600 px
screenshots elsewhere (Figma's MCP call limit cut context after a few frames
per pass — implementers should prefer screenshots + this file).

Layout facts common to every frame: sidebar 280 px · main 1160 px · chat
column 640 px centred · user bubble 456 px · Generate-full-product modal
560 px · every Brief screen sits in the dashboard shell as a white card with
a "← Back" text link above it.

---

## 1. AI concept flow (11 frames)

### 46527:81883 Home (default) — Partial · `dashboard/workspace-prompt.tsx`
- Subtitle: **"Turn your electronics idea into a buildable design — with AI or on your own. No wallet or KYC to start."** (code: different sentence + separate `Reassurance` line).
- Placeholder **"Describe your electronics project..."** (code: `AI_PLACEHOLDER` sample idea).
- Composer toolbar: `+` (add) · mic │ **"Enhance"** text button · square sparkle (ai-magic) icon send, **disabled** while empty. Code: paperclip · mic │ "Enhance prompt" · round violet arrow always on.
- Chips: "Voice-controlled lamp · NFC crypto tap card · Solar-powered charger" + shuffle. Code shuffle button has **no onClick**.
- Mode toggle plain segmented (no icons).
- Examples: heading **"Get inspired"**, "Browse all ›", cards with **"Minted" badge overlaid on the image** and stats row ("Product Name · 2 Products · 3.9k · 142 · 142"). Code: "Browse Project", badge in body, "category · N parts".
- Soft violet radial BG effect behind the hero.

### 46527:81941 Home — prompt writing — Partial
- With text present the send becomes a labelled violet **"Generate ✨"** button; "Enhance" stays a text button beside it.

### 46527:81281 Rendering concept / GENERATING — Partial · `create/image-turn.tsx`, `concept-chat.tsx`
- Placeholder: bare 640×530 dotted-gradient tile, brand-tinted border, centred pill **"Rendering concept · 10%"** (live %). No card header/chip. Code: bordered card + "Concept N" chip + shimmer + "Drafting concept…", no progress.
- User bubble: right-aligned **white bordered card (456 px)**; code tinted `bg-bg-brand-subtle`.
- Composer stays **active** (violet focus border) while generating with hint "Start by describing the concept. Refine and regenerate as many times as you like." Code disables the textarea while pending.
- Composer = `+` · mic · Enhance · sparkle send. Code `PromptBar`: paperclip whose input clears immediately, **mic with no handler**, "Enhance prompt" toggle whose `refineOn` is never read, arrow send.

### 46527:81260 03 Concept failed — Partial · `image-turn.tsx` `FailedImageTurn`
- Red triangle icon in a circle · **"Couldn't draft that concept"** · **"The request didn't reach the model. Nothing was charged — your credit balance is unchanged."** · outlined **"↻ Try again"**.

### 46527:81312 04 Insufficient credits — MISSING · `image-turn.tsx`, `lib/create/plan.tsx`
- Card action row: **"Cost: 4 credits · you have 1 ⓘ"** in red; **"Use this concept" disabled**.
- Yellow banner under the card: coin icon · **"Not enough credits to build this"** · **"Generating the full product costs 4 credits. Exploring and refining concepts stays free."** · link **"Top up credits →"**.
- Code has no credit balance at all (only a daily prompt quota).

### 46527:81349 05 Refine — overlay open — Partial · `image-editor-modal.tsx`
- Header: × · **"Refining Concept 1"** · **"The result lands in your chat as Concept 1.1 — the original stays untouched."** · chip "CONCEPT 1" top-right.
- Composer: **"Describe a change to this image…"** + mic + violet square sparkle send; hint **"Refining evolves the same concept. To start over from your prompt, use Regenerate instead."**
- Whole page blurred behind.

### 46527:81399 06 Refine result — lineage — Partial · `chat-thread.tsx`, `image-turn.tsx`
- Lineage = dotted sub-versions (**Concept 1.1**). Code: sequential numbering + "Refines Concept M" breadcrumb.
- Ready-card anatomy (all cards 04–10): **"Prompt: …" one line, truncated, copy-to-clipboard icon right** · divider · actions split: **Refine · Regenerate · "Cost: 4 credits ⓘ"** left, **"Use this concept"** primary right. Code: `line-clamp-2`, no copy, no divider, no cost, all right-aligned, "Use this →", plus a "Click to refine" hover overlay not in design.

### 46527:81435 07 Regenerate — running — Partial
- Source card's Regenerate button in **pressed/filled** state; new tile **"Rendering concept 2 · 10%"**.

### 46527:81484 08 Regenerate done — Implemented (bar card anatomy).

### 47152:62180 09 Generate full product — modal — Partial · `confirm-build-dialog.tsx`, `lib/create/history.tsx`
- Title **"Generate the full product"**, blue ⓘ glyph (code: lock).
- Body **"We'll engineer five deliverables from this concept. The build runs in the background — you can leave and we'll notify you when each piece is ready."**
- Concept summary: thumb + **"CONCEPT 2" chip** + derived title **"Gesture-controlled LED strip"** + meta **"ESP32 · APDS-9960 gesture sensor · WS2812B RGB strip · printed ABS enclosure"**.
- "WHAT WE'LL GENERATE" — **five** tiles: 3D enclosure · PCB design · Firmware code · **Wiring** ("Peripheral harness with pin-to-pin labels and wire colours") · **Parts** ("Every component with quantity, footprint and where to buy it"). Code manifest = 3, `BuildItemKind = "3d"|"pcb"|"code"`.
- Chips: "About 8–12 minutes" · "Uses 4 credits" · **"No wallet or KYC yet"** (violet).
- Footer: "Keep refining" · **"⚡ Generate full product"**. Width 560.

### 46527:81656 10 Concept sent to build — Partial · `image-turn.tsx` `usedForBuild`
- Action row → green **"SENT TO BUILD"** chip · live **"Building now · about 9 minutes left"** · outlined **"View build ›"** right. Code: static violet pill, no link.

Code-only (remove per decision): `ChatHeader` bar (back · "Concept chat" · title · builds pill); "Click to refine" overlay; disabled composer while pending; Enhance toggle pill; icons in mode toggle; `Reassurance` line. Sidebar copy: design says "Upgrade to Builder / Unlock more features" + Support block (Help Center • Tutorial • Tour Guide / Report a Problem) + wallet & bell icons on the profile row.

---

## 2. Build process + deliverables (11 frames)

Cross-cutting (`create/build-status.tsx`, `build-shell.tsx`, `lib/create/history.tsx`):
- **5 artifacts** everywhere: 3D model ("Printable enclosure with mount points") · PCB ("Schematic, layout and BOM") · Firmware code ("Starter firmware for the parts used") · **Wiring** ("Harness and pin-to-pin connections") · **Parts** ("Bill of materials with suppliers"). Rows carry subtitles.
- Concept header: thumb + violet chip **"CONCEPT 2 · IN BUILD"** + product title **"Gesture-controlled LED strip"** + spec line **"ESP32 · APDS-9960 gesture sensor · WS2812B RGB strip · printed ABS enclosure"** + status badge right. Code: "Locked concept" + `prettyTitle(prompt)` + raw prompt.
- Page chrome: **"← Back"** text link above one centred card (~580 px) — no header bar, no "PROJECT BUILD" eyebrow, no "Source chat" pill.
- **Meta line** with clock icon under the list in every state (e.g. "About 8–12 minutes · 2 minutes elapsed").
- Per-item labels **Waiting · NN% · Ready · Couldn't generate · Didn't run**; failed rows show **no bar**.

### 46867:92942 11 Build queued — MISSING
- Badge **"Queued"** (grey); rows **"Waiting"** with empty tracks.
- Blue info banner **"Your build starts shortly"** / **"One build ahead of you. Credits are only charged once your build starts."**
- Meta **"Free plan runs one build at a time"**.
- Footer **"You're next in the queue. We'll start automatically and notify you — no need to wait here."** + "Back to home".
- Code never produces a queued state (`startBuild` sets everything building).

### 46867:92893 12 Build in progress — Partial
- Badge **"Building · 15%"**; footer verbatim "You can leave — the build keeps running and we'll notify you when each piece is ready." + "Back to home" (matches). Missing: 5 rows, subtitles, meta line "About 8–12 minutes · 2 minutes elapsed", concept header.

### 46867:92992 13 Build — partial failure — Partial
- Badge **"Partial — retry needed"** (matches). Amber banner **"The PCB step failed"** / **"Your 3D model and firmware are safe. Retrying the PCB will not cost additional credits."**
- Failed row: **"Couldn't generate"** red, bar removed, outlined **"↻ Retry PCB"** under the title inside the row. Others keep progressing.
- Meta **"2 of 3 pieces finished · retry costs no extra credits"**. Footer **"The finished pieces are saved. Only the PCB needs another attempt."**

### 46867:93042 14 Build — system failure — MISSING
- Badge **"Build failed"** (red). Code's rollup `failed` has no badge branch → renders "Building · 0%".
- Red banner **"A system error stopped this build"** / **"This was our fault, not yours. All 4 credits have been refunded automatically — your balance is unchanged."**
- Every row **"Didn't run"** (grey, no bar). Meta **"Stopped after 3 minutes · nothing was delivered"**.
- Centred actions: primary **"↻ Try this build again"** (whole-build retry) + secondary **"Back to chat"**. Footer **"Nothing about your concept was lost — it stays in the chat exactly as you left it."** + "Back to home".

### 46527:81592 19 Build ready (chat) — Partial — same as frame 10 above.

### 46527:81620 20 Build ready — toast — Partial · `attention-banner.tsx`
- Anchored **top-centre** (~540 px). Eyebrow **"BUILD READY TO REVIEW"**, message **"Plant moisture monitor is ready"** (product name), bell tile, primary **"Open build"**, ×. Code: bottom, prompt excerpt.

### Deliverables shell ("Review your deliverables") · `create/review-outputs.tsx`
- "← Back" link; card eyebrow **"BUILD READY"** + h2 **"Review your deliverables"**; **pill tab row** (5 tabs, active = solid violet pill); body = **wide preview (~745 px) left** + narrow **"WHAT SHIPS"** card right (chips with check icon).
- Footer: left **"All five pieces are ready. Choose what happens to this build next."**; right primary **"Save Project"** (save icon) + secondary **"Advance Edit"** (pencil). No outcome picker, no "What is this?" blurb, no "Download .glb".

### 46527:81999 15 — 3D model — Partial
- Large render fills the panel. What ships: **"STL + STEP files" · "Print settings: PETG, 0.2 mm layer" · "Mount points sized for the PCB"** (matches).

### 46527:82026 DL-02 PCB — Partial
- Preview: schematic-style **block diagram** on pale violet ground (board outline with 4 corner holes, blocks ESP32 · APDS-9960 · REG · USB-C · LDO · WS2812B with net lines) + mono meta **"2-layer · 48 x 32 mm · 14 parts · Gerber + KiCad"**. Design's What-ships chips are copies of 3D's (design error) — keep code's PCB list: "Schematic (PDF + KiCad)" · "2-layer layout · Gerber bundle" · "Bill of materials with stock links".

### 46527:82086 DL-03 Firmware — Partial
- Preview: **code file card** — tinted header bar with **"gesture_led.ino"**, syntax-highlighted body (`#include <Adafruit_NeoPixel.h>`, `#define LED_PIN 5`, `// pins match the PCB layout in the previous tab`, `setup()`/`loop()`). Keep code's What-ships list (design copies 3D's).

### 46617:99519 DL-02 Wiring — MISSING
- Preview: **wiring map** — nodes USB-C · LDO 3V3 · ESP32 · APDS-9960 · WS2812B; wires **VBUS 5V · 5V · 3V3 · GND · GPIO21 · SDA · GPIO22 · SCL · GPIO18 · DIN**; legend **"- - - POWER   —— GROUND   —— SIGNAL"** (dashed / dark / violet); meta **"7 nets · 11 connections · 3 net classes · Netlist + Harness CSV"**.
- What ships: **"Netlist + pin-to-pin table" · "Wire colors per net class" · "Harness lengths, 22 AWG" · "Connector pinouts: USB-C, JST-PH" · "Continuity test checklist"**.

### 47167:69612 Parts list — MISSING
- Preview header **"PARTS IN THIS BUILD"** + mono **"12 unique parts · 26 units"**; table **CATEGORY · COMPONENT NAME · REF · QTY** (e.g. "Microcontroller · ESP32-S3-WROOM-1 · U1 · 1", "Power Management · Buck-Boost Converter 5V/3A · U3 · 2", "Display & I/O · 4" IPS TFT Display 480×320 · DSP1 · 1"); footer mono **"Grouped by function · quantities are per board"**.
- Right column: **"PARTS SUMMARY"** — Unique parts 12 · Total units 26 · Active devices 4 · Passives 5 · Connectors & mech 3; then **"WHAT SHIPS"**: "Bill of materials (CSV)" · "Reference designators" · "Footprints and 3D models" · "Datasheet links" · "Supplier part numbers".
- Sidebar "Parts & agile module" → `/parts` has no page.

---

## 3. Brief — Sell on marketplace (24 frames)

### BR-01 / BR-02 project field + dropdown — Partial · `brief/step-1-idea.tsx`
- Subtitle **"A name and one line. Quick — you can edit everything later."**
- **Choose Project** select: placeholder "Choose Project", hint **"Attach this build to an existing project, or start a new one."** Dropdown: **"+ Create new project"** first (default), then **"EXISTING PROJECTS"** header, rows `Name · Draft` (suffix only for drafts). Pattern exists in `dashboard/project-info-modal.tsx`.
- Intent cards: requirement pills **"Wallet + identity check"** (Sell) · **"Wallet needed · no KYC"** (Give) · **"No wallet · no KYC"** (Save); icon top-left in tinted square, filled violet when selected.
- Counter "24/140" **below** the textarea. "Back" link above the card.

### BR-03 new project selected — MISSING
- Inset **"NEW PROJECT DETAILS"**: Project name (placeholder "Modern Battle Tank", hint **"Products live inside a project. You can rename it later."**) · Project description (placeholder "Write description", hint "Optional.").

### BR-04 existing project selected — MISSING
- Hint → **"This build will be added to Battle Tank."**; blue callout **"Adding to Battle Tank"** / **"That project already has 2 products. Its name and description stay as they are."**

### SI02 Pick your preview — empty / filled — Partial · `brief/step-2-video.tsx`
- Cards have a **header band with status chip**: **"Available"** (AR) · **"Recommended"** (AI, violet gradient header) · **"Locked"** (Skip). In Sell/Give **AR is Available**; only Skip is locked. Subs: "Record from your phone" · "Generate from a prompt" · "Add later".
- **"Need to prompt help?"** link right of "What should the video show?" → Prompt Help modal.
- Video placeholder **"Write here your description for your new product video"**. **"Auto Generate Video"** toggle under the video prompt. **"Auto Generate Audio"** toggle below the audio textarea (full label). Audio placeholder **"Describe soundscape - ambient noise, music mood, speech tone..."**.
- Quality = segmented tabs **"Low · 480p · 10 sec"** / **"High · 720p · 10 sec"**; note "Full video is 10s".
- **"Regenerate storyboard"** = full-width **outline** button, always that label, disabled without a prompt.
- Footer "Type a prompt and generate the storyboard." + disabled Continue (matches).

### SI02 AR selected — MISSING
- Panel **"Record on your phone"** · sub **"Scan the code with your phone camera to open the IDEEZA app."** · chip **"Waiting for phone"** · large **QR** · **"HOW IT WORKS"**: 1 **Open the IDEEZA app** — "Install it first if you have not — App Store or Google Play." 2 **Scan this code** — "The app opens straight into this build, no searching." 3 **Record a 10s clip** — "Walk around the product. The app trims and uploads it here." · **"No phone nearby?"** + link **"Switch to AI instead"**.
- Page footer **"Waiting for the clip from your phone."** + Continue disabled. (Save variant adds "Skip media" link.)

### Prompt Help modal — MISSING
- Eyebrow **"PROMPT HELP"** · title **"Turn your idea into a video prompt"** · sub **"Describe the product in your own words. We rewrite it into a scene the model can render."** · ×.
- **"Write your idea"** textarea (placeholder "make a gesture and voice controlled electric fan for me"), hint "One or two lines is enough."
- Full-width outline **"✨ Generate a prompt"**. **"Refined prompt"** section + copy icon + text.
- Blue callout **"You can edit this before rendering"** / **"Copy it into the video prompt field, or tweak the wording first."**
- Footer **Regenerate** · **Use this prompt** (writes into the video prompt).

### SI03 storyboard ready — Implemented (deltas)
- Blue callout title **"Click Continue to start rendering your 10s video"** + sub **"You will see progress right here. The render keeps running if you leave."**; line "You can stay here and wait, or continue to the mint setup in parallel — the render keeps running either way." shown **before** render starts. Speech placeholder **"No Speech in this scene..."**. Scene rows grey fill, violet time range.

### SI03b video rendering — Implemented (deltas)
- In-card line **"You can leave — the render keeps running and the project goes live once it is done."**
- Global toast: **dark, top-centre** — "Video rendering · ~12m remaining. Project goes live when done." + **CANCEL** + ×. Code: light card top-right.

### SI04 video ready — Implemented. Toast "Video ready · Air craft Building. Tap to review." + **REVIEW**.

### SI05 Review your video — Implemented (thumbnail + small square play glyph; no "480p · 10s" badge).

### SI06 Ready to sell — Partial · `brief/step-3-mint.tsx` `SellFields`
- **Blockchain Mint** select, placeholder **"Choose your prefer blockchain"**, options **"Base Sepolia (Testnet)"** · **"Mumbai Testnet (Polygon)"**. (Code: Ethereum/Polygon/Solana pills.)
- **Listing type** select: placeholder "Select listing type", options **Buy Now · Auction** only.
- **Token** · **Price** as two labelled columns; price sample "32".
- **Royalties (%)** hint "2 – 100" below; placeholder **"Suggested: 2%, 2.5%, 5% Maximum is 10%"**.
- Checkboxes (4): **"Instant Mint (Gas fee Applicable)"** · **"I understand a network gas fee is added at mint"** · **"I confirm I am the rightful owner of this idea"** · **"Share to Innovations"**.
- Cost box: **Mint fee 4 IDZ · Listing (Buy now) 32 ETH · Network fee (Ethereum) 0.00104 ETH · ≈ $3.90 · Total to pay now 4 IDZ + 0.00104 ETH**.
- Blue callout **"Nothing is charged until you approve in your wallet"** / **"Gas is an estimate at current network rates. Minting records that you made this first — it does not stop someone copying the design."**
- CTA **"Pay 4 IDZ and go live"** (wallet icon, full width). Footer "Video is ready. Minting now publishes your listing immediately." (matches).
- Product card: **video thumbnail with play**, violet eyebrow = project name, title = product name, sub = one-liner.
- Custom dropdowns with a check-mark on the selected row (not native select).

### SI06 Auction — MISSING
- Replaces Token/Price with **"Minimum bidding price"** (token select + amount) · **"Auction Buy Now Price"** (placeholder "0.5 for example") · **"Expired Date"** (date-time, placeholder "dd/mm/yyyy , --:-- --", calendar icon). Cost row label becomes "Listing (Auction)" (design still says Buy now — design error).

### SI06b Choose Collection — Partial
- Label **"Choose collection"**, placeholder "Select collection", options **"Test Collection for V2"** · **"Test Base Sepolia Collection 18-01 001"** · **"Test Collection"** · **"New Version Collection"** (wallet collections; local model).

### SI06d Price token — Implemented (ETH · WETH · USDC · USDT; custom dropdown).

### SI06 Share to Innovations checked — MISSING
- Inset **"Write your story"**: textarea placeholder **"Why did you build this? What should others do with it?"**, hint **"Shown with your post in Innovations."**, counter **"0/500"**.

Code-only (remove per decision): Bundle/Offers, Solana, locked AR for Sell/Give, "Required" badge, "Pay … & Mint"/"Fill the required fields" states stay only as validation.

---

## 4. Brief — Give to community + Save privately (17 frames)

Flow order (design): Idea → Give/Save form → if "Share to Innovations" ticked: story panel + CTA **"Continue to video ›"** → Pick your preview → final CTA **"Give to community and post to Innovations"** / **"Save as Private"**. Without the tick the form's own CTA commits directly.

### Give to community 3 (46527:82167) — Partial · `step-3-mint.tsx` `GiveFields`
- Heading **"Give to community"**, sub **"Anyone can use and build on this, for free. Minting keeps your name on it — and this cannot be undone."**
- Product card with thumbnail + play (eyebrow project "LED strip", title "Gesture-controlled LED strip", sub "for serving home").
- **"Blockchain Mint"** → "Base Sepolia (Testnet)" · **"Choose collection"** → "Select collection" · **"License"** → **"Select a license"**.
- Checkboxes: **"I confirm I am the rightful owner of this idea"** (checked) · **"Share to Innovations"**.
- CTA **"Give to the community"**. No cost box, no gas checkbox, no recipient/distribution fields.

### GV-01 License dropdown (46527:82257) — MISSING
- Options: **"Boost Software License — Version 1.0"** · **"BSD 2-Clause License"** · **"BSD 3-Clause License"** · **"Creative Commons Legal Code"** · **"GNU General Public License — Version 2"** · **"GNU Lesser General Public License — Version 2.1"** · **"MIT License"** — each row with a trailing ⓘ.

### Auto-Generated video popup (46527:82204 / 84312) — Partial · `review-modal.tsx`
- Title **"Auto-Generated Preview"** + green **"Ready"** badge · 16:9 clip with play · body "Watch the full clip before approving. Once you mint, this is the version that ships with the listing." · footer **"Made from your 3D model"** + outlined **"Regenerate"**. Opens from the Step 3 product-card thumbnail.

### GV-01 Innovations on (46527:82303) — MISSING
- Ticking "Share to Innovations" reveals **"Write your story"** (placeholder "Why did you build this? What should others do with it?", hint "Shown with your post in Innovations.", "0/500"), brand note **"Next you will make a short clip — Innovations posts need one."**, CTA → **"Continue to video ›"**.

### GV-01 Pick your preview (46527:82340) / storyboard + video ready (46527:82665) — Partial
- As SI02/SI03 above; final CTA **"Give to community and post to Innovations"** (right-aligned).

### SI02 AR selected (46527:82371 / 84474) — MISSING — as Sell's AR panel.

### Save as Private (46527:84276) — Partial · `SaveFields`
- Heading **"Save as Private"** (design sub is Give's copy — use **"Only you can see this. Minting keeps your name on it — you can share or sell it later."**); thumbnail card; **Blockchain Mint** + **Choose collection**; no License; ownership check + "Share to Innovations"; CTA **"Save as Private"**. No mint toggle, no cost box.

### Save — Checkmark on (46527:84364) — MISSING — same story panel + "Continue to video". (Design frame's heading says "Give to community" — treat as Save.)

### Save — Innovations on (46527:84390 / 84422) — Partial — Pick your preview with placeholders above; final CTA **"Save as Private"**.

---

## 5. Voice prompt (4 frames) · `dashboard/workspace-prompt.tsx`, `create/prompt-bar.tsx`

### 46887:129296 Idle — Implemented (copy drift as Home above).

### 46906:45947 Listening — MISSING
- Prompt-card body is **replaced** while recording: header row 10 px brand dot + **"Listening…"** (15 px semibold); **waveform** 48 px tall, ~78 bars `w-3px gap-3px rounded-2px` in brand colour, heights 4–36 px, trailing ~24 bars at 20 % opacity; footer left **"Tap Stop when you're done"**, right **"Cancel"** (ghost) + **"Stop & review"** (primary). Textarea/+/mic/Enhance/send hidden.
- Cancel = discard, Stop & review = commit to the textarea for editing. Recognition should be continuous until Stop; errors/permission denied surfaced.
- Same in `prompt-bar.tsx`, whose mic has no handler at all. Hook duplicated in `image-editor-modal.tsx` — share one hook.

### 46908:46332 Transcript — Partial — transcript lands as editable text; send enabled (violet) once text exists.

### 46919:46986 Build & Generate — Partial — chat page after submit: white user bubble, drafting card with **"Rendering concept · 10%"** pill on brand-tinted bordered canvas, composer with violet focus border, placeholder "Describe your electronics project...", hint "Start by describing the concept. Refine and regenerate as many times as you like."

---

## Design inconsistencies to report back to the designer
1. PCB and Firmware "What ships" chips are copies of the 3D chips.
2. Save-as-Private sub-line is Give's copy.
3. Frame 46527:84364 (Save · checkmark on) carries the "Give to community" heading and License field.
4. Auction frame's cost box still reads "Listing (Buy now)".
