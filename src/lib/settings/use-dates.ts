"use client";

// The date formatters bound to the stored Date & Time Formatting choice, as
// React state: a page re-renders when the choice changes (dates.ts).

import * as React from "react";
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
  date: (ts: number | Date, opts?: DateFormatOptions) => string;
  time: (ts: number | Date, opts?: DateFormatOptions) => string;
  dateTime: (ts: number | Date, opts?: DateFormatOptions) => string;
  stamp: (ts: number, now?: number) => string;
}

export function useDates(): Dates {
  const locale = useSettings().language.dateLocale;
  return React.useMemo(
    () => ({
      locale,
      date: (ts, opts) => formatDate(ts, locale, opts),
      time: (ts, opts) => formatTime(ts, locale, opts) ?? "",
      dateTime: (ts, opts) => formatDateTime(ts, locale, opts),
      stamp: (ts, now = Date.now()) => formatStamp(ts, locale, now),
    }),
    [locale],
  );
}
