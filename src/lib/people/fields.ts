// Your profile's own words (spec 2026-10-14-creator-profile-design.md): the
// name in any script, the name in English letters, a one-line headline, up to
// three pinned projects, and since when you have been building here. Version 2
// (Settings, spec 2026-10-19-settings-design.md §5.2–5.3) adds your handle,
// skills, top three specialities, social accounts, the languages you speak and
// whether you set your time zone by hand; a v1 record keeps every word and
// gains them empty. Stored in localStorage `ideeza:profile`, normalized on
// every read; the photo lives in IndexedDB (photo-store.ts). Pure, relative
// imports only.

import { cleanHandle, handleFormatProblem } from "./handle";

export const PROFILE_KEY = "ideeza:profile";

export const NAME_MAX = 60;
export const HEADLINE_MAX = 60;
export const PINS_MAX = 3;
export const BIO_MAX = 280;
export const LOCATION_MAX = 60;
/** Owner, 2026-10-14: two was too few; a website plus the usual places. */
export const LINKS_MAX = 5;
const LINK_MAX = 120;

/** What you are open to, said on your profile (owner picked direction A, 2026-10-14). */
export type OpenTo = "" | "questions" | "collaboration" | "both";
export const OPEN_TO_WORDS: Record<Exclude<OpenTo, "">, string> = {
  questions: "Open to questions",
  collaboration: "Open to collaboration",
  both: "Open to collaboration and questions",
};

export const SKILLS_MAX = 16;
const SKILL_MAX = 40;
export const SPECIALITIES_MAX = 3;
export const LANGUAGES_MAX = 12;
const LANGUAGE_MAX = 40;

/** How long you have practised a speciality (Figma: 0-1 · 1-2 · 3-5 · 5+ Years). */
export type Years = "0-1" | "1-2" | "3-5" | "5+";
export const YEARS: readonly Years[] = ["0-1", "1-2", "3-5", "5+"];
export const YEARS_WORDS: Record<Years, string> = { "0-1": "0-1 Years", "1-2": "1-2 Years", "3-5": "3-5 Years", "5+": "5+ Years" };

/** One of your top skills and how long you have practised it. */
export type Speciality = { skill: string; years: Years };

export type SocialNetwork = "facebook" | "x" | "instagram" | "linkedin";
export const SOCIAL_NETWORKS: readonly SocialNetwork[] = ["facebook", "x", "instagram", "linkedin"];
export const SOCIAL_WORDS: Record<SocialNetwork, string> = { facebook: "Facebook", x: "X", instagram: "Instagram", linkedin: "LinkedIn" };
/** A profile URL on each network; "" when you haven't connected one. */
export type Social = Record<SocialNetwork, string>;

export type ProfileFields = {
  v: 2;
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
  /** Up to LINKS_MAX web addresses, each with its scheme. */
  links: string[];
  openTo: OpenTo;
  /** `/creators/<handle>`; "" until you choose one (your profile is then `/creators/me`). */
  handle: string;
  /** Up to SKILLS_MAX, in your order. */
  skills: string[];
  /** Up to three of your skills, each with its years. */
  specialities: Speciality[];
  social: Social;
  /** The languages you speak. */
  languages: string[];
  /** You chose `timeZone` in Settings, so Edit profile no longer sets it from the device. */
  timeZoneManual: boolean;
};

const NO_SOCIAL: Social = { facebook: "", x: "", instagram: "", linkedin: "" };

export const EMPTY_PROFILE: ProfileFields = {
  v: 2,
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
  handle: "",
  skills: [],
  specialities: [],
  social: NO_SOCIAL,
  languages: [],
  timeZoneManual: false,
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

const SOCIAL_HOSTS: Record<SocialNetwork, readonly string[]> = {
  facebook: ["facebook.com", "fb.com"],
  x: ["x.com", "twitter.com"],
  instagram: ["instagram.com"],
  linkedin: ["linkedin.com"],
};

const SOCIAL_HOME: Record<SocialNetwork, string> = {
  facebook: "https://facebook.com/",
  x: "https://x.com/",
  instagram: "https://instagram.com/",
  linkedin: "https://www.linkedin.com/in/",
};

/** A social account as its profile URL: a URL on that network, or a username ("@ideeza") made
 *  into one. "" for nothing typed; null when it is neither. */
export function socialUrlOf(network: SocialNetwork, raw: string): string | null {
  const text = raw.trim().slice(0, LINK_MAX);
  if (!text) return "";
  if (/^[@]?[A-Za-z0-9._-]{1,50}$/.test(text) && !/\.(com|net|org)$/i.test(text.replace(/^@/, ""))) {
    return `${SOCIAL_HOME[network]}${text.replace(/^@/, "")}`;
  }
  const url = linkOf(text);
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
    if (!SOCIAL_HOSTS[network].includes(host)) return null;
    if (u.pathname.replace(/\/+/g, "") === "") return null;
    u.protocol = "https:";
    return u.toString();
  } catch {
    return null;
  }
}

/** "ideeza" from "https://www.linkedin.com/in/ideeza/": the account's name, as Figma shows it. */
export function socialNameOf(network: SocialNetwork, url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const name = network === "linkedin" && parts[0] === "in" && parts[1] ? parts[1] : parts[0];
    return name ? decodeURIComponent(name) : url;
  } catch {
    return url;
  }
}

/** Trimmed, inner spaces collapsed, unique ignoring case, at most `max` of at most `len` characters. */
function cleanList(v: unknown, max: number, len: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    if (typeof item !== "string") continue;
    const word = item.replace(/\s+/g, " ").trim().slice(0, len).trim();
    if (!word || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    out.push(word);
    if (out.length >= max) break;
  }
  return out;
}

export const cleanSkills = (v: unknown): string[] => cleanList(v, SKILLS_MAX, SKILL_MAX);
export const cleanLanguages = (v: unknown): string[] => cleanList(v, LANGUAGES_MAX, LANGUAGE_MAX);

const YEAR_SET = new Set<string>(YEARS);

/** Up to three of `skills` (spelled as there), each once, with its years ("0-1" when unreadable). */
function cleanSpecialities(v: unknown, skills: readonly string[]): Speciality[] {
  if (!Array.isArray(v)) return [];
  const out: Speciality[] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.skill !== "string") continue;
    const skill = skills.find((s) => s.toLowerCase() === (r.skill as string).trim().toLowerCase());
    if (!skill || out.some((x) => x.skill === skill)) continue;
    out.push({ skill, years: typeof r.years === "string" && YEAR_SET.has(r.years) ? (r.years as Years) : "0-1" });
    if (out.length >= SPECIALITIES_MAX) break;
  }
  return out;
}

function cleanSocial(v: unknown): Social {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return NO_SOCIAL;
  const r = v as Record<string, unknown>;
  const out = { ...NO_SOCIAL };
  for (const n of SOCIAL_NETWORKS) out[n] = typeof r[n] === "string" ? (socialUrlOf(n, r[n] as string) ?? "") : "";
  return out;
}

function handleOf(v: unknown): string {
  if (typeof v !== "string") return "";
  const h = cleanHandle(v);
  return handleFormatProblem(h) === null ? h : "";
}

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max).trim() : "");

export function normalizeProfile(raw: unknown): ProfileFields {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return EMPTY_PROFILE;
  const r = raw as Record<string, unknown>;
  const pins: string[] = [];
  const skills = cleanSkills(r.skills);
  const timeZone = zoneOf(r.timeZone);
  if (Array.isArray(r.pins)) {
    for (const id of r.pins) {
      if (typeof id === "string" && id && !pins.includes(id) && pins.length < PINS_MAX) pins.push(id);
    }
  }
  return {
    v: 2,
    name: text(r.name, NAME_MAX),
    latinName: text(r.latinName, NAME_MAX),
    headline: text(r.headline, HEADLINE_MAX),
    pins,
    since: typeof r.since === "number" && Number.isFinite(r.since) ? r.since : null,
    bio: typeof r.bio === "string" ? r.bio.trim().slice(0, BIO_MAX) : "",
    location: text(r.location, LOCATION_MAX),
    timeZone,
    links: Array.isArray(r.links)
      ? r.links.flatMap((l) => (typeof l === "string" ? [linkOf(l)] : [])).filter((l): l is string => l !== null).slice(0, LINKS_MAX)
      : [],
    openTo: typeof r.openTo === "string" && OPEN_TO.has(r.openTo) ? (r.openTo as OpenTo) : "",
    handle: handleOf(r.handle),
    skills,
    specialities: cleanSpecialities(r.specialities, skills),
    social: cleanSocial(r.social),
    languages: cleanLanguages(r.languages),
    timeZoneManual: timeZone !== null && r.timeZoneManual === true,
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
