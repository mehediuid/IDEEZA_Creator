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
| `projects/` | My projects + cards; `details/` (the project page: shell, `slots.ts`, header, tabs, rail, `activity/`); `product/` (the product page, its Editor block, Load version); `listing/` (Add to marketplace, Relist, Close auction, the edit-pause dialog); `editions/` (Physical/Virtual NFT); `business-plan/` (chip runner, page) | features/platform-and-projects.md; project-details specs (phase 1 + [phase 2](../../docs/superpowers/specs/2026-09-28-project-details-phase2-design.md)) |
| `marketplace/` | Explore marketplace page and cards, the buyer view (`market-slots`, buyer rail), purchase and bid dialogs, Ask the creator / Get creator support, the demo-buyer banner | features/platform-and-projects.md › Marketplace |
| `commerce/` | `commerce-root.tsx`: mounted once in the root layout; registers commerce's guards and the projects store's record hooks, runs the `commerce-split@1` migration | spec `2026-10-11-build-earn-p1-design.md` › P1-1 |
| `wallet/` | The Demo wallet provider and dialog, its menu entry, the shared mint-type field, cost rows, proof card and `use-mint` | features/platform-and-projects.md › Mint |
| `network/` | Add Network wizard, connection canvas, Connection Map page, project Network section | features/platform-and-projects.md; spec `2026-09-24-add-network-design.md` |
| `parts/`, `package/` | `/parts` library + part detail; the New Package flow (entry, symbol, footprint, 3D place, finalize) | [features/parts-package.md](../../docs/guides/features/parts-package.md) |
| `messages/` | Messages: the shell (Acting as, the two panes), the conversation list, one conversation (header, request bar, context card, timeline, composer), the start view behind `/messages/new`, the settings and report dialogs | [features/messages.md](../../docs/guides/features/messages.md); spec `2026-10-13-messages-design.md` |
| `blog/` | Blog: the list (`list/`), the TipTap editor (`editor/`, the only TipTap importer), the article page, reader view, renderer and preview (`article/`), Send for review, the cover picker, topics and Change cover (`send/`), and the shared status badges, cover image, article actions and tab title | [features/blog.md](../../docs/guides/features/blog.md); spec `2026-10-14-blog-design.md` |
| `newsfeed/` | Innovations feed, cards, controls, minted badge, the post's creator row (Message) | features/platform-and-projects.md |
| `pcb/` | The schematic + PCB editor | [pcb/README.md](pcb/README.md) |
| `code/`, `3d/`, `assembly/`, `wiring/`, `preview/` | The other editor modules (`code/ai-chat.tsx` is the assistant shared with PCB) | [features/editor-modules.md](../../docs/guides/features/editor-modules.md) (Assembly has no entry yet) |
| `brief/` | The mint flow (the Brief, in Earn): `mint-page`, `brief-app` (steps + commit), `brief-card`, the Choose · Details · Review · Success steps, the route's guard (`use-brief-opens`), Prompt Help | features/editor-modules.md › The mint flow |
| `video-jobs/` | Render jobs provider, the browser clip renderer, player, Generate dialog, global render indicator | features/platform-and-projects.md › Video |
| `manual/`, `product-flow/` | Per-project editor gate (`project-workspace`), step navigation, legacy-route redirect; cross-module flow provider | [app-map.md](../../docs/guides/app-map.md) |
