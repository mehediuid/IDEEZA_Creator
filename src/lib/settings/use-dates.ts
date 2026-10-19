"use client";

// The date formatters bound to the stored Date and time format and Time zone
// (Settings › Language & region), as React state: a page re-renders when
// either changes (dates.ts). The zone comes from the profile hook, so server
// render and hydration agree, and is always passed explicitly.

import * as React from "react";
import { appZoneOf, DEVICE_ZONE } from "@/lib/people/time-zones";
import { useMyProfile } from "@/lib/people/profile-store";
import {
  formatDate,
  formatDateTime,
  formatStamp,
  formatTime,
  type DateFormatOptions,
} from "./dates";
import type { DateLocale } from "./prefs";
import { useSettings } from "./use-settings";

export interface Dates {
  locale: DateLocale;
  /** The zone times are shown in; DEVICE_ZONE while it follows this device. */
  timeZone: string;
  date: (ts: number | Date, opts?: DateFormatOptions) => string;
  time: (ts: number | Date, opts?: DateFormatOptions) => string;
  dateTime: (ts: number | Date, opts?: DateFormatOptions) => string;
  stamp: (ts: number, now?: number) => string;
}

export function useDates(): Dates {
  const locale = useSettings().language.dateLocale;
  const { fields } = useMyProfile();
  const timeZone = appZoneOf(fields) ?? DEVICE_ZONE;
  return React.useMemo(() => {
    const z = (opts?: DateFormatOptions): DateFormatOptions => ({ ...opts, timeZone: opts?.timeZone ?? timeZone });
    return {
      locale,
      timeZone,
      date: (ts, opts) => formatDate(ts, locale, z(opts)),
      time: (ts, opts) => formatTime(ts, locale, z(opts)) ?? "",
      dateTime: (ts, opts) => formatDateTime(ts, locale, z(opts)),
      stamp: (ts, now = Date.now()) => formatStamp(ts, locale, now, { timeZone }),
    };
  }, [locale, timeZone]);
}
