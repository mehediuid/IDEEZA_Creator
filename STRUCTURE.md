# Project Structure

Where everything lives in `ideeza-creator-panel`. For the rules and conventions see
**[AGENTS.md](AGENTS.md)**, for *what* the features do the
**[features guides](docs/guides/features/README.md)**, and for task routers
**[docs/map/](docs/map/PRODUCT.md)**; this file is the map of *where*.
Package manager: **pnpm** · framework: **Next.js 16 (App Router, modified)**.

> Keep this current: when you add/move/rename a folder or a significant file,
> update the tree below in the same change (mirrors [AGENTS.md › Keeping docs current](AGENTS.md#keeping-docs-current-required)).

```
ideeza-creator-panel/
├─ AGENTS.md                 The one agent guide — Next.js rule, hard rules, conventions,
│                            UI/UX rules, Project map (loaded every session)
├─ CLAUDE.md                 `@AGENTS.md` — how Claude Code loads the guide
├─ STRUCTURE.md              This file
├─ docs/                     map/ (task routers) · guides/ (features/, app map, PCB
│                            architecture, UI/UX) · superpowers/ (specs, plans) · Part 4 spec
├─ tests/projects/           node:test suites for pure src/lib modules (`npm run test:projects`)
├─ scripts/                  generate-feed-images.mjs (Innovations feed art → public/innovations/)
├─ next.config.ts            Next config
├─ tailwind.config.ts        Tailwind config (+ src/styles/tailwind-preset.ts)
├─ tsconfig.json             TS config (verify with `tsc --noEmit -p tsconfig.json`)
├─ eslint.config.mjs · postcss.config.mjs · components.json (shadcn)
├─ pnpm-lock.yaml · pnpm-workspace.yaml
│
└─ src/
   ├─ app/                   Next App Router — routes & layouts
   │  ├─ layout.tsx          Root layout (ThemeProvider, fonts, global CSS)
   │  ├─ api/                Server API routes (concept/generate · concept/summarize
   │  │                      · refine · build/start · three/generate · business-plan/section
   │  │                      · and others)
   │  ├─ (dashboard)/        Home + Parts + Innovations
   │  │   ├─ page.tsx                 "/"  — dashboard home (AI prompt hero)
   │  │   ├─ parts/                   "/parts" — Parts & Agile Module library
   │  │   │   ├─ new/                 "/parts/new" — New Package authoring flow
   │  │   │   └─ [id]/                "/parts/<id>" — one part + its land pattern
   │  │   ├─ creators/[handle]/       a creator's profile (me = yours)
   │  │   └─ innovations/[slug]/      community feed + the post (+ products/[productId]/)
   │  ├─ (create)/           AI create flow
   │  │   ├─ projects/                    "/projects" — My projects (index)
   │  │   │   └─ [id]/                    "/projects/<id>" — Project details
   │  │   │       ├─ network/             "/projects/<id>/network" — the Connection Map
   │  │   │       ├─ business-plan/       "/projects/<id>/business-plan" — the seven-section plan
   │  │   │       └─ products/[productId]/  "/projects/<id>/products/<productId>" — the product page
   │  │   ├─ marketplace/                 "/marketplace" — Explore marketplace
   │  │   │   └─ [id]/                    the buyer view (+ products/[productId]/)
   │  │   ├─ history/                 "/history"  — past generations
   │  │   ├─ chat/[chatId]/           concept chat
   │  │   └─ build/[jobId]/           AI build job (status → outputs)
   │  ├─ project/[projectSlug]/products/[productId]/[step]/   the product-scoped editor (PCB/Code/3D/…)
   │  ├─ project/[projectSlug]/[step]/   legacy editor address (redirects to the resumed product; brief → the mint flow)
   │  └─ pcb/ code/ 3d/ preview/ wiring/ brief/   legacy flat routes (each redirects to
   │                                       /project/<slug>/<step>) + pcb-editor.css
   │
   ├─ components/            UI, grouped by module/area
   │  ├─ app-chrome/         profile dropdown (shared chrome)
   │  ├─ dashboard/          sidebar (+ sidebar-account: account / wallet popovers), workspace-prompt (hero), command-palette (⌘K)
   │  ├─ credits/            Settings › Plan & pricing (User Panel V2 layouts): pricing-frame (sheet,
   │  │                      breadcrumb, pill tabs), plan-pricing-page, plans-panel, credits-panel,
   │  │                      billing-history, payment-method-panel, plan-banner (+ plan details),
   │  │                      checkout-page + order-summary + payment-picker (the checkout page),
   │  │                      buy-credits (the in-place shortfall dialog + auto top-up), invoice-view,
   │  │                      credit-alerts (Credit alerts and limits card), billing-details (card),
   │  │                      purchase-confirm (the "ask before a purchase over" confirm)
   │  ├─ support/            report-problem (the one Report a problem dialog + host)
   │  ├─ create/             build-shell/status, build-simulator, concept-chat,
   │  │                      chat-thread, confirm-build-dialog, credits-card,
   │  │                      history-*, image-editor/turn, prompt-bar, quota-card,
   │  │                      deliverable-previews (PCB/firmware/wiring/parts, derived),
   │  │                      spec-panel.tsx (the card's facts + Edit spec button),
   │  │                      spec-sheet.tsx + spec-sections.tsx (the part editor,
   │  │                      docked beside the canvas or an overlay), buttons.ts,
   │  │                      model-panel/ (the 3D tab: panel + view state, rail,
   │  │                      viewer controls, overlays, states, the r3f viewer)
   │  ├─ package/            ★ New Package flow — shell + step rail, the two canvas
   │  │                      editors (symbol/footprint), 3D placement, finalize,
   │  │                      confirmation, and the chrome both editors share
   │  ├─ parts/              Parts & Agile Module library page + part detail
   │  ├─ newsfeed/           newsfeed, project-card/grid, feed-controls, minted-badge
   │  ├─ innovations/        the post page (post-*), its product view, the post toast,
   │  │                      report dialog, the header's Shared chip; comments/ = DS M100
   │  ├─ projects/           my-projects + project-card; details/ (the project page: shell, SLOTS,
   │  │                      header, tabs, rail, activity/); product/ (the product page + Editor block);
   │  │                      listing/ (Add to marketplace, Relist, Close auction); editions/ (Physical
   │  │                      and Virtual NFT); earn/ (the Earn area; earn/sell/ the Sell copies
   │  │                      flow; earn/ladder/ the gating ladder's track, commit
   │  │                      checks, Verify identity (demo), Choose a license, Request payout);
   │  │                      business-plan/ (chip runner + page) — see
   │  │                      docs/guides/features/platform-and-projects.md
   │  ├─ marketplace/        Explore marketplace page + cards, the buyer view and rail, purchase,
   │  │                      bid dialogs, Ask the creator / Get creator support, demo-buyer banner
   │  ├─ blog/               Blog: list/, editor/ (TipTap, editor routes only), article/ (page, reader,
   │  │                      renderer, preview), send/ (Send for review, cover picker, Change cover)
   │  ├─ profile/            the creator profile: page, header, owner line, Made grid, Edit profile
   │  ├─ messages/           Messages: shell + acting line, list, conversation (header, context card,
   │  │                      timeline, composer), start view, report dialog
   │  ├─ settings/           Settings: frame, side-nav, cards and rows, choice dialog, home, the pages
   │  ├─ notifications/      the bell: notice feed hook (use-notices), panel, standalone bell (phone, editor)
   │  ├─ wallet/             Demo wallet provider + dialog, menu entry, mint-type field, cost rows, proof card
   │  ├─ network/            Add Network: add-network-dialog (the wizard), map-canvas +
   │  │                      map-editor (the connection canvas), link-panel, product-form,
   │  │                      network-settings-dialog, dialogs (frame, confirm, how-to-draw,
   │  │                      all-parameters), network-section (project page),
   │  │                      connection-map-page, summary, ui
   │  ├─ manual/             project-workspace (the editor gate: product scope, seed, banners) + step navigation
   │  ├─ product-flow/       cross-module step/flow provider
   │  ├─ video-jobs/         render jobs provider, browser clip renderer, player, Generate dialog, indicator
   │  ├─ brief/              the mint flow (the Brief, in Earn): mint-page (the route's states),
   │  │                      brief-app (the steps + the commit), brief-card (frame, step line),
   │  │                      step-choose · step-details · step-review · step-success,
   │  │                      use-brief-opens, prompt-help-modal (the Generate form's)
   │  ├─ pcb/                ★ PCB module (schematic + PCB editor) — see below
   │  ├─ code/               Code module: Monaco dev-editor + Blockly + AI chat
   │  ├─ 3d/                 3D module: model-viewer, AI generate, sketch, three canvas
   │  ├─ assembly/           Assembly module: the board's placed parts as a check-off list
   │  ├─ preview/            Product Preview: three.js assembly, mates, instances
   │  ├─ wiring/             Wiring module: canvas, library, right panel, menu
   │  ├─ voice/              voice-listening (what a composer becomes while the mic is
   │  │                      open — dot, live waveform, Cancel / Stop & review)
   │  ├─ ideeza/             In-house design-system primitives (button, select, toggle,
   │  │                      text-input, number-input, slider, banner, select-menu,
   │  │                      avatar, tag, skeleton, menu…)
   │  ├─ ui/                 shadcn-style primitives (badge, button, card, input)
   │  ├─ brand/              ideeza-logo
   │  └─ theme-provider.tsx
   │
   ├─ lib/                   Logic & data (no JSX-heavy UI)
   │  ├─ pcb/                ★ PCB engine (see below)
   │  ├─ settings/           Settings: registry (pages, crumbs, nav), rows/ (each page's
   │  │                      searchable rows), search, prefs (the ideeza:settings record) + use-settings,
   │  │                      audience (who can reach you, quiet mode, hidden words, people you've met)
   │  ├─ notifications/      the notice model: sources (builds, Blog, Messages, market, credits,
   │  │                      videos, comments), filter (settings, quiet hours, digest), read state
   │  ├─ support/            Report a problem: form rules, page names, recent
   │  │                      errors, image shrink/capture, openReportProblem()
   │  ├─ server/             server-only: Vercel Blob driver, report store
   │  ├─ package/            ★ New Package model: types (PackageDraft + gating +
   │  │                      units), store, wizard (24 families), kicad parsers,
   │  │                      library (save/publish, version lock)
   │  ├─ network/            types, catalog (the Figma tables), derive (roles, auto-fill,
   │  │                      diff, master change, blockers), planner (rule map, layout,
   │  │                      AI-answer validation), geometry, products, store,
   │  │                      from-concept (the concept network as the saved Network)
   │  ├─ create/             history.tsx (chats + build jobs), credits.tsx, credit-pricing.ts, credit-lots.ts
   │  │                      (credits ledger), credit-limits.ts (monthly spending, the limit, running low,
   │  │                      next expiry, confirm-above, auto top-up's decision), plans.ts + plan.tsx (the account's plan:
   │  │                      subscription, renewals, monthly credit grants), concept.ts (concept/parts model),
   │  │                      build-artifacts.ts (per-artifact build output),
   │  │                      plan.tsx (build-plan data)
   │  ├─ three/              providers.ts (image→3D), assembly.ts (the build as
   │  │                      an assembly of its parts: systems, placement,
   │  │                      explode, inventory), use-tokens.ts (DS colours for
   │  │                      three.js scenes)
   │  ├─ spec/               The product spec sheet — part bodies, packs,
   │  │                      size/board/power math, hint and snapshot checks, the
   │  │                      menu copy and part/radio/MCU tables, edit helpers and
   │  │                      what-it-does/pairing facts (types, units, batteries,
   │  │                      bodies, derive, hints, catalog, edits, facts, format).
   │  ├─ brief/              types.ts (the stored BriefState + its migration, the stored step),
   │  │                      mint-flow.ts (the mint flow's state, steps, draft read/write and
   │  │                      gates), project-brief.ts (the Brief read + the Outcome
   │  │                      card's derivation — see docs/guides/features/platform-and-projects.md), success-copy.ts (the
   │  │                      success step's pure copy), video-prompt.ts; gas.ts and wallet.ts re-export
   │  │                      commerce/gas.ts and commerce/collections.ts
   │  ├─ voice/              use-voice-input.ts (one dictation hook + its error copy, every box)
   │  ├─ dashboard/          refine.ts (prompt enhance)
   │  ├─ manual/             projects.tsx (manual project store), project-read.ts
   │  │                      (backward-compatible pure readers — versions, sourceOf,
   │  │                      coverOf), project-summary.ts (the one card/details
   │  │                      derivation), permissions.ts (can/deleteBlockOf), editor-work.ts
   │  │                      (editor progress facts), editor-scope/editor-docs (per-product editor
   │  │                      keys + documents), build-load(-io) (BUILDLOAD), readiness, edit-gate,
   │  │                      contributors, customers, ownership, journey(-store), business-plan(-store),
   │  │                      legal, save-step; guards.ts + use-write-guard.tsx (the write/delete guard
   │  │                      registry), record-hooks.ts, engineering-state.ts, public.ts (commerce's
   │  │                      one import of engineering)
   │  ├─ wiring/             types.ts, from-build.ts (a build's wiring document)
   │  ├─ code/               files.ts (Code's file model + a build's firmware)
   │  ├─ commerce/           the commerce layer (Build and Earn P1-1): guards, edit-gate, state
   │  │                      (commercialStateOf), record + migrate (ideeza:commerce:<id>,
   │  │                      commerce-split@1), gas, collections, ladder (earnLevelOf, commit levels),
   │  │                      kyc (the demo identity check), payout, license, share-copy, use-commerce;
   │  │                      market/ and wallet/ are its sub-layers
   │  ├─ market/             Explore marketplace: listings, sales, bids, auctions, editions,
   │  │                      sell-flow (the Sell copies flow's steps), fees, market-store (local "Testnet demo" data)
   │  ├─ wallet/             the demo wallet: identities, mint, balances, requests
   │  ├─ video/              product-video takes, IndexedDB clip store, frames, preview-clip job maths
   │  ├─ blog/               Blog: the model (doc, statuses, actions, demo review, list, slugs, cover),
   │  │                      the local store (ideeza:blog + rev'd bodies), IndexedDB files (ideeza-blog)
   │  ├─ people/             the creator profile's people layer: one person id and handles, profile
   │  │                      fields (ideeza:profile), the photo (IndexedDB), the Made list, headline prompt
   │  ├─ messages/           Messages: the model (rules, people, links, scam hint, support migration, demo seed),
   │  │                      the local store (ideeza:messages), IndexedDB files, acting-as, actions
   │  ├─ ui/                 tab-keys.ts (the keyboard rules every tablist shares)
   │  ├─ key-store.ts · storage-status.ts   one live localStorage key; refused-write reporting
   │  ├─ feed.ts · feed-image-manifest.ts   community-feed data
   │  ├─ innovations/        Innovations posts: types, sample posts, a shared project as a
   │  │                      post (mine-post), comments + store, reactions, slugs
   │  └─ utils.ts            shared helpers (cn, etc.)
   │
   └─ styles/
      ├─ tokens.css          design tokens (--color-* --spacing-* --radius-* …)
      ├─ reset.css           base reset + a few tokens
      └─ tailwind-preset.ts  Tailwind theme wired to the tokens
```

## ★ PCB module

The largest surface — the schematic + PCB editor. Logic in `lib/pcb`, UI in
`components/pcb`.

```
src/lib/pcb/
├─ store.tsx            State + actions + undo/redo + localStorage persistence (source of truth)
├─ types.ts             PcbState, PcbActions, CanvasObject, initialState, constants, DEMO objects
├─ data.tsx             (@ts-nocheck) builders: menus, toolbar, tree, context-menu — pure data
├─ schematic-to-pcb.ts  Native Schematic→PCB: footprints + ratsnest + auto-place + auto-route
│                       (`routeRatsnest(objs, w, RouteOpts)` — scope / net-class width / 45° mitre;
│                        `unrouteGenerated` turns routed copper back into airwires for a re-route)
├─ shape-boolean.ts     Boolean/Combine geometry (rasterize + marching-squares → polygon rings)
├─ suture-vias.ts       Stitching-via lattice planner (dialog preview + placement share it)
├─ pour.ts              Copper pour — region outline minus other-net copper (boolean)
├─ route-path.ts        Track path planner — corner style + obstacle policy
├─ board-parts.ts        Board's placed parts, shared by Assembly and the Editor
│                        rail's PCB fact (`boardPartsOf(doc)` — designator + footprint,
│                        top/bottom side)
├─ inspector-schema.ts  Schema-driven Properties inspector (panels + typed fields)
├─ icons.tsx · hicons.ts  DsIcon + Hugeicon/raw-SVG dictionaries
├─ part-catalog.ts      Parts + Agile-Module catalogue; rail queries, favourites/recents,
│                       user-authored parts (`readPersonalParts`) + captured modules
│                       (`readPersonalModules` / `allModules`)
├─ tool-labels.ts       Armed-tool names (from the palette's labels) + next-step hints
├─ app-settings.ts      The editor's one settings record `ideeza:pcb:appSettings` (v2): overlay
│                       pages + 3D dialog values, v1 migration, field-by-field repair, what each page does
├─ measurement-unit.ts  The one Measurement Unit default (mm/mil/inch) + who wins over it; read by
│                       the board, the schematic and Parts › New Package
├─ glb-export.ts        Board → three.js scene → glTF/GLB (GLTFExporter)
├─ gltf-import.ts       glTF/GLB import: GLTFLoader parse + session-only model registry
├─ dxf-import.ts        ASCII-DXF parser (LINE/POLYLINE/CIRCLE/ARC/TEXT) → CanvasObjects
├─ kicad-export.ts      KiCad/Gerber export
├─ design-rules-data.ts · colors.ts · content.ts · markup.ts · pcb-3d.ts

src/components/pcb/
├─ pcb-app.tsx          Shell composition (editor-shell + all panels)
├─ editor-shell.tsx     Full-viewport `.pcb-app` root (fixed, theme-aware)
├─ canvas-area.tsx      Canvas: pan/zoom, selection authority (mousedown), place/draft, grab-move
│                       + the left ToolPalette (SCHEM_TOOLS / PCB_TOOLS) and its portalled ToolFlyout
│                       + Crosshair guides (schematic) and the Ruler (board modes)
├─ placed-objects.tsx   Renders every CanvasObject (glyphs, wires, combine polygons)
├─ drc-markers.tsx      ERC/DRC findings as canvas markers (hover detail, panel pairing)
├─ splitter.tsx         Draggable panel edges (left/right/bottom → state.panelSizes)
├─ schem-canvas.tsx · pcb-canvas.tsx           schematic / PCB backdrops
├─ pcb-three-view*.tsx · pcb-meshes.tsx        3D board view (three.js)
├─ left-rail.tsx        module switcher (PCB/Code/3D/Assembly/Wiring/Preview/Brief)
├─ left-panel.tsx + project-navigator.tsx      Sheets/Nets/Parts/Objects + Library
├─ library-panel.tsx    Common Library + All Library marketplace
├─ right-panel.tsx + schem-properties.tsx / pcb-properties.tsx   Properties/Filter/Layer
│                       right-panel: InspectorPanel · MixedPanel · PositionPanel · Schematic/Pcb FilterTab · LayerTab
├─ toolbar.tsx (top) · menu-bar.tsx · top-bar.tsx
├─ context-menu.tsx     Canvas right-click (typed, portalled + clamped submenus)
├─ bottom-bar.tsx + bottom-content.tsx         Logs/Parts Audit/DRC/Find/Property List
├─ modals.tsx · modal-kit.tsx · pcb-manager-modals.tsx
├─ device-manager.tsx · footprint-manager.tsx
├─ settings-overlay.tsx · settings-pages.tsx · settings-pages-deep.tsx · settings-dialogs.tsx
└─ color-picker.tsx
```

## Conventions for placing new code

- **UI → `src/components/<module>/`**, **logic/data → `src/lib/<module>/`**. Keep JSX-heavy files in `components`, pure state/data/algorithms in `lib`.
- **Design-system primitives** live in `components/ideeza` (in-house) and `components/ui` (shadcn-style) — reuse before adding a one-off.
- **New route** → a folder under the right `app/` group with `page.tsx` (+ `layout.tsx` if needed). Read `node_modules/next/dist/docs/` first (modified Next).
- **New PCB placed object** → extend `CanvasObject` (`lib/pcb/types.ts`) + render in `placed-objects.tsx`; drive menus/toolbars from `lib/pcb/data.tsx`, not bespoke code.
- **Styling** → design tokens in `src/styles/tokens.css` + the `.ix-*` classes; never hardcode colours/spacing.
