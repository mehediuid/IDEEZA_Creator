// Your profile's own words (spec 2026-10-14-creator-profile-design.md): the
// name in any script, the name in English letters, a one-line headline, up to
// three pinned projects, and since when you have been building here. Stored
// in localStorage `ideeza:profile`, normalized on every read; the photo lives
// in IndexedDB (photo-store.ts). Pure, relative imports only.

export const PROFILE_KEY = "ideeza:profile";

export const NAME_MAX = 60;
export const HEADLINE_MAX = 60;
export const PINS_MAX = 3;
export const BIO_MAX = 280;
export const LOCATION_MAX = 60;
export const LINKS_MAX = 2;
const LINK_MAX = 120;

/** What you are open to, said on your profile (owner picked direction A, 2026-10-14). */
export type OpenTo = "" | "questions" | "collaboration" | "both";
export const OPEN_TO_WORDS: Record<Exclude<OpenTo, "">, string> = {
  questions: "Open to questions",
  collaboration: "Open to collaboration",
  both: "Open to collaboration and questions",
};

export type ProfileFields = {
  v: 1;
  /** Any script; empty reads "You". */
  name: string;
  /** Optional, shown under the name and used to find you. */
  latinName: string;
  headline: string;
  /** Project ids, in the order they lead the Made list. */
  pins: string[];
  /** Set once, the first time the profile is saved. */
  since: number | null;
  /** About: a few lines, in your own words. */
  bio: string;
  /** Free text, city level at most ("Dhaka, Bangladesh"). */
  location: string;
  /** This device's IANA time zone when you saved, so others see your local time. */
  timeZone: string | null;
  /** Up to two web addresses, each with its scheme. */
  links: string[];
  openTo: OpenTo;
};

export const EMPTY_PROFILE: ProfileFields = {
  v: 1,
  name: "",
  latinName: "",
  headline: "",
  pins: [],
  since: null,
  bio: "",
  location: "",
  timeZone: null,
  links: [],
  openTo: "",
};

/** A web address someone typed, with https:// added when it has no scheme; null when it isn't one. */
export function linkOf(raw: string): string | null {
  const text = raw.trim().slice(0, LINK_MAX);
  if (!text || /\s/.test(text)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return withScheme;
  } catch {
    return null;
  }
}

function zoneOf(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: v });
    return v;
  } catch {
    return null;
  }
}

const OPEN_TO = new Set<string>(["questions", "collaboration", "both"]);

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max).trim() : "");

export function normalizeProfile(raw: unknown): ProfileFields {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return EMPTY_PROFILE;
  const r = raw as Record<string, unknown>;
  const pins: string[] = [];
  if (Array.isArray(r.pins)) {
    for (const id of r.pins) {
      if (typeof id === "string" && id && !pins.includes(id) && pins.length < PINS_MAX) pins.push(id);
    }
  }
  return {
    v: 1,
    name: text(r.name, NAME_MAX),
    latinName: text(r.latinName, NAME_MAX),
    headline: text(r.headline, HEADLINE_MAX),
    pins,
    since: typeof r.since === "number" && Number.isFinite(r.since) ? r.since : null,
    bio: typeof r.bio === "string" ? r.bio.trim().slice(0, BIO_MAX) : "",
    location: text(r.location, LOCATION_MAX),
    timeZone: zoneOf(r.timeZone),
    links: Array.isArray(r.links)
      ? r.links.flatMap((l) => (typeof l === "string" ? [linkOf(l)] : [])).filter((l): l is string => l !== null).slice(0, LINKS_MAX)
      : [],
    openTo: typeof r.openTo === "string" && OPEN_TO.has(r.openTo) ? (r.openTo as OpenTo) : "",
  };
}

/** Pins or unpins a project. A fourth pin is refused, and the fields come back unchanged.
 *  `valid` (the projects still public) drops a pin whose project was unshared or deleted, so a
 *  stale pin never holds one of the three places. */
export function pinToggled(f: ProfileFields, projectId: string, valid?: readonly string[]): { fields: ProfileFields; refused: boolean } {
  const pins = valid ? f.pins.filter((id) => valid.includes(id)) : f.pins;
  if (pins.includes(projectId)) return { fields: { ...f, pins: pins.filter((id) => id !== projectId) }, refused: false };
  if (pins.length >= PINS_MAX) return { fields: f, refused: true };
  return { fields: { ...f, pins: [...pins, projectId] }, refused: false };
}
