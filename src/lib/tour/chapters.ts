// The Tour Guide's chapters: the Figma's Dashboard Homepage Tour and Tour Guide for Pro Pages
// (User Panel V2 › Tour Guide, 16838:307342) cut into parts of at most five steps, on today's app.
// The Figma's step behind each popup is noted beside it; its lorem ipsum is replaced by real copy
// (plan Rm6aBk8ieNSUpHgtS9JMu5).

import { BUILD_COST, CONCEPT_COST } from "../create/credits";
import type { ChapterId, TourChapter, TourStep } from "./types";

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
        title: "Write your idea here",
        body: "Describe what you want to make in plain words, like “a desk lamp that turns on when I clap”. More detail gives a better design.",
      },
      {
        // 6/19 Start Your Project (Quick Start) + 7/19 Create New Project
        target: "home-mode",
        title: "With AI or by hand",
        body: "Generate with AI drafts the whole design for you. Build manually opens an empty project in the editor.",
      },
      {
        target: "home-examples",
        title: "Need a starting point?",
        body: "Tap an example to fill the box, or press Enhance and AI will sharpen what you wrote.",
      },
      {
        target: "home-get",
        title: "What every build gives you",
        body: "A 3D model, a PCB, firmware code, wiring and a parts list, all ready to change in the editors.",
      },
      {
        // 11/19 My Project Board
        target: "nav-projects",
        title: "Your projects live here",
        body: "Everything saves by itself. Open My projects to pick up where you left off.",
      },
    ],
  },
  {
    id: "way",
    name: "Find your way",
    group: "Start",
    where: "Sidebar",
    place: "sidebar",
    steps: [
      {
        // 1/19 Home Page Icon + 10/19 Dashboard
        target: "nav-home",
        title: "Home",
        body: "Every new idea starts here. The IDEEZA logo brings you back too.",
      },
      {
        // 5/19 View your prompt history
        target: "nav-history",
        title: "Your prompt history",
        body: "Every idea you sent and every build is listed here, so nothing gets lost.",
      },
      {
        // 8/19 Part + 9/19 New Agile Module + 12/19 Parts & Agile Module
        target: "nav-parts",
        title: "Parts and agile modules",
        body: "Browse real parts and ready-made modules you can drop into any design.",
      },
      {
        // 13/19 Explore Marketplace + 14/19 News Feed
        target: ["nav-marketplace", "nav-innovations"],
        title: "See what others make",
        body: "Explore marketplace sells projects and copies. Innovations is where makers share what they built.",
      },
      {
        // 16/19 Messages + 17/19 Blog
        target: ["nav-blog", "nav-messages"],
        title: "Talk and read",
        body: "Messages holds your conversations about projects. Blog has news and build stories.",
      },
    ],
    phoneSteps: [
      {
        target: "menu",
        title: "Find your way",
        body: "The menu holds Home, History, Parts & agile module, Explore marketplace, Innovations, Blog and Messages.",
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
        target: "account",
        title: "Your profile",
        body: "Open this menu for your profile, where people see your work and how to reach you.",
      },
      {
        target: "plan",
        title: "Credits pay for AI",
        body: `A concept uses ${CONCEPT_COST} credit and a build uses ${BUILD_COST} for each product. Your plan adds credits every month.`,
      },
      {
        // 19/19 View Progress
        target: "account",
        title: "Your level",
        body: "Concepts and builds earn XP. Your level grows from Explorer to Maker, Inventor and Pioneer.",
      },
      {
        // 3/19 Connect Your Wallet
        target: "wallet",
        title: "Your wallet",
        body: "Connect a wallet to hold IDZ. You only need it to mint or sell, not to build.",
      },
      {
        // 3/19 Earn IDEEZA Coin
        target: "support-tutorial",
        title: "Earn IDZ while you learn",
        body: "Tutorials explain each part of IDEEZA, and watching their videos earns IDZ.",
      },
    ],
    phoneSteps: [
      {
        target: "menu",
        title: "Your account",
        body: "At the foot of the menu: your profile, credits, level and wallet, and the tutorials that earn IDZ.",
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
        title: "Everything in one place",
        body: "Products, Media, Network and Team each have their own tab.",
      },
      {
        target: "project-product",
        title: "Open a product",
        body: "Each product has its own page. Use Open in editor there to change its design.",
      },
      {
        target: "project-earn",
        title: "Earn from this project",
        body: "When you are ready, mint it and sell it here. Nothing goes public until you choose.",
      },
      {
        target: "project-actions",
        title: "More actions",
        body: "Edit the name and description, share to Innovations and more live in this menu.",
      },
    ],
  },
  {
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
        title: "PCB Design",
        body: "Draw the schematic and lay out the circuit board.",
      },
      {
        // Pro 2/8 Design Your Code
        target: "rail-code",
        title: "Code",
        body: "Write the firmware that runs on your board, in code or with blocks.",
      },
      {
        // Pro 3/8 Create 3D Module
        target: "rail-3d",
        title: "3D Module",
        body: "Shape the product's 3D model, like the case around the board.",
      },
      {
        // Pro 5/8 is missing from the Figma: Assembly is the module there today.
        target: "rail-assembly",
        title: "Assembly",
        body: "Put the parts together, then connect them in Wiring mode.",
      },
      {
        // Pro 4/8 Product Overview
        target: "rail-preview",
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
        title: "Properties and objects",
        body: "Select anything on the board to change it here. Filter and Layer sit in the next tabs.",
      },
      {
        // Pro 7/8 View Price For Premium Parts
        target: "pcb-price",
        title: "Price for premium parts",
        body: "The total for premium parts on this board. Every library part is free today, so it reads $0.00.",
      },
      {
        target: "editor-saved",
        title: "No save button needed",
        body: "Your work saves itself, and this shows when it last did. Ctrl+S (⌘S on a Mac) works too.",
      },
      {
        target: "editor-help",
        title: "Stuck?",
        body: "Help has the tutorials and Report a problem.",
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

/** The steps for this screen. On a phone, Start here's last step points at the menu button. */
export function stepsFor(chapter: TourChapter, phone: boolean): TourStep[] {
  if (!phone) return chapter.steps;
  if (chapter.phoneSteps) return chapter.phoneSteps;
  return chapter.steps.map((s) =>
    s.target === "nav-projects"
      ? { ...s, target: "menu", body: "Everything saves by itself. Open the menu, then My projects, to pick up where you left off." }
      : s,
  );
}

/** The chapter the last step offers as "Next part": the next one in its group, past any tips. */
export function nextChapterOf(id: ChapterId): TourChapter | null {
  const at = TOUR_CHAPTERS.findIndex((c) => c.id === id);
  const group = TOUR_CHAPTERS[at]?.group;
  return TOUR_CHAPTERS.slice(at + 1).find((c) => c.group === group && !c.tips) ?? null;
}
