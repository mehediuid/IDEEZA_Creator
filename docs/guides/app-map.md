# App map (routes & navigation)

Moved verbatim from `CLAUDE.md` §3 on 2026-09-29. Keep it current: [AGENTS.md › Keeping docs current](../../AGENTS.md#keeping-docs-current-required). The code-side router is [src/app/README.md](../../src/app/README.md).

**Global shell** (`components/app-chrome`, `components/dashboard/sidebar`):
left sidebar nav — **Home · History · My projects · Parts & agile module ·
Explore marketplace · Innovations · Messages · Blog**; top bar — Search + **⌘K
command palette**, Upgrade to Pro, Tutorial / Tour guide / Help / Report,
profile dropdown, plan badge (Free/Pro).

**Platform routes:**
- `/` — **Dashboard home**: "What will you build today?" AI prompt (Generate with AI / Build manually) + Browse Project cards.
- `/projects` — **My projects**: the only project index — tabs **All · Draft · Private · Given · Listed · Sold**, then a **Showcase** membership tab; search, a Source facet (AI build · By hand), sort and pagination (12 per page); cards read the live market data.
- `/projects/[id]` (`?tab=media|network|contributors|customers`, `?view=buyer`, `?view=contributor&as=<id>`, `?list=1`, `?saved=<buildId>`) — **Project page**: header (rename, Activity, Business plan chips, one action pair, Preview as buyer), tabs **Products · Media · Network · Contributors · Customers**, and the rail **Marketplace · Outcome · Details · Legal · Versions · Project log · Manage**.
- `/projects/[id]/products/[productId]` (`?tab=`, `?v=`) — **Product page**: header with **Open in editor**, tabs **Media · 3D model · PCB · Firmware code · Wiring · Parts · Contributors · Customers**, rail **Marketplace** (Physical/Virtual editions) and **Editor** (Load / Restore version).
- `/projects/[id]/business-plan` — the project's seven-section **business plan** (owner): read, edit, versions, Regenerate.
- `/projects/[id]/network` — **Connection Map**: the project's network — read, Edit map, Settings, Delete (see *Add Network & Connection Map* in [features/platform-and-projects.md](features/platform-and-projects.md)).
- `/marketplace` — **Explore marketplace**: For sale · Sold · Purchased, with the *Shopping as* demo-buyer switch (all Testnet demo).
- `/marketplace/[id]`, `/marketplace/[id]/products/[productId]` — the buyer view of a listed project and its products: buyer rail, purchase, bids, holder features.
- `/history` — **History**: Model Generations · Project/Product Generations.
- `/parts` — **Parts & Agile Module**: the catalogue, captured Agile Modules, and the packages you have authored.
- `/parts/new` — **New Package flow**: Package → Symbol → Footprint → 3D Place → Finalize (full-viewport).
- `/parts/[id]` — one part, with its land pattern.
- `/innovations`, `/innovations/[slug]` — **community feed** (Discover/Following, categories, minted badges).
- `/(create)/chat/[chatId]`, `/(create)/build/[jobId]` — **AI concept chat → build job**.
- `/(create)/build/[jobId]/brief` — **the build's Brief**, opened from the review card's **Add Brief** once Save has made the project: the same dashboard shell as the review surface (global sidebar, a "← Back" link to the build's chat over one card, a one-line *Step N of 4* in place of the step rail). A still-building job goes back to its chat (or to `/build/[jobId]` when the chat is gone).

**Per-project editor** — `/project/[projectSlug]/products/[productId]/[step]` (the editor opens one product; `/project/[projectSlug]/[step]` redirects to the product last opened, and `/project/[projectSlug]/brief` is the project-level Brief); the left rail switches
modules in `FLOW_STEPS` order (`src/lib/manual/projects.tsx`): **PCB Design · Code · 3D Module · Assembly · Peripheral Wiring · Product Preview · Add Brief**.

**Monetization:** **minting** (Utility NFT, Lazy or Instant), the Explore marketplace with a 2.5 % IDEEZA fee, all on a local **demo wallet** (Testnet demo, nothing touches a chain); Upgrade to Pro.

**API:** `/api/business-plan/section` writes one business-plan section (keyless text model; 503 on failure, never filler).
