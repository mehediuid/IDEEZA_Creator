# Build and Earn, P1: the Earn home, the split underneath, and the gating ladder

**Status:** the owner ordered "P0 then P1, the rest later" on 2026-10-11. P1 builds on P0 (`2026-10-11-build-earn-p0-design.md`). The study's recommended defaults still apply. Study: https://claude.ai/artifact/GVbSsbrfThhSvay3L4JuDo.

**Goal:** make the split real underneath, not just in the layout.
- Commerce code moves behind a boundary.
- Projects get two status axes.
- The Brief becomes the Earn layer's mint flow.
- "Sell the design / Sell the product" become guided flows.
- A wallet and KYC ladder gates commits.

Engineering behaviour must not change. A maker who never opens Earn sees nothing new.

## Unchanged defaults
- **The lock rule stays.** A 100% sale makes the project read-only. A live Buy-now listing still pauses on an engineering edit, and an auction still blocks edits. Changing this is an open owner decision, so P1 does not change it.
- **Editions still need a live or paused Main listing** (owner decision pending).
- **No real chain, no real KYC vendor, no backend.** Everything is demo and labelled demo or testnet, as today.

## P1-1: `lib/commerce` and the boundary (refactor, no behaviour change)
- **New folder `src/lib/commerce/`.** It is the commerce layer. `lib/market`, `lib/wallet` and `lib/brief/{wallet,gas}` count as its sub-layers; move what is cheap, and leave re-export shims at the old paths so imports keep working.
- **New `src/lib/manual/public.ts`.** It is the only engineering surface that commerce may import. Enforce this with an ESLint `no-restricted-imports` rule and a node test that scans imports:
  - engineering (`lib/manual/*` except composition files) must not import `lib/market`, `lib/wallet` or `lib/commerce`;
  - commerce must import engineering only through `public.ts`.

  List any temporary exceptions explicitly in the test, each with a TODO naming the later fix.
- **Guards.** Engineering defines `WriteGuard` and `DeleteGuard` interfaces and a small registry. Commerce registers three guards at the app root: sold in full (lock), listing pause/auction, and holds-a-share delete. Replace the six components that read the market to decide the lock with the guard API:
  - `manual/project-workspace`
  - `product-name-field`
  - `create/save-step`
  - `concept-chat`
  - `dashboard/project-info-modal`
  - `video-jobs-provider`

  The lock and listing behaviour must stay byte-for-byte the same.
- **Two status axes**, as pure functions with tests:
  - `engineeringStateOf(project) → "empty" | "building" | "built"` plus `{ version, headAhead }`;
  - `commercialStateOf(facts) → "none" | "minted" | "given" | "listed" | "paused" | "soldPartial" | "soldOut"`.

  `projectStatus` (today's combined status) stays as the function My projects uses, now derived from the two axes. A test proves it matches the old function on every fixture. P0's stage line reads `engineeringStateOf`, and the Earn header and button read `commercialStateOf`.
- **Permission split.** Tag every `can()` action as `engineering` or `commerce` in one table, and split `LOCKED` into `LOCKED_ENGINEERING` and `LOCKED_COMMERCE`, with the same members as today. Results must be unchanged; prove it with the existing permission tests plus a test that the union equals the old set.
- **Storage migration `commerce-split@1`.**
  - Copy these per project out of `ideeza:manual:projects`: `mint`, `contributors[].share`, `legal`, `ownerConfirmedAt`. They go to `ideeza:commerce:<projectId>`.
  - Run it once on load, then record the flag in `ideeza:migrations`. It must be idempotent and safe to run twice.
  - Read both locations, with the new key winning. Keep writing the old fields too, so a rollback loses nothing.
  - On project delete, commerce removes its key (subscribe to the existing `ideeza:project-deleted` event).
  - `showcasedAt` stays in engineering.

  Write tests for migrate, rerun, partial data, rollback reads and delete.

## P1-2: the Brief becomes Earn's mint flow
- **Route.** The mint wizard moves to `/projects/<id>/earn/sell/mint`, linked from Earn › Project NFT. The old `/project/<slug>/brief` and `/build/<id>/brief` routes redirect there. A Brief that has already minted opens its read-only success step, as today.
- **Steps:**
  1. **Choose:** Keep private, Give to the community, or Sell. The intent chooser comes out of the old Step 1.
  2. **Details:** license, plus the ONE shared listing form (`ListingFields`) for Sell, with chain, collection, price, % selling and royalties as today.
  3. **Review and sign:** the readiness gate, cost, and the wallet request (Lazy or Instant), as today.
  4. **Success.**
- **What leaves the Brief:**
  - The project description and product facts are read from the engineering record, which is edited on the project page. The Brief no longer edits them.
  - The video step leaves the Brief. Missing videos show in the readiness gate with "Make videos in Media" (link to `?tab=media`), which already exists for Sell/Give.
- **"Keep private" = mint without listing,** the same as today's Save as Private path.
- **Migrate old Brief drafts** (`ideeza:brief:draft:<id>`): keep the commerce fields, and drop the video and description fields from the wizard state while leaving them stored.
- **One listing form.** "Add to marketplace" on an already-minted project keeps using the same form in `add` mode.

## P1-3: Sell the design / Sell the product
- In Earn › Editions, replace the raw per-product blocks with two plain entry cards per product:
  - **Sell the design (virtual):** a license plus access to the design files.
  - **Sell the product (physical):** a pre-order-style edition.
- Each opens a guided flow over the existing `editions.ts` (`createEditions` and `listEdition`):
  1. Product
  2. Use: personal or commercial
  3. Supply
  4. Price tiers
  5. Terms. Physical adds a required free-text "How you'll make and ship it" note, plus a checklist: lead time, refund promise, and "you are the seller".
  6. Readiness
  7. Sign, then list
- The existing edition rows, editing and add-NFT controls stay available under each card.
- Copy calls royalties "best effort" and promises no income.

## P1-4: the gating ladder, demo KYC, and the wording
- **The ladder** is a pure function `earnLevelOf(facts) → { level: 0..4, next }`, shown in the Earn overview as a 5-step track:

  | Level | Meaning | Unlocks |
  |---|---|---|
  | L0 | Engineering | — |
  | L1 | Drafts (plan, splits) | No wallet |
  | L2 | Mint | Wallet connected, ownership confirmed, videos ready |
  | L3 | Sell & editions | Minted, license set, payout wallet set |
  | L4 | Physical editions & payouts | Identity verified |

  Every commit point checks its level and shows the missing step inline, with a one-tap fix. It never blocks engineering.
- **Demo identity check.** "Verify identity (demo)" is a dialog that collects nothing real: name and country only, no document, clearly labelled "Demo — no real verification".
  - It stores `ideeza:commerce:kyc` as `{ status: "verified", at, demo: true }`.
  - It is required only for physical editions and for a "Request payout" demo action.
  - It can be reset.
- **The % sale wording.** Wherever a share of the project is sold, remove any return or profit-expectation copy. Add a short fixed note: "Demo on a testnet. Selling a share of a project can be regulated as an investment where you live; this is not available for real money." Royalties are worded as "a share of resales, if marketplaces honour it".

## Constraints
- At most one violet control per page.
- 44 px targets on phone; no horizontal scroll at 400 px.
- Sentence case.
- Behaviour parity for engineering.
- Tests: no lost coverage. Expect about 60 new tests across P1. `npm run test:projects` and `npx tsc --noEmit` must be clean.
- Docs: update `docs/guides/features/earn-layer.md`, `platform-and-projects.md` and `app-map.md`.
