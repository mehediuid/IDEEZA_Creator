# Tour Guide — design

**Status:** owner approved 2026-10-22 ("Shob recommended thik ache, P1 shuru koro"): D1–D9 as recommended.
**Plan and mockup:** https://claude.ai/artifact/Rm6aBk8ieNSUpHgtS9JMu5
**Figma:** User Panel V2 `HDtWAU2PSbjQKlEWgHI3ev` › page "✅ Tour Guide" › section `16838:307342` — Dashboard Homepage Tour (19 frames, `16838:307343`…) and Tour Guide for Pro Pages (7 frames, `25895:368204`…). The popup is built on the design system's **M10 Popover** (`V3uizmZLHo5Xhy65Dp3F0O` `1441:894`); the DS wins where the two differ.

## What it is

A step-by-step popup tour that shows a new user the whole journey, split into short parts ("chapters", 3–5 steps each) instead of one long run:

- **Welcome** (M07 Modal, 512): on the first Home visit of a browser with no projects and no chats. *Show me around* runs **Start here**; *I'll explore on my own* (or ✕, Escape, the scrim) closes it for good. Fine print: "You can find this again under Support › Tour Guide."
- **Chapters**: each step spotlights one place (a 40 % overlay scrim with the target cut out, Figma) and shows the step popup beside it: "n/N" and **Skip Tour Guide** on top, title, body, then **Previous** (from step 2) and **Next Tip**; the last step says **Explore**, with "Next part: … →" when a next part exists.
- **Tour Guide panel**: Support › Tour Guide (and ⌘K "Open Tour Guide") opens one panel listing every chapter with Start / Replay / Resume n/N and ✓ Seen, and **Reset tours**.

## Decisions (approved 2026-10-22)

| | Decision |
|---|---|
| D1 | ~~9 short chapters + the panel; a chapter's end offers the next one~~ — changed 2026-10-25 (study W6TzTM8bS39MuDB5YyPxW7, owner "build"): a chapter's end offers **Up next**, the next real step on the user's path from what they have done, across groups (`nextFor`); Explore → "Done for now" |
| D2 | Chapters after Start here are offered on the first visit to their place (P2/P3); since 2026-10-25 Not now once waits for a later visit, twice ends it |
| D3 | Figma 15/19 "My Notes" is not shipped (no Notes in the app) |
| D4 | Skip Tour Guide is the DS A03 Link (brand), not Figma's pink |
| D5 | The panel floats beside the sidebar from Support › Tour Guide (a dialog elsewhere), no new page |
| D6 | Chapters that need a project are locked with the reason until one exists (P2/P3) |
| D7 | ~~The panel's journey ticks come from real actions (P3)~~ — removed at the owner's request (2026-10-22): the panel lists the chapters only |
| D8 | Our own engine on the DS M10 Popover; `@floating-ui/dom` (already a dependency) places it; nothing new installed |
| D10 | (2026-10-25) The Welcome is the whole-platform map: plain words, the real starting credits, "Start with my idea" / "Look around first" / "I know hardware — start by hand"; closed, it comes back once on a later visit |
| D11 | (2026-10-25) Start here is 3 steps on Home ending with the cursor in the prompt box; Find your way (now led by My projects, Figma 11/19) and Your account are side tours outside the first run |
| D12 | (2026-10-25) Tips never dim the page or take focus, and close once their control is pressed; chat tips cover What to build; their copy matches the app (one concept per product, no typed build price) |
| D13 | (2026-10-25) Inside the PCB editor teaches the task (parts → board → properties → help); Pro 7/8 (premium price) is the price chip's tooltip |
| D14 | (2026-10-25) Mint and sell adds Business plan; Money says the share joins one balance withdrawn in Get paid |
| D15 | (2026-10-25) Every editor's Help lists Tutorials (its topic), Tour of this editor and Tour Guide |
| D16 | (2026-10-25) A resume card (once, a later visit), an arrival card for shared links, and one pointer to where the tours live; the panel opens with Up next (one line, no stepper — D7 stays removed). Connect your wallet (3/19) stays in Your account, which no longer runs in the first chain |
| D17 | (2026-10-25, owner: "a new user got three or four popups, closed them, and was left unsure" → chose "both") **The first-product guide**: the Welcome's Start with my idea opens a card that stays with a new user on every page (foot corner, under dialogs, no dimming, no focus taken) through 8 real steps — write the idea, answer the question, see the concept, Build, Save, open the editor (not on a phone), mint, share — and moves on by itself from the app's own state, never a Next button. Show me rings the control; Take me there opens its page; – folds it to a pill; ✕ closes it (the panel brings it back). It shows a step count and the DS A22 progress bar: the owner's choice, though D7 removed the panel's journey ticks. While it is up it is the one voice (no chat or editor tips, visit offers or resume card). It ends with "Your first product is done" → Full tour of IDEEZA |
| D18 | (2026-10-25, owner) **Full tour of IDEEZA** in the panel (Start, first): every page one by one in the sidebar's order — Home, History, My projects, the project, a product, each editor module, Earn's tabs, Parts, Marketplace, Innovations and a post, Blog, Messages, the account pages — built from the parts' own steps (34; 16 without a project; no editors on a phone). Seen to the end, its parts count as seen for Up next. (2026-10-26, owner) The Welcome's Look around first starts it (it ran Find your way) |
| D9 | ~~The editors chapter spotlights the five rail modules in one editor (P2)~~ — changed 2026-10-25: The editors maps the rail, the save status and Finish without hopping; each module gets its own tip the first time it opens (Editor tips) |

## Figma steps → chapters

| Figma | Title | Ships as | Phase |
|---|---|---|---|
| 1/19 + 10/19 | Home Page Icon, Dashboard | Find your way · 1 (Home) | P1 |
| 2/19 | Visit Profile | Your account · 1 | P1 |
| 3/19 | Earn IDEEZA Coin | Your account · 5 (Tutorial) | P1 |
| 3/19 (2nd) | Connect Your Wallet | Your account · 4 | P1 |
| 4/19 | Write your prompt here | Start here · 1 | P1 |
| 5/19 | View your prompt history | Find your way · 2 | P1 |
| 6/19 + 7/19 | Quick Start, Create New Project | Start here · 2 (mode switch) | P1 |
| 8/19 + 9/19 + 12/19 | Part, New Agile Module, Parts & Agile Module | Find your way · 3 | P1 |
| 11/19 | My Project Board | Start here · 5 | P1 |
| 13/19 + 14/19 | Explore Marketplace, News Feed | Find your way · 4 | P1 |
| 16/19 + 17/19 | Messages, Blog | Find your way · 5 | P1 |
| 19/19 | View Progress | Your account · 3 (level) | P1 |
| 15/19 | My Notes | not shipped (D3) | — |
| Pro 1–4, 5 (missing → Assembly) | editor modules | The editors | P2 |
| Pro 7, 8 | premium parts price, properties | Inside the PCB editor | P2 |
| Pro 6 | Add Brief | Mint and sell · 2 | P3 |

Added beyond the Figma: Start here · 3 (examples + Enhance), · 4 (what a build gives), Your account · 2 (credits), the Welcome, the panel, the phone steps.

## Behaviour

- **Store:** `ideeza:tour` = `{ v: 1, welcome: "unseen" | "started" | "declined", chapters: { [id]: { state: "done" | "skipped" | "paused", step } }, offers: boolean, offered: ChapterId[] }`. No record + no projects + no chats = a new user. **Reset tours** writes a fresh record, so the Welcome comes back on the next Home visit even with projects.
- **Targets:** `data-tour="<id>"` on the real controls. A step may name several ids (one spotlight around them all). The first *visible* element counts (the sidebar exists twice: desktop aside and phone drawer).
- **Every step names its page** (owner, 2026-10-22: "every tour step must browse to exactly the page it's about"): Next opens that page, then lights the step there; a sidebar row is lit with the page it opened.
- **Phone (< 768 px):** the sidebar is a drawer, so a step lights the page's part only.
- **Missing target:** the step is skipped; if no step of the chapter can be shown the chapter pauses (the panel offers Resume). A chapter with a home page (Start here → `/`) goes there first.
- **Losing the target** (navigation, a resize hiding it) pauses the chapter at that step.
- **Keys:** Escape = Skip Tour Guide; ← → = Previous / Next Tip while focus is in the popup; keys typed in the popup stop there (the editors listen on `window`).
- **Focus:** each step focuses its title; the popup is `role="dialog"` labelled by the title, described by the body; "Step n of N: title" is announced politely. Closing returns focus to what had it before the tour.
- **Never** starts over an open modal dialog; the Welcome waits until none is open.
- **Motion:** the spotlight and popup move 200 ms ease-out, nothing under `prefers-reduced-motion`.

## Phases

- **P1 (built):** M10 Popover, engine, Welcome, Start here, Find your way, Your account, the panel, Support › Tour Guide and ⌘K.
- **P2 (built):** concept chat tips (shown as each part renders), Your project, The editors, Inside the PCB editor, first-visit offers, the panel's groups, locked reasons (D6, brought forward from P3 since P2's chapters need a project) and the offers switch.
- **P3 (built):** Mint and sell, Share with the community. (The journey on the DS M33 Stepper was built, then removed at the owner's request.)
