// Every date and time the app shows, in the format and the time zone chosen in
// Settings › Language & region.
//
// Format (`language.dateLocale`): a region's conventions written in English
// (regions.ts), Automatic (your region; the default), or ISO
// (2020-03-12 18:09). Words a page writes itself ("Today", "now", "2h") stay
// as they are; only the date and the clock come from here.
//
// Time zone: the one you chose in Settings (your profile's `timeZone`, while
// you chose it by hand), else the device's own. `timeZone: DEVICE_ZONE` asks
// for the device's own on purpose: a day the caller worked out on the
// device's calendar is labelled on that calendar.
//
// Called with no locale, a formatter reads the stored choice (the defaults
// when there is no browser storage). Components use `useDates()`
// (use-dates.ts) so they re-render when a choice changes. Relative imports
// only (node:test loads this).

import { readSettings, type DateLocale } from "./prefs";
import { autoRegion, dateChoiceFrom, englishFormatFor, regionCodes, regionName, type EnglishFormat } from "./regions";
import { browserLanguages } from "./voice";
import { PROFILE_KEY, normalizeProfile } from "../people/fields";
import { DEVICE_ZONE, appZoneOf, deviceZone } from "../people/time-zones";

/** How much of a date to show. ISO always shows the full 2020-03-12. */
export type DateStyle = "numeric" | "medium" | "long" | "day" | "weekday";

export interface DateFormatOptions {
  style?: DateStyle;
  /** Clock with seconds (History, Billing history). */
  seconds?: boolean;
  /** An IANA zone, or DEVICE_ZONE for the device's own; the app's zone when absent. */
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

// ─────────────────────────────── time zone ───────────────────────────────

let zoneCache: { raw: string | null; zone: string | null } | null = null;

/** The zone you chose in Settings, from the stored profile; null while it follows the device. */
function storedAppZone(): string | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
  if (zoneCache && zoneCache.raw === raw) return zoneCache.zone;
  let zone: string | null = null;
  try {
    zone = appZoneOf(normalizeProfile(raw ? JSON.parse(raw) : null));
  } catch {
    zone = null;
  }
  zoneCache = { raw, zone };
  return zone;
}

/** The zone Intl is given: undefined is the device's own. */
function zoneFor(opt: string | undefined): string | undefined {
  if (opt === DEVICE_ZONE) return undefined;
  return opt ?? storedAppZone() ?? undefined;
}

// ──────────────────────────────── format ─────────────────────────────────

/** The region Automatic follows right now: the app's zone (else the device's) and the browser's languages. */
export function currentAutoRegion(): string | null {
  return autoRegion(storedAppZone() ?? deviceZone(), browserLanguages());
}

type Resolved = { iso: true } | { iso: false; english: EnglishFormat | null };

/** A choice → ISO, or the English that writes it (null: the browser's own). */
function resolve(pref: DateLocale | string | undefined): Resolved {
  const choice = dateChoiceFrom(pref === undefined ? readSettings().language.dateLocale : pref);
  if (choice === "iso") return { iso: true };
  const region = choice === "auto" ? currentAutoRegion() : choice;
  return { iso: false, english: region ? englishFormatFor(region) : null };
}

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(english: EnglishFormat | null, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const o: Intl.DateTimeFormatOptions = english?.hourCycle && options.hour ? { ...options, hourCycle: english.hourCycle } : options;
  const key = `${english?.locale ?? ""}|${JSON.stringify(o)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(english?.locale, o);
    cache.set(key, f);
  }
  return f;
}

/** English short months: "Sep", never "Sept" (newer ICU writes Sept in en-IN, en-GB). */
const tidy = (s: string, english: EnglishFormat | null) =>
  (english?.locale ?? new Intl.DateTimeFormat().resolvedOptions().locale).startsWith("en") ? s.replace(/\bSept\b/g, "Sep") : s;

/** The wall-clock parts of `ts` in `timeZone`, for ISO and for calendar days. Throws on an unknown zone. */
function isoParts(ts: number | Date, timeZone?: string) {
  const parts = fmt({ locale: "en-US" }, {
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
  return { date: `${get("year")}-${get("month")}-${get("day")}`, year: get("year"), hm: `${get("hour")}:${get("minute")}`, s: get("second") };
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
  const r = resolve(locale);
  const timeZone = zoneFor(opts.timeZone);
  if (r.iso) return isoParts(ts, timeZone).date;
  return tidy(fmt(r.english, { ...STYLES[opts.style ?? "medium"], timeZone }).format(ts), r.english);
}

/** A time of day: "06:09 PM", "18:09"; null for a time zone this browser can't read. */
export function formatTime(ts: number | Date, locale?: DateLocale | string, opts: DateFormatOptions = {}): string | null {
  const r = resolve(locale);
  const timeZone = zoneFor(opts.timeZone);
  return safe(() => {
    if (r.iso) {
      const p = isoParts(ts, timeZone);
      return opts.seconds ? `${p.hm}:${p.s}` : p.hm;
    }
    return fmt(r.english, { ...clock(opts.seconds), timeZone }).format(ts);
  });
}

/** A date and a time as the region writes them together: "3/12/2020, 06:09 PM" (style numeric by default). */
export function formatDateTime(ts: number | Date, locale?: DateLocale | string, opts: DateFormatOptions = {}): string {
  const r = resolve(locale);
  const timeZone = zoneFor(opts.timeZone);
  if (r.iso) {
    const p = isoParts(ts, timeZone);
    return `${p.date} ${opts.seconds ? `${p.hm}:${p.s}` : p.hm}`;
  }
  return tidy(fmt(r.english, { ...STYLES[opts.style ?? "numeric"], ...clock(opts.seconds), timeZone }).format(ts), r.english);
}

/** A row's compact "when": the time today, the day and month this year, the full date before (days in the app's zone). */
export function formatStamp(
  ts: number,
  locale: DateLocale | string | undefined,
  now: number,
  opts: Pick<DateFormatOptions, "timeZone"> = {},
): string {
  const timeZone = zoneFor(opts.timeZone);
  const day = safe(() => isoParts(ts, timeZone));
  const today = safe(() => isoParts(now, timeZone));
  const zoned = { timeZone: opts.timeZone };
  if (day && today && day.date === today.date) return formatTime(ts, locale, zoned) ?? "";
  return formatDate(ts, locale, { ...zoned, style: day && today && day.year === today.year ? "day" : "medium" });
}

// ─────────────────────────── the Settings choices ───────────────────────────

/** The instant every option's example shows (12 March 2020, 18:09). */
export const SAMPLE_INSTANT = new Date(2020, 2, 12, 18, 9).getTime();

const example = (choice: string) => formatDateTime(SAMPLE_INSTANT, choice, { timeZone: DEVICE_ZONE });

/** The row's value for a stored choice; `auto` is the region Automatic found. */
export function dateFormatName(value: unknown, auto: string | null): string {
  const choice = dateChoiceFrom(value);
  if (choice === "iso") return "ISO (2020-03-12)";
  if (choice === "auto") return `Automatic (${auto ? regionName(auto) : "your browser"})`;
  return regionName(choice);
}

export interface DateFormatOption {
  value: string;
  label: string;
  /** The sample instant in this format, worked out live. */
  sub: string;
}

/** Automatic first (with the format it found), every region A to Z, ISO last. */
export function dateFormatChoices(auto: string | null): DateFormatOption[] {
  return [
    { value: "auto", label: dateFormatName("auto", auto), sub: example(auto ?? "auto") },
    ...regionCodes().map((code) => ({ value: code, label: regionName(code), sub: example(code) })),
    { value: "iso", label: "ISO", sub: example("iso") },
  ];
}
