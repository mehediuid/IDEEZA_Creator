# Product map — code area → router → features guide

Start here for any code change: open the area's router, then only the files it names. What exists today is in the features guide; the design intent is in the spec ([DOCS.md](DOCS.md)). Rules: [AGENTS.md](../../AGENTS.md).

| Task | Where | Notes |
|---|---|---|
| Find which route renders what | [src/app/README.md](../../src/app/README.md) | URL-level behaviour: [app-map.md](../guides/app-map.md) |
| Find a component or UI module | [src/components/README.md](../../src/components/README.md) | UI rules: [ui-ux.md](../guides/ui-ux.md) |
| Find a store, model or algorithm | [src/lib/README.md](../../src/lib/README.md) | Stores persist to `localStorage` (`ideeza:*`) |
| Global shell: sidebar, phone drawer, ⌘K, theme | `src/components/dashboard/`, `theme-provider.tsx` | [features/platform-and-projects.md](../guides/features/platform-and-projects.md) › Platform & shell |
| Home prompt, concept chat, build, review card, credits, history, toasts | `src/components/create/`, `src/lib/create/` | [features/ai-create-flow.md](../guides/features/ai-create-flow.md); Part 4 spec |
| Product spec sheet | `src/lib/spec/`, `src/components/create/spec-*.tsx` | features/ai-create-flow.md; spec `2026-09-25-product-spec-sheet-design.md` |
| Build review's 3D tab | `src/components/create/model-panel/`, `src/lib/three/assembly.ts` | features/ai-create-flow.md; spec `2026-09-25-3d-model-review-design.md` |
| My projects, Project details, product page | `src/components/projects/`, `src/lib/manual/` | features/platform-and-projects.md; project-details specs (phase 1 + 2) |
| Marketplace listings, sales, demo wallet, minting | `src/lib/market/`, `src/lib/wallet/`, `src/lib/brief/` | Phase 2 spec; all *Testnet demo* data |
| Add Network & Connection Map | `src/components/network/`, `src/lib/network/` | features/platform-and-projects.md; spec `2026-09-24-add-network-design.md` |
| Parts library, New Package flow, land patterns | `src/components/parts/`, `src/components/package/`, `src/lib/package/` | [features/parts-package.md](../guides/features/parts-package.md) |
| Schematic + PCB editor | [src/components/pcb/README.md](../../src/components/pcb/README.md) | [pcb-architecture.md](../guides/pcb-architecture.md); features pcb-schematic / pcb-board / pcb-tools-menus-panels |
| Code, 3D, Assembly, Wiring, Preview modules | `src/components/{code,3d,assembly,wiring,preview}/` | [features/editor-modules.md](../guides/features/editor-modules.md) (Assembly not inventoried) |
| Add Brief (idea → video → mint / give / save) | `src/components/brief/`, `src/lib/brief/`, `src/lib/video/` | features/editor-modules.md › Add Brief |
| Innovations feed | `src/components/newsfeed/`, `src/lib/feed.ts`, `src/app/api/feed/` | features/platform-and-projects.md |
| Voice dictation | `src/lib/voice/use-voice-input.ts`, `src/components/voice/` | features/ai-create-flow.md |
| Design tokens and atoms | `src/styles/` (`tokens.css`, `tailwind-preset.ts`), `src/components/ideeza/` | [ui-ux.md](../guides/ui-ux.md) |
| Static assets that ship (`public/`) | `public/images/`, `public/innovations/` (generated feed art), `public/models/` | [OPERATIONS.md](OPERATIONS.md) › feed images |
| Whole-app folder tree | [STRUCTURE.md](../../STRUCTURE.md) | Annotated tree; the routers above are the task view |
| The full feature inventory | [docs/guides/features/](../guides/features/README.md) | Update in the same change as the feature |
