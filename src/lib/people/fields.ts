// Your profile's own words (spec 2026-10-14-creator-profile-design.md): the
// name in any script, the name in English letters, a one-line headline, up to
// three pinned projects, and since when you have been building here. Stored
// in localStorage `ideeza:profile`, normalized on every read; the photo lives
// in IndexedDB (photo-store.ts). Pure, relative imports only.

export const PROFILE_KEY = "ideeza:profile";

export const NAME_MAX = 60;
export const HEADLINE_MAX = 60;
export const PINS_MAX = 3;

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
};

export const EMPTY_PROFILE: ProfileFields = { v: 1, name: "", latinName: "", headline: "", pins: [], since: null };

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
  };
}

/** Pins or unpins a project. A fourth pin is refused, and the fields come back unchanged. */
export function pinToggled(f: ProfileFields, projectId: string): { fields: ProfileFields; refused: boolean } {
  if (f.pins.includes(projectId)) return { fields: { ...f, pins: f.pins.filter((id) => id !== projectId) }, refused: false };
  if (f.pins.length >= PINS_MAX) return { fields: f, refused: true };
  return { fields: { ...f, pins: [...f.pins, projectId] }, refused: false };
}
