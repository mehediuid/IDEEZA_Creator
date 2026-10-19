// Who is who on a creator profile (spec 2026-10-14-creator-profile-design.md).
// One person id everywhere, the Messages scheme: "me" for this browser's
// creator, "feed:<id>" for the Innovations creators and commenters, and
// "buyer-<name>" for the demo creators who buy. Innovations stores "you" and
// bare "c3" ids; they are mapped here on read and never rewritten in storage.
// Names an owner typed into a project team belong to nobody yet, so they have
// no profile. Every person but you is a demo person until there are accounts.
// Your address is `/creators/<your handle>` once you choose one in Settings ›
// Profile; `/creators/me` stays an alias that always opens you.
//
// Relative imports only (node:test loads the compiled module).

import { CREATORS } from "../feed";
import { SAMPLE_PEOPLE_IDS, personOf as innovationsPersonOf } from "../innovations/people";
import { slugify } from "../innovations/slug";
import { DEMO_BUYERS } from "../wallet/identities";
import { cleanHandle, handleFormatProblem } from "./handle";

export type PersonId = string;

/** This browser's creator. */
export const ME: PersonId = "me";

export type PersonKind = "me" | "feed" | "demo";

export type Person = {
  id: PersonId;
  kind: PersonKind;
  /** The address: `/creators/<handle>`. */
  handle: string;
  name: string;
  /** The name in English letters, when it differs from `name`. */
  latinName: string | null;
  initials: string;
  /** Avatar fill, a DS colour token; null takes the avatar's own brand-subtle fill. */
  color: string | null;
};

const FEED_PREFIX = "feed:";

export function canonicalId(raw: string, from: "innovations" | "messages"): PersonId {
  if (from === "messages") return raw;
  if (raw === "you") return ME;
  return `${FEED_PREFIX}${raw}`;
}

const segmenter: Intl.Segmenter | null =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

function firstLetter(word: string): string {
  if (!segmenter) return Array.from(word)[0] ?? "";
  for (const s of segmenter.segment(word)) return s.segment;
  return "";
}

/** Two letters for an avatar: from the English-letters name when there is one, else the first
 *  whole letter (grapheme) of the first and last word, so a Bengali letter is never split. */
export function initialsOf(name: string, latinName?: string | null): string {
  const source = latinName?.trim() ? latinName : name;
  const words = source.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const first = firstLetter(words[0]);
  const last = words.length > 1 ? firstLetter(words[words.length - 1]) : "";
  return (first + last).toUpperCase();
}

/** The name people see; "You" until you give one. */
export function displayNameOf(name: string): string {
  return name.trim() || "You";
}

/** The feed creators, the sample commenters and the demo creators, each with a handle unique
 *  among them and never "me". The same in every browser. */
function sampleDirectory(): Person[] {
  const people: Person[] = [];
  const taken = new Set<string>([ME]);
  const handleFor = (n: string): string => {
    const base = slugify(n) || "creator";
    let handle = base;
    for (let i = 2; taken.has(handle); i++) handle = `${base}-${i}`;
    taken.add(handle);
    return handle;
  };
  for (const id of SAMPLE_PEOPLE_IDS) {
    const p = innovationsPersonOf(id);
    const creator = CREATORS.find((c) => c.id === id);
    people.push({
      id: canonicalId(id, "innovations"),
      kind: "feed",
      handle: handleFor(p.name),
      name: p.name,
      latinName: null,
      initials: creator?.initials ?? p.initials,
      color: p.color,
    });
  }
  for (const b of DEMO_BUYERS) {
    people.push({ id: b.id, kind: "demo", handle: handleFor(b.name), name: b.name, latinName: null, initials: b.initials, color: null });
  }
  return people;
}

const SAMPLE_DIRECTORY: readonly Person[] = sampleDirectory();

/** Every handle a sample person holds; none of them can be yours. */
export const SAMPLE_HANDLES: readonly string[] = SAMPLE_DIRECTORY.map((p) => p.handle);

/** Why `raw` can't be your handle (its form, or a sample creator has it); null when it can. */
export function handleProblem(raw: string): string | null {
  const handle = cleanHandle(raw);
  const form = handleFormatProblem(handle);
  if (form) return form;
  if (SAMPLE_HANDLES.includes(handle)) return "Another creator has this handle. Try another.";
  return null;
}

/** Your handle as the address uses it: the one you chose, or "me" while it is unset or unusable. */
export function ownHandleOf(handle: string | null | undefined): string {
  return handle && handleProblem(handle) === null ? cleanHandle(handle) : ME;
}

/** Everyone who can have a profile: you first, then the feed creators, the sample commenters and
 *  the demo creators, each with a handle unique among them. */
export function directory(me: { name: string; latinName: string; handle?: string }): Person[] {
  const name = displayNameOf(me.name);
  const latin = me.latinName.trim();
  return [
    {
      id: ME,
      kind: "me",
      handle: ownHandleOf(me.handle),
      name,
      latinName: latin && latin !== name ? latin : null,
      initials: initialsOf(name, latin || null),
      color: null,
    },
    ...SAMPLE_DIRECTORY,
  ];
}

/** The person at `/creators/<handle>`; "me" always finds you. */
export function personByHandle(dir: readonly Person[], handle: string): Person | null {
  const h = handle.toLowerCase();
  if (h === ME) return dir.find((p) => p.kind === "me") ?? null;
  return dir.find((p) => p.handle === h) ?? null;
}

export function personById(dir: readonly Person[], id: PersonId): Person | null {
  return dir.find((p) => p.id === id) ?? null;
}

export function profileHref(person: Pick<Person, "handle">): string {
  return `/creators/${person.handle}`;
}

/** Where a person's name links: your handle's address for you (`/creators/me` until you have
 *  one), a sample person's handle, or null for someone with no profile (a name typed into a
 *  project team). Takes either id scheme. */
export function profileHrefOf(raw: string, from: "innovations" | "messages" = "messages", myHandle?: string): string | null {
  const id = canonicalId(raw, from);
  if (id === ME) return `/creators/${ownHandleOf(myHandle)}`;
  const p = SAMPLE_DIRECTORY.find((x) => x.id === id);
  return p ? profileHref(p) : null;
}
