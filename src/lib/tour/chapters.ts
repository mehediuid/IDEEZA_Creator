// The Tour Guide's chapters: the Figma's Dashboard Homepage Tour and Tour Guide for Pro Pages
// (User Panel V2 › Tour Guide, 16838:307342) cut into short parts on today's app, in the order of
// the user's path from idea to product (study https://claude.ai/artifact/W6TzTM8bS39MuDB5YyPxW7).
// The Figma's step behind each popup is noted beside it; its lorem ipsum is replaced by real copy.
// What a step says about the app is read from the app (credits, the fee), never typed in twice.

import { CONCEPT_COST } from "../create/credits";
import { IDEEZA_FEE_BPS } from "../market/fee";
import type { ChapterId, TourChapter, TourStep } from "./types";

/** IDEEZA's cut of a sale, as the sale itself charges it (`lib/market/fee.ts`). */
const IDEEZA_FEE_PERCENT = IDEEZA_FEE_BPS / 100;

const PARTS: TourChapter[] = [
  {
    // The first win: three steps on Home, then the user writes their idea (its last card's Up
    // next puts the cursor in the prompt box).
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
        body: `Describe what you want to make in plain words, like “a desk lamp that turns on when I clap”. A concept uses ${CONCEPT_COST} credit.`,
      },
      {
        // 6/19 Start Your Project (Quick Start) + 7/19 Create New Project
        target: "home-mode",
        page: "home",
        title: "With AI or by hand",
        body: "Generate with AI draws and builds the design for you. Build manually opens an empty project in the editors, if you know electronics.",
      },
      {
        target: "home-examples",
        page: "home",
        title: "Need a starting point?",
        body: "Tap an example to fill the box, or press Enhance and AI will sharpen what you wrote.",
      },
    ],
  },
  {
    // Not in the Figma: the AI's answers take seconds to minutes to land, so each tip waits for
    // its part of the chat instead of a run of Next. They never dim the chat.
    id: "chat",
    name: "From idea to concepts",
    group: "Build",
    where: "Your AI chat",
    place: "chat",
    tips: "in-order",
    steps: [
      {
        target: "chat-question",
        title: "A few quick choices",
        body: "Pick what this build includes and which project it's for. Nothing is charged until you press Start drawing.",
      },
      {
        target: "chat-concept",
        title: "Your concept",
        body: "Each card is one product's concept. Describe a change in the box below, or press Refine or Regenerate, 1 credit each.",
      },
      {
        target: "chat-pick",
        title: "What to build",
        body: "The pieces this product's build makes, with their credits and about how long. Press Edit to leave some out; the parts list is free.",
      },
      {
        target: "chat-build",
        title: "Build it",
        body: "Build makes every picked piece for every product. You can leave while it runs; the bell tells you when it's ready.",
      },
      {
        target: "chat-save",
        title: "Check it, then save",
        body: "Look over each part, then press Save Project. You name it, and View project opens its page.",
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
        target: "project-add",
        page: "project",
        title: "Add a product",
        body: "Another product joins this project, like a remote for your lamp. Build it with AI or by hand.",
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
    // The editors' map, without hopping between modules: the rail in order, the save status, and
    // Finish (in Product Preview). What each module is comes as its own tip, the first time it
    // opens ("modules", below).
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
        target: "editor-rail",
        title: "Five modules, top to bottom",
        body: "PCB Design, Code, 3D Module, Assembly and Product Preview. AI already made each one; change only what you want.",
      },
      {
        target: "editor-saved",
        title: "No save button needed",
        body: "Your work saves itself, and this shows when it last did. Ctrl+S (⌘S on a Mac) works too.",
      },
      {
        target: "editor-finish",
        page: "editor-preview",
        title: "Finish",
        body: "When the product looks right, Finish takes you on to mint the project.",
      },
    ],
  },
  {
    // The Figma's Pro pages tour, one tip per module, each the first time that module opens.
    id: "modules",
    name: "Editor tips",
    group: "Build",
    where: "Each editor module",
    place: "editor",
    needsProject: true,
    desktopOnly: true,
    tips: "any-order",
    steps: [
      {
        // Pro 1/8 PCB Design
        target: "rail-pcb",
        page: "editor-pcb",
        title: "PCB Design",
        body: "Draw the schematic, then lay out the circuit board from it.",
      },
      {
        // Pro 2/8 Design Your Code
        target: "rail-code",
        page: "editor-code",
        title: "Code",
        body: "The firmware that runs on your board, in code or with blocks.",
      },
      {
        // Pro 3/8 Create 3D Module
        target: "rail-3d",
        page: "editor-3d",
        title: "3D Module",
        body: "The product's 3D model, like the case around the board.",
      },
      {
        // Pro 5/8 is missing from the Figma: Assembly is the module there today.
        target: "rail-assembly",
        page: "editor-assembly",
        title: "Assembly",
        body: "Put the board and the case together, then connect them in Wiring mode.",
      },
      {
        // Pro 4/8 Product Overview
        target: "rail-preview",
        page: "editor-preview",
        title: "Product Preview",
        body: "See the finished product the way others will see it. Finish is here too.",
      },
    ],
  },
  {
    // The task, in the order it is done; the board's own tools do the rest. Pro 7/8 (the premium
    // parts price) is the price chip's tooltip now.
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
        // The parts library is the left panel's Library tab; the step opens it.
        target: ["pcb-library-tab", "pcb-place"],
        page: "editor-pcb",
        reveal: "pcb-library-tab",
        title: "Start with the parts",
        body: "Place a Part opens the library. Put your parts on the schematic, then wire them together.",
      },
      {
        target: "pcb-mode",
        page: "editor-pcb",
        title: "Then the board",
        body: "When the circuit is drawn, switch to PCB: the board is made from it. Auto Route draws the tracks; DRC checks them.",
      },
      {
        // Pro 8/8 View Canvas Properties & Objects
        target: "pcb-properties",
        page: "editor-pcb",
        title: "Properties and objects",
        body: "Select anything on the board to change it here. Filter and Layer sit in the next tabs.",
      },
      {
        target: "editor-help",
        page: "editor-pcb",
        title: "Stuck?",
        body: "Help › Tutorials covers placing parts, routing and the design rule check.",
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
        body: "Mint your project first, then put it on sale. This card always shows your next step and what's missing.",
      },
      {
        // Pro 6/8 Add Brief: the Brief is the mint flow now.
        target: "earn-step-mint",
        page: "earn-overview",
        title: "Mint",
        body: "Minting records the design as yours, as an NFT. Here it's a free testnet demo; your demo wallet signs it.",
      },
      {
        target: ["earn-sell", "earn-sell-rules"],
        page: "earn-sell",
        title: "Sell",
        body: `Sell the whole project (the buyer gets everything) or copies of each product, each listed on its own. IDEEZA takes ${IDEEZA_FEE_PERCENT}%.`,
      },
      {
        target: ["earn-plan", "earn-plan-doc"],
        page: "earn-plan",
        title: "Business plan",
        body: "Draft a business plan for this project any time. No mint or wallet needed.",
      },
      {
        target: ["earn-money", "earn-sales"],
        page: "earn-money",
        title: "Money",
        body: `Every sale and your share after the ${IDEEZA_FEE_PERCENT}% fee and any splits. It joins one balance; withdraw it in Settings › Get paid.`,
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
        // 14/19 News Feed
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
        // Your own project's ⋯ menu (left out until there is a project).
        target: "project-actions",
        page: "project",
        title: "Share yours",
        body: "Open ⋯ on your project and choose Share to Innovations. Mint it and make its videos first.",
      },
    ],
  },
  {
    // A side tour, not part of the first run: each step opens its page, the row in the menu and
    // the page lit together.
    id: "way",
    name: "Find your way",
    group: "Look around",
    where: "Sidebar",
    place: "sidebar",
    steps: [
      {
        // 11/19 My Project Board
        target: ["nav-projects", "page-head"],
        page: "projects",
        title: "Your projects",
        body: "Every project you save lands here and saves itself as you work. Open one to pick up where you left off.",
      },
      {
        // 5/19 View your prompt history
        target: ["nav-history", "page-head"],
        page: "history",
        title: "History",
        body: "Every idea you sent and every build, saved or not. Reopen a chat to carry on.",
      },
      {
        // 8/19 Part + 9/19 New Agile Module + 12/19 Parts & Agile Module
        target: ["nav-parts", "page-head"],
        page: "parts",
        title: "Parts & agile module",
        body: "Real parts and ready-made modules for any design. Search them, or make your own with New package.",
      },
      {
        // 13/19 Explore Marketplace
        target: ["nav-marketplace", "page-head"],
        page: "marketplace",
        title: "Explore marketplace",
        body: "Projects and product copies other creators are selling. Open one to see what you'd get.",
      },
      {
        // 16/19 Messages
        target: ["nav-messages", "page-head"],
        page: "messages",
        title: "Messages",
        body: "Your conversations. A new one starts from Message on a creator's post, profile or listing.",
      },
      {
        // 17/19 Blog
        target: ["nav-blog", "page-head"],
        page: "blog",
        title: "Blog",
        body: "Write about what you built and send it for review. The IDEEZA team publishes it on the Blog.",
      },
    ],
  },
  {
    id: "account",
    name: "Your account",
    group: "Look around",
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
        body: `A concept uses ${CONCEPT_COST} credit; a build costs what you pick to build. Buy more here, or get more each month with a plan.`,
      },
      {
        // 19/19 View Progress — in the account menu, which a phone keeps in its closed drawer.
        target: "account-level",
        reveal: "account",
        desktopOnly: true,
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
        title: "Learn in Tutorials",
        body: "Short articles on every part of IDEEZA. Their videos will pay IDZ once they are out.",
      },
    ],
  },
];

/** The full tour (owner, 2026-10-25): every page one by one, in the sidebar's order, a project's
 *  own pages (its page, the editors, Earn) under My projects. It is made of the parts' own steps,
 *  so their words are said once; each step opens its page. Without a project those pages are left
 *  out, and the editors on a phone. The chat isn't in it: its tips need a chat of the user's own. */
function fullTour(): TourChapter {
  const part = (id: ChapterId) => PARTS.find((c) => c.id === id)!.steps;
  const desktop = (steps: TourStep[]) => steps.map((s) => ({ ...s, desktopOnly: true }));
  const [rail, saved, finish] = part("editors");
  const [projects, history, parts, marketplace, messages, blog] = part("way");
  const [feed, post] = part("share");
  return {
    id: "tour",
    name: "Full tour of IDEEZA",
    group: "Start",
    where: "Every page, one by one",
    place: "sidebar",
    steps: [
      ...part("start"),
      history,
      projects,
      ...part("project"),
      ...desktop([{ ...rail, page: "editor-pcb" }, ...part("modules"), { ...saved, page: "editor-preview" }, finish]),
      ...part("earn"),
      parts,
      marketplace,
      feed,
      post,
      blog,
      messages,
      ...part("account"),
    ],
  };
}

export const TOUR_CHAPTERS: TourChapter[] = [fullTour(), ...PARTS];

export function chapterById(id: ChapterId): TourChapter {
  const chapter = TOUR_CHAPTERS.find((c) => c.id === id);
  if (!chapter) throw new Error(`No tour chapter "${id}"`);
  return chapter;
}

export function isChapterId(id: unknown): id is ChapterId {
  return TOUR_CHAPTERS.some((c) => c.id === id);
}
