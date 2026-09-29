# src/components — UI router

UI grouped by module; logic and data for the same module live in [src/lib/](../lib/README.md). Every folder here follows the [UI/UX hard rules](../../AGENTS.md#uiux-hard-rules). Back to [docs/map/PRODUCT.md](../../docs/map/PRODUCT.md).

| Folder or file | What lives there | Read before changing |
|---|---|---|
| `ideeza/` | In-house design-system atoms (Button, Select, Segmented, Checkbox, Banner, TextInput, Slider, ProgressBar…), exported from `index.ts` | [ui-ux.md](../../docs/guides/ui-ux.md) — the component notes |
| `ui/` | shadcn-style primitives (badge, button, card, input) | ui-ux.md |
| `theme-provider.tsx`, `theme-toggle.tsx`, `brand/`, `app-chrome/` | Light/dark theme, logo, profile dropdown | [features/platform-and-projects.md](../../docs/guides/features/platform-and-projects.md) |
| `dashboard/` | Global sidebar (+ phone drawer), home `workspace-prompt`, ⌘K `command-palette` | features/platform-and-projects.md; [features/ai-create-flow.md](../../docs/guides/features/ai-create-flow.md) |
| `create/` | AI flow: concept chat + rail + thread, setup turn, image turns, spec sheet, build gate, build rail/status/shell, `review-outputs`, credits, history, toasts, the mounted `build-simulator` | features/ai-create-flow.md; Part 4 spec |
| `create/model-panel/` | The review card's 3D tab: assembly viewer, rail, controls, states | features/ai-create-flow.md; spec `2026-09-25-3d-model-review-design.md` |
| `voice/` | `voice-listening` — a prompt box's listening state (presentational) | features/ai-create-flow.md › voice hook |
| `projects/` | My projects + cards; `details/` (the project page: shell, `slots.ts`, header, tabs, rail, `activity/`); `product/` (the product page, its Editor block, Load version); `listing/` (Add to marketplace, Relist, Close auction); `editions/` (Physical/Virtual NFT); `business-plan/` (chip runner, page) | features/platform-and-projects.md; project-details specs (phase 1 + [phase 2](../../docs/superpowers/specs/2026-09-28-project-details-phase2-design.md)) |
| `marketplace/` | Explore marketplace page and cards, the buyer view (`market-slots`, buyer rail), purchase, bid and support dialogs, the demo-buyer banner | features/platform-and-projects.md › Marketplace |
| `wallet/` | The Demo wallet provider and dialog, its menu entry, the shared mint-type field, cost rows, proof card and `use-mint` | features/platform-and-projects.md › Mint |
| `network/` | Add Network wizard, connection canvas, Connection Map page, project Network section | features/platform-and-projects.md; spec `2026-09-24-add-network-design.md` |
| `parts/`, `package/` | `/parts` library + part detail; the New Package flow (entry, symbol, footprint, 3D place, finalize) | [features/parts-package.md](../../docs/guides/features/parts-package.md) |
| `newsfeed/` | Innovations feed, cards, controls, minted badge | features/platform-and-projects.md |
| `pcb/` | The schematic + PCB editor | [pcb/README.md](pcb/README.md) |
| `code/`, `3d/`, `assembly/`, `wiring/`, `preview/` | The other editor modules (`code/ai-chat.tsx` is the assistant shared with PCB) | [features/editor-modules.md](../../docs/guides/features/editor-modules.md) (Assembly has no entry yet) |
| `brief/` | Add Brief: `brief-app` sequence, rail, steps 1–4, modals, AR hand-off | features/editor-modules.md › Add Brief |
| `video-jobs/` | Render jobs provider, the browser clip renderer, player, Generate dialog, global render indicator | features/platform-and-projects.md › Video |
| `manual/`, `product-flow/` | Per-project editor gate (`project-workspace`), step navigation, legacy-route redirect; cross-module flow provider | [app-map.md](../../docs/guides/app-map.md) |
