# Project Structure

Where everything lives in `ideeza-creator-panel`. For *what* the features do and
the conventions, see **[CLAUDE.md](CLAUDE.md)**; this file is the map of *where*.
Package manager: **pnpm** · framework: **Next.js 16 (App Router, modified)**.

> Keep this current: when you add/move/rename a folder or a significant file,
> update the tree below in the same change (mirrors CLAUDE.md §0).

```
ideeza-creator-panel/
├─ CLAUDE.md                 Project guide — features, conventions, UI/UX rules
├─ AGENTS.md                 "This is NOT the Next.js you know" (read next/docs first)
├─ STRUCTURE.md              This file
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
   │  │                      · refine · build/start · three/generate · and others)
   │  ├─ (dashboard)/        Home + Parts + Innovations
   │  │   ├─ page.tsx                 "/"  — dashboard home (AI prompt hero)
   │  │   ├─ parts/                   "/parts" — Parts & Agile Module library
   │  │   │   ├─ new/                 "/parts/new" — New Package authoring flow
   │  │   │   ├─ [id]/                "/parts/<id>" — one part + its land pattern
   │  │   │   └─ builds/              "/parts/builds" — the BOM of every finished build
   │  │   └─ innovations/[slug]/      community feed + detail
   │  ├─ (create)/           AI create flow
   │  │   ├─ projects/[id]/           "/projects" — My projects + details
   │  │   ├─ history/                 "/history"  — past generations
   │  │   ├─ chat/[chatId]/           concept chat
   │  │   └─ build/[jobId]/           AI build job (status → outputs)
   │  ├─ project/[projectSlug]/[step]/   per-project editor host (PCB/Code/3D/…)
   │  └─ pcb/ code/ 3d/ preview/ wiring/ brief/   module entry routes + pcb-editor.css
   │
   ├─ components/            UI, grouped by module/area
   │  ├─ app-chrome/         profile dropdown (shared chrome)
   │  ├─ dashboard/          sidebar, workspace-prompt (hero), command-palette (⌘K)
   │  ├─ create/             build-shell/status, build-simulator, concept-chat,
   │  │                      chat-thread, confirm-build-dialog, credits-card,
   │  │                      history-*, image-editor/turn, prompt-bar, quota-card,
   │  │                      deliverable-previews (PCB/firmware/wiring/parts, derived),
   │  │                      parts-page (/parts/builds — one BOM card per finished build)
   │  ├─ package/            ★ New Package flow — shell + step rail, the two canvas
   │  │                      editors (symbol/footprint), 3D placement, finalize,
   │  │                      confirmation, and the chrome both editors share
   │  ├─ parts/              Parts & Agile Module library page + part detail
   │  ├─ newsfeed/           newsfeed, project-card/grid, feed-controls, minted-badge
   │  ├─ projects/           my-projects, project-details
   │  ├─ manual/             manual project creation + step navigation
   │  ├─ product-flow/       cross-module step/flow provider
   │  ├─ video-jobs/         background render/video jobs + indicator
   │  ├─ brief/              Add Brief: brief-app (the intent-aware sequence) + brief-rail,
   │  │                      step-1-idea · step-2-video (preview) · step-3-mint (the form) ·
   │  │                      step-4-success, review-modal (preview / approve), regenerate-confirm,
   │  │                      prompt-help-modal, ar-record-panel
   │  ├─ pcb/                ★ PCB module (schematic + PCB editor) — see below
   │  ├─ code/               Code module: Monaco dev-editor + Blockly + AI chat
   │  ├─ 3d/                 3D module: model-viewer, AI generate, sketch, three canvas
   │  ├─ preview/            Product Preview: three.js assembly, mates, instances
   │  ├─ wiring/             Wiring module: canvas, library, right panel, menu
   │  ├─ voice/              voice-listening (what a composer becomes while the mic is
   │  │                      open — dot, live waveform, Cancel / Stop & review)
   │  ├─ ideeza/             In-house design-system primitives (button, select, toggle,
   │  │                      text-input, slider, banner, select-menu…)
   │  ├─ ui/                 shadcn-style primitives (badge, button, card, input)
   │  ├─ brand/              ideeza-logo
   │  └─ theme-provider.tsx · theme-toggle.tsx
   │
   ├─ lib/                   Logic & data (no JSX-heavy UI)
   │  ├─ pcb/                ★ PCB engine (see below)
   │  ├─ package/            ★ New Package model: types (PackageDraft + gating +
   │  │                      units), store, wizard (24 families), kicad parsers,
   │  │                      library (save/publish, version lock)
   │  ├─ create/             history.tsx (chats + build jobs), credits.tsx
   │  │                      (credits ledger), concept.ts (concept/parts model),
   │  │                      build-artifacts.ts (per-artifact build output),
   │  │                      plan.tsx (build-plan data)
   │  ├─ brief/              types.ts (BriefState + `stepsFor` / STEP_ORDER — the sequence
   │  │                      the wizard and the rail both read — + the stored-draft
   │  │                      migration), gas.ts, wallet.ts, video-prompt.ts, qr.ts
   │  ├─ voice/              use-voice-input.ts (one dictation hook + its error copy, every box)
   │  ├─ dashboard/          refine.ts (prompt enhance)
   │  ├─ manual/             projects.tsx (manual project store)
   │  ├─ three/              providers.ts (three.js setup)
   │  ├─ wiring/             types.ts
   │  ├─ feed.ts · feed-image-manifest.ts   community-feed data
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
├─ inspector-schema.ts  Schema-driven Properties inspector (panels + typed fields)
├─ icons.tsx · hicons.ts  DsIcon + Hugeicon/raw-SVG dictionaries
├─ part-catalog.ts      Parts + Agile-Module catalogue; rail queries, favourites/recents,
│                       user-authored parts (`readPersonalParts`) + captured modules
│                       (`readPersonalModules` / `allModules`)
├─ tool-labels.ts       Armed-tool names (from the palette's labels) + next-step hints
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
├─ left-rail.tsx        module switcher (PCB/Code/3D/Preview/Wiring/Brief)
├─ left-panel.tsx + project-navigator.tsx      Sheets/Nets/Parts/Objects + Library
├─ library-panel.tsx    Common Library + All Library marketplace
├─ right-panel.tsx + schem-properties.tsx / pcb-properties.tsx   Properties/Filter/Layer
│                       right-panel: InspectorPanel · MixedPanel · PositionPanel · Schematic/Pcb FilterTab · LayerTab
├─ toolbar.tsx (top) · menu-bar.tsx · top-bar.tsx
├─ context-menu.tsx     Canvas right-click (typed, portalled + clamped submenus)
├─ bottom-bar.tsx + bottom-content.tsx         Logs/Parts Audit/DRC/Find/Property List
├─ modals.tsx · modal-kit.tsx · pcb-manager-modals.tsx
├─ device-manager.tsx · footprint-manager.tsx
├─ settings-overlay.tsx · settings-pages.tsx · settings-pages-deep.tsx
└─ color-picker.tsx
```

## Conventions for placing new code

- **UI → `src/components/<module>/`**, **logic/data → `src/lib/<module>/`**. Keep JSX-heavy files in `components`, pure state/data/algorithms in `lib`.
- **Design-system primitives** live in `components/ideeza` (in-house) and `components/ui` (shadcn-style) — reuse before adding a one-off.
- **New route** → a folder under the right `app/` group with `page.tsx` (+ `layout.tsx` if needed). Read `node_modules/next/dist/docs/` first (modified Next).
- **New PCB placed object** → extend `CanvasObject` (`lib/pcb/types.ts`) + render in `placed-objects.tsx`; drive menus/toolbars from `lib/pcb/data.tsx`, not bespoke code.
- **Styling** → design tokens in `src/styles/tokens.css` + the `.ix-*` classes; never hardcode colours/spacing.
