// The Tour Guide's chapters: the Figma's Dashboard Homepage Tour (User Panel V2 › Tour Guide,
// 16838:307342) cut into parts of at most five steps, on today's app. The Figma's step behind each
// popup is noted beside it; its lorem ipsum is replaced by real copy (plan Rm6aBk8ieNSUpHgtS9JMu5).

import { BUILD_COST, CONCEPT_COST } from "../create/credits";
import type { ChapterId, TourChapter, TourStep } from "./types";

export const TOUR_CHAPTERS: TourChapter[] = [
  {
    id: "start",
    name: "Start here",
    where: "Home",
    route: "/",
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
    where: "Sidebar",
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
    where: "Sidebar footer",
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

/** The chapter the last step offers as "Next part", if any. */
export function nextChapterOf(id: ChapterId): TourChapter | null {
  const at = TOUR_CHAPTERS.findIndex((c) => c.id === id);
  return TOUR_CHAPTERS[at + 1] ?? null;
}
