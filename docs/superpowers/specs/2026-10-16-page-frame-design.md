# One page frame (layout audit, Option A)

Status: approved by the owner 2026-10-16 ("A is final; the report's recommendations stand; DS Figma first, then code").
Source: the 30-member layout audit (report artifact 5yXdizdWAU71zaU8hXZm4m, preview K7QqqXWKR3DQqTbb8uZ4RT).

## Problem
No shared page frame: 21 page widths in 37 files, 12 H1 size/weight pairs, 4 phone gutters. At 1920 the H1
starts 12–472 px from main's edge depending on the page. Figma User Panel V2 and DS O01 App Shell both draw
one shell (content padded 32 px, left-anchored, fluid); the code never used it.

## Decisions (owner, 2026-10-16)
| # | Decision |
|---|---|
| D1 | **Option A**: the frame is main − `layout/page-inset` on every side and fills the width. No max-width, no centring. |
| D2 | Narrow column (forms, editor, reader, Earn, checkout) = `layout/content-narrow` 720, on the frame's left edge, never re-centred. |
| D3 | Rail = `layout/rail` 360. |
| D4 | Phone inset 16 (`spacing/8`). |
| D5 | Page title = DS O02 Page Header, Heading/H3 24/32 SemiBold. Published content (post, article, profile) may use H2 28/36. |
| D6 | Top-level pages keep a visible H1. |
| D7 | Messages: inset 32 like every page; list stays 320 (spec). |
| D8 | Settings / Plan / Checkout stay inside the shell, on the frame (1376 dropped). |
| D9 | Sidebar collapsed = 64 (DS O04). |
| D10 | Innovations stays a grid, auto-fill. |
| D11 | No ultra-wide cap for now; revisit at 2560 after shipping. |

## DS Figma (done 2026-10-16, file V3uizmZLHo5Xhy65Dp3F0O)
Collection **📐 Layout** (`VariableCollectionId:4502:186`, modes Desktop / Mobile), WEB code syntax set:
| Variable | Desktop | Mobile | CSS |
|---|---|---|---|
| layout/page-inset | → spacing/16 (32) | → spacing/8 (16) | `--layout-page-inset` |
| layout/gutter | → spacing/12 (24) | → spacing/8 (16) | `--layout-gutter` |
| layout/content-narrow | 720 | 720 | `--layout-content-narrow` |
| layout/rail | 360 | 360 | `--layout-rail` |
| layout/card-min | 280 | 280 | `--layout-card-min` |
| layout/sidebar | 280 | 280 | `--layout-sidebar` |
| layout/sidebar-collapsed | 64 | 64 | `--layout-sidebar-collapsed` |
| layout/breakpoint/tablet | 768 | 768 | `--layout-bp-tablet` |
| layout/breakpoint/desktop | 1280 | 1280 | `--layout-bp-desktop` |
Doc card **F07 — Page Layout** on Foundations (`4503:186`); F05's spec lines now match the published grid styles.

## Rules
1. One frame on every in-app page; header, tabs, filters and body share it.
2. One header: `PageHeader` (O02) — breadcrumb when deeper, H3 title, one-line description, actions right.
3. Banners and notices go below the title.
4. A page never picks its own width; its type does:
   - **Launchpad** (Home): hero band fills the frame, prompt centred inside (the only centred title).
   - **Collection** (Innovations, Marketplace, My projects, Parts, History, Blog list): fills the frame; grids auto-fill from `layout/card-min`.
   - **Detail** (project, product, post, market item, part, network, profile): main column + 360 rail.
   - **Form / Reading** (Earn, Plan, checkout, mint, invoice, blog editor/reader): 720 column on the left edge + rail of real content; prose 62ch.
   - **Workspace** (Messages, Chat, Build): panes fill the frame and scroll on their own.
   - **Studio** (editors, Parts › New): full-screen, outside the shell.
5. Layout switches read the page container (main's width), never the viewport.
6. Empty states and skeletons sit on the same edges as the content they replace.

## Code
- `src/styles/tokens.css`: the `--layout-*` tokens (+ phone values in the `max-width: 767px` block).
- `src/components/ideeza/page.tsx`: `Page` (container + frame), `PAGE_FRAME`, `PAGE_GRID`, `NARROW_COLUMN`; server-safe (no hooks).
- `src/components/ideeza/page-header.tsx`: `PageHeader` (O02).
- `PAGE_CONTENT` (`projects/details/frame.tsx`) becomes the frame, so its users move at once.

## Phases
1. Infra: tokens, Page, PageHeader.
2. `PAGE_CONTENT` users (project, product, Earn, post, market item, profile).
3. Collections (Projects, Marketplace, Innovations, Parts, History, Blog list) + their route fallbacks.
4. Other widths (part detail, blog editor/reader, plan, checkout, invoice, network, mint).
5. Workspaces + Home (Messages, Chat, Build, nested `<main>`, attention banner on main).
6. Guards: `ds-layout` source test, docs (`ui-ux.md` Layout rule, features guides).
