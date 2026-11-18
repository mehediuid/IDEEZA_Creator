"use client";

// What the AI & your data pages share (Settings · 2026 update, ST-60…65):
// the running flag, the web's words said for a phone, when the last copy was
// made, and where the phone lands after an erase or a restore.

import * as React from "react";
import { toastAfterReload } from "../kit/toast";
import type { Dates } from "@/lib/settings/use-dates";

const noSubscribe = () => () => {};
/** False on the server and while hydrating: what is stored is only known in the browser. */
export const useRunning = () => React.useSyncExternalStore(noSubscribe, () => true, () => false);

/** The data lib's own lines ("Kept in this browser") as the phone says them. */
export const onPhone = (s: string) => s.replace(/\bin this browser\b/g, "on this phone").replace(/\bthis browser\b/g, "this phone");

const DAY_MS = 24 * 60 * 60 * 1000;

/** "today, 14:05", "yesterday, 09:10", else the date and time, in the chosen format and zone. */
export function savedWhen(at: number, now: number, dates: Dates): string {
  const day = dates.date(at);
  if (day === dates.date(now)) return `today, ${dates.time(at)}`;
  if (day === dates.date(now - DAY_MS)) return `yesterday, ${dates.time(at)}`;
  return dates.dateTime(at, { style: "medium" });
}

/** After an erase or a restore (lib/data/browser-data.ts), which reload to the web's
 *  /settings/data: go to `path` on the phone instead, and say `message` there. The later
 *  navigation replaces the lib's, which hasn't left yet. The lib's guard clears every
 *  `ideeza:` key as the page goes, the toast's too, so it is set again after that. */
export function landOnPhone(path: string, message: string): void {
  toastAfterReload(message);
  window.addEventListener("pagehide", () => toastAfterReload(message));
  window.location.replace(path);
}
