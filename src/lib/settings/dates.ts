// Every date and time the app shows, in the format chosen in Settings ›
// Language › Date & Time Formatting (Figma 22048:34355; spec §5.7): the
// browser's own ("auto", the default), one of the six Figma regions, or ISO
// (2020-03-12 18:09). A region is a real locale, so its order, separators,
// clock and calendar are that region's: Thailand counts years in the
// Buddhist era. Words a page writes itself ("Today", "now", "2h") stay as
// they are; only the date and the clock come from here.
//
// Called with no locale, a formatter reads the stored choice (the defaults
// when there is no browser storage). Components use `useDates()`
// (use-dates.ts) so they re-render when the choice changes. Relative
// imports only (node:test loads this).

import { DATE_LOCALES, readSettings, type DateLocale } from "./prefs";

/** How much of a date to show. ISO always shows the full 2020-03-12. */
export type DateStyle = "numeric" | "medium" | "long" | "day" | "weekday";

export interface DateFormatOptions {
  style?: DateStyle;
  /** Clock with seconds (History, Billing history). */
  seconds?: boolean;
  /** An IANA zone; the device's own when absent. */
  timeZone?: string;
}

const STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  numeric: { year: "numeric", month: "numeric", day: "numeric" },
  medium: { year: "numeric", month: "short", day: "numeric" },
  long: { year: "numeric", month: "long", day: "numeric" },
  day: { month: "short", day: "numeric" },
  weekday: { weekday: "short", month: "short", day: "numeric" },
};

const clock = (seconds?: boolean): Intl.DateTimeFormatOptions =>
  seconds ? { hour: "2-digit", minute: "2-digit", second: "2-digit" } : { hour: "2-digit", minute: "2-digit" };

const known = (v: unknown): DateLocale =>
  typeof v === "string" && (DATE_LOCALES as readonly string[]).includes(v) ? (v as DateLocale) : "auto";

const current = (): DateLocale => readSettings().language.dateLocale;

/** The locale Intl is given: none for the browser's own. */
const intlLocale = (pref: DateLocale): string | undefined => (pref === "auto" || pref === "iso" ? undefined : pref);

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    cache.set(key, f);
  }
  return f;
}

/** English short months: "Sep", never "Sept" (newer ICU writes Sept in en-IN, en-GB). */
const tidy = (s: string, locale: string | undefined) =>
  (locale ?? new Intl.DateTimeFormat().resolvedOptions().locale).startsWith("en") ? s.replace(/\bSept\b/g, "Sep") : s;

/** The wall-clock parts of `ts` in `timeZone`, for ISO. Throws on an unknown zone. */
function isoParts(ts: number | Date, timeZone?: string) {
  const parts = fmt("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(ts);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hm: `${get("hour")}:${get("minute")}`, s: get("second") };
}

function safe<T>(f: () => T): T | null {
  try {
    return f();
  } catch {
    return null;
  }
}

/** A date: "Mar 12, 2020" (style medium, the default), "3/12/2020", "Thu, Mar 12"… */
export function formatDate(ts: number | Date, locale?: DateLocale | string, opts: DateFormatOptions = {}): string {
  const pref = locale === undefined ? current() : known(locale);
  if (pref === "iso") return isoParts(ts, opts.timeZone).date;
  const l = intlLocale(pref);
  return tidy(fmt(l, { ...STYLES[opts.style ?? "medium"], timeZone: opts.timeZone }).format(ts), l);
}

/** A time of day: "06:09 PM", "18:09"; null for a time zone this browser can't read. */
export function formatTime(ts: number | Date, locale?: DateLocale | string, opts: DateFormatOptions = {}): string | null {
  const pref = locale === undefined ? current() : known(locale);
  return safe(() => {
    if (pref === "iso") {
      const p = isoParts(ts, opts.timeZone);
      return opts.seconds ? `${p.hm}:${p.s}` : p.hm;
    }
    return fmt(intlLocale(pref), { ...clock(opts.seconds), timeZone: opts.timeZone }).format(ts);
  });
}

/** A date and a time as the region writes them together: "3/12/2020, 06:09 PM" (style numeric by default). */
export function formatDateTime(ts: number | Date, locale?: DateLocale | string, opts: DateFormatOptions = {}): string {
  const pref = locale === undefined ? current() : known(locale);
  if (pref === "iso") {
    const p = isoParts(ts, opts.timeZone);
    return `${p.date} ${opts.seconds ? `${p.hm}:${p.s}` : p.hm}`;
  }
  const l = intlLocale(pref);
  return tidy(fmt(l, { ...STYLES[opts.style ?? "numeric"], ...clock(opts.seconds), timeZone: opts.timeZone }).format(ts), l);
}

function sameDay(a: number, b: number) {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** A row's compact "when": the time today, the day and month this year, the full date before. */
export function formatStamp(ts: number, locale: DateLocale | string | undefined, now: number): string {
  if (sameDay(ts, now)) return formatTime(ts, locale) ?? "";
  const thisYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return formatDate(ts, locale, { style: thisYear ? "day" : "medium" });
}

/** The instant every option's example shows (Figma's own: 12 March 2020, 18:09). */
export const SAMPLE_INSTANT = new Date(2020, 2, 12, 18, 9).getTime();

export interface DateFormatChoice {
  value: DateLocale;
  /** The dialog's line (Figma's words). */
  label: string;
  /** The row's value when chosen ("United States (English)"). */
  name: string;
  /** The sample instant in this format, worked out live. */
  example: () => string;
}

const choice = (value: DateLocale, label: string, name: string): DateFormatChoice => ({
  value,
  label,
  name,
  example: () => formatDateTime(SAMPLE_INSTANT, value),
});

/** The Date & Time Formatting dialog, in order: the browser, Figma's six regions, ISO. */
export const DATE_FORMATS: readonly DateFormatChoice[] = [
  choice("auto", "Your browser (automatic)", "Your browser"),
  choice("en-US", "United States", "United States (English)"),
  choice("en-IN", "India", "India (English)"),
  choice("de-AT", "Austria", "Austria (German)"),
  choice("nl-BE", "Belgium", "Belgium (Dutch)"),
  choice("th-TH", "Thailand", "Thailand (Thai)"),
  choice("es-ES", "Español", "Español (Spain)"),
  choice("iso", "ISO", "ISO"),
];

/** The choice for a stored value; an unknown one reads as the browser's. */
export function dateFormatOf(value: unknown): DateFormatChoice {
  const v = known(value);
  return DATE_FORMATS.find((f) => f.value === v) ?? DATE_FORMATS[0];
}
