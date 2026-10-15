# App map (routes & navigation)

Moved verbatim from `CLAUDE.md` §3 on 2026-09-29. Keep it current: [AGENTS.md › Keeping docs current](../../AGENTS.md#keeping-docs-current-required). The code-side router is [src/app/README.md](../../src/app/README.md).

**Global shell** (`components/app-chrome`, `components/dashboard/sidebar`):
left sidebar nav — **Home · History · My projects · Parts & agile module ·
Explore marketplace · Innovations · Blog · Messages**; top bar — Search + **⌘K
command palette**, Tutorial / Tour guide / Help / Report, the sidebar's
**Upgrade to Builder / Disruptor** card, the profile popover (name, plan).

**Platform routes:**
- `/` — **Dashboard home**: "What will you build today?" AI prompt (Generate with AI / Build manually) + Browse Project cards.
- `/projects` — **My projects**: the only project index — tabs **All · Draft · Minted · Listed · Sold**, a **Showcase only** filter beside Sort, search and pagination (12 per page); each card is one link to its project and reads the live market data. Query: `tab`, `q`, `sort`, `showcase=1`, `page` (old `tab=private|given|showcase` still open).
- `/projects/[id]` (`?tab=media|network|team`, `?view=buyer`, `?view=contributor&as=<id>`, `?saved=<buildId>`) — **Project page**, engineering only: header (rename, Activity, the stage line, Review version, the one **Earn from this project** button), tabs **Products · Media · Network · Team**, and the rail **Details · Versions · Showcase · Project log · Manage**. Old links: `?tab=contributors` opens Team; `?list=1` redirects to `/projects/[id]/earn/sell?list=1` and `?tab=customers[&sale=]` to `/projects/[id]/earn/customers[?sale=]`. Preview as buyer still shows the buyer's page (status chip, Marketplace and Legal blocks).
- `/projects/[id]/earn`, `/projects/[id]/earn/[section]` (`sell` · `plan` · `money`; paths from `lib/manual/earn-route.ts`) — **Earn**, the owner's money side of one project, four tabs: Overview (the path and the current step), Sell (Your project with the listing flow, `?list=1`; `#copies`), Business plan, Money (`#splits`, `#customers` with `?sale=`, `#rights`). The old `editions`, `splits`, `customers` and `rights` addresses redirect to their part of a tab. See [features/earn-layer.md](features/earn-layer.md).
- `/projects/[id]/products/[productId]` (`?tab=`, `?v=`) — **Product page**: header with **Open in editor**, tabs **Media · 3D model · PCB · Firmware code · Wiring · Parts** (plus **Contributors** on the buyer's side), rail **Editor** (Load / Restore version; the buyer's side also reads **Marketplace**, the listed editions).
- `/projects/[id]/business-plan` — redirects to `/projects/[id]/earn/plan`, the project's seven-section **business plan** (owner): read, edit, versions, Regenerate.
- `/projects/[id]/network` — **Connection Map**: the project's network — read, Edit map, Settings, Delete (see *Add Network & Connection Map* in [features/platform-and-projects.md](features/platform-and-projects.md)).
- `/marketplace` — **Explore marketplace**: For sale · Sold · Purchased, with the *Shopping as* demo-buyer switch (all Testnet demo).
- `/marketplace/[id]`, `/marketplace/[id]/products/[productId]` — the buyer view of a listed project and its products: buyer rail, purchase, bids, holder features. A paused listing reads "off the marketplace for now" to anyone who holds none of it.
- `/messages`, `/messages/[conversationId]`, `/messages/new` (`?to=&project=&about=listing|purchase:<saleId>|team`, `?to=feed:<id>&post=<slug>`, `?team=<projectId>`; any of them `?as=<person>`) — **Messages**: the conversation list (Inbox · Requests) and one conversation, two panes from 1024 px; `new` finds the conversation an entry point names or drafts it. Demo identities in this browser; see [features/messages.md](features/messages.md).
- `/blog`, `/blog/new`, `/blog/[slug]`, `/blog/[slug]/edit`, `/blog/[slug]/preview`, `/blog/[slug]/read` (`/blog?q=&status=&reuse=&from=&to=&page=`) — **Blog**: your blogs (filters, calendar, Quick view), the editor (new or one blog), Blog details with its status and reject reasons, the draft in the reader view, and the reading view of the published version ("View to website"). A blog is found by the end of its id, so an old title's address still opens it; see [features/blog.md](features/blog.md).
- `/history` — **History**: Model Generations · Project/Product Generations.
- `/settings/plan` — **Plan & pricing** (User Panel V2 layouts on the DS): Available plan (the default: Tinkerer · Builder · Disruptor cards and a wide Free card, monthly or annual, Compare plans, Pricing FAQs) · Credits (`?tab=credits`: packs, custom amount, balance → credit history) · Billing history (`?tab=billing`: every payment, each with its invoice) · Payment method (`?tab=payment`: the demo wallet and the default token). Your plan banner (View details) over Billing history and Payment method.
- `/settings/plan/checkout` (`?plan=builder&cycle=monthly`, `?pack=pro`, `?credits=80`) — **Payment details**: how to pay | the order, then Upgrade completed / Payment successful / Payment failed.
- `/settings/plan/invoice/[orderId]` — one payment's **invoice**, printable or saved as PDF.
- `/parts` — **Parts & Agile Module**: the catalogue, captured Agile Modules, and the packages you have authored.
- `/parts/new` — **New Package flow**: Package → Symbol → Footprint → 3D Place → Finalize (full-viewport).
- `/parts/[id]` — one part, with its land pattern.
- `/creators/[handle]` — **a creator's profile**: what they made and put out (shared or on sale), its current Activity, Follow · Message · ⋯ for someone else, Edit profile and one owner-only line for you; `/creators/me` is yours. See [features/platform-and-projects.md](features/platform-and-projects.md) › Creator profile.
- `/innovations` — **community feed** (Discover/Following, categories, minted badges, Shared by you).
- `/innovations/[slug]` — **one post**: a sample feed project, or this browser's shared project (`<name>-<id tail>`); `?focus=comments` and `#comment-<id>` deep-link into the thread. `/innovations/[slug]/products/[productId]` — one product of the post.
- `/(create)/chat/[chatId]`, `/(create)/build/[jobId]` — **AI concept chat → build job**.
- `/(create)/build/[jobId]/brief` — the old address of a saved build's Brief: it redirects to its project's mint flow (below). A ready build no project holds goes to `/build/[jobId]?save=1`; a still-building job goes back to its chat (or to `/build/[jobId]` when the chat is gone).
- `/(create)/projects/[id]/earn/mint` — **the mint flow** (the Brief, Build and Earn P1-2; `earnMintHref`): Choose · Details · Review and sign · Success, opened from Earn › Overview and Earn › Sell (Start mint · Continue mint · Open the mint summary). A static segment, so it wins over `earn/[section]`. A minted Brief opens read-only on its success step; a project minted from its page says it is already minted.

**Per-project editor** — `/project/[projectSlug]/products/[productId]/[step]` (the editor opens one product; `/project/[projectSlug]/[step]` redirects to the product last opened, and `/project/[projectSlug]/brief` redirects to the project's mint flow); the left rail switches
modules in `FLOW_STEPS` order (`src/lib/manual/projects.tsx`): **PCB Design · Code · 3D Module · Assembly · Peripheral Wiring · Product Preview · Add Brief**.

**Monetization:** **minting** (Utility NFT, Lazy or Instant), the Explore marketplace with a 2.5 % IDEEZA fee, all on a local **demo wallet** (Testnet demo, nothing touches a chain); plans and AI credits paid from the same wallet (Settings › Plan & pricing).

**API:** `/api/business-plan/section` writes one business-plan section (keyless text model; 503 on failure, never filler). `/api/reports` keeps a problem report from the Report a problem dialog (private Blob store, or disk locally; 400 for a body that isn't a report, idempotent per report id).
