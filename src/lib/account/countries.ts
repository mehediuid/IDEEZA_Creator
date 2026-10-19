// The countries an address can be in (Settings › Personal Information, spec
// 2026-10-19-settings-design.md §5.3): every current ISO 3166 two-letter
// region code this runtime can name in English, worked out from `Intl` at
// load rather than typed in. A retired code ("YU", "BU") is left out, since
// `Intl` names it after the country that replaced it, and so are the codes
// for groupings and test regions. Pure, no imports.

/** Region codes `Intl` names that are not a place you live (unions, groupings, test regions). */
const NOT_COUNTRIES = new Set(["EU", "EZ", "UN", "ZZ", "QO", "XA", "XB"]);

function regionNames(): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
}

function isCurrent(code: string): boolean {
  try {
    return Intl.getCanonicalLocales(`und-${code}`)[0] === `und-${code}`;
  } catch {
    return false;
  }
}

function buildCountries(): { code: string; name: string }[] {
  const names = regionNames();
  if (!names) return [];
  const out: { code: string; name: string }[] = [];
  for (let a = 65; a <= 90; a += 1) {
    for (let b = 65; b <= 90; b += 1) {
      const code = String.fromCharCode(a, b);
      if (NOT_COUNTRIES.has(code)) continue;
      let name: string | undefined;
      try {
        name = names.of(code);
      } catch {
        continue;
      }
      if (!name || name === code || !isCurrent(code)) continue;
      out.push({ code, name });
    }
  }
  return out.sort((x, y) => x.name.localeCompare(y.name, "en"));
}

/** Every country, A to Z by its English name. */
export const COUNTRIES: readonly { code: string; name: string }[] = buildCountries();

export const COUNTRY_CODES: readonly string[] = COUNTRIES.map((c) => c.code);

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.name]));

/** "BD" or "bd" when it is a country; null otherwise. */
export function countryCodeOf(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return BY_CODE.has(code) ? code : null;
}

/** "Bangladesh" for "BD"; "" for anything else. */
export function countryNameOf(code: string): string {
  return BY_CODE.get(code) ?? "";
}
