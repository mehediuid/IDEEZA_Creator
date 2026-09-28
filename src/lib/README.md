# src/lib — logic & data router

Pure state, data and algorithms (JSX-light); the UI for each module lives in [src/components/](../components/README.md). There is no backend: stores persist to `localStorage` under `ideeza:*` keys and shape-check what they read. Pure modules are unit-tested by `npm run test:projects` ([tests/projects/](../../tests/projects/)). Back to [docs/map/PRODUCT.md](../../docs/map/PRODUCT.md).

| Folder or file | What lives there | Read before changing |
|---|---|---|
| `pcb/` | The schematic + PCB engine: store, types, builders, nets/ERC, Schematic→PCB, DRC, routing, exporters | [src/components/pcb/README.md](../components/pcb/README.md); [pcb-architecture.md](../../docs/guides/pcb-architecture.md) |
| `create/` | AI flow: build history + queue (`history.tsx`), credits ledger, concept model, companions, confidence, build artifacts, image generation + storage, project state for chat and rail | [features/ai-create-flow.md](../../docs/guides/features/ai-create-flow.md) |
| `spec/` | The product spec sheet: part bodies, packs, size/board/power math, hints, catalog, edits, facts | features/ai-create-flow.md › spec sheet; spec `2026-09-25-product-spec-sheet-design.md` |
| `three/` | Image→3D providers (server), the build as an assembly (`assembly.ts`), the 3D module's scene document, DS colours for three.js | features/ai-create-flow.md › 3D tab; [features/editor-modules.md](../../docs/guides/features/editor-modules.md) |
| `manual/` | Projects: the `ManualProject` store (`projects.tsx`, `FLOW_STEPS`), pure readers, summary, permissions, edit gate, readiness, delete plan, contributors, BUILDLOAD (editors filled from the build) | [features/platform-and-projects.md](../../docs/guides/features/platform-and-projects.md); spec `2026-09-28-project-details-phase2-design.md` |
| `market/`, `wallet/` | Explore marketplace (listings, sales, bids, auctions, editions, fees) and the demo wallet (identities, mint, balances): local, labelled *Testnet demo* data | spec `2026-09-28-project-details-phase2-design.md` |
| `video/` | Product-video takes, frames and the preview-clip job maths | features/editor-modules.md › Add Brief |
| `brief/` | Brief state + `stepsFor` / `STEP_ORDER`, the project Brief read (`project-brief.ts`), success copy, gas, wallet, QR | features/editor-modules.md › Add Brief |
| `network/` | Add Network: types, Figma catalog, derive, planner, geometry, products, store (`ideeza:network:<projectId>`) | features/platform-and-projects.md › Add Network |
| `package/` | New Package model: `PackageDraft` + gating, store, wizard families, KiCad parsers, library save/publish | [features/parts-package.md](../../docs/guides/features/parts-package.md) |
| `wiring/`, `code/` | Wiring types + a build's wiring document; Code's file model + a build's firmware | features/editor-modules.md |
| `voice/` | `use-voice-input.ts` — the one dictation hook | features/ai-create-flow.md › voice hook |
| `dashboard/` | `refine.ts` — templated prompt refinement (stub-only, per its header) | features/ai-create-flow.md |
| `ui/` | `tab-keys.ts` — the keyboard rules every tablist shares | [ui-ux.md](../../docs/guides/ui-ux.md) |
| `key-store.ts`, `storage-status.ts` | One live `localStorage` key (`useSyncExternalStore`); refused-write reporting | spec `2026-09-28-project-details-phase2-design.md` |
| `feed.ts`, `feed-image-manifest.ts` | Innovations feed data; the manifest is **generated** by `scripts/generate-feed-images.mjs` | [docs/map/OPERATIONS.md](../../docs/map/OPERATIONS.md) |
| `utils.ts` | `cn` and shared formatting helpers | — |
