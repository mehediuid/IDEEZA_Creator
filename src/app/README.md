# src/app — routes router

Next App Router (modified Next 16: read `node_modules/next/dist/docs/` before touching a route). What each URL does for the user: [docs/guides/app-map.md](../../docs/guides/app-map.md). Back to [docs/map/PRODUCT.md](../../docs/map/PRODUCT.md).

| Folder or file | What lives there | Read before changing |
|---|---|---|
| `layout.tsx`, `globals.css` | Root layout: every app-wide provider (theme, PCB store, manual projects, history, credits, plan, market, video jobs), the mounted `BuildSimulator`, the toast layers | [features/ai-create-flow.md](../../docs/guides/features/ai-create-flow.md) (simulator, toasts) |
| `(dashboard)/layout.tsx`, `(create)/layout.tsx` | The two dashboard shells: global sidebar, ⌘K palette, build attention toast | [features/platform-and-projects.md](../../docs/guides/features/platform-and-projects.md) |
| `(dashboard)/page.tsx` | `/` — home prompt (`components/dashboard/workspace-prompt.tsx`) | features/ai-create-flow.md |
| `(dashboard)/parts/`, `parts/new/`, `parts/[id]/` | `/parts` library, New Package flow, one part | [features/parts-package.md](../../docs/guides/features/parts-package.md) |
| `(dashboard)/innovations/`, `innovations/[slug]/` | Community feed and one feed project | features/platform-and-projects.md |
| `(create)/chat/[chatId]/` | Concept chat — the build also runs here | features/ai-create-flow.md |
| `(create)/build/[jobId]/`, `build/[jobId]/brief/` | Standalone build surface (only for a job whose chat is gone) and the build's Brief | features/ai-create-flow.md; [features/editor-modules.md](../../docs/guides/features/editor-modules.md) › Add Brief |
| `(create)/history/` | History: generations and the credits ledger | features/ai-create-flow.md |
| `(create)/projects/`, `projects/[id]/`, `projects/[id]/products/[productId]/`, `projects/[id]/network/` | My projects, Project details, product page, Connection Map | features/platform-and-projects.md; specs `2026-09-26-project-details-and-my-projects-design.md`, `2026-09-28-project-details-phase2-design.md` |
| `project/[projectSlug]/[step]/`, `project/[projectSlug]/layout.tsx` | The per-project editor host (`pcb · code · 3d · assembly · wiring · preview · brief`); the layout loads the PCB editor CSS | [pcb-architecture.md](../../docs/guides/pcb-architecture.md); [src/components/pcb/README.md](../components/pcb/README.md) |
| `pcb/`, `code/`, `3d/`, `preview/`, `wiring/`, `brief/` | Legacy flat routes: each page only redirects to the active project's `/project/<slug>/<step>` (`LegacyStepRedirect`). `pcb/` also holds `pcb-editor.css` and `fonts.css` | [ui-ux.md](../../docs/guides/ui-ux.md) (the `.ix-*` classes) |
| `api/concept/*`, `api/refine/`, `api/ai-chat/` | Keyless text + image model routes: concept summarize, companions, image generate/serve, prompt refine, module assistants | [docs/map/OPERATIONS.md](../../docs/map/OPERATIONS.md) (providers, env names) |
| `api/build/*`, `api/projects/*`, `api/generate/`, `api/feed/` | Synthetic build snapshot + retry, outcome/appreciate/save stubs, draft stub, feed pages | features/ai-create-flow.md |
| `api/three/generate/`, `api/network/automap/`, `api/kicad/` | Image→3D (Meshy when keyed), network AI Auto-Map, headless `kicad-cli` Gerber/DRC | docs/map/OPERATIONS.md |
