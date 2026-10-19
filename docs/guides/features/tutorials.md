# Features — Tutorials

Part of the feature inventory ([index](README.md)). Keep it current: [AGENTS.md › Keeping docs current](../../../AGENTS.md#keeping-docs-current-required).

**Sources**
- Requirements and decisions: `docs/superpowers/specs/2026-10-19-tutorials-design.md`, one row per Figma element plus owner decisions D1–D7.
- Review and plan: https://claude.ai/artifact/NjJyuT2UfyjebTKUed8SbC
- Figma: "User Panel V2 › Tutorial" (`38577:5711`). Every element ships in the design system.

## Tutorials (`/tutorials`, `lib/tutorials`, `components/tutorials`)
- **Content** (`lib/tutorials/content.ts`):
  - Six categories in the Figma's order. Each holds topics, and a topic is a page or a group of pages (the menu's third level).
  - Blocks: paragraph, heading (H2/H3), list, image and video.
  - Every count and IDZ total is worked out from the content (`catalog.ts`).
  - A video slot without a file reads "Video coming soon" and pays nothing (D1).
- **Tutorial Categories** (`/tutorials`): the page header, then one card per category in the page grid.
  - A card holds the cover, the title, the IDZ its watchable videos pay, the description, a "N Topics" tag, and a "N Videos" tag ("Videos coming soon" until files arrive).
  - The whole card is one link. It opens the page last read in that category, or else its first page.
  - Once there is progress, the card says "n of m topics done · x IDZ earned".
- **Topic page** (`/tutorials/[category]/[topic]`; `/tutorials/[category]` opens the category's first page): in a white card, the breadcrumb (Tutorial › Category › Topic) over three columns.
  - **Topics menu:** every category opens and closes. The page on show is brand-subtle. A cut-off name shows whole in the DS tooltip on hover and focus. A finished page carries a check.
  - **Article:** H1, Body 16/24, H2/H3 with anchors, lists, video cards, and Previous / Next within the category.
  - **Page Content:** the Blog reader's contents list with scroll-spy.
  - **Narrower widths:** Page Content folds under the title. Below 900 px a "Topics" button opens the menu in the DS Drawer.
  - A wrong address shows "Tutorial not found".
- **Video rewards** (`progress.ts`, `reward.ts`, `tutorial-video.tsx`):
  - Only real playback counts. A seek starts a new stretch, and a replayed part counts once.
  - At 90% watched, "Earn: 2.0 IDZ Token" becomes "Claim 2.0 IDZ Token". While watching, a progress line shows the % watched.
  - Claim pays the maker's chosen demo account: a wallet activity line "Tutorial reward · …" with a `credit`, shown as "+2 IDZ". `balancesOf` adds credits.
  - The line's id makes each video pay once. Afterwards the footer reads "✓ Claimed", and a status line says the IDZ was added.
  - With no wallet connected, Claim opens the Demo wallet dialog and finishes once a wallet connects. A refused write says so and keeps Claim for a retry.
  - Progress (`ideeza:tutorials:progress`) keeps played stretches, lengths, claims, pages read to the end, and each category's last page.
- **Ways in:**
  - Sidebar Support › Tutorial, shown as current on these pages.
  - ⌘K "Open the tutorial".
  - The wallet popover's "Earn IDZ tokens".
