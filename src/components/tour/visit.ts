// What the Tour Guide remembers for this visit only (`sessionStorage`, so a new tab or window is a
// later visit): the Welcome closed, offers answered Not now, parts paused, resume cards answered.
// A "later visit" is what lets a closed Welcome or a Not now come back once.

import type { ChapterId } from "@/lib/tour/types";

const KEY = "ideeza:tour:visit";

type Visit = { welcomeLater: boolean; declined: ChapterId[]; paused: ChapterId[]; resumed: ChapterId[] };

const empty = (): Visit => ({ welcomeLater: false, declined: [], paused: [], resumed: [] });

export function readVisit(): Visit {
  try {
    const raw = typeof window === "undefined" ? null : window.sessionStorage.getItem(KEY);
    if (!raw) return empty();
    const v = JSON.parse(raw) as Partial<Visit>;
    return {
      welcomeLater: v.welcomeLater === true,
      declined: Array.isArray(v.declined) ? v.declined : [],
      paused: Array.isArray(v.paused) ? v.paused : [],
      resumed: Array.isArray(v.resumed) ? v.resumed : [],
    };
  } catch {
    return empty();
  }
}

export function noteVisit(change: (v: Visit) => Visit): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(change(readVisit())));
  } catch {
    // Private windows can refuse storage: the visit simply isn't remembered.
  }
}

export const withId = (list: ChapterId[], id: ChapterId) => (list.includes(id) ? list : [...list, id]);
