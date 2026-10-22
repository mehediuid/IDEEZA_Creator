# Features — Tour Guide

Part of the feature inventory ([index](README.md)). Keep it current: [AGENTS.md › Keeping docs current](../../../AGENTS.md#keeping-docs-current-required).

**Sources**
- Requirements and decisions: `docs/superpowers/specs/2026-10-22-tour-guide-design.md` (owner decisions D1–D9, approved 2026-10-22).
- Plan and mockup: https://claude.ai/artifact/Rm6aBk8ieNSUpHgtS9JMu5
- Figma: User Panel V2 › "✅ Tour Guide" (`16838:307342`); the popup is the DS **M10 Popover** (`V3uizmZLHo5Xhy65Dp3F0O` `1441:894`).

## Tour Guide (`components/tour`, `lib/tour`)
- **Welcome** (`welcome-dialog.tsx`, DS M07 Modal): on Home, once, to a browser with no projects and no chats (or after Reset tours). The path from idea to product in five lines; **Show me around** runs Start here, **I'll explore on my own** (or ✕, Escape, the scrim) closes it for good and says where the tour lives. A bottom sheet on a phone.
- **Chapters** (`lib/tour/chapters.ts`), the Figma's Dashboard Homepage Tour in parts of at most five steps:
  - **Start here** (Home): the prompt box, With AI or by hand, examples and Enhance, what every build gives, My projects.
  - **Find your way** (sidebar): Home, History, Parts & agile module, Explore marketplace + Innovations, Blog + Messages.
  - **Your account** (sidebar footer): profile, credits (the prices read from `CONCEPT_COST` / `BUILD_COST`), level, wallet, Tutorial.
  - On a phone the sidebar is a drawer, so Find your way and Your account are one step each on the menu button, and Start here's last step points there too.
- **A step** (`tour-step.tsx`): the page under the app's dialog scrim with the step's controls cut out (a hole, so the control itself still works), and the M10 Popover beside them, placed by `@floating-ui/dom` (flip, shift, arrow) and kept there through scrolls and resizes: "n/N" and **Skip Tour Guide**, title, body, **Previous** (from step 2) and **Next Tip**; the last step says **Explore**, with "Next part: … →" to the next chapter. Each step takes focus on its title and is announced ("Step 2 of 5: …"). ← → move, Escape skips; keys typed in the popup stop there. A control that isn't on screen is waited for (6 s for a run's first step, which may be waiting on its page; 1.5 s after), then skipped; a control that goes away, or a dialog opening over the page, pauses the chapter.
- **Targets**: `data-tour` ids on the real controls — `home-composer`, `home-mode`, `home-examples`, `home-get` (Home); `nav-*`, `plan`, `account`, `wallet`, `support-tutorial`, `support-tour`, `menu` (sidebar and phone bar). The first one on screen counts.
- **Tour Guide panel** (`tour-guide-panel.tsx`): Support › Tour Guide opens it beside the sidebar (the footer popovers' `FloatingPanel`); ⌘K "Open Tour Guide" and the phone's menu open it as a dialog (a sheet on a phone). Every chapter with its steps and place, ✓ Seen, and **Start**, **Replay** or **Resume n/N**; **Reset tours** clears it all and brings the Welcome back on Home. A chapter started from another page goes to its page first.
- **Record**: `ideeza:tour` (`lib/tour/state.ts`, read live by `use-tour.ts`) — the Welcome's answer and each chapter's state (done, skipped, paused) and step.
- **Ways in**: the Welcome, Support › Tour Guide (live; Help Center is still "not available yet"), ⌘K › Resources › Open Tour Guide.
- Next (P2/P3, not built): the concept chat's tips, Your project, The editors, Inside the PCB editor, Mint and sell, Share with the community, first-visit offers, journey ticks.
