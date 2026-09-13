# Ai-Flow parity · Plan 3 — Brief: Sell on marketplace

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Brief module's Step 1 (Choose Project), Step 2 (Pick your preview incl. Prompt Help + AR panel) and the Sell form to Figma parity (audit §3), with the design's dropdowns, chains, listing types, auction fields, cost estimate and story panel.

**Architecture:** `BriefState` in `src/components/brief/brief-app.tsx` is extended and migrated on load. New pure libs under `src/lib/brief/` (wallet collections, gas estimate, QR encoder). A shared `SelectMenu` primitive replaces native selects. Step order for Sell is unchanged (Idea → Preview → Ready to sell).

**Tech Stack:** as Plan 1. Pollinations text via `/api/refine` for the Prompt Help rewrite.

## Global Constraints

Same as Plan 1. Copy source: audit §3 — verbatim. Screenshots `br0*.png`, `si0*.png`, `prompt-help.png`, `listing-dd.png` in the scratchpad. Remove per Decision 1: Bundle/Offers, Solana, Ethereum/Polygon pills, the "Required" badge and AR/Skip hard-lock for Sell, `Pay … & Mint` label variant (validation keeps the button disabled with a reason instead). Independent of Plans 1–2 except `SelectMenu` (created here, reused by Plan 4).

---

### Task 1: `SelectMenu` primitive

**Files:**
- Create: `src/components/ideeza/select-menu.tsx`; export from `src/components/ideeza/index.ts`.

**Interfaces (produces):**
```tsx
export type SelectOption<V extends string = string> = { value: V; label: string; sub?: string; info?: string; section?: string; disabled?: boolean };
export function SelectMenu<V extends string>(props: {
  value: V | null; onChange: (v: V) => void; options: SelectOption<V>[];
  placeholder: string; label?: string; hint?: string; error?: string; disabled?: boolean; id?: string; className?: string;
}): JSX.Element;
```
Trigger = bordered field (`--color-border-default`, focus `--color-border-brand`) with chevron; panel portals to `<body>`, `position: fixed`, clamped to the viewport (flip up near the bottom), width = trigger width; rows show `label` (+ `sub` muted), a check icon on the selected row, an optional trailing ⓘ (`info`) with a tooltip on hover/focus; `section` renders an uppercase group header (e.g. "EXISTING PROJECTS") before the first option of that section. Keyboard: ↑/↓ move, Enter selects, Esc closes, typeahead by first letter. `role="listbox"`/`option`, `aria-expanded`.

- [ ] **Step 1: Build it** (reuse the portal/clamp helper used by `context-menu.tsx` if exportable; otherwise a small local `useClampedPosition`).
- [ ] **Step 2: tsc + CDP** on a scratch usage (temporarily in Step 3's Blockchain field): opens, clamps near the bottom edge (window 500 px tall), keyboard selects, ⓘ tooltip appears.
- [ ] **Step 3: Commit** `feat(ds): SelectMenu — portalled, clamped custom dropdown with sections and info rows`.

---

### Task 2: Brief state migration + libs

**Files:**
- Modify: `src/components/brief/brief-app.tsx` (types, `DEFAULT_STATE`, `readFromStorage` migration)
- Create: `src/lib/brief/wallet.ts`, `src/lib/brief/gas.ts`, `src/lib/brief/qr.ts`

**Interfaces (produces):**
```ts
export type Network = "baseSepolia" | "mumbai";
export const NETWORKS: { value: Network; label: string }[] = [{ value: "baseSepolia", label: "Base Sepolia (Testnet)" }, { value: "mumbai", label: "Mumbai Testnet (Polygon)" }];
export type ListingType = "buyNow" | "auction";
export type Token = "ETH" | "WETH" | "USDC" | "USDT" | "MATIC";
export const TOKENS_BY_NETWORK: Record<Network, Token[]> = { baseSepolia: ["ETH","WETH","USDC","USDT"], mumbai: ["MATIC","WETH","USDC","USDT"] };
export type License = "boost1" | "bsd2" | "bsd3" | "cc" | "gpl2" | "lgpl21" | "mit";
// BriefState additions
projectChoice: "new" | string;   // ManualProject id
newProjectName: string; newProjectDescription: string;
autoGenerateVideo: boolean; instantMint: boolean; understandGas: boolean;
minBid: string; auctionBuyNow: string; expiresAt: string;   // expiresAt = datetime-local value
story: string; license: License | null;
// migration: network ethereum|solana → baseSepolia, polygon → mumbai; listingType bundle|offers → buyNow; token SOL → ETH, MATIC on baseSepolia → ETH; new fields default "" / false / null; shareToNewsfeed kept.

// wallet.ts — local per-chain collections, key "ideeza:brief:wallet"
export type WalletCollection = { id: string; name: string; network: Network };
export function readCollections(network: Network): WalletCollection[]; // seeded: "Test Collection for V2", "Test Base Sepolia Collection 18-01 001", "Test Collection", "New Version Collection" (baseSepolia); mumbai seeded with "Test Collection", "New Version Collection"
export function addCollection(network: Network, name: string): WalletCollection;

// gas.ts — fixed rate table, labelled estimate
export function estimateGas(network: Network): { native: Token; fee: number; usd: number; label: string }; // baseSepolia → { ETH, 0.00104, 3.9, "Network fee (Ethereum)" }, mumbai → { MATIC, 0.021, 0.02, "Network fee (Polygon)" }
export function formatTotal(mintIdz: number, gas: ReturnType<typeof estimateGas>): string; // "4 IDZ + 0.00104 ETH"

// qr.ts — in-house byte-mode QR encoder (ECC M, versions 1–10), no dependency
export function qrMatrix(text: string): boolean[][];     // true = dark module
export function qrSvgPath(text: string, moduleSize?: number): { path: string; size: number };
```
- [ ] **Step 1: Types + migration** (`normalizeBrief(parsed)` applied in `readFromStorage`); node-script check that a stored `{network:"solana", listingType:"bundle"}` becomes `{baseSepolia, buyNow}`.
- [ ] **Step 2: `wallet.ts`, `gas.ts`.**
- [ ] **Step 3: `qr.ts`** — implement: data encoding (byte mode, version chosen by capacity table for ECC M), Reed–Solomon EC codewords (GF(256) with generator 0x11d), interleaving, placement (finder, separators, timing, alignment patterns per version, dark module, format bits with BCH, no version info needed under v7 but include for 7–10), mask 0 fixed with the format bits matching (a single mask is valid; penalty scoring not required). Verify with a node script: `qrMatrix("http://localhost:3000/brief/ar/p1")` is square, size `21 + 4·(v−1)`, finder patterns present at three corners (check the 7×7 dark/light ring pattern), and decode by eye from a rendered PNG saved in the scratchpad (`qrSvgPath` → SVG → screenshot) using a phone or an online decoder if available — at minimum assert structural invariants.
- [ ] **Step 4: tsc; Commit** `feat(brief): state migration to Base Sepolia/Mumbai + Buy Now/Auction; wallet, gas and QR libs`.

---

### Task 3: Step 1 — Choose Project, intent pills, card frame (BR-01…BR-04)

**Files:**
- Modify: `src/components/brief/step-1-idea.tsx`, `src/components/brief/brief-app.tsx` (Continue handler creates the project)

Design: every Brief step renders inside a white card (`--color-bg-surface`, `--radius-2xl`, `--elevation-1`, padding `--spacing-6`) with a **"← Back"** text link above it (Step 1's Back → `/projects`). Subtitle **"A name and one line. Quick — you can edit everything later."** **Choose Project** `SelectMenu`: placeholder "Choose Project", hint **"Attach this build to an existing project, or start a new one."**; options: `{ value: "new", label: "+ Create new project" }` then section **"EXISTING PROJECTS"** with each `ManualProject` as `${name}${status === "draft" ? " · Draft" : ""}`. When `new`: inset panel eyebrow **"NEW PROJECT DETAILS"** with Project name (placeholder "Modern Battle Tank", hint **"Products live inside a project. You can rename it later."**) and Project description (placeholder "Write description", hint "Optional."). When existing: hint becomes `This build will be added to ${name}.` and a blue callout **`Adding to ${name}`** / **`That project already has ${count} products. Its name and description stay as they are.`** (count = 1 + number of builds with `projectId === id`, from `useCreateHistory().builds`, min 1). Default `projectChoice` = the active project's id when the Brief is opened from a project route, else "new". Intent cards: icon top-left in a tinted square (filled `--color-bg-brand` + on-brand icon when selected), title, sub, requirement pill (`--color-bg-info-subtle` text `--color-text-info`): **"Wallet + identity check"** · **"Wallet needed · no KYC"** · **"No wallet · no KYC"**. Counter `${n}/140` below the textarea. Continue: when `new` → `createProject({name, description})`, set active, set `projectChoice` to its id; when existing → set that project active. Continue disabled until product name, one-liner, intent and (new → project name) are filled, with the reason in a tooltip.

- [ ] **Step 1: Card frame + Back link** as a shared `BriefCard` wrapper in `brief-app.tsx` used by all steps.
- [ ] **Step 2: Choose Project + panels + callout.**
- [ ] **Step 3: Intent cards + counter.**
- [ ] **Step 4: tsc + CDP**: pick "+ Create new project" → panel appears; fill and Continue → a new project exists in `ideeza:manual:projects` and is active; pick an existing one → callout text; pills read as specified.
- [ ] **Step 5: Commit** `feat(brief): Step 1 project chooser, new-project panel, intent requirement pills (BR-01…04)`.

---

### Task 4: Step 2 — cards, prompts, quality, storyboard button (SI02 empty/filled, SI03)

**Files:** `src/components/brief/step-2-video.tsx`, `brief-app.tsx` (`goToStep2` no longer forces `mediaType: "ai"`; `skipMedia` allowed only for Save — unchanged rule for Skip)

Design: `TypeCard` gets a header band with a chip — AR **"Available"** (`--color-bg-success-subtle`), AI **"Recommended"** (band = `--gradient-brand`, chip on-brand), Skip **"Locked"** for Sell/Give (`--color-bg-subtle`, card `aria-disabled` with tooltip "A listing needs a preview clip"). Subs "Record from your phone" · "Generate from a prompt" · "Add later". Section title "What should the video show?" with right-aligned link **"Need to prompt help?"** → opens `PromptHelpModal` (Task 5). Video textarea placeholder **"Write here your description for your new product video"**; under it a toggle row **"Auto Generate Video"** — on → the field is filled with `Cinematic product reveal of ${productName}: ${productDescription}. Slow orbit, soft studio light, 10 seconds.` and stays editable (typing turns the toggle off, mirroring the audio toggle's behaviour). Audio textarea placeholder **"Describe soundscape - ambient noise, music mood, speech tone..."**, with the **"Auto Generate Audio"** toggle row **below** it (full label). Quality = segmented tabs **"Low · 480p · 10 sec"** / **"High · 720p · 10 sec"** + note "Full video is 10s". Storyboard button: full-width **outline**, always **"Regenerate storyboard"**, disabled without a prompt (tooltip "Type a prompt first"). Storyboard callout (blue): title **"Click Continue to start rendering your 10s video"**, sub **"You will see progress right here. The render keeps running if you leave."**; the line "You can stay here and wait, or continue to the mint setup in parallel — the render keeps running either way." shows as soon as the storyboard exists. Scene speech placeholder **"No Speech in this scene..."**; scene rows `--color-bg-subtle` fill with the time range in `--color-text-brand`. Render card gains the line **"You can leave — the render keeps running and the project goes live once it is done."**

- [ ] **Step 1: Cards + availability rules.**
- [ ] **Step 2: Prompt fields, toggles, quality, button.**
- [ ] **Step 3: Storyboard/render copy.**
- [ ] **Step 4: tsc + CDP** (intent sell): AR card enabled, Skip locked; Auto Generate Video fills the prompt; quality tab labels; button label/disabled state; callout text.
- [ ] **Step 5: Commit** `feat(brief): Step 2 cards, prompt help link, auto-video toggle, quality tabs to Figma (SI02/SI03)`.

---

### Task 5: Prompt Help modal

**Files:**
- Create: `src/components/brief/prompt-help-modal.tsx`
- Modify: `src/app/api/refine/route.ts` — accept `mode?: "brief" | "video"`; `video` system prompt: "Rewrite the user's product idea as a single vivid 10-second product-video scene for a text-to-video model: subject, setting, camera move, lighting, mood. One paragraph, ≤ 60 words, no lists." Fallback template when the model is unreachable: `Cinematic close-up of ${idea}, slow orbit on a clean studio backdrop, soft key light, subtle reflections, 10 seconds.`

Design: dimmed overlay; card 560 px: eyebrow **"PROMPT HELP"**, title **"Turn your idea into a video prompt"**, sub **"Describe the product in your own words. We rewrite it into a scene the model can render."**, ×; **"Write your idea"** textarea (placeholder "make a gesture and voice controlled electric fan for me", hint "One or two lines is enough."); full-width outline **"✨ Generate a prompt"** (spinner "Generating…" while pending, disabled when empty); **"Refined prompt"** section with copy icon button + the result; blue callout **"You can edit this before rendering"** / **"Copy it into the video prompt field, or tweak the wording first."**; footer **Regenerate** (secondary, disabled until a result exists) · **Use this prompt** (primary, disabled until a result exists) → `onUse(text)` writes the Step 2 video prompt and closes. Prefill the idea field with the product name + one-liner.

- [ ] **Step 1: API mode + fallback.**
- [ ] **Step 2: Modal + wiring from Step 2.**
- [ ] **Step 3: tsc + CDP**: open → generate (network may be unreachable headless → fallback text appears) → Use this prompt writes the textarea.
- [ ] **Step 4: Commit** `feat(brief): Prompt Help modal — idea → video scene prompt`.

---

### Task 6: AR "Record on your phone" panel (SI02 AR selected)

**Files:**
- Create: `src/components/brief/ar-record-panel.tsx`
- Modify: `src/components/brief/step-2-video.tsx` (AR branch), `brief-app.tsx` (`canContinue` false while `mediaType === "ar"` and no clip)

Design: panel header phone icon · **"Record on your phone"** · sub **"Scan the code with your phone camera to open the IDEEZA app."** · right chip **"Waiting for phone"** (`--color-bg-warning-subtle`, pulsing dot, static under reduced-motion); QR 200 px from `qrSvgPath(`${location.origin}/brief/ar/${projectId}`)` in `--color-text-primary` on `--color-bg-surface`; eyebrow **"HOW IT WORKS"**, numbered rows: 1 **Open the IDEEZA app** — "Install it first if you have not — App Store or Google Play." 2 **Scan this code** — "The app opens straight into this build, no searching." 3 **Record a 10s clip** — "Walk around the product. The app trims and uploads it here."; footer **"No phone nearby?"** + link **"Switch to AI instead"** → `mediaType: "ai"`. Page footer hint **"Waiting for the clip from your phone."**, Continue disabled (tooltip "The clip hasn't arrived yet"). Save intent adds the existing "Skip media" link. Honest note under the QR in `--color-text-tertiary`: "The IDEEZA phone app isn't released yet — this page will pick the clip up automatically once it is." (Decision 3.)

- [ ] **Step 1: Panel + QR + rules.**
- [ ] **Step 2: tsc + CDP**: select AR → panel + `<svg>` QR present (path non-empty), Continue disabled, Switch to AI flips the card.
- [ ] **Step 3: Commit** `feat(brief): AR record-on-your-phone panel with real QR deep link`.

---

### Task 7: Sell form (SI06 + Auction + Collection + Token + Share to Innovations)

**Files:** `src/components/brief/step-3-mint.tsx` (`SellFields`), `brief-app.tsx` (validation)

Design (audit §3 SI06…): heading **"Ready to sell"** + existing sub; `RenderInfo` banner kept; product card = video thumbnail (storyboard scene 1 image / render poster when present, else the gradient poster) with a small play glyph — click opens `ReviewModal` (Plan 4 restyles it); violet eyebrow = project name, title = product name, sub = one-liner. Fields, in order, each a `SelectMenu`/input with label above and hint below:
1. **Blockchain Mint** — placeholder **"Choose your prefer blockchain"**, options `NETWORKS`. Changing chain resets token to the chain's first and collection to null.
2. **Choose collection** — placeholder "Select collection", options `readCollections(network)`; last option `+ New collection…` prompts a name inline (small input + Add) → `addCollection`.
3. **Listing type** — placeholder "Select listing type", options **Buy Now** · **Auction**; default Buy Now.
4. Buy Now: two columns **Token** (`TOKENS_BY_NETWORK[network]`) · **Price** (number, placeholder "32"). Auction: **Minimum bidding price** (token select + amount) · **Auction Buy Now Price** (placeholder "0.5 for example") · **Expired Date** (`<input type="datetime-local">`, placeholder styling "dd/mm/yyyy , --:-- --", calendar icon).
5. **Royalties (%)** — placeholder **"Suggested: 2%, 2.5%, 5% Maximum is 10%"**, hint "2 – 100" below, clamp kept.
6. Checkboxes: **"Instant Mint (Gas fee Applicable)"** (`instantMint`) · **"I understand a network gas fee is added at mint"** (`understandGas`) · **"I confirm I am the rightful owner of this idea"** (`confirmOwner`) · **"Share to Innovations"** (`shareToNewsfeed`) → reveals the **story panel**: eyebrow **"Write your story"**, textarea placeholder **"Why did you build this? What should others do with it?"**, hint **"Shown with your post in Innovations."**, counter `${story.length}/500` (maxLength 500).
7. Cost box rows: `Mint fee` **4 IDZ** · `Listing (${Buy now|Auction})` **${price} ${token}** (auction: min bid) · `${gas.label}` **${gas.fee} ${gas.native}** with muted `≈ $${gas.usd.toFixed(2)}` · divider · **Total to pay now** `formatTotal(4, gas)`; footnote in `--color-text-tertiary`: "Estimate at fixed reference rates — live network pricing isn't wired yet."
8. Blue callout **"Nothing is charged until you approve in your wallet"** / **"Gas is an estimate at current network rates. Minting records that you made this first — it does not stop someone copying the design."**
9. CTA full-width **"Pay 4 IDZ and go live"** (wallet icon); disabled with tooltip naming the first missing field (chain · collection · listing · price/min bid/expiry · royalties · gas + owner checks); footer note "Video is ready. Minting now publishes your listing immediately." (or the existing "still rendering" variant).

- [ ] **Step 1: Product card + selects (chain, collection, listing) + token/price + auction fields.**
- [ ] **Step 2: Royalties, checkboxes, story panel.**
- [ ] **Step 3: Cost box + callout + CTA validation.**
- [ ] **Step 4: tsc + CDP**: choose Base Sepolia → tokens ETH/WETH/USDC/USDT; Auction → three auction fields, cost row "Listing (Auction)"; tick Share to Innovations → story panel with `0/500`; total reads "4 IDZ + 0.00104 ETH"; CTA disabled reason tooltip; both themes screenshot.
- [ ] **Step 5: Commit** `feat(brief): Ready to sell form to Figma — chains, collections, auction, cost estimate, story (SI06)`.

---

### Task 8: Render toast restyle

**Files:** `src/components/video-jobs/global-render-indicator.tsx`

Design: dark toast (`--color-bg-inverse` / `--color-text-on-inverse` — add tokens if missing, sourced from gray-900/white with dark-theme inversion), top-centre `top-[16px] left-1/2 -translate-x-1/2`, one line per job: rendering → **`Video rendering · ~${m}m remaining. Project goes live when done.`** + **CANCEL** (text button) + ×; ready → **`Video ready · ${productName}. Tap to review.`** + **REVIEW** → opens `ReviewModal`. Multi-job: stack vertically, newest on top. Email/browser opt-ins stay inside Step 2's render card only.

- [ ] **Step 1: Restyle + copy.**
- [ ] **Step 2: tsc + CDP**: seeded rendering job → toast text and position; ready job → REVIEW opens the modal.
- [ ] **Step 3: Update CLAUDE.md §5 "Other editor modules ▸ Add Brief"** (Choose Project, Step 2 cards + Prompt Help + AR panel, Sell form details, SelectMenu, dark toast) and STRUCTURE.md (`lib/brief/*`, new components, `ideeza/select-menu.tsx`).
- [ ] **Step 4: Commit** `feat(brief): top-centre render toast; docs`.
