// The Tour Guide's shapes (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md).

export type ChapterId = "start" | "way" | "account" | "chat" | "project" | "editors" | "pcb" | "earn" | "share";

/** Where a chapter happens: Home, any page with the sidebar, a concept chat, a project's own page,
 *  any editor module, the PCB editor itself, a project's Earn area, or the Innovations feed. */
export type Place = "home" | "sidebar" | "chat" | "project" | "editor" | "pcb" | "earn" | "feed";

/** A page a step shows, resolved to an address when the step comes up (the project on screen, or
 *  the one changed last, and its first product). */
export type PageRef =
  | "home"
  | "projects"
  | "history"
  | "parts"
  | "marketplace"
  | "innovations"
  | "messages"
  | "blog"
  | "profile"
  | "credits"
  | "balance"
  | "tutorials"
  | "project"
  | "product"
  | "earn-overview"
  | "earn-sell"
  | "earn-money"
  | "post"
  | "editor-pcb"
  | "editor-code"
  | "editor-3d"
  | "editor-assembly"
  | "editor-preview";

/** One popup. `target` is a `data-tour` id on a real control; several ids are lit together, each in
 *  its own hole (where it lives in the menu, and the page itself). */
export type TourStep = {
  target: string | string[];
  title: string;
  body: string;
  /** The page this step is about: the tour goes there before it shows the step. */
  page?: PageRef;
  /** Which of several targets the card stands beside; the last when unset. */
  anchor?: "first" | "last";
  /** A control that opens what `target` lives in (a menu, a tab): pressed when a target isn't
   *  there as the step comes up; a menu it opened is closed again when the tour moves on. */
  reveal?: string;
};

export type TourChapter = {
  id: ChapterId;
  name: string;
  /** The Tour Guide panel's heading the chapter sits under. */
  group: "Start" | "Build" | "Earn & share";
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
  /** Every step opens its own page, so a phone walks the same ones: the menu's rows are in the
   *  drawer there, and the page alone is lit. */
  steps: TourStep[];
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
