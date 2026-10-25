// The Tour Guide's chapters: the Figma's Dashboard Homepage Tour and Tour Guide for Pro Pages
// (User Panel V2 › Tour Guide, 16838:307342) cut into parts of at most five steps, on today's app.
// The Figma's step behind each popup is noted beside it; its lorem ipsum is replaced by real copy
// (plan Rm6aBk8ieNSUpHgtS9JMu5).

import { BUILD_COST, CONCEPT_COST } from "../create/credits";
import { IDEEZA_FEE_BPS } from "../market/fee";
import type { ChapterId, TourChapter } from "./types";

/** IDEEZA's cut of a sale, as the sale itself charges it (`lib/market/fee.ts`). */
const IDEEZA_FEE_PERCENT = IDEEZA_FEE_BPS / 100;

export const TOUR_CHAPTERS: TourChapter[] = [
  {
    id: "start",
    name: "Start here",
    group: "Start",
    where: "Home",
    place: "home",
    steps: [
      {
        // 4/19 Write your prompt here
        target: "home-composer",
        page: "home",
        title: "Write your idea here",
        body: "Describe what you want to make in plain words, like “a desk lamp that turns on when I clap”. More detail gives a better design.",
      },
      {
        // 6/19 Start Your Project (Quick Start) + 7/19 Create New Project
        target: "home-mode",
        page: "home",
        title: "With AI or by hand",
        body: "Generate with AI drafts the whole design for you. Build manually opens an empty project in the editor.",
      },
      {
        target: "home-examples",
        page: "home",
        title: "Need a starting point?",
        body: "Tap an example to fill the box, or press Enhance and AI will sharpen what you wrote.",
      },
      {
        target: "home-get",
        page: "home",
        title: "What every build gives you",
        body: "A 3D model, a PCB, firmware code, wiring and a parts list, all ready to change in the editors.",
      },
      {
        // 11/19 My Project Board
        target: ["nav-projects", "page-head"],
        page: "projects",
        title: "Your projects live here",
        body: "Everything you make lands in My projects and saves by itself. Open one to pick up where you left off.",
      },
    ],
  },
  {
    // Each step opens its page: the row in the menu and the page itself are lit together.
    id: "way",
    name: "Find your way",
    group: "Start",
    where: "Sidebar",
    place: "sidebar",
    steps: [
      {
        // 5/19 View your prompt history
        target: ["nav-history", "page-head"],
        page: "history",
        title: "History",
        body: "Every idea you sent and every build, listed here so nothing gets lost.",
      },
      {
        // 8/19 Part + 9/19 New Agile Module + 12/19 Parts & Agile Module
        target: ["nav-parts", "page-head"],
        page: "parts",
        title: "Parts & agile module",
        body: "Real parts and ready-made modules you can drop into any design, or add your own.",
      },
      {
        // 13/19 Explore Marketplace
        target: ["nav-marketplace", "page-head"],
        page: "marketplace",
        title: "Explore marketplace",
        body: "Projects and product copies other makers are selling. Buy one to own it or build it yourself.",
      },
      {
        // 14/19 News Feed
        target: ["nav-innovations", "page-head"],
        page: "innovations",
        title: "Innovations",
        body: "Where makers share what they built. Follow them, appreciate and save projects you like.",
      },
      {
        // 16/19 Messages
        target: ["nav-messages", "page-head"],
        page: "messages",
        title: "Messages",
        body: "Your conversations with other makers about their projects and yours.",
      },
      {
        // 17/19 Blog
        target: ["nav-blog", "page-head"],
        page: "blog",
        title: "Blog",
        body: "Read news and build stories, or write your own and send it for review.",
      },
    ],
  },
  {
    id: "account",
    name: "Your account",
    group: "Start",
    where: "Sidebar footer",
    place: "sidebar",
    steps: [
      {
        // 2/19 Visit Profile
        target: ["account", "profile-head"],
        page: "profile",
        title: "Your profile",
        body: "Your public page: what you have made, what you build with and how people reach you.",
      },
      {
        target: ["plan", "plan-credits"],
        page: "credits",
        // Plan & pricing opens on its plans; the Credits tab is chosen for the step.
        reveal: "plan-credits-tab",
        title: "Credits pay for AI",
        body: `A concept uses ${CONCEPT_COST} credit and a build uses ${BUILD_COST} for each product. Buy more here, or get them every month with a plan.`,
      },
      {
        // 19/19 View Progress
        target: "account-level",
        reveal: "account",
        title: "Your level",
        body: "Concepts and builds earn XP. Your level grows from Explorer to Maker, Inventor and Pioneer.",
      },
      {
        // 3/19 Connect Your Wallet
        target: ["wallet", "balance-card"],
        page: "balance",
        title: "Your wallet",
        body: "Your IDZ balance and what moved in and out. You only need a wallet to mint or sell, not to build.",
      },
      {
        // 3/19 Earn IDEEZA Coin
        target: ["support-tutorial", "page-head"],
        page: "tutorials",
        title: "Earn IDZ while you learn",
        body: "Tutorials explain each part of IDEEZA, and watching their videos earns IDZ.",
      },
    ],
  },
  {
    // Not in the Figma: the AI's answers take seconds to minutes to land, so each tip waits for
    // its part of the chat instead of a run of Next Tip.
    id: "chat",
    name: "From idea to concepts",
    group: "Build",
    where: "Your AI chat",
    place: "chat",
    tips: true,
    steps: [
      {
        target: "chat-question",
        title: "A few quick questions",
        body: "AI asks a question or two before it draws anything. Your answers shape the concepts.",
      },
      {
        target: "chat-concept",
        title: "Your concepts",
        body: "Each card is one way to make your idea. Ask for changes in the chat, or pick the one you like.",
      },
      {
        target: "chat-build",
        title: "Build it",
        body: `Build turns the concept into a real design: schematic, PCB, code and 3D. It uses ${BUILD_COST} credits for each product.`,
      },
      {
        target: "chat-save",
        title: "Check it, then save",
        body: "Look over what was built and save it. Your project opens with every part in place.",
      },
    ],
  },
  {
    id: "project",
    name: "Your project",
    group: "Build",
    where: "Project page",
    place: "project",
    needsProject: true,
    offered: true,
    steps: [
      {
        target: "project-tabs",
        page: "project",
        title: "Everything in one place",
        body: "Products, Media, Network and Team each have their own tab.",
      },
      {
        target: "project-earn",
        page: "project",
        title: "Earn from this project",
        body: "When you are ready, mint it and sell it from here. Nothing goes public until you choose.",
      },
      {
        target: "project-actions",
        page: "project",
        title: "More actions",
        body: "Edit the name and description, share to Innovations and more live in this menu.",
      },
      {
        target: "product-editor",
        page: "product",
        title: "Open a product in the editor",
        body: "Each product has its own page. Open in editor to change its PCB, code, 3D model and wiring.",
      },
    ],
  },
  {
    // The Figma's Pro pages tour: each step opens that module.
    id: "editors",
    name: "The editors",
    group: "Build",
    where: "Editors",
    place: "editor",
    needsProject: true,
    desktopOnly: true,
    offered: true,
    steps: [
      {
        // Pro 1/8 PCB Design
        target: "rail-pcb",
        page: "editor-pcb",
        title: "PCB Design",
        body: "Draw the schematic and lay out the circuit board.",
      },
      {
        // Pro 2/8 Design Your Code
        target: "rail-code",
        page: "editor-code",
        title: "Code",
        body: "Write the firmware that runs on your board, in code or with blocks.",
      },
      {
        // Pro 3/8 Create 3D Module
        target: "rail-3d",
        page: "editor-3d",
        title: "3D Module",
        body: "Shape the product's 3D model, like the case around the board.",
      },
      {
        // Pro 5/8 is missing from the Figma: Assembly is the module there today.
        target: "rail-assembly",
        page: "editor-assembly",
        title: "Assembly",
        body: "Put the parts together, then connect them in Wiring mode.",
      },
      {
        // Pro 4/8 Product Overview
        target: "rail-preview",
        page: "editor-preview",
        title: "Product Preview",
        body: "See the finished product the way others will see it.",
      },
    ],
  },
  {
    id: "pcb",
    name: "Inside the PCB editor",
    group: "Build",
    where: "PCB Design",
    place: "pcb",
    needsProject: true,
    desktopOnly: true,
    offered: true,
    steps: [
      {
        // Pro 8/8 View Canvas Properties & Objects
        target: "pcb-properties",
        page: "editor-pcb",
        title: "Properties and objects",
        body: "Select anything on the board to change it here. Filter and Layer sit in the next tabs.",
      },
      {
        // Pro 7/8 View Price For Premium Parts
        target: "pcb-price",
        page: "editor-pcb",
        title: "Price for premium parts",
        body: "The total for premium parts on this board. Every library part is free today, so it reads $0.00.",
      },
      {
        target: "editor-saved",
        page: "editor-pcb",
        title: "No save button needed",
        body: "Your work saves itself, and this shows when it last did. Ctrl+S (⌘S on a Mac) works too.",
      },
      {
        target: "editor-help",
        page: "editor-pcb",
        title: "Stuck?",
        body: "Help has the tutorials and Report a problem.",
      },
    ],
  },
  {
    // Each step opens its tab of Earn.
    id: "earn",
    name: "Mint and sell",
    group: "Earn & share",
    where: "Earn",
    place: "earn",
    needsProject: true,
    offered: true,
    steps: [
      {
        target: "earn-path",
        page: "earn-overview",
        title: "Two steps to earning",
        body: "Mint your project first, then put it on sale. Each step lists what it still needs.",
      },
      {
        // Pro 6/8 Add Brief: the Brief is the mint flow now.
        target: "earn-step-mint",
        page: "earn-overview",
        title: "Mint",
        body: "Minting records that you own this design. It is free, and you sign it with your wallet.",
      },
      {
        target: ["earn-sell", "earn-sell-rules"],
        page: "earn-sell",
        title: "Sell",
        body: `Sell the whole project as its Main NFT, or physical and virtual copies of each product. IDEEZA takes ${IDEEZA_FEE_PERCENT}% of each sale.`,
      },
      {
        target: ["earn-money", "earn-sales"],
        page: "earn-money",
        title: "Money",
        body: "Every sale and what it paid you. A sale pays your wallet directly; Splits, above, shows who shares in it.",
      },
    ],
  },
  {
    id: "share",
    name: "Share with the community",
    group: "Earn & share",
    where: "Innovations",
    place: "feed",
    offered: true,
    steps: [
      {
        target: ["feed-modes", "feed-categories"],
        page: "innovations",
        title: "See what others build",
        body: "Switch between Discover, Following, Saved and Appreciated, or pick a category.",
      },
      {
        target: ["post-media", "post-head"],
        page: "post",
        title: "A post",
        body: "Each post opens on its video, then the story, what is inside and how it was made.",
      },
      {
        // Your own project's ⋯ menu; without one yet, My projects, where it will be.
        target: "project-actions",
        page: "project",
        title: "Share yours",
        body: "Open ⋯ on your project and choose Share to Innovations. Mint it and make its videos first.",
      },
    ],
  },
];

export function chapterById(id: ChapterId): TourChapter {
  const chapter = TOUR_CHAPTERS.find((c) => c.id === id);
  if (!chapter) throw new Error(`No tour chapter "${id}"`);
  return chapter;
}

export function isChapterId(id: unknown): id is ChapterId {
  return TOUR_CHAPTERS.some((c) => c.id === id);
}

/** The chapter the last step offers as "Next part": the next one in its group, past any tips. */
export function nextChapterOf(id: ChapterId): TourChapter | null {
  const at = TOUR_CHAPTERS.findIndex((c) => c.id === id);
  const group = TOUR_CHAPTERS[at]?.group;
  return TOUR_CHAPTERS.slice(at + 1).find((c) => c.group === group && !c.tips) ?? null;
}
