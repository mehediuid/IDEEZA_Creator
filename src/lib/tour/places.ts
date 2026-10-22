// Where the Tour Guide is: which kind of page an address is, which chapter that page offers on a
// first visit (spec D2), whether the chat's tips are on, and why a chapter can't start yet.

import { parseEditorPath } from "../manual/editor-scope";
import { TOUR_CHAPTERS, chapterById } from "./chapters";
import type { ChapterId, Place, TourChapter, TourRecord } from "./types";

// The editors that also live at the app's root, outside a project (`/pcb`, `/code`, …).
const ROOT_EDITORS: Record<string, Place> = { pcb: "pcb", code: "editor", "3d": "editor", preview: "editor", wiring: "editor" };

/** The kind of page an address is; `null` for one no chapter runs on (the mint flow). */
export function placeOf(pathname: string): Place | null {
  if (pathname === "/") return "home";
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "chat" && parts[1]) return "chat";
  if (parts[0] === "projects" && parts.length === 2) return "project";
  if (parts[0] === "project") {
    const editor = parseEditorPath(pathname);
    if (!editor) return null;
    return editor.step === "pcb" ? "pcb" : "editor";
  }
  if (parts.length === 1 && ROOT_EDITORS[parts[0]]) return ROOT_EDITORS[parts[0]];
  if (parts[0] === "brief") return null;
  return "sidebar";
}

/** Whether a chapter can run on this kind of page. The sidebar's chapters run on every page that
 *  has the sidebar (the editors don't); The editors runs in any editor module. */
export function placeFits(chapter: TourChapter, here: Place | null): boolean {
  if (!here) return false;
  switch (chapter.place) {
    case "sidebar":
      return here === "home" || here === "sidebar" || here === "chat" || here === "project";
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
