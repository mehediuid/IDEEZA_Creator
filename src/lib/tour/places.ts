// Where the Tour Guide is: which kind of page an address is, which chapter that page offers on a
// first visit (spec D2), whether the chat's tips are on, and why a chapter can't start yet.

import { parseEditorPath } from "../manual/editor-scope";
import { TOUR_CHAPTERS, chapterById } from "./chapters";
import type { ChapterId, PageRef, Place, TourChapter, TourRecord, TourStep } from "./types";

// The editors that also live at the app's root, outside a project (`/pcb`, `/code`, …).
const ROOT_EDITORS: Record<string, Place> = { pcb: "pcb", code: "editor", "3d": "editor", preview: "editor", wiring: "editor" };

/** The kind of page an address is; `null` for one no chapter runs on (the mint flow). */
export function placeOf(pathname: string): Place | null {
  if (pathname === "/") return "home";
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "chat" && parts[1]) return "chat";
  if (parts[0] === "projects" && parts.length === 2) return "project";
  // Earn and its tabs; its mint flow is a page of its own, without the tabs.
  if (parts[0] === "projects" && parts[2] === "earn") return parts.length === 3 || (parts.length === 4 && parts[3] !== "mint") ? "earn" : null;
  if (parts[0] === "innovations" && parts.length === 1) return "feed";
  if (parts[0] === "project") {
    const editor = parseEditorPath(pathname);
    if (!editor) return null;
    return editor.step === "pcb" ? "pcb" : "editor";
  }
  if (parts.length === 1 && ROOT_EDITORS[parts[0]]) return ROOT_EDITORS[parts[0]];
  if (parts[0] === "brief") return null;
  return "sidebar";
}

// The fixed pages, by their own address.
const FIXED: Partial<Record<PageRef, string>> = {
  home: "/",
  projects: "/projects",
  history: "/history",
  parts: "/parts",
  marketplace: "/marketplace",
  innovations: "/innovations",
  messages: "/messages",
  blog: "/blog",
  balance: "/balance",
  tutorials: "/tutorials",
};

const EDITOR_STEP: Partial<Record<PageRef, string>> = {
  "editor-pcb": "pcb",
  "editor-code": "code",
  "editor-3d": "three",
  "editor-assembly": "assembly",
  "editor-preview": "preview",
};

/** Whether `pathname` is the page a step is about (any project's, for a project's pages). */
export function pageMatches(page: PageRef, pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  // Messages keeps its list beside an open conversation.
  if (page === "messages") return parts[0] === "messages";
  const fixed = FIXED[page];
  if (fixed) return pathname === fixed;
  switch (page) {
    case "profile":
      return parts[0] === "creators" && parts.length === 2;
    case "credits":
      return pathname === "/settings/plan";
    case "project":
      return parts[0] === "projects" && parts.length === 2;
    case "product":
      return parts[0] === "projects" && parts[2] === "products" && parts.length === 4;
    case "earn-overview":
      return parts[0] === "projects" && parts[2] === "earn" && parts.length === 3;
    case "earn-sell":
    case "earn-money":
      return parts[0] === "projects" && parts[2] === "earn" && parts[3] === page.slice(5) && parts.length === 4;
    case "post":
      return parts[0] === "innovations" && parts.length === 2;
    default: {
      const editor = parseEditorPath(pathname);
      return !!editor && editor.step === EDITOR_STEP[page];
    }
  }
}

/** The address of a page that needs nothing to name it; `null` for one that needs a project or a post. */
export function fixedHrefOf(page: PageRef): string | null {
  if (page === "profile") return "/creators/me";
  if (page === "credits") return "/settings/plan?tab=credits";
  return FIXED[page] ?? null;
}

export function editorStepOf(page: PageRef): string | null {
  return EDITOR_STEP[page] ?? null;
}

/** The pages that are a project's own: there is nothing to open for them without a project. */
const PROJECT_PAGES: ReadonlySet<PageRef> = new Set<PageRef>([
  "project",
  "product",
  "earn-overview",
  "earn-sell",
  "earn-money",
  ...(Object.keys(EDITOR_STEP) as PageRef[]),
]);

/** The steps a chapter can show: one about a project's page is left out until there is a project
 *  (Share with the community then ends on its post). */
export function runnableSteps(chapter: TourChapter, hasProject: boolean): TourStep[] {
  return hasProject ? chapter.steps : chapter.steps.filter((s) => !s.page || !PROJECT_PAGES.has(s.page));
}

/** Whether a chapter can run on this kind of page. The sidebar's chapters run on every page that
 *  has the sidebar (the editors don't); The editors runs in any editor module. */
export function placeFits(chapter: TourChapter, here: Place | null): boolean {
  if (!here) return false;
  switch (chapter.place) {
    case "sidebar":
      return here !== "editor" && here !== "pcb";
    case "editor":
      return here === "editor" || here === "pcb";
    default:
      return chapter.place === here;
  }
}

/** The chapter to offer on a first visit here: one that is offered, never started, not answered
 *  with Not now, and fits this screen. The editors comes before Inside the PCB editor. */
export function offerFor(rec: TourRecord | null, here: Place | null, phone: boolean): ChapterId | null {
  if (rec && !rec.offers) return null;
  for (const c of TOUR_CHAPTERS) {
    if (!c.offered || !placeFits(c, here)) continue;
    if (c.desktopOnly && phone) continue;
    if (rec?.chapters[c.id] || rec?.offered.includes(c.id)) continue;
    return c.id;
  }
  return null;
}

/** The chat's tips are on: turned on from the panel (or under way), or, untouched, during a first
 *  chat while first-visit tours are offered. Turn off tips and the last tip both end them. */
export function tipsOn(rec: TourRecord | null, chatCount: number): boolean {
  const at = rec?.chapters.chat;
  if (at) return at.state === "paused";
  if (rec && !rec.offers) return false;
  return chatCount <= 1;
}

/** The first tip not yet seen. */
export function tipFrom(rec: TourRecord | null): number {
  return rec?.chapters.chat?.state === "paused" ? rec.chapters.chat.step : 0;
}

export type Readiness = { ok: true } | { ok: false; why: string; home: boolean };

/** Whether the panel can start a chapter here and now, and if not, why. */
export function readinessOf(id: ChapterId, at: { phone: boolean; hasProject: boolean; hasChat: boolean }): Readiness {
  const c = chapterById(id);
  if (c.desktopOnly && at.phone) return { ok: false, why: "Open IDEEZA on a computer to see the editors.", home: false };
  if (c.needsProject && !at.hasProject) return { ok: false, why: "Make your first project to open this.", home: true };
  if (c.tips && !at.hasChat) return { ok: false, why: "Send your first idea from Home to see these.", home: true };
  return { ok: true };
}
