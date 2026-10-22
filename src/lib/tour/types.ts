// The Tour Guide's shapes (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md).

export type ChapterId = "start" | "way" | "account" | "chat" | "project" | "editors" | "pcb";

/** Where a chapter happens: Home, any page with the sidebar, a concept chat, a project's own page,
 *  any editor module, or the PCB editor itself. */
export type Place = "home" | "sidebar" | "chat" | "project" | "editor" | "pcb";

/** One popup. `target` is a `data-tour` id on a real control; several ids spotlight them together. */
export type TourStep = {
  target: string | string[];
  title: string;
  body: string;
};

export type TourChapter = {
  id: ChapterId;
  name: string;
  /** The Tour Guide panel's heading the chapter sits under. */
  group: "Start" | "Build";
  /** Where it happens, as the Tour Guide panel lists it. */
  where: string;
  place: Place;
  /** Tips show one at a time as each control first appears (the AI fills a chat over minutes),
   *  instead of a run of Next Tip. */
  tips?: boolean;
  /** It runs on one of your projects, so it waits for the first. */
  needsProject?: boolean;
  /** The editors have no phone layout, so a phone isn't offered it. */
  desktopOnly?: boolean;
  /** Offered the first time its place is opened (spec D2). */
  offered?: boolean;
  steps: TourStep[];
  /** Below `md` the sidebar is a drawer behind the menu button, so its steps are told there instead. */
  phoneSteps?: TourStep[];
};

export type ChapterState = "done" | "skipped" | "paused";

export type TourRecord = {
  v: 1;
  welcome: "unseen" | "started" | "declined";
  chapters: Partial<Record<ChapterId, { state: ChapterState; step: number }>>;
  /** The Tour Guide panel's "Offer a tour the first time I open a page". */
  offers: boolean;
  /** Chapters whose first-visit offer was answered with Not now. */
  offered: ChapterId[];
};
