# Tutorials — Figma requirements and design (2026-10-19)

**Source.** Figma "User Panel V2" (`HDtWAU2PSbjQKlEWgHI3ev`), section **Tutorial**, node `38577:5711`, as read on 2026-10-19. It has six frames:

| Frame | Node | What it shows |
|---|---|---|
| F1 | `38577:5712` | Tutorial Categories |
| F2 | `38577:5727` | The topic page, full length |
| F3 | `38577:5890` | A nested sub-topic, with Claim |
| F4 | `38577:5984` | The hover tooltip |
| F5 | `38577:5808` | Claim |
| F6 | `38577:6078` | Claimed |

**Review and plan.** https://claude.ai/artifact/NjJyuT2UfyjebTKUed8SbC

**Owner decisions (2026-10-19).** "Go with the recommended options for D1–D7. I'll send the videos per topic."

| ID | Decision |
|---|---|
| D1 | The owner sends each topic's video. Until a video arrives, its slot reads "Video coming soon" and pays nothing. Fake videos are never used. |
| D2 | Each video pays 2.0 IDZ, once per account, after 90% of it has been watched. |
| D3 | The Figma pink becomes the DS brand violet. The DS has no pink text token, and #FE2AD4 measures 3.2 : 1. |
| D4 | Build A1 (progress and resume), A2 (Previous / Next) and A3 (the wallet's "Earn IDZ tokens" row opens Tutorials) now. A4 (⌘K topic search) comes later. |
| D5 | Fix typos only: "Let's", "an IDEEZA", "collaboration". Every other Figma word stays. |
| D6 | With no wallet connected, Claim opens the Demo wallet dialog. The claim finishes once a wallet connects. |
| D7 | The draft topic outline is approved. The text is written from the live app. |

Every Figma element is built. Only the look comes from the IDEEZA design system. Each difference from a frame's drawing is named in its row.

## Tutorial Categories (`/tutorials`, F1)

| ID | Figma | Built |
|---|---|---|
| L1 | Title "Tutorial Categories" | O02 page header in the page frame. |
| L2 | Intro line | Body 16/24 in secondary ink. The one change is the typo fix "Lets" → "Let's" (D5). |
| L3 | Card grid, 3 across at 1440 | `PAGE_GRID`: 3 across with the sidebar open, then 2, then 1. |
| L4 | Cover image | The Figma's own images (`public/tutorials/covers`), 8:5, radius lg. |
| L5 | Title | 18/28 Medium. It wraps to 2 lines instead of "Proje…" (DR7). |
| L6 | IDZ amount | The sum of the category's watchable videos, in brand ink (D3). It is hidden while no video has arrived (D1). |
| L7 | Description | Body 16/24, 3-line clamp. |
| L8 | "N Topics" chip | DS A18 Tag (md), display only. Correct singular and plural forms. |
| L9 | "N Videos ▷" chip | DS Tag with a play icon. "Videos coming soon" while the category has no files (D1). |
| L10 | The card opens the category | The whole card is one link, the title's stretched link. It opens the category's last-read page, or else its first page (A1). |
| L11 | Six categories, in Figma order | IDEEZA · Set Up IDEEZA · First Product on IDEEZA · Parts Vs Agile Modules · In Depth Analysis on Project · Code (Tech). |

## Topic page (`/tutorials/[category]/[topic]`, F2–F6)

| ID | Figma | Built |
|---|---|---|
| T1 | Breadcrumb: Tutorial › Category › Topic | "Tutorial" links to the list. The category, and a group if there is one, is plain text, because the Figma has no category page. The last crumb is `aria-current="page"` in primary ink (DR4). |
| T2 | Every category as a header with a chevron, the current one open | Disclosure buttons (`aria-expanded`). |
| T3 | Topics under a thin guide line | Border-subtle line, 16/24 rows. |
| T4 | Selected topic | Brand-subtle fill and brand ink, the same as the sidebar's selected row. |
| T5 | A topic with sub-topics opens a third level (F3) | A group topic is a disclosure button. Its pages are links. |
| T6 | Cut-off names show the full name on hover (F4) | DS A19 tooltip, on hover and on keyboard focus (`useHoverTip`). |
| T7 | Article title | The page's H1, 24/32 SemiBold. |
| T8 | Paragraphs | Body 16/24. |
| T9 | Headings, including a sub-heading | Real H2s (20/28) and H3s (18/26) with anchors. |
| T10 | Inline image | Supported as a block. Today's content has none. |
| T11 | Video card | Border, radius xl, elevation 1. The play button is 56 px (DR5). Caption: "See this video and earn IDZ Token". |
| T12 | Earn → Claim → Claimed | Brand text, then DS Button sm, then DS Badge success with a check. |
| T13 | More than one video per topic | Each video has its own reward and state. |
| T14 | "Page Content" rail with an icon | The Blog reader's contents list, under the Figma's name. The rest of the list is secondary ink, not #B2AFB4 (DR1). |
| T15 | The heading being read is marked | `useScrollSpy`. |
| S1 | Sidebar "Tutorial" | Support › Tutorial is a live link, current on these pages. |
| S2 | A way in from anywhere | ⌘K "Open the tutorial". |

## States the Figma doesn't draw (added, plan "Needed")

**Reward footer states.** The footer moves through:
1. coming soon
2. earn
3. watching, with a progress line: "n% watched · watch to the end to earn 2.0 IDZ"
4. ready
5. claiming, with the button busy for the demo chain's 600 ms
6. claimed

**Messages.** The footer's live status line carries these:
- "Connect your demo wallet to receive the IDZ…" while it waits for a wallet.
- "Couldn't add the tokens to your demo wallet. Try again." if the claim fails.
- "2.0 IDZ added to your demo wallet." after a claim.

The app has no global toast, so this line is where the plan's toast appears.

**Not found.** A wrong address shows "Tutorial not found". `/tutorials/[category]` redirects to the category's first page.

**Layout by container width.** The page frame's container decides the layout:

| Container width | Layout |
|---|---|
| 1120 px and up | Three columns. |
| 900 px and up | Menu and article. Page Content folds under the title. |
| Below 900 px | One column. A "Topics" button opens the menu in the DS Drawer. |

## Reward logic

**What counts as watched.** Only stretches that really played count (`tickSpan`):
- A seek starts a new stretch.
- A move longer than 1.5 s between ticks is a seek.
- A replayed part counts once (`addSpan`).

A video is watched once its played seconds reach 90% of its length.

**Payment.** A claim adds a wallet activity line to the maker's chosen demo account:
- id `tutorial-reward:<videoId>`
- title "Tutorial reward · <video>"
- a `credit` of the reward in IDZ

`balancesOf` adds credits, so the balance rises by exactly the reward. The activity row reads "+2 IDZ". The line's id makes a second payment impossible, even if the tutorial record were lost.

**Stored progress.** `ideeza:tutorials:progress` holds:
- played stretches and lengths
- claims
- pages read to the end
- each category's last page

## Additions (D4)

| ID | Addition |
|---|---|
| A1 | The card shows "n of m topics done · x IDZ earned". A finished page has a check in the menu. The card resumes at the last page read. |
| A2 | Previous / Next links at the end of each article, within the category. |
| A3 | The wallet popover's "Earn IDZ tokens" row is live. Its hint is "Watch tutorial videos", and it opens `/tutorials`. |

## Videos needed (D1)

Each slot shows "Video coming soon" until its file arrives. Send one video per row; it goes in as that slot's `src`. Each pays 2.0 IDZ once watched.

| # | Category › Page | Video | Slot id |
|---|---|---|---|
| 1 | IDEEZA › Introduction | A quick tour of IDEEZA | `ideeza/introduction/1` |
| 2 | IDEEZA › From idea to product | Following one idea from prompt to saved project | `ideeza/from-idea-to-product/1` |
| 3 | IDEEZA › Build and Earn: the two halves of a project | Moving between a project's Build and Earn sides | `ideeza/build-and-earn/1` |
| 4 | Set Up IDEEZA › Your creator profile | Filling in your creator profile | `set-up-ideeza/creator-profile/1` |
| 5 | Set Up IDEEZA › Wallet and IDZ (testnet demo) | Connecting the demo wallet | `set-up-ideeza/wallet-and-idz/1` |
| 6 | Set Up IDEEZA › Plans and credits | Buying credits and choosing a plan | `set-up-ideeza/plans-and-credits/1` |
| 7 | First Product on IDEEZA › Start from a prompt | Writing your first prompt | `first-product/start-from-a-prompt/1` |
| 8 | First Product on IDEEZA › Choose a concept | Changing a concept before you build | `first-product/choose-a-concept/1` |
| 9 | First Product on IDEEZA › Book a build and read the build log | Booking your first build | `first-product/book-a-build/1` |
| 10 | First Product on IDEEZA › Book a build and read the build log | Reviewing the build and saving the project | `first-product/book-a-build/2` |
| 11 | First Product on IDEEZA › Share to Innovations | Sharing your project to Innovations | `first-product/share-to-innovations/1` |
| 12 | Parts Vs Agile Modules › The parts library | Finding a part in the library | `parts-vs-agile-modules/parts-library/1` |
| 13 | Parts Vs Agile Modules › What an Agile Module is | Placing an Agile Module on a schematic | `parts-vs-agile-modules/what-is-an-agile-module/1` |
| 14 | Parts Vs Agile Modules › When to use which | Choosing between a part and a module | `parts-vs-agile-modules/when-to-use-which/1` |
| 15 | In Depth Analysis on Project › The project page | A tour of the project page | `in-depth-analysis/project-page/1` |
| 16 | In Depth Analysis on Project › Products inside a project | Opening a product's page | `in-depth-analysis/products-inside-a-project/1` |
| 17 | In Depth Analysis on Project › Activity and Network | Adding an Activity entry with proof | `in-depth-analysis/activity-and-network/1` |
| 18 | In Depth Analysis on Project › Activity and Network | Creating a network for your products | `in-depth-analysis/activity-and-network/2` |
| 19 | In Depth Analysis on Project › Selling: Main, Physical and Virtual | Listing a project on Explore marketplace | `in-depth-analysis/selling/1` |
| 20 | In Depth Analysis on Project › Selling: Main, Physical and Virtual | Selling Physical and Virtual copies | `in-depth-analysis/selling/2` |
| 21 | Code (Tech) › Introduction | Opening a product in the editors | `code-tech/introduction/1` |
| 22 | Code (Tech) › PCB editor › Placing parts | Placing and wiring parts on the schematic | `code-tech/placing-parts/1` |
| 23 | Code (Tech) › PCB editor › Routing | Routing a track by hand | `code-tech/routing/1` |
| 24 | Code (Tech) › PCB editor › Design rule check | Running a design rule check | `code-tech/design-rule-check/1` |
| 25 | Code (Tech) › Firmware code | Editing firmware in the Code module | `code-tech/firmware-code/1` |
| 26 | Code (Tech) › 3D and enclosure | Taking the 3D model apart | `code-tech/3d-and-enclosure/1` |
| 27 | Code (Tech) › 3D and enclosure | Adding and moving shapes in the 3D Module | `code-tech/3d-and-enclosure/2` |
