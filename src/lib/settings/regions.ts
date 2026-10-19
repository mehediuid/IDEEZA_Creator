// Settings › Language & region › Date and time format: the regions a format
// can follow, all built at runtime from the browser's own Intl data (no list
// of countries is kept here), and what each region's dates look like in
// English, the app's language.
//
// A stored choice is "auto", "iso" or a region code ("BD"). Older records
// held a locale ("de-AT", "th-TH"); it reads as its region.
//
// A region with its own English in the browser (en-GB, en-IN, en-DE…) uses
// it. One without (Bangladesh, Thailand, Japan…) borrows the English that
// writes the date in the same order with the same clock: day first and 12-hour
// is India's English, day first and 24-hour Britain's, year first Sweden's.
// Dates are Gregorian, as English writes them.
//
// Automatic: a browser language naming a region wins ("bn-BD", "en-GB"; "bn"
// alone is Bangladesh), except the browser's default "en-US"; otherwise the
// time zone's region. Pure, relative imports only (node:test loads this).

export type HourCycle = "h12" | "h23";
export interface EnglishFormat {
  locale: string;
  hourCycle?: HourCycle;
}

type LocaleWithZones = Intl.Locale & { getTimeZones?: () => string[] | undefined; timeZones?: string[] };

function zonesOf(loc: Intl.Locale): string[] {
  const l = loc as LocaleWithZones;
  try {
    return (typeof l.getTimeZones === "function" ? l.getTimeZones() : l.timeZones) ?? [];
  } catch {
    return [];
  }
}

/** The zone as this browser spells it (Asia/Calcutta or Asia/Kolkata), or null. */
function canonicalZone(zone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

let names: Intl.DisplayNames | null | undefined;
function displayNames(): Intl.DisplayNames | null {
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });
    } catch {
      names = null;
    }
  }
  return names;
}

let regionCache: { codes: string[]; byZone: Map<string, string> } | null = null;

/** Every two-letter code the browser names, folded onto its current code
 *  (UK → GB), kept when it has time zones (a real place, not "EU" or "UN"). */
function regions() {
  if (regionCache) return regionCache;
  const dn = displayNames();
  const codes: string[] = [];
  const byZone = new Map<string, string>();
  if (dn) {
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        if (!dn.of(code)) continue;
        let loc: Intl.Locale;
        try {
          loc = new Intl.Locale(`und-${code}`);
        } catch {
          continue;
        }
        const region = loc.region;
        if (!region || codes.includes(region)) continue;
        const zones = zonesOf(loc);
        if (!zones.length) continue;
        codes.push(region);
        for (const z of zones) {
          const c = canonicalZone(z);
          if (c && !byZone.has(c)) byZone.set(c, region);
        }
      }
    }
  }
  codes.sort((x, y) => regionName(x).localeCompare(regionName(y), "en"));
  regionCache = { codes, byZone };
  return regionCache;
}

/** Every region, A to Z by its English name. */
export function regionCodes(): string[] {
  return regions().codes;
}

/** "Bangladesh"; the code itself when the browser has no name for it. */
export function regionName(code: string): string {
  return displayNames()?.of(code) ?? code;
}

const isRegion = (v: string) => /^[A-Z]{2}$/.test(v) && regionCodes().includes(v);

/** The region a time zone belongs to; null for UTC and zones no region claims. */
export function regionOfZone(zone: string | null | undefined): string | null {
  if (!zone) return null;
  const c = canonicalZone(zone);
  return c ? (regions().byZone.get(c) ?? null) : null;
}

/** A browser language's region: its own ("en-GB"), else the one its language is most at home in ("bn" → BD). */
function regionOfLanguage(tag: string): string | null {
  try {
    const r = new Intl.Locale(tag).maximize().region;
    return r && isRegion(r) ? r : null;
  } catch {
    return null;
  }
}

/** The region Automatic follows. */
export function autoRegion(zone: string | null | undefined, languages: readonly string[]): string | null {
  const first = languages[0];
  const fromLanguage = first ? regionOfLanguage(first) : null;
  if (fromLanguage && first.toLowerCase() !== "en-us") return fromLanguage;
  return regionOfZone(zone) ?? fromLanguage;
}

/** Any stored value → "auto", "iso" or a region code. */
export function dateChoiceFrom(v: unknown): string {
  if (v === "auto" || v === "iso") return v;
  if (typeof v !== "string") return "auto";
  if (isRegion(v)) return v;
  const m = /^[a-z]{2,3}-([A-Z]{2})$/.exec(v);
  return m && isRegion(m[1]) ? m[1] : "auto";
}

/** The browser has this locale's own data (not only its language's). */
function hasOwnData(locale: string): boolean {
  try {
    return new Intl.DateTimeFormat(locale).resolvedOptions().locale === locale;
  } catch {
    return false;
  }
}

const SAMPLE = Date.UTC(2020, 2, 12, 12);

/** The order of day, month and year and the clock of a region's own main language. */
function conventionsOf(region: string): { order: "dmy" | "mdy" | "ymd"; h12: boolean } {
  try {
    const main = new Intl.Locale(`und-${region}`).maximize();
    const f = new Intl.DateTimeFormat(`${main.language}-${region}`, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      numberingSystem: "latn",
      timeZone: "UTC",
    });
    const first = f.formatToParts(SAMPLE).find((p) => p.type === "day" || p.type === "month" || p.type === "year")?.type;
    const cycle = f.resolvedOptions().hourCycle;
    return { order: first === "year" ? "ymd" : first === "month" ? "mdy" : "dmy", h12: cycle === "h11" || cycle === "h12" };
  } catch {
    return { order: "mdy", h12: true };
  }
}

const englishCache = new Map<string, EnglishFormat>();

/** How a region's dates are written in English. */
export function englishFormatFor(region: string): EnglishFormat {
  const hit = englishCache.get(region);
  if (hit) return hit;
  let out: EnglishFormat;
  const own = `en-${region}`;
  if (hasOwnData(own)) out = { locale: own };
  else {
    const { order, h12 } = conventionsOf(region);
    if (order === "ymd") out = h12 ? { locale: "en-SE", hourCycle: "h12" } : { locale: "en-SE" };
    else if (order === "mdy") out = h12 ? { locale: "en-US" } : { locale: "en-US", hourCycle: "h23" };
    else out = { locale: h12 ? "en-IN" : "en-GB" };
  }
  englishCache.set(region, out);
  return out;
}
