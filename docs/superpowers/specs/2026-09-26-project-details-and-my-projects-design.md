# Project details and My projects — design spec

The final design for the two pages a saved project lives on. It merges the
owner's old Figma requirements with the new research, and it is the contract
the implementation plan builds from. The owner answered the eight questions
on 2026-09-26; the answers are final, recorded in §10, and folded in throughout
(§2 O5–O12).

Branch `feat/project-details`, read at main `0a5d4f4`.

---

## 1. Goal and sources

**Goal.** One design, best UX, for:
- **My projects** (`/projects`) — the only index of projects;
- **Project details** (`/projects/[id]`) — one project's dossier, and the home
  of every project action;
- **the product page** (`/projects/[id]/products/[productId]`, new) — one
  product's deliverables.

**The owner's requests**
- 2026-09-25: *"ekta project jokhon save hoy tokhon seta my project a chole
  jay. my project a project details niye plan ready koro. Deep analysis
  koro."* When a project is saved it goes to My projects; plan the project
  details page there, with deep analysis.
- 2026-09-26, sharing Figma node `41505:144254`: *"ekhane amader ager sob
  requirement ache. requirement ekhan theke niye new plan ready koro. Best UX
  hobe. sob notun puraton miliye final korte hobe."* All our old requirements
  are here. Take them, make a new plan, best UX, and merge the new and the old
  into one final version.

**Figma (the old requirements).** File `HDtWAU2PSbjQKlEWgHI3ev` ("User Panel -
V2"):

| Node | What it holds | Frames |
|---|---|---|
| section `41505:144254` "Project Details and Add Activity" | the base page, wallet and mint states, Activity History drawer, Add / Edit Activity, validation, buyer mode | 31, all 1440 × 1392 |
| canvas `16838:306201` "✅ Project Details" | 28 more sections: Ownership Status, Contributors, Customers, Delete Project, Media, buyer mode, Contributed Project, Edit title & description, Premium Parts, Commenting, Create virtual NFT, Create Physical NFT, Add to Marketplace, Add product flow, Temporary pause, Share to feed or Marketplace, Share to social media, Purchased flows, Product Purchased, Sold, Utility NFT, Restriction Warning, profile cards, Add Network, protocol views, Edit project, Contributor status, Business Plan | 220 |
| section `16838:392921` "My project" | the list: tabs, filters, sort, cards, pagination, Draft tab, Utility NFTs, loading (e.g. `16838:392922`) | 11 |
| frame `28015:130155` (in Ownership Status) | the older Project Details base page | — |

`map.md` maps the first row; `map2.md` maps the other 29 sections (231
frames). The re-pass verified every My project, Contributors and Network frame against
fresh screenshots. Frame ids below: a bare 6-digit number is the suffix of
`41505:<n>`; any other id is written in full.

**The owner's PDF spec.**
`~/Downloads/Ideeza/Creator/IDEEZA-Creator-Panel-Design-Proposal-v1.0.pdf`,
**Part 3 "My projects — NEXT PHASE"** (lines 452–458), which was never
designed. It asks for:
1. the project list or grid, and how it differs from Home;
2. the project states — draft (off-chain), minted (showcased), listed (for
   sale) — and how each looks;
3. the per-project actions — open, edit, showcase, sell, share — and which
   need mint or KYC;
4. filters, sorting, search, and the empty state for a maker with no projects;
5. how the view scales for power users ("the overview the home intentionally
   defers").

Also binding from the same file and its Part 4 addendum
(`IDEEZA-Part4-AI-Flow-Spec-v1.1.md`): Part 4.1's outcomes (Private ·
Showcase · Give · Sell — owner decision O5 makes Showcase an action on any
outcome rather than an outcome of its own), §4.7 (the project overview lists every product; each
product opens into its own tabs; the project level carries all badges, the
combined BOM, compatibility results and assembly docs), §4.4.9 (the headline
badge is the lowest tier) and §4.8 (a second generation from the same concept
is a new version; the previous output is preserved).

**The research (the new requirements).** `.superpowers/pd/research/` (local,
gitignored): `a11y-perf`, `actions-ia`, `brief-mint`, `comp-cad`, `comp-eda`,
`comp-maker`, `comp-mfg`, `critique`, `cur-details`, `data-gaps`,
`deliverables`, `design-system`, `editor-flow`, `figma`, `history`,
`history-page`, `lifecycle`, `mobile`, `network`, `public-view`, `roadmap`,
`save-flow`, `spec-files`, `ux-patterns`; the ledger `progress.md` for
`cur-list`, `data-model`, `rules` and `jira`; a read-only JQL read of the live
app's Jira project PR; and the Confluence page "v2: Fractional NFT and
Contributors Business Logic".

**The area files this spec merges** (`.superpowers/pd/final/`, local):

| File | Prefix | Requirements | Their own NOW · NEXT · LATER |
|---|---|---|---|
| `core.md` — page skeleton, states, data layer | COR | 104 | 78 · 15 · 11 |
| `list.md` — My projects | LST | 64 | 39 · 11 · 14 |
| `people.md` — ownership, contributors, customers, buyer mode | PPL | 57 | 9 · 1 · 47 |
| `commerce.md` — mint, NFTs, marketplace | COM | 54 | 22 · 9 · 23 |
| `content.md` — title, media, video, share, comments, premium parts, business plan | CNT | 83 | 23 · 30 · 30 |
| `../figma/activity-consolidated.md` — the Activity section | ACT | 98 | 42 real-now · 33 needs-model · 23 needs-backend |

`core.md` §2.5 overrides the other files where they disagree; §7 below lists
every cross-file resolution this spec makes.

**The phases.**
- **NOW** — real in the Creator today, or cheap to add honestly, including the
  small model additions owner decisions O2, O4, O5 and O9 require.
- **NEXT** — needs a new local store or model field.
- **LATER** — needs auth, a chain, payments or a backend.

---

## 2. Decisions already made by the owner

| # | Decision | Source | What it fixes in this design |
|---|---|---|---|
| O1 | **Both pages.** The scope is the My projects list and the Project details page. | Request of 2026-09-25; consolidation decision 1 | §3 designs both, and one shared derivation (`projectSummary`, LST-32) feeds the list card and the details page, so they can't disagree. |
| O2 | **Rebuild → v2.** The same chat rebuilt and saved again becomes the **same project, version 2**; older versions are kept. | Consolidation decision 2 (final) | A version is a saved build of one chat lineage (COR-39). The fork that made a same-named twin project is fixed at save (§5.1.8). A build from a *different* chat that joins the project starts its own lineage at version 1. The Part 4 addendum's §4.8 agrees; the PDF's line 498 ("a new AI build means a new project") still holds for a new chat. |
| O3 | **Real now, plus a roadmap.** Build what is real now; everything else goes on the roadmap, with no fake data. Marketplace and NFT surfaces come back only when the Brief/mint data is real. Contributors and comments need auth and a backend. | Consolidation decision 3 | NOW (§5) builds only what the local stores answer. A tab, row or control with nothing real behind it is **absent**, never empty, disabled for no reason, or "coming soon". NEXT and LATER (§6) name the store or service each item waits for. |
| O4 | **Progress from real data.** Editor progress is derived from the project's own editor documents, not from a flag. | Consolidation decision 4 | `flowState` is no longer read for progress (COR-64). The Editor block shows facts such as "42 objects · 12 on the board" (COR-60), never "Done", "Not started" or "n of 7". |
| O5 | **Showcase is an action, not a Brief intent.** It can be taken after any save (Private, Give or Sell) from a CTA on the Brief's success step, and from its own option on the project page; it can be undone. | Owner decisions of 2026-09-26, answer 1 (§10) | The status is the outcome — **Draft · Private · Given · Listed · Minted**. Showcase is a separate flag on the project, `showcasedAt` (COR-105), shown as a **Showcase** badge beside the status chip and as the **Showcase** tab of My projects (LST-10, LST-65). Its two entry points: the Brief's success step (COM-56) and the Showcase row of the rail's Outcome block (COM-55), each with **Stop showcasing** / **Undo**. The Brief keeps its three intents. |
| O6 | **"Listed" is the word for a minted sale**, kept honest by its subline. | answer 2 | The chip, tab and status word are **Listed**, always with *"Goes on sale when the marketplace opens"* until a marketplace exists (§4). |
| O7 | **Network is its own tab**: Products · Media · Network. | answer 3 | COR-19, COR-45; §3.3, §3.6. |
| O8 | **Each product has its own product page.** | answer 4 | `/projects/[id]/products/[productId]` (COR-30…41, §3.4). |
| O9 | **A product a rebuild drops stays in the current list, and the project keeps a version history.** | answer 5 | The dropped product stays on the Products tab, marked *"Not in version 2 · from version 1"*, and its page opens at version 1 (COR-108). A **Versions** block in the rail is the one version history: each version's date, its chat and build, the products it added, dropped and changed, its piece count, and a link to each of its products (COR-106, COR-107). The product page's version select reads the same list (COR-41). |
| O10 | **Delete is blocked while someone else is an owner, or while the project is for sale on the marketplace or sold.** | answer 6 | NOW a **Listed** project can't be deleted: the Delete control stays, with the reason beside it (COR-67, COR-70). LATER the same block covers co-owners, contributors holding a share and a sold project (§4.2, PPL-22, COR-83). A deletable project keeps the recommended friction: the typed name only when something can't be rebuilt (COR-69). |
| O11 | **"New project" is a header button on My projects that goes to Home.** | answer 7 | LST-2. |
| O12 | **The buyer view shows previews only** — 3D, PCB, wiring and the parts list; firmware source and downloads come after purchase. | answer 8 | PPL-7, and Preview as buyer NOW. |

**The build-lock rule, already shipped** (owner, 2026-09-25: *"jokhon build
hoye jabe tokhon spec ekhane ar change kora jabena"*; product spec sheet design
S8; `CLAUDE.md` §5 line 191, now the *Once a product is built* entry in `docs/guides/features/ai-create-flow.md`). Once a product is built, its spec is read-only
and changes go through the editor. A product is locked while the chat's booked
build includes it and that build is queued, running, ready or partial. What it
means here:
- the product page shows the **booked snapshot** (`BuildProduct.spec` and its
  parts), never the chat's later `answer.specs`;
- no surface on either page edits a built product's spec, parts or facts;
- a fact computed from parts because no decision was booked says
  "· worked out from the parts" (H-8);
- the one way to change a built product is **Open in editor**.

**Earlier decisions this design keeps.** D10, no kebab menu on the project page
(owner-approved 2026-09-24, Add Network spec); D12, one network per project;
and the eleven must-not-undo decisions in `research/history.md` — among them
H-1 both pages read live state, H-2 no fabricated ownership, wallet, mint or
legal rows, H-5 a skipped deliverable is not a link, H-6 Network has one
home (the Network tab, O7), H-7 the description shown is the concept's, frozen before any edit.

---

## 3. The page IA

### 3.1 Routes, and what each page is for

| Route | Page | Its job |
|---|---|---|
| `/` | Home | Starts things. It has no project list; Part 2 of the PDF gives the status overview to My projects. |
| `/projects` | **My projects** | The only index of projects: "which project, and what's its next step?" |
| `/projects/[id]` (`?tab=media`, `?tab=network`, `?view=buyer`) | **Project details** | One project's dossier. Every project action has its one home here. |
| `/projects/[id]/products/[productId]` (`?tab=`, `?v=`) | **Product page** (new) | One product's deliverables, per version. |
| `/projects/[id]/network` | Connection Map (shipped) | Unchanged. |
| `/projects/[id]/business-plan` | Business plan (NEXT) | CNT-65…81. |
| `/project/<slug>/<step>` | The editor (shipped) | Unchanged; "Open in editor" goes here. |
| `/project/<slug>/brief`, `/build/<id>/brief` | The Brief (shipped) | Choosing the outcome, the terms and the mint. The project page reads the result and never repeats a Brief control. |

**Page widths.** Both pages cap their content at 1280 px, with 32 px gutters at
640 px and wider and 16 px below. At 1440 with the sidebar open, the page
container (`main`) is 1160 px and the content box 1096 px. Layout switches use
container queries on the page container, never the window, because the sidebar
takes 280 px (72 px collapsed).

### 3.2 My projects

**Desktop, 1440.** Three columns from a 900 px content box; the status chip
takes the Figma's top-right badge slot; the stage pill takes the Figma's "Idea"
slot beside the title (NEXT).

```
┌─ /projects · content 1096 px (1440 − sidebar 280 − gutters 2 × 32) ──────────────────────────────────────────────┐
│ My projects                                                                                      [ New project ] │
│ Every project you've saved — from an AI build or started by hand.                                                │
│ They're stored in this browser.                                                                                  │
│                                                                                                                  │
│ ( All 38 )( Draft 31 )( Private 4 )( Given 1 )( Listed 2 ) ┊ ( Showcase 2 ) ┆LATER: Contributed · Purchased┆     │
│ ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── │
│ [⌕ Search projects and products        × ]                 [ Source: Any source ▾ ] [ Sort: Recently updated ▾ ] │
│ 38 projects                                                         facet chips appear here when one isn't "Any" │
│ ┌──────────────────────────────────┐ ┌──────────────────────────────────┐ ┌──────────────────────────────────┐   │
│ │                        [○ Draft] │ │          [◉ Showcase] [# Listed] │ │                        [○ Draft] │   │
│ │                                  │ │                                  │ │                                  │   │
│ │       cover 16:10                │ │       cover 16:10                │ │    placeholder tile              │   │
│ │                                  │ │                                  │ │                                  │   │
│ ├──────────────────────────────────┤ ├──────────────────────────────────┤ ├──────────────────────────────────┤   │
│ │ Car          ┆NEXT: Prototype┆   │ │ Plant Soil Monitor               │ │ Garden Weather Station           │   │
│ │ 4 products · RC Car              │ │ 1 product · Soil Probe           │ │ 1 product · not named yet        │   │
│ │ Controller, Remote Contr… +2     │ │ Minted Sep 22 · goes on sale     │ │ Not briefed yet                  │   │
│ │ Not briefed yet                  │ │ when the marketplace opens       │ │ By hand · Created Aug 3          │   │
│ │ AI build · Saved 4:12 PM ·       │ │ AI build · Saved Sep 20          │ │                                  │   │
│ │ Version 2                        │ │                                  │ │                                  │   │
│ │ [         Add Brief          ]   │ │ [       Open in editor       ]   │ │ [       Open in editor       ]   │   │
│ └──────────────────────────────────┘ └──────────────────────────────────┘ └──────────────────────────────────┘   │
│    … 9 more cards (12 per page)                                                                 ‹  1  2  3  4  › │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The card, top to bottom: the cover with the status chip, and the Showcase
badge to its left when the project is showcased; the title (the card's link,
h3) with the stage pill (NEXT); the product line; the status line; the meta
row (source · date · version); the next-action button. There is no ⋮, no stats
row and no carousel dots.

The tabs are the four outcome tabs after All, then a hairline divider (┊) and
**Showcase**. Every project sits in exactly one of Draft · Private · Given ·
Listed (38 = 31 + 4 + 1 + 2); Showcase is membership, not a state, so its
projects are also counted in their outcome tab — here one Private and one
Listed project (LST-4, LST-10).

**Phone, 400.** Below a 560 px content box each card becomes a row.

```
┌─ 400 px · gutters 16 ────────────────┐
│ My projects          [ New project ] │
│ Every project you've saved — from    │
│ an AI build or started by hand.      │
│ They're stored in this browser.      │
│ ( All 38 )( Draft 31 )               │   tabs wrap
│ ( Private 4 )( Given 1 )             │
│ ( Listed 2 ) ┊ ( Showcase 2 )        │
│ [⌕ Search projects and products ]    │   search takes a full row
│ [ Source ▾      ] [ Sort ▾      ]    │   Source and Sort share a row
│ 38 projects                          │
│ ┌──────────────────────────────────┐ │
│ │ ┌──────┐ Car            ○ Draft  │ │   row card: 96 × 60 cover,
│ │ │cover │ 4 products · RC Car +3  │ │   chip beside the title
│ │ └──────┘ Not briefed yet         │ │
│ │          AI build · 4:12 PM      │ │
│ │ [         Add Brief          ]   │ │   full-width button, ≥ 44 px
│ └──────────────────────────────────┘ │
│ … 11 more row cards                  │
│ ‹   Page 1 of 4   ›                  │
└──────────────────────────────────────┘
```

### 3.3 Project details

**Desktop, 1440 (owner, NOW; NEXT and LATER slots dashed).** Example: "Car",
version 2 of one chat, not briefed. Version 2 dropped Battery Charger and added
Spare Battery Pack; Battery Charger stays in the list from version 1 (O9). Two columns when the page container is
at least 1024 px: a fluid main column (`min-width: 0`) and a 360 px rail, 28 px
apart, both top-aligned under the breadcrumb. The rail is not sticky; it is
taller than the viewport.

```
My projects › Car
┌─ main column · fluid, 708 px at 1440 ─────────────────────────────────────────────────┐  ┌─ rail · 360 px ────────────────────────┐
│ Car ✎  ┆Activity 3 › ?┆       [ Add Brief ]★ [ Open in editor ] [ Preview as buyer ]  │  │ Outcome                                │
│ ○ Draft · Not briefed yet                                                             │  │ Nothing decided yet. The Brief is      │
│ 4 products · Version 2 · Saved Sep 26, 2026   ┆· Stage Prototype┆                     │  │ where you keep it, give it away or     │
│ A two-motor RC car with an ESP32 brain and a 2.4 GHz remote that drives it            │  │ sell it.                               │
│ from 50 m away …   Show more · Edit description                                       │  │ ────────────────────────────────────── │
│ The editor starts from a sample board — your build's parts aren't in it yet.          │  │ ┆Business plan                   NEXT┆ │
│ ┌╌ only while a newer build of this chat waits ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ │  │ ┆A market, brand and pricing draft … ┆ │
│ ╎ ⓘ Version 3 of Car is ready to save.    (the primary then reads                   ╎ │  │ ┆[ Draft a business plan ]    quiet  ┆ │
│ ╎   Review version 3)                                                               ╎ │  │ ────────────────────────────────────── │
│ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ │  │ Editor                                 │
│  Products   Media   Network    ┆LATER: Contributors · Customers┆                      │  │ PCB Design        42 objects · 12 on › │
│  ▔▔▔▔▔▔▔▔                                                                             │  │                   the board            │
│ Products                                                                              │  │ Code                                 › │
│ 4 products · 15 of 15 pieces ready in version 2 · Build check: Draft ⓘ                │  │ 3D Module        AI model generated  › │
│ ┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │  │ Assembly         8 of 12 parts       › │
│ │ [ concept image 16:10 ]                │ │ [ concept image 16:10 ]                │ │  │                  checked               │
│ │ RC Car Controller                      │ │ Remote Controller                      │ │  │ Peripheral Wiring  6 parts · 9 wires › │
│ │ Build check: Draft · v2 · Sep 26       │ │ Build check: Draft · v2 · Sep 26       │ │  │ Product Preview                      › │
│ │ Size   224 × 60 × 25 mm                │ │ Size   120 × 60 × 25 mm                │ │  │ Code, 3D shapes and Preview are shared │
│ │ Board  2-layer 72 × 54 mm              │ │ Board  2-layer 50 × 40 mm              │ │  │ by every project in this browser for   │
│ │ Power  LiPo · about 4.8 h              │ │ Power  2 × AA · about 5 h              │ │  │ now, so they show no progress here.    │
│ │                                        │ │ Radio  nRF24L01                        │ │  │ ────────────────────────────────────── │
│ │                                        │ │ Built with your part changes: added    │ │  │ Details                                │
│ │                                        │ │ HC-SR04 ultrasonic sensor              │ │  │ Source      AI build                   │
│ └────────────────────────────────────────┘ └────────────────────────────────────────┘ │  │ Created     Sep 22, 2026               │
│ ┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │  │ Stored      In this browser            │
│ │ Battery Charger                        │ │ Spare Battery Pack                     │ │  │ ────────────────────────────────────── │
│ │ Not in version 2 · from version 1 …    │ │ Build check: Draft · v2 · Sep 26 …     │ │  │ Versions                             ▴ │
│ └────────────────────────────────────────┘ └────────────────────────────────────────┘ │  │ Chat “Car” ↗                           │
│ ┆NEXT  All parts across 4 products — 31 unique, 58 units                          ▸ ┆ │  │ Version 2 · current                    │
│ ┆NEXT  Compatibility — 1 note between Remote Controller and RC Car Controller     ▸ ┆ │  │ Saved Sep 26, 2026 · 4:12 PM           │
│ ┆NEXT  [ + Add a product ]                                                          ┆ │  │ 15 of 15 pieces ready · Open build ↗   │
└───────────────────────────────────────────────────────────────────────────────────────┘  │ Added    Spare Battery Pack            │
                                                                                           │ Dropped  Battery Charger               │
                                                                                           │ Changed  Remote Controller             │
                                                                                           │ Version 1                              │
                                                                                           │ Saved Sep 22, 2026 · 9:02 AM           │
                                                                                           │ 15 of 15 pieces ready · Open build ↗   │
                                                                                           │ Products RC Car Controller, Remote     │
                                                                                           │          Controller, Battery Charger   │
                                                                                           │ ────────────────────────────────────── │
                                                                                           │ Manage                                 │
                                                                                           │ [ Delete project… ]     danger · quiet │
                                                                                           └────────────────────────────────────────┘
```

The header, in order: the h1 with its rename pencil, the Activity chip (NEXT)
and, on the right, the action pair and **Preview as buyer**, which wrap under
the title when the name is long; the status chip, the **Showcase** badge when
the project is showcased, and the status line; the meta line; the description, clamped to 5 lines, with its editor; the Open in editor
hint. Then the pending-version banner, only while a newer build of the chat
waits. Then the tab strip, and the tab panel. The Media and Network panels
replace the Products panel under the same strip:
- **Media** — "From your builds" tiles with the Cover chip, and the preview-clip
  note when the Brief has a clip job; NEXT adds "Your uploads" and **Add media**.
- **Network** — the shipped `NetworkSection`: its empty state with
  **Create Network** (quiet), or the summary, connections and role chips with
  **View Network**.

In the rail, **Versions** is the project's one version history (COR-107): the
chat each lineage came from, then every saved version with its date, pieces,
build link and what it added, dropped and changed, each product name a link to
that product at that version. Details no longer carries "Built in" (the chat
link heads its lineage in Versions), and the **Project log** is absent here: a
built, unminted project has no event that isn't a version (COR-52). A minted
project's Outcome block holds the **Showcase** row (§3.8).

**Phone, 400.** One column. The rail blocks follow the tab panel in rail order,
each collapsible and closed by default; the header's status line carries the
outcome at every width, so the Outcome block needs no second copy near the top.

```
┌─ 400 px · one column ────────────────┐
│ ☰  IDEEZA                   (bar)    │
│ My projects › Car                    │
│ Car ✎                                │   h1; the pencil is its rename control
│ ○ Draft · Not briefed yet            │   the one chip + the status line
│ 4 products · Version 2 ·             │
│ Saved Sep 26, 2026                   │
│ A two-motor RC car with an ESP32     │
│ brain and a 2.4 GHz remote …         │
│ Show more · Edit description         │
│ ┌──────────────────────────────────┐ │   the pair stacks full width,
│ │ Add Brief                 violet │ │   primary first; targets ≥ 44 px
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Open in editor             quiet │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Preview as buyer           quiet │ │
│ └──────────────────────────────────┘ │
│ The editor starts from a sample      │   the pair's aria-describedby
│ board — your build's parts aren't    │
│ in it yet.                           │
│ ╎ pending-version banner       ╎     │   only while a newer build waits
│ Products  Media  Network       ›     │   one row that scrolls; never wraps
│ ▔▔▔▔▔▔▔▔                             │
│ Products                             │
│ 4 products · 15 of 15 pieces ready   │
│ in version 2 · Build check: Draft ⓘ  │
│ ┌──────────────────────────────────┐ │   1 column
│ │ [ concept image 16:10 ]          │ │
│ │ RC Car Controller                │ │
│ │ Build check: Draft · v2          │ │
│ │ Size   224 × 60 × 25 mm          │ │
│ │ Board  2-layer 72 × 54 mm        │ │
│ │ Power  LiPo · about 4.8 h        │ │
│ └──────────────────────────────────┘ │
│ … 3 more cards                       │
│ ────────────────────────────────     │   the rail blocks follow the panel,
│ Outcome                        ▸     │   each collapsible, closed at 400;
│ ┆Business plan         NEXT   ▸┆     │   Outcome holds "Minted details"
│ Editor                         ▸     │
│ Details                        ▸     │
│ Versions                       ▸     │   Project log: once it has an event
│ Manage                               │
│ ┌──────────────────────────────────┐ │
│ │ Delete project…           danger │ │   last thing on the page
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 3.4 The product page (per-product deliverables)

Each product card opens its own page. One tab level per page: the project page
has page tabs, the product page has the deliverable tabs **3D model · PCB ·
Firmware code · Wiring · Parts** (+ **Files**, NEXT). The product page has no
action buttons: Open in editor, the Brief door and Network live on the project
page. Everything it shows is the booked snapshot (the build-lock rule, §2).

```
My projects › Car › Remote Controller
┌─ /projects/[id]/products/[productId] · desktop ──────────────────────────────────────────────────────────────┐
│ Remote Controller                                                                       Build check: Draft ⓘ │
│ [ Version 2 of 2 ▾ ] · Built Sep 26, 2026 · Concept 2 · 5 of 5 pieces ready                                  │
│ ┌╌ only on ?v=1 ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ │
│ ╎ You're viewing version 1 (Sep 22, 2026). The project now uses version 2.              [ Back to latest ] ╎ │
│ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ │
│ ┌──────────────┐  A handheld 2.4 GHz remote with two thumb sticks that drives the car …   Show more          │
│ │ concept      │  Built with your part changes: added HC-SR04 ultrasonic sensor           (owner only)       │
│ │ image  4:3   │  Size 120 × 60 × 25 mm · Board 2-layer 50 × 40 mm · Power 2 × AA, about 5 h                 │
│ └──────────────┘  Radio nRF24L01        (the booked snapshot: BuildProduct.spec and its parts)               │
│  3D model   PCB   Firmware code   Wiring   Parts   ┆NEXT: Files┆                                             │
│  ▔▔▔▔▔▔▔▔                                                                                                    │
│ ┌─ artifact (container ≥ 640 px) ────────────────────────────────────┐ ┌─ What this covers · 260 ──────────┐ │
│ │ 3D: the concept image + [ View in 3D ] → ModelPanel, lazy,         │ │ coversFor(kind, product, …):      │ │
│ │     primary only                                                   │ │ honest per-kind notes             │ │
│ │ PCB / Wiring: SVG in a named, tabIndex=0 scroll region, under h3   │ │                                   │ │
│ │ Firmware code: read-only source · Parts: the BOM table             │ │                                   │ │
│ └────────────────────────────────────────────────────────────────────┘ └───────────────────────────────────┘ │
│ ┆LATER: licence editions for this product (COR-38)┆                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌─ 400 px ─────────────────────────┐
│ My projects › … › Remote Contr…  │   the middle crumb collapses to "…"
│ Remote Controller                │
│ Build check: Draft ⓘ             │
│ ┌──────────────────────────────┐ │
│ │ Version 2 of 2             ▾ │ │   a full-width select, ≥ 44 px
│ └──────────────────────────────┘ │
│ Built Sep 26 · Concept 2         │
│ [ concept image 16:10 ]          │
│ A handheld 2.4 GHz remote …      │
│ Size   120 × 60 × 25 mm          │
│ Board  2-layer 50 × 40 mm        │
│ Power  2 × AA · about 5 h        │
│ Radio  nRF24L01                  │
│ 3D model  PCB  Firmware  Wir›    │   one row that scrolls
│ [ preview, full width ]          │
│ What this covers                 │   the aside drops below
│ …                                │
└──────────────────────────────────┘
```

**A product a later version dropped** — Battery Charger in the Car example —
opens at the last version that had it: the select reads "Version 1 of 2" and
the notice reads *"Version 2 doesn't include Battery Charger — this is version
1, the last one that did."*, with no **Back to latest**, because no later copy
exists. The select lists every version of the lineage from `versionsOf()`; a
version without this product reads "Version 2 · not in this version" and opens
the *"Not in version 2"* notice (COR-41, COR-108). The rail's Versions block
links each product name to this page at that version.

### 3.5 Per-state actions

One shared `nextAction()` chooses the pair; the My projects card shows its first
action, so the card and the header can never differ (COR-11, LST-40). At most
one violet (★) per page; minted projects have none. Both buttons use
`LeaveButton`'s press state ("Opening…", blocks its sibling).

| State | Header: first · second | My projects card button | Where the Brief is entered |
|---|---|---|---|
| Draft, a newer version waiting | ★ **Review version {n}** (→ `/build/<id>`) · Open in editor | Review version {n} | — (review it first) |
| Draft, Brief in progress / started | ★ **Continue Brief** · Open in editor | Continue Brief | the primary |
| Draft, from a build, not briefed | ★ **Add Brief** · Open in editor | Add Brief | the primary |
| Draft, by hand, not briefed | ★ **Open in editor** · Add Brief | Open in editor | the secondary |
| Private · Given · Listed (showcased or not) | Open in editor · View brief (both quiet) | Open in editor | View brief |
| Minted, record unreadable | Open in editor (quiet) | Open in editor | — |
| Any minted state with a newer version waiting | as above; the pending-version banner carries a quiet **Review version {n}** | Open in editor | View brief |
| Preview as buyer | none | — | — |

**Open in editor** resumes the step opened last ("Open in editor · PCB Design"
once one is recorded), falling back to PCB. **Preview as buyer** is the header's
last control, quiet, after the pair; it is absent for a minted Private project
that isn't showcased (nobody will see the page) and inside the preview itself.
**Showcase** is never in the header: its one home on the page is the Outcome
block (§3.8), so showcasing never changes the pair or the card.

### 3.6 Activity, Network, Editor, Versions, Manage and the right rail

**Three words, three homes** (COR-50):
- **Activity** is the maker's journey: the header chip "Activity {n} ›" and its
  "?" open the Activity History drawer (NEXT, with the journey store).
- **Stage** is a derived label: "· Stage {short}" in the meta line (NEXT), plain
  text, never a second door to the drawer.
- **Project log** is system events: a rail block (NOW, derived). It holds the
  events that aren't versions — created by hand, minted, showcased; every saved
  version and its build is in the **Versions** block instead.

```
┌─ project page ───────────────────────┐  ┌─ drawer · 550 px · right-docked · full height ───────┐
│ page behind: inert, under one scrim  │  │ Activity History                                   × │
│                                      │  │ Your product journey, newest first. Use ⋮ to edit a  │
│ header chip: Car ✎ Activity 2 › ?    │  │ stage.                                               │
│ meta line:   … · Stage Prototype     │  │ [ + Add New Activity ]                  (full width) │
│                                      │  │ ──────────────────────────────────────────────────── │
│ below 640 px the drawer is a         │  │ Prototype Development  ?                           ⋮ │
│ full-screen sheet                    │  │ Sep 24, 2026 · 6:40 PM                               │
└──────────────────────────────────────┘  │ First board soldered; both motors spin on USB power  │
                                          │ and the remote pairs at 2 m …  Show more             │
                                          │ [img] [img] [▶ 0:12] [PDF]            60 × 60 tiles  │
                                          │ github.com/…/rc-car-firmware                       ↗ │
                                          │ ──────────────────────────────────────────────────── │
                                          │ Concept Definition  ?                              ⋮ │
                                          │ Sep 20, 2026 · 10:05 AM                              │
                                          │ …                                                    │
                                          └──────────────────────────────────────────────────────┘
```

The drawer is 550 px, right-docked, full height, over one scrim, with the page
`inert` behind it; below 640 px it is a full-screen sheet. Only one floating
layer is open at a time. Add and Edit open inside the drawer and replace the
list; a ‹ returns to it and × closes the drawer.

**Network** is its own tab (Products · Media · Network; owner decision O7),
never a section under another tab. It hosts `NetworkSection`
with unchanged behaviour: one control per state, **Create Network** or **View
Network**, both quiet on this page. There is no second entry anywhere (D10, H-6).

**Editor** is a rail block of six rows — PCB Design · Code · 3D Module ·
Assembly · Peripheral Wiring · Product Preview — each a link to its step with a
derived fact and no status word. The Brief is not a row; its door is the
header.

**Versions** is a rail block after Details and the project's one version
history (owner decision O9, COR-107): one group per lineage, headed by its chat
link, then each saved version newest first — "Version {n}" (· current on the
newest), its saved date, "{ready} of {total} pieces ready" and **Open build**,
and what it **Added**, **Dropped** and **Changed** against the version before;
version 1 lists its products. Every product name links to that product's page
at that version. Five versions show, then **Show all ({n})** in place. It is
absent for a hand-made project with no build, and in Preview as buyer.

**Manage** is the rail's last block and holds one control, **Delete project…**,
quiet in the danger tone and apart from everything else. At 400 px it is the
last thing on the page. On a **Listed** project the control stays where it is,
`aria-disabled`, with the reason beside it (owner decision O10, COR-70):

```
┌─ rail · Manage, a Listed project ──────┐
│ Manage                                 │
│ [ Delete project… ]      aria-disabled │
│ A listed project can’t be deleted.     │
│ There’s no way to withdraw a listing   │
│ yet — that comes with the marketplace. │
└────────────────────────────────────────┘
```

The button stays in the tab order and names the reason through
`aria-describedby`; pressing it opens nothing. The second line says honestly
that no route out exists yet — the Brief can't withdraw a listing — rather than
pointing at one.

**The rail, in order.**

| Phase | Blocks |
|---|---|
| NOW | Outcome · Editor · Details · **Versions** · Project log · Manage |
| NEXT | Outcome · **Business plan** · Editor · Details · Versions · Project log · Manage |
| LATER | **People** ("You · Creator · 60 %") · Outcome grown into **Marketplace** (NFT-type tabs, listing operations) · Business plan · Editor · Details · Versions · Project log · Manage |

One rail surface with hairline dividers between blocks (no card in a card);
each block has an h2. A block with nothing to say is absent (the Project log of
a built, unminted project; Versions of a hand-made one).

**LATER, the same frame gains:** **Share** in the header (one sheet: copy link,
native share, social targets — the Innovations post stays Showcase's, COM-57); "Created by" / "Owned by" in the meta line
with person cards; the wallet row in the header identity block; the stats row
and the Comments drawer (public projects only); the **Contributors** and
**Customers** tabs, appended after Network so that no existing tab moves.

### 3.7 One home for every Figma entry point

| Figma entry point | Its one home | Phase |
|---|---|---|
| Breadcrumb "Private Projects › Details" | "My projects › {project}" | NOW |
| Visibility pill, "Mint Status: …" | the one status chip | NOW |
| ⋮ → Edit Project; the "Update Description" coachmark | inline rename and description, with "Draft from products" | NOW |
| ⋮ → Add Network; the IoT Network tab | the **Network** tab | NOW |
| ⋮ → Delete Project | rail **Manage** (blocked, with its reason, for a Listed project) | NOW |
| Product tab; card → Product Details | **Products** tab → the product page | NOW |
| Media tab | **Media** tab | NOW |
| Basic Information | rail **Details** + the Outcome facts | NOW |
| Activity Log | rail **Project log**; saved versions and builds in rail **Versions** | NOW |
| Marketplace card (Main / Physical / Virtual, Add To Marketplace) | rail **Outcome** now; **Marketplace** LATER; terms and mint stay in the Brief | NOW / LATER |
| ⋮ → Generate Business Plan; the business-plan chip | rail **Business plan** card | NEXT |
| Activity chip and "?" | header chip → drawer | NEXT |
| "Activity · Idea ▾" stage row | "· Stage {short}" in the meta line | NEXT |
| Add New Product card | "Add a product", the grid's last tile | NEXT |
| Legal Information | Outcome rows, "As stated by you — not verified." | NEXT |
| Share to Newsfeed ("Share to feed or Marketplace") | **Showcase**: the Outcome block's Showcase row, and the Brief's success step (§3.8) | NOW (a local flag); the feed post LATER |
| ⋮ → Share To Social Media | header **Share** | LATER |
| Wallet chip and copy | header identity block | LATER |
| Created by / Owned by, person card | meta line | LATER |
| Stats row → Comments | stats row → Comments drawer | LATER |
| Customers, Contributors tabs; Ownership % | appended tabs; rail People block | LATER |
| Premium Parts tab | a group inside a product's Parts tab | LATER |
| ⋮ → Add App, Send To Manufacture, Send To Freelancer | absent until each has a destination | LATER |
| Gear and "Level 1" badges; card ⋮; image dots; pagination | not built (§9) | — |

### 3.8 Showcase: two entry points, one home on the page

Showcase is an action on a project, not an outcome and not a status (owner
decision O5). It can be taken on any minted project — Private, Given, Listed,
and the Minted record that can't be read — and undone at any time. It is absent
on a Draft: the Brief promises that minting keeps the maker's name on a design
before it is shared (*"Minting keeps your name on it — you can share or sell it
later."*), and a Draft has no mint.

**What it does NOW.** It sets `showcasedAt` on the project record, in this
browser (COR-105). The project gets the **Showcase** badge beside its status
chip, on the details header and on the My projects card (LST-65), and joins the
**Showcase** tab (LST-10); a Private project becomes one others are meant to
see, so Preview as buyer is offered (PPL-9). **Nothing is posted.** Innovations
(`/innovations`) is a sample feed of 36 made-up projects with no write path
(`lib/feed.ts`), so no surface says "posted", "live" or "on Innovations", and
nothing links to `/innovations/<slug>`, which renders the sample fallback.

**What it does LATER.** Showcasing publishes a real Innovations post, confirmed
first because it goes public (CNT-46), and Stop showcasing takes the post down
(COM-57, public); NEXT, a local feed reads the flag first (COM-27). The feed
shows video cards, so a post needs a preview clip — the Brief's own rule, *"An
Innovations post needs a preview clip"* — and a project without one is sent to
the Brief's preview step, the one generator (CNT-28).

**Entry point 1 — the Brief's success step** (the owner's "success modal",
`step-4-success.tsx`), after every intent — Save as Private, Give or Sell — and
while a clip still renders (COM-56).

```
┌─ /build/<id>/brief · the success step · any intent ──┐
│                          ✓                           │
│                  Listing is minted                   │
│   Your listing is minted. It goes on sale when the   │
│   marketplace opens.                                 │
│   … the storyboard card, when the Brief made one …   │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Go to My Projects                         violet │ │
│ └──────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ◉ Showcase this project                    quiet │ │
│ └──────────────────────────────────────────────────┘ │
│ It goes under Showcase in My projects now. Nothing   │
│ is posted until Innovations opens.                   │
│                    Back to home                      │
└──────────────────────────────────────────────────────┘

after the press, or on arrival when Share to Innovations was ticked,
the button and its line give way to one status row (focus moves to Undo):
│ ◉ Showcased — it’s on your Showcase tab.        Undo │
```

**Entry point 2 — the project page: the Showcase row of the Outcome block**
(COM-55). The row sits in the Outcome facts, after the terms and before the
footnote; its one control is quiet.

```
┌─ Outcome · Listed, showcased ──────────┐   ┌─ Outcome · Private, not showcased ─────┐
│ Outcome                                │   │ Outcome                                │
│ Minted. It goes on sale when the       │   │ Minted and kept. Only you can see it.  │
│ marketplace opens.                     │   │ Minted      Sep 22, 2026 · 9:09 PM     │
│ Minted      Sep 22, 2026 · 9:09 PM     │   │ Network     Base Sepolia (Testnet)     │
│ Network     Base Sepolia (Testnet)     │   │ Collection  Garden Sensors             │
│ Collection  Garden Sensors             │   │ Showcase    Not showcased              │
│ Price       0.05 ETH · Buy now         │   │             Showcasing lists it under  │
│ Royalties   10 % on resales            │   │             Showcase in My projects.   │
│ Showcase    Showcased since Sep 26     │   │             Nothing is posted until    │
│             Nothing is posted — the    │   │             Innovations opens.         │
│             Innovations feed isn’t     │   │             [ Showcase project ]       │
│             open yet.                  │   │ Recorded in this browser only —        │
│             [ Stop showcasing ]        │   │ nothing is written to a blockchain     │
│ Recorded in this browser only —        │   │ yet.                                   │
│ nothing is written to a blockchain     │   └────────────────────────────────────────┘
│ yet.                                   │
└────────────────────────────────────────┘
```

```
┌─ the header of the same Listed project ───────────────────────────────────────────────┐
│ Plant Soil Monitor ✎         [ Open in editor ] [ View brief ] [ Preview as buyer ]   │
│ # Listed  ◉ Showcase · Minted Sep 22, 2026 · goes on sale when the marketplace opens  │
│ 1 product · Saved Sep 20, 2026                                                        │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌─ 400 px · rail blocks ───────────┐
│ Outcome · Listed · Showcased   ▸ │
│ Editor                         ▸ │
└──────────────────────────────────┘
```

Stop showcasing and Undo take effect at once, with no dialog: NOW nothing is
public, and pressing Showcase again restores it. Each announces politely
("Showcased {name}", "Stopped showcasing {name}"). At 400 px the Outcome
block's collapsed summary names the state ("Outcome · Listed · Showcased"), so
the row can be found without opening it.

**Why the Outcome block, and not a header secondary.**
1. **The control sits beside the fact it changes.** The Outcome block is where
   the page says what became of the project and who it is for ("Only you can
   see it"); Showcase changes exactly that. Rename sits beside the h1 for the
   same reason.
2. **The header pair is the next step, and it is shared with the card.**
   `nextAction()` feeds both the header and the My projects card (COR-11,
   LST-32). A Showcase button in the header would either break "the card equals
   the header" or put Showcase on every card — and it isn't the next step in
   making the project.
3. **The header is already full on a minted project** — Open in editor · View
   brief · Preview as buyer. At 400 px those stack full width; a fourth button
   pushes the tabs off the first screen.
4. **One control, one home.** The badge beside the chip shows the state
   everywhere and is not a control; the Outcome row is the only place on the
   page that changes it. The success step is a separate home, in the Brief, at
   the moment the outcome is chosen.

**The Brief's "Share to Innovations" tick** stays in the Brief with its story
and its clip lock, and it now writes the same flag: a mint with the tick checked
sets `showcasedAt` to the mint time, so the success step opens already
showcased (§7 X37). The flag is written, never read back from the Brief: Stop
showcasing clears it whatever the tick said.

---

## 4. State matrix

One derivation decides the state (`projectView()` → `projectSummary()` and
`commerceOf()`, §5.1). The first matching row wins. ★ is the page's one violet
button. "Status line" is the same string on the My projects card and under the
details chip. The Outcome card never carries a chip of its own.

**The state is the outcome** — Draft · Private · Given · Listed · Minted — and
**Showcase is not a state** (owner decision O5): it is the `showcasedAt` flag,
shown as its own badge and as membership of the Showcase tab, on any minted
row (the Showcased modifier below).

**Chip icons** (one table, text plus icon, sentence case, never violet): Draft
○ circle (neutral) · Private lock · Given hand-heart · Listed tag · Minted
hexagon (all success tone). **The Showcase badge**: eye icon and the word
"Showcase", info tone, beside the chip — the only other badge.

### 4.1 NOW

| # | State | Derived from | Chip | Status line | Primary action · secondary | My projects tab | Outcome card (subline · facts) | Delete |
|---|---|---|---|---|---|---|---|---|
| 1 | **Draft** — a newer version waiting | not minted, and `pendingVersionsOf()` has a ready build | Draft | "Version {n} is ready to save" | ★ Review version {n} · Open in editor | Draft | the sub-state's subline (rows 2–5) · no facts | plain, or typed (§5.10) |
| 2 | **Draft** — Brief in progress | a brief draft with `intent`, `mintedAt === null` | Draft | "Brief in progress · {to sell / to give / to keep} · {Idea / Preview} step" (the step is omitted at the form step) | ★ Continue Brief · Open in editor | Draft | "You chose {Sell / Give / Save}. The Brief is at the {step} step — nothing is minted until you finish it." · none | plain / typed |
| 3 | **Draft** — Brief started | a draft, `intent === null` | Draft | "Brief started" | ★ Continue Brief · Open in editor | Draft | "The Brief is open — no outcome chosen yet." · none | plain / typed |
| 4 | **Draft** — from a build, not briefed (also when the build is gone) | build refs, no draft | Draft | "Not briefed yet" | ★ Add Brief · Open in editor | Draft | "Nothing decided yet. The Brief is where you keep it, give it away or sell it." · none | plain / typed |
| 5 | **Draft** — by hand, not briefed | no build refs, no draft | Draft | "Not briefed yet" | ★ Open in editor · Add Brief | Draft | as row 4 | plain / typed |
| 6 | **Private** | `mintedAt` + `intent: "save"` | Private | "Minted {date} · kept private"; showcased: "Minted {date} · kept by you" | Open in editor · View brief (no violet) | Private | "Minted and kept. Only you can see it."; showcased: "Minted and kept by you — not given away or for sale." · Minted, Network, Collection, Showcase | allowed, with the mint line |
| 7 | **Given** | `mintedAt` + `give` | Given | "Minted {date} · given to the community under {licence}" | Open in editor · View brief | Given | "Minted under {licence}. This can't be undone." · + Licence, Showcase | allowed, with the mint line |
| 8 | **Listed** | `mintedAt` + `sell` | Listed | "Minted {date} · goes on sale when the marketplace opens" | Open in editor · View brief | Listed | "Minted. It goes on sale when the marketplace opens." · + Price or Auction line, Royalties, Showcase; a passed auction end adds "This end date passed before the marketplace opened — nothing was sold." | **blocked**: the control stays, `aria-disabled`, with "A listed project can't be deleted." (COR-70) |
| 9 | **Minted** — record unreadable | `status === "completed"`, draft missing or corrupt | Minted | "Minted · the brief record isn't in this browser" | Open in editor (quiet) | All only | "The brief record can't be read in this browser, so its terms aren't shown." · Showcase | allowed — its outcome can't be read, so it isn't known to be listed |

**Listed is honest now.** Nothing is on a marketplace yet — there is no
marketplace — so the word never appears without its subline: the status line
and the Outcome subline both say it goes on sale when the marketplace opens.

**Modifiers (NOW)**

| Modifier | Derived from | What changes |
|---|---|---|
| **Showcased** (rows 6–9) | `project.showcasedAt` is a number | The **Showcase** badge beside the chip, on the header and the card; the project is also under the **Showcase** tab; the Outcome block's Showcase row reads "Showcased since {date}" with **Stop showcasing** (COM-55); on row 6 the status line and subline take their showcased forms and Preview as buyer is offered (PPL-9); the pair and the card button don't change. Never on rows 1–5. |
| Preview clip still rendering (rows 6–8) | the draft's `videoJobId` names a job not `done` or `failed` | Status line "Minted {date} · preview clip still rendering"; the subline adds "The preview clip is still rendering — {n} %, about {eta} left". A failed job adds "The preview clip failed — regenerate it from the Brief." |
| A newer version waiting (rows 6–9) | minted, and `pendingVersionsOf()` has a ready build | The pair is unchanged; the pending banner "Version {n} of {lineage} is ready to save." carries a quiet **Review version {n}**. The card is unchanged (LST-43). A later save leaves the Outcome as it was minted. |
| A product a later version dropped (any row) | a product row whose source is an older version of its lineage (COR-108) | The product stays on the Products tab, marked "Not in version {m} · from version {n}"; its page opens at version {n}; the Versions block lists it under "Dropped". |
| Build gone / chat gone | a ref whose job is not in this browser; its chat missing | Details → Source "AI build · not in this browser"; product cards are not links and say why; the Versions entry reads "build not in this browser" and its lineage heading is plain text; no part-changes line. |
| Every minted state | rows 6–9 | The Outcome card's footnote: "Recorded in this browser only — nothing is written to a blockchain yet." Delete, where allowed, adds "It was minted in this browser only — nothing on a blockchain changes." |
| Preview as buyer (a view, not a state) | `?view=buyer` | The pair, the pencil, the description editor, the Editor, Versions and Manage blocks, Outcome (with its Showcase row) and Stored are absent; the Showcase badge stays; a sticky "Previewing as a buyer" banner with **Exit preview**. Absent for row 6 unless showcased. |

**Transitions that change controls.** Minting (rows 2–5 → 6–8) removes the
violet and brings the Outcome block's Showcase row; a mint with Share to
Innovations ticked lands showcased. Minting to sell (→ 8) blocks Delete.
Showcasing or stopping (rows 6–9) changes the badge, the Showcase tab and, on
row 6, Preview as buyer — never the pair. Saving a waiting version (1 → 4)
moves the primary to Add Brief. A new build of the chat finishing (4 → 1) moves
the primary to Review version {n}. Deleting (any row but 8) leaves the page for
My projects.

### 4.2 LATER

These render nothing now (COR-79); each has its slot.

| # | State | Derived from | Chip | Status line / banner | Primary action | Delete |
|---|---|---|---|---|---|---|
| 10 | **Lazy minted** | a signed voucher | Lazy minted | "Signed · minted on chain at first sale" | ★ Add to marketplace (Marketplace card) | replaced by its reason; archive takes its place (COR-70) |
| 11 | **Minted on chain** | a token id | Minted | "On {chain} · token {id}"; Change wallet locks | ★ Add to marketplace | replaced by its reason; archive takes its place |
| 12 | **Listed, on sale** (Buy now) / **Auction** | a live listing on a real marketplace | Listed / Auction · ends {time} | the subline "Goes on sale when the marketplace opens" gives way to the price and share for sale, or the current bid | none in the header; operations (Edit, Remove, Close auction, Pause) in the Marketplace card | blocked, and now with a route out: "A listed project can't be deleted — remove the listing first." |
| 13 | **Paused** | an owner pause | Paused | "Paused {date} — resume from the Marketplace card" | ★ Resume, in the Marketplace card; the rest of the page stays usable | blocked, with its reason |
| 14 | **Sold** (per slot) | a verified purchase | Sold; "Sold out" when every slot is | banner "Sold on {date} to {buyer}"; the My projects card opens this page | none | blocked: "A sold project can't be deleted." |
| M1 | **Utility NFT** (modifier) | a benefit NFT | + Utility NFT ▾ → Granted benefits, "Active until {date}" | — | inherits | inherits |
| M2 | **Restricted** (modifier) | moderation, on the account or the project | + Restricted | one banner: what is blocked, until when, why, Contact support | every write `aria-disabled`, with the reason | blocked |
| M3 | **In manufacture** (modifier) | a manufacturing flag | — | the meta fact "In manufacture" | inherits | blocked |

LATER, owner decision O10's block also covers people: a project in which anyone
else holds ownership — a co-owner, a contributor with a share, a fractional
holder — can't be deleted ("Someone else owns part of this project, so it can't
be deleted.", PPL-22). The Manage block shows the first reason that applies, in
the order sold · listed · other owners · restricted · in manufacture.

---

## 5. NOW, in full

This is what the implementation plan builds. Every requirement id below exists
in its area file, except the ids this spec adds for the owner's answers —
COR-105, COR-106, COR-107, COR-108, LST-65, COM-55 and COM-56 NOW, and COM-57
LATER — each marked **(new)**. Where this spec amends an id, the amendment is
written into the row and the reason is in §7.

**Build order.** Each step leaves the app working.
1. `normalizeProjects` keeps the new fields and gives legacy products ids
   (COR-87). It lands first, or every later write is stripped on the next load.
2. `productsOf` carries the primary's description (COR-90); the pure readers in
   `project-read.ts`, `project-summary.ts` and the Brief read (§5.1), with unit
   tests on six fixtures: a 4-product build, a legacy hand-made project, a
   project minted to sell and showcased, a hand-made project a build joined, a
   project whose build was purged, and a chat rebuilt twice whose second
   version drops a product.
3. The writers: `attach()`, `attachBuild()`, `projectFromBuild(job, lineage)`
   and the Brief's Step 1 (COR-88, COR-89, COR-95), and `setShowcase()` with
   the Brief's commit (COR-105). Verified by reload: rebuild a chat, press
   Save, and there is one project at version 2, with a product version 2
   dropped still in the list.
4. Quota-aware writes (COR-93), `lastOpened` (COR-91), `deleteProject`, its
   dialog and the Listed block (COR-67…71, COR-92).
5. My projects (§5.2).
6. The project page: shell, header, tabs, Products, the product page, Media,
   Network, the rail, Preview as buyer (§5.3–§5.11).
7. The touch points outside the pages (§5.12).

### 5.1 Data layer

| ID | Requirement |
|---|---|
| COR-86 | **Project ↔ all builds.** `ManualProject.builds?: ProjectBuildRef[]` is written from now on. `buildsOf()` merges it with the legacy links (`project.buildId`, `build.projectId`). No surface reads `project.buildId` alone (today `project-details.tsx:73-77`). |
| COR-87 | **Products get identity.** `ManualProduct` gains `id`, `source?` and `updatedAt?`. `normalizeProjects` preserves them (today `projects.tsx:154-158` rebuilds each row as `{name, description}`) and gives legacy rows ids once. |
| COR-88 | **One writer for "a build joins a project":** `attachBuild()`, idempotent by build id, used by Save, Open in editor and the Brief's Step 1. The Brief's second merge algorithm (`brief-app.tsx:847-877`) goes. |
| COR-89 | **Rebuild = v2 at save** (§5.1.8). Before creating a project, `projectFromBuild` attaches the build to the live project another build of the same chat was saved into. The Brief's Step 1 defaults its project choice to that project. |
| COR-39 | **What a version is:** a saved build of one chat lineage inside the project. The next Save from the same chat attaches as version n+1 of the same project; older versions stay attached and viewable; versions are never renumbered or reused. A build from a different chat starts its own lineage at version 1. |
| COR-42 | **The current version fills the Products grid** (amended, owner decision O9): each lineage's current version, plus the products a later version dropped, each once and marked (COR-108). An older version's copy of a product the current version still has never shows. The meta line's version is the current one. |
| COR-108 | **(new) A dropped product stays in the current list** (owner decision O9). `attach()` keeps a same-lineage row the new version doesn't contain, with its `source` still the last version that had it (§5.1.8). `productsOfProject()` marks it `dropped: { lastIn, current }`. Its card reads *"Not in version {current} · from version {lastIn}"* and stays a link; its page opens at version {lastIn} (COR-41). A later version that brings it back re-attaches the same row, id and all. Nothing leaves the list silently. |
| COR-106 | **(new) The version history, derived:** `versionsOf(refs, lineages, products)` (§5.1.2) returns, per lineage, every saved version in order with its saved date, its build (or "not in this browser"), its piece count ("{ready} of {total} pieces ready" or "needs a retry"), its products — each tied to its project row where one matches — and what it **added**, **dropped** and **changed** against the version before (v1: its products). Matching is `attach()`'s: product id, then normalized name. "Changed" means a matched product whose name, booked spec or parts (name and quantity) differ. A version whose build is gone lists no products and says so. It feeds the Versions block (COR-107) and the product page's version select (COR-41), so the two can't disagree. |
| COR-105 | **(new) Showcase is a flag on the project** (owner decision O5): `ManualProject.showcasedAt?: number \| null` — a time = showcased since then; `null` = the maker stopped showcasing; absent = never recorded. `normalizeProjects` keeps a finite number or `null`. `setShowcase(id, on)` writes it (`on` → `Date.now()`, off → `null`) and bumps `updatedAt`. It is written from three places only: the Outcome block's Showcase row (COM-55), the Brief's success step (COM-56), and the Brief's `commit()` when Share to Innovations is ticked (`showcasedAt = mintedAt`). A project minted before this ships, with the tick and no `showcasedAt`, gets it once, from the first read of its draft; `null` is never overwritten. No surface reads `shareToNewsfeed` to decide Showcase. Only a minted project can be showcased (`can(viewer, "project.showcase")` is false on a Draft). |
| COR-43 | **Old twins are not merged.** Two same-named projects the old fork made stay separate. Nothing merges data silently. |
| COR-90 | **`productsOf()` carries the primary's description** (`history.tsx:396-411` drops `job.description`). |
| COR-91 | **`lastOpened`** is written when an editor step opens, never touches `updatedAt`, and is the only resume signal. |
| COR-92 | **`deleteProject(id)`** removes the record, sweeps every per-project key (§5.1.9), clears the active project when it matches, and purges the in-session `builtFrom` guard. The PCB autosave is debounced 300 ms (`pcb/store.tsx:711-742`), far shorter than any path to the delete button, so delete needs no hook into the PCB store; sub-project B makes the PCB key exact (§11). |
| COR-93 | **Writes that fail say so.** `saveJSON` in both stores returns success; a failed write sets `writeError`, and the page shows an error `Banner`: *"This browser's storage is full — your last change wasn't saved."* (today `catch {}` swallows it, `projects.tsx:93-98`, `history.tsx:365-370`). |
| COR-95 | **Headline and list stay in step.** Renaming the headline product in the editor chrome (`product-name-field.tsx:43`) also renames `products[0]` when it held the same name. The Brief's product count counts products, not builds (`brief-app.tsx:748-755`). |
| COR-96 | **`coverOf()`**, read only: the newest saved version's primary image → any product image → `null`. |
| COR-64 | **`flowState` is no longer read** for progress by either page. The field stays in storage for old readers; `firstIncompleteStep` gives way to `resumeStepOf()`. |
| COR-74 | **One derivation feeds the page.** `projectView()` returns the refs, lineages, products, versions, pending versions, log, summary and commerce. No section derives state on its own. |
| LST-32 | **One shared derivation for the card and the page.** `projectSummary()` returns the status word, status line, the Showcase flag, products, source tag, next action, date, version and cover. A test renders the card and the details header for the six fixtures above and asserts the strings are identical. |
| LST-5 | **How status is derived** (amended, §7; owner decisions O5, O6): the status is the outcome, from the project's brief draft — no `mintedAt` → Draft; `mintedAt` + `save` → Private; + `give` → Given; + `sell` → **Listed**; `status: "completed"` with no readable draft → Minted. Showcase is not a status: it is `showcasedAt` (COR-105), read from the project record, never from the draft. `ManualProject.status` is never read on its own. |
| LST-61 | **What the list reads:** project records, builds, video jobs and one brief draft per project — never journey or log keys. Drafts are read after hydration, on window focus and on `storage` events; a corrupt draft reads as `null`. |
| COM-1 | **One Brief read.** `useProjectBrief(projectId)` parses `ideeza:brief:draft:<id>`, runs `normalizeBrief(parsed.state)`, keeps `parsed.step`, runs in an effect after hydration, and returns `undefined` until read. My projects uses the same parser (`readBriefDraft`), so the two surfaces can't disagree. |
| COM-2 | **One commerce derivation.** A pure `commerceOf(project, draft, jobs, now)` returns the outcome and every Outcome fact (§5.1.4). |
| PPL-1 | **One permission source.** Every owner-only control asks `can(viewer, action)`; none checks ownership inline. Today `viewer` is the local owner or the owner previewing as a buyer; accounts later change only the code that resolves it. |
| PPL-2 | **One view component.** The page body renders from `(project, viewer)`. The buyer preview and the future public page pass a visitor viewer to the same component, so the preview can't drift from what buyers get. |

#### 5.1.1 Shapes — `src/lib/manual/projects.tsx`

Every existing field is unchanged. **No new storage key NOW**: everything lives
inside `ideeza:manual:projects`, and the log and editor facts are derived.

```ts
/** The build product a project product was last built from: the build, and the product inside it —
 *  "primary" or the companion's BuildProduct.id. A reference, never a copy. */
export type ProductSource = { buildId: string; productId: string };

export type ManualProduct = {
  /** Stable key for /projects/[id]/products/[productId]. New rows: `prd_` + 8 base-36 chars.
   *  Legacy rows get `p<n>` (1-based position, deduped) once, in normalizeProjects. Never reused. */
  id: string;
  name: string;
  description: string;
  /** Absent on a hand-made product, and on a legacy row until a version attaches to it. */
  source?: ProductSource;
  /** The last change to THIS row: a version attached to it, or its text edited. Absent = never recorded. */
  updatedAt?: number;
};

/** One build the project holds. */
export type ProjectBuildRef = {
  buildId: string;
  /** The chat it came from: its lineage. Null only for a build gone before this was recorded. */
  chatId: string | null;
  /** 1-based within its lineage (same chatId), in save order. Never renumbered or reused. */
  version: number;
  /** When it joined this project. Null = joined before this field existed (the page says nothing). */
  savedAt: number | null;
};

export type ProjectStep = keyof ManualFlowState;

export type ManualProject = {
  // …id, slug, name, productName, description, products, status, createdAt, updatedAt, flowState: unchanged…
  /** The build this project was CREATED from. Provenance; never the only read (COR-86). */
  buildId?: string;
  /** Every build the project holds, in attach order. Written from now on; legacy projects are read by buildsOf(). */
  builds?: ProjectBuildRef[];
  /** The editor step last opened. Open in editor's resume target — never a progress signal. */
  lastOpened?: { step: ProjectStep; at: number };
  /** Showcase (COR-105): a time = showcased since then; null = the maker stopped; absent = never recorded.
   *  A flag on the project, orthogonal to the outcome — never derived from the Brief's shareToNewsfeed. */
  showcasedAt?: number | null;
};

// Ctx (projects.tsx:173-194): changed and new members
type Ctx = {
  // …existing…
  /** `lineage` = the OTHER builds of job.chatId (the caller has the builds store; this provider sits outside it). */
  projectFromBuild: (job: BuildJob, lineage?: BuildJob[]) => ManualProject;
  attachBuild: (projectId: string, job: BuildJob, lineage?: BuildJob[], opts?: { origin?: boolean }) => ManualProject | null;
  deleteProject: (id: string) => void;                     // callers check deleteBlockOf() first (COR-70)
  setShowcase: (id: string, on: boolean) => void;           // COR-105: on → Date.now(), off → null; bumps updatedAt
  touchOpened: (id: string, step: ProjectStep) => void;   // no updatedAt bump; ≤ 1 write per 60 s per step
  writeError: { at: number; key: string } | null;          // the last failed localStorage write
};

export const PROJECT_NAME_MAX = 80;          // CNT-2
export const PROJECT_DESC_MAX = 1000;        // CNT-5
export const PROJECT_DESC_COUNTER_FROM = 800;
```

#### 5.1.2 Backward-compatible reads — `src/lib/manual/project-read.ts` (new, pure)

They take `builds` as an argument, because `CreateHistoryProvider` sits inside
`ManualProjectsProvider` (`app/layout.tsx:80-91`).

```ts
import { productsOf, statusOf, type BuildJob, type BuildProduct, type BuildStatus, type ChatSession } from "@/lib/create/history";

export type BuildRef = ProjectBuildRef & { job: BuildJob | null };
const norm = (s: string) => s.trim().toLowerCase();

/** Every build behind a project: stored refs first, then legacy links numbered per lineage by createdAt. */
export function buildsOf(p: ManualProject, all: BuildJob[]): BuildRef[] {
  const byId = new Map(all.map((b) => [b.id, b]));
  const out: BuildRef[] = (p.builds ?? []).map((r) => ({ ...r, job: byId.get(r.buildId) ?? null }));
  const seen = new Set(out.map((r) => r.buildId));
  const top = new Map<string | null, number>();
  for (const r of out) top.set(r.chatId, Math.max(top.get(r.chatId) ?? 0, r.version));
  const legacy = [
    ...(p.buildId && !seen.has(p.buildId) ? [p.buildId] : []),
    ...all.filter((b) => b.projectId === p.id && b.id !== p.buildId && !seen.has(b.id)).map((b) => b.id),
  ]
    .map((id) => ({ id, job: byId.get(id) ?? null }))
    .sort((a, b) => (a.job?.createdAt ?? -1) - (b.job?.createdAt ?? -1)); // a gone origin build sorts first
  for (const { id, job } of legacy) {
    const chatId = job?.chatId ?? null;
    const version = (top.get(chatId) ?? 0) + 1;
    top.set(chatId, version);
    // The origin build and its project were written in the same call (projects.tsx:331-343), so that time is true.
    out.push({ buildId: id, chatId, version, savedAt: id === p.buildId ? p.createdAt : null, job });
  }
  return out;
}

export type Lineage = { chatId: string | null; title: string; refs: BuildRef[]; latest: BuildRef };
export function lineagesOf(refs: BuildRef[], chats: ChatSession[]): Lineage[];
// group by chatId; latest = highest version; title = chat.title ?? latest.job?.title ?? "Build"

/** The build product a project product is: its stored source first, else today's name join, newest build first. */
export function sourceOf(row: ManualProduct, refs: BuildRef[]): { ref: BuildRef; product: BuildProduct } | null {
  if (row.source) {
    const ref = refs.find((r) => r.buildId === row.source!.buildId);
    const product = ref?.job && productsOf(ref.job).find((x) => x.id === row.source!.productId);
    if (ref && product) return { ref, product };
  }
  for (const ref of [...refs].sort((a, b) => (b.job?.createdAt ?? 0) - (a.job?.createdAt ?? 0))) {
    const product = ref.job && productsOf(ref.job).find((x) => norm(x.name) === norm(row.name) || norm(x.title) === norm(row.name));
    if (product) return { ref, product };
  }
  return null;
}

export type ProjectProduct = {
  id: string; name: string; description: string;
  built: { ref: BuildRef; product: BuildProduct } | null;
  state: "built" | "build-gone" | "unmatched" | "hand";
  version: { current: number; count: number } | null;   // within its lineage
  /** COR-108: its lineage's current version doesn't include it — "Not in version {current} · from version {lastIn}". */
  dropped: { lastIn: number; current: number } | null;
};

export function productsOfProject(p: ManualProject, refs: BuildRef[]): ProjectProduct[] {
  const rows: ManualProduct[] = p.products?.length
    ? p.products
    : [{ id: "p1", name: p.productName, description: p.description }];   // legacy / hand-made
  return rows.map((row) => {
    const built = sourceOf(row, refs);
    const lineage = built ? refs.filter((r) => r.chatId === built.ref.chatId) : null;
    const anyJob = refs.some((r) => r.job);
    const state = built ? "built"
      : row.source || (refs.length && !anyJob) ? "build-gone"
      : refs.length ? "unmatched" : "hand";
    const count = built && lineage ? Math.max(...lineage.map((r) => r.version)) : 0;
    return { id: row.id, name: row.name, description: row.description, built, state,
      version: built && lineage ? { current: built.ref.version, count } : null,
      dropped: built && built.ref.version < count ? { lastIn: built.ref.version, current: count } : null };
  });
}

/** One saved version of one lineage, with what it changed (COR-106). */
export type ProjectVersion = {
  chatId: string | null; lineage: string;               // the chat title, as lineagesOf() names it
  version: number; current: boolean;                     // current = the lineage's newest saved version
  buildId: string; job: BuildJob | null;                 // job null → "build not in this browser"
  savedAt: number | null;
  pieces: { ready: number; total: number; retry: boolean } | null;
  products: { rowId: string | null; productId: string; name: string }[];   // [] when the build is gone
  diff: { added: string[]; dropped: string[]; changed: string[] } | null;  // row ids (or names); null for version 1
};
export function versionsOf(refs: BuildRef[], lineages: Lineage[], rows: ManualProduct[]): ProjectVersion[][];
// per lineage, newest first; products tied to rows by attach()'s rule (source, then product id, then name);
// changed = matched in both versions and its name, BuildProduct.spec or parts (name + quantity) differ

/** A newer build of a lineage that isn't saved anywhere yet (COR-18). */
export function pendingVersionsOf(refs: BuildRef[], all: BuildJob[]):
  { chatId: string; job: BuildJob; version: number; status: BuildStatus }[];
// per lineage with a chatId: the newest b with b.chatId === chatId, !b.projectId, b.createdAt > latest.job.createdAt;
// version = latest.version + 1; status = statusOf(b)

/** The project another build of this chat already became — the v2 target (COR-89). */
export function lineageProjectOf(job: BuildJob, all: BuildJob[], projects: ManualProject[]): ManualProject | null {
  const live = new Map(projects.map((p) => [p.id, p]));
  const sib = all
    .filter((b) => b.chatId === job.chatId && b.id !== job.id && b.projectId && live.has(b.projectId))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  return sib ? live.get(sib.projectId!)! : null;
}

/** The events that aren't versions — saves and builds are in versionsOf() (COR-52, COR-107). */
export type ProjectLogEntry =
  | { kind: "created"; at: number }                                                // hand-made only
  | { kind: "minted"; at: number; intent: Intent; network: Network }
  | { kind: "showcased"; at: number };                                             // while showcasedAt is a time
export function projectLogOf(p: ManualProject, brief: BriefState | null): ProjectLogEntry[];
// created ← p.createdAt when there is no build ref; minted ← brief.mintedAt; showcased ← p.showcasedAt; newest first

export function coverOf(p: ManualProject, refs: BuildRef[]): string | null;   // COR-96
export function resumeStepOf(p: ManualProject): ProjectStep { return p.lastOpened?.step ?? "pcb"; }

/** The one derivation every section reads (COR-74). */
export type ProjectView = {
  refs: BuildRef[]; lineages: Lineage[]; products: ProjectProduct[];
  versions: ProjectVersion[][];   // COR-106 — the Versions block and the product page's select
  pending: ReturnType<typeof pendingVersionsOf>;
  log: ProjectLogEntry[];
  summary: ProjectSummary;      // §5.1.3 — the same object the My projects card renders
  commerce: ProjectCommerce;    // §5.1.4 — the Outcome card
};
export function projectView(p: ManualProject, ctx: {
  builds: BuildJob[]; chats: ChatSession[]; brief: StoredDraft | null; videoJobs: VideoJob[]; now: number;
}): ProjectView;
```

**`normalizeProjects` changes** (`projects.tsx:145-171`), required first:
- **Products** (today `:154-158`): keep `id` when it is a non-empty string
  unique within the project, else assign `p${i+1}` (deduped); keep `source`
  when both its fields are strings; keep `updatedAt` when finite.
- **`builds`**: keep entries with a string `buildId`, a `chatId` that is a
  string or `null`, an integer `version ≥ 1` and a `savedAt` that is a number or
  `null`; dedupe by `buildId`, first wins.
- **`lastOpened`**: keep it when `step ∈ FLOW_STEPS` and `at` is finite.
- The early return at `:162` also requires every product to have a valid id,
  so legacy rows get ids exactly once; the save effect (`:227-230`) persists
  them.
- It never backfills `builds` (that needs the builds store): `buildsOf()` does
  it at read time, and `attach()` freezes a lineage when it writes.

#### 5.1.3 The shared summary — `src/lib/manual/project-summary.ts` (new, pure)

```ts
/** The status is the outcome (owner decisions O5, O6). Showcase is not one of them. */
export type ProjectStatus = "draft" | "private" | "given" | "listed" | "minted";
// LATER: | "lazyMinted" | "auction" | "paused" | "sold" — a live Buy-now listing stays "listed", with live facts

/** One table. Changing a word here changes the list tab, the card chip and the details chip together. */
export const STATUS_WORD: Record<ProjectStatus, string> = {
  draft: "Draft", private: "Private", given: "Given", listed: "Listed", minted: "Minted",
};
export const STATUS_ICON: Record<ProjectStatus, IconName> = {
  draft: "circle", private: "lock", given: "hand-heart", listed: "tag", minted: "hexagon",
};
/** "Listed" never stands alone before a marketplace exists (§4.1). */
export const LISTED_SUBLINE = "Goes on sale when the marketplace opens";

/** The Showcase badge: its own word and icon, info tone, beside the chip (LST-65, COR-9). */
export const SHOWCASE_BADGE = { word: "Showcase", icon: "eye" as IconName };

export function projectStatus(p: ManualProject, draft: StoredDraft | null): ProjectStatus {
  const b = draft?.state;
  if (b?.mintedAt != null) {
    if (b.intent === "sell") return "listed";
    if (b.intent === "give") return "given";
    return "private";
  }
  return p.status === "completed" ? "minted" : "draft";   // "minted" = the record is unreadable (LST-9)
}

/** Showcase, from the project record only (COR-105). Null on a Draft, whatever the record holds. */
export function showcaseOf(p: ManualProject, status: ProjectStatus): { at: number } | null {
  return status !== "draft" && typeof p.showcasedAt === "number" ? { at: p.showcasedAt } : null;
}

export type ProjectSource =
  | { kind: "build"; builds: number }     // buildsOf(p).length, at least one job still in this browser
  | { kind: "build-gone" }                // refs exist, none in this browser
  | { kind: "hand" };

export type NextAction =
  | { kind: "review-version"; label: string; href: string }   // "Review version 3" → /build/<id>
  | { kind: "continue-brief"; label: "Continue Brief"; href: string }
  | { kind: "add-brief"; label: "Add Brief"; href: string }
  | { kind: "open-editor"; label: string; href: string }      // "Open in editor" | "Open in editor · PCB Design"
  | { kind: "view-brief"; label: "View brief"; href: string };
/** The header pair; the My projects card shows `first` (LST-40). */
export type ActionPair = { first: NextAction; second: NextAction | null; violet: boolean };
// Brief hrefs: stepHref(p, "brief"). Editor href: stepHref(p, resumeStepOf(p)). The one function both pages call.

export type ProjectSummary = {
  id: string;
  name: string;
  status: ProjectStatus;
  statusWord: string;                     // STATUS_WORD[status]
  statusLine: string;                     // §4.1
  showcase: { at: number } | null;        // showcaseOf() — the badge and the Showcase tab
  products: { id: string; name: string; description: string }[];   // the current version + products a later version dropped (COR-42)
  productCount: number;                   // products.length — never a count of builds
  source: ProjectSource;
  next: ActionPair;
  when: { label: "Saved" | "Created"; at: number };   // latest savedAt, else createdAt (COR-10, §7)
  version: { kind: "single"; v: number } | { kind: "builds"; k: number } | null;  // "Version 2" | "3 builds" | none
  pendingVersion: { buildId: string; n: number; status: BuildStatus } | null;
  cover: string | null;                   // coverOf()
  mintedAt: number | null;
  sortKey: number;                        // "Recently updated": updatedAt NOW, lastActivityAt NEXT (LST-24)
};
export function projectSummary(p: ManualProject, ctx: {
  builds: BuildJob[]; brief: StoredDraft | null; videoJobs: VideoJob[]; now: number;
}): ProjectSummary;

/** Search (LST-13/14): NFKD, drop diacritics, lowercase; every whitespace token must be found in
 *  the name, a product name, the description or a product description. */
export function matchProject(s: ProjectSummary, description: string, q: string):
  { hit: boolean; via?: string /* the matching product name when it isn't the first product */ };

/** List view state in the URL (LST-28): written with `replace`, defaults left out. */
export type ListQuery = {
  tab: "all" | "draft" | "private" | "given" | "listed" | "showcase";   // showcase = membership (LST-10)
  q: string;
  sort: "updated" | "newest" | "oldest" | "name";
  source: "any" | "build" | "hand";
  page: number;                           // 1-based
};
export const PAGE_SIZE = 12;
// e.g. /projects?tab=draft&q=remote&sort=name&source=hand&page=2
```

#### 5.1.4 The Brief read and the Outcome — `src/lib/brief/project-brief.ts` (new)

```ts
import type { BriefState, BriefStepId, Intent, Network, Token, License } from "@/lib/brief/types";

export type StoredDraft = { state: BriefState; step: BriefStepId };      // ideeza:brief:draft:<projectId>
export function readBriefDraft(projectId: string): StoredDraft | null;    // pure parse + normalizeBrief; corrupt → null
export function useProjectBrief(projectId: string): StoredDraft | null | undefined; // undefined = not read yet

export type Outcome =
  | "none" | "briefing" | "private" | "given" | "listed"
  | "mintedUnreadable";                                                  // status completed, draft unreadable
export type MintStatus = "notMinted" | "minted";                         // LATER: "lazyMinted" | "mintedOnChain"
export type SaleTerms =
  | { kind: "buyNow"; token: Token; price: string }
  | { kind: "auction"; token: Token; minBid: string; buyNow?: string; endsAt: number; ended: boolean };

export type ProjectCommerce = {
  outcome: Outcome;
  intent: Intent | null;
  step?: BriefStepId;                        // when outcome === "briefing"
  mint: MintStatus;
  mintedAt?: number;
  network?: { id: Network; label: string };  // the NETWORKS label, e.g. "Base Sepolia (Testnet)"
  collection?: string;
  sale?: SaleTerms;                          // sell + minted only
  royaltiesPct?: number;                     // sell only, 2–10
  license?: { id: License; label: string; info: string };   // give only
  // No Innovations field: Showcase is the project's own flag (summary.showcase, COR-105), not a Brief term.
  clip: { state: "none" | "rendering" | "ready" | "failed"; progress?: number; eta?: string };
};
export function commerceOf(p: ManualProject, d: StoredDraft | null, jobs: VideoJob[], now: number): ProjectCommerce;
// none: no draft or intent null · briefing: intent, mintedAt null · private / given / listed: minted, by intent
// · mintedUnreadable: p.status "completed" and d null.
// projectStatus() maps none|briefing → draft and mintedUnreadable → minted; a test asserts they agree.
```

#### 5.1.5 Permissions — `src/lib/manual/permissions.ts` (new)

```ts
export type Viewer =
  | { kind: "local-owner" }        // whoever opens the page in this browser
  | { kind: "owner-preview" };     // ?view=buyer: visitor permissions

export type Action =
  | "project.rename" | "project.editDescription" | "project.delete"
  | "project.openEditor" | "project.brief" | "project.showcase"   // showcase: minted projects only
  | "product.add" | "product.edit" | "network.manage" | "app.manage"
  | "activity.write" | "activity.seeListedMarker"
  | "facts.seeOwnerOnly"                               // Outcome, Versions, Stored, part changes
  | "deliverables.download"
  | "preview.enter"
  // LATER, declared now so controls already call them:
  | "listing.manage" | "share.newsfeed" | "premiumParts.manage"
  | "people.seeRoster" | "people.invite" | "people.manage" | "ownership.listShare"
  | "customers.see" | "project.report";

export function can(viewer: Viewer, action: Action, ctx?: CanContext): boolean;
// local-owner → every creator action except the people ones (no data yet); owner-preview → the visitor set only

/** Is there an audience at all? Gates Preview as buyer (PPL-9). False only for a Private project that isn't showcased. */
export function hasAudience(status: ProjectStatus, showcase: { at: number } | null): boolean;

/** Why Delete is blocked, or null (COR-70). NOW: "listed". LATER: "sold" | "otherOwners" | "restricted" | "inManufacture". */
export function deleteBlockOf(status: ProjectStatus): { reason: string; detail: string } | null;
// listed → { reason: "A listed project can't be deleted.",
//            detail: "There's no way to withdraw a listing yet — that comes with the marketplace." }
```

`ManualProject` gets **no** people fields NOW: `ownerId: "me"` or
`contributors: []` would be invented data.

#### 5.1.6 Editor facts — `src/lib/manual/editor-work.ts` (new, pure readers)

```ts
export type StepFact =
  | { state: "not-opened" }                        // no doc for this project
  | { state: "sample" }                            // PCB: only `sch-` sample objects (types.ts:1503-1508 ids)
  | { state: "work"; text: string }                // "42 objects · 12 on the board", "6 parts · 9 wires", "8 of 12 parts checked", "AI model generated"
  | { state: "none" };                             // nothing attributable (Code, Preview; 3D without an AI model)
export type EditorWork = Record<Exclude<ProjectStep, "brief">, StepFact>;
export function editorWorkOf(projectId: string): EditorWork;
// PCB `ideeza:pcb:doc:<id>`: placed = objects without the `sch-` prefix; on the board = boardPartsOf(doc)
//   (extract assembly-app.tsx:36-57's filter into src/lib/pcb/board-parts.ts so Assembly and this read one rule)
// Assembly `ideeza:assembly:<id>`: true entries ∩ boardPartsOf ids
// Wiring `ideeza:wiring:doc:<id>`: { parts, wires } (the default is empty, wiring-context.tsx:85-86)
// 3D `ideeza:three:aimodel:<id>`: glbUrl present (ai-generate-modal.tsx:27-29)
```

#### 5.1.7 Writers

| Fact | Writer | Call site |
|---|---|---|
| Pure attach | `attach(p, job, lineage, now, opts)` — exported, unit-tested (§5.1.8) | new, `projects.tsx` |
| A build joins a project | `attachBuild(projectId, job, lineage)` = `setProjects(arr => arr.map(p => p.id === projectId ? attach(p, job, lineage, Date.now()) : p))`, returning the new record; idempotent by `job.id` | new Ctx member |
| Save / Open in editor | `projectFromBuild(job, lineage)` — the five steps in §5.1.8 | `projects.tsx:282-346` |
| Its callers pass the lineage | `const { builds } = useCreateHistory()` (add to the destructure at `review-outputs.tsx:101-102`); `projectFromBuild(job, builds.filter(b => b.chatId === job.chatId && b.id !== job.id))` in `openInEditor` and `saveProject`; the footer copy uses `lineageProjectOf()` and the next version number (COR-40) | `review-outputs.tsx:224-238`, `:514-580` |
| Brief Step 1 default | `seedFromBuild`: `decided = lineageProjectOf(job, builds, projects)?.id ?? (today's choice)` | `brief-app.tsx:197-203` (pass `builds` in from `:523`) |
| The Brief attaches a build | Both branches (`seedDraft` true `:849-858`, and kept `:859-875`, which today attaches the build without its products) call `attachBuild(targetId, job, lineage)` first; the Step 1 text edits then apply through `mergeProductEdits`; `...(created ? { buildId } : null)` becomes `attach(…, { origin: created })` | `brief-app.tsx:847-883` |
| Brief text edits | `mergeProductEdits(prev, edits, now)`: by index when the lengths match, else by normalized name; carries `id` and `source`; stamps `updatedAt` only on rows whose text changed; never drops a row. Replaces the raw `products: productList` writes | `brief-app.tsx:849-858`, `:912-915` |
| Brief product count | `productsOfProject(p, buildsOf(p, builds)).length` | `brief-app.tsx:748-755` |
| Primary description | `productsOf` adds `...(job.description ? { description: job.description } : null)` to the primary | `history.tsx:396-411` |
| Headline rename in the editor chrome | also renames `products[0]` when its name equals the old `productName`, and stamps its `updatedAt` | `product-name-field.tsx:42-45` |
| Step opened | `touchOpened(project.id, step)` once the workspace gate passes (`hydrated && activeProjectId === project.id`); skipped when the same step was stamped < 60 s ago; never bumps `updatedAt` | `project-workspace.tsx:87-94` |
| Rename / description | `updateProject(id, { name })` / `{ description }` (exists, `projects.tsx:260-271`); new callers on this page. `ProjectInfoModal` stops overwriting an existing project's description (CNT-6) | `project-info-modal.tsx:115` |
| Showcase | `setShowcase(id, on)`: `updateProject(id, { showcasedAt: on ? Date.now() : null })`; its callers pass only a minted project | new Ctx member; the Outcome row (COM-55) and the success step (COM-56) |
| The Brief's mint | `commit()` also calls `setShowcase(scopeProjectId, true)` with the mint time when `state.shareToNewsfeed` is ticked, beside `setStatus(…, "completed")` | `brief-app.tsx:1009-1036` |
| Showcase, once for older mints | where a draft is first read (`useProjectBrief`, and the list's `readBriefDraft` pass): a minted draft with `shareToNewsfeed`, on a project whose `showcasedAt` is absent, writes `showcasedAt = mintedAt`; `null` (stopped) is never overwritten | `project-brief.ts`; `my-projects.tsx` |
| The success step | `Step4Success` gains `projectId` and reads `showcasedAt` through `useManualProjects()`; its Showcase button and Undo call `setShowcase` | `step-4-success.tsx` |
| Delete | refused before the dialog when `deleteBlockOf(status)` names a reason (COR-70). `deleteProject(id)`: `setProjects(arr => arr.filter(p => p.id !== id))`; if `activeProjectId === id` → `setActiveProjectId(null)`; delete the `builtFrom` entries holding this id (`:210`); sweep §5.1.9; `deleteNetwork(id)` (`network/store.ts:87`, which also notifies). Every `build.projectId` is kept | new Ctx member |
| Write failures | `saveJSON` returns `boolean` in both stores; the save effects set `writeError` on `false` | `projects.tsx:93-98`, `:227-230`; `history.tsx:365-370` |
| Network parts | `networkProducts(project, refs: BuildRef[])` resolves parts through `sourceOf`; ids stay `p-<slug(name)>`. Callers pass `buildsOf(project, builds)`; the review card passes `[{ buildId: job.id, chatId: job.chatId, version: 1, savedAt: null, job }]` for an unsaved build | `network/products.ts:22-47`; `network-section.tsx:28-31`; `add-network-dialog.tsx:113`; `connection-map-page.tsx:59-67`; `network-action.tsx:23` |
| The page | `:73-77` → `projectView()`; `:102-105` → `resumeStepOf`; `:132-277` → the header and tabs; `:280-309` → the rail; `:317-384` (`Deliverables`) → the product page; `:422-440` (`StatusBadge`) → the shared chip; `:459-507` (`EmptyNote`, `NotFound`) → `StateCard`; `conceptOf` (`:524-542`) moves to `project-read.ts` | `components/projects/project-details.tsx` |
| The list | its inline brief read (`my-projects.tsx:119-141`) → `readBriefDraft`; its card → `projectSummary()` | `components/projects/my-projects.tsx` |

#### 5.1.8 The rebuild → v2 fix at save

**The bug today.** Rebuilding a chat and pressing Save makes a second,
same-named project, because `projectFromBuild` only knows the build's own
`projectId` and the setup answer (`projects.tsx:282-346`). The project page then
shows only the first build's products (lifecycle defects 1 and 6).

**The fix: `projectFromBuild(job, lineage)`**, in order:
1. `job.projectId` names a live project → return it (unchanged, `:284-287`).
2. The `builtFrom` guard (unchanged, `:291-292`).
3. **New:** the newest build of the lineage with a live `projectId` →
   `attachBuild(target.id, job, lineage)`. This build becomes version n+1 of
   that project.
4. `projectChoiceId` names a project (a build joining one the maker chose) →
   `attachBuild(chosen.id, job, lineage)`, which replaces the hand-rolled append
   at `:305-329`.
5. Otherwise create: `createProject(...)`, then `attach(created, job, [], now,
   { origin: true })` — it sets `buildId`, `productName`, `builds: [v1]` and
   products with ids and sources.

**`attach(p, job, lineage, now)` — the one merge** (replaces `projects.tsx:305-329`
and `brief-app.tsx:819-858`):

```ts
export function attach(p: ManualProject, job: BuildJob, lineage: BuildJob[], now: number,
                       opts: { origin?: boolean } = {}): ManualProject {
  const refs0 = p.builds ?? [];
  if (refs0.some((r) => r.buildId === job.id)) return p;                         // one build, one attach
  // Freeze this lineage's legacy builds first, so its numbering can never shift later.
  const frozenJobs = lineage
    .filter((b) => b.projectId === p.id && !refs0.some((r) => r.buildId === b.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  let v = Math.max(0, ...refs0.filter((r) => r.chatId === job.chatId).map((r) => r.version));
  const frozen = frozenJobs.map((b) => ({ buildId: b.id, chatId: b.chatId, version: ++v,
    savedAt: b.id === p.buildId ? p.createdAt : null }));
  const builds = [...refs0, ...frozen, { buildId: job.id, chatId: job.chatId, version: ++v, savedAt: now }];

  const priorIds = new Set(builds.filter((r) => r.chatId === job.chatId && r.buildId !== job.id).map((r) => r.buildId));
  const prior = lineage.filter((b) => priorIds.has(b.id)).sort((a, b) => b.createdAt - a.createdAt);
  const modelName = (bp: BuildProduct, j: BuildJob) => (bp.id === "primary" ? j.title : (bp.name || bp.title)).trim();
  const modelDesc = (bp: BuildProduct) => (bp.description || bp.summary || "").trim();
  const incoming = productsOf(job).map((bp) => ({ bp, name: modelName(bp, job), description: modelDesc(bp) }));
  const rows = p.products?.length ? p.products
    : p.productName.trim() ? [{ id: "p1", name: p.productName, description: p.description }] : [];

  const used = new Set<string>();
  const take = (pred: (x: (typeof incoming)[number]) => boolean) => {
    const m = incoming.find((x) => !used.has(x.bp.id) && pred(x));
    if (m) used.add(m.bp.id);
    return m;
  };
  const next: ManualProduct[] = [];
  for (const row of rows) {
    const inLineage = row.source ? priorIds.has(row.source.buildId)
      : prior.some((j) => productsOf(j).some((x) => norm(modelName(x, j)) === norm(row.name)));
    if (!inLineage) {
      // Another lineage, or hand-made. A sourceless row named like an incoming product adopts it
      // (a build joining a hand-made project).
      const m = !row.source && priorIds.size === 0 ? take((x) => norm(x.name) === norm(row.name)) : undefined;
      next.push(m ? { ...row, source: { buildId: job.id, productId: m.bp.id }, updatedAt: now } : row);
      continue;
    }
    // Same lineage: this version replaces the row — matched by product id, then by name.
    const m = take((x) => x.bp.id === row.source?.productId) ?? take((x) => norm(x.name) === norm(row.name));
    if (!m) { next.push(row); continue; }    // not in this version: it stays listed, its source still the last version that had it (COR-108)
    // Keep the maker's own words; take the model's new words only where the row still holds the previous version's.
    const before = prior.flatMap((j) => productsOf(j).map((bp) => ({ bp, j })))
      .find(({ bp, j }) => (row.source ? bp.id === row.source.productId : norm(modelName(bp, j)) === norm(row.name)));
    const keepName = !before || row.name !== modelName(before.bp, before.j);
    const keepDesc = !before || row.description !== modelDesc(before.bp);
    next.push({ ...row,
      name: keepName ? row.name : m.name,
      description: keepDesc ? row.description : m.description,
      source: { buildId: job.id, productId: m.bp.id }, updatedAt: now });
  }
  for (const x of incoming) if (!used.has(x.bp.id))
    next.push({ id: newProductId(), name: x.name, description: x.description,
      source: { buildId: job.id, productId: x.bp.id }, updatedAt: now });

  const headMoved = !p.productName.trim() || p.productName === rows[0]?.name;
  // The headline is never a dropped row: skip rows still pointing at an older version of this lineage.
  const head = next.find((r) => !(r.source && priorIds.has(r.source.buildId))) ?? next[0];
  return {
    ...p, builds, products: next,
    ...(headMoved && head ? { productName: head.name } : null),
    ...(opts.origin && !p.buildId ? { buildId: job.id } : null), // only the project this build CREATES records it as origin
    updatedAt: now,
  };
}
```

- A product-id match (`"primary"`, companion ids) is tried before a name match,
  so a rename in the Brief survives a rebuild.
- A re-save of the same build is a no-op (the first line); it replaces today's
  case-insensitive name dedupe as the guard against double-adding.
- `buildId` stays "origin only": a join never stamps it.
- A product that version 1 had and version 2 dropped **stays in the current
  list** (owner decision O9, COR-108): its row keeps its id, its text and its
  `source`, which still names the version 1 build, so the card can say "Not in
  version 2 · from version 1" and its page opens at version 1. A version 3 that
  has it again matches the same row (by product id, then name) and moves its
  source forward.
- The headline product (`productName`) follows the current version: a dropped
  headline hands the name to the first row the new version holds.

#### 5.1.9 Storage keys and the delete sweep

| Key | Owner | Per project | On delete |
|---|---|---|---|
| `ideeza:manual:projects` | projects store (`projects.tsx:80`) | array | the entry is removed |
| `ideeza:manual:active` | projects store (`:81`) | — | cleared when it names the project |
| `ideeza:pcb:doc:<id>` | PCB store (`pcb/store.tsx:503-511`) | yes | removed |
| `ideeza:wiring:doc:<id>` | wiring (`wiring-context.tsx:77-83`) | yes | removed |
| `ideeza:assembly:<id>` | assembly (`assembly-app.tsx:22`) | yes | removed |
| `ideeza:three:aimodel:<id>` | 3D AI model (`ai-generate-modal.tsx:27-29`) | yes | removed |
| `ideeza:brief:draft:<id>` | the Brief (`brief/types.ts:23-25`) | yes | removed |
| `ideeza:network:<id>` | network (`network/store.ts:10`) | yes | `deleteNetwork(id)` (`:87-92`) |
| `ideeza:brief:draft:build:<buildId>` | the Brief, build scope | per build | **kept** — it belongs to the build |
| `ideeza:code:*`, `ideeza:3d:shapes`, `ideeza:3d:right`, `ideeza:preview:*` | global today | no | **not touched** — they can't be attributed (sub-project B) |
| `ideeza:create:builds`, `ideeza:create:chats` | history store | no | **kept**; builds keep their now-dangling `projectId` |
| NEXT: `ideeza:project:journey:<id>`, IndexedDB `ideeza-media` by project, `ideeza:project:activity:<id>`, `ideeza:project:bizplan:<id>`, `ideeza:mint:<id>` | their areas | yes | added to the sweep when each ships |

#### 5.1.10 Limits

| Field | Rule |
|---|---|
| `ManualProduct.id` | `prd_` + 8 base-36 chars on write; `p<n>` for legacy rows; unique within a project; never reused after a product leaves. |
| `ProjectBuildRef.version` | an integer ≥ 1, unique per (project, chatId); appended only. |
| `lastOpened` writes | at most 1 per 60 s per step; never bumps `updatedAt`. |
| Project name | trimmed, 1–80 characters (CNT-2). |
| Description | trimmed, 0–1,000 characters; a counter from 800 (CNT-5). |
| Delete, typed confirmation | an exact match of the trimmed project name, case-sensitive, only when COR-69 applies. |
| `showcasedAt` | a finite number (ms) or `null`; written only by `setShowcase` and the Brief's `commit()`; a Draft is never showcased. |
| Versions shown | the Versions block shows 5 per project, then **Show all ({n})**; `versionsOf()` itself is never capped. |
| Record size | each ref ≈ 90 characters, each product source ≈ 95; no blobs or URLs are copied into the record. |

### 5.2 My projects (`/projects`)

| ID | Requirement |
|---|---|
| LST-1 | **Header.** h1 "My projects"; an intro of at most 62ch: *"Every project you've saved — from an AI build or started by hand. They're stored in this browser."*; `document.title` "My projects · IDEEZA". |
| LST-2 | **"New project"** (owner decision O11) — a secondary button, right-aligned in the header, that links to Home (`/`), where creation lives. No creation flow runs on this page. |
| LST-3 | **Gutters and width.** 16 px below a 640 px viewport, 32 px from 640; content capped at 1280 px and centred; nothing scrolls sideways at 400 px. |
| LST-4 | **The tab set** (amended, §7; owner decisions O5, O6): exactly **All · Draft · Private · Given · Listed · Showcase**, one selected, each with a live count. Draft · Private · Given · Listed are the outcome tabs: every project is in exactly one, so their counts add up to All — except LST-9. **Showcase** is a membership tab, last, after a hairline divider: its projects are also counted in their outcome tab, and its count is outside that sum. |
| LST-6 | **Removed tabs.** Completed and Utility NFT are removed (they held the same set). All is the landing tab. "Utility NFT" is kept free for real benefit NFTs (LATER). |
| LST-7 | **Counts** read "—" until the projects and every brief draft have been read; they are read again on window focus and on `storage` events, so a mint in another tab moves the card. |
| LST-8 | **Tab semantics.** A real ARIA tablist: one Tab stop, ← → Home End, `aria-controls` on one tabpanel, accessible names that carry the count ("Draft, 9 projects"). Changing tab resets the page to 1 and keeps the search and facets. |
| LST-9 | **Brief record missing.** `status: "completed"` with a missing or corrupt draft shows the chip **Minted**, under All only among the outcome tabs — never under a guessed one. When showcased it is also under Showcase, which reads the project record, not the draft. |
| LST-10 | **The Showcase tab** (amended, owner decision O5): the projects whose `showcasedAt` is a time (COR-105), on any outcome, labelled **Showcase** — the badge's word. It reads the project record, never the brief draft, and its order and search follow the rest of the list. A project leaves it the moment the maker stops showcasing. |
| LST-13 | **What search matches:** the project name, every product name (`products[].name`, falling back to `productName`), the description and every product description. Case- and accent-insensitive, trimmed; with several words all must match. "remote" finds Car's Remote Controller. |
| LST-14 | **Which product matched.** When the only match is in a product other than the first, the product line reads "… · matches Remote Controller". |
| LST-15 | **Search controls.** Enabled on every tab. Placeholder *"Search projects and products"*; a clear (×) control; "/" focuses search unless focus is in another field (⌘K stays with the command palette); Esc clears it while focused. |
| LST-17 | **Source filter**, in the Figma's "Status" slot: **Any source · AI build · By hand**. "AI build" = a saved build points at the project, or `project.buildId` is set (also when that build is gone). |
| LST-18 | **Facets combine** with AND, each an independent single-select that resets with "Any …". A facet not on "Any …" shows as a removable chip on the row under the toolbar; **Clear filters** resets every facet and leaves the search. One control per facet, in the toolbar. |
| LST-23 | **Sort:** **Recently updated** (default; `updatedAt`, newest first) · **Newest to oldest** (`createdAt`) · **Oldest to newest** (`createdAt`) · **Name A–Z**; ties by name, then id. |
| LST-26 | **Count line**, left on the row under the toolbar: "38 projects", or "4 of 38 projects" when a tab, search or facet narrows the view; on every tab; announced in a polite live region after each change. |
| LST-27 | **Pagination.** 12 per page; bottom-right `‹ 1 … n-1 n n+1 … last ›` with `aria-current`; hidden on a single page; below 480 px "‹ Page 2 of 4 ›"; a page change scrolls to the results and focuses the results heading. |
| LST-28 | **View state in the URL** (`ListQuery`, §5.1.3), written with `replace`, defaults left out; Back from a project returns the same view at the same scroll position. |
| LST-31 | **After a delete** (amended: NOW, because delete ships NOW): the project leaves the list and the counts at once; a page left empty shows the previous page. |
| LST-33 | **Cover**, 16:10: `coverOf()`, else a neutral placeholder tile. No carousel dots. A failed image shows the caption *"Image didn't load"* on the placeholder. `loading="lazy" decoding="async"`. |
| LST-35 | **Status chip**, top-right over the cover (beside the title on row cards): word + icon from §4 (Draft · Private · Given · Listed · Minted), sentence case, 12 px semibold; Draft neutral, the minted words success; the same word as the details chip; never violet. |
| LST-65 | **(new) The Showcase badge** on the card, when `summary.showcase` is set: the eye icon and "Showcase", info tone, 12 px semibold, to the left of the status chip over the cover (beside the chip on row cards, wrapping under the title when narrow); the same badge as the details header (COR-9); never violet; not a control. Its accessible name is "Showcased". |
| LST-36 | **Title:** the project name as an h3, 16 px, up to 2 lines, the full name as a tooltip; the card's link to `/projects/<id>`, stretched over the cover and title. The small "Details" pill is removed. |
| LST-37 | **Product line:** "4 products · RC Car Controller, Remote Controller +2"; "1 product" in the singular; an unnamed product reads "not named yet", never "Untitled product". The count comes from the shared selector: products, not builds. |
| LST-38 | **Source tag** in the meta row: **"AI build"**, **"By hand"** or **"AI build · not in this browser"**, the last with the tooltip *"The build this project came from isn't stored in this browser any more. Its products are still listed."* The same words as the details Source row. |
| LST-39 | **Status line**, under the product line, up to 2 lines, from §4.1. |
| LST-40 | **Next-action button:** one full-width secondary button with a boundary of at least 3:1, showing `next.first` (Review version {n} · Continue Brief · Add Brief · Open in editor), `aria-label` "{label} for {project}", "Opening…" while it navigates, a second press blocked. Never "Resume —", never "Next:", never a step bar. |
| LST-41 | **Date** (amended): the meta-line fact — "Saved {when}" for a built project, "Created {when}" for a hand-made one — where {when} is the time today, "Mon D" this year and "Mon D, YYYY" earlier; a `<time dateTime>` with the full date in `title`; the details page's formatter in its short form. |
| LST-42 | **Version** (amended: NOW) in the meta row: "Version {v}" when one lineage has more than one version, "{k} builds" with several lineages; absent otherwise. |
| LST-43 | **New version waiting** (amended: NOW): when a newer build of the project's chat is ready and unsaved, the status line reads "Version {n} is ready to save" and the button **Review version {n}** opens that build. Never on a minted project. |
| LST-49 | **No ⋮ on cards.** Its three items have homes on the details page: Edit → inline rename and description; Delete → Manage; Add New Product → the "Add a product" tile (NEXT). |
| LST-51 | **Loading:** six skeleton cards in the grid shape (cover block, two bars, a status-line bar, a button block); the tab row, search, dropdowns and count row render normally with counts "—"; no stat placeholders; a static shimmer under reduced motion. |
| LST-52 | **No projects at all:** `StateCard` "No projects yet" with today's body — *"A project starts on Home. Describe an idea and Generate with AI, then press Save Project on the finished build — or pick Build manually to start from an empty board. Either way it lands here."* — and **Go to Home**, the page's one violet button; tabs and toolbar hidden. |
| LST-53 | **Empty tab** — teaching copy, no button, tabs still visible (table below). |
| LST-54 | **No match:** *"No matches for "{q}""*, body *"Nothing in {tab} has that in a project or product name or description."*, **Clear search**, and **Search all projects** when a tab or facet also narrows the view. |
| LST-56 | **Grid columns** by a container query on the content box: 1 below 560 px, 2 from 560, 3 from 900; a card is never narrower than 260 px. |
| LST-57 | **Row cards** below a 560 px content box: a 96 × 60 cover, the chip beside the title, the lines stacked, a full-width button; tabs wrap; search takes a row; Source and Sort share one. |
| LST-58 | **Tokens and atoms only:** `SearchInput`, `SelectMenu`, `Button`, `ButtonGroup`, `StateCard`, `Badge` (extended with the status tones); `bg-bg-brand`, never `bg-violet-*`; meta ≥ 12 px, lines 14 px, titles 16 px. |
| LST-59 | **Focus and targets:** rings offset 2 px in the surface colour on filled controls; tabs, card buttons and pagination 36 px; touch rows ≥ 44 px. |
| LST-60 | **Heading outline:** h1 "My projects"; a visually hidden h2 "{Tab} projects", which is the results heading and the focus target; card titles h3. |

**Empty-tab copy (LST-53)**

| Tab | Title | Body |
|---|---|---|
| Draft | No drafts | "Every project here has been minted. A build you save starts as a draft." |
| Private | Nothing saved as private yet | "In a project's brief, choose Save as Private and mint. Only you can see it." |
| Given | Nothing given to the community yet | "In a project's brief, choose Give to Community and mint." |
| Listed | Nothing listed yet | "In a project's brief, choose Sell Your Idea and mint. It goes on sale when the marketplace opens." |
| Showcase | Nothing showcased yet | "Showcase a minted project from its page, or when its brief finishes. Nothing is posted until Innovations opens." |

**Keyboard order:** New project → the tablist (one stop) → search → Source →
Sort → per card, the title link then the button → pagination.

### 5.3 The project page: shell and states

| ID | Requirement |
|---|---|
| ACT-2 | **The shell.** The page sits in the Creator's own `(create)` shell with "My projects" as the active nav item. |
| COR-1 | **Route and not-found.** `/projects/[id]` resolves by id, then by slug (today `project-details.tsx:68-71`). No match renders `StateCard` *"We couldn't find this project"* with today's body and **Back to My projects** as a token button (not `bg-violet-600`, `:501`). |
| COR-2 | **Loading.** Until both stores hydrate, a skeleton in the page's final shape (header lines, tab strip, two cards, rail blocks) with `role="status"` named "Loading project". No section flashes an empty state before its own read completes. |
| COR-3 | **Document title** "{project} · My projects · IDEEZA"; the product page "{product} · {project} · IDEEZA". |
| COR-4 | **Breadcrumb** "My projects › {project}" (product page "… › {product}"); links ≥ 24 px tall; the current crumb plain text with `aria-current="page"`, truncated with the full name in `title`. |
| COR-5 | **Layout** (amended threshold, §7): content capped at 1280 px; gutters 32 px from 640 px, 16 px below; when the page container is ≥ 1024 px, a fluid main column (`min-width: 0`) and a 360 px rail, 28 px apart; below that one column (§3.3). A container query, not a window breakpoint. The Figma's fixed 633 / 482 split is not reproduced. |
| COR-6 | **Tokens and type.** No arbitrary px and no raw palette (`bg-violet-600` at `:143`, `:501`); body ≥ 14 px, meta ≥ 12 px; status words in sentence case, never 10 px uppercase pills; status tones neutral or semantic, never violet. |
| COR-7 | **Route focus and history.** On arrival, focus moves to the h1 (`tabIndex=-1`) and a polite live region announces "{project}". The page tab, the product page's version and its deliverable tab are URL state, so Back restores them. |
| COR-75 | **Draft sub-states** are told by the status line — "Not briefed yet" · "Brief in progress · …" · "Brief started" — never by more chips. |
| COR-76 | **Minted states** (simulated; amended, owner decisions O5, O6): Private · Given · Listed, from `intent` + `mintedAt`. Showcase is not among them: it is the `showcasedAt` flag on any of them (COR-105). "Listed" never appears without its subline *"Goes on sale when the marketplace opens"*; "Lazy minted" never appears now. |
| COR-77 | **Unreadable record.** `status === "completed"` with a missing or corrupt draft reads "Minted" and says why (COM-15). |
| COR-78 | **Orphans.** Build gone: Source reads "AI build · not in this browser", product cards aren't links, products stay listed. Chat gone: no part-changes line, and the lineage's heading in Versions is plain text, not a link; the booked specs stay. A gone build's Versions entry reads "build not in this browser". The page never contradicts itself (today "Built manually" sits beside "the build is gone", `:295-306`). |
| COR-79 | **LATER states render nothing now:** lazy minted, minted on chain, a live listing (Listed on sale, Auction), paused, sold, Utility NFT, restricted, in manufacture. Each has its slot in §4.2. |

### 5.4 The header

| ID | Requirement |
|---|---|
| COR-8 | **Header content, in order:** the h1 with its rename pencil — one line, truncated with the full name on hover and focus (ACT-7); the status chip and status line; the meta line; the description, clamped to 5 lines with "Show more" / "Show less" (ACT-9), and its editor. The Figma's gear and "Level 1 ▾" badges are not built. |
| COR-9 | **One status chip**, beside the status line: the word and icon from §4 (Draft · Private · Given · Listed · Minted). It replaces the Figma's visibility pill *and* "Mint Status: …". The Outcome card carries no second chip. When the project is showcased, the **Showcase badge** (LST-65's badge) sits between the chip and the status line — a second fact, not a second state, and not a control. |
| COR-10 | **Meta line.** Built: "{n} products · Version {v} · Saved {date}" ("Version {v}" only with one lineage of more than one version; several lineages read "{k} builds"). Hand-made: "{n} product(s) · Made by hand · Created {date}". Build gone adds "· build not in this browser". Dates use the one formatter inside `<time>`. It replaces the "Product: X" line and the rail's Product and Last updated rows. |
| COR-11 | **The action pair:** at most one violet primary and one quiet secondary, from `nextAction()` (§3.5), so the card and the header can't differ. Both use `LeaveButton`'s press state ("Opening…", blocks its sibling; `review-outputs.tsx:635`). At 400 px they stack full width, primary first. |
| COR-12 | **Open in editor** resumes `lastOpened.step` (fallback PCB), not `firstIncompleteStep` (which always returns PCB, `projects.tsx:479-484`). Label "Open in editor", or "Open in editor · {step}" once a step is recorded. For a project with a build, a visible hint under the header, also the pair's `aria-describedby`: *"The editor starts from a sample board — your build's parts aren't in it yet."* It stays until sub-project B makes the editor load the build (§11). |
| COR-13 | **Preview as buyer** is the header's last control, after the pair, quiet (its behaviour is PPL-4…9, §5.11). |
| COR-14 | **No ⋮ and no Share in the header now.** Every Figma ⋮ item has one home or is absent (§3.7). A ⋮ returns only if two rare, real project actions exist. |
| COR-15 | **Absence rule for the Figma identity block.** The header never shows a wallet row, "Created by" / "Owned by", a person card, a stats row, the business-plan chip, "In Manufacture" or "Utility NFT ▾". Each has its later home (§3.7). |
| PPL-3 | **Honest absence of people surfaces.** Until auth and a backend exist the page shows no ownership share, no Contributors or Customers tab, no "Created by" / "Owned by" line or person card, no restriction state and no Report action — and no empty or "coming soon" placeholder for any of them. |
| COR-18 | **Pending version notice**, above the tabs, per lineage whose newest build is newer than its latest saved version and has no `projectId`: ready → info banner *"Version {n} of {lineage} is ready to save."* (not minted: the action is the header primary; minted: the banner carries a quiet **Review version {n}**); running → *"Version {n} is building — {k} of {m} pieces."* (no action); partial or failed → *"Version {n} needs a retry. Open the chat to retry it."* with a quiet **Open chat**. A pending build's pieces are never shown as the project's. |
| COR-72 | **Rename and description are inline** (CNT-1…7). The Figma's "Edit Project Details" modal is not built; its "Collection" field is the Brief's NFT collection, not a project field. |
| CNT-1 | **Rename inline.** A pencil button named "Rename project" (≥ 24 px) beside the h1 swaps it for a one-line input labelled "Project name" holding the name. **Enter** or **Save** saves; **Esc** or **Cancel** restores it; focus returns to the pencil. Clicking outside neither discards nor saves. While saving, Save reads "Saving…", then a polite "Renamed to “{name}”". No other surface edits the name. |
| CNT-2 | **Name rules.** Trimmed, 1–80 characters. Empty → *"Give the project a name."*; over 80 → a live error with an "n/80" counter. A name another project uses is allowed, with the note *"Another project is already called “{name}”."* |
| CNT-3 | **Rename changes the name only:** `name` through `updateProject`; `slug` never changes (the editor lives at `/project/<slug>`). The breadcrumb, `<title>` and the My projects card follow at once. |
| CNT-4 | **The description is edited inline:** "Edit description" opens an auto-growing textarea with **Save** / **Cancel**; Cmd/Ctrl + Enter saves; Esc cancels, first asking *"Discard changes?"* (**Keep editing** / **Discard**) when the text changed. An empty description shows an **Add a description** button, never placeholder prose. |
| CNT-5 | **Description limit:** 0–1,000 characters after trimming; a counter from 800 ("812 / 1,000"); past the limit Save is refused with *"Keep it under 1,000 characters (now {n})."* An older, longer description loads intact and is flagged only once edited. A failed write keeps the text: *"This browser's storage is full — the change wasn't saved."* |
| CNT-7 | **"Draft from products"**, a quiet helper in the description editor's footer, shown only when at least two products have descriptions. It sends the product names and descriptions to `/api/refine` in a new `project` mode (the same free text model, 45 s limit). While it works: *"Writing… this can take up to 40 seconds"* and **Cancel**. The result lands in the textarea as an unsaved draft: *"Draft from your {n} products — review, then Save."* with **Undo**. When the model is unreachable: *"The AI wasn't reachable, so this joins your products' own descriptions."* It costs nothing; there is no coachmark. |

### 5.5 The tabs

| ID | Requirement |
|---|---|
| COR-19 | **The tab set** (owner decision O7): **Products · Media · Network** now — Network is its own tab, never a section. LATER, Contributors · Customers are appended after Network. No Premium Parts tab. The strip lists only tabs with a real home. |
| COR-20 | **Tab mechanics:** an ARIA tablist with roving tabindex and ←/→/Home/End through the shared `moveTab` (extracted from `review-outputs.tsx:592`); one `tabpanel`; the selected style is neutral subtle; state in `?tab=media` or `?tab=network` (Products is the default and is omitted); a tab change `router.push`es, so Back returns to the previous tab; height ≥ 36 px (44 px on touch). |
| COR-21 | **Tabs at 400 px:** one row, never wrapped, horizontally scrollable, the selected tab scrolled into view; labels never truncate. |

### 5.6 The Products tab

| ID | Requirement |
|---|---|
| COR-22 | **Heading row:** h2 "Products", then "{n} products · {ready} of {total} pieces ready" ({n} counts every card, dropped ones included; the pieces count the current version, and read "… in version {v}" when a dropped product is listed), then the project headline **"Build check: {weakest tier}"** (`checkBuild().headline`, `confidence.ts:305-343`). The badge is a disclosure holding `TIER_MEANING` / `DRAFT_UNCHECKED_MEANING` and `DRAFT_CREDIT_NOTE`, which must be on screen wherever "Draft" is. |
| COR-23 | **Product cards**, one per product in the list (COR-42: the current version, plus products a later version dropped), in `products[]` order; 1 column below a 520 px container, 2 from 520, 3 from 880. A card shows its own concept image (16:10, space reserved, lazy, and *"Image didn't load"* on error); the name as an h3 (2 lines, full name on focus); "Build check: {tier}"; labelled facts **Size · Board · Power** (+ **Radio**), a missing fact omitted (never "None" or "0 × 0"); "{k} of {m} pieces ready" only when not all are; "v{n} · {date}" only when its lineage has more than one version; one line of part changes (owner only). The whole card is one link to the product page. No ⋮, no stats, no dots, no stage pill. |
| COR-24 | **Card states.** Built → a link. Dropped (COR-108) → a link, with *"Not in version {current} · from version {lastIn}"* in place of "v{n} · {date}", its facts from version {lastIn}, and the link opening that version. Build gone → name and description kept, *"Its build isn't in this browser any more."*, not a link. Unmatched → *"Its build can't be matched to this name."*, not a link. Hand-made → *"Made by hand — its work is in the editor."*, not a link. An unnamed product reads *"Not named yet"*. |
| COR-25 | **No pagination.** Every product shows. |

### 5.7 The product page and versions

| ID | Requirement |
|---|---|
| COR-30 | **Route** `/projects/[id]/products/[productId]`, a thin server page like `app/(create)/projects/[id]/page.tsx`. An unknown product renders `StateCard` *"This product isn't in {project}"* with a link back. |
| COR-31 | **Product header:** h1 name; "Build check: {tier}" with the COR-22 disclosure; the meta "Version {v} of {n} · Built {date} · Concept {conceptNumber} · {k} of {m} pieces ready"; the **frozen concept description** (`BuildProduct.description`, else `ManualProduct.description`; H-7), clamped; the part-changes line (owner only); the labelled facts from the **booked snapshot** (the build-lock rule), with "· worked out from the parts" when there is no booked spec (H-8). **No action buttons.** |
| COR-32 | **Deliverable tabs** in `ITEM_KINDS` order with the app's labels: **3D model · PCB · Firmware code · Wiring · Parts**; `?tab=` (replace, not push). A skipped piece has no tab (H-5). A failed piece keeps its tab with *"This piece failed in this build. Retry it in the chat."* and a quiet **Open chat**. Each panel reuses `PcbPreview`, `WiringPreview`, `FirmwarePreview`, `PartsPreview` and the `coversFor` aside, in the review's container-query layout (artifact + a 260 px aside from 640 px). |
| COR-33 | **3D tab.** The resting state is the product's concept image with **View in 3D**, which mounts `ModelPanel` lazily. `meshUrl` goes to the primary only; companions get `shellNote: null`; `isSampleModel` captions the demo shell; `onRetryMesh` is omitted. |
| COR-34 | **Keyboard-reachable previews.** The scroll container around the PCB and wiring previews has `tabIndex=0` and a name ("PCB layout, scrollable"); each preview sits under its own h3. |
| COR-36 | **No review controls:** no Retry, Save, Add Network, Refine, spec edit or Open in editor on the product page. |
| COR-37 | **Preview carries through.** `?view=buyer` survives navigation into the product page, where PPL-6 and PPL-7 apply: previews only, the Firmware code tab and downloads hidden. |
| COR-41 | **Version switcher** (amended, owner decision O9), only when the lineage has more than one version: "Version {v} of {n} ▾", a listbox read from `versionsOf()` (COR-106) — "Version {n} · {date}", "current" on the newest, and "not in this version" on a version without this product. Choosing an older one pushes `?v={n}` and shows *"You're viewing version {n} ({date}). The project now uses version {m}."* with **Back to latest**. Choosing a version without the product shows *"Not in version {n}"* with a link to the nearest version that has it. A **dropped** product opens, with no `?v`, at the last version that had it, under *"Version {m} doesn't include {product} — this is version {n}, the last one that did."* and no Back to latest. The rail's Versions block links here with `?v`. |

### 5.8 The Media tab

| ID | Requirement |
|---|---|
| CNT-8 | **The Media tab** is the project's one media library, right after Products. NOW it gathers the builds' concept images and the Brief's preview-clip note; it never shows another project's media. |
| CNT-9 | **"From your builds"**: one tile per product per saved version, read through `buildsOf` → `productsOf` (primary and companions). Each image is a reference (`/api/concept/image/<id>`), never copied; the same URL shows once; caption "{product} · v{n}"; alt "{product} concept image, v{n}". A hand-made project with no build omits the group. |
| CNT-11 | **Grid:** auto-fill, minimum tile 160 px, 12 px gap, 8 px radius; each tile's 4:3 box reserved before its image loads, `object-cover`; two columns at 400 px; the first 24 items, then **Show more ({n})** — no numbered pages. |
| CNT-12 | **Loading:** until the builds store is read, each slot shows a skeleton of its reserved size; the empty state never flashes first. |
| CNT-13 | **Empty state NOW** (a hand-made project with no build): *"No images yet — concept images from AI builds appear here."* The upload empty state arrives with uploads (CNT-20, NEXT). |
| CNT-14 | **One cover.** Exactly one image is the project cover, marked by a singular **"Cover"** chip (text and icon, ≥ 4.5:1). The default is `coverOf()`: the newest saved version's primary image, then any product image, then none (amended order, §7). The cover is what the My projects card shows. A hand-made project with no images has no cover and no placeholder. |
| CNT-18 | **Lightbox**, opened from a tile: the image fitted with `contain` at its own ratio within about 90vw × 85vh; ←/→ within the group with a counter ("3 of 8") and the item's name; × and Esc close and return focus to the tile; one dark scrim; no Desktop/Mobile toggle; never a play button on an image. The Activity drawer reuses this component (NEXT). |
| CNT-19 | **Preview-clip note.** When the project's Brief draft has a `videoJobId`, one note row, not a tile: *"Preview clip — made in the Brief. Rendering is simulated in this prototype, so there's no video file to show yet."* with **Open Brief** (navigation; absent in Preview as buyer). No note when there is no job. |
| CNT-28 | **One generator.** The AI preview clip is made only in the Brief's preview step. Media has no generator and no FAB; a surface that needs a clip links to that step. |
| CNT-31 | **Quality stays as the Creator has it:** Low · 480p · 10 s and High · 720p · 10 s. |
| CNT-32 | **No invented quotas:** no "AI Video n/m", "Token Use n/3", "(4/4)", "3 daily prompts" or "Upgrade" gate anywhere on either page. The AI text helpers are free. |
| CNT-38 | **Leaving never stops a render.** No "Do you want to logout?" guard; the Creator's rule stands: *"You can leave — the render keeps running."* |
| CNT-40 | **The Brief keeps its share controls** (amended, owner decision O5): its "Share to Innovations" checkbox and 500-character story, and its locks (*"An Innovations post needs a preview clip"*, *"A listing needs a preview clip"*). The tick now also sets the project's Showcase flag at mint (COR-105). The page's one feed control is **Showcase**, in the Outcome block (COM-55); it posts nothing while the feed is sample data. |
| CNT-41 | **Honest share copy.** Neither page says "Shared to Innovations", "Posted", "Live on Innovations" or "Live on the marketplace". The Showcase state is said once, in the Outcome block's Showcase row (COM-12): *"Showcased since {date}"* over *"Nothing is posted — the Innovations feed isn't open yet."* |
| CNT-49 | **Nothing to share yet:** no share menu, kebab or copy-link on the page — a link would resolve only in this browser. |
| CNT-62 | **No Premium Parts tab.** No Creator part has a creator, verification, licence or price; the bill of materials lives in each product's Parts tab. |

### 5.9 The Network tab

| ID | Requirement |
|---|---|
| COR-45 | **The Network tab hosts `NetworkSection` unchanged in behaviour:** one control per state — **Create Network** (empty) or **View Network** (saved) — with the summary, connections and role chips. No kebab, no second entry. |
| COR-46 | **Create Network is quiet** here (`btn.quiet`, `network-section.tsx:47`); the header owns the one violet. |
| COR-47 | **One label: "Network"**, never "IoT Network". |
| COR-48 | **Parts from every build:** `networkProducts(project, refs)` resolves each product's parts through `sourceOf()` across all attached builds, so products from a later build get their MCU, radio and sensor detection. Product ids stay `p-<slug(name)>`, so saved networks keep resolving. |
| COR-49 | **In Preview as buyer** the tab is a read-only summary, or absent when there is no network. |

### 5.10 The right rail

**Layout**

| ID | Requirement |
|---|---|
| COR-54 | **Rail order (desktop):** Outcome · Editor · Details · Versions · Project log · Manage (Business plan joins under Outcome, NEXT). One rail surface with hairline dividers, no card in a card; an h2 per block; not sticky. A block with nothing real in it is absent. |
| COR-56 | **Below a 1024 px page container** (amended, §7) the rail dissolves: its blocks follow the tab panel in rail order, each collapsible — open on desktop, closed at 400 px. The header's status line carries the outcome, so the Outcome block needs no second copy near the top. |

**Outcome** — the Brief's result, read-only, and the project's Showcase row.

| ID | Requirement |
|---|---|
| COM-3 | **The Outcome card**, titled **"Outcome"** (not "Marketplace", which doesn't exist), first in the rail: a subline and a facts list, **no Brief controls — no buttons that choose an outcome, pickers or price fields** — and no chip of its own. Its one control is the Showcase row's (COM-55; amended, owner decision O5): Showcase is a project action, not a Brief term. |
| COM-4 | **No outcome yet.** No draft: *"Nothing decided yet. The Brief is where you keep it, give it away or sell it."* An opened, unchosen draft: *"The Brief is open — no outcome chosen yet."* No facts rows. |
| COM-5 | **Brief in progress:** *"You chose {Sell / Give / Save}. The Brief is at the {step} step — nothing is minted until you finish it."* Typed but uncommitted terms (price, collection, licence) are not shown. |
| COM-6 | **Mint status fact.** A minted card's first row is **Minted**, with its own tone and icon so the word isn't the only signal. "Lazy minted" is never shown: nothing is signed. |
| COM-7 | **Minted date** from `mintedAt`, in the one formatter ("Sep 22, 2026 · 9:09 PM"), inside `<time datetime>`; it stands in for the Figma's "Created At". |
| COM-8 | **Network and collection**, only once minted: the network's `NETWORKS` label ("Base Sepolia (Testnet)") and the collection name stored in the Brief — one source for the Figma's three collection strings. No NFT ID, no File Size: there is no token. |
| COM-9 | **Sale terms** (minted `sell`): "Price 0.05 ETH · Buy now"; or "Auction · from 0.02 ETH · buy now 0.10 ETH · ends Oct 3, 2026 · 2:30 PM" (buy-now omitted when empty); "Royalties 10 % on resales"; a passed `expiresAt` adds *"This end date passed before the marketplace opened — nothing was sold."* |
| COM-10 | **Give terms** (minted `give`): the licence label with its one-line `info`; the subline *"Minted under {licence}. This can't be undone."* Nothing claims the community "can claim it". |
| COM-11 | **Private** (minted `save`; amended, owner decision O5): not showcased *"Minted and kept. Only you can see it."*; showcased *"Minted and kept by you — not given away or for sale."* |
| COM-12 | **The Showcase row** (amended, owner decision O5 — it replaces the Innovations row), on every minted project, after the terms and before the footnote, labelled "Showcase". Not showcased: *"Not showcased"* over *"Showcasing lists it under Showcase in My projects. Nothing is posted until Innovations opens."* Showcased: *"Showcased since {date}"* over *"Nothing is posted — the Innovations feed isn't open yet."* It reads `showcasedAt` (COR-105), never `shareToNewsfeed`. Never "posted", "live" or "on Innovations", and never a link to `/innovations/<slug>`, which renders the sample fallback. |
| COM-55 | **(new) The Showcase control** — the page's one home for it (owner decision O5; §3.8 says why here and not in the header): one quiet button in the Showcase row, **Showcase project** or **Stop showcasing**, from `can(viewer, "project.showcase")`: minted projects only, absent on a Draft and in Preview as buyer. It calls `setShowcase` and takes effect at once, with no dialog (nothing is public NOW, and it can be pressed again); focus stays on the button as its label flips; a polite *"Showcased {name}"* / *"Stopped showcasing {name}"*. The badge (COR-9), the Showcase tab (LST-10) and, on a Private project, Preview as buyer (PPL-9) follow at once. No other control on the page, the card or the header showcases. Stacked below 1024 px, the Outcome block's collapsed summary names the state ("Outcome · Listed · Showcased"). |
| COM-13 | **Clip still rendering:** a job not `done` or `failed` adds *"The preview clip is still rendering — {n} %, about {eta} left"* (`progressOf`, `etaLabel`); a failed one *"The preview clip failed — regenerate it from the Brief."* |
| COM-14 | **Honesty footnote** on every minted state: *"Recorded in this browser only — nothing is written to a blockchain yet."* |
| COM-15 | **Unreadable record:** *"The brief record can't be read in this browser, so its terms aren't shown."* Never falls back to "not minted". |
| COM-16 | **Money:** every amount carries its token; no zero padding; at most 6 decimals, trailing zeros trimmed; thousands separators; one token per listing; no dollar figure for test tokens. |
| COM-17 | **Not shown now:** the wallet row and Change Wallet; NFT-type tabs and Add To Marketplace; Create Physical/Virtual NFT and "NFTs Sold x/y"; NFT ID, File Size and Legal Information; the price lock and price pills; Pause/Undo, Sold, Purchased Summary, Upgrade; bidding; Utility benefits. |
| COM-18 | **One home:** choosing the outcome, setting terms and minting happen only in the Brief. The page's one door is the header (Add Brief / Continue Brief / View brief). No outcome picker or price field exists anywhere on the page. Showcase is not an outcome, so its control (COM-55) doesn't break this. |
| COM-19 | **One vocabulary** (amended, §7; owner decisions O5, O6): the card, the header chip and the My projects chip use §4's words — Draft · Private · Given · Listed · Minted — with their tones and icons; the Showcase badge is its own word and icon; none violet. "Listed" always carries *"Goes on sale when the marketplace opens"* until a marketplace exists. |
| COM-22 | **Accessibility and width:** a `<section aria-labelledby>` with a `<dl>`; ≥ 4.5:1; no hover-only content; stacked (below 1024 px), labels sit over values and the facts collapse under a native `<details>` "Minted details" (≥ 24 px), the Showcase row with them; before hydration the rows keep their height with "—". |

**Editor** — progress from real data (owner decision O4).

| ID | Requirement |
|---|---|
| COR-59 | **Editor block:** six rows — PCB Design · Code · 3D Module · Assembly · Peripheral Wiring · Product Preview — each a link to `stepHref` with `LeaveButton`'s press state, each showing only a derived fact. Never "Done", "Not started" or "{n} of 7". |
| COR-60 | **The derivations**, from the project's own docs: **PCB** "{placed} objects · {board} on the board", or *"Sample circuit only"* when every object is a `sch-` sample, or *"Not opened"* with no doc; **Assembly** "{checked} of {board} parts checked", omitted with no board parts; **Wiring** "{parts} parts · {wires} wires", or *"Not opened"*; **3D Module** *"AI model generated"* when the doc holds a GLB, else no fact; **Code**, **Preview** no fact. Caption: *"Code, 3D shapes and Preview are shared by every project in this browser for now, so they show no progress here."* |
| COR-61 | **Reads are cheap and passive:** parsed once per visit in an idle callback after first paint; "—" until then; the reader never writes. |
| COR-65 | **"How far along"** reads only real stores: pieces ready (COR-22), the Brief outcome, the editor facts. No progress bar, no percentage. |

**Details**, **Versions** and **Project log**

| ID | Requirement |
|---|---|
| COR-55 | **Details block:** **Source** "AI build" / "By hand" / "AI build · not in this browser"; **Created**, shown when it differs from the meta line's date; **Stored** "In this browser". Dropped: Status, Product, Last updated, Address. **Built in** moves to the Versions block (amended, owner decision O9), where each lineage is headed by its chat link. |
| COR-107 | **(new) The Versions block** (owner decision O9), after Details — the project's one version history, from `versionsOf()` (COR-106). One group per lineage, headed by its chat link "Chat “{title}” ↗" → `/chat/<chatId>` (plain text when the chat is gone). Under it each saved version, newest first: "Version {n}" (+ "· current" on the newest), "Saved {date}" in the one formatter inside `<time>` (omitted when unknown), "{ready} of {total} pieces ready" or "needs a retry", and **Open build** ↗ → `/build/<id>` (absent when the build is gone, which reads "build not in this browser"); then **Added**, **Dropped** and **Changed** lines against the version before, version 1 listing its products. Every product name is a link to `/projects/[id]/products/[productId]?v={n}` (a dropped name to the version before); a name with no row is plain text. Five versions, then **Show all ({n})** in place — no inner scroller. Collapsible: open on desktop, closed at 400 px. Absent for a hand-made project with no build, and in Preview as buyer. Pending builds stay in the COR-18 banner, not here. |
| COR-50 | **Three words, three homes:** Activity = the journey (header chip → drawer, NEXT); Project log = system events (rail); Stage = a derived label (meta line, NEXT). No other surface says "Activity". |
| COR-52 | **Project log** (amended, owner decision O9), newest first, derived only NOW, and only the events that aren't versions: "Created by hand" · "Minted · {outcome} · {network}" · "Showcased", each over its date in the one formatter ("Sep 26, 2026 · 9:09 PM") in `<time>`. Saved versions and their builds are in the Versions block (COR-107), never repeated here. Six entries, then **Show all ({n})** expanding in place — no inner scroller. Absent when it has no entry. Collapsible; open on desktop, closed at 400 px. |

**Manage** — delete, and when it is blocked.

| ID | Requirement |
|---|---|
| COR-67 | **Delete's home:** "Delete project…", the only control in the rail's last block, **Manage** — quiet, danger tone, apart from everything else, ≥ 44 px on touch; owner only (`can()`); absent in preview. When `deleteBlockOf()` names a reason (COR-70) the control **stays**, `aria-disabled="true"`, in the tab order, with the reason in text beside it and named by `aria-describedby`; pressing it opens nothing. |
| COR-68 | **The dialog** (one `ConfirmDialog`, danger tone, promoted from `components/network/dialogs.tsx:115` to `components/ideeza`): title *"Delete “{name}”?"*; a computed list of what goes ("The PCB board — 42 objects", "Wiring — 9 wires", "Assembly checks", "The 3D AI model", "The brief — given under MIT, minted Sep 22", "The network — 3 links", "Showcase — it leaves your Showcase tab"); what stays: *"Its {k} builds and the chat stay in History — you can save them as a project again."*; **Cancel** has initial focus; the destructive button reads **Delete project**. |
| COR-69 | **Typed confirmation only when something can't be rebuilt** (editor work, a mint record or a network): a labelled field "Type the project name to confirm"; the button enables on an exact trimmed match; a mismatch says *"That doesn't match “{name}”."*; the placeholder is never the answer. Otherwise the plain confirm. |
| COR-70 | **Delete by state** (amended, owner decision O10). NOW a **Listed** project can't be deleted: the Manage block reads *"A listed project can't be deleted."* and, because no way out exists yet, *"There's no way to withdraw a listing yet — that comes with the marketplace."* Every other state is deletable; a minted project's dialog adds *"It was minted in this browser only — nothing on a blockchain changes."* The Minted record that can't be read stays deletable: its outcome isn't known to be a listing. LATER the same block covers anyone else holding ownership — co-owners, contributors with a share (PPL-22) — and a sold project (COR-83); a live listing gains its route out, *"remove the listing first"* (§4.2). |
| COR-71 | **After delete:** navigate to `/projects`; a polite *"Deleted {name}"*. Builds keep their dangling `projectId`, so History drops the link (`history-page.tsx:106-108`), the attention bell stays quiet (`history.tsx:1802`) and the build's review offers Save again. |

### 5.11 Preview as buyer

| ID | Requirement |
|---|---|
| PPL-4 | **Entry:** one quiet button, **"Preview as buyer"** (eye icon), the header's last control; not violet; ≥ 44 px tall; the only entry (the My projects card has none). |
| PPL-5 | **State and exit:** it pushes `?view=buyer` — a reload keeps it, Back leaves it. A sticky info `Banner` at the top of the content: *"Previewing as a buyer"* / *"This is your page without your editing controls. Nothing is published — it's saved only in this browser."* / **Exit preview** (quiet; the `Banner` atom gains an action slot). Focus moves to the banner on entry and back to the button on exit; the banner is a polite live region; closing any layer doesn't exit; nothing is stored. |
| PPL-6 | **Read-only page:** in preview `can()` returns the visitor set and every write or authoring control is **absent**, not disabled — the pair, the pencil and description editor, Create / View Network, the Editor block, Manage, the Showcase control, the preview-clip note's Open Brief, and every later Add product tile or "Use as cover". Network shows a read-only summary, or nothing. No violet on the page. |
| PPL-7 | **Owner-only facts hidden:** the rail drops Outcome (with its Showcase row), Versions (its chat and build links) and Stored; the product view drops "Built with your part changes"; it keeps the name, description, products with their facts and Build check, the chip and the Showcase badge, the product count and the dates, and the previews owner decision O12 makes public: **3D, PCB, Wiring and Parts**. The Firmware code tab and every download are hidden — they come after purchase. |
| PPL-8 | **Nothing invented for the buyer:** no price, Buy button, wallet chip, creator line or card, social counts, or placeholder for any of them; no empty state has a call to action. |
| PPL-9 | **Not offered when nobody will see the page** (amended, owner decision O5): absent for a minted **Private** project that isn't showcased — `hasAudience(status, showcase)`. Showcasing a Private project brings the button back; every other minted outcome keeps it. |

### 5.12 Outside the two pages

| ID | Requirement |
|---|---|
| COR-40 | **Save says where it lands.** The review footer, unsaved: *"Save it as version {n} of {project}."* when a lineage project exists, else today's copy. After saving: *"Saved to {project} as version {n}."* with the project name linking to `/projects/<id>`. The footer's **Open Project** is relabelled **Open in editor** (it opens the editor). Save keeps the maker on the review, as today. |
| COM-21 | **Brief copy fixes** (amended, owner decision O5): the success step's *"Your post is up on Innovations."* is dropped, and so are the pending lines' promises of a post (*"We'll post it to Innovations the moment the video finishes."*, *"The Innovations post goes up with it."*, *"Your Innovations post goes up as soon as …"*) — the Showcase row under the buttons says what really happened (COM-56). Give's *"Your community can claim it."* is dropped. The page never repeats any of the old claims. |
| COM-56 | **(new) Showcase on the Brief's success step** (owner decision O5; `step-4-success.tsx`, the owner's "success modal"), after every intent — Save as Private, Give, Sell — and while a clip still renders: under **Go to My Projects** (the step's violet), one quiet **Showcase this project** with the line *"It goes under Showcase in My projects now. Nothing is posted until Innovations opens."* Pressing it calls `setShowcase(scopeProjectId, true)`; the button and its line give way to one status row, *"Showcased — it's on your Showcase tab."* (the tab of My projects), with a quiet **Undo** that stops showcasing; focus moves to Undo and the change is announced politely. A mint with Share to Innovations ticked opens on that status row, already showcased. No other copy on the step claims a post. |
| CNT-6 | **One home for the description:** `ProjectInfoModal` stops overwriting an existing project's description when Build manually picks that project (`project-info-modal.tsx:115`). |

The Brief's Step 1 default (COR-89), its attach (COR-88), its product count and
the editor chrome's headline rename (COR-95), `touchOpened` in the editor
workspace (COR-91), and the mint's Showcase write (COR-105) are writers in
§5.1.7.

### 5.13 Accessibility and performance

| ID | Requirement |
|---|---|
| COR-99 | **Headings:** one h1; an h2 per tab panel and per rail block; an h3 per product card and per preview. Landmarks: the breadcrumb `nav`, `main`, the rail `aside` labelled "Project record". |
| COR-100 | **Targets and names:** every icon-only control has an accessible name; targets ≥ 24 px (44 px on touch tokens); focus rings offset from filled buttons (today 1.00:1 on violet). |
| COR-101 | **Live regions:** renames, deletes and saves announce politely; a pending build's progress announces at 10 % steps, not every tick. |
| COR-102 | **Heavy content only on demand:** no 3D, PCB or wiring preview on the project page (cards only); `ModelPanel` mounts on the product page's 3D tab after View in 3D; images reserve their ratio. |
| COR-103 | **The attention toast never covers the header primary** (today it does at 1440). |

**Verification for NOW** (each by reload, in light and dark, at 1440 and 400):
rebuild a chat and Save → one project, "Version 2", both versions on the
product page and in the Versions block; rebuild it so version 2 drops a product
→ that product stays on the Products tab, "Not in version 2 · from version 1",
its page opens at version 1, and Versions lists it under Dropped; a legacy
project with no `builds` → the same page as before, with ids given once; delete
a project with editor work → the typed confirmation, then every per-project key
gone and the build back to "Save"; mint to sell in another tab → the card moves
to Listed without a reload, and its Delete is blocked with the reason; press
Showcase on the success step → the badge on the card and the header, the
project under the Showcase tab, and Undo reverses all three; Stop showcasing a
Private project → Preview as buyer disappears; Preview as buyer → no write
control anywhere, and Exit returns focus; the six-fixture summary test passes.

---

## 6. NEXT and LATER

**What each waits for.**

| Key | NEXT — a local store or model addition |
|---|---|
| journey | the journey store: `ideeza:project:journey:<id>` (text) plus media bytes in IndexedDB `ideeza-media` (`activity-consolidated.md` §3.2) |
| media | the media store: IndexedDB `ideeza-media`, `items` + `blobs` (`content.md` §3.3) |
| log | the stored project log: `ideeza:project:activity:<id>`, capped at 100 |
| edits | edit-time fields on the project (`steps.editedAt`), written from an `ideeza:project-touch` event |
| cover | `ManualProject.cover`, a `ProjectCover` reference |
| plan | the business-plan store `ideeza:project:bizplan:<id>`, its runner and `POST /api/business-plan/section` |
| mint | the immutable mint record `ideeza:mint:<id>` |
| brief | new `BriefState` fields (editions, legal) or its network list |
| feed | a local Innovations feed that the real detail view reads |
| setup | a setup-question preset that aims a new chat at an existing project |
| pref | the view preference `ideeza:projects:view` |
| read-error | the projects store reporting a failed read |
| none | no new store: derived from data that exists, or a provider change; it waits only because `core.md` sequences it after the first release |

| Key | LATER — a service the Creator doesn't have |
|---|---|
| auth | accounts and sign-in |
| backend | server records and services |
| chain | wallet, tokens and contracts |
| payments | billing and purchases |
| public | public project pages and a real Innovations feed |
| moderation | server-set restrictions and reports |
| video | a real video service |
| parts | a parts marketplace whose parts have creators (Parts & Agile) |

### 6.1 NEXT — 97 requirements

**Core (12)**

| ID | One line | Waits for |
|---|---|---|
| COR-16 | The journey chip "Activity {n} ›" and its "?" after the title, opening the drawer | journey |
| COR-17 | "· Stage {short}" in the meta line, plain text | journey |
| COR-26 | A closed disclosure "All parts across {n} products — {u} unique, {q} units", no price column | none |
| COR-27 | Compatibility notes between each build's products, hidden when there are none | none |
| COR-28 | An "Add a product" tile that starts a chat aimed at this project (single-product setups) | setup |
| COR-35 | A Files tab: BOM CSV, firmware `.ino`, netlist CSV, the primary's GLB; no Gerber, STL or STEP | none |
| COR-44 | A version saved after a mint leaves the Outcome as minted; the log shows the order | mint |
| COR-51 | The drawer: 550 px, right-docked, a full-screen sheet below 640 px, one layer, the page inert | journey |
| COR-53 | Stored log events (briefed, renamed, network, editor edit windows, showcase on and off), capped and coalesced | log |
| COR-57 | The Business plan card in the rail, under Outcome | plan |
| COR-62 | "Edited 2 h ago" per editor step, from real model changes only | edits |
| COR-97 | Both providers re-read on `storage` events, so a stale tab can't drop another's `builds[]` append | none |

**My projects (7)**

| ID | One line | Waits for |
|---|---|---|
| LST-19 | A Stage filter: "Any stage" plus the journey stages' short labels | journey |
| LST-24 | "Recently updated" and the card date read `lastActivityAt`, so editor work counts | edits |
| LST-29 | A Grid \| List switch, remembered per browser; not offered below a 560 px box | pref |
| LST-34 | A cover chosen on the details page wins over the default | cover |
| LST-44 | The stage pill beside the title, e.g. "Prototype" | journey |
| LST-55 | *"We couldn't read your projects in this browser"* with **Try again**, not a false "No projects yet" | read-error |
| LST-62 | A tiny `stageSummary` on the project, written only by the journey writer | journey |

**People (1)**

| ID | One line | Waits for |
|---|---|---|
| PPL-10 | The drawer in Preview as buyer: no subtitle, Add, ⋮ or listed marker; *"No journey shared yet."* | journey |

**Commerce (9)**

| ID | One line | Waits for |
|---|---|---|
| COM-23 | `commit()` writes an immutable mint record; the page reads it first | mint |
| COM-24 | The record keeps the version it minted: "Covers v1", *"v2 isn't minted — this mint covers v1."* | mint |
| COM-25 | "Briefed" and "Minted" events in the project log | log |
| COM-26 | "Sell or give it" from a minted Private record (showcased or not), in the Brief | mint |
| COM-27 | A showcased project posts to a local Innovations feed; the Showcase row reads "On Innovations since {date}" with a link; a post needs a preview clip | feed |
| COM-28 | Licence editions in the Brief's Sell form: up to four rows, supply, Regular and Extended | brief |
| COM-29 | The Outcome card's "Licence editions" table, *"On sale when the marketplace opens. Nothing is minted until a buyer pays."* | brief |
| COM-30 | Legal facts typed in the Brief, shown *"As stated by you — not verified."* | brief |
| COM-31 | Polygon Amoy replaces Mumbai; stored drafts migrate | brief |

**Content (30)**

| ID | One line | Waits for |
|---|---|---|
| CNT-10 | Groups "From your builds" and "Your uploads"; an All · Images · Videos filter only when both kinds exist | media |
| CNT-15 | "Use as cover" / "Stop using as cover" in the Media tile menu, the only home | cover, media |
| CNT-16 | An always-visible tile ⋮ ("Actions for {name}"), items by source | media |
| CNT-17 | Deleting an upload removes it with an 8 s **Undo**, not a modal | media |
| CNT-20 | One **Add media** button in the Media header, plus drop and paste | media |
| CNT-21 | Accepted files and caps, each rejection naming its reason | media |
| CNT-22 | An honest saving tile: "Reading…" → "Making preview…" → "Saving…", **Retry** / **Remove** | media |
| CNT-23 | Thumbnails ≤ 640 px and video posters made locally; EXIF dropped | media |
| CNT-24 | Optional alt text per upload, up to 200 characters | media |
| CNT-25 | "Saved in this browser · {size} used"; `persist()`, `estimate()`; missing bytes said | media |
| CNT-26 | Deleting the project removes its media; the dialog names "{n} uploaded files" | media |
| CNT-27 | Media in Preview as buyer: no Add media, menus or Cover chip | media |
| CNT-65 | The Business plan module at `/projects/[id]/business-plan`; one card (None · Writing · Ready) | plan |
| CNT-66 | The start dialog "Draft a business plan", prefilled, 50–500 characters | plan |
| CNT-67 | Real progress section by section, "about 2–5 minutes"; Cancel keeps what's written | plan |
| CNT-68 | Per-section failures with **Try again**; "Continue writing ({n} left)" after a reload | plan |
| CNT-69 | Saved automatically: "Business plan ready · Open" | plan |
| CNT-70 | The plan page: header, section index, sections | plan |
| CNT-71 | Seven sections with fixed fields | plan |
| CNT-72 | "Written by AI" / "Edited by you"; figures marked "AI estimate — not researched" | plan |
| CNT-73 | Edit one section at a time; paragraphs and bullet lists only | plan |
| CNT-74 | Improve with AI per section, **Keep** / **Discard** | plan |
| CNT-75 | "+ Add section", written by AI or by hand | plan |
| CNT-76 | Versions, up to 5, with **Restore** | plan |
| CNT-77 | The regenerate confirm names what changes | plan |
| CNT-78 | "Delete business plan…" with a plain confirm | plan |
| CNT-79 | Print or save as PDF | plan |
| CNT-80 | The plan's toasts in a polite live region | plan |
| CNT-81 | Its own quota-aware key, swept on project delete | plan |
| CNT-83 | The plan never shows in Preview as buyer or a public view | plan |

**Activity (38)** — every row waits for the journey store. The form uses the
Figma's own "not listed" variant (`149583`), which is exactly the Creator's
case: no pricing blocks.

| ID | One line |
|---|---|
| ACT-33 | Drawer header: "Activity History", the subtitle *"Your product journey, newest first. Use ⋮ to edit a stage."*, a full-width **+ Add New Activity**, pinned |
| ACT-34 | Empty: "No activities yet" and *"Start documenting your product journey — each stage tells your story to potential customers."* |
| ACT-35 | Add and Edit open inside the drawer; ‹ returns to the list, × closes the drawer |
| ACT-36 | Entries newest first by date, hairline dividers, no stepper dots |
| ACT-37 | An entry's title row: the stage label (the custom name for Others), "?", and the owner's ⋮ |
| ACT-38 | One plain-language explainer per stage, the same in the entry and in the type list |
| ACT-39 | Each entry's date and time in the one formatter, "Feb 10, 2024 · 9:09 PM" |
| ACT-40 | The description clamped at 4 lines with "Show more" |
| ACT-41 | 60 × 60 attachment tiles: image, video with a play badge, PDF / DOC / DOCX labelled |
| ACT-42 | One card per link: the truncated URL and an external-link icon |
| ACT-43 | The form header: ‹, "Add New Activity" or "Edit Activity", × |
| ACT-44 | The note banner, rewritten: *"Show this stage with photos, videos, files or links — buyers see them in your product journey."* (Edit: *"Changes update this stage in your product journey."*) |
| ACT-45 | Field order: Activity Type, Activity Name (Others), Description, Attach URLs, Attach Media |
| ACT-46 | One pinned full-width primary: "Add Now" or "Update" |
| ACT-47 | Activity Type required, placeholder "Select Activity Type", no default |
| ACT-48 | The 11 stages plus Others, in the Figma's order |
| ACT-49 | Each option shows its "?" explainer; the list scrolls inside its panel |
| ACT-50 | "Others" reveals "Activity Name" (placeholder "e.g. Initial Concept Draft (max 40 characters)"); another type hides it and discards the value |
| ACT-51 | Activity Name required for Others, 1–40 characters after trimming |
| ACT-52 | Past 40, a red border and "Maximum 40 characters allowed", live; the text is kept |
| ACT-53 | Back within 40, the error clears |
| ACT-54 | One field's error never resets another |
| ACT-55 | Description required, placeholder "Describe this activity in 2-3 sentences (max 400 characters)" |
| ACT-56 | Over 400, "Maximum 400 characters allowed"; it can't be saved |
| ACT-57 | Attach URLs: an input and **Add**; each link a chip with ×; several allowed |
| ACT-58 | `https://` only: *"Please enter a valid URL starting with https://"*; the text stays |
| ACT-59 | Attach URLs shown, optional, for every type |
| ACT-60 | The dropzone "Click or drag a file to upload", helper "PNG, JPG, PDF, DOC, GIF, Video or DOCX" |
| ACT-61 | Saving with nothing attached: *"Add at least one file or link."*; the button stays enabled |
| ACT-62 | A row per file with its real saving state — never a fake percentage — and × |
| ACT-63 | × removes a file with no confirm; in Edit it applies on Update |
| ACT-69 | The entry ⋮: "Edit Activity", then "Delete Activity" (danger) |
| ACT-70 | Edit opens pre-filled with every stored value |
| ACT-71 | Update keeps the id and creation date and sets a new updated date |
| ACT-72 | The delete dialog: *"Delete “{stage}” ({date})?"*, *"Its files, links and prices are removed from this browser. This can't be undone."*, **Cancel** / **Delete activity** |
| ACT-73 | Delete removes the entry with its files and links; Cancel changes nothing |
| ACT-77 | A PDF, DOC or DOCX tile downloads the file |
| ACT-78 | A link card asks *"Open this link in a new tab?"*, shows the URL and *"It leaves IDEEZA — only open links you trust."*; only **Open link** opens it, with `noopener` |

### 6.2 LATER — 128 requirements

**Core (11)**

| ID | One line | Waits for |
|---|---|---|
| COR-29 | Assembly documentation at project level (spec §4.7) | backend — no data source exists |
| COR-38 | The product page's rail slot: this product's licence editions | chain |
| COR-58 | The LATER rail: the People block first, Outcome grown into Marketplace | auth, chain |
| COR-73 | No "Temporarily removed from marketplace" confirm: a change becomes the next version and the listing stays on the minted one | chain, backend |
| COR-80 | "Lazy minted" and on-chain "Minted" as chip words, with the wallet row in the header | chain |
| COR-81 | A listing goes live: "Listed" drops its "Goes on sale when the marketplace opens" subline for the price and share for sale; the "Auction · ends {time}" chip; the Marketplace card operates it; no header primary | chain, backend |
| COR-82 | "Paused"; **Resume** with its checklist in the Marketplace card; the page stays usable | backend |
| COR-83 | "Sold" per slot, "Sold out", the banner *"Sold on {date} to {buyer}"* (COM-44's words); the list opens this page; a sold project can't be deleted (*"A sold project can't be deleted."*, owner decision O10) | payments, chain |
| COR-84 | The "Utility NFT" chip modifier with its benefits popover | chain |
| COR-85 | "Restricted": one banner, every write `aria-disabled` with its reason | moderation, auth |
| COR-98 | Projects, builds, versions and logs on a server keyed by user; `buildsOf()` becomes a query | backend, auth |

**My projects (14)**

| ID | One line | Waits for |
|---|---|---|
| LST-11 | Contributed and Purchased tabs, only when the account has one; the card shows the role and owner | auth |
| LST-12 | "Public" becomes a Visibility filter ("On Innovations" / "Not public"), not a tab | public |
| LST-16 | Search and filter by tag and category | public |
| LST-20 | An NFT type filter: Physical · Virtual · Utility | chain |
| LST-21 | A Sale filter: On marketplace · Sold · Payment due | chain, payments |
| LST-22 | One Filters popover once there are three or more facets | chain (its facets) |
| LST-25 | Most viewed · Most liked sorts | public |
| LST-45 | Views, likes and comments on the card, never zeros | public |
| LST-46 | "Physical NFT" / "Virtual NFT" / "Utility NFT" as meta text | chain |
| LST-47 | The "Sold" / "Payment due" chip; the facts on the details page, not a modal | payments |
| LST-48 | "In manufacture" in the meta row | backend |
| LST-50 | The Utility NFT claim card belongs in Purchased | chain, auth |
| LST-63 | The Utility NFT card with the Figma's copy corrected ("Claim NFT" / "Claimed", "Revealed" / "Not revealed", `0x…`) | chain |
| LST-64 | The Utility NFT view: search only ("Search NFTs"), "{n} NFTs", tab "Utility NFTs" | chain |

**People (47)**

| ID | One line | Waits for |
|---|---|---|
| PPL-11 | "Created by {name}" in the meta line, opening the person card | auth |
| PPL-12 | "Owned by {name}" only when the Creator-tag holder differs | auth, chain |
| PPL-13 | The person card: avatar, name, role, counts, three recent projects, **View profile** | auth, backend |
| PPL-14 | The card is a button-opened, non-modal popover; never hover-only | auth |
| PPL-15 | Friend requests and messages live on the profile | auth |
| PPL-16 | The rail People block: "Creator · 70%", "{n} people on this project" | auth |
| PPL-17 | No share line when nothing is shared; visitors never see one | auth |
| PPL-18 | An ⓘ beside the share explaining private and public splits | auth, chain |
| PPL-19 | The ownership split bar with labelled segments, totalling 100 % | chain |
| PPL-20 | The Creator tag moves at 51 %, with a warning first | chain |
| PPL-21 | Co-owners sell only their own share ("List my share") | chain, payments |
| PPL-22 | Delete blocked while anyone else holds ownership — a co-owner, a contributor with a share, a fractional holder — with the reason in Manage (owner decision O10) | chain |
| PPL-23 | Members see the roster; visitors a "Team" credit | auth |
| PPL-24 | The Contributors tab after Network, with one **Invite contributor** | auth |
| PPL-25 | Empty: *"Just you so far. Invite people to view, edit or co-own this project."* | auth |
| PPL-26 | The roster: Person, Role, Share, Status, actions; 10 per page; stacked at 400 px | auth |
| PPL-27 | Share shows a % only for co-owners and shareholders, "—" otherwise | auth, chain |
| PPL-28 | Status stored once, rendered from the viewer's side | auth, backend |
| PPL-29 | Invite: a member combobox search | auth |
| PPL-30 | Invite: Viewer / Editor / Co-owner, descriptions always visible | auth |
| PPL-31 | Invite: a share with no prefill, and vesting tranches | chain |
| PPL-32 | Invite scope: the whole project or one product (Viewer and Editor only) | auth |
| PPL-33 | Invite validation at the fields; the submit stays enabled | auth |
| PPL-34 | Acceptance through a notification and a banner; Accept is the violet | auth, backend |
| PPL-35 | Row actions by case; every removal confirmed | auth |
| PPL-36 | Invites from co-owners above 5 % await creator approval | auth, backend |
| PPL-37 | Shareholders without access appear as "Shareholder" | chain |
| PPL-38 | The vesting lifecycle | chain, backend |
| PPL-39 | Contributed chrome: "My projects › Contributed › {name}", a role chip | auth |
| PPL-40 | Controls follow `can()` per role; absent, not disabled | auth |
| PPL-41 | The Contributed tab: accepted memberships, invitations above | auth |
| PPL-42 | Customers seen by the creator and co-owners only; visitors see "{n} sold" | auth, payments |
| PPL-43 | The customers table: Buyer, Item, Price, Date | payments |
| PPL-44 | Only server-verified sales; "Confirming", "Transfer pending" | backend, chain |
| PPL-45 | Empty: *"No sales yet. Buyers appear here after they buy one of this project's NFTs."* | payments |
| PPL-46 | One customers list per project | payments |
| PPL-47 | The real buyer page is a public URL rendering the same view | public, auth |
| PPL-48 | A visitor never sees member or owner surfaces | public |
| PPL-49 | "Report project" at the page foot, once per person | auth, moderation |
| PPL-50 | Restrictions come from moderators, on an account or a project | moderation |
| PPL-51 | One banner for the restricted person | moderation |
| PPL-52 | Blocked controls stay, `aria-disabled`, with the reason | moderation |
| PPL-53 | One copy pattern with a countdown | moderation |
| PPL-54 | A commenting restriction blocks new comments and replies only | moderation |
| PPL-55 | A restriction lifts on its own at its end time | moderation |
| PPL-56 | Claiming this browser's projects on first sign-in | auth, backend |
| PPL-57 | Identity checks on the server; wallets compared case-insensitively | auth, chain |

**Commerce (24)**

| ID | One line | Waits for |
|---|---|---|
| COM-32 | Integrate with the IDEEZA marketplace backend and contracts; the server is the authority | backend, chain |
| COM-33 | The wallet row in the header; Change wallet locked after an on-chain mint | chain |
| COM-34 | A real mint (lazy or on-chain); NFT ID and the explorer link once a token exists | chain |
| COM-35 | The Outcome card becomes "Marketplace", with tabs for the NFT types that exist | chain |
| COM-36 | Buy now operations: Edit (**Update**), Remove with a confirm, toasts | chain, backend |
| COM-37 | The auction lifecycle: "Ends in …" / "Ended", Close auction, Bid history | chain |
| COM-38 | The price lock while live, with **Manage listing** | chain |
| COM-39 | "Share for sale", 1–100 %, tied to ownership | chain |
| COM-40 | Edition operations: "Sold x/y", Add supply, Edit, Remove | chain |
| COM-41 | A listing needs its clips (one rule, checked in the Brief) | video, chain |
| COM-42 | Changing a listed project makes the next version; manual Pause / Resume | chain, backend |
| COM-43 | A moderation restriction, separate from an owner pause | moderation |
| COM-44 | Sold: the banner, the card badge, "Owned by" | payments, chain |
| COM-45 | Buying as a visitor, with a confirm step that shows the fee | payments, chain |
| COM-46 | The Purchased view and its Purchase summary | auth, payments |
| COM-47 | Access follows the purchase: Physical → fabrication files, Virtual → the digital twin | payments, auth |
| COM-48 | Upgrade Regular → Extended | payments |
| COM-49 | The Creator updates tab for Extended holders | payments, auth |
| COM-50 | Resale by the buyer | payments, chain |
| COM-51 | Get creator support from a purchase | auth, backend |
| COM-52 | Utility NFT: Granted benefits, "Active until {date}" | chain |
| COM-53 | Contributor role gates on the Marketplace card | auth |
| COM-54 | Prices in activity entries are a read-only snapshot of the live listing, never typed | chain |
| COM-57 | **(new)** Showcase publishes a real, public Innovations post — confirmed first (CNT-46), readiness-checked for its clip (CNT-42), previewed (CNT-44) — and Stop showcasing takes it down; the row reads "On Innovations since {date}" with the post's link | public, video |

**Content (30)**

| ID | One line | Waits for |
|---|---|---|
| CNT-29 | A real clip reaches Media, playable | video |
| CNT-30 | Takes kept (up to 3); **Use for listing** | video |
| CNT-33 | The cost on each paid AI button; one balance | payments |
| CNT-34 | A model picker from an admin list | backend |
| CNT-35 | Audio chosen after the take; "No audio" valid | video |
| CNT-36 | The AR clip appears once the phone app uploads | backend |
| CNT-37 | Per-product clips, if the owner chooses them | video |
| CNT-39 | A failed render refunds and offers **Try again**; a queued one can be cancelled | video, payments |
| CNT-42 | The share readiness dialog: each product's clip status | public, video |
| CNT-43 | A partial share: "Share 2 of 3 products" | public |
| CNT-44 | A post preview before a showcase posts to Innovations | public |
| CNT-45 | Add to marketplace uses the readiness dialog | chain, video |
| CNT-46 | Going public is confirmed first | public |
| CNT-47 | One header **Share**: copy link, native share, labelled social targets; the Innovations post is Showcase's (COM-57), not a Share target | public |
| CNT-48 | Open Graph link previews on the production domain | public |
| CNT-50 | A share or listing restriction banner | moderation |
| CNT-51 | A comment restriction replaces the composer; replies blocked too | moderation |
| CNT-52 | Comments only on a public project | public, auth |
| CNT-53 | The Comments drawer, the same component as Activity; one drawer at a time | auth, backend |
| CNT-54 | One comment count everywhere | backend |
| CNT-55 | The composer | auth |
| CNT-56 | A comment's anatomy | auth, backend |
| CNT-57 | Replies one level deep, the @mention of the item replied to | backend |
| CNT-58 | The first 10, then "View more comments" | backend |
| CNT-59 | Menus by role; "Hidden by the project owner" | auth |
| CNT-60 | Empty and signed-out states | auth |
| CNT-61 | The report dialog | moderation |
| CNT-63 | Premium parts as a group inside each product's Parts tab | parts |
| CNT-64 | A premium part row | parts |
| CNT-82 | Plan tiers and plan sharing | payments, auth |

**Activity (2)**

| ID | One line | Waits for |
|---|---|---|
| ACT-10 | A stats row of likes, comments and views; the Figma's undefined fourth metric ships only once the owner names it | public |
| ACT-25 | Mint status changes only Change Wallet and the Main price lock | chain |

### 6.3 ACT ids carried by another requirement

These 40 ACT ids say the same thing as an area requirement and are counted once,
under it, in its phase: ACT-4 → CNT-47 · ACT-7, ACT-9 → COR-8 · ACT-8 → PPL-11,
PPL-13 · ACT-16, ACT-18 → COM-35 · ACT-17 → COM-8 · ACT-19 → COR-55, COM-7,
COM-8 (NFT ID: COM-34) · ACT-20 → COM-30 · ACT-23 → PPL-3 · ACT-24 → COR-9,
COM-6 (lazy: COR-80) · ACT-26, ACT-27 → COR-16 · ACT-28, ACT-29, ACT-30 →
COM-33 · ACT-32 → COR-51 · ACT-74, ACT-75, ACT-76 → CNT-18 · ACT-79, ACT-80,
ACT-81, ACT-82, ACT-83 → PPL-10 · ACT-84 → PPL-4, PPL-5 · ACT-85 → PPL-6, PPL-7 ·
ACT-86 → PPL-8, PPL-10 · ACT-87, ACT-88, ACT-89, ACT-90, ACT-91, ACT-92, ACT-93,
ACT-94, ACT-95, ACT-96, ACT-97, ACT-98 → COM-54 (ACT-92 and ACT-97 also COM-16;
ACT-93…95 also COM-38). The other 17 ACT ids the Figma draws differently are in
§9.

---

## 7. Cross-file conflicts resolved

| # | Conflict | Resolution | Why |
|---|---|---|---|
| X1 | **Status words.** COM-19: Not minted · Brief in progress · Private · Showcase · Given to community · Ready to sell. `list.md` `STATUS_WORD`: Draft · Private · Given · Listed · Minted. This spec's first version chose Draft · Private · Showcase · Given · Ready to sell · Minted. | **Draft · Private · Given · Listed · Minted**, one table (§4), used by the list tabs, the card chip and the details chip (core K-30); Showcase is a badge, not a word in this table. | Owner decisions O5 and O6. "Draft" is the PDF's word and today's tab. "Listed" is the owner's word; its subline, *"Goes on sale when the marketplace opens"*, keeps it true before a marketplace exists. The Brief's own form heading (`BRIEF_FORM_LABEL.sell`) is a Brief label, not a status word, and is left alone. "Brief in progress" is a status line, not a state. |
| X2 | **Two chips for one state.** The Outcome card's anatomy starts with its own chip (commerce §4.2); the header has the chip (COR-9). | The header chip is the only chip; the Outcome card starts with its subline (core K-31). | One state, one chip. |
| X3 | **Showcase on My projects.** LST-10 adds a "Showcased" tab only if the Brief gains a Showcase intent (NEXT); COM-2 and COM-11 derived Showcase from Save + Share to Innovations; COR-76 named it a minted state; this spec's first version shipped it as a state tab. | Owner decision O5: Showcase is an action and a flag (`showcasedAt`, COR-105) on any minted outcome. The **Showcase** tab ships NOW as a membership tab, last, outside the outcome tabs' sum (LST-4, LST-10); the card and header show its badge (LST-65, COR-9). | A showcased Listed project is both Listed and showcased; a tab per fact lets it sit in both without a card saying two things. |
| X4 | **The "Utility NFT" tab.** COM-20 renames it "Minted"; LST-6 removes it, and Completed, for the outcome tabs. | LST-6. COM-20 is not built; its goal — freeing the word "Utility NFT" — holds. "Minted" appears only as LST-9's chip under All. | The outcome tabs already split every minted project by what the maker chose; a "Minted" tab would be the union of four others. |
| X5 | **Status line and Outcome subline.** Core puts a status line under the chip and moves the Outcome state line under the header below the breakpoint (COR-56, commerce §4.1), which stacks two sentences for one state. | The header shows the chip and the status line at every width; stacked, the Outcome block goes with the other rail blocks after the tab panel. | Two sentences for one state side by side read as a stutter. The short line is the one the card also shows (LST-32). |
| X6 | **Rail breakpoint.** COR-5 and COR-56: a 1100 px container. Commerce §4.1: 1024 px. | **1024 px, measured on the page container** (`main`). | At 1366 with the sidebar open the container is 1086 px: 1100 would drop the rail on the most common laptop width, with a 634 px main column still available. |
| X7 | **Business plan card.** CNT-65: a card in the main column. COR-57: the rail. | The rail, under Outcome (core K-32). | The main column is the tab panel: above the tabs it pushes Products down on every visit, inside a tab it disappears. |
| X8 | **`builds[]` phase and shape.** `list.md`: NEXT, `{ buildId, version, savedAt }`. COR-86: NOW, `ProjectBuildRef` with `chatId`. | COR-86's shape, NOW. LST-42 and LST-43 move to NOW with it (core K-33). | Owner decision O2 needs the lineage id; the list reads the same refs. |
| X9 | **Per-step fields.** `list.md`: `steps?: { openedAt, editedAt }`. Core: `lastOpened` NOW, `steps.editedAt` NEXT. | Core's. | Resuming needs only the last step opened; edit times need the touch event (COR-62). |
| X10 | **The cover field.** `list.md` `cover?: { buildId, productId }`; core NEXT `cover?: ProductSource`; content `ProjectCover` with `kind`. | Content's `ProjectCover`; a stored `{ buildId, productId }` without `kind` reads as `kind: "concept"`. | An upload can be the cover (content question 5, closed on its default). |
| X11 | **Default cover order.** CNT-14: the origin build's image first. LST-33 and COR-96: the newest saved version's first. | Newest first; CNT-14 amended. | With "same chat rebuilt = v2", the newest version is what the project is now. |
| X12 | **The card's date.** LST-41: "Updated {time}" from `updatedAt`. COR-10 and core K-22: "Saved {date}" / "Created {date}". | Both surfaces show the meta-line fact, the card in LST-41's short form. "Updated" returns with LST-24 (NEXT). | `updatedAt` moves on every Brief keystroke and never on editor work, so "Updated" would mislead; LST-32 needs the same fact on both. |
| X13 | **Version wording.** LST-42 "{n} versions"; COR-10 "Version {v}" / "{k} builds"; CNT-9 "build v{n}". | COR-10's words on the card and the meta line; "v{n}" in card facts and captions. | One vocabulary for one fact. |
| X14 | **A minted project with a newer build waiting.** Core §4.6 adds a quiet "Review version {n}" first in the pair; LST-43 says never on a minted card; COR-11 allows one primary and one secondary, and the card equals the header. | The pair and the card don't change; the COR-18 banner carries a quiet **Review version {n}** for minted projects only. | It keeps View brief, keeps the card equal to the header, and saving v2 never changes the mint (COR-44). |
| X15 | **Innovations copy.** CNT-41: "Innovations post requested at mint — the feed isn't live yet." COM-12: "Innovations: requested — not published yet." | The Showcase row replaces the Innovations row (COM-12, amended): *"Showcased since {date}"* over *"Nothing is posted — the Innovations feed isn't open yet."* | One fact, one home, one sentence — and with Showcase a flag, the fact is the flag, not the Brief's request. |
| X16 | **The Given line.** `list.md`: "Minted {date} · given to the community". Core: "… under {licence}". | Core's. | The licence is the one term a give decides. |
| X17 | **Button case.** LST-40 "Continue brief"; COR-11 and COM-18 "Continue Brief". | "Continue Brief". | It pairs with "Add Brief". |
| X18 | **Where Save lands.** LST-30 assumes Save navigates to `/projects?saved=<id>`. The review keeps the maker on the review (`review-outputs.tsx:235-238`) and COR-40 links the project from its footer. | LST-30 is not built. | Its premise isn't how Save works. The owner's "it goes to My projects" is met: the project appears there at once. |
| X19 | **Delete on the list.** LST-31 is NEXT because delete didn't exist; COR-67…71 ship delete NOW. | LST-31 moves to NOW. | The list must not show a deleted project. |
| X20 | **Contributors and Customers.** PPL-24: main-column sections after Network. COR-19: tabs. | Tabs, appended after Network, LATER. | A tab strip exists; tabs a maker has learned never move. |
| X21 | **The rail's contents.** The PPL §4.2 sketch: Status · Outcome · Products · Created · Updated · Built in · Stored, with Network, Editor and Manage in the main column. | COR-54 and COR-55 (core K-34); PPL-6 and PPL-7's hide rules apply to the new blocks unchanged. | Each fact once: the chip is the status, the meta line the products and date. |
| X22 | **The log and the stage.** ACT-21: a fixed 267 px scrolling log. ACT-31: a stage row that opens the drawer. | COR-52's expanding list; COR-17's plain "Stage" text (core K-35). | A nested scroller traps wheel and keyboard; one door to the drawer. |
| X23 | **Hidden LATER tabs** vs `/ui-ux-pro-max` `empty-nav-state` ("explain why instead of hiding"). | Owner decision O3 wins: a destination that doesn't exist is not shown (core K-36). | Nothing is hidden that ever existed. |
| X24 | **Chip icons.** `list.md`: lock, hand-heart, tag, hexagon. COM-19: lock, eye, people, tag. | One table (§4): Draft circle, Private lock, Given hand-heart, Listed tag, Minted hexagon; the Showcase badge keeps the eye. | The rename pencil sits beside the chip, so Draft can't be a pencil; the eye says "shown", which is what Showcase means. |
| X25 | **Prices in activity entries.** ACT-64…68: typed in the Add Activity form. COM-54 (commerce CX-8): a read-only snapshot. | COM-54. | A price has one home, the listing. |
| X26 | **Who has an audience.** PPL-9's `hasAudience` is false for any minted Save. The first version of this spec made it false only for Private, with Showcase a state. | False only for a Private project that isn't showcased (`hasAudience(status, showcase)`). | Owner decision O5: a showcased project is meant to be seen, whatever its outcome. |
| X27 | **Deleting media and activities.** CNT-17: an Undo toast. ACT-72: a confirm dialog. | Both stand. | An upload is one file and reversible; an activity entry takes several files and links with it. |
| X28 | **Deleting after a mint.** Core §4.6 rows 11–12: allowed until listed. COR-70 (first version): allowed in every state NOW; blocked once a mint, listing or sale is real. | Owner decision O10: NOW a **Listed** project can't be deleted; LATER the block covers other owners and a sold project; rows 10–11 (a real token) keep COR-70's "archive takes its place". | The owner's rule is about who else has a claim — a buyer, a co-owner, a listing. A real token can't be un-minted, so COR-70's own rule for it stays. |
| X29 | **The PCB autosave on delete.** COR-92 cancels a pending autosave through COR-94's event; COR-94 moves to sub-project B. | Not needed NOW. | The autosave is debounced 300 ms; no path reaches the delete button that fast. |
| X30 | **The Open in editor hint.** COR-12: dropped when COR-66 ships. COR-66 moves to sub-project B. | Dropped when sub-project B ships. | The hint is true until the editor loads the build. |
| X31 | **"Payment due".** LST-21 and LST-47 keep a LATER slot for it; commerce CX-29 drops it until defined. | The slot stays LATER and ships only once the owner defines it. | An undefined state can't be derived honestly. |
| X32 | **Tabs or stacked sections** (core K-1). The Figma: tabs everywhere. The shipped page and `actions-ia`: stacked sections, with Network approved as a section. | Tabs: Products · Media · Network. | Owner decision O7. |
| X33 | **How a product is viewed** (core K-2). The Figma: a sub-page per product. `actions-ia` and `mobile`: an inline switcher. | Its own page. | Owner decision O8. |
| X34 | **Rebuild semantics** (core K-24). PDF line 498: a new AI build is a new project. PDF §4.8: a second generation is a new version. | Owner decision O2: the same chat → the next version; a new chat → a new lineage. | The owner decided. |
| X35 | **Where the primary lives** (core K-10). The Figma: the rail's Add To Marketplace. The research: a header pair. | The header pair, state-driven. | The next step is about the whole project, and the top-left is where makers look first. |
| X36 | **"Draft" means four things** (core K-18, list C-3). | The chip keeps "Draft"; the confidence tier is always "Build check: Draft" on the details page; the list card never shows the tier. | One word, one meaning per surface. |
| X37 | **The Brief's "Share to Innovations" tick and Showcase.** Owner decision O5 makes Showcase a flag set from the success step and the project page; the Brief already asks "Share to Innovations" on every intent. Two flags for one fact would disagree the first time a maker unshowcases. | The tick writes the same flag: `commit()` sets `showcasedAt = mintedAt` when it is checked, so the success step opens already showcased; a project minted with it before this ships gets the flag once (COR-105). Nothing reads `shareToNewsfeed` for Showcase afterwards. | One fact, one flag. LATER Showcase *is* the Innovations post, so the Brief's request and the project's flag are the same intention; making the maker press Showcase after ticking Share would ask twice. |
| X38 | **Showcase's home on the project page.** The Outcome block, or a header secondary. | The Outcome block's Showcase row (COM-55). | §3.8: the control sits beside the fact it changes; the header pair is `nextAction()`, shared with the card; the header already holds three controls on a minted project. |
| X39 | **The version history and the facts it repeats.** Owner decision O9 asks for a version history; the Project log listed "Saved version {n}" and "Built version {n}", and Details listed "Built in". §9 ruled out a "Builds" section. | The **Versions** block (COR-107) holds every version, its build and its chat; the Project log keeps only the events that aren't versions (COR-52); "Built in" becomes each lineage's heading in Versions (COR-55). §9's "Builds" row is amended. | Each fact once. A history the owner asked for, in one block, instead of the same saves in two. |
| X40 | **A product a rebuild drops.** §5.1.8's first version: it leaves the current list and stays viewable in version 1. | Owner decision O9: it stays in the list, marked, and opens at version 1 (COR-108, COR-42 amended). | The owner decided; nothing leaves the list silently. |
| X41 | **Showcase on a Draft.** The owner's answer names the success step "after any save" and "an option" on the page, without a state. | Showcase needs a mint: absent on a Draft (COR-105, COM-55). | The Brief's own promise is that minting keeps the maker's name on a design before it is shared; a Draft has no mint and no outcome to show. |

---

## 8. Errors in the Figma itself

The build corrects these; none is reproduced.

| Where | Error | Kind | The build does |
|---|---|---|---|
| Activity `146687`, `144838` | The Description limit reads "max 400" in the placeholder and "Maximum 200 characters allowed" in the error; a 315-character sample shows as valid | contradiction | 400, one live counter (ACT-55, ACT-56) |
| Activity `145126` | "Testing & Refinement" appears twice; row 12 has no "?" | duplicate | row 12 is "Others" (ACT-48) |
| `146976` | Named like the wallet frame `144396` but shows Activity History | mislabel | no wallet requirement is taken from it |
| `147307` | "Your product is at ideation state" sits on Product Launch & Feedback | copy | one explainer per stage (ACT-38) |
| Activity frames | "Idea", "Prototyping", "Prototype" against the enum's "Concept Definition", "Prototype Development" | contradiction | one enum with a label and a short form |
| `145476` | The "Filled" frame still shows "Select Activity Type" and four "Select Token", with the button enabled | contradiction | Activity Type is required (ACT-47) |
| Activity forms | "Add Now" enabled in some frames and disabled in others; two validation strategies | contradiction | always enabled; validate on press (ACT-61) |
| `146081` | The "corrected" Others example is 44 characters, over its own 40 limit | copy | "Pre-sale campaign for robotics" |
| `148726` | "Description" in Add, "Short Details" in Edit | copy | "Description" in both |
| `150384` | "Attach URLS"; "Please enter a valid URL staring with https://" | copy | "Attach URLs"; "starting" (ACT-58) |
| every form frame | The note "…you can attach that you add your product and it's less error free than previous version." | copy | rewritten (ACT-44) |
| `152598`, `152967` | Price pills don't match their breakdown; every entry has the same prices and timestamp | contradiction, placeholder data | pills derived from stored values; real times (LATER, COM-54) |
| `149392` | The subtitle promises "tap any stage to edit"; only ⋮ edits | copy | "Your product journey, newest first. Use ⋮ to edit a stage." (ACT-33) |
| `149029`, `151321` | Two modal styles, the URL modal not centred; scrims compound; the wallet popover left open behind every drawer | contradiction | one Dialog, one scrim, one layer at a time |
| `148006`, `148367`, `132940` | The image lightbox is the 16:9 video component, cover-cropped, with a play button | component reuse | contain-fit at the image's ratio (CNT-18) |
| `144255` | Two date formats: "8-Feb-2024 at 12:11 AM" and "Feb 10, 2024 · 9:09 PM" | contradiction | one formatter (COR-52) |
| `144255` vs overlays | "Created by User-2" on the base, "Owned by Us(er-2)" on every overlay | contradiction | two facts, LATER (PPL-11, PPL-12) |
| `144255`, `138210`, Q9 frames | Collections "Presell Campaign test", "Car Project Collection", "Test Collection"; "NFT ID #111" while Lazy Minted; "Mumbai teste" | contradiction | the Brief's collection only; no NFT ID; `NETWORKS` labels (COM-8) |
| `144396`, `144544` | Lazy Minted and Minted look identical; the disabled Change Wallet gives no reason | missing state | distinct tones; the reason in text (LATER, COM-33) |
| `144255` | "Quick Strat", "Unlock All Feature", "Nick Rough Login into the system", "purchase new product", "Product Senario", "Wallet Address :", "0x68f4rt....4e", Copyright shown as "USPTO" | copy | not reproduced; LATER copy corrected |
| `144255`, list cards | Stats unlabelled, "3988" without a separator, an undefined fourth metric, 3988 / 35 / 35 on every card, icon sets that differ per frame | placeholder data | no stats until real (LATER) |
| Activity, base | Text colours `#b2afb4` (2.2:1), `#fe2ad4` (3.2:1), error `#f2415a` (3.7:1) | accessibility | tokens only, ≥ 4.5:1 |
| My project frames | Non-All tabs read "00" beside "All 20"; "Public Projects 52"; Sort "Default"; "1 Products"; "Utility NFT" and "Utility NFTs"; three frames all named "PrivateProjects" | contradiction, copy | live counts that add up; correct plurals |
| `16838:392989` | "Filter By: Default" repeats the toolbar Status list — two controls for one value | duplicate | one control per facet (LST-18) |
| `41503:46586` | The Status filter mixes NFT type and sale state, with an undefined "Default" and "Payment Due" | contradiction | two facets, LATER; "Any …" (LST-18, LST-20, LST-21) |
| `38787:7959` | "Clamed NFT" in every state; "NFT Reveled", "NFT Not Reveal"; Owner "9×786…"; Token ID "#4239" on every card; "20 of 60 Public Projects created" in a holder view | copy, placeholder data | corrected, LATER (LST-63, LST-64) |
| `16838:392922` | "Search by project name or tag" — there are no tags | copy | "Search projects and products" (LST-15) |
| `136340`, `41527:267463` | The Edit Project modal labels the title field "Collection" in all four states; no Cancel | copy | inline edit (CNT-1, CNT-4) |
| `131148`, `131304`, `131461` | Delete asks for the fixed phrase "delete my project", shows it as the placeholder, errors "Input text is not correct.", has no Cancel | UX error | the project's name, only when needed; Cancel first (COR-68, COR-69) |
| page-wide | Three different ⋮ sets (4, 7 and 8 items); "IoT Network" and "Network"; "Mint Status: Lazy Minted" on nearly every frame | contradiction | no ⋮; "Network"; no "Lazy minted" now |
| `28015:130155`, `28015:130706` | A visitor sees "+ Add New Product", an enabled Add To Marketplace and "Own 30%"; "Own 100%" shown in `28015:122523` and hidden in `28015:131765` | contradiction | no owner surface for visitors; no share line when nothing is shared (LATER) |
| Contributors | "Offer Send" and "Got Offer" as two states, the invitee's Accept on the owner's table; Viewer rows with "10%", "No", "N/A"; Change Role greyed on every row; a prefilled "10%" | contradiction | one stored status seen from each side; no prefill (LATER) |
| Contributors, cards | "Creator Name", "{User Name}", "Current Owner  Name", "Visit  Profile", "Accpet Offer"; "Add Contributors" and "+ Add Contributor" | copy | real names; "Invite contributor" (LATER) |
| Restriction | "…6 days remaining." and "Restriction ends in 5 days." | contradiction | one pattern with a date and a countdown (LATER) |
| `152263`, buyer frames | No way into or out of buyer mode; the drawer is reskinned while the page keeps owner controls; "My Project" stays highlighted | missing state | Preview as buyer with a banner and an exit (PPL-4…9) |
| NFT and marketplace frames | "USDC" listed twice, "MAITC", "Royalities" with no unit (missing on Auction), "Commercial" and "Commercial Use", "Physical" inside the Virtual flow, "Add To Market Place", "Expired In :", double and trailing spaces | copy | one token per listing, "Royalties (%)", consistent labels (LATER) |
| Q9, Q10, Q14 frames | The Increase modal keeps the "Create Physical NFT" title with an editable Type; the quantity control changes type; "Percent Selling" 10 % beside a 100 % result; the resale pill reads "Private Use" for a Commercial holding; "12 Months · Active" with no end date; "[Creator Name]" left in; breadcrumb "Private Projects Physical NFT" | contradiction, copy | corrected, LATER (COM-39, COM-40, COM-46, COM-50, COM-52) |
| Media frames | The AI loading frame shows the marketplace-pause warning, "Generate complete" shows no result; the FAB label appears "when pressing pagination"; four names for the cover; no delete confirm in Media while Activity has one | contradiction | one "Cover"; one Add media button; undo on delete (CNT-14, CNT-17, CNT-20) |
| Media and share frames | Five quota systems that disagree; three sets of quality tiers; the gate dialog reuses newsfeed copy and `154595` is misnamed; the social sheet is icon-only on a `frontdev` domain | contradiction | no quotas now; the Creator's tiers; labelled share targets on the production domain (CNT-31, CNT-32, CNT-47, CNT-48) |
| Commenting | Report on your own comment; "Edited" with no Edit; the reply tag names someone else; truncation differs per frame; four avatars in one circle; a 422 px drawer beside Activity's 550; "Comments (3)" counts top-level only | contradiction | role menus, one drawer, one count (LATER, CNT-53…59) |
| Business Plan | "Saved · just now" beside "Save changes"; two of three pricing tabs empty; history twice ("3 versions kept · oldest drops off after 5"); the recommended tier marked by a border only; Premium Parts' "Cart Card" repeating one part twelve times | contradiction | per-section edit, one pricing model, one Versions panel, a text badge (CNT-71, CNT-73, CNT-76) |
| page-wide | Draft and Sold have no details frame; the gear and "Level 1" badges are undefined; the card ⋮ and stats have no designed contents | missing state | Draft designed here (§4); gear, level and card ⋮ not built |
| section names | "Project Deatils", "Edit Project Tittle", "Add prodcut flow", "Temporary pause form market place" | copy | reported to design; no copy depends on them |

---

## 9. Deliberately not built, and why

| Not built | Why |
|---|---|
| Any ⋮ menu — the project header's, the product card's, the list card's (LST-49) — and its Add App, Send To Manufacture, Send To Freelancer items; ACT-5 | D10. Every real action has a visible home; the three items have no destination. A ⋮ returns only if two rare, real actions exist. |
| The Edit Project Details modal and its "Collection" field | Inline rename and description edit where the text is read (CNT-1…7). |
| The fixed phrase "delete my project" | The project's own name, and only when something can't be rebuilt (COR-69). |
| The 633 / 482 fixed split (ACT-1) | A container-query layout that works from 400 px up (COR-5). |
| "Private Projects › Details" (ACT-3) and the visibility pill (ACT-6) | There is no visibility field; one status chip (COR-4, COR-9). |
| The five-tab strip Product · Customers · Contributors · Media · Premium Parts (ACT-11) | Products · Media · Network now; people tabs appended LATER; no Premium Parts tab (COR-19, CNT-62). |
| The two-column product grid with a first-cell Add card and 3 products per page (ACT-12, ACT-15) | A container grid with every product; the Add tile last, NEXT (COR-23, COR-25, COR-28). |
| A product card's stage pill, ⋮, stats and image dots (ACT-13, ACT-14) | Nothing real to put there; the list keeps a stage pill, NEXT (LST-44). |
| The rail's 267 px scrolling log (ACT-21) and its Figma order (ACT-22) | An expanding list; the rail order in COR-54. |
| The rail's "Activity · Idea ▾" stage row (ACT-31) | A plain "Stage" fact in the meta line (COR-17); one door to the drawer. |
| Price inputs in the Add Activity form (ACT-64, ACT-65, ACT-66, ACT-67, ACT-68) | A price is set only in the listing; entries show a snapshot (COM-54). |
| A hero concept image | Each product card carries its own image (core K-7). |
| Public, Contributed and visibility tabs now; the Completed and Utility NFT tabs | No field answers them; the outcome tabs do (LST-6). |
| COM-20's "Minted" tab | Superseded by LST-6 (§7 X4). |
| LST-30's arrival highlight on `/projects?saved=` | Save doesn't navigate there (§7 X18). |
| The `_AddProjectCard` grid tile | A header "New project" link to Home (LST-2; owner decision O11). |
| Bulk actions on the list | One home per action: the details page. |
| The Sold popup over the list | A chip on the card and a banner on the details page, LATER. |
| "Resume — {step}", "Next:", a 0/7 step bar, "Done", "Not started", "n of 7" | `flowState` is never set by any editor; progress is derived facts (owner decision O4). |
| "Lazy minted", "Live", "Posted", "On Innovations", "claim", "Untitled product", "Address"; "Listed" without its subline | Nothing backs them now; "Listed" is true only with *"Goes on sale when the marketplace opens"* (owner decision O6). |
| A Showcase button in the header, on the My projects card, or as a fourth Brief intent | Showcase has one home on the page, the Outcome row (COM-55), and one in the Brief, its success step (COM-56); the Brief keeps three intents (owner decision O5, §7 X38). |
| A separate "Builds" section | The rail's **Versions** block is the one version history (COR-107, owner decision O9); a list of raw builds beside it would repeat it (core K-25). |
| Gerber, STL and STEP downloads | They need the editor's real board, not the build's preview. |
| A price column in the combined parts list | No BOM cost exists anywhere. |
| An AI "rebuild this project" action | PDF line 498: a new AI build happens in a chat; its Save becomes the next version. |
| Media: the FAB speed-dial, Image \| Video sub-tabs, an AI video generator in Media, "Auto Generate Video", "Set as Default Media", the Desktop/Mobile lightbox toggle, the logout guard | One Add media button; groups by source; one generator in the Brief; the render outlives the page (CNT-18, CNT-20, CNT-28, CNT-38). |
| Business plan: example chips, a "Save to project" step, a page-wide edit mode, a rich-text toolbar, confirms drawn over the project page | A prefilled prompt; auto-save; per-section edit; paragraphs and bullets; confirms on the plan page only (CNT-66, CNT-69, CNT-73, CNT-77). |
| Quota counters and Upgrade gates | No billing exists (CNT-32). |
| The gear and "Level 1 ▾" badges | Undefined in the Figma. |
| A per-product tag on activities | Not in the Figma; left out of v1 (`activity-consolidated.md` §3.5). |
| The Connection Map protocol views (section `44841:556387`) and frame `26374:214516` | The owner marked the protocol views not required; the frame is misfiled. |
| The four sub-project B requirements (COR-63, COR-66, COR-94, COR-104) | Out of this spec (§11). |

---

## 10. Owner decisions (2026-09-26)

The eight questions this spec put to the owner, deduplicated across the six
area files, were answered on 2026-09-26. **The answers are final.** Each row
records the answer, what the design now does, and — as history — the default
the spec had proposed. Where the owner wrote in Banglish, the words are quoted
and translated.

| # | Question | The owner's answer | What the design does | The default it had proposed (history) |
|---|---|---|---|---|
| 1 | **Showcase: the Brief's three intents, or four?** PDF Part 4.1 lists four outcomes (Private off-chain · Showcase · Give · Sell); the shipped Brief has three intents, and all three mint. | *"Showcase ta koyek vabe aste pare. jemon jokhon jekono type er save er porei success modal a CTA thakte pare. echara ekta option ee thakte pare showcase korar jonno"* — Showcase can come about in several ways: for example a CTA in the success modal right after any kind of save, and besides that its own option to showcase. **Showcase is an action, not a Brief intent.** | O5. The status is the outcome — Draft · Private · Given · Listed · Minted. Showcase is the flag `showcasedAt` on the project (COR-105), with its own badge (LST-65, COR-9) and the **Showcase** tab of showcased projects (LST-4, LST-10). Entry points: the Brief's success step after any save (COM-56), and the Showcase row of the rail's Outcome block (COM-55), chosen over a header secondary (§3.8, X38). Both can be undone. The Brief's Share to Innovations tick writes the same flag (X37). NOW a local flag, a badge and a tab; LATER a real Innovations post (COM-57). The Brief keeps three intents. | "Three intents, Showcase derived" from Save as Private + Share to Innovations, as a status word and a state tab. |
| 2 | **The word for a minted sale.** | **"Listed"**, kept honest with a subline. | O6. **Listed** everywhere a status word appears — the chip, the tab, the status line, the state matrix — always with *"Goes on sale when the marketplace opens"* until a marketplace exists (§4.1, COR-76, COM-19). LATER a live listing keeps the word and trades the subline for its price (COR-81). | "Ready to sell", the Brief's form heading. |
| 3 | **Network: a tab or a stacked section?** | **Its own tab**, confirmed. | O7. Products · Media · Network (COR-19, COR-45, §3.6). | The same. |
| 4 | **How does a maker open a product's deliverables?** | **Each product has its own product page**, confirmed. | O8. `/projects/[id]/products/[productId]` with the deliverable tabs (§3.4, COR-30…41). | The same. |
| 5 | **A rebuild leaves out a product version 1 had.** | *"Current list thakbe. ar Project er version history maintain korte hobe."* — It stays in the current list, and the project's version history must be kept. | O9. The dropped product stays on the Products tab, marked *"Not in version 2 · from version 1"*, and its page opens at version 1 (COR-108, COR-42, COR-24, COR-41). A **Versions** block in the rail is the version history: each version's date, chat and build, what it added, dropped and changed, its piece count, and a link to each of its products (COR-106, COR-107). The product page's version select reads the same list (COR-41). | "It leaves the current list and stays viewable in version 1". |
| 6 | **How much friction on delete?** | *"Onno keo owner ba marketplace a sell hole delete korte parbena."* — If someone else is an owner, or it is being sold on the marketplace, it can't be deleted. | O10. NOW a **Listed** project can't be deleted: Delete stays in Manage, `aria-disabled`, with *"A listed project can't be deleted."* and the honest line that no route out exists yet (COR-67, COR-70, §3.6). LATER the block covers co-owners and contributors holding a share (PPL-22) and a sold project (COR-83); a live listing gains the route *"remove the listing first"* (§4.2). Deletable projects keep the recommended friction: one dialog, the typed name only when something can't be rebuilt (COR-68, COR-69). | Conditional friction with the project's name — kept; delete allowed in every state NOW. |
| 7 | **The "New project" entry on My projects.** | **A header button that goes to Home**, confirmed. | O11. LST-2. | The same. |
| 8 | **What does a buyer see before buying**, and so what Preview as buyer shows now? | **Previews only** — 3D, PCB, wiring and the parts list; firmware source and downloads after purchase. Confirmed. | O12. PPL-7; Preview as buyer NOW. | The same. |

**Closed on their defaults (not asked).** Each area file's other questions are
either decided by a rule already in force or low-stakes enough to proceed; the
owner's decisions above override any of them they touch:

| From | Question | Default |
|---|---|---|
| core Q4 | Delete a project minted in this browser? | Decided by owner decision O10: allowed now except a **Listed** project; LATER blocked while anyone else owns a share, once sold, and once a real token exists (COR-70). |
| core Q6 | Delete's home? | Rail **Manage** — D10 already rules out a ⋮. |
| core Q7 | The primary while a newer build waits? | **Review version {n}** (LST-43). |
| core Q8 | Add a product from the project page? | The "Add a product" tile, NEXT (COR-28). |
| list Q2 | Tabs once public pages exist? | Keep the outcome tabs; add a Visibility filter (LST-12). |
| list Q4 | Bulk actions? | None; one home per action. |
| people Q-1…Q-2 | Edit role name; preview label? | "Editor"; "Preview as buyer". |
| people Q-4…Q-8 | Person card, public URL, Team credit, invitee access, co-owner invites on public projects? | View profile only; a separate public URL; a Team credit; read-only access; no. |
| commerce Q4 | Disclose the simulation? | Yes — the footnote (COM-14), under the house rule. |
| commerce Q5…Q8, Q10 | Editions timing; Physical vs Virtual; editing a listed project; "Percent Selling"; where live operations live | NEXT in the Brief; a build licence vs the digital twin; the next version with a manual pause; a share of ownership; the project page's card. |
| commerce Q9 | The "Utility NFT" tab? | Removed with the outcome tabs (LST-6). |
| content Q1…Q8 | Clip grain; activity files in Media; Share's later home; plan figures; uploads as cover; media delete; comment grain; premium parts | Per project; no; the header Share; AI proposes, labelled; yes; Undo; per project; inside the Parts tab. |
| activity | The 400 limit; links per stage; a link as proof; the "Listed at" marker; one token; the fourth stat; a product tag; the stage explainers | 400; optional for every type; a link counts ("Add at least one file or link."); kept, LATER; one token per listing; not built until the owner names it; not in v1; the draft explainers ship with the journey store for the owner to edit. |
| commerce CX-29 | "Payment due"? | Dropped until the owner defines it. |

---

## 11. Sub-project B, noted for later

**Open in editor loads the build.** Today a build project's **Open in editor**
opens a generic demo schematic and the default cube: it never imports the
build's PCB, 3D model or firmware. And the PCB provider is mounted at the root
and never rehydrates on a client navigation, so moving from one project to
another shows — and can overwrite — the previous project's board under the new
project's chrome (live repro in `research/editor-flow.md`).

Sub-project B is:
- **COR-66** — on first open of a project that has a build, seed the PCB
  document from `bomFor` / `netsFor` (schematic only, `obj_` ids) instead of the
  demo circuit; load the build's 3D model and firmware the same way;
- **COR-63** — per-project Code, 3D and Preview storage (`ideeza:code:files`,
  `ideeza:code:blockly-workspace`, `ideeza:3d:shapes`, `ideeza:3d:right`,
  `ideeza:preview:canvas`, `ideeza:preview:mates` become `…:<projectId>`), which
  loading the build's firmware and 3D into those editors needs first;
- **COR-94** — the PCB store follows the active project: a change of active
  project rehydrates `PcbProvider` from the new project's document, and a pending
  autosave writes to the key it was scheduled for;
- **COR-104** — `frameloop="demand"` on the assembly viewer, and
  `PcbProvider`'s document read scoped to the editor routes.

It stays out of this spec. **Pointer:** `core.md` §1J (COR-63, COR-66), §1M
(COR-94), §1N (COR-104) and the "Active project → PCB store" writer row in its
§3.3; `research/editor-flow.md` §4–§5; `research/a11y-perf.md` Impl 3 and 8. It
gets its own spec once this one ships.

Until then this design stays honest about it: the header keeps COR-12's hint
(*"The editor starts from a sample board — your build's parts aren't in it
yet."*), the Editor block keeps COR-60's caption about the shared Code, 3D and
Preview stores and reads whatever the stores hold, and the delete sweep does not
depend on it (§7 X29).

---

## Counts

| Area | NOW | NEXT | LATER | Elsewhere |
|---|---|---|---|---|
| COR | 81 | 12 | 11 | 4 in sub-project B |
| LST | 43 | 7 | 14 | 1 not built (LST-30) |
| PPL | 9 | 1 | 47 | — |
| COM | 23 | 9 | 24 | 1 not built (COM-20) |
| CNT | 23 | 30 | 30 | — |
| ACT | 1 | 38 | 2 | 40 carried by another requirement, 17 not built |
| **Total** | **180** | **97** | **128** | 63 |

All 460 ids in the six files are accounted for, and so are the eight this spec
adds for the owner's decisions of 2026-09-26 — COR-105 (the Showcase flag),
COR-106 (the version history), COR-107 (the Versions block), COR-108 (a dropped
product stays), LST-65 (the Showcase badge), COM-55 (the Showcase control),
COM-56 (Showcase on the Brief's success step), all NOW, and COM-57 (the real
Innovations post), LATER: 468 in all. Moved between phases by this spec: LST-10,
LST-31, LST-42 and LST-43 from NEXT to NOW (§7 X3, X8, X19). Amended in place by
the owner's decisions, ids and phases unchanged: LST-2, LST-4, LST-5, LST-9,
LST-10, LST-35; COR-9, COR-19, COR-22, COR-23, COR-24, COR-41, COR-42, COR-52,
COR-53, COR-54, COR-55, COR-67, COR-68, COR-70, COR-76, COR-78, COR-79, COR-81,
COR-83; COM-3, COM-11, COM-12, COM-18, COM-19, COM-21, COM-22, COM-26, COM-27;
CNT-40, CNT-41, CNT-44, CNT-47; PPL-6, PPL-7, PPL-9, PPL-22.
