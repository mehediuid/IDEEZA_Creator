// The Tour Guide's shapes (spec docs/superpowers/specs/2026-10-22-tour-guide-design.md).

export type ChapterId = "start" | "way" | "account";

/** One popup. `target` is a `data-tour` id on a real control; several ids spotlight them together. */
export type TourStep = {
  target: string | string[];
  title: string;
  body: string;
};

export type TourChapter = {
  id: ChapterId;
  name: string;
  /** Where it happens, as the Tour Guide panel lists it. */
  where: string;
  /** The page the chapter runs on; a start from elsewhere goes there first. None: any page with the sidebar. */
  route?: string;
  steps: TourStep[];
  /** Below `md` the sidebar is a drawer behind the menu button, so its steps are told there instead. */
  phoneSteps?: TourStep[];
};

export type ChapterState = "done" | "skipped" | "paused";

export type TourRecord = {
  v: 1;
  welcome: "unseen" | "started" | "declined";
  chapters: Partial<Record<ChapterId, { state: ChapterState; step: number }>>;
};
