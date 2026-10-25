// The Tour Guide's shapes (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md).

export type ChapterId = "tour" | "start" | "way" | "account" | "chat" | "project" | "editors" | "modules" | "pcb" | "earn" | "share";

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
  | "earn-plan"
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
  /** Left out on a phone, where what it points at lives in the closed menu drawer. */
  desktopOnly?: boolean;
};

export type TourChapter = {
  id: ChapterId;
  name: string;
  /** The Tour Guide panel's heading the chapter sits under. */
  group: "Start" | "Build" | "Earn & share" | "Look around";
  /** Where it happens, as the Tour Guide panel lists it. */
  where: string;
  place: Place;
  /** Tips show one at a time as each control first appears (the AI fills a chat over minutes),
   *  instead of a run of Next: in order (the chat's), or in any order, each the first time its
   *  page opens (the editor modules'). */
  tips?: "in-order" | "any-order";
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

/** The first-product guide (`lib/tour/guide.ts`): never started; on screen as its card or folded
 *  into a pill; closed with ✕ (the panel brings it back); or finished. */
export type GuideState = "off" | "open" | "small" | "closed" | "done";

export type TourRecord = {
  v: 1;
  /** "later": closed once; it comes back once, on a later visit, before it counts as declined. */
  welcome: "unseen" | "started" | "later" | "declined";
  /** `seen`: the tips of an any-order chapter already shown. */
  chapters: Partial<Record<ChapterId, { state: ChapterState; step: number; seen?: number[] }>>;
  /** The Tour Guide panel's "Offer a tour the first time I open a page". */
  offers: boolean;
  /** Chapters whose first-visit offer was answered Not now twice: never offered again. */
  offered: ChapterId[];
  /** Chapters answered Not now once: offered once more, on a later visit. */
  snoozed: ChapterId[];
  /** Where the tours live (Support › Tour Guide) has been pointed out once. */
  pointed: boolean;
  /** The card for someone who arrived from a shared link has been shown. */
  arrival: boolean;
  guide: GuideState;
};

/** What the tour knows of the user's own work, for the next step on their path. */
export type JourneyFacts = { hasChat: boolean; hasProject: boolean; minted: boolean; phone: boolean };

/** The next real step on the path: a chapter, or an action the user takes themselves. */
export type UpNext =
  | { kind: "chapter"; id: ChapterId; label: string }
  | { kind: "write" | "chat" | "mint"; label: string };
