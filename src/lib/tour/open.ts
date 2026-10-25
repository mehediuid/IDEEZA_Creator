// Opens the Tour Guide from anywhere — Support › Tour Guide, ⌘K — over a window event, the way
// Report a problem opens (lib/support/open-report.ts). TourHost listens.

import type { ChapterId } from "./types";

export const TOUR_EVENT = "ideeza:tour";

export type TourRequest =
  /** The Tour Guide panel; beside `anchor` when it is the sidebar's link, a dialog otherwise. */
  | { kind: "panel"; anchor: HTMLElement | null }
  | { kind: "start"; id: ChapterId; step?: number };

function ask(request: TourRequest): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<TourRequest>(TOUR_EVENT, { detail: request }));
}

export function openTourGuide(anchor: HTMLElement | null = null): void {
  ask({ kind: "panel", anchor });
}

export function startTourChapter(id: ChapterId, step = 0): void {
  ask({ kind: "start", id, step });
}

/** A Tutorials page, opened in a new tab so the editor stays as it is (an editor's Help). */
export function openTutorialTab(path: string): void {
  if (typeof window !== "undefined") window.open(path, "_blank", "noopener");
}
