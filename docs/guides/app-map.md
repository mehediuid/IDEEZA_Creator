# App map (routes & navigation)

Moved verbatim from `CLAUDE.md` §3 on 2026-09-29. Keep it current: [AGENTS.md › Keeping docs current](../../AGENTS.md#keeping-docs-current-required). The code-side router is [src/app/README.md](../../src/app/README.md).

**Global shell** (`components/app-chrome`, `components/dashboard/sidebar`):
left sidebar nav — **Home · History · My projects · Parts & agile module ·
Explore marketplace · Innovations · Messages · Blog**; top bar — Search + **⌘K
command palette**, Upgrade to Pro, Tutorial / Tour guide / Help / Report,
profile dropdown, plan badge (Free/Pro).

**Platform routes:**
- `/` — **Dashboard home**: "What will you build today?" AI prompt (Generate with AI / Build manually) + Browse Project cards.
- `/projects` — **My projects**: the only project index — tabs **All · Draft · Private · Given · Listed**, then a **Showcase** membership tab after a divider (a project's own `showcasedAt` flag, not a status); search, a Source facet (AI build · By hand), sort and pagination (12 per page).
- `/projects/[id]` (`?tab=media|network`, `?view=buyer`) — **Project details**: one project's dossier and the home of every project action — inline rename/description, one action pair from `nextAction()`, **Preview as buyer**; tabs **Products · Media · Network**; the rail carries Outcome (incl. the Showcase row), Editor progress, Details, **Versions** (the one version history) and Manage (Delete, blocked with its reason on a Listed project).
- `/projects/[id]/products/[productId]` (`?tab=`, `?v=`) — **Product page**: one product's deliverables at a chosen version — **3D model · PCB · Firmware code · Wiring · Parts** — the booked, read-only snapshot (the build-lock rule); no action buttons.
- `/projects/[id]/network` — **Connection Map**: the project's network — read, Edit map, Settings, Delete (see *Add Network & Connection Map* in [features/platform-and-projects.md](features/platform-and-projects.md)).
- `/history` — **History**: Model Generations · Project/Product Generations.
- `/parts` — **Parts & Agile Module**: the catalogue, captured Agile Modules, and the packages you have authored.
- `/parts/new` — **New Package flow**: Package → Symbol → Footprint → 3D Place → Finalize (full-viewport).
- `/parts/[id]` — one part, with its land pattern.
- `/innovations`, `/innovations/[slug]` — **community feed** (Discover/Following, categories, minted badges).
- `/(create)/chat/[chatId]`, `/(create)/build/[jobId]` — **AI concept chat → build job**.
- `/(create)/build/[jobId]/brief` — **the build's Brief**, opened from the review card's **Add Brief** once Save has made the project: the same dashboard shell as the review surface (global sidebar, a "← Back" link to the build's chat over one card, a one-line *Step N of 4* in place of the step rail). A still-building job goes back to its chat (or to `/build/[jobId]` when the chat is gone).

**Per-project editor** — `/project/[projectSlug]/[step]`; the left rail switches
modules in `FLOW_STEPS` order (`src/lib/manual/projects.tsx`): **PCB Design · Code · 3D Module · Assembly · Peripheral Wiring · Product Preview · Add Brief**.

**Monetization:** on-chain **minting** (Utility NFT) — "no wallet or KYC to
start, only when you sell"; Upgrade to Pro; marketplace.
