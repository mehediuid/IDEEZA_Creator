# Build and Earn, P0: separating engineering from monetization in the information architecture

**Status:** the owner said "P0 suru koro, erpor P1" on 2026-10-11. The 10 open decisions were not answered, so the study's recommended defaults apply (listed below). Study report: https://claude.ai/artifact/GVbSsbrfThhSvay3L4JuDo.

**Goal of P0:** the project page shows engineering only, plus ONE button, **Earn from this project**, that opens a separate Earn area at `/projects/<id>/earn`.
- P0 **moves existing things**; it builds nothing new for commerce.
- No library data model changes and no storage migration happen in P0. Those come in P1.
- Behaviour of every moved control stays identical.

## Defaults taken (the owner can overrule them later)
1. Button label: "Earn from this project". Route: `/projects/<id>/earn[/<section>]`. Paths come only from `src/lib/manual/earn-route.ts`.
2. The button always shows to the owner (quiet when not ready); it is not hidden until the build is finished.
3. Showcase stays in engineering, as its own rail block, because it needs no wallet.
4. Contributors split in the UI:
   - **Team** (name and role, via the existing `teamOf`) stays on the engineering page as a tab;
   - **Splits** (ownership % and the cap table, via `rosterOf`/`ownershipOf`, with the add/edit dialog) moves to Earn.
5. Customers move to Earn.
6. The lock rule (100% sale = read-only) and the editions rules are unchanged. The lock line stays on the engineering page and links to Earn.
7. Token, Earnings page, pre-orders and KYC are not in P0.

## Engineering project page `/projects/<id>` after P0
- **Keeps:**
  - breadcrumb, title and rename, description, the Activity chip;
  - the pending-version banner and the **Review version N** action (engineering);
  - the Saved banner, the storage banner, the lock line (with a link to Earn).
- **Header:** the commerce status chip, the Utility NFT pill, the Business plan chip, the Add/Continue/View Brief and Add to marketplace / List another share action pair, and **Preview as buyer** all leave the header. The status chip is replaced by a **stage line**, for example `Built · 3 products · v2`, using existing facts (products, latest version, pending build).
- **Tabs:** Products · Media · Network · Team. Customers and the old Contributors tab leave. Old links:
  - `?tab=contributors` opens Team;
  - `?tab=customers` redirects to `earnHref(id, "customers")`, keeping any `sale=` param.
- **Rail:** Details (without the Ownership row and the "See contributors" link) · Versions · **Showcase** (the Showcase toggle and its readiness dialog, lifted out of the Outcome block unchanged) · Log · Manage. Marketplace, Outcome and Legal leave.
- **Earn button:** it sits where the action pair was, owner and local-owner viewers only. States:
  - **Not ready:** a secondary button with the sub-label "N of M ready". The count is the passed vs total rules of `readinessOf(facts, "sell")`. It still opens Earn.
  - **Ready:** violet (primary). The only exception: when a Review version action is pending, Review version keeps the violet and Earn is secondary, so the page still has one violet control.
  - **Active**, meaning a live or paused listing or a partial sale: secondary, with a short live fact such as "Listed", "Listing paused" or "Sold 40%".
  - **Sold in full:** secondary, "Sold in full", opens Earn read-only.
  - **Phone:** full width above the tabs, at least 44 px.
- `?list=1` on `/projects/<id>` redirects to `earnHref(id, "sell", { list: "1" })`. `listFlowHref` returns that new href.

## Product page `/projects/<id>/products/<pid>`
- Its Contributors and Customers tabs leave. Team credit stays visible through the project's Team tab.
- The Editions rail block (Physical and Virtual) moves to Earn › Editions.
- Engineering tabs, the Editor block, Build check, the version select, Open in editor and the lock line stay.
- The buyer view on `/marketplace/...` keeps working exactly as today. The public listing pages are the buyer side of commerce and are not changed in P0.

## Earn area `/projects/<id>/earn[/<section>]`
- **Layout:**
  - a header with "← {project name}" back to the project page, an "Earn" label, the project's commercial status chip, and Preview as buyer;
  - a sub-nav from `EARN_GROUPS`: a left column on desktop, a scrolling strip on phone;
  - the section body.
  - Owner-only. Other viewers see a short "Only the owner can manage earning" state with a link back.
  - An unknown section returns a not-found page.
- **Sections** reuse existing components unchanged:
  - **Overview:** the "Ready to earn" checklist from `readinessOf(facts, "sell")` rules (videos, ownership) plus "Minted", and option cards linking to the sections:
    - Sell the project (Project NFT);
    - Sell editions (Physical and Virtual);
    - Business plan;
    - Splits;
    - Customers.

    Each card shows a gate badge, `No wallet` or `Wallet`, matching today's reality: listing, minting and editions use the demo wallet, while the plan, splits and customers need none. No KYC badge appears in P0.
  - **Project NFT (`sell`):** the Brief entry (Add, Continue or View Brief, the same `nextAction` logic as before), the Outcome block (mint proof, payout wallet, Testnet demo badge; without Showcase, which now lives on the engineering page), the Marketplace block (Main listing state, Edit/Remove/Relist/Close, NFT type tabs), and the Add to marketplace / List another share flow. It reads `?list=1` exactly as the header button did.
  - **Editions:** one row per product with that product's existing Editions block.
  - **Business plan (`plan`):** the existing business-plan page content. `/projects/<id>/business-plan` redirects here.
  - **Splits:** the roster with ownership %, the over-100% warning, and the add/edit contributor dialog (the old Contributors tab content), plus the Details rail's Ownership row.
  - **Customers:** the existing Customers panel, keeping `sale=` deep links.
  - **Rights:** the existing Legal information block (patent, copyright, trademark) and the license line.
- **Lock and permissions:** everything keeps using the same `can(viewer, …)` checks and the same lock, so a sold-in-full project shows these sections read-only exactly as before.

## Out of scope for P0 (P1 and later)
- `lib/commerce` and the import boundary, guards, the permission split, the two status axes, the storage migration.
- The Brief split (description and video into engineering, the mint form into Earn).
- The physical/virtual guided flow, the wallet and KYC ladder, the "% sale" wording, the lock and listing-edit rule change.
- Token (P2). Real money (P3).

## Constraints
- One violet control per page.
- 44 px targets on phone, and no horizontal scroll at 400 px.
- Copy is sentence case, with no "successfully".
- Tests: update every test the move breaks without losing coverage. Add tests for `earn-route.ts`, the button state, the stage line, and the tab/redirect mapping. `npm run test:projects` and `npx tsc --noEmit` must be clean.
- Docs: update `docs/guides/features/platform-and-projects.md` (the project page and Earn) and `docs/guides/app-map.md` (routes).
